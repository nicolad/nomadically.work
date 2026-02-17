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
  Badge,
  Spinner,
  IconButton,
} from "@radix-ui/themes";
import { TrashIcon, HeartIcon, HeartFilledIcon } from "@radix-ui/react-icons";
import { ADMIN_EMAIL } from "@/lib/constants";
import { getSkillLabel } from "@/lib/skills/taxonomy";

type Job = GetJobsQuery["jobs"]["jobs"][number];

interface JobsListProps {
  searchFilter?: string;
}

const getStatusLabel = (status: Job["status"]): string => {
  switch (status) {
    case "eu_remote":
      return "eu remote";
    case "non_eu":
      return "not remote eu";
    case "enhanced":
      return "enhanced";
    default:
      return status ?? "unknown";
  }
};

/** First letter of each word in company_key, max 2 chars */
function companyInitials(key: string): string {
  return key
    .split(/[-_.]/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function JobsList({ searchFilter = "" }: JobsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { user } = useAuth();
  const [deleteJobMutation] = useDeleteJobMutation();
  const [saved, setSaved] = useState<Set<number>>(new Set());

  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data: userSettingsData } = useGetUserSettingsQuery({
    variables: { userId: user?.id || "" },
    skip: !user?.id,
  });

  const excludedCompanies =
    userSettingsData?.userSettings?.excluded_companies || [];

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

  const toggleSave = (jobId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

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
    fetchPolicy: "network-only",
  });

  const jobs = data?.jobs.jobs || [];
  const totalCount = data?.jobs.totalCount || 0;
  const hasMore = jobs.length < totalCount;

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    try {
      await fetchMore({ variables: { offset: jobs.length } });
    } catch (err) {
      console.error("Error loading more jobs:", err);
    }
  }, [hasMore, loading, jobs.length, fetchMore]);

  const loadMoreRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (node && hasMore && !loading) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) loadMore();
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
      {/* header */}
      <Flex justify="between" align="center" py="2" px="3">
        <Text size="2" weight="medium" style={{ color: "var(--gray-11)" }}>
          jobs
        </Text>
        <Text
          size="1"
          style={{ fontFamily: "var(--yc-font-mono)", color: "var(--gray-9)" }}
        >
          {jobs.length}/{totalCount}
        </Text>
      </Flex>

      {/* card container */}
      <div className="job-list-card">
        {jobs.map((job, idx) => {
          const jobId = last(split(job.external_id, "/")) || job.external_id;
          const isSaved = saved.has(job.id);

          return (
            <Link
              key={job.id}
              href={`/jobs/${jobId}?company=${job.company_key}&source=${job.source_kind}`}
              target="_blank"
              className="job-row"
            >
              {/* company avatar */}
              <div className="job-row-avatar">
                {companyInitials(job.company_key || "?")}
              </div>

              {/* content — stacked: title, company, meta */}
              <div className="job-row-content">
                {/* line 1: title + status pill */}
                <div className="job-row-title-line">
                  <span className="job-row-title">{job.title}</span>
                  {job.status && (
                    <Badge
                      size="1"
                      variant="soft"
                      color={
                        job.status === "eu_remote"
                          ? "green"
                          : job.status === "non_eu"
                            ? "amber"
                            : "gray"
                      }
                      style={{ fontSize: 10, textTransform: "lowercase" }}
                    >
                      {getStatusLabel(job.status)}
                    </Badge>
                  )}
                </div>

                {/* line 2: company name */}
                {job.company_key && (
                  <span
                    className="job-row-company"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push(`/boards/${job.company_key}`);
                    }}
                  >
                    {job.company_key}
                  </span>
                )}

                {/* line 3: structured metadata */}
                <div className="job-row-meta-line">
                  {job.location && (
                    <span className="job-row-meta-item">
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 15 15"
                        fill="none"
                        style={{ opacity: 0.5, flexShrink: 0 }}
                      >
                        <path
                          d="M7.5 0C4.46 0 2 2.46 2 5.5 2 9.64 7.5 15 7.5 15S13 9.64 13 5.5C13 2.46 10.54 0 7.5 0Zm0 7.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"
                          fill="currentColor"
                        />
                      </svg>
                      {job.location}
                    </span>
                  )}
                  {job.source_kind && (
                    <span className="job-row-meta-badge">
                      {job.source_kind}
                    </span>
                  )}
                  {job.posted_at && (
                    <span
                      className="job-row-meta-item"
                      style={{ color: "var(--gray-8)" }}
                    >
                      {new Date(job.posted_at).toLocaleDateString()}
                    </span>
                  )}
                  {job.skills && job.skills.length > 0 && (
                    <span
                      className="job-row-meta-item"
                      style={{ color: "var(--gray-8)" }}
                    >
                      {sortBy(job.skills, [(s) => s.level !== "required"])
                        .slice(0, 3)
                        .map((s) => getSkillLabel(s.tag))
                        .join(", ")}
                      {job.skills.length > 3 && ` +${job.skills.length - 3}`}
                    </span>
                  )}
                </div>
              </div>

              {/* right actions */}
              <div className="job-row-actions">
                <IconButton
                  size="1"
                  variant="ghost"
                  color="gray"
                  onClick={(e) => toggleSave(job.id, e)}
                  style={{ cursor: "pointer" }}
                >
                  {isSaved ? (
                    <HeartFilledIcon
                      width={14}
                      height={14}
                      style={{ color: "var(--red-9)" }}
                    />
                  ) : (
                    <HeartIcon width={14} height={14} />
                  )}
                </IconButton>

                {job.url && (
                  <span
                    className="yc-cta"
                    style={{ fontSize: 11, padding: "3px 10px" }}
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

        {/* empty border-bottom guard */}
        {jobs.length === 0 && !loading && (
          <Flex justify="center" py="6">
            <Text size="2" style={{ color: "var(--gray-9)" }}>
              no jobs found
            </Text>
          </Flex>
        )}
      </div>

      {/* infinite scroll trigger */}
      {hasMore && (
        <Box ref={loadMoreRefCallback} py="4">
          {loading ? (
            <Flex justify="center" align="center">
              <Spinner size="2" />
            </Flex>
          ) : (
            <Flex justify="center">
              <Text
                size="1"
                style={{
                  fontFamily: "var(--yc-font-mono)",
                  color: "var(--gray-9)",
                }}
              >
                scroll for more…
              </Text>
            </Flex>
          )}
        </Box>
      )}

      {!hasMore && jobs.length > 0 && (
        <Box py="4">
          <Flex justify="center">
            <Text
              size="1"
              style={{
                fontFamily: "var(--yc-font-mono)",
                color: "var(--gray-9)",
              }}
            >
              {jobs.length}/{totalCount} loaded
            </Text>
          </Flex>
        </Box>
      )}
    </Box>
  );
}
