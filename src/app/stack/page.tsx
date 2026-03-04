"use client";

// Local-only page. Run `pnpm stack:discover` to populate discovery.json.
// Not linked from the sidebar in production (see sidebar.tsx IS_DEV guard).

import { useMemo, useState, useCallback } from "react";
import {
  Badge,
  Card,
  Container,
  Dialog,
  Flex,
  Heading,
  Text,
  TextField,
  Separator,
  Tooltip,
} from "@radix-ui/themes";
import {
  LayersIcon,
  ExternalLinkIcon,
  UpdateIcon,
  GitHubLogoIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CodeIcon,
  LinkBreak2Icon,
  RocketIcon,
  InfoCircledIcon,
  CounterClockwiseClockIcon,
  ExclamationTriangleIcon,
  LightningBoltIcon,
  LockClosedIcon,
  BookmarkIcon,
  GearIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  TargetIcon,
  MixerHorizontalIcon,
} from "@radix-ui/react-icons";
import discoveryRaw from "./discovery.json";
import type {
  StackEntry,
  StackGroup,
  DiscoveryData,
  CodeSnippet,
  Incident,
} from "./types";
import { FALLBACK } from "./fallback-data";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { useDeleteStackEntryMutation } from "@/__generated__/hooks";

// ── Constants ────────────────────────────────────────────────────────────────

const GITHUB_BASE = "https://github.com/nicolad/nomadically.work/blob/main";

type Tab = "overview" | "technical" | "interview" | "operations";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <InfoCircledIcon width={12} height={12} /> },
  { id: "technical", label: "Technical", icon: <CodeIcon width={12} height={12} /> },
  { id: "interview", label: "Interview", icon: <TargetIcon width={12} height={12} /> },
  { id: "operations", label: "Ops", icon: <GearIcon width={12} height={12} /> },
];

const MATURITY_CONFIG = {
  experimental: { color: "red" as const, label: "Experimental" },
  adopted: { color: "orange" as const, label: "Adopted" },
  stable: { color: "green" as const, label: "Stable" },
  mature: { color: "blue" as const, label: "Mature" },
  legacy: { color: "gray" as const, label: "Legacy" },
};

// ── Resolve data source ───────────────────────────────────────────────────────

const discovery = discoveryRaw as unknown as DiscoveryData;
const isDiscovered =
  Array.isArray(discovery.groups) && discovery.groups.length > 0;
const STACK: StackGroup[] = isDiscovered
  ? (discovery.groups as StackGroup[])
  : FALLBACK;

// ── Helpers ──────────────────────────────────────────────────────────────────

function countDeepFields(entry: StackEntry): number {
  let count = 0;
  if (entry.interview_points?.length) count += entry.interview_points.length;
  if (entry.facts?.length) count += entry.facts.length;
  if (entry.pros?.length) count += entry.pros.length;
  if (entry.cons?.length) count += entry.cons.length;
  if (entry.gotchas?.length) count += entry.gotchas.length;
  if (entry.code_snippets?.length) count += entry.code_snippets.length;
  if (entry.patterns_used?.length) count += entry.patterns_used.length;
  if (entry.security_considerations?.length)
    count += entry.security_considerations.length;
  if (entry.performance_notes?.length) count += entry.performance_notes.length;
  if (entry.ecosystem?.length) count += entry.ecosystem.length;
  if (entry.metrics?.length) count += entry.metrics.length;
  if (entry.learning_resources?.length) count += entry.learning_resources.length;
  if (entry.testing_approach?.length) count += entry.testing_approach.length;
  if (entry.real_incidents?.length) count += entry.real_incidents.length;
  return count;
}

// ── Section ──────────────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Flex direction="column" gap="1" mt="3">
      <Flex
        align="center"
        gap="2"
        style={{ cursor: "pointer", userSelect: "none" }}
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDownIcon width={12} height={12} style={{ color: "var(--gray-8)" }} />
        ) : (
          <ChevronRightIcon width={12} height={12} style={{ color: "var(--gray-8)" }} />
        )}
        {icon}
        <Text
          size="1"
          weight="medium"
          color="gray"
          style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
        >
          {title}
        </Text>
      </Flex>
      {open && <div style={{ marginTop: 4, marginLeft: 20 }}>{children}</div>}
    </Flex>
  );
}

// ── Code Snippet ─────────────────────────────────────────────────────────────

