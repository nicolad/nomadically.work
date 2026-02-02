import { NextRequest, NextResponse } from "next/server";
import { getTursoClient } from "@/lib/turso";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const client = getTursoClient();
    const result = await client.execute({
      sql: "SELECT * FROM jobs WHERE id = ?",
      args: [id],
    });

    const job = result.rows?.[0];

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error("Error fetching job:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
