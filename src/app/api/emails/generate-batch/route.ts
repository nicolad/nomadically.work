import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { checkIsAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // reasoner takes longer

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

interface GenerateBatchEmailRequest {
  companyName?: string;
  instructions?: string;
  recipientCount?: number;
}

interface GenerateBatchEmailResponse {
  subject: string;
  body: string;
}

function buildBatchPrompt(input: GenerateBatchEmailRequest): string {
  const parts: string[] = [];

  // Instructions come FIRST — they are the primary driver of the email
  if (input.instructions) {
    parts.push(
      "PRIMARY GOAL (most important — the entire email must serve this):",
      input.instructions,
      "",
      "INTERPRETATION GUIDE:",
      "- If the goal mentions 'applied', 'application', 'no response', 'follow up', 'follow-up' → write a FOLLOW-UP email referencing a prior application, NOT a cold outreach.",
      "- If the goal is cold outreach → write an introduction email.",
      "- If the goal mentions a specific ask → make that the clear CTA.",
      "",
    );
  }

  if (input.companyName) {
    parts.push(`TARGET COMPANY: ${input.companyName}`, "");
  }

  parts.push(
    "SENDER BACKGROUND (use selectively — only what's relevant to the primary goal):",
    "- Vadim Nicolai, Senior Frontend/Rust Engineer, 10+ years experience",
    "- Expertise: React, TypeScript, Rust",
    "- Seeking: fully remote EU engineering roles",
    "",
    "EMAIL TEMPLATE RULES:",
    '1. Use {{name}} as the placeholder for the recipient\'s first name (start with "Hey {{name}},")',
    "2. 100-180 words MAX — be sharp and direct, cut all filler",
    "3. One clear CTA only",
    '4. End with "Thanks,\\nVadim"',
    "5. Do NOT fabricate recipient details",
    "6. The tone and framing must match the PRIMARY GOAL above",
    "",
    "Respond ONLY with valid JSON: { \"subject\": \"...\", \"body\": \"...\" }",
  );

  return parts.join("\n");
}

function parseJsonContent(
  content: string,
): GenerateBatchEmailResponse | null {
  // Attempt 1: direct parse
  try {
    const parsed: unknown = JSON.parse(content);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "subject" in parsed &&
      "body" in parsed &&
      typeof (parsed as Record<string, unknown>).subject === "string" &&
      typeof (parsed as Record<string, unknown>).body === "string"
    ) {
      return {
        subject: (parsed as Record<string, string>).subject,
        body: (parsed as Record<string, string>).body,
      };
    }
  } catch {
    // fall through
  }

  // Attempt 2: strip markdown code fences and retry
  const stripped = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    const parsed: unknown = JSON.parse(stripped);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "subject" in parsed &&
      "body" in parsed &&
      typeof (parsed as Record<string, unknown>).subject === "string" &&
      typeof (parsed as Record<string, unknown>).body === "string"
    ) {
      return {
        subject: (parsed as Record<string, string>).subject,
        body: (parsed as Record<string, string>).body,
      };
    }
  } catch {
    // fall through
  }

  // Attempt 3: regex extraction
  const subjectMatch = content.match(/"subject"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const bodyMatch = content.match(/"body"\s*:\s*"((?:[^"\\]|\\.)*)"/);

  if (subjectMatch?.[1] && bodyMatch?.[1]) {
    return {
      subject: subjectMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
      body: bodyMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
    };
  }

  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { isAdmin, userId } = await checkIsAdmin();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let input: GenerateBatchEmailRequest;

  try {
    const raw: unknown = await request.json();
    if (raw !== null && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      input = {
        companyName:
          typeof obj.companyName === "string" ? obj.companyName : undefined,
        instructions:
          typeof obj.instructions === "string" ? obj.instructions : undefined,
        recipientCount:
          typeof obj.recipientCount === "number"
            ? obj.recipientCount
            : undefined,
      };
    } else {
      input = {};
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const prompt = buildBatchPrompt(input);

  let rawContent: string;

  try {
    const completion = await openai.chat.completions.create({
      model: "deepseek-reasoner",
      messages: [
        {
          role: "system",
          content:
            "You are an expert email writer. Your top priority is the PRIMARY GOAL in the user prompt — every sentence must serve it. Respond ONLY with a JSON object: {\"subject\": \"...\", \"body\": \"...\"}. The body must use {{name}} as the placeholder for the recipient's first name. Never add fluff. Keep it under 180 words.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Model returned an empty response" },
        { status: 500 },
      );
    }
    rawContent = content;
  } catch (error) {
    const message = error instanceof Error ? error.message : "DeepSeek API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const parsed = parseJsonContent(rawContent);

  if (!parsed) {
    return NextResponse.json(
      { error: "Failed to parse model response as JSON" },
      { status: 500 },
    );
  }

  return NextResponse.json<GenerateBatchEmailResponse>(parsed);
}
