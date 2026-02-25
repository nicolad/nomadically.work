"use client";

import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import {
  useGetCompanyQuery,
  useEnhanceCompanyMutation,
  useUpdateCompanyMutation,
  useGetJobsQuery,
} from "@/__generated__/hooks";
import type { CompanyCategory } from "@/__generated__/graphql";
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
  Dialog,
  Flex,
  Heading,
  Link as RadixLink,
  Select,
  Separator,
  Strong,
  Tabs,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import {
  CheckCircledIcon,
  ExternalLinkIcon,
  GlobeIcon,
  InfoCircledIcon,
  MagicWandIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Pencil1Icon,
  PersonIcon,
} from "@radix-ui/react-icons";

type Props = {
  companyKey?: string;
  companyId?: number;
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
  linkedinUrl?: string | null;
  score?: number | null;
  careerPagesCount?: number | null;
  isAdmin?: boolean;
};

function KeyFactsCard({
  canonicalDomain,
  linkedinUrl,
  score,
  careerPagesCount,
  isAdmin = false,
}: KeyFactsCardProps) {
  const domainHref = useMemo(
    () => coerceExternalUrl(canonicalDomain),
    [canonicalDomain]
  );
  const domainLabel = useMemo(
    () => prettyUrl(canonicalDomain),
    [canonicalDomain]
  );
  const linkedinHref = useMemo(
    () => coerceExternalUrl(linkedinUrl),
    [linkedinUrl]
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
      label: "LinkedIn",
      value: linkedinHref ? (
        <RadixLink
          href={linkedinHref}
          target="_blank"
          rel="noopener noreferrer"
          color="gray"
          title={linkedinHref}
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
          linkedin.com
          <ExternalLinkIcon />
        </RadixLink>
      ) : (
        <Text size="2">—</Text>
      ),
    },
    ...(isAdmin
      ? [
          {
            label: "Crawl confidence",
            value: (
              <Text size="2" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatScore(score)}
              </Text>
            ),
          },
        ]
      : []),
    {
      label: "Hiring platforms",
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


const CATEGORY_OPTIONS: CompanyCategory[] = [
  "PRODUCT",
  "CONSULTANCY",
  "AGENCY",
  "STAFFING",
  "DIRECTORY",
  "OTHER",
  "UNKNOWN",
];

type EditDialogProps = {
  company: NonNullable<ReturnType<typeof useGetCompanyQuery>["data"]>["company"];
  onSaved: () => void;
};

function CompanyEditDialog({ company, onSaved }: EditDialogProps) {
  const [open, setOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: company?.name ?? "",
    website: company?.website ?? "",
    description: company?.description ?? "",
    logo_url: company?.logo_url ?? "",
    size: company?.size ?? "",
    industry: company?.industry ?? "",
    canonical_domain: company?.canonical_domain ?? "",
    linkedin_url: company?.linkedin_url ?? "",
    job_board_url: company?.job_board_url ?? "",
    category: (company?.category as CompanyCategory | null | undefined) ?? null,
    tags: (company?.tags ?? []).join(", "),
    services: (company?.services ?? []).join("\n"),
  });

  const [updateCompany, { loading }] = useUpdateCompanyMutation({
    onCompleted: () => {
      setSaveError(null);
      setOpen(false);
      onSaved();
    },
    onError: (err) => {
      setSaveError(err.message || "Save failed.");
    },
  });

  const handleOpen = () => {
    setForm({
      name: company?.name ?? "",
      website: company?.website ?? "",
      description: company?.description ?? "",
      logo_url: company?.logo_url ?? "",
      size: company?.size ?? "",
      industry: company?.industry ?? "",
      canonical_domain: company?.canonical_domain ?? "",
      linkedin_url: company?.linkedin_url ?? "",
      job_board_url: company?.job_board_url ?? "",
      category: (company?.category as CompanyCategory | null | undefined) ?? null,
      tags: (company?.tags ?? []).join(", "),
      services: (company?.services ?? []).join("\n"),
    });
    setSaveError(null);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!company) return;
    const tags = form.tags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const services = form.services
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    await updateCompany({
      variables: {
        id: company.id,
        input: {
          name: form.name || undefined,
          website: form.website || undefined,
          description: form.description || undefined,
          logo_url: form.logo_url || undefined,
          size: form.size || undefined,
          industry: form.industry || undefined,
          canonical_domain: form.canonical_domain || undefined,
          linkedin_url: form.linkedin_url || undefined,
          job_board_url: form.job_board_url || undefined,
          category: form.category ?? undefined,
          tags: tags.length > 0 ? tags : undefined,
          services: services.length > 0 ? services : undefined,
        },
      },
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button size="2" variant="soft" color="gray" onClick={handleOpen}>
          <Pencil1Icon />
          Edit
        </Button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="560px">
        <Dialog.Title>Edit company</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          Update company fields. Leave blank to keep existing value.
        </Dialog.Description>

        <Flex direction="column" gap="3">
          {saveError && (
            <Callout.Root color="red" size="1">
              <Callout.Icon>
                <InfoCircledIcon />
              </Callout.Icon>
              <Callout.Text>{saveError}</Callout.Text>
            </Callout.Root>
          )}

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">Name</Text>
            <TextField.Root
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Company name"
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">Website</Text>
            <TextField.Root
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              placeholder="https://example.com"
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">Canonical domain</Text>
            <TextField.Root
              value={form.canonical_domain}
              onChange={(e) => setForm((f) => ({ ...f, canonical_domain: e.target.value }))}
              placeholder="example.com"
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">Logo URL</Text>
            <TextField.Root
              value={form.logo_url}
              onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
              placeholder="https://..."
            />
          </Flex>

          <Flex gap="3">
            <Flex direction="column" gap="1" style={{ flex: 1 }}>
              <Text size="2" weight="medium">Size</Text>
              <TextField.Root
                value={form.size}
                onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
                placeholder="e.g. 51-200"
              />
            </Flex>
            <Flex direction="column" gap="1" style={{ flex: 1 }}>
              <Text size="2" weight="medium">Industry</Text>
              <TextField.Root
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                placeholder="e.g. Software"
              />
            </Flex>
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">LinkedIn URL</Text>
            <TextField.Root
              value={form.linkedin_url}
              onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
              placeholder="https://linkedin.com/company/..."
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">Job board URL</Text>
            <TextField.Root
              value={form.job_board_url}
              onChange={(e) => setForm((f) => ({ ...f, job_board_url: e.target.value }))}
              placeholder="https://jobs.ashbyhq.com/..."
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">Category</Text>
            <Select.Root
              value={form.category ?? "__none__"}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, category: v === "__none__" ? null : (v as CompanyCategory) }))
              }
            >
              <Select.Trigger placeholder="Select…" style={{ width: "100%" }} />
              <Select.Content>
                <Select.Item value="__none__">— none —</Select.Item>
                {CATEGORY_OPTIONS.map((c) => (
                  <Select.Item key={c} value={c}>
                    {c}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">Tags <Text size="1" color="gray">(comma-separated)</Text></Text>
            <TextField.Root
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="tag1, tag2, tag3"
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">Services <Text size="1" color="gray">(one per line)</Text></Text>
            <TextArea
              value={form.services}
              onChange={(e) => setForm((f) => ({ ...f, services: e.target.value }))}
              placeholder="Service A&#10;Service B"
              rows={4}
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">Description</Text>
            <TextArea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Company description…"
              rows={4}
            />
          </Flex>
        </Flex>

        <Flex gap="3" mt="5" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export function CompanyDetail({ companyKey, companyId }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [enhanceSuccess, setEnhanceSuccess] = useState<string | null>(null);

  const { loading, error, data, refetch } = useGetCompanyQuery({
    variables: companyId ? { id: companyId } : { key: companyKey },
    skip: !companyKey && !companyId,
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
  // When a numeric ID is passed, derive the slug from the loaded company record
  const effectiveKey = companyKey ?? company?.key;

  const { data: jobsData, loading: jobsLoading } = useGetJobsQuery({
    variables: { search: effectiveKey, limit: 100, status: "active" },
    skip: !effectiveKey,
  });
  const companyJobs = (jobsData?.jobs?.jobs ?? []).filter(
    (j) => j.company_key === effectiveKey,
  );

  const remoteEuConfirmed = companyJobs.some(
    (j) => j.is_remote_eu === true && j.remote_eu_confidence === "high",
  );
  const remoteEuLikely =
    !remoteEuConfirmed && companyJobs.some((j) => j.is_remote_eu === true);

  const websiteHref = useMemo(
    () => coerceExternalUrl(company?.website),
    [company?.website]
  );
  const websiteLabel = useMemo(
    () => prettyUrl(company?.website),
    [company?.website]
  );

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
    if (jobsLoading) {
      return (
        <Container size="3" p={{ initial: "4", md: "6" }}>
          <Text color="gray">Loading company details…</Text>
        </Container>
      );
    }

    if (companyJobs.length === 0) {
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

    // No company record but jobs exist — show a minimal page
    return (
      <Container size="3" p={{ initial: "4", md: "6" }}>
        <Flex direction="column" gap="5">
          <Heading size="8" style={{ textTransform: "capitalize" }}>
            {effectiveKey}
          </Heading>
          <SectionCard title={`Jobs (${companyJobs.length})`}>
            <Flex direction="column">
              {companyJobs.map((job, idx) => {
                const jobId = extractJobSlug(job.external_id, job.id);
                const jobHref = `/jobs/${jobId}?company=${job.company_key}&source=${job.source_kind}`;
                return (
                  <Box key={job.id}>
                    <Link
                      href={jobHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <Flex
                        justify="between"
                        align="center"
                        gap="4"
                        py="2"
                        style={{ cursor: "pointer" }}
                      >
                        <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
                          <Text
                            size="3"
                            weight="medium"
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {job.title}
                          </Text>
                          {job.location && (
                            <Text size="2" color="gray">
                              {job.location}
                            </Text>
                          )}
                        </Flex>
                        {job.publishedAt && (
                          <Text
                            size="1"
                            color="gray"
                            style={{ whiteSpace: "nowrap", flexShrink: 0 }}
                          >
                            {new Date(job.publishedAt).toLocaleDateString()}
                          </Text>
                        )}
                      </Flex>
                    </Link>
                    {idx < companyJobs.length - 1 ? (
                      <Separator size="4" />
                    ) : null}
                  </Box>
                );
              })}
            </Flex>
          </SectionCard>
        </Flex>
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
              aria-label={`${company.name} logo`}
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

                {companyJobs.length > 0 && (
                  <Badge color="indigo" variant="soft">
                    {companyJobs.length} open role{companyJobs.length !== 1 ? "s" : ""}
                  </Badge>
                )}

                {remoteEuConfirmed && (
                  <Badge color="green" variant="soft">
                    <CheckCircledIcon />
                    Remote EU confirmed
                  </Badge>
                )}

                {remoteEuLikely && (
                  <Badge color="amber" variant="soft">
                    <CheckCircledIcon />
                    Remote EU likely
                  </Badge>
                )}
              </Flex>

              <Flex gap="2" wrap="wrap" mt="3">
                {company.category ? <Chip>{company.category}</Chip> : null}
                {company.size ? <Chip>{company.size}</Chip> : null}
                {company.location ? <Chip>{company.location}</Chip> : null}
              </Flex>
            </Box>
          </Flex>

          <Flex gap="2" align="center">
            {isAdmin && (
              <Link
                href={`/companies/${effectiveKey}/contacts`}
                style={{ textDecoration: "none" }}
              >
                <Button size="2" variant="soft" color="gray">
                  <PersonIcon />
                  Contacts
                </Button>
              </Link>
            )}
            {isAdmin && (
              <CompanyEditDialog company={company} onSaved={refetch} />
            )}
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
        </Flex>

        {/* Tabs */}
        <Tabs.Root
          defaultValue={companyJobs.length > 0 ? "jobs" : "overview"}
          aria-label="Company sections"
        >
          <Tabs.List>
            <Tabs.Trigger value="jobs">
              Jobs{companyJobs.length > 0 ? ` (${companyJobs.length})` : ""}
            </Tabs.Trigger>
            <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
          </Tabs.List>

          {/* Jobs tab */}
          <Tabs.Content value="jobs">
            <Box pt="4">
              {companyJobs.length === 0 ? (
                <Callout.Root color="gray" variant="soft">
                  <Callout.Icon>
                    <InfoCircledIcon />
                  </Callout.Icon>
                  <Callout.Text>No open roles at this company right now.</Callout.Text>
                </Callout.Root>
              ) : (
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
                              <Flex gap="2" align="center" wrap="wrap">
                                {job.location && (
                                  <Text size="2" color="gray">
                                    {job.location}
                                  </Text>
                                )}
                                {job.is_remote_eu && (
                                  <Badge color="green" variant="soft" size="1">
                                    <CheckCircledIcon />
                                    Remote EU
                                  </Badge>
                                )}
                              </Flex>
                            </Flex>
                            {job.publishedAt && (
                              <Text size="1" color="gray" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                                {new Date(job.publishedAt).toLocaleDateString()}
                              </Text>
                            )}
                          </Flex>
                        </Link>
                        {idx < companyJobs.length - 1 ? <Separator size="4" /> : null}
                      </Box>
                    );
                  })}
                </Flex>
              )}
            </Box>
          </Tabs.Content>

          {/* Overview tab */}
          <Tabs.Content value="overview">
            <Box pt="4">
              <Flex direction="column" gap="5">
                {/* Balanced 2/3 + 1/3 layout */}
                <Flex
                  direction={{ initial: "column", md: "row" }}
                  gap="4"
                  align="start"
                >
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

                      {company.services?.length ? (
                        <SectionCard title="Services">
                          <CollapsibleList items={company.services} visibleCount={7} />
                        </SectionCard>
                      ) : null}
                    </Flex>
                  </Box>

                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Flex direction="column" gap="4">
                      <KeyFactsCard
                        canonicalDomain={company.canonical_domain}
                        linkedinUrl={company.linkedin_url}
                        score={company.score}
                        careerPagesCount={company.ats_boards?.length ?? 0}
                        isAdmin={isAdmin}
                      />

                      {company.industries?.length ? (
                        <SectionCard title="Industries">
                          <CollapsibleChips
                            items={company.industries}
                            visibleCount={8}
                          />
                        </SectionCard>
                      ) : null}

                      {company.ashby_enrichment?.tech_signals?.length ? (
                        <SectionCard title="Tech stack">
                          <CollapsibleChips
                            items={company.ashby_enrichment.tech_signals}
                            visibleCount={10}
                          />
                        </SectionCard>
                      ) : null}

                      {company.tags?.length ? (
                        <SectionCard title="Tags">
                          <CollapsibleChips items={company.tags} visibleCount={10} />
                        </SectionCard>
                      ) : null}
                    </Flex>
                  </Box>
                </Flex>

                {/* Career pages */}
                {company.ats_boards?.length ? (
                  <SectionCard title={`Hiring platforms (${company.ats_boards.length})`}>
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
                            <Flex align="center" justify="between" gap="3" wrap="wrap">
                              <Flex gap="2" wrap="wrap" align="center">
                                <Chip>{board.vendor}</Chip>
                                <Chip>{board.board_type}</Chip>
                                {confidence !== null && isAdmin ? (
                                  <Badge color="gray" variant="outline">
                                    {confidence}% confidence
                                  </Badge>
                                ) : null}
                                {board.is_active ? (
                                  <Badge color="green" variant="soft">active</Badge>
                                ) : (
                                  <Badge color="gray" variant="soft">inactive</Badge>
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

                {/* Admin-only: Ashby enrichment raw data */}
                {isAdmin && company.ashby_enrichment?.enriched_at ? (
                  <SectionCard title="Ashby Enrichment">
                    <Flex direction="column" gap="3">
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

                      <Text size="1" color="gray">
                        Enriched {new Date(company.ashby_enrichment.enriched_at).toLocaleDateString()}
                      </Text>
                    </Flex>
                  </SectionCard>
                ) : null}

                {/* Admin-only: Score breakdown */}
                {isAdmin && company.score_reasons?.length ? (
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
              </Flex>
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </Flex>
    </Container>
  );
}
