/**
 * Lever ATS ingestion module
 *
 * ## Which "Lever API" you likely want
 *
 * **Internal ATS data (candidates/opportunities/postings/users/etc.)**
 * - Base: `https://api.lever.co/v1/`
 * - Auth: OAuth **Bearer access_token** (recommended) *or* API key via HTTP Basic
 * - Pagination uses `limit` (1–100) + an **offset token** returned in `next`
 * - Rate limits: ~10 req/s steady state, bursts up to ~20 req/s
 *
 * **Public careers site / job listings (Postings API)**
 * - Base: `https://api.lever.co/v0/postings/` (or EU: `https://api.eu.lever.co/v0/postings/`)
 * - Pagination uses `skip` + `limit`
 * - Apply endpoint is `POST /v0/postings/SITE/POSTING-ID?key=APIKEY`
 *
 * **Webhooks** (push events like `candidateHired`, `applicationCreated`, etc.)
 * - Lever includes a `signature` you can verify with HMAC-SHA256 over `token + triggeredAt`
 *
 * @see https://hire.lever.co/developer/documentation
 * @see https://github.com/lever/postings-api
 */

import crypto from "node:crypto";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";

type LeverAuth =
  | { accessToken: string; apiKey?: never }
  | { apiKey: string; accessToken?: never };

type LeverListResponse<T> = {
  data: T[];
  hasNext: boolean;
  next?: string; // offset token
};

/**
 * Lever job posting response from the v0 Postings API
 * @see https://github.com/lever/postings-api
 */
export interface LeverPosting {
  /** Unique job posting ID */
  id: string;
  /** Job posting name */
  text: string;
  /** Categories including location, commitment, team, department, and allLocations */
  categories: {
    location?: string;
    commitment?: string;
    team?: string;
    department?: string;
    /** All locations for this posting (primary location also appears here) */
    allLocations?: string[];
  };
  /** ISO 3166-1 alpha-2 country code or null (not filterable) */
  country?: string | null;
  /** Job description opening (styled HTML) */
  opening?: string;
  /** Job description opening (plaintext) */
  openingPlain?: string;
  /** Combined job description opening and body (styled HTML) */
  description: string;
  /** Combined job description opening and body (plaintext) */
  descriptionPlain: string;
  /** Job description body without opening (styled HTML) */
  descriptionBody?: string;
  /** Job description body without opening (plaintext) */
  descriptionBodyPlain?: string;
  /** Extra lists (requirements, benefits, etc.) */
  lists?: Array<{ text: string; content: string }>;
  /** Optional closing content (styled HTML) */
  additional?: string;
  /** Optional closing content (plaintext) */
  additionalPlain?: string;
  /** URL to Lever's hosted job posting page */
  hostedUrl: string;
  /** URL to Lever's hosted application form */
  applyUrl: string;
  /** Workplace type: unspecified, on-site, remote, or hybrid (not filterable) */
  workplaceType?: "unspecified" | "on-site" | "remote" | "hybrid";
  /** Salary range information */
  salaryRange?: {
    currency?: string;
    interval?: string;
    min?: number;
    max?: number;
  };
  /** Optional salary description (styled HTML) */
  salaryDescription?: string;
  /** Optional salary description (plaintext) */
  salaryDescriptionPlain?: string;
  /** When the posting was created */
  createdAt?: number;
}

/**
 * Filters for querying Lever job postings
 */
export interface LeverPostingsFilters {
  /** Filter by location(s). Multiple values are OR'd together. Case sensitive! */
  location?: string | string[];
  /** Filter by commitment(s). Multiple values are OR'd together. Case sensitive! */
  commitment?: string | string[];
  /** Filter by team(s). Multiple values are OR'd together. Case sensitive! */
  team?: string | string[];
  /** Filter by department(s). Multiple values are OR'd together. Case sensitive! */
  department?: string | string[];
  /** Filter by level */
  level?: string;
  /** Group results by: location, commitment, or team */
  group?: "location" | "commitment" | "team";
}

