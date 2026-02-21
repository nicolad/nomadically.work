import { jobs, jobSkillTags, skillAliases } from "@/db/schema";
import {
  eq,
  and,
  or,
  like,
  notLike,
  desc,
  notInArray,
  inArray,
  isNull,
  sql,
  count,
} from "drizzle-orm";
import type { GraphQLContext } from "../../context";
import { EXCLUDED_LOCATIONS, EXCLUDED_COUNTRIES } from "./constants";
import { SKILL_LABELS } from "@/lib/skills/taxonomy";

/**
 * Map short skill inputs to LIKE keywords for title/description fallback.
 * Used when job_skill_tags table has no matching data yet.
 */
const SKILL_KEYWORDS: Record<string, string[]> = {
  react: ["react"],
  ai: ["ai ", " ai,", " ai/", "artificial intelligence", "machine learning", " ml ", " ml,", "llm", "genai", "gen ai", "deep learning"],
  typescript: ["typescript"],
  javascript: ["javascript"],
  python: ["python"],
  java: [" java ", " java,"],
  go: [" go ", " go,", "golang"],
  rust: [" rust ", " rust,"],
  vue: ["vue.js", "vuejs", " vue "],
  angular: ["angular"],
  nextjs: ["next.js", "nextjs"],
  nodejs: ["node.js", "nodejs"],
  graphql: ["graphql"],
  docker: ["docker"],
  kubernetes: ["kubernetes", "k8s"],
  aws: [" aws ", " aws,", "amazon web services"],
  gcp: [" gcp ", " gcp,", "google cloud"],
  azure: ["azure"],
  terraform: ["terraform"],
  postgresql: ["postgresql", "postgres"],
  mongodb: ["mongodb"],
  redis: ["redis"],
};

export async function jobsQuery(
  _parent: any,
  args: {
    sourceType?: string;
    search?: string;
    limit?: number;
    offset?: number;
    excludedCompanies?: string[];
    isRemoteEu?: boolean;
    remoteEuConfidence?: string;
    skills?: string[];
  },
  context: GraphQLContext,
) {
  try {
    const conditions = [];


    if (args.search) {
      const searchPattern = `%${args.search}%`;
      conditions.push(
        or(
          like(jobs.title, searchPattern),
          like(jobs.company_key, searchPattern),
          like(jobs.location, searchPattern),
          like(jobs.description, searchPattern),
        )!,
      );
    }

    // Exclude companies at SQL level
    if (args.excludedCompanies && args.excludedCompanies.length > 0) {
      conditions.push(notInArray(jobs.company_key, args.excludedCompanies));
    }

    // Filter to EU remote jobs: status is the canonical field set by the worker
    if (args.isRemoteEu === true) {
      conditions.push(eq(jobs.status, "eu-remote"));
    }

    // Filter by minimum confidence level
    if (args.remoteEuConfidence) {
      const confidenceMap: Record<string, string[]> = {
        high: ["high"],
        medium: ["high", "medium"],
        low: ["high", "medium", "low"],
      };
      const allowed = confidenceMap[args.remoteEuConfidence] ?? [
        "high",
        "medium",
        "low",
      ];
      conditions.push(inArray(jobs.remote_eu_confidence, allowed));
    }

    // Exclude locations at SQL level
    for (const location of EXCLUDED_LOCATIONS) {
      conditions.push(
        or(isNull(jobs.location), notLike(jobs.location, `%${location}%`))!,
      );
    }

    // Exclude countries at SQL level
    if (EXCLUDED_COUNTRIES.length > 0) {
      conditions.push(
        or(isNull(jobs.country), notInArray(jobs.country, EXCLUDED_COUNTRIES))!,
      );
    }

    // Filter by skill tags: try job_skill_tags first, fall back to keyword LIKE
    if (args.skills && args.skills.length > 0) {
      const normalizedSkills = args.skills.map((s) => s.trim().toLowerCase());

      // Resolve aliases to canonical tags
      const aliasRows = await context.db
        .select({ tag: skillAliases.tag })
        .from(skillAliases)
        .where(inArray(skillAliases.alias, normalizedSkills));

      const canonicalTags = [
        ...new Set([
          ...aliasRows.map((r) => r.tag),
          ...normalizedSkills,
        ]),
      ];

      // Check if job_skill_tags has any matching data
      const tagCount = await context.db
        .select({ value: count() })
        .from(jobSkillTags)
        .where(inArray(jobSkillTags.tag, canonicalTags))
        .then((r) => r[0]?.value ?? 0);

      if (tagCount > 0) {
        // Primary: subquery on job_skill_tags (precise, extracted skills)
        const matchingJobIds = context.db
          .selectDistinct({ job_id: jobSkillTags.job_id })
          .from(jobSkillTags)
          .where(inArray(jobSkillTags.tag, canonicalTags));

        conditions.push(inArray(jobs.id, matchingJobIds));
      } else {
        // Fallback: keyword LIKE on title + description
        const likeConditions: ReturnType<typeof like>[] = [];
        for (const skill of normalizedSkills) {
          const keywords = SKILL_KEYWORDS[skill] ?? [skill];
          const label = SKILL_LABELS[skill];
          if (label && !keywords.includes(label.toLowerCase())) {
            keywords.push(label.toLowerCase());
          }
          for (const kw of keywords) {
            likeConditions.push(like(jobs.title, `%${kw}%`));
            likeConditions.push(like(jobs.description, `%${kw}%`));
          }
        }
        if (likeConditions.length > 0) {
          conditions.push(or(...likeConditions)!);
        }
      }
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions)! : undefined;

    // Run count and paginated query in parallel
    const limit = args.limit ?? 20;
    const offset = args.offset ?? 0;

    const [countResult, paginatedJobs] = await Promise.all([
      context.db
        .select({ value: count() })
        .from(jobs)
        .where(whereClause)
        .then((r) => r[0]?.value ?? 0),
      context.db
        .select({
          id: jobs.id,
          external_id: jobs.external_id,
          source_kind: jobs.source_kind,
          company_key: jobs.company_key,
          title: jobs.title,
          location: jobs.location,
          url: jobs.url,
          posted_at: jobs.posted_at,
          status: jobs.status,
          is_remote_eu: jobs.is_remote_eu,
          remote_eu_confidence: jobs.remote_eu_confidence,
        })
        .from(jobs)
        .where(whereClause)
        .orderBy(desc(jobs.posted_at), desc(jobs.created_at))
        .limit(limit)
        .offset(offset),
    ]);

    return {
      jobs: paginatedJobs,
      totalCount: countResult,
    };
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return { jobs: [], totalCount: 0 };
  }
}
