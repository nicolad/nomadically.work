import { createClient } from "@libsql/client";

export type SkillFilteredJobsParams = {
  userId: string;
  limit?: number;
  offset?: number;
};

export type SkillFilteredJobsResult = {
  jobs: any[];
  totalCount: number;
  canonicalTags: string[];
};

/**
 * Filter jobs by user's preferred skills.
 * NO LLM involved - pure SQL joins on canonical tags.
 *
 * Flow:
 * 1. Load user's preferred_skills from user_settings
 * 2. Canonicalize via skill_aliases table (SQL)
 * 3. Query jobs by join on job_skill_tags
 * 4. Return filtered jobs + metadata
 */
export async function getSkillFilteredJobs(
  params: SkillFilteredJobsParams,
): Promise<SkillFilteredJobsResult> {
  const { userId, limit = 20, offset = 0 } = params;

  const db = createClient({
    url: process.env.TURSO_DB_URL!,
    authToken: process.env.TURSO_DB_AUTH_TOKEN!,
  });

  // 1) Load user settings
  const settingsRes = await db.execute({
    sql: `SELECT preferred_skills FROM user_settings WHERE user_id = ? LIMIT 1`,
    args: [userId],
  });

  const preferredSkillsRaw: string[] = (() => {
    const row = settingsRes.rows?.[0] as any;
    if (!row?.preferred_skills) return [];
    try {
      return JSON.parse(String(row.preferred_skills));
    } catch {
      return [];
    }
  })();

  if (preferredSkillsRaw.length === 0) {
    return { jobs: [], totalCount: 0, canonicalTags: [] };
  }

  // 2) Canonicalize via alias table
  const normalized = preferredSkillsRaw
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const placeholders = normalized.map(() => "?").join(", ");

  const tagsRes = await db.execute({
    sql: `SELECT DISTINCT tag FROM skill_aliases WHERE alias IN (${placeholders})`,
    args: normalized,
  });

  const canonicalTags = tagsRes.rows.map((r: any) => String(r.tag));

  if (canonicalTags.length === 0) {
    return { jobs: [], totalCount: 0, canonicalTags: [] };
  }

  // 3) Filter jobs by canonical tags (ANY match)
  const tagPlaceholders = canonicalTags.map(() => "?").join(", ");

  // Count total matching jobs
  const totalRes = await db.execute({
    sql: `
      SELECT COUNT(DISTINCT j.id) AS cnt
      FROM jobs j
      JOIN job_skill_tags t ON t.job_id = j.id
      WHERE t.tag IN (${tagPlaceholders})
    `,
    args: canonicalTags,
  });

  const totalCount = Number((totalRes.rows?.[0] as any)?.cnt ?? 0);

  // Fetch paginated jobs
  const jobsRes = await db.execute({
    sql: `
      SELECT DISTINCT j.*
      FROM jobs j
      JOIN job_skill_tags t ON t.job_id = j.id
      WHERE t.tag IN (${tagPlaceholders})
      ORDER BY j.posted_at DESC, j.created_at DESC
      LIMIT ? OFFSET ?
    `,
    args: [...canonicalTags, limit, offset],
  });

  return {
    jobs: jobsRes.rows as any[],
    totalCount,
    canonicalTags,
  };
}

/**
 * Get all skill tags for a specific job (useful for displaying job details)
 */
export async function getJobSkills(jobId: number): Promise<any[]> {
  const db = createClient({
    url: process.env.TURSO_DB_URL!,
    authToken: process.env.TURSO_DB_AUTH_TOKEN!,
  });

  const res = await db.execute({
    sql: `
      SELECT tag, level, confidence, evidence, extracted_at, version
      FROM job_skill_tags
      WHERE job_id = ?
      ORDER BY
        CASE level
          WHEN 'required' THEN 1
          WHEN 'preferred' THEN 2
          WHEN 'nice' THEN 3
        END,
        confidence DESC
    `,
    args: [jobId],
  });

  return res.rows as any[];
}
