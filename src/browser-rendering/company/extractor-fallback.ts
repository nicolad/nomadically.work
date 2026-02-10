import type { ExtractionResult } from "./types";

/**
 * Fallback extractor using direct DeepSeek API without Browser Rendering
 * Use this if Cloudflare Browser Rendering is not available
 */
export async function extractCompanyDataFallback(
  targetUrl: string
): Promise<ExtractionResult> {
  const deepseekKey = process.env.DEEPSEEK_API_KEY;

  if (!deepseekKey) {
    throw new Error("Missing DEEPSEEK_API_KEY environment variable");
  }

  // Fetch the webpage HTML
  console.log(`Fetching ${targetUrl}...`);
  const htmlResponse = await fetch(targetUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!htmlResponse.ok) {
    throw new Error(
      `Failed to fetch ${targetUrl}: ${htmlResponse.status} ${htmlResponse.statusText}`
    );
  }

  const html = await htmlResponse.text();
  const textContent = extractTextFromHtml(html);

  // Call DeepSeek API directly
  console.log(`Calling DeepSeek API to extract company data...`);
  const deepseekResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deepseekKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are extracting company information from a webpage. Extract the following and return as JSON:
- company: {name, logo_url, website, careers_url, linkedin_url, description, industry, size, location, category, tags[], services[], industries[]}
  - category MUST be one of: CONSULTANCY, AGENCY, STAFFING, DIRECTORY, PRODUCT, OTHER, UNKNOWN
- ats_boards: [{url, vendor, board_type, confidence, is_active}]
- evidence: {source_type: "url", source_url, http_status, mime}
- notes: string[]

Return ONLY valid JSON, no markdown.`,
        },
        {
          role: "user",
          content: `Extract company data from this webpage:\n\nURL: ${targetUrl}\n\nContent:\n${textContent.substring(0, 8000)}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!deepseekResponse.ok) {
    const errorText = await deepseekResponse.text();
    throw new Error(
      `DeepSeek API failed: ${deepseekResponse.status} ${errorText}`
    );
  }

  const deepseekData = await deepseekResponse.json();
  const extractedJson = deepseekData.choices?.[0]?.message?.content;

  if (!extractedJson) {
    throw new Error("DeepSeek API returned no content");
  }

  const extracted = JSON.parse(extractedJson) as ExtractionResult;

  // Ensure required fields
  if (!extracted.company) {
    throw new Error("Extraction missing company data");
  }
  if (!extracted.ats_boards) {
    extracted.ats_boards = [];
  }
  if (!extracted.evidence) {
    extracted.evidence = {
      source_type: "url",
      source_url: targetUrl,
      http_status: htmlResponse.status,
      mime: htmlResponse.headers.get("content-type") || null,
    };
  }

  return extracted;
}

/**
 * Simple HTML to text converter
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ");

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text;
}
