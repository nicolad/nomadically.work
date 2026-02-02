/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
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
  JSON: { input: any; output: any; }
};

export type Job = {
  __typename?: 'Job';
  applied?: Maybe<Scalars['Boolean']['output']>;
  appliedAt?: Maybe<Scalars['String']['output']>;
  company?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  developerConfidence?: Maybe<Scalars['String']['output']>;
  employmentType?: Maybe<Scalars['String']['output']>;
  experienceLevel?: Maybe<Scalars['String']['output']>;
  guid?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  isDeveloperRole?: Maybe<Scalars['Boolean']['output']>;
  keywords?: Maybe<Array<Scalars['String']['output']>>;
  location?: Maybe<Scalars['String']['output']>;
  publishedDate?: Maybe<Scalars['String']['output']>;
  remoteFriendly?: Maybe<Scalars['Boolean']['output']>;
  salary?: Maybe<Scalars['String']['output']>;
  sourceCategory?: Maybe<Scalars['String']['output']>;
  sourceDetail?: Maybe<Scalars['String']['output']>;
  sourceType?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  techStack?: Maybe<Array<Scalars['String']['output']>>;
  title?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
};

export type Query = {
  __typename?: 'Query';
  job?: Maybe<Job>;
  jobs: Array<Job>;
};


export type QueryJobArgs = {
  id: Scalars['String']['input'];
};


export type QueryJobsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  sourceType?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};

export type GetJobQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetJobQuery = { __typename?: 'Query', job?: { __typename?: 'Job', id: string, title?: string | null, company?: string | null, location?: string | null, salary?: string | null, description?: string | null, url?: string | null, publishedDate?: string | null, sourceType?: string | null, sourceCategory?: string | null, sourceDetail?: string | null, guid?: string | null, keywords?: Array<string> | null, employmentType?: string | null, experienceLevel?: string | null, techStack?: Array<string> | null, status?: string | null, applied?: boolean | null, appliedAt?: string | null, isDeveloperRole?: boolean | null, developerConfidence?: string | null, remoteFriendly?: boolean | null, createdAt?: string | null, updatedAt?: string | null } | null };

export type GetJobsQueryVariables = Exact<{
  sourceType?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetJobsQuery = { __typename?: 'Query', jobs: Array<{ __typename?: 'Job', id: string, title?: string | null, company?: string | null, location?: string | null, salary?: string | null, description?: string | null, url?: string | null, publishedDate?: string | null, sourceType?: string | null, sourceCategory?: string | null, sourceDetail?: string | null, guid?: string | null, keywords?: Array<string> | null, employmentType?: string | null, experienceLevel?: string | null, techStack?: Array<string> | null, status?: string | null, applied?: boolean | null, appliedAt?: string | null, isDeveloperRole?: boolean | null, developerConfidence?: string | null, remoteFriendly?: boolean | null, createdAt?: string | null, updatedAt?: string | null }> };


export const GetJobDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetJob"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"job"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"company"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"salary"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"publishedDate"}},{"kind":"Field","name":{"kind":"Name","value":"sourceType"}},{"kind":"Field","name":{"kind":"Name","value":"sourceCategory"}},{"kind":"Field","name":{"kind":"Name","value":"sourceDetail"}},{"kind":"Field","name":{"kind":"Name","value":"guid"}},{"kind":"Field","name":{"kind":"Name","value":"keywords"}},{"kind":"Field","name":{"kind":"Name","value":"employmentType"}},{"kind":"Field","name":{"kind":"Name","value":"experienceLevel"}},{"kind":"Field","name":{"kind":"Name","value":"techStack"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"applied"}},{"kind":"Field","name":{"kind":"Name","value":"appliedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isDeveloperRole"}},{"kind":"Field","name":{"kind":"Name","value":"developerConfidence"}},{"kind":"Field","name":{"kind":"Name","value":"remoteFriendly"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetJobQuery, GetJobQueryVariables>;
export const GetJobsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetJobs"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sourceType"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"jobs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sourceType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sourceType"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"company"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"salary"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"publishedDate"}},{"kind":"Field","name":{"kind":"Name","value":"sourceType"}},{"kind":"Field","name":{"kind":"Name","value":"sourceCategory"}},{"kind":"Field","name":{"kind":"Name","value":"sourceDetail"}},{"kind":"Field","name":{"kind":"Name","value":"guid"}},{"kind":"Field","name":{"kind":"Name","value":"keywords"}},{"kind":"Field","name":{"kind":"Name","value":"employmentType"}},{"kind":"Field","name":{"kind":"Name","value":"experienceLevel"}},{"kind":"Field","name":{"kind":"Name","value":"techStack"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"applied"}},{"kind":"Field","name":{"kind":"Name","value":"appliedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isDeveloperRole"}},{"kind":"Field","name":{"kind":"Name","value":"developerConfidence"}},{"kind":"Field","name":{"kind":"Name","value":"remoteFriendly"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetJobsQuery, GetJobsQueryVariables>;