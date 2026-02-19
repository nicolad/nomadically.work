/**
 * Skill Taxonomy Mapping
 * Maps skill tags to human-readable labels
 */

export const SKILL_LABELS: Record<string, string> = {
  // Programming Languages
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  csharp: "C#",
  ruby: "Ruby",
  php: "PHP",
  go: "Go",
  rust: "Rust",
  swift: "Swift",
  kotlin: "Kotlin",
  scala: "Scala",
  elixir: "Elixir",

  // Frontend Frameworks
  react: "React",
  vue: "Vue.js",
  angular: "Angular",
  svelte: "Svelte",
  nextjs: "Next.js",

  // Backend Frameworks
  nodejs: "Node.js",
  express: "Express.js",
  django: "Django",
  flask: "Flask",
  laravel: "Laravel",
  fastapi: "FastAPI",
  "spring-boot": "Spring Boot",

  // Mobile Development
  "react-native": "React Native",
  flutter: "Flutter",
  ios: "iOS Development",
  android: "Android Development",

  // Databases
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  mongodb: "MongoDB",
  redis: "Redis",
  elasticsearch: "Elasticsearch",
  cassandra: "Cassandra",
  dynamodb: "DynamoDB",
  sqlite: "SQLite",
  sql: "SQL",

  // Cloud & DevOps
  aws: "Amazon Web Services",
  gcp: "Google Cloud Platform",
  azure: "Microsoft Azure",
  docker: "Docker",
  kubernetes: "Kubernetes",
  terraform: "Terraform",
  ansible: "Ansible",
  jenkins: "Jenkins",
  "ci-cd": "CI/CD",
  circleci: "CircleCI",
  serverless: "Serverless",

  // Architecture & Patterns
  microservices: "Microservices",
  "rest-api": "REST API",
  graphql: "GraphQL",
  grpc: "gRPC",
  websocket: "WebSocket",
  "event-driven": "Event-Driven Architecture",

  // Tools & Other
  git: "Git",
  linux: "Linux",
  agile: "Agile",
  tdd: "Test-Driven Development",
  webpack: "Webpack",
  jest: "Jest",
  pytest: "pytest",
  tailwind: "Tailwind CSS",

  // Data Science & ML
  "machine-learning": "Machine Learning",
  "deep-learning": "Deep Learning",
  tensorflow: "TensorFlow",
  pytorch: "PyTorch",
  pandas: "Pandas",
  numpy: "NumPy",
  scikit: "scikit-learn",
  nlp: "Natural Language Processing",
  "computer-vision": "Computer Vision",

  // AI / LLM / GenAI
  llm: "Large Language Models",
  rag: "Retrieval-Augmented Generation",
  "prompt-engineering": "Prompt Engineering",
  "fine-tuning": "Fine-Tuning",
  embeddings: "Embeddings",
  transformers: "Transformers",
  agents: "AI Agents",
  "agentic-ai": "Agentic AI",
  langchain: "LangChain",
  langgraph: "LangGraph",
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
  "vercel-ai-sdk": "Vercel AI SDK",
  "vector-db": "Vector Databases",
  pinecone: "Pinecone",
  weaviate: "Weaviate",
  chromadb: "ChromaDB",
  mlops: "MLOps",
  huggingface: "Hugging Face",
  "model-evaluation": "Model Evaluation",
  "structured-output": "Structured Output",
  "function-calling": "Function Calling",
  mastra: "Mastra",
  langfuse: "Langfuse",
  promptfoo: "Promptfoo",

  // Cloudflare ecosystem
  "cloudflare-workers": "Cloudflare Workers",
  "cloudflare-workers-ai": "Cloudflare Workers AI",
  "cloudflare-d1": "Cloudflare D1",
  "cloudflare-vectorize": "Cloudflare Vectorize",

  // Frontend (extended)
  "next-auth": "NextAuth.js",
  "radix-ui": "Radix UI",
  "shadcn-ui": "shadcn/ui",
  storybook: "Storybook",
  playwright: "Playwright",
  cypress: "Cypress",
  vitest: "Vitest",
  "react-query": "React Query / TanStack Query",
  zustand: "Zustand",
  "apollo-client": "Apollo Client",
  remix: "Remix",
  astro: "Astro",

  // Backend (extended)
  "drizzle-orm": "Drizzle ORM",
  prisma: "Prisma",
  trpc: "tRPC",
  hono: "Hono",
  bun: "Bun",
  deno: "Deno",
};

/**
 * Get human-readable label for a skill tag
 */
export function getSkillLabel(tag: string): string {
  return SKILL_LABELS[tag] || tag;
}

/**
 * Format confidence score as percentage
 */
export function formatConfidence(
  confidence: number | null | undefined,
): string {
  if (confidence == null) return "";
  return `${(confidence * 100).toFixed(0)}%`;
}
