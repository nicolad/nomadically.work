import Cloudflare from "cloudflare";
import type { ExtractionResult } from "./types";
import { extractCompanyDataFallback } from "./extractor-fallback";

/**
 * Extract company data using DeepSeek via Cloudflare Workers AI
 * Falls back to direct DeepSeek API if Browser Rendering is not available
 * 
 * Requirements:
 * - CLOUDFLARE_BROWSER_RENDERING_KEY (required)
 * - CLOUDFLARE_ACCOUNT_ID
 * - DEEPSEEK_API_KEY (required)
 * 
 * Setup guide: See docs/CREATE_CLOUDFLARE_TOKEN.md
 */
export async function extractCompanyData(
  targetUrl: string
): Promise<ExtractionResult> {
  const browserRenderingKey = process.env.CLOUDFLARE_BROWSER_RENDERING_KEY;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;

  // Debug: Log which credentials are available (without exposing the actual values)
  console.log("🔑 Cloudflare credentials check:");
  console.log("   CLOUDFLARE_BROWSER_RENDERING_KEY:", browserRenderingKey ? `✓ (${browserRenderingKey.substring(0, 10)}...)` : "✗ not set");
  console.log("   CLOUDFLARE_ACCOUNT_ID:", accountId ? `✓ (${accountId})` : "✗ not set");
  console.log("   DEEPSEEK_API_KEY:", deepseekKey ? `✓ (${deepseekKey.substring(0, 10)}...)` : "✗ not set");

  if (!browserRenderingKey) {
    throw new Error("Missing CLOUDFLARE_BROWSER_RENDERING_KEY environment variable");
  }
  if (!accountId) throw new Error("Missing CLOUDFLARE_ACCOUNT_ID environment variable");
  if (!deepseekKey) throw new Error("Missing DEEPSEEK_API_KEY environment variable");

  const client = new Cloudflare({ apiToken: browserRenderingKey });

  const prompt = `
You are extracting a "Company golden record" from a webpage for downstream GraphQL storage.

CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no explanatory text. Just the raw JSON object.

Expected structure:
{
  "company": {
    "name": "...",
    "logo_url": "...",
    "website": "...",
    "careers_url": "...",
    "linkedin_url": "...",
    "description": "...",
    "industry": "...",
    "size": "...",
    "location": "...",
    "canonical_domain": "...",
    "category": "CONSULTANCY|AGENCY|STAFFING|DIRECTORY|PRODUCT|OTHER|UNKNOWN",
    "tags": [...],
    "services": [...],
    "industries": [...]
  },
  "ats_boards": [
    {
      "url": "...",
      "vendor": "...",
      "board_type": "...",
      "confidence": 0.9,
      "is_active": true
    }
  ],
  "evidence": {
    "source_type": "url",
    "source_url": "...",
    "http_status": 200,
    "mime": "text/html"
  },
  "notes": [...]
}

Hard rules:
- Output MUST be valid JSON matching the structure above.
- Do not invent values. If unknown, set null (or [] where schema allows).
- Prefer official signals on-page (header/footer, about/careers links, meta tags, JSON-LD, OpenGraph).

Field mapping guidance:
- canonical_domain: derive from the input URL host (strip "www.").
- website: canonical URL if present, otherwise the input URL.
- logo_url: choose a clear brand logo; use an absolute URL.
- category: MUST be one of: CONSULTANCY, AGENCY, STAFFING, DIRECTORY, PRODUCT, OTHER, UNKNOWN.
  - CONSULTANCY: companies providing consulting/advisory services
  - AGENCY: marketing, design, or creative agencies
  - STAFFING: recruitment/staffing agencies
  - DIRECTORY: job boards or company directories
  - PRODUCT: product companies building software/hardware
  - OTHER: doesn't fit other categories
  - UNKNOWN: insufficient information to classify
- careers_url:
  - Find the best official careers/jobs link by scanning navigation menus, headers, footers, and body content.
  - Look for links labeled "Careers", "Jobs", "Join Us", "Work With Us", "We're Hiring", or similar.
  - Prefer internal paths like "/careers", "/careers/", "/jobs", "/join-us" or dedicated careers subdomains (e.g., "careers.company.com").
  - Prefer internal company-hosted careers pages over external ATS boards when both exist.
  - Must use an absolute URL (e.g., "https://orases.com/careers/" not "/careers").
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
      // Note: response_format with json_schema is not supported by Cloudflare Browser Rendering
      // with custom AI models. We rely on the prompt to instruct JSON output.
      custom_ai: [
        {
          model: "deepseek/deepseek-chat",
          authorization: `Bearer ${deepseekKey}`,
        },
      ],
      gotoOptions: { waitUntil: "networkidle0" },
    });

    console.log("📦 Cloudflare response structure:");
    console.log("   Type:", typeof cfResp);
    console.log("   Keys:", Object.keys(cfResp || {}));
    console.log("   Full response:", JSON.stringify(cfResp, null, 2));

    const extracted = (cfResp as any)?.result as ExtractionResult | undefined;

    if (!extracted) {
      console.error("❌ Failed to extract data from response");
      console.error("   cfResp:", JSON.stringify(cfResp, null, 2));
      throw new Error("Failed to extract company data from webpage");
    }

    return extracted;
  } catch (error: any) {
    // Log the actual error for debugging
    console.error("❌ Cloudflare Browser Rendering error:");
    console.error("   Status:", error.status);
    console.error("   Message:", error.message);
    if (error.response) {
      console.error("   Response:", JSON.stringify(error.response, null, 2));
    }
    
    // Fall back to direct DeepSeek API if Browser Rendering is not available or unsupported
    if (error.status === 401 || error.status === 403 || error.status === 422) {
      console.warn(
        "⚠️  Cloudflare Browser Rendering not available (missing permissions, not enabled, or unsupported format)."
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
