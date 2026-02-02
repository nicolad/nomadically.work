"use client";

import { useGetJobsQuery } from "@/__generated__/hooks";
import { Card, Flex, Text, Badge, Box, Heading } from "@radix-ui/themes";

export function JobsList() {
  const { loading, error, data } = useGetJobsQuery({
    variables: {
      limit: 50,
      offset: 0,
    },
  });

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Text>Loading jobs...</Text>
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Text color="red">Error: {error.message}</Text>
      </Flex>
    );
  }

  const jobs = data?.jobs || [];

  if (jobs.length === 0) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Text>No jobs found</Text>
      </Flex>
    );
  }

  return (
    <Box p="6" maxWidth="1200px" mx="auto">
      <Heading size="6" mb="4">
        Jobs ({jobs.length})
      </Heading>
      <Flex direction="column" gap="3">
        {jobs.map((job) => (
          <Card key={job.id}>
            <Flex direction="column" gap="2">
              <Flex justify="between" align="center">
                <Heading size="4">{job.title || "Untitled"}</Heading>
                {job.status && (
                  <Badge color={job.status === "active" ? "green" : "gray"}>
                    {job.status}
                  </Badge>
                )}
              </Flex>

              {job.company && (
                <Text weight="medium" size="3">
                  {job.company}
                </Text>
              )}

              {job.location && (
                <Text size="2" color="gray">
                  📍 {job.location}
                </Text>
              )}

              {job.salary && (
                <Text size="2" color="green">
                  💰 {job.salary}
                </Text>
              )}

              {job.createdAt && (
                <Text size="1" color="gray">
                  Posted: {new Date(job.createdAt).toLocaleDateString()}
                </Text>
              )}
            </Flex>
          </Card>
        ))}
      </Flex>
    </Box>
  );
}
