/**
 * Ashby ATS ingestion module
 *
 * ## Ashby Posting API (public, no auth needed)
 *
 * Ashby exposes a **public Posting API** at:
 *
 *   `https://api.ashbyhq.com/posting-api/`
 *
 * This API powers the hosted job boards at `jobs.ashbyhq.com/{board_name}`.
 *
 * ### Key Endpoints
 *
 * **List all jobs on a board:**
 *
 *   `GET https://api.ashbyhq.com/posting-api/job-board/{board_name}`
 *
 * Returns: `{ title, jobs: AshbyJobPosting[] }`
 *
 * Query params:
 * - `includeCompensation=true` — include salary/comp breakdown per job
 *
 * **Get a single job posting:**
 *
 *   `GET https://api.ashbyhq.com/posting-api/job-board/{board_name}/job/{job_id}`
 *
 * Returns a single `AshbyJobPosting` object.
 *
 * **Get job application form:**
 *
 *   `GET https://api.ashbyhq.com/posting-api/job-board/{board_name}/job/{job_id}/application-form`
 *
 * Returns `{ applicationForm }` with sections and fields.
 *
 * **Submit an application:**
 *
 *   `POST https://api.ashbyhq.com/posting-api/job-board/{board_name}/application`
 *
 * Body: multipart/form-data with field values + resume/cover letter files
 *
 * ---
 *
 * ### URL Mapping
 *
 * For a job URL like:
 *   `https://jobs.ashbyhq.com/livekit/f152aa9f-981c-4661-99d3-6837654b9c8b`
 *
 * The mapping is:
 * - board_name = "livekit"
 * - job_id = "f152aa9f-981c-4661-99d3-6837654b9c8b"
 *
 * API call:
 *   `GET https://api.ashbyhq.com/posting-api/job-board/livekit/job/f152aa9f-981c-4661-99d3-6837654b9c8b`
 *
 * Or to get it with compensation from the board listing:
 *   `GET https://api.ashbyhq.com/posting-api/job-board/livekit?includeCompensation=true`
 *   then filter `jobs` array by matching `id` or `jobUrl`.
 *
 * ---
 *
 * @see https://developers.ashbyhq.com (Ashby Developers)
 */

import type { DbInstance } from "@/db";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ASHBY_API_DOMAIN, ASHBY_JOBS_DOMAIN } from "@/constants/ats";

// ============================================================================
// Types
// ============================================================================

export interface AshbySecondaryLocation {
  location: string;
  address?: {
    addressLocality?: string;
    addressRegion?: string;
    addressCountry?: string;
  };
}

export interface AshbyCompensationComponent {
  id: string;
  summary: string;
  compensationType: string;
  interval: string;
  currencyCode: string | null;
  minValue: number | null;
  maxValue: number | null;
}

export interface AshbyCompensationTier {
  id: string;
  tierSummary: string;
  title: string;
  additionalInformation: string | null;
  components: AshbyCompensationComponent[];
}

export interface AshbyCompensation {
  compensationTierSummary: string;
  scrapeableCompensationSalarySummary: string;
  compensationTiers: AshbyCompensationTier[];
  summaryComponents: AshbyCompensationComponent[];
}

export interface AshbyJobPosting {
  /** Unique posting ID (UUID) */
  id: string;
  /** Job title */
  title: string;
  /** Primary location string */
  location: string;
  /** Location name (may differ from location) */
  locationName?: string;
  /** Additional posting locations */
  secondaryLocations?: AshbySecondaryLocation[];
  /** Department name */
  department?: string;
  /** Team name */
  team?: string;
  /** Whether the job is remote */
  isRemote?: boolean;
  /** Job description (HTML) */
  descriptionHtml?: string;
  /** Job description (plaintext) */
  descriptionPlain?: string;
  /** ISO timestamp when the job was published */
  publishedAt?: string;
  /** Employment type (e.g., FullTime, PartTime, Contract) */
  employmentType?: string;
  /** Structured address */
  address?: {
    postalAddress?: {
      addressLocality?: string;
      addressRegion?: string;
      addressCountry?: string;
    };
  };
  /** URL to the hosted job page */
  jobUrl?: string;
  /** URL to the application page */
  applyUrl?: string;
  /** Whether the job is publicly listed */
  isListed?: boolean;
  /** Compensation details (only when includeCompensation=true) */
  compensation?: AshbyCompensation;
}

export interface AshbyJobBoard {
  /** Board title (company name) */
  title: string;
  /** All published jobs */
  jobs: AshbyJobPosting[];
}

export interface AshbyApplicationFormField {
  fieldId: string;
  title: string;
  isRequired: boolean;
  type: string;
  selectableValues?: Array<{ label: string; value: string }>;
}

export interface AshbyApplicationFormSection {
  title: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  fields: AshbyApplicationFormField[];
}

