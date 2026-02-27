import { NextRequest } from "next/server";
import OpenAI from "openai";
import { emailSchema } from "@/lib/email-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

interface EmailGenerationRequest {
  recipientName: string;
  recipientContext?: string;
  companyName?: string;
  instructions?: string;
}

function buildPrompt(input: EmailGenerationRequest): string {
  const firstName = input.recipientName.split(" ")[0] || input.recipientName;

  return `You are helping Vadim Nicolai (Senior Frontend Engineer) craft a personalized outreach email.

RECIPIENT DETAILS:
- Name: ${input.recipientName} (use "${firstName}" in greeting)
${input.companyName ? `- Company: ${input.companyName}` : ""}
${input.recipientContext ? `- Context: ${input.recipientContext}` : ""}

VADIM'S BACKGROUND:
- Senior Frontend Engineer with 10+ years experience
- Expertise: React, TypeScript, Rust
- Looking for: remote EU opportunities

${input.instructions ? `SPECIAL INSTRUCTIONS (CRITICAL):\n${input.instructions}\n` : ""}

REQUIREMENTS:
1. Generate a professional email
2. Start with "Hey ${firstName},"
3. Keep it concise (150-300 words)
4. Include a clear CTA
5. End with "Thanks,\\nVadim"
6. Do NOT make up facts about the recipient

Generate the email as a JSON object:
{
  "subject": "Your subject line here",
  "body": "Your email body here"
}`;
}

export async function POST(request: NextRequest) {
  try {
    const input: EmailGenerationRequest = await request.json();

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const prompt = buildPrompt(input);

          const completion = await openai.chat.completions.create({
            model: "deepseek-chat",
            messages: [
              {
                role: "system",
                content:
                  "You are an expert email writer. Always respond with valid JSON matching the requested structure.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 1.3,
            stream: true,
            response_format: { type: "json_object" },
          });

          let fullText = "";

          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullText += content;

              const message = {
                type: "chunk",
                content: content,
                accumulated: fullText,
              };

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(message)}\n\n`),
              );
            }
          }

          try {
            const parsed = JSON.parse(fullText);
            const validated = emailSchema.parse(parsed);

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "complete", data: validated })}\n\n`,
              ),
            );
          } catch {
            const subjectMatch = fullText.match(/"subject":\s*"([^"]+)"/);
            const bodyMatch = fullText.match(/"body":\s*"([^"]+)"/);

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "complete",
                  data: {
                    subject: subjectMatch?.[1] || "Follow up",
                    body: bodyMatch?.[1] || fullText,
                  },
                })}\n\n`,
              ),
            );
          }

          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: error instanceof Error ? error.message : "Unknown error",
              })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Failed to generate email",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
