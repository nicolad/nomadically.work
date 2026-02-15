import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
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
  email: Scalars['EmailAddress']['output'];
  jobId: Scalars['String']['output'];
  questions: Array<QuestionAnswer>;
  resume: Maybe<Scalars['Upload']['output']>;
};

export type ApplicationInput = {
  jobId: Scalars['String']['input'];
  questions: Array<QuestionAnswerInput>;
  resume?: InputMaybe<Scalars['Upload']['input']>;
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

export type EnhanceJobResponse = {
  __typename?: 'EnhanceJobResponse';
  enhancedData: Maybe<Scalars['JSON']['output']>;
  job: Maybe<Job>;
  message: Maybe<Scalars['String']['output']>;
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
  child_ids: Array<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  parent_id: Maybe<Scalars['Int']['output']>;
};

export type GreenhouseMetadata = {
  __typename?: 'GreenhouseMetadata';
  id: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  value: Scalars['String']['output'];
  value_type: Scalars['String']['output'];
};

export type GreenhouseOffice = {
  __typename?: 'GreenhouseOffice';
  child_ids: Array<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  location: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  parent_id: Maybe<Scalars['Int']['output']>;
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
  company: Maybe<Company>;
  company_id: Maybe<Scalars['Int']['output']>;
  company_key: Scalars['String']['output'];
  company_name: Maybe<Scalars['String']['output']>;
  compliance: Maybe<Array<GreenhouseCompliance>>;
  created_at: Scalars['String']['output'];
  data_compliance: Maybe<Array<GreenhouseDataCompliance>>;
  demographic_questions: Maybe<GreenhouseDemographicQuestions>;
  departments: Maybe<Array<GreenhouseDepartment>>;
  description: Maybe<Scalars['String']['output']>;
  external_id: Scalars['String']['output'];
  first_published: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  internal_job_id: Maybe<Scalars['Int']['output']>;
  is_remote_eu: Maybe<Scalars['Boolean']['output']>;
  language: Maybe<Scalars['String']['output']>;
  location: Maybe<Scalars['String']['output']>;
  location_questions: Maybe<Array<GreenhouseQuestion>>;
  metadata: Maybe<Array<GreenhouseMetadata>>;
  offices: Maybe<Array<GreenhouseOffice>>;
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

export type Mutation = {
  __typename?: 'Mutation';
  add_company_facts: Array<CompanyFact>;
  createApplication: Application;
  createCompany: Company;
  createLangSmithPrompt: LangSmithPrompt;
  createPrompt: Prompt;
  deleteCompany: DeleteCompanyResponse;
  deleteJob: DeleteJobResponse;
  deleteLangSmithPrompt: Scalars['Boolean']['output'];
  enhanceCompany: EnhanceCompanyResponse;
  enhanceJobFromATS: EnhanceJobResponse;
  ingest_company_snapshot: CompanySnapshot;
  pushLangSmithPrompt: Scalars['String']['output'];
  updateCompany: Company;
  updateLangSmithPrompt: LangSmithPrompt;
  updatePromptLabel: Prompt;
  updateUserSettings: UserSettings;
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


export type MutationPushLangSmithPromptArgs = {
  input?: InputMaybe<PushLangSmithPromptInput>;
  promptIdentifier: Scalars['String']['input'];
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


export type MutationUpsert_Company_Ats_BoardsArgs = {
  boards: Array<AtsBoardUpsertInput>;
  company_id: Scalars['Int']['input'];
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
  prompt: Maybe<Prompt>;
  prompts: Array<RegisteredPrompt>;
  textToSql: TextToSqlResult;
  userSettings: Maybe<UserSettings>;
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
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sourceType?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
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


export type QueryPromptArgs = {
  label?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  version?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryTextToSqlArgs = {
  question: Scalars['String']['input'];
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

export type DeleteJobMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteJobMutation = { __typename?: 'Mutation', deleteJob: { __typename?: 'DeleteJobResponse', success: boolean, message: string | null } };

export type ExecuteSqlQueryVariables = Exact<{
  sql: Scalars['String']['input'];
}>;


export type ExecuteSqlQuery = { __typename?: 'Query', executeSql: { __typename?: 'TextToSqlResult', sql: string, explanation: string | null, columns: Array<string>, rows: Array<Array<any | null> | null>, drilldownSearchQuery: string | null } };

export type GetJobQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetJobQuery = { __typename?: 'Query', job: { __typename?: 'Job', id: number, external_id: string, source_id: string | null, source_kind: string, company_id: number | null, company_key: string, title: string, location: string | null, url: string, description: string | null, posted_at: string, score: number | null, score_reason: string | null, status: string | null, is_remote_eu: boolean | null, remote_eu_confidence: string | null, remote_eu_reason: string | null, absolute_url: string | null, internal_job_id: number | null, requisition_id: string | null, company_name: string | null, first_published: string | null, language: string | null, created_at: string, updated_at: string, company: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, canonical_domain: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ats_boards: Array<{ __typename?: 'ATSBoard', id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string }> } | null, skills: Array<{ __typename?: 'JobSkill', tag: string, level: string, confidence: number | null, evidence: string | null }> | null, metadata: Array<{ __typename?: 'GreenhouseMetadata', id: number, name: string, value: string, value_type: string }> | null, departments: Array<{ __typename?: 'GreenhouseDepartment', id: number, name: string, child_ids: Array<number>, parent_id: number | null }> | null, offices: Array<{ __typename?: 'GreenhouseOffice', id: number, name: string, location: string | null, child_ids: Array<number>, parent_id: number | null }> | null, questions: Array<{ __typename?: 'GreenhouseQuestion', description: string | null, label: string, required: boolean, fields: Array<{ __typename?: 'GreenhouseQuestionField', type: string, name: string | null }> }> | null, location_questions: Array<{ __typename?: 'GreenhouseQuestion', description: string | null, label: string, required: boolean, fields: Array<{ __typename?: 'GreenhouseQuestionField', type: string, name: string | null }> }> | null, compliance: Array<{ __typename?: 'GreenhouseCompliance', type: string, description: string | null, questions: Array<{ __typename?: 'GreenhouseQuestion', description: string | null, label: string, required: boolean, fields: Array<{ __typename?: 'GreenhouseQuestionField', type: string, name: string | null }> }> | null }> | null, demographic_questions: { __typename?: 'GreenhouseDemographicQuestions', header: string | null, description: string | null, questions: Array<{ __typename?: 'GreenhouseQuestion', description: string | null, label: string, required: boolean, fields: Array<{ __typename?: 'GreenhouseQuestionField', type: string, name: string | null }> }> | null } | null, data_compliance: Array<{ __typename?: 'GreenhouseDataCompliance', type: string, requires_consent: boolean, requires_processing_consent: boolean, requires_retention_consent: boolean, retention_period: number | null, demographic_data_consent_applies: boolean }> | null } | null };

export type GetJobsQueryVariables = Exact<{
  sourceType?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  excludedCompanies?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
}>;


export type GetJobsQuery = { __typename?: 'Query', jobs: { __typename?: 'JobsResponse', totalCount: number, jobs: Array<{ __typename?: 'Job', id: number, external_id: string, source_id: string | null, source_kind: string, company_id: number | null, company_key: string, title: string, location: string | null, url: string, description: string | null, posted_at: string, score: number | null, score_reason: string | null, status: string | null, created_at: string, updated_at: string, company: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, canonical_domain: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ats_boards: Array<{ __typename?: 'ATSBoard', id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string }> } | null, skills: Array<{ __typename?: 'JobSkill', tag: string, level: string }> | null }> } };

export type GetUserSettingsQueryVariables = Exact<{
  userId: Scalars['String']['input'];
}>;


export type GetUserSettingsQuery = { __typename?: 'Query', userSettings: { __typename?: 'UserSettings', id: number, user_id: string, preferred_locations: Array<string> | null, preferred_skills: Array<string> | null, excluded_companies: Array<string> | null } | null };

export type TextToSqlQueryVariables = Exact<{
  question: Scalars['String']['input'];
}>;


export type TextToSqlQuery = { __typename?: 'Query', textToSql: { __typename?: 'TextToSqlResult', sql: string, explanation: string | null, columns: Array<string>, rows: Array<Array<any | null> | null>, drilldownSearchQuery: string | null } };

export type UpdateUserSettingsMutationVariables = Exact<{
  userId: Scalars['String']['input'];
  settings: UserSettingsInput;
}>;


export type UpdateUserSettingsMutation = { __typename?: 'Mutation', updateUserSettings: { __typename?: 'UserSettings', id: number, user_id: string, email_notifications: boolean, daily_digest: boolean, new_job_alerts: boolean, preferred_locations: Array<string> | null, preferred_skills: Array<string> | null, excluded_companies: Array<string> | null, dark_mode: boolean, jobs_per_page: number, created_at: string, updated_at: string } };

export type GetApplicationsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetApplicationsQuery = { __typename?: 'Query', applications: Array<{ __typename?: 'Application', email: string, jobId: string, resume: File | null, questions: Array<{ __typename?: 'QuestionAnswer', questionId: string, questionText: string, answerText: string }> }> };

export type CreateApplicationMutationVariables = Exact<{
  input: ApplicationInput;
}>;


export type CreateApplicationMutation = { __typename?: 'Mutation', createApplication: { __typename?: 'Application', email: string, jobId: string, questions: Array<{ __typename?: 'QuestionAnswer', questionId: string, questionText: string, answerText: string }> } };

export type EvidenceFieldsFragment = { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null };

export type AtsBoardFieldsFragment = { __typename?: 'ATSBoard', id: number, company_id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string, created_at: string, updated_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } };

export type CompanyFactFieldsFragment = { __typename?: 'CompanyFact', id: number, company_id: number, field: string, value_json: any | null, value_text: string | null, normalized_value: any | null, confidence: number, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } };

export type CompanySnapshotFieldsFragment = { __typename?: 'CompanySnapshot', id: number, company_id: number, source_url: string, crawl_id: string | null, capture_timestamp: string | null, fetched_at: string, http_status: number | null, mime: string | null, content_hash: string | null, text_sample: string | null, jsonld: any | null, extracted: any | null, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } };

export type CompanyFieldsFragment = { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, canonical_domain: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ats_boards: Array<{ __typename?: 'ATSBoard', id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string }> };

export type CreateCompanyMutationVariables = Exact<{
  input: CreateCompanyInput;
}>;


export type CreateCompanyMutation = { __typename?: 'Mutation', createCompany: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, canonical_domain: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ats_boards: Array<{ __typename?: 'ATSBoard', id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string }> } };

export type UpdateCompanyMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateCompanyInput;
}>;


export type UpdateCompanyMutation = { __typename?: 'Mutation', updateCompany: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, canonical_domain: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ats_boards: Array<{ __typename?: 'ATSBoard', id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string }> } };

export type DeleteCompanyMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteCompanyMutation = { __typename?: 'Mutation', deleteCompany: { __typename?: 'DeleteCompanyResponse', success: boolean, message: string | null } };

export type EnhanceCompanyMutationVariables = Exact<{
  id?: InputMaybe<Scalars['Int']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
}>;


export type EnhanceCompanyMutation = { __typename?: 'Mutation', enhanceCompany: { __typename?: 'EnhanceCompanyResponse', success: boolean, message: string | null, companyId: number | null, companyKey: string | null } };

export type AddCompanyFactsMutationVariables = Exact<{
  company_id: Scalars['Int']['input'];
  facts: Array<CompanyFactInput> | CompanyFactInput;
}>;


export type AddCompanyFactsMutation = { __typename?: 'Mutation', add_company_facts: Array<{ __typename?: 'CompanyFact', id: number, company_id: number, field: string, value_json: any | null, value_text: string | null, normalized_value: any | null, confidence: number, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }> };

