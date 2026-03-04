"use client";

// Local-only page. Run `pnpm stack:discover` to populate discovery.json.
// Not linked from the sidebar in production (see sidebar.tsx IS_DEV guard).

import { useMemo, useState } from "react";
import { Badge, Card, Container, Dialog, Flex, Heading, Text } from "@radix-ui/themes";
import { LayersIcon, ExternalLinkIcon, UpdateIcon, GitHubLogoIcon, TrashIcon } from "@radix-ui/react-icons";
import discoveryRaw from "./discovery.json";
import type { StackEntry, StackGroup, DiscoveryData } from "./types";
import { FALLBACK } from "./fallback-data";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { useDeleteStackEntryMutation } from "@/__generated__/hooks";

// ── Constants ────────────────────────────────────────────────────────────────

const GITHUB_BASE = "https://github.com/nicolad/nomadically.work/blob/main";

// ── Resolve data source ───────────────────────────────────────────────────────

const discovery = discoveryRaw as unknown as DiscoveryData;
const isDiscovered = Array.isArray(discovery.groups) && discovery.groups.length > 0;
const STACK: StackGroup[] = isDiscovered ? (discovery.groups as StackGroup[]) : FALLBACK;

// ── Section ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Flex direction="column" gap="1" mt="4">
      <Text size="1" weight="medium" color="gray" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {title}
      </Text>
      <div style={{ marginTop: 4 }}>{children}</div>
    </Flex>
  );
}

// ── Components ────────────────────────────────────────────────────────────────

