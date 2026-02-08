import { z } from "zod";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import {
  ccxGetRecentCrawlIdsTool,
  ccxCdxLatestTool,
  ccxFetchHtmlFromWarcTool,
  type CdxRecord,
} from "./ccx-tools";
import {
  normalizeDomain,
  keyUrlsForDomain,
  extractFactsFromHtml,
  scoreFromFactsAndHtml,
  buildGoldenRecord,
  type GoldenRecord,
} from "./consultancy-extract";

const InputSchema = z.object({
  domains: z.array(z.string()).min(1),
  recentCrawls: z.number().int().min(1).max(24).default(6),
  maxPagesPerDomain: z.number().int().min(1).max(20).default(6),
  concurrency: z.number().int().min(1).max(30).default(6),
  minScore: z.number().min(0).max(1).default(0.65),
});

const OutputSchema = z.object({
  crawlIds: z.array(z.string()),
  results: z.array(
    z.object({
      canonicalDomain: z.string(),
      firmId: z.string(),
      score: z.number(),
      reasons: z.array(z.string()),
      name: z.string().optional(),
      websiteUrl: z.string().optional(),
      lastSeenCrawlId: z.string(),
      lastSeenCaptureTimestamp: z.string(),
      services: z.array(z.string()).optional(),
      locations: z.array(z.string()).optional(),
      sameAs: z.array(z.string()).optional(),
      facts: z.array(
        z.object({
          field: z.string(),
          value: z.any(),
          confidence: z.number(),
          evidence: z.object({
            sourceType: z.literal("commoncrawl"),
            sourceUrl: z.string(),
            crawlId: z.string(),
            captureTimestamp: z.string(),
            observedAtISO: z.string(),
            method: z.enum(["jsonld", "meta", "dom", "heuristic"]),
          }),
        }),
      ),
    }),
  ),
});

async function newestCaptureAcrossCrawls(args: {
  crawlIds: string[];
  url: string;
  requestContext?: any;
}): Promise<{ crawlId: string; rec: CdxRecord } | null> {
  const { crawlIds, url, requestContext } = args;

  for (const crawlId of crawlIds) {
    const result = await ccxCdxLatestTool.execute?.(
      { crawlId, url },
      { requestContext },
    );
    if (!result || "error" in result) continue;
    const { record } = result;
    if (record && record.timestamp && record.filename)
      return { crawlId, rec: record as CdxRecord };
  }
  return null;
}

async function harvestDomain(args: {
  domain: string;
  crawlIds: string[];
  maxPagesPerDomain: number;
  requestContext?: any;
}): Promise<GoldenRecord | null> {
  const { domain, crawlIds, maxPagesPerDomain, requestContext } = args;

  const urls = keyUrlsForDomain(domain, maxPagesPerDomain);

  const allFacts: ReturnType<typeof extractFactsFromHtml> = [];

  let best: {
    crawlId: string;
    rec: CdxRecord;
    html: string;
    pageScore: number;
  } | null = null;

  for (const url of urls) {
    const cap = await newestCaptureAcrossCrawls({
      crawlIds,
      url,
      requestContext,
    });
    if (!cap) continue;

    const offset = Number(cap.rec.offset);
    const length = Number(cap.rec.length);
    if (!Number.isFinite(offset) || !Number.isFinite(length)) continue;

    const result = await ccxFetchHtmlFromWarcTool.execute?.(
      { filename: cap.rec.filename, offset, length },
      { requestContext },
    );
    if (!result || "error" in result) continue;

    const html = result.html;
    if (!html) continue;

    const pageFacts = extractFactsFromHtml({
      html,
      crawlId: cap.crawlId,
      captureTimestamp: cap.rec.timestamp,
      sourceUrl: cap.rec.url,
    });
    allFacts.push(...pageFacts);

    const { score: pageScore } = scoreFromFactsAndHtml(html, pageFacts);

    const isBetter =
      !best ||
      pageScore > best.pageScore ||
      (pageScore === best.pageScore && cap.rec.timestamp > best.rec.timestamp);

    if (isBetter) {
      best = { crawlId: cap.crawlId, rec: cap.rec, html, pageScore };
    }
  }

  if (!best) return null;

  return buildGoldenRecord({
    domain,
    crawlId: best.crawlId,
    captureTimestamp: best.rec.timestamp,
    sourceUrl: best.rec.url,
    html: best.html,
    facts: allFacts,
  });
}

