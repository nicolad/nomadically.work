import { NextRequest, NextResponse } from "next/server";
import { getTursoClient } from "@/lib/turso";
import { scoreRemoteEUClassification } from "@/evals/scorers/remote-eu-scorer";

export const dynamic = "force-dynamic";

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

    const client = getTursoClient();

    // Get unscored jobs (status = 'new')
    const result = await client.execute({
      sql: "SELECT * FROM jobs WHERE status = ? AND (score IS NULL OR score = 0) ORDER BY created_at DESC LIMIT ?",
      args: ["new", 100],
    });

    const jobs = result.rows;
    console.log(`🎯 Scoring ${jobs.length} jobs...`);

    let scoredCount = 0;
    const results = [];

    for (const job of jobs) {
      if (!job.title || !job.location) {
        continue;
      }

      const title = String(job.title);
      const location = String(job.location);
      const description = job.description ? String(job.description) : "";

      // Check if location indicates remote work in EU
      const locationLower = location.toLowerCase();
      const isRemote =
        locationLower.includes("remote") ||
        locationLower.includes("distributed") ||
        locationLower.includes("anywhere");

      const isEU =
        locationLower.includes("eu") ||
        locationLower.includes("europe") ||
        locationLower.includes("emea");

      const isUK =
        locationLower.includes("uk") ||
        locationLower.includes("united kingdom") ||
        locationLower.includes("britain");

      const actualClassification = {
        isRemoteEU: isRemote && isEU,
        confidence: "medium" as const,
        reason: `Location: ${location}`,
      };

      const expectedClassification = {
        isRemoteEU: isRemote && isEU,
        confidence: "high" as const,
        reason: "Expected from job data",
      };

      const scoreResult = scoreRemoteEUClassification({
        jobPosting: {
          title,
          location,
          description,
        },
        expectedClassification,
        actualClassification,
      });

      // Determine status based on EU, UK and remote flags
      let status: string;
      if (isRemote && isEU) {
        status = "eu-remote"; // Remote EU job
      } else if (isRemote && isUK) {
        status = "uk-remote"; // Remote UK job
      } else {
        status = "other"; // Other jobs
      }

      // Update job with score and status
      await client.execute({
        sql: `UPDATE jobs SET score = ?, score_reason = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [scoreResult.score, actualClassification.reason, status, job.id],
      });

      results.push({
        jobId: job.id,
        title,
        location,
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
