import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSkillFilteredJobs } from "@/lib/skill-filtering";

export const dynamic = 'force-dynamic';

/**
 * GET /api/jobs/matched-by-skills
 * 
 * Returns jobs filtered by the current user's preferred skills.
 * No LLM calls - pure SQL filtering using canonical skill tags.
 * 
 * Query params:
 * - limit (optional): number of jobs per page (default: 20)
 * - offset (optional): pagination offset (default: 0)
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const searchParams = req.nextUrl.searchParams;
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    const result = await getSkillFilteredJobs({
      userId,
      limit,
      offset,
    });

    return NextResponse.json({
      jobs: result.jobs,
      totalCount: result.totalCount,
      canonicalTags: result.canonicalTags,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < result.totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching skill-matched jobs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
