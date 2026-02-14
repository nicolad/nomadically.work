// src/evals/remote-ai-jobs-last-24h-worldwide-eu.evals.test.ts
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createScorer, runEvals } from "@mastra/core/evals";
import {
  jobSchema,
  remoteAiJobsFilterOnlyWorkflow,
  remoteAiJobsLast24hWorldwideEuWorkflow,
  type Job,
  type WorkflowOutput,
} from "../brave/remote-ai-jobs-last-24h-worldwide-eu";

// ----- helpers -----
function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  const normalize = (v: any): any => {
    if (v == null) return v;
    if (typeof v !== "object") return v;

    if (seen.has(v)) return "[Circular]";
    seen.add(v);

    if (Array.isArray(v)) return v.map(normalize);

    const keys = Object.keys(v).sort();
    const out: Record<string, any> = {};
    for (const k of keys) out[k] = normalize(v[k]);
    return out;
  };

  return JSON.stringify(normalize(value), null, 2);
}

function canonicalUrl(u: string) {
  try {
    const url = new URL(u);
    url.hash = "";
    const drop = new Set([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
      "ref",
      "source",
      "trk",
    ]);
    [...url.searchParams.keys()].forEach((k) => {
      if (drop.has(k.toLowerCase())) url.searchParams.delete(k);
    });
    return url.toString().replace(/\/$/, "");
  } catch {
    return u.replace(/[?#].*$/, "").trim();
  }
}

function blob(job: Job): string {
  return [
    job.title,
    job.company,
    job.locationText ?? "",
    job.salaryText ?? "",
    job.sourceUrl,
    job.applyUrl ?? "",
    ...(job.evidence ?? []),
  ]
    .join("\n")
    .toLowerCase();
}

function hasWorldwideSignal(t: string) {
  return /\b(worldwide|global remote|work from anywhere|remote anywhere|location-agnostic|anywhere in the world)\b/i.test(
    t,
  );
}

function hasEuropeSignal(t: string) {
  return /\b(europe|emea|european union|\beu\b|eea|\buk\b|united kingdom|ireland|germany|france|spain|portugal|netherlands|poland|romania|bulgaria|cet|cest|eet|eest|gmt|utc\+0|utc\+1|utc\+2|utc\+3)\b/i.test(
    t,
  );
}

function looksHybridOrOnsite(t: string) {
  return /\b(hybrid|on[-\s]?site|in[-\s]?office|office[-\s]?based)\b/i.test(t);
}

function hasRemotePositive(t: string) {
  return /\b(fully remote|100% remote|remote[-\s]?first|remote|distributed|work from home|wfh)\b/i.test(
    t,
  );
}

function parsePostedHours(job: Job): number | null {
  if (job.postedHoursAgo != null) return job.postedHoursAgo;
  const t = blob(job);
  let m = t.match(/\b(\d{1,3})\s*hours?\s*ago\b/);
  if (m?.[1]) return Math.max(0, Math.min(168, Number(m[1])));
  m = t.match(/\b(\d{1,3})\s*(h|hr|hrs)\b(?:\s*ago)?\b/);
  if (m?.[1]) return Math.max(0, Math.min(168, Number(m[1])));
  m = t.match(/\b(\d{1,3})\s*minutes?\s*ago\b/);
  if (m?.[1]) return 0;
  return null;
}

function within24hStrict(job: Job, nowMs: number): boolean {
  const inferred = parsePostedHours(job);
  if (inferred != null) return inferred <= 24;

  if (job.postedAtIso) {
    const ms = Date.parse(job.postedAtIso);
    if (!Number.isFinite(ms)) return false;
    return nowMs - ms <= 24 * 60 * 60 * 1000;
  }

  return false;
}

// ----- scorers (deterministic invariants) -----
const twoBucketsOnlyScorer = createScorer<any, WorkflowOutput>({
  id: "two-buckets-only",
  description: "Output must have exactly two keys: worldwide + europe.",
}).generateScore(({ run }) => {
  const out = run.output as any;
  if (!out || typeof out !== "object") return 0;

  const keys = Object.keys(out).sort();
  const ok =
    keys.length === 2 && keys[0] === "europe" && keys[1] === "worldwide";
  return ok ? 1 : 0;
});

const strictRemoteRegionFreshnessScorer = createScorer<any, WorkflowOutput>({
  id: "strict-remote-region-freshness",
  description:
    "All items must be fully remote (no hybrid), region must match bucket with explicit signals, and freshness must be provable <=24h.",
}).generateScore(({ run }) => {
  const out = run.output as WorkflowOutput;
  const nowMs =
    (run.input as any)?.nowMs ?? Date.parse("2026-02-14T12:00:00.000Z");

  const all: Array<{ bucket: "worldwide" | "europe"; job: Job }> = [
    ...out.worldwide.map((j) => ({ bucket: "worldwide" as const, job: j })),
    ...out.europe.map((j) => ({ bucket: "europe" as const, job: j })),
  ];

  if (all.length === 0) return 1; // invariant holds vacuously; existence is not asserted here

  let okCount = 0;

  for (const { bucket, job } of all) {
    const t = blob(job);

    const remoteOk =
      job.isFullyRemote === true &&
      hasRemotePositive(t) &&
      !looksHybridOrOnsite(t);
    const regionOk =
      bucket === "worldwide"
        ? job.remoteRegion === "worldwide" && hasWorldwideSignal(t)
        : job.remoteRegion === "europe" && hasEuropeSignal(t);

    const freshOk = within24hStrict(job, nowMs);

    if (remoteOk && regionOk && freshOk) okCount++;
  }

  return okCount / all.length;
});

const dedupeAcrossBucketsScorer = createScorer<any, WorkflowOutput>({
  id: "dedupe-across-buckets",
  description: "No duplicate canonical URL keys across or within buckets.",
}).generateScore(({ run }) => {
  const out = run.output as WorkflowOutput;
  const keys = new Set<string>();
  const all = [...out.worldwide, ...out.europe];

  if (all.length === 0) return 1;

  for (const j of all) {
    const key = canonicalUrl(j.applyUrl || j.sourceUrl);
    if (!key) return 0;
    if (keys.has(key)) return 0;
    keys.add(key);
  }

  return 1;
});

// ----- fixture data -----
const NOW_MS = Date.parse("2026-02-14T12:00:00.000Z");

const VALID_WORLDWIDE: Job = jobSchema.parse({
  title: "Senior LLM Engineer",
  company: "GlobAI",
  isFullyRemote: true,
  remoteRegion: "worldwide",
  postedHoursAgo: 5,
  sourceUrl: "https://example.com/jobs/llm-engineer?utm_source=x",
  applyUrl: "https://example.com/jobs/llm-engineer/apply",
  locationText: "Remote — work from anywhere (worldwide)",
  confidence: 0.9,
  evidence: [
    "Remote: work from anywhere",
    "Worldwide / global remote",
    "Posted 5 hours ago",
  ],
});

const VALID_EUROPE: Job = jobSchema.parse({
  title: "Applied AI Engineer",
  company: "EuroML",
  isFullyRemote: true,
  remoteRegion: "europe",
  postedAtIso: "2026-02-14T04:00:00.000Z",
  sourceUrl: "https://example.com/jobs/applied-ai-eu",
  locationText: "Remote (Europe) — CET/CEST",
  confidence: 0.88,
  evidence: ["Remote (Europe)", "CET/CEST time zone", "Posted on 2026-02-14"],
});

const HYBRID_SHOULD_DROP: Job = jobSchema.parse({
  title: "GenAI Engineer",
  company: "HybridCorp",
  isFullyRemote: true, // model might lie; guard should kill it
  remoteRegion: "europe",
  postedHoursAgo: 2,
  sourceUrl: "https://example.com/jobs/genai-hybrid",
  locationText: "Hybrid (Berlin)",
  confidence: 0.95,
  evidence: ["Hybrid role in Berlin", "2 hours ago"],
});

const US_ONLY_SHOULD_DROP: Job = jobSchema.parse({
  title: "AI Engineer",
  company: "USOnly Inc",
  isFullyRemote: true,
  remoteRegion: "worldwide", // model might misclassify; guard should kill it
  postedHoursAgo: 3,
  sourceUrl: "https://example.com/jobs/us-only",
  locationText: "Remote (US only)",
  confidence: 0.9,
  evidence: [
    "Remote (US)",
    "United States only",
    "3 hours ago",
    "Work authorization required in the US",
  ],
});

const MISSING_FRESHNESS_SHOULD_DROP: Job = jobSchema.parse({
  title: "LLM Engineer",
  company: "NoFresh Inc",
  isFullyRemote: true,
  remoteRegion: "worldwide",
  sourceUrl: "https://example.com/jobs/nofresh",
  locationText: "Remote — work from anywhere",
  confidence: 0.9,
  evidence: ["Remote — work from anywhere", "Worldwide"], // no postedHoursAgo/postedAtIso and no "hours ago"
});

const FILTER_INPUT = {
  worldwideJobs: [
    VALID_WORLDWIDE,
    US_ONLY_SHOULD_DROP,
    MISSING_FRESHNESS_SHOULD_DROP,
  ],
  europeJobs: [VALID_EUROPE, HYBRID_SHOULD_DROP],
  minConfidence: 0.55,
  nowMs: NOW_MS,
};

const EXPECTED_FILTER_OUTPUT: WorkflowOutput = {
  worldwide: [VALID_WORLDWIDE],
  europe: [VALID_EUROPE],
};

// ----- tests -----
describe("remote-ai-jobs-last-24h-worldwide-eu (evals)", () => {
  it("passes invariant scorers on filter-only workflow (CI-safe)", async () => {
    const result = await runEvals({
      target: remoteAiJobsFilterOnlyWorkflow,
      data: [{ input: FILTER_INPUT }],
      scorers: [
        twoBucketsOnlyScorer,
        strictRemoteRegionFreshnessScorer,
        dedupeAcrossBucketsScorer,
      ],
    });

    expect(result.scores["two-buckets-only"]).toBe(1);
    expect(result.scores["dedupe-across-buckets"]).toBe(1);

    // Expect perfect invariant satisfaction for this fixture
    expect(result.scores["strict-remote-region-freshness"]).toBe(1);
  });

  it("has stable output regression (golden output test)", async () => {
    // Direct comparison of workflow output with expected output
    const run = await remoteAiJobsFilterOnlyWorkflow.createRun();
    const result = await run.start({ inputData: FILTER_INPUT });

    expect(result.status).toBe("success");
    expect(result.result).toBeDefined();

    const actualOutput = result.result!;

    // Verify structure
    expect(actualOutput).toHaveProperty("worldwide");
    expect(actualOutput).toHaveProperty("europe");
    expect(Array.isArray(actualOutput.worldwide)).toBe(true);
    expect(Array.isArray(actualOutput.europe)).toBe(true);

    // Verify counts match expected
    expect(actualOutput.worldwide.length).toBe(
      EXPECTED_FILTER_OUTPUT.worldwide.length,
    );
    expect(actualOutput.europe.length).toBe(
      EXPECTED_FILTER_OUTPUT.europe.length,
    );

    // Verify actual jobs match expected (by sourceUrl)
    const actualWorldwideUrls = new Set(
      actualOutput.worldwide.map((j) => canonicalUrl(j.sourceUrl)),
    );
    const expectedWorldwideUrls = new Set(
      EXPECTED_FILTER_OUTPUT.worldwide.map((j) => canonicalUrl(j.sourceUrl)),
    );
    expect(actualWorldwideUrls).toEqual(expectedWorldwideUrls);

    const actualEuropeUrls = new Set(
      actualOutput.europe.map((j) => canonicalUrl(j.sourceUrl)),
    );
    const expectedEuropeUrls = new Set(
      EXPECTED_FILTER_OUTPUT.europe.map((j) => canonicalUrl(j.sourceUrl)),
    );
    expect(actualEuropeUrls).toEqual(expectedEuropeUrls);
  });

  it("optional live smoke test (requires BRAVE + DEEPSEEK keys)", async () => {
    const hasLive = Boolean(
      process.env.BRAVE_SEARCH_API_KEY && process.env.DEEPSEEK_API_KEY,
    );
    if (!hasLive) return;

    const result = await runEvals({
      target: remoteAiJobsLast24hWorldwideEuWorkflow,
      data: [
        {
          input: {
            queryHint: "agentic",
            maxCandidatesPerMode: 25,
            verifyTopNWithContext: 8,
            minConfidence: 0.6,
          },
        },
      ],
      scorers: [
        twoBucketsOnlyScorer,
        strictRemoteRegionFreshnessScorer,
        dedupeAcrossBucketsScorer,
      ],
    });

    // We don't assert "non-empty" because the web can legitimately yield 0 strict hits.
    expect(result.scores["two-buckets-only"]).toBe(1);
    expect(result.scores["dedupe-across-buckets"]).toBe(1);

    // Real-world data can be messy; keep threshold strict-ish but not brittle.
    expect(
      result.scores["strict-remote-region-freshness"],
    ).toBeGreaterThanOrEqual(0.85);
  });
});