export type UpsertCompanyAtsBoardsMutationVariables = Exact<{
  company_id: Scalars['Int']['input'];
  boards: Array<AtsBoardUpsertInput> | AtsBoardUpsertInput;
}>;


export type UpsertCompanyAtsBoardsMutation = { __typename?: 'Mutation', upsert_company_ats_boards: Array<{ __typename?: 'ATSBoard', id: number, company_id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string, created_at: string, updated_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }> };

export type IngestCompanySnapshotMutationVariables = Exact<{
  company_id: Scalars['Int']['input'];
  source_url: Scalars['String']['input'];
  crawl_id?: InputMaybe<Scalars['String']['input']>;
  capture_timestamp?: InputMaybe<Scalars['String']['input']>;
  fetched_at: Scalars['String']['input'];
  http_status?: InputMaybe<Scalars['Int']['input']>;
  mime?: InputMaybe<Scalars['String']['input']>;
  content_hash?: InputMaybe<Scalars['String']['input']>;
  text_sample?: InputMaybe<Scalars['String']['input']>;
  jsonld?: InputMaybe<Scalars['JSON']['input']>;
  extracted?: InputMaybe<Scalars['JSON']['input']>;
  evidence: EvidenceInput;
}>;


export type IngestCompanySnapshotMutation = { __typename?: 'Mutation', ingest_company_snapshot: { __typename?: 'CompanySnapshot', id: number, company_id: number, source_url: string, crawl_id: string | null, capture_timestamp: string | null, fetched_at: string, http_status: number | null, mime: string | null, content_hash: string | null, text_sample: string | null, jsonld: any | null, extracted: any | null, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } } };

export type GetCompanyQueryVariables = Exact<{
  id?: InputMaybe<Scalars['Int']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetCompanyQuery = { __typename?: 'Query', company: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, canonical_domain: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ats_boards: Array<{ __typename?: 'ATSBoard', id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string }> } | null };

export type GetCompaniesQueryVariables = Exact<{
  text?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetCompaniesQuery = { __typename?: 'Query', companies: { __typename?: 'CompaniesResponse', totalCount: number, companies: Array<{ __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, canonical_domain: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ats_boards: Array<{ __typename?: 'ATSBoard', id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string }> }> } };

export type SearchCompaniesQueryVariables = Exact<{
  filter: CompanyFilterInput;
  order_by?: InputMaybe<CompanyOrderBy>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SearchCompaniesQuery = { __typename?: 'Query', companies: { __typename?: 'CompaniesResponse', totalCount: number, companies: Array<{ __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, canonical_domain: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ats_boards: Array<{ __typename?: 'ATSBoard', id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string }> }> } };

export type GetCompanyFactsQueryVariables = Exact<{
  company_id: Scalars['Int']['input'];
  field?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetCompanyFactsQuery = { __typename?: 'Query', company_facts: Array<{ __typename?: 'CompanyFact', id: number, company_id: number, field: string, value_json: any | null, value_text: string | null, normalized_value: any | null, confidence: number, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }> };

export type GetCompanyAtsBoardsQueryVariables = Exact<{
  company_id: Scalars['Int']['input'];
}>;


export type GetCompanyAtsBoardsQuery = { __typename?: 'Query', company_ats_boards: Array<{ __typename?: 'ATSBoard', id: number, company_id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string, created_at: string, updated_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }> };

export type CompanyAuditQueryVariables = Exact<{
  key: Scalars['String']['input'];
}>;


export type CompanyAuditQuery = { __typename?: 'Query', company: { __typename?: 'Company', facts_count: number, snapshots_count: number, id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, canonical_domain: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, facts: Array<{ __typename?: 'CompanyFact', id: number, company_id: number, field: string, value_json: any | null, value_text: string | null, normalized_value: any | null, confidence: number, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }>, snapshots: Array<{ __typename?: 'CompanySnapshot', id: number, company_id: number, source_url: string, crawl_id: string | null, capture_timestamp: string | null, fetched_at: string, http_status: number | null, mime: string | null, content_hash: string | null, text_sample: string | null, jsonld: any | null, extracted: any | null, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }>, ats_boards: Array<{ __typename?: 'ATSBoard', id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string }> } | null };

export type GetGreenhouseJobsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetGreenhouseJobsQuery = { __typename?: 'Query', jobs: { __typename?: 'JobsResponse', totalCount: number, jobs: Array<{ __typename?: 'Job', id: number, external_id: string, source_id: string | null, source_kind: string, company_id: number | null, company_key: string, title: string, location: string | null, url: string, description: string | null, posted_at: string, score: number | null, score_reason: string | null, status: string | null, is_remote_eu: boolean | null, remote_eu_confidence: string | null, remote_eu_reason: string | null, created_at: string, updated_at: string, company: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, canonical_domain: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ats_boards: Array<{ __typename?: 'ATSBoard', id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string }> } | null, skills: Array<{ __typename?: 'JobSkill', tag: string, level: string, confidence: number | null, evidence: string | null }> | null }> } };

export type GetGreenhouseJobByIdQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetGreenhouseJobByIdQuery = { __typename?: 'Query', job: { __typename?: 'Job', id: number, external_id: string, source_id: string | null, source_kind: string, company_id: number | null, company_key: string, title: string, location: string | null, url: string, description: string | null, posted_at: string, score: number | null, score_reason: string | null, status: string | null, is_remote_eu: boolean | null, remote_eu_confidence: string | null, remote_eu_reason: string | null, created_at: string, updated_at: string, company: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, canonical_domain: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ats_boards: Array<{ __typename?: 'ATSBoard', id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string }> } | null, skills: Array<{ __typename?: 'JobSkill', tag: string, level: string, confidence: number | null, evidence: string | null }> | null } | null };

export type EnhanceJobFromGreenhouseAtsMutationVariables = Exact<{
  jobId: Scalars['String']['input'];
  company: Scalars['String']['input'];
  source: Scalars['String']['input'];
}>;


export type EnhanceJobFromGreenhouseAtsMutation = { __typename?: 'Mutation', enhanceJobFromATS: { __typename?: 'EnhanceJobResponse', success: boolean, message: string | null, enhancedData: any | null, job: { __typename?: 'Job', id: number, external_id: string, source_id: string | null, source_kind: string, company_id: number | null, company_key: string, title: string, location: string | null, url: string, description: string | null, posted_at: string, score: number | null, score_reason: string | null, status: string | null, is_remote_eu: boolean | null, remote_eu_confidence: string | null, remote_eu_reason: string | null, created_at: string, updated_at: string, company: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, canonical_domain: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ats_boards: Array<{ __typename?: 'ATSBoard', id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string }> } | null, skills: Array<{ __typename?: 'JobSkill', tag: string, level: string, confidence: number | null, evidence: string | null }> | null } | null } };

export type GetLangSmithPromptsQueryVariables = Exact<{
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  isArchived?: InputMaybe<Scalars['Boolean']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetLangSmithPromptsQuery = { __typename?: 'Query', langsmithPrompts: Array<{ __typename?: 'LangSmithPrompt', id: string, promptHandle: string, fullName: string, description: string | null, readme: string | null, tenantId: string, createdAt: string, updatedAt: string, isPublic: boolean, isArchived: boolean, tags: Array<string>, owner: string | null, numLikes: number, numDownloads: number, numViews: number, numCommits: number, lastCommitHash: string | null, likedByAuthUser: boolean }> };

export type GetLangSmithPromptQueryVariables = Exact<{
  promptIdentifier: Scalars['String']['input'];
}>;


export type GetLangSmithPromptQuery = { __typename?: 'Query', langsmithPrompt: { __typename?: 'LangSmithPrompt', id: string, promptHandle: string, fullName: string, description: string | null, readme: string | null, tenantId: string, createdAt: string, updatedAt: string, isPublic: boolean, isArchived: boolean, tags: Array<string>, owner: string | null, numLikes: number, numDownloads: number, numViews: number, numCommits: number, lastCommitHash: string | null, likedByAuthUser: boolean } | null };

export type GetLangSmithPromptCommitQueryVariables = Exact<{
  promptIdentifier: Scalars['String']['input'];
  includeModel?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type GetLangSmithPromptCommitQuery = { __typename?: 'Query', langsmithPromptCommit: { __typename?: 'LangSmithPromptCommit', owner: string, promptName: string, commitHash: string, manifest: any, examples: Array<any> } | null };

export type CreateLangSmithPromptMutationVariables = Exact<{
  promptIdentifier: Scalars['String']['input'];
  input?: InputMaybe<CreateLangSmithPromptInput>;
}>;


export type CreateLangSmithPromptMutation = { __typename?: 'Mutation', createLangSmithPrompt: { __typename?: 'LangSmithPrompt', id: string, promptHandle: string, fullName: string, description: string | null, readme: string | null, tenantId: string, createdAt: string, updatedAt: string, isPublic: boolean, isArchived: boolean, tags: Array<string>, owner: string | null, numLikes: number, numDownloads: number, numViews: number, numCommits: number, lastCommitHash: string | null, likedByAuthUser: boolean } };

export type UpdateLangSmithPromptMutationVariables = Exact<{
  promptIdentifier: Scalars['String']['input'];
  input: UpdateLangSmithPromptInput;
}>;


export type UpdateLangSmithPromptMutation = { __typename?: 'Mutation', updateLangSmithPrompt: { __typename?: 'LangSmithPrompt', id: string, promptHandle: string, fullName: string, description: string | null, readme: string | null, tenantId: string, createdAt: string, updatedAt: string, isPublic: boolean, isArchived: boolean, tags: Array<string>, owner: string | null, numLikes: number, numDownloads: number, numViews: number, numCommits: number, lastCommitHash: string | null, likedByAuthUser: boolean } };

export type DeleteLangSmithPromptMutationVariables = Exact<{
  promptIdentifier: Scalars['String']['input'];
}>;


export type DeleteLangSmithPromptMutation = { __typename?: 'Mutation', deleteLangSmithPrompt: boolean };

export type PushLangSmithPromptMutationVariables = Exact<{
  promptIdentifier: Scalars['String']['input'];
  input?: InputMaybe<PushLangSmithPromptInput>;
}>;


export type PushLangSmithPromptMutation = { __typename?: 'Mutation', pushLangSmithPrompt: string };

export type GetPromptsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetPromptsQuery = { __typename?: 'Query', prompts: Array<{ __typename?: 'RegisteredPrompt', name: string, type: string, content: any | null, tags: Array<string>, labels: Array<string>, versions: Array<number>, lastUpdatedAt: string, lastConfig: any | null, usageCount: number | null, lastUsedBy: string | null }> };

export type GetMyPromptUsageQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetMyPromptUsageQuery = { __typename?: 'Query', myPromptUsage: Array<{ __typename?: 'PromptUsage', promptName: string, userEmail: string, version: number | null, label: string | null, usedAt: string, traceId: string | null }> };

export type CreatePromptMutationVariables = Exact<{
  input: CreatePromptInput;
}>;


export type CreatePromptMutation = { __typename?: 'Mutation', createPrompt: { __typename?: 'Prompt', name: string, version: number | null, type: PromptType, labels: Array<string> | null, tags: Array<string> | null, createdBy: string | null } };

export const EvidenceFieldsFragmentDoc = gql`
    fragment EvidenceFields on Evidence {
  source_type
  source_url
  crawl_id
  capture_timestamp
  observed_at
  method
  extractor_version
  http_status
  mime
  content_hash
  warc {
    filename
    offset
    length
    digest
  }
}
    `;
export const AtsBoardFieldsFragmentDoc = gql`
    fragment ATSBoardFields on ATSBoard {
  id
  company_id
  url
  vendor
  board_type
  confidence
  is_active
  first_seen_at
  last_seen_at
  evidence {
    ...EvidenceFields
  }
  created_at
  updated_at
}
    ${EvidenceFieldsFragmentDoc}`;
export const CompanyFactFieldsFragmentDoc = gql`
    fragment CompanyFactFields on CompanyFact {
  id
  company_id
  field
  value_json
  value_text
  normalized_value
  confidence
  evidence {
    ...EvidenceFields
  }
  created_at
}
    ${EvidenceFieldsFragmentDoc}`;
export const CompanySnapshotFieldsFragmentDoc = gql`
    fragment CompanySnapshotFields on CompanySnapshot {
  id
  company_id
  source_url
  crawl_id
  capture_timestamp
  fetched_at
  http_status
  mime
  content_hash
  text_sample
  jsonld
  extracted
  evidence {
    ...EvidenceFields
  }
  created_at
}
    ${EvidenceFieldsFragmentDoc}`;
export const CompanyFieldsFragmentDoc = gql`
    fragment CompanyFields on Company {
  id
  key
  name
  logo_url
  website
  description
  industry
  size
  location
  created_at
  updated_at
  canonical_domain
  category
  tags
  services
  service_taxonomy
  industries
  score
  score_reasons
  last_seen_crawl_id
  last_seen_capture_timestamp
  last_seen_source_url
  ats_boards {
    id
    url
    vendor
    board_type
    confidence
    is_active
    first_seen_at
    last_seen_at
  }
}
    `;
export const DeleteJobDocument = gql`
    mutation DeleteJob($id: Int!) {
  deleteJob(id: $id) {
    success
    message
  }
}
    `;
export type DeleteJobMutationFn = Apollo.MutationFunction<DeleteJobMutation, DeleteJobMutationVariables>;

/**
 * __useDeleteJobMutation__
 *
 * To run a mutation, you first call `useDeleteJobMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteJobMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteJobMutation, { data, loading, error }] = useDeleteJobMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteJobMutation(baseOptions?: Apollo.MutationHookOptions<DeleteJobMutation, DeleteJobMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteJobMutation, DeleteJobMutationVariables>(DeleteJobDocument, options);
      }
export type DeleteJobMutationHookResult = ReturnType<typeof useDeleteJobMutation>;
export type DeleteJobMutationResult = Apollo.MutationResult<DeleteJobMutation>;
export type DeleteJobMutationOptions = Apollo.BaseMutationOptions<DeleteJobMutation, DeleteJobMutationVariables>;
export const ExecuteSqlDocument = gql`
    query ExecuteSql($sql: String!) {
  executeSql(sql: $sql) {
    sql
    explanation
    columns
    rows
    drilldownSearchQuery
  }
}
    `;

/**
 * __useExecuteSqlQuery__
 *
 * To run a query within a React component, call `useExecuteSqlQuery` and pass it any options that fit your needs.
 * When your component renders, `useExecuteSqlQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useExecuteSqlQuery({
 *   variables: {
 *      sql: // value for 'sql'
 *   },
 * });
 */
export function useExecuteSqlQuery(baseOptions: Apollo.QueryHookOptions<ExecuteSqlQuery, ExecuteSqlQueryVariables> & ({ variables: ExecuteSqlQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ExecuteSqlQuery, ExecuteSqlQueryVariables>(ExecuteSqlDocument, options);
      }
export function useExecuteSqlLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ExecuteSqlQuery, ExecuteSqlQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ExecuteSqlQuery, ExecuteSqlQueryVariables>(ExecuteSqlDocument, options);
        }
// @ts-ignore
export function useExecuteSqlSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ExecuteSqlQuery, ExecuteSqlQueryVariables>): Apollo.UseSuspenseQueryResult<ExecuteSqlQuery, ExecuteSqlQueryVariables>;
export function useExecuteSqlSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ExecuteSqlQuery, ExecuteSqlQueryVariables>): Apollo.UseSuspenseQueryResult<ExecuteSqlQuery | undefined, ExecuteSqlQueryVariables>;
export function useExecuteSqlSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ExecuteSqlQuery, ExecuteSqlQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ExecuteSqlQuery, ExecuteSqlQueryVariables>(ExecuteSqlDocument, options);
        }
