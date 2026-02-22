"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Text,
  Separator,
} from "@radix-ui/themes";
import {
  CheckIcon,
  ReloadIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";

interface ReportedJob {
  id: number;
  title: string;
  company: string;
  url: string;
  status: string;
  report_reason: string | null;
  report_confidence: number | null;
  report_reasoning: string | null;
  report_tags: string | null;
  report_action: string | null;
  report_reviewed_at: string | null;
  updated_at: string;
}

interface ReportStats {
  total: number;
  pending: number;
  escalated: number;
  auto_restored: number;
  confirmed: number;
  avg_confidence: number | null;
  spam: number;
  irrelevant: number;
  misclassified: number;
  false_positive: number;
}

function confidenceColor(
  v: number | null,
): "red" | "orange" | "green" | "gray" {
  if (v == null) return "gray";
  if (v >= 0.8) return "green";
  if (v >= 0.5) return "orange";
  return "red";
}

function actionColor(
  action: string | null,
): "orange" | "red" | "gray" | "green" {
  if (action === "escalated") return "red";
  if (action === "pending") return "orange";
  if (action === "confirmed") return "green";
  return "gray";
}

function reasonColor(
  r: string | null,
): "red" | "orange" | "blue" | "gray" | "green" {
  if (r === "spam") return "red";
  if (r === "irrelevant") return "orange";
  if (r === "misclassified") return "blue";
  if (r === "false_positive") return "green";
  return "gray";
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <Card style={{ flex: 1, minWidth: 120 }}>
      <Flex direction="column" gap="1" align="center">
        <Text size="1" color="gray">
          {label}
        </Text>
        <Text
          size="6"
          weight="bold"
          color={color as any}
        >
          {value}
        </Text>
      </Flex>
    </Card>
  );
}

