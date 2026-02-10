import { db } from "@/db";
import {
  companies,
  companyFacts,
  companySnapshots,
  atsBoards,
} from "@/db/schema";
import { eq, and, or, like, desc, count, gte, inArray } from "drizzle-orm";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";
import { enhanceCompany } from "./enhance-company";

export const companyResolvers = {
  Company: {
    // Parse JSON fields
    tags(parent: any) {
      return parent.tags ? JSON.parse(parent.tags) : [];
    },
    services(parent: any) {
      return parent.services ? JSON.parse(parent.services) : [];
    },
    service_taxonomy(parent: any) {
      return parent.service_taxonomy ? JSON.parse(parent.service_taxonomy) : [];
    },
    industries(parent: any) {
      return parent.industries ? JSON.parse(parent.industries) : [];
    },
    score_reasons(parent: any) {
      return parent.score_reasons ? JSON.parse(parent.score_reasons) : [];
    },
    async ats_boards(parent: any) {
      try {
        const boards = await db
          .select()
          .from(atsBoards)
          .where(eq(atsBoards.company_id, parent.id));
        return boards || [];
      } catch (error) {
        console.error("Error fetching ATS boards:", error);
        return [];
      }
    },
    async facts(
      parent: any,
      args: { limit?: number; offset?: number; field?: string },
    ) {
      try {
        const limit = args.limit ?? 200;
        const offset = args.offset ?? 0;

        const conditions = [eq(companyFacts.company_id, parent.id)];
        if (args.field) {
          conditions.push(eq(companyFacts.field, args.field));
        }

        const facts = await db
          .select()
          .from(companyFacts)
          .where(and(...conditions)!)
          .limit(limit)
          .offset(offset);
        return facts || [];
      } catch (error) {
        console.error("Error fetching company facts:", error);
        return [];
      }
    },
    async facts_count(parent: any) {
      try {
        const result = await db
          .select({ count: count() })
          .from(companyFacts)
          .where(eq(companyFacts.company_id, parent.id));
        return result[0]?.count || 0;
      } catch (error) {
        console.error("Error counting company facts:", error);
        return 0;
      }
    },
    async snapshots(parent: any, args: { limit?: number; offset?: number }) {
      try {
        const limit = args.limit ?? 50;
        const offset = args.offset ?? 0;

        const snapshots = await db
          .select()
          .from(companySnapshots)
          .where(eq(companySnapshots.company_id, parent.id))
          .limit(limit)
          .offset(offset);
        return snapshots || [];
      } catch (error) {
        console.error("Error fetching company snapshots:", error);
        return [];
      }
    },
    async snapshots_count(parent: any) {
      try {
        const result = await db
          .select({ count: count() })
          .from(companySnapshots)
          .where(eq(companySnapshots.company_id, parent.id));
        return result[0]?.count || 0;
      } catch (error) {
        console.error("Error counting company snapshots:", error);
        return 0;
      }
    },
  },

  Evidence: {
    warc(parent: any) {
      if (!parent.warc_filename) return null;
      return {
        filename: parent.warc_filename,
        offset: parent.warc_offset,
        length: parent.warc_length,
        digest: parent.warc_digest,
      };
    },
  },

  CompanyFact: {
    value_json(parent: any) {
      return parent.value_json ? JSON.parse(parent.value_json) : null;
    },
    normalized_value(parent: any) {
      return parent.normalized_value
        ? JSON.parse(parent.normalized_value)
        : null;
    },
    evidence(parent: any) {
      return {
        source_type: parent.source_type,
        source_url: parent.source_url,
        crawl_id: parent.crawl_id,
        capture_timestamp: parent.capture_timestamp,
        observed_at: parent.observed_at,
        method: parent.method,
        extractor_version: parent.extractor_version,
        http_status: parent.http_status,
        mime: parent.mime,
        content_hash: parent.content_hash,
        warc_filename: parent.warc_filename,
        warc_offset: parent.warc_offset,
        warc_length: parent.warc_length,
        warc_digest: parent.warc_digest,
      };
    },
  },

  CompanySnapshot: {
    jsonld(parent: any) {
      return parent.jsonld ? JSON.parse(parent.jsonld) : null;
    },
    extracted(parent: any) {
      return parent.extracted ? JSON.parse(parent.extracted) : null;
    },
    evidence(parent: any) {
      return {
        source_type: parent.source_type,
        source_url: parent.source_url,
        crawl_id: parent.crawl_id,
        capture_timestamp: parent.capture_timestamp,
        observed_at: parent.fetched_at,
        method: parent.method,
        extractor_version: parent.extractor_version,
        http_status: parent.http_status,
        mime: parent.mime,
        content_hash: parent.content_hash,
        warc_filename: parent.warc_filename,
        warc_offset: parent.warc_offset,
        warc_length: parent.warc_length,
        warc_digest: parent.warc_digest,
      };
    },
  },

  ATSBoard: {
    evidence(parent: any) {
      return {
        source_type: parent.source_type,
        source_url: parent.source_url,
        crawl_id: parent.crawl_id,
        capture_timestamp: parent.capture_timestamp,
        observed_at: parent.observed_at,
        method: parent.method,
        extractor_version: parent.extractor_version,
        http_status: parent.http_status,
        mime: parent.mime,
        content_hash: parent.content_hash,
        warc_filename: parent.warc_filename,
        warc_offset: parent.warc_offset,
        warc_length: parent.warc_length,
        warc_digest: parent.warc_digest,
      };
    },
  },

  Query: {
    async companies(
      _parent: any,
      args: {
        filter?: {
          text?: string;
          category_in?: string[];
          min_score?: number;
          has_ats_boards?: boolean;
          service_taxonomy_any?: string[];
          canonical_domain_in?: string[];
        };
        order_by?: string;
        limit?: number;
        offset?: number;
      },
      _context: GraphQLContext,
    ) {
      try {
        const conditions = [];

        if (args.filter) {
          if (args.filter.text) {
            const searchPattern = `%${args.filter.text}%`;
            conditions.push(
              or(
                like(companies.name, searchPattern),
                like(companies.key, searchPattern),
                like(companies.description, searchPattern),
              )!,
            );
          }

          if (args.filter.category_in && args.filter.category_in.length > 0) {
            conditions.push(
              inArray(companies.category, args.filter.category_in as any),
            );
          }

          if (args.filter.min_score !== undefined) {
            conditions.push(gte(companies.score, args.filter.min_score));
          }

          if (
            args.filter.canonical_domain_in &&
            args.filter.canonical_domain_in.length > 0
          ) {
            conditions.push(
              inArray(
                companies.canonical_domain,
                args.filter.canonical_domain_in as any,
              ),
            );
          }
        }

        let query = db.select().from(companies);

        if (conditions.length > 0) {
          query = query.where(and(...conditions)!) as any;
        }

        // Order by
        const orderBy = args.order_by ?? "SCORE_DESC";
        if (orderBy === "SCORE_DESC") {
          query = query.orderBy(desc(companies.score)) as any;
        } else if (orderBy === "UPDATED_AT_DESC") {
          query = query.orderBy(desc(companies.updated_at)) as any;
        } else if (orderBy === "CREATED_AT_DESC") {
          query = query.orderBy(desc(companies.created_at)) as any;
        }

        let allResults = await query;

        // Post-filter for has_ats_boards and service_taxonomy_any
        if (args.filter?.has_ats_boards) {
          const companyIdsWithBoards = await db
            .select({ company_id: atsBoards.company_id })
            .from(atsBoards)
            .where(eq(atsBoards.is_active, true));
          const boardCompanyIds = new Set(
            companyIdsWithBoards.map((b) => b.company_id),
          );
          allResults = allResults.filter((c) => boardCompanyIds.has(c.id));
        }

        if (
          args.filter?.service_taxonomy_any &&
          args.filter.service_taxonomy_any.length > 0
        ) {
          allResults = allResults.filter((c) => {
            if (!c.service_taxonomy) return false;
            const taxonomies = JSON.parse(c.service_taxonomy);
            return args.filter!.service_taxonomy_any!.some((t) =>
              taxonomies.includes(t),
            );
          });
        }

        const totalCount = allResults.length;
        const limit = args.limit ?? 50;
        const offset = args.offset ?? 0;
        const paginatedCompanies = allResults.slice(offset, offset + limit);

        return {
          companies: paginatedCompanies,
          totalCount,
        };
      } catch (error) {
        console.error("Error fetching companies:", error);
        return { companies: [], totalCount: 0 };
      }
    },

    async company(
      _parent: any,
      args: { id?: number; key?: string },
      _context: GraphQLContext,
    ) {
      try {
        if (!args.id && !args.key) {
          return null;
        }

        let query = db.select().from(companies);

        if (args.id) {
          query = query.where(eq(companies.id, args.id)) as any;
        } else if (args.key) {
          query = query.where(eq(companies.key, args.key)) as any;
        }

        const [result] = await query.limit(1);
        return result || null;
      } catch (error) {
        console.error("Error fetching company:", error);
        return null;
      }
    },

    async company_facts(
      _parent: any,
      args: {
        company_id: number;
        field?: string;
        limit?: number;
        offset?: number;
      },
      _context: GraphQLContext,
    ) {
      try {
        const limit = args.limit ?? 200;
        const offset = args.offset ?? 0;

        const conditions = [eq(companyFacts.company_id, args.company_id)];
        if (args.field) {
          conditions.push(eq(companyFacts.field, args.field));
        }

        const facts = await db
          .select()
          .from(companyFacts)
          .where(and(...conditions)!)
          .limit(limit)
          .offset(offset);
        return facts || [];
      } catch (error) {
        console.error("Error fetching company facts:", error);
        return [];
      }
    },

    async company_snapshots(
      _parent: any,
      args: {
        company_id: number;
        limit?: number;
        offset?: number;
      },
      _context: GraphQLContext,
    ) {
      try {
        const limit = args.limit ?? 50;
        const offset = args.offset ?? 0;

        const snapshots = await db
          .select()
          .from(companySnapshots)
          .where(eq(companySnapshots.company_id, args.company_id))
          .limit(limit)
          .offset(offset);
        return snapshots || [];
      } catch (error) {
        console.error("Error fetching company snapshots:", error);
        return [];
      }
    },

    async company_ats_boards(
      _parent: any,
      args: { company_id: number },
      _context: GraphQLContext,
    ) {
      try {
        const boards = await db
          .select()
          .from(atsBoards)
          .where(eq(atsBoards.company_id, args.company_id));
        return boards || [];
      } catch (error) {
        console.error("Error fetching ATS boards:", error);
        return [];
      }
    },
  },

  Mutation: {
    async createCompany(
      _parent: any,
      args: {
        input: {
          key: string;
          name: string;
          logo_url?: string;
          website?: string;
          description?: string;
          industry?: string;
          size?: string;
          location?: string;
          canonical_domain?: string;
          category?: string;
          tags?: string[];
          services?: string[];
          service_taxonomy?: string[];
          industries?: string[];
        };
      },
      context: GraphQLContext,
    ) {
      try {
        if (!context.userId) {
          throw new Error("Unauthorized");
        }

        if (!isAdminEmail(context.userEmail)) {
          throw new Error("Forbidden - Admin access required");
        }

        const insertData: any = { ...args.input };

        // Stringify JSON fields
        if (args.input.tags) {
          insertData.tags = JSON.stringify(args.input.tags);
        }
        if (args.input.services) {
          insertData.services = JSON.stringify(args.input.services);
        }
        if (args.input.service_taxonomy) {
          insertData.service_taxonomy = JSON.stringify(
            args.input.service_taxonomy,
          );
        }
        if (args.input.industries) {
          insertData.industries = JSON.stringify(args.input.industries);
        }

        const [newCompany] = await db
          .insert(companies)
          .values(insertData)
          .returning();

        return newCompany;
      } catch (error) {
        console.error("Error creating company:", error);
        throw error;
      }
    },

    async updateCompany(
      _parent: any,
      args: {
        id: number;
        input: {
          key?: string;
          name?: string;
          logo_url?: string;
          website?: string;
          description?: string;
          industry?: string;
          size?: string;
          location?: string;
          canonical_domain?: string;
          category?: string;
          tags?: string[];
          services?: string[];
          service_taxonomy?: string[];
          industries?: string[];
          score?: number;
          score_reasons?: string[];
        };
      },
      context: GraphQLContext,
    ) {
      try {
        if (!context.userId) {
          throw new Error("Unauthorized");
        }

        if (!isAdminEmail(context.userEmail)) {
          throw new Error("Forbidden - Admin access required");
        }

        const updateData: any = { ...args.input };

        // Stringify JSON fields
        if (args.input.tags) {
          updateData.tags = JSON.stringify(args.input.tags);
        }
        if (args.input.services) {
          updateData.services = JSON.stringify(args.input.services);
        }
        if (args.input.service_taxonomy) {
          updateData.service_taxonomy = JSON.stringify(
            args.input.service_taxonomy,
          );
        }
        if (args.input.industries) {
          updateData.industries = JSON.stringify(args.input.industries);
        }
        if (args.input.score_reasons) {
          updateData.score_reasons = JSON.stringify(args.input.score_reasons);
        }

        updateData.updated_at = new Date().toISOString();

        const [updatedCompany] = await db
          .update(companies)
          .set(updateData)
          .where(eq(companies.id, args.id))
          .returning();

        if (!updatedCompany) {
          throw new Error("Company not found");
        }

        return updatedCompany;
      } catch (error) {
        console.error("Error updating company:", error);
        throw error;
      }
    },

    async deleteCompany(
      _parent: any,
      args: { id: number },
      context: GraphQLContext,
    ) {
      try {
        if (!context.userId) {
          throw new Error("Unauthorized");
        }

        if (!isAdminEmail(context.userEmail)) {
          throw new Error("Forbidden - Admin access required");
        }

        await db.delete(companies).where(eq(companies.id, args.id));

        return {
          success: true,
          message: "Company deleted successfully",
        };
      } catch (error) {
        console.error("Error deleting company:", error);
        throw error;
      }
    },

    enhanceCompany,

    async add_company_facts(
      _parent: any,
      args: {
        company_id: number;
        facts: Array<{
          field: string;
          value_json?: any;
          value_text?: string;
          normalized_value?: any;
          confidence: number;
          evidence: any;
        }>;
      },
      context: GraphQLContext,
    ) {
      try {
        if (!context.userId) {
          throw new Error("Unauthorized");
        }

        if (!isAdminEmail(context.userEmail)) {
          throw new Error("Forbidden - Admin access required");
        }

        const insertedFacts = [];

        for (const fact of args.facts) {
          const insertData: any = {
            company_id: args.company_id,
            field: fact.field,
            value_text: fact.value_text,
            confidence: fact.confidence,
            // Evidence fields
            source_type: fact.evidence.source_type,
            source_url: fact.evidence.source_url,
            crawl_id: fact.evidence.crawl_id,
            capture_timestamp: fact.evidence.capture_timestamp,
            observed_at: fact.evidence.observed_at,
            method: fact.evidence.method,
            extractor_version: fact.evidence.extractor_version,
            http_status: fact.evidence.http_status,
            mime: fact.evidence.mime,
            content_hash: fact.evidence.content_hash,
            warc_filename: fact.evidence.warc?.filename,
            warc_offset: fact.evidence.warc?.offset,
            warc_length: fact.evidence.warc?.length,
            warc_digest: fact.evidence.warc?.digest,
          };

          if (fact.value_json) {
            insertData.value_json = JSON.stringify(fact.value_json);
          }
          if (fact.normalized_value) {
            insertData.normalized_value = JSON.stringify(fact.normalized_value);
          }

          const [inserted] = await db
            .insert(companyFacts)
            .values(insertData)
            .returning();
          insertedFacts.push(inserted);
        }

        return insertedFacts;
      } catch (error) {
        console.error("Error adding company facts:", error);
        throw error;
      }
    },

    async upsert_company_ats_boards(
      _parent: any,
      args: {
        company_id: number;
        boards: Array<{
          url: string;
          vendor: string;
          board_type: string;
          confidence: number;
          is_active: boolean;
          last_seen_at: string;
          evidence: any;
        }>;
      },
      context: GraphQLContext,
    ) {
      try {
        if (!context.userId) {
          throw new Error("Unauthorized");
        }

        if (!isAdminEmail(context.userEmail)) {
          throw new Error("Forbidden - Admin access required");
        }

        const upsertedBoards = [];

        for (const board of args.boards) {
          // Check if board exists
          const [existing] = await db
            .select()
            .from(atsBoards)
            .where(
              and(
                eq(atsBoards.company_id, args.company_id),
                eq(atsBoards.url, board.url),
              )!,
            )
            .limit(1);

          const boardData: any = {
            company_id: args.company_id,
            url: board.url,
            vendor: board.vendor,
            board_type: board.board_type,
            confidence: board.confidence,
            is_active: board.is_active,
            last_seen_at: board.last_seen_at,
            // Evidence fields
            source_type: board.evidence.source_type,
            source_url: board.evidence.source_url,
            crawl_id: board.evidence.crawl_id,
            capture_timestamp: board.evidence.capture_timestamp,
            observed_at: board.evidence.observed_at,
            method: board.evidence.method,
            extractor_version: board.evidence.extractor_version,
            warc_filename: board.evidence.warc?.filename,
            warc_offset: board.evidence.warc?.offset,
            warc_length: board.evidence.warc?.length,
            warc_digest: board.evidence.warc?.digest,
          };

          if (existing) {
            // Update
            boardData.updated_at = new Date().toISOString();
            const [updated] = await db
              .update(atsBoards)
              .set(boardData)
              .where(eq(atsBoards.id, existing.id))
              .returning();
            upsertedBoards.push(updated);
          } else {
            // Insert
            boardData.first_seen_at = board.last_seen_at;
            const [inserted] = await db
              .insert(atsBoards)
              .values(boardData)
              .returning();
            upsertedBoards.push(inserted);
          }
        }

        return upsertedBoards;
      } catch (error) {
        console.error("Error upserting ATS boards:", error);
        throw error;
      }
    },

    async ingest_company_snapshot(
      _parent: any,
      args: {
        company_id: number;
        source_url: string;
        crawl_id?: string;
        capture_timestamp?: string;
        fetched_at: string;
        http_status?: number;
        mime?: string;
        content_hash?: string;
        text_sample?: string;
        jsonld?: any;
        extracted?: any;
        evidence: any;
      },
      context: GraphQLContext,
    ) {
      try {
        if (!context.userId) {
          throw new Error("Unauthorized");
        }

        if (!isAdminEmail(context.userEmail)) {
          throw new Error("Forbidden - Admin access required");
        }

        const insertData: any = {
          company_id: args.company_id,
          source_url: args.source_url,
          crawl_id: args.crawl_id,
          capture_timestamp: args.capture_timestamp,
          fetched_at: args.fetched_at,
          http_status: args.http_status,
          mime: args.mime,
          content_hash: args.content_hash,
          text_sample: args.text_sample,
          // Evidence fields
          source_type: args.evidence.source_type,
          method: args.evidence.method,
          extractor_version: args.evidence.extractor_version,
          warc_filename: args.evidence.warc?.filename,
          warc_offset: args.evidence.warc?.offset,
          warc_length: args.evidence.warc?.length,
          warc_digest: args.evidence.warc?.digest,
        };

        if (args.jsonld) {
          insertData.jsonld = JSON.stringify(args.jsonld);
        }
        if (args.extracted) {
          insertData.extracted = JSON.stringify(args.extracted);
        }

        const [snapshot] = await db
          .insert(companySnapshots)
          .values(insertData)
          .returning();

        return snapshot;
      } catch (error) {
        console.error("Error ingesting company snapshot:", error);
        throw error;
      }
    },
  },
};