function CodeSnippetBlock({ snippet }: { snippet: CodeSnippet }) {
  return (
    <Flex direction="column" gap="1" mb="2">
      <Flex align="center" gap="2">
        <Text size="1" weight="medium">
          {snippet.title}
        </Text>
        {snippet.path && (
          <a
            href={`${GITHUB_BASE}/${snippet.path}${snippet.line ? `#L${snippet.line}` : ""}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--gray-9)", display: "flex" }}
          >
            <GitHubLogoIcon width={10} height={10} />
          </a>
        )}
      </Flex>
      {snippet.description && (
        <Text size="1" color="gray">
          {snippet.description}
        </Text>
      )}
      <pre
        style={{
          background: "var(--gray-3)",
          border: "1px solid var(--gray-6)",
          borderRadius: 6,
          padding: "10px 12px",
          fontSize: 11,
          lineHeight: 1.5,
          overflow: "auto",
          maxHeight: 200,
          fontFamily: "monospace",
          margin: 0,
        }}
      >
        <code>{snippet.code}</code>
      </pre>
    </Flex>
  );
}

// ── Incident Card ────────────────────────────────────────────────────────────

function IncidentCard({ incident }: { incident: Incident }) {
  const severityColor =
    incident.severity === "critical"
      ? "red"
      : incident.severity === "high"
        ? "orange"
        : incident.severity === "medium"
          ? "amber"
          : "gray";
  return (
    <Card
      style={{
        background: `var(--${severityColor}-2)`,
        border: `1px solid var(--${severityColor}-6)`,
      }}
    >
      <Flex direction="column" gap="1">
        <Flex align="center" gap="2">
          <ExclamationTriangleIcon
            width={12}
            height={12}
            style={{ color: `var(--${severityColor}-9)` }}
          />
          <Text size="2" weight="medium">
            {incident.summary}
          </Text>
          {incident.severity && (
            <Badge size="1" color={severityColor} variant="soft">
              {incident.severity}
            </Badge>
          )}
          {incident.date && (
            <Text size="1" color="gray">
              {incident.date}
            </Text>
          )}
        </Flex>
        <Text size="1" color="gray" style={{ lineHeight: 1.5, marginLeft: 20 }}>
          Resolution: {incident.resolution}
        </Text>
      </Flex>
    </Card>
  );
}

// ── Dependency Pills ─────────────────────────────────────────────────────────

function DependencyPills({
  label,
  items,
  color,
}: {
  label: string;
  items: string[];
  color: "blue" | "green";
}) {
  return (
    <Flex direction="column" gap="1">
      <Text
        size="1"
        weight="medium"
        color="gray"
        style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
      >
        {label}
      </Text>
      <Flex gap="1" wrap="wrap">
        {items.map((item) => (
          <Badge key={item} size="1" color={color} variant="outline">
            {item}
          </Badge>
        ))}
      </Flex>
    </Flex>
  );
}

// ── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ groups }: { groups: StackGroup[] }) {
  const totalEntries = groups.reduce((sum, g) => sum + g.entries.length, 0);
  const totalFacts = groups.reduce(
    (sum, g) =>
      sum + g.entries.reduce((s, e) => s + (e.facts?.length ?? 0), 0),
    0
  );
  const totalInterviewPts = groups.reduce(
    (sum, g) =>
      sum +
      g.entries.reduce((s, e) => s + (e.interview_points?.length ?? 0), 0),
    0
  );
  const totalSnippets = groups.reduce(
    (sum, g) =>
      sum +
      g.entries.reduce((s, e) => s + (e.code_snippets?.length ?? 0), 0),
    0
  );

  const stats = [
    { label: "Technologies", value: totalEntries },
    { label: "Groups", value: groups.length },
    { label: "Facts", value: totalFacts },
    { label: "Interview Pts", value: totalInterviewPts },
    ...(totalSnippets > 0
      ? [{ label: "Code Snippets", value: totalSnippets }]
      : []),
  ];

  return (
    <Flex gap="4" wrap="wrap" mb="4">
      {stats.map((stat) => (
        <Flex key={stat.label} direction="column" align="center" gap="0">
          <Text size="5" weight="bold" color="gray">
            {stat.value}
          </Text>
          <Text size="1" color="gray">
            {stat.label}
          </Text>
        </Flex>
      ))}
    </Flex>
  );
}

// ── Tab Content ──────────────────────────────────────────────────────────────

