import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * POST /api/jobs/extract-skills
 *
 * Manually trigger skill extraction for a specific job.
 * Useful for testing or re-running extraction with updated taxonomy.
 *
 * Body:
 * {
 *   "jobId": 123
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId } = body;

    if (!jobId || typeof jobId !== "number") {
      return NextResponse.json(
        { error: "Missing or invalid jobId" },
        { status: 400 },
      );
    }

    // Fetch job from DB
    const { db } = await import("@/db");
    const { jobs } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Dynamically import workflow to avoid initialization during build
    const { extractJobSkillsWorkflow } = await import("@/mastra/workflows/extract-job-skills");

    // Run extraction workflow
    const result = await extractJobSkillsWorkflow.execute({
      inputData: {
        jobId: job.id,
        title: job.title,
        description: job.description,
      },
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      skillsExtracted: result?.count ?? 0,
    });
  } catch (error) {
    console.error("Error extracting job skills:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
