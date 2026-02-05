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
    "query GetJob($id: String!) {\n  job(id: $id) {\n    id\n    external_id\n    source_id\n    source_kind\n    company_key\n    title\n    location\n    url\n    description\n    posted_at\n    score\n    score_reason\n    status\n    created_at\n    updated_at\n  }\n}": typeof types.GetJobDocument,
    "query GetJobs($sourceType: String, $status: String, $search: String, $limit: Int, $offset: Int) {\n  jobs(\n    sourceType: $sourceType\n    status: $status\n    search: $search\n    limit: $limit\n    offset: $offset\n  ) {\n    jobs {\n      id\n      external_id\n      source_id\n      source_kind\n      company_key\n      title\n      location\n      url\n      description\n      posted_at\n      score\n      score_reason\n      status\n      created_at\n      updated_at\n    }\n    totalCount\n  }\n}": typeof types.GetJobsDocument,
};
const documents: Documents = {
    "query GetJob($id: String!) {\n  job(id: $id) {\n    id\n    external_id\n    source_id\n    source_kind\n    company_key\n    title\n    location\n    url\n    description\n    posted_at\n    score\n    score_reason\n    status\n    created_at\n    updated_at\n  }\n}": types.GetJobDocument,
    "query GetJobs($sourceType: String, $status: String, $search: String, $limit: Int, $offset: Int) {\n  jobs(\n    sourceType: $sourceType\n    status: $status\n    search: $search\n    limit: $limit\n    offset: $offset\n  ) {\n    jobs {\n      id\n      external_id\n      source_id\n      source_kind\n      company_key\n      title\n      location\n      url\n      description\n      posted_at\n      score\n      score_reason\n      status\n      created_at\n      updated_at\n    }\n    totalCount\n  }\n}": types.GetJobsDocument,
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
export function gql(source: "query GetJob($id: String!) {\n  job(id: $id) {\n    id\n    external_id\n    source_id\n    source_kind\n    company_key\n    title\n    location\n    url\n    description\n    posted_at\n    score\n    score_reason\n    status\n    created_at\n    updated_at\n  }\n}"): (typeof documents)["query GetJob($id: String!) {\n  job(id: $id) {\n    id\n    external_id\n    source_id\n    source_kind\n    company_key\n    title\n    location\n    url\n    description\n    posted_at\n    score\n    score_reason\n    status\n    created_at\n    updated_at\n  }\n}"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query GetJobs($sourceType: String, $status: String, $search: String, $limit: Int, $offset: Int) {\n  jobs(\n    sourceType: $sourceType\n    status: $status\n    search: $search\n    limit: $limit\n    offset: $offset\n  ) {\n    jobs {\n      id\n      external_id\n      source_id\n      source_kind\n      company_key\n      title\n      location\n      url\n      description\n      posted_at\n      score\n      score_reason\n      status\n      created_at\n      updated_at\n    }\n    totalCount\n  }\n}"): (typeof documents)["query GetJobs($sourceType: String, $status: String, $search: String, $limit: Int, $offset: Int) {\n  jobs(\n    sourceType: $sourceType\n    status: $status\n    search: $search\n    limit: $limit\n    offset: $offset\n  ) {\n    jobs {\n      id\n      external_id\n      source_id\n      source_kind\n      company_key\n      title\n      location\n      url\n      description\n      posted_at\n      score\n      score_reason\n      status\n      created_at\n      updated_at\n    }\n    totalCount\n  }\n}"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;