import DataLoader from "dataloader";
import { inArray } from "drizzle-orm";
import type { DbInstance } from "@/db";
import {
  jobSkillTags,
  companies,
  atsBoards,
  companyFacts,
  companySnapshots,
  userSettings,
} from "@/db/schema";
import type {
  JobSkillTag,
  Company,
  ATSBoard,
  CompanyFact,
  CompanySnapshot,
  UserSettings,
} from "@/db/schema";

// D1/SQLite safe upper bound for IN (...) variable bindings
const BATCH_SIZE = 100;

export function createLoaders(db: DbInstance) {
  return {
    // Select only the 5 columns exposed by the JobSkill GraphQL type —
    // skips extracted_at and version which are never sent to clients.
    jobSkills: new DataLoader<number, JobSkillTag[]>(
      async (jobIds) => {
        const rows = await db
          .select({
            job_id: jobSkillTags.job_id,
            tag: jobSkillTags.tag,
            level: jobSkillTags.level,
            confidence: jobSkillTags.confidence,
            evidence: jobSkillTags.evidence,
          })
          .from(jobSkillTags)
          .where(inArray(jobSkillTags.job_id, [...jobIds]));
        const byJob = new Map<number, JobSkillTag[]>();
        for (const row of rows) {
          const arr = byJob.get(row.job_id);
          if (arr) arr.push(row as JobSkillTag);
          else byJob.set(row.job_id, [row as JobSkillTag]);
        }
        return jobIds.map((id) => byJob.get(id) ?? []);
      },
      { maxBatchSize: BATCH_SIZE },
    ),

    company: new DataLoader<number, Company | null>(
      async (companyIds) => {
        const rows = await db
          .select()
          .from(companies)
          .where(inArray(companies.id, [...companyIds]));
        const byId = new Map(rows.map((r) => [r.id, r]));
        return companyIds.map((id) => byId.get(id) ?? null);
      },
      { maxBatchSize: BATCH_SIZE },
    ),

    atsBoardsByCompany: new DataLoader<number, ATSBoard[]>(
      async (companyIds) => {
        const rows = await db
          .select()
          .from(atsBoards)
          .where(inArray(atsBoards.company_id, [...companyIds]));
        const byCompany = new Map<number, ATSBoard[]>();
        for (const row of rows) {
          const arr = byCompany.get(row.company_id);
          if (arr) arr.push(row);
          else byCompany.set(row.company_id, [row]);
        }
        return companyIds.map((id) => byCompany.get(id) ?? []);
      },
      { maxBatchSize: BATCH_SIZE },
    ),

    companyFacts: new DataLoader<number, CompanyFact[]>(
      async (companyIds) => {
        const rows = await db
          .select()
          .from(companyFacts)
          .where(inArray(companyFacts.company_id, [...companyIds]));
        const byCompany = new Map<number, CompanyFact[]>();
        for (const row of rows) {
          const arr = byCompany.get(row.company_id);
          if (arr) arr.push(row);
          else byCompany.set(row.company_id, [row]);
        }
        return companyIds.map((id) => byCompany.get(id) ?? []);
      },
      { maxBatchSize: BATCH_SIZE },
    ),

    companySnapshots: new DataLoader<number, CompanySnapshot[]>(
      async (companyIds) => {
        const rows = await db
          .select()
          .from(companySnapshots)
          .where(inArray(companySnapshots.company_id, [...companyIds]));
        const byCompany = new Map<number, CompanySnapshot[]>();
        for (const row of rows) {
          const arr = byCompany.get(row.company_id);
          if (arr) arr.push(row);
          else byCompany.set(row.company_id, [row]);
        }
        return companyIds.map((id) => byCompany.get(id) ?? []);
      },
      { maxBatchSize: BATCH_SIZE },
    ),

    userSettings: new DataLoader<string, UserSettings | null>(
      async (userIds) => {
        const rows = await db
          .select()
          .from(userSettings)
          .where(inArray(userSettings.user_id, [...userIds]));
        const byUser = new Map(rows.map((r) => [r.user_id, r]));
        return userIds.map((id) => byUser.get(id) ?? null);
      },
      { maxBatchSize: BATCH_SIZE },
    ),
  };
}

export type Loaders = ReturnType<typeof createLoaders>;