function OverviewTab({
  entry,
  color,
}: {
  entry: StackEntry;
  color: StackGroup["color"];
}) {
  const hasWhyChosen = !!entry.why_chosen;
  const hasPros = Array.isArray(entry.pros) && entry.pros.length > 0;
  const hasCons = Array.isArray(entry.cons) && entry.cons.length > 0;
  const hasAlternatives =
    Array.isArray(entry.alternatives_considered) &&
    entry.alternatives_considered.length > 0;
  const hasFacts = Array.isArray(entry.facts) && entry.facts.length > 0;
  const hasEcosystem =
    Array.isArray(entry.ecosystem) && entry.ecosystem.length > 0;
  const hasMetrics = Array.isArray(entry.metrics) && entry.metrics.length > 0;
  const hasDependsOn =
    Array.isArray(entry.depends_on) && entry.depends_on.length > 0;
  const hasDependedBy =
    Array.isArray(entry.depended_by) && entry.depended_by.length > 0;
  const hasLearning =
    Array.isArray(entry.learning_resources) &&
    entry.learning_resources.length > 0;
  const hasLocations =
    Array.isArray(entry.source_locations) && entry.source_locations.length > 0;

  return (
    <>
      <Text as="p" size="2" style={{ lineHeight: 1.65 }}>
        {entry.details}
      </Text>

      {entry.architecture_role && (
        <Card
          mt="3"
          style={{
            background: "var(--indigo-2)",
            border: "1px solid var(--indigo-6)",
          }}
        >
          <Flex align="start" gap="2">
            <MixerHorizontalIcon
              width={14}
              height={14}
              style={{ flexShrink: 0, marginTop: 2, color: "var(--indigo-9)" }}
            />
            <Flex direction="column" gap="0">
              <Text
                size="1"
                weight="medium"
                color="gray"
                style={{
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Architecture Role
              </Text>
              <Text as="p" size="2" mt="1" style={{ lineHeight: 1.6 }}>
                {entry.architecture_role}
              </Text>
            </Flex>
          </Flex>
        </Card>
      )}

      {hasWhyChosen && (
        <Card
          mt="3"
          style={{
            background: `var(--${color}-2)`,
            border: `1px solid var(--${color}-6)`,
          }}
        >
          <Text
            size="1"
            weight="medium"
            color="gray"
            style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
          >
            Why chosen
          </Text>
          <Text as="p" size="2" mt="1" style={{ lineHeight: 1.6 }}>
            {entry.why_chosen}
          </Text>
        </Card>
      )}

      {(hasPros || hasCons) && (
        <Section
          title="Pros & Cons"
          icon={
            <Flex gap="1">
              <CheckCircledIcon
                width={12}
                height={12}
                style={{ color: "var(--green-9)" }}
              />
              <CrossCircledIcon
                width={12}
                height={12}
                style={{ color: "var(--red-9)" }}
              />
            </Flex>
          }
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            {hasPros && (
              <Flex direction="column" gap="1">
                {entry.pros!.map((pro, i) => (
                  <Flex key={i} align="start" gap="2">
                    <Text
                      size="1"
                      style={{
                        flexShrink: 0,
                        marginTop: 2,
                        color: "var(--green-9)",
                      }}
                    >
                      +
                    </Text>
                    <Text size="2">{pro}</Text>
                  </Flex>
                ))}
              </Flex>
            )}
            {hasCons && (
              <Flex direction="column" gap="1">
                {entry.cons!.map((con, i) => (
                  <Flex key={i} align="start" gap="2">
                    <Text
                      size="1"
                      style={{
                        flexShrink: 0,
                        marginTop: 2,
                        color: "var(--red-9)",
                      }}
                    >
                      -
                    </Text>
                    <Text size="2">{con}</Text>
                  </Flex>
                ))}
              </Flex>
            )}
          </div>
        </Section>
      )}

      {hasAlternatives && (
        <Section title="Alternatives Considered" icon={<LinkBreak2Icon width={12} height={12} />}>
          <Flex direction="column" gap="2">
            {entry.alternatives_considered!.map((alt, i) => (
              <Flex key={i} direction="column" gap="0">
                <Text size="2" weight="medium">
                  {alt.name}
                </Text>
                <Text size="1" color="gray" style={{ lineHeight: 1.5 }}>
                  {alt.reason_not_chosen}
                </Text>
              </Flex>
            ))}
          </Flex>
        </Section>
      )}

      {hasMetrics && (
        <Section title="Metrics" icon={<RocketIcon width={12} height={12} />}>
          <Flex gap="3" wrap="wrap">
            {entry.metrics!.map((m, i) => (
              <Card key={i} style={{ minWidth: 100 }}>
                <Flex direction="column" align="center" gap="0">
                  <Text size="4" weight="bold" color={color}>
                    {m.value}
                    {m.unit && (
                      <Text size="1" color="gray">
                        {" "}
                        {m.unit}
                      </Text>
                    )}
                  </Text>
                  <Text size="1" color="gray">
                    {m.label}
                  </Text>
                </Flex>
              </Card>
            ))}
          </Flex>
        </Section>
      )}

      {(hasDependsOn || hasDependedBy) && (
        <Section title="Dependencies" icon={<LinkBreak2Icon width={12} height={12} />}>
          <Flex direction="column" gap="2">
            {hasDependsOn && (
              <DependencyPills
                label="Depends on"
                items={entry.depends_on!}
                color="blue"
              />
            )}
            {hasDependedBy && (
              <DependencyPills
                label="Used by"
                items={entry.depended_by!}
                color="green"
              />
            )}
          </Flex>
        </Section>
      )}

      {hasEcosystem && (
        <Section title="Ecosystem" icon={<RocketIcon width={12} height={12} />}>
          <Flex direction="column" gap="1">
            {entry.ecosystem!.map((pkg, i) => (
              <Flex key={i} align="center" gap="2">
                <Text size="2" weight="medium" style={{ minWidth: 120 }}>
                  {pkg.name}
                </Text>
                {pkg.version && (
                  <Badge size="1" variant="outline" color={color}>
                    {pkg.version}
                  </Badge>
                )}
                <Text size="1" color="gray">
                  {pkg.role}
                </Text>
              </Flex>
            ))}
          </Flex>
        </Section>
      )}

      {hasFacts && (
        <Section title="Discovered Facts" icon={<InfoCircledIcon width={12} height={12} />}>
          <Flex direction="column" gap="1">
            {entry.facts!.map((fact, i) => (
              <Flex key={i} align="start" gap="2">
                <Text
                  size="1"
                  color={color}
                  style={{ flexShrink: 0, marginTop: 2 }}
                >
                  ·
                </Text>
                <Text size="2">{fact}</Text>
              </Flex>
            ))}
          </Flex>
        </Section>
      )}

      {hasLearning && (
        <Section title="Learning Resources" icon={<BookmarkIcon width={12} height={12} />}>
          <Flex direction="column" gap="1">
            {entry.learning_resources!.map((res, i) => (
              <Flex key={i} align="center" gap="2">
                <Badge
                  size="1"
                  variant="outline"
                  color="gray"
                  style={{ minWidth: 50, textAlign: "center" }}
                >
                  {res.type}
                </Badge>
                <a
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent-9)", fontSize: 13 }}
                >
                  {res.title}
                </a>
              </Flex>
            ))}
          </Flex>
        </Section>
      )}

      {hasLocations && (
        <Section title="Source Locations" icon={<GitHubLogoIcon width={12} height={12} />}>
          <Flex direction="column" gap="1">
            {entry.source_locations!.map((loc, i) => {
              const href = `${GITHUB_BASE}/${loc.path}${loc.line ? `#L${loc.line}` : ""}`;
              return (
                <Flex key={i} align="start" gap="2">
                  <GitHubLogoIcon
                    width={12}
                    height={12}
                    style={{
                      flexShrink: 0,
                      marginTop: 3,
                      color: "var(--gray-9)",
                    }}
                  />
                  <Flex direction="column" gap="0">
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "var(--accent-9)",
                        fontFamily: "monospace",
                        fontSize: 12,
                      }}
                    >
                      {loc.path}
                      {loc.line ? `:${loc.line}` : ""}
                    </a>
                    <Text size="1" color="gray">
                      {loc.note}
                    </Text>
                  </Flex>
                </Flex>
              );
            })}
          </Flex>
        </Section>
      )}
    </>
  );
}

