import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { ADMIN_EMAIL } from "@/lib/constants";

async function workerFetch(path: string, options?: RequestInit) {
  const url = process.env.JOB_REPORTER_WORKER_URL;
  const secret = process.env.JOB_REPORTER_WORKER_SECRET;
  if (!url || !secret) throw new Error("Reporter worker not configured");
  return fetch(`${url}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Worker-Secret": secret,
      ...(options?.headers ?? {}),
    },
  });
}

export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (user?.primaryEmailAddress?.emailAddress !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  try {
    if (type === "stats") {
      const res = await workerFetch("/api/report-stats");
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    const limit = searchParams.get("limit") ?? "50";
    const offset = searchParams.get("offset") ?? "0";
    const res = await workerFetch(
      `/api/reported-jobs?limit=${limit}&offset=${offset}`,
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Worker unavailable" },
      { status: 502 },
    );
  }
}