export type ExecuteSqlQueryHookResult = ReturnType<typeof useExecuteSqlQuery>;
export type ExecuteSqlLazyQueryHookResult = ReturnType<typeof useExecuteSqlLazyQuery>;
export type ExecuteSqlSuspenseQueryHookResult = ReturnType<typeof useExecuteSqlSuspenseQuery>;
export type ExecuteSqlQueryResult = Apollo.QueryResult<ExecuteSqlQuery, ExecuteSqlQueryVariables>;
export const GetJobDocument = gql`
    query GetJob($id: String!) {
  job(id: $id) {
    id
    external_id
    source_id
    source_kind
    company_id
    company_key
    company {
      ...CompanyFields
    }
    title
    location
    url
    description
    posted_at
    score
    score_reason
    status
    is_remote_eu
    remote_eu_confidence
    remote_eu_reason
    skills {
      tag
      level
      confidence
      evidence
    }
    absolute_url
    internal_job_id
    requisition_id
    company_name
    first_published
    language
    metadata {
      id
      name
      value
      value_type
    }
    departments {
      id
      name
      child_ids
      parent_id
    }
    offices {
      id
      name
      location
      child_ids
      parent_id
    }
    questions {
      description
      label
      required
      fields {
        type
        name
      }
    }
    location_questions {
      description
      label
      required
      fields {
        type
        name
      }
    }
    compliance {
      type
      description
      questions {
        description
        label
        required
        fields {
          type
          name
        }
      }
    }
    demographic_questions {
      header
      description
      questions {
        description
        label
        required
        fields {
          type
          name
        }
      }
    }
    data_compliance {
      type
      requires_consent
      requires_processing_consent
      requires_retention_consent
      retention_period
      demographic_data_consent_applies
    }
    created_at
    updated_at
  }
}
    ${CompanyFieldsFragmentDoc}`;

/**
 * __useGetJobQuery__
 *
 * To run a query within a React component, call `useGetJobQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetJobQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetJobQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetJobQuery(baseOptions: Apollo.QueryHookOptions<GetJobQuery, GetJobQueryVariables> & ({ variables: GetJobQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetJobQuery, GetJobQueryVariables>(GetJobDocument, options);
      }
export function useGetJobLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetJobQuery, GetJobQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetJobQuery, GetJobQueryVariables>(GetJobDocument, options);
        }
// @ts-ignore
export function useGetJobSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetJobQuery, GetJobQueryVariables>): Apollo.UseSuspenseQueryResult<GetJobQuery, GetJobQueryVariables>;
export function useGetJobSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetJobQuery, GetJobQueryVariables>): Apollo.UseSuspenseQueryResult<GetJobQuery | undefined, GetJobQueryVariables>;
export function useGetJobSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetJobQuery, GetJobQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetJobQuery, GetJobQueryVariables>(GetJobDocument, options);
        }
export type GetJobQueryHookResult = ReturnType<typeof useGetJobQuery>;
export type GetJobLazyQueryHookResult = ReturnType<typeof useGetJobLazyQuery>;
export type GetJobSuspenseQueryHookResult = ReturnType<typeof useGetJobSuspenseQuery>;
export type GetJobQueryResult = Apollo.QueryResult<GetJobQuery, GetJobQueryVariables>;
export const GetJobsDocument = gql`
    query GetJobs($sourceType: String, $status: String, $search: String, $limit: Int, $offset: Int, $excludedCompanies: [String!]) {
  jobs(
    sourceType: $sourceType
    status: $status
    search: $search
    limit: $limit
    offset: $offset
    excludedCompanies: $excludedCompanies
  ) {
    jobs {
      id
      external_id
      source_id
      source_kind
      company_id
      company_key
      company {
        ...CompanyFields
      }
      title
      location
      url
      description
      posted_at
      score
      score_reason
      status
      skills {
        tag
        level
      }
      created_at
      updated_at
    }
    totalCount
  }
}
    ${CompanyFieldsFragmentDoc}`;

/**
 * __useGetJobsQuery__
 *
 * To run a query within a React component, call `useGetJobsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetJobsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetJobsQuery({
 *   variables: {
 *      sourceType: // value for 'sourceType'
 *      status: // value for 'status'
 *      search: // value for 'search'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      excludedCompanies: // value for 'excludedCompanies'
 *   },
 * });
 */
export function useGetJobsQuery(baseOptions?: Apollo.QueryHookOptions<GetJobsQuery, GetJobsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetJobsQuery, GetJobsQueryVariables>(GetJobsDocument, options);
      }
export function useGetJobsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetJobsQuery, GetJobsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetJobsQuery, GetJobsQueryVariables>(GetJobsDocument, options);
        }
// @ts-ignore
export function useGetJobsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetJobsQuery, GetJobsQueryVariables>): Apollo.UseSuspenseQueryResult<GetJobsQuery, GetJobsQueryVariables>;
export function useGetJobsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetJobsQuery, GetJobsQueryVariables>): Apollo.UseSuspenseQueryResult<GetJobsQuery | undefined, GetJobsQueryVariables>;
export function useGetJobsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetJobsQuery, GetJobsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetJobsQuery, GetJobsQueryVariables>(GetJobsDocument, options);
        }
export type GetJobsQueryHookResult = ReturnType<typeof useGetJobsQuery>;
export type GetJobsLazyQueryHookResult = ReturnType<typeof useGetJobsLazyQuery>;
export type GetJobsSuspenseQueryHookResult = ReturnType<typeof useGetJobsSuspenseQuery>;
export type GetJobsQueryResult = Apollo.QueryResult<GetJobsQuery, GetJobsQueryVariables>;
export const GetUserSettingsDocument = gql`
    query GetUserSettings($userId: String!) {
  userSettings(userId: $userId) {
    id
    user_id
    preferred_locations
    preferred_skills
    excluded_companies
  }
}
    `;

/**
 * __useGetUserSettingsQuery__
 *
 * To run a query within a React component, call `useGetUserSettingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserSettingsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserSettingsQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useGetUserSettingsQuery(baseOptions: Apollo.QueryHookOptions<GetUserSettingsQuery, GetUserSettingsQueryVariables> & ({ variables: GetUserSettingsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetUserSettingsQuery, GetUserSettingsQueryVariables>(GetUserSettingsDocument, options);
      }
export function useGetUserSettingsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetUserSettingsQuery, GetUserSettingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetUserSettingsQuery, GetUserSettingsQueryVariables>(GetUserSettingsDocument, options);
        }
// @ts-ignore
export function useGetUserSettingsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetUserSettingsQuery, GetUserSettingsQueryVariables>): Apollo.UseSuspenseQueryResult<GetUserSettingsQuery, GetUserSettingsQueryVariables>;
export function useGetUserSettingsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetUserSettingsQuery, GetUserSettingsQueryVariables>): Apollo.UseSuspenseQueryResult<GetUserSettingsQuery | undefined, GetUserSettingsQueryVariables>;
export function useGetUserSettingsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetUserSettingsQuery, GetUserSettingsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetUserSettingsQuery, GetUserSettingsQueryVariables>(GetUserSettingsDocument, options);
        }
export type GetUserSettingsQueryHookResult = ReturnType<typeof useGetUserSettingsQuery>;
export type GetUserSettingsLazyQueryHookResult = ReturnType<typeof useGetUserSettingsLazyQuery>;
export type GetUserSettingsSuspenseQueryHookResult = ReturnType<typeof useGetUserSettingsSuspenseQuery>;
export type GetUserSettingsQueryResult = Apollo.QueryResult<GetUserSettingsQuery, GetUserSettingsQueryVariables>;
export const TextToSqlDocument = gql`
    query TextToSql($question: String!) {
  textToSql(question: $question) {
    sql
    explanation
    columns
    rows
    drilldownSearchQuery
  }
}
    `;

/**
 * __useTextToSqlQuery__
 *
 * To run a query within a React component, call `useTextToSqlQuery` and pass it any options that fit your needs.
 * When your component renders, `useTextToSqlQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTextToSqlQuery({
 *   variables: {
 *      question: // value for 'question'
 *   },
 * });
 */
