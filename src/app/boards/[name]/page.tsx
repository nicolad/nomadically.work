"use client";

import { ASHBY_JOBS_DOMAIN } from "@/constants/ats";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Container,
  Heading,
  Text,
  Flex,
  Card,
  Badge,
  Button,
  Box,
  Skeleton,
} from "@radix-ui/themes";
import { fetchAshbyBoardJobs } from "@/lib/common-crawl/ashby-client";

interface AshbyJob {
  id: string;
  title: string;
  location: string;
  locationName?: string;
  department?: string;
  team?: string;
  isRemote?: boolean;
  descriptionPlain?: string;
  publishedAt?: string;
  employmentType?: string;
  jobUrl?: string;
  applyUrl?: string;
  isListed?: boolean;
}

interface AshbyBoardData {
  jobs: AshbyJob[];
  jobBoard: {
    name: string;
    logoUrl?: string;
  };
}

export default function BoardPage() {
  const params = useParams();
  const boardName = decodeURIComponent(params.name as string);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boardData, setBoardData] = useState<AshbyBoardData | null>(null);

  useEffect(() => {
    const fetchBoardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAshbyBoardJobs(boardName, true);
        setBoardData(data);
      } catch (err) {
        console.error("Error fetching board data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load board data",
        );
      } finally {
        setLoading(false);
      }
    };

    if (boardName) {
      fetchBoardData();
    }
  }, [boardName]);

  if (loading) {
    return (
      <Container size="4" p="8">
        <Skeleton height="40px" mb="4" />
        <Skeleton height="20px" mb="6" width="200px" />
        <Flex direction="column" gap="4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height="150px" />
          ))}
        </Flex>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="4" p="8">
        <Heading size="6" mb="4" color="red">
          Error Loading Board
        </Heading>
        <Text color="gray" mb="4">
          {error}
        </Text>
        <Link href="/">
          <Button>Back to Jobs</Button>
        </Link>
      </Container>
    );
  }

  if (!boardData || !boardData.jobs || boardData.jobs.length === 0) {
    return (
      <Container size="4" p="8">
        <Heading size="6" mb="4">
          No Jobs Found
        </Heading>
        <Text color="gray" mb="4">
          No active jobs found for {boardName}
        </Text>
        <Link href="/">
          <Button>Back to Jobs</Button>
        </Link>
      </Container>
    );
  }

  const { jobs, jobBoard } = boardData;
  const companyName = jobBoard?.name || boardName;

  return (
    <Container size="4" p="8">
      <Flex justify="between" align="center" mb="2">
        <Flex direction="column" gap="2">
          <Heading size="8">{companyName}</Heading>
          <Text size="2" color="gray">
            {jobs.length} active {jobs.length === 1 ? "position" : "positions"}
          </Text>
        </Flex>
        <Link
          href={`https://${ASHBY_JOBS_DOMAIN}/${boardName}`}
          target="_blank"
        >
          <Button variant="soft">View on Ashby</Button>
        </Link>
      </Flex>

      <Box mb="6">
        <Link href="/">
          <Text size="2" color="blue" style={{ cursor: "pointer" }}>
            ← Back to all jobs
          </Text>
        </Link>
      </Box>

      <Flex direction="column" gap="4">
        {jobs.map((job) => {
          // Extract job ID from jobUrl
          const jobId = job.jobUrl?.split("/").pop()?.split("?")[0] || job.id;

          return (
            <Card key={job.id} size="3">
              <Flex direction="column" gap="3">
                <Flex justify="between" align="start">
                  <Heading size="5">{job.title}</Heading>
                  <Flex gap="2">
                    {job.isRemote && <Badge color="green">Remote</Badge>}
                    {job.isListed === false && (
                      <Badge color="gray">Unlisted</Badge>
                    )}
                  </Flex>
                </Flex>

                <Flex gap="3" wrap="wrap" align="center">
                  {job.location && <Text color="gray">📍 {job.location}</Text>}
                  {job.department && (
                    <Text size="2" color="gray">
                      • {job.department}
                    </Text>
                  )}
                  {job.team && (
                    <Text size="2" color="gray">
                      • {job.team}
                    </Text>
                  )}
                  {job.employmentType && (
                    <Text size="2" color="gray">
                      • {job.employmentType}
                    </Text>
                  )}
                </Flex>

                {job.descriptionPlain && (
                  <Text
                    size="2"
                    color="gray"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {job.descriptionPlain}
                  </Text>
                )}

                <Flex justify="between" align="center" mt="2">
                  {job.publishedAt && (
                    <Text size="1" color="gray">
                      Posted: {new Date(job.publishedAt).toLocaleDateString()}
                    </Text>
                  )}
                  <Flex gap="2">
                    <Link
                      href={`/jobs/${jobId}?company=${boardName}&source=ashby`}
                      target="_blank"
                    >
                      <Button size="2" variant="soft">
                        View Details
                      </Button>
                    </Link>
                    {job.applyUrl && (
                      <Link href={job.applyUrl} target="_blank">
                        <Button size="2">Apply</Button>
                      </Link>
                    )}
                  </Flex>
                </Flex>
              </Flex>
            </Card>
          );
        })}
      </Flex>
    </Container>
  );
}
