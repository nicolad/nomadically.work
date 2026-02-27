# Prep Link Specification — Fix Broken Topic URL

## Purpose

Fixes the broken navigation link in the interview prep ReactFlow graph that currently points to a non-existent `/prep/db/acid` path, redirecting it to the new study topic library route.

## Requirements

### Requirement: Update TOPIC_PREP_URLS Mapping

The system MUST update the `TOPIC_PREP_URLS` map in `src/components/interview-prep-flow.tsx` to point the "acid" entry to `/study/db/acid` instead of `/prep/db/acid`.

#### Scenario: ACID topic link resolves

- GIVEN the `TOPIC_PREP_URLS` map contains `acid: "/study/db/acid"`
- WHEN a user clicks the "ACID" topic node in the ReactFlow prep graph
- THEN the browser MUST navigate to `/study/db/acid`
- AND the page MUST return HTTP 200 (not 404)

#### Scenario: Other topic entries are unaffected

- GIVEN the `TOPIC_PREP_URLS` map contains entries other than "acid"
- WHEN the map is updated
- THEN all other entries MUST remain unchanged

### Requirement: Link Behavior

Topic node links SHOULD open in the same tab (standard Next.js navigation). The user MAY navigate back to the prep graph using the browser back button.

#### Scenario: Navigation preserves back-button behavior

- GIVEN a user is viewing the prep graph at `/prep/backend-fundamentals`
- WHEN they click the ACID topic node and navigate to `/study/db/acid`
- THEN pressing the browser back button MUST return them to `/prep/backend-fundamentals`
