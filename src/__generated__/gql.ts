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
    "query GetJob($id: String!) {\n  job(id: $id) {\n    id\n    title\n    company\n    location\n    salary\n    description\n    url\n    publishedDate\n    sourceType\n    sourceCategory\n    sourceDetail\n    guid\n    keywords\n    employmentType\n    experienceLevel\n    techStack\n    status\n    applied\n    appliedAt\n    isDeveloperRole\n    developerConfidence\n    remoteFriendly\n    createdAt\n    updatedAt\n  }\n}": typeof types.GetJobDocument,
    "query GetJobs($sourceType: String, $status: String, $limit: Int, $offset: Int) {\n  jobs(sourceType: $sourceType, status: $status, limit: $limit, offset: $offset) {\n    id\n    title\n    company\n    location\n    salary\n    description\n    url\n    publishedDate\n    sourceType\n    sourceCategory\n    sourceDetail\n    guid\n    keywords\n    employmentType\n    experienceLevel\n    techStack\n    status\n    applied\n    appliedAt\n    isDeveloperRole\n    developerConfidence\n    remoteFriendly\n    createdAt\n    updatedAt\n  }\n}": typeof types.GetJobsDocument,
};
const documents: Documents = {
    "query GetJob($id: String!) {\n  job(id: $id) {\n    id\n    title\n    company\n    location\n    salary\n    description\n    url\n    publishedDate\n    sourceType\n    sourceCategory\n    sourceDetail\n    guid\n    keywords\n    employmentType\n    experienceLevel\n    techStack\n    status\n    applied\n    appliedAt\n    isDeveloperRole\n    developerConfidence\n    remoteFriendly\n    createdAt\n    updatedAt\n  }\n}": types.GetJobDocument,
    "query GetJobs($sourceType: String, $status: String, $limit: Int, $offset: Int) {\n  jobs(sourceType: $sourceType, status: $status, limit: $limit, offset: $offset) {\n    id\n    title\n    company\n    location\n    salary\n    description\n    url\n    publishedDate\n    sourceType\n    sourceCategory\n    sourceDetail\n    guid\n    keywords\n    employmentType\n    experienceLevel\n    techStack\n    status\n    applied\n    appliedAt\n    isDeveloperRole\n    developerConfidence\n    remoteFriendly\n    createdAt\n    updatedAt\n  }\n}": types.GetJobsDocument,
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
export function gql(source: "query GetJob($id: String!) {\n  job(id: $id) {\n    id\n    title\n    company\n    location\n    salary\n    description\n    url\n    publishedDate\n    sourceType\n    sourceCategory\n    sourceDetail\n    guid\n    keywords\n    employmentType\n    experienceLevel\n    techStack\n    status\n    applied\n    appliedAt\n    isDeveloperRole\n    developerConfidence\n    remoteFriendly\n    createdAt\n    updatedAt\n  }\n}"): (typeof documents)["query GetJob($id: String!) {\n  job(id: $id) {\n    id\n    title\n    company\n    location\n    salary\n    description\n    url\n    publishedDate\n    sourceType\n    sourceCategory\n    sourceDetail\n    guid\n    keywords\n    employmentType\n    experienceLevel\n    techStack\n    status\n    applied\n    appliedAt\n    isDeveloperRole\n    developerConfidence\n    remoteFriendly\n    createdAt\n    updatedAt\n  }\n}"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query GetJobs($sourceType: String, $status: String, $limit: Int, $offset: Int) {\n  jobs(sourceType: $sourceType, status: $status, limit: $limit, offset: $offset) {\n    id\n    title\n    company\n    location\n    salary\n    description\n    url\n    publishedDate\n    sourceType\n    sourceCategory\n    sourceDetail\n    guid\n    keywords\n    employmentType\n    experienceLevel\n    techStack\n    status\n    applied\n    appliedAt\n    isDeveloperRole\n    developerConfidence\n    remoteFriendly\n    createdAt\n    updatedAt\n  }\n}"): (typeof documents)["query GetJobs($sourceType: String, $status: String, $limit: Int, $offset: Int) {\n  jobs(sourceType: $sourceType, status: $status, limit: $limit, offset: $offset) {\n    id\n    title\n    company\n    location\n    salary\n    description\n    url\n    publishedDate\n    sourceType\n    sourceCategory\n    sourceDetail\n    guid\n    keywords\n    employmentType\n    experienceLevel\n    techStack\n    status\n    applied\n    appliedAt\n    isDeveloperRole\n    developerConfidence\n    remoteFriendly\n    createdAt\n    updatedAt\n  }\n}"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;