export function useTextToSqlQuery(baseOptions: Apollo.QueryHookOptions<TextToSqlQuery, TextToSqlQueryVariables> & ({ variables: TextToSqlQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TextToSqlQuery, TextToSqlQueryVariables>(TextToSqlDocument, options);
      }
export function useTextToSqlLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TextToSqlQuery, TextToSqlQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TextToSqlQuery, TextToSqlQueryVariables>(TextToSqlDocument, options);
        }
// @ts-ignore
export function useTextToSqlSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TextToSqlQuery, TextToSqlQueryVariables>): Apollo.UseSuspenseQueryResult<TextToSqlQuery, TextToSqlQueryVariables>;
export function useTextToSqlSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TextToSqlQuery, TextToSqlQueryVariables>): Apollo.UseSuspenseQueryResult<TextToSqlQuery | undefined, TextToSqlQueryVariables>;
export function useTextToSqlSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TextToSqlQuery, TextToSqlQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TextToSqlQuery, TextToSqlQueryVariables>(TextToSqlDocument, options);
        }
export type TextToSqlQueryHookResult = ReturnType<typeof useTextToSqlQuery>;
export type TextToSqlLazyQueryHookResult = ReturnType<typeof useTextToSqlLazyQuery>;
export type TextToSqlSuspenseQueryHookResult = ReturnType<typeof useTextToSqlSuspenseQuery>;
export type TextToSqlQueryResult = Apollo.QueryResult<TextToSqlQuery, TextToSqlQueryVariables>;
export const UpdateUserSettingsDocument = gql`
    mutation UpdateUserSettings($userId: String!, $settings: UserSettingsInput!) {
  updateUserSettings(userId: $userId, settings: $settings) {
    id
    user_id
    email_notifications
    daily_digest
    new_job_alerts
    preferred_locations
    preferred_skills
    excluded_companies
    dark_mode
    jobs_per_page
    created_at
    updated_at
  }
}
    `;
export type UpdateUserSettingsMutationFn = Apollo.MutationFunction<UpdateUserSettingsMutation, UpdateUserSettingsMutationVariables>;

/**
 * __useUpdateUserSettingsMutation__
 *
 * To run a mutation, you first call `useUpdateUserSettingsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateUserSettingsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateUserSettingsMutation, { data, loading, error }] = useUpdateUserSettingsMutation({
 *   variables: {
 *      userId: // value for 'userId'
 *      settings: // value for 'settings'
 *   },
 * });
 */
export function useUpdateUserSettingsMutation(baseOptions?: Apollo.MutationHookOptions<UpdateUserSettingsMutation, UpdateUserSettingsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateUserSettingsMutation, UpdateUserSettingsMutationVariables>(UpdateUserSettingsDocument, options);
      }
export type UpdateUserSettingsMutationHookResult = ReturnType<typeof useUpdateUserSettingsMutation>;
export type UpdateUserSettingsMutationResult = Apollo.MutationResult<UpdateUserSettingsMutation>;
export type UpdateUserSettingsMutationOptions = Apollo.BaseMutationOptions<UpdateUserSettingsMutation, UpdateUserSettingsMutationVariables>;
export const GetApplicationsDocument = gql`
    query GetApplications {
  applications {
    email
    jobId
    resume
    questions {
      questionId
      questionText
      answerText
    }
  }
}
    `;

/**
 * __useGetApplicationsQuery__
 *
 * To run a query within a React component, call `useGetApplicationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetApplicationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetApplicationsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetApplicationsQuery(baseOptions?: Apollo.QueryHookOptions<GetApplicationsQuery, GetApplicationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetApplicationsQuery, GetApplicationsQueryVariables>(GetApplicationsDocument, options);
      }
export function useGetApplicationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetApplicationsQuery, GetApplicationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetApplicationsQuery, GetApplicationsQueryVariables>(GetApplicationsDocument, options);
        }
// @ts-ignore
export function useGetApplicationsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetApplicationsQuery, GetApplicationsQueryVariables>): Apollo.UseSuspenseQueryResult<GetApplicationsQuery, GetApplicationsQueryVariables>;
export function useGetApplicationsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetApplicationsQuery, GetApplicationsQueryVariables>): Apollo.UseSuspenseQueryResult<GetApplicationsQuery | undefined, GetApplicationsQueryVariables>;
export function useGetApplicationsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetApplicationsQuery, GetApplicationsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetApplicationsQuery, GetApplicationsQueryVariables>(GetApplicationsDocument, options);
        }
export type GetApplicationsQueryHookResult = ReturnType<typeof useGetApplicationsQuery>;
export type GetApplicationsLazyQueryHookResult = ReturnType<typeof useGetApplicationsLazyQuery>;
export type GetApplicationsSuspenseQueryHookResult = ReturnType<typeof useGetApplicationsSuspenseQuery>;
export type GetApplicationsQueryResult = Apollo.QueryResult<GetApplicationsQuery, GetApplicationsQueryVariables>;
export const CreateApplicationDocument = gql`
    mutation CreateApplication($input: ApplicationInput!) {
  createApplication(input: $input) {
    email
    jobId
    questions {
      questionId
      questionText
      answerText
    }
  }
}
    `;
export type CreateApplicationMutationFn = Apollo.MutationFunction<CreateApplicationMutation, CreateApplicationMutationVariables>;

/**
 * __useCreateApplicationMutation__
 *
 * To run a mutation, you first call `useCreateApplicationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateApplicationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createApplicationMutation, { data, loading, error }] = useCreateApplicationMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateApplicationMutation(baseOptions?: Apollo.MutationHookOptions<CreateApplicationMutation, CreateApplicationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateApplicationMutation, CreateApplicationMutationVariables>(CreateApplicationDocument, options);
      }
export type CreateApplicationMutationHookResult = ReturnType<typeof useCreateApplicationMutation>;
export type CreateApplicationMutationResult = Apollo.MutationResult<CreateApplicationMutation>;
export type CreateApplicationMutationOptions = Apollo.BaseMutationOptions<CreateApplicationMutation, CreateApplicationMutationVariables>;
export const CreateCompanyDocument = gql`
    mutation CreateCompany($input: CreateCompanyInput!) {
  createCompany(input: $input) {
    ...CompanyFields
  }
}
    ${CompanyFieldsFragmentDoc}`;
export type CreateCompanyMutationFn = Apollo.MutationFunction<CreateCompanyMutation, CreateCompanyMutationVariables>;

/**
 * __useCreateCompanyMutation__
 *
 * To run a mutation, you first call `useCreateCompanyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateCompanyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createCompanyMutation, { data, loading, error }] = useCreateCompanyMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateCompanyMutation(baseOptions?: Apollo.MutationHookOptions<CreateCompanyMutation, CreateCompanyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateCompanyMutation, CreateCompanyMutationVariables>(CreateCompanyDocument, options);
      }
export type CreateCompanyMutationHookResult = ReturnType<typeof useCreateCompanyMutation>;
export type CreateCompanyMutationResult = Apollo.MutationResult<CreateCompanyMutation>;
export type CreateCompanyMutationOptions = Apollo.BaseMutationOptions<CreateCompanyMutation, CreateCompanyMutationVariables>;
export const UpdateCompanyDocument = gql`
    mutation UpdateCompany($id: Int!, $input: UpdateCompanyInput!) {
  updateCompany(id: $id, input: $input) {
    ...CompanyFields
  }
}
    ${CompanyFieldsFragmentDoc}`;
export type UpdateCompanyMutationFn = Apollo.MutationFunction<UpdateCompanyMutation, UpdateCompanyMutationVariables>;

/**
 * __useUpdateCompanyMutation__
 *
 * To run a mutation, you first call `useUpdateCompanyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateCompanyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateCompanyMutation, { data, loading, error }] = useUpdateCompanyMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateCompanyMutation(baseOptions?: Apollo.MutationHookOptions<UpdateCompanyMutation, UpdateCompanyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateCompanyMutation, UpdateCompanyMutationVariables>(UpdateCompanyDocument, options);
      }
export type UpdateCompanyMutationHookResult = ReturnType<typeof useUpdateCompanyMutation>;
export type UpdateCompanyMutationResult = Apollo.MutationResult<UpdateCompanyMutation>;
export type UpdateCompanyMutationOptions = Apollo.BaseMutationOptions<UpdateCompanyMutation, UpdateCompanyMutationVariables>;
export const DeleteCompanyDocument = gql`
    mutation DeleteCompany($id: Int!) {
  deleteCompany(id: $id) {
    success
    message
  }
}
    `;
export type DeleteCompanyMutationFn = Apollo.MutationFunction<DeleteCompanyMutation, DeleteCompanyMutationVariables>;

/**
 * __useDeleteCompanyMutation__
 *
 * To run a mutation, you first call `useDeleteCompanyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteCompanyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteCompanyMutation, { data, loading, error }] = useDeleteCompanyMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteCompanyMutation(baseOptions?: Apollo.MutationHookOptions<DeleteCompanyMutation, DeleteCompanyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteCompanyMutation, DeleteCompanyMutationVariables>(DeleteCompanyDocument, options);
      }
export type DeleteCompanyMutationHookResult = ReturnType<typeof useDeleteCompanyMutation>;
export type DeleteCompanyMutationResult = Apollo.MutationResult<DeleteCompanyMutation>;
export type DeleteCompanyMutationOptions = Apollo.BaseMutationOptions<DeleteCompanyMutation, DeleteCompanyMutationVariables>;
export const EnhanceCompanyDocument = gql`
    mutation EnhanceCompany($id: Int, $key: String) {
  enhanceCompany(id: $id, key: $key) {
    success
    message
    companyId
    companyKey
  }
}
    `;
export type EnhanceCompanyMutationFn = Apollo.MutationFunction<EnhanceCompanyMutation, EnhanceCompanyMutationVariables>;

/**
 * __useEnhanceCompanyMutation__
 *
 * To run a mutation, you first call `useEnhanceCompanyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEnhanceCompanyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [enhanceCompanyMutation, { data, loading, error }] = useEnhanceCompanyMutation({
 *   variables: {
 *      id: // value for 'id'
 *      key: // value for 'key'
 *   },
 * });
 */
export function useEnhanceCompanyMutation(baseOptions?: Apollo.MutationHookOptions<EnhanceCompanyMutation, EnhanceCompanyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<EnhanceCompanyMutation, EnhanceCompanyMutationVariables>(EnhanceCompanyDocument, options);
      }
export type EnhanceCompanyMutationHookResult = ReturnType<typeof useEnhanceCompanyMutation>;
export type EnhanceCompanyMutationResult = Apollo.MutationResult<EnhanceCompanyMutation>;
export type EnhanceCompanyMutationOptions = Apollo.BaseMutationOptions<EnhanceCompanyMutation, EnhanceCompanyMutationVariables>;
export const AddCompanyFactsDocument = gql`
    mutation AddCompanyFacts($company_id: Int!, $facts: [CompanyFactInput!]!) {
  add_company_facts(company_id: $company_id, facts: $facts) {
    ...CompanyFactFields
  }
}
    ${CompanyFactFieldsFragmentDoc}`;
