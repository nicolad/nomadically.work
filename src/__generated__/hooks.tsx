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

export type AiBackendPrep = {
  __typename?: 'AIBackendPrep';
  aiMlIntegration: Maybe<BackendPrepSection>;
  apiDesign: Maybe<BackendPrepSection>;
  authSecurity: Maybe<BackendPrepSection>;
  caching: Maybe<BackendPrepSection>;
  concurrencyAsync: Maybe<BackendPrepSection>;
  databaseDesign: Maybe<BackendPrepSection>;
  devops: Maybe<BackendPrepSection>;
  distributedSystems: Maybe<BackendPrepSection>;
  eventDriven: Maybe<BackendPrepSection>;
  generatedAt: Scalars['String']['output'];
  messageQueues: Maybe<BackendPrepSection>;
  microservices: Maybe<BackendPrepSection>;
  nosqlPatterns: Maybe<BackendPrepSection>;
  observability: Maybe<BackendPrepSection>;
  performance: Maybe<BackendPrepSection>;
  securityOwasp: Maybe<BackendPrepSection>;
  serverlessEdge: Maybe<BackendPrepSection>;
  sqlOptimization: Maybe<BackendPrepSection>;
  systemDesign: Maybe<BackendPrepSection>;
  testing: Maybe<BackendPrepSection>;
  typescriptNode: Maybe<BackendPrepSection>;
};

export type AiInterviewPrep = {
  __typename?: 'AIInterviewPrep';
  generatedAt: Scalars['String']['output'];
  requirements: Array<AiInterviewPrepRequirement>;
  summary: Scalars['String']['output'];
};

export type AiInterviewPrepRequirement = {
  __typename?: 'AIInterviewPrepRequirement';
  deepDive: Maybe<Scalars['String']['output']>;
  questions: Array<Scalars['String']['output']>;
  requirement: Scalars['String']['output'];
  sourceQuote: Maybe<Scalars['String']['output']>;
  studyTopicDeepDives: Array<AiStudyTopicDeepDive>;
  studyTopics: Array<Scalars['String']['output']>;
};

export type AiInterviewQuestion = {
  __typename?: 'AIInterviewQuestion';
  category: Scalars['String']['output'];
  question: Scalars['String']['output'];
  reason: Scalars['String']['output'];
};

export type AiInterviewQuestions = {
  __typename?: 'AIInterviewQuestions';
  companyContext: Scalars['String']['output'];
  recruiterGeneratedAt: Maybe<Scalars['String']['output']>;
  recruiterQuestions: Array<AiInterviewQuestion>;
  technicalGeneratedAt: Maybe<Scalars['String']['output']>;
  technicalQuestions: Array<AiInterviewQuestion>;
};

