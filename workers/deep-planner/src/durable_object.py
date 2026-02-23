"""Durable Object for Deep Planner workflow execution.

Each DO instance handles one task. The alarm-based execution loop:
1. Load checkpoint (or start fresh)
2. Execute one LLM pass (draft/critique/refine)
3. Save checkpoint to DO storage + D1
4. Schedule next alarm (6s delay for rate limiting)
5. Hibernate until next alarm
"""

import time
import json
from datetime import datetime, timezone

from js import JSON
from workers import DurableObject, Response

from helpers import guard_content, sleep_ms, to_py
from prompts import BMAD_STEPS, PASS_TYPES, SYSTEM_BASE, get_prompt, total_passes
from checkpoint import (
    save_checkpoint,
    load_checkpoint,
    mark_running,
    mark_complete,
    mark_failed,
    get_task,
)

# Pacing: 6 seconds between alarms to stay within Workers AI free tier
ALARM_DELAY_MS = 6_000

# Max retries per LLM call
MAX_RETRIES = 3

# Workers AI model — free tier
MODEL_NAME = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"


class DeepPlannerDO(DurableObject):
    """Durable Object that executes a BMAD workflow via alarm-chained LLM calls."""

    def __init__(self, ctx, env):
        super().__init__(ctx, env)
        self.ctx = ctx
        self.env = env

    async def fetch(self, request):
        """Handle trigger request — start or resume workflow execution."""
        try:
            body = json.loads(await request.text())
            task_id = body.get("task_id")
            if not task_id:
                return Response.json({"error": "task_id required"}, status=400)

            # Store task_id in DO storage for alarm handler
            await self.ctx.storage.put("task_id", task_id)

            # Load task from D1
            task = await get_task(self.env.DB, task_id)
            if not task:
                return Response.json({"error": "Task not found"}, status=404)

            if task["status"] == "running":
                return Response.json({"error": "Task already running"}, status=409)

            # Mark as running
            await mark_running(self.env.DB, task_id)

            # Load codebase context
            codebase_context = await self._load_codebase_context()
            await self.ctx.storage.put("codebase_context", codebase_context)
            await self.ctx.storage.put("problem_description", task["problem_description"])
            await self.ctx.storage.put("task_context", task.get("context") or "")

            # Schedule first alarm
            await self.ctx.storage.setAlarm(int(time.time() * 1000) + ALARM_DELAY_MS)

            return Response.json({
                "status": "accepted",
                "task_id": task_id,
                "message": "Workflow execution started",
            }, status=202)

        except Exception as e:
            print(f"[DeepPlannerDO] fetch error: {e}")
            return Response.json({"error": str(e)}, status=500)

    async def alarm(self):
        """Execute one LLM pass, checkpoint, and schedule next alarm."""
        task_id = None
        artifact_so_far = ""
        pass_index = 0

        try:
            task_id = str(await self.ctx.storage.get("task_id"))
            if not task_id:
                print("[DeepPlannerDO] No task_id in storage, stopping")
                return

            # Load context from storage
            problem_description = str(await self.ctx.storage.get("problem_description") or "")
            task_context = str(await self.ctx.storage.get("task_context") or "")
            codebase_context = str(await self.ctx.storage.get("codebase_context") or "")

            # Load checkpoint to determine current position
            checkpoint = await load_checkpoint(self.ctx.storage, task_id)

            if checkpoint:
                pass_index = checkpoint["pass_index"] + 1
                artifact_so_far = checkpoint.get("artifact_so_far", "")
            else:
                pass_index = 0
                artifact_so_far = ""

            total = total_passes()

            # Check if we're done
            if pass_index >= total:
                print(f"[DeepPlannerDO] Workflow complete for task {task_id}")
                await mark_complete(self.env.DB, task_id, artifact_so_far, total)
                return

            # Determine current step and pass
            step_index = pass_index // len(PASS_TYPES)
            pass_within_step = pass_index % len(PASS_TYPES)
            step = BMAD_STEPS[step_index]
            pass_type = PASS_TYPES[pass_within_step]

            print(f"[DeepPlannerDO] Task {task_id}: step={step}, pass={pass_type} ({pass_index + 1}/{total})")

            # Get previous outputs for critique/refine passes
            previous_output = ""
            critique_output = ""

            if pass_type == "critique":
                # Load draft output from the previous pass
                draft_checkpoint = await load_checkpoint(self.ctx.storage, task_id)
                if draft_checkpoint:
                    previous_output = draft_checkpoint.get("output", "")
            elif pass_type == "refine":
                # Load both draft and critique outputs
                draft_key = f"step_output:{task_id}:{step}:draft"
                critique_key = f"step_output:{task_id}:{step}:critique"
                draft_data = await self.ctx.storage.get(draft_key)
                critique_data = await self.ctx.storage.get(critique_key)
                previous_output = str(draft_data) if draft_data else ""
                critique_output = str(critique_data) if critique_data else ""

            # Build prompt
            prompt_text = get_prompt(
                step=step,
                pass_type=pass_type,
                problem_description=problem_description,
                context=task_context,
                codebase_context=codebase_context,
                artifact_so_far=artifact_so_far,
                previous_output=previous_output,
                critique_output=critique_output,
            )

            # Execute LLM call with retry
            output = await self._call_llm(prompt_text)

            if output is None:
                error_msg = f"Workers AI returned null on step {step}, pass {pass_type} after {MAX_RETRIES} retries"
                print(f"[DeepPlannerDO] {error_msg}")
                await mark_failed(self.env.DB, task_id, error_msg, artifact_so_far or None, pass_index)
                return

            # Store step-specific output for cross-referencing
            step_key = f"step_output:{task_id}:{step}:{pass_type}"
            await self.ctx.storage.put(step_key, output)

            # Update artifact after refine pass (final output of each step)
            if pass_type == "refine":
                if step == "COMPLETE":
                    # Final step — the output IS the complete artifact
                    artifact_so_far = output
                else:
                    # Append refined section to accumulated artifact
                    artifact_so_far = (artifact_so_far + "\n\n" + output).strip()

            # Save checkpoint
            await save_checkpoint(
                storage=self.ctx.storage,
                db=self.env.DB,
                task_id=task_id,
                step=step,
                pass_type=pass_type,
                pass_index=pass_index,
                output=output,
                artifact_so_far=artifact_so_far,
            )

            # Schedule next alarm
            next_pass = pass_index + 1
            if next_pass < total:
                await self.ctx.storage.setAlarm(int(time.time() * 1000) + ALARM_DELAY_MS)
                print(f"[DeepPlannerDO] Next alarm scheduled in {ALARM_DELAY_MS}ms")
            else:
                # Final pass just completed
                print(f"[DeepPlannerDO] Final pass complete, marking task done")
                await mark_complete(self.env.DB, task_id, artifact_so_far, total)

        except Exception as e:
            error_msg = f"Alarm error on pass {pass_index}: {str(e)}"
            print(f"[DeepPlannerDO] {error_msg}")
            if task_id:
                await mark_failed(
                    self.env.DB,
                    task_id,
                    error_msg,
                    artifact_so_far or None,
                    pass_index,
                )

    async def _call_llm(self, prompt: str) -> str | None:
        """Call Workers AI directly via binding with retry logic."""
        for attempt in range(MAX_RETRIES):
            try:
                messages = [
                    {"role": "system", "content": SYSTEM_BASE},
                    {"role": "user", "content": prompt[:12000]},
                ]

                result = await self.env.AI.run(
                    MODEL_NAME,
                    JSON.parse(json.dumps({
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 4096,
                    })),
                )

                # Parse the response
                result_dict = to_py(result)
                content = result_dict.get("response") if isinstance(result_dict, dict) else None

                if not content:
                    print(f"[DeepPlannerDO] Workers AI returned empty content, attempt {attempt + 1}/{MAX_RETRIES}")
                else:
                    return str(content).strip()

            except Exception as e:
                print(f"[DeepPlannerDO] LLM call error (attempt {attempt + 1}/{MAX_RETRIES}): {e}")

            if attempt < MAX_RETRIES - 1:
                backoff_ms = min(10000, 2000 * (2 ** attempt))
                print(f"[DeepPlannerDO] Retrying in {backoff_ms}ms...")
                await sleep_ms(backoff_ms)

        return None

    async def _load_codebase_context(self) -> str:
        """Load bundled codebase context files."""
        try:
            context_parts = []

            claude_md = await self.ctx.storage.get("context:claude_md")
            if claude_md:
                context_parts.append(f"## CLAUDE.md\n{str(claude_md)}")

            schema_graphql = await self.ctx.storage.get("context:schema_graphql")
            if schema_graphql:
                context_parts.append(f"## GraphQL Schema\n{str(schema_graphql)}")

            db_schema = await self.ctx.storage.get("context:db_schema")
            if db_schema:
                context_parts.append(f"## Database Schema\n{str(db_schema)}")

            if context_parts:
                return "\n\n---\n\n".join(context_parts)

            return "No codebase context bundled. The worker should be deployed with context files."

        except Exception as e:
            print(f"[DeepPlannerDO] Error loading context: {e}")
            return "Error loading codebase context."
