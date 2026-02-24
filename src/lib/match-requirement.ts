import type { AiInterviewPrepRequirement } from "@/__generated__/hooks";

/**
 * Normalize a string for word-overlap scoring:
 * - Lowercase
 * - Strip punctuation
 * - Split into unique word set (ignoring common stop words)
 */
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "have", "has", "had", "do", "does", "did", "will", "would", "can",
  "could", "should", "may", "might", "must", "that", "this", "these",
  "those", "it", "its", "as", "so", "if", "not", "no", "we", "you",
  "i", "he", "she", "they", "our", "your", "their", "my", "his", "her",
]);

function simpleStem(word: string): string {
  if (word.length < 4) return word;
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  if (
    word.endsWith("ses") || word.endsWith("zes") ||
    word.endsWith("xes") || word.endsWith("ches") || word.endsWith("shes")
  ) return word.slice(0, -2);
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
      .map(simpleStem),
  );
}

/**
 * Jaccard similarity between two word sets:
 * |A ∩ B| / |A ∪ B|
 */
function jaccardScore(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Find the best-matching requirement for the selected text using
 * Jaccard similarity on word sets. Compares against both
 * `requirement.sourceQuote` and `requirement.requirement` strings,
 * taking the higher of the two scores for each candidate.
 *
 * Returns `null` if no requirement reaches the minimum score threshold.
 */
export function findBestMatch(
  selectedText: string,
  requirements: AiInterviewPrepRequirement[],
  minScore = 0.2,
): { requirement: AiInterviewPrepRequirement; score: number } | null {
  if (!selectedText.trim() || requirements.length === 0) return null;

  const selectedTokens = tokenize(selectedText);
  if (selectedTokens.size === 0) return null;

  let best: { requirement: AiInterviewPrepRequirement; score: number } | null = null;

  for (const req of requirements) {
    const scoreAgainstRequirement = jaccardScore(
      selectedTokens,
      tokenize(req.requirement),
    );

    const scoreAgainstQuote = req.sourceQuote
      ? jaccardScore(selectedTokens, tokenize(req.sourceQuote))
      : 0;

    let scoreAgainstStudyTopics = 0;
    if (req.studyTopics && req.studyTopics.length > 0) {
      for (const topic of req.studyTopics) {
        const s = jaccardScore(selectedTokens, tokenize(topic));
        if (s > scoreAgainstStudyTopics) scoreAgainstStudyTopics = s;
      }
    }
    const score = Math.max(scoreAgainstRequirement, scoreAgainstQuote, scoreAgainstStudyTopics);

    if (score >= minScore && (best === null || score > best.score)) {
      best = { requirement: req, score };
    }
  }

  return best;
}
