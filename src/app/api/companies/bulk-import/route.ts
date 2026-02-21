import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/companies/bulk-import
 * TODO: Re-implement with D1 database access (Drizzle ORM)
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: "This endpoint is temporarily disabled",
      message: "Company bulk import will be restored after D1 integration is complete",
    },
    { status: 503 },
  );
}