function TechnicalTab({
  entry,
  color,
}: {
  entry: StackEntry;
  color: StackGroup["color"];
}) {
  const hasPatterns =
    Array.isArray(entry.patterns_used) && entry.patterns_used.length > 0;
  const hasTradeOffs =
    Array.isArray(entry.trade_offs) && entry.trade_offs.length > 0;
  const hasSnippets =
    Array.isArray(entry.code_snippets) && entry.code_snippets.length > 0;
  const hasConfig =
    Array.isArray(entry.configuration_files) &&
    entry.configuration_files.length > 0;
  const hasVersionHistory =
    Array.isArray(entry.version_history) && entry.version_history.length > 0;
  const hasTesting =
    Array.isArray(entry.testing_approach) && entry.testing_approach.length > 0;
  const hasTags =
    Array.isArray(entry.category_tags) && entry.category_tags.length > 0;

  const hasContent =
    hasPatterns ||
    hasTradeOffs ||
    hasSnippets ||
    hasConfig ||
    hasVersionHistory ||
    hasTesting ||
    hasTags;

  if (!hasContent) {
    return (
      <Text size="2" color="gray" style={{ fontStyle: "italic" }}>
        No technical deep-dive data available yet. Run discovery to populate.
      </Text>
    );
  }

  return (
    <>
      {hasPatterns && (
        <Section title="Design Patterns" icon={<MixerHorizontalIcon width={12} height={12} />}>
          <Flex direction="column" gap="1">
            {entry.patterns_used!.map((p, i) => (
              <Flex key={i} align="start" gap="2">
                <Text
                  size="1"
                  color={color}
                  style={{ flexShrink: 0, marginTop: 2 }}
                >
                  ·
                </Text>
                <Text size="2">{p}</Text>
              </Flex>
            ))}
          </Flex>
        </Section>
      )}

      {hasTradeOffs && (
        <Section title="Trade-offs" icon={<LinkBreak2Icon width={12} height={12} />}>
          <Flex direction="column" gap="1">
            {entry.trade_offs!.map((t, i) => (
              <Flex key={i} align="start" gap="2">
                <Text
                  size="1"
                  color="gray"
                  style={{ flexShrink: 0, marginTop: 2 }}
                >
                  ·
                </Text>
                <Text size="2">{t}</Text>
              </Flex>
            ))}
          </Flex>
        </Section>
      )}

      {hasSnippets && (
        <Section title="Code Snippets" icon={<CodeIcon width={12} height={12} />}>
          {entry.code_snippets!.map((snippet, i) => (
            <CodeSnippetBlock key={i} snippet={snippet} />
          ))}
        </Section>
      )}

      {hasConfig && (
        <Section title="Configuration Files" icon={<GearIcon width={12} height={12} />}>
          <Flex direction="column" gap="1">
            {entry.configuration_files!.map((loc, i) => {
              const href = `${GITHUB_BASE}/${loc.path}${loc.line ? `#L${loc.line}` : ""}`;
              return (
                <Flex key={i} align="start" gap="2">
                  <GearIcon
                    width={12}
                    height={12}
                    style={{
                      flexShrink: 0,
                      marginTop: 3,
                      color: "var(--gray-9)",
                    }}
                  />
                  <Flex direction="column" gap="0">
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "var(--accent-9)",
                        fontFamily: "monospace",
                        fontSize: 12,
                      }}
                    >
                      {loc.path}
                    </a>
                    <Text size="1" color="gray">
                      {loc.note}
                    </Text>
                  </Flex>
                </Flex>
              );
            })}
          </Flex>
        </Section>
      )}

      {hasTesting && (
        <Section title="Testing Approach" icon={<CheckCircledIcon width={12} height={12} />}>
          <Flex direction="column" gap="1">
            {entry.testing_approach!.map((t, i) => (
              <Flex key={i} align="start" gap="2">
                <CheckCircledIcon
                  width={12}
                  height={12}
                  style={{
                    flexShrink: 0,
                    marginTop: 2,
                    color: "var(--green-9)",
                  }}
                />
                <Text size="2">{t}</Text>
              </Flex>
            ))}
          </Flex>
        </Section>
      )}

      {hasVersionHistory && (
        <Section
          title="Version History"
          icon={<CounterClockwiseClockIcon width={12} height={12} />}
        >
          <Flex direction="column" gap="1">
            {entry.version_history!.map((v, i) => (
              <Flex key={i} align="center" gap="2">
                <Badge size="1" variant="outline" color={color}>
                  {v.version}
                </Badge>
                {v.date && (
                  <Text size="1" color="gray">
                    {v.date}
                  </Text>
                )}
                <Text size="1">{v.note}</Text>
              </Flex>
            ))}
          </Flex>
        </Section>
      )}

      {hasTags && (
        <Flex gap="1" wrap="wrap" mt="3">
          {entry.category_tags!.map((tag) => (
            <Badge key={tag} size="1" variant="surface" color="gray">
              {tag}
            </Badge>
          ))}
        </Flex>
      )}
    </>
  );
}

