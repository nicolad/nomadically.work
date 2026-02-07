"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useGetJobsQuery, useDeleteJobMutation } from "@/__generated__/hooks";
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
  const [debouncedSearch, setDebouncedSearch] = useState(
    searchParams.get("q") || "",
  );
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useUser();
  const [deleteJobMutation] = useDeleteJobMutation();

  // Check if current user is admin
  const isAdmin = user?.primaryEmailAddress?.emailAddress === ADMIN_EMAIL;

  // Handle delete job
  const handleDeleteJob = async (jobId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this job?")) {
      return;
    }

    try {
      await deleteJobMutation({
        variables: { id: jobId },
        refetchQueries: ["GetJobs"],
        awaitRefetchQueries: true,
      });
    } catch (error) {
      console.error("Error deleting job:", error);
      alert("Failed to delete job. Please try again.");
    }
  };

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Update URL when debounced search changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set("q", debouncedSearch);
    } else {
      params.delete("q");
    }
    const newUrl = params.toString() ? `?${params.toString()}` : "/";
    router.replace(newUrl, { scroll: false });
  }, [debouncedSearch, router]);

  const { loading, error, data, refetch, fetchMore } = useGetJobsQuery({
    variables: {
      search: debouncedSearch || undefined,
      limit: 20,
      offset: 0,
    },
    pollInterval: 60000, // Refresh every minute
    notifyOnNetworkStatusChange: true,
  });

  const jobs = data?.jobs.jobs || [];
  const totalCount = data?.jobs.totalCount || 0;

  // Check if we have more jobs to load
  useEffect(() => {
    setHasMore(jobs.length < totalCount);
  }, [jobs.length, totalCount]);

  // Reset hasMore when search changes
  useEffect(() => {
    setHasMore(true);
  }, [debouncedSearch]);

  // Load more jobs
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    try {
      await fetchMore({
        variables: {
          offset: jobs.length,
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
  }, [hasMore, loading, jobs.length, fetchMore]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, loading, loadMore]);

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
                    <Link
                      href={`/boards/${job.company_key}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        textDecoration: "none",
                        color: "inherit",
                        position: "relative",
                        zIndex: 10,
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
      <Box ref={loadMoreRef} py="6">
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
