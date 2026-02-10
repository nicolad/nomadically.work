/**
 * Company Enhancement & Extraction Types
 */

/**
 * Evidence metadata for tracking data provenance
 */
export type Evidence = {
  source_type: "url" | "html" | "unknown";
  source_url?: string | null;
  crawl_id?: string | null;
  capture_timestamp?: string | null; // ISO
  observed_at?: string | null; // ISO
  method?: string | null;
  extractor_version?: string | null;
  http_status?: number | null;
  mime?: string | null;
  content_hash?: string | null;
  warc?: {
    filename?: string | null;
    offset?: number | null;
    length?: number | null;
    digest?: string | null;
  } | null;
};

/**
 * ATS (Applicant Tracking System) board information
 */
export type ATSBoard = {
  id?: string | null;
  company_id?: string | null;
  url: string;
  vendor?: string | null;
  board_type?: string | null;
  confidence?: number | null;
  is_active?: boolean | null;
  first_seen_at?: string | null; // ISO
  last_seen_at?: string | null; // ISO
  evidence?: Evidence | null;
  created_at?: string | null; // ISO
  updated_at?: string | null; // ISO
};

/**
 * Company data structure for extraction and storage
 */
export type Company = {
  id?: string | null;
  key?: string | null;
  name: string;
  logo_url?: string | null;
  website?: string | null;
  careers_url?: string | null;
  linkedin_url?: string | null;
  description?: string | null;
  industry?: string | null;
  size?: string | null;
  location?: string | null;
  created_at?: string | null; // ISO
  updated_at?: string | null; // ISO

  canonical_domain?: string | null;
  category?: string | null;
  tags?: string[] | null;
  services?: string[] | null;
  service_taxonomy?: string[] | null;
  industries?: string[] | null;
  score?: number | null;
  score_reasons?: string[] | null;

  last_seen_crawl_id?: string | null;
  last_seen_capture_timestamp?: string | null; // ISO
  last_seen_source_url?: string | null;

  // Mirrors nested subset in your CompanyFields fragment
  ats_boards?: Omit<ATSBoard, "evidence">[] | null;
};

/**
 * Complete extraction result from DeepSeek AI
 */
export type ExtractionResult = {
  company: Company;
  ats_boards: ATSBoard[];
  evidence: Evidence;
  notes?: string[] | null;
};
