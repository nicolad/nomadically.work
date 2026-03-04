export type SourceLocation = {
  path: string;
  line?: number | null;
  note: string;
};

export type Alternative = {
  name: string;
  reason_not_chosen: string;
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
