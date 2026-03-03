/**
 * Strategy Enforcer
 *
 * Validates code changes against the optimization strategy defined in
 * OPTIMIZATION-STRATEGY.md. Enforces the Two-Layer Model.
 *
 * Usage:
 *   import { strategyEnforcerTool, enforceStrategy } from "@/agents/strategy-enforcer";
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const violationSchema = z.object({
  rule: z.string(),
  severity: z.enum(["BLOCKING", "WARNING"]),
  metaApproach: z.string(),
  file: z.string(),
  line: z.number().optional(),
  message: z.string(),
  fix: z.string(),
});

type Violation = z.infer<typeof violationSchema>;

// ---------------------------------------------------------------------------
// File pattern matchers
// ---------------------------------------------------------------------------

const PROMPT_PATTERNS = [
  /prompt/i,
  /classifier/i,
  /extraction-workflow/i,
  /process-jobs/i,
  /remote-eu/i,
];

const SCHEMA_PATTERNS = [/schema\/.*\.graphql$/, /schema\.graphql$/];

const LLM_CALL_PATTERNS = [
  /\.generate\s*\(/,
  /\.chat\s*\(/,
  /\.complete\s*\(/,
  /ChatOpenAI\s*\(/,
];

const STRUCTURED_OUTPUT_PATTERNS = [
  /structuredOutput/,
  /response_format/,
  /\.object\s*\(/,
  /output_schema/i,
  /JsonOutputParser/,
  /PydanticOutputParser/,
  /model_validate/,
  /generateObject/,
];

const GROUNDING_EXEMPT_PATHS = [
  "src/anthropic/examples.ts",
  "scripts/bm25-skills.ts",
  "src/agents/cloudflare-workers-ai.ts",
];

const PROVENANCE_FIELDS = ["confidence", "reason", "source", "evidence"];

const APPROVAL_PATTERNS = [/requireApproval:\s*true/, /requires?\s*approval/i];

// ---------------------------------------------------------------------------
// Helper: strip comment lines so pattern matching operates on code only
// ---------------------------------------------------------------------------

function stripCommentLines(content: string): string {
  return content
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      return (
        !t.startsWith("//") &&
        !t.startsWith("*") &&
        !t.startsWith("/*") &&
        !t.startsWith("#")
      );
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// Rule checks
// ---------------------------------------------------------------------------

function checkEvalFirst(
  changedFiles: string[],
  _fileContents: Map<string, string>,
): Violation[] {
  const violations: Violation[] = [];

  const touchesPromptOrModel = changedFiles.some(
    (f) =>
      !SCHEMA_PATTERNS.some((p) => p.test(f)) &&
      PROMPT_PATTERNS.some((p) => p.test(f)),
  );

  if (touchesPromptOrModel) {
    violations.push({
      rule: "Rule 1: Eval-First — No prompt/model change without eval",
      severity: "BLOCKING",
      metaApproach: "Eval-First",
      file: changedFiles.find((f) =>
        PROMPT_PATTERNS.some((p) => p.test(f)),
      )!,
      message:
        "Prompt or model-related file changed. Run `pnpm test:eval` and verify >= 80% accuracy before merging.",
      fix: "Run: pnpm test:eval && pnpm eval:langfuse",
    });
  }

  return violations;
}

function checkGroundingFirst(
  _changedFiles: string[],
  fileContents: Map<string, string>,
): Violation[] {
  const violations: Violation[] = [];

  for (const [file, content] of fileContents) {
    if (GROUNDING_EXEMPT_PATHS.some((p) => file.includes(p))) continue;

    const codeContent = stripCommentLines(content);

    const hasLLMCall = LLM_CALL_PATTERNS.some((p) => p.test(codeContent));
    const hasStructuredOutput = STRUCTURED_OUTPUT_PATTERNS.some((p) =>
      p.test(codeContent),
    );

    if (hasLLMCall && !hasStructuredOutput) {
      violations.push({
        rule: "Rule 2: Grounding-First — LLM outputs must be schema-constrained",
        severity: "BLOCKING",
        metaApproach: "Grounding-First",
        file,
        message:
          "LLM .generate()/.chat() call found without structuredOutput or response_format. All LLM outputs must be schema-constrained.",
        fix: "Add `structuredOutput: { schema: yourZodSchema }` to the generate call, or `response_format: { type: 'json_object' }` for Python.",
      });
    }

    if (file.includes("extraction-workflow")) {
      if (!codeContent.includes("allowed.has")) {
        violations.push({
          rule: "Rule 3: Grounding-First — Skill extraction must validate against taxonomy",
          severity: "BLOCKING",
          metaApproach: "Grounding-First",
          file,
          message:
            "Skill extraction validation step must filter tags against taxonomy candidates. The `allowed.has(s.tag)` check is missing.",
          fix: "Ensure validation step includes: `.filter((s) => allowed.has(s.tag))`",
        });
      }
    }
  }

  return violations;
}

function checkMultiModelRouting(
  _changedFiles: string[],
  fileContents: Map<string, string>,
): Violation[] {
  const violations: Violation[] = [];

  for (const [file, content] of fileContents) {
    const usesOpus =
      content.includes("opus") || content.includes("claude-opus");
    const isSimpleTask =
      file.includes("quick") ||
      file.includes("simple") ||
      file.includes("lint");

    if (usesOpus && isSimpleTask) {
      violations.push({
        rule: "Rule 4: Multi-Model — Cost-aware routing",
        severity: "WARNING",
        metaApproach: "Multi-Model / Routing-First",
        file,
        message:
          "Opus model used for what appears to be a simple task. Consider Haiku (1/19th cost) or Sonnet (1/5th cost).",
        fix: "Use `claude-haiku-3-5` for simple tasks or `claude-sonnet-4-5` for moderate tasks.",
      });
    }
  }

  return violations;
}

function checkSpecDriven(
  changedFiles: string[],
  _fileContents: Map<string, string>,
): Violation[] {
  const violations: Violation[] = [];

  const touchesGraphQLSchema = changedFiles.some((f) =>
    SCHEMA_PATTERNS.some((p) => p.test(f)),
  );

  if (touchesGraphQLSchema) {
    violations.push({
      rule: "Rule 5: Spec-Driven — Schema changes require codegen",
      severity: "BLOCKING",
      metaApproach: "Spec-Driven",
      file: changedFiles.find((f) =>
        SCHEMA_PATTERNS.some((p) => p.test(f)),
      )!,
      message:
        "GraphQL schema changed. Run `pnpm codegen` and commit generated files.",
      fix: "Run: pnpm codegen && git add src/__generated__/",
    });
  }

  return violations;
}

function checkObservability(
  _changedFiles: string[],
  fileContents: Map<string, string>,
): Violation[] {
  const violations: Violation[] = [];

  for (const [file, content] of fileContents) {
    if (file.includes("/stubs/")) continue;

    const isClassificationFile =
      file.includes("classif") ||
      file.includes("process-jobs") ||
      file.includes("scorer") ||
      file.includes("extraction");

    if (isClassificationFile) {
      const hasInsertOrUpdate =
        content.includes("INSERT") ||
        content.includes("UPDATE") ||
        content.includes(".insert(") ||
        content.includes(".update(");

      if (hasInsertOrUpdate) {
        const missingFields = PROVENANCE_FIELDS.filter(
          (field) => !content.includes(field),
        );

        if (missingFields.length > 0) {
          violations.push({
            rule: "Rule 6: Observability — Classification decisions must carry provenance",
            severity: "BLOCKING",
            metaApproach: "Observability-First",
            file,
            message: `Classification output persisted without provenance fields: ${missingFields.join(", ")}. Every AI decision must carry confidence + reason + source.`,
            fix: `Add ${missingFields.join(", ")} fields to the persisted output.`,
          });
        }
      }
    }
  }

  return violations;
}

function checkHITL(
  _changedFiles: string[],
  fileContents: Map<string, string>,
): Violation[] {
  const violations: Violation[] = [];

  for (const [file, content] of fileContents) {
    const isBatchOp =
      content.includes("batch") ||
      content.includes("bulk") ||
      content.includes("reprocess") ||
      content.includes("rerun");
    const hasApproval = APPROVAL_PATTERNS.some((p) => p.test(content));

    if (
      isBatchOp &&
      !hasApproval &&
      (file.includes("tool") ||
        file.includes("mutation") ||
        file.includes("workspace"))
    ) {
      violations.push({
        rule: "Rule 7: HITL — Batch operations require approval gates",
        severity: "WARNING",
        metaApproach: "Human-Validation-First",
        file,
        message:
          "Batch/bulk operation found without an approval gate. High-impact operations should require human sign-off.",
        fix: "Add `requireApproval: true` or implement an approval queue pattern.",
      });
    }
  }

  return violations;
}

function checkEvidenceRequired(
  _changedFiles: string[],
  fileContents: Map<string, string>,
): Violation[] {
  const violations: Violation[] = [];

  for (const [file, content] of fileContents) {
    const insertsToSkillTags =
      content.includes("job_skill_tags") && content.includes("INSERT");
    const insertsToFacts =
      content.includes("company_facts") && content.includes("INSERT");

    if (insertsToSkillTags && !content.includes("evidence")) {
      violations.push({
        rule: "Rule 8: Evidence — Every persisted AI decision must have evidence",
        severity: "BLOCKING",
        metaApproach: "Grounding-First",
        file,
        message:
          "INSERT to job_skill_tags without evidence field. Every skill tag must include the job description snippet that justified it.",
        fix: "Include `evidence` column with the relevant excerpt from the job description.",
      });
    }

    if (insertsToFacts && !content.includes("evidence")) {
      violations.push({
        rule: "Rule 8: Evidence — Every persisted AI decision must have evidence",
        severity: "BLOCKING",
        metaApproach: "Grounding-First",
        file,
        message:
          "INSERT to company_facts without evidence field. Every extracted fact must include provenance.",
        fix: "Include `evidence` or `source_type` + `method` columns with extraction provenance.",
      });
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Main enforcement function
// ---------------------------------------------------------------------------

export function enforceStrategy(
  changedFiles: string[],
  fileContents: Map<string, string>,
): {
  pass: boolean;
  violations: Violation[];
  summary: string;
} {
  const violations: Violation[] = [
    ...checkEvalFirst(changedFiles, fileContents),
    ...checkGroundingFirst(changedFiles, fileContents),
    ...checkMultiModelRouting(changedFiles, fileContents),
    ...checkSpecDriven(changedFiles, fileContents),
    ...checkObservability(changedFiles, fileContents),
    ...checkHITL(changedFiles, fileContents),
    ...checkEvidenceRequired(changedFiles, fileContents),
  ];

  const blocking = violations.filter((v) => v.severity === "BLOCKING");
  const warnings = violations.filter((v) => v.severity === "WARNING");
  const pass = blocking.length === 0;

  const summary = pass
    ? warnings.length > 0
      ? `PASS with ${warnings.length} warning(s). Review OPTIMIZATION-STRATEGY.md for guidance.`
      : "PASS. All optimization strategy rules satisfied."
    : `FAIL. ${blocking.length} blocking violation(s), ${warnings.length} warning(s). Fix blocking issues before merging.`;

  return { pass, violations, summary };
}

// ---------------------------------------------------------------------------
// Plain async function tool — for use in any agent
// ---------------------------------------------------------------------------

export async function strategyEnforcerTool(input: {
  changedFiles: string[];
  fileContents: Record<string, string>;
}) {
  const contentsMap = new Map(Object.entries(input.fileContents));
  return enforceStrategy(input.changedFiles, contentsMap);
}