export type AddCompanyFactsMutationFn = Apollo.MutationFunction<AddCompanyFactsMutation, AddCompanyFactsMutationVariables>;

/**
 * __useAddCompanyFactsMutation__
 *
 * To run a mutation, you first call `useAddCompanyFactsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddCompanyFactsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addCompanyFactsMutation, { data, loading, error }] = useAddCompanyFactsMutation({
 *   variables: {
 *      company_id: // value for 'company_id'
 *      facts: // value for 'facts'
 *   },
 * });
 */
export function useAddCompanyFactsMutation(baseOptions?: Apollo.MutationHookOptions<AddCompanyFactsMutation, AddCompanyFactsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddCompanyFactsMutation, AddCompanyFactsMutationVariables>(AddCompanyFactsDocument, options);
      }
export type AddCompanyFactsMutationHookResult = ReturnType<typeof useAddCompanyFactsMutation>;
export type AddCompanyFactsMutationResult = Apollo.MutationResult<AddCompanyFactsMutation>;
export type AddCompanyFactsMutationOptions = Apollo.BaseMutationOptions<AddCompanyFactsMutation, AddCompanyFactsMutationVariables>;
export const UpsertCompanyAtsBoardsDocument = gql`
    mutation UpsertCompanyATSBoards($company_id: Int!, $boards: [ATSBoardUpsertInput!]!) {
  upsert_company_ats_boards(company_id: $company_id, boards: $boards) {
    ...ATSBoardFields
  }
}
    ${AtsBoardFieldsFragmentDoc}`;
export type UpsertCompanyAtsBoardsMutationFn = Apollo.MutationFunction<UpsertCompanyAtsBoardsMutation, UpsertCompanyAtsBoardsMutationVariables>;

/**
 * __useUpsertCompanyAtsBoardsMutation__
 *
 * To run a mutation, you first call `useUpsertCompanyAtsBoardsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpsertCompanyAtsBoardsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [upsertCompanyAtsBoardsMutation, { data, loading, error }] = useUpsertCompanyAtsBoardsMutation({
 *   variables: {
 *      company_id: // value for 'company_id'
 *      boards: // value for 'boards'
 *   },
 * });
 */
export function useUpsertCompanyAtsBoardsMutation(baseOptions?: Apollo.MutationHookOptions<UpsertCompanyAtsBoardsMutation, UpsertCompanyAtsBoardsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpsertCompanyAtsBoardsMutation, UpsertCompanyAtsBoardsMutationVariables>(UpsertCompanyAtsBoardsDocument, options);
      }
export type UpsertCompanyAtsBoardsMutationHookResult = ReturnType<typeof useUpsertCompanyAtsBoardsMutation>;
export type UpsertCompanyAtsBoardsMutationResult = Apollo.MutationResult<UpsertCompanyAtsBoardsMutation>;
export type UpsertCompanyAtsBoardsMutationOptions = Apollo.BaseMutationOptions<UpsertCompanyAtsBoardsMutation, UpsertCompanyAtsBoardsMutationVariables>;
export const IngestCompanySnapshotDocument = gql`
    mutation IngestCompanySnapshot($company_id: Int!, $source_url: String!, $crawl_id: String, $capture_timestamp: String, $fetched_at: String!, $http_status: Int, $mime: String, $content_hash: String, $text_sample: String, $jsonld: JSON, $extracted: JSON, $evidence: EvidenceInput!) {
  ingest_company_snapshot(
    company_id: $company_id
    source_url: $source_url
    crawl_id: $crawl_id
    capture_timestamp: $capture_timestamp
    fetched_at: $fetched_at
    http_status: $http_status
    mime: $mime
    content_hash: $content_hash
    text_sample: $text_sample
    jsonld: $jsonld
    extracted: $extracted
    evidence: $evidence
  ) {
    ...CompanySnapshotFields
  }
}
    ${CompanySnapshotFieldsFragmentDoc}`;
export type IngestCompanySnapshotMutationFn = Apollo.MutationFunction<IngestCompanySnapshotMutation, IngestCompanySnapshotMutationVariables>;

/**
 * __useIngestCompanySnapshotMutation__
 *
 * To run a mutation, you first call `useIngestCompanySnapshotMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useIngestCompanySnapshotMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [ingestCompanySnapshotMutation, { data, loading, error }] = useIngestCompanySnapshotMutation({
 *   variables: {
 *      company_id: // value for 'company_id'
 *      source_url: // value for 'source_url'
 *      crawl_id: // value for 'crawl_id'
 *      capture_timestamp: // value for 'capture_timestamp'
 *      fetched_at: // value for 'fetched_at'
 *      http_status: // value for 'http_status'
 *      mime: // value for 'mime'
 *      content_hash: // value for 'content_hash'
 *      text_sample: // value for 'text_sample'
 *      jsonld: // value for 'jsonld'
 *      extracted: // value for 'extracted'
 *      evidence: // value for 'evidence'
 *   },
 * });
 */
export function useIngestCompanySnapshotMutation(baseOptions?: Apollo.MutationHookOptions<IngestCompanySnapshotMutation, IngestCompanySnapshotMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<IngestCompanySnapshotMutation, IngestCompanySnapshotMutationVariables>(IngestCompanySnapshotDocument, options);
      }
export type IngestCompanySnapshotMutationHookResult = ReturnType<typeof useIngestCompanySnapshotMutation>;
export type IngestCompanySnapshotMutationResult = Apollo.MutationResult<IngestCompanySnapshotMutation>;
export type IngestCompanySnapshotMutationOptions = Apollo.BaseMutationOptions<IngestCompanySnapshotMutation, IngestCompanySnapshotMutationVariables>;
export const GetCompanyDocument = gql`
    query GetCompany($id: Int, $key: String) {
  company(id: $id, key: $key) {
    ...CompanyFields
  }
}
    ${CompanyFieldsFragmentDoc}`;

/**
 * __useGetCompanyQuery__
 *
 * To run a query within a React component, call `useGetCompanyQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCompanyQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCompanyQuery({
 *   variables: {
 *      id: // value for 'id'
 *      key: // value for 'key'
 *   },
 * });
 */
export function useGetCompanyQuery(baseOptions?: Apollo.QueryHookOptions<GetCompanyQuery, GetCompanyQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetCompanyQuery, GetCompanyQueryVariables>(GetCompanyDocument, options);
      }
export function useGetCompanyLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetCompanyQuery, GetCompanyQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetCompanyQuery, GetCompanyQueryVariables>(GetCompanyDocument, options);
        }
// @ts-ignore
export function useGetCompanySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetCompanyQuery, GetCompanyQueryVariables>): Apollo.UseSuspenseQueryResult<GetCompanyQuery, GetCompanyQueryVariables>;
export function useGetCompanySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCompanyQuery, GetCompanyQueryVariables>): Apollo.UseSuspenseQueryResult<GetCompanyQuery | undefined, GetCompanyQueryVariables>;
export function useGetCompanySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCompanyQuery, GetCompanyQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetCompanyQuery, GetCompanyQueryVariables>(GetCompanyDocument, options);
        }
export type GetCompanyQueryHookResult = ReturnType<typeof useGetCompanyQuery>;
export type GetCompanyLazyQueryHookResult = ReturnType<typeof useGetCompanyLazyQuery>;
export type GetCompanySuspenseQueryHookResult = ReturnType<typeof useGetCompanySuspenseQuery>;
export type GetCompanyQueryResult = Apollo.QueryResult<GetCompanyQuery, GetCompanyQueryVariables>;
export const GetCompaniesDocument = gql`
    query GetCompanies($text: String, $limit: Int, $offset: Int) {
  companies(filter: {text: $text}, limit: $limit, offset: $offset) {
    companies {
      ...CompanyFields
    }
    totalCount
  }
}
    ${CompanyFieldsFragmentDoc}`;

/**
 * __useGetCompaniesQuery__
 *
 * To run a query within a React component, call `useGetCompaniesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCompaniesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCompaniesQuery({
 *   variables: {
 *      text: // value for 'text'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetCompaniesQuery(baseOptions?: Apollo.QueryHookOptions<GetCompaniesQuery, GetCompaniesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetCompaniesQuery, GetCompaniesQueryVariables>(GetCompaniesDocument, options);
      }
export function useGetCompaniesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetCompaniesQuery, GetCompaniesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetCompaniesQuery, GetCompaniesQueryVariables>(GetCompaniesDocument, options);
        }
// @ts-ignore
export function useGetCompaniesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetCompaniesQuery, GetCompaniesQueryVariables>): Apollo.UseSuspenseQueryResult<GetCompaniesQuery, GetCompaniesQueryVariables>;
export function useGetCompaniesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCompaniesQuery, GetCompaniesQueryVariables>): Apollo.UseSuspenseQueryResult<GetCompaniesQuery | undefined, GetCompaniesQueryVariables>;
export function useGetCompaniesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCompaniesQuery, GetCompaniesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetCompaniesQuery, GetCompaniesQueryVariables>(GetCompaniesDocument, options);
        }
export type GetCompaniesQueryHookResult = ReturnType<typeof useGetCompaniesQuery>;
export type GetCompaniesLazyQueryHookResult = ReturnType<typeof useGetCompaniesLazyQuery>;
export type GetCompaniesSuspenseQueryHookResult = ReturnType<typeof useGetCompaniesSuspenseQuery>;
export type GetCompaniesQueryResult = Apollo.QueryResult<GetCompaniesQuery, GetCompaniesQueryVariables>;
export const SearchCompaniesDocument = gql`
    query SearchCompanies($filter: CompanyFilterInput!, $order_by: CompanyOrderBy, $limit: Int, $offset: Int) {
  companies(filter: $filter, order_by: $order_by, limit: $limit, offset: $offset) {
    companies {
      ...CompanyFields
    }
    totalCount
  }
}
    ${CompanyFieldsFragmentDoc}`;

/**
 * __useSearchCompaniesQuery__
 *
 * To run a query within a React component, call `useSearchCompaniesQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchCompaniesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchCompaniesQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      order_by: // value for 'order_by'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useSearchCompaniesQuery(baseOptions: Apollo.QueryHookOptions<SearchCompaniesQuery, SearchCompaniesQueryVariables> & ({ variables: SearchCompaniesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchCompaniesQuery, SearchCompaniesQueryVariables>(SearchCompaniesDocument, options);
      }
export function useSearchCompaniesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchCompaniesQuery, SearchCompaniesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchCompaniesQuery, SearchCompaniesQueryVariables>(SearchCompaniesDocument, options);
        }
// @ts-ignore
export function useSearchCompaniesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<SearchCompaniesQuery, SearchCompaniesQueryVariables>): Apollo.UseSuspenseQueryResult<SearchCompaniesQuery, SearchCompaniesQueryVariables>;
export function useSearchCompaniesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SearchCompaniesQuery, SearchCompaniesQueryVariables>): Apollo.UseSuspenseQueryResult<SearchCompaniesQuery | undefined, SearchCompaniesQueryVariables>;
export function useSearchCompaniesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SearchCompaniesQuery, SearchCompaniesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SearchCompaniesQuery, SearchCompaniesQueryVariables>(SearchCompaniesDocument, options);
        }
export type SearchCompaniesQueryHookResult = ReturnType<typeof useSearchCompaniesQuery>;
export type SearchCompaniesLazyQueryHookResult = ReturnType<typeof useSearchCompaniesLazyQuery>;
export type SearchCompaniesSuspenseQueryHookResult = ReturnType<typeof useSearchCompaniesSuspenseQuery>;
export type SearchCompaniesQueryResult = Apollo.QueryResult<SearchCompaniesQuery, SearchCompaniesQueryVariables>;
export const GetCompanyFactsDocument = gql`
    query GetCompanyFacts($company_id: Int!, $field: String, $limit: Int, $offset: Int) {
  company_facts(
    company_id: $company_id
    field: $field
    limit: $limit
    offset: $offset
  ) {
    ...CompanyFactFields
  }
}
    ${CompanyFactFieldsFragmentDoc}`;

/**
 * __useGetCompanyFactsQuery__
 *
 * To run a query within a React component, call `useGetCompanyFactsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCompanyFactsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCompanyFactsQuery({
 *   variables: {
 *      company_id: // value for 'company_id'
 *      field: // value for 'field'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetCompanyFactsQuery(baseOptions: Apollo.QueryHookOptions<GetCompanyFactsQuery, GetCompanyFactsQueryVariables> & ({ variables: GetCompanyFactsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetCompanyFactsQuery, GetCompanyFactsQueryVariables>(GetCompanyFactsDocument, options);
      }
export function useGetCompanyFactsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetCompanyFactsQuery, GetCompanyFactsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetCompanyFactsQuery, GetCompanyFactsQueryVariables>(GetCompanyFactsDocument, options);
        }
// @ts-ignore
export function useGetCompanyFactsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetCompanyFactsQuery, GetCompanyFactsQueryVariables>): Apollo.UseSuspenseQueryResult<GetCompanyFactsQuery, GetCompanyFactsQueryVariables>;
export function useGetCompanyFactsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCompanyFactsQuery, GetCompanyFactsQueryVariables>): Apollo.UseSuspenseQueryResult<GetCompanyFactsQuery | undefined, GetCompanyFactsQueryVariables>;
export function useGetCompanyFactsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCompanyFactsQuery, GetCompanyFactsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetCompanyFactsQuery, GetCompanyFactsQueryVariables>(GetCompanyFactsDocument, options);
        }
export type GetCompanyFactsQueryHookResult = ReturnType<typeof useGetCompanyFactsQuery>;
export type GetCompanyFactsLazyQueryHookResult = ReturnType<typeof useGetCompanyFactsLazyQuery>;
export type GetCompanyFactsSuspenseQueryHookResult = ReturnType<typeof useGetCompanyFactsSuspenseQuery>;
export type GetCompanyFactsQueryResult = Apollo.QueryResult<GetCompanyFactsQuery, GetCompanyFactsQueryVariables>;
export const GetCompanyAtsBoardsDocument = gql`
    query GetCompanyATSBoards($company_id: Int!) {
  company_ats_boards(company_id: $company_id) {
    ...ATSBoardFields
  }
}
    ${AtsBoardFieldsFragmentDoc}`;

/**
 * __useGetCompanyAtsBoardsQuery__
 *
 * To run a query within a React component, call `useGetCompanyAtsBoardsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCompanyAtsBoardsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCompanyAtsBoardsQuery({
 *   variables: {
 *      company_id: // value for 'company_id'
 *   },
 * });
 */
