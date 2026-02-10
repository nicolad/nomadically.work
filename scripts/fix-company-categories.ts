/**
 * Script to fix invalid company category values in the database
 * This will update any companies with invalid category enum values to "OTHER"
 */

import { db } from "../src/db";
import { companies } from "../src/db/schema";
import { eq, or, not, inArray, isNull } from "drizzle-orm";

const VALID_CATEGORIES = [
  "CONSULTANCY",
  "AGENCY",
  "STAFFING",
  "DIRECTORY",
  "PRODUCT",
  "OTHER",
  "UNKNOWN",
];

async function fixCompanyCategories() {
  console.log("🔍 Finding companies with invalid category values...\n");

  // Fetch all companies
  const allCompanies = await db.select().from(companies);

  console.log(`Total companies: ${allCompanies.length}`);

  const invalidCompanies = allCompanies.filter(
    (c) => c.category && !VALID_CATEGORIES.includes(c.category.toUpperCase())
  );

  console.log(`Companies with invalid categories: ${invalidCompanies.length}\n`);

  if (invalidCompanies.length === 0) {
    console.log("✅ No companies with invalid categories found!");
    return;
  }

  // Show invalid categories
  const invalidCategoryMap = new Map<string, number>();
  invalidCompanies.forEach((c) => {
    const count = invalidCategoryMap.get(c.category!) || 0;
    invalidCategoryMap.set(c.category!, count + 1);
  });

  console.log("Invalid categories found:");
  invalidCategoryMap.forEach((count, category) => {
    console.log(`  - "${category}": ${count} companies`);
  });
  console.log();

  // Update invalid categories to "OTHER"
  console.log("🔧 Updating invalid categories to 'OTHER'...\n");

  let updated = 0;
  for (const company of invalidCompanies) {
    const oldCategory = company.category;
    await db
      .update(companies)
      .set({
        category: "OTHER",
        updated_at: new Date().toISOString(),
      })
      .where(eq(companies.id, company.id));

    console.log(
      `  ✓ Updated ${company.name} (${company.key}): "${oldCategory}" → "OTHER"`
    );
    updated++;
  }

  console.log(`\n✅ Successfully updated ${updated} companies!`);
}

fixCompanyCategories()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
