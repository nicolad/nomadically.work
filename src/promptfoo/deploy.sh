#!/bin/bash
# Deploy Promptfoo Evaluation Worker to Cloudflare
#
# Usage:
#   ./src/promptfoo/deploy.sh

set -e

echo "🚀 Deploying Promptfoo Evaluation Worker to Cloudflare"
echo "======================================================="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Error: wrangler is not installed"
    echo "Install it with: npm install -g wrangler"
    exit 1
fi

# Check if logged in
if ! wrangler whoami &> /dev/null; then
    echo "❌ Error: Not logged in to Cloudflare"
    echo "Run: wrangler login"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Check if secrets are configured
echo "📋 Checking required secrets..."
echo ""
echo "Required secrets:"
echo "  - CLOUDFLARE_ACCOUNT_ID"
echo "  - CLOUDFLARE_API_KEY"
echo ""
echo "Optional secrets (for AI Gateway):"
echo "  - CLOUDFLARE_GATEWAY_ID"
echo "  - CF_AIG_TOKEN"
echo "  - OPENAI_API_KEY"
echo "  - ANTHROPIC_API_KEY"
echo "  - GROQ_API_KEY"
echo ""

read -p "Have you configured the required secrets? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Configure secrets with:"
    echo "  npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --config wrangler.promptfoo.toml"
    echo "  npx wrangler secret put CLOUDFLARE_API_KEY --config wrangler.promptfoo.toml"
    echo ""
    exit 1
fi

echo ""
echo "🔨 Building and deploying..."
echo ""

# Deploy the worker
npx wrangler deploy --config wrangler.promptfoo.toml

echo ""
echo "✅ Deployment successful!"
echo ""
echo "Your worker is now available at:"
echo "  https://nomadically-promptfoo-eval.<your-subdomain>.workers.dev"
echo ""
echo "Test it with:"
echo "  curl https://your-worker.workers.dev/health"
echo ""
echo "📖 See DEPLOYMENT.md for usage examples"
echo ""
