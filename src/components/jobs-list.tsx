"use client";

import { useRef, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useGetJobsQuery,
  useDeleteJobMutation,
  useGetUserSettingsQuery,
  useUpdateUserSettingsMutation,
  useReportJobMutation,
} from "@/__generated__/hooks";
import type { GetJobsQuery } from "@/__generated__/graphql";
import { sortBy } from "lodash";
import { extractJobSlug } from "@/lib/job-utils";
import { useAuth } from "@/lib/auth-hooks";
import {
  Box,
  Container,
  Text,
  Flex,
  Badge,
  Spinner,
  IconButton,
  Skeleton,
} from "@radix-ui/themes";
import { TrashIcon, ExclamationTriangleIcon, EyeNoneIcon } from "@radix-ui/react-icons";
import { ADMIN_EMAIL } from "@/lib/constants";
import { getSkillLabel } from "@/lib/skills/taxonomy";

type Job = GetJobsQuery["jobs"]["jobs"][number];

interface JobsListProps {
  searchFilter?: string;
  sourceTypes?: string[];
}

const getStatusLabel = (status: Job["status"]): string => {
  switch (status) {
    case "eu_remote":
      return "eu remote";
    case "non_eu":
      return "not remote eu";
    case "enhanced":
      return "enhanced";
    case "reported":
      return "reported";
    default:
      return status ?? "unknown";
  }
};


export function JobsList({ searchFilter = "", sourceTypes }: JobsListProps) {
  const router = useRouter();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { user } = useAuth();
  const [deleteJobMutation] = useDeleteJobMutation();
  const [reportJobMutation] = useReportJobMutation();

  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data: userSettingsData } = useGetUserSettingsQuery({
    variables: { userId: user?.id || "" },
    skip: !user?.id,
  });

  const excludedCompanies =
    userSettingsData?.userSettings?.excluded_companies || [];
  const preferredSkills =
    userSettingsData?.userSettings?.preferred_skills || [];

  const [updateUserSettingsMutation] = useUpdateUserSettingsMutation();

  const handleHideCompany = useCallback(
    async (companyKey: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!user?.id || excludedCompanies.includes(companyKey)) return;
      try {
        await updateUserSettingsMutation({
          variables: {
            userId: user.id,
            settings: {
              preferred_locations:
                userSettingsData?.userSettings?.preferred_locations || [],
              preferred_skills:
                userSettingsData?.userSettings?.preferred_skills || [],
              excluded_companies: [...excludedCompanies, companyKey],
            },
          },
          refetchQueries: ["GetJobs"],
          awaitRefetchQueries: true,
        });
      } catch (error) {
        console.error("Error hiding company:", error);
      }
    },
    [user?.id, excludedCompanies, userSettingsData, updateUserSettingsMutation],
  );

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

  const handleReportJob = async (jobId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await reportJobMutation({
        variables: { id: jobId },
        refetchQueries: ["GetJobs"],
        awaitRefetchQueries: true,
      });
    } catch (error) {
      console.error("Error reporting job:", error);
    }
  };

  const queryVariables = useMemo(
    () => ({
      search: searchFilter || undefined,
      limit: 20,
      offset: 0,
      sourceTypes: sourceTypes && sourceTypes.length > 0 ? sourceTypes : undefined,
      excludedCompanies:
        excludedCompanies.length > 0 ? excludedCompanies : undefined,
    }),
    [searchFilter, excludedCompanies, sourceTypes, preferredSkills],
  );

  const { loading, error, data, refetch, fetchMore } = useGetJobsQuery({
    variables: queryVariables,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network",
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

  const isInitialLoad = loading && !data;

  return (
    <Box>
      {/* header */}
      <Flex justify="between" align="center" py="2" px="3">
        <Text size="2" weight="medium" style={{ color: "var(--gray-11)" }}>
          jobs
        </Text>
        <Text
          size="1"
          style={{ color: "var(--gray-9)" }}
          aria-live="polite"
          aria-busy={isInitialLoad}
        >
          {isInitialLoad ? (
            <Skeleton width="48px" height="14px" style={{ display: "inline-block" }} />
          ) : (
            `${jobs.length}/${totalCount}`
          )}
        </Text>
      </Flex>

      {/* card container */}
      <div className="job-list-card">
        {isInitialLoad
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="job-row" style={{ pointerEvents: "none" }} aria-hidden="true">
                <div className="job-row-content">
                  <div className="job-row-title-line">
                    <Skeleton width={`${120 + (i % 3) * 40}px`} height="14px" />
                  </div>
                  <Skeleton width="80px" height="12px" style={{ marginTop: 4 }} />
                  <Skeleton width="140px" height="11px" style={{ marginTop: 4 }} />
                </div>
                <div className="job-row-actions">
                  <Skeleton width="60px" height="24px" />
                </div>
              </div>
            ))
          : jobs.map((job) => {
          const jobId = extractJobSlug(job.external_id, job.id);

          return (
            <Link
              key={job.id}
              href={`/jobs/${jobId}?company=${job.company_key}&source=${job.source_kind}`}
              target="_blank"
              className="job-row"
            >
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
                            : job.status === "reported"
                              ? "orange"
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
                      router.push(`/companies/${job.company_key}`);
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
                  {job.publishedAt && (
                    <span className="job-row-meta-item">
                      {new Date(job.publishedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  )}
                  {job.skills && job.skills.length > 0 && (
                    <span className="job-row-meta-item">
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
                {job.url && (
                  <span
                    className="yc-cta-ghost"
                    style={{ fontSize: 12, padding: "4px 12px" }}
                  >
                    apply
                  </span>
                )}

                {user && job.company_key && (
                  <IconButton
                    size="3"
                    color="gray"
                    variant="soft"
                    onClick={(e) => handleHideCompany(job.company_key!, e)}
                    title="Hide company"
                  >
                    <EyeNoneIcon width={16} height={16} />
                  </IconButton>
                )}
                {isAdmin && (
                  <IconButton
                    size="3"
                    color="orange"
                    variant="soft"
                    onClick={(e) => handleReportJob(job.id, e)}
                    disabled={job.status === "reported"}
                    style={{ cursor: job.status === "reported" ? "default" : "pointer" }}
                    title={job.status === "reported" ? "Already reported" : "Report job"}
                  >
                    <ExclamationTriangleIcon width={16} height={16} />
                  </IconButton>
                )}
                {isAdmin && (
                  <IconButton
                    size="3"
                    color="red"
                    variant="soft"
                    onClick={(e) => handleDeleteJob(job.id, e)}
                    style={{ cursor: "pointer" }}
                  >
                    <TrashIcon width={16} height={16} />
                  </IconButton>
                )}
              </div>
            </Link>
          );
        })}

        {/* empty border-bottom guard */}
        {!isInitialLoad && jobs.length === 0 && !loading && (
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
