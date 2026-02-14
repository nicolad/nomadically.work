/**
 * Runner utilities for Google Search Agent
 * Handles execution, grounding metadata extraction, and citation formatting
 */

import {
  InMemorySessionService,
  Runner,
  isFinalResponse,
  stringifyContent,
} from '@google/adk';
import type {Content} from '@google/genai';
import {rootAgent} from './search-agent';
import {writeFileSync} from 'fs';
import {join} from 'path';

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

/**
 * Run the Google Search agent with the given prompt
 */
export async function runSearchAgent(prompt: string, options?: {saveToFile?: boolean; outputDir?: string}) {
  const {saveToFile = true, outputDir = 'results'} = options || {};
  
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Google Search Agent - Remote AI Consulting Job Scout');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('⚙️  Configuration:');
  console.log(`   Model: gemini-2.5-flash`);
  console.log(`   Tool: GOOGLE_SEARCH (with grounding)`);
  console.log(`   Save to file: ${saveToFile ? '✅ Yes' : '❌ No'}`);
  if (saveToFile) {
    console.log(`   Output directory: ${outputDir}`);
  }
  console.log('');
  console.log('📝 Query:');
  console.log(`   ${prompt}`);
  console.log('');
  console.log('⏳ Initializing agent session...');

  const appName = 'job_scout_app';
  const userId = 'user1';
  const sessionId = `session_${Date.now()}`;

  const sessionService = new InMemorySessionService();
  const runner = new Runner({
    agent: rootAgent,
    appName,
    sessionService,
  });

  await sessionService.createSession({appName, userId, sessionId});
  console.log('✅ Session created:', sessionId);

  const userMessage: Content = {role: 'user', parts: [{text: prompt}]};
  console.log('🚀 Sending request to Gemini with Google Search grounding...');
  console.log('');

  let allEvents: any[] = [];
  let finalEventFound = false;

  for await (const event of runner.runAsync({
    userId,
    sessionId,
    newMessage: userMessage,
  })) {
    // Store all events for debugging
    allEvents.push(event);
    
    if (!isFinalResponse(event)) {
      // Log intermediate events
      if (event.content) {
        console.log('🔄 Processing intermediate response...');
        const intermediateText = stringifyContent(event.content);
        console.log(`   Event ID: ${event.id}, Author: ${event.author}`);
        if (intermediateText) {
          console.log(`   Content preview: ${intermediateText.substring(0, 150)}...`);
          console.log(`   Content length: ${intermediateText.length} chars`);
        }
      }
      continue;
    }

    finalEventFound = true;
    console.log('✅ Received final response from agent');
    console.log(`   Total events received: ${allEvents.length}`);
    console.log('');

    if (event.errorMessage) {
      console.error(`❌ Model error: ${event.errorMessage}`);
      process.exitCode = 1;
      return;
    }

    const fullText = event.content ? stringifyContent(event.content) : '';
    
    console.log(`📏 Response length: ${fullText.length} characters`);
    
    // Debug: Show the actual event content structure
    console.log('\n🔍 Debug - Event Content Structure:');
    if (event.content) {
      console.log('   Role:', event.content.role);
      console.log('   Parts count:', event.content.parts?.length ?? 0);
      if (event.content.parts && event.content.parts.length > 0) {
        event.content.parts.forEach((part, idx) => {
          console.log(`   Part ${idx}:`, {
            hasText: !!part.text,
            textLength: part.text?.length ?? 0,
            hasFunctionCall: !!(part as any).functionCall,
            hasFunctionResponse: !!(part as any).functionResponse,
          });
        });
      }
    } else {
      console.log('   ⚠️  event.content is null or undefined');
    }

    // Debug: log the raw response
    if (!fullText || fullText.trim() === '') {
      console.log('\n⚠️  Warning: Received empty response from agent');
      console.log('Event details:', JSON.stringify({
        hasContent: !!event.content,
        hasError: !!event.errorMessage,
        hasGrounding: !!event.groundingMetadata,
        invocationId: event.invocationId,
        author: event.author,
      }, null, 2));
      
      // Show raw event for debugging
      console.log('\n🔍 Full Event Object (for debugging):');
      console.log(JSON.stringify(event, null, 2).substring(0, 1000));
    } else {
      console.log('✅ Response received successfully');
    }
    
    console.log('');
    console.log('🔍 Parsing response and extracting grounding metadata...');

    // Split JSON + summary so we keep JSON valid
    const {jsonText, jsonEnd, restText} = splitLeadingJson(fullText);

    // Apply citation markers only to the summary segment
    const offset = typeof jsonEnd === 'number' ? jsonEnd : 0;
    const {textWithCitations, sources, renderedContent, webSearchQueries} =
      addCitationMarkersToSegment(restText, event.groundingMetadata, offset);

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    console.log('📊 === JSON (machine-readable) ===\n');
    if (jsonText) {
      console.log(jsonText.trim());
      try {
        const parsed = JSON.parse(jsonText);
        console.log(`\n✅ Valid JSON parsed successfully`);
        if (parsed.jobs && Array.isArray(parsed.jobs)) {
          console.log(`📋 Found ${parsed.jobs.length} job(s)`);
        }
      } catch (e) {
        console.log(`\n⚠️  Warning: JSON parsing failed - ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    } else {
      console.log('⚠️  No JSON found; printing full response:\n');
      console.log(fullText);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📝 === Summary (with inline citations) ===\n');
    const summary = textWithCitations.trim();
    if (summary) {
      console.log(summary);
      console.log(`\n✅ Summary generated with ${sources.length} source(s)`);
    } else {
      console.log('⚠️  No summary text found');
    }

    if (webSearchQueries?.length) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n🔎 === Web search queries used ===\n');
      console.log(`Total queries: ${webSearchQueries.length}\n`);
      for (const q of webSearchQueries) console.log(`  • ${q}`);
    }

    if (sources.length) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n🔗 === Sources ===\n');
      console.log(`Total sources: ${sources.length}\n`);
      for (const s of sources) {
        console.log(`[${s.index}] ${s.title ?? '(unknown)'}`);
        console.log(`    ${s.uri ?? '(no uri)'}\n`);
      }
    }

    if (renderedContent) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n🔍 === Search Suggestions HTML ===\n');
      console.log('ℹ️  Render this in a UI if present - required by Google grounding policy\n');
      console.log(renderedContent);
    }

    // Save to file if enabled
    if (saveToFile) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n💾 Saving results to file...');
      
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `job-search-results-${timestamp}.json`;
        const filepath = join(outputDir, filename);
        
        // Create results object
        const results = {
          timestamp: new Date().toISOString(),
          query: prompt,
          rawResponse: fullText,
          data: jsonText ? JSON.parse(jsonText) : null,
          summary: textWithCitations.trim() || null,
          webSearchQueries: webSearchQueries || [],
          sources: sources.map(s => ({
            index: s.index,
            title: s.title || null,
            url: s.uri || null,
          })),
          renderedContent: renderedContent || null,
        };
        
        // Ensure output directory exists
        const fs = await import('fs');
        if (!fs.existsSync(outputDir)) {
          console.log(`📁 Creating output directory: ${outputDir}`);
          fs.mkdirSync(outputDir, {recursive: true});
        }
        
        const jsonString = JSON.stringify(results, null, 2);
        writeFileSync(filepath, jsonString, 'utf-8');
        
        const fileSizeKB = (jsonString.length / 1024).toFixed(2);
        console.log(`✅ Results saved successfully!`);
        console.log(`   📄 File: ${filepath}`);
        console.log(`   📊 Size: ${fileSizeKB} KB`);
        console.log(`   📋 Jobs: ${results.data?.jobs?.length ?? 0}`);
        console.log(`   🔗 Sources: ${results.sources.length}`);
      } catch (error) {
        console.error('\n❌ Failed to save results to file');
        console.error('   Error:', error instanceof Error ? error.message : 'Unknown error');
        if (error instanceof Error && error.stack) {
          console.error('   Stack:', error.stack);
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ Search complete!');
    console.log('');
    
    // Debug: Show summary of all events
    if (!fullText || fullText.trim() === '') {
      console.log('\n🔍 EVENT STREAM ANALYSIS:');
      console.log(`Total events in stream: ${allEvents.length}`);
      allEvents.forEach((evt, idx) => {
        console.log(`\nEvent ${idx + 1}:`);
        console.log(`  ID: ${evt.id}`);
        console.log(`  Author: ${evt.author}`);
        console.log(`  Has content: ${!!evt.content}`);
        console.log(`  Is final: ${isFinalResponse(evt)}`);
        if (evt.content) {
          const text = stringifyContent(evt.content);
          console.log(`  Content length: ${text.length} chars`);
          if (text.length > 0 && text.length < 500) {
            console.log(`  Content: ${text}`);
          } else if (text.length > 0) {
            console.log(`  Content preview: ${text.substring(0, 200)}...`);
          }
        }
        if (evt.errorCode) {
          console.log(`  Error code: ${evt.errorCode}`);
        }
        if (evt.finishReason) {
          console.log(`  Finish reason: ${evt.finishReason}`);
        }
      });
    }
    
    return;
  }
  
  // If we exit the loop without finding a final event
  if (!finalEventFound && allEvents.length > 0) {
    console.log('\n⚠️  WARNING: No final event was received!');
    console.log(`Received ${allEvents.length} events total.`);
  }
}
