import type { GraphQLContext } from "../context";
import { BraveSearchAgent } from "@/brave/search-agent";

// ── Prep resource data ───────────────────────────────────────────────

interface PrepResource {
  id: string;
  title: string;
  href: string;
  description: string;
  category: string;
  tags: string[];
}

interface PrepCategory {
  id: string;
  name: string;
  emoji: string;
  description: string;
  resources: PrepResource[];
}

interface ResearchItem {
  id: string;
  title: string;
  url: string;
  summary: string;
  relevance: string;
}

// Curated fallback research resources grouped by common career goal keywords
const CURATED_RESEARCH: ResearchItem[] = [
  {
    id: "remote-work-guide",
    title: "The Ultimate Guide to Remote Work in Europe",
    url: "https://nomads.com/remote-work",
    summary: "Comprehensive guide covering visa options, tax implications, and top remote-friendly companies hiring across the EU.",
    relevance: "high",
  },
  {
    id: "eu-job-market",
    title: "European Tech Job Market Report 2024",
    url: "https://hired.com/state-of-tech-salaries",
    summary: "Salary benchmarks, in-demand skills, and hiring trends across major EU tech hubs including Berlin, Amsterdam, and Warsaw.",
    relevance: "high",
  },
  {
    id: "remote-eu-visa",
    title: "EU Digital Nomad Visas: Complete Overview",
    url: "https://nomadgate.com/eu-digital-nomad-visas",
    summary: "Comparison of digital nomad visa programs across EU member states, eligibility requirements, and application processes.",
    relevance: "high",
  },
  {
    id: "async-work",
    title: "Async-First Work: Best Practices for Distributed Teams",
    url: "https://about.gitlab.com/company/culture/all-remote/asynchronous",
    summary: "GitLab's handbook on asynchronous communication, documentation, and collaboration for fully remote teams.",
    relevance: "medium",
  },
  {
    id: "skills-demand-eu",
    title: "Top In-Demand Skills for EU Remote Jobs",
    url: "https://www.linkedin.com/pulse/top-skills-companies-need-most-2024",
    summary: "Analysis of the most sought-after technical and soft skills for remote positions at European companies.",
    relevance: "medium",
  },
  {
    id: "salary-negotiation",
    title: "How to Negotiate Salary for Remote EU Positions",
    url: "https://www.levels.fyi/blog/salary-negotiation",
    summary: "Strategies for negotiating competitive compensation when working remotely for EU-based employers.",
    relevance: "medium",
  },
];

