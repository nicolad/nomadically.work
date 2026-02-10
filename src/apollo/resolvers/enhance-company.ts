import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companies } from "@/db/schema";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";

/**
 * Enhanced company data mutation resolver
 * Triggers company data enhancement/enrichment
 */
export async function enhanceCompany(
  _parent: any,
  args: { id?: number; key?: string },
  context: GraphQLContext,
) {
  try {
    if (!context.userId) {
      throw new Error("Unauthorized");
    }

    if (!isAdminEmail(context.userEmail)) {
      throw new Error("Forbidden - Admin access required");
    }

    if (!args.id && !args.key) {
      throw new Error("Either id or key is required");
    }

    // Fetch current company data
    let company;
    if (args.id) {
      company = await db.query.companies.findFirst({
        where: eq(companies.id, args.id),
      });
    } else if (args.key) {
      company = await db.query.companies.findFirst({
        where: eq(companies.key, args.key),
      });
    }

    if (!company) {
      throw new Error("Company not found");
    }

    // TODO: Implement actual enhancement logic
    // This could include:
    // - Re-scraping company website
    // - Enriching with AI-generated descriptions
    // - Updating ATS boards
    // - Fetching additional company data from external sources
    // - Updating company facts and snapshots

    // For now, just update the updated_at timestamp to indicate processing
    await db
      .update(companies)
      .set({ updated_at: new Date().toISOString() })
      .where(eq(companies.id, company.id));

    // You could also trigger an Inngest workflow here:
    // await inngest.send({
    //   name: "company/enhance",
    //   data: {
    //     companyId: company.id,
    //     companyKey: company.key,
    //   },
    // });

    return {
      success: true,
      message: "Company enhancement initiated",
      companyId: company.id,
      companyKey: company.key,
    };
  } catch (error) {
    console.error("Error enhancing company:", error);
    throw error;
  }
}
