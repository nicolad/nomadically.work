import type { GraphQLContext } from "../context";

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

const PREP_CATEGORIES: PrepCategory[] = [
  {
    id: "system-design",
    name: "System Design",
    emoji: "📐",
    description:
      "Foundation and advanced patterns for designing scalable systems at scale.",
    resources: [
      // Core Concepts
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
        description: "Comprehensive collection of scalable system design patterns",
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
      // Distributed Systems & Consistency
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
      // Databases & Storage
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
        description:
          "Indexing, query optimization, replication strategies",
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
        description:
          "Hash-based, range-based, and directory-based sharding",
        category: "system-design",
        tags: ["databases", "scaling", "mongodb"],
      },
      {
        id: "db-replication",
        title: "Database Replication Patterns",
        href: "https://cloud.google.com/architecture/database-replication",
        description:
          "Master-slave, multi-master, quorum-based replication",
        category: "system-design",
        tags: ["databases", "reliability", "replication"],
      },
      // Caching & Performance
      {
        id: "redis-caching",
        title: "Cache Strategies - Redis",
        href: "https://redis.io/docs/manual/eviction/",
        description:
          "LRU, LFU, TTL, write-through, write-behind patterns",
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
        description:
          "Global distribution, edge caching, latency reduction",
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
      // Microservices & APIs
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
        description:
          "Query optimization, N+1 problem, subscriptions, batching",
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
      // Security & Observability
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
        description:
          "Token bucket, leaky bucket, sliding window algorithms",
        category: "system-design",
        tags: ["reliability", "algorithms", "performance"],
      },
    ],
  },
  {
    id: "data-structures-algorithms",
    name: "Data Structures & Algorithms",
    emoji: "🔢",
    description:
      "Fundamental CS concepts required for coding interviews.",
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
        description:
          "Memoization, tabulation, and common DP problem patterns",
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
        description:
          "Real-world interview scenarios and solution frameworks",
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
    description:
      "Platforms and resources for practicing and getting feedback.",
    resources: [
      {
        id: "pramp",
        title: "Pramp - Peer Mock Interviews",
        href: "https://www.pramp.com/",
        description:
          "Free peer-to-peer mock interviews with real engineers",
        category: "practice-interviews",
        tags: ["mock-interviews", "practice", "free"],
      },
      {
        id: "interviewing-io",
        title: "Interviewing.io - Expert Mock Interviews",
        href: "https://interviewing.io/",
        description:
          "Practice with experienced engineers from FAANG companies",
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
        description:
          "Microservices, resilience, chaos engineering at scale",
        category: "company-resources",
        tags: ["netflix", "microservices", "engineering"],
      },
      {
        id: "stripe-eng",
        title: "Stripe Engineering",
        href: "https://stripe.com/blog/engineering",
        description:
          "Payment systems, distributed transactions, reliability",
        category: "company-resources",
        tags: ["stripe", "payments", "reliability"],
      },
      {
        id: "uber-eng",
        title: "Uber Engineering",
        href: "https://www.uber.com/blog/engineering/",
        description:
          "Real-time systems, mapping, ride-matching algorithms",
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
        id: "sql-performance",
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

export const prepResolvers = {
  Query: {
    prepResources(
      _parent: any,
      _args: any,
      _context: GraphQLContext,
    ) {
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
};