const PREP_CATEGORIES: PrepCategory[] = [
  {
    id: "system-design",
    name: "System Design",
    emoji: "📐",
    description:
      "Foundation and advanced patterns for designing scalable systems at scale.",
    resources: [
      {
        id: "harvard-cs50",
        title: "Scalability Lecture - Harvard CS50",
        href: "https://cs50.harvard.edu/x/2023/",
        description:
          "Database scaling, caching, session management, replication",
        category: "system-design",
        tags: ["fundamentals", "scaling", "databases"],
      },
      {
        id: "system-design-primer",
        title: "System Design Primer - GitHub",
        href: "https://github.com/donnemartin/system-design-primer",
        description:
          "Comprehensive collection of scalable system design patterns",
        category: "system-design",
        tags: ["patterns", "reference", "github"],
      },
      {
        id: "ddia",
        title: "DDIA - Designing Data-Intensive Applications",
        href: "https://dataintensive.net/",
        description:
          "Deep dive into distributed systems fundamentals (Martin Kleppmann)",
        category: "system-design",
        tags: ["book", "distributed-systems", "fundamentals"],
      },
      {
        id: "web-arch-101",
        title: "Web Architecture 101 - Medium",
        href: "https://engineering.videoblocks.com/web-architecture-101-a3224e126947",
        description:
          "DNS, load balancing, caching, databases, asynchronous processing",
        category: "system-design",
        tags: ["architecture", "fundamentals", "tutorial"],
      },
      {
        id: "cap-theorem",
        title: "CAP Theorem - Eric Brewer",
        href: "https://en.wikipedia.org/wiki/CAP_theorem",
        description:
          "Consistency, Availability, Partition tolerance trade-offs",
        category: "system-design",
        tags: ["distributed-systems", "consistency", "theory"],
      },
      {
        id: "eventually-consistent",
        title: "Eventually Consistent - Werner Vogels",
        href: "http://www.allthingsdistributed.com/2008/12/eventually_consistent.html",
        description: "AWS CTO on distributed system consistency models",
        category: "system-design",
        tags: ["distributed-systems", "consistency", "aws"],
      },
      {
        id: "two-phase-commit",
        title: "Two Phase Commit - Database Transactions",
        href: "https://en.wikipedia.org/wiki/Two-phase_commit_protocol",
        description: "Distributed transaction coordination patterns",
        category: "system-design",
        tags: ["distributed-systems", "transactions"],
      },
      {
        id: "raft-consensus",
        title: "Consensus Algorithms - Raft",
        href: "https://raft.github.io/",
        description: "State machine replication and leader election",
        category: "system-design",
        tags: ["distributed-systems", "consensus", "algorithms"],
      },
      {
        id: "relational-vs-nosql",
        title: "Relational vs NoSQL Trade-offs",
        href: "https://www.mongodb.com/resources/compare/relational-vs-nosql-databases",
        description:
          "When to use SQL, document stores, key-value stores, time-series DBs",
        category: "system-design",
        tags: ["databases", "design", "trade-offs"],
      },
      {
        id: "sql-performance",
        title: "SQL Performance Explained - Baron Schwartz",
        href: "https://www.percona.com/blog/",
        description: "Indexing, query optimization, replication strategies",
        category: "system-design",
        tags: ["databases", "performance", "sql"],
      },
      {
        id: "btree-lsmtree",
        title: "B-Trees and LSM Trees",
        href: "https://en.wikipedia.org/wiki/B-tree",
        description: "Data structure fundamentals for database internals",
        category: "system-design",
        tags: ["databases", "data-structures", "fundamentals"],
      },
      {
        id: "sharding-strategies",
        title: "Sharding Strategies - MongoDB",
        href: "https://docs.mongodb.com/manual/sharding/",
        description: "Hash-based, range-based, and directory-based sharding",
        category: "system-design",
        tags: ["databases", "scaling", "mongodb"],
      },
      {
        id: "db-replication",
        title: "Database Replication Patterns",
        href: "https://cloud.google.com/architecture/database-replication",
        description: "Master-slave, multi-master, quorum-based replication",
        category: "system-design",
        tags: ["databases", "reliability", "replication"],
      },
      {
        id: "redis-caching",
        title: "Cache Strategies - Redis",
        href: "https://redis.io/docs/manual/eviction/",
        description: "LRU, LFU, TTL, write-through, write-behind patterns",
        category: "system-design",
        tags: ["caching", "redis", "performance"],
      },
      {
        id: "http-caching",
        title: "HTTP Caching - MDN",
        href: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching",
        description:
          "Browser, CDN, and proxy caching headers and best practices",
        category: "system-design",
        tags: ["caching", "http", "performance"],
      },
      {
        id: "cdns",
        title: "Content Delivery Networks (CDNs)",
        href: "https://www.cloudflare.com/learning/cdn/what-is-a-cdn/",
        description: "Global distribution, edge caching, latency reduction",
        category: "system-design",
        tags: ["caching", "cdn", "performance"],
      },
      {
        id: "message-queues",
        title: "Message Queues & Async Processing",
        href: "https://www.rabbitmq.com/documentation.html",
        description:
          "RabbitMQ, Kafka, pub-sub patterns for asynchronous workflows",
        category: "system-design",
        tags: ["async", "messaging", "reliability"],
      },
      {
        id: "microservices",
        title: "Microservices Architecture",
        href: "https://martinfowler.com/microservices/",
        description:
          "Service decomposition, API design, inter-service communication",
        category: "system-design",
        tags: ["microservices", "architecture", "design"],
      },
      {
        id: "graphql-best-practices",
        title: "GraphQL Best Practices - Apollo",
        href: "https://www.apollographql.com/docs/apollo-server/best-practices/",
        description: "Query optimization, N+1 problem, subscriptions, batching",
        category: "system-design",
        tags: ["graphql", "api-design", "performance"],
      },
      {
        id: "rest-vs-graphql",
        title: "REST vs GraphQL - GitHub",
        href: "https://github.blog/2016-09-14-the-github-graphql-api/",
        description: "API design philosophy and performance considerations",
        category: "system-design",
        tags: ["api-design", "graphql", "rest"],
      },
      {
        id: "service-discovery",
        title: "Service Discovery & Load Balancing",
        href: "https://kubernetes.io/docs/concepts/services-networking/service/",
        description:
          "DNS-based, client-side, and server-side service discovery",
        category: "system-design",
        tags: ["microservices", "kubernetes", "networking"],
      },
      {
        id: "oauth-auth",
        title: "Authentication & Authorization - OAuth 2.0",
        href: "https://oauth.net/2/",
        description: "JWT, session management, API key strategies",
        category: "system-design",
        tags: ["security", "auth", "oauth"],
      },
      {
        id: "distributed-tracing",
        title: "Distributed Tracing - OpenTelemetry",
        href: "https://opentelemetry.io/",
        description:
          "Request correlation, latency analysis, service dependencies",
        category: "system-design",
        tags: ["observability", "monitoring", "tracing"],
      },
      {
        id: "observability",
        title: "Observability: Metrics, Logs, Traces",
        href: "https://www.honeycomb.io/blog/observability-engineering/",
        description:
          "The three pillars of observability and cardinality explosion",
        category: "system-design",
        tags: ["observability", "monitoring", "fundamentals"],
      },
      {
        id: "rate-limiting",
        title: "Rate Limiting & Backpressure",
        href: "https://en.wikipedia.org/wiki/Rate_limiting",
        description: "Token bucket, leaky bucket, sliding window algorithms",
        category: "system-design",
        tags: ["reliability", "algorithms", "performance"],
      },
    ],
  },
  {
    id: "data-structures-algorithms",
    name: "Data Structures & Algorithms",
    emoji: "🔢",
    description: "Fundamental CS concepts required for coding interviews.",
    resources: [
      {
        id: "leetcode",
        title: "LeetCode - Algorithm Practice",
        href: "https://leetcode.com/",
        description:
          "Practice problems categorized by data structures, difficulty, and company",
        category: "data-structures-algorithms",
        tags: ["practice", "problems", "interview-prep"],
      },
      {
        id: "algorithm-design-manual",
        title: "Algorithm Design Manual - Skiena",
        href: "https://www3.cs.stonybrook.edu/~skiena/algorist/",
        description:
          "Comprehensive reference for algorithm design and analysis",
        category: "data-structures-algorithms",
        tags: ["reference", "book", "fundamentals"],
      },
      {
        id: "visualgo",
        title: "Visualizing Data Structures",
        href: "https://visualgo.net/",
        description:
          "Interactive visualizations of algorithms and data structures",
        category: "data-structures-algorithms",
        tags: ["visualization", "learning", "interactive"],
      },
      {
        id: "bigocheatsheet",
        title: "Big O Complexity - Cheat Sheet",
        href: "https://www.bigocheatsheet.com/",
        description:
          "Time and space complexity reference for common algorithms",
        category: "data-structures-algorithms",
        tags: ["reference", "complexity", "cheatsheet"],
      },
      {
        id: "graph-algorithms",
        title: "Graph Algorithms - TopCoder",
        href: "https://www.topcoder.com/community/competitive-programming/tutorials/",
        description:
          "Deep dives into graph problems: BFS, DFS, Dijkstra, Floyd-Warshall",
        category: "data-structures-algorithms",
        tags: ["graphs", "algorithms", "tutorial"],
      },
      {
        id: "dynamic-programming",
        title: "Dynamic Programming Patterns",
        href: "https://www.geeksforgeeks.org/dynamic-programming/",
        description: "Memoization, tabulation, and common DP problem patterns",
        category: "data-structures-algorithms",
        tags: ["dynamic-programming", "algorithms", "patterns"],
      },
    ],
  },
  {
    id: "behavioral-interview",
    name: "Behavioral & Interview Prep",
    emoji: "💬",
    description:
      "Resources for behavioral interviews and communication skills.",
    resources: [
      {
        id: "amazon-principles",
        title: "STAR Method - Amazon Leadership Principles",
        href: "https://www.amazon.jobs/en/principles",
        description:
          "Situation, Task, Action, Result framework for behavioral questions",
        category: "behavioral-interview",
        tags: ["behavioral", "interview-prep", "method"],
      },
      {
        id: "cracking-the-code",
        title: "Cracking the Coding Interview - McDowell",
        href: "https://www.crackingthecodinginterview.com/",
        description:
          "Industry standard guide covering behavioral, technical, and system design",
        category: "behavioral-interview",
        tags: ["book", "interview-prep", "comprehensive"],
      },
      {
        id: "system-design-interview",
        title: "System Design Interview - Xu",
        href: "https://www.amazon.com/System-Design-Interview-insiders-guide/dp/1736049913",
        description: "Real-world interview scenarios and solution frameworks",
        category: "behavioral-interview",
        tags: ["book", "system-design", "interview-prep"],
      },
      {
        id: "communication-skills",
        title: "Communication Skills for Engineers",
        href: "https://www.youtube.com/playlist?list=PLrtjkLvJ5-GrK3q7FxHPjPY69MNIsKwUp",
        description:
          "Clear communication, asking clarifying questions, handling feedback",
        category: "behavioral-interview",
        tags: ["communication", "video", "soft-skills"],
      },
    ],
  },
  {
    id: "practice-interviews",
    name: "Practice & Mock Interviews",
    emoji: "🎯",
    description: "Platforms and resources for practicing and getting feedback.",
    resources: [
      {
        id: "pramp",
        title: "Pramp - Peer Mock Interviews",
        href: "https://www.pramp.com/",
        description: "Free peer-to-peer mock interviews with real engineers",
        category: "practice-interviews",
        tags: ["mock-interviews", "practice", "free"],
      },
      {
        id: "interviewing-io",
        title: "Interviewing.io - Expert Mock Interviews",
        href: "https://interviewing.io/",
        description: "Practice with experienced engineers from FAANG companies",
        category: "practice-interviews",
        tags: ["mock-interviews", "practice", "experts"],
      },
      {
        id: "system-design-problems",
        title: "System Design Problems",
        href: "https://github.com/donnemartin/system-design-primer/blob/master/Solutions/System%20Design%20Interview%20Questions/README.md",
        description: "Common system design interview problems and solutions",
        category: "practice-interviews",
        tags: ["problems", "system-design", "solutions"],
      },
      {
        id: "hackerrank",
        title: "HackerRank - Technical Assessments",
        href: "https://www.hackerrank.com/",
        description:
          "Coding challenges, certifications, and company assessments",
        category: "practice-interviews",
        tags: ["practice", "assessments", "challenges"],
      },
    ],
  },
  {
    id: "company-resources",
    name: "Company-Specific Resources",
    emoji: "🏢",
    description:
      "Resources for preparing for specific companies and understanding their tech stacks.",
    resources: [
      {
        id: "distributed-systems-papers",
        title: "The Distributed Systems Reading List",
        href: "https://dancres.github.io/Pages/",
        description: "Curated papers and articles from industry leaders",
        category: "company-resources",
        tags: ["research", "papers", "distributed-systems"],
      },
      {
        id: "cloudflare-arch",
        title: "Cloudflare Architecture",
        href: "https://blog.cloudflare.com/engineering/",
        description:
          "Learn about edge computing, DDoS mitigation, and CDN infrastructure",
        category: "company-resources",
        tags: ["cloudflare", "architecture", "engineering"],
      },
      {
        id: "netflix-tech",
        title: "Netflix Tech Blog",
        href: "https://netflixtechblog.com/",
        description: "Microservices, resilience, chaos engineering at scale",
        category: "company-resources",
        tags: ["netflix", "microservices", "engineering"],
      },
      {
        id: "stripe-eng",
        title: "Stripe Engineering",
        href: "https://stripe.com/blog/engineering",
        description: "Payment systems, distributed transactions, reliability",
        category: "company-resources",
        tags: ["stripe", "payments", "reliability"],
      },
      {
        id: "uber-eng",
        title: "Uber Engineering",
        href: "https://www.uber.com/blog/engineering/",
        description: "Real-time systems, mapping, ride-matching algorithms",
        category: "company-resources",
        tags: ["uber", "real-time", "algorithms"],
      },
    ],
  },
  {
    id: "quick-reference",
    name: "Quick Reference Guides",
    emoji: "📋",
    description: "Quick lookup guides and checklists for interview prep.",
    resources: [
      {
        id: "system-design-checklist",
        title: "System Design Interview Checklist",
        href: "https://github.com/donnemartin/system-design-primer#system-design-interview-questions-with-solutions",
        description:
          "Step-by-step framework: requirements, estimations, design, trade-offs",
        category: "quick-reference",
        tags: ["checklist", "framework", "system-design"],
      },
      {
        id: "coding-patterns",
        title: "Coding Interview Patterns",
        href: "https://www.grokking-algorithms.com/",
        description:
          "Pattern-based approach to solving coding interview problems",
        category: "quick-reference",
        tags: ["patterns", "algorithms", "reference"],
      },
      {
        id: "sql-performance-ref",
        title: "SQL Query Performance",
        href: "https://use-the-index-luke.com/",
        description: "Indexing strategies and query optimization fundamentals",
        category: "quick-reference",
        tags: ["sql", "databases", "performance"],
      },
      {
        id: "rest-api-design",
        title: "REST API Design Guidelines",
        href: "https://restfulapi.net/http-status-codes/",
        description:
          "Status codes, error handling, versioning, and best practices",
        category: "quick-reference",
        tags: ["rest", "api-design", "guidelines"],
      },
    ],
  },
];

