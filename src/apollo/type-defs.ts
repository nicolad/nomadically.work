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

  type Query {
    jobs(
      sourceType: String
      status: String
      search: String
      limit: Int
      offset: Int
    ): JobsResponse!
    job(id: String!): Job
    userSettings(userId: String!): UserSettings
  }

  type Mutation {
    updateUserSettings(
      userId: String!
      settings: UserSettingsInput!
    ): UserSettings!
  }
`;