export default function ReportedJobsPage() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [jobs, setJobs] = useState<ReportedJob[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<Record<number, boolean>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [jobsRes, statsRes] = await Promise.all([
        fetch("/api/admin/reported-jobs?limit=100"),
        fetch("/api/admin/reported-jobs?type=stats"),
      ]);
      if (!jobsRes.ok) throw new Error(`${jobsRes.status} ${jobsRes.statusText}`);
      const jobsData = await jobsRes.json();
      const statsData = await statsRes.json();
      setJobs(jobsData.jobs ?? []);
      setStats(statsData.stats ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  const handleAction = async (
    jobId: number,
    action: "confirm" | "restore",
    confirmedReason?: string,
  ) => {
    setActing((p) => ({ ...p, [jobId]: true }));
    try {
      const res = await fetch("/api/admin/report-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, action, confirmedReason }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Action failed");
      }
      // Remove resolved job from local list optimistically
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setActing((p) => ({ ...p, [jobId]: false }));
    }
  };

  if (!user) {
    return (
      <Container size="3" p="8">
        <Text color="gray">Loading…</Text>
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container size="3" p="8">
        <Card>
          <Flex direction="column" align="center" gap="4">
            <ExclamationTriangleIcon width="32" height="32" color="red" />
            <Heading size="5">Access denied</Heading>
            <Text color="gray">This page is restricted to administrators.</Text>
            <Button asChild variant="soft">
              <Link href="/">← Back to Jobs</Link>
            </Button>
          </Flex>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="4" p="8" style={{ maxWidth: "1200px" }}>
      <Flex justify="between" align="center" mb="6">
        <Box>
          <Heading size="7">Reported Jobs Review</Heading>
          <Text color="gray" size="2">
            LLM-analysed reports awaiting admin decision
          </Text>
        </Box>
        <Button
          variant="soft"
          onClick={fetchData}
          disabled={loading}
          loading={loading}
        >
          <ReloadIcon /> Refresh
        </Button>
      </Flex>

      {/* Stats */}
      {stats && (
        <Flex gap="3" mb="6" wrap="wrap">
          <StatCard label="Total reported" value={stats.total ?? 0} />
          <StatCard label="Pending review" value={stats.pending ?? 0} color="orange" />
          <StatCard label="Escalated" value={stats.escalated ?? 0} color="red" />
          <StatCard label="Auto-restored" value={stats.auto_restored ?? 0} color="blue" />
          <StatCard label="Confirmed" value={stats.confirmed ?? 0} color="green" />
          {stats.avg_confidence != null && (
            <StatCard
              label="Avg confidence"
              value={`${(stats.avg_confidence * 100).toFixed(0)}%`}
            />
          )}
        </Flex>
      )}

      {/* Reason breakdown */}
      {stats && (
        <Flex gap="2" mb="6" wrap="wrap">
          {(
            [
              ["spam", stats.spam],
              ["irrelevant", stats.irrelevant],
              ["misclassified", stats.misclassified],
              ["false_positive", stats.false_positive],
            ] as [string, number][]
          )
            .filter(([, v]) => v > 0)
            .map(([reason, count]) => (
              <Badge key={reason} color={reasonColor(reason)} size="2">
                {reason}: {count}
              </Badge>
            ))}
        </Flex>
      )}

      <Separator size="4" mb="6" />

      {error && (
        <Card mb="4" style={{ borderColor: "var(--red-6)" }}>
          <Text color="red">{error}</Text>
        </Card>
      )}

      {loading && <Text color="gray">Loading reported jobs…</Text>}

      {!loading && jobs.length === 0 && !error && (
        <Card>
          <Flex direction="column" align="center" gap="3" p="6">
            <CheckIcon width="32" height="32" />
            <Heading size="4">All clear!</Heading>
            <Text color="gray">No jobs pending review.</Text>
          </Flex>
        </Card>
      )}

      <Flex direction="column" gap="4">
        {jobs.map((job) => {
          const tags = parseTags(job.report_tags);
          const isActing = acting[job.id] ?? false;
          const needsReview = !job.report_action || job.report_action === "pending" || job.report_action === "escalated";

          return (
            <Card key={job.id}>
              <Flex direction="column" gap="3">
                {/* Header */}
                <Flex justify="between" align="start" gap="4">
                  <Box style={{ flex: 1 }}>
                    <Flex gap="2" align="center" mb="1" wrap="wrap">
                      <Text size="4" weight="bold">
                        {job.title}
                      </Text>
                      {job.report_action && (
                        <Badge color={actionColor(job.report_action)} size="1">
                          {job.report_action}
                        </Badge>
                      )}
                    </Flex>
                    <Text size="2" color="gray">
                      {job.company}
                      {job.url && (
                        <>
                          {" · "}
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "var(--accent-11)" }}
                          >
                            View original
                          </a>
                        </>
                      )}
                      {" · "}
                      <Link
                        href={`/jobs/${job.id}`}
                        style={{ color: "var(--accent-11)" }}
                      >
                        Job #{job.id}
                      </Link>
                    </Text>
                  </Box>

                  {/* LLM verdict */}
                  {job.report_reason && (
                    <Flex direction="column" align="end" gap="1" style={{ flexShrink: 0 }}>
                      <Badge color={reasonColor(job.report_reason)} size="2">
                        {job.report_reason}
                      </Badge>
                      {job.report_confidence != null && (
                        <Badge
                          color={confidenceColor(job.report_confidence)}
                          size="1"
                          variant="soft"
                        >
                          {(job.report_confidence * 100).toFixed(0)}% confidence
                        </Badge>
                      )}
                    </Flex>
                  )}
                </Flex>

                {/* LLM reasoning */}
                {job.report_reasoning && (
                  <Box
                    p="3"
                    style={{
                      backgroundColor: "var(--gray-2)",
                      borderRadius: "var(--radius-2)",
                      border: "1px solid var(--gray-5)",
                    }}
                  >
                    <Text size="1" weight="bold" color="gray" mb="1" as="div">
                      LLM reasoning
                    </Text>
                    <Text size="2">{job.report_reasoning}</Text>
                  </Box>
                )}

                {/* Tags */}
                {tags.length > 0 && (
                  <Flex gap="1" wrap="wrap">
                    {tags.map((tag) => (
                      <Badge key={tag} color="gray" size="1" variant="soft">
                        {tag}
                      </Badge>
                    ))}
                  </Flex>
                )}

                {/* Actions */}
                {needsReview && (
                  <Flex gap="3" mt="1">
                    <Button
                      size="2"
                      color="red"
                      variant="soft"
                      onClick={() =>
                        handleAction(
                          job.id,
                          "confirm",
                          job.report_reason ?? undefined,
                        )
                      }
                      disabled={isActing}
                      loading={isActing}
                    >
                      <ExclamationTriangleIcon />
                      Confirm report
                    </Button>
                    <Button
                      size="2"
                      color="green"
                      variant="soft"
                      onClick={() => handleAction(job.id, "restore")}
                      disabled={isActing}
                      loading={isActing}
                    >
                      <CheckIcon />
                      Restore (false positive)
                    </Button>
                  </Flex>
                )}

                <Text size="1" color="gray">
                  Updated {new Date(job.updated_at).toLocaleString()}
                  {job.report_reviewed_at &&
                    ` · LLM reviewed ${new Date(job.report_reviewed_at).toLocaleString()}`}
                </Text>
              </Flex>
            </Card>
          );
        })}
      </Flex>
    </Container>
  );
}
