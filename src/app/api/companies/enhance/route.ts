import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/companies/enhance
 * TODO: Re-implement with D1 database access
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: "This endpoint is temporarily disabled",
      message: "Company enhancement will be restored after D1 integration is complete",
    },
    { status: 503 },
  );
}
