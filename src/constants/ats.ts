/**
 * Ashby ATS domain
 */
export const ASHBY_DOMAIN = "ashbyhq.com";

/**
 * Ashby jobs board domain
 */
export const ASHBY_JOBS_DOMAIN = `jobs.${ASHBY_DOMAIN}`;

/**
 * Ashby API domain
 */
export const ASHBY_API_DOMAIN = `api.${ASHBY_DOMAIN}`;

/**
 * Ashby developers domain
 */
export const ASHBY_DEVELOPERS_DOMAIN = `developers.${ASHBY_DOMAIN}`;

/**
 * Greenhouse ATS domain
 */
export const GREENHOUSE_DOMAIN = "greenhouse.io";

/**
 * Greenhouse job boards domain
 */
export const GREENHOUSE_BOARDS_DOMAIN = `boards.${GREENHOUSE_DOMAIN}`;

/**
 * Greenhouse API domain
 */
export const GREENHOUSE_API_DOMAIN = `boards-api.${GREENHOUSE_DOMAIN}`;

/**
 * Lever ATS domain
 */
export const LEVER_DOMAIN = "lever.co";

/**
 * Lever jobs domain
 */
export const LEVER_JOBS_DOMAIN = `jobs.${LEVER_DOMAIN}`;

/**
 * Workable ATS domain
 */
export const WORKABLE_DOMAIN = "workable.com";

/**
 * Workable apply domain
 */
export const WORKABLE_APPLY_DOMAIN = `apply.${WORKABLE_DOMAIN}`;

/**
 * Breezy HR domain
 */
export const BREEZY_DOMAIN = "breezy.hr";

/**
 * Applicant Tracking System (ATS) sites to search
 */
export const ATS_SITES = [
  `site:${GREENHOUSE_BOARDS_DOMAIN}`,
  `site:${LEVER_JOBS_DOMAIN}`,
  `site:${ASHBY_JOBS_DOMAIN}`,
  `site:${WORKABLE_APPLY_DOMAIN}`,
  `site:${BREEZY_DOMAIN}`,
];
