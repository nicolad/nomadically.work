import { NextResponse } from "next/server";
import { discoverJobSources } from "@/lib/brave-search";

/**
 * Cron endpoint to discover job sources via Brave Search API
 * Scheduled to run daily at midnight
 */
export async function GET(request: Request) {
  try {
    // Verify Vercel Cron secret (optional but recommended)
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET) {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const braveApiKey = process.env.BRAVE_API_KEY;

    if (!braveApiKey) {
      console.error("❌ BRAVE_API_KEY not configured");
      return NextResponse.json(
        {
          success: false,
          error:
            "Brave API key not configured. Set BRAVE_API_KEY in .env.local",
        },
        { status: 500 },
      );
    }

    console.log("🔄 Starting Brave Search job discovery cron...");

    // Discover job sources
    const result = await discoverJobSources(braveApiKey, {
      freshness: "pw", // Past week for daily updates
      maxOffsets: 2, // Fetch up to 3 pages per query type
    });

    console.log(
      `✅ Cron complete: Found ${result.stats.sourcesExtracted} sources`,
    );

    // TODO: Save discovered sources to D1 database
    // For now, just return the results

    return NextResponse.json({
      success: result.success,
      message: result.message,
      stats: result.stats,
      sourcesFound: result.sources.length,
      sources: result.sources.map((s) => ({
        kind: s.kind,
        companyKey: s.company_key,
        canonicalUrl: s.canonical_url,
        firstSeenAt: new Date(s.first_seen_at).toISOString(),
      })),
    });
  } catch (error) {
    console.error("❌ Error in Brave Search cron:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