export function useGetCompanyAtsBoardsQuery(baseOptions: Apollo.QueryHookOptions<GetCompanyAtsBoardsQuery, GetCompanyAtsBoardsQueryVariables> & ({ variables: GetCompanyAtsBoardsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetCompanyAtsBoardsQuery, GetCompanyAtsBoardsQueryVariables>(GetCompanyAtsBoardsDocument, options);
      }
export function useGetCompanyAtsBoardsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetCompanyAtsBoardsQuery, GetCompanyAtsBoardsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetCompanyAtsBoardsQuery, GetCompanyAtsBoardsQueryVariables>(GetCompanyAtsBoardsDocument, options);
        }
// @ts-ignore
export function useGetCompanyAtsBoardsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetCompanyAtsBoardsQuery, GetCompanyAtsBoardsQueryVariables>): Apollo.UseSuspenseQueryResult<GetCompanyAtsBoardsQuery, GetCompanyAtsBoardsQueryVariables>;
export function useGetCompanyAtsBoardsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCompanyAtsBoardsQuery, GetCompanyAtsBoardsQueryVariables>): Apollo.UseSuspenseQueryResult<GetCompanyAtsBoardsQuery | undefined, GetCompanyAtsBoardsQueryVariables>;
export function useGetCompanyAtsBoardsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCompanyAtsBoardsQuery, GetCompanyAtsBoardsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetCompanyAtsBoardsQuery, GetCompanyAtsBoardsQueryVariables>(GetCompanyAtsBoardsDocument, options);
        }
export type GetCompanyAtsBoardsQueryHookResult = ReturnType<typeof useGetCompanyAtsBoardsQuery>;
export type GetCompanyAtsBoardsLazyQueryHookResult = ReturnType<typeof useGetCompanyAtsBoardsLazyQuery>;
export type GetCompanyAtsBoardsSuspenseQueryHookResult = ReturnType<typeof useGetCompanyAtsBoardsSuspenseQuery>;
export type GetCompanyAtsBoardsQueryResult = Apollo.QueryResult<GetCompanyAtsBoardsQuery, GetCompanyAtsBoardsQueryVariables>;
export const CompanyAuditDocument = gql`
    query CompanyAudit($key: String!) {
  company(key: $key) {
    ...CompanyFields
    facts(limit: 200) {
      ...CompanyFactFields
    }
    facts_count
    snapshots(limit: 10) {
      ...CompanySnapshotFields
    }
    snapshots_count
  }
}
    ${CompanyFieldsFragmentDoc}
${CompanyFactFieldsFragmentDoc}
${CompanySnapshotFieldsFragmentDoc}`;

/**
 * __useCompanyAuditQuery__
 *
 * To run a query within a React component, call `useCompanyAuditQuery` and pass it any options that fit your needs.
 * When your component renders, `useCompanyAuditQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCompanyAuditQuery({
 *   variables: {
 *      key: // value for 'key'
 *   },
 * });
 */
export function useCompanyAuditQuery(baseOptions: Apollo.QueryHookOptions<CompanyAuditQuery, CompanyAuditQueryVariables> & ({ variables: CompanyAuditQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CompanyAuditQuery, CompanyAuditQueryVariables>(CompanyAuditDocument, options);
      }
export function useCompanyAuditLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CompanyAuditQuery, CompanyAuditQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CompanyAuditQuery, CompanyAuditQueryVariables>(CompanyAuditDocument, options);
        }
// @ts-ignore
export function useCompanyAuditSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<CompanyAuditQuery, CompanyAuditQueryVariables>): Apollo.UseSuspenseQueryResult<CompanyAuditQuery, CompanyAuditQueryVariables>;
export function useCompanyAuditSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CompanyAuditQuery, CompanyAuditQueryVariables>): Apollo.UseSuspenseQueryResult<CompanyAuditQuery | undefined, CompanyAuditQueryVariables>;
export function useCompanyAuditSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CompanyAuditQuery, CompanyAuditQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CompanyAuditQuery, CompanyAuditQueryVariables>(CompanyAuditDocument, options);
        }
export type CompanyAuditQueryHookResult = ReturnType<typeof useCompanyAuditQuery>;
export type CompanyAuditLazyQueryHookResult = ReturnType<typeof useCompanyAuditLazyQuery>;
export type CompanyAuditSuspenseQueryHookResult = ReturnType<typeof useCompanyAuditSuspenseQuery>;
export type CompanyAuditQueryResult = Apollo.QueryResult<CompanyAuditQuery, CompanyAuditQueryVariables>;
export const GetGreenhouseJobsDocument = gql`
    query GetGreenhouseJobs($search: String, $limit: Int, $offset: Int) {
  jobs(sourceType: "greenhouse", search: $search, limit: $limit, offset: $offset) {
    jobs {
      id
      external_id
      source_id
      source_kind
      company_id
      company_key
      company {
        ...CompanyFields
      }
      title
      location
      url
      description
      posted_at
      score
      score_reason
      status
      is_remote_eu
      remote_eu_confidence
      remote_eu_reason
      skills {
        tag
        level
        confidence
        evidence
      }
      created_at
      updated_at
    }
    totalCount
  }
}
    ${CompanyFieldsFragmentDoc}`;

/**
 * __useGetGreenhouseJobsQuery__
 *
 * To run a query within a React component, call `useGetGreenhouseJobsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetGreenhouseJobsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetGreenhouseJobsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetGreenhouseJobsQuery(baseOptions?: Apollo.QueryHookOptions<GetGreenhouseJobsQuery, GetGreenhouseJobsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetGreenhouseJobsQuery, GetGreenhouseJobsQueryVariables>(GetGreenhouseJobsDocument, options);
      }
export function useGetGreenhouseJobsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetGreenhouseJobsQuery, GetGreenhouseJobsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetGreenhouseJobsQuery, GetGreenhouseJobsQueryVariables>(GetGreenhouseJobsDocument, options);
        }
// @ts-ignore
export function useGetGreenhouseJobsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetGreenhouseJobsQuery, GetGreenhouseJobsQueryVariables>): Apollo.UseSuspenseQueryResult<GetGreenhouseJobsQuery, GetGreenhouseJobsQueryVariables>;
export function useGetGreenhouseJobsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGreenhouseJobsQuery, GetGreenhouseJobsQueryVariables>): Apollo.UseSuspenseQueryResult<GetGreenhouseJobsQuery | undefined, GetGreenhouseJobsQueryVariables>;
export function useGetGreenhouseJobsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGreenhouseJobsQuery, GetGreenhouseJobsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetGreenhouseJobsQuery, GetGreenhouseJobsQueryVariables>(GetGreenhouseJobsDocument, options);
        }
export type GetGreenhouseJobsQueryHookResult = ReturnType<typeof useGetGreenhouseJobsQuery>;
export type GetGreenhouseJobsLazyQueryHookResult = ReturnType<typeof useGetGreenhouseJobsLazyQuery>;
export type GetGreenhouseJobsSuspenseQueryHookResult = ReturnType<typeof useGetGreenhouseJobsSuspenseQuery>;
export type GetGreenhouseJobsQueryResult = Apollo.QueryResult<GetGreenhouseJobsQuery, GetGreenhouseJobsQueryVariables>;
export const GetGreenhouseJobByIdDocument = gql`
    query GetGreenhouseJobById($id: String!) {
  job(id: $id) {
    id
    external_id
    source_id
    source_kind
    company_id
    company_key
    company {
      ...CompanyFields
    }
    title
    location
    url
    description
    posted_at
    score
    score_reason
    status
    is_remote_eu
    remote_eu_confidence
    remote_eu_reason
    skills {
      tag
      level
      confidence
      evidence
    }
    created_at
    updated_at
  }
}
    ${CompanyFieldsFragmentDoc}`;

/**
 * __useGetGreenhouseJobByIdQuery__
 *
 * To run a query within a React component, call `useGetGreenhouseJobByIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetGreenhouseJobByIdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetGreenhouseJobByIdQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetGreenhouseJobByIdQuery(baseOptions: Apollo.QueryHookOptions<GetGreenhouseJobByIdQuery, GetGreenhouseJobByIdQueryVariables> & ({ variables: GetGreenhouseJobByIdQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetGreenhouseJobByIdQuery, GetGreenhouseJobByIdQueryVariables>(GetGreenhouseJobByIdDocument, options);
      }
export function useGetGreenhouseJobByIdLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetGreenhouseJobByIdQuery, GetGreenhouseJobByIdQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetGreenhouseJobByIdQuery, GetGreenhouseJobByIdQueryVariables>(GetGreenhouseJobByIdDocument, options);
        }
// @ts-ignore
export function useGetGreenhouseJobByIdSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetGreenhouseJobByIdQuery, GetGreenhouseJobByIdQueryVariables>): Apollo.UseSuspenseQueryResult<GetGreenhouseJobByIdQuery, GetGreenhouseJobByIdQueryVariables>;
export function useGetGreenhouseJobByIdSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGreenhouseJobByIdQuery, GetGreenhouseJobByIdQueryVariables>): Apollo.UseSuspenseQueryResult<GetGreenhouseJobByIdQuery | undefined, GetGreenhouseJobByIdQueryVariables>;
export function useGetGreenhouseJobByIdSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetGreenhouseJobByIdQuery, GetGreenhouseJobByIdQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetGreenhouseJobByIdQuery, GetGreenhouseJobByIdQueryVariables>(GetGreenhouseJobByIdDocument, options);
        }
export type GetGreenhouseJobByIdQueryHookResult = ReturnType<typeof useGetGreenhouseJobByIdQuery>;
export type GetGreenhouseJobByIdLazyQueryHookResult = ReturnType<typeof useGetGreenhouseJobByIdLazyQuery>;
export type GetGreenhouseJobByIdSuspenseQueryHookResult = ReturnType<typeof useGetGreenhouseJobByIdSuspenseQuery>;
export type GetGreenhouseJobByIdQueryResult = Apollo.QueryResult<GetGreenhouseJobByIdQuery, GetGreenhouseJobByIdQueryVariables>;
export const EnhanceJobFromGreenhouseAtsDocument = gql`
    mutation EnhanceJobFromGreenhouseATS($jobId: String!, $company: String!, $source: String!) {
  enhanceJobFromATS(jobId: $jobId, company: $company, source: $source) {
    success
    message
    job {
      id
      external_id
      source_id
      source_kind
      company_id
      company_key
      company {
        ...CompanyFields
      }
      title
      location
      url
      description
      posted_at
      score
      score_reason
      status
      is_remote_eu
      remote_eu_confidence
      remote_eu_reason
      skills {
        tag
        level
        confidence
        evidence
      }
      created_at
      updated_at
    }
    enhancedData
  }
}
    ${CompanyFieldsFragmentDoc}`;
export type EnhanceJobFromGreenhouseAtsMutationFn = Apollo.MutationFunction<EnhanceJobFromGreenhouseAtsMutation, EnhanceJobFromGreenhouseAtsMutationVariables>;

/**
 * __useEnhanceJobFromGreenhouseAtsMutation__
 *
 * To run a mutation, you first call `useEnhanceJobFromGreenhouseAtsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEnhanceJobFromGreenhouseAtsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [enhanceJobFromGreenhouseAtsMutation, { data, loading, error }] = useEnhanceJobFromGreenhouseAtsMutation({
 *   variables: {
 *      jobId: // value for 'jobId'
 *      company: // value for 'company'
 *      source: // value for 'source'
 *   },
 * });
 */
