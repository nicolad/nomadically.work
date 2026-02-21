import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { GraphQLContext } from '../apollo/context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: string; output: string; }
  EmailAddress: { input: string; output: string; }
  JSON: { input: any; output: any; }
  URL: { input: string; output: string; }
  Upload: { input: File; output: File; }
};

export type AtsBoard = {
  __typename?: 'ATSBoard';
  board_type: AtsBoardType;
  company_id: Scalars['Int']['output'];
  confidence: Scalars['Float']['output'];
  created_at: Scalars['String']['output'];
  evidence: Evidence;
  first_seen_at: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  is_active: Scalars['Boolean']['output'];
  last_seen_at: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  url: Scalars['String']['output'];
  vendor: AtsVendor;
};

export type AtsBoardType =
  | 'BOARD_API'
  | 'BOARD_WIDGET'
  | 'JOBS_PAGE'
  | 'UNKNOWN';

export type AtsBoardUpsertInput = {
  board_type: AtsBoardType;
  confidence: Scalars['Float']['input'];
  evidence: EvidenceInput;
  is_active: Scalars['Boolean']['input'];
  last_seen_at: Scalars['String']['input'];
  url: Scalars['String']['input'];
  vendor: AtsVendor;
};

export type AtsVendor =
  | 'ASHBY'
  | 'BREEZYHR'
  | 'GREENHOUSE'
  | 'ICIMS'
  | 'JAZZHR'
  | 'JOBVITE'
  | 'LEVER'
  | 'ORACLE_TALEO'
  | 'OTHER'
  | 'SAP_SUCCESSFACTORS'
  | 'SMARTRECRUITERS'
  | 'TEAMTAILOR'
  | 'WORKABLE';

export type Application = {
  __typename?: 'Application';
  companyName: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  email: Scalars['EmailAddress']['output'];
  id: Scalars['Int']['output'];
  jobId: Scalars['String']['output'];
  jobTitle: Maybe<Scalars['String']['output']>;
  notes: Maybe<Scalars['String']['output']>;
  questions: Array<QuestionAnswer>;
  resume: Maybe<Scalars['Upload']['output']>;
  status: ApplicationStatus;
};

export type ApplicationInput = {
  companyName?: InputMaybe<Scalars['String']['input']>;
  jobId: Scalars['String']['input'];
  jobTitle?: InputMaybe<Scalars['String']['input']>;
  questions: Array<QuestionAnswerInput>;
  resume?: InputMaybe<Scalars['Upload']['input']>;
};

/**
 * Pipeline status for a tracked job application.
 * Maps to a kanban column in the UI.
 */
export type ApplicationStatus =
  | 'accepted'
  | 'pending'
  | 'rejected'
  | 'reviewed'
  | 'submitted';

export type AshbyAddress = {
  __typename?: 'AshbyAddress';
  postalAddress: Maybe<AshbyPostalAddress>;
};

export type AshbyCompensation = {
  __typename?: 'AshbyCompensation';
  compensationTierSummary: Maybe<Scalars['String']['output']>;
  compensationTiers: Array<AshbyCompensationTier>;
  scrapeableCompensationSalarySummary: Maybe<Scalars['String']['output']>;
  summaryComponents: Array<AshbyCompensationComponent>;
};

export type AshbyCompensationComponent = {
  __typename?: 'AshbyCompensationComponent';
  compensationType: Scalars['String']['output'];
  currencyCode: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  interval: Scalars['String']['output'];
  maxValue: Maybe<Scalars['Float']['output']>;
  minValue: Maybe<Scalars['Float']['output']>;
  summary: Scalars['String']['output'];
};

