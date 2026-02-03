"use client";

import { useState, useEffect } from "react";
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
import { useParams, useSearchParams } from "next/navigation";
import { classifyJob } from "@/lib/mastra/actions";
import type { JobClassificationResponse } from "@/lib/mastra/actions";

interface AshbyJobPosting {
  id: string;
  title: string;
  location: string;
  locationName?: string;
  department?: string;
  team?: string;
  isRemote?: boolean;
  descriptionHtml?: string;
  descriptionPlain?: string;
  publishedAt?: string;
  employmentType?: string;
  jobUrl?: string;
  applyUrl?: string;
  isListed?: boolean;
}

function JobPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const company = searchParams.get("company");
  const source = searchParams.get("source");

  const [classifying, setClassifying] = useState(false);
  const [classification, setClassification] =
    useState<JobClassificationResponse | null>(null);
  const [classificationError, setClassificationError] = useState<string | null>(
    null,
  );
  const [ashbyData, setAshbyData] = useState<AshbyJobPosting | null>(null);
  const [ashbyLoading, setAshbyLoading] = useState(false);

  const { data, loading, error } = useGetJobQuery({
    variables: { id },
  });

  // Fetch Ashby data if source is ashby
  useEffect(() => {
    const fetchAshbyData = async () => {
      if (source === "ashby" && company && id) {
        setAshbyLoading(true);
        try {
          const response = await fetch(
            `https://api.ashbyhq.com/posting-api/job-board/${company}?includeCompensation=false`,
            {
              method: "GET",
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
              },
            },
          );

          const result = await response.json();
          if (result.jobs) {
            const jobPosting = result.jobs.find((posting: AshbyJobPosting) =>
              posting.jobUrl?.includes(id),
            );
            if (jobPosting) {
              setAshbyData(jobPosting);

              // Save to database
              try {
                await fetch("/api/jobs/save-ashby", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    id: id,
                    title: jobPosting.title,
                    location: jobPosting.location,
                    locationName: jobPosting.location,
                    department: jobPosting.department,
                    team: jobPosting.team,
                    isRemote: jobPosting.isRemote,
                    descriptionHtml: jobPosting.descriptionHtml,
                    descriptionPlain: jobPosting.descriptionPlain,
                    publishedAt: jobPosting.publishedAt,
                    employmentType: jobPosting.employmentType,
                    jobUrl: jobPosting.jobUrl,
                    applyUrl: jobPosting.applyUrl,
                    company,
                  }),
                });
              } catch (saveErr) {
                console.error("Error saving Ashby data to DB:", saveErr);
              }
            }
          }
        } catch (err) {
          console.error("Error fetching Ashby data:", err);
        } finally {
          setAshbyLoading(false);
        }
      }
    };

    fetchAshbyData();
  }, [id, source, company]);

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
    <Container size="4" p="8" style={{ maxWidth: "1400px", width: "100%" }}>
      <Box mb="6">
        <Button variant="ghost" asChild>
          <Link href="/jobs">← Back to Jobs</Link>
        </Button>
      </Box>

      {/* Header */}
      <Box mb="6">
        <Heading size="8" mb="2">
          {job.title}
        </Heading>
        <Flex gap="4" mb="4">
          {job.company_key && (
            <Text weight="medium">{job.company_key}</Text>
          )}
          {job.location && <Text color="gray">📍 {job.location}</Text>}
        </Flex>
        <Flex gap="2" wrap="wrap">
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

      {/* 2-Column Layout */}
      <Box style={{ 
        display: "grid", 
        gridTemplateColumns: "2fr 1fr", 
        gap: "24px"
      }} className="job-detail-grid">
        {/* Left Column - Main Job Info */}
        <Box style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {ashbyLoading && (
            <Text size="2" color="gray">
              Loading Ashby data...
            </Text>
          )}
          
          {/* Ashby Job Data */}
          {ashbyData && (
            <Card>
              <Flex direction="column" gap="3">
                <Heading size="5" mb="2">
                  Job Details
                </Heading>
                
                <Flex direction="column" gap="2">
                  {ashbyData.department && (
                    <Text size="2">
                      <Text weight="bold" as="span">Department:</Text> {ashbyData.department}
                    </Text>
                  )}
                  
                  {ashbyData.team && (
                    <Text size="2">
                      <Text weight="bold" as="span">Team:</Text> {ashbyData.team}
                    </Text>
                  )}
                  
                  {ashbyData.employmentType && (
                    <Text size="2">
                      <Text weight="bold" as="span">Employment Type:</Text> {ashbyData.employmentType}
                    </Text>
                  )}
                  
                  {ashbyData.isRemote !== undefined && (
                    <Text size="2">
                      <Text weight="bold" as="span">Remote:</Text> {ashbyData.isRemote ? "Yes ✅" : "No"}
                    </Text>
                  )}
                  
                  {ashbyData.publishedAt && (
                    <Text size="2">
                      <Text weight="bold" as="span">Published:</Text>{" "}
                      {new Date(ashbyData.publishedAt).toLocaleDateString()}
                    </Text>
                  )}
                </Flex>

                {ashbyData.descriptionPlain && (
                  <Box mt="3">
                    <Text weight="bold" size="3" mb="2">Description</Text>
                    <Text
                      size="2"
                      style={{
                        whiteSpace: "pre-wrap",
                        lineHeight: "1.6",
                      }}
                    >
                      {ashbyData.descriptionPlain}
                    </Text>
                  </Box>
                )}

                {(ashbyData.jobUrl || ashbyData.applyUrl) && (
                  <Flex gap="2" mt="3">
                    {ashbyData.jobUrl && (
                      <Button asChild size="2" variant="outline">
                        <a href={ashbyData.jobUrl} target="_blank" rel="noopener noreferrer">
                          View Job →
                        </a>
                      </Button>
                    )}
                    {ashbyData.applyUrl && (
                      <Button asChild size="2">
                        <a href={ashbyData.applyUrl} target="_blank" rel="noopener noreferrer">
                          Apply Now →
                        </a>
                      </Button>
                    )}
                  </Flex>
                )}
              </Flex>
            </Card>
          )}
          
          {/* Fallback to DB description if no Ashby data */}
          {!ashbyData && job.description && (
            <Card>
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
            </Card>
          )}
        </Box>

        {/* Right Column - Classification & Metadata */}
        <Box style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* AI Classification */}
          <Card>
            <Flex justify="between" align="center" mb="3">
              <Heading size="5">AI Classification</Heading>
              <Button size="2" onClick={handleClassify} disabled={classifying}>
                {classifying ? "Classifying..." : "Classify"}
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
          </Card>

          {/* Score Reason */}
          {job.score_reason && (
            <Card>
              <Heading size="5" mb="2">
                Classification Reason
              </Heading>
              <Text size="2" color="gray">{job.score_reason}</Text>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <Heading size="5" mb="3">
              Metadata
            </Heading>
            <Flex direction="column" gap="3">
              <Flex direction="column" gap="2">
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

              <Button size="3" asChild style={{ marginTop: "12px" }}>
                <a href={job.url} target="_blank" rel="noopener noreferrer">
                  Apply Now →
                </a>
              </Button>
            </Flex>
          </Card>
        </Box>
      </Box>
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
