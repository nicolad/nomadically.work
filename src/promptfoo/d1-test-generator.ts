/**
 * Promptfoo live D1 test generator for EU remote classification.
 *
 * Promptfoo calls this at eval time via `tests: file://./d1-test-generator.ts`.
 * Queries D1 for classified jobs and returns Promptfoo test case objects whose
 * inline assertions compare LLM output to the DB ground truth.
 *
 * Requires (in .env.local):
 *   D1_GATEWAY_URL + D1_GATEWAY_KEY   (preferred)
 *   or
 *   CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_D1_DATABASE_ID + CLOUDFLARE_API_TOKEN
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createD1HttpClient } from "../db/d1-http";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RawJob {
  id: number;
  title: string;
  location: string | null;
  description: string | null;
  is_remote_eu: number | null;
  remote_eu_confidence: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Truncate description to ~600 chars at a word boundary, strip HTML. */
function trimDesc(raw: string | null, maxLen = 600): string {
  if (!raw) return "";
  const text = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}

function toConfidence(raw: string | null): "high" | "medium" | "low" {
  if (raw === "high" || raw === "medium" || raw === "low") return raw;
  return "medium";
}

/**
 * Build the inline JavaScript assertion string.
 *
 * Scores:
 *   1.0 — correct classification AND confidence band matches
 *   0.5 — correct classification, wrong confidence
 *   0.0 — wrong classification (or unparseable output)
 */
function buildAssertion(
  expectedIsRemoteEU: boolean,
  expectedConfidence: "high" | "medium" | "low",
): string {
  return `
(output) => {
  let parsed;
  try {
    const jsonMatch = output.match(/\\{[\\s\\S]*\\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(output);
  } catch {
    return { pass: false, score: 0, reason: 'Failed to parse JSON from LLM output' };
  }

  const gotClass = parsed.isRemoteEU === ${expectedIsRemoteEU};
  const gotConf  = parsed.confidence === ${JSON.stringify(expectedConfidence)};

  if (!gotClass) {
    return {
      pass: false,
      score: 0,
      reason: \`Wrong classification: expected isRemoteEU=${expectedIsRemoteEU}, got \${parsed.isRemoteEU}\`,
    };
  }
  if (!gotConf) {
    return {
      pass: true,
      score: 0.5,
      reason: \`Correct class but wrong confidence: expected ${expectedConfidence}, got \${parsed.confidence}\`,
    };
  }
  return { pass: true, score: 1, reason: 'Exact match' };
}
`.trim();
}

// ---------------------------------------------------------------------------
// D1 query helper
// ---------------------------------------------------------------------------

async function fetchClassifiedSample(
  client: ReturnType<typeof createD1HttpClient>,
  perBucket: number,
): Promise<RawJob[]> {
  const buckets: Array<{ label: string; sql: string }> = [
    {
      label: "eu-remote=true, high confidence",
      sql: `SELECT id, title, location, description, is_remote_eu, remote_eu_confidence
            FROM jobs
            WHERE is_remote_eu = 1
              AND remote_eu_confidence = 'high'
              AND title IS NOT NULL
              AND location IS NOT NULL
            ORDER BY RANDOM()
            LIMIT ${perBucket}`,
    },
    {
      label: "eu-remote=true, medium/low confidence",
      sql: `SELECT id, title, location, description, is_remote_eu, remote_eu_confidence
            FROM jobs
            WHERE is_remote_eu = 1
              AND remote_eu_confidence IN ('medium', 'low')
              AND title IS NOT NULL
              AND location IS NOT NULL
            ORDER BY RANDOM()
            LIMIT ${perBucket}`,
    },
    {
      label: "eu-remote=false, high confidence",
      sql: `SELECT id, title, location, description, is_remote_eu, remote_eu_confidence
            FROM jobs
            WHERE is_remote_eu = 0
              AND remote_eu_confidence = 'high'
              AND title IS NOT NULL
              AND location IS NOT NULL
            ORDER BY RANDOM()
            LIMIT ${perBucket}`,
    },
    {
      label: "eu-remote=false, medium/low confidence",
      sql: `SELECT id, title, location, description, is_remote_eu, remote_eu_confidence
            FROM jobs
            WHERE is_remote_eu = 0
              AND remote_eu_confidence IN ('medium', 'low')
              AND title IS NOT NULL
              AND location IS NOT NULL
            ORDER BY RANDOM()
            LIMIT ${perBucket}`,
    },
  ];

  const seen = new Set<number>();
  const rows: RawJob[] = [];

  for (const bucket of buckets) {
    const result = await client.prepare(bucket.sql).all();
    const bucketRows = result.results as RawJob[];
    console.log(`  ${bucket.label}: ${bucketRows.length} rows`);
    for (const row of bucketRows) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        rows.push(row);
      }
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Default export — Promptfoo calls this to generate test cases
// ---------------------------------------------------------------------------

export default async function generateTests() {
  console.log("🗃️  d1-test-generator: querying D1 for classified jobs…");

  const client = createD1HttpClient();
  const rows = await fetchClassifiedSample(client, 10);

  if (rows.length === 0) {
    throw new Error(
      "No classified jobs in D1. Run the process-jobs pipeline first:\n" +
        "  pnpm cron:trigger",
    );
  }

  console.log(`  → ${rows.length} total test cases`);

  return rows.map((row) => {
    const isRemoteEU = row.is_remote_eu === 1;
    const confidence = toConfidence(row.remote_eu_confidence);

    return {
      description: `[DB:${row.id}] ${row.title} (${row.location ?? "unknown"})`,
      vars: {
        title: row.title ?? "",
        location: row.location ?? "",
        description: trimDesc(row.description),
      },
      assert: [
        {
          type: "javascript",
          value: buildAssertion(isRemoteEU, confidence),
        },
      ],
    };
  });
}