export interface AshbyApplicationForm {
  applicationForm: {
    sections: AshbyApplicationFormSection[];
  };
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch all job postings from an Ashby job board
 *
 * @param boardName - The Ashby board name (company identifier), e.g. "livekit"
 * @param opts - Optional configuration
 * @param opts.includeCompensation - Include salary/compensation data (default: true)
 * @param opts.signal - AbortSignal for request cancellation
 * @returns Promise resolving to the board data with all jobs
 *
 * @example
 * ```ts
 * const board = await fetchAshbyJobBoard("livekit");
 * console.log(`${board.title}: ${board.jobs.length} jobs`);
 * ```
 */
export async function fetchAshbyJobBoard(
  boardName: string,
  opts?: { includeCompensation?: boolean; signal?: AbortSignal },
): Promise<AshbyJobBoard> {
  const includeCompensation = opts?.includeCompensation ?? true;

  const url = new URL(
    `https://${ASHBY_API_DOMAIN}/posting-api/job-board/${encodeURIComponent(boardName)}`,
  );
  if (includeCompensation) {
    url.searchParams.set("includeCompensation", "true");
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: opts?.signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Ashby Posting API failed: ${res.status} ${res.statusText}\n${body}`,
    );
  }

  const data = await res.json();
  console.log(data);
  return data as AshbyJobBoard;
}

/**
 * Fetch a single job posting from an Ashby job board
 *
 * @param boardName - The Ashby board name (company identifier)
 * @param jobId - The job posting UUID
 * @param opts - Optional configuration
 * @param opts.signal - AbortSignal for request cancellation
 * @returns Promise resolving to the job posting data
 *
 * @example
 * ```ts
 * const job = await fetchAshbyJobPost("livekit", "f152aa9f-981c-4661-99d3-6837654b9c8b");
 * console.log(job.title, job.location);
 * ```
 */
export async function fetchAshbyJobPost(
  boardName: string,
  jobId: string,
  opts?: { signal?: AbortSignal },
): Promise<AshbyJobPosting> {
  const url = `https://${ASHBY_API_DOMAIN}/posting-api/job-board/${encodeURIComponent(boardName)}/job/${encodeURIComponent(jobId)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: opts?.signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");

    if (res.status === 404) {
      throw new Error(
        `Ashby job not found: ${boardName}/${jobId} (404). The job may have been removed.`,
      );
    }

    throw new Error(
      `Ashby Posting API failed: ${res.status} ${res.statusText}\n${body}`,
    );
  }

  const data = await res.json();
  console.log(data);
  return data as AshbyJobPosting;
}

/**
 * Fetch a job posting from an Ashby board URL
 *
 * Parses the board name and job ID from the URL and fetches the posting.
 * Tries the direct single-job endpoint first, falls back to board listing
 * (which also includes compensation data).
 *
 * @param ashbyUrl - Full Ashby job URL (e.g., https://jobs.ashbyhq.com/livekit/f152aa9f-...)
 * @param opts - Optional configuration
 * @param opts.includeCompensation - Include compensation data via board listing fallback (default: true)
 * @param opts.signal - AbortSignal for request cancellation
 * @returns Promise resolving to the job posting data
 *
 * @example
 * ```ts
 * const job = await fetchAshbyJobPostFromUrl(
 *   'https://jobs.ashbyhq.com/livekit/f152aa9f-981c-4661-99d3-6837654b9c8b'
 * );
 * console.log(job.title, job.compensation);
 * ```
 */
export async function fetchAshbyJobPostFromUrl(
  ashbyUrl: string,
  opts?: { includeCompensation?: boolean; signal?: AbortSignal },
): Promise<AshbyJobPosting> {
  const { boardName, jobId } = parseAshbyJobUrl(ashbyUrl);

  // Try the direct single-job endpoint first
  try {
    const posting = await fetchAshbyJobPost(boardName, jobId, {
      signal: opts?.signal,
    });

    // If we need compensation and the direct endpoint doesn't include it,
    // fall back to the board listing which supports includeCompensation
    if (opts?.includeCompensation !== false && !posting.compensation) {
      try {
        const board = await fetchAshbyJobBoard(boardName, {
          includeCompensation: true,
          signal: opts?.signal,
        });
        const withComp = board.jobs.find((j) => j.id === jobId);
        if (withComp) {
          return withComp;
        }
      } catch {
        // Fall back to the direct result without compensation
      }
    }

    return posting;
  } catch (directError) {
    // If direct endpoint fails, try via board listing as fallback
    const board = await fetchAshbyJobBoard(boardName, {
      includeCompensation: opts?.includeCompensation ?? true,
      signal: opts?.signal,
    });

    const posting = board.jobs.find(
      (j) => j.id === jobId || j.jobUrl?.includes(jobId),
    );

    if (!posting) {
      throw new Error(
        `Ashby job not found on board "${boardName}" with ID "${jobId}". ` +
          `Board has ${board.jobs.length} active jobs.`,
      );
    }

    return posting;
  }
}

/**
 * Fetch the application form for a specific Ashby job posting
 *
 * @param boardName - The Ashby board name
 * @param jobId - The job posting UUID
 * @param opts - Optional configuration
 * @returns Promise resolving to the application form data
 *
 * @example
 * ```ts
 * const form = await fetchAshbyApplicationForm("livekit", "f152aa9f-...");
 * for (const section of form.applicationForm.sections) {
 *   console.log(section.title, section.fields.length, "fields");
 * }
 * ```
 */
export async function fetchAshbyApplicationForm(
  boardName: string,
  jobId: string,
  opts?: { signal?: AbortSignal },
): Promise<AshbyApplicationForm> {
  const url = `https://${ASHBY_API_DOMAIN}/posting-api/job-board/${encodeURIComponent(boardName)}/job/${encodeURIComponent(jobId)}/application-form`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: opts?.signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Ashby Application Form API failed: ${res.status} ${res.statusText}\n${body}`,
    );
  }

  const data = await res.json();
  return data as AshbyApplicationForm;
}

// ============================================================================
// URL Parsing
// ============================================================================

/**
 * Parse an Ashby job URL into board name and job ID
 *
 * Supports formats:
 * - https://jobs.ashbyhq.com/{board_name}/{job_id}
 * - https://jobs.ashbyhq.com/{board_name}/{job_id}?...
 *
 * @param ashbyUrl - Full Ashby job URL
 * @returns Object with boardName and jobId
 * @throws Error if the URL format is unsupported
 */
export function parseAshbyJobUrl(ashbyUrl: string): {
  boardName: string;
  jobId: string;
} {
  const url = new URL(ashbyUrl);

  // Expected: /{board_name}/{job_id}
  const parts = url.pathname.split("/").filter(Boolean);

  if (parts.length < 2) {
    throw new Error(
      `Unsupported Ashby job URL path: ${url.pathname}. ` +
        `Expected format: https://${ASHBY_JOBS_DOMAIN}/{board_name}/{job_id}`,
    );
  }

  return {
    boardName: parts[0],
    jobId: parts[1],
  };
}

