/**
 * NeverBounce Email Verification Client
 * Ported from ../crm/lib/neverbounce.ts
 */

// ============================================================================
// Types
// ============================================================================

interface NeverBounceResponse {
  status: string; // "success" | "auth_failure" | etc.
  result: string; // "valid" | "invalid" | "catchall" | "unknown" | "disposable"
  flags: string[]; // ["has_dns", "smtp_connectable", etc.]
  suggested_correction?: string;
  retry_token?: string;
  execution_time: number; // ms
}

export interface VerificationOutcome {
  verified: boolean;
  rawResult: string;
  flags: string[];
  suggestedCorrection?: string;
  retryToken?: string;
  executionTimeMs: number;
  timestamp: Date;
}

export interface EmailFindResult {
  contactId: number;
  email: string;
  verified: boolean;
  patternUsed?: string;
}

export interface EmailFindingSummary {
  companyId: number;
  domain: string;
  totalContacts: number;
  contactsProcessed: number;
  emailsFound: number;
  patternInferred?: string;
  results: EmailFindResult[];
  errors: string[];
  apiCallsMade: number;
}

// ============================================================================
// Email Pattern Types
// ============================================================================

export enum EmailPatternType {
  FirstInitialLast = "FirstInitialLast", // jdoe@
  FirstDotLast = "FirstDotLast", // john.doe@
  FirstUnderscoreLast = "FirstUnderscoreLast", // john_doe@
  FirstLast = "FirstLast", // johndoe@
  First = "First", // john@
  LastFirstInitial = "LastFirstInitial", // doej@
  FirstLastInitial = "FirstLastInitial", // johnd@
}

