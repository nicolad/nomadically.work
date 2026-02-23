import { eq, inArray, desc, sql } from "drizzle-orm";
import { LlamaParse } from "llama-parse";
import type { GraphQLContext } from "../context";
import { resumes, jobs, jobSkillTags } from "@/db/schema";
import { extractSkillsFromResume } from "@/lib/skills/extract-from-resume";
import type {
  MutationUploadSkillProfileArgs,
  MutationExtractSkillProfileArgs,
  QueryMatchedJobsArgs,
} from "@/__generated__/resolvers-types";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function toSkillProfile(row: typeof resumes.$inferSelect) {
  return {
    id: row.id,
    userId: row.user_id,
    filename: row.filename ?? null,
    extractedSkills: (() => {
      try {
        return JSON.parse(row.extracted_skills) as string[];
      } catch {
        return [];
      }
    })(),
    taxonomyVersion: row.taxonomy_version,
    createdAt: row.created_at instanceof Date
      ? row.created_at.toISOString()
      : new Date(row.created_at as unknown as number * 1000).toISOString(),
    updatedAt: row.updated_at instanceof Date
      ? row.updated_at.toISOString()
      : new Date(row.updated_at as unknown as number * 1000).toISOString(),
  };
}

export const skillMatchingResolvers = {
  Query: {
    async mySkillProfile(_parent: unknown, _args: unknown, context: GraphQLContext) {
      if (!context.userId) throw new Error("Unauthorized");

      const rows = await context.db
        .select()
        .from(resumes)
        .where(eq(resumes.user_id, context.userId))
        .limit(1);

      if (rows.length === 0) return null;
      return toSkillProfile(rows[0]);
    },

    async matchedJobs(
      _parent: unknown,
      args: QueryMatchedJobsArgs,
      context: GraphQLContext,
    ) {
      if (!context.userId) throw new Error("Unauthorized");

      const limit = Math.min(args.limit ?? 20, 50);
      const offset = args.offset ?? 0;
      const fetchLimit = limit + 1;

      // Load user's skill profile
      const profileRows = await context.db
        .select()
        .from(resumes)
        .where(eq(resumes.user_id, context.userId))
        .limit(1);

      if (profileRows.length === 0) {
        return { jobs: [], totalCount: 0, hasMore: false };
      }

      const profile = profileRows[0];
      let resumeSkills: string[] = [];
      try {
        resumeSkills = JSON.parse(profile.extracted_skills) as string[];
      } catch {
        resumeSkills = [];
      }

      if (resumeSkills.length === 0) {
        return { jobs: [], totalCount: 0, hasMore: false };
      }

      // Query 1: find jobs ranked by matching skill count
      const rankRows = await context.db
        .select({
          job_id: jobSkillTags.job_id,
          cnt: sql<number>`count(*)`.as("cnt"),
        })
        .from(jobSkillTags)
        .where(inArray(jobSkillTags.tag, resumeSkills))
        .groupBy(jobSkillTags.job_id)
        .orderBy(desc(sql`count(*)`))
        .limit(fetchLimit)
        .offset(offset);

      const hasMore = rankRows.length > limit;
      const pageRows = hasMore ? rankRows.slice(0, limit) : rankRows;

      if (pageRows.length === 0) {
        return { jobs: [], totalCount: 0, hasMore: false };
      }

      const jobIds = pageRows.map((r) => r.job_id);

      // Query 2: fetch job details
      const jobRows = await context.db
        .select()
        .from(jobs)
        .where(inArray(jobs.id, jobIds));

      // Query 3: fetch all skill tags for these jobs to compute missing skills
      const allTagRows = await context.db
        .select({ job_id: jobSkillTags.job_id, tag: jobSkillTags.tag })
        .from(jobSkillTags)
        .where(inArray(jobSkillTags.job_id, jobIds));

      const resumeSkillSet = new Set(resumeSkills);

      // Build job-id to skill tags map
      const jobTagsMap = new Map<number, string[]>();
      for (const tagRow of allTagRows) {
        const existing = jobTagsMap.get(tagRow.job_id) ?? [];
        existing.push(tagRow.tag);
        jobTagsMap.set(tagRow.job_id, existing);
      }

      // Order job rows to match rank order
      const jobById = new Map(jobRows.map((j) => [j.id, j]));

      const matchedJobItems = pageRows.flatMap((rankRow) => {
        const job = jobById.get(rankRow.job_id);
        if (!job) return [];

        const jobSkillList = jobTagsMap.get(job.id) ?? [];
        const jobSkillSet = new Set(jobSkillList);

        const matchedSkills = resumeSkills.filter((s) => jobSkillSet.has(s));
        const missingSkills = jobSkillList.filter((s) => !resumeSkillSet.has(s));
        const totalRequired = jobSkillList.length;
        const totalMatched = matchedSkills.length;
        const matchScore = totalRequired > 0 ? totalMatched / totalRequired : 0;

        return [{
          job,
          matchedSkills,
          missingSkills,
          matchScore,
          totalRequired,
          totalMatched,
        }];
      });

      return {
        jobs: matchedJobItems,
        totalCount: matchedJobItems.length,
        hasMore,
      };
    },
  },

  Mutation: {
    async uploadSkillProfile(
      _parent: unknown,
      args: MutationUploadSkillProfileArgs,
      context: GraphQLContext,
    ) {
      if (!context.userId) throw new Error("Unauthorized");

      const { resumeBase64, filename, fileType } = args;

      // Decode base64
      const buffer = Buffer.from(resumeBase64, "base64");
      if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
        throw new Error("File too large — max 10 MB");
      }

      // Parse text depending on file type
      let rawText: string;
      const lowerFileType = fileType.toLowerCase();
      if (lowerFileType === "application/pdf" || lowerFileType === "pdf" || filename.toLowerCase().endsWith(".pdf")) {
        const apiKey = process.env.LLAMA_CLOUD_API_KEY;
        if (!apiKey) throw new Error("LLAMA_CLOUD_API_KEY not configured");
        const parser = new LlamaParse({ apiKey, resultType: "markdown" });
        const blob = new Blob([buffer], { type: "application/pdf" });
        const file = new File([blob], filename, { type: "application/pdf" });
        const [result] = await parser.parseFile(file, { resultType: "markdown" });
        rawText = result?.text ?? "";
      } else {
        // Treat as plain text
        rawText = buffer.toString("utf-8");
      }

      if (!rawText.trim()) {
        throw new Error("Could not extract text from file");
      }

      const now = new Date();
      const existing = await context.db
        .select({ id: resumes.id })
        .from(resumes)
        .where(eq(resumes.user_id, context.userId))
        .limit(1);

      const id = existing.length > 0 ? existing[0].id : crypto.randomUUID();

      if (existing.length > 0) {
        await context.db
          .update(resumes)
          .set({
            filename,
            raw_text: rawText,
            extracted_skills: "[]",
            updated_at: now,
          })
          .where(eq(resumes.id, id));
      } else {
        await context.db.insert(resumes).values({
          id,
          user_id: context.userId,
          filename,
          raw_text: rawText,
          extracted_skills: "[]",
          taxonomy_version: "v1",
          created_at: now,
          updated_at: now,
        });
      }

      const rows = await context.db
        .select()
        .from(resumes)
        .where(eq(resumes.id, id))
        .limit(1);

      return toSkillProfile(rows[0]);
    },

    async extractSkillProfile(
      _parent: unknown,
      args: MutationExtractSkillProfileArgs,
      context: GraphQLContext,
    ) {
      if (!context.userId) throw new Error("Unauthorized");

      const rows = await context.db
        .select()
        .from(resumes)
        .where(eq(resumes.id, args.profileId))
        .limit(1);

      if (rows.length === 0) throw new Error("Skill profile not found");

      const profile = rows[0];
      if (profile.user_id !== context.userId) throw new Error("Forbidden");

      const { skills, taxonomyVersion } = await extractSkillsFromResume(
        profile.raw_text,
      );

      await context.db
        .update(resumes)
        .set({
          extracted_skills: JSON.stringify(skills),
          taxonomy_version: taxonomyVersion,
          updated_at: new Date(),
        })
        .where(eq(resumes.id, args.profileId));

      const updated = await context.db
        .select()
        .from(resumes)
        .where(eq(resumes.id, args.profileId))
        .limit(1);

      return toSkillProfile(updated[0]);
    },
  },
};
