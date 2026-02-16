/**
 * Cloudflare Worker for Classifying Jobs as Remote EU
 * Runs periodically to classify unclassified jobs
 *
 * Uses DeepSeek API (BETA) for classification.
 */

import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { eq, or, isNull, sql as sqlOp, desc } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Schema definition for Drizzle
const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey(),
  external_id: text("external_id").notNull(),
  source_id: text("source_id"),
  source_kind: text("source_kind").notNull(),
  company_key: text("company_key").notNull(),
  title: text("title").notNull(),
  location: text("location"),
  url: text("url").notNull(),
  description: text("description"),
  posted_at: text("posted_at").notNull(),
  score: real("score"),
  score_reason: text("score_reason"),
  status: text("status"),
  created_at: text("created_at")
    .notNull()
    .default(sql`datetime('now')`),
  updated_at: text("updated_at")
    .notNull()
    .default(sql`datetime('now')`),
});

interface Env {
  DB: D1Database;

  // Preferred
  DEEPSEEK_API_KEY?: string;

  // Optional fallback if you already have it set
  OPENAI_API_KEY?: string;

  CRON_SECRET?: string;

  /**
   * Default: https://api.deepseek.com/beta
   * Override if needed.
   */
  DEEPSEEK_BASE_URL?: string;

  /**
   * Default: deepseek-chat
   */
  DEEPSEEK_MODEL?: string;
}

interface ScheduledEvent {
  scheduledTime: number;
  cron: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

interface Job {
  id: number;
  title: string;
  location: string | null;
  description: string | null;
  status: string | null;
}

interface ClassificationResult {
  isRemoteEU: boolean;
  confidence: "high" | "medium" | "low";
  reason: string;
}

function getApiKey(env: Env): string {
  const key = env.DEEPSEEK_API_KEY ?? env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "Missing API key: set DEEPSEEK_API_KEY (preferred) or OPENAI_API_KEY (fallback).",
    );
  }
  return key;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function safeTrim(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function safeJsonParseObject(text: string): unknown {
  // 1) direct parse
  try {
    return JSON.parse(text);
  } catch {}

  // 2) strip common code fences
  const stripped = safeTrim(
    text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, ""),
  );

  try {
    return JSON.parse(stripped);
  } catch {}

  // 3) extract first JSON object
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(stripped.slice(start, end + 1));
  }

  throw new Error("Failed to parse JSON object from model output.");
}

function normalizeConfidence(value: unknown): "high" | "medium" | "low" {
  const v = safeTrim(value).toLowerCase();
  if (v === "high" || v === "medium" || v === "low") return v;
  return "low";
}

function normalizeReason(value: unknown): string {
  const r = safeTrim(value);
  return r.length > 0 ? r : "No reason provided.";
}

function normalizeIsRemoteEU(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const v = safeTrim(value).toLowerCase();
  if (v === "true" || v === "yes" || v === "1") return true;
  if (v === "false" || v === "no" || v === "0") return false;
  return Boolean(value);
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  input: RequestInfo,
  init: RequestInit,
  retries = 3,
): Promise<Response> {
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(input, init);

      // Retry on rate limits or transient server errors
      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
        if (attempt === retries) return res;

        const backoff = Math.min(5000, 300 * 2 ** attempt);
        const jitter = Math.floor(Math.random() * 200);
        await sleep(backoff + jitter);
        continue;
      }

      return res;
    } catch (e) {
      lastErr = e;
      if (attempt === retries) break;

      const backoff = Math.min(5000, 300 * 2 ** attempt);
      const jitter = Math.floor(Math.random() * 200);
      await sleep(backoff + jitter);
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error("Unknown network error in fetchWithRetry");
}

function getChoiceContent(data: any): string {
  // OpenAI-compatible shape: data.choices[0].message.content
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : "";
}

