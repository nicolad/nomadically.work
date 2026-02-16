import { NextRequest, NextResponse } from "next/server";
// import { getTursoClient } from "@/db"; // Removed - migrated to D1
import { auth, clerkClient } from "@clerk/nextjs/server";
import { ADMIN_EMAIL } from "@/lib/constants";

/**
 * POST /api/companies/enhance
 * Triggers company data enhancement/enrichment
 * Admin only
 * 
 * TODO: Re-implement with D1 database access
 * This endpoint is temporarily disabled pending D1 integration
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: "This endpoint is temporarily disabled during D1 migration",
      message: "Company enhancement feature will be restored after D1 integration is complete"
    },
    { status: 503 }
  );
  
  /* D1 Implementation needed:
  try {
    // Check authentication
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await clerkClient().users.getUser(userId);
    const userEmail = user.emailAddresses[0]?.emailAddress;

    if (userEmail !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { companyId, companyKey } = body;

    if (!companyId && !companyKey) {
      return NextResponse.json(
        { error: "Either companyId or companyKey is required" },
        { status: 400 },
      );
    }

    const tursoClient = getTursoClient();

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
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
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
      { status: 500 },
    );
  }
  */
}
