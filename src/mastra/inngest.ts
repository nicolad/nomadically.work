import { Inngest } from "inngest";
import { realtimeMiddleware } from "@inngest/realtime/middleware";

export const inngest = new Inngest({
  id: "mastra",
  baseUrl: process.env.INNGEST_BASE_URL || "http://localhost:8288",
  isDev: process.env.NODE_ENV === "development",
  middleware: [realtimeMiddleware()],
});
