import 'dotenv/config';
import { createDeepSeekClient, DEEPSEEK_MODELS } from './index';

async function test() {
  console.log('Testing DeepSeek API...\n');
  
  const client = createDeepSeekClient();

  const response = await client.chatCompletion('What is 2+2? Answer in one word.');

  console.log('Q: What is 2+2?');
  console.log('A:', response);
  console.log('\n✅ DeepSeek API working!');
}

test().catch(console.error);
