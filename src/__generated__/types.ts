export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
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
  __typename: 'ATSBoard';
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
  __typename: 'Application';
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
  __typename: 'AshbyAddress';
  postalAddress: Maybe<AshbyPostalAddress>;
};

export type AshbyCompensation = {
  __typename: 'AshbyCompensation';
  compensationTierSummary: Maybe<Scalars['String']['output']>;
  compensationTiers: Array<AshbyCompensationTier>;
  scrapeableCompensationSalarySummary: Maybe<Scalars['String']['output']>;
  summaryComponents: Array<AshbyCompensationComponent>;
};

export type AshbyCompensationComponent = {
  __typename: 'AshbyCompensationComponent';
  compensationType: Scalars['String']['output'];
  currencyCode: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  interval: Scalars['String']['output'];
  maxValue: Maybe<Scalars['Float']['output']>;
  minValue: Maybe<Scalars['Float']['output']>;
  summary: Scalars['String']['output'];
};

export type AshbyCompensationTier = {
  __typename: 'AshbyCompensationTier';
  additionalInformation: Maybe<Scalars['String']['output']>;
  components: Array<AshbyCompensationComponent>;
  id: Scalars['String']['output'];
  tierSummary: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type AshbyEnrichment = {
  __typename: 'AshbyEnrichment';
  company_name: Maybe<Scalars['String']['output']>;
  enriched_at: Maybe<Scalars['String']['output']>;
  industry_tags: Array<Scalars['String']['output']>;
  size_signal: Maybe<Scalars['String']['output']>;
  tech_signals: Array<Scalars['String']['output']>;
};

export type AshbyPostalAddress = {
  __typename: 'AshbyPostalAddress';
  addressCountry: Maybe<Scalars['String']['output']>;
  addressLocality: Maybe<Scalars['String']['output']>;
  addressRegion: Maybe<Scalars['String']['output']>;
};

export type AshbySecondaryLocation = {
  __typename: 'AshbySecondaryLocation';
  address: Maybe<AshbyPostalAddress>;
  location: Scalars['String']['output'];
};

export type ChatMessage = {
  __typename: 'ChatMessage';
  content: Scalars['String']['output'];
  role: Scalars['String']['output'];
};

export type ChatMessageInput = {
  content: Scalars['String']['input'];
  role: Scalars['String']['input'];
};

export type CompaniesResponse = {
  __typename: 'CompaniesResponse';
  companies: Array<Company>;
  totalCount: Scalars['Int']['output'];
};

export type Company = {
  __typename: 'Company';
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
  __typename: 'CompanyFact';
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
  __typename: 'CompanySnapshot';
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
  __typename: 'DeleteCompanyResponse';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteJobResponse = {
  __typename: 'DeleteJobResponse';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type EnhanceCompanyResponse = {
  __typename: 'EnhanceCompanyResponse';
  companyId: Maybe<Scalars['Int']['output']>;
  companyKey: Maybe<Scalars['String']['output']>;
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

/** Response from enhancing a job with ATS data */
export type EnhanceJobResponse = {
  __typename: 'EnhanceJobResponse';
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
  __typename: 'Evidence';
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
  __typename: 'GreenhouseCompliance';
  description: Maybe<Scalars['String']['output']>;
  questions: Maybe<Array<GreenhouseQuestion>>;
  type: Scalars['String']['output'];
};

export type GreenhouseDataCompliance = {
  __typename: 'GreenhouseDataCompliance';
  demographic_data_consent_applies: Scalars['Boolean']['output'];
  requires_consent: Scalars['Boolean']['output'];
  requires_processing_consent: Scalars['Boolean']['output'];
  requires_retention_consent: Scalars['Boolean']['output'];
  retention_period: Maybe<Scalars['Int']['output']>;
  type: Scalars['String']['output'];
};

export type GreenhouseDemographicQuestions = {
  __typename: 'GreenhouseDemographicQuestions';
  description: Maybe<Scalars['String']['output']>;
  header: Maybe<Scalars['String']['output']>;
  questions: Maybe<Array<GreenhouseQuestion>>;
};

export type GreenhouseDepartment = {
  __typename: 'GreenhouseDepartment';
  child_ids: Array<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  parent_id: Maybe<Scalars['String']['output']>;
};

export type GreenhouseMetadata = {
  __typename: 'GreenhouseMetadata';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  value: Scalars['String']['output'];
  value_type: Scalars['String']['output'];
};

export type GreenhouseOffice = {
  __typename: 'GreenhouseOffice';
  child_ids: Array<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  location: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  parent_id: Maybe<Scalars['String']['output']>;
};

export type GreenhouseQuestion = {
  __typename: 'GreenhouseQuestion';
  description: Maybe<Scalars['String']['output']>;
  fields: Array<GreenhouseQuestionField>;
  label: Scalars['String']['output'];
  required: Scalars['Boolean']['output'];
};

export type GreenhouseQuestionField = {
  __typename: 'GreenhouseQuestionField';
  name: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
};

export type Job = {
  __typename: 'Job';
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
  __typename: 'JobSkill';
  confidence: Maybe<Scalars['Float']['output']>;
  evidence: Maybe<Scalars['String']['output']>;
  level: Scalars['String']['output'];
  tag: Scalars['String']['output'];
};

export type JobsResponse = {
  __typename: 'JobsResponse';
  jobs: Array<Job>;
  totalCount: Scalars['Int']['output'];
};

export type LangSmithPrompt = {
  __typename: 'LangSmithPrompt';
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
  __typename: 'LangSmithPromptCommit';
  commitHash: Scalars['String']['output'];
  examples: Array<Scalars['JSON']['output']>;
  manifest: Scalars['JSON']['output'];
  owner: Scalars['String']['output'];
  promptName: Scalars['String']['output'];
};

export type LeverCategories = {
  __typename: 'LeverCategories';
  allLocations: Maybe<Array<Scalars['String']['output']>>;
  commitment: Maybe<Scalars['String']['output']>;
  department: Maybe<Scalars['String']['output']>;
  location: Maybe<Scalars['String']['output']>;
  team: Maybe<Scalars['String']['output']>;
};

export type LeverList = {
  __typename: 'LeverList';
  content: Scalars['String']['output'];
  text: Scalars['String']['output'];
};

export type Mutation = {
  __typename: 'Mutation';
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
  __typename: 'PrepCategory';
  description: Scalars['String']['output'];
  emoji: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  resources: Array<PrepResource>;
};

export type PrepContent = {
  __typename: 'PrepContent';
  categories: Array<PrepCategory>;
  totalResources: Scalars['Int']['output'];
};

export type PrepResource = {
  __typename: 'PrepResource';
  category: Scalars['String']['output'];
  description: Scalars['String']['output'];
  href: Scalars['URL']['output'];
  id: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

/** Response from triggering the classify-jobs Cloudflare Worker */
export type ProcessAllJobsResponse = {
  __typename: 'ProcessAllJobsResponse';
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
  __typename: 'Prompt';
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
  __typename: 'PromptConfig';
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
  __typename: 'PromptUsage';
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
  __typename: 'Query';
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
  skills?: InputMaybe<Array<Scalars['String']['input']>>;
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
  __typename: 'QuestionAnswer';
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
  __typename: 'RegisteredPrompt';
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
  __typename: 'ResearchItem';
  id: Scalars['String']['output'];
  relevance: Maybe<Scalars['String']['output']>;
  summary: Scalars['String']['output'];
  title: Scalars['String']['output'];
  url: Scalars['URL']['output'];
};

export type ResumeAnswer = {
  __typename: 'ResumeAnswer';
  answer: Scalars['String']['output'];
  context_count: Scalars['Int']['output'];
};

export type ResumeIngestResult = {
  __typename: 'ResumeIngestResult';
  chunks_stored: Maybe<Scalars['Int']['output']>;
  error: Maybe<Scalars['String']['output']>;
  job_id: Scalars['String']['output'];
  resume_id: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type ResumeStatus = {
  __typename: 'ResumeStatus';
  chunk_count: Maybe<Scalars['Int']['output']>;
  exists: Scalars['Boolean']['output'];
  filename: Maybe<Scalars['String']['output']>;
  ingested_at: Maybe<Scalars['String']['output']>;
  resume_id: Maybe<Scalars['String']['output']>;
};

export type ResumeUploadResult = {
  __typename: 'ResumeUploadResult';
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
  __typename: 'TextToSqlResult';
  columns: Array<Scalars['String']['output']>;
  drilldownSearchQuery: Maybe<Scalars['String']['output']>;
  explanation: Maybe<Scalars['String']['output']>;
  rows: Array<Maybe<Array<Maybe<Scalars['JSON']['output']>>>>;
  sql: Scalars['String']['output'];
};

export type Track = {
  __typename: 'Track';
  description: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  items: Array<TrackItem>;
  level: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type TrackItem = {
  __typename: 'TrackItem';
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
  __typename: 'UserSettings';
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
  __typename: 'WarcPointer';
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
