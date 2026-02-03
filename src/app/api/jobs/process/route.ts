import { NextRequest, NextResponse } from "next/server";
import { getTursoClient } from "@/lib/turso";

/**
 * Webhook endpoint for processing jobs sent by Cloudflare Queue consumer
 * Called one-by-one for each job that needs processing
 */
export async function POST(request: NextRequest) {
  try {
    // Validate webhook secret
    const authHeader = request.headers.get("Authorization");
    const expectedAuth = `Bearer ${process.env.WEBHOOK_SECRET}`;

    if (!process.env.WEBHOOK_SECRET) {
      console.error("⚠️ WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 },
      );
    }

    if (authHeader !== expectedAuth) {
      console.error("❌ Unauthorized webhook request");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Parse request body
    const body = await request.json();
    const { jobId } = body;

    if (!jobId || typeof jobId !== "number") {
      return NextResponse.json(
        { success: false, error: "jobId is required and must be a number" },
        { status: 400 },
      );
    }

    console.log(`📋 Processing job ${jobId}`);

    // Fetch job from database
    const client = getTursoClient();
    const result = await client.execute({
      sql: "SELECT * FROM jobs WHERE id = ? LIMIT 1",
      args: [jobId],
    });

    const job = result.rows?.[0];
    if (!job) {
      console.error(`❌ Job ${jobId} not found`);
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 },
      );
    }

    // TODO: Add your processing logic here
    // Examples:
    // - Run Mastra classification/scoring
    // - Call AI models for analysis
    // - Update job status based on processing results
    // - Send notifications
    //
    // For now, just log that we received the job
    console.log(`✅ Job ${jobId} ready for processing:`, {
      title: job.title,
      company: job.company_key,
      status: job.status,
    });

    // Example: Update job status to indicate it's been processed
    // await client.execute({
    //   sql: "UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?",
    //   args: ["processed", new Date().toISOString(), jobId],
    // });

    return NextResponse.json({
      success: true,
      message: `Job ${jobId} processed successfully`,
      jobId,
    });
  } catch (error) {
    console.error("❌ Error processing job:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
