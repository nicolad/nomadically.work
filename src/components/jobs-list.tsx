"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useGetJobsQuery,
  useDeleteJobMutation,
  useGetUserSettingsQuery,
} from "@/__generated__/hooks";
import type { GetJobsQuery } from "@/__generated__/graphql";
import { last, split } from "lodash";
import { useUser } from "@clerk/nextjs";
import {
  Box,
  Container,
  Heading,
  Text,
  Flex,
  Card,
  Badge,
  Button,
  TextField,
  Spinner,
  IconButton,
} from "@radix-ui/themes";
import { TrashIcon } from "@radix-ui/react-icons";
import { ADMIN_EMAIL } from "@/lib/constants";
import { getSkillLabel } from "@/lib/skills/taxonomy";

type Job = GetJobsQuery["jobs"]["jobs"][number];
type BadgeColor = "green" | "orange" | "blue" | "gray";

type JobStatus = "eu-remote" | "non-eu-remote" | "eu-onsite" | "non-eu" | "all";

const getStatusBadgeColor = (status: Job["status"]): BadgeColor => {
  switch (status) {
    case "eu-remote":
      return "green";
    case "uk-remote":
      return "blue";
    default:
      return "gray";
  }
};

const getStatusLabel = (status: Job["status"]): string => {
  switch (status) {
    case "eu-remote":
      return "EU Remote";
    case "uk-remote":
      return "UK Remote";
    default:
      return status ?? "Unknown";
  }
};

