/**
 * Advanced Workflow Patterns with Flow Control
 * 
 * Demonstrates Inngest flow control features:
 * - Concurrency limiting
 * - Rate limiting
 * - Throttling
 * - Debouncing
 * - Priority queuing
 */

import { z } from "zod";
import { init } from "@mastra/inngest";
import { inngest } from "../mastra/inngest";

const { createWorkflow, createStep } = init(inngest);

// ============================================================================
// Concurrency Control Example
// User-scoped processing with concurrency limits
// ============================================================================

const processUserDataStep = createStep({
  id: "process-user-data",
  inputSchema: z.object({
    userId: z.string(),
    data: z.record(z.unknown()),
  }),
  outputSchema: z.object({
    userId: z.string(),
    processed: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    console.log(`Processing data for user ${inputData.userId}`);
    
    // Simulate heavy processing
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    return {
      userId: inputData.userId,
      processed: true,
    };
  },
});

export const userProcessingWorkflow = createWorkflow({
  id: "user-processing-workflow",
  inputSchema: z.object({
    userId: z.string(),
    data: z.record(z.unknown()),
  }),
  outputSchema: z.object({
    userId: z.string(),
    processed: z.boolean(),
  }),
  // Limit to 10 concurrent executions per user
  concurrency: {
    limit: 10,
    key: "event.data.userId",
  },
}).then(processUserDataStep);

userProcessingWorkflow.commit();

// ============================================================================
// Rate Limiting Example
// API sync with rate limits
// ============================================================================

const syncApiDataStep = createStep({
  id: "sync-api-data",
  inputSchema: z.object({
    endpoint: z.string(),
  }),
  outputSchema: z.object({
    status: z.string(),
    recordsSynced: z.number(),
  }),
  execute: async ({ inputData }) => {
    console.log(`Syncing data from ${inputData.endpoint}`);
    
    // Simulate API call
    return {
      status: "success",
      recordsSynced: 100,
    };
  },
});

export const apiSyncWorkflow = createWorkflow({
  id: "api-sync-workflow",
  inputSchema: z.object({
    endpoint: z.string(),
  }),
  outputSchema: z.object({
    status: z.string(),
    recordsSynced: z.number(),
  }),
  // Maximum 1000 executions per hour
  rateLimit: {
    period: "1h",
    limit: 1000,
  },
}).then(syncApiDataStep);

apiSyncWorkflow.commit();

// ============================================================================
// Throttling Example
// Email notifications with throttling per organization
// ============================================================================

const sendEmailStep = createStep({
  id: "send-email",
  inputSchema: z.object({
    organizationId: z.string(),
    message: z.string(),
    recipient: z.string(),
  }),
  outputSchema: z.object({
    sent: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    console.log(
      `Sending email to ${inputData.recipient} for org ${inputData.organizationId}`,
    );
    
    // TODO: Integrate with email service
    
    return {
      sent: true,
    };
  },
});

export const emailNotificationWorkflow = createWorkflow({
  id: "email-notification-workflow",
  inputSchema: z.object({
    organizationId: z.string(),
    message: z.string(),
    recipient: z.string(),
  }),
  outputSchema: z.object({
    sent: z.boolean(),
  }),
  // Only one email per 10 seconds per organization
  throttle: {
    period: "10s",
    limit: 1,
    key: "event.data.organizationId",
  },
}).then(sendEmailStep);

emailNotificationWorkflow.commit();

// ============================================================================
// Debouncing Example
// Search index updates with debouncing
// ============================================================================

const indexDocumentStep = createStep({
  id: "index-document",
  inputSchema: z.object({
    documentId: z.string(),
    content: z.string(),
  }),
  outputSchema: z.object({
    indexed: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    console.log(`Indexing document ${inputData.documentId}`);
    
    // TODO: Update search index
    
    return {
      indexed: true,
    };
  },
});

export const searchIndexWorkflow = createWorkflow({
  id: "search-index-workflow",
  inputSchema: z.object({
    documentId: z.string(),
    content: z.string(),
  }),
  outputSchema: z.object({
    indexed: z.boolean(),
  }),
  // Wait 5 seconds of no updates before indexing
  debounce: {
    period: "5s",
    key: "event.data.documentId",
  },
}).then(indexDocumentStep);

searchIndexWorkflow.commit();

// ============================================================================
// Priority Queue Example
// Order processing with priority
// ============================================================================

const processOrderStep = createStep({
  id: "process-order",
  inputSchema: z.object({
    orderId: z.string(),
    priority: z.number().optional(),
  }),
  outputSchema: z.object({
    processed: z.boolean(),
    orderId: z.string(),
  }),
  execute: async ({ inputData }) => {
    console.log(
      `Processing order ${inputData.orderId} with priority ${inputData.priority ?? 50}`,
    );
    
    return {
      processed: true,
      orderId: inputData.orderId,
    };
  },
});

export const orderProcessingWorkflow = createWorkflow({
  id: "order-processing-workflow",
  inputSchema: z.object({
    orderId: z.string(),
    priority: z.number().optional(),
  }),
  outputSchema: z.object({
    processed: z.boolean(),
    orderId: z.string(),
  }),
  // Higher priority orders execute first
  priority: {
    run: "event.data.priority ?? 50",
  },
}).then(processOrderStep);

orderProcessingWorkflow.commit();

// ============================================================================
// Combined Flow Control Example
// Comprehensive workflow with multiple flow control options
// ============================================================================

const comprehensiveProcessStep = createStep({
  id: "comprehensive-process",
  inputSchema: z.object({
    userId: z.string(),
    organizationId: z.string(),
    jobId: z.number(),
    priority: z.number().optional(),
  }),
  outputSchema: z.object({
    result: z.string(),
    processed: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    console.log(`Processing job ${inputData.jobId} for user ${inputData.userId}`);
    
    return {
      result: "success",
      processed: true,
    };
  },
});

export const comprehensiveWorkflow = createWorkflow({
  id: "comprehensive-workflow",
  inputSchema: z.object({
    userId: z.string(),
    organizationId: z.string(),
    jobId: z.number(),
    priority: z.number().optional(),
  }),
  outputSchema: z.object({
    result: z.string(),
    processed: z.boolean(),
  }),
  // Combine multiple flow control options
  concurrency: {
    limit: 5,
    key: "event.data.userId",
  },
  rateLimit: {
    period: "1m",
    limit: 100,
  },
  throttle: {
    period: "10s",
    limit: 1,
    key: "event.data.organizationId",
  },
  priority: {
    run: "event.data.priority ?? 0",
  },
}).then(comprehensiveProcessStep);

comprehensiveWorkflow.commit();
