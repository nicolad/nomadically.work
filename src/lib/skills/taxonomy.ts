/**
 * Skill Taxonomy — re-exports from the unified schema contracts.
 *
 * The canonical skill taxonomy is defined in src/schema/contracts/skill-taxonomy.ts.
 * This file re-exports it as SKILL_LABELS (the name used throughout the codebase)
 * and provides utility functions.
 */

import { SKILL_TAXONOMY } from "@/schema/contracts/skill-taxonomy";

/** Maps skill tags to human-readable labels. */
export const SKILL_LABELS: Record<string, string> = SKILL_TAXONOMY;

/**
 * Get human-readable label for a skill tag
 */
export function getSkillLabel(tag: string): string {
  return SKILL_LABELS[tag] || tag;
}

/**
 * Format confidence score as percentage
 */
export function formatConfidence(
  confidence: number | null | undefined,
): string {
  if (confidence == null) return "";
  return `${(confidence * 100).toFixed(0)}%`;
}
