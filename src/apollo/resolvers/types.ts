/**
 * GraphQL Resolver Types
 */

/**
 * Arguments for enhanceCompany mutation
 */
export interface EnhanceCompanyArgs {
  id?: number;
  key?: string;
}

/**
 * Response type for enhanceCompany mutation
 */
export interface EnhanceCompanyResponse {
  success: boolean;
  message: string;
  companyId: number;
  companyKey: string;
}

/**
 * Mapping of ATS vendor names to database enum values
 */
export type VendorMap = Record<string, string>;

/**
 * Mapping of board types to database enum values
 */
export type BoardTypeMap = Record<string, string>;

/**
 * Data structure for company updates
 */
export interface CompanyUpdateData {
  updated_at: string;
  description?: string;
  logo_url?: string;
  industry?: string;
  size?: string;
  location?: string;
  canonical_domain?: string;
  category?: string;
  tags?: string;
  services?: string;
  service_taxonomy?: string;
  industries?: string;
  last_seen_source_url?: string;
  last_seen_capture_timestamp?: string;
}
