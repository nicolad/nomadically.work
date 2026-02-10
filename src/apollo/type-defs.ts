import { gql } from "@apollo/client";

export const typeDefs = gql`
  scalar JSON
  scalar DateTime
  scalar URL

  # Enums
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
  }

  type RegisteredPrompt {
    name: String!
    fallbackText: String!
    description: String!
    category: String!
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

  type JobSkill {
    tag: String!
    level: String!
    confidence: Float
    evidence: String
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
    created_at: String!
    updated_at: String!
  }

  type JobsResponse {
    jobs: [Job!]!
    totalCount: Int!
  }

  type CompaniesResponse {
    companies: [Company!]!
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

  enum CompanyOrderBy {
    SCORE_DESC
    UPDATED_AT_DESC
    CREATED_AT_DESC
  }

  type TextToSqlResult {
    sql: String!
    explanation: String
    columns: [String!]!
    rows: [[JSON]]!
    drilldownSearchQuery: String
  }

  type Query {
    jobs(
      sourceType: String
      status: String
      search: String
      limit: Int
      offset: Int
      excludedCompanies: [String!]
    ): JobsResponse!
    job(id: String!): Job

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

    userSettings(userId: String!): UserSettings

    textToSql(question: String!): TextToSqlResult!
    executeSql(sql: String!): TextToSqlResult!

    # Prompt Management
    prompt(name: String!, version: Int): Prompt
    prompts: [RegisteredPrompt!]!
  }

  type Mutation {
    updateUserSettings(
      userId: String!
      settings: UserSettingsInput!
    ): UserSettings!
    deleteJob(id: Int!): DeleteJobResponse!

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

  type DeleteJobResponse {
    success: Boolean!
    message: String
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
`;