// ── Track mock data ──────────────────────────────────────────────────

// Mock data for tracks - replace with actual database queries when DB schema is ready
const mockTracks = [
  {
    id: "1",
    slug: "interview-prep",
    title: "Interview Preparation",
    description:
      "Master the technical interview process with structured practice",
    level: "intermediate",
    items: [
      {
        id: "1-1",
        kind: "module",
        title: "Behavioral Questions",
        position: 1,
        contentRef: null,
        promptRef: "behavioral-interview-prep",
        difficulty: 2,
        children: [
          {
            id: "1-1-1",
            kind: "lesson",
            title: "STAR Method Introduction",
            position: 1,
            contentRef: "star-method-intro",
            promptRef: null,
            difficulty: 1,
            children: [],
            tags: ["behavioral", "methodology"],
            prereqs: [],
          },
          {
            id: "1-1-2",
            kind: "exercise",
            title: "Practice STAR Responses",
            position: 2,
            contentRef: null,
            promptRef: "star-practice",
            difficulty: 2,
            children: [],
            tags: ["behavioral", "practice"],
            prereqs: ["1-1-1"],
          },
        ],
        tags: ["behavioral", "communication"],
        prereqs: [],
      },
      {
        id: "1-2",
        kind: "module",
        title: "Technical Coding",
        position: 2,
        contentRef: null,
        promptRef: "coding-interview-prep",
        difficulty: 3,
        children: [
          {
            id: "1-2-1",
            kind: "lesson",
            title: "Arrays and Strings",
            position: 1,
            contentRef: "arrays-strings-guide",
            promptRef: null,
            difficulty: 2,
            children: [],
            tags: ["algorithms", "data-structures"],
            prereqs: [],
          },
          {
            id: "1-2-2",
            kind: "exercise",
            title: "Two Pointers Practice",
            position: 2,
            contentRef: null,
            promptRef: "two-pointers-exercises",
            difficulty: 3,
            children: [],
            tags: ["algorithms", "practice"],
            prereqs: ["1-2-1"],
          },
        ],
        tags: ["technical", "coding"],
        prereqs: [],
      },
    ],
  },
  {
    id: "2",
    slug: "system-design",
    title: "System Design",
    description: "Learn to design scalable, distributed systems",
    level: "advanced",
    items: [
      {
        id: "2-1",
        kind: "module",
        title: "Fundamentals",
        position: 1,
        contentRef: null,
        promptRef: "system-design-fundamentals",
        difficulty: 3,
        children: [
          {
            id: "2-1-1",
            kind: "lesson",
            title: "Scalability Basics",
            position: 1,
            contentRef: "scalability-intro",
            promptRef: null,
            difficulty: 2,
            children: [],
            tags: ["scalability", "architecture"],
            prereqs: [],
          },
          {
            id: "2-1-2",
            kind: "lesson",
            title: "Load Balancing",
            position: 2,
            contentRef: "load-balancing-guide",
            promptRef: null,
            difficulty: 3,
            children: [],
            tags: ["scalability", "infrastructure"],
            prereqs: ["2-1-1"],
          },
        ],
        tags: ["system-design", "fundamentals"],
        prereqs: [],
      },
      {
        id: "2-2",
        kind: "module",
        title: "Design Practice",
        position: 2,
        contentRef: null,
        promptRef: "system-design-practice",
        difficulty: 4,
        children: [
          {
            id: "2-2-1",
            kind: "exercise",
            title: "Design a URL Shortener",
            position: 1,
            contentRef: null,
            promptRef: "url-shortener-exercise",
            difficulty: 3,
            children: [],
            tags: ["practice", "design"],
            prereqs: ["2-1-1", "2-1-2"],
          },
          {
            id: "2-2-2",
            kind: "exercise",
            title: "Design a Social Media Feed",
            position: 2,
            contentRef: null,
            promptRef: "social-feed-exercise",
            difficulty: 4,
            children: [],
            tags: ["practice", "design"],
            prereqs: ["2-2-1"],
          },
        ],
        tags: ["system-design", "practice"],
        prereqs: ["2-1"],
      },
    ],
  },
];

