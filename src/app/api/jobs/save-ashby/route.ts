import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { jobs, companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ASHBY_JOBS_DOMAIN } from "@/constants/ats";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const {
      id,
      title,
      location,
      locationName,
      company,
      department,
      team,
      isRemote,
      descriptionHtml,
      descriptionPlain,
      publishedAt,
      employmentType,
      jobUrl,
      applyUrl,
    } = await request.json();

    if (!id || !title || !company) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const externalId =
      jobUrl || `https://${ASHBY_JOBS_DOMAIN}/${company}/${id}`;

    // Find or create the company
    let companyRecord = await db
      .select()
      .from(companies)
      .where(eq(companies.key, company))
      .limit(1);

    let companyId: number;

    if (companyRecord.length === 0) {
      // Create new company record
      const result = await db
        .insert(companies)
        .values({
          key: company,
          name: company,
        })
        .returning();
      companyId = result[0].id;
    } else {
      companyId = companyRecord[0].id;
    }

    // Update or insert the job with Ashby data
    const existingJob = await db
      .select()
      .from(jobs)
      .where(eq(jobs.external_id, externalId))
      .limit(1);

    const jobData = {
      title,
      location: location || locationName || "Unknown",
      description: descriptionPlain || descriptionHtml,
      url: applyUrl || jobUrl || externalId,
      posted_at: publishedAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingJob.length > 0) {
      // Update existing job
      await db.update(jobs).set(jobData).where(eq(jobs.id, existingJob[0].id));

      return NextResponse.json({
        success: true,
        action: "updated",
        jobId: existingJob[0].id,
      });
    } else {
      // Insert new job
      const result = await db
        .insert(jobs)
        .values({
          external_id: externalId,
          source_kind: "ashby",
          company_id: companyId,
          company_key: company,
          ...jobData,
        })
        .returning();

      return NextResponse.json({
        success: true,
        action: "created",
        jobId: result[0].id,
      });
    }
  } catch (error) {
    console.error("Error saving Ashby job:", error);
    return NextResponse.json(
      { error: "Failed to save job data" },
      { status: 500 },
    );
  }
}
