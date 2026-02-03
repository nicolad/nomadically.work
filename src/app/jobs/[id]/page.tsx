"use client";

import { useState } from "react";
import { useGetJobQuery } from "@/__generated__/hooks";
import { ApolloProvider, useApollo } from "@/apollo/client";
import {
  Card,
  Badge,
  Skeleton,
  Container,
  Heading,
  Text,
  Flex,
  Box,
  Button,
  Link as RadixLink,
} from "@radix-ui/themes";
import Link from "next/link";
import { useParams } from "next/navigation";
import { classifyJob } from "@/lib/mastra/actions";
import type { JobClassificationResponse } from "@/lib/mastra/actions";

function JobPageContent() {
  const params = useParams();
  const id = params.id as string;
  const [classifying, setClassifying] = useState(false);
  const [classification, setClassification] =
    useState<JobClassificationResponse | null>(null);
  const [classificationError, setClassificationError] = useState<string | null>(
    null,
  );

  const { data, loading, error } = useGetJobQuery({
    variables: { id },
  });

  if (loading) {
    return (
      <Container size="4" p="8">
        <Skeleton height="400px" />
      </Container>
    );
  }

  if (error || !data?.job) {
    return (
      <Container size="4" p="8">
        <Card>
          <Flex direction="column" align="center" gap="4">
            <Heading size="6">Job Not Found</Heading>
            <Text color="gray">
              The job you're looking for doesn't exist or has been removed.
            </Text>
            <Button asChild>
              <Link href="/jobs">← Back to Jobs</Link>
            </Button>
          </Flex>
        </Card>
      </Container>
    );
  }

  const job = data.job;

  const handleClassify = async () => {
    if (!job.title || !job.location || !job.description) {
      setClassificationError("Missing required job information");
      return;
    }

    setClassifying(true);
    setClassificationError(null);

    const result = await classifyJob({
      title: job.title,
      location: job.location,
      description: job.description,
    });

    setClassifying(false);

    if (result.ok && result.data) {
      setClassification(result.data);
    } else {
      setClassificationError(result.error || "Classification failed");
    }
  };

  return (
    <Container size="4" p="8">
      <Box mb="6">
        <Button variant="ghost" asChild>
          <Link href="/jobs">← Back to Jobs</Link>
        </Button>
      </Box>

      <Card size="4">
        <Box mb="6">
          <Flex justify="between" align="start" mb="4">
            <Box style={{ flex: 1 }}>
              <Heading size="8" mb="2">
                {job.title}
              </Heading>
              <Flex gap="4" mb="4">
                {job.company_key && (
                  <Text weight="medium">{job.company_key}</Text>
                )}
                {job.location && <Text color="gray">📍 {job.location}</Text>}
              </Flex>
            </Box>
          </Flex>

          <Flex gap="2" mb="6" wrap="wrap">
            {job.status && (
              <Badge
                color={
                  job.status === "eu-remote"
                    ? "green"
                    : job.status === "non-eu"
                      ? "red"
                      : "gray"
                }
              >
                {job.status}
              </Badge>
            )}
            {job.source_kind && <Badge>{job.source_kind}</Badge>}
            {job.score && (
              <Badge color="blue">Score: {(job.score * 100).toFixed(0)}%</Badge>
            )}
          </Flex>
        </Box>

        <Box mb="8">
          <Heading size="5" mb="3">
            Description
          </Heading>
          <Text
            as="div"
            color="gray"
            style={{ whiteSpace: "pre-wrap" }}
            dangerouslySetInnerHTML={{
              __html: job.description || "No description available",
            }}
          />
        </Box>

        {job.score_reason && (
          <Box
            mb="8"
            p="4"
            style={{
              backgroundColor: "var(--gray-3)",
              borderRadius: "var(--radius-3)",
            }}
          >
            <Heading size="5" mb="2">
              Classification Reason
            </Heading>
            <Text color="gray">{job.score_reason}</Text>
          </Box>
        )}

        <Box
          mb="8"
          p="4"
          style={{
            backgroundColor: "var(--gray-3)",
            borderRadius: "var(--radius-3)",
          }}
        >
          <Flex justify="between" align="center" mb="3">
            <Heading size="5">AI Classification</Heading>
            <Button size="2" onClick={handleClassify} disabled={classifying}>
              {classifying ? "Classifying..." : "Classify Job"}
            </Button>
          </Flex>

          {classification && (
            <Flex direction="column" gap="3">
              <Flex gap="2" align="center">
                <Badge
                  color={classification.isRemoteEU ? "green" : "red"}
                  size="2"
                >
                  {classification.isRemoteEU ? "Remote EU" : "Not Remote EU"}
                </Badge>
                <Badge
                  color={
                    classification.confidence === "high"
                      ? "green"
                      : classification.confidence === "medium"
                        ? "orange"
                        : "gray"
                  }
                  size="2"
                >
                  {classification.confidence} confidence
                </Badge>
              </Flex>
              <Text size="2" color="gray">
                <Text weight="medium" as="span">
                  Reason:
                </Text>{" "}
                {classification.reason}
              </Text>
            </Flex>
          )}

          {classificationError && (
            <Text size="2" color="red">
              {classificationError}
            </Text>
          )}

          {!classification && !classificationError && (
            <Text size="2" color="gray">
              Click the button to analyze this job posting with AI
            </Text>
          )}
        </Box>

        <Box pt="6" mt="6" style={{ borderTop: "1px solid var(--gray-6)" }}>
          <Flex direction="column" gap="4" mb="6">
            <Flex gap="4" wrap="wrap">
              <Text size="2" color="gray">
                <Text weight="medium" as="span">
                  Source:
                </Text>{" "}
                {job.source_kind}
              </Text>
              {job.posted_at && (
                <Text size="2" color="gray">
                  <Text weight="medium" as="span">
                    Posted:
                  </Text>{" "}
                  {new Date(job.posted_at).toLocaleDateString()}
                </Text>
              )}
              {job.created_at && (
                <Text size="2" color="gray">
                  <Text weight="medium" as="span">
                    Added:
                  </Text>{" "}
                  {new Date(job.created_at).toLocaleDateString()}
                </Text>
              )}
            </Flex>
            {job.external_id && (
              <Text size="2" color="gray">
                <Text weight="medium" as="span">
                  External ID:
                </Text>{" "}
                <code
                  style={{
                    fontSize: "var(--font-size-1)",
                    backgroundColor: "var(--gray-3)",
                    padding: "var(--space-1) var(--space-2)",
                    borderRadius: "var(--radius-2)",
                  }}
                >
                  {job.external_id}
                </code>
              </Text>
            )}
          </Flex>

          <Button size="3" asChild>
            <a href={job.url} target="_blank" rel="noopener noreferrer">
              Apply Now →
            </a>
          </Button>
        </Box>
      </Card>
    </Container>
  );
}

export default function JobPage() {
  const apolloClient = useApollo(null);

  return (
    <ApolloProvider client={apolloClient}>
      <JobPageContent />
    </ApolloProvider>
  );
}
