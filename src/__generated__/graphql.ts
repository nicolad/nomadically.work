/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
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
  email: Scalars['EmailAddress']['output'];
  jobId: Scalars['String']['output'];
  questions: Array<QuestionAnswer>;
  resume: Maybe<Scalars['Upload']['output']>;
};

export type ApplicationInput = {
  email: Scalars['EmailAddress']['input'];
  jobId: Scalars['String']['input'];
  questions: Array<QuestionAnswerInput>;
  resume?: InputMaybe<Scalars['Upload']['input']>;
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

export type Job = {
  __typename: 'Job';
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

export type Mutation = {
  __typename: 'Mutation';
  add_company_facts: Array<CompanyFact>;
  createApplication: Application;
  createCompany: Company;
  createPrompt: Prompt;
  deleteCompany: DeleteCompanyResponse;
  deleteJob: DeleteJobResponse;
  enhanceCompany: EnhanceCompanyResponse;
  ingest_company_snapshot: CompanySnapshot;
  updateCompany: Company;
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


export type MutationCreatePromptArgs = {
  input: CreatePromptInput;
};


export type MutationDeleteCompanyArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteJobArgs = {
  id: Scalars['Int']['input'];
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


export type MutationUpdateCompanyArgs = {
  id: Scalars['Int']['input'];
  input: UpdateCompanyInput;
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

export type Query = {
  __typename: 'Query';
  companies: CompaniesResponse;
  company: Maybe<Company>;
  company_ats_boards: Array<AtsBoard>;
  company_facts: Array<CompanyFact>;
  company_snapshots: Array<CompanySnapshot>;
  executeSql: TextToSqlResult;
  job: Maybe<Job>;
  jobs: JobsResponse;
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

export type DeleteJobMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteJobMutation = { __typename: 'Mutation', deleteJob: { __typename: 'DeleteJobResponse', success: boolean, message: string | null } };

export type ExecuteSqlQueryVariables = Exact<{
  sql: Scalars['String']['input'];
}>;


export type ExecuteSqlQuery = { __typename: 'Query', executeSql: { __typename: 'TextToSqlResult', sql: string, explanation: string | null, columns: Array<string>, rows: Array<Array<any | null> | null>, drilldownSearchQuery: string | null } };

export type GetJobQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetJobQuery = { __typename: 'Query', job: { __typename: 'Job', id: number, external_id: string, source_id: string | null, source_kind: string, company_id: number | null, company_key: string, title: string, location: string | null, url: string, description: string | null, posted_at: string, score: number | null, score_reason: string | null, status: string | null, is_remote_eu: boolean | null, remote_eu_confidence: string | null, remote_eu_reason: string | null, created_at: string, updated_at: string, company: (
      { __typename: 'Company' }
      & { ' $fragmentRefs'?: { 'CompanyFieldsFragment': CompanyFieldsFragment } }
    ) | null, skills: Array<{ __typename: 'JobSkill', tag: string, level: string, confidence: number | null, evidence: string | null }> | null } | null };

export type GetJobsQueryVariables = Exact<{
  sourceType?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  excludedCompanies?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
}>;


export type GetJobsQuery = { __typename: 'Query', jobs: { __typename: 'JobsResponse', totalCount: number, jobs: Array<{ __typename: 'Job', id: number, external_id: string, source_id: string | null, source_kind: string, company_id: number | null, company_key: string, title: string, location: string | null, url: string, description: string | null, posted_at: string, score: number | null, score_reason: string | null, status: string | null, created_at: string, updated_at: string, company: (
        { __typename: 'Company' }
        & { ' $fragmentRefs'?: { 'CompanyFieldsFragment': CompanyFieldsFragment } }
      ) | null, skills: Array<{ __typename: 'JobSkill', tag: string, level: string }> | null }> } };

export type GetUserSettingsQueryVariables = Exact<{
  userId: Scalars['String']['input'];
}>;


export type GetUserSettingsQuery = { __typename: 'Query', userSettings: { __typename: 'UserSettings', id: number, user_id: string, preferred_locations: Array<string> | null, preferred_skills: Array<string> | null, excluded_companies: Array<string> | null } | null };

export type TextToSqlQueryVariables = Exact<{
  question: Scalars['String']['input'];
}>;


export type TextToSqlQuery = { __typename: 'Query', textToSql: { __typename: 'TextToSqlResult', sql: string, explanation: string | null, columns: Array<string>, rows: Array<Array<any | null> | null>, drilldownSearchQuery: string | null } };

export type UpdateUserSettingsMutationVariables = Exact<{
  userId: Scalars['String']['input'];
  settings: UserSettingsInput;
}>;


export type UpdateUserSettingsMutation = { __typename: 'Mutation', updateUserSettings: { __typename: 'UserSettings', id: number, user_id: string, email_notifications: boolean, daily_digest: boolean, new_job_alerts: boolean, preferred_locations: Array<string> | null, preferred_skills: Array<string> | null, excluded_companies: Array<string> | null, dark_mode: boolean, jobs_per_page: number, created_at: string, updated_at: string } };

export type CreateApplicationMutationVariables = Exact<{
  input: ApplicationInput;
}>;


export type CreateApplicationMutation = { __typename: 'Mutation', createApplication: { __typename: 'Application', email: string, jobId: string, questions: Array<{ __typename: 'QuestionAnswer', questionId: string, questionText: string, answerText: string }> } };

export type EvidenceFieldsFragment = { __typename: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } & { ' $fragmentName'?: 'EvidenceFieldsFragment' };

export type AtsBoardFieldsFragment = { __typename: 'ATSBoard', id: number, company_id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string, created_at: string, updated_at: string, evidence: (
    { __typename: 'Evidence' }
    & { ' $fragmentRefs'?: { 'EvidenceFieldsFragment': EvidenceFieldsFragment } }
  ) } & { ' $fragmentName'?: 'AtsBoardFieldsFragment' };

export type CompanyFactFieldsFragment = { __typename: 'CompanyFact', id: number, company_id: number, field: string, value_json: any | null, value_text: string | null, normalized_value: any | null, confidence: number, created_at: string, evidence: (
    { __typename: 'Evidence' }
    & { ' $fragmentRefs'?: { 'EvidenceFieldsFragment': EvidenceFieldsFragment } }
  ) } & { ' $fragmentName'?: 'CompanyFactFieldsFragment' };

export type CompanySnapshotFieldsFragment = { __typename: 'CompanySnapshot', id: number, company_id: number, source_url: string, crawl_id: string | null, capture_timestamp: string | null, fetched_at: string, http_status: number | null, mime: string | null, content_hash: string | null, text_sample: string | null, jsonld: any | null, extracted: any | null, created_at: string, evidence: (
    { __typename: 'Evidence' }
    & { ' $fragmentRefs'?: { 'EvidenceFieldsFragment': EvidenceFieldsFragment } }
  ) } & { ' $fragmentName'?: 'CompanySnapshotFieldsFragment' };

export type CompanyFieldsFragment = { __typename: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, canonical_domain: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ats_boards: Array<{ __typename: 'ATSBoard', id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string }> } & { ' $fragmentName'?: 'CompanyFieldsFragment' };

export type CreateCompanyMutationVariables = Exact<{
  input: CreateCompanyInput;
}>;


export type CreateCompanyMutation = { __typename: 'Mutation', createCompany: (
    { __typename: 'Company' }
    & { ' $fragmentRefs'?: { 'CompanyFieldsFragment': CompanyFieldsFragment } }
  ) };

export type UpdateCompanyMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateCompanyInput;
}>;


export type UpdateCompanyMutation = { __typename: 'Mutation', updateCompany: (
    { __typename: 'Company' }
    & { ' $fragmentRefs'?: { 'CompanyFieldsFragment': CompanyFieldsFragment } }
  ) };

export type DeleteCompanyMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteCompanyMutation = { __typename: 'Mutation', deleteCompany: { __typename: 'DeleteCompanyResponse', success: boolean, message: string | null } };

export type EnhanceCompanyMutationVariables = Exact<{
  id?: InputMaybe<Scalars['Int']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
}>;


export type EnhanceCompanyMutation = { __typename: 'Mutation', enhanceCompany: { __typename: 'EnhanceCompanyResponse', success: boolean, message: string | null, companyId: number | null, companyKey: string | null } };

export type AddCompanyFactsMutationVariables = Exact<{
  company_id: Scalars['Int']['input'];
  facts: Array<CompanyFactInput> | CompanyFactInput;
}>;


export type AddCompanyFactsMutation = { __typename: 'Mutation', add_company_facts: Array<(
    { __typename: 'CompanyFact' }
    & { ' $fragmentRefs'?: { 'CompanyFactFieldsFragment': CompanyFactFieldsFragment } }
  )> };

export type UpsertCompanyAtsBoardsMutationVariables = Exact<{
  company_id: Scalars['Int']['input'];
  boards: Array<AtsBoardUpsertInput> | AtsBoardUpsertInput;
}>;


export type UpsertCompanyAtsBoardsMutation = { __typename: 'Mutation', upsert_company_ats_boards: Array<(
    { __typename: 'ATSBoard' }
    & { ' $fragmentRefs'?: { 'AtsBoardFieldsFragment': AtsBoardFieldsFragment } }
  )> };

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


export type IngestCompanySnapshotMutation = { __typename: 'Mutation', ingest_company_snapshot: (
    { __typename: 'CompanySnapshot' }
    & { ' $fragmentRefs'?: { 'CompanySnapshotFieldsFragment': CompanySnapshotFieldsFragment } }
  ) };

export type GetCompanyQueryVariables = Exact<{
  id?: InputMaybe<Scalars['Int']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetCompanyQuery = { __typename: 'Query', company: (
    { __typename: 'Company' }
    & { ' $fragmentRefs'?: { 'CompanyFieldsFragment': CompanyFieldsFragment } }
  ) | null };

export type GetCompaniesQueryVariables = Exact<{
  text?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetCompaniesQuery = { __typename: 'Query', companies: { __typename: 'CompaniesResponse', totalCount: number, companies: Array<(
      { __typename: 'Company' }
      & { ' $fragmentRefs'?: { 'CompanyFieldsFragment': CompanyFieldsFragment } }
    )> } };

export type SearchCompaniesQueryVariables = Exact<{
  filter: CompanyFilterInput;
  order_by?: InputMaybe<CompanyOrderBy>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SearchCompaniesQuery = { __typename: 'Query', companies: { __typename: 'CompaniesResponse', totalCount: number, companies: Array<(
      { __typename: 'Company' }
      & { ' $fragmentRefs'?: { 'CompanyFieldsFragment': CompanyFieldsFragment } }
    )> } };

export type GetCompanyFactsQueryVariables = Exact<{
  company_id: Scalars['Int']['input'];
  field?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetCompanyFactsQuery = { __typename: 'Query', company_facts: Array<(
    { __typename: 'CompanyFact' }
    & { ' $fragmentRefs'?: { 'CompanyFactFieldsFragment': CompanyFactFieldsFragment } }
  )> };

export type GetCompanyAtsBoardsQueryVariables = Exact<{
  company_id: Scalars['Int']['input'];
}>;


export type GetCompanyAtsBoardsQuery = { __typename: 'Query', company_ats_boards: Array<(
    { __typename: 'ATSBoard' }
    & { ' $fragmentRefs'?: { 'AtsBoardFieldsFragment': AtsBoardFieldsFragment } }
  )> };

export type CompanyAuditQueryVariables = Exact<{
  key: Scalars['String']['input'];
}>;


export type CompanyAuditQuery = { __typename: 'Query', company: (
    { __typename: 'Company', facts_count: number, snapshots_count: number, facts: Array<(
      { __typename: 'CompanyFact' }
      & { ' $fragmentRefs'?: { 'CompanyFactFieldsFragment': CompanyFactFieldsFragment } }
    )>, snapshots: Array<(
      { __typename: 'CompanySnapshot' }
      & { ' $fragmentRefs'?: { 'CompanySnapshotFieldsFragment': CompanySnapshotFieldsFragment } }
    )> }
    & { ' $fragmentRefs'?: { 'CompanyFieldsFragment': CompanyFieldsFragment } }
  ) | null };

export type GetPromptsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetPromptsQuery = { __typename: 'Query', prompts: Array<{ __typename: 'RegisteredPrompt', name: string, type: string, content: any | null, tags: Array<string>, labels: Array<string>, versions: Array<number>, lastUpdatedAt: string, lastConfig: any | null, usageCount: number | null, lastUsedBy: string | null }> };

export type GetMyPromptUsageQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetMyPromptUsageQuery = { __typename: 'Query', myPromptUsage: Array<{ __typename: 'PromptUsage', promptName: string, userEmail: string, version: number | null, label: string | null, usedAt: string, traceId: string | null }> };

export type CreatePromptMutationVariables = Exact<{
  input: CreatePromptInput;
}>;


export type CreatePromptMutation = { __typename: 'Mutation', createPrompt: { __typename: 'Prompt', name: string, version: number | null, type: PromptType, labels: Array<string> | null, tags: Array<string> | null, createdBy: string | null } };

export const EvidenceFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EvidenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Evidence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source_type"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"observed_at"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"extractor_version"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"warc"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"digest"}}]}}]}}]} as unknown as DocumentNode<EvidenceFieldsFragment, unknown>;
export const AtsBoardFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ATSBoardFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ATSBoard"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"vendor"}},{"kind":"Field","name":{"kind":"Name","value":"board_type"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"is_active"}},{"kind":"Field","name":{"kind":"Name","value":"first_seen_at"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_at"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EvidenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EvidenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Evidence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source_type"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"observed_at"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"extractor_version"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"warc"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"digest"}}]}}]}}]} as unknown as DocumentNode<AtsBoardFieldsFragment, unknown>;
export const CompanyFactFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFactFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompanyFact"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"value_json"}},{"kind":"Field","name":{"kind":"Name","value":"value_text"}},{"kind":"Field","name":{"kind":"Name","value":"normalized_value"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EvidenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EvidenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Evidence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source_type"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"observed_at"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"extractor_version"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"warc"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"digest"}}]}}]}}]} as unknown as DocumentNode<CompanyFactFieldsFragment, unknown>;
export const CompanySnapshotFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanySnapshotFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompanySnapshot"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"fetched_at"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"text_sample"}},{"kind":"Field","name":{"kind":"Name","value":"jsonld"}},{"kind":"Field","name":{"kind":"Name","value":"extracted"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EvidenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EvidenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Evidence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source_type"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"observed_at"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"extractor_version"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"warc"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"digest"}}]}}]}}]} as unknown as DocumentNode<CompanySnapshotFieldsFragment, unknown>;
export const CompanyFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Company"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"industry"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"canonical_domain"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"service_taxonomy"}},{"kind":"Field","name":{"kind":"Name","value":"industries"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reasons"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_source_url"}},{"kind":"Field","name":{"kind":"Name","value":"ats_boards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"vendor"}},{"kind":"Field","name":{"kind":"Name","value":"board_type"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"is_active"}},{"kind":"Field","name":{"kind":"Name","value":"first_seen_at"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_at"}}]}}]}}]} as unknown as DocumentNode<CompanyFieldsFragment, unknown>;
export const DeleteJobDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteJob"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteJob"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteJobMutation, DeleteJobMutationVariables>;
export const ExecuteSqlDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ExecuteSql"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sql"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"executeSql"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sql"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sql"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sql"}},{"kind":"Field","name":{"kind":"Name","value":"explanation"}},{"kind":"Field","name":{"kind":"Name","value":"columns"}},{"kind":"Field","name":{"kind":"Name","value":"rows"}},{"kind":"Field","name":{"kind":"Name","value":"drilldownSearchQuery"}}]}}]}}]} as unknown as DocumentNode<ExecuteSqlQuery, ExecuteSqlQueryVariables>;
export const GetJobDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetJob"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"job"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"external_id"}},{"kind":"Field","name":{"kind":"Name","value":"source_id"}},{"kind":"Field","name":{"kind":"Name","value":"source_kind"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"company_key"}},{"kind":"Field","name":{"kind":"Name","value":"company"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"posted_at"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reason"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"is_remote_eu"}},{"kind":"Field","name":{"kind":"Name","value":"remote_eu_confidence"}},{"kind":"Field","name":{"kind":"Name","value":"remote_eu_reason"}},{"kind":"Field","name":{"kind":"Name","value":"skills"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tag"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Company"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"industry"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"canonical_domain"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"service_taxonomy"}},{"kind":"Field","name":{"kind":"Name","value":"industries"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reasons"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_source_url"}},{"kind":"Field","name":{"kind":"Name","value":"ats_boards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"vendor"}},{"kind":"Field","name":{"kind":"Name","value":"board_type"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"is_active"}},{"kind":"Field","name":{"kind":"Name","value":"first_seen_at"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_at"}}]}}]}}]} as unknown as DocumentNode<GetJobQuery, GetJobQueryVariables>;
export const GetJobsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetJobs"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sourceType"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"excludedCompanies"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"jobs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sourceType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sourceType"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"excludedCompanies"},"value":{"kind":"Variable","name":{"kind":"Name","value":"excludedCompanies"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"jobs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"external_id"}},{"kind":"Field","name":{"kind":"Name","value":"source_id"}},{"kind":"Field","name":{"kind":"Name","value":"source_kind"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"company_key"}},{"kind":"Field","name":{"kind":"Name","value":"company"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"posted_at"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reason"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"skills"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tag"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Company"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"industry"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"canonical_domain"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"service_taxonomy"}},{"kind":"Field","name":{"kind":"Name","value":"industries"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reasons"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_source_url"}},{"kind":"Field","name":{"kind":"Name","value":"ats_boards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"vendor"}},{"kind":"Field","name":{"kind":"Name","value":"board_type"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"is_active"}},{"kind":"Field","name":{"kind":"Name","value":"first_seen_at"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_at"}}]}}]}}]} as unknown as DocumentNode<GetJobsQuery, GetJobsQueryVariables>;
export const GetUserSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"user_id"}},{"kind":"Field","name":{"kind":"Name","value":"preferred_locations"}},{"kind":"Field","name":{"kind":"Name","value":"preferred_skills"}},{"kind":"Field","name":{"kind":"Name","value":"excluded_companies"}}]}}]}}]} as unknown as DocumentNode<GetUserSettingsQuery, GetUserSettingsQueryVariables>;
export const TextToSqlDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TextToSql"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"question"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"textToSql"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"question"},"value":{"kind":"Variable","name":{"kind":"Name","value":"question"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sql"}},{"kind":"Field","name":{"kind":"Name","value":"explanation"}},{"kind":"Field","name":{"kind":"Name","value":"columns"}},{"kind":"Field","name":{"kind":"Name","value":"rows"}},{"kind":"Field","name":{"kind":"Name","value":"drilldownSearchQuery"}}]}}]}}]} as unknown as DocumentNode<TextToSqlQuery, TextToSqlQueryVariables>;
export const UpdateUserSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"settings"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UserSettingsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}},{"kind":"Argument","name":{"kind":"Name","value":"settings"},"value":{"kind":"Variable","name":{"kind":"Name","value":"settings"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"user_id"}},{"kind":"Field","name":{"kind":"Name","value":"email_notifications"}},{"kind":"Field","name":{"kind":"Name","value":"daily_digest"}},{"kind":"Field","name":{"kind":"Name","value":"new_job_alerts"}},{"kind":"Field","name":{"kind":"Name","value":"preferred_locations"}},{"kind":"Field","name":{"kind":"Name","value":"preferred_skills"}},{"kind":"Field","name":{"kind":"Name","value":"excluded_companies"}},{"kind":"Field","name":{"kind":"Name","value":"dark_mode"}},{"kind":"Field","name":{"kind":"Name","value":"jobs_per_page"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}}]}}]}}]} as unknown as DocumentNode<UpdateUserSettingsMutation, UpdateUserSettingsMutationVariables>;
export const CreateApplicationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateApplication"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ApplicationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createApplication"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}},{"kind":"Field","name":{"kind":"Name","value":"questions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"questionId"}},{"kind":"Field","name":{"kind":"Name","value":"questionText"}},{"kind":"Field","name":{"kind":"Name","value":"answerText"}}]}}]}}]}}]} as unknown as DocumentNode<CreateApplicationMutation, CreateApplicationMutationVariables>;
export const CreateCompanyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCompany"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateCompanyInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCompany"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Company"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"industry"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"canonical_domain"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"service_taxonomy"}},{"kind":"Field","name":{"kind":"Name","value":"industries"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reasons"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_source_url"}},{"kind":"Field","name":{"kind":"Name","value":"ats_boards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"vendor"}},{"kind":"Field","name":{"kind":"Name","value":"board_type"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"is_active"}},{"kind":"Field","name":{"kind":"Name","value":"first_seen_at"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_at"}}]}}]}}]} as unknown as DocumentNode<CreateCompanyMutation, CreateCompanyMutationVariables>;
export const UpdateCompanyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateCompany"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateCompanyInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateCompany"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Company"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"industry"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"canonical_domain"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"service_taxonomy"}},{"kind":"Field","name":{"kind":"Name","value":"industries"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reasons"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_source_url"}},{"kind":"Field","name":{"kind":"Name","value":"ats_boards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"vendor"}},{"kind":"Field","name":{"kind":"Name","value":"board_type"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"is_active"}},{"kind":"Field","name":{"kind":"Name","value":"first_seen_at"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_at"}}]}}]}}]} as unknown as DocumentNode<UpdateCompanyMutation, UpdateCompanyMutationVariables>;
export const DeleteCompanyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteCompany"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteCompany"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteCompanyMutation, DeleteCompanyMutationVariables>;
export const EnhanceCompanyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"EnhanceCompany"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"key"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"enhanceCompany"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"key"},"value":{"kind":"Variable","name":{"kind":"Name","value":"key"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"companyId"}},{"kind":"Field","name":{"kind":"Name","value":"companyKey"}}]}}]}}]} as unknown as DocumentNode<EnhanceCompanyMutation, EnhanceCompanyMutationVariables>;
export const AddCompanyFactsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddCompanyFacts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"company_id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"facts"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CompanyFactInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"add_company_facts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"company_id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"company_id"}}},{"kind":"Argument","name":{"kind":"Name","value":"facts"},"value":{"kind":"Variable","name":{"kind":"Name","value":"facts"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFactFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EvidenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Evidence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source_type"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"observed_at"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"extractor_version"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"warc"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"digest"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFactFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompanyFact"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"value_json"}},{"kind":"Field","name":{"kind":"Name","value":"value_text"}},{"kind":"Field","name":{"kind":"Name","value":"normalized_value"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EvidenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}}]} as unknown as DocumentNode<AddCompanyFactsMutation, AddCompanyFactsMutationVariables>;
export const UpsertCompanyAtsBoardsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpsertCompanyATSBoards"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"company_id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"boards"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ATSBoardUpsertInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"upsert_company_ats_boards"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"company_id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"company_id"}}},{"kind":"Argument","name":{"kind":"Name","value":"boards"},"value":{"kind":"Variable","name":{"kind":"Name","value":"boards"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ATSBoardFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EvidenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Evidence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source_type"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"observed_at"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"extractor_version"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"warc"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"digest"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ATSBoardFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ATSBoard"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"vendor"}},{"kind":"Field","name":{"kind":"Name","value":"board_type"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"is_active"}},{"kind":"Field","name":{"kind":"Name","value":"first_seen_at"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_at"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EvidenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}}]}}]} as unknown as DocumentNode<UpsertCompanyAtsBoardsMutation, UpsertCompanyAtsBoardsMutationVariables>;
export const IngestCompanySnapshotDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"IngestCompanySnapshot"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"company_id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"source_url"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"crawl_id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"capture_timestamp"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"fetched_at"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"http_status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"mime"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"content_hash"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"text_sample"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"jsonld"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"extracted"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"evidence"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"EvidenceInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ingest_company_snapshot"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"company_id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"company_id"}}},{"kind":"Argument","name":{"kind":"Name","value":"source_url"},"value":{"kind":"Variable","name":{"kind":"Name","value":"source_url"}}},{"kind":"Argument","name":{"kind":"Name","value":"crawl_id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"crawl_id"}}},{"kind":"Argument","name":{"kind":"Name","value":"capture_timestamp"},"value":{"kind":"Variable","name":{"kind":"Name","value":"capture_timestamp"}}},{"kind":"Argument","name":{"kind":"Name","value":"fetched_at"},"value":{"kind":"Variable","name":{"kind":"Name","value":"fetched_at"}}},{"kind":"Argument","name":{"kind":"Name","value":"http_status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"http_status"}}},{"kind":"Argument","name":{"kind":"Name","value":"mime"},"value":{"kind":"Variable","name":{"kind":"Name","value":"mime"}}},{"kind":"Argument","name":{"kind":"Name","value":"content_hash"},"value":{"kind":"Variable","name":{"kind":"Name","value":"content_hash"}}},{"kind":"Argument","name":{"kind":"Name","value":"text_sample"},"value":{"kind":"Variable","name":{"kind":"Name","value":"text_sample"}}},{"kind":"Argument","name":{"kind":"Name","value":"jsonld"},"value":{"kind":"Variable","name":{"kind":"Name","value":"jsonld"}}},{"kind":"Argument","name":{"kind":"Name","value":"extracted"},"value":{"kind":"Variable","name":{"kind":"Name","value":"extracted"}}},{"kind":"Argument","name":{"kind":"Name","value":"evidence"},"value":{"kind":"Variable","name":{"kind":"Name","value":"evidence"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanySnapshotFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EvidenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Evidence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source_type"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"observed_at"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"extractor_version"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"warc"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"digest"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanySnapshotFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompanySnapshot"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"fetched_at"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"text_sample"}},{"kind":"Field","name":{"kind":"Name","value":"jsonld"}},{"kind":"Field","name":{"kind":"Name","value":"extracted"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EvidenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}}]} as unknown as DocumentNode<IngestCompanySnapshotMutation, IngestCompanySnapshotMutationVariables>;
export const GetCompanyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCompany"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"key"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"company"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"key"},"value":{"kind":"Variable","name":{"kind":"Name","value":"key"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Company"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"industry"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"canonical_domain"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"service_taxonomy"}},{"kind":"Field","name":{"kind":"Name","value":"industries"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reasons"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_source_url"}},{"kind":"Field","name":{"kind":"Name","value":"ats_boards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"vendor"}},{"kind":"Field","name":{"kind":"Name","value":"board_type"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"is_active"}},{"kind":"Field","name":{"kind":"Name","value":"first_seen_at"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_at"}}]}}]}}]} as unknown as DocumentNode<GetCompanyQuery, GetCompanyQueryVariables>;
export const GetCompaniesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCompanies"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"text"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"companies"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"text"},"value":{"kind":"Variable","name":{"kind":"Name","value":"text"}}}]}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"companies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Company"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"industry"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"canonical_domain"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"service_taxonomy"}},{"kind":"Field","name":{"kind":"Name","value":"industries"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reasons"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_source_url"}},{"kind":"Field","name":{"kind":"Name","value":"ats_boards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"vendor"}},{"kind":"Field","name":{"kind":"Name","value":"board_type"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"is_active"}},{"kind":"Field","name":{"kind":"Name","value":"first_seen_at"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_at"}}]}}]}}]} as unknown as DocumentNode<GetCompaniesQuery, GetCompaniesQueryVariables>;
export const SearchCompaniesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SearchCompanies"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CompanyFilterInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order_by"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CompanyOrderBy"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"companies"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"order_by"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order_by"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"companies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Company"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"industry"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"canonical_domain"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"service_taxonomy"}},{"kind":"Field","name":{"kind":"Name","value":"industries"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reasons"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_source_url"}},{"kind":"Field","name":{"kind":"Name","value":"ats_boards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"vendor"}},{"kind":"Field","name":{"kind":"Name","value":"board_type"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"is_active"}},{"kind":"Field","name":{"kind":"Name","value":"first_seen_at"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_at"}}]}}]}}]} as unknown as DocumentNode<SearchCompaniesQuery, SearchCompaniesQueryVariables>;
export const GetCompanyFactsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCompanyFacts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"company_id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"field"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"company_facts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"company_id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"company_id"}}},{"kind":"Argument","name":{"kind":"Name","value":"field"},"value":{"kind":"Variable","name":{"kind":"Name","value":"field"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFactFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EvidenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Evidence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source_type"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"observed_at"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"extractor_version"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"warc"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"digest"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFactFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompanyFact"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"value_json"}},{"kind":"Field","name":{"kind":"Name","value":"value_text"}},{"kind":"Field","name":{"kind":"Name","value":"normalized_value"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EvidenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}}]} as unknown as DocumentNode<GetCompanyFactsQuery, GetCompanyFactsQueryVariables>;
export const GetCompanyAtsBoardsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCompanyATSBoards"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"company_id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"company_ats_boards"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"company_id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"company_id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ATSBoardFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EvidenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Evidence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source_type"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"observed_at"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"extractor_version"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"warc"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"digest"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ATSBoardFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ATSBoard"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"vendor"}},{"kind":"Field","name":{"kind":"Name","value":"board_type"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"is_active"}},{"kind":"Field","name":{"kind":"Name","value":"first_seen_at"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_at"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EvidenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}}]}}]} as unknown as DocumentNode<GetCompanyAtsBoardsQuery, GetCompanyAtsBoardsQueryVariables>;
export const CompanyAuditDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CompanyAudit"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"key"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"company"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"key"},"value":{"kind":"Variable","name":{"kind":"Name","value":"key"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFields"}},{"kind":"Field","name":{"kind":"Name","value":"facts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"200"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanyFactFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"facts_count"}},{"kind":"Field","name":{"kind":"Name","value":"snapshots"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"10"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CompanySnapshotFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"snapshots_count"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"EvidenceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Evidence"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source_type"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"observed_at"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"extractor_version"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"warc"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"offset"}},{"kind":"Field","name":{"kind":"Name","value":"length"}},{"kind":"Field","name":{"kind":"Name","value":"digest"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Company"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"logo_url"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"industry"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"canonical_domain"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"service_taxonomy"}},{"kind":"Field","name":{"kind":"Name","value":"industries"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"score_reasons"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_source_url"}},{"kind":"Field","name":{"kind":"Name","value":"ats_boards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"vendor"}},{"kind":"Field","name":{"kind":"Name","value":"board_type"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"is_active"}},{"kind":"Field","name":{"kind":"Name","value":"first_seen_at"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_at"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanyFactFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompanyFact"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"value_json"}},{"kind":"Field","name":{"kind":"Name","value":"value_text"}},{"kind":"Field","name":{"kind":"Name","value":"normalized_value"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EvidenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CompanySnapshotFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CompanySnapshot"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"company_id"}},{"kind":"Field","name":{"kind":"Name","value":"source_url"}},{"kind":"Field","name":{"kind":"Name","value":"crawl_id"}},{"kind":"Field","name":{"kind":"Name","value":"capture_timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"fetched_at"}},{"kind":"Field","name":{"kind":"Name","value":"http_status"}},{"kind":"Field","name":{"kind":"Name","value":"mime"}},{"kind":"Field","name":{"kind":"Name","value":"content_hash"}},{"kind":"Field","name":{"kind":"Name","value":"text_sample"}},{"kind":"Field","name":{"kind":"Name","value":"jsonld"}},{"kind":"Field","name":{"kind":"Name","value":"extracted"}},{"kind":"Field","name":{"kind":"Name","value":"evidence"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"EvidenceFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}}]} as unknown as DocumentNode<CompanyAuditQuery, CompanyAuditQueryVariables>;
export const GetPromptsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPrompts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"prompts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"labels"}},{"kind":"Field","name":{"kind":"Name","value":"versions"}},{"kind":"Field","name":{"kind":"Name","value":"lastUpdatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastConfig"}},{"kind":"Field","name":{"kind":"Name","value":"usageCount"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsedBy"}}]}}]}}]} as unknown as DocumentNode<GetPromptsQuery, GetPromptsQueryVariables>;
export const GetMyPromptUsageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMyPromptUsage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myPromptUsage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"promptName"}},{"kind":"Field","name":{"kind":"Name","value":"userEmail"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"usedAt"}},{"kind":"Field","name":{"kind":"Name","value":"traceId"}}]}}]}}]} as unknown as DocumentNode<GetMyPromptUsageQuery, GetMyPromptUsageQueryVariables>;
export const CreatePromptDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePrompt"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreatePromptInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPrompt"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"labels"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}}]}}]}}]} as unknown as DocumentNode<CreatePromptMutation, CreatePromptMutationVariables>;