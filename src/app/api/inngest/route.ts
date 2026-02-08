import { createServe } from "@mastra/inngest";
import { serve as nextAdapter } from "inngest/next";
import { mastra } from "@/mastra";
import { inngest } from "@/mastra/inngest";

const handler = createServe(nextAdapter)({ mastra, inngest });

export { handler as GET, handler as POST, handler as PUT };
