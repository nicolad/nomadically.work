# Memory Module

Centralized memory and personalization functionality for the job platform.

## Overview

The memory module provides:
- **Evidence-based user preferences** with confidence tracking
- **Personalization agents** with working memory
- **Recommendation system** for job filtering and ranking

## Structure

```
src/memory/
├── index.ts                 # Public exports
├── preferences.ts          # Preference manager and schemas
└── agents.ts              # Personalization and recommendation agents
```

## Components

### PreferenceManager

Evidence-based preference tracking with confidence scores:

```typescript
import { preferenceManager, PREFERENCE_FIELDS, PREFERENCE_SOURCES } from '@/memory';

// Store explicit preference
await preferenceManager.setPreference({
  userId: 'user_123',
  field: PREFERENCE_FIELDS.PREFERRED_COUNTRIES,
  value: ['DE', 'NL', 'PT'],
  confidence: 1.0,
  source: PREFERENCE_SOURCES.EXPLICIT_SETTING,
});

// Infer preference from action
await preferenceManager.inferFromAction({
  userId: 'user_123',
  action: 'apply',
  jobId: 456,
});

// Get merged preferences (highest confidence wins)
const prefs = await preferenceManager.getMergedPreferences({ userId: 'user_123' });
```

### Preference Fields

Available preference fields:
- `PREFERRED_COUNTRIES` - Array of country codes
- `PREFERRED_TIMEZONES` - Array of timezone names
- `EXCLUDED_COMPANY_TYPES` - Array of company types to filter out
- `MIN_SALARY` / `MAX_SALARY` - Numeric salary range
- `SENIORITY_LEVEL` - String (e.g., "senior", "mid", "junior")
- `TECH_STACK` - Array of technologies
- `PREFERRED_COMPANIES` / `DISLIKED_COMPANIES` - Company preferences
- `PREFERRED_SKILLS` - Array of skill tags
- `WORK_ARRANGEMENT` - "fully_remote", "hybrid", "on_site"
- `CONTRACT_TYPE` - "full_time", "contract", "part_time"

### Preference Sources

Evidence sources with different confidence levels:
- `EXPLICIT_SETTING` (1.0) - User explicitly configured
- `FEEDBACK` (0.8-0.9) - Explicit feedback (likes/applies)
- `INFERRED_ACTION` (0.5-0.7) - Inferred from behavior
- `IMPLICIT` (0.3-0.5) - Weak signals from patterns

### Personalization Agent

Helps users define preferences through conversation:

```typescript
import { personalizationAgent } from '@/memory';

const response = await personalizationAgent.generate([
  { role: 'user', content: "I don't want staffing agencies" }
], {
  resourceid: userId,
  threadid: threadId,
});
```

**Features:**
- Natural language preference capture
- Working memory for context persistence
- Automatic preference updates
- Clarifying questions for vague inputs

### Recommendation Agent

Filters and ranks jobs based on preferences:

```typescript
import { recommendationAgent } from '@/memory';

const response = await recommendationAgent.generate([
  { role: 'user', content: "Show me jobs matching my preferences" }
], {
  resourceid: userId,
  threadid: threadId,
});
```

**Filtering Rules:**
- **Hard filters** (must match): excluded types, min salary, location
- **Soft filters** (boost ranking): tech stack, companies, skills
- **Negative signals**: disliked companies, staffing agencies

### Helper Functions

```typescript
import { 
  syncPreferencesToWorkingMemory,
  capturePreferenceFromAction 
} from '@/memory';

// Sync database preferences to agent working memory
await syncPreferencesToWorkingMemory({
  userId: 'user_123',
  threadId: 'thread_456',
});

// Capture implicit preference from user action
await capturePreferenceFromAction({
  userId: 'user_123',
  action: 'like', // 'view' | 'apply' | 'like' | 'dislike' | 'skip'
  jobId: 789,
});
```

## Database Schema

