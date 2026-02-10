"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  useGetCompaniesQuery,
  useDeleteCompanyMutation,
} from "@/__generated__/hooks";
import type { GetCompaniesQuery } from "@/__generated__/graphql";
import { useAuth } from "@/auth/hooks";
import {
  Box,
  Container,
  Heading,
  Text,
  Flex,
  Card,
  Badge,
  Button,
  TextField,
  Spinner,
  Avatar,
  IconButton,
} from "@radix-ui/themes";
import { TrashIcon } from "@radix-ui/react-icons";
import { ADMIN_EMAIL } from "@/lib/constants";

type Company = GetCompaniesQuery["companies"]["companies"][number];

export function CompaniesList() {
  const [searchTerm, setSearchTerm] = useState("");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { user } = useAuth();
  const [deleteCompanyMutation] = useDeleteCompanyMutation();

  // Check if current user is admin
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Handle delete company
  const handleDeleteCompany = async (
    companyId: number,
    e: React.MouseEvent,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await deleteCompanyMutation({
        variables: { id: companyId },
        refetchQueries: ["GetCompanies"],
        awaitRefetchQueries: true,
      });
    } catch (error) {
      console.error("Error deleting company:", error);
    }
  };

  const { loading, error, data, refetch, fetchMore } = useGetCompaniesQuery({
    variables: {
      text: searchTerm || undefined,
      limit: 20,
      offset: 0,
    },
    pollInterval: 60000, // Refresh every minute
    notifyOnNetworkStatusChange: true,
  });

  const companies = data?.companies.companies || [];
  const totalCount = data?.companies.totalCount || 0;
  const hasMore = companies.length < totalCount;

  // Load more companies
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    try {
      await fetchMore({
        variables: {
          offset: companies.length,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return {
            companies: {
              ...fetchMoreResult.companies,
              companies: [
                ...prev.companies.companies,
                ...fetchMoreResult.companies.companies,
              ],
            },
          };
        },
      });
    } catch (err) {
      console.error("Error loading more companies:", err);
    }
  }, [hasMore, loading, companies.length, fetchMore]);

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
        <Text color="red">Error loading companies: {error.message}</Text>
        <Button onClick={() => refetch()} mt="4">
          Retry
        </Button>
      </Container>
    );
  }

  return (
    <Container size="4" px="8">
      <Flex justify="between" align="center" mb="6">
        <Heading size="8">Companies</Heading>
        <Text size="2" color="gray">
          {companies.length} of {totalCount} companies
        </Text>
      </Flex>

      <Box mb="4">
        <TextField.Root
          placeholder="Search companies by name, description, or industry..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="3"
        />
      </Box>

      <Flex direction="column" gap="4">
        {companies.map((company) => {
          return (
            <Card key={company.id} size="3" asChild>
              <Link
                href={`/companies/${company.key}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  cursor: "pointer",
                }}
              >
                <Flex gap="4" align="start">
                  {/* Company Logo */}
                  {company.logo_url && (
                    <Avatar
                      src={company.logo_url}
                      fallback={company.name?.charAt(0) || "C"}
                      size="5"
                      radius="small"
                    />
                  )}

                  <Flex direction="column" gap="2" style={{ flex: 1 }}>
                    {/* Company Name and Website */}
                    <Flex justify="between" align="start">
                      <Heading size="5">{company.name}</Heading>
                      <Flex gap="2" align="center">
                        {company.website && (
                          <Button size="2" variant="soft">
                            Visit Website
                          </Button>
                        )}
                        {isAdmin && (
                          <IconButton
                            size="2"
                            color="red"
                            variant="soft"
                            onClick={(e) => handleDeleteCompany(company.id, e)}
                            style={{ cursor: "pointer" }}
                          >
                            <TrashIcon />
                          </IconButton>
                        )}
                      </Flex>
                    </Flex>

                    {/* Company Key */}
                    {company.key && (
                      <Text size="2" color="gray" weight="medium">
                        {company.key}
                      </Text>
                    )}

                    {/* Industry, Size, Location */}
                    <Flex gap="2" wrap="wrap">
                      {company.industry && (
                        <Badge color="blue" variant="soft">
                          {company.industry}
                        </Badge>
                      )}
                      {company.size && (
                        <Badge color="green" variant="soft">
                          {company.size}
                        </Badge>
                      )}
                      {company.location && (
                        <Badge color="orange" variant="soft">
                          {company.location}
                        </Badge>
                      )}
                    </Flex>

                    {/* Description */}
                    {company.description && (
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
                        {company.description}
                      </Text>
                    )}

                    {/* Tags */}
                    {company.tags && company.tags.length > 0 && (
                      <Flex gap="1" wrap="wrap">
                        {company.tags.slice(0, 5).map((tag, index) => (
                          <Badge
                            key={index}
                            size="1"
                            variant="soft"
                            color="gray"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {company.tags.length > 5 && (
                          <Badge size="1" variant="soft" color="gray">
                            +{company.tags.length - 5} more
                          </Badge>
                        )}
                      </Flex>
                    )}

                    {/* ATS Boards */}
                    {company.ats_boards && company.ats_boards.length > 0 && (
                      <Flex gap="2" wrap="wrap" mt="2">
                        <Text size="2" color="gray">
                          Job Boards:
                        </Text>
                        {company.ats_boards.map((board) => (
                          <Badge
                            key={board.id}
                            size="1"
                            color={board.is_active ? "green" : "gray"}
                          >
                            {board.vendor}
                          </Badge>
                        ))}
                      </Flex>
                    )}
                  </Flex>
                </Flex>
              </Link>
            </Card>
          );
        })}
      </Flex>

      {/* Infinite scroll trigger */}
      <Box ref={loadMoreRefCallback} py="6">
        {loading && (
          <Flex justify="center" align="center">
            <Spinner size="3" />
          </Flex>
        )}
        {!loading && hasMore && (
          <Flex justify="center">
            <Text size="2" color="gray">
              Scroll for more...
            </Text>
          </Flex>
        )}
        {!loading && !hasMore && companies.length > 0 && (
          <Flex justify="center">
            <Text size="2" color="gray">
              No more companies to load
            </Text>
          </Flex>
        )}
      </Box>
    </Container>
  );
}
