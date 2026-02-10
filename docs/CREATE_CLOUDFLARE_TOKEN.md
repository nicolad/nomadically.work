# Create Cloudflare API Token with Browser Rendering

## Steps to Create the Correct Token

1. **Go to Cloudflare API Tokens page**
   - Visit: https://dash.cloudflare.com/profile/api-tokens
   - Click **"Create Token"**

2. **Choose "Create Custom Token"**

3. **Configure Token Permissions**

   ```
   Token name: nomadically-browser-rendering

   Permissions:
   ├── Account → Browser Rendering → Read
   └── Account → Browser Rendering → Edit

   Account Resources:
   └── Include → Specific account → [Your Account Name]

   TTL:
   └── (leave default or set as needed)
   ```

4. **Continue to Summary → Create Token**

5. **Copy the Token** (you won't see it again!)

6. **Update .env.local**

   ```bash
   # Replace the existing CLOUDFLARE_API_TOKEN with the new one
   CLOUDFLARE_API_TOKEN=<paste-new-token-here>
   ```

7. **Test the Setup**

   ```bash
   node test-cloudflare.mjs
   ```

   You should see:

   ```
   ✅ API token is valid (1 accounts found)
   ✅ Browser Rendering works!
   ```

## Important Notes

- **Browser Rendering** is a newer Cloudflare feature
- May require specific Cloudflare plan (check availability)
- Your current token works for other Cloudflare APIs, but not Browser Rendering
- This is why the basic API test passes, but Browser Rendering fails

## If Browser Rendering is Not Available

If your Cloudflare account doesn't have Browser Rendering access, you have two options:

### Option 1: Use Direct DeepSeek API (recommended fallback)

I can create an alternative implementation that calls DeepSeek API directly without Cloudflare Browser Rendering.

### Option 2: Upgrade Cloudflare Plan

Check if Browser Rendering is available on your current plan at:
https://dash.cloudflare.com/<account-id>/workers/browser-rendering

## Quick Check

Run this to verify your account ID is correct:

```bash
grep CLOUDFLARE_ACCOUNT_ID .env.local
```

Then visit:

```
https://dash.cloudflare.com/<paste-account-id-here>
```

You should see your account dashboard.
