# Inngest Integration

Comprehensive Inngest integration for background workflows, event-driven functions, and scheduled tasks.

## 🚀 Quick Start

### 1. Start Mastra Server

```bash
pnpm mastra:dev
```

This starts Mastra on port 4111 with the Inngest endpoint at `http://localhost:4111/api/inngest`.

### 2. Start Inngest Dev Server

In a separate terminal:

```bash
pnpm inngest:dev
```

This connects to your Mastra server and opens the Inngest dashboard at `http://localhost:8288`.

### 3. View Dashboard

Open [http://localhost:8288](http://localhost:8288) to:

- See all registered workflows and functions
- Trigger workflows manually
- Monitor execution in real-time
- View logs and step-by-step progress

## 📁 Project Structure

```
src/
├── mastra/
│   ├── inngest.ts              # Inngest client configuration
│   └── index.ts                # Mastra + Inngest integration
├── workflows/
│   ├── examples.ts             # Example workflows (increment, conditional, etc.)
│   ├── scheduled.ts            # Cron-scheduled workflows
│   └── flow-control.ts         # Flow control patterns
└── inngest/
    └── custom-functions.ts     # Event-driven Inngest functions
```

## 🔄 Workflows

### Production Workflows

#### `extractJobSkillsWorkflow`

Extracts skills from job descriptions using LLM and vector search.

```typescript
// Trigger via Inngest dashboard or programmatically
await mastra.workflows.extractJobSkillsWorkflow.execute({
  inputData: {
    jobId: 123,
    title: "Senior TypeScript Engineer",
    description: "We're looking for...",
  },
});
```

#### `discoverConsultanciesCommonCrawlWorkflow`

Discovers consultancy companies from Common Crawl data.

### Scheduled Workflows (Cron)

#### `hourlyJobIngestion` ⏰ Every hour

Fetches new jobs from various sources and notifies users.

```typescript
cron: "0 * * * *"; // Every hour at minute 0
```

#### `dailySkillExtraction` ⏰ Daily at 2 AM

Extracts skills from jobs that don't have skill tags yet.

```typescript
cron: "0 2 * * *"; // Daily at 2 AM
```

#### `weeklyCompanyDiscovery` ⏰ Weekly (Sunday 3 AM)

Discovers new companies from Common Crawl.

```typescript
cron: "0 3 * * 0"; // Every Sunday at 3 AM
```

#### `dailyCleanup` ⏰ Daily at 4 AM

Cleans up expired jobs and old preferences.

```typescript
cron: "0 4 * * *"; // Daily at 4 AM
```

#### `dailyDigestTrigger` ⏰ Daily at 9 AM

Triggers daily email digests for users.

```typescript
cron: "0 9 * * *"; // Every day at 9 AM
```

### Example Workflows

#### `incrementWorkflow`

Simple counter increment example.

#### `userRegistrationWorkflow`

Multi-step workflow: validate → process user.

#### `conditionalWorkflow`

Demonstrates conditional logic with map/filter patterns.

#### `errorHandlingWorkflow`

Shows error handling and recovery.

### Flow Control Examples

#### `userProcessingWorkflow`

**Concurrency control**: Limits concurrent executions per user.

```typescript
concurrency: {
  limit: 10,
  key: "event.data.userId",
}
```

#### `apiSyncWorkflow`

**Rate limiting**: Maximum executions per time period.

```typescript
rateLimit: {
  period: "1h",
  limit: 1000,
}
```

#### `emailNotificationWorkflow`

**Throttling**: Minimum time between executions.

```typescript
throttle: {
  period: "10s",
  limit: 1,
  key: "event.data.organizationId",
}
```

#### `searchIndexWorkflow`

**Debouncing**: Waits for quiet period before executing.

```typescript
debounce: {
  period: "5s",
  key: "event.data.documentId",
}
```

#### `orderProcessingWorkflow`

**Priority queuing**: Higher priority executes first.

```typescript
priority: {
  run: "event.data.priority ?? 50",
}
```

#### `comprehensiveWorkflow`

**Combined controls**: Multiple flow control options together.

## 📨 Event-Driven Functions

Custom Inngest functions listen to events and execute logic asynchronously.

### `userRegistrationFunction`

**Event**: `user/registered`

```typescript
await inngest.send({
  name: "user/registered",
  data: {
    userId: "user_123",
    email: "user@example.com",
    name: "John Doe",
  },
});
```

### `jobApplicationFunction`

**Event**: `job/applied`

Tracks applications and updates user preferences.

```typescript
await inngest.send({
  name: "job/applied",
  data: {
    userId: "user_123",
    jobId: 456,
    companyId: 789,
    timestamp: new Date().toISOString(),
  },
});
```

### `jobViewFunction`

**Event**: `job/viewed`

Tracks job views (only significant views > 10s).

```typescript
await inngest.send({
  name: "job/viewed",
  data: {
    userId: "user_123",
    jobId: 456,
    duration: 25, // seconds
  },
});
```

### `jobFeedbackFunction`

**Event**: `job/feedback`

Captures likes/dislikes and updates preferences.

```typescript
await inngest.send({
  name: "job/feedback",
  data: {
    userId: "user_123",
    jobId: 456,
    feedback: "like", // or "dislike"
  },
});
```

### `preferenceUpdateFunction`

**Event**: `preference/updated`

Updates user preferences and triggers job re-ranking.

```typescript
await inngest.send({
  name: "preference/updated",
  data: {
    userId: "user_123",
    field: "preferred_countries",
    value: ["DE", "NL", "PT"],
  },
});
```

### `emailNotificationFunction`

**Event**: `notification/email`

Sends email notifications.

```typescript
await inngest.send({
  name: "notification/email",
  data: {
    userId: "user_123",
    email: "user@example.com",
    type: "new_jobs",
    data: { jobIds: [1, 2, 3] },
  },
});
```

### `newJobsAlertFunction`

**Event**: `jobs/new-batch`

Notifies users about new job batches.

```typescript
await inngest.send({
  name: "jobs/new-batch",
  data: {
    jobIds: [1, 2, 3, 4, 5],
    source: "ashby",
  },
});
```

### `dailyDigestFunction`

**Event**: `cron/daily-digest`

Generates personalized daily digests.

## 🎯 Usage Examples

### Trigger a Workflow

```typescript
import { mastra } from "@/mastra";

// Execute a workflow
const result = await mastra.workflows.increment.execute({
  inputData: { value: 5 },
});

console.log(result); // { value: 6 }
```

### Send an Event

```typescript
import { inngest } from "@/mastra/inngest";

// Send event to trigger function
await inngest.send({
  name: "user/registered",
  data: {
    userId: "user_123",
    email: "user@example.com",
    name: "John Doe",
  },
});
```

### Invoke from Dashboard

1. Open [http://localhost:8288](http://localhost:8288)
2. Go to **Functions**
3. Select a workflow (e.g., `workflow.increment-workflow`)
4. Click **Invoke**
5. Provide input:

```json
{
  "data": {
    "inputData": {
      "value": 5
    }
  }
}
```

## 🔧 Configuration

### Development

```typescript
// src/mastra/inngest.ts
export const inngest = new Inngest({
  id: "mastra",
  baseUrl: "http://localhost:8288",
  isDev: true,
  middleware: [realtimeMiddleware()],
});
```

### Production

```typescript
export const inngest = new Inngest({
  id: "mastra",
  middleware: [realtimeMiddleware()],
});
```

Set environment variable:

```bash
INNGEST_BASE_URL=https://your-production-url.com
```

## 📊 Monitoring

### Inngest Dashboard

- **Functions**: View all registered workflows and functions
- **Runs**: Monitor execution history
- **Events**: See all events sent
- **Logs**: Debug with step-by-step logs

### Real-time Updates

The `@inngest/realtime` middleware enables live monitoring of workflow execution.

## 🎨 Flow Control Options

### Concurrency

Limit simultaneous executions:

```typescript
concurrency: {
  limit: 10,
  key: "event.data.userId", // Scope by user
}
```

### Rate Limiting

Limit executions per time period:

```typescript
rateLimit: {
  period: "1h",
  limit: 1000,
}
```

### Throttling

Minimum time between executions:

```typescript
throttle: {
  period: "10s",
  limit: 1,
  key: "event.data.organizationId",
}
```

### Debouncing

Wait for quiet period:

```typescript
debounce: {
  period: "5s",
  key: "event.data.documentId",
}
```

### Priority

Control execution order:

```typescript
priority: {
  run: "event.data.priority ?? 50",
}
```

## 🕐 Cron Patterns

```typescript
// Every 15 minutes
cron: "*/15 * * * *";

// Every hour
cron: "0 * * * *";

// Every 6 hours
cron: "0 */6 * * *";

// Daily at midnight
cron: "0 0 * * *";

// Daily at 9 AM
cron: "0 9 * * *";

// Weekdays at 9 AM
cron: "0 9 * * 1-5";

// First day of month
cron: "0 0 1 * *";

// Every Monday at 8 AM
cron: "0 8 * * 1";
```

## 🚀 Deployment

### Vercel (Production)

1. **Set environment variables** in Vercel:

   ```
   TURSO_DB_URL=...
   TURSO_DB_AUTH_TOKEN=...
   ```

2. **Connect Inngest to Vercel**:
   - Go to Inngest dashboard
   - Click "Sync new app with Vercel"
   - Follow instructions

3. **Deploy**:

   ```bash
   vercel --prod
   ```

4. **Verify** in Inngest dashboard that functions are registered

## 📚 Additional Resources

- [Inngest Documentation](https://www.inngest.com/docs)
- [Mastra Workflows](https://mastra.ai/docs/workflows)
- [Flow Control Guide](https://www.inngest.com/docs/guides/flow-control)
- [Cron Scheduling](https://www.inngest.com/docs/guides/scheduled-functions)

## 🔍 Troubleshooting

### Functions not showing up

1. Check Mastra server is running: `pnpm mastra:dev`
2. Check Inngest is connected: `pnpm inngest:dev`
3. Verify endpoint: `http://localhost:4111/api/inngest`

### Workflow not executing

1. Check function is registered in dashboard
2. Verify input data format
3. Check logs in dashboard for errors

### Cron not triggering

1. Verify cron expression is valid
2. Check workflow has `cron` property
3. Ensure workflow is committed: `workflow.commit()`