export type AiStudyTopicDeepDive = {
  __typename?: 'AIStudyTopicDeepDive';
  deepDive: Scalars['String']['output'];
  topic: Scalars['String']['output'];
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

export type AgenticCoding = {
  __typename?: 'AgenticCoding';
  exercises: Array<AgenticCodingExercise>;
  failureModes: Maybe<Array<AgenticCodingFailureMode>>;
  generatedAt: Scalars['String']['output'];
  measurableOutcomes: Maybe<Array<AgenticCodingOutcome>>;
  overview: Scalars['String']['output'];
  promptTemplates: Maybe<Array<AgenticCodingPromptTemplate>>;
  qaApproach: Maybe<Scalars['String']['output']>;
  resources: Array<AgenticCodingResource>;
  teamPractices: Maybe<Scalars['String']['output']>;
  workflowPattern: Maybe<Scalars['String']['output']>;
};

export type AgenticCodingExercise = {
  __typename?: 'AgenticCodingExercise';
  agentPrompt: Scalars['String']['output'];
  description: Scalars['String']['output'];
  difficulty: Scalars['String']['output'];
  hints: Array<Scalars['String']['output']>;
  skills: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

export type AgenticCodingFailureMode = {
  __typename?: 'AgenticCodingFailureMode';
  alternative: Scalars['String']['output'];
  scenario: Scalars['String']['output'];
  why: Scalars['String']['output'];
};

export type AgenticCodingOutcome = {
  __typename?: 'AgenticCodingOutcome';
  afterTime: Scalars['String']['output'];
  beforeTime: Scalars['String']['output'];
  improvement: Scalars['String']['output'];
  task: Scalars['String']['output'];
};

export type AgenticCodingPromptTemplate = {
  __typename?: 'AgenticCodingPromptTemplate';
  prompt: Scalars['String']['output'];
  purpose: Scalars['String']['output'];
  stackContext: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type AgenticCodingResource = {
  __typename?: 'AgenticCodingResource';
  description: Scalars['String']['output'];
  title: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type Application = {
  __typename?: 'Application';
  agenticCoding: Maybe<AgenticCoding>;
  aiBackendPrep: Maybe<AiBackendPrep>;
  aiInterviewPrep: Maybe<AiInterviewPrep>;
  aiInterviewQuestions: Maybe<AiInterviewQuestions>;
  companyKey: Maybe<Scalars['String']['output']>;
  companyName: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  email: Scalars['EmailAddress']['output'];
  id: Scalars['Int']['output'];
  interviewPrep: Array<Track>;
  jobDescription: Maybe<Scalars['String']['output']>;
  jobId: Scalars['String']['output'];
  jobTitle: Maybe<Scalars['String']['output']>;
  notes: Maybe<Scalars['String']['output']>;
  questions: Array<QuestionAnswer>;
  resume: Maybe<Scalars['Upload']['output']>;
  status: ApplicationStatus;
};

export type ApplicationInput = {
  companyName?: InputMaybe<Scalars['String']['input']>;
  jobId?: InputMaybe<Scalars['String']['input']>;
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

export type ApplyEmailPatternResult = {
  __typename?: 'ApplyEmailPatternResult';
  contacts: Array<Contact>;
  contactsUpdated: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  pattern: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

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
  compensationType: Maybe<Scalars['String']['output']>;
  currencyCode: Maybe<Scalars['String']['output']>;
  id: Maybe<Scalars['String']['output']>;
  interval: Maybe<Scalars['String']['output']>;
  maxValue: Maybe<Scalars['Float']['output']>;
  minValue: Maybe<Scalars['Float']['output']>;
  summary: Maybe<Scalars['String']['output']>;
};

export type AshbyCompensationTier = {
  __typename?: 'AshbyCompensationTier';
  additionalInformation: Maybe<Scalars['String']['output']>;
  components: Array<AshbyCompensationComponent>;
  id: Maybe<Scalars['String']['output']>;
  tierSummary: Maybe<Scalars['String']['output']>;
  title: Maybe<Scalars['String']['output']>;
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

export type BackendPrepCodeExample = {
  __typename?: 'BackendPrepCodeExample';
  code: Scalars['String']['output'];
  explanation: Scalars['String']['output'];
  language: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type BackendPrepInterviewQuestion = {
  __typename?: 'BackendPrepInterviewQuestion';
  difficulty: Scalars['String']['output'];
  followUps: Array<Scalars['String']['output']>;
  idealAnswer: Scalars['String']['output'];
  question: Scalars['String']['output'];
};

export type BackendPrepSection = {
  __typename?: 'BackendPrepSection';
  codeExamples: Array<BackendPrepCodeExample>;
  commonPitfalls: Array<Scalars['String']['output']>;
  deepDive: Scalars['String']['output'];
  interviewQuestions: Array<BackendPrepInterviewQuestion>;
  keyConcepts: Array<Scalars['String']['output']>;
  overview: Scalars['String']['output'];
  researchInsights: Maybe<Scalars['String']['output']>;
  talkingPoints: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
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

/** Confidence level of a classification result. */
export type ClassificationConfidence =
  | 'high'
  | 'low'
  | 'medium';

export type CompaniesResponse = {
  __typename?: 'CompaniesResponse';
  companies: Array<Company>;
  totalCount: Scalars['Int']['output'];
};

export type Company = {
  __typename?: 'Company';
  ashby_enrichment: Maybe<AshbyEnrichment>;
  ats_boards: Array<AtsBoard>;
  category: CompanyCategory;
  contacts: Array<Contact>;
  created_at: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  facts: Array<CompanyFact>;
  facts_count: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  industries: Array<Scalars['String']['output']>;
  industry: Maybe<Scalars['String']['output']>;
  job_board_url: Maybe<Scalars['String']['output']>;
  key: Scalars['String']['output'];
  last_seen_capture_timestamp: Maybe<Scalars['String']['output']>;
  last_seen_crawl_id: Maybe<Scalars['String']['output']>;
  last_seen_source_url: Maybe<Scalars['String']['output']>;
  linkedin_url: Maybe<Scalars['String']['output']>;
  location: Maybe<Scalars['String']['output']>;
  logo_url: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  opportunities: Array<Opportunity>;
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

export type Contact = {
  __typename?: 'Contact';
  bouncedEmails: Array<Scalars['String']['output']>;
  company: Maybe<Scalars['String']['output']>;
  companyId: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['String']['output'];
  doNotContact: Scalars['Boolean']['output'];
  email: Maybe<Scalars['String']['output']>;
  emailVerified: Maybe<Scalars['Boolean']['output']>;
  emails: Array<Scalars['String']['output']>;
  firstName: Scalars['String']['output'];
  githubHandle: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  lastName: Scalars['String']['output'];
  linkedinUrl: Maybe<Scalars['String']['output']>;
  nbExecutionTimeMs: Maybe<Scalars['Int']['output']>;
  nbFlags: Array<Scalars['String']['output']>;
  nbResult: Maybe<Scalars['String']['output']>;
  nbRetryToken: Maybe<Scalars['String']['output']>;
  nbStatus: Maybe<Scalars['String']['output']>;
  nbSuggestedCorrection: Maybe<Scalars['String']['output']>;
  position: Maybe<Scalars['String']['output']>;
  tags: Array<Scalars['String']['output']>;
  telegramHandle: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  userId: Maybe<Scalars['String']['output']>;
};

export type ContactEmail = {
  __typename?: 'ContactEmail';
  contactId: Scalars['Int']['output'];
  createdAt: Scalars['String']['output'];
  fromEmail: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  recipientName: Maybe<Scalars['String']['output']>;
  resendId: Scalars['String']['output'];
  sentAt: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  subject: Scalars['String']['output'];
  textContent: Maybe<Scalars['String']['output']>;
  toEmails: Array<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
};

export type ContactInput = {
  company?: InputMaybe<Scalars['String']['input']>;
  companyId?: InputMaybe<Scalars['Int']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  emails?: InputMaybe<Array<Scalars['String']['input']>>;
  firstName: Scalars['String']['input'];
  githubHandle?: InputMaybe<Scalars['String']['input']>;
  lastName: Scalars['String']['input'];
  linkedinUrl?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  telegramHandle?: InputMaybe<Scalars['String']['input']>;
};

export type ContactsResult = {
  __typename?: 'ContactsResult';
  contacts: Array<Contact>;
  totalCount: Scalars['Int']['output'];
};

export type CreateCompanyInput = {
  category?: InputMaybe<CompanyCategory>;
  description?: InputMaybe<Scalars['String']['input']>;
  industries?: InputMaybe<Array<Scalars['String']['input']>>;
  industry?: InputMaybe<Scalars['String']['input']>;
  key: Scalars['String']['input'];
  linkedin_url?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  logo_url?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  service_taxonomy?: InputMaybe<Array<Scalars['String']['input']>>;
  services?: InputMaybe<Array<Scalars['String']['input']>>;
  size?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type CreateContactInput = {
  companyId?: InputMaybe<Scalars['Int']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  emails?: InputMaybe<Array<Scalars['String']['input']>>;
  firstName: Scalars['String']['input'];
  githubHandle?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  linkedinUrl?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  telegramHandle?: InputMaybe<Scalars['String']['input']>;
};

export type CreateLangSmithPromptInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  readme?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreateOpportunityInput = {
  applicationNotes?: InputMaybe<Scalars['String']['input']>;
  companyId?: InputMaybe<Scalars['Int']['input']>;
  contactId?: InputMaybe<Scalars['Int']['input']>;
  deadline?: InputMaybe<Scalars['String']['input']>;
  endDate?: InputMaybe<Scalars['String']['input']>;
  rewardText?: InputMaybe<Scalars['String']['input']>;
  rewardUsd?: InputMaybe<Scalars['Float']['input']>;
  source?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title: Scalars['String']['input'];
  url?: InputMaybe<Scalars['String']['input']>;
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

export type DeepPlannerStatus =
  | 'CANCELLED'
  | 'COMPLETE'
  | 'FAILED'
  | 'PENDING'
  | 'RUNNING';

export type DeepPlannerTask = {
  __typename?: 'DeepPlannerTask';
  checkpointCount: Scalars['Int']['output'];
  completedAt: Maybe<Scalars['DateTime']['output']>;
  context: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  currentStep: Maybe<Scalars['String']['output']>;
  errorMessage: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  outputArtifact: Maybe<Scalars['String']['output']>;
  problemDescription: Scalars['String']['output'];
  progressPercent: Scalars['Float']['output'];
  startedAt: Maybe<Scalars['DateTime']['output']>;
  status: DeepPlannerStatus;
  totalSteps: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  workflowType: Scalars['String']['output'];
};

export type DeleteApplicationResponse = {
  __typename?: 'DeleteApplicationResponse';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteCompanyResponse = {
  __typename?: 'DeleteCompanyResponse';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteContactResult = {
  __typename?: 'DeleteContactResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type DeleteJobResponse = {
  __typename?: 'DeleteJobResponse';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteOpportunityResult = {
  __typename?: 'DeleteOpportunityResult';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type EnhanceAllContactsResult = {
  __typename?: 'EnhanceAllContactsResult';
  companiesProcessed: Scalars['Int']['output'];
  errors: Array<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
  totalContactsProcessed: Scalars['Int']['output'];
  totalEmailsFound: Scalars['Int']['output'];
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

export type FindContactEmailResult = {
  __typename?: 'FindContactEmailResult';
  candidatesTried: Scalars['Int']['output'];
  email: Maybe<Scalars['String']['output']>;
  emailFound: Scalars['Boolean']['output'];
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
  verified: Maybe<Scalars['Boolean']['output']>;
};

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
  child_ids: Maybe<Array<Scalars['String']['output']>>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  parent_id: Maybe<Scalars['String']['output']>;
};

export type GreenhouseMetadata = {
  __typename?: 'GreenhouseMetadata';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  value: Maybe<Scalars['String']['output']>;
  value_type: Maybe<Scalars['String']['output']>;
};

export type GreenhouseOffice = {
  __typename?: 'GreenhouseOffice';
  child_ids: Maybe<Array<Scalars['String']['output']>>;
  id: Scalars['String']['output'];
  location: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  parent_id: Maybe<Scalars['String']['output']>;
};

export type GreenhouseQuestion = {
  __typename?: 'GreenhouseQuestion';
  description: Maybe<Scalars['String']['output']>;
  fields: Maybe<Array<GreenhouseQuestionField>>;
  label: Scalars['String']['output'];
  required: Scalars['Boolean']['output'];
};

export type GreenhouseQuestionField = {
  __typename?: 'GreenhouseQuestionField';
  name: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
};

export type ImportContactsResult = {
  __typename?: 'ImportContactsResult';
  errors: Array<Scalars['String']['output']>;
  failed: Scalars['Int']['output'];
  imported: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type Job = {
  __typename?: 'Job';
  absolute_url: Maybe<Scalars['String']['output']>;
  ashby_address: Maybe<AshbyAddress>;
  ashby_apply_url: Maybe<Scalars['String']['output']>;
  ashby_compensation: Maybe<AshbyCompensation>;
  ashby_department: Maybe<Scalars['String']['output']>;
  ashby_employment_type: Maybe<Scalars['String']['output']>;
  ashby_is_listed: Maybe<Scalars['Boolean']['output']>;
  ashby_is_remote: Maybe<Scalars['Boolean']['output']>;
  ashby_job_url: Maybe<Scalars['String']['output']>;
  ashby_secondary_locations: Maybe<Array<AshbySecondaryLocation>>;
  ashby_team: Maybe<Scalars['String']['output']>;
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
  id: Scalars['Int']['output'];
  internal_job_id: Maybe<Scalars['String']['output']>;
  /** Whether this job is classified as Remote EU — read directly from the DB column. */
  is_remote_eu: Scalars['Boolean']['output'];
  language: Maybe<Scalars['String']['output']>;
  location: Maybe<Scalars['String']['output']>;
  location_questions: Maybe<Array<GreenhouseQuestion>>;
  metadata: Maybe<Array<GreenhouseMetadata>>;
  offices: Maybe<Array<GreenhouseOffice>>;
  /**
   * Canonical publication date. All ATS sources (Greenhouse, Ashby)
   * write to the unified first_published DB column at ingestion time.
   * Falls back to posted_at (ingestion timestamp) when no ATS date exists.
   */
  publishedAt: Scalars['String']['output'];
  questions: Maybe<Array<GreenhouseQuestion>>;
  remote_eu_confidence: Maybe<ClassificationConfidence>;
  remote_eu_reason: Maybe<Scalars['String']['output']>;
  requisition_id: Maybe<Scalars['String']['output']>;
  score: Maybe<Scalars['Float']['output']>;
  score_reason: Maybe<Scalars['String']['output']>;
  skillMatch: Maybe<SkillMatch>;
  skills: Maybe<Array<JobSkill>>;
  source_id: Maybe<Scalars['String']['output']>;
  source_kind: Scalars['String']['output'];
  status: Maybe<JobStatus>;
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

/**
 * Pipeline status for a job posting.
 * Mirrors workers/process-jobs/src/entry.py JobStatus enum — values must stay in sync.
 */
export type JobStatus =
  | 'enhanced'
  | 'error'
  | 'eu_remote'
  | 'new'
  | 'non_eu'
  | 'reported'
  | 'role_match'
  | 'role_nomatch';

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
  applyEmailPattern: ApplyEmailPatternResult;
  cancelDeepPlannerTask: DeepPlannerTask;
  createApplication: Application;
  createCompany: Company;
  createContact: Contact;
  createDeepPlannerTask: DeepPlannerTask;
  createLangSmithPrompt: LangSmithPrompt;
  createOpportunity: Opportunity;
  createPrompt: Prompt;
  createStudyTopic: StudyTopic;
  createTrack: Track;
  deleteAllJobs: DeleteJobResponse;
  deleteApplication: DeleteApplicationResponse;
  deleteCompany: DeleteCompanyResponse;
  deleteContact: DeleteContactResult;
  deleteJob: DeleteJobResponse;
  deleteLangSmithPrompt: Scalars['Boolean']['output'];
  deleteOpportunity: DeleteOpportunityResult;
  enhanceAllContacts: EnhanceAllContactsResult;
  enhanceCompany: EnhanceCompanyResponse;
  /**
   * Enhance a job posting by fetching detailed data from the ATS (Applicant Tracking System).
   *
   * Supported ATS sources:
   * - greenhouse: Greenhouse ATS (https://greenhouse.io)
   * - ashby: Ashby ATS (https://ashbyhq.com)
   *
   * For Greenhouse:
   * - jobId: The job posting ID from the URL (e.g., "5802159004" from https://job-boards.greenhouse.io/grafanalabs/jobs/5802159004)
   * - company: The board token (e.g., "grafanalabs")
   *
   * For Ashby:
   * - jobId: The posting ID
   * - company: The board name
   *
   * The mutation will:
   * 1. Fetch comprehensive job data from the ATS API
   * 2. Save enhanced fields (description, departments, offices, questions, etc.)
   * 3. Return the updated job with full ATS data
   */
  enhanceJobFromATS: EnhanceJobResponse;
  findCompanyEmails: EnhanceAllContactsResult;
  findContactEmail: FindContactEmailResult;
  generateAgenticCoding: Application;
  generateBackendPrep: Application;
  generateInterviewPrep: Application;
  generateInterviewQuestions: Application;
  generateRequirementFromSelection: Application;
  generateResearch: Array<ResearchItem>;
  generateStudyConceptExplanation: StudyConceptExplanation;
  generateStudyDeepDive: StudyTopic;
  generateStudyTopicDeepDive: Application;
  generateStudyTopicsForCategory: Array<StudyTopic>;
  generateTopicDeepDive: Application;
  importContacts: ImportContactsResult;
  ingestResumeParse: Maybe<ResumeIngestResult>;
  ingest_company_snapshot: CompanySnapshot;
  linkSelectionToRequirement: Application;
  linkTrackToApplication: Application;
  /**
   * Trigger classification/enhancement of all unprocessed jobs via the Cloudflare Worker.
   * Calls the classify-jobs CF worker (POST) which runs DeepSeek-based classification
   * for remote-EU eligibility on every unclassified job.
   */
  processAllJobs: ProcessAllJobsResponse;
  pushLangSmithPrompt: Scalars['String']['output'];
  /**
   * Report a job as irrelevant, spam, or incorrectly classified.
   * Sets the job status to "reported" so it can be reviewed or excluded.
   * Requires authentication.
   */
  reportJob: Maybe<Job>;
  triggerDeepPlannerTask: DeepPlannerTask;
  unlinkTrackFromApplication: Application;
  updateApplication: Application;
  updateCompany: Company;
  updateContact: Contact;
  updateLangSmithPrompt: LangSmithPrompt;
  updateOpportunity: Opportunity;
  updatePromptLabel: Prompt;
  updateUserSettings: UserSettings;
  uploadResume: Maybe<ResumeUploadResult>;
  upsert_company_ats_boards: Array<AtsBoard>;
};


export type MutationAdd_Company_FactsArgs = {
  company_id: Scalars['Int']['input'];
  facts: Array<CompanyFactInput>;
};


export type MutationApplyEmailPatternArgs = {
  companyId: Scalars['Int']['input'];
};


export type MutationCancelDeepPlannerTaskArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCreateApplicationArgs = {
  input: ApplicationInput;
};


export type MutationCreateCompanyArgs = {
  input: CreateCompanyInput;
};


export type MutationCreateContactArgs = {
  input: CreateContactInput;
};


export type MutationCreateDeepPlannerTaskArgs = {
  context?: InputMaybe<Scalars['String']['input']>;
  problemDescription: Scalars['String']['input'];
  workflowType: Scalars['String']['input'];
};


export type MutationCreateLangSmithPromptArgs = {
  input?: InputMaybe<CreateLangSmithPromptInput>;
  promptIdentifier: Scalars['String']['input'];
};


export type MutationCreateOpportunityArgs = {
  input: CreateOpportunityInput;
};


export type MutationCreatePromptArgs = {
  input: CreatePromptInput;
};


export type MutationCreateStudyTopicArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
  difficulty?: InputMaybe<Scalars['String']['input']>;
  summary?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
  topic?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCreateTrackArgs = {
  input: CreateTrackInput;
};


export type MutationDeleteApplicationArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteCompanyArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteContactArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteJobArgs = {
  id: Scalars['Int']['input'];
};


export type MutationDeleteLangSmithPromptArgs = {
  promptIdentifier: Scalars['String']['input'];
};


export type MutationDeleteOpportunityArgs = {
  id: Scalars['String']['input'];
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


export type MutationFindCompanyEmailsArgs = {
  companyId: Scalars['Int']['input'];
};


export type MutationFindContactEmailArgs = {
  contactId: Scalars['Int']['input'];
};


export type MutationGenerateAgenticCodingArgs = {
  applicationId: Scalars['Int']['input'];
};


export type MutationGenerateBackendPrepArgs = {
  applicationId: Scalars['Int']['input'];
};


export type MutationGenerateInterviewPrepArgs = {
  applicationId: Scalars['Int']['input'];
};


export type MutationGenerateInterviewQuestionsArgs = {
  applicationId: Scalars['Int']['input'];
  type: Scalars['String']['input'];
};


export type MutationGenerateRequirementFromSelectionArgs = {
  applicationId: Scalars['Int']['input'];
  selectedText: Scalars['String']['input'];
};


export type MutationGenerateResearchArgs = {
  goalDescription: Scalars['String']['input'];
};


export type MutationGenerateStudyConceptExplanationArgs = {
  context?: InputMaybe<Scalars['String']['input']>;
  selectedText: Scalars['String']['input'];
  studyTopicId: Scalars['ID']['input'];
};


export type MutationGenerateStudyDeepDiveArgs = {
  force?: InputMaybe<Scalars['Boolean']['input']>;
  studyTopicId: Scalars['ID']['input'];
};


export type MutationGenerateStudyTopicDeepDiveArgs = {
  applicationId: Scalars['Int']['input'];
  force?: InputMaybe<Scalars['Boolean']['input']>;
  requirement: Scalars['String']['input'];
  studyTopic: Scalars['String']['input'];
};


export type MutationGenerateStudyTopicsForCategoryArgs = {
  category: Scalars['String']['input'];
  count?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationGenerateTopicDeepDiveArgs = {
  applicationId: Scalars['Int']['input'];
  force?: InputMaybe<Scalars['Boolean']['input']>;
  requirement: Scalars['String']['input'];
};


export type MutationImportContactsArgs = {
  contacts: Array<ContactInput>;
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


export type MutationLinkSelectionToRequirementArgs = {
  applicationId: Scalars['Int']['input'];
  requirement: Scalars['String']['input'];
  sourceQuote: Scalars['String']['input'];
};


export type MutationLinkTrackToApplicationArgs = {
  applicationId: Scalars['Int']['input'];
  trackSlug: Scalars['String']['input'];
};


export type MutationProcessAllJobsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationPushLangSmithPromptArgs = {
  input?: InputMaybe<PushLangSmithPromptInput>;
  promptIdentifier: Scalars['String']['input'];
};


export type MutationReportJobArgs = {
  id: Scalars['Int']['input'];
};


export type MutationTriggerDeepPlannerTaskArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUnlinkTrackFromApplicationArgs = {
  applicationId: Scalars['Int']['input'];
  trackSlug: Scalars['String']['input'];
};


export type MutationUpdateApplicationArgs = {
  id: Scalars['Int']['input'];
  input: UpdateApplicationInput;
};


export type MutationUpdateCompanyArgs = {
  id: Scalars['Int']['input'];
  input: UpdateCompanyInput;
};


export type MutationUpdateContactArgs = {
  id: Scalars['Int']['input'];
  input: UpdateContactInput;
};


export type MutationUpdateLangSmithPromptArgs = {
  input: UpdateLangSmithPromptInput;
  promptIdentifier: Scalars['String']['input'];
};


export type MutationUpdateOpportunityArgs = {
  id: Scalars['String']['input'];
  input: UpdateOpportunityInput;
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

export type OpportunitiesResult = {
  __typename?: 'OpportunitiesResult';
  opportunities: Array<Opportunity>;
  totalCount: Scalars['Int']['output'];
};

export type Opportunity = {
  __typename?: 'Opportunity';
  applicationNotes: Maybe<Scalars['String']['output']>;
  applicationStatus: Maybe<Scalars['String']['output']>;
  applied: Scalars['Boolean']['output'];
  appliedAt: Maybe<Scalars['String']['output']>;
  company: Maybe<Company>;
  companyId: Maybe<Scalars['Int']['output']>;
  contactId: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['String']['output'];
  deadline: Maybe<Scalars['String']['output']>;
  endDate: Maybe<Scalars['String']['output']>;
  firstSeen: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  lastSeen: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  rawContext: Maybe<Scalars['String']['output']>;
  rewardText: Maybe<Scalars['String']['output']>;
  rewardUsd: Maybe<Scalars['Float']['output']>;
  score: Maybe<Scalars['Int']['output']>;
  source: Maybe<Scalars['String']['output']>;
  startDate: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  url: Maybe<Scalars['String']['output']>;
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
  application: Maybe<Application>;
  applications: Array<Application>;
  askAboutResume: Maybe<ResumeAnswer>;
  companies: CompaniesResponse;
  company: Maybe<Company>;
  company_ats_boards: Array<AtsBoard>;
  company_facts: Array<CompanyFact>;
  company_snapshots: Array<CompanySnapshot>;
  contact: Maybe<Contact>;
  contactByEmail: Maybe<Contact>;
  contactEmails: Array<ContactEmail>;
  contacts: ContactsResult;
  deepPlannerTask: Maybe<DeepPlannerTask>;
  deepPlannerTasks: Array<DeepPlannerTask>;
  executeSql: TextToSqlResult;
  job: Maybe<Job>;
  jobs: JobsResponse;
  langsmithPrompt: Maybe<LangSmithPrompt>;
  langsmithPromptCommit: Maybe<LangSmithPromptCommit>;
  langsmithPrompts: Array<LangSmithPrompt>;
  myPromptUsage: Array<PromptUsage>;
  opportunities: OpportunitiesResult;
  opportunity: Maybe<Opportunity>;
  prepResources: PrepContent;
  prepResourcesByCategory: Array<PrepResource>;
  prompt: Maybe<Prompt>;
  prompts: Array<RegisteredPrompt>;
  resendEmail: Maybe<ResendEmailDetail>;
  resumeStatus: Maybe<ResumeStatus>;
  studyCategories: Array<Scalars['String']['output']>;
  studyTopic: Maybe<StudyTopic>;
  studyTopics: Array<StudyTopic>;
  textToSql: TextToSqlResult;
  track: Maybe<Track>;
  tracks: Array<Track>;
  userSettings: Maybe<UserSettings>;
};


export type QueryApplicationArgs = {
  id: Scalars['Int']['input'];
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


export type QueryContactArgs = {
  id: Scalars['Int']['input'];
};


export type QueryContactByEmailArgs = {
  email: Scalars['String']['input'];
};


export type QueryContactEmailsArgs = {
  contactId: Scalars['Int']['input'];
};


export type QueryContactsArgs = {
  companyId?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryDeepPlannerTaskArgs = {
  id: Scalars['ID']['input'];
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
  remoteEuConfidence?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  skills?: InputMaybe<Array<Scalars['String']['input']>>;
  sourceType?: InputMaybe<Scalars['String']['input']>;
  sourceTypes?: InputMaybe<Array<Scalars['String']['input']>>;
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


export type QueryOpportunitiesArgs = {
  companyId?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryOpportunityArgs = {
  id: Scalars['String']['input'];
};


export type QueryPrepResourcesByCategoryArgs = {
  category: Scalars['String']['input'];
};


export type QueryPromptArgs = {
  label?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  version?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryResendEmailArgs = {
  resendId: Scalars['String']['input'];
};


export type QueryResumeStatusArgs = {
  email: Scalars['String']['input'];
};


export type QueryStudyTopicArgs = {
  category: Scalars['String']['input'];
  topic: Scalars['String']['input'];
};


export type QueryStudyTopicsArgs = {
  category: Scalars['String']['input'];
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

export type ResendEmailDetail = {
  __typename?: 'ResendEmailDetail';
  bcc: Maybe<Array<Scalars['String']['output']>>;
  cc: Maybe<Array<Scalars['String']['output']>>;
  createdAt: Scalars['String']['output'];
  from: Scalars['String']['output'];
  html: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  lastEvent: Maybe<Scalars['String']['output']>;
  scheduledAt: Maybe<Scalars['String']['output']>;
  subject: Maybe<Scalars['String']['output']>;
  text: Maybe<Scalars['String']['output']>;
  to: Array<Scalars['String']['output']>;
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

export type SkillMatch = {
  __typename?: 'SkillMatch';
  details: Array<SkillMatchDetail>;
  jobCoverage: Scalars['Float']['output'];
  matchedCount: Scalars['Int']['output'];
  requiredCoverage: Scalars['Float']['output'];
  score: Scalars['Float']['output'];
  totalPreferred: Scalars['Int']['output'];
  userCoverage: Scalars['Float']['output'];
};

export type SkillMatchDetail = {
  __typename?: 'SkillMatchDetail';
  level: Scalars['String']['output'];
  matched: Scalars['Boolean']['output'];
  tag: Scalars['String']['output'];
};

export type SourceType =
  | 'COMMONCRAWL'
  | 'LIVE_FETCH'
  | 'MANUAL'
  | 'PARTNER';

export type StudyConceptExplanation = {
  __typename?: 'StudyConceptExplanation';
  createdAt: Scalars['DateTime']['output'];
  explanation: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  selectedText: Scalars['String']['output'];
};

export type StudyTopic = {
  __typename?: 'StudyTopic';
  bodyMd: Maybe<Scalars['String']['output']>;
  category: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  deepDive: Maybe<Scalars['String']['output']>;
  difficulty: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  summary: Maybe<Scalars['String']['output']>;
  tags: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  topic: Scalars['String']['output'];
};

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
  companyName?: InputMaybe<Scalars['String']['input']>;
  jobDescription?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<ApplicationStatus>;
};

export type UpdateCompanyInput = {
  category?: InputMaybe<CompanyCategory>;
  description?: InputMaybe<Scalars['String']['input']>;
  industries?: InputMaybe<Array<Scalars['String']['input']>>;
  industry?: InputMaybe<Scalars['String']['input']>;
  job_board_url?: InputMaybe<Scalars['String']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
  linkedin_url?: InputMaybe<Scalars['String']['input']>;
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

export type UpdateContactInput = {
  doNotContact?: InputMaybe<Scalars['Boolean']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  emails?: InputMaybe<Array<Scalars['String']['input']>>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  githubHandle?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  linkedinUrl?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  telegramHandle?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateLangSmithPromptInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  isArchived?: InputMaybe<Scalars['Boolean']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  readme?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UpdateOpportunityInput = {
  applicationNotes?: InputMaybe<Scalars['String']['input']>;
  applicationStatus?: InputMaybe<Scalars['String']['input']>;
  applied?: InputMaybe<Scalars['Boolean']['input']>;
  appliedAt?: InputMaybe<Scalars['String']['input']>;
  companyId?: InputMaybe<Scalars['Int']['input']>;
  contactId?: InputMaybe<Scalars['Int']['input']>;
  deadline?: InputMaybe<Scalars['String']['input']>;
  endDate?: InputMaybe<Scalars['String']['input']>;
  rewardText?: InputMaybe<Scalars['String']['input']>;
  rewardUsd?: InputMaybe<Scalars['Float']['input']>;
  score?: InputMaybe<Scalars['Int']['input']>;
  source?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
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

export type DeepPlannerTaskQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeepPlannerTaskQuery = { __typename?: 'Query', deepPlannerTask: { __typename?: 'DeepPlannerTask', id: string, workflowType: string, problemDescription: string, context: string | null, status: DeepPlannerStatus, currentStep: string | null, checkpointCount: number, totalSteps: number, progressPercent: number, outputArtifact: string | null, errorMessage: string | null, startedAt: string | null, completedAt: string | null, createdAt: string, updatedAt: string } | null };

export type TriggerDeepPlannerTaskMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type TriggerDeepPlannerTaskMutation = { __typename?: 'Mutation', triggerDeepPlannerTask: { __typename?: 'DeepPlannerTask', id: string, status: DeepPlannerStatus, currentStep: string | null } };

export type CancelDeepPlannerTaskMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CancelDeepPlannerTaskMutation = { __typename?: 'Mutation', cancelDeepPlannerTask: { __typename?: 'DeepPlannerTask', id: string, status: DeepPlannerStatus } };

export type DeepPlannerTasksQueryVariables = Exact<{ [key: string]: never; }>;


export type DeepPlannerTasksQuery = { __typename?: 'Query', deepPlannerTasks: Array<{ __typename?: 'DeepPlannerTask', id: string, workflowType: string, problemDescription: string, status: DeepPlannerStatus, currentStep: string | null, checkpointCount: number, totalSteps: number, progressPercent: number, errorMessage: string | null, startedAt: string | null, completedAt: string | null, createdAt: string, updatedAt: string }> };

export type CreateDeepPlannerTaskMutationVariables = Exact<{
  workflowType: Scalars['String']['input'];
  problemDescription: Scalars['String']['input'];
  context?: InputMaybe<Scalars['String']['input']>;
}>;


export type CreateDeepPlannerTaskMutation = { __typename?: 'Mutation', createDeepPlannerTask: { __typename?: 'DeepPlannerTask', id: string, workflowType: string, problemDescription: string, status: DeepPlannerStatus, createdAt: string } };

export type GetPrepResourcesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetPrepResourcesQuery = { __typename?: 'Query', prepResources: { __typename?: 'PrepContent', totalResources: number, categories: Array<{ __typename?: 'PrepCategory', id: string, name: string, emoji: string, description: string, resources: Array<{ __typename?: 'PrepResource', id: string, title: string, href: string, description: string, category: string, tags: Array<string> }> }> } };

export type DeleteAllJobsMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteAllJobsMutation = { __typename?: 'Mutation', deleteAllJobs: { __typename?: 'DeleteJobResponse', success: boolean, message: string | null } };

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


export type GetJobQuery = { __typename?: 'Query', job: { __typename?: 'Job', id: number, external_id: string, source_id: string | null, source_kind: string, company_id: number | null, company_key: string, title: string, location: string | null, url: string, description: string | null, publishedAt: string, score: number | null, score_reason: string | null, status: JobStatus | null, is_remote_eu: boolean, remote_eu_confidence: ClassificationConfidence | null, remote_eu_reason: string | null, absolute_url: string | null, internal_job_id: string | null, requisition_id: string | null, company_name: string | null, language: string | null, ashby_department: string | null, ashby_team: string | null, ashby_employment_type: string | null, ashby_is_remote: boolean | null, ashby_is_listed: boolean | null, ashby_job_url: string | null, ashby_apply_url: string | null, created_at: string, updated_at: string, company: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ashby_enrichment: { __typename?: 'AshbyEnrichment', company_name: string | null, industry_tags: Array<string>, tech_signals: Array<string>, size_signal: string | null, enriched_at: string | null } | null } | null, skills: Array<{ __typename?: 'JobSkill', tag: string, level: string, confidence: number | null, evidence: string | null }> | null, skillMatch: { __typename?: 'SkillMatch', score: number, userCoverage: number, jobCoverage: number, requiredCoverage: number, matchedCount: number, totalPreferred: number, details: Array<{ __typename?: 'SkillMatchDetail', tag: string, level: string, matched: boolean }> } | null, metadata: Array<{ __typename?: 'GreenhouseMetadata', id: string, name: string, value: string | null, value_type: string | null }> | null, departments: Array<{ __typename?: 'GreenhouseDepartment', id: string, name: string, child_ids: Array<string> | null, parent_id: string | null }> | null, offices: Array<{ __typename?: 'GreenhouseOffice', id: string, name: string, location: string | null, child_ids: Array<string> | null, parent_id: string | null }> | null, questions: Array<{ __typename?: 'GreenhouseQuestion', description: string | null, label: string, required: boolean, fields: Array<{ __typename?: 'GreenhouseQuestionField', type: string, name: string | null }> | null }> | null, location_questions: Array<{ __typename?: 'GreenhouseQuestion', description: string | null, label: string, required: boolean, fields: Array<{ __typename?: 'GreenhouseQuestionField', type: string, name: string | null }> | null }> | null, compliance: Array<{ __typename?: 'GreenhouseCompliance', type: string, description: string | null, questions: Array<{ __typename?: 'GreenhouseQuestion', description: string | null, label: string, required: boolean, fields: Array<{ __typename?: 'GreenhouseQuestionField', type: string, name: string | null }> | null }> | null }> | null, demographic_questions: { __typename?: 'GreenhouseDemographicQuestions', header: string | null, description: string | null, questions: Array<{ __typename?: 'GreenhouseQuestion', description: string | null, label: string, required: boolean, fields: Array<{ __typename?: 'GreenhouseQuestionField', type: string, name: string | null }> | null }> | null } | null, data_compliance: Array<{ __typename?: 'GreenhouseDataCompliance', type: string, requires_consent: boolean, requires_processing_consent: boolean, requires_retention_consent: boolean, retention_period: number | null, demographic_data_consent_applies: boolean }> | null, ashby_secondary_locations: Array<{ __typename?: 'AshbySecondaryLocation', location: string, address: { __typename?: 'AshbyPostalAddress', addressLocality: string | null, addressRegion: string | null, addressCountry: string | null } | null }> | null, ashby_compensation: { __typename?: 'AshbyCompensation', compensationTierSummary: string | null, scrapeableCompensationSalarySummary: string | null, compensationTiers: Array<{ __typename?: 'AshbyCompensationTier', id: string | null, tierSummary: string | null, title: string | null, additionalInformation: string | null, components: Array<{ __typename?: 'AshbyCompensationComponent', id: string | null, summary: string | null, compensationType: string | null, interval: string | null, currencyCode: string | null, minValue: number | null, maxValue: number | null }> }>, summaryComponents: Array<{ __typename?: 'AshbyCompensationComponent', id: string | null, summary: string | null, compensationType: string | null, interval: string | null, currencyCode: string | null, minValue: number | null, maxValue: number | null }> } | null, ashby_address: { __typename?: 'AshbyAddress', postalAddress: { __typename?: 'AshbyPostalAddress', addressLocality: string | null, addressRegion: string | null, addressCountry: string | null } | null } | null } | null };

export type GetJobsQueryVariables = Exact<{
  sourceType?: InputMaybe<Scalars['String']['input']>;
  sourceTypes?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  excludedCompanies?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  skills?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
}>;


export type GetJobsQuery = { __typename?: 'Query', jobs: { __typename?: 'JobsResponse', totalCount: number, jobs: Array<{ __typename?: 'Job', id: number, external_id: string, source_kind: string, company_key: string, title: string, location: string | null, url: string, publishedAt: string, status: JobStatus | null, is_remote_eu: boolean, remote_eu_confidence: ClassificationConfidence | null, skills: Array<{ __typename?: 'JobSkill', tag: string, level: string }> | null }> } };

export type GetUserSettingsQueryVariables = Exact<{
  userId: Scalars['String']['input'];
}>;


export type GetUserSettingsQuery = { __typename?: 'Query', userSettings: { __typename?: 'UserSettings', id: number, preferred_locations: Array<string> | null, preferred_skills: Array<string> | null, excluded_companies: Array<string> | null } | null };

export type ProcessAllJobsMutationVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ProcessAllJobsMutation = { __typename?: 'Mutation', processAllJobs: { __typename?: 'ProcessAllJobsResponse', success: boolean, message: string | null, enhanced: number | null, enhanceErrors: number | null, processed: number | null, euRemote: number | null, nonEuRemote: number | null, errors: number | null } };

export type ReportJobMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type ReportJobMutation = { __typename?: 'Mutation', reportJob: { __typename?: 'Job', id: number, status: JobStatus | null } | null };

export type TextToSqlQueryVariables = Exact<{
  question: Scalars['String']['input'];
}>;


export type TextToSqlQuery = { __typename?: 'Query', textToSql: { __typename?: 'TextToSqlResult', sql: string, explanation: string | null, columns: Array<string>, rows: Array<Array<any | null> | null>, drilldownSearchQuery: string | null } };

export type UpdateUserSettingsMutationVariables = Exact<{
  userId: Scalars['String']['input'];
  settings: UserSettingsInput;
}>;


export type UpdateUserSettingsMutation = { __typename?: 'Mutation', updateUserSettings: { __typename?: 'UserSettings', id: number, user_id: string, email_notifications: boolean, daily_digest: boolean, new_job_alerts: boolean, preferred_locations: Array<string> | null, preferred_skills: Array<string> | null, excluded_companies: Array<string> | null, dark_mode: boolean, jobs_per_page: number, created_at: string, updated_at: string } };

export type ApplicationFieldsFragment = { __typename?: 'Application', id: number, email: string, jobId: string, resume: File | null, status: ApplicationStatus, notes: string | null, jobTitle: string | null, companyName: string | null, companyKey: string | null, jobDescription: string | null, createdAt: string, questions: Array<{ __typename?: 'QuestionAnswer', questionId: string, questionText: string, answerText: string }>, interviewPrep: Array<{ __typename?: 'Track', id: string, slug: string, title: string, description: string | null, level: string | null }>, aiInterviewPrep: { __typename?: 'AIInterviewPrep', summary: string, generatedAt: string, requirements: Array<{ __typename?: 'AIInterviewPrepRequirement', requirement: string, questions: Array<string>, studyTopics: Array<string>, sourceQuote: string | null, deepDive: string | null, studyTopicDeepDives: Array<{ __typename?: 'AIStudyTopicDeepDive', topic: string, deepDive: string }> }> } | null, aiInterviewQuestions: { __typename?: 'AIInterviewQuestions', companyContext: string, recruiterGeneratedAt: string | null, technicalGeneratedAt: string | null, recruiterQuestions: Array<{ __typename?: 'AIInterviewQuestion', question: string, reason: string, category: string }>, technicalQuestions: Array<{ __typename?: 'AIInterviewQuestion', question: string, reason: string, category: string }> } | null, agenticCoding: { __typename?: 'AgenticCoding', overview: string, workflowPattern: string | null, qaApproach: string | null, teamPractices: string | null, generatedAt: string, exercises: Array<{ __typename?: 'AgenticCodingExercise', title: string, description: string, difficulty: string, skills: Array<string>, hints: Array<string>, agentPrompt: string }>, promptTemplates: Array<{ __typename?: 'AgenticCodingPromptTemplate', title: string, purpose: string, stackContext: string, prompt: string }> | null, failureModes: Array<{ __typename?: 'AgenticCodingFailureMode', scenario: string, why: string, alternative: string }> | null, measurableOutcomes: Array<{ __typename?: 'AgenticCodingOutcome', task: string, beforeTime: string, afterTime: string, improvement: string }> | null, resources: Array<{ __typename?: 'AgenticCodingResource', title: string, url: string, description: string }> } | null, aiBackendPrep: { __typename?: 'AIBackendPrep', generatedAt: string, systemDesign: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, distributedSystems: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, databaseDesign: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, sqlOptimization: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, nosqlPatterns: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, apiDesign: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, authSecurity: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, caching: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, messageQueues: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, microservices: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, testing: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, devops: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, securityOwasp: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, performance: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, concurrencyAsync: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, observability: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, eventDriven: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, serverlessEdge: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, typescriptNode: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, aiMlIntegration: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null } | null };

export type BackendPrepSectionFieldsFragment = { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> };

export type GetApplicationsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetApplicationsQuery = { __typename?: 'Query', applications: Array<{ __typename?: 'Application', id: number, email: string, jobId: string, resume: File | null, status: ApplicationStatus, notes: string | null, jobTitle: string | null, companyName: string | null, companyKey: string | null, jobDescription: string | null, createdAt: string, questions: Array<{ __typename?: 'QuestionAnswer', questionId: string, questionText: string, answerText: string }>, interviewPrep: Array<{ __typename?: 'Track', id: string, slug: string, title: string, description: string | null, level: string | null }>, aiInterviewPrep: { __typename?: 'AIInterviewPrep', summary: string, generatedAt: string, requirements: Array<{ __typename?: 'AIInterviewPrepRequirement', requirement: string, questions: Array<string>, studyTopics: Array<string>, sourceQuote: string | null, deepDive: string | null, studyTopicDeepDives: Array<{ __typename?: 'AIStudyTopicDeepDive', topic: string, deepDive: string }> }> } | null, aiInterviewQuestions: { __typename?: 'AIInterviewQuestions', companyContext: string, recruiterGeneratedAt: string | null, technicalGeneratedAt: string | null, recruiterQuestions: Array<{ __typename?: 'AIInterviewQuestion', question: string, reason: string, category: string }>, technicalQuestions: Array<{ __typename?: 'AIInterviewQuestion', question: string, reason: string, category: string }> } | null, agenticCoding: { __typename?: 'AgenticCoding', overview: string, workflowPattern: string | null, qaApproach: string | null, teamPractices: string | null, generatedAt: string, exercises: Array<{ __typename?: 'AgenticCodingExercise', title: string, description: string, difficulty: string, skills: Array<string>, hints: Array<string>, agentPrompt: string }>, promptTemplates: Array<{ __typename?: 'AgenticCodingPromptTemplate', title: string, purpose: string, stackContext: string, prompt: string }> | null, failureModes: Array<{ __typename?: 'AgenticCodingFailureMode', scenario: string, why: string, alternative: string }> | null, measurableOutcomes: Array<{ __typename?: 'AgenticCodingOutcome', task: string, beforeTime: string, afterTime: string, improvement: string }> | null, resources: Array<{ __typename?: 'AgenticCodingResource', title: string, url: string, description: string }> } | null, aiBackendPrep: { __typename?: 'AIBackendPrep', generatedAt: string, systemDesign: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, distributedSystems: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, databaseDesign: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, sqlOptimization: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, nosqlPatterns: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, apiDesign: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, authSecurity: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, caching: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, messageQueues: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, microservices: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, testing: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, devops: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, securityOwasp: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, performance: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, concurrencyAsync: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, observability: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, eventDriven: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, serverlessEdge: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, typescriptNode: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, aiMlIntegration: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null } | null }> };

export type GetApplicationQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetApplicationQuery = { __typename?: 'Query', application: { __typename?: 'Application', id: number, email: string, jobId: string, resume: File | null, status: ApplicationStatus, notes: string | null, jobTitle: string | null, companyName: string | null, companyKey: string | null, jobDescription: string | null, createdAt: string, questions: Array<{ __typename?: 'QuestionAnswer', questionId: string, questionText: string, answerText: string }>, interviewPrep: Array<{ __typename?: 'Track', id: string, slug: string, title: string, description: string | null, level: string | null }>, aiInterviewPrep: { __typename?: 'AIInterviewPrep', summary: string, generatedAt: string, requirements: Array<{ __typename?: 'AIInterviewPrepRequirement', requirement: string, questions: Array<string>, studyTopics: Array<string>, sourceQuote: string | null, deepDive: string | null, studyTopicDeepDives: Array<{ __typename?: 'AIStudyTopicDeepDive', topic: string, deepDive: string }> }> } | null, aiInterviewQuestions: { __typename?: 'AIInterviewQuestions', companyContext: string, recruiterGeneratedAt: string | null, technicalGeneratedAt: string | null, recruiterQuestions: Array<{ __typename?: 'AIInterviewQuestion', question: string, reason: string, category: string }>, technicalQuestions: Array<{ __typename?: 'AIInterviewQuestion', question: string, reason: string, category: string }> } | null, agenticCoding: { __typename?: 'AgenticCoding', overview: string, workflowPattern: string | null, qaApproach: string | null, teamPractices: string | null, generatedAt: string, exercises: Array<{ __typename?: 'AgenticCodingExercise', title: string, description: string, difficulty: string, skills: Array<string>, hints: Array<string>, agentPrompt: string }>, promptTemplates: Array<{ __typename?: 'AgenticCodingPromptTemplate', title: string, purpose: string, stackContext: string, prompt: string }> | null, failureModes: Array<{ __typename?: 'AgenticCodingFailureMode', scenario: string, why: string, alternative: string }> | null, measurableOutcomes: Array<{ __typename?: 'AgenticCodingOutcome', task: string, beforeTime: string, afterTime: string, improvement: string }> | null, resources: Array<{ __typename?: 'AgenticCodingResource', title: string, url: string, description: string }> } | null, aiBackendPrep: { __typename?: 'AIBackendPrep', generatedAt: string, systemDesign: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, distributedSystems: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, databaseDesign: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, sqlOptimization: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, nosqlPatterns: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, apiDesign: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, authSecurity: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, caching: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, messageQueues: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, microservices: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, testing: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, devops: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, securityOwasp: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, performance: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, concurrencyAsync: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, observability: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, eventDriven: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, serverlessEdge: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, typescriptNode: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, aiMlIntegration: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null } | null } | null };

export type CreateApplicationMutationVariables = Exact<{
  input: ApplicationInput;
}>;


export type CreateApplicationMutation = { __typename?: 'Mutation', createApplication: { __typename?: 'Application', id: number, email: string, jobId: string, resume: File | null, status: ApplicationStatus, notes: string | null, jobTitle: string | null, companyName: string | null, companyKey: string | null, jobDescription: string | null, createdAt: string, questions: Array<{ __typename?: 'QuestionAnswer', questionId: string, questionText: string, answerText: string }>, interviewPrep: Array<{ __typename?: 'Track', id: string, slug: string, title: string, description: string | null, level: string | null }>, aiInterviewPrep: { __typename?: 'AIInterviewPrep', summary: string, generatedAt: string, requirements: Array<{ __typename?: 'AIInterviewPrepRequirement', requirement: string, questions: Array<string>, studyTopics: Array<string>, sourceQuote: string | null, deepDive: string | null, studyTopicDeepDives: Array<{ __typename?: 'AIStudyTopicDeepDive', topic: string, deepDive: string }> }> } | null, aiInterviewQuestions: { __typename?: 'AIInterviewQuestions', companyContext: string, recruiterGeneratedAt: string | null, technicalGeneratedAt: string | null, recruiterQuestions: Array<{ __typename?: 'AIInterviewQuestion', question: string, reason: string, category: string }>, technicalQuestions: Array<{ __typename?: 'AIInterviewQuestion', question: string, reason: string, category: string }> } | null, agenticCoding: { __typename?: 'AgenticCoding', overview: string, workflowPattern: string | null, qaApproach: string | null, teamPractices: string | null, generatedAt: string, exercises: Array<{ __typename?: 'AgenticCodingExercise', title: string, description: string, difficulty: string, skills: Array<string>, hints: Array<string>, agentPrompt: string }>, promptTemplates: Array<{ __typename?: 'AgenticCodingPromptTemplate', title: string, purpose: string, stackContext: string, prompt: string }> | null, failureModes: Array<{ __typename?: 'AgenticCodingFailureMode', scenario: string, why: string, alternative: string }> | null, measurableOutcomes: Array<{ __typename?: 'AgenticCodingOutcome', task: string, beforeTime: string, afterTime: string, improvement: string }> | null, resources: Array<{ __typename?: 'AgenticCodingResource', title: string, url: string, description: string }> } | null, aiBackendPrep: { __typename?: 'AIBackendPrep', generatedAt: string, systemDesign: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, distributedSystems: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, databaseDesign: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, sqlOptimization: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, nosqlPatterns: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, apiDesign: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, authSecurity: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, caching: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, messageQueues: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, microservices: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, testing: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, devops: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, securityOwasp: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, performance: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, concurrencyAsync: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, observability: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, eventDriven: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, serverlessEdge: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, typescriptNode: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, aiMlIntegration: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null } | null } };

export type UpdateApplicationMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateApplicationInput;
}>;


export type UpdateApplicationMutation = { __typename?: 'Mutation', updateApplication: { __typename?: 'Application', id: number, jobId: string, status: ApplicationStatus, notes: string | null, jobTitle: string | null, companyName: string | null, companyKey: string | null, jobDescription: string | null } };

export type LinkTrackToApplicationMutationVariables = Exact<{
  applicationId: Scalars['Int']['input'];
  trackSlug: Scalars['String']['input'];
}>;


export type LinkTrackToApplicationMutation = { __typename?: 'Mutation', linkTrackToApplication: { __typename?: 'Application', id: number, interviewPrep: Array<{ __typename?: 'Track', id: string, slug: string, title: string, description: string | null, level: string | null }> } };

export type UnlinkTrackFromApplicationMutationVariables = Exact<{
  applicationId: Scalars['Int']['input'];
  trackSlug: Scalars['String']['input'];
}>;


export type UnlinkTrackFromApplicationMutation = { __typename?: 'Mutation', unlinkTrackFromApplication: { __typename?: 'Application', id: number, interviewPrep: Array<{ __typename?: 'Track', id: string, slug: string, title: string, description: string | null, level: string | null }> } };

export type GenerateInterviewPrepMutationVariables = Exact<{
  applicationId: Scalars['Int']['input'];
}>;


export type GenerateInterviewPrepMutation = { __typename?: 'Mutation', generateInterviewPrep: { __typename?: 'Application', id: number, aiInterviewPrep: { __typename?: 'AIInterviewPrep', summary: string, generatedAt: string, requirements: Array<{ __typename?: 'AIInterviewPrepRequirement', requirement: string, questions: Array<string>, studyTopics: Array<string>, sourceQuote: string | null, deepDive: string | null, studyTopicDeepDives: Array<{ __typename?: 'AIStudyTopicDeepDive', topic: string, deepDive: string }> }> } | null } };

export type GenerateTopicDeepDiveMutationVariables = Exact<{
  applicationId: Scalars['Int']['input'];
  requirement: Scalars['String']['input'];
  force?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type GenerateTopicDeepDiveMutation = { __typename?: 'Mutation', generateTopicDeepDive: { __typename?: 'Application', id: number, aiInterviewPrep: { __typename?: 'AIInterviewPrep', summary: string, generatedAt: string, requirements: Array<{ __typename?: 'AIInterviewPrepRequirement', requirement: string, questions: Array<string>, studyTopics: Array<string>, sourceQuote: string | null, deepDive: string | null, studyTopicDeepDives: Array<{ __typename?: 'AIStudyTopicDeepDive', topic: string, deepDive: string }> }> } | null } };

export type GenerateStudyTopicDeepDiveMutationVariables = Exact<{
  applicationId: Scalars['Int']['input'];
  requirement: Scalars['String']['input'];
  studyTopic: Scalars['String']['input'];
  force?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type GenerateStudyTopicDeepDiveMutation = { __typename?: 'Mutation', generateStudyTopicDeepDive: { __typename?: 'Application', id: number, aiInterviewPrep: { __typename?: 'AIInterviewPrep', summary: string, generatedAt: string, requirements: Array<{ __typename?: 'AIInterviewPrepRequirement', requirement: string, questions: Array<string>, studyTopics: Array<string>, sourceQuote: string | null, deepDive: string | null, studyTopicDeepDives: Array<{ __typename?: 'AIStudyTopicDeepDive', topic: string, deepDive: string }> }> } | null } };

export type GenerateRequirementFromSelectionMutationVariables = Exact<{
  applicationId: Scalars['Int']['input'];
  selectedText: Scalars['String']['input'];
}>;


export type GenerateRequirementFromSelectionMutation = { __typename?: 'Mutation', generateRequirementFromSelection: { __typename?: 'Application', id: number, aiInterviewPrep: { __typename?: 'AIInterviewPrep', summary: string, generatedAt: string, requirements: Array<{ __typename?: 'AIInterviewPrepRequirement', requirement: string, questions: Array<string>, studyTopics: Array<string>, sourceQuote: string | null, deepDive: string | null, studyTopicDeepDives: Array<{ __typename?: 'AIStudyTopicDeepDive', topic: string, deepDive: string }> }> } | null } };

export type DeleteApplicationMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteApplicationMutation = { __typename?: 'Mutation', deleteApplication: { __typename?: 'DeleteApplicationResponse', success: boolean, message: string | null } };

export type LinkSelectionToRequirementMutationVariables = Exact<{
  applicationId: Scalars['Int']['input'];
  requirement: Scalars['String']['input'];
  sourceQuote: Scalars['String']['input'];
}>;


export type LinkSelectionToRequirementMutation = { __typename?: 'Mutation', linkSelectionToRequirement: { __typename?: 'Application', id: number, aiInterviewPrep: { __typename?: 'AIInterviewPrep', summary: string, generatedAt: string, requirements: Array<{ __typename?: 'AIInterviewPrepRequirement', requirement: string, questions: Array<string>, studyTopics: Array<string>, sourceQuote: string | null, deepDive: string | null, studyTopicDeepDives: Array<{ __typename?: 'AIStudyTopicDeepDive', topic: string, deepDive: string }> }> } | null } };

export type GenerateAgenticCodingMutationVariables = Exact<{
  applicationId: Scalars['Int']['input'];
}>;


export type GenerateAgenticCodingMutation = { __typename?: 'Mutation', generateAgenticCoding: { __typename?: 'Application', id: number, agenticCoding: { __typename?: 'AgenticCoding', overview: string, workflowPattern: string | null, qaApproach: string | null, teamPractices: string | null, generatedAt: string, exercises: Array<{ __typename?: 'AgenticCodingExercise', title: string, description: string, difficulty: string, skills: Array<string>, hints: Array<string>, agentPrompt: string }>, promptTemplates: Array<{ __typename?: 'AgenticCodingPromptTemplate', title: string, purpose: string, stackContext: string, prompt: string }> | null, failureModes: Array<{ __typename?: 'AgenticCodingFailureMode', scenario: string, why: string, alternative: string }> | null, measurableOutcomes: Array<{ __typename?: 'AgenticCodingOutcome', task: string, beforeTime: string, afterTime: string, improvement: string }> | null, resources: Array<{ __typename?: 'AgenticCodingResource', title: string, url: string, description: string }> } | null } };

export type GenerateBackendPrepMutationVariables = Exact<{
  applicationId: Scalars['Int']['input'];
}>;


export type GenerateBackendPrepMutation = { __typename?: 'Mutation', generateBackendPrep: { __typename?: 'Application', id: number, aiBackendPrep: { __typename?: 'AIBackendPrep', generatedAt: string, systemDesign: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, distributedSystems: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, databaseDesign: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, sqlOptimization: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, nosqlPatterns: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, apiDesign: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, authSecurity: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, caching: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, messageQueues: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, microservices: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, testing: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, devops: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, securityOwasp: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, performance: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, concurrencyAsync: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, observability: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, eventDriven: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, serverlessEdge: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, typescriptNode: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null, aiMlIntegration: { __typename?: 'BackendPrepSection', title: string, overview: string, keyConcepts: Array<string>, deepDive: string, commonPitfalls: Array<string>, talkingPoints: Array<string>, researchInsights: string | null, interviewQuestions: Array<{ __typename?: 'BackendPrepInterviewQuestion', question: string, idealAnswer: string, followUps: Array<string>, difficulty: string }>, codeExamples: Array<{ __typename?: 'BackendPrepCodeExample', title: string, language: string, code: string, explanation: string }> } | null } | null } };

export type GenerateInterviewQuestionsMutationVariables = Exact<{
  applicationId: Scalars['Int']['input'];
  type: Scalars['String']['input'];
}>;


export type GenerateInterviewQuestionsMutation = { __typename?: 'Mutation', generateInterviewQuestions: { __typename?: 'Application', id: number, aiInterviewQuestions: { __typename?: 'AIInterviewQuestions', companyContext: string, recruiterGeneratedAt: string | null, technicalGeneratedAt: string | null, recruiterQuestions: Array<{ __typename?: 'AIInterviewQuestion', question: string, reason: string, category: string }>, technicalQuestions: Array<{ __typename?: 'AIInterviewQuestion', question: string, reason: string, category: string }> } | null } };

export type EvidenceFieldsFragment = { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null };

export type AtsBoardFieldsFragment = { __typename?: 'ATSBoard', id: number, company_id: number, url: string, vendor: AtsVendor, board_type: AtsBoardType, confidence: number, is_active: boolean, first_seen_at: string, last_seen_at: string, created_at: string, updated_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } };

export type CompanyFactFieldsFragment = { __typename?: 'CompanyFact', id: number, company_id: number, field: string, value_json: any | null, value_text: string | null, normalized_value: any | null, confidence: number, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } };

export type CompanySnapshotFieldsFragment = { __typename?: 'CompanySnapshot', id: number, company_id: number, source_url: string, crawl_id: string | null, capture_timestamp: string | null, fetched_at: string, http_status: number | null, mime: string | null, content_hash: string | null, text_sample: string | null, jsonld: any | null, extracted: any | null, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } };

export type CompanyFieldsFragment = { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ashby_enrichment: { __typename?: 'AshbyEnrichment', company_name: string | null, industry_tags: Array<string>, tech_signals: Array<string>, size_signal: string | null, enriched_at: string | null } | null };

export type CreateCompanyMutationVariables = Exact<{
  input: CreateCompanyInput;
}>;


export type CreateCompanyMutation = { __typename?: 'Mutation', createCompany: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ashby_enrichment: { __typename?: 'AshbyEnrichment', company_name: string | null, industry_tags: Array<string>, tech_signals: Array<string>, size_signal: string | null, enriched_at: string | null } | null } };

export type UpdateCompanyMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateCompanyInput;
}>;


export type UpdateCompanyMutation = { __typename?: 'Mutation', updateCompany: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ashby_enrichment: { __typename?: 'AshbyEnrichment', company_name: string | null, industry_tags: Array<string>, tech_signals: Array<string>, size_signal: string | null, enriched_at: string | null } | null } };

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


export type GetCompanyQuery = { __typename?: 'Query', company: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ashby_enrichment: { __typename?: 'AshbyEnrichment', company_name: string | null, industry_tags: Array<string>, tech_signals: Array<string>, size_signal: string | null, enriched_at: string | null } | null } | null };

export type GetCompaniesQueryVariables = Exact<{
  text?: InputMaybe<Scalars['String']['input']>;
  order_by?: InputMaybe<CompanyOrderBy>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetCompaniesQuery = { __typename?: 'Query', companies: { __typename?: 'CompaniesResponse', totalCount: number, companies: Array<{ __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ashby_enrichment: { __typename?: 'AshbyEnrichment', company_name: string | null, industry_tags: Array<string>, tech_signals: Array<string>, size_signal: string | null, enriched_at: string | null } | null }> } };

export type SearchCompaniesQueryVariables = Exact<{
  filter: CompanyFilterInput;
  order_by?: InputMaybe<CompanyOrderBy>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SearchCompaniesQuery = { __typename?: 'Query', companies: { __typename?: 'CompaniesResponse', totalCount: number, companies: Array<{ __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ashby_enrichment: { __typename?: 'AshbyEnrichment', company_name: string | null, industry_tags: Array<string>, tech_signals: Array<string>, size_signal: string | null, enriched_at: string | null } | null }> } };

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


export type CompanyAuditQuery = { __typename?: 'Query', company: { __typename?: 'Company', facts_count: number, snapshots_count: number, id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, facts: Array<{ __typename?: 'CompanyFact', id: number, company_id: number, field: string, value_json: any | null, value_text: string | null, normalized_value: any | null, confidence: number, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }>, snapshots: Array<{ __typename?: 'CompanySnapshot', id: number, company_id: number, source_url: string, crawl_id: string | null, capture_timestamp: string | null, fetched_at: string, http_status: number | null, mime: string | null, content_hash: string | null, text_sample: string | null, jsonld: any | null, extracted: any | null, created_at: string, evidence: { __typename?: 'Evidence', source_type: SourceType, source_url: string, crawl_id: string | null, capture_timestamp: string | null, observed_at: string, method: ExtractMethod, extractor_version: string | null, http_status: number | null, mime: string | null, content_hash: string | null, warc: { __typename?: 'WarcPointer', filename: string, offset: number, length: number, digest: string | null } | null } }>, ashby_enrichment: { __typename?: 'AshbyEnrichment', company_name: string | null, industry_tags: Array<string>, tech_signals: Array<string>, size_signal: string | null, enriched_at: string | null } | null } | null };

export type GetContactQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type GetContactQuery = { __typename?: 'Query', contact: { __typename?: 'Contact', id: number, firstName: string, lastName: string, email: string | null, emails: Array<string>, bouncedEmails: Array<string>, linkedinUrl: string | null, company: string | null, companyId: number | null, position: string | null, emailVerified: boolean | null, doNotContact: boolean, githubHandle: string | null, telegramHandle: string | null, tags: Array<string>, nbStatus: string | null, nbResult: string | null, nbFlags: Array<string>, nbSuggestedCorrection: string | null, createdAt: string, updatedAt: string } | null };

export type UpdateContactMutationVariables = Exact<{
  id: Scalars['Int']['input'];
  input: UpdateContactInput;
}>;


export type UpdateContactMutation = { __typename?: 'Mutation', updateContact: { __typename?: 'Contact', id: number, firstName: string, lastName: string, email: string | null, emails: Array<string>, linkedinUrl: string | null, position: string | null, githubHandle: string | null, telegramHandle: string | null, doNotContact: boolean, tags: Array<string>, emailVerified: boolean | null, updatedAt: string } };

export type DeleteContactMutationVariables = Exact<{
  id: Scalars['Int']['input'];
}>;


export type DeleteContactMutation = { __typename?: 'Mutation', deleteContact: { __typename?: 'DeleteContactResult', success: boolean, message: string } };

export type GetResendEmailQueryVariables = Exact<{
  resendId: Scalars['String']['input'];
}>;


export type GetResendEmailQuery = { __typename?: 'Query', resendEmail: { __typename?: 'ResendEmailDetail', id: string, from: string, to: Array<string>, subject: string | null, text: string | null, html: string | null, lastEvent: string | null, createdAt: string, scheduledAt: string | null, cc: Array<string> | null, bcc: Array<string> | null } | null };

export type GetContactEmailsQueryVariables = Exact<{
  contactId: Scalars['Int']['input'];
}>;


export type GetContactEmailsQuery = { __typename?: 'Query', contactEmails: Array<{ __typename?: 'ContactEmail', id: number, resendId: string, fromEmail: string, toEmails: Array<string>, subject: string, textContent: string | null, status: string, sentAt: string | null, recipientName: string | null, createdAt: string, updatedAt: string }> };

export type GetContactsQueryVariables = Exact<{
  companyId?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetContactsQuery = { __typename?: 'Query', contacts: { __typename?: 'ContactsResult', totalCount: number, contacts: Array<{ __typename?: 'Contact', id: number, firstName: string, lastName: string, email: string | null, bouncedEmails: Array<string>, linkedinUrl: string | null, position: string | null, company: string | null, companyId: number | null, githubHandle: string | null, telegramHandle: string | null, emailVerified: boolean | null, doNotContact: boolean, nbResult: string | null, tags: Array<string>, createdAt: string }> } };

export type ImportContactsMutationVariables = Exact<{
  contacts: Array<ContactInput> | ContactInput;
}>;


export type ImportContactsMutation = { __typename?: 'Mutation', importContacts: { __typename?: 'ImportContactsResult', success: boolean, imported: number, failed: number, errors: Array<string> } };

export type FindContactEmailMutationVariables = Exact<{
  contactId: Scalars['Int']['input'];
}>;


export type FindContactEmailMutation = { __typename?: 'Mutation', findContactEmail: { __typename?: 'FindContactEmailResult', success: boolean, emailFound: boolean, email: string | null, verified: boolean | null, message: string, candidatesTried: number } };

export type FindCompanyEmailsMutationVariables = Exact<{
  companyId: Scalars['Int']['input'];
}>;


export type FindCompanyEmailsMutation = { __typename?: 'Mutation', findCompanyEmails: { __typename?: 'EnhanceAllContactsResult', success: boolean, message: string, companiesProcessed: number, totalContactsProcessed: number, totalEmailsFound: number, errors: Array<string> } };

export type EnhanceAllContactsMutationVariables = Exact<{ [key: string]: never; }>;


export type EnhanceAllContactsMutation = { __typename?: 'Mutation', enhanceAllContacts: { __typename?: 'EnhanceAllContactsResult', success: boolean, message: string, companiesProcessed: number, totalContactsProcessed: number, totalEmailsFound: number, errors: Array<string> } };

export type ApplyEmailPatternMutationVariables = Exact<{
  companyId: Scalars['Int']['input'];
}>;


export type ApplyEmailPatternMutation = { __typename?: 'Mutation', applyEmailPattern: { __typename?: 'ApplyEmailPatternResult', success: boolean, message: string, contactsUpdated: number, pattern: string | null, contacts: Array<{ __typename?: 'Contact', id: number, email: string | null, emailVerified: boolean | null }> } };

export type CreateContactMutationVariables = Exact<{
  input: CreateContactInput;
}>;


export type CreateContactMutation = { __typename?: 'Mutation', createContact: { __typename?: 'Contact', id: number, firstName: string, lastName: string, email: string | null, linkedinUrl: string | null, position: string | null, companyId: number | null, githubHandle: string | null, telegramHandle: string | null, tags: Array<string> } };

export type GetGreenhouseJobsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetGreenhouseJobsQuery = { __typename?: 'Query', jobs: { __typename?: 'JobsResponse', totalCount: number, jobs: Array<{ __typename?: 'Job', id: number, external_id: string, source_id: string | null, source_kind: string, company_id: number | null, company_key: string, title: string, location: string | null, url: string, description: string | null, publishedAt: string, score: number | null, score_reason: string | null, is_remote_eu: boolean, remote_eu_confidence: ClassificationConfidence | null, remote_eu_reason: string | null, created_at: string, updated_at: string, company: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ashby_enrichment: { __typename?: 'AshbyEnrichment', company_name: string | null, industry_tags: Array<string>, tech_signals: Array<string>, size_signal: string | null, enriched_at: string | null } | null } | null, skills: Array<{ __typename?: 'JobSkill', tag: string, level: string, confidence: number | null, evidence: string | null }> | null }> } };

export type GetGreenhouseJobByIdQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetGreenhouseJobByIdQuery = { __typename?: 'Query', job: { __typename?: 'Job', id: number, external_id: string, source_id: string | null, source_kind: string, company_id: number | null, company_key: string, title: string, location: string | null, url: string, description: string | null, publishedAt: string, score: number | null, score_reason: string | null, is_remote_eu: boolean, remote_eu_confidence: ClassificationConfidence | null, remote_eu_reason: string | null, created_at: string, updated_at: string, company: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ashby_enrichment: { __typename?: 'AshbyEnrichment', company_name: string | null, industry_tags: Array<string>, tech_signals: Array<string>, size_signal: string | null, enriched_at: string | null } | null } | null, skills: Array<{ __typename?: 'JobSkill', tag: string, level: string, confidence: number | null, evidence: string | null }> | null } | null };

export type EnhanceJobFromAtsMutationVariables = Exact<{
  jobId: Scalars['String']['input'];
  company: Scalars['String']['input'];
  source: Scalars['String']['input'];
}>;


export type EnhanceJobFromAtsMutation = { __typename?: 'Mutation', enhanceJobFromATS: { __typename?: 'EnhanceJobResponse', success: boolean, message: string | null, job: { __typename?: 'Job', id: number, external_id: string, source_id: string | null, source_kind: string, company_id: number | null, company_key: string, title: string, location: string | null, url: string, description: string | null, publishedAt: string, score: number | null, score_reason: string | null, is_remote_eu: boolean, remote_eu_confidence: ClassificationConfidence | null, remote_eu_reason: string | null, absolute_url: string | null, internal_job_id: string | null, requisition_id: string | null, company_name: string | null, language: string | null, created_at: string, updated_at: string, company: { __typename?: 'Company', id: number, key: string, name: string, logo_url: string | null, website: string | null, description: string | null, industry: string | null, size: string | null, location: string | null, created_at: string, updated_at: string, linkedin_url: string | null, category: CompanyCategory, tags: Array<string>, services: Array<string>, service_taxonomy: Array<string>, industries: Array<string>, score: number, score_reasons: Array<string>, last_seen_crawl_id: string | null, last_seen_capture_timestamp: string | null, last_seen_source_url: string | null, ashby_enrichment: { __typename?: 'AshbyEnrichment', company_name: string | null, industry_tags: Array<string>, tech_signals: Array<string>, size_signal: string | null, enriched_at: string | null } | null } | null, skills: Array<{ __typename?: 'JobSkill', tag: string, level: string, confidence: number | null, evidence: string | null }> | null, metadata: Array<{ __typename?: 'GreenhouseMetadata', id: string, name: string, value: string | null, value_type: string | null }> | null, departments: Array<{ __typename?: 'GreenhouseDepartment', id: string, name: string, child_ids: Array<string> | null, parent_id: string | null }> | null, offices: Array<{ __typename?: 'GreenhouseOffice', id: string, name: string, location: string | null, child_ids: Array<string> | null, parent_id: string | null }> | null, questions: Array<{ __typename?: 'GreenhouseQuestion', description: string | null, label: string, required: boolean, fields: Array<{ __typename?: 'GreenhouseQuestionField', type: string, name: string | null }> | null }> | null, location_questions: Array<{ __typename?: 'GreenhouseQuestion', description: string | null, label: string, required: boolean, fields: Array<{ __typename?: 'GreenhouseQuestionField', type: string, name: string | null }> | null }> | null, compliance: Array<{ __typename?: 'GreenhouseCompliance', type: string, description: string | null, questions: Array<{ __typename?: 'GreenhouseQuestion', description: string | null, label: string, required: boolean, fields: Array<{ __typename?: 'GreenhouseQuestionField', type: string, name: string | null }> | null }> | null }> | null, demographic_questions: { __typename?: 'GreenhouseDemographicQuestions', header: string | null, description: string | null, questions: Array<{ __typename?: 'GreenhouseQuestion', description: string | null, label: string, required: boolean, fields: Array<{ __typename?: 'GreenhouseQuestionField', type: string, name: string | null }> | null }> | null } | null, data_compliance: Array<{ __typename?: 'GreenhouseDataCompliance', type: string, requires_consent: boolean, requires_processing_consent: boolean, requires_retention_consent: boolean, retention_period: number | null, demographic_data_consent_applies: boolean }> | null } | null } };

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

export type GetOpportunitiesQueryVariables = Exact<{
  companyId?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetOpportunitiesQuery = { __typename?: 'Query', opportunities: { __typename?: 'OpportunitiesResult', totalCount: number, opportunities: Array<{ __typename?: 'Opportunity', id: string, title: string, url: string | null, source: string | null, status: string, rewardUsd: number | null, rewardText: string | null, deadline: string | null, tags: Array<string>, score: number | null, applied: boolean, appliedAt: string | null, applicationStatus: string | null, companyId: number | null, createdAt: string, updatedAt: string, company: { __typename?: 'Company', id: number, name: string, website: string | null } | null }> } };

export type GetOpportunityQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetOpportunityQuery = { __typename?: 'Query', opportunity: { __typename?: 'Opportunity', id: string, title: string, url: string | null, source: string | null, status: string, rewardUsd: number | null, rewardText: string | null, startDate: string | null, endDate: string | null, deadline: string | null, firstSeen: string | null, lastSeen: string | null, score: number | null, rawContext: string | null, metadata: any | null, applied: boolean, appliedAt: string | null, applicationStatus: string | null, applicationNotes: string | null, tags: Array<string>, companyId: number | null, contactId: number | null, createdAt: string, updatedAt: string, company: { __typename?: 'Company', id: number, name: string, website: string | null } | null } | null };

export type CreateOpportunityMutationVariables = Exact<{
  input: CreateOpportunityInput;
}>;


export type CreateOpportunityMutation = { __typename?: 'Mutation', createOpportunity: { __typename?: 'Opportunity', id: string, title: string, url: string | null, source: string | null, status: string, companyId: number | null, createdAt: string } };

export type UpdateOpportunityMutationVariables = Exact<{
  id: Scalars['String']['input'];
  input: UpdateOpportunityInput;
}>;


export type UpdateOpportunityMutation = { __typename?: 'Mutation', updateOpportunity: { __typename?: 'Opportunity', id: string, title: string, status: string, applied: boolean, appliedAt: string | null, applicationStatus: string | null, applicationNotes: string | null, updatedAt: string } };

export type DeleteOpportunityMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type DeleteOpportunityMutation = { __typename?: 'Mutation', deleteOpportunity: { __typename?: 'DeleteOpportunityResult', success: boolean, message: string | null } };

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

export type ResumeStatusQueryVariables = Exact<{
  email: Scalars['String']['input'];
}>;


export type ResumeStatusQuery = { __typename?: 'Query', resumeStatus: { __typename?: 'ResumeStatus', exists: boolean, resume_id: string | null, chunk_count: number | null, filename: string | null, ingested_at: string | null } | null };

export type UploadResumeMutationVariables = Exact<{
  email: Scalars['String']['input'];
  resumePdf: Scalars['String']['input'];
  filename: Scalars['String']['input'];
}>;


export type UploadResumeMutation = { __typename?: 'Mutation', uploadResume: { __typename?: 'ResumeUploadResult', success: boolean, job_id: string, tier: string, status: string } | null };

export type IngestResumeParseMutationVariables = Exact<{
  email: Scalars['String']['input'];
  job_id: Scalars['String']['input'];
  filename: Scalars['String']['input'];
}>;


export type IngestResumeParseMutation = { __typename?: 'Mutation', ingestResumeParse: { __typename?: 'ResumeIngestResult', success: boolean, status: string, job_id: string, resume_id: string | null, chunks_stored: number | null, error: string | null } | null };

export type AskAboutResumeQueryVariables = Exact<{
  email: Scalars['String']['input'];
  question: Scalars['String']['input'];
}>;


export type AskAboutResumeQuery = { __typename?: 'Query', askAboutResume: { __typename?: 'ResumeAnswer', answer: string, context_count: number } | null };

export type StudyCategoriesQueryVariables = Exact<{ [key: string]: never; }>;


export type StudyCategoriesQuery = { __typename?: 'Query', studyCategories: Array<string> };

export type StudyTopicQueryVariables = Exact<{
  category: Scalars['String']['input'];
  topic: Scalars['String']['input'];
}>;


export type StudyTopicQuery = { __typename?: 'Query', studyTopic: { __typename?: 'StudyTopic', id: string, category: string, topic: string, title: string, summary: string | null, bodyMd: string | null, deepDive: string | null, difficulty: string, tags: Array<string>, createdAt: string } | null };

export type StudyTopicsQueryVariables = Exact<{
  category: Scalars['String']['input'];
}>;


export type StudyTopicsQuery = { __typename?: 'Query', studyTopics: Array<{ __typename?: 'StudyTopic', id: string, topic: string, title: string, summary: string | null, difficulty: string, tags: Array<string> }> };

export type CreateStudyTopicMutationVariables = Exact<{
  category?: InputMaybe<Scalars['String']['input']>;
  topic?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  summary?: InputMaybe<Scalars['String']['input']>;
  difficulty?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
}>;


export type CreateStudyTopicMutation = { __typename?: 'Mutation', createStudyTopic: { __typename?: 'StudyTopic', id: string, category: string, topic: string, title: string, summary: string | null, difficulty: string, tags: Array<string>, createdAt: string } };

export type GenerateStudyConceptExplanationMutationVariables = Exact<{
  studyTopicId: Scalars['ID']['input'];
  selectedText: Scalars['String']['input'];
  context?: InputMaybe<Scalars['String']['input']>;
}>;


export type GenerateStudyConceptExplanationMutation = { __typename?: 'Mutation', generateStudyConceptExplanation: { __typename?: 'StudyConceptExplanation', id: string, selectedText: string, explanation: string, createdAt: string } };

export type GenerateStudyDeepDiveMutationVariables = Exact<{
  studyTopicId: Scalars['ID']['input'];
  force?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type GenerateStudyDeepDiveMutation = { __typename?: 'Mutation', generateStudyDeepDive: { __typename?: 'StudyTopic', id: string, deepDive: string | null } };

export type GenerateStudyTopicsForCategoryMutationVariables = Exact<{
  category: Scalars['String']['input'];
  count?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GenerateStudyTopicsForCategoryMutation = { __typename?: 'Mutation', generateStudyTopicsForCategory: Array<{ __typename?: 'StudyTopic', id: string, topic: string, title: string, summary: string | null, difficulty: string, tags: Array<string> }> };

export type GenerateResearchMutationVariables = Exact<{
  goalDescription: Scalars['String']['input'];
}>;


export type GenerateResearchMutation = { __typename?: 'Mutation', generateResearch: Array<{ __typename?: 'ResearchItem', id: string, title: string, url: string, summary: string, relevance: string | null }> };

export type CreateTrackMutationVariables = Exact<{
  input: CreateTrackInput;
}>;


export type CreateTrackMutation = { __typename?: 'Mutation', createTrack: { __typename?: 'Track', id: string, slug: string, title: string, description: string | null, level: string | null, items: Array<{ __typename?: 'TrackItem', id: string }> } };

export type GetTracksQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetTracksQuery = { __typename?: 'Query', tracks: Array<{ __typename?: 'Track', id: string, slug: string, title: string, description: string | null, level: string | null, items: Array<{ __typename?: 'TrackItem', id: string, kind: string, title: string, position: number, contentRef: string | null, promptRef: string | null, difficulty: number | null, tags: Array<string>, prereqs: Array<string>, children: Array<{ __typename?: 'TrackItem', id: string, kind: string, title: string, position: number, contentRef: string | null, promptRef: string | null, difficulty: number | null, tags: Array<string>, prereqs: Array<string> }> }> }> };

export type GetTrackQueryVariables = Exact<{
  slug: Scalars['String']['input'];
}>;


export type GetTrackQuery = { __typename?: 'Query', track: { __typename?: 'Track', id: string, slug: string, title: string, description: string | null, level: string | null, items: Array<{ __typename?: 'TrackItem', id: string, kind: string, title: string, position: number, contentRef: string | null, promptRef: string | null, difficulty: number | null, tags: Array<string>, prereqs: Array<string>, children: Array<{ __typename?: 'TrackItem', id: string, kind: string, title: string, position: number, contentRef: string | null, promptRef: string | null, difficulty: number | null, tags: Array<string>, prereqs: Array<string>, children: Array<{ __typename?: 'TrackItem', id: string, kind: string, title: string, position: number, contentRef: string | null, promptRef: string | null, difficulty: number | null, tags: Array<string>, prereqs: Array<string> }> }> }> } | null };

export type GetPrepResourcesByCategoryQueryVariables = Exact<{
  category: Scalars['String']['input'];
}>;


export type GetPrepResourcesByCategoryQuery = { __typename?: 'Query', prepResourcesByCategory: Array<{ __typename?: 'PrepResource', id: string, title: string, href: string, description: string, category: string, tags: Array<string> }> };

export const BackendPrepSectionFieldsFragmentDoc = gql`
    fragment BackendPrepSectionFields on BackendPrepSection {
  title
  overview
  keyConcepts
  deepDive
  interviewQuestions {
    question
    idealAnswer
    followUps
    difficulty
  }
  codeExamples {
    title
    language
    code
    explanation
  }
  commonPitfalls
  talkingPoints
  researchInsights
}
    `;
export const ApplicationFieldsFragmentDoc = gql`
    fragment ApplicationFields on Application {
  id
  email
  jobId
  resume
  questions {
    questionId
    questionText
    answerText
  }
  status
  notes
  jobTitle
  companyName
  companyKey
  jobDescription
  createdAt
  interviewPrep {
    id
    slug
    title
    description
    level
  }
  aiInterviewPrep {
    summary
    requirements {
      requirement
      questions
      studyTopics
      studyTopicDeepDives {
        topic
        deepDive
      }
      sourceQuote
      deepDive
    }
    generatedAt
  }
  aiInterviewQuestions {
    companyContext
    recruiterQuestions {
      question
      reason
      category
    }
    technicalQuestions {
      question
      reason
      category
    }
    recruiterGeneratedAt
    technicalGeneratedAt
  }
  agenticCoding {
    overview
    workflowPattern
    exercises {
      title
      description
      difficulty
      skills
      hints
      agentPrompt
    }
    promptTemplates {
      title
      purpose
      stackContext
      prompt
    }
    qaApproach
    failureModes {
      scenario
      why
      alternative
    }
    teamPractices
    measurableOutcomes {
      task
      beforeTime
      afterTime
      improvement
    }
    resources {
      title
      url
      description
    }
    generatedAt
  }
  aiBackendPrep {
    systemDesign {
      ...BackendPrepSectionFields
    }
    distributedSystems {
      ...BackendPrepSectionFields
    }
    databaseDesign {
      ...BackendPrepSectionFields
    }
    sqlOptimization {
      ...BackendPrepSectionFields
    }
    nosqlPatterns {
      ...BackendPrepSectionFields
    }
    apiDesign {
      ...BackendPrepSectionFields
    }
    authSecurity {
      ...BackendPrepSectionFields
    }
    caching {
      ...BackendPrepSectionFields
    }
    messageQueues {
      ...BackendPrepSectionFields
    }
    microservices {
      ...BackendPrepSectionFields
    }
    testing {
      ...BackendPrepSectionFields
    }
    devops {
      ...BackendPrepSectionFields
    }
    securityOwasp {
      ...BackendPrepSectionFields
    }
    performance {
      ...BackendPrepSectionFields
    }
    concurrencyAsync {
      ...BackendPrepSectionFields
    }
    observability {
      ...BackendPrepSectionFields
    }
    eventDriven {
      ...BackendPrepSectionFields
    }
    serverlessEdge {
      ...BackendPrepSectionFields
    }
    typescriptNode {
      ...BackendPrepSectionFields
    }
    aiMlIntegration {
      ...BackendPrepSectionFields
    }
    generatedAt
  }
}
    ${BackendPrepSectionFieldsFragmentDoc}`;
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
  linkedin_url
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
  ashby_enrichment {
    company_name
    industry_tags
    tech_signals
    size_signal
    enriched_at
  }
}
    `;
export const DeepPlannerTaskDocument = gql`
    query DeepPlannerTask($id: ID!) {
  deepPlannerTask(id: $id) {
    id
    workflowType
    problemDescription
    context
    status
    currentStep
    checkpointCount
    totalSteps
    progressPercent
    outputArtifact
    errorMessage
    startedAt
    completedAt
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useDeepPlannerTaskQuery__
 *
 * To run a query within a React component, call `useDeepPlannerTaskQuery` and pass it any options that fit your needs.
 * When your component renders, `useDeepPlannerTaskQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDeepPlannerTaskQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeepPlannerTaskQuery(baseOptions: Apollo.QueryHookOptions<DeepPlannerTaskQuery, DeepPlannerTaskQueryVariables> & ({ variables: DeepPlannerTaskQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DeepPlannerTaskQuery, DeepPlannerTaskQueryVariables>(DeepPlannerTaskDocument, options);
      }
export function useDeepPlannerTaskLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DeepPlannerTaskQuery, DeepPlannerTaskQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DeepPlannerTaskQuery, DeepPlannerTaskQueryVariables>(DeepPlannerTaskDocument, options);
        }
// @ts-ignore
export function useDeepPlannerTaskSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<DeepPlannerTaskQuery, DeepPlannerTaskQueryVariables>): Apollo.UseSuspenseQueryResult<DeepPlannerTaskQuery, DeepPlannerTaskQueryVariables>;
export function useDeepPlannerTaskSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<DeepPlannerTaskQuery, DeepPlannerTaskQueryVariables>): Apollo.UseSuspenseQueryResult<DeepPlannerTaskQuery | undefined, DeepPlannerTaskQueryVariables>;
export function useDeepPlannerTaskSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<DeepPlannerTaskQuery, DeepPlannerTaskQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<DeepPlannerTaskQuery, DeepPlannerTaskQueryVariables>(DeepPlannerTaskDocument, options);
        }
export type DeepPlannerTaskQueryHookResult = ReturnType<typeof useDeepPlannerTaskQuery>;
export type DeepPlannerTaskLazyQueryHookResult = ReturnType<typeof useDeepPlannerTaskLazyQuery>;
export type DeepPlannerTaskSuspenseQueryHookResult = ReturnType<typeof useDeepPlannerTaskSuspenseQuery>;
export type DeepPlannerTaskQueryResult = Apollo.QueryResult<DeepPlannerTaskQuery, DeepPlannerTaskQueryVariables>;
export const TriggerDeepPlannerTaskDocument = gql`
    mutation TriggerDeepPlannerTask($id: ID!) {
  triggerDeepPlannerTask(id: $id) {
    id
    status
    currentStep
  }
}
    `;
export type TriggerDeepPlannerTaskMutationFn = Apollo.MutationFunction<TriggerDeepPlannerTaskMutation, TriggerDeepPlannerTaskMutationVariables>;

/**
 * __useTriggerDeepPlannerTaskMutation__
 *
 * To run a mutation, you first call `useTriggerDeepPlannerTaskMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useTriggerDeepPlannerTaskMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [triggerDeepPlannerTaskMutation, { data, loading, error }] = useTriggerDeepPlannerTaskMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useTriggerDeepPlannerTaskMutation(baseOptions?: Apollo.MutationHookOptions<TriggerDeepPlannerTaskMutation, TriggerDeepPlannerTaskMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<TriggerDeepPlannerTaskMutation, TriggerDeepPlannerTaskMutationVariables>(TriggerDeepPlannerTaskDocument, options);
      }
export type TriggerDeepPlannerTaskMutationHookResult = ReturnType<typeof useTriggerDeepPlannerTaskMutation>;
export type TriggerDeepPlannerTaskMutationResult = Apollo.MutationResult<TriggerDeepPlannerTaskMutation>;
export type TriggerDeepPlannerTaskMutationOptions = Apollo.BaseMutationOptions<TriggerDeepPlannerTaskMutation, TriggerDeepPlannerTaskMutationVariables>;
export const CancelDeepPlannerTaskDocument = gql`
    mutation CancelDeepPlannerTask($id: ID!) {
  cancelDeepPlannerTask(id: $id) {
    id
    status
  }
}
    `;
export type CancelDeepPlannerTaskMutationFn = Apollo.MutationFunction<CancelDeepPlannerTaskMutation, CancelDeepPlannerTaskMutationVariables>;

/**
 * __useCancelDeepPlannerTaskMutation__
 *
 * To run a mutation, you first call `useCancelDeepPlannerTaskMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCancelDeepPlannerTaskMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [cancelDeepPlannerTaskMutation, { data, loading, error }] = useCancelDeepPlannerTaskMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useCancelDeepPlannerTaskMutation(baseOptions?: Apollo.MutationHookOptions<CancelDeepPlannerTaskMutation, CancelDeepPlannerTaskMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CancelDeepPlannerTaskMutation, CancelDeepPlannerTaskMutationVariables>(CancelDeepPlannerTaskDocument, options);
      }
export type CancelDeepPlannerTaskMutationHookResult = ReturnType<typeof useCancelDeepPlannerTaskMutation>;
export type CancelDeepPlannerTaskMutationResult = Apollo.MutationResult<CancelDeepPlannerTaskMutation>;
export type CancelDeepPlannerTaskMutationOptions = Apollo.BaseMutationOptions<CancelDeepPlannerTaskMutation, CancelDeepPlannerTaskMutationVariables>;
export const DeepPlannerTasksDocument = gql`
    query DeepPlannerTasks {
  deepPlannerTasks {
    id
    workflowType
    problemDescription
    status
    currentStep
    checkpointCount
    totalSteps
    progressPercent
    errorMessage
    startedAt
    completedAt
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useDeepPlannerTasksQuery__
 *
 * To run a query within a React component, call `useDeepPlannerTasksQuery` and pass it any options that fit your needs.
 * When your component renders, `useDeepPlannerTasksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDeepPlannerTasksQuery({
 *   variables: {
 *   },
 * });
 */
export function useDeepPlannerTasksQuery(baseOptions?: Apollo.QueryHookOptions<DeepPlannerTasksQuery, DeepPlannerTasksQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DeepPlannerTasksQuery, DeepPlannerTasksQueryVariables>(DeepPlannerTasksDocument, options);
      }
export function useDeepPlannerTasksLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DeepPlannerTasksQuery, DeepPlannerTasksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DeepPlannerTasksQuery, DeepPlannerTasksQueryVariables>(DeepPlannerTasksDocument, options);
        }
// @ts-ignore
export function useDeepPlannerTasksSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<DeepPlannerTasksQuery, DeepPlannerTasksQueryVariables>): Apollo.UseSuspenseQueryResult<DeepPlannerTasksQuery, DeepPlannerTasksQueryVariables>;
export function useDeepPlannerTasksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<DeepPlannerTasksQuery, DeepPlannerTasksQueryVariables>): Apollo.UseSuspenseQueryResult<DeepPlannerTasksQuery | undefined, DeepPlannerTasksQueryVariables>;
export function useDeepPlannerTasksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<DeepPlannerTasksQuery, DeepPlannerTasksQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<DeepPlannerTasksQuery, DeepPlannerTasksQueryVariables>(DeepPlannerTasksDocument, options);
        }
export type DeepPlannerTasksQueryHookResult = ReturnType<typeof useDeepPlannerTasksQuery>;
export type DeepPlannerTasksLazyQueryHookResult = ReturnType<typeof useDeepPlannerTasksLazyQuery>;
export type DeepPlannerTasksSuspenseQueryHookResult = ReturnType<typeof useDeepPlannerTasksSuspenseQuery>;
export type DeepPlannerTasksQueryResult = Apollo.QueryResult<DeepPlannerTasksQuery, DeepPlannerTasksQueryVariables>;
export const CreateDeepPlannerTaskDocument = gql`
    mutation CreateDeepPlannerTask($workflowType: String!, $problemDescription: String!, $context: String) {
  createDeepPlannerTask(
    workflowType: $workflowType
    problemDescription: $problemDescription
    context: $context
  ) {
    id
    workflowType
    problemDescription
    status
    createdAt
  }
}
    `;
export type CreateDeepPlannerTaskMutationFn = Apollo.MutationFunction<CreateDeepPlannerTaskMutation, CreateDeepPlannerTaskMutationVariables>;

/**
 * __useCreateDeepPlannerTaskMutation__
 *
 * To run a mutation, you first call `useCreateDeepPlannerTaskMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateDeepPlannerTaskMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createDeepPlannerTaskMutation, { data, loading, error }] = useCreateDeepPlannerTaskMutation({
 *   variables: {
 *      workflowType: // value for 'workflowType'
 *      problemDescription: // value for 'problemDescription'
 *      context: // value for 'context'
 *   },
 * });
 */
export function useCreateDeepPlannerTaskMutation(baseOptions?: Apollo.MutationHookOptions<CreateDeepPlannerTaskMutation, CreateDeepPlannerTaskMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateDeepPlannerTaskMutation, CreateDeepPlannerTaskMutationVariables>(CreateDeepPlannerTaskDocument, options);
      }
export type CreateDeepPlannerTaskMutationHookResult = ReturnType<typeof useCreateDeepPlannerTaskMutation>;
export type CreateDeepPlannerTaskMutationResult = Apollo.MutationResult<CreateDeepPlannerTaskMutation>;
export type CreateDeepPlannerTaskMutationOptions = Apollo.BaseMutationOptions<CreateDeepPlannerTaskMutation, CreateDeepPlannerTaskMutationVariables>;
export const GetPrepResourcesDocument = gql`
    query GetPrepResources {
  prepResources {
    categories {
      id
      name
      emoji
      description
      resources {
        id
        title
        href
        description
        category
        tags
      }
    }
    totalResources
  }
}
    `;

/**
 * __useGetPrepResourcesQuery__
 *
 * To run a query within a React component, call `useGetPrepResourcesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetPrepResourcesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetPrepResourcesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetPrepResourcesQuery(baseOptions?: Apollo.QueryHookOptions<GetPrepResourcesQuery, GetPrepResourcesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetPrepResourcesQuery, GetPrepResourcesQueryVariables>(GetPrepResourcesDocument, options);
      }
export function useGetPrepResourcesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetPrepResourcesQuery, GetPrepResourcesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetPrepResourcesQuery, GetPrepResourcesQueryVariables>(GetPrepResourcesDocument, options);
        }
// @ts-ignore
export function useGetPrepResourcesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetPrepResourcesQuery, GetPrepResourcesQueryVariables>): Apollo.UseSuspenseQueryResult<GetPrepResourcesQuery, GetPrepResourcesQueryVariables>;
export function useGetPrepResourcesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetPrepResourcesQuery, GetPrepResourcesQueryVariables>): Apollo.UseSuspenseQueryResult<GetPrepResourcesQuery | undefined, GetPrepResourcesQueryVariables>;
export function useGetPrepResourcesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetPrepResourcesQuery, GetPrepResourcesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetPrepResourcesQuery, GetPrepResourcesQueryVariables>(GetPrepResourcesDocument, options);
        }
export type GetPrepResourcesQueryHookResult = ReturnType<typeof useGetPrepResourcesQuery>;
export type GetPrepResourcesLazyQueryHookResult = ReturnType<typeof useGetPrepResourcesLazyQuery>;
export type GetPrepResourcesSuspenseQueryHookResult = ReturnType<typeof useGetPrepResourcesSuspenseQuery>;
export type GetPrepResourcesQueryResult = Apollo.QueryResult<GetPrepResourcesQuery, GetPrepResourcesQueryVariables>;
export const DeleteAllJobsDocument = gql`
    mutation DeleteAllJobs {
  deleteAllJobs {
    success
    message
  }
}
    `;
export type DeleteAllJobsMutationFn = Apollo.MutationFunction<DeleteAllJobsMutation, DeleteAllJobsMutationVariables>;

/**
 * __useDeleteAllJobsMutation__
 *
 * To run a mutation, you first call `useDeleteAllJobsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteAllJobsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteAllJobsMutation, { data, loading, error }] = useDeleteAllJobsMutation({
 *   variables: {
 *   },
 * });
 */
export function useDeleteAllJobsMutation(baseOptions?: Apollo.MutationHookOptions<DeleteAllJobsMutation, DeleteAllJobsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteAllJobsMutation, DeleteAllJobsMutationVariables>(DeleteAllJobsDocument, options);
      }
export type DeleteAllJobsMutationHookResult = ReturnType<typeof useDeleteAllJobsMutation>;
export type DeleteAllJobsMutationResult = Apollo.MutationResult<DeleteAllJobsMutation>;
export type DeleteAllJobsMutationOptions = Apollo.BaseMutationOptions<DeleteAllJobsMutation, DeleteAllJobsMutationVariables>;
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
    publishedAt
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
    skillMatch {
      score
      userCoverage
      jobCoverage
      requiredCoverage
      matchedCount
      totalPreferred
      details {
        tag
        level
        matched
      }
    }
    absolute_url
    internal_job_id
    requisition_id
    company_name
    publishedAt
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
    ashby_department
    ashby_team
    ashby_employment_type
    ashby_is_remote
    ashby_is_listed
    ashby_job_url
    ashby_apply_url
    ashby_secondary_locations {
      location
      address {
        addressLocality
        addressRegion
        addressCountry
      }
    }
    ashby_compensation {
      compensationTierSummary
      scrapeableCompensationSalarySummary
      compensationTiers {
        id
        tierSummary
        title
        additionalInformation
        components {
          id
          summary
          compensationType
          interval
          currencyCode
          minValue
          maxValue
        }
      }
      summaryComponents {
        id
        summary
        compensationType
        interval
        currencyCode
        minValue
        maxValue
      }
    }
    ashby_address {
      postalAddress {
        addressLocality
        addressRegion
        addressCountry
      }
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
    query GetJobs($sourceType: String, $sourceTypes: [String!], $search: String, $limit: Int, $offset: Int, $excludedCompanies: [String!], $skills: [String!]) {
  jobs(
    sourceType: $sourceType
    sourceTypes: $sourceTypes
    search: $search
    limit: $limit
    offset: $offset
    excludedCompanies: $excludedCompanies
    skills: $skills
  ) {
    jobs {
      id
      external_id
      source_kind
      company_key
      title
      location
      url
      publishedAt
      status
      is_remote_eu
      remote_eu_confidence
      skills {
        tag
        level
      }
    }
    totalCount
  }
}
    `;

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
 *      sourceTypes: // value for 'sourceTypes'
 *      search: // value for 'search'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      excludedCompanies: // value for 'excludedCompanies'
 *      skills: // value for 'skills'
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
export const ProcessAllJobsDocument = gql`
    mutation ProcessAllJobs($limit: Int) {
  processAllJobs(limit: $limit) {
    success
    message
    enhanced
    enhanceErrors
    processed
    euRemote
    nonEuRemote
    errors
  }
}
    `;
export type ProcessAllJobsMutationFn = Apollo.MutationFunction<ProcessAllJobsMutation, ProcessAllJobsMutationVariables>;

/**
 * __useProcessAllJobsMutation__
 *
 * To run a mutation, you first call `useProcessAllJobsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useProcessAllJobsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [processAllJobsMutation, { data, loading, error }] = useProcessAllJobsMutation({
 *   variables: {
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useProcessAllJobsMutation(baseOptions?: Apollo.MutationHookOptions<ProcessAllJobsMutation, ProcessAllJobsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ProcessAllJobsMutation, ProcessAllJobsMutationVariables>(ProcessAllJobsDocument, options);
      }
export type ProcessAllJobsMutationHookResult = ReturnType<typeof useProcessAllJobsMutation>;
export type ProcessAllJobsMutationResult = Apollo.MutationResult<ProcessAllJobsMutation>;
export type ProcessAllJobsMutationOptions = Apollo.BaseMutationOptions<ProcessAllJobsMutation, ProcessAllJobsMutationVariables>;
export const ReportJobDocument = gql`
    mutation ReportJob($id: Int!) {
  reportJob(id: $id) {
    id
    status
  }
}
    `;
export type ReportJobMutationFn = Apollo.MutationFunction<ReportJobMutation, ReportJobMutationVariables>;

/**
 * __useReportJobMutation__
 *
 * To run a mutation, you first call `useReportJobMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReportJobMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [reportJobMutation, { data, loading, error }] = useReportJobMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useReportJobMutation(baseOptions?: Apollo.MutationHookOptions<ReportJobMutation, ReportJobMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReportJobMutation, ReportJobMutationVariables>(ReportJobDocument, options);
      }
export type ReportJobMutationHookResult = ReturnType<typeof useReportJobMutation>;
export type ReportJobMutationResult = Apollo.MutationResult<ReportJobMutation>;
export type ReportJobMutationOptions = Apollo.BaseMutationOptions<ReportJobMutation, ReportJobMutationVariables>;
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
    ...ApplicationFields
  }
}
    ${ApplicationFieldsFragmentDoc}`;

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
export const GetApplicationDocument = gql`
    query GetApplication($id: Int!) {
  application(id: $id) {
    ...ApplicationFields
  }
}
    ${ApplicationFieldsFragmentDoc}`;

/**
 * __useGetApplicationQuery__
 *
 * To run a query within a React component, call `useGetApplicationQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetApplicationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetApplicationQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetApplicationQuery(baseOptions: Apollo.QueryHookOptions<GetApplicationQuery, GetApplicationQueryVariables> & ({ variables: GetApplicationQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetApplicationQuery, GetApplicationQueryVariables>(GetApplicationDocument, options);
      }
export function useGetApplicationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetApplicationQuery, GetApplicationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetApplicationQuery, GetApplicationQueryVariables>(GetApplicationDocument, options);
        }
// @ts-ignore
export function useGetApplicationSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetApplicationQuery, GetApplicationQueryVariables>): Apollo.UseSuspenseQueryResult<GetApplicationQuery, GetApplicationQueryVariables>;
export function useGetApplicationSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetApplicationQuery, GetApplicationQueryVariables>): Apollo.UseSuspenseQueryResult<GetApplicationQuery | undefined, GetApplicationQueryVariables>;
export function useGetApplicationSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetApplicationQuery, GetApplicationQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetApplicationQuery, GetApplicationQueryVariables>(GetApplicationDocument, options);
        }
export type GetApplicationQueryHookResult = ReturnType<typeof useGetApplicationQuery>;
export type GetApplicationLazyQueryHookResult = ReturnType<typeof useGetApplicationLazyQuery>;
export type GetApplicationSuspenseQueryHookResult = ReturnType<typeof useGetApplicationSuspenseQuery>;
export type GetApplicationQueryResult = Apollo.QueryResult<GetApplicationQuery, GetApplicationQueryVariables>;
export const CreateApplicationDocument = gql`
    mutation CreateApplication($input: ApplicationInput!) {
  createApplication(input: $input) {
    ...ApplicationFields
  }
}
    ${ApplicationFieldsFragmentDoc}`;
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
export const UpdateApplicationDocument = gql`
    mutation UpdateApplication($id: Int!, $input: UpdateApplicationInput!) {
  updateApplication(id: $id, input: $input) {
    id
    jobId
    status
    notes
    jobTitle
    companyName
    companyKey
    jobDescription
  }
}
    `;
export type UpdateApplicationMutationFn = Apollo.MutationFunction<UpdateApplicationMutation, UpdateApplicationMutationVariables>;

/**
 * __useUpdateApplicationMutation__
 *
 * To run a mutation, you first call `useUpdateApplicationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateApplicationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateApplicationMutation, { data, loading, error }] = useUpdateApplicationMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateApplicationMutation(baseOptions?: Apollo.MutationHookOptions<UpdateApplicationMutation, UpdateApplicationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateApplicationMutation, UpdateApplicationMutationVariables>(UpdateApplicationDocument, options);
      }
export type UpdateApplicationMutationHookResult = ReturnType<typeof useUpdateApplicationMutation>;
export type UpdateApplicationMutationResult = Apollo.MutationResult<UpdateApplicationMutation>;
export type UpdateApplicationMutationOptions = Apollo.BaseMutationOptions<UpdateApplicationMutation, UpdateApplicationMutationVariables>;
export const LinkTrackToApplicationDocument = gql`
    mutation LinkTrackToApplication($applicationId: Int!, $trackSlug: String!) {
  linkTrackToApplication(applicationId: $applicationId, trackSlug: $trackSlug) {
    id
    interviewPrep {
      id
      slug
      title
      description
      level
    }
  }
}
    `;
export type LinkTrackToApplicationMutationFn = Apollo.MutationFunction<LinkTrackToApplicationMutation, LinkTrackToApplicationMutationVariables>;

/**
 * __useLinkTrackToApplicationMutation__
 *
 * To run a mutation, you first call `useLinkTrackToApplicationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLinkTrackToApplicationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [linkTrackToApplicationMutation, { data, loading, error }] = useLinkTrackToApplicationMutation({
 *   variables: {
 *      applicationId: // value for 'applicationId'
 *      trackSlug: // value for 'trackSlug'
 *   },
 * });
 */
export function useLinkTrackToApplicationMutation(baseOptions?: Apollo.MutationHookOptions<LinkTrackToApplicationMutation, LinkTrackToApplicationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LinkTrackToApplicationMutation, LinkTrackToApplicationMutationVariables>(LinkTrackToApplicationDocument, options);
      }
export type LinkTrackToApplicationMutationHookResult = ReturnType<typeof useLinkTrackToApplicationMutation>;
export type LinkTrackToApplicationMutationResult = Apollo.MutationResult<LinkTrackToApplicationMutation>;
export type LinkTrackToApplicationMutationOptions = Apollo.BaseMutationOptions<LinkTrackToApplicationMutation, LinkTrackToApplicationMutationVariables>;
export const UnlinkTrackFromApplicationDocument = gql`
    mutation UnlinkTrackFromApplication($applicationId: Int!, $trackSlug: String!) {
  unlinkTrackFromApplication(applicationId: $applicationId, trackSlug: $trackSlug) {
    id
    interviewPrep {
      id
      slug
      title
      description
      level
    }
  }
}
    `;
export type UnlinkTrackFromApplicationMutationFn = Apollo.MutationFunction<UnlinkTrackFromApplicationMutation, UnlinkTrackFromApplicationMutationVariables>;

/**
 * __useUnlinkTrackFromApplicationMutation__
 *
 * To run a mutation, you first call `useUnlinkTrackFromApplicationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnlinkTrackFromApplicationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unlinkTrackFromApplicationMutation, { data, loading, error }] = useUnlinkTrackFromApplicationMutation({
 *   variables: {
 *      applicationId: // value for 'applicationId'
 *      trackSlug: // value for 'trackSlug'
 *   },
 * });
 */
export function useUnlinkTrackFromApplicationMutation(baseOptions?: Apollo.MutationHookOptions<UnlinkTrackFromApplicationMutation, UnlinkTrackFromApplicationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UnlinkTrackFromApplicationMutation, UnlinkTrackFromApplicationMutationVariables>(UnlinkTrackFromApplicationDocument, options);
      }
export type UnlinkTrackFromApplicationMutationHookResult = ReturnType<typeof useUnlinkTrackFromApplicationMutation>;
export type UnlinkTrackFromApplicationMutationResult = Apollo.MutationResult<UnlinkTrackFromApplicationMutation>;
export type UnlinkTrackFromApplicationMutationOptions = Apollo.BaseMutationOptions<UnlinkTrackFromApplicationMutation, UnlinkTrackFromApplicationMutationVariables>;
export const GenerateInterviewPrepDocument = gql`
    mutation GenerateInterviewPrep($applicationId: Int!) {
  generateInterviewPrep(applicationId: $applicationId) {
    id
    aiInterviewPrep {
      summary
      requirements {
        requirement
        questions
        studyTopics
        studyTopicDeepDives {
          topic
          deepDive
        }
        sourceQuote
        deepDive
      }
      generatedAt
    }
  }
}
    `;
export type GenerateInterviewPrepMutationFn = Apollo.MutationFunction<GenerateInterviewPrepMutation, GenerateInterviewPrepMutationVariables>;

/**
 * __useGenerateInterviewPrepMutation__
 *
 * To run a mutation, you first call `useGenerateInterviewPrepMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateInterviewPrepMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateInterviewPrepMutation, { data, loading, error }] = useGenerateInterviewPrepMutation({
 *   variables: {
 *      applicationId: // value for 'applicationId'
 *   },
 * });
 */
export function useGenerateInterviewPrepMutation(baseOptions?: Apollo.MutationHookOptions<GenerateInterviewPrepMutation, GenerateInterviewPrepMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateInterviewPrepMutation, GenerateInterviewPrepMutationVariables>(GenerateInterviewPrepDocument, options);
      }
export type GenerateInterviewPrepMutationHookResult = ReturnType<typeof useGenerateInterviewPrepMutation>;
export type GenerateInterviewPrepMutationResult = Apollo.MutationResult<GenerateInterviewPrepMutation>;
export type GenerateInterviewPrepMutationOptions = Apollo.BaseMutationOptions<GenerateInterviewPrepMutation, GenerateInterviewPrepMutationVariables>;
export const GenerateTopicDeepDiveDocument = gql`
    mutation GenerateTopicDeepDive($applicationId: Int!, $requirement: String!, $force: Boolean) {
  generateTopicDeepDive(
    applicationId: $applicationId
    requirement: $requirement
    force: $force
  ) {
    id
    aiInterviewPrep {
      summary
      requirements {
        requirement
        questions
        studyTopics
        studyTopicDeepDives {
          topic
          deepDive
        }
        sourceQuote
        deepDive
      }
      generatedAt
    }
  }
}
    `;
export type GenerateTopicDeepDiveMutationFn = Apollo.MutationFunction<GenerateTopicDeepDiveMutation, GenerateTopicDeepDiveMutationVariables>;

/**
 * __useGenerateTopicDeepDiveMutation__
 *
 * To run a mutation, you first call `useGenerateTopicDeepDiveMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateTopicDeepDiveMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateTopicDeepDiveMutation, { data, loading, error }] = useGenerateTopicDeepDiveMutation({
 *   variables: {
 *      applicationId: // value for 'applicationId'
 *      requirement: // value for 'requirement'
 *      force: // value for 'force'
 *   },
 * });
 */
export function useGenerateTopicDeepDiveMutation(baseOptions?: Apollo.MutationHookOptions<GenerateTopicDeepDiveMutation, GenerateTopicDeepDiveMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateTopicDeepDiveMutation, GenerateTopicDeepDiveMutationVariables>(GenerateTopicDeepDiveDocument, options);
      }
export type GenerateTopicDeepDiveMutationHookResult = ReturnType<typeof useGenerateTopicDeepDiveMutation>;
export type GenerateTopicDeepDiveMutationResult = Apollo.MutationResult<GenerateTopicDeepDiveMutation>;
export type GenerateTopicDeepDiveMutationOptions = Apollo.BaseMutationOptions<GenerateTopicDeepDiveMutation, GenerateTopicDeepDiveMutationVariables>;
export const GenerateStudyTopicDeepDiveDocument = gql`
    mutation GenerateStudyTopicDeepDive($applicationId: Int!, $requirement: String!, $studyTopic: String!, $force: Boolean) {
  generateStudyTopicDeepDive(
    applicationId: $applicationId
    requirement: $requirement
    studyTopic: $studyTopic
    force: $force
  ) {
    id
    aiInterviewPrep {
      summary
      requirements {
        requirement
        questions
        studyTopics
        studyTopicDeepDives {
          topic
          deepDive
        }
        sourceQuote
        deepDive
      }
      generatedAt
    }
  }
}
    `;
export type GenerateStudyTopicDeepDiveMutationFn = Apollo.MutationFunction<GenerateStudyTopicDeepDiveMutation, GenerateStudyTopicDeepDiveMutationVariables>;

/**
 * __useGenerateStudyTopicDeepDiveMutation__
 *
 * To run a mutation, you first call `useGenerateStudyTopicDeepDiveMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateStudyTopicDeepDiveMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateStudyTopicDeepDiveMutation, { data, loading, error }] = useGenerateStudyTopicDeepDiveMutation({
 *   variables: {
 *      applicationId: // value for 'applicationId'
 *      requirement: // value for 'requirement'
 *      studyTopic: // value for 'studyTopic'
 *      force: // value for 'force'
 *   },
 * });
 */
export function useGenerateStudyTopicDeepDiveMutation(baseOptions?: Apollo.MutationHookOptions<GenerateStudyTopicDeepDiveMutation, GenerateStudyTopicDeepDiveMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateStudyTopicDeepDiveMutation, GenerateStudyTopicDeepDiveMutationVariables>(GenerateStudyTopicDeepDiveDocument, options);
      }
export type GenerateStudyTopicDeepDiveMutationHookResult = ReturnType<typeof useGenerateStudyTopicDeepDiveMutation>;
export type GenerateStudyTopicDeepDiveMutationResult = Apollo.MutationResult<GenerateStudyTopicDeepDiveMutation>;
export type GenerateStudyTopicDeepDiveMutationOptions = Apollo.BaseMutationOptions<GenerateStudyTopicDeepDiveMutation, GenerateStudyTopicDeepDiveMutationVariables>;
export const GenerateRequirementFromSelectionDocument = gql`
    mutation GenerateRequirementFromSelection($applicationId: Int!, $selectedText: String!) {
  generateRequirementFromSelection(
    applicationId: $applicationId
    selectedText: $selectedText
  ) {
    id
    aiInterviewPrep {
      summary
      requirements {
        requirement
        questions
        studyTopics
        studyTopicDeepDives {
          topic
          deepDive
        }
        sourceQuote
        deepDive
      }
      generatedAt
    }
  }
}
    `;
export type GenerateRequirementFromSelectionMutationFn = Apollo.MutationFunction<GenerateRequirementFromSelectionMutation, GenerateRequirementFromSelectionMutationVariables>;

/**
 * __useGenerateRequirementFromSelectionMutation__
 *
 * To run a mutation, you first call `useGenerateRequirementFromSelectionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateRequirementFromSelectionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateRequirementFromSelectionMutation, { data, loading, error }] = useGenerateRequirementFromSelectionMutation({
 *   variables: {
 *      applicationId: // value for 'applicationId'
 *      selectedText: // value for 'selectedText'
 *   },
 * });
 */
export function useGenerateRequirementFromSelectionMutation(baseOptions?: Apollo.MutationHookOptions<GenerateRequirementFromSelectionMutation, GenerateRequirementFromSelectionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateRequirementFromSelectionMutation, GenerateRequirementFromSelectionMutationVariables>(GenerateRequirementFromSelectionDocument, options);
      }
export type GenerateRequirementFromSelectionMutationHookResult = ReturnType<typeof useGenerateRequirementFromSelectionMutation>;
export type GenerateRequirementFromSelectionMutationResult = Apollo.MutationResult<GenerateRequirementFromSelectionMutation>;
export type GenerateRequirementFromSelectionMutationOptions = Apollo.BaseMutationOptions<GenerateRequirementFromSelectionMutation, GenerateRequirementFromSelectionMutationVariables>;
export const DeleteApplicationDocument = gql`
    mutation DeleteApplication($id: Int!) {
  deleteApplication(id: $id) {
    success
    message
  }
}
    `;
export type DeleteApplicationMutationFn = Apollo.MutationFunction<DeleteApplicationMutation, DeleteApplicationMutationVariables>;

/**
 * __useDeleteApplicationMutation__
 *
 * To run a mutation, you first call `useDeleteApplicationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteApplicationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteApplicationMutation, { data, loading, error }] = useDeleteApplicationMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteApplicationMutation(baseOptions?: Apollo.MutationHookOptions<DeleteApplicationMutation, DeleteApplicationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteApplicationMutation, DeleteApplicationMutationVariables>(DeleteApplicationDocument, options);
      }
export type DeleteApplicationMutationHookResult = ReturnType<typeof useDeleteApplicationMutation>;
export type DeleteApplicationMutationResult = Apollo.MutationResult<DeleteApplicationMutation>;
export type DeleteApplicationMutationOptions = Apollo.BaseMutationOptions<DeleteApplicationMutation, DeleteApplicationMutationVariables>;
export const LinkSelectionToRequirementDocument = gql`
    mutation LinkSelectionToRequirement($applicationId: Int!, $requirement: String!, $sourceQuote: String!) {
  linkSelectionToRequirement(
    applicationId: $applicationId
    requirement: $requirement
    sourceQuote: $sourceQuote
  ) {
    id
    aiInterviewPrep {
      summary
      requirements {
        requirement
        questions
        studyTopics
        studyTopicDeepDives {
          topic
          deepDive
        }
        sourceQuote
        deepDive
      }
      generatedAt
    }
  }
}
    `;
export type LinkSelectionToRequirementMutationFn = Apollo.MutationFunction<LinkSelectionToRequirementMutation, LinkSelectionToRequirementMutationVariables>;

/**
 * __useLinkSelectionToRequirementMutation__
 *
 * To run a mutation, you first call `useLinkSelectionToRequirementMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLinkSelectionToRequirementMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [linkSelectionToRequirementMutation, { data, loading, error }] = useLinkSelectionToRequirementMutation({
 *   variables: {
 *      applicationId: // value for 'applicationId'
 *      requirement: // value for 'requirement'
 *      sourceQuote: // value for 'sourceQuote'
 *   },
 * });
 */
export function useLinkSelectionToRequirementMutation(baseOptions?: Apollo.MutationHookOptions<LinkSelectionToRequirementMutation, LinkSelectionToRequirementMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LinkSelectionToRequirementMutation, LinkSelectionToRequirementMutationVariables>(LinkSelectionToRequirementDocument, options);
      }
export type LinkSelectionToRequirementMutationHookResult = ReturnType<typeof useLinkSelectionToRequirementMutation>;
export type LinkSelectionToRequirementMutationResult = Apollo.MutationResult<LinkSelectionToRequirementMutation>;
export type LinkSelectionToRequirementMutationOptions = Apollo.BaseMutationOptions<LinkSelectionToRequirementMutation, LinkSelectionToRequirementMutationVariables>;
export const GenerateAgenticCodingDocument = gql`
    mutation GenerateAgenticCoding($applicationId: Int!) {
  generateAgenticCoding(applicationId: $applicationId) {
    id
    agenticCoding {
      overview
      workflowPattern
      exercises {
        title
        description
        difficulty
        skills
        hints
        agentPrompt
      }
      promptTemplates {
        title
        purpose
        stackContext
        prompt
      }
      qaApproach
      failureModes {
        scenario
        why
        alternative
      }
      teamPractices
      measurableOutcomes {
        task
        beforeTime
        afterTime
        improvement
      }
      resources {
        title
        url
        description
      }
      generatedAt
    }
  }
}
    `;
export type GenerateAgenticCodingMutationFn = Apollo.MutationFunction<GenerateAgenticCodingMutation, GenerateAgenticCodingMutationVariables>;

/**
 * __useGenerateAgenticCodingMutation__
 *
 * To run a mutation, you first call `useGenerateAgenticCodingMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateAgenticCodingMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateAgenticCodingMutation, { data, loading, error }] = useGenerateAgenticCodingMutation({
 *   variables: {
 *      applicationId: // value for 'applicationId'
 *   },
 * });
 */
export function useGenerateAgenticCodingMutation(baseOptions?: Apollo.MutationHookOptions<GenerateAgenticCodingMutation, GenerateAgenticCodingMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateAgenticCodingMutation, GenerateAgenticCodingMutationVariables>(GenerateAgenticCodingDocument, options);
      }
export type GenerateAgenticCodingMutationHookResult = ReturnType<typeof useGenerateAgenticCodingMutation>;
export type GenerateAgenticCodingMutationResult = Apollo.MutationResult<GenerateAgenticCodingMutation>;
export type GenerateAgenticCodingMutationOptions = Apollo.BaseMutationOptions<GenerateAgenticCodingMutation, GenerateAgenticCodingMutationVariables>;
export const GenerateBackendPrepDocument = gql`
    mutation GenerateBackendPrep($applicationId: Int!) {
  generateBackendPrep(applicationId: $applicationId) {
    id
    aiBackendPrep {
      systemDesign {
        ...BackendPrepSectionFields
      }
      distributedSystems {
        ...BackendPrepSectionFields
      }
      databaseDesign {
        ...BackendPrepSectionFields
      }
      sqlOptimization {
        ...BackendPrepSectionFields
      }
      nosqlPatterns {
        ...BackendPrepSectionFields
      }
      apiDesign {
        ...BackendPrepSectionFields
      }
      authSecurity {
        ...BackendPrepSectionFields
      }
      caching {
        ...BackendPrepSectionFields
      }
      messageQueues {
        ...BackendPrepSectionFields
      }
      microservices {
        ...BackendPrepSectionFields
      }
      testing {
        ...BackendPrepSectionFields
      }
      devops {
        ...BackendPrepSectionFields
      }
      securityOwasp {
        ...BackendPrepSectionFields
      }
      performance {
        ...BackendPrepSectionFields
      }
      concurrencyAsync {
        ...BackendPrepSectionFields
      }
      observability {
        ...BackendPrepSectionFields
      }
      eventDriven {
        ...BackendPrepSectionFields
      }
      serverlessEdge {
        ...BackendPrepSectionFields
      }
      typescriptNode {
        ...BackendPrepSectionFields
      }
      aiMlIntegration {
        ...BackendPrepSectionFields
      }
      generatedAt
    }
  }
}
    ${BackendPrepSectionFieldsFragmentDoc}`;
export type GenerateBackendPrepMutationFn = Apollo.MutationFunction<GenerateBackendPrepMutation, GenerateBackendPrepMutationVariables>;

/**
 * __useGenerateBackendPrepMutation__
 *
 * To run a mutation, you first call `useGenerateBackendPrepMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateBackendPrepMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateBackendPrepMutation, { data, loading, error }] = useGenerateBackendPrepMutation({
 *   variables: {
 *      applicationId: // value for 'applicationId'
 *   },
 * });
 */
export function useGenerateBackendPrepMutation(baseOptions?: Apollo.MutationHookOptions<GenerateBackendPrepMutation, GenerateBackendPrepMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateBackendPrepMutation, GenerateBackendPrepMutationVariables>(GenerateBackendPrepDocument, options);
      }
export type GenerateBackendPrepMutationHookResult = ReturnType<typeof useGenerateBackendPrepMutation>;
export type GenerateBackendPrepMutationResult = Apollo.MutationResult<GenerateBackendPrepMutation>;
export type GenerateBackendPrepMutationOptions = Apollo.BaseMutationOptions<GenerateBackendPrepMutation, GenerateBackendPrepMutationVariables>;
export const GenerateInterviewQuestionsDocument = gql`
    mutation GenerateInterviewQuestions($applicationId: Int!, $type: String!) {
  generateInterviewQuestions(applicationId: $applicationId, type: $type) {
    id
    aiInterviewQuestions {
      companyContext
      recruiterQuestions {
        question
        reason
        category
      }
      technicalQuestions {
        question
        reason
        category
      }
      recruiterGeneratedAt
      technicalGeneratedAt
    }
  }
}
    `;
export type GenerateInterviewQuestionsMutationFn = Apollo.MutationFunction<GenerateInterviewQuestionsMutation, GenerateInterviewQuestionsMutationVariables>;

/**
 * __useGenerateInterviewQuestionsMutation__
 *
 * To run a mutation, you first call `useGenerateInterviewQuestionsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateInterviewQuestionsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateInterviewQuestionsMutation, { data, loading, error }] = useGenerateInterviewQuestionsMutation({
 *   variables: {
 *      applicationId: // value for 'applicationId'
 *      type: // value for 'type'
 *   },
 * });
 */
export function useGenerateInterviewQuestionsMutation(baseOptions?: Apollo.MutationHookOptions<GenerateInterviewQuestionsMutation, GenerateInterviewQuestionsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateInterviewQuestionsMutation, GenerateInterviewQuestionsMutationVariables>(GenerateInterviewQuestionsDocument, options);
      }
export type GenerateInterviewQuestionsMutationHookResult = ReturnType<typeof useGenerateInterviewQuestionsMutation>;
export type GenerateInterviewQuestionsMutationResult = Apollo.MutationResult<GenerateInterviewQuestionsMutation>;
export type GenerateInterviewQuestionsMutationOptions = Apollo.BaseMutationOptions<GenerateInterviewQuestionsMutation, GenerateInterviewQuestionsMutationVariables>;
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
    query GetCompanies($text: String, $order_by: CompanyOrderBy, $limit: Int, $offset: Int) {
  companies(
    filter: {text: $text}
    order_by: $order_by
    limit: $limit
    offset: $offset
  ) {
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
 *      order_by: // value for 'order_by'
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
export const GetContactDocument = gql`
    query GetContact($id: Int!) {
  contact(id: $id) {
    id
    firstName
    lastName
    email
    emails
    bouncedEmails
    linkedinUrl
    company
    companyId
    position
    emailVerified
    doNotContact
    githubHandle
    telegramHandle
    tags
    nbStatus
    nbResult
    nbFlags
    nbSuggestedCorrection
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetContactQuery__
 *
 * To run a query within a React component, call `useGetContactQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetContactQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetContactQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetContactQuery(baseOptions: Apollo.QueryHookOptions<GetContactQuery, GetContactQueryVariables> & ({ variables: GetContactQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetContactQuery, GetContactQueryVariables>(GetContactDocument, options);
      }
export function useGetContactLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetContactQuery, GetContactQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetContactQuery, GetContactQueryVariables>(GetContactDocument, options);
        }
// @ts-ignore
export function useGetContactSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetContactQuery, GetContactQueryVariables>): Apollo.UseSuspenseQueryResult<GetContactQuery, GetContactQueryVariables>;
export function useGetContactSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetContactQuery, GetContactQueryVariables>): Apollo.UseSuspenseQueryResult<GetContactQuery | undefined, GetContactQueryVariables>;
export function useGetContactSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetContactQuery, GetContactQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetContactQuery, GetContactQueryVariables>(GetContactDocument, options);
        }
export type GetContactQueryHookResult = ReturnType<typeof useGetContactQuery>;
export type GetContactLazyQueryHookResult = ReturnType<typeof useGetContactLazyQuery>;
export type GetContactSuspenseQueryHookResult = ReturnType<typeof useGetContactSuspenseQuery>;
export type GetContactQueryResult = Apollo.QueryResult<GetContactQuery, GetContactQueryVariables>;
export const UpdateContactDocument = gql`
    mutation UpdateContact($id: Int!, $input: UpdateContactInput!) {
  updateContact(id: $id, input: $input) {
    id
    firstName
    lastName
    email
    emails
    linkedinUrl
    position
    githubHandle
    telegramHandle
    doNotContact
    tags
    emailVerified
    updatedAt
  }
}
    `;
export type UpdateContactMutationFn = Apollo.MutationFunction<UpdateContactMutation, UpdateContactMutationVariables>;

/**
 * __useUpdateContactMutation__
 *
 * To run a mutation, you first call `useUpdateContactMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateContactMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateContactMutation, { data, loading, error }] = useUpdateContactMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateContactMutation(baseOptions?: Apollo.MutationHookOptions<UpdateContactMutation, UpdateContactMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateContactMutation, UpdateContactMutationVariables>(UpdateContactDocument, options);
      }
export type UpdateContactMutationHookResult = ReturnType<typeof useUpdateContactMutation>;
export type UpdateContactMutationResult = Apollo.MutationResult<UpdateContactMutation>;
export type UpdateContactMutationOptions = Apollo.BaseMutationOptions<UpdateContactMutation, UpdateContactMutationVariables>;
export const DeleteContactDocument = gql`
    mutation DeleteContact($id: Int!) {
  deleteContact(id: $id) {
    success
    message
  }
}
    `;
export type DeleteContactMutationFn = Apollo.MutationFunction<DeleteContactMutation, DeleteContactMutationVariables>;

/**
 * __useDeleteContactMutation__
 *
 * To run a mutation, you first call `useDeleteContactMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteContactMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteContactMutation, { data, loading, error }] = useDeleteContactMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteContactMutation(baseOptions?: Apollo.MutationHookOptions<DeleteContactMutation, DeleteContactMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteContactMutation, DeleteContactMutationVariables>(DeleteContactDocument, options);
      }
export type DeleteContactMutationHookResult = ReturnType<typeof useDeleteContactMutation>;
export type DeleteContactMutationResult = Apollo.MutationResult<DeleteContactMutation>;
export type DeleteContactMutationOptions = Apollo.BaseMutationOptions<DeleteContactMutation, DeleteContactMutationVariables>;
export const GetResendEmailDocument = gql`
    query GetResendEmail($resendId: String!) {
  resendEmail(resendId: $resendId) {
    id
    from
    to
    subject
    text
    html
    lastEvent
    createdAt
    scheduledAt
    cc
    bcc
  }
}
    `;

/**
 * __useGetResendEmailQuery__
 *
 * To run a query within a React component, call `useGetResendEmailQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetResendEmailQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetResendEmailQuery({
 *   variables: {
 *      resendId: // value for 'resendId'
 *   },
 * });
 */
export function useGetResendEmailQuery(baseOptions: Apollo.QueryHookOptions<GetResendEmailQuery, GetResendEmailQueryVariables> & ({ variables: GetResendEmailQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetResendEmailQuery, GetResendEmailQueryVariables>(GetResendEmailDocument, options);
      }
export function useGetResendEmailLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetResendEmailQuery, GetResendEmailQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetResendEmailQuery, GetResendEmailQueryVariables>(GetResendEmailDocument, options);
        }
// @ts-ignore
export function useGetResendEmailSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetResendEmailQuery, GetResendEmailQueryVariables>): Apollo.UseSuspenseQueryResult<GetResendEmailQuery, GetResendEmailQueryVariables>;
export function useGetResendEmailSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetResendEmailQuery, GetResendEmailQueryVariables>): Apollo.UseSuspenseQueryResult<GetResendEmailQuery | undefined, GetResendEmailQueryVariables>;
export function useGetResendEmailSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetResendEmailQuery, GetResendEmailQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetResendEmailQuery, GetResendEmailQueryVariables>(GetResendEmailDocument, options);
        }
export type GetResendEmailQueryHookResult = ReturnType<typeof useGetResendEmailQuery>;
export type GetResendEmailLazyQueryHookResult = ReturnType<typeof useGetResendEmailLazyQuery>;
export type GetResendEmailSuspenseQueryHookResult = ReturnType<typeof useGetResendEmailSuspenseQuery>;
export type GetResendEmailQueryResult = Apollo.QueryResult<GetResendEmailQuery, GetResendEmailQueryVariables>;
export const GetContactEmailsDocument = gql`
    query GetContactEmails($contactId: Int!) {
  contactEmails(contactId: $contactId) {
    id
    resendId
    fromEmail
    toEmails
    subject
    textContent
    status
    sentAt
    recipientName
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetContactEmailsQuery__
 *
 * To run a query within a React component, call `useGetContactEmailsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetContactEmailsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetContactEmailsQuery({
 *   variables: {
 *      contactId: // value for 'contactId'
 *   },
 * });
 */
export function useGetContactEmailsQuery(baseOptions: Apollo.QueryHookOptions<GetContactEmailsQuery, GetContactEmailsQueryVariables> & ({ variables: GetContactEmailsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetContactEmailsQuery, GetContactEmailsQueryVariables>(GetContactEmailsDocument, options);
      }
export function useGetContactEmailsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetContactEmailsQuery, GetContactEmailsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetContactEmailsQuery, GetContactEmailsQueryVariables>(GetContactEmailsDocument, options);
        }
// @ts-ignore
export function useGetContactEmailsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetContactEmailsQuery, GetContactEmailsQueryVariables>): Apollo.UseSuspenseQueryResult<GetContactEmailsQuery, GetContactEmailsQueryVariables>;
export function useGetContactEmailsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetContactEmailsQuery, GetContactEmailsQueryVariables>): Apollo.UseSuspenseQueryResult<GetContactEmailsQuery | undefined, GetContactEmailsQueryVariables>;
export function useGetContactEmailsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetContactEmailsQuery, GetContactEmailsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetContactEmailsQuery, GetContactEmailsQueryVariables>(GetContactEmailsDocument, options);
        }
export type GetContactEmailsQueryHookResult = ReturnType<typeof useGetContactEmailsQuery>;
export type GetContactEmailsLazyQueryHookResult = ReturnType<typeof useGetContactEmailsLazyQuery>;
export type GetContactEmailsSuspenseQueryHookResult = ReturnType<typeof useGetContactEmailsSuspenseQuery>;
export type GetContactEmailsQueryResult = Apollo.QueryResult<GetContactEmailsQuery, GetContactEmailsQueryVariables>;
export const GetContactsDocument = gql`
    query GetContacts($companyId: Int, $search: String, $limit: Int, $offset: Int) {
  contacts(companyId: $companyId, search: $search, limit: $limit, offset: $offset) {
    contacts {
      id
      firstName
      lastName
      email
      bouncedEmails
      linkedinUrl
      position
      company
      companyId
      githubHandle
      telegramHandle
      emailVerified
      doNotContact
      nbResult
      tags
      createdAt
    }
    totalCount
  }
}
    `;

/**
 * __useGetContactsQuery__
 *
 * To run a query within a React component, call `useGetContactsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetContactsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetContactsQuery({
 *   variables: {
 *      companyId: // value for 'companyId'
 *      search: // value for 'search'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetContactsQuery(baseOptions?: Apollo.QueryHookOptions<GetContactsQuery, GetContactsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetContactsQuery, GetContactsQueryVariables>(GetContactsDocument, options);
      }
export function useGetContactsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetContactsQuery, GetContactsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetContactsQuery, GetContactsQueryVariables>(GetContactsDocument, options);
        }
// @ts-ignore
export function useGetContactsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetContactsQuery, GetContactsQueryVariables>): Apollo.UseSuspenseQueryResult<GetContactsQuery, GetContactsQueryVariables>;
export function useGetContactsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetContactsQuery, GetContactsQueryVariables>): Apollo.UseSuspenseQueryResult<GetContactsQuery | undefined, GetContactsQueryVariables>;
export function useGetContactsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetContactsQuery, GetContactsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetContactsQuery, GetContactsQueryVariables>(GetContactsDocument, options);
        }
export type GetContactsQueryHookResult = ReturnType<typeof useGetContactsQuery>;
export type GetContactsLazyQueryHookResult = ReturnType<typeof useGetContactsLazyQuery>;
export type GetContactsSuspenseQueryHookResult = ReturnType<typeof useGetContactsSuspenseQuery>;
export type GetContactsQueryResult = Apollo.QueryResult<GetContactsQuery, GetContactsQueryVariables>;
export const ImportContactsDocument = gql`
    mutation ImportContacts($contacts: [ContactInput!]!) {
  importContacts(contacts: $contacts) {
    success
    imported
    failed
    errors
  }
}
    `;
export type ImportContactsMutationFn = Apollo.MutationFunction<ImportContactsMutation, ImportContactsMutationVariables>;

/**
 * __useImportContactsMutation__
 *
 * To run a mutation, you first call `useImportContactsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useImportContactsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [importContactsMutation, { data, loading, error }] = useImportContactsMutation({
 *   variables: {
 *      contacts: // value for 'contacts'
 *   },
 * });
 */
export function useImportContactsMutation(baseOptions?: Apollo.MutationHookOptions<ImportContactsMutation, ImportContactsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ImportContactsMutation, ImportContactsMutationVariables>(ImportContactsDocument, options);
      }
export type ImportContactsMutationHookResult = ReturnType<typeof useImportContactsMutation>;
export type ImportContactsMutationResult = Apollo.MutationResult<ImportContactsMutation>;
export type ImportContactsMutationOptions = Apollo.BaseMutationOptions<ImportContactsMutation, ImportContactsMutationVariables>;
export const FindContactEmailDocument = gql`
    mutation FindContactEmail($contactId: Int!) {
  findContactEmail(contactId: $contactId) {
    success
    emailFound
    email
    verified
    message
    candidatesTried
  }
}
    `;
export type FindContactEmailMutationFn = Apollo.MutationFunction<FindContactEmailMutation, FindContactEmailMutationVariables>;

/**
 * __useFindContactEmailMutation__
 *
 * To run a mutation, you first call `useFindContactEmailMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useFindContactEmailMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [findContactEmailMutation, { data, loading, error }] = useFindContactEmailMutation({
 *   variables: {
 *      contactId: // value for 'contactId'
 *   },
 * });
 */
export function useFindContactEmailMutation(baseOptions?: Apollo.MutationHookOptions<FindContactEmailMutation, FindContactEmailMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<FindContactEmailMutation, FindContactEmailMutationVariables>(FindContactEmailDocument, options);
      }
export type FindContactEmailMutationHookResult = ReturnType<typeof useFindContactEmailMutation>;
export type FindContactEmailMutationResult = Apollo.MutationResult<FindContactEmailMutation>;
export type FindContactEmailMutationOptions = Apollo.BaseMutationOptions<FindContactEmailMutation, FindContactEmailMutationVariables>;
export const FindCompanyEmailsDocument = gql`
    mutation FindCompanyEmails($companyId: Int!) {
  findCompanyEmails(companyId: $companyId) {
    success
    message
    companiesProcessed
    totalContactsProcessed
    totalEmailsFound
    errors
  }
}
    `;
export type FindCompanyEmailsMutationFn = Apollo.MutationFunction<FindCompanyEmailsMutation, FindCompanyEmailsMutationVariables>;

/**
 * __useFindCompanyEmailsMutation__
 *
 * To run a mutation, you first call `useFindCompanyEmailsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useFindCompanyEmailsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [findCompanyEmailsMutation, { data, loading, error }] = useFindCompanyEmailsMutation({
 *   variables: {
 *      companyId: // value for 'companyId'
 *   },
 * });
 */
export function useFindCompanyEmailsMutation(baseOptions?: Apollo.MutationHookOptions<FindCompanyEmailsMutation, FindCompanyEmailsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<FindCompanyEmailsMutation, FindCompanyEmailsMutationVariables>(FindCompanyEmailsDocument, options);
      }
export type FindCompanyEmailsMutationHookResult = ReturnType<typeof useFindCompanyEmailsMutation>;
export type FindCompanyEmailsMutationResult = Apollo.MutationResult<FindCompanyEmailsMutation>;
export type FindCompanyEmailsMutationOptions = Apollo.BaseMutationOptions<FindCompanyEmailsMutation, FindCompanyEmailsMutationVariables>;
export const EnhanceAllContactsDocument = gql`
    mutation EnhanceAllContacts {
  enhanceAllContacts {
    success
    message
    companiesProcessed
    totalContactsProcessed
    totalEmailsFound
    errors
  }
}
    `;
export type EnhanceAllContactsMutationFn = Apollo.MutationFunction<EnhanceAllContactsMutation, EnhanceAllContactsMutationVariables>;

/**
 * __useEnhanceAllContactsMutation__
 *
 * To run a mutation, you first call `useEnhanceAllContactsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEnhanceAllContactsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [enhanceAllContactsMutation, { data, loading, error }] = useEnhanceAllContactsMutation({
 *   variables: {
 *   },
 * });
 */
export function useEnhanceAllContactsMutation(baseOptions?: Apollo.MutationHookOptions<EnhanceAllContactsMutation, EnhanceAllContactsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<EnhanceAllContactsMutation, EnhanceAllContactsMutationVariables>(EnhanceAllContactsDocument, options);
      }
export type EnhanceAllContactsMutationHookResult = ReturnType<typeof useEnhanceAllContactsMutation>;
export type EnhanceAllContactsMutationResult = Apollo.MutationResult<EnhanceAllContactsMutation>;
export type EnhanceAllContactsMutationOptions = Apollo.BaseMutationOptions<EnhanceAllContactsMutation, EnhanceAllContactsMutationVariables>;
export const ApplyEmailPatternDocument = gql`
    mutation ApplyEmailPattern($companyId: Int!) {
  applyEmailPattern(companyId: $companyId) {
    success
    message
    contactsUpdated
    pattern
    contacts {
      id
      email
      emailVerified
    }
  }
}
    `;
export type ApplyEmailPatternMutationFn = Apollo.MutationFunction<ApplyEmailPatternMutation, ApplyEmailPatternMutationVariables>;

/**
 * __useApplyEmailPatternMutation__
 *
 * To run a mutation, you first call `useApplyEmailPatternMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useApplyEmailPatternMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [applyEmailPatternMutation, { data, loading, error }] = useApplyEmailPatternMutation({
 *   variables: {
 *      companyId: // value for 'companyId'
 *   },
 * });
 */
export function useApplyEmailPatternMutation(baseOptions?: Apollo.MutationHookOptions<ApplyEmailPatternMutation, ApplyEmailPatternMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ApplyEmailPatternMutation, ApplyEmailPatternMutationVariables>(ApplyEmailPatternDocument, options);
      }
export type ApplyEmailPatternMutationHookResult = ReturnType<typeof useApplyEmailPatternMutation>;
export type ApplyEmailPatternMutationResult = Apollo.MutationResult<ApplyEmailPatternMutation>;
export type ApplyEmailPatternMutationOptions = Apollo.BaseMutationOptions<ApplyEmailPatternMutation, ApplyEmailPatternMutationVariables>;
export const CreateContactDocument = gql`
    mutation CreateContact($input: CreateContactInput!) {
  createContact(input: $input) {
    id
    firstName
    lastName
    email
    linkedinUrl
    position
    companyId
    githubHandle
    telegramHandle
    tags
  }
}
    `;
export type CreateContactMutationFn = Apollo.MutationFunction<CreateContactMutation, CreateContactMutationVariables>;

/**
 * __useCreateContactMutation__
 *
 * To run a mutation, you first call `useCreateContactMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateContactMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createContactMutation, { data, loading, error }] = useCreateContactMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateContactMutation(baseOptions?: Apollo.MutationHookOptions<CreateContactMutation, CreateContactMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateContactMutation, CreateContactMutationVariables>(CreateContactDocument, options);
      }
export type CreateContactMutationHookResult = ReturnType<typeof useCreateContactMutation>;
export type CreateContactMutationResult = Apollo.MutationResult<CreateContactMutation>;
export type CreateContactMutationOptions = Apollo.BaseMutationOptions<CreateContactMutation, CreateContactMutationVariables>;
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
      publishedAt
      score
      score_reason
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
    publishedAt
    score
    score_reason
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
export const EnhanceJobFromAtsDocument = gql`
    mutation EnhanceJobFromATS($jobId: String!, $company: String!, $source: String!) {
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
      publishedAt
      score
      score_reason
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
      publishedAt
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
}
    ${CompanyFieldsFragmentDoc}`;
export type EnhanceJobFromAtsMutationFn = Apollo.MutationFunction<EnhanceJobFromAtsMutation, EnhanceJobFromAtsMutationVariables>;

/**
 * __useEnhanceJobFromAtsMutation__
 *
 * To run a mutation, you first call `useEnhanceJobFromAtsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEnhanceJobFromAtsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [enhanceJobFromAtsMutation, { data, loading, error }] = useEnhanceJobFromAtsMutation({
 *   variables: {
 *      jobId: // value for 'jobId'
 *      company: // value for 'company'
 *      source: // value for 'source'
 *   },
 * });
 */
export function useEnhanceJobFromAtsMutation(baseOptions?: Apollo.MutationHookOptions<EnhanceJobFromAtsMutation, EnhanceJobFromAtsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<EnhanceJobFromAtsMutation, EnhanceJobFromAtsMutationVariables>(EnhanceJobFromAtsDocument, options);
      }
export type EnhanceJobFromAtsMutationHookResult = ReturnType<typeof useEnhanceJobFromAtsMutation>;
export type EnhanceJobFromAtsMutationResult = Apollo.MutationResult<EnhanceJobFromAtsMutation>;
export type EnhanceJobFromAtsMutationOptions = Apollo.BaseMutationOptions<EnhanceJobFromAtsMutation, EnhanceJobFromAtsMutationVariables>;
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
export const GetOpportunitiesDocument = gql`
    query GetOpportunities($companyId: Int, $status: String, $limit: Int, $offset: Int) {
  opportunities(
    companyId: $companyId
    status: $status
    limit: $limit
    offset: $offset
  ) {
    opportunities {
      id
      title
      url
      source
      status
      rewardUsd
      rewardText
      deadline
      tags
      score
      applied
      appliedAt
      applicationStatus
      companyId
      company {
        id
        name
        website
      }
      createdAt
      updatedAt
    }
    totalCount
  }
}
    `;

/**
 * __useGetOpportunitiesQuery__
 *
 * To run a query within a React component, call `useGetOpportunitiesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetOpportunitiesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetOpportunitiesQuery({
 *   variables: {
 *      companyId: // value for 'companyId'
 *      status: // value for 'status'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetOpportunitiesQuery(baseOptions?: Apollo.QueryHookOptions<GetOpportunitiesQuery, GetOpportunitiesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetOpportunitiesQuery, GetOpportunitiesQueryVariables>(GetOpportunitiesDocument, options);
      }
export function useGetOpportunitiesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetOpportunitiesQuery, GetOpportunitiesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetOpportunitiesQuery, GetOpportunitiesQueryVariables>(GetOpportunitiesDocument, options);
        }
// @ts-ignore
export function useGetOpportunitiesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetOpportunitiesQuery, GetOpportunitiesQueryVariables>): Apollo.UseSuspenseQueryResult<GetOpportunitiesQuery, GetOpportunitiesQueryVariables>;
export function useGetOpportunitiesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetOpportunitiesQuery, GetOpportunitiesQueryVariables>): Apollo.UseSuspenseQueryResult<GetOpportunitiesQuery | undefined, GetOpportunitiesQueryVariables>;
export function useGetOpportunitiesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetOpportunitiesQuery, GetOpportunitiesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetOpportunitiesQuery, GetOpportunitiesQueryVariables>(GetOpportunitiesDocument, options);
        }
export type GetOpportunitiesQueryHookResult = ReturnType<typeof useGetOpportunitiesQuery>;
export type GetOpportunitiesLazyQueryHookResult = ReturnType<typeof useGetOpportunitiesLazyQuery>;
export type GetOpportunitiesSuspenseQueryHookResult = ReturnType<typeof useGetOpportunitiesSuspenseQuery>;
export type GetOpportunitiesQueryResult = Apollo.QueryResult<GetOpportunitiesQuery, GetOpportunitiesQueryVariables>;
export const GetOpportunityDocument = gql`
    query GetOpportunity($id: String!) {
  opportunity(id: $id) {
    id
    title
    url
    source
    status
    rewardUsd
    rewardText
    startDate
    endDate
    deadline
    firstSeen
    lastSeen
    score
    rawContext
    metadata
    applied
    appliedAt
    applicationStatus
    applicationNotes
    tags
    companyId
    contactId
    company {
      id
      name
      website
    }
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetOpportunityQuery__
 *
 * To run a query within a React component, call `useGetOpportunityQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetOpportunityQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetOpportunityQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetOpportunityQuery(baseOptions: Apollo.QueryHookOptions<GetOpportunityQuery, GetOpportunityQueryVariables> & ({ variables: GetOpportunityQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetOpportunityQuery, GetOpportunityQueryVariables>(GetOpportunityDocument, options);
      }
export function useGetOpportunityLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetOpportunityQuery, GetOpportunityQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetOpportunityQuery, GetOpportunityQueryVariables>(GetOpportunityDocument, options);
        }
// @ts-ignore
export function useGetOpportunitySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetOpportunityQuery, GetOpportunityQueryVariables>): Apollo.UseSuspenseQueryResult<GetOpportunityQuery, GetOpportunityQueryVariables>;
export function useGetOpportunitySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetOpportunityQuery, GetOpportunityQueryVariables>): Apollo.UseSuspenseQueryResult<GetOpportunityQuery | undefined, GetOpportunityQueryVariables>;
export function useGetOpportunitySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetOpportunityQuery, GetOpportunityQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetOpportunityQuery, GetOpportunityQueryVariables>(GetOpportunityDocument, options);
        }
export type GetOpportunityQueryHookResult = ReturnType<typeof useGetOpportunityQuery>;
export type GetOpportunityLazyQueryHookResult = ReturnType<typeof useGetOpportunityLazyQuery>;
export type GetOpportunitySuspenseQueryHookResult = ReturnType<typeof useGetOpportunitySuspenseQuery>;
export type GetOpportunityQueryResult = Apollo.QueryResult<GetOpportunityQuery, GetOpportunityQueryVariables>;
export const CreateOpportunityDocument = gql`
    mutation CreateOpportunity($input: CreateOpportunityInput!) {
  createOpportunity(input: $input) {
    id
    title
    url
    source
    status
    companyId
    createdAt
  }
}
    `;
export type CreateOpportunityMutationFn = Apollo.MutationFunction<CreateOpportunityMutation, CreateOpportunityMutationVariables>;

/**
 * __useCreateOpportunityMutation__
 *
 * To run a mutation, you first call `useCreateOpportunityMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateOpportunityMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createOpportunityMutation, { data, loading, error }] = useCreateOpportunityMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateOpportunityMutation(baseOptions?: Apollo.MutationHookOptions<CreateOpportunityMutation, CreateOpportunityMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateOpportunityMutation, CreateOpportunityMutationVariables>(CreateOpportunityDocument, options);
      }
export type CreateOpportunityMutationHookResult = ReturnType<typeof useCreateOpportunityMutation>;
export type CreateOpportunityMutationResult = Apollo.MutationResult<CreateOpportunityMutation>;
export type CreateOpportunityMutationOptions = Apollo.BaseMutationOptions<CreateOpportunityMutation, CreateOpportunityMutationVariables>;
export const UpdateOpportunityDocument = gql`
    mutation UpdateOpportunity($id: String!, $input: UpdateOpportunityInput!) {
  updateOpportunity(id: $id, input: $input) {
    id
    title
    status
    applied
    appliedAt
    applicationStatus
    applicationNotes
    updatedAt
  }
}
    `;
export type UpdateOpportunityMutationFn = Apollo.MutationFunction<UpdateOpportunityMutation, UpdateOpportunityMutationVariables>;

/**
 * __useUpdateOpportunityMutation__
 *
 * To run a mutation, you first call `useUpdateOpportunityMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateOpportunityMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateOpportunityMutation, { data, loading, error }] = useUpdateOpportunityMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateOpportunityMutation(baseOptions?: Apollo.MutationHookOptions<UpdateOpportunityMutation, UpdateOpportunityMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateOpportunityMutation, UpdateOpportunityMutationVariables>(UpdateOpportunityDocument, options);
      }
export type UpdateOpportunityMutationHookResult = ReturnType<typeof useUpdateOpportunityMutation>;
export type UpdateOpportunityMutationResult = Apollo.MutationResult<UpdateOpportunityMutation>;
export type UpdateOpportunityMutationOptions = Apollo.BaseMutationOptions<UpdateOpportunityMutation, UpdateOpportunityMutationVariables>;
export const DeleteOpportunityDocument = gql`
    mutation DeleteOpportunity($id: String!) {
  deleteOpportunity(id: $id) {
    success
    message
  }
}
    `;
export type DeleteOpportunityMutationFn = Apollo.MutationFunction<DeleteOpportunityMutation, DeleteOpportunityMutationVariables>;

/**
 * __useDeleteOpportunityMutation__
 *
 * To run a mutation, you first call `useDeleteOpportunityMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteOpportunityMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteOpportunityMutation, { data, loading, error }] = useDeleteOpportunityMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteOpportunityMutation(baseOptions?: Apollo.MutationHookOptions<DeleteOpportunityMutation, DeleteOpportunityMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteOpportunityMutation, DeleteOpportunityMutationVariables>(DeleteOpportunityDocument, options);
      }
export type DeleteOpportunityMutationHookResult = ReturnType<typeof useDeleteOpportunityMutation>;
export type DeleteOpportunityMutationResult = Apollo.MutationResult<DeleteOpportunityMutation>;
export type DeleteOpportunityMutationOptions = Apollo.BaseMutationOptions<DeleteOpportunityMutation, DeleteOpportunityMutationVariables>;
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
export const ResumeStatusDocument = gql`
    query ResumeStatus($email: String!) {
  resumeStatus(email: $email) {
    exists
    resume_id
    chunk_count
    filename
    ingested_at
  }
}
    `;

/**
 * __useResumeStatusQuery__
 *
 * To run a query within a React component, call `useResumeStatusQuery` and pass it any options that fit your needs.
 * When your component renders, `useResumeStatusQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useResumeStatusQuery({
 *   variables: {
 *      email: // value for 'email'
 *   },
 * });
 */
export function useResumeStatusQuery(baseOptions: Apollo.QueryHookOptions<ResumeStatusQuery, ResumeStatusQueryVariables> & ({ variables: ResumeStatusQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ResumeStatusQuery, ResumeStatusQueryVariables>(ResumeStatusDocument, options);
      }
export function useResumeStatusLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ResumeStatusQuery, ResumeStatusQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ResumeStatusQuery, ResumeStatusQueryVariables>(ResumeStatusDocument, options);
        }
// @ts-ignore
export function useResumeStatusSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ResumeStatusQuery, ResumeStatusQueryVariables>): Apollo.UseSuspenseQueryResult<ResumeStatusQuery, ResumeStatusQueryVariables>;
export function useResumeStatusSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ResumeStatusQuery, ResumeStatusQueryVariables>): Apollo.UseSuspenseQueryResult<ResumeStatusQuery | undefined, ResumeStatusQueryVariables>;
export function useResumeStatusSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ResumeStatusQuery, ResumeStatusQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ResumeStatusQuery, ResumeStatusQueryVariables>(ResumeStatusDocument, options);
        }
export type ResumeStatusQueryHookResult = ReturnType<typeof useResumeStatusQuery>;
export type ResumeStatusLazyQueryHookResult = ReturnType<typeof useResumeStatusLazyQuery>;
export type ResumeStatusSuspenseQueryHookResult = ReturnType<typeof useResumeStatusSuspenseQuery>;
export type ResumeStatusQueryResult = Apollo.QueryResult<ResumeStatusQuery, ResumeStatusQueryVariables>;
export const UploadResumeDocument = gql`
    mutation UploadResume($email: String!, $resumePdf: String!, $filename: String!) {
  uploadResume(email: $email, resumePdf: $resumePdf, filename: $filename) {
    success
    job_id
    tier
    status
  }
}
    `;
export type UploadResumeMutationFn = Apollo.MutationFunction<UploadResumeMutation, UploadResumeMutationVariables>;

/**
 * __useUploadResumeMutation__
 *
 * To run a mutation, you first call `useUploadResumeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUploadResumeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [uploadResumeMutation, { data, loading, error }] = useUploadResumeMutation({
 *   variables: {
 *      email: // value for 'email'
 *      resumePdf: // value for 'resumePdf'
 *      filename: // value for 'filename'
 *   },
 * });
 */
export function useUploadResumeMutation(baseOptions?: Apollo.MutationHookOptions<UploadResumeMutation, UploadResumeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UploadResumeMutation, UploadResumeMutationVariables>(UploadResumeDocument, options);
      }
export type UploadResumeMutationHookResult = ReturnType<typeof useUploadResumeMutation>;
export type UploadResumeMutationResult = Apollo.MutationResult<UploadResumeMutation>;
export type UploadResumeMutationOptions = Apollo.BaseMutationOptions<UploadResumeMutation, UploadResumeMutationVariables>;
export const IngestResumeParseDocument = gql`
    mutation IngestResumeParse($email: String!, $job_id: String!, $filename: String!) {
  ingestResumeParse(email: $email, job_id: $job_id, filename: $filename) {
    success
    status
    job_id
    resume_id
    chunks_stored
    error
  }
}
    `;
export type IngestResumeParseMutationFn = Apollo.MutationFunction<IngestResumeParseMutation, IngestResumeParseMutationVariables>;

/**
 * __useIngestResumeParseMutation__
 *
 * To run a mutation, you first call `useIngestResumeParseMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useIngestResumeParseMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [ingestResumeParseMutation, { data, loading, error }] = useIngestResumeParseMutation({
 *   variables: {
 *      email: // value for 'email'
 *      job_id: // value for 'job_id'
 *      filename: // value for 'filename'
 *   },
 * });
 */
export function useIngestResumeParseMutation(baseOptions?: Apollo.MutationHookOptions<IngestResumeParseMutation, IngestResumeParseMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<IngestResumeParseMutation, IngestResumeParseMutationVariables>(IngestResumeParseDocument, options);
      }
export type IngestResumeParseMutationHookResult = ReturnType<typeof useIngestResumeParseMutation>;
export type IngestResumeParseMutationResult = Apollo.MutationResult<IngestResumeParseMutation>;
export type IngestResumeParseMutationOptions = Apollo.BaseMutationOptions<IngestResumeParseMutation, IngestResumeParseMutationVariables>;
export const AskAboutResumeDocument = gql`
    query AskAboutResume($email: String!, $question: String!) {
  askAboutResume(email: $email, question: $question) {
    answer
    context_count
  }
}
    `;

/**
 * __useAskAboutResumeQuery__
 *
 * To run a query within a React component, call `useAskAboutResumeQuery` and pass it any options that fit your needs.
 * When your component renders, `useAskAboutResumeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAskAboutResumeQuery({
 *   variables: {
 *      email: // value for 'email'
 *      question: // value for 'question'
 *   },
 * });
 */
export function useAskAboutResumeQuery(baseOptions: Apollo.QueryHookOptions<AskAboutResumeQuery, AskAboutResumeQueryVariables> & ({ variables: AskAboutResumeQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AskAboutResumeQuery, AskAboutResumeQueryVariables>(AskAboutResumeDocument, options);
      }
export function useAskAboutResumeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AskAboutResumeQuery, AskAboutResumeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AskAboutResumeQuery, AskAboutResumeQueryVariables>(AskAboutResumeDocument, options);
        }
// @ts-ignore
export function useAskAboutResumeSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<AskAboutResumeQuery, AskAboutResumeQueryVariables>): Apollo.UseSuspenseQueryResult<AskAboutResumeQuery, AskAboutResumeQueryVariables>;
export function useAskAboutResumeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AskAboutResumeQuery, AskAboutResumeQueryVariables>): Apollo.UseSuspenseQueryResult<AskAboutResumeQuery | undefined, AskAboutResumeQueryVariables>;
export function useAskAboutResumeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AskAboutResumeQuery, AskAboutResumeQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<AskAboutResumeQuery, AskAboutResumeQueryVariables>(AskAboutResumeDocument, options);
        }
export type AskAboutResumeQueryHookResult = ReturnType<typeof useAskAboutResumeQuery>;
export type AskAboutResumeLazyQueryHookResult = ReturnType<typeof useAskAboutResumeLazyQuery>;
export type AskAboutResumeSuspenseQueryHookResult = ReturnType<typeof useAskAboutResumeSuspenseQuery>;
export type AskAboutResumeQueryResult = Apollo.QueryResult<AskAboutResumeQuery, AskAboutResumeQueryVariables>;
export const StudyCategoriesDocument = gql`
    query StudyCategories {
  studyCategories
}
    `;

/**
 * __useStudyCategoriesQuery__
 *
 * To run a query within a React component, call `useStudyCategoriesQuery` and pass it any options that fit your needs.
 * When your component renders, `useStudyCategoriesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useStudyCategoriesQuery({
 *   variables: {
 *   },
 * });
 */
export function useStudyCategoriesQuery(baseOptions?: Apollo.QueryHookOptions<StudyCategoriesQuery, StudyCategoriesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<StudyCategoriesQuery, StudyCategoriesQueryVariables>(StudyCategoriesDocument, options);
      }
export function useStudyCategoriesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<StudyCategoriesQuery, StudyCategoriesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<StudyCategoriesQuery, StudyCategoriesQueryVariables>(StudyCategoriesDocument, options);
        }
// @ts-ignore
export function useStudyCategoriesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<StudyCategoriesQuery, StudyCategoriesQueryVariables>): Apollo.UseSuspenseQueryResult<StudyCategoriesQuery, StudyCategoriesQueryVariables>;
export function useStudyCategoriesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<StudyCategoriesQuery, StudyCategoriesQueryVariables>): Apollo.UseSuspenseQueryResult<StudyCategoriesQuery | undefined, StudyCategoriesQueryVariables>;
export function useStudyCategoriesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<StudyCategoriesQuery, StudyCategoriesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<StudyCategoriesQuery, StudyCategoriesQueryVariables>(StudyCategoriesDocument, options);
        }
export type StudyCategoriesQueryHookResult = ReturnType<typeof useStudyCategoriesQuery>;
export type StudyCategoriesLazyQueryHookResult = ReturnType<typeof useStudyCategoriesLazyQuery>;
export type StudyCategoriesSuspenseQueryHookResult = ReturnType<typeof useStudyCategoriesSuspenseQuery>;
export type StudyCategoriesQueryResult = Apollo.QueryResult<StudyCategoriesQuery, StudyCategoriesQueryVariables>;
export const StudyTopicDocument = gql`
    query StudyTopic($category: String!, $topic: String!) {
  studyTopic(category: $category, topic: $topic) {
    id
    category
    topic
    title
    summary
    bodyMd
    deepDive
    difficulty
    tags
    createdAt
  }
}
    `;

/**
 * __useStudyTopicQuery__
 *
 * To run a query within a React component, call `useStudyTopicQuery` and pass it any options that fit your needs.
 * When your component renders, `useStudyTopicQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useStudyTopicQuery({
 *   variables: {
 *      category: // value for 'category'
 *      topic: // value for 'topic'
 *   },
 * });
 */
export function useStudyTopicQuery(baseOptions: Apollo.QueryHookOptions<StudyTopicQuery, StudyTopicQueryVariables> & ({ variables: StudyTopicQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<StudyTopicQuery, StudyTopicQueryVariables>(StudyTopicDocument, options);
      }
export function useStudyTopicLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<StudyTopicQuery, StudyTopicQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<StudyTopicQuery, StudyTopicQueryVariables>(StudyTopicDocument, options);
        }
// @ts-ignore
export function useStudyTopicSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<StudyTopicQuery, StudyTopicQueryVariables>): Apollo.UseSuspenseQueryResult<StudyTopicQuery, StudyTopicQueryVariables>;
export function useStudyTopicSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<StudyTopicQuery, StudyTopicQueryVariables>): Apollo.UseSuspenseQueryResult<StudyTopicQuery | undefined, StudyTopicQueryVariables>;
export function useStudyTopicSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<StudyTopicQuery, StudyTopicQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<StudyTopicQuery, StudyTopicQueryVariables>(StudyTopicDocument, options);
        }
export type StudyTopicQueryHookResult = ReturnType<typeof useStudyTopicQuery>;
export type StudyTopicLazyQueryHookResult = ReturnType<typeof useStudyTopicLazyQuery>;
export type StudyTopicSuspenseQueryHookResult = ReturnType<typeof useStudyTopicSuspenseQuery>;
export type StudyTopicQueryResult = Apollo.QueryResult<StudyTopicQuery, StudyTopicQueryVariables>;
export const StudyTopicsDocument = gql`
    query StudyTopics($category: String!) {
  studyTopics(category: $category) {
    id
    topic
    title
    summary
    difficulty
    tags
  }
}
    `;

/**
 * __useStudyTopicsQuery__
 *
 * To run a query within a React component, call `useStudyTopicsQuery` and pass it any options that fit your needs.
 * When your component renders, `useStudyTopicsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useStudyTopicsQuery({
 *   variables: {
 *      category: // value for 'category'
 *   },
 * });
 */
export function useStudyTopicsQuery(baseOptions: Apollo.QueryHookOptions<StudyTopicsQuery, StudyTopicsQueryVariables> & ({ variables: StudyTopicsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<StudyTopicsQuery, StudyTopicsQueryVariables>(StudyTopicsDocument, options);
      }
export function useStudyTopicsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<StudyTopicsQuery, StudyTopicsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<StudyTopicsQuery, StudyTopicsQueryVariables>(StudyTopicsDocument, options);
        }
// @ts-ignore
export function useStudyTopicsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<StudyTopicsQuery, StudyTopicsQueryVariables>): Apollo.UseSuspenseQueryResult<StudyTopicsQuery, StudyTopicsQueryVariables>;
export function useStudyTopicsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<StudyTopicsQuery, StudyTopicsQueryVariables>): Apollo.UseSuspenseQueryResult<StudyTopicsQuery | undefined, StudyTopicsQueryVariables>;
export function useStudyTopicsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<StudyTopicsQuery, StudyTopicsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<StudyTopicsQuery, StudyTopicsQueryVariables>(StudyTopicsDocument, options);
        }
export type StudyTopicsQueryHookResult = ReturnType<typeof useStudyTopicsQuery>;
export type StudyTopicsLazyQueryHookResult = ReturnType<typeof useStudyTopicsLazyQuery>;
export type StudyTopicsSuspenseQueryHookResult = ReturnType<typeof useStudyTopicsSuspenseQuery>;
export type StudyTopicsQueryResult = Apollo.QueryResult<StudyTopicsQuery, StudyTopicsQueryVariables>;
export const CreateStudyTopicDocument = gql`
    mutation CreateStudyTopic($category: String, $topic: String, $title: String, $summary: String, $difficulty: String, $tags: [String!]) {
  createStudyTopic(
    category: $category
    topic: $topic
    title: $title
    summary: $summary
    difficulty: $difficulty
    tags: $tags
  ) {
    id
    category
    topic
    title
    summary
    difficulty
    tags
    createdAt
  }
}
    `;
export type CreateStudyTopicMutationFn = Apollo.MutationFunction<CreateStudyTopicMutation, CreateStudyTopicMutationVariables>;

/**
 * __useCreateStudyTopicMutation__
 *
 * To run a mutation, you first call `useCreateStudyTopicMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateStudyTopicMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createStudyTopicMutation, { data, loading, error }] = useCreateStudyTopicMutation({
 *   variables: {
 *      category: // value for 'category'
 *      topic: // value for 'topic'
 *      title: // value for 'title'
 *      summary: // value for 'summary'
 *      difficulty: // value for 'difficulty'
 *      tags: // value for 'tags'
 *   },
 * });
 */
export function useCreateStudyTopicMutation(baseOptions?: Apollo.MutationHookOptions<CreateStudyTopicMutation, CreateStudyTopicMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateStudyTopicMutation, CreateStudyTopicMutationVariables>(CreateStudyTopicDocument, options);
      }
export type CreateStudyTopicMutationHookResult = ReturnType<typeof useCreateStudyTopicMutation>;
export type CreateStudyTopicMutationResult = Apollo.MutationResult<CreateStudyTopicMutation>;
export type CreateStudyTopicMutationOptions = Apollo.BaseMutationOptions<CreateStudyTopicMutation, CreateStudyTopicMutationVariables>;
export const GenerateStudyConceptExplanationDocument = gql`
    mutation GenerateStudyConceptExplanation($studyTopicId: ID!, $selectedText: String!, $context: String) {
  generateStudyConceptExplanation(
    studyTopicId: $studyTopicId
    selectedText: $selectedText
    context: $context
  ) {
    id
    selectedText
    explanation
    createdAt
  }
}
    `;
export type GenerateStudyConceptExplanationMutationFn = Apollo.MutationFunction<GenerateStudyConceptExplanationMutation, GenerateStudyConceptExplanationMutationVariables>;

/**
 * __useGenerateStudyConceptExplanationMutation__
 *
 * To run a mutation, you first call `useGenerateStudyConceptExplanationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateStudyConceptExplanationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateStudyConceptExplanationMutation, { data, loading, error }] = useGenerateStudyConceptExplanationMutation({
 *   variables: {
 *      studyTopicId: // value for 'studyTopicId'
 *      selectedText: // value for 'selectedText'
 *      context: // value for 'context'
 *   },
 * });
 */
export function useGenerateStudyConceptExplanationMutation(baseOptions?: Apollo.MutationHookOptions<GenerateStudyConceptExplanationMutation, GenerateStudyConceptExplanationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateStudyConceptExplanationMutation, GenerateStudyConceptExplanationMutationVariables>(GenerateStudyConceptExplanationDocument, options);
      }
export type GenerateStudyConceptExplanationMutationHookResult = ReturnType<typeof useGenerateStudyConceptExplanationMutation>;
export type GenerateStudyConceptExplanationMutationResult = Apollo.MutationResult<GenerateStudyConceptExplanationMutation>;
export type GenerateStudyConceptExplanationMutationOptions = Apollo.BaseMutationOptions<GenerateStudyConceptExplanationMutation, GenerateStudyConceptExplanationMutationVariables>;
export const GenerateStudyDeepDiveDocument = gql`
    mutation GenerateStudyDeepDive($studyTopicId: ID!, $force: Boolean) {
  generateStudyDeepDive(studyTopicId: $studyTopicId, force: $force) {
    id
    deepDive
  }
}
    `;
export type GenerateStudyDeepDiveMutationFn = Apollo.MutationFunction<GenerateStudyDeepDiveMutation, GenerateStudyDeepDiveMutationVariables>;

/**
 * __useGenerateStudyDeepDiveMutation__
 *
 * To run a mutation, you first call `useGenerateStudyDeepDiveMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateStudyDeepDiveMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateStudyDeepDiveMutation, { data, loading, error }] = useGenerateStudyDeepDiveMutation({
 *   variables: {
 *      studyTopicId: // value for 'studyTopicId'
 *      force: // value for 'force'
 *   },
 * });
 */
export function useGenerateStudyDeepDiveMutation(baseOptions?: Apollo.MutationHookOptions<GenerateStudyDeepDiveMutation, GenerateStudyDeepDiveMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateStudyDeepDiveMutation, GenerateStudyDeepDiveMutationVariables>(GenerateStudyDeepDiveDocument, options);
      }
export type GenerateStudyDeepDiveMutationHookResult = ReturnType<typeof useGenerateStudyDeepDiveMutation>;
export type GenerateStudyDeepDiveMutationResult = Apollo.MutationResult<GenerateStudyDeepDiveMutation>;
export type GenerateStudyDeepDiveMutationOptions = Apollo.BaseMutationOptions<GenerateStudyDeepDiveMutation, GenerateStudyDeepDiveMutationVariables>;
export const GenerateStudyTopicsForCategoryDocument = gql`
    mutation GenerateStudyTopicsForCategory($category: String!, $count: Int) {
  generateStudyTopicsForCategory(category: $category, count: $count) {
    id
    topic
    title
    summary
    difficulty
    tags
  }
}
    `;
export type GenerateStudyTopicsForCategoryMutationFn = Apollo.MutationFunction<GenerateStudyTopicsForCategoryMutation, GenerateStudyTopicsForCategoryMutationVariables>;

/**
 * __useGenerateStudyTopicsForCategoryMutation__
 *
 * To run a mutation, you first call `useGenerateStudyTopicsForCategoryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateStudyTopicsForCategoryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateStudyTopicsForCategoryMutation, { data, loading, error }] = useGenerateStudyTopicsForCategoryMutation({
 *   variables: {
 *      category: // value for 'category'
 *      count: // value for 'count'
 *   },
 * });
 */
export function useGenerateStudyTopicsForCategoryMutation(baseOptions?: Apollo.MutationHookOptions<GenerateStudyTopicsForCategoryMutation, GenerateStudyTopicsForCategoryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateStudyTopicsForCategoryMutation, GenerateStudyTopicsForCategoryMutationVariables>(GenerateStudyTopicsForCategoryDocument, options);
      }
export type GenerateStudyTopicsForCategoryMutationHookResult = ReturnType<typeof useGenerateStudyTopicsForCategoryMutation>;
export type GenerateStudyTopicsForCategoryMutationResult = Apollo.MutationResult<GenerateStudyTopicsForCategoryMutation>;
export type GenerateStudyTopicsForCategoryMutationOptions = Apollo.BaseMutationOptions<GenerateStudyTopicsForCategoryMutation, GenerateStudyTopicsForCategoryMutationVariables>;
export const GenerateResearchDocument = gql`
    mutation GenerateResearch($goalDescription: String!) {
  generateResearch(goalDescription: $goalDescription) {
    id
    title
    url
    summary
    relevance
  }
}
    `;
export type GenerateResearchMutationFn = Apollo.MutationFunction<GenerateResearchMutation, GenerateResearchMutationVariables>;

/**
 * __useGenerateResearchMutation__
 *
 * To run a mutation, you first call `useGenerateResearchMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateResearchMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateResearchMutation, { data, loading, error }] = useGenerateResearchMutation({
 *   variables: {
 *      goalDescription: // value for 'goalDescription'
 *   },
 * });
 */
export function useGenerateResearchMutation(baseOptions?: Apollo.MutationHookOptions<GenerateResearchMutation, GenerateResearchMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateResearchMutation, GenerateResearchMutationVariables>(GenerateResearchDocument, options);
      }
export type GenerateResearchMutationHookResult = ReturnType<typeof useGenerateResearchMutation>;
export type GenerateResearchMutationResult = Apollo.MutationResult<GenerateResearchMutation>;
export type GenerateResearchMutationOptions = Apollo.BaseMutationOptions<GenerateResearchMutation, GenerateResearchMutationVariables>;
export const CreateTrackDocument = gql`
    mutation CreateTrack($input: CreateTrackInput!) {
  createTrack(input: $input) {
    id
    slug
    title
    description
    level
    items {
      id
    }
  }
}
    `;
export type CreateTrackMutationFn = Apollo.MutationFunction<CreateTrackMutation, CreateTrackMutationVariables>;

/**
 * __useCreateTrackMutation__
 *
 * To run a mutation, you first call `useCreateTrackMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateTrackMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createTrackMutation, { data, loading, error }] = useCreateTrackMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateTrackMutation(baseOptions?: Apollo.MutationHookOptions<CreateTrackMutation, CreateTrackMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateTrackMutation, CreateTrackMutationVariables>(CreateTrackDocument, options);
      }
export type CreateTrackMutationHookResult = ReturnType<typeof useCreateTrackMutation>;
export type CreateTrackMutationResult = Apollo.MutationResult<CreateTrackMutation>;
export type CreateTrackMutationOptions = Apollo.BaseMutationOptions<CreateTrackMutation, CreateTrackMutationVariables>;
export const GetTracksDocument = gql`
    query GetTracks($limit: Int) {
  tracks(limit: $limit) {
    id
    slug
    title
    description
    level
    items {
      id
      kind
      title
      position
      contentRef
      promptRef
      difficulty
      tags
      prereqs
      children {
        id
        kind
        title
        position
        contentRef
        promptRef
        difficulty
        tags
        prereqs
      }
    }
  }
}
    `;

/**
 * __useGetTracksQuery__
 *
 * To run a query within a React component, call `useGetTracksQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTracksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTracksQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useGetTracksQuery(baseOptions?: Apollo.QueryHookOptions<GetTracksQuery, GetTracksQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetTracksQuery, GetTracksQueryVariables>(GetTracksDocument, options);
      }
export function useGetTracksLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetTracksQuery, GetTracksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetTracksQuery, GetTracksQueryVariables>(GetTracksDocument, options);
        }
// @ts-ignore
export function useGetTracksSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetTracksQuery, GetTracksQueryVariables>): Apollo.UseSuspenseQueryResult<GetTracksQuery, GetTracksQueryVariables>;
export function useGetTracksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTracksQuery, GetTracksQueryVariables>): Apollo.UseSuspenseQueryResult<GetTracksQuery | undefined, GetTracksQueryVariables>;
export function useGetTracksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTracksQuery, GetTracksQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetTracksQuery, GetTracksQueryVariables>(GetTracksDocument, options);
        }
export type GetTracksQueryHookResult = ReturnType<typeof useGetTracksQuery>;
export type GetTracksLazyQueryHookResult = ReturnType<typeof useGetTracksLazyQuery>;
export type GetTracksSuspenseQueryHookResult = ReturnType<typeof useGetTracksSuspenseQuery>;
export type GetTracksQueryResult = Apollo.QueryResult<GetTracksQuery, GetTracksQueryVariables>;
export const GetTrackDocument = gql`
    query GetTrack($slug: String!) {
  track(slug: $slug) {
    id
    slug
    title
    description
    level
    items {
      id
      kind
      title
      position
      contentRef
      promptRef
      difficulty
      tags
      prereqs
      children {
        id
        kind
        title
        position
        contentRef
        promptRef
        difficulty
        tags
        prereqs
        children {
          id
          kind
          title
          position
          contentRef
          promptRef
          difficulty
          tags
          prereqs
        }
      }
    }
  }
}
    `;

/**
 * __useGetTrackQuery__
 *
 * To run a query within a React component, call `useGetTrackQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTrackQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTrackQuery({
 *   variables: {
 *      slug: // value for 'slug'
 *   },
 * });
 */
export function useGetTrackQuery(baseOptions: Apollo.QueryHookOptions<GetTrackQuery, GetTrackQueryVariables> & ({ variables: GetTrackQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetTrackQuery, GetTrackQueryVariables>(GetTrackDocument, options);
      }
export function useGetTrackLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetTrackQuery, GetTrackQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetTrackQuery, GetTrackQueryVariables>(GetTrackDocument, options);
        }
// @ts-ignore
export function useGetTrackSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetTrackQuery, GetTrackQueryVariables>): Apollo.UseSuspenseQueryResult<GetTrackQuery, GetTrackQueryVariables>;
export function useGetTrackSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTrackQuery, GetTrackQueryVariables>): Apollo.UseSuspenseQueryResult<GetTrackQuery | undefined, GetTrackQueryVariables>;
export function useGetTrackSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTrackQuery, GetTrackQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetTrackQuery, GetTrackQueryVariables>(GetTrackDocument, options);
        }
export type GetTrackQueryHookResult = ReturnType<typeof useGetTrackQuery>;
export type GetTrackLazyQueryHookResult = ReturnType<typeof useGetTrackLazyQuery>;
export type GetTrackSuspenseQueryHookResult = ReturnType<typeof useGetTrackSuspenseQuery>;
export type GetTrackQueryResult = Apollo.QueryResult<GetTrackQuery, GetTrackQueryVariables>;
export const GetPrepResourcesByCategoryDocument = gql`
    query GetPrepResourcesByCategory($category: String!) {
  prepResourcesByCategory(category: $category) {
    id
    title
    href
    description
    category
    tags
  }
}
    `;

/**
 * __useGetPrepResourcesByCategoryQuery__
 *
 * To run a query within a React component, call `useGetPrepResourcesByCategoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetPrepResourcesByCategoryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetPrepResourcesByCategoryQuery({
 *   variables: {
 *      category: // value for 'category'
 *   },
 * });
 */
export function useGetPrepResourcesByCategoryQuery(baseOptions: Apollo.QueryHookOptions<GetPrepResourcesByCategoryQuery, GetPrepResourcesByCategoryQueryVariables> & ({ variables: GetPrepResourcesByCategoryQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetPrepResourcesByCategoryQuery, GetPrepResourcesByCategoryQueryVariables>(GetPrepResourcesByCategoryDocument, options);
      }
export function useGetPrepResourcesByCategoryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetPrepResourcesByCategoryQuery, GetPrepResourcesByCategoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetPrepResourcesByCategoryQuery, GetPrepResourcesByCategoryQueryVariables>(GetPrepResourcesByCategoryDocument, options);
        }
// @ts-ignore
export function useGetPrepResourcesByCategorySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetPrepResourcesByCategoryQuery, GetPrepResourcesByCategoryQueryVariables>): Apollo.UseSuspenseQueryResult<GetPrepResourcesByCategoryQuery, GetPrepResourcesByCategoryQueryVariables>;
export function useGetPrepResourcesByCategorySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetPrepResourcesByCategoryQuery, GetPrepResourcesByCategoryQueryVariables>): Apollo.UseSuspenseQueryResult<GetPrepResourcesByCategoryQuery | undefined, GetPrepResourcesByCategoryQueryVariables>;
export function useGetPrepResourcesByCategorySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetPrepResourcesByCategoryQuery, GetPrepResourcesByCategoryQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetPrepResourcesByCategoryQuery, GetPrepResourcesByCategoryQueryVariables>(GetPrepResourcesByCategoryDocument, options);
        }
export type GetPrepResourcesByCategoryQueryHookResult = ReturnType<typeof useGetPrepResourcesByCategoryQuery>;
export type GetPrepResourcesByCategoryLazyQueryHookResult = ReturnType<typeof useGetPrepResourcesByCategoryLazyQuery>;
export type GetPrepResourcesByCategorySuspenseQueryHookResult = ReturnType<typeof useGetPrepResourcesByCategorySuspenseQuery>;
export type GetPrepResourcesByCategoryQueryResult = Apollo.QueryResult<GetPrepResourcesByCategoryQuery, GetPrepResourcesByCategoryQueryVariables>;