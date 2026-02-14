/**
 * DeepSeek API Examples
 * 
 * Run with: npx tsx src/deepseek/examples.ts
 */

import { createDeepSeekClient, DEEPSEEK_MODELS } from './index';

async function main() {
  console.log('🚀 DeepSeek API Examples\n');

  // ============================================================================
  // Example 1: Simple Chat Completion
  // ============================================================================
  console.log('1️⃣  Simple Chat Completion');
  console.log('─────────────────────────────────────────────────────────\n');

  const client = createDeepSeekClient();

  const response = await client.chatCompletion('What is 2+2?', {
    model: DEEPSEEK_MODELS.CHAT,
  });

  console.log('Q: What is 2+2?');
  console.log(`A: ${response}\n`);

  // ============================================================================
  // Example 2: Streaming Chat
  // ============================================================================
  console.log('2️⃣  Streaming Chat');
  console.log('─────────────────────────────────────────────────────────\n');

  console.log('Q: Write a haiku about coding.');
  console.log('A: ');

  for await (const chunk of client.chatStream({
    model: DEEPSEEK_MODELS.CHAT,
    messages: [
      { role: 'user', content: 'Write a haiku about coding.' },
    ],
  })) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      process.stdout.write(content);
    }
  }

  console.log('\n');

  // ============================================================================
  // Example 3: Reasoning Mode
  // ============================================================================
  console.log('3️⃣  Reasoning Mode (DeepSeek-R1)');
  console.log('─────────────────────────────────────────────────────────\n');

  const reasoning = await client.chat({
    model: DEEPSEEK_MODELS.REASONER,
    messages: [
      {
        role: 'user',
        content: 'If I have 5 apples and give away 2, then buy 3 more, how many do I have?',
      },
    ],
    max_tokens: 500,
  });

  console.log('Q: If I have 5 apples and give away 2, then buy 3 more, how many do I have?');
  console.log(`A: ${reasoning.choices[0].message.content}\n`);

  // ============================================================================
  // Example 4: JSON Mode
  // ============================================================================
  console.log('4️⃣  JSON Mode');
  console.log('─────────────────────────────────────────────────────────\n');

  const jsonResponse = await client.chat({
    model: DEEPSEEK_MODELS.CHAT,
    messages: [
      {
        role: 'user',
        content: 'List 3 programming languages with their primary use cases in JSON format.',
      },
    ],
    response_format: { type: 'json_object' },
  });

  const jsonData = JSON.parse(jsonResponse.choices[0].message.content);
  console.log('Programming Languages:');
  console.log(JSON.stringify(jsonData, null, 2));
  console.log();

  // ============================================================================
  // Example 5: Beta - Chat Prefix Completion
  // ============================================================================
  console.log('5️⃣  Beta: Chat Prefix Completion (Force Code Output)');
  console.log('─────────────────────────────────────────────────────────\n');

  const betaClient = createDeepSeekClient({ useBeta: true });

  const prefixResponse = await betaClient.chat({
    model: DEEPSEEK_MODELS.CHAT,
    messages: [
      { role: 'user', content: 'Write a Python function to calculate factorial' },
      { role: 'assistant', content: '```python\n', prefix: true },
    ],
    stop: ['```'],
  });

  console.log('```python');
  console.log(prefixResponse.choices[0].message.content);
  console.log('```\n');

  // ============================================================================
  // Example 6: Beta - FIM Completion
  // ============================================================================
  console.log('6️⃣  Beta: FIM Completion (Fill In the Middle)');
  console.log('─────────────────────────────────────────────────────────\n');

  const fimResponse = await betaClient.fimCompletion({
    model: DEEPSEEK_MODELS.CHAT,
    prompt: 'def fibonacci(n):',
    suffix: '    return fibonacci(n-1) + fibonacci(n-2)',
    max_tokens: 128,
  });

  console.log('Prefix:  def fibonacci(n):');
  console.log(`Middle:  ${fimResponse.choices[0].text}`);
  console.log('Suffix:      return fibonacci(n-1) + fibonacci(n-2)');
  console.log();

  // ============================================================================
  // Example 7: Tool Calling
  // ============================================================================
  console.log('7️⃣  Tool Calling');
  console.log('─────────────────────────────────────────────────────────\n');

  const toolResponse = await client.chat({
    model: DEEPSEEK_MODELS.CHAT,
    messages: [
      { role: 'user', content: 'What is the weather in Tokyo?' },
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Get current weather for a location',
          parameters: {
            type: 'object',
            properties: {
              location: { type: 'string', description: 'City name' },
              unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
            },
            required: ['location'],
          },
        },
      },
    ],
  });

  const toolCall = toolResponse.choices[0].message.tool_calls?.[0];
  if (toolCall) {
    console.log(`Tool called: ${toolCall.function.name}`);
    console.log(`Arguments: ${toolCall.function.arguments}`);
  }
  console.log();

  console.log('✅ All examples completed!');
}

// Run examples
main().catch(console.error);
