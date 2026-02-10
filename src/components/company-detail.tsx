"use client";

import { useState } from "react";
import { useGetCompanyQuery } from "@/__generated__/hooks";
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
  Em,
  Strong,
  Callout,
  Button,
  IconButton,
} from "@radix-ui/themes";
import {
  ExternalLinkIcon,
  InfoCircledIcon,
  GlobeIcon,
  MagicWandIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";

type Props = {
  companyKey: string;
};

export function CompanyDetail({ companyKey }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);

  const { loading, error, data, refetch } = useGetCompanyQuery({
    variables: { key: companyKey },
  });

  const handleEnhance = async () => {
    if (!data?.company) return;

    setIsEnhancing(true);
    setEnhanceError(null);

    try {
      const response = await fetch("/api/companies/enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId: data.company.id,
          companyKey: data.company.key,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to enhance company");
      }

      // Refetch company data after enhancement
      await refetch();
    } catch (err) {
      setEnhanceError(err instanceof Error ? err.message : "Enhancement failed");
    } finally {
      setIsEnhancing(false);
    }
  };

  if (loading) {
    return (
      <Container size="4" p="8">
        <Text>Loading company details...</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="4" p="8">
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

  if (!data?.company) {
    return (
      <Container size="4" p="8">
        <Callout.Root>
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>Company not found</Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  const company = data.company;

  return (
    <Container size="4" p={{ initial: "4", md: "8" }}>
      <Flex direction="column" gap="6">
        {/* Admin Enhance Button */}
        {isAdmin && (
          <Flex justify="end">
            <Button
              onClick={handleEnhance}
              disabled={isEnhancing}
              variant="soft"
              color="purple"
            >
              <MagicWandIcon />
              {isEnhancing ? "Enhancing..." : "Enhance Company"}
            </Button>
          </Flex>
        )}

        {/* Enhancement Error */}
        {enhanceError && (
          <Callout.Root color="red">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              <Strong>Enhancement Error:</Strong> {enhanceError}
            </Callout.Text>
          </Callout.Root>
        )}

        {/* Header Section */}
        <Flex direction="row" gap="4" align="start">
          {company.logo_url && (
            <Avatar
              size="8"
              src={company.logo_url}
              fallback={company.name.substring(0, 2).toUpperCase()}
              radius="medium"
            />
          )}
          <Flex direction="column" gap="2" style={{ flex: 1 }}>
            <Heading size="8">{company.name}</Heading>
            {company.website && (
              <Flex align="center" gap="2">
                <GlobeIcon />
                <RadixLink
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  color="blue"
                >
                  {company.website.replace(/^https?:\/\//i, "")}
                  <ExternalLinkIcon
                    style={{ display: "inline", marginLeft: 4 }}
                  />
                </RadixLink>
              </Flex>
            )}
            <Flex gap="2" wrap="wrap">
              <Badge color="blue" variant="soft">
                {company.category}
              </Badge>
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

        {/* Description */}
        {company.description && (
          <Card>
            <Box p="4">
              <Heading size="5" mb="3">
                About
              </Heading>
              <Text as="p" size="3" color="gray">
                {company.description}
              </Text>
            </Box>
          </Card>
        )}

        {/* Industry & Services */}
        <Grid columns={{ initial: "1", md: "2" }} gap="4">
          {company.industries && company.industries.length > 0 && (
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
          )}

          {company.services && company.services.length > 0 && (
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
          )}
        </Grid>

        {/* Tags */}
        {company.tags && company.tags.length > 0 && (
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
        )}

        {/* ATS Boards */}
        {company.ats_boards && company.ats_boards.length > 0 && (
          <Card>
            <Box p="4">
              <Heading size="4" mb="3">
                Career Pages ({company.ats_boards.length})
              </Heading>
              <Flex direction="column" gap="3">
                {company.ats_boards.map((board) => (
                  <Flex key={board.id} direction="column" gap="1">
                    <Flex align="center" gap="2">
                      <Badge
                        color={board.is_active ? "green" : "gray"}
                        variant="soft"
                      >
                        {board.vendor}
                      </Badge>
                      <Badge color="blue" variant="outline">
                        {board.board_type}
                      </Badge>
                      <Badge color="gray" variant="outline">
                        {Math.round(board.confidence * 100)}% confidence
                      </Badge>
                    </Flex>
                    <RadixLink
                      href={board.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="2"
                      color="blue"
                    >
                      {board.url}
                      <ExternalLinkIcon
                        style={{ display: "inline", marginLeft: 4 }}
                      />
                    </RadixLink>
                    {board !== company.ats_boards[company.ats_boards.length - 1] && (
                      <Separator size="4" my="2" />
                    )}
                  </Flex>
                ))}
              </Flex>
            </Box>
          </Card>
        )}

        {/* Metadata */}
        <Card>
          <Box p="4">
            <Heading size="4" mb="3">
              Metadata
            </Heading>
            <Grid columns="2" gap="3">
              <Box>
                <Text size="2" color="gray">
                  Score
                </Text>
                <Text size="3">
                  <Strong>{company.score.toFixed(2)}</Strong>
                </Text>
              </Box>
              {company.canonical_domain && (
                <Box>
                  <Text size="2" color="gray">
                    Domain
                  </Text>
                  <Text size="3">
                    <Strong>{company.canonical_domain}</Strong>
                  </Text>
                </Box>
              )}
              <Box>
                <Text size="2" color="gray">
                  ATS Boards
                </Text>
                <Text size="3">
                  <Strong>{company.ats_boards?.length || 0}</Strong>
                </Text>
              </Box>
              <Box>
                <Text size="2" color="gray">
                  Tags
                </Text>
                <Text size="3">
                  <Strong>{company.tags?.length || 0}</Strong>
                </Text>
              </Box>
            </Grid>
          </Box>
        </Card>

        {/* Score Reasons */}
        {company.score_reasons && company.score_reasons.length > 0 && (
          <Card>
            <Box p="4">
              <Heading size="4" mb="3">
                Score Breakdown
              </Heading>
              <Flex direction="column" gap="2">
                {company.score_reasons.map((reason, idx) => (
                  <Text key={idx} size="2" color="gray">
                    • {reason}
                  </Text>
                ))}
              </Flex>
            </Box>
          </Card>
        )}
      </Flex>
    </Container>
  );
}
