"use client";

import { useState } from "react";
import {
  useGetJobQuery,
  useGetJobsQuery,
  useGetUserSettingsQuery,
  useUpdateUserSettingsMutation,
  useDeleteJobMutation,
  useEnhanceJobFromAtsMutation,
  useCreateApplicationMutation,
  useGetApplicationsQuery,
} from "@/__generated__/hooks";
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
  Tooltip,
} from "@radix-ui/themes";
import { TrashIcon, BookmarkIcon, BookmarkFilledIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-hooks";
import { classifyJob } from "@/mastra/actions";
import type { JobClassificationResponse } from "@/mastra/actions";
import { ADMIN_EMAIL } from "@/lib/constants";
import { getSkillLabel, formatConfidence } from "@/lib/skills/taxonomy";

function JobPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const company = searchParams.get("company");
  const source = searchParams.get("source");
  const { user } = useAuth();

  const [classifying, setClassifying] = useState(false);
  const [classification, setClassification] =
    useState<JobClassificationResponse | null>(null);
  const [classificationError, setClassificationError] = useState<string | null>(
    null,
  );
  const [hideCompanyLoading, setHideCompanyLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [saving, setSaving] = useState(false);

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
  const [enhanceJobMutation] = useEnhanceJobFromAtsMutation();
  const [createApplicationMutation] = useCreateApplicationMutation();
  const { data: appsData } = useGetApplicationsQuery({ skip: !user });

  const { data: relatedJobsData } = useGetJobsQuery({
    variables: { search: data?.job?.company_key ?? "", limit: 100 },
    skip: !data?.job?.company_key,
  });

  const isAdmin = user?.email === ADMIN_EMAIL;

  const handleDeleteJob = async () => {
    if (!data?.job?.id) return;

    try {
      await deleteJobMutation({
        variables: { id: data.job.id },
      });

      // Navigate back to jobs list
      router.push("/");
    } catch (error) {
      console.error("Error deleting job:", error);
    }
  };

  if (loading) {
    return (
      <Container size="4" p="8">
        <Skeleton height="400px" />
      </Container>
    );
  }

  if (!data?.job) {
    return (
      <Container size="4" p="8">
        <Card>
          <Flex direction="column" align="center" gap="4">
            <Heading size="6">Job Not Found</Heading>
            <Text color="gray">
              The job you're looking for doesn't exist or has been removed.
            </Text>
            <Button asChild>
              <Link href="/">← Back to Jobs</Link>
            </Button>
          </Flex>
        </Card>
      </Container>
    );
  }

  const job = data.job;

  const relatedJobs = (relatedJobsData?.jobs?.jobs ?? []).filter(
    (j) => j.id !== job.id,
  );

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
      job.ashby_secondary_locations &&
      job.ashby_secondary_locations.length > 0
    ) {
      const secondaryLocs = job.ashby_secondary_locations
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

  const handleEnhance = async () => {
    if (!source || !company || !id) {
      return;
    }

    setEnhancing(true);
    try {
      // Use GraphQL mutation to enhance the job
      const result = await enhanceJobMutation({
        variables: {
          jobId: id,
          company: company,
          source: source,
        },
      });

      if (result.data?.enhanceJobFromATS?.success) {
        // Refetch the job to get updated data from the backend
        await refetch();
      } else {
        const errorMsg =
          result.data?.enhanceJobFromATS?.message || "Failed to enhance job";
      }
    } catch (error) {
      console.error("Error enhancing job:", error);
    } finally {
      setEnhancing(false);
    }
  };

  const handleHideCompany = async () => {
    if (!user?.id) {
      return;
    }

    if (!job.company_key) {
      return;
    }

    const companyToHide = job.company_key;
    const currentExcludedCompanies =
      userSettingsData?.userSettings?.excluded_companies || [];

    if (currentExcludedCompanies.includes(companyToHide)) {
      return;
    }

    setHideCompanyLoading(true);

    try {
      await updateSettings({
        variables: {
          userId: user.id,
          settings: {
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
    } finally {
      setHideCompanyLoading(false);
    }
  };

  const savedApp = appsData?.applications?.find(
    (a) => a.jobId === job?.url || a.jobId === id,
  );

  const handleSaveJob = async () => {
    if (!user || !job) return;
    setSaving(true);
    try {
      await createApplicationMutation({
        variables: {
          input: {
            jobId: job.url ?? id,
            questions: [],
            jobTitle: job.title ?? undefined,
            companyName: job.company_key ?? undefined,
          },
        },
        refetchQueries: ["GetApplications"],
        awaitRefetchQueries: true,
      });
    } catch (err) {
      console.error("Error saving job:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container size="4" p="8" style={{ maxWidth: "1400px", width: "100%" }}>
      <Box mb="6">
        <Button variant="ghost" asChild>
          <Link href="/">← Back to Jobs</Link>
        </Button>
      </Box>

      {/* Header */}
      <Box mb="6">
        <Flex justify="between" align="start" mb="2">
          <Heading size="8">{job.title}</Heading>
          <Flex gap="2" align="center">
            {user && job.url && (
              <RadixLink href={job.url} target="_blank" rel="noopener noreferrer">
                <Button size="2" variant="soft">
                  Apply <ExternalLinkIcon />
                </Button>
              </RadixLink>
            )}
            {user && (
              <Tooltip content={savedApp ? "Saved to pipeline" : "Save to application pipeline"}>
                <Button
                  size="2"
                  variant={savedApp ? "solid" : "soft"}
                  color={savedApp ? "green" : "gray"}
                  onClick={savedApp ? () => router.push("/applications") : handleSaveJob}
                  disabled={saving}
                  loading={saving}
                >
                  {savedApp ? <BookmarkFilledIcon /> : <BookmarkIcon />}
                  {savedApp ? "Saved" : "Save Job"}
                </Button>
              </Tooltip>
            )}
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
                job.status === "eu_remote"
                  ? "green"
                  : job.status === "non_eu"
                    ? "red"
                    : job.status === "enhanced"
                      ? "blue"
                      : "gray"
              }
            >
              {job.status === "eu_remote"
                ? "✅ Fully Remote (EU)"
                : job.status === "non_eu"
                  ? "❌ Not Remote EU"
                  : job.status === "enhanced"
                    ? "🔄 Enhanced"
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
          {(source === "greenhouse" ||
            source === "ashby" ||
            source === "lever") && (
            <Button
              size="3"
              variant="soft"
              color="blue"
              onClick={handleEnhance}
              disabled={enhancing}
              loading={enhancing}
              style={{ cursor: "pointer" }}
            >
              {enhancing ? "Enhancing..." : `Enhance Job (${source})`}
            </Button>
          )}
          {(job.ashby_job_url || job.url) && (
            <Button asChild size="3" variant="outline">
              <a
                href={job.ashby_job_url || job.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Job →
              </a>
            </Button>
          )}
          {(job.ashby_apply_url || job.url) && (
            <Button asChild size="3">
              <a
                href={job.ashby_apply_url || job.url}
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
          {/* Ashby Job Data (from GraphQL) */}
          {job.source_kind === "ashby" &&
            (job.ashby_department ||
              job.ashby_team ||
              job.ashby_compensation) && (
              <Card>
                <Flex direction="column" gap="3">
                  <Flex justify="between" align="center" mb="2">
                    <Heading size="5">Job Details</Heading>
                    {job.ashby_apply_url && (
                      <Button asChild size="3">
                        <a
                          href={job.ashby_apply_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Apply Now →
                        </a>
                      </Button>
                    )}
                  </Flex>

                  <Box
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px 24px",
                    }}
                  >
                    {job.ashby_department && (
                      <Text size="2">
                        <Text weight="bold" as="span">
                          department:
                        </Text>{" "}
                        {job.ashby_department}
                      </Text>
                    )}

                    {job.ashby_team && (
                      <Text size="2">
                        <Text weight="bold" as="span">
                          team:
                        </Text>{" "}
                        {job.ashby_team}
                      </Text>
                    )}

                    {job.ashby_employment_type && (
                      <Text size="2">
                        <Text weight="bold" as="span">
                          employmentType:
                        </Text>{" "}
                        {job.ashby_employment_type}
                      </Text>
                    )}

                    {job.ashby_is_remote != null && (
                      <Text size="2">
                        <Text weight="bold" as="span">
                          isRemote:
                        </Text>{" "}
                        {job.ashby_is_remote ? "Yes ✅" : "No"}
                      </Text>
                    )}

                    {job.ashby_published_at && (
                      <Text size="2">
                        <Text weight="bold" as="span">
                          publishedAt:
                        </Text>{" "}
                        {new Date(job.ashby_published_at).toLocaleDateString()}
                      </Text>
                    )}

                    {job.ashby_is_listed != null && (
                      <Text size="2">
                        <Text weight="bold" as="span">
                          isListed:
                        </Text>{" "}
                        {job.ashby_is_listed ? "Yes" : "No (Direct link only)"}
                      </Text>
                    )}

                    {job.ashby_job_url && (
                      <Text size="2" style={{ gridColumn: "1 / -1" }}>
                        <Text weight="bold" as="span">
                          jobUrl:
                        </Text>{" "}
                        <a
                          href={job.ashby_job_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--accent-11)" }}
                        >
                          {job.ashby_job_url}
                        </a>
                      </Text>
                    )}

                    {job.ashby_apply_url && (
                      <Text size="2" style={{ gridColumn: "1 / -1" }}>
                        <Text weight="bold" as="span">
                          applyUrl:
                        </Text>{" "}
                        <a
                          href={job.ashby_apply_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--accent-11)" }}
                        >
                          {job.ashby_apply_url}
                        </a>
                      </Text>
                    )}
                  </Box>

                  {/* Address */}
                  {job.ashby_address?.postalAddress && (
                    <Box mt="2">
                      <Text weight="bold" size="3" mb="2">
                        address
                      </Text>
                      <Text size="2">
                        📍{" "}
                        {[
                          job.ashby_address.postalAddress.addressLocality,
                          job.ashby_address.postalAddress.addressRegion,
                          job.ashby_address.postalAddress.addressCountry,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </Text>
                    </Box>
                  )}

                  {/* Secondary Locations */}
                  {job.ashby_secondary_locations &&
                    job.ashby_secondary_locations.length > 0 && (
                      <Box mt="2">
                        <Text weight="bold" size="3" mb="2">
                          secondaryLocations
                        </Text>
                        <Flex direction="column" gap="1">
                          {job.ashby_secondary_locations.map((loc, idx) => (
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
                  {job.ashby_compensation && (
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
                        💰 compensation
                      </Heading>

                      {job.ashby_compensation.compensationTierSummary && (
                        <Box mb="2">
                          <Text size="1" weight="bold" color="gray">
                            compensationTierSummary:
                          </Text>
                          <Text size="2" weight="bold">
                            {job.ashby_compensation.compensationTierSummary}
                          </Text>
                        </Box>
                      )}

                      {job.ashby_compensation
                        .scrapeableCompensationSalarySummary && (
                        <Box mb="2">
                          <Text size="1" weight="bold" color="gray">
                            scrapeableCompensationSalarySummary:
                          </Text>
                          <Text size="2" weight="medium" color="gray">
                            {
                              job.ashby_compensation
                                .scrapeableCompensationSalarySummary
                            }
                          </Text>
                        </Box>
                      )}

                      {job.ashby_compensation.compensationTiers &&
                        job.ashby_compensation.compensationTiers.length > 0 && (
                          <Box mt="2">
                            <Text size="2" weight="bold" mb="1">
                              compensationTiers
                            </Text>
                            {job.ashby_compensation.compensationTiers.map(
                              (tier) => (
                                <Box key={tier.id} mt="2" ml="2">
                                  <Text size="2" weight="medium">
                                    {tier.title}
                                  </Text>
                                  {tier.tierSummary && (
                                    <Text size="2" color="gray">
                                      {tier.tierSummary}
                                    </Text>
                                  )}
                                  {tier.additionalInformation && (
                                    <Text size="1" color="gray" mt="1">
                                      {tier.additionalInformation}
                                    </Text>
                                  )}
                                  {tier.components &&
                                    tier.components.length > 0 && (
                                      <Flex direction="column" gap="1" mt="1">
                                        {tier.components.map((comp) => (
                                          <Text
                                            size="1"
                                            color="gray"
                                            key={comp.id}
                                          >
                                            • {comp.summary}
                                            {comp.minValue != null &&
                                              comp.maxValue != null && (
                                                <Text
                                                  as="span"
                                                  weight="medium"
                                                  ml="1"
                                                >
                                                  ({comp.currencyCode}{" "}
                                                  {comp.minValue.toLocaleString()}
                                                  {" - "}
                                                  {comp.maxValue.toLocaleString()}
                                                  {comp.interval &&
                                                    ` ${comp.interval}`}
                                                  )
                                                </Text>
                                              )}
                                          </Text>
                                        ))}
                                      </Flex>
                                    )}
                                </Box>
                              ),
                            )}
                          </Box>
                        )}

                      {job.ashby_compensation.summaryComponents &&
                        job.ashby_compensation.summaryComponents.length > 0 && (
                          <Box mt="2">
                            <Text size="2" weight="bold" mb="1">
                              summaryComponents
                            </Text>
                            <Flex direction="column" gap="1" ml="2">
                              {job.ashby_compensation.summaryComponents.map(
                                (comp) => (
                                  <Text size="1" color="gray" key={comp.id}>
                                    • {comp.summary}
                                    {comp.minValue != null &&
                                      comp.maxValue != null && (
                                        <Text as="span" weight="medium" ml="1">
                                          ({comp.currencyCode}{" "}
                                          {comp.minValue.toLocaleString()}
                                          {" - "}
                                          {comp.maxValue.toLocaleString()}
                                          {comp.interval && ` ${comp.interval}`}
                                          )
                                        </Text>
                                      )}
                                  </Text>
                                ),
                              )}
                            </Flex>
                          </Box>
                        )}
                    </Box>
                  )}

                  {/* Job Description */}
                  {job.description && (
                    <Box mt="3">
                      <Heading size="4" mb="2">
                        📄 Job Description
                      </Heading>
                      <Box
                        p="3"
                        style={{
                          backgroundColor: "var(--gray-2)",
                          borderRadius: "var(--radius-3)",
                          border: "1px solid var(--gray-5)",
                          maxHeight: "600px",
                          overflowY: "auto",
                        }}
                      >
                        <Text
                          as="div"
                          size="2"
                          style={{
                            lineHeight: "1.6",
                            whiteSpace: "pre-wrap",
                          }}
                          dangerouslySetInnerHTML={{
                            __html: job.description,
                          }}
                        />
                      </Box>
                    </Box>
                  )}
                </Flex>
              </Card>
            )}

          {/* Greenhouse Enhanced Data */}
          {job.source_kind === "greenhouse" &&
            (job.departments || job.offices || job.questions) && (
              <Card>
                <Flex direction="column" gap="4">
                  <Heading size="6" mb="2">
                    🌿 Enhanced Job Data (Greenhouse API)
                  </Heading>

                  {/* Basic Information */}
                  <Box>
                    <Heading size="4" mb="2">
                      Basic Information
                    </Heading>
                    <Box
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px 24px",
                      }}
                    >
                      {job.title && (
                        <Text size="2" style={{ gridColumn: "1 / -1" }}>
                          <Text weight="bold" as="span">
                            Title:
                          </Text>{" "}
                          {job.title}
                        </Text>
                      )}
                      {job.company_name && (
                        <Text size="2">
                          <Text weight="bold" as="span">
                            Company:
                          </Text>{" "}
                          {job.company_name}
                        </Text>
                      )}
                      {job.location && (
                        <Text size="2">
                          <Text weight="bold" as="span">
                            Location:
                          </Text>{" "}
                          {job.location}
                        </Text>
                      )}
                      {job.internal_job_id && (
                        <Text size="2">
                          <Text weight="bold" as="span">
                            Internal Job ID:
                          </Text>{" "}
                          {job.internal_job_id}
                        </Text>
                      )}
                      {job.requisition_id && (
                        <Text size="2">
                          <Text weight="bold" as="span">
                            Requisition ID:
                          </Text>{" "}
                          {job.requisition_id}
                        </Text>
                      )}
                      {job.external_id && (
                        <Text size="2">
                          <Text weight="bold" as="span">
                            Job Post ID:
                          </Text>{" "}
                          {job.external_id}
                        </Text>
                      )}
                      {job.language && (
                        <Text size="2">
                          <Text weight="bold" as="span">
                            Language:
                          </Text>{" "}
                          {job.language?.toUpperCase()}
                        </Text>
                      )}
                      {job.first_published && (
                        <Text size="2">
                          <Text weight="bold" as="span">
                            First Published:
                          </Text>{" "}
                          {new Date(job.first_published).toLocaleString()}
                        </Text>
                      )}
                      {job.updated_at && (
                        <Text size="2">
                          <Text weight="bold" as="span">
                            Last Updated:
                          </Text>{" "}
                          {new Date(job.updated_at).toLocaleString()}
                        </Text>
                      )}
                      {job.absolute_url && (
                        <Text size="2" style={{ gridColumn: "1 / -1" }}>
                          <Text weight="bold" as="span">
                            Job Board URL:
                          </Text>{" "}
                          <a
                            href={job.absolute_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "var(--accent-11)" }}
                          >
                            {job.absolute_url}
                          </a>
                        </Text>
                      )}
                    </Box>
                  </Box>

                  {/* Departments */}
                  {job.departments && job.departments.length > 0 && (
                    <Box>
                      <Heading size="4" mb="2">
                        Departments
                      </Heading>
                      <Flex direction="column" gap="2">
                        {job.departments.map((dept: any) => (
                          <Box
                            key={dept.id}
                            p="2"
                            style={{
                              backgroundColor: "var(--gray-3)",
                              borderRadius: "var(--radius-2)",
                            }}
                          >
                            <Text size="2" weight="medium">
                              {dept.name}
                            </Text>
                            <Text size="1" color="gray">
                              ID: {dept.id}
                              {dept.parent_id && ` | Parent: ${dept.parent_id}`}
                            </Text>
                          </Box>
                        ))}
                      </Flex>
                    </Box>
                  )}

                  {/* Offices */}
                  {job.offices && job.offices.length > 0 && (
                    <Box>
                      <Heading size="4" mb="2">
                        Offices / Locations
                      </Heading>
                      <Flex direction="column" gap="2">
                        {job.offices.map((office: any) => (
                          <Box
                            key={office.id}
                            p="2"
                            style={{
                              backgroundColor: "var(--gray-3)",
                              borderRadius: "var(--radius-2)",
                            }}
                          >
                            <Text size="2" weight="medium">
                              📍 {office.name}
                            </Text>
                            <Text size="1" color="gray">
                              ID: {office.id}
                              {office.location && ` | ${office.location}`}
                              {office.parent_id &&
                                ` | Parent: ${office.parent_id}`}
                            </Text>
                          </Box>
                        ))}
                      </Flex>
                    </Box>
                  )}

                  {/* Job Description */}
                  {job.description && job.source_kind === "greenhouse" && (
                    <Box>
                      <Heading size="4" mb="2">
                        Full Job Description
                      </Heading>
                      <Box
                        p="3"
                        style={{
                          backgroundColor: "var(--gray-2)",
                          borderRadius: "var(--radius-3)",
                          border: "1px solid var(--gray-5)",
                          maxHeight: "500px",
                          overflowY: "auto",
                        }}
                      >
                        <Text
                          as="div"
                          size="2"
                          style={{
                            lineHeight: "1.6",
                          }}
                          dangerouslySetInnerHTML={{
                            __html: job.description,
                          }}
                        />
                      </Box>
                    </Box>
                  )}

                  {/* Application Questions */}
                  {job.questions && job.questions.length > 0 && (
                    <Box>
                      <Heading size="4" mb="2">
                        Application Questions ({job.questions.length})
                      </Heading>
                      <Flex direction="column" gap="2">
                        {job.questions.map((q: any, idx: number) => (
                          <Box
                            key={idx}
                            p="3"
                            style={{
                              backgroundColor: "var(--gray-3)",
                              borderRadius: "var(--radius-2)",
                              border: "1px solid var(--gray-5)",
                            }}
                          >
                            <Flex justify="between" align="start" mb="1">
                              <Text size="2" weight="medium">
                                {idx + 1}. {q.label}
                              </Text>
                              {q.required && (
                                <Badge size="1" color="red">
                                  Required
                                </Badge>
                              )}
                            </Flex>
                            {q.description && (
                              <Text
                                size="1"
                                color="gray"
                                dangerouslySetInnerHTML={{
                                  __html: q.description,
                                }}
                              />
                            )}
                            {q.fields && q.fields.length > 0 && (
                              <Box mt="1">
                                {q.fields.map((field: any, fidx: number) => (
                                  <Text size="1" color="gray" key={fidx}>
                                    Field type: {field.type}
                                    {field.name && ` - ${field.name}`}
                                  </Text>
                                ))}
                              </Box>
                            )}
                          </Box>
                        ))}
                      </Flex>
                    </Box>
                  )}

                  {/* Location Questions */}
                  {job.location_questions &&
                    job.location_questions.length > 0 && (
                      <Box>
                        <Heading size="4" mb="2">
                          Location Questions ({job.location_questions.length})
                        </Heading>
                        <Flex direction="column" gap="2">
                          {job.location_questions.map((q: any, idx: number) => (
                            <Box
                              key={idx}
                              p="2"
                              style={{
                                backgroundColor: "var(--gray-3)",
                                borderRadius: "var(--radius-2)",
                              }}
                            >
                              <Text size="2">
                                {q.label}
                                {q.required && (
                                  <Badge size="1" color="red" ml="2">
                                    Required
                                  </Badge>
                                )}
                              </Text>
                            </Box>
                          ))}
                        </Flex>
                      </Box>
                    )}

                  {/* Data Compliance */}
                  {job.data_compliance && job.data_compliance.length > 0 && (
                    <Box>
                      <Heading size="4" mb="2">
                        Data Compliance
                      </Heading>
                      <Flex direction="column" gap="2">
                        {job.data_compliance.map((dc: any, idx: number) => (
                          <Box
                            key={idx}
                            p="3"
                            style={{
                              backgroundColor: "var(--blue-3)",
                              borderRadius: "var(--radius-2)",
                              border: "1px solid var(--blue-6)",
                            }}
                          >
                            <Flex gap="2" wrap="wrap" mb="1">
                              <Badge color="blue" size="2">
                                {dc.type.toUpperCase()}
                              </Badge>
                              {dc.requires_consent && (
                                <Badge size="1" color="orange">
                                  Requires Consent
                                </Badge>
                              )}
                              {dc.requires_processing_consent && (
                                <Badge size="1" color="orange">
                                  Processing Consent
                                </Badge>
                              )}
                              {dc.requires_retention_consent && (
                                <Badge size="1" color="orange">
                                  Retention Consent
                                </Badge>
                              )}
                            </Flex>
                            {dc.retention_period && (
                              <Text size="2" color="gray">
                                Retention: {dc.retention_period}
                              </Text>
                            )}
                          </Box>
                        ))}
                      </Flex>
                    </Box>
                  )}

                  {/* Compliance Forms (EEOC) */}
                  {job.compliance && job.compliance.length > 0 && (
                    <Box>
                      <Heading size="4" mb="2">
                        Compliance & EEOC Forms ({job.compliance.length})
                      </Heading>
                      <Flex direction="column" gap="3">
                        {job.compliance.map((comp: any, idx: number) => (
                          <Box
                            key={idx}
                            p="3"
                            style={{
                              backgroundColor: "var(--gray-2)",
                              borderRadius: "var(--radius-3)",
                              border: "1px solid var(--gray-6)",
                            }}
                          >
                            <Badge color="purple" size="2" mb="2">
                              {comp.type.toUpperCase()}
                            </Badge>
                            {comp.description && (
                              <Box
                                mt="2"
                                p="2"
                                style={{
                                  backgroundColor: "var(--gray-3)",
                                  borderRadius: "var(--radius-2)",
                                  maxHeight: "200px",
                                  overflowY: "auto",
                                }}
                              >
                                <Text
                                  size="1"
                                  as="div"
                                  dangerouslySetInnerHTML={{
                                    __html: comp.description,
                                  }}
                                />
                              </Box>
                            )}
                            {comp.questions && comp.questions.length > 0 && (
                              <Box mt="2">
                                <Text size="2" weight="medium">
                                  Questions: {comp.questions.length}
                                </Text>
                              </Box>
                            )}
                          </Box>
                        ))}
                      </Flex>
                    </Box>
                  )}

                  {/* Demographic Questions */}
                  {job.demographic_questions && (
                    <Box>
                      <Heading size="4" mb="2">
                        Demographic Questions
                      </Heading>
                      <Box
                        p="3"
                        style={{
                          backgroundColor: "var(--violet-3)",
                          borderRadius: "var(--radius-3)",
                          border: "1px solid var(--violet-6)",
                        }}
                      >
                        {job.demographic_questions.header && (
                          <Text size="3" weight="bold" mb="2">
                            {job.demographic_questions.header}
                          </Text>
                        )}
                        {job.demographic_questions.description && (
                          <Box
                            mb="2"
                            p="2"
                            style={{
                              backgroundColor: "var(--violet-2)",
                              borderRadius: "var(--radius-2)",
                            }}
                          >
                            <Text
                              size="2"
                              as="div"
                              dangerouslySetInnerHTML={{
                                __html: job.demographic_questions.description,
                              }}
                            />
                          </Box>
                        )}
                        {job.demographic_questions.questions &&
                          job.demographic_questions.questions.length > 0 && (
                            <Text size="2" color="gray">
                              Contains{" "}
                              {job.demographic_questions.questions.length}{" "}
                              demographic question(s)
                            </Text>
                          )}
                      </Box>
                    </Box>
                  )}
                </Flex>
              </Card>
            )}

          {/* Lever Enhanced Data */}
          {job.source_kind === "lever" &&
            (job.categories ||
              job.workplace_type ||
              job.country ||
              job.lists) && (
              <Card>
                <Flex direction="column" gap="4">
                  <Heading size="6" mb="2">
                    🎯 Enhanced Job Data (Lever API)
                  </Heading>

                  {/* Basic Information */}
                  <Box>
                    <Heading size="4" mb="2">
                      Basic Information
                    </Heading>
                    <Box
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px 24px",
                      }}
                    >
                      {job.title && (
                        <Text size="2" style={{ gridColumn: "1 / -1" }}>
                          <Text weight="bold" as="span">
                            Title:
                          </Text>{" "}
                          {job.title}
                        </Text>
                      )}
                      {job.workplace_type && (
                        <Text size="2">
                          <Text weight="bold" as="span">
                            Workplace Type:
                          </Text>{" "}
                          <Badge
                            color={
                              job.workplace_type === "remote"
                                ? "green"
                                : job.workplace_type === "hybrid"
                                  ? "blue"
                                  : "gray"
                            }
                          >
                            {job.workplace_type.toUpperCase()}
                          </Badge>
                        </Text>
                      )}
                      {job.country && (
                        <Text size="2">
                          <Text weight="bold" as="span">
                            Country:
                          </Text>{" "}
                          {job.country}
                        </Text>
                      )}
                      {job.ats_created_at && (
                        <Text size="2">
                          <Text weight="bold" as="span">
                            Created in ATS:
                          </Text>{" "}
                          {new Date(job.ats_created_at).toLocaleString()}
                        </Text>
                      )}
                      {job.updated_at && (
                        <Text size="2">
                          <Text weight="bold" as="span">
                            Last Updated:
                          </Text>{" "}
                          {new Date(job.updated_at).toLocaleString()}
                        </Text>
                      )}
                      {job.external_id && (
                        <Text size="2" style={{ gridColumn: "1 / -1" }}>
                          <Text weight="bold" as="span">
                            Job URL:
                          </Text>{" "}
                          <a
                            href={job.external_id}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "var(--accent-11)" }}
                          >
                            {job.external_id}
                          </a>
                        </Text>
                      )}
                    </Box>
                  </Box>

                  {/* Categories */}
                  {job.categories && (
                    <Box>
                      <Heading size="4" mb="2">
                        Categories
                      </Heading>
                      <Box
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "12px 24px",
                        }}
                      >
                        {job.categories.commitment && (
                          <Text size="2">
                            <Text weight="bold" as="span">
                              Commitment:
                            </Text>{" "}
                            {job.categories.commitment}
                          </Text>
                        )}
                        {job.categories.department && (
                          <Text size="2">
                            <Text weight="bold" as="span">
                              Department:
                            </Text>{" "}
                            {job.categories.department}
                          </Text>
                        )}
                        {job.categories.team && (
                          <Text size="2">
                            <Text weight="bold" as="span">
                              Team:
                            </Text>{" "}
                            {job.categories.team}
                          </Text>
                        )}
                        {job.categories.location && (
                          <Text size="2">
                            <Text weight="bold" as="span">
                              Location:
                            </Text>{" "}
                            {job.categories.location}
                          </Text>
                        )}
                        {job.categories.allLocations &&
                          job.categories.allLocations.length > 0 && (
                            <Text size="2" style={{ gridColumn: "1 / -1" }}>
                              <Text weight="bold" as="span">
                                All Locations:
                              </Text>{" "}
                              {job.categories.allLocations.join(", ")}
                            </Text>
                          )}
                      </Box>
                    </Box>
                  )}

                  {/* Job Description Sections */}
                  {(job.opening || job.description_body || job.additional) && (
                    <Box>
                      <Heading size="4" mb="2">
                        Job Description
                      </Heading>
                      <Flex direction="column" gap="3">
                        {job.opening && (
                          <Box>
                            <Text size="2" weight="bold" mb="1">
                              Opening
                            </Text>
                            <Box
                              p="3"
                              style={{
                                backgroundColor: "var(--gray-2)",
                                borderRadius: "var(--radius-3)",
                              }}
                            >
                              <Text
                                size="2"
                                as="div"
                                dangerouslySetInnerHTML={{
                                  __html: job.opening,
                                }}
                              />
                            </Box>
                          </Box>
                        )}
                        {job.description_body && (
                          <Box>
                            <Text size="2" weight="bold" mb="1">
                              Description
                            </Text>
                            <Box
                              p="3"
                              style={{
                                backgroundColor: "var(--gray-2)",
                                borderRadius: "var(--radius-3)",
                              }}
                            >
                              <Text
                                size="2"
                                as="div"
                                dangerouslySetInnerHTML={{
                                  __html: job.description_body,
                                }}
                              />
                            </Box>
                          </Box>
                        )}
                        {job.additional && (
                          <Box>
                            <Text size="2" weight="bold" mb="1">
                              Additional Information
                            </Text>
                            <Box
                              p="3"
                              style={{
                                backgroundColor: "var(--gray-2)",
                                borderRadius: "var(--radius-3)",
                              }}
                            >
                              <Text
                                size="2"
                                as="div"
                                dangerouslySetInnerHTML={{
                                  __html: job.additional,
                                }}
                              />
                            </Box>
                          </Box>
                        )}
                      </Flex>
                    </Box>
                  )}

                  {/* Requirements/Lists */}
                  {job.lists && job.lists.length > 0 && (
                    <Box>
                      <Heading size="4" mb="2">
                        Requirements & Details
                      </Heading>
                      <Flex direction="column" gap="3">
                        {job.lists.map((list: any, idx: number) => (
                          <Box
                            key={idx}
                            p="3"
                            style={{
                              backgroundColor: "var(--blue-2)",
                              borderRadius: "var(--radius-3)",
                              border: "1px solid var(--blue-6)",
                            }}
                          >
                            {list.text && (
                              <Text size="3" weight="bold" mb="2">
                                {list.text}
                              </Text>
                            )}
                            {list.content && (
                              <Box
                                as="div"
                                dangerouslySetInnerHTML={{
                                  __html: `<ul style="margin: 0; padding-left: 20px;">${list.content}</ul>`,
                                }}
                              />
                            )}
                          </Box>
                        ))}
                      </Flex>
                    </Box>
                  )}
                </Flex>
              </Card>
            )}

          {/* Fallback to DB description if no Ashby data and not Greenhouse/Lever */}
          {job.source_kind !== "ashby" &&
            job.description &&
            job.source_kind !== "greenhouse" &&
            job.source_kind !== "lever" && (
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
                  <>
                    <Text size="2" color="gray">
                      <Text weight="medium" as="span">
                        Reason:
                      </Text>{" "}
                      {job.remote_eu_reason}
                    </Text>
                    {job.remote_eu_reason.startsWith("Backfilled from") && (
                      <Text size="1" color="orange" mt="1">
                        Placeholder from migration — click Re-classify for AI
                        analysis.
                      </Text>
                    )}
                  </>
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

          {/* Skill Match Against User Preferences */}
          {user && job.skills && job.skills.length > 0 && (() => {
            const preferredSkills = userSettingsData?.userSettings?.preferred_skills ?? [];
            if (preferredSkills.length === 0) return null;

            const jobTags = new Set(job.skills.map((s) => s.tag.toLowerCase()));
            const matched = preferredSkills.filter((s) => jobTags.has(s.toLowerCase()));
            const unmatched = preferredSkills.filter((s) => !jobTags.has(s.toLowerCase()));
            const pct = Math.round((matched.length / preferredSkills.length) * 100);

            return (
              <Card>
                <Flex justify="between" align="center" mb="2">
                  <Heading size="5">Skill Match</Heading>
                  <Badge
                    size="2"
                    color={pct >= 75 ? "green" : pct >= 40 ? "orange" : "red"}
                  >
                    {matched.length}/{preferredSkills.length} ({pct}%)
                  </Badge>
                </Flex>
                <Text size="1" color="gray" mb="3">
                  Based on your preferred skills
                </Text>
                {matched.length > 0 && (
                  <Flex gap="2" wrap="wrap" mb="2">
                    {matched.map((s) => (
                      <Badge key={s} size="2" color="green" variant="soft">
                        {getSkillLabel(s)}
                      </Badge>
                    ))}
                  </Flex>
                )}
                {unmatched.length > 0 && (
                  <Flex gap="2" wrap="wrap">
                    {unmatched.map((s) => (
                      <Badge key={s} size="2" color="gray" variant="soft" style={{ opacity: 0.6 }}>
                        {getSkillLabel(s)}
                      </Badge>
                    ))}
                  </Flex>
                )}
              </Card>
            );
          })()}

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

      {relatedJobs.length > 0 && (
        <Box mt="8">
          <Heading size="5" mb="4">
            More from {job.company_key}
          </Heading>
          <Flex direction="column" gap="3">
            {relatedJobs.map((rj) => {
              const rjId = rj.external_id?.split("/").pop() || rj.external_id || rj.id;
              return (
              <Card key={rj.id} asChild>
                <Link href={`/jobs/${rjId}?company=${rj.company_key}&source=${rj.source_kind}`} style={{ textDecoration: "none" }}>
                  <Flex justify="between" align="start" gap="4">
                    <Flex direction="column" gap="1">
                      <Text size="3" weight="medium">
                        {rj.title}
                      </Text>
                      {rj.location && (
                        <Text size="2" color="gray">
                          {rj.location}
                        </Text>
                      )}
                    </Flex>
                    {rj.posted_at && (
                      <Text size="1" color="gray" style={{ whiteSpace: "nowrap" }}>
                        {new Date(rj.posted_at).toLocaleDateString()}
                      </Text>
                    )}
                  </Flex>
                </Link>
              </Card>
              );
            })}
          </Flex>
        </Box>
      )}
    </Container>
  );
}

export default function JobPage() {
  return <JobPageContent />;
}