function InterviewTab({
  entry,
  color,
}: {
  entry: StackEntry;
  color: StackGroup["color"];
}) {
  const hasInterviewPoints =
    Array.isArray(entry.interview_points) && entry.interview_points.length > 0;
  const hasGotchas =
    Array.isArray(entry.gotchas) && entry.gotchas.length > 0;

  if (!hasInterviewPoints && !hasGotchas) {
    return (
      <Text size="2" color="gray" style={{ fontStyle: "italic" }}>
        No interview prep data available yet. Run discovery to populate.
      </Text>
    );
  }

  return (
    <>
      {hasInterviewPoints && (
        <Section title="Talking Points" icon={<TargetIcon width={12} height={12} />}>
          <Flex direction="column" gap="3">
            {entry.interview_points!.map((point, i) => (
              <Card key={i}>
                <Flex align="start" gap="2">
                  <Text
                    size="1"
                    weight="bold"
                    color={color}
                    style={{
                      flexShrink: 0,
                      marginTop: 1,
                      fontFamily: "monospace",
                      width: 20,
                      textAlign: "right",
                    }}
                  >
                    {i + 1}.
                  </Text>
                  <Text size="2" style={{ lineHeight: 1.6 }}>
                    {point}
                  </Text>
                </Flex>
              </Card>
            ))}
          </Flex>
        </Section>
      )}

      {hasGotchas && (
        <Section
          title="Gotchas & Pitfalls"
          icon={
            <ExclamationTriangleIcon
              width={12}
              height={12}
              style={{ color: "var(--amber-9)" }}
            />
          }
        >
          <Flex direction="column" gap="1">
            {entry.gotchas!.map((g, i) => (
              <Flex key={i} align="start" gap="2">
                <ExclamationTriangleIcon
                  width={12}
                  height={12}
                  style={{
                    flexShrink: 0,
                    marginTop: 3,
                    color: "var(--amber-9)",
                  }}
                />
                <Text size="2">{g}</Text>
              </Flex>
            ))}
          </Flex>
        </Section>
      )}
    </>
  );
}

