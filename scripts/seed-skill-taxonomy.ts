#!/usr/bin/env tsx

/**
 * Seed Skill Taxonomy - Vector Store Population
 *
 * Populates the skills vector store with canonical skill tags and embeddings
 * for semantic search during job skill extraction.
 *
 * Usage:
 *   pnpm skills:seed
 *
 * Environment variables (loaded from .env.local):
 * - TURSO_DB_URL
 * - TURSO_DB_AUTH_TOKEN
 * - CLOUDFLARE_ACCOUNT_ID
 * - CLOUDFLARE_WORKERS_AI_KEY
 */

import { LibSQLVector } from "@mastra/libsql";
import {
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_WORKERS_AI_KEY,
  TURSO_DB_URL,
  TURSO_DB_AUTH_TOKEN,
} from "../src/config/env";

const SKILLS_VECTOR_STORE_NAME = "skills";
const SKILLS_VECTOR_INDEX = "skills_taxonomy";

/**
 * Canonical skill taxonomy with tags, labels, and aliases
 * Organized by category for maintainability
 */
const SKILL_TAXONOMY = [
  // Programming Languages
  {
    tag: "javascript",
    label: "JavaScript",
    aliases: ["js", "ecmascript", "es6", "es2015"],
  },
  {
    tag: "typescript",
    label: "TypeScript",
    aliases: ["ts"],
  },
  {
    tag: "python",
    label: "Python",
    aliases: ["py"],
  },
  {
    tag: "java",
    label: "Java",
    aliases: [],
  },
  {
    tag: "csharp",
    label: "C#",
    aliases: ["c-sharp", "dotnet"],
  },
  {
    tag: "ruby",
    label: "Ruby",
    aliases: [],
  },
  {
    tag: "php",
    label: "PHP",
    aliases: [],
  },
  {
    tag: "go",
    label: "Go",
    aliases: ["golang"],
  },
  {
    tag: "rust",
    label: "Rust",
    aliases: [],
  },
  {
    tag: "swift",
    label: "Swift",
    aliases: [],
  },
  {
    tag: "kotlin",
    label: "Kotlin",
    aliases: [],
  },
  {
    tag: "scala",
    label: "Scala",
    aliases: [],
  },
  {
    tag: "elixir",
    label: "Elixir",
    aliases: [],
  },

  // Frontend Frameworks & Libraries
  {
    tag: "react",
    label: "React",
    aliases: ["reactjs", "react.js"],
  },
  {
    tag: "vue",
    label: "Vue.js",
    aliases: ["vuejs", "vue.js"],
  },
  {
    tag: "angular",
    label: "Angular",
    aliases: ["angularjs"],
  },
  {
    tag: "svelte",
    label: "Svelte",
    aliases: [],
  },
  {
    tag: "nextjs",
    label: "Next.js",
    aliases: ["next"],
  },
  {
    tag: "nuxt",
    label: "Nuxt.js",
    aliases: ["nuxtjs"],
  },

  // Backend Frameworks
  {
    tag: "nodejs",
    label: "Node.js",
    aliases: ["node"],
  },
  {
    tag: "express",
    label: "Express.js",
    aliases: ["expressjs"],
  },
  {
    tag: "nestjs",
    label: "NestJS",
    aliases: ["nest"],
  },
  {
    tag: "django",
    label: "Django",
    aliases: [],
  },
  {
    tag: "flask",
    label: "Flask",
    aliases: [],
  },
  {
    tag: "fastapi",
    label: "FastAPI",
    aliases: [],
  },
  {
    tag: "rails",
    label: "Ruby on Rails",
    aliases: ["ruby-on-rails", "ror"],
  },
  {
    tag: "spring",
    label: "Spring Framework",
    aliases: ["spring-boot"],
  },
  {
    tag: "laravel",
    label: "Laravel",
    aliases: [],
  },

  // Databases
  {
    tag: "postgresql",
    label: "PostgreSQL",
    aliases: ["postgres", "psql"],
  },
  {
    tag: "mysql",
    label: "MySQL",
    aliases: [],
  },
  {
    tag: "mongodb",
    label: "MongoDB",
    aliases: ["mongo"],
  },
  {
    tag: "redis",
    label: "Redis",
    aliases: [],
  },
  {
    tag: "elasticsearch",
    label: "Elasticsearch",
    aliases: ["elastic"],
  },
  {
    tag: "cassandra",
    label: "Cassandra",
    aliases: [],
  },
  {
    tag: "dynamodb",
    label: "DynamoDB",
    aliases: [],
  },
  {
    tag: "sqlite",
    label: "SQLite",
    aliases: [],
  },

  // Cloud & Infrastructure
  {
    tag: "aws",
    label: "Amazon Web Services",
    aliases: ["amazon-web-services"],
  },
  {
    tag: "azure",
    label: "Microsoft Azure",
    aliases: [],
  },
  {
    tag: "gcp",
    label: "Google Cloud Platform",
    aliases: ["google-cloud"],
  },
  {
    tag: "docker",
    label: "Docker",
    aliases: [],
  },
  {
    tag: "kubernetes",
    label: "Kubernetes",
    aliases: ["k8s"],
  },
  {
    tag: "terraform",
    label: "Terraform",
    aliases: [],
  },
  {
    tag: "ansible",
    label: "Ansible",
    aliases: [],
  },
  {
    tag: "jenkins",
    label: "Jenkins",
    aliases: [],
  },
  {
    tag: "circleci",
    label: "CircleCI",
    aliases: [],
  },
  {
    tag: "github-actions",
    label: "GitHub Actions",
    aliases: [],
  },

  // DevOps & Tools
  {
    tag: "git",
    label: "Git",
    aliases: [],
  },
  {
    tag: "ci-cd",
    label: "CI/CD",
    aliases: ["continuous-integration", "continuous-deployment"],
  },
  {
    tag: "linux",
    label: "Linux",
    aliases: [],
  },
  {
    tag: "bash",
    label: "Bash",
    aliases: ["shell-scripting"],
  },

  // Mobile Development
  {
    tag: "ios",
    label: "iOS Development",
    aliases: ["iphone-development"],
  },
  {
    tag: "android",
    label: "Android Development",
    aliases: [],
  },
  {
    tag: "react-native",
    label: "React Native",
    aliases: [],
  },
  {
    tag: "flutter",
    label: "Flutter",
    aliases: [],
  },

  // Data & ML
  {
    tag: "sql",
    label: "SQL",
    aliases: [],
  },
  {
    tag: "machine-learning",
    label: "Machine Learning",
    aliases: ["ml"],
  },
  {
    tag: "deep-learning",
    label: "Deep Learning",
    aliases: ["dl"],
  },
  {
    tag: "tensorflow",
    label: "TensorFlow",
    aliases: [],
  },
  {
    tag: "pytorch",
    label: "PyTorch",
    aliases: [],
  },
  {
    tag: "pandas",
    label: "Pandas",
    aliases: [],
  },
  {
    tag: "numpy",
    label: "NumPy",
    aliases: [],
  },
  {
    tag: "scikit-learn",
    label: "scikit-learn",
    aliases: ["sklearn"],
  },

  // Testing
  {
    tag: "jest",
    label: "Jest",
    aliases: [],
  },
  {
    tag: "pytest",
    label: "pytest",
    aliases: [],
  },
  {
    tag: "cypress",
    label: "Cypress",
    aliases: [],
  },
  {
    tag: "selenium",
    label: "Selenium",
    aliases: [],
  },

  // API & Communication
  {
    tag: "rest-api",
    label: "REST API",
    aliases: ["restful", "rest"],
  },
  {
    tag: "graphql",
    label: "GraphQL",
    aliases: [],
  },
  {
    tag: "grpc",
    label: "gRPC",
    aliases: [],
  },
  {
    tag: "websocket",
    label: "WebSocket",
    aliases: ["websockets"],
  },

  // Architecture & Patterns
  {
    tag: "microservices",
    label: "Microservices",
    aliases: [],
  },
  {
    tag: "serverless",
    label: "Serverless",
    aliases: [],
  },
  {
    tag: "event-driven",
    label: "Event-Driven Architecture",
    aliases: [],
  },

  // Methodologies
  {
    tag: "agile",
    label: "Agile",
    aliases: ["scrum", "kanban"],
  },
  {
    tag: "tdd",
    label: "Test-Driven Development",
    aliases: ["test-driven-development"],
  },

  // Other
  {
    tag: "html",
    label: "HTML",
    aliases: ["html5"],
  },
  {
    tag: "css",
    label: "CSS",
    aliases: ["css3"],
  },
  {
    tag: "sass",
    label: "Sass",
    aliases: ["scss"],
  },
  {
    tag: "tailwind",
    label: "Tailwind CSS",
    aliases: ["tailwindcss"],
  },
  {
    tag: "webpack",
    label: "Webpack",
    aliases: [],
  },
  {
    tag: "vite",
    label: "Vite",
    aliases: [],
  },
];

