import { NextRequest, NextResponse } from "next/server";
import { getTursoClient } from "@/lib/turso";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const company = searchParams.get("company");
  const source = searchParams.get("source");

  if (!company || !source) {
    return NextResponse.json(
      { error: "Missing required parameters: company and source" },
      { status: 400 },
    );
  }

  try {
    const client = getTursoClient();

    // Find the job matching the company and source
    const result = await client.execute({
      sql: "SELECT * FROM jobs WHERE company_key = ? AND source_kind = ? LIMIT 1",
      args: [company, source],
    });

    const job = result.rows?.[0];

    if (!job) {
      return NextResponse.json(
        { error: `No job found for company: ${company}, source: ${source}` },
        { status: 404 },
      );
    }

    // Redirect to the job detail page with the same query parameters
    const redirectUrl = new URL(`/jobs/${job.id}`, request.nextUrl.origin);
    redirectUrl.searchParams.set("company", company);
    redirectUrl.searchParams.set("source", source);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Error finding job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
