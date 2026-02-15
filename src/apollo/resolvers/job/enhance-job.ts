import { db } from "@/db";
import { jobs } from "@/db/schema";
import type { GraphQLContext } from "../../context";
import { last, split } from "lodash";
import {
  fetchGreenhouseJobPost,
  saveGreenhouseJobData,
} from "@/ingestion/greenhouse";
import { getLeverPosting, saveLeverJobData } from "@/ingestion/lever";

/**
 * GraphQL mutation resolver to enhance a job posting with detailed ATS data
 *
 * Supports:
 * - Greenhouse ATS: Fetches full job details including departments, offices, questions, compliance
 * - Lever ATS: Fetches posting details including categories, workplace type, salary range
 *
 * @param _parent - Parent resolver (unused)
 * @param args - Mutation arguments
 * @param args.jobId - The unique job/posting ID from the ATS
 * @param args.company - Company identifier (board_token for Greenhouse, site name for Lever)
 * @param args.source - ATS source: "greenhouse" or "lever"
 * @param _context - GraphQL context (unused for this public operation)
 * @returns EnhanceJobResponse with success status, message, enhanced job, and raw ATS data
 */
export async function enhanceJobFromATS(
  _parent: any,
  args: { jobId: string; company: string; source: string },
  _context: GraphQLContext,
) {
  try {
    const { jobId, company, source } = args;

    // Validate source
    const supportedSources = ["greenhouse", "lever"];
    if (!supportedSources.includes(source.toLowerCase())) {
      return {
        success: false,
        message: `ATS source "${source}" is not supported. Supported sources: ${supportedSources.join(", ")}`,
        job: null,
        enhancedData: null,
      };
    }

    // Find the job in the database first
    const allJobs = await db.select().from(jobs);
    const job = allJobs.find((job) => {
      const jobIdFromUrl = last(split(job.external_id, "/"));
      return jobIdFromUrl === jobId;
    });

    if (!job) {
      return {
        success: false,
        message: `Job not found with ID: ${jobId}`,
        job: null,
        enhancedData: null,
      };
    }

    let enhancedData: any;
    let updatedJob: any;

    // Fetch and save enhanced data based on ATS source
    if (source.toLowerCase() === "greenhouse") {
      const jobBoardUrl = `https://job-boards.greenhouse.io/${company}/jobs/${jobId}`;

      console.log(
        `🔄 [Enhance Job] Fetching Greenhouse data for job ${jobId} from ${jobBoardUrl}`,
      );

      enhancedData = await fetchGreenhouseJobPost(jobBoardUrl, {
        questions: true,
      });

      // Save the enhanced data to the database
      updatedJob = await saveGreenhouseJobData(job.id, enhancedData);

      console.log(
        `✅ [Enhance Job] Successfully enhanced Greenhouse job ${jobId}`,
      );
    } else if (source.toLowerCase() === "lever") {
      console.log(
        `🔄 [Enhance Job] Fetching Lever data for posting ${jobId} from site ${company}`,
      );

      // Lever uses 'site' (company name) and posting ID
      // Try both global and EU regions
      try {
        enhancedData = await getLeverPosting({
          site: company,
          postingId: jobId,
          region: "global",
        });
      } catch (globalError) {
        console.log(
          `⚠️  [Enhance Job] Failed to fetch from global region, trying EU...`,
        );
        // If global fails, try EU region
        enhancedData = await getLeverPosting({
          site: company,
          postingId: jobId,
          region: "eu",
        });
      }

      // Save the enhanced data to the database
      updatedJob = await saveLeverJobData(job.id, enhancedData);

      console.log(`✅ [Enhance Job] Successfully enhanced Lever job ${jobId}`);
    }

    return {
      success: true,
      message: `Job enhanced successfully from ${source}`,
      job: updatedJob,
      enhancedData,
    };
  } catch (error) {
    console.error("❌ [Enhance Job] Error enhancing job:", error);

    // Provide more specific error messages
    let errorMessage = "Failed to enhance job";
    if (error instanceof Error) {
      errorMessage = error.message;

      // Handle specific error cases
      if (error.message.includes("404")) {
        errorMessage = `Job not found in ${args.source} ATS. Please verify the job ID and company name.`;
      } else if (
        error.message.includes("403") ||
        error.message.includes("401")
      ) {
        errorMessage = `Access denied by ${args.source} ATS. The job may be private or the API credentials may be invalid.`;
      } else if (error.message.includes("429")) {
        errorMessage = `Rate limit exceeded on ${args.source} ATS. Please try again later.`;
      } else if (
        error.message.includes("500") ||
        error.message.includes("503")
      ) {
        errorMessage = `${args.source} ATS is experiencing issues. Please try again later.`;
      }
    }

    return {
      success: false,
      message: errorMessage,
      job: null,
      enhancedData: null,
    };
  }
}
