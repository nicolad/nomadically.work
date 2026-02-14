#!/usr/bin/env node
/**
 * Promptfoo Evaluation Client
 * 
 * Example client for making requests to the deployed Promptfoo Worker
 * 
 * Usage:
 *   npx tsx src/promptfoo/examples/client.ts
 */

const WORKER_URL = process.env.PROMPTFOO_WORKER_URL || 'https://nomadically-promptfoo-eval.eeeew.workers.dev';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function checkHealth() {
  console.log('🏥 Checking health...\n');
  
  const response = await fetch(`${WORKER_URL}/health`);
  const data = await response.json();
  
  console.log(JSON.stringify(data, null, 2));
  console.log('');
}

async function listModels() {
  console.log('📋 Listing available models...\n');
  
  const response = await fetch(`${WORKER_URL}/models`);
  const data = await response.json();
  
  console.log('Workers AI Chat Models:');
  data['workers-ai'].chat.slice(0, 5).forEach((model: any) => {
    console.log(`  - ${model.name}: ${model.model}`);
  });
  
  console.log('\nAI Gateway Providers:');
  data['ai-gateway'].providers.slice(0, 5).forEach((provider: any) => {
    console.log(`  - ${provider.name}: ${provider.id}`);
  });
  console.log('');
}

async function runEvaluation(
  prompt: string,
  providerType: 'workers-ai' | 'ai-gateway',
  model: string,
  gatewayProvider?: string
) {
  console.log(`🤖 Running evaluation...\n`);
  console.log(`Prompt: "${prompt}"`);
  console.log(`Provider: ${providerType}`);
  console.log(`Model: ${model}\n`);
  
  const requestBody: any = {
    prompt,
    provider: {
      type: providerType,
      model,
    },
    temperature: 0.7,
    max_tokens: 500,
  };
  
  if (providerType === 'ai-gateway' && gatewayProvider) {
    requestBody.provider.gatewayProvider = gatewayProvider;
  }
  
  const startTime = Date.now();
  
  const response = await fetch(`${WORKER_URL}/eval`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  
  const clientLatency = Date.now() - startTime;
  
  if (!response.ok) {
    const error = await response.json();
    console.error('❌ Error:', error);
    return;
  }
  
  const data = await response.json();
  
  console.log('✅ Response:');
  console.log(`\n${data.output}\n`);
  console.log(`📊 Stats:`);
  console.log(`  - Server Latency: ${data.latency_ms}ms`);
  console.log(`  - Client Latency: ${clientLatency}ms`);
  
  if (data.usage) {
    console.log(`  - Tokens: ${data.usage.prompt_tokens} prompt + ${data.usage.completion_tokens} completion = ${data.usage.total_tokens} total`);
  }
  
  console.log('');
}

async function runMultipleEvaluations() {
  console.log('🔄 Running multiple evaluations for comparison...\n');
  
  const prompt = "Explain quantum computing in one paragraph";
  
  const configs = [
    {
      name: 'Llama 3.1 8B',
      type: 'workers-ai' as const,
      model: '@cf/meta/llama-3.1-8b-instruct',
    },
    {
      name: 'Llama 4 Scout',
      type: 'workers-ai' as const,
      model: '@cf/meta/llama-4-scout-17b-16e-instruct',
    },
    {
      name: 'Mistral Small',
      type: 'workers-ai' as const,
      model: '@cf/mistralai/mistral-small-3.1-24b-instruct',
    },
  ];
  
  for (const config of configs) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Model: ${config.name}`);
    console.log('='.repeat(60));
    
    const requestBody = {
      prompt,
      provider: {
        type: config.type,
        model: config.model,
      },
      temperature: 0.7,
      max_tokens: 200,
    };
    
    const startTime = Date.now();
    const response = await fetch(`${WORKER_URL}/eval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      console.log(`\n${data.output}\n`);
      console.log(`⏱️  Latency: ${latency}ms`);
      
      if (data.usage) {
        console.log(`📝 Tokens: ${data.usage.total_tokens}`);
      }
    } else {
      console.log('❌ Failed');
    }
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n🚀 Promptfoo Evaluation Client\n');
  console.log(`Worker URL: ${WORKER_URL}\n`);
  console.log('='.repeat(60) + '\n');
  
  try {
    // 1. Health check
    await checkHealth();
    
    // 2. List models
    await listModels();
    
    // 3. Simple evaluation
    await runEvaluation(
      'What is edge computing and why is it important?',
      'workers-ai',
      '@cf/meta/llama-3.1-8b-instruct'
    );
    
    // 4. Multiple evaluations for comparison
    await runMultipleEvaluations();
    
    console.log('✅ All examples completed!\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Only run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { checkHealth, listModels, runEvaluation, runMultipleEvaluations };
