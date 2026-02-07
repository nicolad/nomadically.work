import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get recent jobs with their classification
    const recentJobs = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        location: jobs.location,
        source_kind: jobs.source_kind,
        status: jobs.status,
        score: jobs.score,
        score_reason: jobs.score_reason,
        external_id: jobs.external_id,
      })
      .from(jobs)
      .orderBy(desc(jobs.updated_at))
      .limit(20);

    return NextResponse.json({
      total: recentJobs.length,
      jobs: recentJobs,
    });
  } catch (error) {
    console.error("Error fetching debug data:", error);
    return NextResponse.json(
      { error: "Failed to fetch debug data" },
      { status: 500 },
    );
  }
}