function OperationsTab({
  entry,
  color,
}: {
  entry: StackEntry;
  color: StackGroup["color"];
}) {
  const hasSecurity =
    Array.isArray(entry.security_considerations) &&
    entry.security_considerations.length > 0;
  const hasPerf =
    Array.isArray(entry.performance_notes) &&
    entry.performance_notes.length > 0;
  const hasIncidents =
    Array.isArray(entry.real_incidents) && entry.real_incidents.length > 0;

  if (!hasSecurity && !hasPerf && !hasIncidents) {
    return (
      <Text size="2" color="gray" style={{ fontStyle: "italic" }}>
        No operational data available yet. Run discovery to populate.
      </Text>
    );
  }

  return (
    <>
      {hasSecurity && (
        <Section
          title="Security"
          icon={
            <LockClosedIcon
              width={12}
              height={12}
              style={{ color: "var(--red-9)" }}
            />
          }
        >
          <Flex direction="column" gap="1">
            {entry.security_considerations!.map((s, i) => (
              <Flex key={i} align="start" gap="2">
                <LockClosedIcon
                  width={12}
                  height={12}
                  style={{
                    flexShrink: 0,
                    marginTop: 3,
                    color: "var(--red-9)",
                  }}
                />
                <Text size="2">{s}</Text>
              </Flex>
            ))}
          </Flex>
        </Section>
      )}

      {hasPerf && (
        <Section
          title="Performance"
          icon={
            <LightningBoltIcon
              width={12}
              height={12}
              style={{ color: "var(--blue-9)" }}
            />
          }
        >
          <Flex direction="column" gap="1">
            {entry.performance_notes!.map((p, i) => (
              <Flex key={i} align="start" gap="2">
                <LightningBoltIcon
                  width={12}
                  height={12}
                  style={{
                    flexShrink: 0,
                    marginTop: 3,
                    color: "var(--blue-9)",
                  }}
                />
                <Text size="2">{p}</Text>
              </Flex>
            ))}
          </Flex>
        </Section>
      )}

      {hasIncidents && (
        <Section
          title="Past Incidents"
          icon={
            <ExclamationTriangleIcon
              width={12}
              height={12}
              style={{ color: "var(--red-9)" }}
            />
          }
        >
          <Flex direction="column" gap="2">
            {entry.real_incidents!.map((incident, i) => (
              <IncidentCard key={i} incident={incident} />
            ))}
          </Flex>
        </Section>
      )}
    </>
  );
}

// ── Entry Modal ──────────────────────────────────────────────────────────────

