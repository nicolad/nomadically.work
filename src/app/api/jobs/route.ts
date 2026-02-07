import { NextRequest, NextResponse } from "next/server";
import { getTursoClient } from "@/lib/turso";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");
    const status = searchParams.get("status");

    const client = getTursoClient();

    let sql = "SELECT * FROM jobs";
    const params: any[] = [];
    const conditions: string[] = [];

    if (status) {
      conditions.push("status = ?");
      params.push(status);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY created_at DESC";

    if (limit) {
      sql += " LIMIT ?";
      params.push(parseInt(limit));
    }

    if (offset) {
      sql += " OFFSET ?";
      params.push(parseInt(offset));
    }

    const result = await client.execute({ sql, args: params });
    const jobs = result.rows || [];

    return NextResponse.json({
      success: true,
      data: jobs,
      count: jobs.length,
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
