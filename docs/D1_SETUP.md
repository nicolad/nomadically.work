# D1 Database Configuration

This project uses Cloudflare D1 via the HTTP REST API, which works in both local development and production.

## Setup

### 1. Get your Cloudflare Account ID

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Copy your Account ID from the right sidebar

### 2. Get your D1 Database ID

```bash
# List your D1 databases
npx wrangler d1 list

# Output will show:
# ┌──────────────────────────────────────┬────────────────────┬────────────┐
# │ UUID                                 │ Name               │ Created At │
# ├──────────────────────────────────────┼────────────────────┼────────────┤
# │ 632b9c57-8262-40bd-86c2-bc08beab713b │ nomadically-work-db│ 2024-...   │
# └──────────────────────────────────────┴────────────────────┴────────────┘

# Copy the UUID for your database
```

Or from the dashboard:

1. Go to **Workers & Pages** → **D1**
2. Click on your database (`nomadically-work-db`)
3. Copy the **Database ID** from the settings

### 3. Create a Cloudflare API Token

1. Go to [API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Use the **Edit Cloudflare Workers** template or create a custom token with:
   - **Permission**: Account - D1 - Edit
   - **Account Resources**: Include your account
4. Click **Continue to summary** → **Create Token**
5. Copy the API token (you won't be able to see it again!)

### 4. Add to `.env.local`

```bash
# Cloudflare D1 HTTP API Configuration
CLOUDFLARE_ACCOUNT_ID=your-account-id-here
CLOUDFLARE_D1_DATABASE_ID=632b9c57-8262-40bd-86c2-bc08beab713b
CLOUDFLARE_API_TOKEN=your-api-token-here
```

## Usage

The GraphQL API will automatically use the D1 HTTP client in both development and production:

```bash
# Works in local development
pnpm dev

# Also works in production deployment
# (no need for Workers bindings!)
```

## Database Operations

### Query via HTTP API

```bash
# The app uses the HTTP API automatically, but you can also use wrangler:
npx wrangler d1 execute nomadically-work-db --remote --command="SELECT * FROM jobs LIMIT 10"
```

### Migrations

```bash
# Generate migration
pnpm db:generate

# Apply to remote D1
pnpm db:push
```

## Benefits of HTTP API Approach

✅ **Works everywhere**: Local dev, CI/CD, production  
✅ **No bindings required**: No need for Cloudflare Workers context  
✅ **Same API**: Uses standard Drizzle ORM syntax  
✅ **Edge Runtime compatible**: No Node.js dependencies

## Limitations

⚠️ Slightly higher latency than Workers bindings (additional HTTP request)  
⚠️ Requires API token (secure it properly)  
⚠️ Rate limits apply (D1 free tier: 100K reads/day, 50K writes/day)

## Security

- **Never commit** API tokens to git
- Keep `.env.local` in `.gitignore`
- Use environment variables in production (Vercel, Cloudflare Pages, etc.)
- Rotate API tokens periodically