const ResolveCrawlsStep = createStep({
  id: "resolve-crawls",
  inputSchema: z.object({
    domains: z.array(z.string()),
    recentCrawls: z.number().optional(),
    maxPagesPerDomain: z.number().optional(),
    concurrency: z.number().optional(),
    minScore: z.number().optional(),
  }),
  outputSchema: z.object({
    input: z.object({
      domains: z.array(z.string()),
      recentCrawls: z.number(),
      maxPagesPerDomain: z.number(),
      concurrency: z.number(),
      minScore: z.number(),
    }),
    crawlIds: z.array(z.string()),
  }),
  execute: async ({ inputData, requestContext }) => {
    const result = await ccxGetRecentCrawlIdsTool.execute?.(
      { limit: inputData.recentCrawls ?? 6 },
      { requestContext },
    );
    if (!result || "error" in result)
      throw new Error("Failed to fetch crawl IDs");
    const { crawlIds } = result;
    return {
      input: {
        domains: inputData.domains,
        recentCrawls: inputData.recentCrawls ?? 6,
        maxPagesPerDomain: inputData.maxPagesPerDomain ?? 6,
        concurrency: inputData.concurrency ?? 6,
        minScore: inputData.minScore ?? 0.65,
      },
      crawlIds,
    };
  },
});

const HarvestDomainsStep = createStep({
  id: "harvest-domains",
  inputSchema: z.object({
    input: z.object({
      domains: z.array(z.string()),
      recentCrawls: z.number(),
      maxPagesPerDomain: z.number(),
      concurrency: z.number(),
      minScore: z.number(),
    }),
    crawlIds: z.array(z.string()),
  }),
  outputSchema: OutputSchema,
  execute: async ({ inputData, requestContext }) => {
    const { input, crawlIds } = inputData;

    const domains = input.domains.map(normalizeDomain).filter(Boolean);
    const queue = [...domains];
    const results: GoldenRecord[] = [];

    const workers = Array.from({ length: input.concurrency }, async () => {
      while (queue.length) {
        const d = queue.shift();
        if (!d) return;

        try {
          const rec = await harvestDomain({
            domain: d,
            crawlIds,
            maxPagesPerDomain: input.maxPagesPerDomain,
            requestContext,
          });
          if (rec && rec.score >= input.minScore) results.push(rec);
        } catch {
          // swallow per-domain errors; add logging/metrics in production
        }
      }
    });

    await Promise.all(workers);
    results.sort((a, b) => b.score - a.score);

    return {
      crawlIds,
      results: results.map((r) => ({
        canonicalDomain: r.canonicalDomain,
        firmId: r.firmId,
        score: r.score,
        reasons: r.reasons,
        name: r.name,
        websiteUrl: r.websiteUrl,
        lastSeenCrawlId: r.lastSeenCrawlId,
        lastSeenCaptureTimestamp: r.lastSeenCaptureTimestamp,
        services: r.services,
        locations: r.locations,
        sameAs: r.sameAs,
        facts: r.facts,
      })),
    };
  },
});

export const discoverConsultanciesCommonCrawlWorkflow = createWorkflow({
  id: "discover-consultancies-commoncrawl",
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
})
  .then(ResolveCrawlsStep)
  .then(HarvestDomainsStep)
  .commit();

export type DiscoverInput = z.infer<typeof InputSchema>;
export type DiscoverOutput = z.infer<typeof OutputSchema>;
