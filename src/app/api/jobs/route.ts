import { NextRequest, NextResponse } from "next/server";
import { getD1Client } from "@/lib/cloudflare-d1";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");
    const status = searchParams.get("status");

    const d1Client = getD1Client();

    let jobs;
    if (limit || offset || status) {
      jobs = await d1Client.getJobsFiltered({
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
        status: status || undefined,
      });
    } else {
      jobs = await d1Client.getJobs();
    }

    return NextResponse.json({
      success: true,
      data: jobs,
      count: jobs.length,
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
