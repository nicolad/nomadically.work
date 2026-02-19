#!/usr/bin/env tsx
/**
 * Job Seeker Agent Script
 *
 * Claude-only agent that searches for fully remote AI/React engineering jobs
 * in Europe or worldwide and writes a ranked report to JOB_SEARCH_REPORT.md.
 *
 * Usage:
 *   tsx scripts/job-seeker.ts                  # Search for both AI + React roles
 *   tsx scripts/job-seeker.ts --role ai        # AI Engineer only
 *   tsx scripts/job-seeker.ts --role react     # React Engineer only
 *   tsx scripts/job-seeker.ts --output my-jobs.md
 */

import { createJobSeekerAgent } from '../src/anthropic/agents/job-seeker';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

const roleIndex = args.indexOf('--role');
const rawRole = roleIndex >= 0 ? args[roleIndex + 1] : undefined;
const targetRole =
  rawRole === 'ai'
    ? 'ai-engineer'
    : rawRole === 'react'
      ? 'react-engineer'
      : 'both';

const outputIndex = args.indexOf('--output');
const outputFile = outputIndex >= 0 ? args[outputIndex + 1] : 'JOB_SEARCH_REPORT.md';

// ---------------------------------------------------------------------------
// Run the agent
// ---------------------------------------------------------------------------

console.log(`Starting job seeker agent...`);
console.log(`  Role:   ${targetRole}`);
console.log(`  Output: ${outputFile}`);
console.log('');

const agent = createJobSeekerAgent({ targetRole, outputFile });

const result = await agent.run(
  `Search for the best fully remote ${
    targetRole === 'both'
      ? 'AI Engineer and React/Frontend Engineer'
      : targetRole === 'ai-engineer'
        ? 'AI Engineer'
        : 'React/Frontend Engineer'
  } positions available right now in Europe or worldwide. ` +
  `Find at least 10 high-quality opportunities, score them, and write the report to ${outputFile}.`,
);

console.log('');
if (result.success) {
  console.log(`Done. Report written to ${outputFile}`);
  console.log(`Cost: $${result.cost.toFixed(4)} | Turns: ${result.turns} | Duration: ${(result.duration / 1000).toFixed(1)}s`);
} else {
  const err = result as Extract<typeof result, { success: false }>;
  console.error(`Agent failed: ${err.error}`);
  console.error(err.errors.join('\n'));
  process.exit(1);
}
