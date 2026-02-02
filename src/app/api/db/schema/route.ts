import { NextResponse } from "next/server";
import { getD1Client } from "@/lib/cloudflare-d1";

export async function GET() {
  try {
    const d1Client = getD1Client();

    // Get all tables
    const tables = await d1Client.getTables();

    // Get schema for jobs table
    const jobsSchema = await d1Client.getTableSchema("jobs");

    return NextResponse.json({
      success: true,
      data: {
        tables,
        jobsSchema,
      },
    });
  } catch (error) {
    console.error("Error fetching database schema:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