export function useEnhanceJobFromGreenhouseAtsMutation(baseOptions?: Apollo.MutationHookOptions<EnhanceJobFromGreenhouseAtsMutation, EnhanceJobFromGreenhouseAtsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<EnhanceJobFromGreenhouseAtsMutation, EnhanceJobFromGreenhouseAtsMutationVariables>(EnhanceJobFromGreenhouseAtsDocument, options);
      }
export type EnhanceJobFromGreenhouseAtsMutationHookResult = ReturnType<typeof useEnhanceJobFromGreenhouseAtsMutation>;
export type EnhanceJobFromGreenhouseAtsMutationResult = Apollo.MutationResult<EnhanceJobFromGreenhouseAtsMutation>;
export type EnhanceJobFromGreenhouseAtsMutationOptions = Apollo.BaseMutationOptions<EnhanceJobFromGreenhouseAtsMutation, EnhanceJobFromGreenhouseAtsMutationVariables>;
export const GetLangSmithPromptsDocument = gql`
    query GetLangSmithPrompts($isPublic: Boolean, $isArchived: Boolean, $query: String) {
  langsmithPrompts(isPublic: $isPublic, isArchived: $isArchived, query: $query) {
    id
    promptHandle
    fullName
    description
    readme
    tenantId
    createdAt
    updatedAt
    isPublic
    isArchived
    tags
    owner
    numLikes
    numDownloads
    numViews
    numCommits
    lastCommitHash
    likedByAuthUser
  }
}
    `;

/**
 * __useGetLangSmithPromptsQuery__
 *
 * To run a query within a React component, call `useGetLangSmithPromptsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLangSmithPromptsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLangSmithPromptsQuery({
 *   variables: {
 *      isPublic: // value for 'isPublic'
 *      isArchived: // value for 'isArchived'
 *      query: // value for 'query'
 *   },
 * });
 */
export function useGetLangSmithPromptsQuery(baseOptions?: Apollo.QueryHookOptions<GetLangSmithPromptsQuery, GetLangSmithPromptsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLangSmithPromptsQuery, GetLangSmithPromptsQueryVariables>(GetLangSmithPromptsDocument, options);
      }
export function useGetLangSmithPromptsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLangSmithPromptsQuery, GetLangSmithPromptsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLangSmithPromptsQuery, GetLangSmithPromptsQueryVariables>(GetLangSmithPromptsDocument, options);
        }
// @ts-ignore
export function useGetLangSmithPromptsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetLangSmithPromptsQuery, GetLangSmithPromptsQueryVariables>): Apollo.UseSuspenseQueryResult<GetLangSmithPromptsQuery, GetLangSmithPromptsQueryVariables>;
export function useGetLangSmithPromptsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLangSmithPromptsQuery, GetLangSmithPromptsQueryVariables>): Apollo.UseSuspenseQueryResult<GetLangSmithPromptsQuery | undefined, GetLangSmithPromptsQueryVariables>;
export function useGetLangSmithPromptsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLangSmithPromptsQuery, GetLangSmithPromptsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLangSmithPromptsQuery, GetLangSmithPromptsQueryVariables>(GetLangSmithPromptsDocument, options);
        }
export type GetLangSmithPromptsQueryHookResult = ReturnType<typeof useGetLangSmithPromptsQuery>;
export type GetLangSmithPromptsLazyQueryHookResult = ReturnType<typeof useGetLangSmithPromptsLazyQuery>;
export type GetLangSmithPromptsSuspenseQueryHookResult = ReturnType<typeof useGetLangSmithPromptsSuspenseQuery>;
export type GetLangSmithPromptsQueryResult = Apollo.QueryResult<GetLangSmithPromptsQuery, GetLangSmithPromptsQueryVariables>;
export const GetLangSmithPromptDocument = gql`
    query GetLangSmithPrompt($promptIdentifier: String!) {
  langsmithPrompt(promptIdentifier: $promptIdentifier) {
    id
    promptHandle
    fullName
    description
    readme
    tenantId
    createdAt
    updatedAt
    isPublic
    isArchived
    tags
    owner
    numLikes
    numDownloads
    numViews
    numCommits
    lastCommitHash
    likedByAuthUser
  }
}
    `;

/**
 * __useGetLangSmithPromptQuery__
 *
 * To run a query within a React component, call `useGetLangSmithPromptQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLangSmithPromptQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLangSmithPromptQuery({
 *   variables: {
 *      promptIdentifier: // value for 'promptIdentifier'
 *   },
 * });
 */
export function useGetLangSmithPromptQuery(baseOptions: Apollo.QueryHookOptions<GetLangSmithPromptQuery, GetLangSmithPromptQueryVariables> & ({ variables: GetLangSmithPromptQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLangSmithPromptQuery, GetLangSmithPromptQueryVariables>(GetLangSmithPromptDocument, options);
      }
export function useGetLangSmithPromptLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLangSmithPromptQuery, GetLangSmithPromptQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLangSmithPromptQuery, GetLangSmithPromptQueryVariables>(GetLangSmithPromptDocument, options);
        }
// @ts-ignore
export function useGetLangSmithPromptSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetLangSmithPromptQuery, GetLangSmithPromptQueryVariables>): Apollo.UseSuspenseQueryResult<GetLangSmithPromptQuery, GetLangSmithPromptQueryVariables>;
export function useGetLangSmithPromptSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLangSmithPromptQuery, GetLangSmithPromptQueryVariables>): Apollo.UseSuspenseQueryResult<GetLangSmithPromptQuery | undefined, GetLangSmithPromptQueryVariables>;
export function useGetLangSmithPromptSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLangSmithPromptQuery, GetLangSmithPromptQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLangSmithPromptQuery, GetLangSmithPromptQueryVariables>(GetLangSmithPromptDocument, options);
        }
export type GetLangSmithPromptQueryHookResult = ReturnType<typeof useGetLangSmithPromptQuery>;
export type GetLangSmithPromptLazyQueryHookResult = ReturnType<typeof useGetLangSmithPromptLazyQuery>;
export type GetLangSmithPromptSuspenseQueryHookResult = ReturnType<typeof useGetLangSmithPromptSuspenseQuery>;
export type GetLangSmithPromptQueryResult = Apollo.QueryResult<GetLangSmithPromptQuery, GetLangSmithPromptQueryVariables>;
export const GetLangSmithPromptCommitDocument = gql`
    query GetLangSmithPromptCommit($promptIdentifier: String!, $includeModel: Boolean) {
  langsmithPromptCommit(
    promptIdentifier: $promptIdentifier
    includeModel: $includeModel
  ) {
    owner
    promptName
    commitHash
    manifest
    examples
  }
}
    `;

/**
 * __useGetLangSmithPromptCommitQuery__
 *
 * To run a query within a React component, call `useGetLangSmithPromptCommitQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLangSmithPromptCommitQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLangSmithPromptCommitQuery({
 *   variables: {
 *      promptIdentifier: // value for 'promptIdentifier'
 *      includeModel: // value for 'includeModel'
 *   },
 * });
 */
export function useGetLangSmithPromptCommitQuery(baseOptions: Apollo.QueryHookOptions<GetLangSmithPromptCommitQuery, GetLangSmithPromptCommitQueryVariables> & ({ variables: GetLangSmithPromptCommitQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLangSmithPromptCommitQuery, GetLangSmithPromptCommitQueryVariables>(GetLangSmithPromptCommitDocument, options);
      }
export function useGetLangSmithPromptCommitLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLangSmithPromptCommitQuery, GetLangSmithPromptCommitQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLangSmithPromptCommitQuery, GetLangSmithPromptCommitQueryVariables>(GetLangSmithPromptCommitDocument, options);
        }
// @ts-ignore
export function useGetLangSmithPromptCommitSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetLangSmithPromptCommitQuery, GetLangSmithPromptCommitQueryVariables>): Apollo.UseSuspenseQueryResult<GetLangSmithPromptCommitQuery, GetLangSmithPromptCommitQueryVariables>;
export function useGetLangSmithPromptCommitSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLangSmithPromptCommitQuery, GetLangSmithPromptCommitQueryVariables>): Apollo.UseSuspenseQueryResult<GetLangSmithPromptCommitQuery | undefined, GetLangSmithPromptCommitQueryVariables>;
export function useGetLangSmithPromptCommitSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLangSmithPromptCommitQuery, GetLangSmithPromptCommitQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLangSmithPromptCommitQuery, GetLangSmithPromptCommitQueryVariables>(GetLangSmithPromptCommitDocument, options);
        }
