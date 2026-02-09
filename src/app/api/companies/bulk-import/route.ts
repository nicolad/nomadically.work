import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTurso, type Client } from "@/db";
import { ADMIN_EMAIL } from "@/lib/constants";
import { z } from "zod";

/**
 * POST /api/companies/bulk-import
 *
 * Bulk imports companies with duplicate prevention.
 *
 * Request body:
 * {
 *   "companies": [
 *     {
 *       "key": "company-slug",  // Required, unique identifier
 *       "name": "Company Name",
 *       "website": "https://example.com",
 *       "description": "...",
 *       "industry": "Technology",
 *       "size": "50-100",
 *       "location": "Berlin, Germany",
 *       "category": "PRODUCT",  // Optional
 *       "logo_url": "https://...",
 *       "tags": ["tag1", "tag2"],
 *       "services": ["service1"],
 *     }
 *   ]
 * }
 */

const CompanyInputSchema = z.object({
  key: z.string().min(1, "key is required").toLowerCase(),
  name: z.string().min(1, "name is required"),
  website: z.string().url("website must be a valid URL").optional().nullable(),
  description: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  category: z
    .enum([
      "CONSULTANCY",
      "AGENCY",
      "STAFFING",
      "DIRECTORY",
      "PRODUCT",
      "OTHER",
      "UNKNOWN",
    ])
    .optional(),
  logo_url: z.string().url().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  services: z.array(z.string()).optional().default([]),
});

const BulkImportRequestSchema = z.object({
  companies: z.array(CompanyInputSchema).min(1, "At least 1 company required"),
});

type CompanyInput = z.infer<typeof CompanyInputSchema>;

interface ImportResult {
  key: string;
  id?: number;
  operation: "inserted" | "updated" | "error";
  message?: string;
}

interface BulkImportResponse {
  success: boolean;
  summary: {
    total: number;
    inserted: number;
    updated: number;
    failed: number;
  };
  results: ImportResult[];
  errors?: string[];
}

function jsonResponse(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...(init || {}),
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

/**
 * Authenticate the request
 * Supports two methods:
 * 1. API key via X-API-Key header (for external apps)
 * 2. Clerk authentication with admin email (for web browser access)
 *
 * @returns NextResponse if authentication fails, otherwise returns undefined
 */
async function authenticateRequest(
  request: NextRequest,
): Promise<NextResponse | undefined> {
  // Method 1: Check for API key (for external apps)
  const apiKey = request.headers.get("x-api-key");
  const expectedApiKey = process.env.API_COMPANIES_BULK_IMPORT_KEY;

  if (apiKey) {
    // API key provided - validate it
    if (!expectedApiKey) {
      return jsonResponse(
        {
          success: false,
          error: "API key authentication not configured on server",
        },
        { status: 500 },
      );
    }

    if (apiKey !== expectedApiKey) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid API key",
        },
        { status: 401 },
      );
    }

    return; // API key is valid
  }

  // Method 2: Check Clerk auth (for web browser access)
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return jsonResponse(
      {
        success: false,
        error:
          "Unauthorized: Provide X-API-Key header or sign in with Clerk account",
      },
      { status: 401 },
    );
  }

  const userEmail = sessionClaims?.email as string | undefined;
  if (userEmail !== ADMIN_EMAIL) {
    return jsonResponse(
      {
        success: false,
        error: "Forbidden: Only admin accounts can import companies",
      },
      { status: 403 },
    );
  }
}

