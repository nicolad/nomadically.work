#!/bin/bash

# Apply all migrations to D1 database
# Usage: ./scripts/migrate-d1.sh [--local|--remote]

MODE="${1:---remote}"

echo "🚀 Applying migrations to D1 database ($MODE)..."

migrations=(
  "migrations/0000_gray_ares.sql"
  "migrations/0001_eminent_excalibur.sql"
  "migrations/0002_add_applications_table.sql"
  "migrations/0002_grey_roxanne_simpson.sql"
  "migrations/0002_job_skills.sql"
  "migrations/0003_add_remote_eu_classification.sql"
  "migrations/0004_add_companies_table.sql"
  "migrations/0005_add_user_preferences.sql"
  "migrations/0006_add_evidence_bundles.sql"
  "migrations/0007_add_company_golden_record_fields.sql"
  "migrations/0008_add_company_evidence_tables.sql"
  "migrations/0009_add_ats_data_to_jobs.sql"
  "migrations/0010_add_greenhouse_enhanced_fields.sql"
  "migrations/0011_add_lever_fields.sql"
)

for migration in "${migrations[@]}"; do
  echo "📝 Applying $migration..."
  npx wrangler d1 execute nomadically-work-db --file="$migration" $MODE
  
  if [ $? -eq 0 ]; then
    echo "✅ $migration applied successfully"
  else
    echo "❌ Failed to apply $migration"
    exit 1
  fi
done

echo "🎉 All migrations applied successfully!"