export type GetLangSmithPromptCommitQueryHookResult = ReturnType<typeof useGetLangSmithPromptCommitQuery>;
export type GetLangSmithPromptCommitLazyQueryHookResult = ReturnType<typeof useGetLangSmithPromptCommitLazyQuery>;
export type GetLangSmithPromptCommitSuspenseQueryHookResult = ReturnType<typeof useGetLangSmithPromptCommitSuspenseQuery>;
export type GetLangSmithPromptCommitQueryResult = Apollo.QueryResult<GetLangSmithPromptCommitQuery, GetLangSmithPromptCommitQueryVariables>;
export const CreateLangSmithPromptDocument = gql`
    mutation CreateLangSmithPrompt($promptIdentifier: String!, $input: CreateLangSmithPromptInput) {
  createLangSmithPrompt(promptIdentifier: $promptIdentifier, input: $input) {
    id
    promptHandle
    fullName
    description
    readme
    tenantId
    createdAt
    updatedAt
    isPublic
    isArchived
    tags
    owner
    numLikes
    numDownloads
    numViews
    numCommits
    lastCommitHash
    likedByAuthUser
  }
}
    `;
export type CreateLangSmithPromptMutationFn = Apollo.MutationFunction<CreateLangSmithPromptMutation, CreateLangSmithPromptMutationVariables>;

/**
 * __useCreateLangSmithPromptMutation__
 *
 * To run a mutation, you first call `useCreateLangSmithPromptMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateLangSmithPromptMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createLangSmithPromptMutation, { data, loading, error }] = useCreateLangSmithPromptMutation({
 *   variables: {
 *      promptIdentifier: // value for 'promptIdentifier'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateLangSmithPromptMutation(baseOptions?: Apollo.MutationHookOptions<CreateLangSmithPromptMutation, CreateLangSmithPromptMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateLangSmithPromptMutation, CreateLangSmithPromptMutationVariables>(CreateLangSmithPromptDocument, options);
      }
export type CreateLangSmithPromptMutationHookResult = ReturnType<typeof useCreateLangSmithPromptMutation>;
export type CreateLangSmithPromptMutationResult = Apollo.MutationResult<CreateLangSmithPromptMutation>;
export type CreateLangSmithPromptMutationOptions = Apollo.BaseMutationOptions<CreateLangSmithPromptMutation, CreateLangSmithPromptMutationVariables>;
export const UpdateLangSmithPromptDocument = gql`
    mutation UpdateLangSmithPrompt($promptIdentifier: String!, $input: UpdateLangSmithPromptInput!) {
  updateLangSmithPrompt(promptIdentifier: $promptIdentifier, input: $input) {
    id
    promptHandle
    fullName
    description
    readme
    tenantId
    createdAt
    updatedAt
    isPublic
    isArchived
    tags
    owner
    numLikes
    numDownloads
    numViews
    numCommits
    lastCommitHash
    likedByAuthUser
  }
}
    `;
export type UpdateLangSmithPromptMutationFn = Apollo.MutationFunction<UpdateLangSmithPromptMutation, UpdateLangSmithPromptMutationVariables>;

/**
 * __useUpdateLangSmithPromptMutation__
 *
 * To run a mutation, you first call `useUpdateLangSmithPromptMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateLangSmithPromptMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateLangSmithPromptMutation, { data, loading, error }] = useUpdateLangSmithPromptMutation({
 *   variables: {
 *      promptIdentifier: // value for 'promptIdentifier'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateLangSmithPromptMutation(baseOptions?: Apollo.MutationHookOptions<UpdateLangSmithPromptMutation, UpdateLangSmithPromptMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateLangSmithPromptMutation, UpdateLangSmithPromptMutationVariables>(UpdateLangSmithPromptDocument, options);
      }
export type UpdateLangSmithPromptMutationHookResult = ReturnType<typeof useUpdateLangSmithPromptMutation>;
export type UpdateLangSmithPromptMutationResult = Apollo.MutationResult<UpdateLangSmithPromptMutation>;
export type UpdateLangSmithPromptMutationOptions = Apollo.BaseMutationOptions<UpdateLangSmithPromptMutation, UpdateLangSmithPromptMutationVariables>;
export const DeleteLangSmithPromptDocument = gql`
    mutation DeleteLangSmithPrompt($promptIdentifier: String!) {
  deleteLangSmithPrompt(promptIdentifier: $promptIdentifier)
}
    `;
export type DeleteLangSmithPromptMutationFn = Apollo.MutationFunction<DeleteLangSmithPromptMutation, DeleteLangSmithPromptMutationVariables>;

/**
 * __useDeleteLangSmithPromptMutation__
 *
 * To run a mutation, you first call `useDeleteLangSmithPromptMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteLangSmithPromptMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteLangSmithPromptMutation, { data, loading, error }] = useDeleteLangSmithPromptMutation({
 *   variables: {
 *      promptIdentifier: // value for 'promptIdentifier'
 *   },
 * });
 */
export function useDeleteLangSmithPromptMutation(baseOptions?: Apollo.MutationHookOptions<DeleteLangSmithPromptMutation, DeleteLangSmithPromptMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteLangSmithPromptMutation, DeleteLangSmithPromptMutationVariables>(DeleteLangSmithPromptDocument, options);
      }
export type DeleteLangSmithPromptMutationHookResult = ReturnType<typeof useDeleteLangSmithPromptMutation>;
export type DeleteLangSmithPromptMutationResult = Apollo.MutationResult<DeleteLangSmithPromptMutation>;
export type DeleteLangSmithPromptMutationOptions = Apollo.BaseMutationOptions<DeleteLangSmithPromptMutation, DeleteLangSmithPromptMutationVariables>;
export const PushLangSmithPromptDocument = gql`
    mutation PushLangSmithPrompt($promptIdentifier: String!, $input: PushLangSmithPromptInput) {
  pushLangSmithPrompt(promptIdentifier: $promptIdentifier, input: $input)
}
    `;
export type PushLangSmithPromptMutationFn = Apollo.MutationFunction<PushLangSmithPromptMutation, PushLangSmithPromptMutationVariables>;

/**
 * __usePushLangSmithPromptMutation__
 *
 * To run a mutation, you first call `usePushLangSmithPromptMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePushLangSmithPromptMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pushLangSmithPromptMutation, { data, loading, error }] = usePushLangSmithPromptMutation({
 *   variables: {
 *      promptIdentifier: // value for 'promptIdentifier'
 *      input: // value for 'input'
 *   },
 * });
 */
export function usePushLangSmithPromptMutation(baseOptions?: Apollo.MutationHookOptions<PushLangSmithPromptMutation, PushLangSmithPromptMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PushLangSmithPromptMutation, PushLangSmithPromptMutationVariables>(PushLangSmithPromptDocument, options);
      }
export type PushLangSmithPromptMutationHookResult = ReturnType<typeof usePushLangSmithPromptMutation>;
export type PushLangSmithPromptMutationResult = Apollo.MutationResult<PushLangSmithPromptMutation>;
export type PushLangSmithPromptMutationOptions = Apollo.BaseMutationOptions<PushLangSmithPromptMutation, PushLangSmithPromptMutationVariables>;
export const GetPromptsDocument = gql`
    query GetPrompts {
  prompts {
    name
    type
    content
    tags
    labels
    versions
    lastUpdatedAt
    lastConfig
    usageCount
    lastUsedBy
  }
}
    `;

/**
 * __useGetPromptsQuery__
 *
 * To run a query within a React component, call `useGetPromptsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetPromptsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetPromptsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetPromptsQuery(baseOptions?: Apollo.QueryHookOptions<GetPromptsQuery, GetPromptsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetPromptsQuery, GetPromptsQueryVariables>(GetPromptsDocument, options);
      }
export function useGetPromptsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetPromptsQuery, GetPromptsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetPromptsQuery, GetPromptsQueryVariables>(GetPromptsDocument, options);
        }
// @ts-ignore
export function useGetPromptsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetPromptsQuery, GetPromptsQueryVariables>): Apollo.UseSuspenseQueryResult<GetPromptsQuery, GetPromptsQueryVariables>;
export function useGetPromptsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetPromptsQuery, GetPromptsQueryVariables>): Apollo.UseSuspenseQueryResult<GetPromptsQuery | undefined, GetPromptsQueryVariables>;
export function useGetPromptsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetPromptsQuery, GetPromptsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetPromptsQuery, GetPromptsQueryVariables>(GetPromptsDocument, options);
        }
export type GetPromptsQueryHookResult = ReturnType<typeof useGetPromptsQuery>;
export type GetPromptsLazyQueryHookResult = ReturnType<typeof useGetPromptsLazyQuery>;
export type GetPromptsSuspenseQueryHookResult = ReturnType<typeof useGetPromptsSuspenseQuery>;
export type GetPromptsQueryResult = Apollo.QueryResult<GetPromptsQuery, GetPromptsQueryVariables>;
export const GetMyPromptUsageDocument = gql`
    query GetMyPromptUsage($limit: Int) {
  myPromptUsage(limit: $limit) {
    promptName
    userEmail
    version
    label
    usedAt
    traceId
  }
}
    `;

/**
 * __useGetMyPromptUsageQuery__
 *
 * To run a query within a React component, call `useGetMyPromptUsageQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyPromptUsageQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyPromptUsageQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useGetMyPromptUsageQuery(baseOptions?: Apollo.QueryHookOptions<GetMyPromptUsageQuery, GetMyPromptUsageQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetMyPromptUsageQuery, GetMyPromptUsageQueryVariables>(GetMyPromptUsageDocument, options);
      }
export function useGetMyPromptUsageLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetMyPromptUsageQuery, GetMyPromptUsageQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetMyPromptUsageQuery, GetMyPromptUsageQueryVariables>(GetMyPromptUsageDocument, options);
        }
// @ts-ignore
export function useGetMyPromptUsageSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetMyPromptUsageQuery, GetMyPromptUsageQueryVariables>): Apollo.UseSuspenseQueryResult<GetMyPromptUsageQuery, GetMyPromptUsageQueryVariables>;
export function useGetMyPromptUsageSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMyPromptUsageQuery, GetMyPromptUsageQueryVariables>): Apollo.UseSuspenseQueryResult<GetMyPromptUsageQuery | undefined, GetMyPromptUsageQueryVariables>;
export function useGetMyPromptUsageSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMyPromptUsageQuery, GetMyPromptUsageQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetMyPromptUsageQuery, GetMyPromptUsageQueryVariables>(GetMyPromptUsageDocument, options);
        }
export type GetMyPromptUsageQueryHookResult = ReturnType<typeof useGetMyPromptUsageQuery>;
export type GetMyPromptUsageLazyQueryHookResult = ReturnType<typeof useGetMyPromptUsageLazyQuery>;
export type GetMyPromptUsageSuspenseQueryHookResult = ReturnType<typeof useGetMyPromptUsageSuspenseQuery>;
export type GetMyPromptUsageQueryResult = Apollo.QueryResult<GetMyPromptUsageQuery, GetMyPromptUsageQueryVariables>;
export const CreatePromptDocument = gql`
    mutation CreatePrompt($input: CreatePromptInput!) {
  createPrompt(input: $input) {
    name
    version
    type
    labels
    tags
    createdBy
  }
}
    `;
export type CreatePromptMutationFn = Apollo.MutationFunction<CreatePromptMutation, CreatePromptMutationVariables>;

/**
 * __useCreatePromptMutation__
 *
 * To run a mutation, you first call `useCreatePromptMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreatePromptMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createPromptMutation, { data, loading, error }] = useCreatePromptMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreatePromptMutation(baseOptions?: Apollo.MutationHookOptions<CreatePromptMutation, CreatePromptMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreatePromptMutation, CreatePromptMutationVariables>(CreatePromptDocument, options);
      }
export type CreatePromptMutationHookResult = ReturnType<typeof useCreatePromptMutation>;
export type CreatePromptMutationResult = Apollo.MutationResult<CreatePromptMutation>;
export type CreatePromptMutationOptions = Apollo.BaseMutationOptions<CreatePromptMutation, CreatePromptMutationVariables>;