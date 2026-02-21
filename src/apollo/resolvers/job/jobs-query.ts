import { jobs } from "@/db/schema";
import {
  eq,
  and,
  or,
  like,
  notLike,
  desc,
  notInArray,
  isNull,
  count,
} from "drizzle-orm";
import type { GraphQLContext } from "../../context";
import type { QueryJobsArgs } from "@/__generated__/resolvers-types";
import { EXCLUDED_LOCATIONS, EXCLUDED_COUNTRIES } from "./constants";

export async function jobsQuery(
  _parent: unknown,
  args: QueryJobsArgs,
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

    // Filter by is_remote_eu when requested
    if (args.isRemoteEu === true) {
      conditions.push(eq(jobs.is_remote_eu, true));
    } else if (args.isRemoteEu === false) {
      conditions.push(eq(jobs.is_remote_eu, false));
    }

    // Exclude companies at SQL level
    if (args.excludedCompanies && args.excludedCompanies.length > 0) {
      conditions.push(notInArray(jobs.company_key, args.excludedCompanies));
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
          score: jobs.score,
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
