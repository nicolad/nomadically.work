import { logger, task } from "@trigger.dev/sdk/v3";

export const enhanceGreenhouseJobsTask = task({
  id: "enhance-greenhouse-jobs",
  // Set maxDuration to 5 hours to handle large batches
  maxDuration: 18000, // 5 hours in seconds
  run: async () => {
    logger.info("🚀 Starting Greenhouse job enhancement...");

    try {
      // Call the Next.js API endpoint to do the actual work
      const apiUrl = process.env.APP_URL;

      if (!apiUrl) {
        throw new Error(
          "APP_URL environment variable is not set. Please add it to your Trigger.dev environment variables.",
        );
      }

      logger.info(`Calling API at ${apiUrl}/api/enhance-greenhouse-jobs`);

      const response = await fetch(`${apiUrl}/api/enhance-greenhouse-jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.TRIGGER_SECRET_KEY}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API request failed: ${response.status} - ${error}`);
      }

      const result = await response.json();
      logger.info("📊 Enhancement Summary", result);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("❌ Fatal error:", { error: errorMessage });
      throw error;
    }
  },
});