async function classifyJobWithDeepSeekBeta(
  job: Job,
  apiKey: string,
  baseUrl: string,
  model: string,
): Promise<ClassificationResult> {
  const prompt = `Analyze this job posting and determine if it is a Remote EU position.

Title: ${job.title}
Location: ${job.location || "Not specified"}
Description: ${job.description || "Not specified"}

Consider:
- EMEA includes non-EU countries (UK post-Brexit, Switzerland, Middle East)
- CET timezone is not exclusive to EU
- UK is not part of EU since Brexit
- EU work authorization suggests EU remote
- Must be fully remote, not hybrid or onsite

Respond ONLY with a JSON object in this exact format:
{
  "isRemoteEU": boolean,
  "confidence": "high" | "medium" | "low",
  "reason": "brief explanation"
}`;

  try {
    // With base_url=https://api.deepseek.com/beta, endpoint is /chat/completions
    const url = `${baseUrl}/chat/completions`;

    const response = await fetchWithRetry(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          max_tokens: 250,

          // DeepSeek JSON mode (best effort to guarantee valid JSON)
          response_format: { type: "json_object" },

          messages: [
            {
              role: "system",
              content:
                "You are a job classification expert. Output JSON only. The output MUST be a single JSON object.",
            },
            { role: "user", content: prompt },
          ],
        }),
      },
      3,
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = getChoiceContent(data);

    if (!content.trim()) {
      throw new Error("No content in DeepSeek response");
    }

    const parsed = safeJsonParseObject(content);
    if (!isPlainObject(parsed)) {
      throw new Error("Model output was not a JSON object.");
    }

    return {
      isRemoteEU: normalizeIsRemoteEU(parsed.isRemoteEU),
      confidence: normalizeConfidence(parsed.confidence),
      reason: normalizeReason(parsed.reason),
    };
  } catch (error) {
    console.error("Error calling DeepSeek (beta):", error);
    return {
      isRemoteEU: false,
      confidence: "low",
      reason: `Classification failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

async function classifyUnclassifiedJobs(env: Env, limit = 50) {
  const db = drizzle(env.DB);

  const apiKey = getApiKey(env);

  // Default to beta
  const baseUrl = normalizeBaseUrl(
    env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/beta",
  );

  const model = env.DEEPSEEK_MODEL ?? "deepseek-chat";

  console.log("🔍 Fetching unclassified jobs...");

  const jobsList = await db
    .select()
    .from(jobs)
    .where(
      sqlOp`(${jobs.status} IS NULL OR ${jobs.status} = 'new') AND (${jobs.score} IS NULL OR ${jobs.score} = 0)`,
    )
    .orderBy(desc(jobs.created_at))
    .limit(limit);
  console.log(`📋 Found ${jobsList.length} jobs to classify`);

  if (jobsList.length === 0) {
    return {
      success: true,
      message: "No jobs to classify",
      stats: {
        processed: 0,
        euRemote: 0,
        nonEuRemote: 0,
        errors: 0,
      },
    };
  }

  const stats = {
    processed: 0,
    euRemote: 0,
    nonEuRemote: 0,
    errors: 0,
  };

  for (const job of jobsList) {
    try {
      console.log(`\n🤖 Classifying job ${job.id}: ${job.title}`);

      const classification = await classifyJobWithDeepSeekBeta(
        job,
        apiKey,
        baseUrl,
        model,
      );

      console.log(
        `   Result: ${
          classification.isRemoteEU ? "✅ EU Remote" : "❌ Non-EU"
        } (${classification.confidence})`,
      );
      console.log(`   Reason: ${classification.reason}`);

      await db
        .update(jobs)
        .set({
          score:
            classification.confidence === "high"
              ? 0.9
              : classification.confidence === "medium"
                ? 0.6
                : 0.3,
          score_reason: classification.reason,
          status: classification.isRemoteEU ? "eu-remote" : "non-eu",
          updated_at: sql`datetime('now')`,
        })
        .where(eq(jobs.id, job.id));

      stats.processed++;
      if (classification.isRemoteEU) stats.euRemote++;
      else stats.nonEuRemote++;

      // pacing
      await sleep(1000);
    } catch (error) {
      console.error(`❌ Error classifying job ${job.id}:`, error);
      stats.errors++;
    }
  }

  console.log(`\n✅ Classification complete!`);
  console.log(`   Processed: ${stats.processed}`);
  console.log(`   EU Remote: ${stats.euRemote}`);
  console.log(`   Non-EU: ${stats.nonEuRemote}`);
  console.log(`   Errors: ${stats.errors}`);

  return {
    success: true,
    message: `Classified ${stats.processed} jobs`,
    stats,
  };
}

export default {
  // Scheduled cron handler
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    console.log("🔄 Cloudflare Cron: Starting job classification...");

    try {
      const result = await classifyUnclassifiedJobs(env, 20);
      console.log(`✅ ${result.message}`);
    } catch (error) {
      console.error("❌ Error in classification cron:", error);
    }
  },

  // HTTP handler for manual triggering
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Method not allowed. Use POST to trigger classification.",
        }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Optional authentication
    if (env.CRON_SECRET) {
      const authHeader = request.headers.get("Authorization");
      const providedSecret = authHeader?.replace("Bearer ", "");
      if (providedSecret !== env.CRON_SECRET) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    try {
      const result = await classifyUnclassifiedJobs(env, 50);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Error processing request:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  },
};
