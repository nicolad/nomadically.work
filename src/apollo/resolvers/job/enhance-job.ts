import { jobs } from "@/db/schema";
import type { GraphQLContext } from "../../context";
import { last, split } from "lodash";
import {
  fetchGreenhouseJobPost,
  saveGreenhouseJobData,
} from "@/ingestion/greenhouse";
import { getLeverPosting, saveLeverJobData } from "@/ingestion/lever";
import {
  fetchAshbyJobPostFromUrl,
  saveAshbyJobData,
  parseAshbyJobUrl,
} from "@/ingestion/ashby";

/**
 * GraphQL mutation resolver to enhance a job posting with detailed ATS data
 *
 * Supports:
 * - Greenhouse ATS: Fetches full job details including departments, offices, questions, compliance
 * - Lever ATS: Fetches posting details including categories, workplace type, salary range
 * - Ashby ATS: Fetches posting details including compensation, department, team, secondary locations
 *
 * @param _parent - Parent resolver (unused)
 * @param args - Mutation arguments
 * @param args.jobId - The unique job/posting ID from the ATS
 * @param args.company - Company identifier (board_token for Greenhouse, site name for Lever, board name for Ashby)
 * @param args.source - ATS source: "greenhouse", "lever", or "ashby"
 * @param _context - GraphQL context (unused for this public operation)
 * @returns EnhanceJobResponse with success status, message, enhanced job, and raw ATS data
 */
export async function enhanceJobFromATS(
  _parent: any,
  args: { jobId: string; company: string; source: string },
  context: GraphQLContext,
) {
  try {
    const { jobId, company, source } = args;

    // Validate source
    const supportedSources = ["greenhouse", "lever", "ashby"];
    if (!supportedSources.includes(source.toLowerCase())) {
      return {
        success: false,
        message: `ATS source "${source}" is not supported. Supported sources: ${supportedSources.join(", ")}`,
        job: null,
        enhancedData: null,
      };
    }

    // Find the job in the database first
    const allJobs = await context.db.select().from(jobs);
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
      updatedJob = await saveGreenhouseJobData(
        context.db,
        job.id,
        enhancedData,
      );

      console.log(
        `✅ [Enhance Job] Successfully enhanced Greenhouse job ${jobId}`,
      );
    } else if (source.toLowerCase() === "lever") {
      // For Lever, extract site name from the external_id URL
      // Format: https://jobs.lever.co/{site}/{posting_id}
      const urlParts = job.external_id.split("/");
      const leverSite =
        urlParts.length >= 5 ? urlParts[urlParts.length - 2] : company;
      const leverPostingId = last(urlParts) || jobId;

      console.log(
        `🔄 [Enhance Job] Fetching Lever data for posting ${leverPostingId} from site ${leverSite}`,
      );

      // Lever uses 'site' (company name) and posting ID
      // Try both global and EU regions
      try {
        enhancedData = await getLeverPosting({
          site: leverSite,
          postingId: leverPostingId,
          region: "global",
        });
      } catch (globalError) {
        console.log(
          `⚠️  [Enhance Job] Failed to fetch from global region, trying EU...`,
        );
        // If global fails, try EU region
        enhancedData = await getLeverPosting({
          site: leverSite,
          postingId: leverPostingId,
          region: "eu",
        });
      }

      // Save the enhanced data to the database
      updatedJob = await saveLeverJobData(context.db, job.id, enhancedData);

      console.log(
        `✅ [Enhance Job] Successfully enhanced Lever job ${leverPostingId}`,
      );
    } else if (source.toLowerCase() === "ashby") {
      // For Ashby, construct the URL from company (board name) and jobId
      const ashbyUrl = `https://jobs.ashbyhq.com/${company}/${jobId}`;

      console.log(
        `🔄 [Enhance Job] Fetching Ashby data for job ${jobId} from board ${company}`,
      );

      enhancedData = await fetchAshbyJobPostFromUrl(ashbyUrl, {
        includeCompensation: true,
      });

      // Save the enhanced data to the database
      updatedJob = await saveAshbyJobData(
        context.db,
        job.id,
        enhancedData,
        company,
      );

      console.log(`✅ [Enhance Job] Successfully enhanced Ashby job ${jobId}`);
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
