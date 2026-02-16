/// <reference types="@cloudflare/workers-types" />

declare module "@prisma/nextjs-monorepo-workaround-plugin";

// Extend Cloudflare environment with D1 binding
declare global {
  interface CloudflareEnv {
    DB: D1Database;
  }
}
