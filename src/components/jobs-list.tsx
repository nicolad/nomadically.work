"use client";

import { useGetJobsQuery } from "@/__generated__/hooks";
import {
  Box,
  Container,
  Heading,
  Text,
  Flex,
  Card,
  Badge,
  Button,
} from "@radix-ui/themes";

export function JobsList() {
  const { loading, error, data, refetch } = useGetJobsQuery({
    variables: {
      limit: 50,
      offset: 0,
    },
    pollInterval: 60000, // Refresh every minute
  });

  if (loading) {
    return (
      <Container size="4" p="8">
        <Text color="gray">Loading jobs...</Text>
      </Container>
    );
  }

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

  const jobs = data?.jobs || [];

  return (
    <Container size="4" p="8">
      <Flex justify="between" align="center" mb="6">
        <Heading size="8">Remote Jobs</Heading>
        <Text size="2" color="gray">
          {jobs.length} jobs found
        </Text>
      </Flex>

      <Flex direction="column" gap="4">
        {jobs.map((job) => (
          <Card key={job.id} size="3">
            <Flex justify="between" align="start" mb="2">
              <Heading size="5">{job.title}</Heading>
              {job.status && <Badge color="blue">{job.status}</Badge>}
            </Flex>

            <Flex gap="2" mb="2" wrap="wrap">
              {job.company && <Text weight="medium">{job.company}</Text>}
              {job.location && <Text color="gray">• {job.location}</Text>}
              {job.salary && <Text color="gray">• {job.salary}</Text>}
            </Flex>

            {job.employmentType && (
              <Text size="2" color="gray" mb="2">
                {job.employmentType}
                {job.experienceLevel && ` • ${job.experienceLevel}`}
                {job.remoteFriendly && ` • Remote Friendly`}
              </Text>
            )}

            {job.techStack && job.techStack.length > 0 && (
              <Flex gap="2" wrap="wrap" mb="3">
                {job.techStack.map((tech, idx) => (
                  <Badge key={idx} variant="soft" color="gray">
                    {tech}
                  </Badge>
                ))}
              </Flex>
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
                {job.sourceType && <span>Source: {job.sourceType}</span>}
                {job.publishedDate && (
                  <span style={{ marginLeft: "12px" }}>
                    Posted: {new Date(job.publishedDate).toLocaleDateString()}
                  </span>
                )}
              </Text>

              {job.url && (
                <Button asChild size="2">
                  <a href={job.url} target="_blank" rel="noopener noreferrer">
                    View Job
                  </a>
                </Button>
              )}
            </Flex>

            {job.applied && job.appliedAt && (
              <Box
                mt="3"
                pt="3"
                style={{ borderTop: "1px solid var(--gray-6)" }}
              >
                <Text size="2" color="green">
                  ✓ Applied on {new Date(job.appliedAt).toLocaleDateString()}
                </Text>
              </Box>
            )}
          </Card>
        ))}

        {jobs.length === 0 && (
          <Box py="9" style={{ textAlign: "center" }}>
            <Text color="gray">No jobs found in the database.</Text>
          </Box>
        )}
      </Flex>
    </Container>
  );
}
