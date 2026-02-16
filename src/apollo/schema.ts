import { makeExecutableSchema } from "@graphql-tools/schema";
import { resolvers } from "./resolvers";

// Inline GraphQL schema definitions for Edge Runtime compatibility
const typeDefs = `
scalar JSON
scalar DateTime
scalar URL
scalar EmailAddress
scalar Upload

type Query
type Mutation

enum SourceType {
  COMMONCRAWL
  LIVE_FETCH
  MANUAL
  PARTNER
}

enum ExtractMethod {
  JSONLD
  META
  DOM
  HEURISTIC
  LLM
}

extend type Query {
  jobs(
    sourceType: String
    status: String
    search: String
    limit: Int
    offset: Int
    excludedCompanies: [String!]
  ): JobsResponse!
  job(id: String!): Job
  userSettings(userId: String!): UserSettings
  # TODO: Re-enable when migrated to Edge Runtime compatible implementation
  # textToSql(question: String!): TextToSqlResult!
  # executeSql(sql: String!): TextToSqlResult!
}

extend type Mutation {
  updateUserSettings(
    userId: String!
    settings: UserSettingsInput!
  ): UserSettings!
  deleteJob(id: Int!): DeleteJobResponse!
  """
  Enhance a job posting by fetching detailed data from the ATS (Applicant Tracking System).

  Supported ATS sources:
  - greenhouse: Greenhouse ATS (https://greenhouse.io)
  - lever: Lever ATS (https://lever.co)

  For Greenhouse:
  - jobId: The job posting ID from the URL (e.g., "5802159004" from https://job-boards.greenhouse.io/grafanalabs/jobs/5802159004)
  - company: The board token (e.g., "grafanalabs")

  For Lever:
  - jobId: The posting ID (e.g., "5ac21346-8e0c-4494-8e7a-3eb92ff77902")
  - company: The site name (e.g., "leverdemo")

  The mutation will:
  1. Fetch comprehensive job data from the ATS API
  2. Save enhanced fields (description, departments, offices, questions, etc.)
  3. Return the updated job with full ATS data
  """
  enhanceJobFromATS(
    jobId: String! # The unique job/posting ID from the ATS
    company: String! # The company identifier (board_token for Greenhouse, site name for Lever)
    source: String! # ATS source: "greenhouse" or "lever"
  ): EnhanceJobResponse!
}

type JobSkill {
  tag: String!
  level: String!
  confidence: Float
  evidence: String
}

type GreenhouseDepartment {
  id: String!
  name: String!
  child_ids: [String!]!
  parent_id: String
}

type GreenhouseOffice {
  id: String!
  name: String!
  location: String
  child_ids: [String!]!
  parent_id: String
}

type GreenhouseQuestionField {
  type: String!
  name: String
}

type GreenhouseQuestion {
  description: String
  label: String!
  required: Boolean!
  fields: [GreenhouseQuestionField!]!
}

type GreenhouseMetadata {
  id: String!
  name: String!
  value: String!
  value_type: String!
}

type GreenhouseDataCompliance {
  type: String!
  requires_consent: Boolean!
  requires_processing_consent: Boolean!
  requires_retention_consent: Boolean!
  retention_period: Int
  demographic_data_consent_applies: Boolean!
}

type GreenhouseCompliance {
  type: String!
  description: String
  questions: [GreenhouseQuestion!]
}

type GreenhouseDemographicQuestions {
  header: String
  description: String
  questions: [GreenhouseQuestion!]
}

# Lever ATS types

type LeverCategories {
  commitment: String
  location: String
  team: String
  department: String
  allLocations: [String!]
}

type LeverList {
  text: String!
  content: String!
}

type Job {
  id: Int!
  external_id: String!
  source_id: String
  source_kind: String!
  company_id: Int
  company_key: String!
  company: Company
  title: String!
  location: String
  url: String!
  description: String
  posted_at: String!
  score: Float
  score_reason: String
  status: String
  is_remote_eu: Boolean
  remote_eu_confidence: String
  remote_eu_reason: String
  skills: [JobSkill!]

  # Greenhouse ATS fields (parsed from ats_data)
  absolute_url: String
  internal_job_id: String
  requisition_id: String
  company_name: String
  first_published: String
  language: String
  metadata: [GreenhouseMetadata!]
  departments: [GreenhouseDepartment!]
  offices: [GreenhouseOffice!]
  questions: [GreenhouseQuestion!]
  location_questions: [GreenhouseQuestion!]
  compliance: [GreenhouseCompliance!]
  demographic_questions: GreenhouseDemographicQuestions
  data_compliance: [GreenhouseDataCompliance!]

  # Lever ATS fields (parsed from ats_data)
  categories: LeverCategories
  workplace_type: String # on-site, remote, hybrid, or unspecified
  country: String # ISO 3166-1 alpha-2 country code
  opening: String # Job description opening (HTML)
  opening_plain: String # Job description opening (plaintext)
  description_body: String # Job description body without opening (HTML)
  description_body_plain: String # Job description body without opening (plaintext)
  additional: String # Optional closing content (HTML)
  additional_plain: String # Optional closing content (plaintext)
  lists: [LeverList!] # Requirements, benefits, etc.
  ats_created_at: String # When the posting was created in the ATS
  created_at: String!
  updated_at: String!
}

type JobsResponse {
  jobs: [Job!]!
  totalCount: Int!
}

type UserSettings {
  id: Int!
  user_id: String!
  email_notifications: Boolean!
  daily_digest: Boolean!
  new_job_alerts: Boolean!
  preferred_locations: [String!]
  preferred_skills: [String!]
  excluded_companies: [String!]
  dark_mode: Boolean!
  jobs_per_page: Int!
  created_at: String!
  updated_at: String!
}

input UserSettingsInput {
  email_notifications: Boolean
  daily_digest: Boolean
  new_job_alerts: Boolean
  preferred_locations: [String!]
  preferred_skills: [String!]
  excluded_companies: [String!]
  dark_mode: Boolean
  jobs_per_page: Int
}

type TextToSqlResult {
  sql: String!
  explanation: String
  columns: [String!]!
  rows: [[JSON]]!
  drilldownSearchQuery: String
}

type DeleteJobResponse {
  success: Boolean!
  message: String
}

"""
Response from enhancing a job with ATS data
"""
type EnhanceJobResponse {
  """
  Whether the enhancement was successful
  """
  success: Boolean!
  """
  Human-readable message about the operation result
  """
  message: String
  """
  The updated job record with enhanced data from the ATS
  """
  job: Job
  """
  Raw enhanced data from the ATS API (Greenhouse or Lever).

  Greenhouse data includes:
  - content: Full HTML job description
  - departments: Array of department objects with id, name, child_ids, parent_id
  - offices: Array of office objects with id, name, location, child_ids, parent_id
  - questions: Application form questions
  - metadata: Custom fields
  - compliance: Compliance questions
  - demographic_questions: EEOC/diversity questions

  Lever data includes:
  - description: Combined job description (HTML)
  - descriptionPlain: Description as plaintext
  - categories: location, commitment, team, department
  - lists: Requirements, benefits, etc.
  - workplaceType: on-site, remote, hybrid, or unspecified
  - salaryRange: Currency, interval, min, max
  """
  enhancedData: JSON
}

extend type Query {
  companies(
    filter: CompanyFilterInput
    order_by: CompanyOrderBy
    limit: Int
    offset: Int
  ): CompaniesResponse!
  company(id: Int, key: String): Company
  company_facts(
    company_id: Int!
    field: String
    limit: Int
    offset: Int
  ): [CompanyFact!]!
  company_snapshots(
    company_id: Int!
    limit: Int
    offset: Int
  ): [CompanySnapshot!]!
  company_ats_boards(company_id: Int!): [ATSBoard!]!
}

extend type Mutation {
  createCompany(input: CreateCompanyInput!): Company!
  updateCompany(id: Int!, input: UpdateCompanyInput!): Company!
  deleteCompany(id: Int!): DeleteCompanyResponse!
  enhanceCompany(id: Int, key: String): EnhanceCompanyResponse!
  add_company_facts(
    company_id: Int!
    facts: [CompanyFactInput!]!
  ): [CompanyFact!]!
  upsert_company_ats_boards(
    company_id: Int!
    boards: [ATSBoardUpsertInput!]!
  ): [ATSBoard!]!
  ingest_company_snapshot(
    company_id: Int!
    source_url: String!
    crawl_id: String
    capture_timestamp: String
    fetched_at: String!
    http_status: Int
    mime: String
    content_hash: String
    text_sample: String
    jsonld: JSON
    extracted: JSON
    evidence: EvidenceInput!
  ): CompanySnapshot!
}

enum CompanyCategory {
  CONSULTANCY
  AGENCY
  STAFFING
  DIRECTORY
  PRODUCT
  OTHER
  UNKNOWN
}

enum ATSVendor {
  GREENHOUSE
  LEVER
  WORKABLE
  TEAMTAILOR
  ASHBY
  SMARTRECRUITERS
  JAZZHR
  BREEZYHR
  ICIMS
  JOBVITE
  SAP_SUCCESSFACTORS
  ORACLE_TALEO
  OTHER
}

enum ATSBoardType {
  JOBS_PAGE
  BOARD_API
  BOARD_WIDGET
  UNKNOWN
}

enum CompanyOrderBy {
  SCORE_DESC
  UPDATED_AT_DESC
  CREATED_AT_DESC
}

# Evidence / Provenance
type WarcPointer {
  filename: String!
  offset: Int!
  length: Int!
  digest: String
}

type Evidence {
  source_type: SourceType!
  source_url: String!
  crawl_id: String
  capture_timestamp: String
  observed_at: String!
  method: ExtractMethod!
  extractor_version: String
  http_status: Int
  mime: String
  content_hash: String
  warc: WarcPointer
}

# Company Facts (MDM)
type CompanyFact {
  id: Int!
  company_id: Int!
  field: String!
  value_json: JSON
  value_text: String
  normalized_value: JSON
  confidence: Float!
  evidence: Evidence!
  created_at: String!
}

# Company Snapshots
type CompanySnapshot {
  id: Int!
  company_id: Int!
  source_url: String!
  crawl_id: String
  capture_timestamp: String
  fetched_at: String!
  http_status: Int
  mime: String
  content_hash: String
  text_sample: String
  jsonld: JSON
  extracted: JSON
  evidence: Evidence!
  created_at: String!
}

# ATS Boards
type ATSBoard {
  id: Int!
  company_id: Int!
  url: String!
  vendor: ATSVendor!
  board_type: ATSBoardType!
  confidence: Float!
  is_active: Boolean!
  first_seen_at: String!
  last_seen_at: String!
  evidence: Evidence!
  created_at: String!
  updated_at: String!
}

# Company (Golden Record)
type Company {
  id: Int!
  key: String!
  name: String!
  logo_url: String
  website: String
  description: String
  industry: String
  size: String
  location: String
  created_at: String!
  updated_at: String!

  # Golden record fields
  canonical_domain: String
  category: CompanyCategory!
  tags: [String!]!
  services: [String!]!
  service_taxonomy: [String!]!
  industries: [String!]!
  score: Float!
  score_reasons: [String!]!
  last_seen_crawl_id: String
  last_seen_capture_timestamp: String
  last_seen_source_url: String

  # Related data
  ats_boards: [ATSBoard!]!
  facts(limit: Int, offset: Int, field: String): [CompanyFact!]!
  facts_count: Int!
  snapshots(limit: Int, offset: Int): [CompanySnapshot!]!
  snapshots_count: Int!
}

type CompaniesResponse {
  companies: [Company!]!
  totalCount: Int!
}

input CreateCompanyInput {
  key: String!
  name: String!
  logo_url: String
  website: String
  description: String
  industry: String
  size: String
  location: String
  canonical_domain: String
  category: CompanyCategory
  tags: [String!]
  services: [String!]
  service_taxonomy: [String!]
  industries: [String!]
}

input UpdateCompanyInput {
  key: String
  name: String
  logo_url: String
  website: String
  description: String
  industry: String
  size: String
  location: String
  canonical_domain: String
  category: CompanyCategory
  tags: [String!]
  services: [String!]
  service_taxonomy: [String!]
  industries: [String!]
  score: Float
  score_reasons: [String!]
}

input WarcPointerInput {
  filename: String!
  offset: Int!
  length: Int!
  digest: String
}

input EvidenceInput {
  source_type: SourceType!
  source_url: String!
  crawl_id: String
  capture_timestamp: String
  observed_at: String!
  method: ExtractMethod!
  extractor_version: String
  http_status: Int
  mime: String
  content_hash: String
  warc: WarcPointerInput
}

input CompanyFactInput {
  field: String!
  value_json: JSON
  value_text: String
  normalized_value: JSON
  confidence: Float!
  evidence: EvidenceInput!
}

input ATSBoardUpsertInput {
  url: String!
  vendor: ATSVendor!
  board_type: ATSBoardType!
  confidence: Float!
  is_active: Boolean!
  last_seen_at: String!
  evidence: EvidenceInput!
}

input CompanyFilterInput {
  text: String
  category_in: [CompanyCategory!]
  min_score: Float
  has_ats_boards: Boolean
  service_taxonomy_any: [String!]
  canonical_domain_in: [String!]
}

type DeleteCompanyResponse {
  success: Boolean!
  message: String
}

type EnhanceCompanyResponse {
  success: Boolean!
  message: String
  companyId: Int
  companyKey: String
}

extend type Query {
  prompt(name: String!, version: Int, label: String): Prompt
  prompts: [RegisteredPrompt!]!
  myPromptUsage(limit: Int): [PromptUsage!]!
}

extend type Mutation {
  createPrompt(input: CreatePromptInput!): Prompt!
  updatePromptLabel(name: String!, version: Int!, label: String!): Prompt!
}

enum PromptType {
  TEXT
  CHAT
}

type ChatMessage {
  role: String!
  content: String!
}

type PromptConfig {
  temperature: Float
  max_tokens: Int
  top_p: Float
  model: String
}

type Prompt {
  name: String!
  version: Int
  type: PromptType!
  prompt: String
  chatMessages: [ChatMessage!]
  config: PromptConfig
  labels: [String!]
  tags: [String!]
  createdAt: String
  updatedAt: String
  createdBy: String
  isUserSpecific: Boolean!
}

type RegisteredPrompt {
  name: String!
  type: String!
  content: JSON
  tags: [String!]!
  labels: [String!]!
  versions: [Int!]!
  lastUpdatedAt: String!
  lastConfig: JSON
  usageCount: Int
  lastUsedBy: String
}

type PromptUsage {
  promptName: String!
  userEmail: String!
  version: Int
  label: String
  usedAt: String!
  traceId: String
}

input CreatePromptInput {
  name: String!
  type: PromptType!
  prompt: String
  chatMessages: [ChatMessageInput!]
  config: PromptConfigInput
  labels: [String!]
  tags: [String!]
}

input ChatMessageInput {
  role: String!
  content: String!
}

input PromptConfigInput {
  temperature: Float
  max_tokens: Int
  top_p: Float
  model: String
}

extend type Query {
  langsmithPrompt(promptIdentifier: String!): LangSmithPrompt
  langsmithPrompts(
    isPublic: Boolean
    isArchived: Boolean
    query: String
  ): [LangSmithPrompt!]!
  langsmithPromptCommit(
    promptIdentifier: String!
    includeModel: Boolean
  ): LangSmithPromptCommit
}

extend type Mutation {
  createLangSmithPrompt(
    promptIdentifier: String!
    input: CreateLangSmithPromptInput
  ): LangSmithPrompt!
  updateLangSmithPrompt(
    promptIdentifier: String!
    input: UpdateLangSmithPromptInput!
  ): LangSmithPrompt!
  deleteLangSmithPrompt(promptIdentifier: String!): Boolean!
  pushLangSmithPrompt(
    promptIdentifier: String!
    input: PushLangSmithPromptInput
  ): String!
}

type LangSmithPrompt {
  id: String!
  promptHandle: String!
  fullName: String!
  description: String
  readme: String
  tenantId: String!
  createdAt: String!
  updatedAt: String!
  isPublic: Boolean!
  isArchived: Boolean!
  tags: [String!]!
  owner: String
  numLikes: Int!
  numDownloads: Int!
  numViews: Int!
  numCommits: Int!
  lastCommitHash: String
  likedByAuthUser: Boolean!
}

type LangSmithPromptCommit {
  owner: String!
  promptName: String!
  commitHash: String!
  manifest: JSON!
  examples: [JSON!]!
}

input CreateLangSmithPromptInput {
  description: String
  readme: String
  tags: [String!]
  isPublic: Boolean
}

input UpdateLangSmithPromptInput {
  description: String
  readme: String
  tags: [String!]
  isPublic: Boolean
  isArchived: Boolean
}

input PushLangSmithPromptInput {
  object: JSON
  parentCommitHash: String
  description: String
  readme: String
  tags: [String!]
  isPublic: Boolean
}

extend type Query {
  applications: [Application!]!
}

extend type Mutation {
  createApplication(input: ApplicationInput!): Application!
}

type QuestionAnswer {
  questionId: String!
  questionText: String!
  answerText: String!
}

type Application {
  # Email of the currently authenticated user
  email: EmailAddress!
  jobId: String!
  resume: Upload
  questions: [QuestionAnswer!]!
}

input QuestionAnswerInput {
  questionId: String!
  questionText: String!
  answerText: String!
}

input ApplicationInput {
  jobId: String!
  resume: Upload
  questions: [QuestionAnswerInput!]!
}
`;

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});
