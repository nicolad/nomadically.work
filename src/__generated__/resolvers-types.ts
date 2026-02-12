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

export type Job = {
  __typename?: 'Job';
  company: Maybe<Company>;
  company_id: Maybe<Scalars['Int']['output']>;
  company_key: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  external_id: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  is_remote_eu: Maybe<Scalars['Boolean']['output']>;
  location: Maybe<Scalars['String']['output']>;
  posted_at: Scalars['String']['output'];
  remote_eu_confidence: Maybe<Scalars['String']['output']>;
  remote_eu_reason: Maybe<Scalars['String']['output']>;
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
  DateTime: ResolverTypeWrapper<Partial<Scalars['DateTime']['output']>>;
  DeleteCompanyResponse: ResolverTypeWrapper<Partial<DeleteCompanyResponse>>;
  DeleteJobResponse: ResolverTypeWrapper<Partial<DeleteJobResponse>>;
  EmailAddress: ResolverTypeWrapper<Partial<Scalars['EmailAddress']['output']>>;
  EnhanceCompanyResponse: ResolverTypeWrapper<Partial<EnhanceCompanyResponse>>;
  Evidence: ResolverTypeWrapper<Partial<Evidence>>;
  EvidenceInput: ResolverTypeWrapper<Partial<EvidenceInput>>;
  ExtractMethod: ResolverTypeWrapper<Partial<ExtractMethod>>;
  Float: ResolverTypeWrapper<Partial<Scalars['Float']['output']>>;
  Int: ResolverTypeWrapper<Partial<Scalars['Int']['output']>>;
  JSON: ResolverTypeWrapper<Partial<Scalars['JSON']['output']>>;
  Job: ResolverTypeWrapper<Partial<Job>>;
  JobSkill: ResolverTypeWrapper<Partial<JobSkill>>;
  JobsResponse: ResolverTypeWrapper<Partial<JobsResponse>>;
  LangSmithPrompt: ResolverTypeWrapper<Partial<LangSmithPrompt>>;
  LangSmithPromptCommit: ResolverTypeWrapper<Partial<LangSmithPromptCommit>>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
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
  SourceType: ResolverTypeWrapper<Partial<SourceType>>;
  String: ResolverTypeWrapper<Partial<Scalars['String']['output']>>;
  TextToSqlResult: ResolverTypeWrapper<Partial<TextToSqlResult>>;
  URL: ResolverTypeWrapper<Partial<Scalars['URL']['output']>>;
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
  DateTime: Partial<Scalars['DateTime']['output']>;
  DeleteCompanyResponse: Partial<DeleteCompanyResponse>;
  DeleteJobResponse: Partial<DeleteJobResponse>;
  EmailAddress: Partial<Scalars['EmailAddress']['output']>;
  EnhanceCompanyResponse: Partial<EnhanceCompanyResponse>;
  Evidence: Partial<Evidence>;
  EvidenceInput: Partial<EvidenceInput>;
  Float: Partial<Scalars['Float']['output']>;
  Int: Partial<Scalars['Int']['output']>;
  JSON: Partial<Scalars['JSON']['output']>;
  Job: Partial<Job>;
  JobSkill: Partial<JobSkill>;
  JobsResponse: Partial<JobsResponse>;
  LangSmithPrompt: Partial<LangSmithPrompt>;
  LangSmithPromptCommit: Partial<LangSmithPromptCommit>;
  Mutation: Record<PropertyKey, never>;
  Prompt: Partial<Prompt>;
  PromptConfig: Partial<PromptConfig>;
  PromptConfigInput: Partial<PromptConfigInput>;
  PromptUsage: Partial<PromptUsage>;
  PushLangSmithPromptInput: Partial<PushLangSmithPromptInput>;
  Query: Record<PropertyKey, never>;
  QuestionAnswer: Partial<QuestionAnswer>;
  QuestionAnswerInput: Partial<QuestionAnswerInput>;
  RegisteredPrompt: Partial<RegisteredPrompt>;
  String: Partial<Scalars['String']['output']>;
  TextToSqlResult: Partial<TextToSqlResult>;
  URL: Partial<Scalars['URL']['output']>;
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
  email?: Resolver<ResolversTypes['EmailAddress'], ParentType, ContextType>;
  jobId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  questions?: Resolver<Array<ResolversTypes['QuestionAnswer']>, ParentType, ContextType>;
  resume?: Resolver<Maybe<ResolversTypes['Upload']>, ParentType, ContextType>;
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

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type JobResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Job'] = ResolversParentTypes['Job']> = {
  company?: Resolver<Maybe<ResolversTypes['Company']>, ParentType, ContextType>;
  company_id?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  company_key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  external_id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  is_remote_eu?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  location?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  posted_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  remote_eu_confidence?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  remote_eu_reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  score?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  score_reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  skills?: Resolver<Maybe<Array<ResolversTypes['JobSkill']>>, ParentType, ContextType>;
  source_id?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  source_kind?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updated_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  add_company_facts?: Resolver<Array<ResolversTypes['CompanyFact']>, ParentType, ContextType, RequireFields<MutationAdd_Company_FactsArgs, 'company_id' | 'facts'>>;
  createApplication?: Resolver<ResolversTypes['Application'], ParentType, ContextType, RequireFields<MutationCreateApplicationArgs, 'input'>>;
  createCompany?: Resolver<ResolversTypes['Company'], ParentType, ContextType, RequireFields<MutationCreateCompanyArgs, 'input'>>;
  createLangSmithPrompt?: Resolver<ResolversTypes['LangSmithPrompt'], ParentType, ContextType, RequireFields<MutationCreateLangSmithPromptArgs, 'promptIdentifier'>>;
  createPrompt?: Resolver<ResolversTypes['Prompt'], ParentType, ContextType, RequireFields<MutationCreatePromptArgs, 'input'>>;
  deleteCompany?: Resolver<ResolversTypes['DeleteCompanyResponse'], ParentType, ContextType, RequireFields<MutationDeleteCompanyArgs, 'id'>>;
  deleteJob?: Resolver<ResolversTypes['DeleteJobResponse'], ParentType, ContextType, RequireFields<MutationDeleteJobArgs, 'id'>>;
  deleteLangSmithPrompt?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteLangSmithPromptArgs, 'promptIdentifier'>>;
  enhanceCompany?: Resolver<ResolversTypes['EnhanceCompanyResponse'], ParentType, ContextType, Partial<MutationEnhanceCompanyArgs>>;
  ingest_company_snapshot?: Resolver<ResolversTypes['CompanySnapshot'], ParentType, ContextType, RequireFields<MutationIngest_Company_SnapshotArgs, 'company_id' | 'evidence' | 'fetched_at' | 'source_url'>>;
  pushLangSmithPrompt?: Resolver<ResolversTypes['String'], ParentType, ContextType, RequireFields<MutationPushLangSmithPromptArgs, 'promptIdentifier'>>;
  updateCompany?: Resolver<ResolversTypes['Company'], ParentType, ContextType, RequireFields<MutationUpdateCompanyArgs, 'id' | 'input'>>;
  updateLangSmithPrompt?: Resolver<ResolversTypes['LangSmithPrompt'], ParentType, ContextType, RequireFields<MutationUpdateLangSmithPromptArgs, 'input' | 'promptIdentifier'>>;
  updatePromptLabel?: Resolver<ResolversTypes['Prompt'], ParentType, ContextType, RequireFields<MutationUpdatePromptLabelArgs, 'label' | 'name' | 'version'>>;
  updateUserSettings?: Resolver<ResolversTypes['UserSettings'], ParentType, ContextType, RequireFields<MutationUpdateUserSettingsArgs, 'settings' | 'userId'>>;
  upsert_company_ats_boards?: Resolver<Array<ResolversTypes['ATSBoard']>, ParentType, ContextType, RequireFields<MutationUpsert_Company_Ats_BoardsArgs, 'boards' | 'company_id'>>;
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
  prompt?: Resolver<Maybe<ResolversTypes['Prompt']>, ParentType, ContextType, RequireFields<QueryPromptArgs, 'name'>>;
  prompts?: Resolver<Array<ResolversTypes['RegisteredPrompt']>, ParentType, ContextType>;
  textToSql?: Resolver<ResolversTypes['TextToSqlResult'], ParentType, ContextType, RequireFields<QueryTextToSqlArgs, 'question'>>;
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

export type TextToSqlResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TextToSqlResult'] = ResolversParentTypes['TextToSqlResult']> = {
  columns?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  drilldownSearchQuery?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  explanation?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rows?: Resolver<Array<Maybe<Array<Maybe<ResolversTypes['JSON']>>>>, ParentType, ContextType>;
  sql?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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
  Evidence?: EvidenceResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Job?: JobResolvers<ContextType>;
  JobSkill?: JobSkillResolvers<ContextType>;
  JobsResponse?: JobsResponseResolvers<ContextType>;
  LangSmithPrompt?: LangSmithPromptResolvers<ContextType>;
  LangSmithPromptCommit?: LangSmithPromptCommitResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Prompt?: PromptResolvers<ContextType>;
  PromptConfig?: PromptConfigResolvers<ContextType>;
  PromptUsage?: PromptUsageResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  QuestionAnswer?: QuestionAnswerResolvers<ContextType>;
  RegisteredPrompt?: RegisteredPromptResolvers<ContextType>;
  TextToSqlResult?: TextToSqlResultResolvers<ContextType>;
  URL?: GraphQLScalarType;
  Upload?: GraphQLScalarType;
  UserSettings?: UserSettingsResolvers<ContextType>;
  WarcPointer?: WarcPointerResolvers<ContextType>;
};

