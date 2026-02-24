"""D1-based checkpoint persistence for Deep Planner workflows.

Checkpoints are stored in the DO's built-in SQLite storage (via ctx.storage.sql)
and the task status is mirrored to the D1 `deep_planner_tasks` table.
"""

import json
from datetime import datetime, timezone

from helpers import d1_run, d1_first


async def save_checkpoint(
    storage,
    db,
    task_id: str,
    step: str,
    pass_type: str,
    pass_index: int,
    output: str,
    artifact_so_far: str,
):
    """Save workflow checkpoint to DO storage and update D1 task record.

    Args:
        storage: DO ctx.storage (SQLite)
        db: D1 database binding
        task_id: Task ULID
        step: Current BMAD step name
        pass_type: Current pass type (draft/critique/refine)
        pass_index: Global pass index (0-17)
        output: LLM output for this pass
        artifact_so_far: Accumulated artifact text
    """
    now = datetime.now(timezone.utc).isoformat()

    # Save to DO local SQLite storage
    checkpoint_data = json.dumps({
        "step": step,
        "pass_type": pass_type,
        "pass_index": pass_index,
        "output": output,
        "artifact_so_far": artifact_so_far,
        "saved_at": now,
    })
    await storage.put(f"checkpoint:{task_id}", checkpoint_data)
    await storage.put(f"checkpoint_index:{task_id}", str(pass_index))

    # Update D1 task record with intermediate artifact for live progress
    checkpoint_count = pass_index + 1
    await d1_run(
        db,
        """UPDATE deep_planner_tasks
           SET current_step = ?,
               checkpoint_count = ?,
               output_artifact = ?,
               updated_at = ?
           WHERE id = ?""",
        [f"{step}:{pass_type}", checkpoint_count, artifact_so_far or None, now, task_id],
    )


async def load_checkpoint(storage, task_id: str) -> dict | None:
    """Load the latest checkpoint from DO storage.

    Returns:
        Dict with step, pass_type, pass_index, output, artifact_so_far, or None.
    """
    data = await storage.get(f"checkpoint:{task_id}")
    if data is None:
        return None
    return json.loads(str(data))


async def mark_running(db, task_id: str):
    """Set task status to running with started_at timestamp."""
    now = datetime.now(timezone.utc).isoformat()
    await d1_run(
        db,
        """UPDATE deep_planner_tasks
           SET status = 'running',
               started_at = ?,
               updated_at = ?
           WHERE id = ?""",
        [now, now, task_id],
    )


async def mark_complete(db, task_id: str, artifact: str, checkpoint_count: int):
    """Set task status to complete with final artifact."""
    now = datetime.now(timezone.utc).isoformat()
    await d1_run(
        db,
        """UPDATE deep_planner_tasks
           SET status = 'complete',
               output_artifact = ?,
               checkpoint_count = ?,
               completed_at = ?,
               updated_at = ?
           WHERE id = ?""",
        [artifact, checkpoint_count, now, now, task_id],
    )


async def mark_failed(db, task_id: str, error_message: str, partial_artifact: str | None, checkpoint_count: int):
    """Set task status to failed with error message and partial artifact."""
    now = datetime.now(timezone.utc).isoformat()
    await d1_run(
        db,
        """UPDATE deep_planner_tasks
           SET status = 'failed',
               error_message = ?,
               output_artifact = ?,
               checkpoint_count = ?,
               completed_at = ?,
               updated_at = ?
           WHERE id = ?""",
        [error_message, partial_artifact, checkpoint_count, now, now, task_id],
    )


async def get_task(db, task_id: str) -> dict | None:
    """Fetch task record from D1."""
    return await d1_first(
        db,
        "SELECT * FROM deep_planner_tasks WHERE id = ?",
        [task_id],
    )
