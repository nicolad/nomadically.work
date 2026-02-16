/// <reference types="@cloudflare/workers-types" />

declare module "@prisma/nextjs-monorepo-workaround-plugin";

// Cloudflare D1 binding types
declare module "@cloudflare/next-on-pages" {
  interface CloudflareEnv {
    DB: D1Database;
  }
}
