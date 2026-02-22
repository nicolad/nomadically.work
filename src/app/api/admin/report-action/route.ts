import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { ADMIN_EMAIL } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (user?.primaryEmailAddress?.emailAddress !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const workerUrl = process.env.JOB_REPORTER_WORKER_URL;
  const secret = process.env.JOB_REPORTER_WORKER_SECRET;
  if (!workerUrl || !secret) {
    return NextResponse.json({ error: "Worker not configured" }, { status: 503 });
  }

  let body: { action: string; jobId: number; confirmedReason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, jobId, confirmedReason } = body;
  if (action !== "confirm" && action !== "restore") {
    return NextResponse.json({ error: "action must be confirm or restore" }, { status: 400 });
  }

  const endpoint =
    action === "confirm" ? "/api/confirm-report" : "/api/restore-job";

  try {
    const res = await fetch(`${workerUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Secret": secret,
      },
      body: JSON.stringify({
        jobId,
        actor: user.primaryEmailAddress?.emailAddress ?? "admin",
        ...(confirmedReason ? { confirmedReason } : {}),
      }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Worker unavailable" },
      { status: 502 },
    );
  }
}
