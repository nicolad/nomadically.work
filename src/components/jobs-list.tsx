"use client";

import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  jobListCard,
  jobRow,
  jobRowContent,
  jobRowTitleLine,
  jobRowTitle,
  jobRowCompany,
  jobRowMetaLine,
  jobRowMetaItem,
  jobRowActions,
} from "./jobs-list.css";
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
  Button,
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
  showAll?: boolean;
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


export function JobsList({ searchFilter = "", sourceTypes, showAll }: JobsListProps) {
  const router = useRouter();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { user } = useAuth();
  const [deleteJobMutation] = useDeleteJobMutation();
  const [reportJobMutation] = useReportJobMutation();

  const isAdmin = user?.email === ADMIN_EMAIL;

  const scrollRestoredRef = useRef(false);

  // Save scroll position for admin
  useEffect(() => {
    if (!isAdmin) return;
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        localStorage.setItem("nomadically:admin:scroll", String(window.scrollY));
        ticking = false;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isAdmin]);

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
      showAll: showAll || undefined,
    }),
    [searchFilter, excludedCompanies, sourceTypes, preferredSkills, showAll],
  );

  const { loading, error, data, refetch, fetchMore } = useGetJobsQuery({
    variables: queryVariables,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network",
  });

  const jobs = data?.jobs.jobs || [];
  const totalCount = data?.jobs.totalCount || 0;
  const hasMore = jobs.length < totalCount;

  // Restore scroll position after first data load (admin only)
  useEffect(() => {
    if (!isAdmin || scrollRestoredRef.current || !data) return;
    scrollRestoredRef.current = true;
    const saved = localStorage.getItem("nomadically:admin:scroll");
    if (saved) {
      window.scrollTo({ top: parseInt(saved, 10), behavior: "instant" });
    }
  }, [isAdmin, data]);

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
        <Button mt="3" onClick={() => refetch()}>
          retry
        </Button>
      </Container>
    );
  }

  const isInitialLoad = loading && !data;

  return (
    <Box>
      {/* header */}
      <Flex justify="between" align="center" py="2" px="3">
        <Text size="2" weight="medium" color="gray">
          jobs
        </Text>
        <Text
          size="1"
          color="gray"
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
      <div className={jobListCard}>
        {isInitialLoad
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={jobRow} style={{ pointerEvents: "none" }} aria-hidden="true">
                <div className={jobRowContent}>
                  <div className={jobRowTitleLine}>
                    <Skeleton width={`${120 + (i % 3) * 40}px`} height="14px" />
                  </div>
                  <Skeleton width="80px" height="12px" mt="1" />
                  <Skeleton width="140px" height="11px" mt="1" />
                </div>
                <div className={jobRowActions}>
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
              className={jobRow}
            >
              {/* content — stacked: title, company, meta */}
              <div className={jobRowContent}>
                {/* line 1: title + status pill */}
                <div className={jobRowTitleLine}>
                  <span className={jobRowTitle}>{job.title}</span>
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
                    >
                      {getStatusLabel(job.status)}
                    </Badge>
                  )}
                </div>

                {/* line 2: company name */}
                {job.company_key && (
                  <span
                    className={jobRowCompany}
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
                <div className={jobRowMetaLine}>
                  {job.location && (
                    <span className={jobRowMetaItem}>
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
                    <Badge size="1" variant="outline" color="gray">{job.source_kind}</Badge>
                  )}
                  {job.publishedAt && (
                    <span className={jobRowMetaItem}>
                      {new Date(job.publishedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  )}
                  {job.skills && job.skills.length > 0 && (
                    <span className={jobRowMetaItem}>
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
              <div className={jobRowActions}>
                {job.url && (
                  <Badge variant="outline" color="gray" size="1">
                    apply
                  </Badge>
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
            <Text size="2" color="gray">
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
              <Text size="1" color="gray">
                scroll for more…
              </Text>
            </Flex>
          )}
        </Box>
      )}

      {!hasMore && jobs.length > 0 && (
        <Box py="4">
          <Flex justify="center">
            <Text size="1" color="gray">
              {jobs.length}/{totalCount} loaded
            </Text>
          </Flex>
        </Box>
      )}
    </Box>
  );
}
