"use client";

import { useState } from "react";
import { useGetJobsQuery } from "@/__generated__/hooks";
import {
  Card,
  Flex,
  Text,
  Badge,
  Box,
  Heading,
  TextField,
} from "@radix-ui/themes";
import Link from "next/link";

export function JobsList() {
  const [searchTerm, setSearchTerm] = useState("");
  const { loading, error, data } = useGetJobsQuery({
    variables: {
      search: searchTerm || undefined,
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

  if (jobs.length === 0 && !loading) {
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

      <Box mb="4">
        <TextField.Root
          placeholder="Search jobs by title, company, or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="3"
        />
      </Box>

      {jobs.length === 0 ? (
        <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
          <Text>No jobs match your search</Text>
        </Flex>
      ) : (
        <Flex direction="column" gap="3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              target="_blank"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Card
                style={{ cursor: "pointer", transition: "box-shadow 0.2s" }}
                className="hover:shadow-lg"
              >
                <Flex direction="column" gap="2">
                  <Flex justify="between" align="center">
                    <Heading size="4">{job.title || "Untitled"}</Heading>
                    {job.status && (
                      <Badge
                        color={
                          job.status === "eu-remote"
                            ? "green"
                            : job.status === "non-eu"
                              ? "red"
                              : "gray"
                        }
                      >
                        {job.status}
                      </Badge>
                    )}
                  </Flex>

                  {job.company_key && (
                    <Text weight="medium" size="3">
                      {job.company_key}
                    </Text>
                  )}

                  {job.location && (
                    <Text size="2" color="gray">
                      📍 {job.location}
                    </Text>
                  )}

                  {job.score && (
                    <Text size="2" color="green">
                      🎯 Score: {(job.score * 100).toFixed(0)}%
                    </Text>
                  )}

                  {job.created_at && (
                    <Text size="1" color="gray">
                      Posted: {new Date(job.created_at).toLocaleDateString()}
                    </Text>
                  )}
                </Flex>
              </Card>
            </Link>
          ))}
        </Flex>
      )}
    </Box>
  );
}
