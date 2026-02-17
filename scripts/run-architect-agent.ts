/**
 * Run the Architect agent to perform a comprehensive architecture review.
 *
 * Produces an `ARCHITECTURE_REPORT.md` in the repo root covering:
 *   executive summary, code quality, security, performance, reliability,
 *   developer experience, detailed recommendations, and a prioritised roadmap.
 *
 * Usage:
 *   npx tsx scripts/run-architect-agent.ts
 *
 * Environment:
 *   ANTHROPIC_API_KEY — required
 */

import dotenv from 'dotenv';
import { readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

dotenv.config();
dotenv.config({ path: '.env.local' });

import { streamAgent } from '../src/anthropic/client';
import { buildArchitectSystemPrompt } from '../src/anthropic/agents/architect';
import { CLAUDE_MODELS, AGENT_TOOLS, EFFORT_LEVELS } from '../src/anthropic/constants';

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('\n❌ No ANTHROPIC_API_KEY found.\n');
  console.log('Add it to your .env file:');
  console.log('  ANTHROPIC_API_KEY="sk-ant-..."');
  process.exit(1);
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ARCHITECT_TOOLS = [
  AGENT_TOOLS.READ,
  AGENT_TOOLS.WRITE,
  AGENT_TOOLS.BASH,
  AGENT_TOOLS.GLOB,
  AGENT_TOOLS.GREP,
  AGENT_TOOLS.WEB_SEARCH,
] as string[];

const repoPath = process.cwd();
const outputFile = path.join(repoPath, 'ARCHITECTURE_REPORT.md');
const maxTurns = 40;
const timeoutMs = 10 * 60 * 1000;

const userPrompt = `Analyse ${repoPath} and write the Architecture Review Report to ${outputFile}.`;

// ─── Run ──────────────────────────────────────────────────────────────────────

console.log(`\n🏛️  Architect Agent`);
console.log(`   Model : ${CLAUDE_MODELS.OPUS_4_6} (HIGH effort)`);
console.log(`   Tools : ${ARCHITECT_TOOLS.join(', ')}`);
console.log(`   Repo  : ${repoPath}`);
console.log(`   Output: ${outputFile}`);
console.log(`   Max turns: ${maxTurns} | Timeout: ${timeoutMs / 1000}s`);
console.log('─'.repeat(72));

async function main() {
  const abortController = new AbortController();

  const timeoutId = setTimeout(() => {
    console.warn(`\n⏱  Timeout (${timeoutMs / 1000}s). Aborting…`);
    abortController.abort();
  }, timeoutMs);

  const sigintHandler = () => {
    console.warn('\n🛑  SIGINT. Aborting…');
    abortController.abort();
  };
  process.once('SIGINT', sigintHandler);

  const toolsUsed = new Map<string, number>();
  let turnCount = 0;
  const startMs = Date.now();
  try {
    for await (const message of streamAgent(userPrompt, {
      model: CLAUDE_MODELS.OPUS_4_6,
      tools: ARCHITECT_TOOLS,
      allowedTools: ARCHITECT_TOOLS,
      effort: EFFORT_LEVELS.HIGH,
      maxTurns,
      cwd: repoPath,
      systemPrompt: buildArchitectSystemPrompt(outputFile),
    })) {
      if (message.type === 'assistant') {
        turnCount++;
        process.stdout.write(`\n[Turn ${turnCount}]\n`);

        for (const block of (message as any).message?.content ?? []) {
          if (block.type === 'tool_use') {
            const count = (toolsUsed.get(block.name) ?? 0) + 1;
            toolsUsed.set(block.name, count);
            const raw = JSON.stringify(block.input ?? {});
            const preview = raw.length > 120 ? raw.slice(0, 117) + '…' : raw;
            process.stdout.write(`  🔧 [${block.name}] ${preview}\n`);
          } else if (block.type === 'text' && block.text?.trim()) {
            const preview = block.text.trim().slice(0, 200).replace(/\n/g, ' ');
            process.stdout.write(`  💬 ${preview}${block.text.length > 200 ? '…' : ''}\n`);
          }
        }
      }

      if (message.type === 'result') {
        const r = message as any;
        if (r.subtype === 'error') {
          process.stdout.write(`  ⚠️  Error: ${JSON.stringify(r.result ?? r.errors).slice(0, 200)}\n`);
        } else {
          console.log('\n' + '─'.repeat(72));
          console.log(`✅  Done. Cost: $${r.total_cost_usd?.toFixed(4) ?? '?'}`);
        }
      }
    }
  } finally {
    clearTimeout(timeoutId);
    process.removeListener('SIGINT', sigintHandler);
  }

  const durationMs = Date.now() - startMs;

  // Attempt to read and confirm the report was written
  let report = '';
  try {
    report = await readFile(outputFile, 'utf8');
  } catch {
    console.warn(`⚠️  Could not read report at ${outputFile}`);
  }

  // Also save a JSON summary alongside the markdown report
  const summary = {
    timestamp: new Date().toISOString(),
    reportPath: outputFile,
    reportBytes: Buffer.byteLength(report, 'utf8'),
    turnCount,
    durationMs,
    toolsUsed: Object.fromEntries(
      [...toolsUsed.entries()].sort((a, b) => b[1] - a[1]),
    ),
  };
  const jsonPath = outputFile.replace(/\.md$/, '.json');
  await writeFile(jsonPath, JSON.stringify(summary, null, 2));

  // Print final stats
  console.log(`\n📄  Report : ${outputFile} (${(summary.reportBytes / 1024).toFixed(1)} KB)`);
  console.log(`📊  Summary: ${jsonPath}`);
  console.log(`   Turns: ${turnCount} | Duration: ${(durationMs / 1000).toFixed(1)}s`);
  console.log('   Tools used:');
  for (const [tool, count] of [...toolsUsed.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`     ${tool.padEnd(16)} × ${count}`);
  }
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
