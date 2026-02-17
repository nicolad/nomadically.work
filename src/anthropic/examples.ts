/**
 * Claude Agent SDK Examples
 *
 * Run with: npx tsx src/anthropic/examples.ts
 */

import { runAgent, streamAgent, createAgent } from './client';
import { CLAUDE_MODELS, TOOL_PRESETS, EFFORT_LEVELS } from './constants';
import { agentTemplates } from './agents';

async function main() {
  console.log('🤖 Claude Agent SDK Examples\n');

  // ============================================================================
  // Example 1: Simple one-shot agent
  // ============================================================================
  console.log('1️⃣  Simple One-Shot Agent');
  console.log('─────────────────────────────────────────────────────────\n');

  const result = await runAgent('What files are in this directory?', {
    tools: ['Bash', 'Glob'],
    allowedTools: ['Bash', 'Glob'],
  });

  if (result.success) {
    console.log(`Result: ${result.result}`);
    console.log(`Cost: $${result.cost.toFixed(4)}`);
    console.log(`Turns: ${result.turns}\n`);
  }

  // ============================================================================
  // Example 2: Streaming messages
  // ============================================================================
  console.log('2️⃣  Streaming Messages');
  console.log('─────────────────────────────────────────────────────────\n');

  for await (const msg of streamAgent('List the TypeScript files in src/', {
    tools: ['Glob'],
    allowedTools: ['Glob'],
  })) {
    if (msg.type === 'result' && msg.subtype === 'success') {
      console.log(`Final result: ${msg.result}\n`);
    }
  }

  // ============================================================================
  // Example 3: Reusable agent
  // ============================================================================
  console.log('3️⃣  Reusable Agent');
  console.log('─────────────────────────────────────────────────────────\n');

  const analyzer = createAgent({
    model: CLAUDE_MODELS.SONNET_4_5,
    tools: TOOL_PRESETS.READONLY,
    allowedTools: TOOL_PRESETS.READONLY,
    effort: EFFORT_LEVELS.HIGH,
    systemPrompt: 'You are a code analysis assistant.',
  });

  const analysis = await analyzer.ask('How many TypeScript files are in this project?');
  console.log(`Analysis: ${analysis}\n`);

  // ============================================================================
  // Example 4: Pre-configured templates
  // ============================================================================
  console.log('4️⃣  Agent Templates');
  console.log('─────────────────────────────────────────────────────────\n');

  const reviewer = agentTemplates.codeReview();
  const review = await reviewer.ask('Review the package.json for any issues.');
  console.log(`Review: ${review}\n`);

  // ============================================================================
  // Example 5: Web search agent
  // ============================================================================
  console.log('5️⃣  Research Agent');
  console.log('─────────────────────────────────────────────────────────\n');

  const researcher = agentTemplates.research();
  const findings = await researcher.ask('What are the latest features in Next.js 16?');
  console.log(`Findings: ${findings}\n`);

  console.log('✅ All examples completed!');
}

main().catch(console.error);
