#!/bin/bash
# Push environment variables from .env.local to Vercel

set -e
cd "$(dirname "$0")/.."

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ .env.local not found"
  exit 1
fi

echo "🚀 Pushing environment variables to Vercel..."
echo ""

# Required environment variables
declare -a env_vars=(
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
  "CLERK_SECRET_KEY"
  "TURSO_DB_URL"
  "TURSO_DB_AUTH_TOKEN"
  "DEEPSEEK_API_KEY"
  "BRAVE_API_KEY"
)

# Push each variable to all environments
for var_name in "${env_vars[@]}"; do
  # Extract value from .env.local
  var_value=$(grep "^${var_name}=" .env.local | cut -d= -f2-)
  
  if [ -z "$var_value" ]; then
    echo "⚠️  Skipping $var_name - not found in .env.local"
    continue
  fi
  
  echo "📤 Pushing $var_name..."
  
  # Push to all three environments
  for env in production preview development; do
    echo "$var_value" | vercel env add "$var_name" "$env" --force > /dev/null 2>&1
    echo "  ✅ $env"
  done
  
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All environment variables pushed to Vercel!"
echo ""
echo "Verify with: vercel env ls"
