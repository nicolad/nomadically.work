import { eq } from "drizzle-orm";

import { companies, atsBoards, companySnapshots } from "@/db/schema";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";
import { extractCompanyData } from "@/browser-rendering/company/extractor";
import type {
  EnhanceCompanyArgs,
  EnhanceCompanyResponse,
  CompanyUpdateData,
  VendorMap,
  BoardTypeMap,
} from "./types";

/**
 * Enhanced company data mutation resolver
 * Triggers company data enhancement/enrichment using DeepSeek AI extraction
 */
export async function enhanceCompany(
  _parent: any,
  args: EnhanceCompanyArgs,
  context: GraphQLContext,
): Promise<EnhanceCompanyResponse> {
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
      company = await context.db.query.companies.findFirst({
        where: eq(companies.id, args.id),
      });
    } else if (args.key) {
      company = await context.db.query.companies.findFirst({
        where: eq(companies.key, args.key),
      });
    }

    if (!company) {
      throw new Error("Company not found");
    }

    if (!company.website) {
      throw new Error("Company must have a website URL to enhance");
    }

    // Extract company data using DeepSeek AI via Cloudflare
    console.log(`Enhancing company ${company.name} from ${company.website}`);
    
    let extractedData;
    try {
      extractedData = await extractCompanyData(company.website);
    } catch (extractError) {
      console.error("DeepSeek extraction failed:", extractError);
      throw new Error(
        `Failed to extract company data: ${extractError instanceof Error ? extractError.message : "Unknown error"}`
      );
    }

    console.log(
      `Extracted data for ${extractedData.company.name}:`,
      extractedData.notes
    );

    // Update company with extracted data
    const updateData: CompanyUpdateData = {
      updated_at: new Date().toISOString(),
    };

    // Update fields if they were extracted and are better than existing
    if (extractedData.company.description) {
      updateData.description = extractedData.company.description;
    }
    if (extractedData.company.logo_url) {
      updateData.logo_url = extractedData.company.logo_url;
    }
    if (extractedData.company.industry) {
      updateData.industry = extractedData.company.industry;
    }
    if (extractedData.company.size) {
      updateData.size = extractedData.company.size;
    }
    if (extractedData.company.location) {
      updateData.location = extractedData.company.location;
    }
    if (extractedData.company.canonical_domain) {
      updateData.canonical_domain = extractedData.company.canonical_domain;
    }
    if (extractedData.company.category) {
      // Validate category is a valid enum value
      const validCategories = ["CONSULTANCY", "AGENCY", "STAFFING", "DIRECTORY", "PRODUCT", "OTHER", "UNKNOWN"];
      const category = extractedData.company.category.toUpperCase();
      updateData.category = validCategories.includes(category) ? category : "OTHER";
    }
    if (extractedData.company.tags && extractedData.company.tags.length > 0) {
      updateData.tags = JSON.stringify(extractedData.company.tags);
    }
    if (
      extractedData.company.services &&
      extractedData.company.services.length > 0
    ) {
      updateData.services = JSON.stringify(extractedData.company.services);
    }
    if (
      extractedData.company.service_taxonomy &&
      extractedData.company.service_taxonomy.length > 0
    ) {
      updateData.service_taxonomy = JSON.stringify(
        extractedData.company.service_taxonomy
      );
    }
    if (
      extractedData.company.industries &&
      extractedData.company.industries.length > 0
    ) {
      updateData.industries = JSON.stringify(extractedData.company.industries);
    }

    // Update Common Crawl metadata
    if (extractedData.evidence.source_url) {
      updateData.last_seen_source_url = extractedData.evidence.source_url;
      updateData.last_seen_capture_timestamp =
        extractedData.evidence.capture_timestamp || new Date().toISOString();
    }

    await context.db.update(companies).set(updateData).where(eq(companies.id, company.id));

    // Update or insert ATS boards
    if (extractedData.ats_boards && extractedData.ats_boards.length > 0) {
      for (const board of extractedData.ats_boards) {
        // Map vendor to enum values
        const vendorMap: VendorMap = {
          GREENHOUSE: "GREENHOUSE",
          LEVER: "LEVER",
          WORKABLE: "WORKABLE",
          TEAMTAILOR: "TEAMTAILOR",
          ASHBY: "ASHBY",
          SMARTRECRUITERS: "SMARTRECRUITERS",
          JAZZHR: "JAZZHR",
          BREEZYHR: "BREEZYHR",
          ICIMS: "ICIMS",
          JOBVITE: "JOBVITE",
          SAP_SUCCESSFACTORS: "SAP_SUCCESSFACTORS",
          ORACLE_TALEO: "ORACLE_TALEO",
        };
        const vendor = board.vendor?.toUpperCase() || "OTHER";
        const mappedVendor = vendorMap[vendor] || "OTHER";

        // Map board_type to enum values
        const boardTypeMap: BoardTypeMap = {
          ATS: "BOARD_API",
          CAREERS_PAGE: "JOBS_PAGE",
          JOBS_BOARD: "JOBS_PAGE",
        };
        const boardType = board.board_type?.toUpperCase() || "UNKNOWN";
        const mappedBoardType = boardTypeMap[boardType] || "UNKNOWN";

        const boardData = {
          company_id: company.id,
          url: board.url,
          vendor: mappedVendor,
          board_type: mappedBoardType,
          confidence: board.confidence || 0.5,
          is_active: board.is_active ?? true,
          first_seen_at: board.first_seen_at || new Date().toISOString(),
          last_seen_at: board.last_seen_at || new Date().toISOString(),
          // Evidence fields
          source_type: "LIVE_FETCH",
          source_url: board.evidence?.source_url || board.url,
          crawl_id: board.evidence?.crawl_id || null,
          capture_timestamp: board.evidence?.capture_timestamp || null,
          observed_at:
            board.evidence?.observed_at || new Date().toISOString(),
          method: "LLM",
          extractor_version: board.evidence?.extractor_version || "deepseek-1.0",
          warc_filename: board.evidence?.warc?.filename || null,
          warc_offset: board.evidence?.warc?.offset || null,
          warc_length: board.evidence?.warc?.length || null,
          warc_digest: board.evidence?.warc?.digest || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Check if ATS board already exists
        const existing = await context.db.query.atsBoards.findFirst({
          where: eq(atsBoards.url, board.url),
        });

        if (existing) {
          // Update existing board
          await context.db
            .update(atsBoards)
            .set({
              ...boardData,
              last_seen_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .where(eq(atsBoards.id, existing.id));
        } else {
          // Insert new board
          await context.db.insert(atsBoards).values(boardData);
        }
      }
    }

    // Save extraction snapshot for audit trail
    const snapshotData = {
      company_id: company.id,
      source_url: company.website,
      fetched_at: new Date().toISOString(),
      http_status: extractedData.evidence.http_status || null,
      mime: extractedData.evidence.mime || null,
      content_hash: extractedData.evidence.content_hash || null,
      text_sample: extractedData.company.description?.substring(0, 500) || null,
      jsonld: null,
      extracted: JSON.stringify(extractedData), // Full extraction results
      source_type: "LIVE_FETCH",
      method: "LLM",
      extractor_version: "deepseek-1.0",
      crawl_id: extractedData.evidence.crawl_id || null,
      capture_timestamp: extractedData.evidence.capture_timestamp || null,
      warc_filename: extractedData.evidence.warc?.filename || null,
      warc_offset: extractedData.evidence.warc?.offset || null,
      warc_length: extractedData.evidence.warc?.length || null,
      warc_digest: extractedData.evidence.warc?.digest || null,
    };

    await context.db.insert(companySnapshots).values(snapshotData);

    return {
      success: true,
      message: `Company enhanced successfully. Updated ${Object.keys(updateData).length} fields and processed ${extractedData.ats_boards?.length || 0} ATS boards.`,
      companyId: company.id,
      companyKey: company.key,
    };
  } catch (error) {
    console.error("Error enhancing company:", error);
    throw error;
  }
}
