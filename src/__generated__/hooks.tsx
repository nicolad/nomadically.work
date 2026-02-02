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


export const GetJobDocument = gql`
    query GetJob($id: String!) {
  job(id: $id) {
    id
    title
    company
    location
    salary
    description
    url
    publishedDate
    sourceType
    sourceCategory
    sourceDetail
    guid
    keywords
    employmentType
    experienceLevel
    techStack
    status
    applied
    appliedAt
    isDeveloperRole
    developerConfidence
    remoteFriendly
    createdAt
    updatedAt
  }
}
    `;

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
    query GetJobs($sourceType: String, $status: String, $limit: Int, $offset: Int) {
  jobs(sourceType: $sourceType, status: $status, limit: $limit, offset: $offset) {
    id
    title
    company
    location
    salary
    description
    url
    publishedDate
    sourceType
    sourceCategory
    sourceDetail
    guid
    keywords
    employmentType
    experienceLevel
    techStack
    status
    applied
    appliedAt
    isDeveloperRole
    developerConfidence
    remoteFriendly
    createdAt
    updatedAt
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
 *      status: // value for 'status'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
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