async function embedWithCloudflareBgeSmall(
  values: string[],
): Promise<number[][]> {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_WORKERS_AI_KEY) {
    throw new Error(
      "Missing Cloudflare credentials. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_WORKERS_AI_KEY in your .env file",
    );
  }

  // Call Cloudflare Workers AI API directly to avoid AI SDK compatibility issues
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/baai/bge-small-en-v1.5`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_WORKERS_AI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: values }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudflare API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  // Cloudflare returns { result: { shape: [n, 384], data: [[...], [...]] } }
  if (!result.success || !result.result?.data) {
    throw new Error(
      `Unexpected Cloudflare API response: ${JSON.stringify(result)}`,
    );
  }

  return result.result.data as number[][];
}

async function main() {
  console.log("🌱 Seeding Skill Taxonomy");
  console.log("=========================\n");

  // Verify Cloudflare credentials
  console.log("🔑 Checking Cloudflare credentials...");
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_WORKERS_AI_KEY) {
    throw new Error(
      "Missing Cloudflare credentials!\n" +
        `  CLOUDFLARE_ACCOUNT_ID: ${CLOUDFLARE_ACCOUNT_ID ? "✓" : "✗ MISSING"}\n` +
        `  CLOUDFLARE_WORKERS_AI_KEY: ${CLOUDFLARE_WORKERS_AI_KEY ? "✓" : "✗ MISSING"}\n\n` +
        "Please set these in your .env.local file.\n" +
        "For Workers AI, create an API Token at:\n" +
        "https://dash.cloudflare.com/profile/api-tokens\n" +
        "with 'Account > Workers AI > Read' permissions",
    );
  }
  console.log(`   Account ID: ${CLOUDFLARE_ACCOUNT_ID.substring(0, 8)}...`);
  console.log(
    `   Workers AI Key: ${CLOUDFLARE_WORKERS_AI_KEY.substring(0, 8)}... (${CLOUDFLARE_WORKERS_AI_KEY.length} chars)`,
  );
  console.log();

  // Initialize vector store
  const vector = new LibSQLVector({
    id: "skills-vector",
    url: TURSO_DB_URL,
    authToken: TURSO_DB_AUTH_TOKEN,
  });

  // Create index (384 dimensions for @cf/baai/bge-small-en-v1.5)
  console.log("📊 Creating vector index...");
  try {
    await vector.createIndex({
      indexName: SKILLS_VECTOR_INDEX,
      dimension: 384,
    });
    console.log("✅ Index created/verified\n");
  } catch (error: any) {
    if (error?.message?.includes("already exists")) {
      console.log("✅ Index already exists\n");
    } else {
      throw error;
    }
  }

  // Build embedding texts (tag + label + aliases for better matching)
  console.log("🔤 Preparing skill documents...");
  const documents = SKILL_TAXONOMY.map((skill) => {
    const parts = [skill.label, skill.tag, ...skill.aliases];
    return parts.join(" ");
  });

  console.log(`   ${documents.length} skills to embed\n`);

  // Embed in batches to avoid rate limits
  console.log("🧠 Generating embeddings...");
  const BATCH_SIZE = 10;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(documents.length / BATCH_SIZE);

    process.stdout.write(
      `   Batch ${batchNum}/${totalBatches} (${batch.length} skills)...`,
    );

    try {
      const embeddings = await embedWithCloudflareBgeSmall(batch);
      allEmbeddings.push(...embeddings);
      console.log(" ✓");
    } catch (error: any) {
      console.log(" ✗");
      console.error("\n❌ Embedding failed:");
      console.error("   Status:", error.statusCode);
      console.error("   Message:", error.message);
      console.error("   URL:", error.url);
      if (error.statusCode === 401) {
        console.error(
          "\n💡 Your Cloudflare API token is invalid or lacks permissions.",
        );
        console.error("   To fix:");
        console.error(
          "   1. Go to https://dash.cloudflare.com/profile/api-tokens",
        );
        console.error(
          '   2. Create a token with "Account > Workers AI > Read" permission',
        );
        console.error("   3. Update CLOUDFLARE_WORKERS_AI_KEY in .env.local\n");
      }
      throw error;
    }

    // Small delay to be nice to the API
    if (i + BATCH_SIZE < documents.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log(`✅ Generated ${allEmbeddings.length} embeddings\n`);

  // Upsert to vector store
  console.log("💾 Storing in vector database...");

  await vector.upsert({
    indexName: SKILLS_VECTOR_INDEX,
    vectors: allEmbeddings,
    ids: SKILL_TAXONOMY.map((s) => s.tag),
    metadata: SKILL_TAXONOMY.map((skill, i) => ({
      tag: skill.tag,
      label: skill.label,
      aliases: skill.aliases,
      content: documents[i],
    })),
  });

  console.log(`✅ Stored ${SKILL_TAXONOMY.length} skill vectors\n`);

  // Verify by querying
  console.log("🔍 Verifying with sample query...");
  const testQuery = "experience with react and typescript";
  const testEmbedding = (await embedWithCloudflareBgeSmall([testQuery]))[0];

  const results = await vector.query({
    indexName: SKILLS_VECTOR_INDEX,
    queryVector: testEmbedding,
    topK: 5,
  });

  console.log(`   Query: "${testQuery}"`);
  console.log("   Top results:");
  for (const result of results) {
    console.log(
      `     - ${result.metadata?.label ?? result.id} (score: ${result.score?.toFixed(3)})`,
    );
  }

  console.log("\n✨ Skill taxonomy seeded successfully!\n");
  console.log(`You can now run: pnpm skills:extract\n`);
}

main().catch((error) => {
  console.error("❌ Error seeding taxonomy:", error);
  process.exit(1);
});
