# Cloudflare Browser Rendering Setup

## Issue
Getting `401 Authentication error` when using the company enhancement feature with DeepSeek extraction.

## Root Cause
The Cloudflare API token doesn't have Browser Rendering permissions enabled.

## Solution

### Step 1: Create API Token with Browser Rendering Permissions

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **"Create Token"**
3. Choose **"Create Custom Token"**
4. Configure the token:
   - **Token name**: `nomadically-browser-rendering`
   - **Permissions**:
     - Account → Browser Rendering → Read
     - Account → Browser Rendering → Edit
   - **Account Resources**: Include → Your Account
   - **TTL**: As needed (or default)
5. Click **"Continue to summary"**
6. Click **"Create Token"**
7. **Copy the token** (you won't be able to see it again)

### Step 2: Update Environment Variable

Add or update in `.env.local`:

```bash
CLOUDFLARE_API_TOKEN=<your-new-token-with-browser-rendering-permissions>
CLOUDFLARE_ACCOUNT_ID=<your-cloudflare-account-id>
DEEPSEEK_API_KEY=<your-deepseek-api-key>
```

### Step 3: Verify Setup

Run the verification script:

```bash
npx tsx scripts/verify-cloudflare-setup.ts
```

You should see:
```
✅ All checks passed! Cloudflare Browser Rendering is properly configured.
```

## Finding Your Account ID

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select any zone/site
3. On the Overview page, scroll down to find **Account ID** in the right sidebar
4. Or look in the URL: `https://dash.cloudflare.com/<account-id>/...`

## Troubleshooting

### "Browser Rendering is not available on your plan"

Browser Rendering may require a specific Cloudflare plan. Check:
- [Cloudflare Browser Rendering Docs](https://developers.cloudflare.com/browser-rendering/)
- Your account's available features in the dashboard

### "Account ID is incorrect"

Make sure `CLOUDFLARE_ACCOUNT_ID` matches the account ID shown in your Cloudflare dashboard.

### Still getting 401 errors

1. Verify the token was created with the correct permissions
2. Make sure you copied the entire token
3. Check `.env.local` has no extra spaces or quotes around the token
4. Restart your development server after updating `.env.local`

## Testing

Once configured, test the enhancement feature:

1. Go to a company detail page: `/companies/<company-key>`
2. Click the **"Enhance"** button (admin only)
3. Wait for the extraction to complete
4. The company data should be updated with information from DeepSeek

## Alternative: Use Different Extraction Method

If Browser Rendering isn't available on your plan, you could:
1. Use direct DeepSeek API calls (without browser rendering)
2. Use a different extraction service
3. Manually fetch HTML and pass to DeepSeek

See `src/browser-rendering/company/extractor.ts` to implement alternative extraction methods.
