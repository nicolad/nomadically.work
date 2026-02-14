/**
 * Programmatic runner that prints JSON + summary with inline citations + source list
 * 
 * Why this works:
 * - ADK exposes grounding payload on the final event as `event.groundingMetadata`
 * - `groundingChunks` provides sources; `groundingSupports` maps spans of text to chunk indices
 * - This runner keeps the JSON valid by extracting the leading JSON block and inserting
 *   citation markers only into the summary section
 * 
 * @see https://google.github.io/adk-docs/api-reference/typescript/interfaces/Event.html
 * @see https://ai.google.dev/gemini-api/docs/google-search
 */

import 'dotenv/config';

import {
  InMemorySessionService,
  Runner,
  isFinalResponse,
  stringifyContent,
} from '@google/adk';
import type {Content} from '@google/genai';

type Source = {index: number; title?: string; uri?: string};

function getGroundingArrays(groundingMetadata: any): {
  supports: any[];
  chunks: any[];
  renderedContent?: string;
  webSearchQueries?: string[];
} {
  // Support both camelCase and snake_case
  const supports =
    groundingMetadata?.groundingSupports ??
    groundingMetadata?.grounding_supports ??
    [];
  const chunks =
    groundingMetadata?.groundingChunks ??
    groundingMetadata?.grounding_chunks ??
    [];

  const renderedContent =
    groundingMetadata?.searchEntryPoint?.renderedContent ??
    groundingMetadata?.search_entry_point?.rendered_content;

  const webSearchQueries =
    groundingMetadata?.webSearchQueries ?? groundingMetadata?.web_search_queries;

  return {supports, chunks, renderedContent, webSearchQueries};
}

/**
 * Extract a leading JSON object from `text` (starting at first non-whitespace `{`),
 * returning its [start,end) indices plus the remainder.
 */
function splitLeadingJson(text: string): {
  jsonText?: string;
  jsonStart?: number;
  jsonEnd?: number; // exclusive
  restText: string;
} {
  const n = text.length;
  let i = 0;
  while (i < n && /\s/.test(text[i]!)) i++;

  if (i >= n || text[i] !== '{') return {restText: text};

  const jsonStart = i;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (; i < n; i++) {
    const ch = text[i]!;

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') depth++;
    if (ch === '}') depth--;

    if (depth === 0) {
      const jsonEnd = i + 1; // exclusive
      const jsonText = text.slice(jsonStart, jsonEnd);
      const restText = text.slice(jsonEnd);
      return {jsonText, jsonStart, jsonEnd, restText};
    }
  }

  // Unbalanced; treat as no JSON split
  return {restText: text};
}

function addCitationMarkersToSegment(
  segmentText: string,
  groundingMetadata: any,
  offsetInFullText: number
): {
  textWithCitations: string;
  sources: Source[];
  renderedContent?: string;
  webSearchQueries?: string[];
} {
  if (!groundingMetadata) {
    return {textWithCitations: segmentText, sources: []};
  }

  const {supports, chunks, renderedContent, webSearchQueries} =
    getGroundingArrays(groundingMetadata);

  // Sources list (1-based indexing for display)
  const sources: Source[] = (chunks ?? []).map((chunk: any, idx: number) => ({
    index: idx + 1,
    title: chunk?.web?.title ?? chunk?.web?.domain ?? chunk?.title,
    uri: chunk?.web?.uri ?? chunk?.uri,
  }));

  // Keep only supports that land inside our segment, then convert indices to segment-relative
  const relevantSupports = (supports ?? [])
    .map((s: any) => {
      const seg = s?.segment ?? {};
      const endIndex = seg?.endIndex ?? seg?.end_index;
      const startIndex = seg?.startIndex ?? seg?.start_index;
      const idxs =
        s?.groundingChunkIndices ?? s?.grounding_chunk_indices ?? [];
      return {startIndex, endIndex, idxs};
    })
    .filter(
      (s: any) =>
        typeof s.endIndex === 'number' &&
        typeof s.startIndex === 'number' &&
        Array.isArray(s.idxs) &&
        s.idxs.length > 0 &&
        s.endIndex > offsetInFullText && // ends after segment start
        s.startIndex >= offsetInFullText // starts inside segment
    )
    .map((s: any) => ({
      ...s,
      // convert absolute indices into segment-local indices
      startIndex: s.startIndex - offsetInFullText,
      endIndex: s.endIndex - offsetInFullText,
    }))
    // insert from back to front so indices don't drift
    .sort((a: any, b: any) => b.endIndex - a.endIndex);

  let out = segmentText;

  for (const s of relevantSupports) {
    const marker = `[${s.idxs.map((i: number) => i + 1).join(',')}]`;
    out = out.slice(0, s.endIndex) + marker + out.slice(s.endIndex);
  }

  return {textWithCitations: out, sources, renderedContent, webSearchQueries};
}

async function main() {
  const prompt =
    process.argv.slice(2).join(' ').trim() ||
    'Find 10 fully-remote AI / GenAI roles at agencies or consultancies. Prefer client-facing delivery roles.';

  const appName = 'job_scout_app';
  const userId = 'user1';
  const sessionId = 'session1';

  const sessionService = new InMemorySessionService();
  const runner = new Runner({
    // ADK devtools expects this export name in agent.ts
    agent: (await import('./search-agent.js')).rootAgent,
    appName,
    sessionService,
  });

  await sessionService.createSession({appName, userId, sessionId});

  const userMessage: Content = {role: 'user', parts: [{text: prompt}]};

  for await (const event of runner.runAsync({
    userId,
    sessionId,
    newMessage: userMessage,
  })) {
    if (!isFinalResponse(event)) continue;

    if (event.errorMessage) {
      console.error(`Model error: ${event.errorMessage}`);
      process.exitCode = 1;
      return;
    }

    const fullText = event.content ? stringifyContent(event.content) : '';

    // Split JSON + summary so we keep JSON valid
    const {jsonText, jsonEnd, restText} = splitLeadingJson(fullText);

    // Apply citation markers only to the summary segment
    const offset = typeof jsonEnd === 'number' ? jsonEnd : 0;
    const {textWithCitations, sources, renderedContent, webSearchQueries} =
      addCitationMarkersToSegment(restText, event.groundingMetadata, offset);

    console.log('\n=== JSON (machine-readable) ===\n');
    if (jsonText) {
      console.log(jsonText.trim());
    } else {
      console.log('(No leading JSON found; printing full response below)\n');
      console.log(fullText);
    }

    console.log('\n=== Summary (with inline citations) ===\n');
    console.log(textWithCitations.trim() || '(No summary text found)');

    if (webSearchQueries?.length) {
      console.log('\n=== Web search queries used ===\n');
      for (const q of webSearchQueries) console.log(`- ${q}`);
    }

    if (sources.length) {
      console.log('\n=== Sources ===\n');
      for (const s of sources) {
        console.log(`[${s.index}] ${s.title ?? '(unknown)'}\n    ${s.uri ?? '(no uri)'}\n`);
      }
    }

    if (renderedContent) {
      console.log('\n=== Search Suggestions HTML (render this in a UI if present) ===\n');
      console.log(renderedContent);
    }

    return;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
