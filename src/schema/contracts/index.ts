/**
 * Unified worker schema contracts.
 *
 * Single source of truth for all shared enums, types, and message formats
 * consumed across TypeScript, Python, and Rust workers.
 *
 * Usage:
 *   import { JobStatus, ATSVendor, SKILL_TAXONOMY } from "@/schema/contracts";
 *
 * Codegen:
 *   pnpm schema:generate  — regenerates Python/Rust constants from these definitions
 */

export {
  JobStatus,
  ClassificationConfidence,
  ATSVendor,
  ATSBoardType,
  CompanyCategory,
  SourceType,
  ExtractMethod,
  ApplicationStatus,
  SkillLevel,
  JOB_STATUS_PYTHON_MAP,
} from "./enums";

export { SKILL_TAXONOMY, SKILL_TAGS } from "./skill-taxonomy";

export {
  QueueMessage,
  ProcessJobsMessage,
  JobClassificationResult,
  JobRoleTagsResult,
  ExtractedSkill,
  JobSkillsOutput,
  JobInsertPayload,
} from "./messages";
