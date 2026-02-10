"use client";

import { useCallback, useMemo, useState } from "react";
import { useGetCompanyQuery, useEnhanceCompanyMutation } from "@/__generated__/hooks";
import { useAuth } from "@/auth/hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import {
  Container,
  Heading,
  Text,
  Flex,
  Avatar,
  Badge,
  Card,
  Box,
  Grid,
  Link as RadixLink,
  Separator,
  Strong,
  Callout,
  Button,
} from "@radix-ui/themes";
import {
  ExternalLinkIcon,
  InfoCircledIcon,
  GlobeIcon,
  MagicWandIcon,
} from "@radix-ui/react-icons";

type Props = {
  companyKey: string;
};

function coerceExternalUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Accept http(s) as-is, otherwise prefix with https://
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

function prettyUrl(raw?: string | null): string {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/g, "");
}

function initialsFromName(name?: string | null): string {
  const safe = (name ?? "").trim();
  if (!safe) return "CO";
  return safe.slice(0, 2).toUpperCase();
}

export function CompanyDetail({ companyKey }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [enhanceSuccess, setEnhanceSuccess] = useState<string | null>(null);

  const { loading, error, data, refetch } = useGetCompanyQuery({
    variables: { key: companyKey },
    // If you use Apollo, this helps ensure you see fresh data after refetch
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

  const websiteHref = useMemo(() => coerceExternalUrl(company?.website), [company?.website]);
  const websiteLabel = useMemo(() => prettyUrl(company?.website), [company?.website]);

  const handleEnhance = useCallback(async () => {
    if (!company) return;

    setEnhanceError(null);
    setEnhanceSuccess(null);

    try {
      await enhanceCompany({
        variables: {
          id: company.id,
          key: company.key,
        },
      });
    } catch (e) {
      // onError handles it; keep this as a last-resort guard
      console.error("Enhancement error:", e);
    }
  }, [company, enhanceCompany]);

  if (loading) {
    return (
      <Container size="4" p={{ initial: "4", md: "8" }}>
        <Text>Loading company details…</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="4" p={{ initial: "4", md: "8" }}>
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
      <Container size="4" p={{ initial: "4", md: "8" }}>
        <Callout.Root>
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>Company not found.</Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  const scoreText =
    typeof company.score === "number" && Number.isFinite(company.score)
      ? company.score.toFixed(2)
      : "—";

  return (
    <Container size="4" p={{ initial: "4", md: "8" }}>
      <Flex direction="column" gap="6">
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
          <Flex direction="row" gap="4" align="start" style={{ flex: 1, minWidth: 0 }}>
            <Avatar
              size="8"
              src={company.logo_url || undefined}
              fallback={initialsFromName(company.name)}
              radius="medium"
            />

            <Flex direction="column" gap="2" style={{ flex: 1, minWidth: 0 }}>
              <Heading size="8" style={{ lineHeight: 1.1 }}>
                {company.name}
              </Heading>

              {websiteHref && (
                <Flex align="center" gap="2" style={{ minWidth: 0 }}>
                  <GlobeIcon />
                  <RadixLink
                    href={websiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    color="blue"
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

              <Flex gap="2" wrap="wrap">
                {company.category && (
                  <Badge color="blue" variant="soft">
                    {company.category}
                  </Badge>
                )}
                {company.size && (
                  <Badge color="gray" variant="soft">
                    {company.size}
                  </Badge>
                )}
                {company.location && (
                  <Badge color="green" variant="soft">
                    {company.location}
                  </Badge>
                )}
              </Flex>
            </Flex>
          </Flex>

          {/* Admin action */}
          {isAdmin && (
            <Flex justify="end">
              <Button
                onClick={handleEnhance}
                disabled={isEnhancing}
                variant="soft"
                color="purple"
              >
                <MagicWandIcon />
                {isEnhancing ? "Enhancing…" : "Enhance Company"}
              </Button>
            </Flex>
          )}
        </Flex>

        {/* About */}
        {company.description && (
          <Card>
            <Box p="4">
              <Heading size="5" mb="3">
                About
              </Heading>
              <Text as="p" size="3" color="gray" style={{ whiteSpace: "pre-wrap" }}>
                {company.description}
              </Text>
            </Box>
          </Card>
        )}

        {/* Industry & Services */}
        <Grid columns={{ initial: "1", md: "2" }} gap="4">
          {company.industries?.length ? (
            <Card>
              <Box p="4">
                <Heading size="4" mb="3">
                  Industries
                </Heading>
                <Flex gap="2" wrap="wrap">
                  {company.industries.map((industry) => (
                    <Badge key={industry} color="purple" variant="soft">
                      {industry}
                    </Badge>
                  ))}
                </Flex>
              </Box>
            </Card>
          ) : null}

          {company.services?.length ? (
            <Card>
              <Box p="4">
                <Heading size="4" mb="3">
                  Services
                </Heading>
                <Flex gap="2" wrap="wrap">
                  {company.services.map((service) => (
                    <Badge key={service} color="orange" variant="soft">
                      {service}
                    </Badge>
                  ))}
                </Flex>
              </Box>
            </Card>
          ) : null}
        </Grid>

        {/* Tags */}
        {company.tags?.length ? (
          <Card>
            <Box p="4">
              <Heading size="4" mb="3">
                Tags
              </Heading>
              <Flex gap="2" wrap="wrap">
                {company.tags.map((tag) => (
                  <Badge key={tag} color="gray" variant="outline">
                    {tag}
                  </Badge>
                ))}
              </Flex>
            </Box>
          </Card>
        ) : null}

        {/* ATS Boards */}
        {company.ats_boards?.length ? (
          <Card>
            <Box p="4">
              <Heading size="4" mb="3">
                Career Pages ({company.ats_boards.length})
              </Heading>

              <Flex direction="column" gap="3">
                {company.ats_boards.map((board, idx) => {
                  const confidence =
                    typeof board.confidence === "number" && Number.isFinite(board.confidence)
                      ? Math.round(board.confidence * 100)
                      : null;

                  const boardHref = coerceExternalUrl(board.url) ?? board.url;

                  return (
                    <Box key={board.id}>
                      <Flex align="center" gap="2" wrap="wrap">
                        <Badge color={board.is_active ? "green" : "gray"} variant="soft">
                          {board.vendor}
                        </Badge>
                        <Badge color="blue" variant="outline">
                          {board.board_type}
                        </Badge>
                        {confidence !== null && (
                          <Badge color="gray" variant="outline">
                            {confidence}% confidence
                          </Badge>
                        )}
                      </Flex>

                      <RadixLink
                        href={boardHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="2"
                        color="blue"
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
                        {board.url}
                        <ExternalLinkIcon />
                      </RadixLink>

                      {idx < company.ats_boards.length - 1 && (
                        <Separator size="4" my="3" />
                      )}
                    </Box>
                  );
                })}
              </Flex>
            </Box>
          </Card>
        ) : null}

        {/* Metadata */}
        <Card>
          <Box p="4">
            <Heading size="4" mb="3">
              Metadata
            </Heading>

            <Grid columns={{ initial: "1", sm: "2" }} gap="3">
              <Box>
                <Text size="2" color="gray">
                  Score
                </Text>
                <Text size="3">
                  <Strong>{scoreText}</Strong>
                </Text>
              </Box>

              {company.canonical_domain ? (
                <Box>
                  <Text size="2" color="gray">
                    Domain
                  </Text>
                  <Text size="3">
                    <Strong>{company.canonical_domain}</Strong>
                  </Text>
                </Box>
              ) : null}

              <Box>
                <Text size="2" color="gray">
                  ATS Boards
                </Text>
                <Text size="3">
                  <Strong>{company.ats_boards?.length ?? 0}</Strong>
                </Text>
              </Box>

              <Box>
                <Text size="2" color="gray">
                  Tags
                </Text>
                <Text size="3">
                  <Strong>{company.tags?.length ?? 0}</Strong>
                </Text>
              </Box>
            </Grid>
          </Box>
        </Card>

        {/* Score Reasons */}
        {company.score_reasons?.length ? (
          <Card>
            <Box p="4">
              <Heading size="4" mb="3">
                Score Breakdown
              </Heading>
              <Flex direction="column" gap="2">
                {company.score_reasons.map((reason, idx) => (
                  <Text key={`${idx}-${reason}`} size="2" color="gray">
                    • {reason}
                  </Text>
                ))}
              </Flex>
            </Box>
          </Card>
        ) : null}
      </Flex>
    </Container>
  );
}
