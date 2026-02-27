# Delta for Homepage

## ADDED Requirements

### Requirement: Homepage MUST Display Jobs After Pipeline Fix

After the schema fix and pipeline backfill, the homepage job list MUST display jobs that have been classified as `is_remote_eu = true`. The existing `REMOTE_EU_ONLY` filter is correct and SHALL NOT be changed.

#### Scenario: Classified jobs appear in the job list

- GIVEN the database contains jobs with `is_remote_eu = 1` and `status = 'eu-remote'`
- WHEN a user loads the homepage at `/`
- THEN the GraphQL `jobs` query MUST return those jobs
- AND the job list component MUST render at least one job card

#### Scenario: Zero classified jobs shows empty state

- GIVEN the database contains zero jobs with `is_remote_eu = 1`
- WHEN a user loads the homepage at `/`
- THEN the job list MUST display the existing "no jobs found" empty state message
- AND no error state SHALL be shown (this is a valid empty result, not an error)

#### Scenario: Newly classified jobs appear without deploy

- GIVEN the pipeline classifies new jobs as `is_remote_eu = 1` after the schema fix
- WHEN a user loads or refreshes the homepage
- THEN the newly classified jobs MUST appear in the job list
- AND no application redeployment SHALL be required (the query is dynamic)
