import { jobs, jobSkillTags } from "@/db/schema";
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
  count,
} from "drizzle-orm";
import type { GraphQLContext } from "../../context";
import type { QueryJobsArgs } from "@/__generated__/resolvers-types";
import { EXCLUDED_LOCATIONS } from "./constants";

export async function jobsQuery(
  _parent: unknown,
  args: QueryJobsArgs,
  context: GraphQLContext,
) {
  try {
    const conditions = [];
    const hasFilters = !!(args.search || args.sourceType || args.remoteEuConfidence || (args.skills && args.skills.length > 0));

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

    // Filter by is_remote_eu when requested
    if (args.isRemoteEu === true) {
      conditions.push(eq(jobs.is_remote_eu, true));
    } else if (args.isRemoteEu === false) {
      conditions.push(eq(jobs.is_remote_eu, false));
    }

    // Filter by sourceType (ATS provider)
    if (args.sourceType) {
      conditions.push(eq(jobs.source_kind, args.sourceType));
    }

    // Filter by remoteEuConfidence level
    if (args.remoteEuConfidence) {
      conditions.push(eq(jobs.remote_eu_confidence, args.remoteEuConfidence));
    }

    // Filter by skills — match ANY requested skill (OR logic), case-insensitive
    if (args.skills && args.skills.length > 0) {
      const normalizedSkills = args.skills.map((s) => s.toLowerCase());
      conditions.push(
        inArray(
          jobs.id,
          context.db
            .select({ job_id: jobSkillTags.job_id })
            .from(jobSkillTags)
            .where(inArray(jobSkillTags.tag, normalizedSkills))
            .groupBy(jobSkillTags.job_id),
        ),
      );
    }

    // Exclude companies at SQL level
    if (args.excludedCompanies && args.excludedCompanies.length > 0) {
      conditions.push(notInArray(jobs.company_key, args.excludedCompanies));
    }

    // Exclude locations — single combined condition instead of N separate ones
    if (EXCLUDED_LOCATIONS.length > 0) {
      const locationExclusions = EXCLUDED_LOCATIONS.map(
        (loc) => notLike(jobs.location, `%${loc}%`),
      );
      conditions.push(
        or(isNull(jobs.location), and(...locationExclusions))!,
      );
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions)! : undefined;

    const limit = args.limit ?? 20;
    const offset = args.offset ?? 0;

    // Fetch limit+1 to detect if more rows exist without a separate count query
    const fetchLimit = limit + 1;
    const rows = await context.db
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
        score: jobs.score,
        remote_eu_confidence: jobs.remote_eu_confidence,
      })
      .from(jobs)
      .where(whereClause)
      .orderBy(desc(jobs.posted_at), desc(jobs.created_at))
      .limit(fetchLimit)
      .offset(offset);

    const hasMore = rows.length > limit;
    const paginatedJobs = hasMore ? rows.slice(0, limit) : rows;

    // For initial page without complex filters, estimate count from fetched rows.
    // Only run the expensive COUNT query when paginating beyond page 1 or with active filters.
    let totalCount: number;
    if (offset === 0 && !hasFilters) {
      totalCount = hasMore ? offset + limit + 1 : rows.length;
    } else {
      totalCount = await context.db
        .select({ value: count() })
        .from(jobs)
        .where(whereClause)
        .then((r) => r[0]?.value ?? 0);
    }

    return {
      jobs: paginatedJobs,
      totalCount,
    };
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return { jobs: [], totalCount: 0 };
  }
}