/**
 * Application data for submitting to a Lever job posting
 */
export interface LeverApplicationData {
  /** Candidate's name (required) */
  name: string;
  /** Email address (required). Must include "@" symbol. */
  email: string;
  /** Phone number */
  phone?: string;
  /** Current company/organization */
  org?: string;
  /** URLs for sites (GitHub, Twitter, LinkedIn, etc.) */
  urls?: Record<string, string>;
  /** Additional information from the candidate */
  comments?: string;
  /** Disable confirmation email (default: false) */
  silent?: boolean;
  /** Source tag (e.g., "LinkedIn") */
  source?: string;
  /** IP address for compliance/country detection */
  ip?: string;
  /** Marketing consent */
  consent?: {
    marketing?: boolean | { provided: boolean; compliancePolicyId?: string };
    store?: boolean | { provided: boolean; compliancePolicyId?: string };
  };
  /** Posting location for the opportunity */
  opportunityLocation?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function toQueryString(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;

    if (Array.isArray(v)) {
      for (const item of v) usp.append(k, String(item));
    } else {
      usp.set(k, String(v));
    }
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

function buildLeverHeaders(auth: LeverAuth): Record<string, string> {
  // Lever supports OAuth Bearer tokens; many endpoints/examples also support API key via HTTP Basic
  if ("accessToken" in auth) {
    return { Authorization: `Bearer ${auth.accessToken}` };
  }
  const basic = Buffer.from(`${auth.apiKey}:`).toString("base64");
  return { Authorization: `Basic ${basic}` };
}

async function leverRequest<T>(args: {
  auth: LeverAuth;
  path: string; // e.g. "/candidates"
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, unknown>;
  body?: unknown;
  baseUrl?: string; // default v1
  maxRetries?: number;
}): Promise<T> {
  const {
    auth,
    path,
    method = "GET",
    query = {},
    body,
    baseUrl = "https://api.lever.co/v1",
    maxRetries = 6,
  } = args;

  const url = `${baseUrl}${path}${toQueryString(query)}`;
  const headers: Record<string, string> = {
    ...buildLeverHeaders(auth),
    ...(body ? { "Content-Type": "application/json" } : {}),
  };

  // Lever documents rate limiting and recommends exponential backoff
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.ok) {
      // Some DELETE endpoints may return 204 No Content
      if (res.status === 204) return undefined as unknown as T;
      return (await res.json()) as T;
    }

    const retryable =
      res.status === 429 || res.status === 503 || res.status === 500;
    if (!retryable || attempt === maxRetries) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Lever request failed (${res.status} ${res.statusText}) ${url}\n${text}`,
      );
    }

    // Exponential backoff with jitter
    const base = 250 * Math.pow(2, attempt);
    const jitter = Math.floor(Math.random() * 150);
    await sleep(base + jitter);
  }

  // Unreachable
  throw new Error("Unexpected leverRequest control flow.");
}

/**
 * List all resources from a Lever v1 API endpoint with automatic pagination
 *
 * @param args - Configuration object
 * @param args.auth - Authentication credentials (OAuth token or API key)
 * @param args.endpoint - API endpoint path (e.g., "/candidates", "/opportunities")
 * @param args.limit - Results per page (1-100, default: 100)
 * @param args.params - Additional query parameters (include/expand/etc.)
 * @param args.baseUrl - Override default API base URL
 * @returns Promise resolving to array of all results
 *
 * @example
 * ```ts
 * // List all candidates
 * const candidates = await leverListAll({
 *   auth: { accessToken: process.env.LEVER_TOKEN! },
 *   endpoint: "/candidates"
 * });
 *
 * // List opportunities with expanded followers
 * const opps = await leverListAll({
 *   auth: { apiKey: process.env.LEVER_API_KEY! },
 *   endpoint: "/opportunities",
 *   params: { expand: ["followers"] }
 * });
 * ```
 */
export async function leverListAll<T>(args: {
  auth: LeverAuth;
  endpoint: string; // e.g. "/candidates" or "/opportunities"
  limit?: number; // 1..100
  params?: Record<string, unknown>; // extra query params (include/expand/etc.)
  baseUrl?: string; // default v1
}): Promise<T[]> {
  const { auth, endpoint, limit = 100, params = {}, baseUrl } = args;

  // Lever list endpoints use limit (1..100) and an offset token returned in `next`
  const results: T[] = [];
  let offset: string | undefined = undefined;

  while (true) {
    const page: LeverListResponse<T> = await leverRequest<LeverListResponse<T>>(
      {
        auth,
        path: endpoint,
        baseUrl,
        query: { ...params, limit, ...(offset ? { offset } : {}) },
      },
    );

    results.push(...(page.data ?? []));
    if (!page.hasNext || !page.next) break;
    offset = page.next;
  }

  return results;
}

/**
 * Validate a Lever webhook signature
 *
 * Lever signs webhooks using HMAC-SHA256(signatureToken, token + triggeredAt)
 *
 * @param args - Configuration object
 * @param args.body - Webhook payload containing token, triggeredAt, and signature
 * @param args.signatureToken - Secret token from Lever webhook settings
 * @returns true if signature is valid, false otherwise
 *
 * @example
 * ```ts
 * if (!validateLeverWebhook({
 *   body: req.body,
 *   signatureToken: process.env.LEVER_WEBHOOK_SECRET!
 * })) {
 *   return res.status(401).send("Invalid signature");
 * }
 * ```
 */
export function validateLeverWebhook(args: {
  body: { token: string; triggeredAt: number | string; signature: string };
  signatureToken: string; // from Lever webhook settings
}): boolean {
  // Lever signs webhooks: HMAC-SHA256(signatureToken, token + triggeredAt)
  const { body, signatureToken } = args;
  const plainText = `${body.token}${body.triggeredAt}`;
  const computed = crypto
    .createHmac("sha256", signatureToken)
    .update(plainText)
    .digest("hex");
  return timingSafeEqualHex(body.signature, computed);
}

function timingSafeEqualHex(a: string, b: string): boolean {
  // Avoid leaking timing info
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Fetch published job postings from Lever's public Postings API
 *
 * @param args - Configuration object
 * @param args.site - Lever site name (usually company name without spaces)
 * @param args.region - API region: "global" or "eu" (default: "global")
 * @param args.skip - Number of results to skip for pagination (default: 0)
 * @param args.limit - Maximum results to return (default: 100)
 * @param args.filters - Optional filters (location, commitment, team, department, level, group)
 * @returns Promise resolving to array of job postings
 *
 * @example
 * ```ts
 * // Get all postings
 * const jobs = await getLeverPostings({
 *   site: "yourcompany",
 *   region: "eu"
 * });
 *
 * // Filter by location and team
 * const engineeringJobs = await getLeverPostings({
 *   site: "yourcompany",
 *   filters: {
 *     location: ["San Francisco", "Remote"],
 *     team: "Engineering"
 *   }
 * });
 *
 * // Group by team
 * const groupedJobs = await getLeverPostings({
 *   site: "yourcompany",
 *   filters: { group: "team" }
 * });
 * ```
 */
export async function getLeverPostings(args: {
  site: string;
  region?: "global" | "eu";
  skip?: number;
  limit?: number;
  filters?: LeverPostingsFilters;
}): Promise<LeverPosting[]> {
  const { site, region = "global", skip = 0, limit = 100, filters = {} } = args;

  // Postings API base URLs and pagination (skip/limit)
  const base =
    region === "eu"
      ? "https://api.eu.lever.co/v0/postings"
      : "https://api.lever.co/v0/postings";

  // Build query parameters
  const queryParams: Record<string, unknown> = {
    mode: "json",
    skip,
    limit,
  };

  // Add filters - Lever expects multiple values as separate params with the same key
  if (filters.location) {
    queryParams.location = filters.location;
  }
  if (filters.commitment) {
    queryParams.commitment = filters.commitment;
  }
  if (filters.team) {
    queryParams.team = filters.team;
  }
  if (filters.department) {
    queryParams.department = filters.department;
  }
  if (filters.level) {
    queryParams.level = filters.level;
  }
  if (filters.group) {
    queryParams.group = filters.group;
  }

  const url = `${base}/${encodeURIComponent(site)}${toQueryString(queryParams)}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Lever Postings API failed (${res.status} ${res.statusText}) ${url}\n${text}`,
    );
  }

  const data = await res.json();
  console.log(data);
  return data as LeverPosting[];
}

/**
 * Fetch all published job postings with automatic pagination
 *
 * @param args - Configuration object
 * @param args.site - Lever site name (usually company name without spaces)
 * @param args.region - API region: "global" or "eu" (default: "global")
 * @param args.filters - Optional filters (location, commitment, team, department, level, group)
 * @param args.pageSize - Results per page (default: 100)
 * @returns Promise resolving to array of all job postings
 *
 * @example
 * ```ts
 * const allJobs = await getAllLeverPostings({
 *   site: "yourcompany",
 *   filters: { team: "Engineering" }
 * });
 * ```
 */
export async function getAllLeverPostings(args: {
  site: string;
  region?: "global" | "eu";
  filters?: LeverPostingsFilters;
  pageSize?: number;
}): Promise<LeverPosting[]> {
  const { site, region = "global", filters = {}, pageSize = 100 } = args;

  const allPostings: LeverPosting[] = [];
  let skip = 0;

  while (true) {
    const page = await getLeverPostings({
      site,
      region,
      skip,
      limit: pageSize,
      filters,
    });

    allPostings.push(...page);

    // If we got fewer results than the page size, we've reached the end
    if (page.length < pageSize) break;

    skip += pageSize;
  }

  return allPostings;
}

/**
 * Get a specific job posting by ID
 *
 * @param args - Configuration object
 * @param args.site - Lever site name
 * @param args.postingId - Unique posting ID
 * @param args.region - API region: "global" or "eu" (default: "global")
 * @returns Promise resolving to the job posting
 *
 * @example
 * ```ts
 * const job = await getLeverPosting({
 *   site: "leverdemo",
 *   postingId: "5ac21346-8e0c-4494-8e7a-3eb92ff77902"
 * });
 * ```
 */
export async function getLeverPosting(args: {
  site: string;
  postingId: string;
  region?: "global" | "eu";
}): Promise<LeverPosting> {
  const { site, postingId, region = "global" } = args;

  const base =
    region === "eu"
      ? "https://api.eu.lever.co/v0/postings"
      : "https://api.lever.co/v0/postings";

  const url = `${base}/${encodeURIComponent(site)}/${encodeURIComponent(postingId)}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Lever Postings API failed (${res.status} ${res.statusText}) ${url}\n${text}`,
    );
  }
  const data = await res.json();

  console.log(data);

  return data as LeverPosting;
}

/**
 * Apply to a Lever job posting
 *
 * **WARNING:** Application requests are rate limited to 2 requests per second.
 * You MUST handle 429 responses and implement retry logic with queuing.
 * Consider directing candidates to Lever's hosted form instead.
 *
 * @param args - Configuration object
 * @param args.site - Lever site name
 * @param args.postingId - Unique posting ID
 * @param args.apiKey - API key from Lever integrations settings (requires Super Admin)
 * @param args.application - Application data (name and email are required)
 * @param args.resume - Optional resume file (requires multipart/form-data)
 * @param args.region - API region: "global" or "eu" (default: "global")
 * @returns Promise resolving to application response with applicationId
 *
 * @example
 * ```ts
 * const result = await applyToLeverPosting({
 *   site: "yourcompany",
 *   postingId: "abc-123",
 *   apiKey: process.env.LEVER_API_KEY!,
 *   application: {
 *     name: "Jane Doe",
 *     email: "jane@example.com",
 *     phone: "+1-555-0100",
 *     urls: { "GitHub": "https://github.com/janedoe" },
 *     comments: "Excited to apply!"
 *   }
 * });
 * console.log("Application ID:", result.applicationId);
 * ```
 */
export async function applyToLeverPosting(args: {
  site: string;
  postingId: string;
  apiKey: string;
  application: LeverApplicationData;
  resume?: File | Blob;
  region?: "global" | "eu";
}): Promise<{ ok: boolean; applicationId?: string; error?: string }> {
  const {
    site,
    postingId,
    apiKey,
    application,
    resume,
    region = "global",
  } = args;

  const base =
    region === "eu"
      ? "https://api.eu.lever.co/v0/postings"
      : "https://api.lever.co/v0/postings";

  const url = `${base}/${encodeURIComponent(site)}/${encodeURIComponent(postingId)}?key=${encodeURIComponent(apiKey)}`;

  let body: FormData | string;
  let headers: Record<string, string>;

  if (resume) {
    // Use multipart/form-data for resume uploads
    const formData = new FormData();
    formData.append("name", application.name);
    formData.append("email", application.email);
    if (application.phone) formData.append("phone", application.phone);
    if (application.org) formData.append("org", application.org);
    if (application.comments) formData.append("comments", application.comments);
    if (application.silent !== undefined)
      formData.append("silent", String(application.silent));
    if (application.source) formData.append("source", application.source);
    if (application.ip) formData.append("ip", application.ip);
    if (application.opportunityLocation)
      formData.append("opportunityLocation", application.opportunityLocation);

    // Handle URLs
    if (application.urls) {
      for (const [key, value] of Object.entries(application.urls)) {
        formData.append(`urls[${key}]`, value);
      }
    }

    // Handle consent
    if (application.consent?.marketing !== undefined) {
      if (typeof application.consent.marketing === "boolean") {
        formData.append(
          "consent[marketing]",
          String(application.consent.marketing),
        );
      } else {
        formData.append(
          "consent[marketing][provided]",
          String(application.consent.marketing.provided),
        );
        if (application.consent.marketing.compliancePolicyId) {
          formData.append(
            "consent[marketing][compliancePolicyId]",
            application.consent.marketing.compliancePolicyId,
          );
        }
      }
    }

    if (application.consent?.store !== undefined) {
      if (typeof application.consent.store === "boolean") {
        formData.append("consent[store]", String(application.consent.store));
      } else {
        formData.append(
          "consent[store][provided]",
          String(application.consent.store.provided),
        );
        if (application.consent.store.compliancePolicyId) {
          formData.append(
            "consent[store][compliancePolicyId]",
            application.consent.store.compliancePolicyId,
          );
        }
      }
    }

    formData.append("resume", resume);
    body = formData;
    headers = {}; // Let fetch set Content-Type with boundary
  } else {
    // Use JSON for applications without resume
    const jsonData: Record<string, unknown> = {
      name: application.name,
      email: application.email,
    };

    if (application.phone) jsonData.phone = application.phone;
    if (application.org) jsonData.org = application.org;
    if (application.comments) jsonData.comments = application.comments;
    if (application.silent !== undefined) jsonData.silent = application.silent;
    if (application.source) jsonData.source = application.source;
    if (application.ip) jsonData.ip = application.ip;
    if (application.opportunityLocation)
      jsonData.opportunityLocation = application.opportunityLocation;
    if (application.urls) jsonData.urls = application.urls;
    if (application.consent) jsonData.consent = application.consent;

    body = JSON.stringify(jsonData);
    headers = { "Content-Type": "application/json" };
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body,
  });

  const responseData = await res.json();

  if (!res.ok) {
    // Handle rate limiting (429) specially
    if (res.status === 429) {
      throw new Error(
        `Lever application rate limit exceeded (429). You must implement retry logic and queuing. Consider using Lever's hosted form instead.`,
      );
    }
    return {
      ok: false,
      error: responseData.error || `Request failed with status ${res.status}`,
    };
  }

  return responseData as { ok: boolean; applicationId?: string };
}