let nextId = String(mockTracks.length + 1);

export const trackResolvers = {
  Mutation: {
    generateResearch: async (
      _: any,
      { goalDescription }: { goalDescription: string },
      _context: GraphQLContext,
    ): Promise<ResearchItem[]> => {
      const braveApiKey =
        process.env.BRAVE_API_KEY || process.env.BRAVE_SEARCH_API_KEY;

      if (braveApiKey) {
        try {
          const agent = new BraveSearchAgent(braveApiKey);
          const response = await agent.searchGet({
            q: `${goalDescription} remote EU job career resources articles`,
            count: 10,
            maximum_number_of_urls: 8,
            maximum_number_of_tokens: 4096,
          });

          const items = response.grounding.generic.map((item, index) => ({
            id: `research-brave-${index}`,
            title: item.title,
            url: item.url,
            summary: item.snippets[0] ?? "",
            relevance: "high",
          }));

          if (items.length > 0) return items;
        } catch {
          // Fall through to curated results
        }
      }

      // Return curated fallback resources
      return CURATED_RESEARCH;
    },

    createTrack: async (
      _: any,
      {
        input,
      }: {
        input: {
          slug: string;
          title: string;
          description?: string;
          level?: string;
        };
      },
      _context: GraphQLContext,
    ) => {
      // TODO: Replace with actual DB insert
      const newTrack = {
        id: nextId,
        slug: input.slug,
        title: input.title,
        description: input.description ?? null,
        level: input.level ?? null,
        items: [],
      };
      nextId = String(Number(nextId) + 1);
      mockTracks.push(newTrack);
      return newTrack;
    },
  },

  Query: {
    track: async (
      _: any,
      { slug }: { slug: string },
      _context: GraphQLContext,
    ) => {
      // TODO: Replace with actual database query
      return mockTracks.find((track) => track.slug === slug) || null;
    },

    tracks: async (
      _: any,
      { limit = 50 }: { limit?: number },
      _context: GraphQLContext,
    ) => {
      // TODO: Replace with actual database query
      return mockTracks.slice(0, limit);
    },

    prepResources(_parent: any, _args: any, _context: GraphQLContext) {
      return {
        categories: PREP_CATEGORIES,
        totalResources: PREP_CATEGORIES.reduce(
          (sum, cat) => sum + cat.resources.length,
          0,
        ),
      };
    },

    prepResourcesByCategory(
      _parent: any,
      args: { category: string },
      _context: GraphQLContext,
    ) {
      const category = PREP_CATEGORIES.find((c) => c.id === args.category);
      return category?.resources || [];
    },
  },

  Track: {
    // Filter items to only return top-level items (parent_id = null or position-based)
    items(parent: any) {
      return parent.items || [];
    },
  },

  TrackItem: {
    children(parent: any) {
      return parent.children || [];
    },
    tags(parent: any) {
      return parent.tags || [];
    },
    prereqs(parent: any) {
      return parent.prereqs || [];
    },
  },
};