export function JobsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { user } = useUser();
  const [deleteJobMutation] = useDeleteJobMutation();

  // Check if current user is admin
  const isAdmin = user?.primaryEmailAddress?.emailAddress === ADMIN_EMAIL;

  // Fetch user settings to get excluded companies
  const { data: userSettingsData } = useGetUserSettingsQuery({
    variables: { userId: user?.id || "" },
    skip: !user?.id,
  });

  const excludedCompanies =
    userSettingsData?.userSettings?.excluded_companies || [];

  // Handle delete job
  const handleDeleteJob = async (jobId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await deleteJobMutation({
        variables: { id: jobId },
        refetchQueries: ["GetJobs"],
        awaitRefetchQueries: true,
      });
    } catch (error) {
      console.error("Error deleting job:", error);
    }
  };

  const { loading, error, data, refetch, fetchMore } = useGetJobsQuery({
    variables: {
      search: searchTerm || undefined,
      limit: 20,
      offset: 0,
      excludedCompanies:
        excludedCompanies.length > 0 ? excludedCompanies : undefined,
    },
    pollInterval: 60000, // Refresh every minute
    notifyOnNetworkStatusChange: true,
  });

  const jobs = data?.jobs.jobs || [];
  const totalCount = data?.jobs.totalCount || 0;
  const hasMore = jobs.length < totalCount;

  // Load more jobs
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    try {
      await fetchMore({
        variables: {
          offset: jobs.length,
          excludedCompanies:
            excludedCompanies.length > 0 ? excludedCompanies : undefined,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return {
            jobs: {
              ...fetchMoreResult.jobs,
              jobs: [...prev.jobs.jobs, ...fetchMoreResult.jobs.jobs],
            },
          };
        },
      });
    } catch (err) {
      console.error("Error loading more jobs:", err);
    }
  }, [hasMore, loading, jobs.length, fetchMore, excludedCompanies]);

  // Ref callback for infinite scroll
  const loadMoreRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      
      if (node && hasMore && !loading) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              loadMore();
            }
          },
          { threshold: 0.1 }
        );
        observerRef.current.observe(node);
      }
    },
    [hasMore, loading, loadMore]
  );

  if (error) {
    return (
      <Container size="4" p="8">
        <Text color="red">Error loading jobs: {error.message}</Text>
        <Button onClick={() => refetch()} mt="4">
          Retry
        </Button>
      </Container>
    );
  }

  return (
    <Container size="4" px="8">
      <Flex justify="between" align="center" mb="6">
        <Heading size="8">Remote Jobs</Heading>
        <Text size="2" color="gray">
          {jobs.length} of {totalCount} jobs
        </Text>
      </Flex>

      <Box mb="4">
        <TextField.Root
          placeholder="Search jobs by title, company, location, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="3"
        />
      </Box>

      <Flex direction="column" gap="4">
        {jobs.map((job) => {
          // Extract the Ashby UUID from external_id (which might be a full URL)
          const jobId = last(split(job.external_id, "/")) || job.external_id;

          return (
            <Card key={job.id} size="3" asChild>
              <Link
                href={`/jobs/${jobId}?company=${job.company_key}&source=${job.source_kind}`}
                target="_blank"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  cursor: "pointer",
                }}
              >
                <Flex justify="between" align="start" mb="2">
                  <Heading size="5">{job.title}</Heading>
                  <Flex gap="2" align="center">
                    {job.status && (
                      <Badge color={getStatusBadgeColor(job.status)}>
                        {getStatusLabel(job.status)}
                      </Badge>
                    )}
                    {isAdmin && (
                      <IconButton
                        size="2"
                        color="red"
                        variant="soft"
                        onClick={(e) => handleDeleteJob(job.id, e)}
                        style={{ cursor: "pointer" }}
                      >
                        <TrashIcon />
                      </IconButton>
                    )}
                  </Flex>
                </Flex>

                <Flex gap="2" mb="2" wrap="wrap" align="center">
                  {job.company_key && (
                    <Text
                      weight="medium"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        router.push(`/boards/${job.company_key}`);
                      }}
                      style={{
                        cursor: "pointer",
                        textDecoration: "underline",
                        textUnderlineOffset: "2px",
                      }}
                    >
                      {job.company_key}
                    </Text>
                  )}
                  {job.location && <Text color="gray">• {job.location}</Text>}
                </Flex>

                {job.source_kind && (
                  <Text size="2" color="gray" mb="2">
                    {job.source_kind}
                  </Text>
                )}

                {job.description && (
                  <Text
                    size="2"
                    color="gray"
                    mb="3"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {job.description}
                  </Text>
                )}

                {/* Skills */}
                {job.skills && job.skills.length > 0 && (
                  <Flex gap="1" wrap="wrap" mb="3">
                    {[...job.skills]
                      .sort((a, b) => {
                        // Show required skills first
                        if (a.level === "required" && b.level !== "required")
                          return -1;
                        if (a.level !== "required" && b.level === "required")
                          return 1;
                        return 0;
                      })
                      .slice(0, 8)
                      .map((skill) => (
                        <Badge
                          key={skill.tag}
                          size="1"
                          color={
                            skill.level === "required"
                              ? "red"
                              : skill.level === "preferred"
                                ? "blue"
                                : "gray"
                          }
                          variant="soft"
                        >
                          {getSkillLabel(skill.tag)}
                          {skill.level === "required" && " ⚠️"}
                        </Badge>
                      ))}
                    {job.skills.length > 8 && (
                      <Badge size="1" variant="soft" color="gray">
                        +{job.skills.length - 8} more
                      </Badge>
                    )}
                  </Flex>
                )}
Callback
                <Flex justify="between" align="center" mt="4">
                  <Text size="1" color="gray">
                    {job.source_kind && <span>Source: {job.source_kind}</span>}
                    {job.posted_at && (
                      <span style={{ marginLeft: "12px" }}>
                        Posted: {new Date(job.posted_at).toLocaleDateString()}
                      </span>
                    )}
                  </Text>

                  {job.url && <Button size="2">View Job</Button>}
                </Flex>
              </Link>
            </Card>
          );
        })}
      </Flex>

      {/* Infinite scroll trigger */}
      <Box ref={loadMoreRefCallback} py="6">
        {loading && (
          <Flex justify="center" align="center">
            <Spinner size="3" />
          </Flex>
        )}
        {!loading && hasMore && (
          <Flex justify="center">
            <Text size="2" color="gray">
              Scroll for more...
            </Text>
          </Flex>
        )}
        {!loading && !hasMore && jobs.length > 0 && (
          <Flex justify="center">
            <Text size="2" color="gray">
              No more jobs to load
            </Text>
          </Flex>
        )}
      </Box>
    </Container>
  );
}