/**
 * Save Lever job data to the database
 *
 * @param jobId - Internal database job ID
 * @param leverData - Raw Lever API response
 * @returns Promise resolving to the updated job record
 */
/**
 * Save Lever job data to the database
 *
 * @param jobId - Internal database job ID
 * @param leverData - Raw Lever API response
 * @returns Promise resolving to the updated job record
 */
export async function saveLeverJobData(jobId: number, leverData: LeverPosting) {
  try {
    // Update the jobs table with Lever data - save all fields individually
    const updateData = {
      // Core fields
      absolute_url: leverData.hostedUrl || leverData.applyUrl,
      company_name: leverData.text,
      description: leverData.description || leverData.descriptionPlain,
      location: leverData.categories?.location,

      // Lever-specific fields
      categories: JSON.stringify(leverData.categories || null),
      workplace_type: leverData.workplaceType || null,
      country: leverData.country || null,
      opening: leverData.opening || null,
      opening_plain: leverData.openingPlain || null,
      description_body: leverData.descriptionBody || null,
      description_body_plain: leverData.descriptionBodyPlain || null,
      additional: leverData.additional || null,
      additional_plain: leverData.additionalPlain || null,
      lists: JSON.stringify(leverData.lists || []),
      ats_created_at: leverData.createdAt
        ? typeof leverData.createdAt === "number"
          ? new Date(leverData.createdAt).toISOString()
          : leverData.createdAt
        : null,

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
    console.error("Error saving Lever job data:", error);
    throw error;
  }
}

/**
 * Example usage:
 *
 * // ========== v1 ATS API (requires authentication) ==========
 *
 * // List all candidates
 * const candidates = await leverListAll<any>({
 *   auth: { accessToken: process.env.LEVER_TOKEN! },
 *   endpoint: "/candidates"
 * });
 *
 * // List opportunities with expanded followers
 * const opps = await leverListAll<any>({
 *   auth: { apiKey: process.env.LEVER_API_KEY! },
 *   endpoint: "/opportunities",
 *   params: { expand: ["followers"] }
 * });
 *
 * // ========== v0 Postings API (public, no auth needed) ==========
 *
 * // Get all published job postings
 * const allJobs = await getAllLeverPostings({
 *   site: "yourcompany"
 * });
 *
 * // Get postings with filters
 * const engineeringJobs = await getLeverPostings({
 *   site: "yourcompany",
 *   filters: {
 *     team: ["Engineering", "Product"],
 *     location: "San Francisco",
 *     commitment: "Full-time"
 *   }
 * });
 *
 * // Get a specific posting by ID
 * const job = await getLeverPosting({
 *   site: "leverdemo",
 *   postingId: "5ac21346-8e0c-4494-8e7a-3eb92ff77902"
 * });
 *
 * // Apply to a posting (requires API key)
 * const application = await applyToLeverPosting({
 *   site: "yourcompany",
 *   postingId: "abc-123",
 *   apiKey: process.env.LEVER_API_KEY!,
 *   application: {
 *     name: "Jane Doe",
 *     email: "jane@example.com",
 *     phone: "+1-555-0100",
 *     urls: { "GitHub": "https://github.com/janedoe" },
 *     comments: "Excited to apply!",
 *     consent: {
 *       marketing: true,
 *       store: true
 *     }
 *   }
 * });
 *
 * // ========== Webhook validation ==========
 *
 * // Validate webhook signature
 * const isValid = validateLeverWebhook({
 *   body: req.body,
 *   signatureToken: process.env.LEVER_WEBHOOK_SECRET!
 * });
 * if (!isValid) {
 *   return res.status(401).send("Invalid signature");
 * }
 */
