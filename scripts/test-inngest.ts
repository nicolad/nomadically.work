/**
 * Test Inngest Workflows and Functions
 * 
 * Demonstrates how to:
 * 1. Execute workflows
 * 2. Send events to trigger functions
 * 3. Monitor execution
 */

import "dotenv/config";
import { mastra } from "../src/mastra";
import { inngest } from "../src/mastra/inngest";

const EXAMPLE_USER_ID = "user_test_123";
const EXAMPLE_JOB_ID = 1;

async function testWorkflows() {
  console.log("🔄 Testing Inngest Workflows\n");

  // Test 1: Increment Workflow
  console.log("1️⃣  Testing increment workflow...");
  try {
    const result = await mastra.workflows.increment.execute({
      inputData: { value: 5 },
    });
    console.log("   Result:", result);
    console.log("   ✓ Increment workflow successful\n");
  } catch (error) {
    console.error("   ✗ Error:", error);
  }

  // Test 2: User Registration Workflow
  console.log("2️⃣  Testing user registration workflow...");
  try {
    const result = await mastra.workflows.userRegistration.execute({
      inputData: {
        email: "test@example.com",
        name: "Test User",
      },
    });
    console.log("   Result:", result);
    console.log("   ✓ User registration workflow successful\n");
  } catch (error) {
    console.error("   ✗ Error:", error);
  }

  // Test 3: Conditional Workflow
  console.log("3️⃣  Testing conditional workflow...");
  try {
    const result = await mastra.workflows.conditional.execute({
      inputData: { value: 15 },
    });
    console.log("   Result:", result);
    console.log("   ✓ Conditional workflow successful\n");
  } catch (error) {
    console.error("   ✗ Error:", error);
  }
}

async function testEvents() {
  console.log("📨 Testing Event-Driven Functions\n");

  // Event 1: User Registration
  console.log("1️⃣  Sending user registration event...");
  await inngest.send({
    name: "user/registered",
    data: {
      userId: EXAMPLE_USER_ID,
      email: "test@example.com",
      name: "Test User",
    },
  });
  console.log("   ✓ Event sent\n");

  // Event 2: Job View
  console.log("2️⃣  Sending job view event...");
  await inngest.send({
    name: "job/viewed",
    data: {
      userId: EXAMPLE_USER_ID,
      jobId: EXAMPLE_JOB_ID,
      duration: 25,
    },
  });
  console.log("   ✓ Event sent\n");

  // Event 3: Job Feedback
  console.log("3️⃣  Sending job feedback event...");
  await inngest.send({
    name: "job/feedback",
    data: {
      userId: EXAMPLE_USER_ID,
      jobId: EXAMPLE_JOB_ID,
      feedback: "like",
    },
  });
  console.log("   ✓ Event sent\n");

  // Event 4: Job Application
  console.log("4️⃣  Sending job application event...");
  await inngest.send({
    name: "job/applied",
    data: {
      userId: EXAMPLE_USER_ID,
      jobId: EXAMPLE_JOB_ID,
      companyId: 1,
      timestamp: new Date().toISOString(),
    },
  });
  console.log("   ✓ Event sent\n");

  // Event 5: Preference Update
  console.log("5️⃣  Sending preference update event...");
  await inngest.send({
    name: "preference/updated",
    data: {
      userId: EXAMPLE_USER_ID,
      field: "preferred_countries",
      value: ["DE", "NL", "PT"],
    },
  });
  console.log("   ✓ Event sent\n");

  // Event 6: New Jobs Alert
  console.log("6️⃣  Sending new jobs alert event...");
  await inngest.send({
    name: "jobs/new-batch",
    data: {
      jobIds: [1, 2, 3, 4, 5],
      source: "ashby",
    },
  });
  console.log("   ✓ Event sent\n");
}

async function main() {
  console.log("🎯 Inngest Integration Test\n");
  console.log("=" .repeat(60) + "\n");

  // Test workflows
  await testWorkflows();

  console.log("=" .repeat(60) + "\n");

  // Test events
  await testEvents();

  console.log("=" .repeat(60) + "\n");
  console.log("✅ All tests completed!");
  console.log("\n📊 View execution details at: http://localhost:8288");
  console.log("   - Go to 'Runs' to see workflow executions");
  console.log("   - Go to 'Events' to see all events sent");
  console.log("   - Go to 'Functions' to see registered functions\n");
}

main().catch(console.error);
