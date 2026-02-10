import { NextRequest, NextResponse } from "next/server";
import { getTurso } from "@/db";
import { auth } from "@/auth";
import { ADMIN_EMAIL } from "@/lib/constants";

/**
 * POST /api/companies/enhance
 * Triggers company data enhancement/enrichment
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId, user } = await auth();

    if (!userId || !user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { companyId, companyKey } = body;

    if (!companyId && !companyKey) {
      return NextResponse.json(
        { error: "Either companyId or companyKey is required" },
        { status: 400 }
      );
    }

    const tursoClient = getTurso();

    // Fetch current company data
    let company;
    if (companyId) {
      const result = await tursoClient.execute({
        sql: "SELECT * FROM companies WHERE id = ?",
        args: [companyId],
      });
      company = result.rows[0];
    } else {
      const result = await tursoClient.execute({
        sql: "SELECT * FROM companies WHERE key = ?",
        args: [companyKey],
      });
      company = result.rows[0];
    }

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // TODO: Implement actual enhancement logic
    // This could include:
    // - Re-scraping company website
    // - Enriching with AI-generated descriptions
    // - Updating ATS boards
    // - Fetching additional company data from external sources
    // - Updating company facts and snapshots
    
    // For now, just update the updated_at timestamp to indicate processing
    await tursoClient.execute({
      sql: "UPDATE companies SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [company.id],
    });

    // You could also trigger an Inngest workflow here:
    // await inngest.send({
    //   name: "company/enhance",
    //   data: {
    //     companyId: company.id,
    //     companyKey: company.key,
    //   },
    // });

    return NextResponse.json({
      success: true,
      message: "Company enhancement initiated",
      companyId: company.id,
      companyKey: company.key,
    });
  } catch (error) {
    console.error("Error enhancing company:", error);
    return NextResponse.json(
      {
        error: "Failed to enhance company",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
