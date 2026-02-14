/**
 * Mastra tool wrapper for Brave LLM Context API
 * Provides pre-extracted web content optimized for LLM grounding and RAG pipelines
 */
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getLLMContext, type BraveLLMContextParams } from "./llm-context";

/**
 * Document schema for normalized output
 */
const documentSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  hostname: z.string().optional(),
  age: z.any().optional(),
  snippets: z.array(z.string()),
  text: z.string(),
  kind: z.enum(["generic", "poi", "map"]),
});

/**
 * Brave LLM Context tool for Mastra workflows and agents
 * Returns structured documents ready for extraction/processing
 */
export const braveLlmContextTool = createTool({
  id: "brave-llm-context",
  description:
    "Search the web and get pre-extracted, LLM-ready content for a query. Returns both raw context and structured documents with snippets.",
  inputSchema: z.object({
    q: z.string().min(1).max(400).describe("The search query (1-400 chars)"),
    country: z.string().optional().describe("Country code (e.g., 'us', 'gb')"),
    search_lang: z.string().optional().describe("Search language (e.g., 'en')"),
    count: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Max search results to consider (1-50)"),
    maximum_number_of_urls: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Max URLs in response (1-50)"),
    maximum_number_of_tokens: z
      .number()
      .int()
      .min(1024)
      .max(32768)
      .optional()
      .describe("Approx max tokens (1024-32768)"),
    maximum_number_of_snippets: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Max snippets/chunks (1-100)"),
    context_threshold_mode: z
      .enum(["disabled", "strict", "lenient", "balanced"])
      .optional()
      .describe("Relevance filtering mode"),
    maximum_number_of_tokens_per_url: z
      .number()
      .int()
      .min(512)
      .max(8192)
      .optional()
      .describe("Max tokens per URL (512-8192)"),
    maximum_number_of_snippets_per_url: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Max snippets per URL (1-100)"),
    goggles: z.string().optional().describe("Goggle URL for custom ranking"),
    enable_local: z.boolean().optional().describe("Enable local recall"),
  }),
  outputSchema: z.object({
    context: z.string().describe("Full LLM-ready context text"),
    documents: z
      .array(documentSchema)
      .describe("Structured documents from the search"),
  }),

  execute: async (paramsOrWrapper: any) => {
    // Handle Mastra's multiple parameter passing patterns
    const params =
      paramsOrWrapper?.inputData || paramsOrWrapper?.data || paramsOrWrapper;

    // Call the Brave LLM Context API
    const response = await getLLMContext(params as BraveLLMContextParams);

    // Build full context text from all grounding sources
    const contextParts: string[] = [];

    // Add generic grounding
    if (response.grounding.generic?.length > 0) {
      for (const item of response.grounding.generic) {
        contextParts.push(`SOURCE: ${item.url}`);
        contextParts.push(`TITLE: ${item.title}`);
        for (const snippet of item.snippets) {
          contextParts.push(snippet);
        }
        contextParts.push("");
      }
    }

    // Add POI grounding if present
    if (response.grounding.poi) {
      contextParts.push(`POI: ${response.grounding.poi.url}`);
      contextParts.push(`TITLE: ${response.grounding.poi.title}`);
      for (const snippet of response.grounding.poi.snippets) {
        contextParts.push(snippet);
      }
      contextParts.push("");
    }

    // Add map grounding if present
    if (response.grounding.map?.length > 0) {
      for (const item of response.grounding.map) {
        contextParts.push(`MAP: ${item.url}`);
        contextParts.push(`TITLE: ${item.title}`);
        for (const snippet of item.snippets) {
          contextParts.push(snippet);
        }
        contextParts.push("");
      }
    }

    const context = contextParts.join("\n");

    // Build structured documents array
    const documents: z.infer<typeof documentSchema>[] = [];

    // Process generic documents
    if (response.grounding.generic?.length > 0) {
      for (const item of response.grounding.generic) {
        const source = response.sources[item.url];
        const hostname = new URL(item.url).hostname;

        documents.push({
          url: item.url,
          title: item.title,
          hostname,
          age: source?.meta?.published_date,
          snippets: item.snippets,
          text: [
            `TITLE: ${item.title}`,
            source?.meta?.description
              ? `DESCRIPTION: ${source.meta.description}`
              : "",
            ...item.snippets,
            source?.page_text ? `\nFULL TEXT:\n${source.page_text}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          kind: "generic",
        });
      }
    }

    // Process POI document
    if (response.grounding.poi) {
      const poi = response.grounding.poi;
      const source = response.sources[poi.url];
      const hostname = new URL(poi.url).hostname;

      documents.push({
        url: poi.url,
        title: poi.title,
        hostname,
        age: source?.meta?.published_date,
        snippets: poi.snippets,
        text: [
          `TITLE: ${poi.title}`,
          source?.meta?.description
            ? `DESCRIPTION: ${source.meta.description}`
            : "",
          ...poi.snippets,
          source?.page_text ? `\nFULL TEXT:\n${source.page_text}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        kind: "poi",
      });
    }

    // Process map documents
    if (response.grounding.map?.length > 0) {
      for (const item of response.grounding.map) {
        const source = response.sources[item.url];
        const hostname = new URL(item.url).hostname;

        documents.push({
          url: item.url,
          title: item.title,
          hostname,
          age: source?.meta?.published_date,
          snippets: item.snippets,
          text: [
            `TITLE: ${item.title}`,
            source?.meta?.description
              ? `DESCRIPTION: ${source.meta.description}`
              : "",
            ...item.snippets,
            source?.page_text ? `\nFULL TEXT:\n${source.page_text}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          kind: "map",
        });
      }
    }

    return {
      context,
      documents,
    };
  },
});
