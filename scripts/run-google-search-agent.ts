/**
 * Script to run the Google Search Agent for finding remote AI consulting jobs
 * 
 * This script demonstrates how to use the Google Search agent programmatically
 * to find fully-remote AI/GenAI roles at agencies and consultancies.
 * 
 * Usage:
 *   npx tsx scripts/run-google-search-agent.ts
 */

import dotenv from 'dotenv';
import {runSearchAgent} from '../src/google/index';

// Suppress dotenv verbose output
const originalLog = console.log;
console.log = () => {};

// Load .env first, then .env.local (if it exists) to override
dotenv.config();
dotenv.config({path: '.env.local'});

// Restore console.log
console.log = originalLog;

// Check for API key before running
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.error('\n❌ ERROR: No Gemini API key found!\n');
  console.log('To run this script, you need a Google AI API key.\n');
  console.log('📌 Steps to fix this:\n');
  console.log('1. Visit: https://aistudio.google.com/app/apikey');
  console.log('2. Click "Create API Key" (free, no credit card)');
  console.log('3. Copy the key (starts with AIza...)');
  console.log('4. Edit your .env file and add:');
  console.log('   GEMINI_API_KEY="your_key_here"');
  console.log('\n5. Run the script again\n');
  process.exit(1);
}

const prompt = 'Find 10 fully-remote AI / GenAI roles at agencies or consultancies. Prefer client-facing delivery roles, especially those involving RAG, agents, or LLM implementation. Include EU eligibility information.';

runSearchAgent(prompt).catch((err) => {
  console.error('❌ Error:', err);
  process.exitCode = 1;
});
