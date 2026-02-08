import { Inngest } from "inngest";
import { realtimeMiddleware } from "@inngest/realtime/middleware";

const isDev = process.env.NODE_ENV !== "production";

export const inngest = new Inngest({
  id: "mastra",
  // Don't set baseUrl in development - let the serve() function handle it
  // In production, set INNGEST_BASE_URL to your deployed app URL
  ...(process.env.INNGEST_BASE_URL && { baseUrl: process.env.INNGEST_BASE_URL }),
  isDev,
  middleware: [realtimeMiddleware()],
});
