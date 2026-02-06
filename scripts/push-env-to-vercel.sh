#!/bin/bash

# Script to push all environment variables from .env.local to Vercel
# Usage: ./scripts/push-env-to-vercel.sh

echo "Pushing environment variables to Vercel..."
echo ""

# Counter for tracking
total=0
success=0
skipped=0

# Read .env.local and push each variable
while IFS='=' read -r key value; do
  # Skip comments, empty lines, and VERCEL_* variables (managed by Vercel)
  if [[ -z "$key" || "$key" =~ ^#.* || "$key" =~ ^VERCEL_.* ]]; then
    continue
  fi
  
  # Remove any surrounding quotes and whitespace from value
  value=$(echo "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
  
  ((total++))
  echo "[$total] Setting $key..."
  
  # Check if variable already exists
  if vercel env ls 2>/dev/null | grep -q "^[[:space:]]*$key[[:space:]]"; then
    echo "    ⚠️  Already exists, use 'vercel env rm $key' to remove first"
    ((skipped++))
  else
    # Add to all environments
    if echo "$value" | vercel env add "$key" production preview development 2>&1 | grep -q "Created"; then
      echo "    ✅ Added successfully"
      ((success++))
    else
      echo "    ❌ Failed to add"
    fi
  fi
  
done < .env.local

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary:"
echo "  Total variables: $total"
echo "  Successfully added: $success"
echo "  Already existed: $skipped"
echo ""
echo "Run 'vercel env ls' to see all variables."
