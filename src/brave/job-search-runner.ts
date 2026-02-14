/**
 * Job Search Runner using Brave Search LLM Context API
 * 
 * Executes multi-query job search and consolidates results
 */

import * as fs from 'fs';
import * as path from 'path';
import { BraveSearchAgent, BraveSearchOptions, BraveSearchResponse, BraveSearchPresets } from './search-agent';
import { DEFAULT_JOB_QUERIES as IMPORTED_DEFAULT_JOB_QUERIES } from './constants';

export interface JobSearchResult {
  timestamp: string;
  queries: string[];
  results: BraveSearchResponse[];
  consolidatedSources: string[];
  totalSnippets: number;
  totalTokensEstimate: number;
}

/**
 * Execute multiple job search queries and consolidate results
 */
export async function runJobSearch(options: {
  queries: string[];
  searchOptions?: Partial<BraveSearchOptions>;
  saveToFile?: boolean;
  outputDir?: string;
}): Promise<JobSearchResult> {
  const { queries, searchOptions = {}, saveToFile = false, outputDir = './results' } = options;
  
  console.log('\n🔍 Brave Search LLM Context - Job Search Agent');
  console.log('='.repeat(60));
  console.log(`📋 Queries: ${queries.length}`);
  console.log(`💾 Save to file: ${saveToFile}`);
  console.log('='.repeat(60) + '\n');
  
  const agent = new BraveSearchAgent();
  const results: BraveSearchResponse[] = [];
  const allSources = new Set<string>();
  let totalSnippets = 0;
  
  // Execute each query
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    console.log(`\n📊 Query ${i + 1}/${queries.length}`);
    console.log(`🔎 "${query}"`);
    console.log('-'.repeat(60));
    
    try {
      // Use job search preset as base, merge with custom options
      const queryOptions: BraveSearchOptions = {
        ...BraveSearchPresets.jobSearch(query),
        ...searchOptions,
      };
      
      const result = await agent.search(queryOptions);
      results.push(result);
      
      // Track sources
      const genericCount = result.grounding.generic?.length || 0;
      const poiCount = result.grounding.poi ? 1 : 0;
      const mapCount = result.grounding.map?.length || 0;
      const snippetCount = result.grounding.generic?.reduce((sum, item) => sum + item.snippets.length, 0) || 0;
      
      result.grounding.generic?.forEach(item => allSources.add(item.url));
      if (result.grounding.poi) allSources.add(result.grounding.poi.url);
      result.grounding.map?.forEach(item => allSources.add(item.url));
      
      totalSnippets += snippetCount;
      
      console.log(`✅ Success`);
      console.log(`   📄 Generic URLs: ${genericCount}`);
      if (poiCount > 0) console.log(`   📍 POI: ${poiCount}`);
      if (mapCount > 0) console.log(`   🗺️  Map results: ${mapCount}`);
      console.log(`   📝 Snippets: ${snippetCount}`);
      console.log(`   🔗 Sources: ${Object.keys(result.sources).length}`);
      
      // Display top sources
      if (genericCount > 0) {
        console.log(`\n   Top sources:`);
        result.grounding.generic.slice(0, 5).forEach((item, idx) => {
          const source = result.sources[item.url];
          console.log(`     ${idx + 1}. ${source?.hostname || new URL(item.url).hostname}`);
          console.log(`        ${item.title}`);
        });
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Calculate total tokens estimate (rough approximation: 1 token ≈ 4 chars)
  const totalTokensEstimate = Math.floor(
    results.reduce((sum, result) => {
      const textLength = result.grounding.generic?.reduce(
        (len, item) => len + item.snippets.join(' ').length,
        0
      ) || 0;
      return sum + textLength;
    }, 0) / 4
  );
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SEARCH SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful queries: ${results.length}/${queries.length}`);
  console.log(`🔗 Unique sources: ${allSources.size}`);
  console.log(`📝 Total snippets: ${totalSnippets}`);
  console.log(`🎯 Estimated tokens: ~${totalTokensEstimate.toLocaleString()}`);
  console.log('='.repeat(60) + '\n');
  
  const searchResult: JobSearchResult = {
    timestamp: new Date().toISOString(),
    queries,
    results,
    consolidatedSources: Array.from(allSources),
    totalSnippets,
    totalTokensEstimate,
  };
  
  // Save to file if requested
  if (saveToFile) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const filename = `brave-job-search-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(searchResult, null, 2));
    console.log(`💾 Results saved to: ${filepath}\n`);
  }
  
  return searchResult;
}

/**
 * Default job search queries for remote AI/GenAI consulting roles
 */
export const DEFAULT_JOB_QUERIES = IMPORTED_DEFAULT_JOB_QUERIES;

/**
 * Run job search with default queries
 */
export async function runDefaultJobSearch(options?: {
  saveToFile?: boolean;
  outputDir?: string;
  searchOptions?: Partial<BraveSearchOptions>;
}): Promise<JobSearchResult> {
  return runJobSearch({
    queries: DEFAULT_JOB_QUERIES,
    ...options,
  });
}
