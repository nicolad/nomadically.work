"use client";

import { useState, useEffect } from "react";
import {
  useGetJobQuery,
  useGetUserSettingsQuery,
  useUpdateUserSettingsMutation,
  useDeleteJobMutation,
} from "@/__generated__/hooks";
import { ApolloProvider, useApollo } from "@/apollo/client";
import { orderBy } from "lodash";
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
  IconButton,
} from "@radix-ui/themes";
import { TrashIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { classifyJob } from "@/mastra/actions";
import type { JobClassificationResponse } from "@/mastra/actions";
import { ADMIN_EMAIL } from "@/lib/constants";
import { getSkillLabel, formatConfidence } from "@/lib/skills/taxonomy";

interface AshbySecondaryLocation {
  location: string;
  address?: {
    addressLocality?: string;
    addressRegion?: string;
    addressCountry?: string;
  };
}

interface AshbyCompensationComponent {
  id: string;
  summary: string;
  compensationType: string;
  interval: string;
  currencyCode: string | null;
  minValue: number | null;
  maxValue: number | null;
}

interface AshbyCompensationTier {
  id: string;
  tierSummary: string;
  title: string;
  additionalInformation: string | null;
  components: AshbyCompensationComponent[];
}

interface AshbyCompensation {
  compensationTierSummary: string;
  scrapeableCompensationSalarySummary: string;
  compensationTiers: AshbyCompensationTier[];
  summaryComponents: AshbyCompensationComponent[];
}

interface AshbyJobPosting {
  id: string;
  title: string;
  location: string;
  locationName?: string;
  secondaryLocations?: AshbySecondaryLocation[];
  department?: string;
  team?: string;
  isRemote?: boolean;
  descriptionHtml?: string;
  descriptionPlain?: string;
  publishedAt?: string;
  employmentType?: string;
  address?: {
    postalAddress?: {
      addressLocality?: string;
      addressRegion?: string;
      addressCountry?: string;
    };
  };
  jobUrl?: string;
  applyUrl?: string;
  isListed?: boolean;
  compensation?: AshbyCompensation;
}

function JobPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const company = searchParams.get("company");
  const source = searchParams.get("source");
  const { user } = useUser();

  const [classifying, setClassifying] = useState(false);
  const [classification, setClassification] =
    useState<JobClassificationResponse | null>(null);
  const [classificationError, setClassificationError] = useState<string | null>(
    null,
  );
  const [ashbyData, setAshbyData] = useState<AshbyJobPosting | null>(null);
  const [ashbyLoading, setAshbyLoading] = useState(false);
  const [hideCompanyLoading, setHideCompanyLoading] = useState(false);

  const { data, loading, error, refetch } = useGetJobQuery({
    variables: { id },
  });

  const { data: userSettingsData, refetch: refetchUserSettings } =
    useGetUserSettingsQuery({
      variables: { userId: user?.id || "" },
      skip: !user?.id,
    });

  const [updateSettings] = useUpdateUserSettingsMutation();
  const [deleteJobMutation] = useDeleteJobMutation();

  const isAdmin = user?.primaryEmailAddress?.emailAddress === ADMIN_EMAIL;

  const handleDeleteJob = async () => {
    if (!data?.job?.id) return;

    try {
      await deleteJobMutation({
        variables: { id: data.job.id },
      });

      // Navigate back to jobs list
      router.push("/jobs");
    } catch (error) {
      console.error("Error deleting job:", error);
    }
  };

  // Fetch Ashby data if source is ashby
  useEffect(() => {
    const fetchAshbyData = async () => {
      if (source === "ashby" && company && id) {
        setAshbyLoading(true);
        try {
          const response = await fetch(
            `https://api.ashbyhq.com/posting-api/job-board/${company}?includeCompensation=true`,
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
                    secondaryLocations: jobPosting.secondaryLocations,
                    department: jobPosting.department,
                    team: jobPosting.team,
                    isRemote: jobPosting.isRemote,
                    descriptionHtml: jobPosting.descriptionHtml,
                    descriptionPlain: jobPosting.descriptionPlain,
                    publishedAt: jobPosting.publishedAt,
                    employmentType: jobPosting.employmentType,
                    address: jobPosting.address,
                    jobUrl: jobPosting.jobUrl,
                    applyUrl: jobPosting.applyUrl,
                    isListed: jobPosting.isListed,
                    compensation: jobPosting.compensation,
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

    // Build comprehensive location string including secondary locations
    let locationString = job.location;
    if (
      ashbyData?.secondaryLocations &&
      ashbyData.secondaryLocations.length > 0
    ) {
      const secondaryLocs = ashbyData.secondaryLocations
        .map((loc) => loc.location)
        .join(", ");
      locationString = `${job.location}, ${secondaryLocs}`;
    }

    const result = await classifyJob(
      {
        title: job.title,
        location: locationString,
        description: job.description,
      },
      job.id,
    );

    setClassifying(false);

    if (result.ok && result.data) {
      setClassification(result.data);
      // Refetch all GraphQL data to update UI with new classification
      await refetch();
    } else {
      setClassificationError(result.error || "Classification failed");
    }
  };

  const handleHideCompany = async () => {
    if (!user?.id) {
      alert("You must be signed in to hide companies");
      return;
    }

    if (!job.company_key) {
      alert("No company information available");
      return;
    }

    const companyToHide = job.company_key;
    const currentExcludedCompanies =
      userSettingsData?.userSettings?.excluded_companies || [];

    if (currentExcludedCompanies.includes(companyToHide)) {
      alert("This company is already hidden");
      return;
    }

    setHideCompanyLoading(true);

    try {
      await updateSettings({
        variables: {
          userId: user.id,
          settings: {
            email_notifications:
              userSettingsData?.userSettings?.email_notifications ?? true,
            daily_digest: userSettingsData?.userSettings?.daily_digest ?? false,
            new_job_alerts:
              userSettingsData?.userSettings?.new_job_alerts ?? true,
            dark_mode: userSettingsData?.userSettings?.dark_mode ?? true,
            jobs_per_page: userSettingsData?.userSettings?.jobs_per_page ?? 50,
            preferred_locations:
              userSettingsData?.userSettings?.preferred_locations || [],
            preferred_skills:
              userSettingsData?.userSettings?.preferred_skills || [],
            excluded_companies: [...currentExcludedCompanies, companyToHide],
          },
        },
      });

      await refetchUserSettings();
    } catch (error) {
      console.error("Error hiding company:", error);
      alert("Failed to hide company. Please try again.");
    } finally {
      setHideCompanyLoading(false);
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
        <Flex justify="between" align="start" mb="2">
          <Heading size="8">{job.title}</Heading>
          {isAdmin && (
            <IconButton
              size="3"
              color="red"
              variant="soft"
              onClick={handleDeleteJob}
              style={{ cursor: "pointer" }}
            >
              <TrashIcon width="18" height="18" />
            </IconButton>
          )}
        </Flex>
        <Flex gap="4" mb="4" align="center">
          {job.company_key && (
            <>
              <Link
                href={`/boards/${job.company_key}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <Text
                  weight="medium"
                  style={{
                    cursor: "pointer",
                    textDecoration: "underline",
                    textUnderlineOffset: "2px",
                  }}
                >
                  {job.company_key}
                </Text>
              </Link>
              {user && (
                <Button
                  size="1"
                  variant="soft"
                  color="red"
                  onClick={handleHideCompany}
                  disabled={
                    hideCompanyLoading ||
                    userSettingsData?.userSettings?.excluded_companies?.includes(
                      job.company_key,
                    )
                  }
                  loading={hideCompanyLoading}
                  style={{ cursor: "pointer" }}
                >
                  {userSettingsData?.userSettings?.excluded_companies?.includes(
                    job.company_key,
                  )
                    ? "Hidden"
                    : "Hide Company"}
                </Button>
              )}
            </>
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
              {job.status === "eu-remote"
                ? "✅ Fully Remote (EU)"
                : job.status === "non-eu"
                  ? "❌ Not Remote EU"
                  : job.status}
            </Badge>
          )}
          {job.source_kind && <Badge>{job.source_kind}</Badge>}
          {job.score && (
            <Badge color="blue">Score: {(job.score * 100).toFixed(0)}%</Badge>
          )}
        </Flex>

        {/* Skills Section */}
        {job.skills && job.skills.length > 0 && (
          <Card mt="4">
            <Flex direction="column" gap="3">
              <Heading size="4">Skills & Technologies</Heading>
              <Flex gap="2" wrap="wrap">
                {orderBy(
                  job.skills,
                  [
                    (skill) => {
                      const levelOrder = { required: 0, preferred: 1, nice: 2 };
                      return (
                        levelOrder[skill.level as keyof typeof levelOrder] ?? 3
                      );
                    },
                    (skill) => skill.confidence || 0,
                  ],
                  ["asc", "desc"],
                ).map((skill) => (
                  <Box
                    key={skill.tag}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Badge
                      size="2"
                      color={
                        skill.level === "required"
                          ? "red"
                          : skill.level === "preferred"
                            ? "blue"
                            : "gray"
                      }
                      variant="soft"
                      style={{
                        fontSize: "14px",
                        padding: "6px 10px",
                        cursor: skill.evidence ? "help" : "default",
                      }}
                      title={
                        skill.evidence
                          ? `Evidence: ${skill.evidence}`
                          : undefined
                      }
                    >
                      {getSkillLabel(skill.tag)}
                      {skill.confidence != null && skill.confidence >= 0.7 && (
                        <Text
                          as="span"
                          size="1"
                          style={{
                            marginLeft: "4px",
                            opacity: 0.7,
                          }}
                        >
                          {formatConfidence(skill.confidence)}
                        </Text>
                      )}
                    </Badge>
                  </Box>
                ))}
              </Flex>
              <Flex gap="4" style={{ fontSize: "12px", opacity: 0.7 }}>
                <Flex align="center" gap="1">
                  <Badge size="1" color="red" variant="soft">
                    Required
                  </Badge>
                  <Text size="1">Must have</Text>
                </Flex>
                <Flex align="center" gap="1">
                  <Badge size="1" color="blue" variant="soft">
                    Preferred
                  </Badge>
                  <Text size="1">Nice to have</Text>
                </Flex>
                <Flex align="center" gap="1">
                  <Badge size="1" color="gray" variant="soft">
                    Nice
                  </Badge>
                  <Text size="1">Bonus</Text>
                </Flex>
              </Flex>
            </Flex>
          </Card>
        )}

        {/* Action Buttons */}
        <Flex gap="3" mt="4">
          {(ashbyData?.jobUrl || job.url) && (
            <Button asChild size="3" variant="outline">
              <a
                href={ashbyData?.jobUrl || job.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Job →
              </a>
            </Button>
          )}
          {(ashbyData?.applyUrl || job.url) && (
            <Button asChild size="3">
              <a
                href={ashbyData?.applyUrl || job.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Apply Now →
              </a>
            </Button>
          )}
        </Flex>
      </Box>

      {/* 2-Column Layout */}
      <Box
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "24px",
        }}
        className="job-detail-grid"
      >
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

                <Box
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px 24px",
                  }}
                >
                  {ashbyData.department && (
                    <Text size="2">
                      <Text weight="bold" as="span">
                        Department:
                      </Text>{" "}
                      {ashbyData.department}
                    </Text>
                  )}

                  {ashbyData.team && (
                    <Text size="2">
                      <Text weight="bold" as="span">
                        Team:
                      </Text>{" "}
                      {ashbyData.team}
                    </Text>
                  )}

                  {ashbyData.employmentType && (
                    <Text size="2">
                      <Text weight="bold" as="span">
                        Employment Type:
                      </Text>{" "}
                      {ashbyData.employmentType}
                    </Text>
                  )}

                  {ashbyData.isRemote !== undefined && (
                    <Text size="2">
                      <Text weight="bold" as="span">
                        Remote:
                      </Text>{" "}
                      {ashbyData.isRemote ? "Yes ✅" : "No"}
                    </Text>
                  )}

                  {ashbyData.publishedAt && (
                    <Text size="2">
                      <Text weight="bold" as="span">
                        Published:
                      </Text>{" "}
                      {new Date(ashbyData.publishedAt).toLocaleDateString()}
                    </Text>
                  )}

                  {ashbyData.isListed !== undefined && (
                    <Text size="2">
                      <Text weight="bold" as="span">
                        Listed:
                      </Text>{" "}
                      {ashbyData.isListed ? "Yes" : "No (Direct link only)"}
                    </Text>
                  )}
                </Box>

                {/* Secondary Locations */}
                {ashbyData.secondaryLocations &&
                  ashbyData.secondaryLocations.length > 0 && (
                    <Box mt="2">
                      <Text weight="bold" size="3" mb="2">
                        Additional Locations
                      </Text>
                      <Flex direction="column" gap="1">
                        {ashbyData.secondaryLocations.map((loc, idx) => (
                          <Text size="2" key={idx}>
                            📍 {loc.location}
                            {loc.address && (
                              <Text color="gray" as="span">
                                {" "}
                                ({loc.address.addressLocality}
                                {loc.address.addressRegion &&
                                  `, ${loc.address.addressRegion}`}
                                {loc.address.addressCountry &&
                                  `, ${loc.address.addressCountry}`}
                                )
                              </Text>
                            )}
                          </Text>
                        ))}
                      </Flex>
                    </Box>
                  )}

                {/* Compensation */}
                {ashbyData.compensation && (
                  <Box
                    mt="3"
                    p="3"
                    style={{
                      backgroundColor: "var(--accent-3)",
                      borderRadius: "var(--radius-3)",
                      border: "1px solid var(--accent-6)",
                    }}
                  >
                    <Heading size="4" mb="2">
                      💰 Compensation
                    </Heading>
                    <Text size="2" weight="bold" mb="2">
                      {ashbyData.compensation.compensationTierSummary}
                    </Text>
                    {ashbyData.compensation.compensationTiers.map(
                      (tier, idx) => (
                        <Box key={tier.id} mt="2">
                          <Text size="2" weight="medium">
                            {tier.title}
                          </Text>
                          <Flex direction="column" gap="1" mt="1">
                            {tier.components.map((comp) => (
                              <Text size="1" color="gray" key={comp.id}>
                                • {comp.summary}
                              </Text>
                            ))}
                          </Flex>
                        </Box>
                      ),
                    )}
                  </Box>
                )}

                {ashbyData.descriptionPlain && (
                  <Box mt="3">
                    <Text weight="bold" size="3" mb="2">
                      Description
                    </Text>
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
            <Flex justify="between" align="center" mb="2">
              <Heading size="5">Remote EU Classification</Heading>
              <Button size="2" onClick={handleClassify} disabled={classifying}>
                {classifying ? "Classifying..." : "Re-classify"}
              </Button>
            </Flex>
            <Text size="1" color="gray" mb="3">
              Fully remote positions that allow working from anywhere in the EU
            </Text>

            {/* Show existing classification from database */}
            {job.is_remote_eu !== null && job.is_remote_eu !== undefined && (
              <Flex direction="column" gap="3">
                <Flex gap="2" align="center">
                  <Badge color={job.is_remote_eu ? "green" : "red"} size="2">
                    {job.is_remote_eu ? "✅ Remote EU" : "❌ Not Remote EU"}
                  </Badge>
                  {job.remote_eu_confidence && (
                    <Badge
                      color={
                        job.remote_eu_confidence === "high"
                          ? "green"
                          : job.remote_eu_confidence === "medium"
                            ? "orange"
                            : "gray"
                      }
                      size="2"
                    >
                      {job.remote_eu_confidence} confidence
                    </Badge>
                  )}
                </Flex>
                {job.remote_eu_reason && (
                  <Text size="2" color="gray">
                    <Text weight="medium" as="span">
                      Reason:
                    </Text>{" "}
                    {job.remote_eu_reason}
                  </Text>
                )}
              </Flex>
            )}

            {/* Show live classification result if just classified */}
            {classification && (
              <Flex
                direction="column"
                gap="3"
                mt={job.is_remote_eu !== null ? "3" : "0"}
              >
                {job.is_remote_eu !== null && (
                  <Text size="1" weight="bold" color="blue">
                    New Classification:
                  </Text>
                )}
                <Flex gap="2" align="center">
                  <Badge
                    color={classification.isRemoteEU ? "green" : "red"}
                    size="2"
                  >
                    {classification.isRemoteEU
                      ? "✅ Remote EU"
                      : "❌ Not Remote EU"}
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

            {!classification &&
              !classificationError &&
              job.is_remote_eu === null && (
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
              <Text size="2" color="gray">
                {job.score_reason}
              </Text>
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
