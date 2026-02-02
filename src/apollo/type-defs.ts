import { gql } from "@apollo/client";

export const typeDefs = gql`
  scalar JSON

  type Job {
    id: Int!
    external_id: String!
    source_id: String
    source_kind: String!
    company_key: String!
    title: String!
    location: String
    url: String!
    description: String
    posted_at: String!
    score: Float
    score_reason: String
    status: String
    created_at: String!
    updated_at: String!
  }

  type Query {
    jobs(
      sourceType: String
      status: String
      search: String
      limit: Int
      offset: Int
    ): [Job!]!
    job(id: String!): Job
  }
`;
