import { NextRequest, NextResponse } from "next/server";
import { getD1Client } from "@/lib/cloudflare-d1";
import { scoreRemoteEUClassification } from "@/lib/evals/scorers/remote-eu-scorer";

/**
 * Score jobs endpoint - runs after cron inserts new jobs
 * Triggered by cron webhook or manually
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization (optional but recommended)
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET) {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const d1Client = getD1Client();

    // Get unscored jobs
    const jobs = await d1Client.getJobsFiltered({
      status: "active",
      limit: 100,
    });

    console.log(`🎯 Scoring ${jobs.length} jobs...`);

    let scoredCount = 0;
    const results = [];

    for (const job of jobs) {
      if (!job.title || !job.location || !job.description) {
        continue;
      }

      // Mock classification for now - replace with actual AI classification
      const actualClassification = {
        isRemoteEU: job.location?.toLowerCase().includes("eu") || false,
        confidence: "medium" as const,
        reason: "Automated classification",
      };

      const expectedClassification = {
        isRemoteEU: job.remoteFriendly || false,
        confidence: "high" as const,
        reason: "Expected from job data",
      };

      const scoreResult = scoreRemoteEUClassification({
        jobPosting: {
          title: job.title,
          location: job.location,
          description: job.description,
        },
        expectedClassification,
        actualClassification,
      });

      results.push({
        jobId: job.id,
        score: scoreResult.score,
        metadata: scoreResult.metadata,
      });

      scoredCount++;
    }

    console.log(`✅ Scored ${scoredCount} jobs`);

    return NextResponse.json({
      success: true,
      message: `Scored ${scoredCount} jobs`,
      scoredCount,
      results: results.slice(0, 10), // Return first 10 for preview
    });
  } catch (error) {
    console.error("❌ Error scoring jobs:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
