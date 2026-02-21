"use client";

import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import {
  useGetCompanyQuery,
  useEnhanceCompanyMutation,
  useGetJobsQuery,
} from "@/__generated__/hooks";
import Link from "next/link";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { extractJobSlug } from "@/lib/job-utils";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Container,
  Flex,
  Heading,
  Link as RadixLink,
  Separator,
  Strong,
  Text,
} from "@radix-ui/themes";
import {
  ExternalLinkIcon,
  GlobeIcon,
  InfoCircledIcon,
  MagicWandIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@radix-ui/react-icons";

type Props = {
  companyKey: string;
};

function coerceExternalUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

function prettyUrl(raw?: string | null): string {
  if (!raw) return "";
  return raw.trim().replace(/^https?:\/\//i, "").replace(/\/+$/g, "");
}

function initialsFromName(name?: string | null): string {
  const safe = (name ?? "").trim();
  if (!safe) return "CO";
  const parts = safe.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function SectionCard({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <Card>
      <Box p="4">
        <Flex align="center" justify="between" gap="3">
          <Text
            size="2"
            color="gray"
            style={{ fontWeight: 600, letterSpacing: 0.2 }}
          >
            {title}
          </Text>
          {right}
        </Flex>
        <Box mt="3">{children}</Box>
      </Box>
    </Card>
  );
}

function Chip({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <Badge
      color="gray"
      variant="surface"
      title={title}
      style={{
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </Badge>
  );
}

function CollapsibleChips({
  items,
  visibleCount = 8,
}: {
  items: string[];
  visibleCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const normalized = useMemo(
    () => items.map((x) => x.trim()).filter(Boolean),
    [items]
  );

  const canCollapse = normalized.length > visibleCount;
  const shown = expanded ? normalized : normalized.slice(0, visibleCount);

  return (
    <Box>
      <Flex gap="2" wrap="wrap">
        {shown.map((item) => (
          <Chip key={item} title={item}>
            {item}
          </Chip>
        ))}
      </Flex>

      {canCollapse && (
        <Box mt="3">
          <Button
            type="button"
            size="2"
            variant="ghost"
            color="gray"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <>
                <ChevronUpIcon /> Show less
              </>
            ) : (
              <>
                <ChevronDownIcon /> Show more ({normalized.length - visibleCount})
              </>
            )}
          </Button>
        </Box>
      )}
    </Box>
  );
}

function CollapsibleList({
  items,
  visibleCount = 7,
}: {
  items: string[];
  visibleCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const normalized = useMemo(
    () => items.map((x) => x.trim()).filter(Boolean),
    [items]
  );

  const canCollapse = normalized.length > visibleCount;
  const shown = expanded ? normalized : normalized.slice(0, visibleCount);

  return (
    <Box>
      <Flex direction="column" gap="2">
        {shown.map((item) => (
          <Text key={item} size="2" color="gray">
            • {item}
          </Text>
        ))}
      </Flex>

      {canCollapse && (
        <Box mt="3">
          <Button
            type="button"
            size="2"
            variant="ghost"
            color="gray"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <>
                <ChevronUpIcon /> Show less
              </>
            ) : (
              <>
                <ChevronDownIcon /> Show more ({normalized.length - visibleCount})
              </>
            )}
          </Button>
        </Box>
      )}
    </Box>
  );
}

function formatScore(score?: number | null): string {
  if (typeof score !== "number" || !Number.isFinite(score)) return "—";
  return score.toFixed(2);
}

type KeyFactsCardProps = {
  canonicalDomain?: string | null;
  score?: number | null;
  careerPagesCount?: number | null;
};

function KeyFactsCard({
  canonicalDomain,
  score,
  careerPagesCount,
}: KeyFactsCardProps) {
  const domainHref = useMemo(
    () => coerceExternalUrl(canonicalDomain),
    [canonicalDomain]
  );
  const domainLabel = useMemo(
    () => prettyUrl(canonicalDomain),
    [canonicalDomain]
  );

  const rows: Array<{
    label: string;
    value: React.ReactNode;
  }> = [
    {
      label: "Domain",
      value: canonicalDomain ? (
        domainHref ? (
          <RadixLink
            href={domainHref}
            target="_blank"
            rel="noopener noreferrer"
            color="gray"
            title={domainHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {domainLabel}
            <ExternalLinkIcon />
          </RadixLink>
        ) : (
          <Text
            size="2"
            style={{
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={domainLabel}
          >
            {domainLabel}
          </Text>
        )
      ) : (
        <Text size="2">—</Text>
      ),
    },
    {
      label: "Score",
      value: (
        <Text size="2" style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatScore(score)}
        </Text>
      ),
    },
    {
      label: "Career pages",
      value: (
        <Text size="2" style={{ fontVariantNumeric: "tabular-nums" }}>
          {typeof careerPagesCount === "number" && Number.isFinite(careerPagesCount)
            ? careerPagesCount
            : 0}
        </Text>
      ),
    },
  ];

  return (
    <Card>
      {/* tighter padding to reduce "empty space" */}
      <Box p="3">
        <Text
          size="1"
          color="gray"
          style={{
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Key facts
        </Text>

        <Box mt="3">
          {rows.map((row, idx) => (
            <Box key={row.label}>
              <Flex
                direction={{ initial: "column", sm: "row" }}
                align={{ initial: "start", sm: "center" }}
                justify="between"
                gap="1"
                style={{ minWidth: 0, padding: "6px 0" }}
              >
                <Text size="1" color="gray">
                  {row.label}
                </Text>

                {/* right-aligned value, ellipsis-safe */}
                <Box
                  style={{
                    minWidth: 0,
                    maxWidth: "100%",
                    textAlign: "right",
                  }}
                >
                  {row.value}
                </Box>
              </Flex>

              {idx < rows.length - 1 ? (
                <Separator size="4" my="1" />
              ) : null}
            </Box>
          ))}
        </Box>
      </Box>
    </Card>
  );
}

export function CompanyDetail({ companyKey }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [enhanceSuccess, setEnhanceSuccess] = useState<string | null>(null);

  const { loading, error, data, refetch } = useGetCompanyQuery({
    variables: { key: companyKey },
    fetchPolicy: "cache-and-network",
  });

  const [enhanceCompany, { loading: isEnhancing }] = useEnhanceCompanyMutation({
    onCompleted: async () => {
      setEnhanceError(null);
      setEnhanceSuccess("Company enhanced successfully.");
      await refetch();
    },
    onError: (err) => {
      setEnhanceSuccess(null);
      setEnhanceError(err.message || "Enhancement failed.");
    },
  });

  const company = data?.company ?? null;

  const { data: jobsData } = useGetJobsQuery({
    variables: { search: companyKey, limit: 100, status: "active" },
  });
  const companyJobs = jobsData?.jobs?.jobs ?? [];

  const websiteHref = useMemo(
    () => coerceExternalUrl(company?.website),
    [company?.website]
  );
  const websiteLabel = useMemo(
    () => prettyUrl(company?.website),
    [company?.website]
  );

  const scoreText = useMemo(() => {
    const v = company?.score;
    return typeof v === "number" && Number.isFinite(v) ? v.toFixed(2) : "—";
  }, [company?.score]);

  const handleEnhance = useCallback(async () => {
    if (!company) return;

    setEnhanceError(null);
    setEnhanceSuccess(null);

    try {
      await enhanceCompany({
        variables: { id: company.id, key: company.key },
      });
    } catch (e) {
      console.error("Enhancement error:", e);
    }
  }, [company, enhanceCompany]);

  if (loading) {
    return (
      <Container size="3" p={{ initial: "4", md: "6" }}>
        <Text color="gray">Loading company details…</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="3" p={{ initial: "4", md: "6" }}>
        <Callout.Root color="red">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            <Strong>Error loading company:</Strong> {error.message}
          </Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  if (!company) {
    return (
      <Container size="3" p={{ initial: "4", md: "6" }}>
        <Callout.Root>
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>Company not found.</Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      <Flex direction="column" gap="5">
        {/* Alerts */}
        {enhanceError && (
          <Callout.Root color="red">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              <Strong>Enhancement error:</Strong> {enhanceError}
            </Callout.Text>
          </Callout.Root>
        )}

        {enhanceSuccess && (
          <Callout.Root color="green">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>{enhanceSuccess}</Callout.Text>
          </Callout.Root>
        )}

        {/* Header */}
        <Flex
          direction={{ initial: "column", sm: "row" }}
          gap="4"
          align={{ initial: "start", sm: "center" }}
          justify="between"
        >
          <Flex gap="4" align="start" style={{ flex: 1, minWidth: 0 }}>
            <Avatar
              size="8"
              src={company.logo_url || undefined}
              fallback={initialsFromName(company.name)}
              radius="large"
            />

            <Box style={{ flex: 1, minWidth: 0 }}>
              <Heading size="8" style={{ lineHeight: 1.1 }}>
                {company.name}
              </Heading>

              <Flex align="center" gap="3" mt="2" wrap="wrap">
                {websiteHref && (
                  <Flex align="center" gap="2" style={{ minWidth: 0 }}>
                    <GlobeIcon />
                    <RadixLink
                      href={websiteHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="gray"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        minWidth: 0,
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={websiteHref}
                    >
                      {websiteLabel || websiteHref}
                      <ExternalLinkIcon />
                    </RadixLink>
                  </Flex>
                )}

                <Text size="2" color="gray">
                  •
                </Text>

                <Text size="2" color="gray">
                  Score <Strong>{scoreText}</Strong>
                </Text>

                <Text size="2" color="gray">
                  •
                </Text>

                <Text size="2" color="gray">
                  ATS <Strong>{company.ats_boards?.length ?? 0}</Strong>
                </Text>

                <Text size="2" color="gray">
                  •
                </Text>

                <Text size="2" color="gray">
                  Tags <Strong>{company.tags?.length ?? 0}</Strong>
                </Text>
              </Flex>

              <Flex gap="2" wrap="wrap" mt="3">
                {company.category ? <Chip>{company.category}</Chip> : null}
                {company.size ? <Chip>{company.size}</Chip> : null}
                {company.location ? <Chip>{company.location}</Chip> : null}
              </Flex>
            </Box>
          </Flex>

          {isAdmin && (
            <Button
              onClick={handleEnhance}
              disabled={isEnhancing}
              color="orange"
              variant="solid"
            >
              <MagicWandIcon />
              {isEnhancing ? "Enhancing…" : "Enhance"}
            </Button>
          )}
        </Flex>

        {/* Balanced 2/3 + 1/3 layout (no giant empty left column) */}
        <Flex
          direction={{ initial: "column", md: "row" }}
          gap="4"
          align="start"
        >
          {/* Left: put the taller content here to match sidebar height */}
          <Box style={{ flex: 2, minWidth: 0 }}>
            <Flex direction="column" gap="4">
              {company.description ? (
                <SectionCard title="About">
                  <Text
                    as="p"
                    size="3"
                    color="gray"
                    style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}
                  >
                    {company.description}
                  </Text>
                </SectionCard>
              ) : null}

              {/* Move Services left to reduce "empty space under About" */}
              {company.services?.length ? (
                <SectionCard title="Services">
                  <CollapsibleList items={company.services} visibleCount={7} />
                </SectionCard>
              ) : null}
            </Flex>
          </Box>

          {/* Right: smaller/medium cards */}
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Flex direction="column" gap="4">
              <KeyFactsCard
                canonicalDomain={company.canonical_domain}
                score={company.score}
                careerPagesCount={company.ats_boards?.length ?? 0}
              />

              {company.industries?.length ? (
                <SectionCard title="Industries">
                  <CollapsibleChips
                    items={company.industries}
                    visibleCount={8}
                  />
                </SectionCard>
              ) : null}

              {/* Keep Tags on the right: medium-height balances Industries */}
              {company.tags?.length ? (
                <SectionCard title="Tags">
                  <CollapsibleChips items={company.tags} visibleCount={10} />
                </SectionCard>
              ) : null}
            </Flex>
          </Box>
        </Flex>

        {/* Ashby crawler enrichment */}
        {company.ashby_enrichment?.enriched_at ? (
          <SectionCard title="Ashby Enrichment">
            <Flex direction="column" gap="3">

              {/* Row: Company · Size */}
              <Flex gap="4" align="center" wrap="wrap">
                {company.ashby_enrichment.company_name ? (
                  <Flex gap="2" align="center">
                    <Text size="2" color="gray">Company</Text>
                    <Text size="2" weight="medium">{company.ashby_enrichment.company_name}</Text>
                  </Flex>
                ) : null}
                {company.ashby_enrichment.size_signal ? (
                  <Flex gap="2" align="center">
                    <Text size="2" color="gray">Size signal</Text>
                    <Badge color="amber" variant="soft" radius="full">
                      {company.ashby_enrichment.size_signal}
                    </Badge>
                  </Flex>
                ) : null}
              </Flex>

              {/* Industries */}
              {company.ashby_enrichment.industry_tags.length ? (
                <Flex gap="2" wrap="wrap" align="center">
                  <Text size="2" color="gray" style={{ minWidth: 90 }}>Industries</Text>
                  {company.ashby_enrichment.industry_tags.map((tag) => (
                    <Badge key={tag} color="blue" variant="soft" radius="full">
                      {tag}
                    </Badge>
                  ))}
                </Flex>
              ) : null}

              {/* Tech signals */}
              {company.ashby_enrichment.tech_signals.length ? (
                <Flex gap="2" wrap="wrap" align="center">
                  <Text size="2" color="gray" style={{ minWidth: 90 }}>Tech</Text>
                  {company.ashby_enrichment.tech_signals.map((sig) => (
                    <Badge key={sig} color="violet" variant="soft" radius="full">
                      {sig}
                    </Badge>
                  ))}
                </Flex>
              ) : null}

              <Text size="1" color="gray">
                Enriched {new Date(company.ashby_enrichment.enriched_at).toLocaleDateString()}
              </Text>
            </Flex>
          </SectionCard>
        ) : null}

        {/* Full-width sections (prevents awkward column gaps) */}
        {company.ats_boards?.length ? (
          <SectionCard title={`Career pages (${company.ats_boards.length})`}>
            <Flex direction="column">
              {company.ats_boards.map((board, idx) => {
                const confidence =
                  typeof board.confidence === "number" &&
                  Number.isFinite(board.confidence)
                    ? Math.round(board.confidence * 100)
                    : null;

                const boardHref = coerceExternalUrl(board.url) ?? board.url;

                return (
                  <Box key={board.id}>
                    <Flex
                      align="center"
                      justify="between"
                      gap="3"
                      wrap="wrap"
                    >
                      <Flex gap="2" wrap="wrap" align="center">
                        <Chip>{board.vendor}</Chip>
                        <Chip>{board.board_type}</Chip>
                        {confidence !== null ? (
                          <Badge color="gray" variant="outline">
                            {confidence}% confidence
                          </Badge>
                        ) : null}
                        {board.is_active ? (
                          <Badge color="green" variant="soft">
                            active
                          </Badge>
                        ) : (
                          <Badge color="gray" variant="soft">
                            inactive
                          </Badge>
                        )}
                      </Flex>

                      <RadixLink
                        href={boardHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="gray"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          maxWidth: "100%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={boardHref}
                      >
                        {prettyUrl(boardHref)}
                        <ExternalLinkIcon />
                      </RadixLink>
                    </Flex>

                    {idx < company.ats_boards.length - 1 ? (
                      <Separator size="4" my="3" />
                    ) : null}
                  </Box>
                );
              })}
            </Flex>
          </SectionCard>
        ) : null}

        {company.score_reasons?.length ? (
          <SectionCard title="Score breakdown">
            <Flex direction="column" gap="2">
              {company.score_reasons.map((reason: string, idx: number) => (
                <Text key={`${idx}-${reason}`} size="2" color="gray">
                  • {reason}
                </Text>
              ))}
            </Flex>
          </SectionCard>
        ) : null}

        {companyJobs.length > 0 ? (
          <SectionCard title={`Jobs (${companyJobs.length})`}>
            <Flex direction="column">
              {companyJobs.map((job, idx) => {
                const jobId = extractJobSlug(job.external_id, job.id);
                const jobHref = `/jobs/${jobId}?company=${job.company_key}&source=${job.source_kind}`;
                return (
                <Box key={job.id}>
                  <Link href={jobHref} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
                    <Flex justify="between" align="center" gap="4" py="2" style={{ cursor: "pointer" }}>
                      <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
                        <Text size="3" weight="medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {job.title}
                        </Text>
                        {job.location && (
                          <Text size="2" color="gray">
                            {job.location}
                          </Text>
                        )}
                      </Flex>
                      {job.posted_at && (
                        <Text size="1" color="gray" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                          {new Date(job.posted_at).toLocaleDateString()}
                        </Text>
                      )}
                    </Flex>
                  </Link>
                  {idx < companyJobs.length - 1 ? <Separator size="4" /> : null}
                </Box>
                );
              })}
            </Flex>
          </SectionCard>
        ) : null}
      </Flex>
    </Container>
  );
}

