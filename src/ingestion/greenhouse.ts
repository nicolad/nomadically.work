/**
 * Greenhouse ATS ingestion module
 *
 * Related GraphQL queries are available in: src/graphql/greenhouse.graphql
 * - GetGreenhouseJobs: Fetch all Greenhouse jobs from the database
 * - GetGreenhouseJobById: Check if a job already exists by ID
 *
 * For a Greenhouse-hosted job URL like:
 * `https://job-boards.greenhouse.io/<board_token>/jobs/<job_post_id>`
 *
 * There are **two different APIs**, depending on what you mean by "all info".
 *
 * ## 1) Public job-post data (no auth): **Job Board API**
 *
 * Greenhouse exposes published jobs, offices, departments, and the job-post payload publicly
 * (GET endpoints don't require auth).
 *
 * For example, board_token = `grafanalabs` and job_post_id = `5802159004`
 *
 * **Use this to pull the full public JSON for that posting:**
 *
 * - `GET https://boards-api.greenhouse.io/v1/boards/grafanalabs/jobs/5802159004`
 *
 * If you also want the **application form fields/questions** (so you can build a dynamic apply form), add:
 *
 * - `GET https://boards-api.greenhouse.io/v1/boards/grafanalabs/jobs/5802159004?questions=true`
 *
 * If you want to **discover/refresh jobs** from the board (and include descriptions + dept/office in each list entry):
 *
 * - `GET https://boards-api.greenhouse.io/v1/boards/grafanalabs/jobs?content=true`
 *
 * What you'll typically get from Job Board API:
 *
 * - job post id (`id`) vs underlying job id (`internal_job_id`)
 * - title, location, updated time, absolute_url
 * - HTML content/description
 * - optional `metadata` custom fields (only if the company exposes them)
 * - optional pay transparency ranges / compliance / demographic sections (if enabled)
 * - application questions (when `questions=true`)
 *
 * ---
 *
 * ## 2) Internal recruiting data (requires employer credentials): **Harvest API**
 *
 * If by "all info" you mean things like **openings, pipeline stages, hiring team, applicants/applications**,
 * that's not public. You need the company's **Harvest API** credentials.
 *
 * Typical "related to this posting" pulls (once you have the underlying Greenhouse **job id** —
 * usually the Job Board API's `internal_job_id`):
 *
 * - **Retrieve the job (internal object):**
 *   `GET https://harvest.greenhouse.io/v1/jobs/{id}`
 *
 * - **List job posts for a job (optionally full_content):**
 *   `GET https://harvest.greenhouse.io/v1/jobs/{id}/job_posts?full_content=true`
 *
 * - **List openings for a job:**
 *   `GET https://harvest.greenhouse.io/v1/jobs/{job_id}/openings`
 *
 * - **List applications filtered to a job:**
 *   `GET https://harvest.greenhouse.io/v1/applications?job_id={job_id}`
 *
 * If you don't control the Greenhouse account (e.g., you're scraping Grafana's postings),
 * you generally **can't** legally/technically access Harvest-only data like applicants.
 *
 * ---
 *
 * ## Practical mapping for a job URL
 *
 * 1. Call the Job Board endpoint for the post:
 *    `GET .../boards/grafanalabs/jobs/5802159004?questions=true`
 * 2. Read `internal_job_id` from the response (that's the job id you'd use in Harvest).
 * 3. If you have Harvest credentials, fetch openings/applications/etc using that job id.
 *
 * ---
 *
 * @see https://developers.greenhouse.io/job-board.html
 * @see https://developers.greenhouse.io/harvest.html
 */

import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Job } from "@/db/schema";

/**
 * Fetch a Greenhouse job post from the public Job Board API
 *
 * @param jobBoardUrl - Full Greenhouse job board URL (e.g., https://job-boards.greenhouse.io/grafanalabs/jobs/5802159004)
 * @param opts - Optional configuration
 * @param opts.questions - Include application form fields/questions in the response
 * @param opts.signal - AbortSignal for request cancellation
 * @returns Promise resolving to the job post data
 *
 * @example
 * ```ts
 * const job = await fetchGreenhouseJobPost(
 *   'https://job-boards.greenhouse.io/grafanalabs/jobs/5802159004',
 *   { questions: true }
 * );
 * console.log(job.title, job.internal_job_id);
 * ```
 */
export async function fetchGreenhouseJobPost(
  jobBoardUrl: string,
  opts?: { questions?: boolean; signal?: AbortSignal },
): Promise<any> {
  const url = new URL(jobBoardUrl);

  // Expected: /<board_token>/jobs/<job_post_id>
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 3 || parts[1] !== "jobs") {
    throw new Error(`Unsupported Greenhouse job URL path: ${url.pathname}`);
  }

  const boardToken = parts[0];
  const jobPostId = parts[2];

  const api = new URL(
    `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobPostId}`,
  );
  if (opts?.questions) api.searchParams.set("questions", "true");

  const res = await fetch(api.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: opts?.signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Greenhouse Job Board API failed: ${res.status} ${res.statusText}\n${body}`,
    );
  }

  const data = await res.json();
  console.log(data);
  return data;
}

/**
 * Save Greenhouse job data to the database
 *
 * @param jobId - Internal database job ID
 * @param greenhouseData - Raw Greenhouse API response
 * @returns Promise resolving to the updated job record
 */
export async function saveGreenhouseJobData(
  jobId: number,
  greenhouseData: any,
) {
  try {
    // Update the jobs table with Greenhouse data
    const updateData = {
      // Store full ATS data
      ats_data: JSON.stringify(greenhouseData),

      // ATS-specific fields
      absolute_url: greenhouseData.absolute_url,
      internal_job_id: greenhouseData.internal_job_id,
      requisition_id: greenhouseData.requisition_id,
      company_name: greenhouseData.company_name,
      first_published: greenhouseData.first_published,
      language: greenhouseData.language,
      metadata: JSON.stringify(greenhouseData.metadata || []),
      departments: JSON.stringify(greenhouseData.departments || []),
      offices: JSON.stringify(greenhouseData.offices || []),
      questions: JSON.stringify(greenhouseData.questions || []),
      location_questions: JSON.stringify(
        greenhouseData.location_questions || [],
      ),
      compliance: JSON.stringify(greenhouseData.compliance || []),
      demographic_questions: JSON.stringify(
        greenhouseData.demographic_questions || {},
      ),
      data_compliance: JSON.stringify(greenhouseData.data_compliance || []),

      // Update core fields if they're better/more complete
      description: greenhouseData.content || undefined,
      location: greenhouseData.location?.name || undefined,

      updated_at: new Date().toISOString(),
    };

    // Remove undefined values
    Object.keys(updateData).forEach(
      (key) =>
        updateData[key as keyof typeof updateData] === undefined &&
        delete updateData[key as keyof typeof updateData],
    );

    const [updated] = await db
      .update(jobs)
      .set(updateData as any)
      .where(eq(jobs.id, jobId))
      .returning();

    return updated;
  } catch (error) {
    console.error("Error saving Greenhouse job data:", error);
    throw error;
  }
}
