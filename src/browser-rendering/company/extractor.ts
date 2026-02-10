import Cloudflare from "cloudflare";
import type { ExtractionResult } from "./types";
import { extractCompanyDataFallback } from "./extractor-fallback";

/**
 * Extract company data using DeepSeek via Cloudflare Workers AI
 * Falls back to direct DeepSeek API if Browser Rendering is not available
 * 
 * Requirements:
 * - CLOUDFLARE_BROWSER_RENDERING_KEY (preferred) or CLOUDFLARE_API_TOKEN
 * - CLOUDFLARE_ACCOUNT_ID
 * - DEEPSEEK_API_KEY (required)
 * 
 * Setup guide: See docs/CREATE_CLOUDFLARE_TOKEN.md
 */
export async function extractCompanyData(
  targetUrl: string
): Promise<ExtractionResult> {
  // Use dedicated Browser Rendering key if available, otherwise fall back to API token
  const browserRenderingKey = process.env.CLOUDFLARE_BROWSER_RENDERING_KEY;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;

  const cloudflareToken = browserRenderingKey || apiToken;

  if (!cloudflareToken) {
    throw new Error("Missing CLOUDFLARE_BROWSER_RENDERING_KEY or CLOUDFLARE_API_TOKEN environment variable");
  }
  if (!accountId) throw new Error("Missing CLOUDFLARE_ACCOUNT_ID environment variable");
  if (!deepseekKey) throw new Error("Missing DEEPSEEK_API_KEY environment variable");

  const client = new Cloudflare({ apiToken: cloudflareToken });

  const response_format = {
    type: "json_schema",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        company: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: ["string", "null"] },
            key: { type: ["string", "null"] },

            name: { type: "string" },
            logo_url: { type: ["string", "null"] },
            website: { type: ["string", "null"] },

            careers_url: { type: ["string", "null"] },
            linkedin_url: { type: ["string", "null"] },

            description: { type: ["string", "null"] },
            industry: { type: ["string", "null"] },
            size: { type: ["string", "null"] },
            location: { type: ["string", "null"] },
            created_at: { type: ["string", "null"] },
            updated_at: { type: ["string", "null"] },

            canonical_domain: { type: ["string", "null"] },
            category: { type: ["string", "null"] },
            tags: { type: ["array", "null"], items: { type: "string" } },
            services: { type: ["array", "null"], items: { type: "string" } },
            service_taxonomy: {
              type: ["array", "null"],
              items: { type: "string" },
            },
            industries: { type: ["array", "null"], items: { type: "string" } },
            score: { type: ["number", "null"] },
            score_reasons: {
              type: ["array", "null"],
              items: { type: "string" },
            },

            last_seen_crawl_id: { type: ["string", "null"] },
            last_seen_capture_timestamp: { type: ["string", "null"] },
            last_seen_source_url: { type: ["string", "null"] },

            ats_boards: {
              type: ["array", "null"],
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  id: { type: ["string", "null"] },
                  url: { type: "string" },
                  vendor: { type: ["string", "null"] },
                  board_type: { type: ["string", "null"] },
                  confidence: { type: ["number", "null"] },
                  is_active: { type: ["boolean", "null"] },
                  first_seen_at: { type: ["string", "null"] },
                  last_seen_at: { type: ["string", "null"] },
                },
                required: ["url"],
              },
            },
          },
          required: ["name"],
        },

        ats_boards: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: ["string", "null"] },
              company_id: { type: ["string", "null"] },
              url: { type: "string" },
              vendor: { type: ["string", "null"] },
              board_type: { type: ["string", "null"] },
              confidence: { type: ["number", "null"] },
              is_active: { type: ["boolean", "null"] },
              first_seen_at: { type: ["string", "null"] },
              last_seen_at: { type: ["string", "null"] },
              evidence: {
                type: ["object", "null"],
                additionalProperties: false,
                properties: {
                  source_type: { type: "string" },
                  source_url: { type: ["string", "null"] },
                  crawl_id: { type: ["string", "null"] },
                  capture_timestamp: { type: ["string", "null"] },
                  observed_at: { type: ["string", "null"] },
                  method: { type: ["string", "null"] },
                  extractor_version: { type: ["string", "null"] },
                  http_status: { type: ["number", "null"] },
                  mime: { type: ["string", "null"] },
                  content_hash: { type: ["string", "null"] },
                  warc: {
                    type: ["object", "null"],
                    additionalProperties: false,
                    properties: {
                      filename: { type: ["string", "null"] },
                      offset: { type: ["number", "null"] },
                      length: { type: ["number", "null"] },
                      digest: { type: ["string", "null"] },
                    },
                  },
                },
                required: ["source_type"],
              },
              created_at: { type: ["string", "null"] },
              updated_at: { type: ["string", "null"] },
            },
            required: ["url"],
          },
        },

        evidence: {
          type: "object",
          additionalProperties: false,
          properties: {
            source_type: { type: "string" },
            source_url: { type: ["string", "null"] },
            crawl_id: { type: ["string", "null"] },
            capture_timestamp: { type: ["string", "null"] },
            observed_at: { type: ["string", "null"] },
            method: { type: ["string", "null"] },
            extractor_version: { type: ["string", "null"] },
            http_status: { type: ["number", "null"] },
            mime: { type: ["string", "null"] },
            content_hash: { type: ["string", "null"] },
            warc: {
              type: ["object", "null"],
              additionalProperties: false,
              properties: {
                filename: { type: ["string", "null"] },
                offset: { type: ["number", "null"] },
                length: { type: ["number", "null"] },
                digest: { type: ["string", "null"] },
              },
            },
          },
          required: ["source_type"],
        },

        notes: { type: ["array", "null"], items: { type: "string" } },
      },
      required: ["company", "ats_boards", "evidence"],
    },
  } as const;

  const prompt = `
You are extracting a "Company golden record" from a webpage for downstream GraphQL storage.

Hard rules:
- Output MUST match the provided JSON Schema exactly.
- Do not invent values. If unknown, set null (or [] where schema allows).
- Prefer official signals on-page (header/footer, about/careers links, meta tags, JSON-LD, OpenGraph).

Field mapping guidance:
- canonical_domain: derive from the input URL host (strip "www.").
- website: canonical URL if present, otherwise the input URL.
- logo_url: choose a clear brand logo; use an absolute URL.
- careers_url:
  - Find the best official careers/jobs link.
  - Prefer internal "/careers", "/jobs", "/join-us", "/work-with-us" or a dedicated careers subdomain.
  - Prefer internal company-hosted careers pages over external ATS links when both exist.
  - Use an absolute URL.
- linkedin_url:
  - Find the company LinkedIn page (prefer "https://www.linkedin.com/company/...").
  - Use an absolute URL.
  - If multiple LinkedIn links exist (company, showcase, people), pick the "company" page if available.

ATS/job boards:
- Scan links that look like careers/jobs/apply and known vendors (Greenhouse, Lever, Workday, SmartRecruiters, Ashby, BambooHR, iCIMS, Jobvite, Teamtailor, Recruitee).
- For each ATS board found:
  - url must be absolute.
  - vendor: best guess based on domain/path (e.g., "GREENHOUSE", "LEVER", "ASHBY", "WORKABLE", etc.).
  - board_type: "ats" | "careers_page" | "jobs_board" (pick one).
  - confidence: number 0..1 (high when vendor is obvious).
  - is_active: true if it appears reachable and relevant.

Evidence:
- source_type: "url"
- source_url: input URL
- http_status/mime/content_hash/etc: if unknown, null (do not guess).

Put any uncertainties/caveats in notes[].

Extract from: ${targetUrl}
  `.trim();

  try {
    const cfResp = await client.browserRendering.json.create({
      account_id: accountId,
      url: targetUrl,
      prompt,
      response_format,
      custom_ai: [
        {
          model: "deepseek/deepseek-chat",
          authorization: `Bearer ${deepseekKey}`,
        },
      ],
      gotoOptions: { waitUntil: "networkidle0" },
    });

    const extracted = (cfResp as any)?.result as ExtractionResult | undefined;

    if (!extracted) {
      throw new Error("Failed to extract company data from webpage");
    }

    return extracted;
  } catch (error: any) {
    // Fall back to direct DeepSeek API if Browser Rendering is not available
    if (error.status === 401 || error.status === 403) {
      console.warn(
        "⚠️  Cloudflare Browser Rendering not available (missing permissions or not enabled)."
      );
      console.warn("   Falling back to direct DeepSeek API...");
      console.warn(
        "   To use Browser Rendering, see: docs/CREATE_CLOUDFLARE_TOKEN.md"
      );

      // Use fallback extractor
      return await extractCompanyDataFallback(targetUrl);
    }

    // Re-throw other errors
    throw error;
  }
}
