-- Add Lever ATS-specific fields to jobs table

-- Lever-specific fields
ALTER TABLE jobs ADD COLUMN categories TEXT; -- JSON object: { commitment, location, team, department, allLocations }
ALTER TABLE jobs ADD COLUMN workplace_type TEXT; -- on-site, remote, hybrid, unspecified
ALTER TABLE jobs ADD COLUMN country TEXT; -- ISO 3166-1 alpha-2 country code
ALTER TABLE jobs ADD COLUMN opening TEXT; -- Job description opening (HTML)
ALTER TABLE jobs ADD COLUMN opening_plain TEXT; -- Job description opening (plain text)
ALTER TABLE jobs ADD COLUMN description_body TEXT; -- Main job description (HTML)
ALTER TABLE jobs ADD COLUMN description_body_plain TEXT; -- Main job description (plain text)
ALTER TABLE jobs ADD COLUMN additional TEXT; -- Additional information/closing (HTML)
ALTER TABLE jobs ADD COLUMN additional_plain TEXT; -- Additional information/closing (plain text)
ALTER TABLE jobs ADD COLUMN lists TEXT; -- JSON array of custom content lists
ALTER TABLE jobs ADD COLUMN ats_created_at TEXT; -- ISO 8601 timestamp when job was created in ATS
