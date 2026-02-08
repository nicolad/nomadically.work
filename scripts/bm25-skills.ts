/**
 * Demo: BM25 Skill Discovery
 * 
 * This script demonstrates how BM25 keyword search discovers skills
 * based on query keywords.
 * 
 * Run: tsx scripts/bm25-skills.ts
 */

import { workspace } from '@/workspace';
import { mastra } from '@/mastra';

console.log('🔍 BM25 Skill Discovery\n');
console.log('='.repeat(60));

async function demoBM25SkillDiscovery() {
  console.log('\n🏁 Initializing workspace with BM25 indexing...');
  await workspace.init();
  console.log('✅ Workspace ready - 5 skills indexed with BM25\n');
  
  console.log('📊 Available Skills:');
  console.log('  1. job-analysis - Job classification and analysis');
  console.log('  2. preference-gathering - User preference collection');
  console.log('  3. data-validation - Data quality checks');
  console.log('  4. report-generation - Report and analytics creation');
  console.log('  5. ops-debugging - Systematic troubleshooting\n');
  
  // Demo 1: Job Analysis Skill Activation
  console.log('\n' + '='.repeat(60));
  console.log('Demo 1: Job Analysis Skill (BM25 Discovery)');
  console.log('='.repeat(60));
  
  const agent = mastra.getAgent('jobClassifierAgent');
  
  const jobPosting = `
    Senior Backend Engineer - Remote EU
    TechCorp - €95,000 - €125,000
    
    We're hiring a senior backend engineer to work remotely from anywhere in the EU.
    
    Requirements:
    - 5+ years with Node.js and TypeScript
    - PostgreSQL and microservices experience
    - EU work authorization required
  `;
  
  console.log('\n📝 Job Posting:');
  console.log(jobPosting);
  
  console.log('\n🔍 How BM25 Discovers the Job Analysis Skill:');
  console.log('  Query keywords: "job", "remote", "EU", "salary", "requirements"');
  console.log('  Skill keywords: "job-analysis", "classification", "remote", "EU", "salary"');
  console.log('  → BM25 scores high match → skill activated\n');
  
  console.log('🤔 Asking agent to analyze (skill auto-activated via BM25)...\n');
  
  const response = await agent.generate([
    {
      role: 'user',
      content: `Analyze this job posting: ${jobPosting}`
    }
  ], {
    maxSteps: 1, // Prevent tool calls, just use instructions
  });
  
  console.log('🎯 Agent Response (using job-analysis skill):');
  console.log('-'.repeat(60));
  console.log(response.text);
  console.log('-'.repeat(60));
  
  // Demo 2: Data Validation Skill Activation
  console.log('\n\n' + '='.repeat(60));
  console.log('Demo 2: Data Validation Skill (BM25 Discovery)');
  console.log('='.repeat(60));
  
  const invalidData = {
    title: 'Job',
    salary_min: 200000,
    salary_max: 100000, // Invalid: min > max
  };
  
  console.log('\n📝 Invalid Data:');
  console.log(JSON.stringify(invalidData, null, 2));
  
  console.log('\n🔍 How BM25 Discovers the Data Validation Skill:');
  console.log('  Query keywords: "validate", "data", "salary", "invalid"');
  console.log('  Skill keywords: "data-validation", "validation", "rules", "quality"');
  console.log('  → BM25 scores high match → skill activated\n');
  
  console.log('🤔 Asking agent to validate (skill auto-activated via BM25)...\n');
  
  const validationAgent = mastra.getAgent('adminAssistantAgent');
  const validationResponse = await validationAgent.generate([
    {
      role: 'user',
      content: `Validate this data: ${JSON.stringify(invalidData)}`
    }
  ], {
    maxSteps: 1, // Prevent tool calls
  });
  
  console.log('🎯 Agent Response (using data-validation skill):');
  console.log('-'.repeat(60));
  console.log(validationResponse.text);
  console.log('-'.repeat(60));
  
  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('✅ BM25 Skill Discovery Summary');
  console.log('='.repeat(60));
  console.log('\n🔍 How It Works:\n');
  console.log('  1. Skills indexed at workspace.init() with BM25');
  console.log('  2. Agent queries analyzed for keywords');
  console.log('  3. BM25 ranks skills by keyword relevance');
  console.log('  4. Top skills automatically added to agent context');
  console.log('  5. Agent follows skill instructions\n');
  
  console.log('⚡ BM25 Benefits:\n');
  console.log('  • Fast: No ML inference needed');
  console.log('  • Precise: Exact keyword matching');
  console.log('  • Lightweight: No embeddings storage');
  console.log('  • Transparent: Explainable scores\n');
  
  console.log('📚 Key Keywords by Skill:\n');
  console.log('  job-analysis: remote, EU, classification, salary, skills');
  console.log('  preference-gathering: user, preferences, conversation');
  console.log('  data-validation: validate, quality, rules, schema');
  console.log('  report-generation: report, analytics, insights');
  console.log('  ops-debugging: debug, error, investigation\n');
  
  console.log('📖 Learn More:\n');
  console.log('  • BM25 Config: src/workspace/BM25_CONFIGURATION.md');
  console.log('  • Skills Guide: src/workspace/skills/README.md');
  console.log('  • Production: src/workspace/skills/PRODUCTION_GUIDE.md\n');
}

// Run demo
demoBM25SkillDiscovery().catch(error => {
  console.error('\n💥 Demo failed:', error);
  process.exit(1);
});
