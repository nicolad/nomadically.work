# Nomadically.work

Job board aggregator with GraphQL API, powered by Next.js 16 and Cloudflare D1.

## Stack

- **Next.js 16** - App Router with Node.js runtime
- **Cloudflare D1** - Serverless SQLite database
- **GraphQL** - Apollo Server with type-safe resolvers
- **Drizzle ORM** - Type-safe database queries
- **Trigger.dev** - Background job processing
- **Clerk** - Authentication

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up Cloudflare D1 Gateway (Recommended)

For production-grade performance, deploy the D1 Gateway Worker:

```bash
# Generate API key
openssl rand -hex 32

# Deploy gateway
wrangler deploy --config wrangler.d1-gateway.toml

# Set API key secret
wrangler secret put API_KEY --config wrangler.d1-gateway.toml
```

**Full instructions:** [DEPLOY_D1_GATEWAY.md](./DEPLOY_D1_GATEWAY.md)

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and add your credentials:

```bash
cp .env.example .env.local
```

**Required for D1 Gateway mode:**

```bash
D1_GATEWAY_URL=https://d1-gateway.your-subdomain.workers.dev
D1_GATEWAY_KEY=your-api-key-from-step-2
```

**Or for Direct API mode (dev only):**

```bash
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_D1_DATABASE_ID=632b9c57-8262-40bd-86c2-bc08beab713b
CLOUDFLARE_API_TOKEN=your-api-token
```

### 4. Run development server

```bash
pnpm dev
```

Visit:

- **App:** http://localhost:3000
- **GraphQL Playground:** http://localhost:3000/api/graphql

## Architecture

### Database Access

**Production (Recommended):**

```
Next.js on Vercel → D1 Gateway Worker → D1 Database (binding)
```

Benefits:

- ✅ 10-100x faster than REST API
- ✅ No Cloudflare API rate limits
- ✅ Batching support (multiple queries in one request)
- ✅ Built-in caching with `s-maxage`

**Development (Alternative):**

```
Next.js → Cloudflare REST API → D1 Database
```

⚠️ REST API has global rate limits and is slower. Use for admin/dev only.

### Why Node.js Runtime?

We use `runtime = "nodejs"` for API routes because:

- Vercel recommends Node.js over Edge for reliability + performance
- Node.js gets fluid compute optimizations (important for I/O operations)
- Full access to Node.js APIs and packages
- Better for calling external APIs like the D1 Gateway

The dominant cost is the network hop to Cloudflare, not the runtime.

## Key Features

### GraphQL API

Purpose-built resolvers with proper batching:

```graphql
query GetJobs {
  jobs(limit: 20, status: "active") {
    jobs {
      id
      title
      company_key
      location
      url
    }
    totalCount
  }
}
```

### Batched Queries

The D1 Gateway supports batching to reduce round trips:

```ts
// ❌ Slow: 3 separate requests
const jobs = await fetch(`${GATEWAY}/jobs`);
const count = await fetch(`${GATEWAY}/jobs/count`);
const companies = await fetch(`${GATEWAY}/companies`);

// ✅ Fast: 1 batched request
const { total, jobs, company_total } = await gateway.jobs.batch({
  status: "active",
  company_key: "stripe",
  limit: 20,
});
```

### Caching Strategy

- **Jobs list:** 5 sec fresh, 60 sec stale-while-revalidate
- **Job detail:** 10 sec fresh, 120 sec stale-while-revalidate
- **Companies:** 30 sec fresh, 5 min stale-while-revalidate
- **User settings:** 30 sec private cache

## Database Schema

See `migrations/schema.ts` for the full schema.

Key tables:

- `jobs` - Job postings from various ATS platforms
- `companies` - Company profiles with scoring
- `user_settings` - User preferences and filters
- `job_skill_tags` - Skill extraction results

## Scripts

```bash
# Database migrations
wrangler d1 migrations apply DB --remote

# Scrape jobs (local)
pnpm tsx scripts/ingest-jobs.ts

# Enhance job with ATS data
pnpm tsx scripts/enhance-specific-job.ts <job-id>

# Extract skills from jobs
pnpm tsx scripts/extract-job-skills.ts

# Classify remote EU jobs
pnpm tsx scripts/classify-remote-eu-jobs.ts
```

## Deployment

### Deploy to Vercel

```bash
vercel deploy
```

Make sure to add environment variables in Vercel dashboard:

- `D1_GATEWAY_URL`
- `D1_GATEWAY_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- etc. (see `.env.example`)

### Deploy D1 Gateway Worker

```bash
wrangler deploy --config wrangler.d1-gateway.toml
```

See [DEPLOY_D1_GATEWAY.md](./DEPLOY_D1_GATEWAY.md) for details.

## Performance Tips

1. **Use batching** for multiple related queries
2. **Leverage caching** - GET endpoints have aggressive `s-maxage`
3. **Select only needed columns** - Gateway uses `.raw()` for compact payloads
4. **Add indexes** for WHERE + ORDER BY queries

See [DEPLOY_D1_GATEWAY.md](./DEPLOY_D1_GATEWAY.md) for optimization details.

## Monitoring

### View Gateway logs

```bash
wrangler tail --config wrangler.d1-gateway.toml
```

### Check Gateway health

```bash
curl https://d1-gateway.your-subdomain.workers.dev/health \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Troubleshooting

### GraphQL errors

Check the console for detailed error messages:

```
❌ [GraphQL] Error in context setup: Missing D1 configuration
```

Make sure environment variables are set in `.env.local`.

### Slow queries

- Add indexes for frequently queried columns
- Use batching to reduce round trips
- Check Wrangler logs for query execution time

### "Unauthorized" errors

- Verify `D1_GATEWAY_KEY` matches the Worker's `API_KEY` secret
- Ensure `Authorization: Bearer ...` header is set

## Contributing

1. Create a feature branch
2. Make your changes
3. Test locally with `pnpm dev`
4. Submit a PR

## License

MIT
