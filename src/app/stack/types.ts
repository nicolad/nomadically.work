export type SourceLocation = {
  path: string;
  line?: number | null;
  note: string;
};

export type Alternative = {
  name: string;
  reason_not_chosen: string;
};

export type LearningResource = {
  title: string;
  url: string;
  type: "docs" | "tutorial" | "video" | "talk" | "article" | "course" | "repo";
};

export type CodeSnippet = {
  title: string;
  code: string;
  language: string;
  path?: string;
  line?: number;
  description?: string;
};

export type EcosystemPackage = {
  name: string;
  role: string;
  version?: string;
};

export type Metric = {
  label: string;
  value: string | number;
  unit?: string;
};

export type Incident = {
  date?: string;
  summary: string;
  resolution: string;
  severity?: "low" | "medium" | "high" | "critical";
};

export type VersionEntry = {
  version: string;
  date?: string;
  note: string;
};

export type StackEntry = {
  name: string;
  version?: string | null;
  role: string;
  url?: string | null;
  details: string;
  facts?: string[];
  source_locations?: SourceLocation[];
  why_chosen?: string | null;
  pros?: string[];
  cons?: string[];
  alternatives_considered?: Alternative[];
  trade_offs?: string[];
  patterns_used?: string[];
  interview_points?: string[];
  gotchas?: string[];
  security_considerations?: string[];
  performance_notes?: string[];

  // Deep-dive fields
  maturity?: "experimental" | "adopted" | "stable" | "mature" | "legacy";
  adoption_date?: string | null;
  ecosystem?: EcosystemPackage[];
  learning_resources?: LearningResource[];
  code_snippets?: CodeSnippet[];
  metrics?: Metric[];
  depends_on?: string[];
  depended_by?: string[];
  configuration_files?: SourceLocation[];
  testing_approach?: string[];
  real_incidents?: Incident[];
  version_history?: VersionEntry[];
  architecture_role?: string | null;
  category_tags?: string[];
};

export type StackGroup = {
  label: string;
  color: "violet" | "blue" | "cyan" | "orange" | "green" | "amber" | "crimson" | "indigo";
  entries: StackEntry[];
};

export type DiscoveryData = {
  generated_at: string | null;
  root: string | null;
  groups: StackGroup[];
};
