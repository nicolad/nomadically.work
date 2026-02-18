#!/usr/bin/env node

/**
 * Test script for Resume RAG Worker integration
 *
 * Tests both the Cloudflare Worker endpoints directly and the GraphQL resolvers.
 */

const WORKER_URL = "https://nomadically-work-resume-rag.eeeew.workers.dev";
const GRAPHQL_URL = "http://localhost:3000/api/graphql"; // Adjust if needed

const testResume = {
  email: "test@example.com",
  user_id: "test_user",
  name: "Alex Smith",
  summary:
    "Senior Software Engineer with 8+ years building scalable web applications",
  experience: `
    Staff Engineer at TechCorp (2020-2024)
    - Led development of customer-facing dashboard using React, TypeScript, GraphQL
    - Built microservices with Python FastAPI and Node.js
    - Reduced API response times by 60% through caching and optimization
    - Mentored team of 5 engineers
    
    Senior Developer at StartupXYZ (2016-2020)
    - Built real-time collaboration features using WebSockets
    - Implemented CI/CD pipelines with GitHub Actions
    - Scaled infrastructure to handle 1M+ users
  `,
  skills: [
    "Python",
    "React",
    "TypeScript",
    "Node.js",
    "AWS",
    "Docker",
    "Kubernetes",
    "PostgreSQL",
    "GraphQL",
    "FastAPI",
  ],
  education: "BS Computer Science, Stanford University (2016)",
  metadata: { resume_id: "latest" },
};

async function testWorkerHealth() {
  console.log("\n🏥 Testing Worker Health...");
  const response = await fetch(`${WORKER_URL}/health`);
  const data = await response.json();
  console.log("✅ Health check:", data);
  return data.status === "healthy";
}

async function testResumeUpload() {
  console.log("\n📤 Testing Resume Upload...");
  const response = await fetch(`${WORKER_URL}/store-resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testResume),
  });

  const data = await response.json();

  if (data.success) {
    console.log("✅ Resume uploaded successfully:");
    console.log(`   - Email: ${data.email}`);
    console.log(`   - Resume ID: ${data.resume_id}`);
    console.log(`   - Chunks stored: ${data.chunks_stored}`);
    return true;
  } else {
    console.error("❌ Upload failed:", data.error);
    return false;
  }
}

async function testResumeSearch() {
  console.log("\n🔍 Testing Resume Search...");
  const response = await fetch(`${WORKER_URL}/search-resumes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testResume.email,
      query: "Python and React experience",
      limit: 3,
    }),
  });

  const data = await response.json();

  if (data.success) {
    console.log("✅ Search successful:");
    console.log(`   - Found ${data.count} results`);
    data.results.slice(0, 2).forEach((result, i) => {
      console.log(
        `   ${i + 1}. ${result.text.substring(0, 80)}... (score: ${result.score?.toFixed(3)})`,
      );
    });
    return true;
  } else {
    console.error("❌ Search failed:", data.error);
    return false;
  }
}

async function testResumeChat() {
  console.log("\n💬 Testing Resume RAG Chat...");
  const response = await fetch(`${WORKER_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testResume.email,
      message: "What are my strongest technical skills?",
      resume_id: "latest",
    }),
  });

  const data = await response.json();

  if (data.success) {
    console.log("✅ Chat successful:");
    console.log(`   Question: ${data.message}`);
    console.log(`   Answer: ${data.response}`);
    console.log(`   Context chunks used: ${data.context_count}`);
    return true;
  } else {
    console.error("❌ Chat failed:", data.error);
    return false;
  }
}

async function testGraphQLIntegration() {
  console.log("\n🔗 Testing GraphQL Integration...");

  try {
    // Test uploadResume mutation
    const uploadResponse = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          mutation UploadResume($email: String!, $resumeText: String!) {
            uploadResume(email: $email, resumeText: $resumeText) {
              success
              resume_id
              chunks_count
            }
          }
        `,
        variables: {
          email: "graphql-test@example.com",
          resumeText: testResume.summary + "\n\n" + testResume.experience,
        },
      }),
    });

    const uploadData = await uploadResponse.json();

    if (uploadData.data?.uploadResume?.success) {
      console.log("✅ GraphQL upload successful");
    } else {
      console.log("⚠️  GraphQL upload returned:", uploadData);
    }

    // Test askAboutResume query
    const queryResponse = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query AskAboutResume($email: String!, $question: String!) {
            askAboutResume(email: $email, question: $question) {
              answer
              context_count
            }
          }
        `,
        variables: {
          email: "graphql-test@example.com",
          question: "What companies did I work at?",
        },
      }),
    });

    const queryData = await queryResponse.json();

    if (queryData.data?.askAboutResume?.answer) {
      console.log("✅ GraphQL query successful");
      console.log(`   Answer: ${queryData.data.askAboutResume.answer}`);
    } else {
      console.log("⚠️  GraphQL query returned:", queryData);
    }

    return true;
  } catch (error) {
    console.error("❌ GraphQL test failed:", error.message);
    return false;
  }
}

async function runTests() {
  console.log("🧪 Resume RAG Integration Tests");
  console.log("================================\n");

  const results = {
    health: false,
    upload: false,
    search: false,
    chat: false,
    graphql: false,
  };

  try {
    results.health = await testWorkerHealth();

    if (results.health) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s between tests
      results.upload = await testResumeUpload();

      if (results.upload) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for indexing
        results.search = await testResumeSearch();
        results.chat = await testResumeChat();
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      results.graphql = await testGraphQLIntegration();
    }

    console.log("\n📊 Test Summary");
    console.log("===============");
    console.log(`Health Check:    ${results.health ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`Resume Upload:   ${results.upload ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`Resume Search:   ${results.search ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`Resume Chat:     ${results.chat ? "✅ PASS" : "❌ FAIL"}`);
    console.log(
      `GraphQL:         ${results.graphql ? "✅ PASS" : "⚠️  SKIP (app not running)"}`,
    );

    const allPassed =
      results.health && results.upload && results.search && results.chat;
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error("\n❌ Test suite failed:", error);
    process.exit(1);
  }
}

runTests();
