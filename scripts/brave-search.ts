import "dotenv/config";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { BraveSearchAgent } from "../src/brave/search-agent";

const MAX_AGE_DAYS = 7; // Show jobs from last 7 days

function parseDaysAgo(
  ageArray: [string, string, string] | null,
): number | null {
  if (!ageArray) return null;

  const relativeTime = ageArray[2]; // "2 days ago", "6 days ago"
  if (!relativeTime) return null;

  // Parse "X days ago" or "X hours ago"
  const hoursMatch = relativeTime.match(/(\d+)\s+hours?\s+ago/i);
  if (hoursMatch) {
    return parseInt(hoursMatch[1]) / 24; // Convert hours to fractional days
  }

  const daysMatch = relativeTime.match(/(\d+)\s+days?\s+ago/i);
  if (daysMatch) {
    return parseInt(daysMatch[1]);
  }

  // "today" or "yesterday"
  if (relativeTime.toLowerCase().includes("today")) return 0;
  if (relativeTime.toLowerCase().includes("yesterday")) return 1;

  return null;
}

async function searchRemoteJobs() {
  console.log(
    "🏢 Searching Fresh AI Engineer Remote Jobs using Brave LLM Context API\n",
  );

  try {
    const agent = new BraveSearchAgent();

    // Build query for AI engineer remote jobs
    const query = [
      '"AI engineer" OR "ML engineer" OR "machine learning engineer" OR "LLM engineer"',
      '"fully remote" OR "remote worldwide" OR "remote position"',
      "2026", // Recency hint
      '-"US only" -"United States only" -"hybrid"',
    ].join(" ");

    console.log("🔍 Query:", query);
    console.log(`📅 Filtering: Last ${MAX_AGE_DAYS} days (when age available)`);
    console.log("🌐 Using Brave LLM Context API (/llm/context)\n");

    const response = await agent.search({
      q: query,
      count: 50,
      maximum_number_of_tokens: 16384,
      maximum_number_of_urls: 50,
      maximum_number_of_snippets: 100,
      context_threshold_mode: "lenient", // More permissive
      search_lang: "en",
    });

    // Extract sources from grounding data
    let allSources = response.grounding.generic.map((item) => ({
      url: item.url,
      title: item.title,
      snippets: item.snippets,
      metadata: response.sources[item.url],
    }));

    console.log(`📥 Initial results: ${allSources.length} sources`);
    console.log(`🔍 Filtering by freshness...\n`);

    // Filter by freshness if age metadata is available
    const freshSources = allSources.filter((source) => {
      const daysAgo = parseDaysAgo(source.metadata?.age);

      // If no age metadata, include it (Ashby often doesn't provide age)
      if (daysAgo === null) {
        return true;
      }

      // If age is available, filter by MAX_AGE_DAYS
      return daysAgo <= MAX_AGE_DAYS;
    });

    console.log(
      `📅 Fresh jobs (≤${MAX_AGE_DAYS} days or unknown age): ${freshSources.length}\n`,
    );

    console.log(`📋 All positions:\n`);

    freshSources.forEach((source, idx) => {
      console.log(`   ${idx + 1}. ${source.title}`);
      console.log(`      ${source.url}`);
      if (source.metadata?.age) {
        const [formattedDate, isoDate, relativeTime] = source.metadata.age;
        console.log(`      📅 ${relativeTime || formattedDate}`);
      } else {
        console.log(`      📅 Age unknown (likely recent)`);
      }
      console.log();
    });

    // Save results to JSON
    console.log("💾 Saving results to JSON...");

    // Ensure results directory exists
    await mkdir(join(process.cwd(), "results"), { recursive: true });

    const results = {
      timestamp: new Date().toISOString(),
      searchType: "fresh_ai_engineer_remote_jobs",
      query,
      filters: {
        includes: [
          "AI engineer",
          "ML engineer",
          "machine learning engineer",
          "LLM engineer",
          "fully remote",
          "remote worldwide",
        ],
        excludes: ["US only", "United States only", "hybrid"],
        maxAgeDays: MAX_AGE_DAYS,
      },
      totalInitial: allSources.length,
      totalFresh: freshSources.length,
      sources: freshSources,
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputPath = join(
      process.cwd(),
      "results",
      `fresh-ai-engineer-remote-${timestamp}.json`,
    );
    await writeFile(outputPath, JSON.stringify(results, null, 2), "utf-8");
    console.log(`✅ Results saved to: ${outputPath}`);
    console.log();

    console.log("🎉 Job search completed!");
    console.log(
      `\n📊 Found ${freshSources.length} fresh AI engineer remote jobs`,
    );
    console.log(
      `💡 Filtered to last ${MAX_AGE_DAYS} days (when age metadata available)\n`,
    );
  } catch (error: any) {
    console.error("❌ Error searching remote jobs:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

searchRemoteJobs();