function EntryModal({
  entry,
  color,
  isAdmin,
  onDelete,
}: {
  entry: StackEntry;
  color: StackGroup["color"];
  isAdmin: boolean;
  onDelete: () => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const depth = countDeepFields(entry);

  const maturityConfig = entry.maturity
    ? MATURITY_CONFIG[entry.maturity]
    : null;

  const badgeParts: string[] = [];
  if (entry.interview_points?.length)
    badgeParts.push(`${entry.interview_points.length} interview pts`);
  if (entry.code_snippets?.length)
    badgeParts.push(`${entry.code_snippets.length} snippets`);
  if (entry.facts?.length) badgeParts.push(`${entry.facts.length} facts`);
  const badgeText = badgeParts.length > 0 ? badgeParts.join(" · ") : `${depth} items`;

  return (
    <Flex align="center" gap="2">
      <Dialog.Root>
        <Dialog.Trigger style={{ flex: 1, width: "100%" }}>
          <Card style={{ cursor: "pointer" }}>
            <Flex justify="between" align="center" gap="4">
              <Flex direction="column" gap="1">
                <Flex align="center" gap="2">
                  <Text size="2" weight="medium">
                    {entry.name}
                  </Text>
                  {entry.version && (
                    <Badge size="1" variant="outline" color={color}>
                      {entry.version}
                    </Badge>
                  )}
                  {maturityConfig && (
                    <Tooltip content={`Maturity: ${maturityConfig.label}`}>
                      <Badge
                        size="1"
                        variant="soft"
                        color={maturityConfig.color}
                      >
                        {maturityConfig.label}
                      </Badge>
                    </Tooltip>
                  )}
                  {entry.adoption_date && (
                    <Text size="1" color="gray" style={{ fontFamily: "monospace" }}>
                      since {entry.adoption_date}
                    </Text>
                  )}
                </Flex>
                <Text size="1" color="gray">
                  {entry.role}
                </Text>
              </Flex>
              <Flex align="center" gap="2">
                {entry.category_tags && entry.category_tags.length > 0 && (
                  <Flex gap="1" style={{ display: "none" }}>
                    {entry.category_tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} size="1" variant="surface" color="gray">
                        {tag}
                      </Badge>
                    ))}
                  </Flex>
                )}
                <Badge
                  color={color}
                  variant="soft"
                  size="1"
                  style={{ flexShrink: 0 }}
                >
                  {badgeText}
                </Badge>
              </Flex>
            </Flex>
          </Card>
        </Dialog.Trigger>

        <Dialog.Content maxWidth="960px">
          {/* Header */}
          <Dialog.Title>
            <Flex align="center" gap="2" wrap="wrap">
              {entry.name}
              {entry.version && (
                <Badge size="1" variant="soft" color={color}>
                  {entry.version}
                </Badge>
              )}
              {maturityConfig && (
                <Badge size="1" variant="soft" color={maturityConfig.color}>
                  {maturityConfig.label}
                </Badge>
              )}
              {entry.url && (
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--gray-9)", display: "flex" }}
                >
                  <ExternalLinkIcon width={14} height={14} />
                </a>
              )}
            </Flex>
          </Dialog.Title>

          <Dialog.Description>
            <Flex align="center" gap="2">
              <Text size="2" color="gray">
                {entry.role}
              </Text>
              {entry.adoption_date && (
                <Text size="1" color="gray" style={{ fontFamily: "monospace" }}>
                  · adopted {entry.adoption_date}
                </Text>
              )}
            </Flex>
          </Dialog.Description>

          {/* Dependency pills (always visible in header) */}
          {((entry.depends_on && entry.depends_on.length > 0) ||
            (entry.depended_by && entry.depended_by.length > 0)) && (
            <Flex gap="3" mt="2" wrap="wrap">
              {entry.depends_on && entry.depends_on.length > 0 && (
                <Flex align="center" gap="1">
                  <Text size="1" color="gray">
                    depends on:
                  </Text>
                  {entry.depends_on.map((d) => (
                    <Badge key={d} size="1" variant="outline" color="blue">
                      {d}
                    </Badge>
                  ))}
                </Flex>
              )}
              {entry.depended_by && entry.depended_by.length > 0 && (
                <Flex align="center" gap="1">
                  <Text size="1" color="gray">
                    used by:
                  </Text>
                  {entry.depended_by.map((d) => (
                    <Badge key={d} size="1" variant="outline" color="green">
                      {d}
                    </Badge>
                  ))}
                </Flex>
              )}
            </Flex>
          )}

          {/* Tabs */}
          <Flex gap="1" mt="3" mb="3" style={{ borderBottom: "1px solid var(--gray-6)" }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 12px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  color:
                    activeTab === tab.id
                      ? `var(--${color}-9)`
                      : "var(--gray-9)",
                  borderBottom:
                    activeTab === tab.id
                      ? `2px solid var(--${color}-9)`
                      : "2px solid transparent",
                  marginBottom: -1,
                  transition: "all 0.15s ease",
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </Flex>

          {/* Tab content */}
          <div style={{ minHeight: 200, maxHeight: "60vh", overflowY: "auto" }}>
            {activeTab === "overview" && (
              <OverviewTab entry={entry} color={color} />
            )}
            {activeTab === "technical" && (
              <TechnicalTab entry={entry} color={color} />
            )}
            {activeTab === "interview" && (
              <InterviewTab entry={entry} color={color} />
            )}
            {activeTab === "operations" && (
              <OperationsTab entry={entry} color={color} />
            )}
          </div>

          <Flex justify="end" mt="4">
            <Dialog.Close>
              <Badge color={color} variant="soft" style={{ cursor: "pointer" }}>
                Close
              </Badge>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
      {isAdmin && (
        <button
          onClick={onDelete}
          title="Delete entry"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--red-9)",
            padding: "6px",
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <TrashIcon width={14} height={14} />
        </button>
      )}
    </Flex>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StackPage() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [deleteStackEntry] = useDeleteStackEntryMutation();
  const [search, setSearch] = useState("");

  const stack = useMemo(() => {
    const q = search.toLowerCase().trim();
    return STACK.map((g) => ({
      ...g,
      entries: g.entries.filter((e) => {
        if (deleted.has(e.name)) return false;
        if (!q) return true;
        return (
          e.name.toLowerCase().includes(q) ||
          e.role.toLowerCase().includes(q) ||
          e.details.toLowerCase().includes(q) ||
          g.label.toLowerCase().includes(q) ||
          (e.category_tags ?? []).some((t) => t.toLowerCase().includes(q))
        );
      }),
    })).filter((g) => g.entries.length > 0);
  }, [deleted, search]);

  const handleDelete = useCallback(
    async (name: string) => {
      setDeleted((prev) => new Set(prev).add(name));
      await deleteStackEntry({ variables: { name } });
    },
    [deleteStackEntry]
  );

  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      {/* Header */}
      <Flex align="center" gap="2" mb="2">
        <LayersIcon
          width={22}
          height={22}
          style={{ color: "var(--violet-9)" }}
        />
        <Heading size="7">Stack</Heading>
        {isDiscovered && (
          <Badge
            variant="soft"
            color="green"
            size="1"
            style={{ marginLeft: 4 }}
          >
            <UpdateIcon width={10} height={10} style={{ marginRight: 3 }} />
            auto-discovered
          </Badge>
        )}
      </Flex>

      <Flex align="center" gap="3" mb="4">
        <Text color="gray" size="2">
          {isDiscovered
            ? (discovery.generated_at ?? "")
            : "Technologies and services powering this platform. Click any entry for deep-dive details."}
        </Text>
        <a
          href="https://github.com/nicolad/nomadically.work"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--gray-9)", display: "flex", alignItems: "center" }}
        >
          <GitHubLogoIcon width={16} height={16} />
        </a>
      </Flex>

      {/* Stats */}
      <StatsBar groups={stack} />

      <Separator size="4" mb="4" />

      {/* Search */}
      <Flex mb="4">
        <TextField.Root
          placeholder="Search technologies, roles, tags..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          size="2"
          style={{ width: "100%" }}
        >
          <TextField.Slot>
            <MagnifyingGlassIcon width={14} height={14} />
          </TextField.Slot>
        </TextField.Root>
      </Flex>

      {/* Groups */}
      <Flex direction="column" gap="6">
        {stack.map((group) => (
          <div key={group.label}>
            <Flex align="center" gap="2" mb="3">
              <Heading size="4">{group.label}</Heading>
              <Badge color={group.color} variant="soft" size="1">
                {group.entries.length}
              </Badge>
            </Flex>
            <Flex direction="column" gap="2">
              {group.entries.map((entry) => (
                <EntryModal
                  key={entry.name}
                  entry={entry}
                  color={group.color}
                  isAdmin={isAdmin}
                  onDelete={() => handleDelete(entry.name)}
                />
              ))}
            </Flex>
          </div>
        ))}
      </Flex>

      {stack.length === 0 && search && (
        <Flex justify="center" mt="6">
          <Text size="2" color="gray">
            No technologies match &quot;{search}&quot;
          </Text>
        </Flex>
      )}

      {!isDiscovered && (
        <Text size="1" color="gray" mt="6" as="p">
          Run{" "}
          <Text size="1" style={{ fontFamily: "monospace" }}>
            cd crates/agentic-search && cargo run -- discover --root ../..
            --output ../../src/app/stack/discovery.json
          </Text>{" "}
          to populate this page with live codebase data.
        </Text>
      )}
    </Container>
  );
}
