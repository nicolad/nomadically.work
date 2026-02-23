"""Deep Planner Worker — entrypoint.

Routes HTTP requests to the Durable Object for task execution.
Exports the DeepPlannerDO class for the DO binding.
"""

import json
from urllib.parse import urlparse

from workers import Response, WorkerEntrypoint

from helpers import to_py, d1_first
from durable_object import DeepPlannerDO  # noqa: F401 — exported for wrangler DO binding

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
}


def extract_path(url: str) -> str:
    """Extract path from URL, stripping leading slash."""
    parsed = urlparse(url)
    return parsed.path.lstrip("/")


class Default(WorkerEntrypoint):
    """HTTP endpoint that triggers and queries Deep Planner tasks."""

    async def fetch(self, request):
        """Route requests to appropriate handlers."""
        try:
            if request.method == "OPTIONS":
                return Response("", status=204, headers=CORS_HEADERS)

            path = extract_path(request.url)

            if path == "health":
                return Response.json({"status": "ok", "worker": "deep-planner"}, headers=CORS_HEADERS)

            # Auth check for all other endpoints
            api_key = request.headers.get("X-API-Key") or request.headers.get("x-api-key")
            expected_key = getattr(self.env, "API_KEY", None)

            if expected_key and api_key != str(expected_key):
                return Response.json({"error": "Unauthorized"}, status=401, headers=CORS_HEADERS)

            if path == "trigger" and request.method == "POST":
                return await self.handle_trigger(request)

            if path.startswith("status/"):
                task_id = path.split("/", 1)[1]
                return await self.handle_status(task_id)

            return Response.json({"error": "Not found"}, status=404, headers=CORS_HEADERS)

        except Exception as e:
            print(f"[DeepPlanner] Error: {e}")
            return Response.json({"error": str(e)}, status=500, headers=CORS_HEADERS)

    async def handle_trigger(self, request):
        """Trigger workflow execution for a task.

        POST /trigger { "task_id": "01HXYZ..." }
        """
        body = to_py(await request.json())
        task_id = body.get("task_id")

        if not task_id:
            return Response.json(
                {"error": "task_id is required"},
                status=400,
                headers=CORS_HEADERS,
            )

        # Verify task exists and is pending
        task = await d1_first(
            self.env.DB,
            "SELECT id, status FROM deep_planner_tasks WHERE id = ?",
            [task_id],
        )

        if not task:
            return Response.json(
                {"error": "Task not found"},
                status=404,
                headers=CORS_HEADERS,
            )

        if task["status"] == "running":
            return Response.json(
                {"error": "Task already running"},
                status=409,
                headers=CORS_HEADERS,
            )

        # Instantiate DO by task ID and forward request
        do_id = self.env.DEEP_PLANNER_DO.idFromName(task_id)
        do_stub = self.env.DEEP_PLANNER_DO.get(do_id)

        # Forward trigger to DO
        do_response = await do_stub.fetch(
            f"https://do-internal/trigger",
            method="POST",
            headers={"Content-Type": "application/json"},
            body=json.dumps({"task_id": task_id}),
        )

        result = to_py(await do_response.json())
        return Response.json(result, status=do_response.status, headers=CORS_HEADERS)

    async def handle_status(self, task_id: str):
        """Query task status from D1.

        GET /status/<task_id>
        """
        task = await d1_first(
            self.env.DB,
            """SELECT id, status, current_step, checkpoint_count,
                      error_message, started_at, completed_at, updated_at
               FROM deep_planner_tasks WHERE id = ?""",
            [task_id],
        )

        if not task:
            return Response.json(
                {"error": "Task not found"},
                status=404,
                headers=CORS_HEADERS,
            )

        return Response.json(task, headers=CORS_HEADERS)
