/**
 * Verify Cloudflare Browser Rendering setup
 * Run with: npx tsx scripts/verify-cloudflare-setup.ts
 */

import Cloudflare from "cloudflare";
import "dotenv/config";

async function verifySetup() {
  console.log("🔍 Verifying Cloudflare Browser Rendering setup...\n");

  // Check environment variables
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;

  console.log("Environment Variables:");
  console.log(`  CLOUDFLARE_API_TOKEN: ${apiToken ? "✅ Set" : "❌ Missing"}`);
  console.log(`  CLOUDFLARE_ACCOUNT_ID: ${accountId ? "✅ Set" : "❌ Missing"}`);
  console.log(`  DEEPSEEK_API_KEY: ${deepseekKey ? "✅ Set" : "❌ Missing"}`);
  console.log();

  if (!apiToken || !accountId || !deepseekKey) {
    console.error("❌ Missing required environment variables");
    console.log("\nPlease set in .env.local:");
    console.log("  CLOUDFLARE_API_TOKEN=<your-cloudflare-api-token>");
    console.log("  CLOUDFLARE_ACCOUNT_ID=<your-cloudflare-account-id>");
    console.log("  DEEPSEEK_API_KEY=<your-deepseek-api-key>");
    process.exit(1);
  }

  // Test Cloudflare API authentication
  try {
    const client = new Cloudflare({ apiToken });
    
    console.log("Testing Cloudflare API authentication...");
    
    // Try to list accounts to verify token works
    try {
      const accounts = await client.accounts.list();
      console.log(`✅ API token is valid (found ${accounts.result?.length || 0} accounts)`);
    } catch (error: any) {
      if (error.status === 401) {
        console.error("❌ API token is invalid or expired");
        console.log("\nTo create a new API token:");
        console.log("1. Go to https://dash.cloudflare.com/profile/api-tokens");
        console.log("2. Click 'Create Token'");
        console.log("3. Use 'Edit Cloudflare Workers' template or create custom token");
        console.log("4. Make sure to include 'Browser Rendering' permissions");
        process.exit(1);
      }
      throw error;
    }

    // Test Browser Rendering access
    console.log("\nTesting Browser Rendering access...");
    try {
      const testResponse = await client.browserRendering.json.create({
        account_id: accountId,
        url: "https://example.com",
        prompt: "Extract the title",
        response_format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
            },
            required: ["title"],
          },
        },
        custom_ai: [
          {
            model: "deepseek/deepseek-chat",
            authorization: `Bearer ${deepseekKey}`,
          },
        ],
      });

      console.log("✅ Browser Rendering is accessible and working!");
      console.log(`   Test extraction: ${JSON.stringify((testResponse as any)?.result)}`);
    } catch (error: any) {
      if (error.status === 401) {
        console.error("❌ Browser Rendering authentication failed");
        console.log("\nPossible issues:");
        console.log("1. API token doesn't have Browser Rendering permissions");
        console.log("2. Account ID is incorrect");
        console.log("3. Browser Rendering is not enabled for your account");
        console.log("\nTo fix:");
        console.log("1. Verify CLOUDFLARE_ACCOUNT_ID matches your account");
        console.log("2. Recreate API token with Browser Rendering permissions");
        console.log("3. Check if Browser Rendering is available on your Cloudflare plan");
        process.exit(1);
      } else if (error.status === 403) {
        console.error("❌ Browser Rendering access denied");
        console.log("\nYour API token is valid, but Browser Rendering is not accessible.");
        console.log("This could mean:");
        console.log("1. Browser Rendering is not enabled for your account");
        console.log("2. Your Cloudflare plan doesn't include Browser Rendering");
        console.log("3. You need to enable Browser Rendering in the dashboard");
        process.exit(1);
      } else if (error.status === 404) {
        console.error("❌ Browser Rendering endpoint not found");
        console.log("\nBrowser Rendering may not be available yet.");
        console.log("Check Cloudflare Workers documentation for availability.");
        process.exit(1);
      }
      throw error;
    }

    console.log("\n✅ All checks passed! Cloudflare Browser Rendering is properly configured.");
  } catch (error: any) {
    console.error("\n❌ Unexpected error:", error.message);
    if (error.errors) {
      console.error("Details:", JSON.stringify(error.errors, null, 2));
    }
    process.exit(1);
  }
}

verifySetup().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
