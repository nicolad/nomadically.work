import type { GraphQLContext } from "../context";

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
      // Example:
      // const result = await context.db
      //   .select()
      //   .from(tracks)
      //   .where(eq(tracks.slug, slug))
      //   .limit(1);
      // return result[0] || null;

      return mockTracks.find((track) => track.slug === slug) || null;
    },

    tracks: async (
      _: any,
      { limit = 50 }: { limit?: number },
      _context: GraphQLContext,
    ) => {
      // TODO: Replace with actual database query
      // Example:
      // const result = await context.db
      //   .select()
      //   .from(tracks)
      //   .limit(limit);
      // return result;

      return mockTracks.slice(0, limit);
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