export type AshbyCompensationTier = {
  __typename?: 'AshbyCompensationTier';
  additionalInformation: Maybe<Scalars['String']['output']>;
  components: Array<AshbyCompensationComponent>;
  id: Scalars['String']['output'];
  tierSummary: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type AshbyEnrichment = {
  __typename?: 'AshbyEnrichment';
  company_name: Maybe<Scalars['String']['output']>;
  enriched_at: Maybe<Scalars['String']['output']>;
  industry_tags: Array<Scalars['String']['output']>;
  size_signal: Maybe<Scalars['String']['output']>;
  tech_signals: Array<Scalars['String']['output']>;
};

export type AshbyPostalAddress = {
  __typename?: 'AshbyPostalAddress';
  addressCountry: Maybe<Scalars['String']['output']>;
  addressLocality: Maybe<Scalars['String']['output']>;
  addressRegion: Maybe<Scalars['String']['output']>;
};

export type AshbySecondaryLocation = {
  __typename?: 'AshbySecondaryLocation';
  address: Maybe<AshbyPostalAddress>;
  location: Scalars['String']['output'];
};

export type ChatMessage = {
  __typename?: 'ChatMessage';
  content: Scalars['String']['output'];
  role: Scalars['String']['output'];
};

export type ChatMessageInput = {
  content: Scalars['String']['input'];
  role: Scalars['String']['input'];
};

export type CompaniesResponse = {
  __typename?: 'CompaniesResponse';
  companies: Array<Company>;
  totalCount: Scalars['Int']['output'];
};

export type Company = {
  __typename?: 'Company';
  ashby_enrichment: Maybe<AshbyEnrichment>;
  ats_boards: Array<AtsBoard>;
  canonical_domain: Maybe<Scalars['String']['output']>;
  category: CompanyCategory;
  created_at: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  facts: Array<CompanyFact>;
  facts_count: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  industries: Array<Scalars['String']['output']>;
  industry: Maybe<Scalars['String']['output']>;
  key: Scalars['String']['output'];
  last_seen_capture_timestamp: Maybe<Scalars['String']['output']>;
  last_seen_crawl_id: Maybe<Scalars['String']['output']>;
  last_seen_source_url: Maybe<Scalars['String']['output']>;
  location: Maybe<Scalars['String']['output']>;
  logo_url: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  score: Scalars['Float']['output'];
  score_reasons: Array<Scalars['String']['output']>;
  service_taxonomy: Array<Scalars['String']['output']>;
  services: Array<Scalars['String']['output']>;
  size: Maybe<Scalars['String']['output']>;
  snapshots: Array<CompanySnapshot>;
  snapshots_count: Scalars['Int']['output'];
  tags: Array<Scalars['String']['output']>;
  updated_at: Scalars['String']['output'];
  website: Maybe<Scalars['String']['output']>;
};


export type CompanyFactsArgs = {
  field?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type CompanySnapshotsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type CompanyCategory =
  | 'AGENCY'
  | 'CONSULTANCY'
  | 'DIRECTORY'
  | 'OTHER'
  | 'PRODUCT'
  | 'STAFFING'
  | 'UNKNOWN';

export type CompanyFact = {
  __typename?: 'CompanyFact';
  company_id: Scalars['Int']['output'];
  confidence: Scalars['Float']['output'];
  created_at: Scalars['String']['output'];
  evidence: Evidence;
  field: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  normalized_value: Maybe<Scalars['JSON']['output']>;
  value_json: Maybe<Scalars['JSON']['output']>;
  value_text: Maybe<Scalars['String']['output']>;
};

export type CompanyFactInput = {
  confidence: Scalars['Float']['input'];
  evidence: EvidenceInput;
  field: Scalars['String']['input'];
  normalized_value?: InputMaybe<Scalars['JSON']['input']>;
  value_json?: InputMaybe<Scalars['JSON']['input']>;
  value_text?: InputMaybe<Scalars['String']['input']>;
};

export type CompanyFilterInput = {
  canonical_domain_in?: InputMaybe<Array<Scalars['String']['input']>>;
  category_in?: InputMaybe<Array<CompanyCategory>>;
  has_ats_boards?: InputMaybe<Scalars['Boolean']['input']>;
  min_score?: InputMaybe<Scalars['Float']['input']>;
  service_taxonomy_any?: InputMaybe<Array<Scalars['String']['input']>>;
  text?: InputMaybe<Scalars['String']['input']>;
};

export type CompanyOrderBy =
  | 'CREATED_AT_DESC'
  | 'NAME_ASC'
  | 'SCORE_DESC'
  | 'UPDATED_AT_DESC';

export type CompanySnapshot = {
  __typename?: 'CompanySnapshot';
  capture_timestamp: Maybe<Scalars['String']['output']>;
  company_id: Scalars['Int']['output'];
  content_hash: Maybe<Scalars['String']['output']>;
  crawl_id: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  evidence: Evidence;
  extracted: Maybe<Scalars['JSON']['output']>;
  fetched_at: Scalars['String']['output'];
  http_status: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  jsonld: Maybe<Scalars['JSON']['output']>;
  mime: Maybe<Scalars['String']['output']>;
  source_url: Scalars['String']['output'];
  text_sample: Maybe<Scalars['String']['output']>;
};

export type CreateCompanyInput = {
  canonical_domain?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<CompanyCategory>;
  description?: InputMaybe<Scalars['String']['input']>;
  industries?: InputMaybe<Array<Scalars['String']['input']>>;
  industry?: InputMaybe<Scalars['String']['input']>;
  key: Scalars['String']['input'];
  location?: InputMaybe<Scalars['String']['input']>;
  logo_url?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  service_taxonomy?: InputMaybe<Array<Scalars['String']['input']>>;
  services?: InputMaybe<Array<Scalars['String']['input']>>;
  size?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type CreateLangSmithPromptInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  readme?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreatePromptInput = {
  chatMessages?: InputMaybe<Array<ChatMessageInput>>;
  config?: InputMaybe<PromptConfigInput>;
  labels?: InputMaybe<Array<Scalars['String']['input']>>;
  name: Scalars['String']['input'];
  prompt?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  type: PromptType;
};

export type CreateTrackInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  level?: InputMaybe<Scalars['String']['input']>;
  slug: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type DeleteCompanyResponse = {
  __typename?: 'DeleteCompanyResponse';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteJobResponse = {
  __typename?: 'DeleteJobResponse';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type EnhanceCompanyResponse = {
  __typename?: 'EnhanceCompanyResponse';
  companyId: Maybe<Scalars['Int']['output']>;
  companyKey: Maybe<Scalars['String']['output']>;
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

/** Response from enhancing a job with ATS data */
export type EnhanceJobResponse = {
  __typename?: 'EnhanceJobResponse';
  /**
   * Raw enhanced data from the ATS API (Greenhouse or Lever).
   *
   * Greenhouse data includes:
   * - content: Full HTML job description
   * - departments: Array of department objects with id, name, child_ids, parent_id
   * - offices: Array of office objects with id, name, location, child_ids, parent_id
   * - questions: Application form questions
   * - metadata: Custom fields
   * - compliance: Compliance questions
   * - demographic_questions: EEOC/diversity questions
   *
   * Lever data includes:
   * - description: Combined job description (HTML)
   * - descriptionPlain: Description as plaintext
   * - categories: location, commitment, team, department
   * - lists: Requirements, benefits, etc.
   * - workplaceType: on-site, remote, hybrid, or unspecified
   * - salaryRange: Currency, interval, min, max
   */
  enhancedData: Maybe<Scalars['JSON']['output']>;
  /** The updated job record with enhanced data from the ATS */
  job: Maybe<Job>;
  /** Human-readable message about the operation result */
  message: Maybe<Scalars['String']['output']>;
  /** Whether the enhancement was successful */
  success: Scalars['Boolean']['output'];
};

export type Evidence = {
  __typename?: 'Evidence';
  capture_timestamp: Maybe<Scalars['String']['output']>;
  content_hash: Maybe<Scalars['String']['output']>;
  crawl_id: Maybe<Scalars['String']['output']>;
  extractor_version: Maybe<Scalars['String']['output']>;
  http_status: Maybe<Scalars['Int']['output']>;
  method: ExtractMethod;
  mime: Maybe<Scalars['String']['output']>;
  observed_at: Scalars['String']['output'];
  source_type: SourceType;
  source_url: Scalars['String']['output'];
  warc: Maybe<WarcPointer>;
};

export type EvidenceInput = {
  capture_timestamp?: InputMaybe<Scalars['String']['input']>;
  content_hash?: InputMaybe<Scalars['String']['input']>;
  crawl_id?: InputMaybe<Scalars['String']['input']>;
  extractor_version?: InputMaybe<Scalars['String']['input']>;
  http_status?: InputMaybe<Scalars['Int']['input']>;
  method: ExtractMethod;
  mime?: InputMaybe<Scalars['String']['input']>;
  observed_at: Scalars['String']['input'];
  source_type: SourceType;
  source_url: Scalars['String']['input'];
  warc?: InputMaybe<WarcPointerInput>;
};

export type ExtractMethod =
  | 'DOM'
  | 'HEURISTIC'
  | 'JSONLD'
  | 'LLM'
  | 'META';

export type GreenhouseCompliance = {
  __typename?: 'GreenhouseCompliance';
  description: Maybe<Scalars['String']['output']>;
  questions: Maybe<Array<GreenhouseQuestion>>;
  type: Scalars['String']['output'];
};

export type GreenhouseDataCompliance = {
  __typename?: 'GreenhouseDataCompliance';
  demographic_data_consent_applies: Scalars['Boolean']['output'];
  requires_consent: Scalars['Boolean']['output'];
  requires_processing_consent: Scalars['Boolean']['output'];
  requires_retention_consent: Scalars['Boolean']['output'];
  retention_period: Maybe<Scalars['Int']['output']>;
  type: Scalars['String']['output'];
};

export type GreenhouseDemographicQuestions = {
  __typename?: 'GreenhouseDemographicQuestions';
  description: Maybe<Scalars['String']['output']>;
  header: Maybe<Scalars['String']['output']>;
  questions: Maybe<Array<GreenhouseQuestion>>;
};

export type GreenhouseDepartment = {
  __typename?: 'GreenhouseDepartment';
  child_ids: Array<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  parent_id: Maybe<Scalars['String']['output']>;
};

export type GreenhouseMetadata = {
  __typename?: 'GreenhouseMetadata';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  value: Scalars['String']['output'];
  value_type: Scalars['String']['output'];
};

export type GreenhouseOffice = {
  __typename?: 'GreenhouseOffice';
  child_ids: Array<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  location: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  parent_id: Maybe<Scalars['String']['output']>;
};

export type GreenhouseQuestion = {
  __typename?: 'GreenhouseQuestion';
  description: Maybe<Scalars['String']['output']>;
  fields: Array<GreenhouseQuestionField>;
  label: Scalars['String']['output'];
  required: Scalars['Boolean']['output'];
};

export type GreenhouseQuestionField = {
  __typename?: 'GreenhouseQuestionField';
  name: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
};

export type Job = {
  __typename?: 'Job';
  absolute_url: Maybe<Scalars['String']['output']>;
  additional: Maybe<Scalars['String']['output']>;
  additional_plain: Maybe<Scalars['String']['output']>;
  ashby_address: Maybe<AshbyAddress>;
  ashby_apply_url: Maybe<Scalars['String']['output']>;
  ashby_compensation: Maybe<AshbyCompensation>;
  ashby_department: Maybe<Scalars['String']['output']>;
  ashby_employment_type: Maybe<Scalars['String']['output']>;
  ashby_is_listed: Maybe<Scalars['Boolean']['output']>;
  ashby_is_remote: Maybe<Scalars['Boolean']['output']>;
  ashby_job_url: Maybe<Scalars['String']['output']>;
  ashby_published_at: Maybe<Scalars['String']['output']>;
  ashby_secondary_locations: Maybe<Array<AshbySecondaryLocation>>;
  ashby_team: Maybe<Scalars['String']['output']>;
  ats_created_at: Maybe<Scalars['String']['output']>;
  categories: Maybe<LeverCategories>;
  company: Maybe<Company>;
  company_id: Maybe<Scalars['Int']['output']>;
  company_key: Scalars['String']['output'];
  company_name: Maybe<Scalars['String']['output']>;
  compliance: Maybe<Array<GreenhouseCompliance>>;
  country: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  data_compliance: Maybe<Array<GreenhouseDataCompliance>>;
  demographic_questions: Maybe<GreenhouseDemographicQuestions>;
  departments: Maybe<Array<GreenhouseDepartment>>;
  description: Maybe<Scalars['String']['output']>;
  description_body: Maybe<Scalars['String']['output']>;
  description_body_plain: Maybe<Scalars['String']['output']>;
  external_id: Scalars['String']['output'];
  first_published: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  internal_job_id: Maybe<Scalars['String']['output']>;
  is_remote_eu: Maybe<Scalars['Boolean']['output']>;
  language: Maybe<Scalars['String']['output']>;
  lists: Maybe<Array<LeverList>>;
  location: Maybe<Scalars['String']['output']>;
  location_questions: Maybe<Array<GreenhouseQuestion>>;
  metadata: Maybe<Array<GreenhouseMetadata>>;
  offices: Maybe<Array<GreenhouseOffice>>;
  opening: Maybe<Scalars['String']['output']>;
  opening_plain: Maybe<Scalars['String']['output']>;
  posted_at: Scalars['String']['output'];
  questions: Maybe<Array<GreenhouseQuestion>>;
  remote_eu_confidence: Maybe<Scalars['String']['output']>;
  remote_eu_reason: Maybe<Scalars['String']['output']>;
  requisition_id: Maybe<Scalars['String']['output']>;
  score: Maybe<Scalars['Float']['output']>;
  score_reason: Maybe<Scalars['String']['output']>;
  skills: Maybe<Array<JobSkill>>;
  source_id: Maybe<Scalars['String']['output']>;
  source_kind: Scalars['String']['output'];
  status: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  url: Scalars['String']['output'];
  workplace_type: Maybe<Scalars['String']['output']>;
};

export type JobSkill = {
  __typename?: 'JobSkill';
  confidence: Maybe<Scalars['Float']['output']>;
  evidence: Maybe<Scalars['String']['output']>;
  level: Scalars['String']['output'];
  tag: Scalars['String']['output'];
};

export type JobsResponse = {
  __typename?: 'JobsResponse';
  jobs: Array<Job>;
  totalCount: Scalars['Int']['output'];
};

export type LangSmithPrompt = {
  __typename?: 'LangSmithPrompt';
  createdAt: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  fullName: Scalars['String']['output'];
  id: Scalars['String']['output'];
  isArchived: Scalars['Boolean']['output'];
  isPublic: Scalars['Boolean']['output'];
  lastCommitHash: Maybe<Scalars['String']['output']>;
  likedByAuthUser: Scalars['Boolean']['output'];
  numCommits: Scalars['Int']['output'];
  numDownloads: Scalars['Int']['output'];
  numLikes: Scalars['Int']['output'];
  numViews: Scalars['Int']['output'];
  owner: Maybe<Scalars['String']['output']>;
  promptHandle: Scalars['String']['output'];
  readme: Maybe<Scalars['String']['output']>;
  tags: Array<Scalars['String']['output']>;
  tenantId: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type LangSmithPromptCommit = {
  __typename?: 'LangSmithPromptCommit';
  commitHash: Scalars['String']['output'];
  examples: Array<Scalars['JSON']['output']>;
  manifest: Scalars['JSON']['output'];
  owner: Scalars['String']['output'];
  promptName: Scalars['String']['output'];
};

export type LeverCategories = {
  __typename?: 'LeverCategories';
  allLocations: Maybe<Array<Scalars['String']['output']>>;
  commitment: Maybe<Scalars['String']['output']>;
  department: Maybe<Scalars['String']['output']>;
  location: Maybe<Scalars['String']['output']>;
  team: Maybe<Scalars['String']['output']>;
};

export type LeverList = {
  __typename?: 'LeverList';
  content: Scalars['String']['output'];
  text: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  add_company_facts: Array<CompanyFact>;
  createApplication: Application;
  createCompany: Company;
  createLangSmithPrompt: LangSmithPrompt;
  createPrompt: Prompt;
  createTrack: Track;
  deleteAllJobs: DeleteJobResponse;
  deleteCompany: DeleteCompanyResponse;
  deleteJob: DeleteJobResponse;
  deleteLangSmithPrompt: Scalars['Boolean']['output'];
  enhanceCompany: EnhanceCompanyResponse;
  /**
   * Enhance a job posting by fetching detailed data from the ATS (Applicant Tracking System).
   *
   * Supported ATS sources:
   * - greenhouse: Greenhouse ATS (https://greenhouse.io)
   * - lever: Lever ATS (https://lever.co)
   *
   * For Greenhouse:
   * - jobId: The job posting ID from the URL (e.g., "5802159004" from https://job-boards.greenhouse.io/grafanalabs/jobs/5802159004)
   * - company: The board token (e.g., "grafanalabs")
   *
   * For Lever:
   * - jobId: The posting ID (e.g., "5ac21346-8e0c-4494-8e7a-3eb92ff77902")
   * - company: The site name (e.g., "leverdemo")
   *
   * The mutation will:
   * 1. Fetch comprehensive job data from the ATS API
   * 2. Save enhanced fields (description, departments, offices, questions, etc.)
   * 3. Return the updated job with full ATS data
   */
  enhanceJobFromATS: EnhanceJobResponse;
  generateResearch: Array<ResearchItem>;
  ingestResumeParse: Maybe<ResumeIngestResult>;
  ingest_company_snapshot: CompanySnapshot;
  /**
   * Trigger classification/enhancement of all unprocessed jobs via the Cloudflare Worker.
   * Calls the classify-jobs CF worker (POST) which runs DeepSeek-based classification
   * for remote-EU eligibility on every unclassified job.
   */
  processAllJobs: ProcessAllJobsResponse;
  pushLangSmithPrompt: Scalars['String']['output'];
  updateApplication: Application;
  updateCompany: Company;
  updateLangSmithPrompt: LangSmithPrompt;
  updatePromptLabel: Prompt;
  updateUserSettings: UserSettings;
  uploadResume: Maybe<ResumeUploadResult>;
  upsert_company_ats_boards: Array<AtsBoard>;
};


export type MutationAdd_Company_FactsArgs = {
  company_id: Scalars['Int']['input'];
  facts: Array<CompanyFactInput>;
};


export type MutationCreateApplicationArgs = {
  input: ApplicationInput;
};


export type MutationCreateCompanyArgs = {
  input: CreateCompanyInput;
};


export type MutationCreateLangSmithPromptArgs = {
  input?: InputMaybe<CreateLangSmithPromptInput>;
  promptIdentifier: Scalars['String']['input'];
};


export type MutationCreatePromptArgs = {
  input: CreatePromptInput;
};


export type MutationCreateTrackArgs = {
  input: CreateTrackInput;
};


export type MutationDeleteCompanyArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteJobArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteLangSmithPromptArgs = {
  promptIdentifier: Scalars['String']['input'];
};


export type MutationEnhanceCompanyArgs = {
  id?: InputMaybe<Scalars['Int']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
};


export type MutationEnhanceJobFromAtsArgs = {
  company: Scalars['String']['input'];
  jobId: Scalars['String']['input'];
  source: Scalars['String']['input'];
};


export type MutationGenerateResearchArgs = {
  goalDescription: Scalars['String']['input'];
};


export type MutationIngestResumeParseArgs = {
  email: Scalars['String']['input'];
  filename: Scalars['String']['input'];
  job_id: Scalars['String']['input'];
};


export type MutationIngest_Company_SnapshotArgs = {
  capture_timestamp?: InputMaybe<Scalars['String']['input']>;
  company_id: Scalars['Int']['input'];
  content_hash?: InputMaybe<Scalars['String']['input']>;
  crawl_id?: InputMaybe<Scalars['String']['input']>;
  evidence: EvidenceInput;
  extracted?: InputMaybe<Scalars['JSON']['input']>;
  fetched_at: Scalars['String']['input'];
  http_status?: InputMaybe<Scalars['Int']['input']>;
  jsonld?: InputMaybe<Scalars['JSON']['input']>;
  mime?: InputMaybe<Scalars['String']['input']>;
  source_url: Scalars['String']['input'];
  text_sample?: InputMaybe<Scalars['String']['input']>;
};


export type MutationProcessAllJobsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationPushLangSmithPromptArgs = {
  input?: InputMaybe<PushLangSmithPromptInput>;
  promptIdentifier: Scalars['String']['input'];
};


export type MutationUpdateApplicationArgs = {
  id: Scalars['Int']['input'];
  input: UpdateApplicationInput;
};


export type MutationUpdateCompanyArgs = {
  id: Scalars['Int']['input'];
  input: UpdateCompanyInput;
};


export type MutationUpdateLangSmithPromptArgs = {
  input: UpdateLangSmithPromptInput;
  promptIdentifier: Scalars['String']['input'];
};


export type MutationUpdatePromptLabelArgs = {
  label: Scalars['String']['input'];
  name: Scalars['String']['input'];
  version: Scalars['Int']['input'];
};


export type MutationUpdateUserSettingsArgs = {
  settings: UserSettingsInput;
  userId: Scalars['String']['input'];
};


export type MutationUploadResumeArgs = {
  email: Scalars['String']['input'];
  filename: Scalars['String']['input'];
  resumePdf: Scalars['String']['input'];
};


export type MutationUpsert_Company_Ats_BoardsArgs = {
  boards: Array<AtsBoardUpsertInput>;
  company_id: Scalars['Int']['input'];
};

export type PrepCategory = {
  __typename?: 'PrepCategory';
  description: Scalars['String']['output'];
  emoji: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  resources: Array<PrepResource>;
};

export type PrepContent = {
  __typename?: 'PrepContent';
  categories: Array<PrepCategory>;
  totalResources: Scalars['Int']['output'];
};

export type PrepResource = {
  __typename?: 'PrepResource';
  category: Scalars['String']['output'];
  description: Scalars['String']['output'];
  href: Scalars['URL']['output'];
  id: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

/** Response from triggering the classify-jobs Cloudflare Worker */
export type ProcessAllJobsResponse = {
  __typename?: 'ProcessAllJobsResponse';
  /** Number of errors during ATS enhancement */
  enhanceErrors: Maybe<Scalars['Int']['output']>;
  /** Number of jobs enhanced with ATS data in this run */
  enhanced: Maybe<Scalars['Int']['output']>;
  /** Number of errors encountered during classification */
  errors: Maybe<Scalars['Int']['output']>;
  /** Number of jobs classified as EU-remote */
  euRemote: Maybe<Scalars['Int']['output']>;
  message: Maybe<Scalars['String']['output']>;
  /** Number of jobs classified as non-EU */
  nonEuRemote: Maybe<Scalars['Int']['output']>;
  /** Number of jobs classified in this run */
  processed: Maybe<Scalars['Int']['output']>;
  success: Scalars['Boolean']['output'];
};

export type Prompt = {
  __typename?: 'Prompt';
  chatMessages: Maybe<Array<ChatMessage>>;
  config: Maybe<PromptConfig>;
  createdAt: Maybe<Scalars['String']['output']>;
  createdBy: Maybe<Scalars['String']['output']>;
  isUserSpecific: Scalars['Boolean']['output'];
  labels: Maybe<Array<Scalars['String']['output']>>;
  name: Scalars['String']['output'];
  prompt: Maybe<Scalars['String']['output']>;
  tags: Maybe<Array<Scalars['String']['output']>>;
  type: PromptType;
  updatedAt: Maybe<Scalars['String']['output']>;
  version: Maybe<Scalars['Int']['output']>;
};

export type PromptConfig = {
  __typename?: 'PromptConfig';
  max_tokens: Maybe<Scalars['Int']['output']>;
  model: Maybe<Scalars['String']['output']>;
  temperature: Maybe<Scalars['Float']['output']>;
  top_p: Maybe<Scalars['Float']['output']>;
};

export type PromptConfigInput = {
  max_tokens?: InputMaybe<Scalars['Int']['input']>;
  model?: InputMaybe<Scalars['String']['input']>;
  temperature?: InputMaybe<Scalars['Float']['input']>;
  top_p?: InputMaybe<Scalars['Float']['input']>;
};

export type PromptType =
  | 'CHAT'
  | 'TEXT';

export type PromptUsage = {
  __typename?: 'PromptUsage';
  label: Maybe<Scalars['String']['output']>;
  promptName: Scalars['String']['output'];
  traceId: Maybe<Scalars['String']['output']>;
  usedAt: Scalars['String']['output'];
  userEmail: Scalars['String']['output'];
  version: Maybe<Scalars['Int']['output']>;
};

export type PushLangSmithPromptInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  object?: InputMaybe<Scalars['JSON']['input']>;
  parentCommitHash?: InputMaybe<Scalars['String']['input']>;
  readme?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type Query = {
  __typename?: 'Query';
  applications: Array<Application>;
  askAboutResume: Maybe<ResumeAnswer>;
  companies: CompaniesResponse;
  company: Maybe<Company>;
  company_ats_boards: Array<AtsBoard>;
  company_facts: Array<CompanyFact>;
  company_snapshots: Array<CompanySnapshot>;
  executeSql: TextToSqlResult;
  job: Maybe<Job>;
  jobs: JobsResponse;
  langsmithPrompt: Maybe<LangSmithPrompt>;
  langsmithPromptCommit: Maybe<LangSmithPromptCommit>;
  langsmithPrompts: Array<LangSmithPrompt>;
  myPromptUsage: Array<PromptUsage>;
  prepResources: PrepContent;
  prepResourcesByCategory: Array<PrepResource>;
  prompt: Maybe<Prompt>;
  prompts: Array<RegisteredPrompt>;
  resumeStatus: Maybe<ResumeStatus>;
  textToSql: TextToSqlResult;
  track: Maybe<Track>;
  tracks: Array<Track>;
  userSettings: Maybe<UserSettings>;
};


export type QueryAskAboutResumeArgs = {
  email: Scalars['String']['input'];
  question: Scalars['String']['input'];
};


export type QueryCompaniesArgs = {
  filter?: InputMaybe<CompanyFilterInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<CompanyOrderBy>;
};


export type QueryCompanyArgs = {
  id?: InputMaybe<Scalars['Int']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
};


export type QueryCompany_Ats_BoardsArgs = {
  company_id: Scalars['Int']['input'];
};


export type QueryCompany_FactsArgs = {
  company_id: Scalars['Int']['input'];
  field?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCompany_SnapshotsArgs = {
  company_id: Scalars['Int']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryExecuteSqlArgs = {
  sql: Scalars['String']['input'];
};


export type QueryJobArgs = {
  id: Scalars['String']['input'];
};


export type QueryJobsArgs = {
  excludedCompanies?: InputMaybe<Array<Scalars['String']['input']>>;
  isRemoteEu?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  remoteEuConfidence?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sourceType?: InputMaybe<Scalars['String']['input']>;
};


export type QueryLangsmithPromptArgs = {
  promptIdentifier: Scalars['String']['input'];
};


export type QueryLangsmithPromptCommitArgs = {
  includeModel?: InputMaybe<Scalars['Boolean']['input']>;
  promptIdentifier: Scalars['String']['input'];
};


export type QueryLangsmithPromptsArgs = {
  isArchived?: InputMaybe<Scalars['Boolean']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMyPromptUsageArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPrepResourcesByCategoryArgs = {
  category: Scalars['String']['input'];
};


export type QueryPromptArgs = {
  label?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  version?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryResumeStatusArgs = {
  email: Scalars['String']['input'];
};


export type QueryTextToSqlArgs = {
  question: Scalars['String']['input'];
};


export type QueryTrackArgs = {
  slug: Scalars['String']['input'];
};


export type QueryTracksArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryUserSettingsArgs = {
  userId: Scalars['String']['input'];
};

export type QuestionAnswer = {
  __typename?: 'QuestionAnswer';
  answerText: Scalars['String']['output'];
  questionId: Scalars['String']['output'];
  questionText: Scalars['String']['output'];
};

export type QuestionAnswerInput = {
  answerText: Scalars['String']['input'];
  questionId: Scalars['String']['input'];
  questionText: Scalars['String']['input'];
};

export type RegisteredPrompt = {
  __typename?: 'RegisteredPrompt';
  content: Maybe<Scalars['JSON']['output']>;
  labels: Array<Scalars['String']['output']>;
  lastConfig: Maybe<Scalars['JSON']['output']>;
  lastUpdatedAt: Scalars['String']['output'];
  lastUsedBy: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  type: Scalars['String']['output'];
  usageCount: Maybe<Scalars['Int']['output']>;
  versions: Array<Scalars['Int']['output']>;
};

export type ResearchItem = {
  __typename?: 'ResearchItem';
  id: Scalars['String']['output'];
  relevance: Maybe<Scalars['String']['output']>;
  summary: Scalars['String']['output'];
  title: Scalars['String']['output'];
  url: Scalars['URL']['output'];
};

export type ResumeAnswer = {
  __typename?: 'ResumeAnswer';
  answer: Scalars['String']['output'];
  context_count: Scalars['Int']['output'];
};

export type ResumeIngestResult = {
  __typename?: 'ResumeIngestResult';
  chunks_stored: Maybe<Scalars['Int']['output']>;
  error: Maybe<Scalars['String']['output']>;
  job_id: Scalars['String']['output'];
  resume_id: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type ResumeStatus = {
  __typename?: 'ResumeStatus';
  chunk_count: Maybe<Scalars['Int']['output']>;
  exists: Scalars['Boolean']['output'];
  filename: Maybe<Scalars['String']['output']>;
  ingested_at: Maybe<Scalars['String']['output']>;
  resume_id: Maybe<Scalars['String']['output']>;
};

export type ResumeUploadResult = {
  __typename?: 'ResumeUploadResult';
  job_id: Scalars['String']['output'];
  status: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
  tier: Scalars['String']['output'];
};

export type SourceType =
  | 'COMMONCRAWL'
  | 'LIVE_FETCH'
  | 'MANUAL'
  | 'PARTNER';

export type TextToSqlResult = {
  __typename?: 'TextToSqlResult';
  columns: Array<Scalars['String']['output']>;
  drilldownSearchQuery: Maybe<Scalars['String']['output']>;
  explanation: Maybe<Scalars['String']['output']>;
  rows: Array<Maybe<Array<Maybe<Scalars['JSON']['output']>>>>;
  sql: Scalars['String']['output'];
};

export type Track = {
  __typename?: 'Track';
  description: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  items: Array<TrackItem>;
  level: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type TrackItem = {
  __typename?: 'TrackItem';
  children: Array<TrackItem>;
  contentRef: Maybe<Scalars['String']['output']>;
  difficulty: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  kind: Scalars['String']['output'];
  position: Scalars['Int']['output'];
  prereqs: Array<Scalars['ID']['output']>;
  promptRef: Maybe<Scalars['String']['output']>;
  tags: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

export type UpdateApplicationInput = {
  notes?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<ApplicationStatus>;
};

export type UpdateCompanyInput = {
  canonical_domain?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<CompanyCategory>;
  description?: InputMaybe<Scalars['String']['input']>;
  industries?: InputMaybe<Array<Scalars['String']['input']>>;
  industry?: InputMaybe<Scalars['String']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  logo_url?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  score?: InputMaybe<Scalars['Float']['input']>;
  score_reasons?: InputMaybe<Array<Scalars['String']['input']>>;
  service_taxonomy?: InputMaybe<Array<Scalars['String']['input']>>;
  services?: InputMaybe<Array<Scalars['String']['input']>>;
  size?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateLangSmithPromptInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isArchived?: InputMaybe<Scalars['Boolean']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  readme?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UserSettings = {
  __typename?: 'UserSettings';
  created_at: Scalars['String']['output'];
  daily_digest: Scalars['Boolean']['output'];
  dark_mode: Scalars['Boolean']['output'];
  email_notifications: Scalars['Boolean']['output'];
  excluded_companies: Maybe<Array<Scalars['String']['output']>>;
  id: Scalars['Int']['output'];
  jobs_per_page: Scalars['Int']['output'];
  new_job_alerts: Scalars['Boolean']['output'];
  preferred_locations: Maybe<Array<Scalars['String']['output']>>;
  preferred_skills: Maybe<Array<Scalars['String']['output']>>;
  updated_at: Scalars['String']['output'];
  user_id: Scalars['String']['output'];
};

export type UserSettingsInput = {
  daily_digest?: InputMaybe<Scalars['Boolean']['input']>;
  dark_mode?: InputMaybe<Scalars['Boolean']['input']>;
  email_notifications?: InputMaybe<Scalars['Boolean']['input']>;
  excluded_companies?: InputMaybe<Array<Scalars['String']['input']>>;
  jobs_per_page?: InputMaybe<Scalars['Int']['input']>;
  new_job_alerts?: InputMaybe<Scalars['Boolean']['input']>;
  preferred_locations?: InputMaybe<Array<Scalars['String']['input']>>;
  preferred_skills?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type WarcPointer = {
  __typename?: 'WarcPointer';
  digest: Maybe<Scalars['String']['output']>;
  filename: Scalars['String']['output'];
  length: Scalars['Int']['output'];
  offset: Scalars['Int']['output'];
};

export type WarcPointerInput = {
  digest?: InputMaybe<Scalars['String']['input']>;
  filename: Scalars['String']['input'];
  length: Scalars['Int']['input'];
  offset: Scalars['Int']['input'];
};



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  ATSBoard: ResolverTypeWrapper<Partial<AtsBoard>>;
  ATSBoardType: ResolverTypeWrapper<Partial<AtsBoardType>>;
  ATSBoardUpsertInput: ResolverTypeWrapper<Partial<AtsBoardUpsertInput>>;
  ATSVendor: ResolverTypeWrapper<Partial<AtsVendor>>;
  Application: ResolverTypeWrapper<Partial<Application>>;
  ApplicationInput: ResolverTypeWrapper<Partial<ApplicationInput>>;
  ApplicationStatus: ResolverTypeWrapper<Partial<ApplicationStatus>>;
  AshbyAddress: ResolverTypeWrapper<Partial<AshbyAddress>>;
  AshbyCompensation: ResolverTypeWrapper<Partial<AshbyCompensation>>;
  AshbyCompensationComponent: ResolverTypeWrapper<Partial<AshbyCompensationComponent>>;
  AshbyCompensationTier: ResolverTypeWrapper<Partial<AshbyCompensationTier>>;
  AshbyEnrichment: ResolverTypeWrapper<Partial<AshbyEnrichment>>;
  AshbyPostalAddress: ResolverTypeWrapper<Partial<AshbyPostalAddress>>;
  AshbySecondaryLocation: ResolverTypeWrapper<Partial<AshbySecondaryLocation>>;
  Boolean: ResolverTypeWrapper<Partial<Scalars['Boolean']['output']>>;
  ChatMessage: ResolverTypeWrapper<Partial<ChatMessage>>;
  ChatMessageInput: ResolverTypeWrapper<Partial<ChatMessageInput>>;
  CompaniesResponse: ResolverTypeWrapper<Partial<CompaniesResponse>>;
  Company: ResolverTypeWrapper<Partial<Company>>;
  CompanyCategory: ResolverTypeWrapper<Partial<CompanyCategory>>;
  CompanyFact: ResolverTypeWrapper<Partial<CompanyFact>>;
  CompanyFactInput: ResolverTypeWrapper<Partial<CompanyFactInput>>;
  CompanyFilterInput: ResolverTypeWrapper<Partial<CompanyFilterInput>>;
  CompanyOrderBy: ResolverTypeWrapper<Partial<CompanyOrderBy>>;
  CompanySnapshot: ResolverTypeWrapper<Partial<CompanySnapshot>>;
  CreateCompanyInput: ResolverTypeWrapper<Partial<CreateCompanyInput>>;
  CreateLangSmithPromptInput: ResolverTypeWrapper<Partial<CreateLangSmithPromptInput>>;
  CreatePromptInput: ResolverTypeWrapper<Partial<CreatePromptInput>>;
  CreateTrackInput: ResolverTypeWrapper<Partial<CreateTrackInput>>;
  DateTime: ResolverTypeWrapper<Partial<Scalars['DateTime']['output']>>;
  DeleteCompanyResponse: ResolverTypeWrapper<Partial<DeleteCompanyResponse>>;
  DeleteJobResponse: ResolverTypeWrapper<Partial<DeleteJobResponse>>;
  EmailAddress: ResolverTypeWrapper<Partial<Scalars['EmailAddress']['output']>>;
  EnhanceCompanyResponse: ResolverTypeWrapper<Partial<EnhanceCompanyResponse>>;
  EnhanceJobResponse: ResolverTypeWrapper<Partial<EnhanceJobResponse>>;
  Evidence: ResolverTypeWrapper<Partial<Evidence>>;
  EvidenceInput: ResolverTypeWrapper<Partial<EvidenceInput>>;
  ExtractMethod: ResolverTypeWrapper<Partial<ExtractMethod>>;
  Float: ResolverTypeWrapper<Partial<Scalars['Float']['output']>>;
  GreenhouseCompliance: ResolverTypeWrapper<Partial<GreenhouseCompliance>>;
  GreenhouseDataCompliance: ResolverTypeWrapper<Partial<GreenhouseDataCompliance>>;
  GreenhouseDemographicQuestions: ResolverTypeWrapper<Partial<GreenhouseDemographicQuestions>>;
  GreenhouseDepartment: ResolverTypeWrapper<Partial<GreenhouseDepartment>>;
  GreenhouseMetadata: ResolverTypeWrapper<Partial<GreenhouseMetadata>>;
  GreenhouseOffice: ResolverTypeWrapper<Partial<GreenhouseOffice>>;
  GreenhouseQuestion: ResolverTypeWrapper<Partial<GreenhouseQuestion>>;
  GreenhouseQuestionField: ResolverTypeWrapper<Partial<GreenhouseQuestionField>>;
  ID: ResolverTypeWrapper<Partial<Scalars['ID']['output']>>;
  Int: ResolverTypeWrapper<Partial<Scalars['Int']['output']>>;
  JSON: ResolverTypeWrapper<Partial<Scalars['JSON']['output']>>;
  Job: ResolverTypeWrapper<Partial<Job>>;
  JobSkill: ResolverTypeWrapper<Partial<JobSkill>>;
  JobsResponse: ResolverTypeWrapper<Partial<JobsResponse>>;
  LangSmithPrompt: ResolverTypeWrapper<Partial<LangSmithPrompt>>;
  LangSmithPromptCommit: ResolverTypeWrapper<Partial<LangSmithPromptCommit>>;
  LeverCategories: ResolverTypeWrapper<Partial<LeverCategories>>;
  LeverList: ResolverTypeWrapper<Partial<LeverList>>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  PrepCategory: ResolverTypeWrapper<Partial<PrepCategory>>;
  PrepContent: ResolverTypeWrapper<Partial<PrepContent>>;
  PrepResource: ResolverTypeWrapper<Partial<PrepResource>>;
  ProcessAllJobsResponse: ResolverTypeWrapper<Partial<ProcessAllJobsResponse>>;
  Prompt: ResolverTypeWrapper<Partial<Prompt>>;
  PromptConfig: ResolverTypeWrapper<Partial<PromptConfig>>;
  PromptConfigInput: ResolverTypeWrapper<Partial<PromptConfigInput>>;
  PromptType: ResolverTypeWrapper<Partial<PromptType>>;
  PromptUsage: ResolverTypeWrapper<Partial<PromptUsage>>;
  PushLangSmithPromptInput: ResolverTypeWrapper<Partial<PushLangSmithPromptInput>>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  QuestionAnswer: ResolverTypeWrapper<Partial<QuestionAnswer>>;
  QuestionAnswerInput: ResolverTypeWrapper<Partial<QuestionAnswerInput>>;
  RegisteredPrompt: ResolverTypeWrapper<Partial<RegisteredPrompt>>;
  ResearchItem: ResolverTypeWrapper<Partial<ResearchItem>>;
  ResumeAnswer: ResolverTypeWrapper<Partial<ResumeAnswer>>;
  ResumeIngestResult: ResolverTypeWrapper<Partial<ResumeIngestResult>>;
  ResumeStatus: ResolverTypeWrapper<Partial<ResumeStatus>>;
  ResumeUploadResult: ResolverTypeWrapper<Partial<ResumeUploadResult>>;
  SourceType: ResolverTypeWrapper<Partial<SourceType>>;
  String: ResolverTypeWrapper<Partial<Scalars['String']['output']>>;
  TextToSqlResult: ResolverTypeWrapper<Partial<TextToSqlResult>>;
  Track: ResolverTypeWrapper<Partial<Track>>;
  TrackItem: ResolverTypeWrapper<Partial<TrackItem>>;
  URL: ResolverTypeWrapper<Partial<Scalars['URL']['output']>>;
  UpdateApplicationInput: ResolverTypeWrapper<Partial<UpdateApplicationInput>>;
  UpdateCompanyInput: ResolverTypeWrapper<Partial<UpdateCompanyInput>>;
  UpdateLangSmithPromptInput: ResolverTypeWrapper<Partial<UpdateLangSmithPromptInput>>;
  Upload: ResolverTypeWrapper<Partial<Scalars['Upload']['output']>>;
  UserSettings: ResolverTypeWrapper<Partial<UserSettings>>;
  UserSettingsInput: ResolverTypeWrapper<Partial<UserSettingsInput>>;
  WarcPointer: ResolverTypeWrapper<Partial<WarcPointer>>;
  WarcPointerInput: ResolverTypeWrapper<Partial<WarcPointerInput>>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  ATSBoard: Partial<AtsBoard>;
  ATSBoardUpsertInput: Partial<AtsBoardUpsertInput>;
  Application: Partial<Application>;
  ApplicationInput: Partial<ApplicationInput>;
  AshbyAddress: Partial<AshbyAddress>;
  AshbyCompensation: Partial<AshbyCompensation>;
  AshbyCompensationComponent: Partial<AshbyCompensationComponent>;
  AshbyCompensationTier: Partial<AshbyCompensationTier>;
  AshbyEnrichment: Partial<AshbyEnrichment>;
  AshbyPostalAddress: Partial<AshbyPostalAddress>;
  AshbySecondaryLocation: Partial<AshbySecondaryLocation>;
  Boolean: Partial<Scalars['Boolean']['output']>;
  ChatMessage: Partial<ChatMessage>;
  ChatMessageInput: Partial<ChatMessageInput>;
  CompaniesResponse: Partial<CompaniesResponse>;
  Company: Partial<Company>;
  CompanyFact: Partial<CompanyFact>;
  CompanyFactInput: Partial<CompanyFactInput>;
  CompanyFilterInput: Partial<CompanyFilterInput>;
  CompanySnapshot: Partial<CompanySnapshot>;
  CreateCompanyInput: Partial<CreateCompanyInput>;
  CreateLangSmithPromptInput: Partial<CreateLangSmithPromptInput>;
  CreatePromptInput: Partial<CreatePromptInput>;
  CreateTrackInput: Partial<CreateTrackInput>;
  DateTime: Partial<Scalars['DateTime']['output']>;
  DeleteCompanyResponse: Partial<DeleteCompanyResponse>;
  DeleteJobResponse: Partial<DeleteJobResponse>;
  EmailAddress: Partial<Scalars['EmailAddress']['output']>;
  EnhanceCompanyResponse: Partial<EnhanceCompanyResponse>;
  EnhanceJobResponse: Partial<EnhanceJobResponse>;
  Evidence: Partial<Evidence>;
  EvidenceInput: Partial<EvidenceInput>;
  Float: Partial<Scalars['Float']['output']>;
  GreenhouseCompliance: Partial<GreenhouseCompliance>;
  GreenhouseDataCompliance: Partial<GreenhouseDataCompliance>;
  GreenhouseDemographicQuestions: Partial<GreenhouseDemographicQuestions>;
  GreenhouseDepartment: Partial<GreenhouseDepartment>;
  GreenhouseMetadata: Partial<GreenhouseMetadata>;
  GreenhouseOffice: Partial<GreenhouseOffice>;
  GreenhouseQuestion: Partial<GreenhouseQuestion>;
  GreenhouseQuestionField: Partial<GreenhouseQuestionField>;
  ID: Partial<Scalars['ID']['output']>;
  Int: Partial<Scalars['Int']['output']>;
  JSON: Partial<Scalars['JSON']['output']>;
  Job: Partial<Job>;
  JobSkill: Partial<JobSkill>;
  JobsResponse: Partial<JobsResponse>;
  LangSmithPrompt: Partial<LangSmithPrompt>;
  LangSmithPromptCommit: Partial<LangSmithPromptCommit>;
  LeverCategories: Partial<LeverCategories>;
  LeverList: Partial<LeverList>;
  Mutation: Record<PropertyKey, never>;
  PrepCategory: Partial<PrepCategory>;
  PrepContent: Partial<PrepContent>;
  PrepResource: Partial<PrepResource>;
  ProcessAllJobsResponse: Partial<ProcessAllJobsResponse>;
  Prompt: Partial<Prompt>;
  PromptConfig: Partial<PromptConfig>;
  PromptConfigInput: Partial<PromptConfigInput>;
  PromptUsage: Partial<PromptUsage>;
  PushLangSmithPromptInput: Partial<PushLangSmithPromptInput>;
  Query: Record<PropertyKey, never>;
  QuestionAnswer: Partial<QuestionAnswer>;
  QuestionAnswerInput: Partial<QuestionAnswerInput>;
  RegisteredPrompt: Partial<RegisteredPrompt>;
  ResearchItem: Partial<ResearchItem>;
  ResumeAnswer: Partial<ResumeAnswer>;
  ResumeIngestResult: Partial<ResumeIngestResult>;
  ResumeStatus: Partial<ResumeStatus>;
  ResumeUploadResult: Partial<ResumeUploadResult>;
  String: Partial<Scalars['String']['output']>;
  TextToSqlResult: Partial<TextToSqlResult>;
  Track: Partial<Track>;
  TrackItem: Partial<TrackItem>;
  URL: Partial<Scalars['URL']['output']>;
  UpdateApplicationInput: Partial<UpdateApplicationInput>;
  UpdateCompanyInput: Partial<UpdateCompanyInput>;
  UpdateLangSmithPromptInput: Partial<UpdateLangSmithPromptInput>;
  Upload: Partial<Scalars['Upload']['output']>;
  UserSettings: Partial<UserSettings>;
  UserSettingsInput: Partial<UserSettingsInput>;
  WarcPointer: Partial<WarcPointer>;
  WarcPointerInput: Partial<WarcPointerInput>;
};

export type AtsBoardResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ATSBoard'] = ResolversParentTypes['ATSBoard']> = {
  board_type?: Resolver<ResolversTypes['ATSBoardType'], ParentType, ContextType>;
  company_id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  evidence?: Resolver<ResolversTypes['Evidence'], ParentType, ContextType>;
  first_seen_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  is_active?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  last_seen_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updated_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  vendor?: Resolver<ResolversTypes['ATSVendor'], ParentType, ContextType>;
};

export type ApplicationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Application'] = ResolversParentTypes['Application']> = {
  companyName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['EmailAddress'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  jobId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  jobTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  questions?: Resolver<Array<ResolversTypes['QuestionAnswer']>, ParentType, ContextType>;
  resume?: Resolver<Maybe<ResolversTypes['Upload']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ApplicationStatus'], ParentType, ContextType>;
};

export type AshbyAddressResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AshbyAddress'] = ResolversParentTypes['AshbyAddress']> = {
  postalAddress?: Resolver<Maybe<ResolversTypes['AshbyPostalAddress']>, ParentType, ContextType>;
};

export type AshbyCompensationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AshbyCompensation'] = ResolversParentTypes['AshbyCompensation']> = {
  compensationTierSummary?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  compensationTiers?: Resolver<Array<ResolversTypes['AshbyCompensationTier']>, ParentType, ContextType>;
  scrapeableCompensationSalarySummary?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  summaryComponents?: Resolver<Array<ResolversTypes['AshbyCompensationComponent']>, ParentType, ContextType>;
};

export type AshbyCompensationComponentResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AshbyCompensationComponent'] = ResolversParentTypes['AshbyCompensationComponent']> = {
  compensationType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  currencyCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  interval?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  maxValue?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  minValue?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  summary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type AshbyCompensationTierResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AshbyCompensationTier'] = ResolversParentTypes['AshbyCompensationTier']> = {
  additionalInformation?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  components?: Resolver<Array<ResolversTypes['AshbyCompensationComponent']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tierSummary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type AshbyEnrichmentResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AshbyEnrichment'] = ResolversParentTypes['AshbyEnrichment']> = {
  company_name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  enriched_at?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  industry_tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  size_signal?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tech_signals?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
};

export type AshbyPostalAddressResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AshbyPostalAddress'] = ResolversParentTypes['AshbyPostalAddress']> = {
  addressCountry?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  addressLocality?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  addressRegion?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type AshbySecondaryLocationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AshbySecondaryLocation'] = ResolversParentTypes['AshbySecondaryLocation']> = {
  address?: Resolver<Maybe<ResolversTypes['AshbyPostalAddress']>, ParentType, ContextType>;
  location?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type ChatMessageResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ChatMessage'] = ResolversParentTypes['ChatMessage']> = {
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type CompaniesResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CompaniesResponse'] = ResolversParentTypes['CompaniesResponse']> = {
  companies?: Resolver<Array<ResolversTypes['Company']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type CompanyResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Company'] = ResolversParentTypes['Company']> = {
  ashby_enrichment?: Resolver<Maybe<ResolversTypes['AshbyEnrichment']>, ParentType, ContextType>;
  ats_boards?: Resolver<Array<ResolversTypes['ATSBoard']>, ParentType, ContextType>;
  canonical_domain?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  category?: Resolver<ResolversTypes['CompanyCategory'], ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  facts?: Resolver<Array<ResolversTypes['CompanyFact']>, ParentType, ContextType, Partial<CompanyFactsArgs>>;
  facts_count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  industries?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  industry?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  last_seen_capture_timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  last_seen_crawl_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  last_seen_source_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  location?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  logo_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  score_reasons?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  service_taxonomy?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  services?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  size?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  snapshots?: Resolver<Array<ResolversTypes['CompanySnapshot']>, ParentType, ContextType, Partial<CompanySnapshotsArgs>>;
  snapshots_count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  updated_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  website?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type CompanyFactResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CompanyFact'] = ResolversParentTypes['CompanyFact']> = {
  company_id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  evidence?: Resolver<ResolversTypes['Evidence'], ParentType, ContextType>;
  field?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  normalized_value?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  value_json?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  value_text?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type CompanySnapshotResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CompanySnapshot'] = ResolversParentTypes['CompanySnapshot']> = {
  capture_timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  company_id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  content_hash?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  crawl_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  evidence?: Resolver<ResolversTypes['Evidence'], ParentType, ContextType>;
  extracted?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  fetched_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  http_status?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  jsonld?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  mime?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  source_url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  text_sample?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type DeleteCompanyResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteCompanyResponse'] = ResolversParentTypes['DeleteCompanyResponse']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type DeleteJobResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteJobResponse'] = ResolversParentTypes['DeleteJobResponse']> = {
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export interface EmailAddressScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['EmailAddress'], any> {
  name: 'EmailAddress';
}

export type EnhanceCompanyResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['EnhanceCompanyResponse'] = ResolversParentTypes['EnhanceCompanyResponse']> = {
  companyId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  companyKey?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type EnhanceJobResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['EnhanceJobResponse'] = ResolversParentTypes['EnhanceJobResponse']> = {
  enhancedData?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  job?: Resolver<Maybe<ResolversTypes['Job']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type EvidenceResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Evidence'] = ResolversParentTypes['Evidence']> = {
  capture_timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  content_hash?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  crawl_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  extractor_version?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  http_status?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  method?: Resolver<ResolversTypes['ExtractMethod'], ParentType, ContextType>;
  mime?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  observed_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  source_type?: Resolver<ResolversTypes['SourceType'], ParentType, ContextType>;
  source_url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  warc?: Resolver<Maybe<ResolversTypes['WarcPointer']>, ParentType, ContextType>;
};

export type GreenhouseComplianceResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GreenhouseCompliance'] = ResolversParentTypes['GreenhouseCompliance']> = {
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  questions?: Resolver<Maybe<Array<ResolversTypes['GreenhouseQuestion']>>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type GreenhouseDataComplianceResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GreenhouseDataCompliance'] = ResolversParentTypes['GreenhouseDataCompliance']> = {
  demographic_data_consent_applies?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  requires_consent?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  requires_processing_consent?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  requires_retention_consent?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  retention_period?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type GreenhouseDemographicQuestionsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GreenhouseDemographicQuestions'] = ResolversParentTypes['GreenhouseDemographicQuestions']> = {
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  header?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  questions?: Resolver<Maybe<Array<ResolversTypes['GreenhouseQuestion']>>, ParentType, ContextType>;
};

export type GreenhouseDepartmentResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GreenhouseDepartment'] = ResolversParentTypes['GreenhouseDepartment']> = {
  child_ids?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parent_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type GreenhouseMetadataResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GreenhouseMetadata'] = ResolversParentTypes['GreenhouseMetadata']> = {
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  value_type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type GreenhouseOfficeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GreenhouseOffice'] = ResolversParentTypes['GreenhouseOffice']> = {
  child_ids?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  location?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parent_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type GreenhouseQuestionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GreenhouseQuestion'] = ResolversParentTypes['GreenhouseQuestion']> = {
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  fields?: Resolver<Array<ResolversTypes['GreenhouseQuestionField']>, ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  required?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type GreenhouseQuestionFieldResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GreenhouseQuestionField'] = ResolversParentTypes['GreenhouseQuestionField']> = {
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type JobResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Job'] = ResolversParentTypes['Job']> = {
  absolute_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  additional?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  additional_plain?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ashby_address?: Resolver<Maybe<ResolversTypes['AshbyAddress']>, ParentType, ContextType>;
  ashby_apply_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ashby_compensation?: Resolver<Maybe<ResolversTypes['AshbyCompensation']>, ParentType, ContextType>;
  ashby_department?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ashby_employment_type?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ashby_is_listed?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  ashby_is_remote?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  ashby_job_url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ashby_published_at?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ashby_secondary_locations?: Resolver<Maybe<Array<ResolversTypes['AshbySecondaryLocation']>>, ParentType, ContextType>;
  ashby_team?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ats_created_at?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  categories?: Resolver<Maybe<ResolversTypes['LeverCategories']>, ParentType, ContextType>;
  company?: Resolver<Maybe<ResolversTypes['Company']>, ParentType, ContextType>;
  company_id?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  company_key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  company_name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  compliance?: Resolver<Maybe<Array<ResolversTypes['GreenhouseCompliance']>>, ParentType, ContextType>;
  country?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  data_compliance?: Resolver<Maybe<Array<ResolversTypes['GreenhouseDataCompliance']>>, ParentType, ContextType>;
  demographic_questions?: Resolver<Maybe<ResolversTypes['GreenhouseDemographicQuestions']>, ParentType, ContextType>;
  departments?: Resolver<Maybe<Array<ResolversTypes['GreenhouseDepartment']>>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  description_body?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  description_body_plain?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  external_id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  first_published?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  internal_job_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  is_remote_eu?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  language?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lists?: Resolver<Maybe<Array<ResolversTypes['LeverList']>>, ParentType, ContextType>;
  location?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  location_questions?: Resolver<Maybe<Array<ResolversTypes['GreenhouseQuestion']>>, ParentType, ContextType>;
  metadata?: Resolver<Maybe<Array<ResolversTypes['GreenhouseMetadata']>>, ParentType, ContextType>;
  offices?: Resolver<Maybe<Array<ResolversTypes['GreenhouseOffice']>>, ParentType, ContextType>;
  opening?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  opening_plain?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  posted_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  questions?: Resolver<Maybe<Array<ResolversTypes['GreenhouseQuestion']>>, ParentType, ContextType>;
  remote_eu_confidence?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  remote_eu_reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  requisition_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  score?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  score_reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  skills?: Resolver<Maybe<Array<ResolversTypes['JobSkill']>>, ParentType, ContextType>;
  source_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  source_kind?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updated_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  workplace_type?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type JobSkillResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['JobSkill'] = ResolversParentTypes['JobSkill']> = {
  confidence?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  evidence?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  level?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tag?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type JobsResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['JobsResponse'] = ResolversParentTypes['JobsResponse']> = {
  jobs?: Resolver<Array<ResolversTypes['Job']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type LangSmithPromptResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['LangSmithPrompt'] = ResolversParentTypes['LangSmithPrompt']> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  fullName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  isArchived?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isPublic?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lastCommitHash?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  likedByAuthUser?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  numCommits?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  numDownloads?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  numLikes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  numViews?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  owner?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  promptHandle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  readme?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  tenantId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type LangSmithPromptCommitResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['LangSmithPromptCommit'] = ResolversParentTypes['LangSmithPromptCommit']> = {
  commitHash?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  examples?: Resolver<Array<ResolversTypes['JSON']>, ParentType, ContextType>;
  manifest?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  owner?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  promptName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type LeverCategoriesResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['LeverCategories'] = ResolversParentTypes['LeverCategories']> = {
  allLocations?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  commitment?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  department?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  location?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  team?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type LeverListResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['LeverList'] = ResolversParentTypes['LeverList']> = {
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  add_company_facts?: Resolver<Array<ResolversTypes['CompanyFact']>, ParentType, ContextType, RequireFields<MutationAdd_Company_FactsArgs, 'company_id' | 'facts'>>;
  createApplication?: Resolver<ResolversTypes['Application'], ParentType, ContextType, RequireFields<MutationCreateApplicationArgs, 'input'>>;
  createCompany?: Resolver<ResolversTypes['Company'], ParentType, ContextType, RequireFields<MutationCreateCompanyArgs, 'input'>>;
  createLangSmithPrompt?: Resolver<ResolversTypes['LangSmithPrompt'], ParentType, ContextType, RequireFields<MutationCreateLangSmithPromptArgs, 'promptIdentifier'>>;
  createPrompt?: Resolver<ResolversTypes['Prompt'], ParentType, ContextType, RequireFields<MutationCreatePromptArgs, 'input'>>;
  createTrack?: Resolver<ResolversTypes['Track'], ParentType, ContextType, RequireFields<MutationCreateTrackArgs, 'input'>>;
  deleteAllJobs?: Resolver<ResolversTypes['DeleteJobResponse'], ParentType, ContextType>;
  deleteCompany?: Resolver<ResolversTypes['DeleteCompanyResponse'], ParentType, ContextType, RequireFields<MutationDeleteCompanyArgs, 'id'>>;
  deleteJob?: Resolver<ResolversTypes['DeleteJobResponse'], ParentType, ContextType, RequireFields<MutationDeleteJobArgs, 'id'>>;
  deleteLangSmithPrompt?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteLangSmithPromptArgs, 'promptIdentifier'>>;
  enhanceCompany?: Resolver<ResolversTypes['EnhanceCompanyResponse'], ParentType, ContextType, Partial<MutationEnhanceCompanyArgs>>;
  enhanceJobFromATS?: Resolver<ResolversTypes['EnhanceJobResponse'], ParentType, ContextType, RequireFields<MutationEnhanceJobFromAtsArgs, 'company' | 'jobId' | 'source'>>;
  generateResearch?: Resolver<Array<ResolversTypes['ResearchItem']>, ParentType, ContextType, RequireFields<MutationGenerateResearchArgs, 'goalDescription'>>;
  ingestResumeParse?: Resolver<Maybe<ResolversTypes['ResumeIngestResult']>, ParentType, ContextType, RequireFields<MutationIngestResumeParseArgs, 'email' | 'filename' | 'job_id'>>;
  ingest_company_snapshot?: Resolver<ResolversTypes['CompanySnapshot'], ParentType, ContextType, RequireFields<MutationIngest_Company_SnapshotArgs, 'company_id' | 'evidence' | 'fetched_at' | 'source_url'>>;
  processAllJobs?: Resolver<ResolversTypes['ProcessAllJobsResponse'], ParentType, ContextType, Partial<MutationProcessAllJobsArgs>>;
  pushLangSmithPrompt?: Resolver<ResolversTypes['String'], ParentType, ContextType, RequireFields<MutationPushLangSmithPromptArgs, 'promptIdentifier'>>;
  updateApplication?: Resolver<ResolversTypes['Application'], ParentType, ContextType, RequireFields<MutationUpdateApplicationArgs, 'id' | 'input'>>;
  updateCompany?: Resolver<ResolversTypes['Company'], ParentType, ContextType, RequireFields<MutationUpdateCompanyArgs, 'id' | 'input'>>;
  updateLangSmithPrompt?: Resolver<ResolversTypes['LangSmithPrompt'], ParentType, ContextType, RequireFields<MutationUpdateLangSmithPromptArgs, 'input' | 'promptIdentifier'>>;
  updatePromptLabel?: Resolver<ResolversTypes['Prompt'], ParentType, ContextType, RequireFields<MutationUpdatePromptLabelArgs, 'label' | 'name' | 'version'>>;
  updateUserSettings?: Resolver<ResolversTypes['UserSettings'], ParentType, ContextType, RequireFields<MutationUpdateUserSettingsArgs, 'settings' | 'userId'>>;
  uploadResume?: Resolver<Maybe<ResolversTypes['ResumeUploadResult']>, ParentType, ContextType, RequireFields<MutationUploadResumeArgs, 'email' | 'filename' | 'resumePdf'>>;
  upsert_company_ats_boards?: Resolver<Array<ResolversTypes['ATSBoard']>, ParentType, ContextType, RequireFields<MutationUpsert_Company_Ats_BoardsArgs, 'boards' | 'company_id'>>;
};

export type PrepCategoryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PrepCategory'] = ResolversParentTypes['PrepCategory']> = {
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  emoji?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  resources?: Resolver<Array<ResolversTypes['PrepResource']>, ParentType, ContextType>;
};

export type PrepContentResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PrepContent'] = ResolversParentTypes['PrepContent']> = {
  categories?: Resolver<Array<ResolversTypes['PrepCategory']>, ParentType, ContextType>;
  totalResources?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type PrepResourceResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PrepResource'] = ResolversParentTypes['PrepResource']> = {
  category?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  href?: Resolver<ResolversTypes['URL'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type ProcessAllJobsResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ProcessAllJobsResponse'] = ResolversParentTypes['ProcessAllJobsResponse']> = {
  enhanceErrors?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  enhanced?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  errors?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  euRemote?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  nonEuRemote?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  processed?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type PromptResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Prompt'] = ResolversParentTypes['Prompt']> = {
  chatMessages?: Resolver<Maybe<Array<ResolversTypes['ChatMessage']>>, ParentType, ContextType>;
  config?: Resolver<Maybe<ResolversTypes['PromptConfig']>, ParentType, ContextType>;
  createdAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdBy?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isUserSpecific?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  labels?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  prompt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['PromptType'], ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  version?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
};

export type PromptConfigResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PromptConfig'] = ResolversParentTypes['PromptConfig']> = {
  max_tokens?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  model?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  temperature?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  top_p?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
};

export type PromptUsageResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PromptUsage'] = ResolversParentTypes['PromptUsage']> = {
  label?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  promptName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  traceId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  usedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userEmail?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  version?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
};

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  applications?: Resolver<Array<ResolversTypes['Application']>, ParentType, ContextType>;
  askAboutResume?: Resolver<Maybe<ResolversTypes['ResumeAnswer']>, ParentType, ContextType, RequireFields<QueryAskAboutResumeArgs, 'email' | 'question'>>;
  companies?: Resolver<ResolversTypes['CompaniesResponse'], ParentType, ContextType, Partial<QueryCompaniesArgs>>;
  company?: Resolver<Maybe<ResolversTypes['Company']>, ParentType, ContextType, Partial<QueryCompanyArgs>>;
  company_ats_boards?: Resolver<Array<ResolversTypes['ATSBoard']>, ParentType, ContextType, RequireFields<QueryCompany_Ats_BoardsArgs, 'company_id'>>;
  company_facts?: Resolver<Array<ResolversTypes['CompanyFact']>, ParentType, ContextType, RequireFields<QueryCompany_FactsArgs, 'company_id'>>;
  company_snapshots?: Resolver<Array<ResolversTypes['CompanySnapshot']>, ParentType, ContextType, RequireFields<QueryCompany_SnapshotsArgs, 'company_id'>>;
  executeSql?: Resolver<ResolversTypes['TextToSqlResult'], ParentType, ContextType, RequireFields<QueryExecuteSqlArgs, 'sql'>>;
  job?: Resolver<Maybe<ResolversTypes['Job']>, ParentType, ContextType, RequireFields<QueryJobArgs, 'id'>>;
  jobs?: Resolver<ResolversTypes['JobsResponse'], ParentType, ContextType, Partial<QueryJobsArgs>>;
  langsmithPrompt?: Resolver<Maybe<ResolversTypes['LangSmithPrompt']>, ParentType, ContextType, RequireFields<QueryLangsmithPromptArgs, 'promptIdentifier'>>;
  langsmithPromptCommit?: Resolver<Maybe<ResolversTypes['LangSmithPromptCommit']>, ParentType, ContextType, RequireFields<QueryLangsmithPromptCommitArgs, 'promptIdentifier'>>;
  langsmithPrompts?: Resolver<Array<ResolversTypes['LangSmithPrompt']>, ParentType, ContextType, Partial<QueryLangsmithPromptsArgs>>;
  myPromptUsage?: Resolver<Array<ResolversTypes['PromptUsage']>, ParentType, ContextType, Partial<QueryMyPromptUsageArgs>>;
  prepResources?: Resolver<ResolversTypes['PrepContent'], ParentType, ContextType>;
  prepResourcesByCategory?: Resolver<Array<ResolversTypes['PrepResource']>, ParentType, ContextType, RequireFields<QueryPrepResourcesByCategoryArgs, 'category'>>;
  prompt?: Resolver<Maybe<ResolversTypes['Prompt']>, ParentType, ContextType, RequireFields<QueryPromptArgs, 'name'>>;
  prompts?: Resolver<Array<ResolversTypes['RegisteredPrompt']>, ParentType, ContextType>;
  resumeStatus?: Resolver<Maybe<ResolversTypes['ResumeStatus']>, ParentType, ContextType, RequireFields<QueryResumeStatusArgs, 'email'>>;
  textToSql?: Resolver<ResolversTypes['TextToSqlResult'], ParentType, ContextType, RequireFields<QueryTextToSqlArgs, 'question'>>;
  track?: Resolver<Maybe<ResolversTypes['Track']>, ParentType, ContextType, RequireFields<QueryTrackArgs, 'slug'>>;
  tracks?: Resolver<Array<ResolversTypes['Track']>, ParentType, ContextType, RequireFields<QueryTracksArgs, 'limit'>>;
  userSettings?: Resolver<Maybe<ResolversTypes['UserSettings']>, ParentType, ContextType, RequireFields<QueryUserSettingsArgs, 'userId'>>;
};

export type QuestionAnswerResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['QuestionAnswer'] = ResolversParentTypes['QuestionAnswer']> = {
  answerText?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  questionId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  questionText?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type RegisteredPromptResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['RegisteredPrompt'] = ResolversParentTypes['RegisteredPrompt']> = {
  content?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  labels?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  lastConfig?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  lastUpdatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lastUsedBy?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  usageCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  versions?: Resolver<Array<ResolversTypes['Int']>, ParentType, ContextType>;
};

export type ResearchItemResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ResearchItem'] = ResolversParentTypes['ResearchItem']> = {
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  relevance?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  summary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['URL'], ParentType, ContextType>;
};

export type ResumeAnswerResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ResumeAnswer'] = ResolversParentTypes['ResumeAnswer']> = {
  answer?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  context_count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type ResumeIngestResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ResumeIngestResult'] = ResolversParentTypes['ResumeIngestResult']> = {
  chunks_stored?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  error?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  job_id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  resume_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type ResumeStatusResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ResumeStatus'] = ResolversParentTypes['ResumeStatus']> = {
  chunk_count?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  exists?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  filename?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ingested_at?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  resume_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type ResumeUploadResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ResumeUploadResult'] = ResolversParentTypes['ResumeUploadResult']> = {
  job_id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  tier?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type TextToSqlResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TextToSqlResult'] = ResolversParentTypes['TextToSqlResult']> = {
  columns?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  drilldownSearchQuery?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  explanation?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rows?: Resolver<Array<Maybe<Array<Maybe<ResolversTypes['JSON']>>>>, ParentType, ContextType>;
  sql?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type TrackResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Track'] = ResolversParentTypes['Track']> = {
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  items?: Resolver<Array<ResolversTypes['TrackItem']>, ParentType, ContextType>;
  level?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type TrackItemResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TrackItem'] = ResolversParentTypes['TrackItem']> = {
  children?: Resolver<Array<ResolversTypes['TrackItem']>, ParentType, ContextType>;
  contentRef?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  difficulty?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  prereqs?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  promptRef?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export interface UrlScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['URL'], any> {
  name: 'URL';
}

export interface UploadScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Upload'], any> {
  name: 'Upload';
}

export type UserSettingsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UserSettings'] = ResolversParentTypes['UserSettings']> = {
  created_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  daily_digest?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  dark_mode?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  email_notifications?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  excluded_companies?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  jobs_per_page?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  new_job_alerts?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  preferred_locations?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  preferred_skills?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  updated_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user_id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type WarcPointerResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['WarcPointer'] = ResolversParentTypes['WarcPointer']> = {
  digest?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  filename?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  length?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  offset?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLContext> = {
  ATSBoard?: AtsBoardResolvers<ContextType>;
  Application?: ApplicationResolvers<ContextType>;
  AshbyAddress?: AshbyAddressResolvers<ContextType>;
  AshbyCompensation?: AshbyCompensationResolvers<ContextType>;
  AshbyCompensationComponent?: AshbyCompensationComponentResolvers<ContextType>;
  AshbyCompensationTier?: AshbyCompensationTierResolvers<ContextType>;
  AshbyEnrichment?: AshbyEnrichmentResolvers<ContextType>;
  AshbyPostalAddress?: AshbyPostalAddressResolvers<ContextType>;
  AshbySecondaryLocation?: AshbySecondaryLocationResolvers<ContextType>;
  ChatMessage?: ChatMessageResolvers<ContextType>;
  CompaniesResponse?: CompaniesResponseResolvers<ContextType>;
  Company?: CompanyResolvers<ContextType>;
  CompanyFact?: CompanyFactResolvers<ContextType>;
  CompanySnapshot?: CompanySnapshotResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  DeleteCompanyResponse?: DeleteCompanyResponseResolvers<ContextType>;
  DeleteJobResponse?: DeleteJobResponseResolvers<ContextType>;
  EmailAddress?: GraphQLScalarType;
  EnhanceCompanyResponse?: EnhanceCompanyResponseResolvers<ContextType>;
  EnhanceJobResponse?: EnhanceJobResponseResolvers<ContextType>;
  Evidence?: EvidenceResolvers<ContextType>;
  GreenhouseCompliance?: GreenhouseComplianceResolvers<ContextType>;
  GreenhouseDataCompliance?: GreenhouseDataComplianceResolvers<ContextType>;
  GreenhouseDemographicQuestions?: GreenhouseDemographicQuestionsResolvers<ContextType>;
  GreenhouseDepartment?: GreenhouseDepartmentResolvers<ContextType>;
  GreenhouseMetadata?: GreenhouseMetadataResolvers<ContextType>;
  GreenhouseOffice?: GreenhouseOfficeResolvers<ContextType>;
  GreenhouseQuestion?: GreenhouseQuestionResolvers<ContextType>;
  GreenhouseQuestionField?: GreenhouseQuestionFieldResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Job?: JobResolvers<ContextType>;
  JobSkill?: JobSkillResolvers<ContextType>;
  JobsResponse?: JobsResponseResolvers<ContextType>;
  LangSmithPrompt?: LangSmithPromptResolvers<ContextType>;
  LangSmithPromptCommit?: LangSmithPromptCommitResolvers<ContextType>;
  LeverCategories?: LeverCategoriesResolvers<ContextType>;
  LeverList?: LeverListResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  PrepCategory?: PrepCategoryResolvers<ContextType>;
  PrepContent?: PrepContentResolvers<ContextType>;
  PrepResource?: PrepResourceResolvers<ContextType>;
  ProcessAllJobsResponse?: ProcessAllJobsResponseResolvers<ContextType>;
  Prompt?: PromptResolvers<ContextType>;
  PromptConfig?: PromptConfigResolvers<ContextType>;
  PromptUsage?: PromptUsageResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  QuestionAnswer?: QuestionAnswerResolvers<ContextType>;
  RegisteredPrompt?: RegisteredPromptResolvers<ContextType>;
  ResearchItem?: ResearchItemResolvers<ContextType>;
  ResumeAnswer?: ResumeAnswerResolvers<ContextType>;
  ResumeIngestResult?: ResumeIngestResultResolvers<ContextType>;
  ResumeStatus?: ResumeStatusResolvers<ContextType>;
  ResumeUploadResult?: ResumeUploadResultResolvers<ContextType>;
  TextToSqlResult?: TextToSqlResultResolvers<ContextType>;
  Track?: TrackResolvers<ContextType>;
  TrackItem?: TrackItemResolvers<ContextType>;
  URL?: GraphQLScalarType;
  Upload?: GraphQLScalarType;
  UserSettings?: UserSettingsResolvers<ContextType>;
  WarcPointer?: WarcPointerResolvers<ContextType>;
};

