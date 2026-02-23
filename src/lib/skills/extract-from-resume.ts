import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { SKILL_LABELS } from "./taxonomy";

export const TAXONOMY_VERSION = "v1";
export const TAXONOMY_KEYS = Object.keys(SKILL_LABELS);

const skillExtractionSchema = z.object({
  skills: z.array(z.string()).describe(
    "Canonical skill tags extracted from the resume. Use lowercase, hyphenated identifiers like 'react', 'node-js', 'aws'."
  ),
});

export async function extractSkillsFromResume(
  text: string,
  taxonomy: string[] = TAXONOMY_KEYS,
): Promise<{ skills: string[]; taxonomyVersion: string }> {
  const result = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    temperature: 0,
    schema: skillExtractionSchema,
    system: `You are a technical skill extractor. Extract skills from resume text.
Return ONLY skill identifiers from this list: ${taxonomy.join(", ")}.
Do not invent skills not in the list. Be conservative — only include skills clearly evidenced in the text.`,
    prompt: `Extract technical skills from this resume:\n\n${text.slice(0, 8000)}`,
  });

  // Post-filter: only keep skills that are actually in the taxonomy
  const validSkills = result.object.skills.filter((s) => taxonomy.includes(s));
  return { skills: [...new Set(validSkills)], taxonomyVersion: TAXONOMY_VERSION };
}
