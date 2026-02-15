import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import {
  fetchGreenhouseJobPost,
  saveGreenhouseJobData,
} from "@/ingestion/greenhouse";

export async function POST(request: NextRequest) {
  try {
    // Validate authorization
    const authHeader = request.headers.get("authorization");
    const expectedAuth = `Bearer ${process.env.TRIGGER_SECRET_KEY}`;

    if (!authHeader || authHeader !== expectedAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🚀 Starting Greenhouse job enhancement...");

    // Fetch all Greenhouse jobs from database
    console.log("📋 Fetching all Greenhouse jobs from database...");
    const allJobs = await db.select().from(jobs);
    const jobsToEnhance = allJobs.filter(
      (job) =>
        job.source_kind === "greenhouse" &&
        job.url &&
        job.url.includes("greenhouse.io"),
    );

    console.log(`Found ${jobsToEnhance.length} jobs to enhance`);

    if (jobsToEnhance.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No jobs to enhance",
        totalJobs: 0,
        successCount: 0,
        failureCount: 0,
      });
    }

    // Process each job
    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ jobId: number; error: string }> = [];

    for (const [index, job] of jobsToEnhance.entries()) {
      console.log(
        `[${index + 1}/${jobsToEnhance.length}] Processing job ID: ${job.id}`,
        {
          title: job.title,
          company: job.company_key,
          url: job.url,
        },
      );

      try {
        // Fetch enhanced data from Greenhouse API
        console.log("📥 Fetching data from Greenhouse API...");
        const greenhouseData = await fetchGreenhouseJobPost(job.url, {
          questions: true,
        });

        // Save enhanced data to database
        console.log("💾 Saving enhanced data to database...");
        await saveGreenhouseJobData(job.id, greenhouseData);

        console.log("✅ Successfully enhanced job");
        successCount++;

        // Add delay to avoid rate limiting (except for last job)
        if (index < jobsToEnhance.length - 1) {
          console.log("⏳ Waiting 1 second before next job...");
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed to enhance job: ${errorMessage}`, {
          jobId: job.id,
          error: errorMessage,
        });
        failureCount++;
        errors.push({
          jobId: job.id,
          error: errorMessage,
        });
      }
    }

    // Return summary
    const result = {
      success: failureCount === 0,
      message:
        failureCount === 0
          ? "All jobs enhanced successfully"
          : `${successCount} jobs enhanced, ${failureCount} failed`,
      totalJobs: jobsToEnhance.length,
      successCount,
      failureCount,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log("📊 Enhancement Summary", result);

    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Fatal error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
