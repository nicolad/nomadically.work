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

from workers import DurableObject, Response

from helpers import sleep_ms
from llm import ChatDeepSeek, SystemMessage, HumanMessage
from prompts import BMAD_STEPS, PASS_TYPES, FEEDBACK_PASS_INDICES, SYSTEM_BASE, get_prompt, total_passes
from context_data import CLAUDE_MD, SCHEMA_GRAPHQL, DB_SCHEMA
from checkpoint import (
    save_checkpoint,
    load_checkpoint,
    mark_running,
    mark_complete,
    mark_failed,
    get_task,
)

# Pacing: delay between alarms for rate limiting
ALARM_DELAY_MS = 6_000

# Max retries per LLM call
MAX_RETRIES = 3


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
            codebase_context = self._load_codebase_context()
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

            # Check if task was cancelled before proceeding
            task_record = await get_task(self.env.DB, task_id)
            if task_record and task_record["status"] in ("cancelled", "failed"):
                print(f"[DeepPlannerDO] Task {task_id} is {task_record['status']}, stopping execution")
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

            # Load previous outputs based on pass position within step.
            # Passes at FEEDBACK_PASS_INDICES (2=refine, 4=deepen) consume two prior outputs:
            #   previous_output  = the generation pass two steps back (draft or refine)
            #   critique_output  = the feedback pass one step back (critique or validate)
            # All other passes (except draft at index 0) load just the immediately prior pass.
            previous_output = ""
            critique_output = ""

            if pass_within_step > 0:
                if pass_within_step in FEEDBACK_PASS_INDICES:
                    gen_type = PASS_TYPES[pass_within_step - 2]
                    fb_type = PASS_TYPES[pass_within_step - 1]
                    gen_data = await self.ctx.storage.get(f"step_output:{task_id}:{step}:{gen_type}")
                    fb_data = await self.ctx.storage.get(f"step_output:{task_id}:{step}:{fb_type}")
                    previous_output = str(gen_data) if gen_data else ""
                    critique_output = str(fb_data) if fb_data else ""
                else:
                    prev_type = PASS_TYPES[pass_within_step - 1]
                    prev_data = await self.ctx.storage.get(f"step_output:{task_id}:{step}:{prev_type}")
                    previous_output = str(prev_data) if prev_data else ""

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

            # Determine max_tokens based on step — COMPLETE and polish need more room
            max_tokens = 4096
            if step == "COMPLETE":
                max_tokens = 8192
            elif pass_type == "polish":
                max_tokens = 6144

            # Execute LLM call with retry
            output = await self._call_llm(prompt_text, max_tokens=max_tokens)

            if output is None:
                error_msg = (
                    f"DeepSeek API returned no content at checkpoint {pass_index + 1}/{total} "
                    f"(step={step}, pass={pass_type}) after {MAX_RETRIES} retries"
                )
                print(f"[DeepPlannerDO] {error_msg}")
                await mark_failed(self.env.DB, task_id, error_msg, artifact_so_far or None, pass_index)
                return

            # Store step-specific output for cross-referencing
            step_key = f"step_output:{task_id}:{step}:{pass_type}"
            await self.ctx.storage.put(step_key, output)

            # Update artifact after the final pass of each step (polish)
            if pass_type == PASS_TYPES[-1]:
                if step == "COMPLETE":
                    # Final step — the output IS the complete artifact
                    artifact_so_far = output
                else:
                    # Append polished section to accumulated artifact
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
            step_index = pass_index // len(PASS_TYPES)
            pass_within_step = pass_index % len(PASS_TYPES)
            step_name = BMAD_STEPS[step_index] if step_index < len(BMAD_STEPS) else "unknown"
            pass_name = PASS_TYPES[pass_within_step] if pass_within_step < len(PASS_TYPES) else "unknown"
            total = total_passes()
            error_msg = (
                f"Failed at checkpoint {pass_index + 1}/{total} "
                f"(step={step_name}, pass={pass_name}): {str(e)}"
            )
            print(f"[DeepPlannerDO] {error_msg}")
            if task_id:
                await mark_failed(
                    self.env.DB,
                    task_id,
                    error_msg,
                    artifact_so_far or None,
                    pass_index,
                )

    async def _call_llm(self, prompt: str, max_tokens: int = 4096) -> str | None:
        """Call DeepSeek via LangChain-compatible ChatDeepSeek client with retry."""
        api_key = str(getattr(self.env, "DEEPSEEK_API_KEY", "") or "")
        if not api_key:
            print("[DeepPlannerDO] DEEPSEEK_API_KEY not set")
            return None

        llm = ChatDeepSeek(
            api_key=api_key,
            temperature=0.7,
            max_tokens=max_tokens,
        )

        # Allow larger prompts for assembly steps
        prompt_limit = 16000 if max_tokens > 4096 else 12000
        messages = [
            SystemMessage(content=SYSTEM_BASE),
            HumanMessage(content=prompt[:prompt_limit]),
        ]

        for attempt in range(MAX_RETRIES):
            try:
                result = await llm.ainvoke(messages, max_tokens=max_tokens)
                if result.content:
                    return result.content
                print(f"[DeepPlannerDO] DeepSeek returned empty content, attempt {attempt + 1}/{MAX_RETRIES}")

            except Exception as e:
                print(f"[DeepPlannerDO] LLM call error (attempt {attempt + 1}/{MAX_RETRIES}): {e}")

            if attempt < MAX_RETRIES - 1:
                backoff_ms = min(10000, 2000 * (2 ** attempt))
                print(f"[DeepPlannerDO] Retrying in {backoff_ms}ms...")
                await sleep_ms(backoff_ms)

        return None

    def _load_codebase_context(self) -> str:
        """Load bundled codebase context from the generated Python module."""
        context_parts = []

        if CLAUDE_MD:
            context_parts.append(f"## CLAUDE.md\n{CLAUDE_MD}")

        if SCHEMA_GRAPHQL:
            context_parts.append(f"## GraphQL Schema\n{SCHEMA_GRAPHQL}")

        if DB_SCHEMA:
            context_parts.append(f"## Database Schema\n{DB_SCHEMA}")

        if context_parts:
            return "\n\n---\n\n".join(context_parts)

        return "No codebase context available."