/**
 * Extract the board name (company key) from an Ashby URL
 *
 * @param url - Full Ashby URL
 * @returns The board name, or undefined if not a valid Ashby URL
 */
export function extractAshbyBoardName(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === ASHBY_JOBS_DOMAIN) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      return parts[0];
    }
  } catch {
    // Invalid URL
  }
  return undefined;
}

// ============================================================================
// Database Persistence
// ============================================================================

/**
 * Save Ashby job data to the database
 *
 * Maps Ashby-specific fields to the jobs table columns.
 * Stores structured data (locations, compensation) as JSON in the ats_data field,
 * and maps common fields to their dedicated columns.
 *
 * @param jobId - Internal database job ID
 * @param ashbyData - Ashby job posting data from the API
 * @param boardName - The Ashby board name (company identifier)
 * @returns Promise resolving to the updated job record
 */
export async function saveAshbyJobData(
  db: DbInstance,
  jobId: number,
  ashbyData: AshbyJobPosting,
  boardName?: string,
) {
  try {
    const updateData: Record<string, unknown> = {
      // Common columns
      absolute_url: ashbyData.jobUrl || ashbyData.applyUrl || undefined,
      company_name: boardName || undefined,
      description:
        ashbyData.descriptionHtml || ashbyData.descriptionPlain || undefined,
      location: ashbyData.locationName || ashbyData.location || undefined,
      workplace_type: ashbyData.isRemote ? "remote" : undefined,
      country: ashbyData.address?.postalAddress?.addressCountry || undefined,
      ats_created_at: ashbyData.publishedAt || undefined,

      // Ashby-specific columns
      ashby_department: ashbyData.department || undefined,
      ashby_team: ashbyData.team || undefined,
      ashby_employment_type: ashbyData.employmentType || undefined,
      ashby_is_remote: ashbyData.isRemote ?? undefined,
      ashby_is_listed: ashbyData.isListed ?? undefined,
      ashby_published_at: ashbyData.publishedAt || undefined,
      ashby_job_url: ashbyData.jobUrl || undefined,
      ashby_apply_url: ashbyData.applyUrl || undefined,
      ashby_secondary_locations: ashbyData.secondaryLocations
        ? JSON.stringify(ashbyData.secondaryLocations)
        : undefined,
      ashby_compensation: ashbyData.compensation
        ? JSON.stringify(ashbyData.compensation)
        : undefined,
      ashby_address: ashbyData.address
        ? JSON.stringify(ashbyData.address)
        : undefined,

      // Store department/team in categories for compatibility
      categories: JSON.stringify({
        department: ashbyData.department || null,
        team: ashbyData.team || null,
        location: ashbyData.location || null,
        allLocations: [
          ashbyData.location,
          ...(ashbyData.secondaryLocations?.map((l) => l.location) || []),
        ].filter(Boolean),
      }),

      updated_at: new Date().toISOString(),
    };

    // Remove undefined values
    for (const key of Object.keys(updateData)) {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    }

    const [updated] = await db
      .update(jobs)
      .set(updateData as any)
      .where(eq(jobs.id, jobId))
      .returning();

    return updated;
  } catch (error) {
    console.error("Error saving Ashby job data:", error);
    throw error;
  }
}