async function importCompany(
  turso: Client,
  company: CompanyInput,
): Promise<ImportResult> {
  try {
    const now = new Date().toISOString();

    // Check if company exists
    const existing = await turso.execute({
      sql: `SELECT id FROM companies WHERE key = ? LIMIT 1`,
      args: [company.key],
    });

    const isUpdate = existing.rows.length > 0;

    if (isUpdate) {
      // Update existing company
      const result = await turso.execute({
        sql: `
          UPDATE companies
          SET
            name = ?,
            website = ?,
            description = ?,
            industry = ?,
            size = ?,
            location = ?,
            category = COALESCE(?, category),
            logo_url = COALESCE(?, logo_url),
            tags = ?,
            services = ?,
            updated_at = ?
          WHERE key = ?
          RETURNING id
        `,
        args: [
          company.name,
          company.website ?? null,
          company.description ?? null,
          company.industry ?? null,
          company.size ?? null,
          company.location ?? null,
          company.category ?? null,
          company.logo_url ?? null,
          JSON.stringify(company.tags || []),
          JSON.stringify(company.services || []),
          now,
          company.key,
        ],
      });

      const id = result.rows[0]?.id as number | undefined;
      return {
        key: company.key,
        id,
        operation: "updated",
        message: "Company updated",
      };
    } else {
      // Insert new company
      const result = await turso.execute({
        sql: `
          INSERT INTO companies (
            key,
            name,
            website,
            description,
            industry,
            size,
            location,
            category,
            logo_url,
            tags,
            services,
            score,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING id
        `,
        args: [
          company.key,
          company.name,
          company.website ?? null,
          company.description ?? null,
          company.industry ?? null,
          company.size ?? null,
          company.location ?? null,
          company.category ?? "UNKNOWN",
          company.logo_url ?? null,
          JSON.stringify(company.tags || []),
          JSON.stringify(company.services || []),
          0.5, // Default score
          now,
          now,
        ],
      });

      const id = result.rows[0]?.id as number | undefined;
      return {
        key: company.key,
        id,
        operation: "inserted",
        message: "Company created",
      };
    }
  } catch (error) {
    console.error(`Error importing company ${company.key}:`, error);
    return {
      key: company.key,
      operation: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const authError = await authenticateRequest(request);
    if (authError) {
      return authError;
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = BulkImportRequestSchema.parse(body);

    // Get Turso client instance (not the proxy)
    const tursoClient = getTurso();

    // Process each company
    const results: ImportResult[] = [];

    for (const company of validatedData.companies) {
      const result = await importCompany(tursoClient, company);
      results.push(result);
    }

    // Calculate summary
    const summary = {
      total: results.length,
      inserted: results.filter((r) => r.operation === "inserted").length,
      updated: results.filter((r) => r.operation === "updated").length,
      failed: results.filter((r) => r.operation === "error").length,
    };

    const errorDetails = results
      .filter((r) => r.operation === "error")
      .map((r) => `${r.key}: ${r.message}`);

    const response: BulkImportResponse = {
      success: summary.failed === 0,
      summary,
      results,
      ...(errorDetails.length > 0 && { errors: errorDetails }),
    };

    return jsonResponse(response, {
      status: summary.failed === 0 ? 200 : 207, // 207 Multi-Status for partial success
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonResponse(
        {
          success: false,
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    console.error("Bulk import error:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * Example usage from external app:
 *
 * curl -X POST https://nomadically.work/api/companies/bulk-import \
 *   -H "Content-Type: application/json" \
 *   -H "X-API-Key: your-api-key-here" \
 *   -d '{
 *     "companies": [
 *       {
 *         "key": "acme-corp",
 *         "name": "ACME Corp",
 *         "website": "https://acme.com",
 *         "description": "Leading software company",
 *         "industry": "Technology",
 *         "size": "100-500",
 *         "location": "San Francisco, CA",
 *         "category": "PRODUCT",
 *         "tags": ["remote-first", "startup"],
 *         "services": ["Cloud", "AI"]
 *       },
 *       {
 *         "key": "tech-agency",
 *         "name": "Tech Agency",
 *         "website": "https://techagency.io",
 *         "category": "AGENCY"
 *       }
 *     ]
 *   }'
 *
 * Setup:
 * 1. Set API_COMPANIES_BULK_IMPORT_KEY in your environment
 * 2. Include X-API-Key header with your API key in requests
 * 3. Alternatively, if no X-API-Key is provided, Clerk auth will be used (for web access)
 */
