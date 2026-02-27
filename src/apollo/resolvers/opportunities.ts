import { opportunities, companies } from "@/db/schema";
import { eq, and, count, desc } from "drizzle-orm";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";

function parseTags(val: string | null | undefined): string[] {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

function parseMetadata(val: string | null | undefined): Record<string, unknown> {
  if (!val) return {};
  try { return JSON.parse(val); } catch { return {}; }
}

function mapOpp(row: typeof opportunities.$inferSelect) {
  return {
    ...row,
    tags: parseTags(row.tags),
    metadata: parseMetadata(row.metadata),
    rewardUsd: row.reward_usd ?? null,
    rewardText: row.reward_text ?? null,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    firstSeen: row.first_seen ?? null,
    lastSeen: row.last_seen ?? null,
    rawContext: row.raw_context ?? null,
    applicationStatus: row.application_status ?? null,
    applicationNotes: row.application_notes ?? null,
    appliedAt: row.applied_at ?? null,
    companyId: row.company_id ?? null,
    contactId: row.contact_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const opportunityResolvers = {
  Opportunity: {
    async company(parent: any, _args: any, context: GraphQLContext) {
      if (!parent.companyId) return null;
      const rows = await context.db
        .select()
        .from(companies)
        .where(eq(companies.id, parent.companyId))
        .limit(1);
      return rows[0] ?? null;
    },
  },

  Query: {
    async opportunities(
      _parent: unknown,
      args: { companyId?: number; status?: string; limit?: number; offset?: number },
      context: GraphQLContext,
    ) {
      const limit = Math.min(args.limit ?? 50, 200);
      const offset = args.offset ?? 0;

      const conditions = [];
      if (args.companyId != null) conditions.push(eq(opportunities.company_id, args.companyId));
      if (args.status) conditions.push(eq(opportunities.status, args.status));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, countRows] = await Promise.all([
        context.db
          .select()
          .from(opportunities)
          .where(where)
          .orderBy(desc(opportunities.created_at))
          .limit(limit + 1)
          .offset(offset),
        context.db.select({ value: count() }).from(opportunities).where(where),
      ]);

      return {
        opportunities: rows.slice(0, limit).map(mapOpp),
        totalCount: countRows[0]?.value ?? 0,
      };
    },

    async opportunity(_parent: unknown, args: { id: string }, context: GraphQLContext) {
      const rows = await context.db
        .select()
        .from(opportunities)
        .where(eq(opportunities.id, args.id))
        .limit(1);
      return rows[0] ? mapOpp(rows[0]) : null;
    },
  },

  Mutation: {
    async createOpportunity(
      _parent: unknown,
      args: { input: any },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const { title, url, source, status, rewardUsd, rewardText, startDate, endDate, deadline, tags, companyId, contactId, applicationNotes } = args.input;
      const now = new Date().toISOString();
      const id = `opp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const rows = await context.db
        .insert(opportunities)
        .values({
          id,
          title,
          url: url ?? null,
          source: source ?? null,
          status: status ?? "open",
          reward_usd: rewardUsd ?? null,
          reward_text: rewardText ?? null,
          start_date: startDate ?? null,
          end_date: endDate ?? null,
          deadline: deadline ?? null,
          tags: tags ? JSON.stringify(tags) : "[]",
          company_id: companyId ?? null,
          contact_id: contactId ?? null,
          application_notes: applicationNotes ?? null,
          created_at: now,
          updated_at: now,
        })
        .returning();

      return mapOpp(rows[0]);
    },

    async updateOpportunity(
      _parent: unknown,
      args: { id: string; input: any },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const { tags, rewardUsd, rewardText, startDate, endDate, applied, appliedAt, applicationStatus, applicationNotes, companyId, contactId, ...rest } = args.input;
      const patch: Record<string, unknown> = { ...rest };
      if (tags !== undefined) patch.tags = JSON.stringify(tags);
      if (rewardUsd !== undefined) patch.reward_usd = rewardUsd;
      if (rewardText !== undefined) patch.reward_text = rewardText;
      if (startDate !== undefined) patch.start_date = startDate;
      if (endDate !== undefined) patch.end_date = endDate;
      if (applied !== undefined) patch.applied = applied;
      if (appliedAt !== undefined) patch.applied_at = appliedAt;
      if (applicationStatus !== undefined) patch.application_status = applicationStatus;
      if (applicationNotes !== undefined) patch.application_notes = applicationNotes;
      if (companyId !== undefined) patch.company_id = companyId;
      if (contactId !== undefined) patch.contact_id = contactId;
      patch.updated_at = new Date().toISOString();

      const rows = await context.db
        .update(opportunities)
        .set(patch)
        .where(eq(opportunities.id, args.id))
        .returning();
      if (!rows[0]) throw new Error("Opportunity not found");
      return mapOpp(rows[0]);
    },

    async deleteOpportunity(
      _parent: unknown,
      args: { id: string },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      await context.db.delete(opportunities).where(eq(opportunities.id, args.id));
      return { success: true, message: "Opportunity deleted" };
    },
  },

  // Company.opportunities field resolver
  Company: {
    async opportunities(parent: any, _args: any, context: GraphQLContext) {
      const rows = await context.db
        .select()
        .from(opportunities)
        .where(eq(opportunities.company_id, parent.id))
        .orderBy(desc(opportunities.created_at));
      return rows.map(mapOpp);
    },
  },
};