function EntryModal({ entry, color, isAdmin, onDelete }: {
  entry: StackEntry;
  color: StackGroup["color"];
  isAdmin: boolean;
  onDelete: () => void;
}) {
  const hasFacts = Array.isArray(entry.facts) && entry.facts.length > 0;
  const hasLocations = Array.isArray(entry.source_locations) && entry.source_locations.length > 0;
  const hasWhyChosen = !!entry.why_chosen;
  const hasInterviewPoints = Array.isArray(entry.interview_points) && entry.interview_points.length > 0;
  const hasPros = Array.isArray(entry.pros) && entry.pros.length > 0;
  const hasCons = Array.isArray(entry.cons) && entry.cons.length > 0;
  const hasAlternatives = Array.isArray(entry.alternatives_considered) && entry.alternatives_considered.length > 0;
  const hasTradeOffs = Array.isArray(entry.trade_offs) && entry.trade_offs.length > 0;
  const hasPatterns = Array.isArray(entry.patterns_used) && entry.patterns_used.length > 0;
  const hasGotchas = Array.isArray(entry.gotchas) && entry.gotchas.length > 0;
  const hasSecurity = Array.isArray(entry.security_considerations) && entry.security_considerations.length > 0;
  const hasPerf = Array.isArray(entry.performance_notes) && entry.performance_notes.length > 0;

  const badgeText = hasInterviewPoints
    ? `${entry.interview_points!.length} interview pts`
    : hasFacts
      ? `${entry.facts!.length} facts`
      : "details";

  return (
    <Flex align="center" gap="2">
      <Dialog.Root>
        <Dialog.Trigger style={{ flex: 1, width: "100%" }}>
          <Card style={{ cursor: "pointer" }}>
            <Flex justify="between" align="center" gap="4">
              <Flex direction="column" gap="1">
                <Flex align="center" gap="2">
                  <Text size="2" weight="medium">{entry.name}</Text>
                  {entry.version && (
                    <Badge size="1" variant="outline" color={color}>{entry.version}</Badge>
                  )}
                </Flex>
                <Text size="1" color="gray">{entry.role}</Text>
              </Flex>
              <Badge color={color} variant="soft" size="1" style={{ flexShrink: 0 }}>
                {badgeText}
              </Badge>
            </Flex>
          </Card>
        </Dialog.Trigger>

        <Dialog.Content maxWidth="900px">
          <Dialog.Title>
            <Flex align="center" gap="2" wrap="wrap">
              {entry.name}
              {entry.version && (
                <Badge size="1" variant="soft" color={color}>{entry.version}</Badge>
              )}
              {entry.url && (
                <a href={entry.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gray-9)", display: "flex" }}>
                  <ExternalLinkIcon width={14} height={14} />
                </a>
              )}
            </Flex>
          </Dialog.Title>

          <Dialog.Description>
            <Text size="2" color="gray">{entry.role}</Text>
          </Dialog.Description>

          <Text as="p" size="2" mt="3" style={{ lineHeight: 1.65 }}>
            {entry.details}
          </Text>

          {hasWhyChosen && (
            <Card mt="4" style={{ background: `var(--${color}-2)`, border: `1px solid var(--${color}-6)` }}>
              <Text size="1" weight="medium" color="gray" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Why chosen
              </Text>
              <Text as="p" size="2" mt="1" style={{ lineHeight: 1.6 }}>
                {entry.why_chosen}
              </Text>
            </Card>
          )}

          {hasInterviewPoints && (
            <Section title="Interview Talking Points">
              <Flex direction="column" gap="2">
                {entry.interview_points!.map((point, i) => (
                  <Flex key={i} align="start" gap="2">
                    <Text size="1" weight="medium" color={color} style={{ flexShrink: 0, marginTop: 2, fontFamily: "monospace" }}>
                      {i + 1}.
                    </Text>
                    <Text size="2" style={{ lineHeight: 1.55 }}>{point}</Text>
                  </Flex>
                ))}
              </Flex>
            </Section>
          )}

          {(hasPros || hasCons) && (
            <Section title="Pros & Cons">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {hasPros && (
                  <Flex direction="column" gap="1">
                    {entry.pros!.map((pro, i) => (
                      <Flex key={i} align="start" gap="2">
                        <Text size="1" style={{ flexShrink: 0, marginTop: 2, color: "var(--green-9)" }}>+</Text>
                        <Text size="2">{pro}</Text>
                      </Flex>
                    ))}
                  </Flex>
                )}
                {hasCons && (
                  <Flex direction="column" gap="1">
                    {entry.cons!.map((con, i) => (
                      <Flex key={i} align="start" gap="2">
                        <Text size="1" style={{ flexShrink: 0, marginTop: 2, color: "var(--red-9)" }}>-</Text>
                        <Text size="2">{con}</Text>
                      </Flex>
                    ))}
                  </Flex>
                )}
              </div>
            </Section>
          )}

          {hasAlternatives && (
            <Section title="Alternatives Considered">
              <Flex direction="column" gap="2">
                {entry.alternatives_considered!.map((alt, i) => (
                  <Flex key={i} direction="column" gap="0">
                    <Text size="2" weight="medium">{alt.name}</Text>
                    <Text size="1" color="gray" style={{ lineHeight: 1.5 }}>{alt.reason_not_chosen}</Text>
                  </Flex>
                ))}
              </Flex>
            </Section>
          )}

          {hasTradeOffs && (
            <Section title="Trade-offs">
              <Flex direction="column" gap="1">
                {entry.trade_offs!.map((t, i) => (
                  <Flex key={i} align="start" gap="2">
                    <Text size="1" color="gray" style={{ flexShrink: 0, marginTop: 2 }}>·</Text>
                    <Text size="2">{t}</Text>
                  </Flex>
                ))}
              </Flex>
            </Section>
          )}

          {hasPatterns && (
            <Section title="Design Patterns">
              <Flex direction="column" gap="1">
                {entry.patterns_used!.map((p, i) => (
                  <Flex key={i} align="start" gap="2">
                    <Text size="1" color={color} style={{ flexShrink: 0, marginTop: 2 }}>·</Text>
                    <Text size="2">{p}</Text>
                  </Flex>
                ))}
              </Flex>
            </Section>
          )}

          {hasGotchas && (
            <Section title="Gotchas">
              <Flex direction="column" gap="1">
                {entry.gotchas!.map((g, i) => (
                  <Flex key={i} align="start" gap="2">
                    <Text size="1" style={{ flexShrink: 0, marginTop: 2, color: "var(--amber-9)" }}>!</Text>
                    <Text size="2">{g}</Text>
                  </Flex>
                ))}
              </Flex>
            </Section>
          )}

          {hasSecurity && (
            <Section title="Security">
              <Flex direction="column" gap="1">
                {entry.security_considerations!.map((s, i) => (
                  <Flex key={i} align="start" gap="2">
                    <Text size="1" style={{ flexShrink: 0, marginTop: 2, color: "var(--red-9)" }}>·</Text>
                    <Text size="2">{s}</Text>
                  </Flex>
                ))}
              </Flex>
            </Section>
          )}

          {hasPerf && (
            <Section title="Performance">
              <Flex direction="column" gap="1">
                {entry.performance_notes!.map((p, i) => (
                  <Flex key={i} align="start" gap="2">
                    <Text size="1" style={{ flexShrink: 0, marginTop: 2, color: "var(--blue-9)" }}>·</Text>
                    <Text size="2">{p}</Text>
                  </Flex>
                ))}
              </Flex>
            </Section>
          )}

          {hasFacts && (
            <Section title="Discovered Facts">
              <Flex direction="column" gap="1">
                {entry.facts!.map((fact, i) => (
                  <Flex key={i} align="start" gap="2">
                    <Text size="1" color={color} style={{ flexShrink: 0, marginTop: 2 }}>·</Text>
                    <Text size="2">{fact}</Text>
                  </Flex>
                ))}
              </Flex>
            </Section>
          )}

          {hasLocations && (
            <Section title="Source Locations">
              <Flex direction="column" gap="1">
                {entry.source_locations!.map((loc, i) => {
                  const href = `${GITHUB_BASE}/${loc.path}${loc.line ? `#L${loc.line}` : ""}`;
                  return (
                    <Flex key={i} align="start" gap="2">
                      <GitHubLogoIcon width={12} height={12} style={{ flexShrink: 0, marginTop: 3, color: "var(--gray-9)" }} />
                      <Flex direction="column" gap="0">
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--accent-9)", fontFamily: "monospace", fontSize: 12 }}
                        >
                          {loc.path}{loc.line ? `:${loc.line}` : ""}
                        </a>
                        <Text size="1" color="gray">{loc.note}</Text>
                      </Flex>
                    </Flex>
                  );
                })}
              </Flex>
            </Section>
          )}

          <Flex justify="end" mt="4">
            <Dialog.Close>
              <Badge color={color} variant="soft" style={{ cursor: "pointer" }}>Close</Badge>
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

  const stack = useMemo(
    () =>
      STACK.map((g) => ({ ...g, entries: g.entries.filter((e) => !deleted.has(e.name)) })).filter(
        (g) => g.entries.length > 0
      ),
    [deleted]
  );

  async function handleDelete(name: string) {
    setDeleted((prev) => new Set(prev).add(name));
    await deleteStackEntry({ variables: { name } });
  }

  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      <Flex align="center" gap="2" mb="2">
        <LayersIcon width={22} height={22} style={{ color: "var(--violet-9)" }} />
        <Heading size="7">Stack</Heading>
        {isDiscovered && (
          <Badge variant="soft" color="green" size="1" style={{ marginLeft: 4 }}>
            <UpdateIcon width={10} height={10} style={{ marginRight: 3 }} />
            auto-discovered
          </Badge>
        )}
      </Flex>

      <Flex align="center" gap="3" mb="6">
        <Text color="gray" size="2">
          {isDiscovered
            ? (discovery.generated_at ?? "")
            : "Technologies and services powering this platform. Click any entry for usage details."}
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

      <Flex direction="column" gap="6">
        {stack.map((group) => (
          <div key={group.label}>
            <Flex align="center" gap="2" mb="3">
              <Heading size="4">{group.label}</Heading>
              <Badge color={group.color} variant="soft" size="1">{group.entries.length}</Badge>
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

      {!isDiscovered && (
        <Text size="1" color="gray" mt="6" as="p">
          Run{" "}
          <Text size="1" style={{ fontFamily: "monospace" }}>
            cd crates/agentic-search && cargo run -- discover --root ../.. --output ../../src/app/stack/discovery.json
          </Text>{" "}
          to populate this page with live codebase data.
        </Text>
      )}
    </Container>
  );
}
