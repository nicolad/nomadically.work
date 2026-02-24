"use client";

import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Text,
} from "@radix-ui/themes";
import { ExclamationTriangleIcon, ReloadIcon } from "@radix-ui/react-icons";
import Link from "next/link";

const WORKERS = [
  { name: "nomadically-janitor", config: "wrangler.toml", runtime: "TypeScript", notes: "Daily midnight UTC, triggers ATS ingestion" },
  { name: "d1-gateway", config: "wrangler.d1-gateway.toml", runtime: "TypeScript", notes: "On-demand HTTP, D1 binding" },
  { name: "nomadically-work-insert-jobs", config: "wrangler.insert-jobs.toml", runtime: "TypeScript", notes: "Queue-based job ingestion" },
  { name: "nomadically-work-classify-jobs", config: "wrangler.classify-jobs.toml", runtime: "TypeScript", notes: "Job classification queue" },
  { name: "nomadically-work-process-companies-cron", config: "wrangler.process-companies-cron.toml", runtime: "TypeScript", notes: "Company processing cron" },
  { name: "dlq-consumer", config: "wrangler.dlq-consumer.toml", runtime: "TypeScript", notes: "Dead-letter queue consumer" },
  { name: "observability-tail", config: "wrangler.observability-tail.toml", runtime: "TypeScript", notes: "Observability logging tail" },
  { name: "nomadically-promptfoo-eval", config: "wrangler.promptfoo.toml", runtime: "TypeScript", notes: "On-demand eval runner" },
  { name: "ats-crawler", config: "workers/ashby-crawler/wrangler.toml", runtime: "Rust/WASM", notes: "Common Crawl → D1, cron 02:00 UTC" },
  { name: "nomadically-work-process-jobs", config: "workers/process-jobs/wrangler.jsonc", runtime: "Python/LangGraph", notes: "Every 6h + queue, DeepSeek classification" },
  { name: "nomadically-work-eu-classifier", config: "workers/eu-classifier/wrangler.jsonc", runtime: "Python", notes: "EU job classification" },
  { name: "nomadically-work-resume-rag", config: "workers/resume-rag/wrangler.jsonc", runtime: "Python", notes: "Vectorize + Workers AI" },
  { name: "nomadically-work-job-matcher", config: "workers/job-matcher/wrangler.jsonc", runtime: "Python", notes: "Resume-to-job matching" },
  { name: "nomadically-work-deep-planner", config: "workers/deep-planner/wrangler.jsonc", runtime: "Python", notes: "AI task planner with Durable Objects" },
  { name: "job-reporter-llm", config: "workers/job-reporter-llm/wrangler.toml", runtime: "TypeScript", notes: "LLM-based job report analysis" },
  { name: "nomadically-work-cleanup-jobs", config: "workers/cleanup-jobs/wrangler.jsonc", runtime: "Python", notes: "Job cleanup" },
] as const;

export default function WorkersPage() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

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
          <Flex direction="column" align="center" gap="4" p="4">
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
    <Container size="4" p="8" style={{ maxWidth: "1100px" }}>
      <Flex justify="between" align="center" mb="6">
        <Box>
          <Heading size="7">Worker Status</Heading>
          <Text color="gray" size="2">
            Cloudflare Workers and Trigger.dev task overview
          </Text>
        </Box>
        <Button asChild variant="soft">
          <a
            href="https://dash.cloudflare.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ReloadIcon /> Cloudflare Dashboard
          </a>
        </Button>
      </Flex>

      {/* Cloudflare Workers */}
      <Heading size="4" mb="3">
        Cloudflare Workers
      </Heading>
      <Flex direction="column" gap="3" mb="6">
        {WORKERS.map((w) => (
          <Card key={w.name}>
            <Flex justify="between" align="center" gap="4">
              <Box>
                <Flex gap="2" align="center" mb="1">
                  <Text size="3" weight="bold">
                    {w.name}
                  </Text>
                  <Badge color="gray" size="1" variant="soft">
                    {w.runtime}
                  </Badge>
                </Flex>
                <Text size="1" color="gray">
                  {w.config} · {w.notes}
                </Text>
              </Box>
              <Button asChild size="1" variant="ghost">
                <a
                  href={`https://dash.cloudflare.com/?to=/:account/workers/services/view/${w.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View logs →
                </a>
              </Button>
            </Flex>
          </Card>
        ))}
      </Flex>

      {/* Trigger.dev */}
      <Heading size="4" mb="3">
        Trigger.dev Tasks
      </Heading>
      <Card mb="6">
        <Flex justify="between" align="center" gap="4">
          <Box>
            <Text size="3" weight="bold" as="div" mb="1">
              Background tasks (src/trigger/)
            </Text>
            <Text size="1" color="gray">
              Job enhancement, classification, skill extraction
            </Text>
          </Box>
          <Button asChild size="1" variant="ghost">
            <a
              href="https://cloud.trigger.dev"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open dashboard →
            </a>
          </Button>
        </Flex>
      </Card>

      {/* Known issues */}
      <Heading size="4" mb="3">
        Known Issues
      </Heading>
      <Flex direction="column" gap="2">
        {[
          {
            text: "cron.ts and insert-jobs.ts still reference Turso (libsql) instead of D1",
            severity: "orange" as const,
          },
          {
            text: "enhanceJobFromATS mutation has no auth check",
            severity: "red" as const,
          },
          {
            text: "CORS on D1 Gateway is * (open)",
            severity: "orange" as const,
          },
        ].map(({ text, severity }) => (
          <Card key={text}>
            <Flex gap="3" align="center">
              <ExclamationTriangleIcon color={severity === "red" ? "red" : "orange"} />
              <Text size="2">{text}</Text>
              <Badge color={severity} size="1" variant="soft" style={{ marginLeft: "auto", flexShrink: 0 }}>
                {severity === "red" ? "high" : "medium"}
              </Badge>
            </Flex>
          </Card>
        ))}
      </Flex>
    </Container>
  );
}