```sql
CREATE TABLE user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  field TEXT NOT NULL,
  value_json TEXT,      -- For arrays/objects
  value_text TEXT,      -- For strings
  value_number REAL,    -- For numbers
  confidence REAL NOT NULL DEFAULT 1.0,
  source TEXT NOT NULL, -- EXPLICIT_SETTING | INFERRED_ACTION | FEEDBACK | IMPLICIT
  context TEXT,         -- JSON with additional context
  observed_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_user_preferences_user_field 
  ON user_preferences(user_id, field);
```

## Usage Examples

### Example 1: Explicit Preference Setting

```typescript
// User explicitly excludes staffing agencies
await preferenceManager.setPreference({
  userId: 'user_123',
  field: PREFERENCE_FIELDS.EXCLUDED_COMPANY_TYPES,
  value: ['STAFFING', 'AGENCY'],
  confidence: 1.0,
  source: PREFERENCE_SOURCES.EXPLICIT_SETTING,
  context: { source: 'settings_page' },
});
```

### Example 2: Inferred from Application

```typescript
// User applies to a job - infer preferences
await preferenceManager.inferFromAction({
  userId: 'user_123',
  action: 'apply',
  jobId: 456,
});

// This automatically:
// 1. Adds company to preferred_companies (confidence: 0.9)
// 2. If company is CONSULTANCY, excludes STAFFING/AGENCY (confidence: 0.63)
```

### Example 3: Get User Preferences

```typescript
// Get single preference
const countries = await preferenceManager.getPreference({
  userId: 'user_123',
  field: PREFERENCE_FIELDS.PREFERRED_COUNTRIES,
});
// Returns: { value: ['DE', 'NL'], confidence: 1.0, source: 'EXPLICIT_SETTING' }

// Get all merged preferences
const allPrefs = await preferenceManager.getMergedPreferences({ 
  userId: 'user_123' 
});
// Returns: { preferred_countries: { value: [...], confidence: 1.0, ... }, ... }
```

### Example 4: Agent Conversation

```typescript
// User converses with personalization agent
const messages = [
  { role: 'user', content: "I'm looking for senior roles in Europe" }
];

const response = await personalizationAgent.generate(messages, {
  resourceid: 'user_123',
  threadid: 'thread_456',
});

// Agent automatically updates working memory:
// - seniorityLevel: "senior"
// - preferredCountries: European countries
// And confirms to user what was captured
```

## Integration Points

### Inngest Functions

Memory integrates with Inngest for event-driven preference updates:

```typescript
// In src/inngest/custom-functions.ts
export const jobApplicationFunction = inngest.createFunction(
  { id: "job-application-tracking" },
  { event: "job/applied" },
  async ({ event }) => {
    await capturePreferenceFromAction({
      userId: event.data.userId,
      action: 'apply',
      jobId: event.data.jobId,
    });
  }
);
```

### GraphQL Resolvers

Expose preferences through GraphQL API:

```typescript
// In src/apollo/resolvers/user-settings.ts
const resolvers = {
  Query: {
    userPreferences: async (_, { userId }) => {
      return await preferenceManager.getMergedPreferences({ userId });
    },
  },
  Mutation: {
    setPreference: async (_, { input }) => {
      await preferenceManager.setPreference(input);
      return { success: true };
    },
  },
};
```

## Best Practices

1. **Confidence Scores**: Use appropriate confidence levels
   - Explicit user input: 1.0
   - Job application: 0.9
   - Job like: 0.7
   - Job view (extended): 0.5
   - Skip/dislike: 0.5

2. **Context**: Always provide context for debugging
   ```typescript
   context: { 
     action: 'apply',
     jobId: 123,
     jobTitle: 'Senior Engineer',
     source: 'job_detail_page'
   }
   ```

3. **Working Memory**: Sync preferences to working memory for agents
   ```typescript
   await syncPreferencesToWorkingMemory({ userId, threadId });
   ```

4. **Evidence Trail**: Preferences accumulate over time
   - Multiple signals strengthen confidence
   - Contradictory signals can be analyzed
   - Full audit trail in database

## Future Enhancements

- [ ] Merge conflicting preferences intelligently
- [ ] Time-decay for old preferences
- [ ] Collaborative filtering (similar users)
- [ ] A/B testing for preference inference
- [ ] Preference explanation UI
- [ ] Export/import preferences
- [ ] Privacy controls (forget preferences)
