import { NextRequest, NextResponse } from "next/server";
import { getTursoClient } from "@/lib/turso";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const company = searchParams.get("company");

  if (!company) {
    return NextResponse.json(
      { error: "Missing company parameter" },
      { status: 400 }
    );
  }

  try {
    const client = getTursoClient();
    const result = await client.execute({
      sql: "SELECT id, external_id, source_id, source_kind, company_key, title FROM jobs WHERE company_key = ? LIMIT 5",
      args: [company],
    });

    return NextResponse.json({
      success: true,
      count: result.rows.length,
      jobs: result.rows,
    });
  } catch (error) {
    console.error("Error fetching job data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
