import { gql } from "@apollo/client";

export const typeDefs = gql`
  scalar JSON

  type Job {
    id: String!
    title: String
    company: String
    location: String
    salary: String
    description: String
    url: String
    publishedDate: String
    sourceType: String
    sourceCategory: String
    sourceDetail: String
    guid: String
    keywords: [String!]
    employmentType: String
    experienceLevel: String
    techStack: [String!]
    status: String
    applied: Boolean
    appliedAt: String
    isDeveloperRole: Boolean
    developerConfidence: String
    remoteFriendly: Boolean
    createdAt: String
    updatedAt: String
  }

  type Query {
    jobs(sourceType: String, status: String, limit: Int, offset: Int): [Job!]!
    job(id: String!): Job
  }
`;
