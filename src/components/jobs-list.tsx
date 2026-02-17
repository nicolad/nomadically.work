"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useGetJobsQuery,
  useDeleteJobMutation,
  useGetUserSettingsQuery,
} from "@/__generated__/hooks";
import type { GetJobsQuery } from "@/__generated__/graphql";
import { last, split, sortBy } from "lodash";
import { useAuth } from "@/lib/auth-hooks";
import {
  Box,
  Container,
  Text,
  Flex,
  Spinner,
  IconButton,
} from "@radix-ui/themes";
import { TrashIcon } from "@radix-ui/react-icons";
import { ADMIN_EMAIL } from "@/lib/constants";
import { getSkillLabel } from "@/lib/skills/taxonomy";

type Job = GetJobsQuery["jobs"]["jobs"][number];
type BadgeColor = "green" | "orange" | "blue" | "gray";

type JobStatus = "eu_remote" | "non_eu" | "enhanced" | "new" | "error" | "all";

interface JobsListProps {
  searchFilter?: string;
}

const getStatusBadgeColor = (status: Job["status"]): BadgeColor => {
  switch (status) {
    case "eu_remote":
      return "green";
    case "enhanced":
      return "blue";
    default:
      return "gray";
  }
};

const getStatusLabel = (status: Job["status"]): string => {
  switch (status) {
    case "eu_remote":
      return "EU Remote";
    case "non_eu":
      return "Not Remote EU";
    case "enhanced":
      return "Enhanced";
    default:
      return status ?? "Unknown";
  }
};

export function JobsList({ searchFilter = "" }: JobsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { user } = useAuth();
  const [deleteJobMutation] = useDeleteJobMutation();

  // Check if current user is admin
  const isAdmin = user?.email === ADMIN_EMAIL;

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

  // Memoize query variables to ensure stable object reference
  const queryVariables = useMemo(
    () => ({
      search: searchFilter || undefined,
      limit: 20,
      offset: 0,
      excludedCompanies:
        excludedCompanies.length > 0 ? excludedCompanies : undefined,
    }),
    [searchFilter, excludedCompanies],
  );

  const { loading, error, data, refetch, fetchMore } = useGetJobsQuery({
    variables: queryVariables,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only", // Force network fetch to ensure fresh data
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
        },
      });
    } catch (err) {
      console.error("Error loading more jobs:", err);
    }
  }, [hasMore, loading, jobs.length, fetchMore]);

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
          { threshold: 0.1 },
        );
        observerRef.current.observe(node);
      }
    },
    [hasMore, loading, loadMore],
  );

  if (error) {
    return (
      <Container size="4" p="8">
        <Text color="red">Error loading jobs: {error.message}</Text>
        <button
          className="yc-cta"
          onClick={() => refetch()}
          style={{ marginTop: 12 }}
        >
          retry
        </button>
      </Container>
    );
  }

  return (
    <Box>
      {/* header row */}
      <Flex
        justify="between"
        align="center"
        py="2"
        px="3"
        style={{ borderBottom: "1px solid var(--gray-6)" }}
      >
        <span className="yc-row-title" style={{ fontSize: 14 }}>
          jobs
        </span>
        <span className="yc-row-meta">
          {jobs.length}/{totalCount}
        </span>
      </Flex>

      {/* dense ruled list */}
      <div style={{ borderTop: "1px solid var(--gray-6)" }}>
        {jobs.map((job) => {
          const jobId = last(split(job.external_id, "/")) || job.external_id;

          return (
            <Link
              key={job.id}
              href={`/jobs/${jobId}?company=${job.company_key}&source=${job.source_kind}`}
              target="_blank"
              className="yc-row"
            >
              {/* left: title + inline meta */}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="yc-row-title">{job.title}</span>

                  {/* micro-pill status */}
                  {job.status && (
                    <span
                      style={{
                        fontFamily: "var(--yc-font-mono)",
                        fontSize: 10,
                        padding: "0 4px",
                        border: `1px solid ${
                          job.status === "eu_remote"
                            ? "var(--green-9)"
                            : job.status === "non_eu"
                              ? "var(--orange-9)"
                              : "var(--gray-6)"
                        }`,
                        color:
                          job.status === "eu_remote"
                            ? "var(--green-9)"
                            : job.status === "non_eu"
                              ? "var(--orange-9)"
                              : "var(--gray-9)",
                        lineHeight: "16px",
                        whiteSpace: "nowrap",
                        textTransform: "lowercase",
                      }}
                    >
                      {getStatusLabel(job.status)}
                    </span>
                  )}
                </div>

                {/* inline metadata line */}
                <span className="yc-row-meta">
                  {job.company_key && (
                    <span
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        router.push(`/boards/${job.company_key}`);
                      }}
                      style={{
                        cursor: "pointer",
                        textDecoration: "underline",
                        textUnderlineOffset: 2,
                      }}
                    >
                      {job.company_key}
                    </span>
                  )}
                  {job.location && <span> · {job.location}</span>}
                  {job.source_kind && <span> · {job.source_kind}</span>}
                  {job.posted_at && (
                    <span>
                      {" "}
                      · {new Date(job.posted_at).toLocaleDateString()}
                    </span>
                  )}
                  {job.skills && job.skills.length > 0 && (
                    <span>
                      {" · "}
                      {sortBy(job.skills, [(s) => s.level !== "required"])
                        .slice(0, 4)
                        .map((s) => getSkillLabel(s.tag))
                        .join(", ")}
                      {job.skills.length > 4 && ` +${job.skills.length - 4}`}
                    </span>
                  )}
                </span>
              </div>

              {/* right: CTA + admin */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginLeft: 12,
                }}
              >
                {job.url && (
                  <span
                    className="yc-cta"
                    style={{ fontSize: 11, padding: "2px 8px" }}
                  >
                    apply
                  </span>
                )}
                {isAdmin && (
                  <IconButton
                    size="1"
                    color="red"
                    variant="ghost"
                    onClick={(e) => handleDeleteJob(job.id, e)}
                    style={{ cursor: "pointer" }}
                  >
                    <TrashIcon width={12} height={12} />
                  </IconButton>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* infinite scroll trigger */}
      {hasMore && (
        <Box ref={loadMoreRefCallback} py="4">
          {loading && (
            <Flex justify="center" align="center">
              <Spinner size="2" />
            </Flex>
          )}
          {!loading && (
            <Flex justify="center">
              <span className="yc-row-meta">scroll for more…</span>
            </Flex>
          )}
        </Box>
      )}

      {!hasMore && jobs.length > 0 && (
        <Box py="4">
          <Flex justify="center">
            <span className="yc-row-meta">
              {jobs.length}/{totalCount} loaded
            </span>
          </Flex>
        </Box>
      )}
    </Box>
  );
}
