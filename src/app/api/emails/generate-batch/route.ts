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
  const parts: string[] = [
    "You are helping Vadim Nicolai craft a batch outreach email TEMPLATE.",
    "",
    "This template will be sent to multiple recipients. Use {{name}} as the placeholder for each recipient's first name.",
    "",
  ];

  if (input.companyName) {
    parts.push(`TARGET COMPANY: ${input.companyName}`, "");
  }

  if (input.recipientCount !== undefined && input.recipientCount > 0) {
    parts.push(`BATCH SIZE: ${input.recipientCount} recipients`, "");
  }

  parts.push(
    "VADIM'S BACKGROUND:",
    "- Senior Frontend/Rust Engineer with 10+ years experience",
    "- Contributing to Nautech Systems high-performance trading engine (open source)",
    "- Built exchange adapters for dYdX v4 and Hyperliquid in Rust",
    "- Expertise: React, TypeScript, Rust, trading systems, distributed systems",
    "- Looking for: fully remote EU engineering roles",
    "",
  );

  if (input.instructions) {
    parts.push(
      "SPECIAL INSTRUCTIONS (follow these precisely):",
      input.instructions,
      "",
    );
  }

  parts.push(
    "REQUIREMENTS:",
    '1. Start the greeting with "Hey {{name}},"',
    "2. Keep the body concise: 150-250 words",
    "3. Be professional but direct — no fluff",
    "4. Include a clear call-to-action (e.g. ask for a 20-minute call)",
    '5. End with "Thanks,\\nVadim"',
    "6. Do NOT make up specific facts about the recipient",
    "7. Use {{name}} exactly — no other placeholder format",
    "",
    "Respond ONLY with a JSON object:",
    '{ "subject": "...", "body": "..." }',
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
            'You are an expert email writer. Respond ONLY with a JSON object with keys \'subject\' and \'body\'. The body must use {{name}} as the placeholder for the recipient\'s first name.',
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
