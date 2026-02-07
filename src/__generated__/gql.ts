/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "mutation DeleteJob($id: Int!) {\n  deleteJob(id: $id) {\n    success\n    message\n  }\n}": typeof types.DeleteJobDocument,
    "query GetJob($id: String!) {\n  job(id: $id) {\n    id\n    external_id\n    source_id\n    source_kind\n    company_key\n    title\n    location\n    url\n    description\n    posted_at\n    score\n    score_reason\n    status\n    is_remote_eu\n    remote_eu_confidence\n    remote_eu_reason\n    created_at\n    updated_at\n  }\n}": typeof types.GetJobDocument,
    "query GetJobs($sourceType: String, $status: String, $search: String, $limit: Int, $offset: Int, $excludedCompanies: [String!]) {\n  jobs(\n    sourceType: $sourceType\n    status: $status\n    search: $search\n    limit: $limit\n    offset: $offset\n    excludedCompanies: $excludedCompanies\n  ) {\n    jobs {\n      id\n      external_id\n      source_id\n      source_kind\n      company_key\n      title\n      location\n      url\n      description\n      posted_at\n      score\n      score_reason\n      status\n      created_at\n      updated_at\n    }\n    totalCount\n  }\n}": typeof types.GetJobsDocument,
    "query GetUserSettings($userId: String!) {\n  userSettings(userId: $userId) {\n    id\n    user_id\n    preferred_locations\n    preferred_skills\n    excluded_companies\n  }\n}": typeof types.GetUserSettingsDocument,
    "mutation UpdateUserSettings($userId: String!, $settings: UserSettingsInput!) {\n  updateUserSettings(userId: $userId, settings: $settings) {\n    id\n    user_id\n    email_notifications\n    daily_digest\n    new_job_alerts\n    preferred_locations\n    preferred_skills\n    excluded_companies\n    dark_mode\n    jobs_per_page\n    created_at\n    updated_at\n  }\n}": typeof types.UpdateUserSettingsDocument,
};
const documents: Documents = {
    "mutation DeleteJob($id: Int!) {\n  deleteJob(id: $id) {\n    success\n    message\n  }\n}": types.DeleteJobDocument,
    "query GetJob($id: String!) {\n  job(id: $id) {\n    id\n    external_id\n    source_id\n    source_kind\n    company_key\n    title\n    location\n    url\n    description\n    posted_at\n    score\n    score_reason\n    status\n    is_remote_eu\n    remote_eu_confidence\n    remote_eu_reason\n    created_at\n    updated_at\n  }\n}": types.GetJobDocument,
    "query GetJobs($sourceType: String, $status: String, $search: String, $limit: Int, $offset: Int, $excludedCompanies: [String!]) {\n  jobs(\n    sourceType: $sourceType\n    status: $status\n    search: $search\n    limit: $limit\n    offset: $offset\n    excludedCompanies: $excludedCompanies\n  ) {\n    jobs {\n      id\n      external_id\n      source_id\n      source_kind\n      company_key\n      title\n      location\n      url\n      description\n      posted_at\n      score\n      score_reason\n      status\n      created_at\n      updated_at\n    }\n    totalCount\n  }\n}": types.GetJobsDocument,
    "query GetUserSettings($userId: String!) {\n  userSettings(userId: $userId) {\n    id\n    user_id\n    preferred_locations\n    preferred_skills\n    excluded_companies\n  }\n}": types.GetUserSettingsDocument,
    "mutation UpdateUserSettings($userId: String!, $settings: UserSettingsInput!) {\n  updateUserSettings(userId: $userId, settings: $settings) {\n    id\n    user_id\n    email_notifications\n    daily_digest\n    new_job_alerts\n    preferred_locations\n    preferred_skills\n    excluded_companies\n    dark_mode\n    jobs_per_page\n    created_at\n    updated_at\n  }\n}": types.UpdateUserSettingsDocument,
};

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = gql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function gql(source: string): unknown;

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation DeleteJob($id: Int!) {\n  deleteJob(id: $id) {\n    success\n    message\n  }\n}"): (typeof documents)["mutation DeleteJob($id: Int!) {\n  deleteJob(id: $id) {\n    success\n    message\n  }\n}"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query GetJob($id: String!) {\n  job(id: $id) {\n    id\n    external_id\n    source_id\n    source_kind\n    company_key\n    title\n    location\n    url\n    description\n    posted_at\n    score\n    score_reason\n    status\n    is_remote_eu\n    remote_eu_confidence\n    remote_eu_reason\n    created_at\n    updated_at\n  }\n}"): (typeof documents)["query GetJob($id: String!) {\n  job(id: $id) {\n    id\n    external_id\n    source_id\n    source_kind\n    company_key\n    title\n    location\n    url\n    description\n    posted_at\n    score\n    score_reason\n    status\n    is_remote_eu\n    remote_eu_confidence\n    remote_eu_reason\n    created_at\n    updated_at\n  }\n}"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query GetJobs($sourceType: String, $status: String, $search: String, $limit: Int, $offset: Int, $excludedCompanies: [String!]) {\n  jobs(\n    sourceType: $sourceType\n    status: $status\n    search: $search\n    limit: $limit\n    offset: $offset\n    excludedCompanies: $excludedCompanies\n  ) {\n    jobs {\n      id\n      external_id\n      source_id\n      source_kind\n      company_key\n      title\n      location\n      url\n      description\n      posted_at\n      score\n      score_reason\n      status\n      created_at\n      updated_at\n    }\n    totalCount\n  }\n}"): (typeof documents)["query GetJobs($sourceType: String, $status: String, $search: String, $limit: Int, $offset: Int, $excludedCompanies: [String!]) {\n  jobs(\n    sourceType: $sourceType\n    status: $status\n    search: $search\n    limit: $limit\n    offset: $offset\n    excludedCompanies: $excludedCompanies\n  ) {\n    jobs {\n      id\n      external_id\n      source_id\n      source_kind\n      company_key\n      title\n      location\n      url\n      description\n      posted_at\n      score\n      score_reason\n      status\n      created_at\n      updated_at\n    }\n    totalCount\n  }\n}"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query GetUserSettings($userId: String!) {\n  userSettings(userId: $userId) {\n    id\n    user_id\n    preferred_locations\n    preferred_skills\n    excluded_companies\n  }\n}"): (typeof documents)["query GetUserSettings($userId: String!) {\n  userSettings(userId: $userId) {\n    id\n    user_id\n    preferred_locations\n    preferred_skills\n    excluded_companies\n  }\n}"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "mutation UpdateUserSettings($userId: String!, $settings: UserSettingsInput!) {\n  updateUserSettings(userId: $userId, settings: $settings) {\n    id\n    user_id\n    email_notifications\n    daily_digest\n    new_job_alerts\n    preferred_locations\n    preferred_skills\n    excluded_companies\n    dark_mode\n    jobs_per_page\n    created_at\n    updated_at\n  }\n}"): (typeof documents)["mutation UpdateUserSettings($userId: String!, $settings: UserSettingsInput!) {\n  updateUserSettings(userId: $userId, settings: $settings) {\n    id\n    user_id\n    email_notifications\n    daily_digest\n    new_job_alerts\n    preferred_locations\n    preferred_skills\n    excluded_companies\n    dark_mode\n    jobs_per_page\n    created_at\n    updated_at\n  }\n}"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;