export interface EmailPattern {
  patternType: EmailPatternType;
  domain: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Clean a string for email generation - lowercase alphanumeric only
 */
export function cleanForEmail(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function cleanPrimaryFirst(firstName: string): string {
  const primary = firstName.split(/[-\s]/)[0] || firstName;
  return cleanForEmail(primary);
}

function cleanPrimaryLast(lastName: string): string {
  const primary = lastName.split(/[-\s]/)[0] || lastName;
  return cleanForEmail(primary);
}

/**
 * Extract domain from website URL
 */
export function extractDomainFromWebsite(website: string): string {
  try {
    const url = new URL(
      website.startsWith("http") ? website : `https://${website}`
    );
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return website
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .toLowerCase();
  }
}

/**
 * Generate email candidates for a contact
 * Limited to 2 most common patterns to reduce API calls
 */
export function generateEmailCandidates(
  firstName: string,
  lastName: string,
  domain: string
): string[] {
  const f = cleanForEmail(firstName);
  const l = cleanForEmail(lastName);
  const candidates: string[] = [];

  if (f && l) {
    candidates.push(`${f}.${l}@${domain}`); // john.doe@
    candidates.push(`${f}@${domain}`); // john@
  } else if (l) {
    candidates.push(`${l}@${domain}`);
  } else if (f) {
    candidates.push(`${f}@${domain}`);
  }

  return [...new Set(candidates)].slice(0, 2);
}

/**
 * Generate email from a known pattern
 */
export function generateEmailFromPattern(
  pattern: EmailPattern,
  firstName: string,
  lastName: string
): string {
  const firstPrimary = cleanPrimaryFirst(firstName);
  const lastPrimary = cleanPrimaryLast(lastName);
  const fi = firstPrimary.charAt(0);
  const li = lastPrimary.charAt(0);

  let local: string;

  switch (pattern.patternType) {
    case EmailPatternType.FirstInitialLast:
      local = `${fi}${lastPrimary}`;
      break;
    case EmailPatternType.FirstDotLast:
      local = `${firstPrimary}.${lastPrimary}`;
      break;
    case EmailPatternType.FirstUnderscoreLast:
      local = `${firstPrimary}_${lastPrimary}`;
      break;
    case EmailPatternType.FirstLast:
      local = `${firstPrimary}${lastPrimary}`;
      break;
    case EmailPatternType.First:
      local = firstPrimary;
      break;
    case EmailPatternType.LastFirstInitial:
      local = `${lastPrimary}${fi}`;
      break;
    case EmailPatternType.FirstLastInitial:
      local = `${firstPrimary}${li}`;
      break;
    default:
      local = `${firstPrimary}.${lastPrimary}`;
  }

  return `${local}@${pattern.domain}`;
}

/**
 * Infer email pattern from a verified email and contact name
 */
export function inferEmailPattern(
  firstName: string,
  lastName: string,
  email: string
): EmailPattern | null {
  const f = cleanPrimaryFirst(firstName);
  const l = cleanPrimaryLast(lastName);
  const fi = f.charAt(0);
  const li = l.charAt(0);

  const atIndex = email.indexOf("@");
  if (atIndex === -1) return null;

  const local = email.substring(0, atIndex).toLowerCase();
  const domain = email.substring(atIndex + 1).toLowerCase();

  if (local === `${fi}${l}`) return { patternType: EmailPatternType.FirstInitialLast, domain };
  if (local === `${f}.${l}`) return { patternType: EmailPatternType.FirstDotLast, domain };
  if (local === `${f}_${l}`) return { patternType: EmailPatternType.FirstUnderscoreLast, domain };
  if (local === `${f}${l}`) return { patternType: EmailPatternType.FirstLast, domain };
  if (local === f) return { patternType: EmailPatternType.First, domain };
  if (local === `${l}${fi}`) return { patternType: EmailPatternType.LastFirstInitial, domain };
  if (local === `${f}${li}`) return { patternType: EmailPatternType.FirstLastInitial, domain };

  return null;
}

// ============================================================================
// NeverBounce Client
// ============================================================================

const verificationCache = new Map<string, VerificationOutcome>();
const domainPatternCache = new Map<string, EmailPattern>();

export class NeverBounceClient {
  private apiKey: string;
  private baseUrl = "https://api.neverbounce.com/v4/single/check";
  private requestCount = 0;
  private lastRequestTime = 0;
  private minDelayMs = 150;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  getStats() {
    return {
      requestCount: this.requestCount,
      cacheSize: verificationCache.size,
      domainPatternCacheSize: domainPatternCache.size,
    };
  }

  static clearCaches() {
    verificationCache.clear();
    domainPatternCache.clear();
  }

  static getDomainPattern(domain: string): EmailPattern | undefined {
    return domainPatternCache.get(domain.toLowerCase());
  }

  static setDomainPattern(pattern: EmailPattern) {
    domainPatternCache.set(pattern.domain.toLowerCase(), pattern);
  }

  private isValidEmailFormat(email: string): boolean {
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  private async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minDelayMs) {
      const delay = this.minDelayMs - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    this.lastRequestTime = Date.now();
  }

  async verifyEmail(email: string, useCache = true): Promise<VerificationOutcome> {
    const normalizedEmail = email.toLowerCase().trim();

    if (useCache && verificationCache.has(normalizedEmail)) {
      return verificationCache.get(normalizedEmail)!;
    }

    if (!this.isValidEmailFormat(normalizedEmail)) {
      const outcome: VerificationOutcome = {
        verified: false,
        rawResult: "invalid_format",
        flags: [],
        executionTimeMs: 0,
        timestamp: new Date(),
      };
      verificationCache.set(normalizedEmail, outcome);
      return outcome;
    }

    await this.rateLimit();

    const url = new URL(this.baseUrl);
    url.searchParams.set("key", this.apiKey);
    url.searchParams.set("email", normalizedEmail);

    this.requestCount++;

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`NeverBounce HTTP error: ${response.status}`);
    }

    const data: NeverBounceResponse = await response.json();

    if (data.status !== "success") {
      if (data.status === "general_failure" || data.status === "temp_unavail") {
        return {
          verified: false,
          rawResult: `error_${data.status}`,
          flags: [],
          executionTimeMs: data.execution_time || 0,
          timestamp: new Date(),
        };
      }
      throw new Error(`NeverBounce error: ${data.status}`);
    }

    const verified = ["valid", "catchall", "unknown"].includes(data.result);

    const outcome: VerificationOutcome = {
      verified,
      rawResult: data.result,
      flags: data.flags || [],
      suggestedCorrection: data.suggested_correction || undefined,
      retryToken: data.retry_token || undefined,
      executionTimeMs: data.execution_time,
      timestamp: new Date(),
    };

    verificationCache.set(normalizedEmail, outcome);
    return outcome;
  }

  async findVerifiedEmail(
    candidates: string[]
  ): Promise<{ email: string; outcome: VerificationOutcome } | null> {
    const priorityOrder = (email: string): number => {
      const local = email.split("@")[0];
      if (local.includes(".")) return 0;
      if (local.match(/^[a-z][a-z]+$/)) return 1;
      if (local.includes("_")) return 2;
      return 3;
    };

    const sortedCandidates = [...candidates].sort(
      (a, b) => priorityOrder(a) - priorityOrder(b)
    );

    let lastError: unknown;
    for (const email of sortedCandidates) {
      try {
        const outcome = await this.verifyEmail(email);
        if (outcome.verified) {
          return { email, outcome };
        }
      } catch (error) {
        console.error(`[NeverBounce] Error verifying ${email}:`, error);
        lastError = error;
      }
    }
    if (lastError) {
      throw lastError;
    }
    return null;
  }

  static verifyWithPattern(
    firstName: string,
    lastName: string,
    pattern: EmailPattern
  ): { email: string; outcome: VerificationOutcome } {
    const email = generateEmailFromPattern(pattern, firstName, lastName);
    const outcome: VerificationOutcome = {
      verified: true,
      rawResult: "pattern_verified",
      flags: ["pattern_match"],
      executionTimeMs: 0,
      timestamp: new Date(),
    };
    verificationCache.set(email.toLowerCase(), outcome);
    return { email, outcome };
  }
}
