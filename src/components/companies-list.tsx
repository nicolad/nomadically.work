"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  useGetCompaniesQuery,
  useDeleteCompanyMutation,
} from "@/__generated__/hooks";
import type { GetCompaniesQuery, CompanyOrderBy } from "@/__generated__/graphql";
import { useAuth } from "@/lib/auth-hooks";
import {
  Box,
  Container,
  Text,
  Flex,
  Spinner,
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
      order_by: "NAME_ASC" as CompanyOrderBy,
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
    <Container size="4" px="8">
      {/* header */}
      <Flex justify="between" align="center" py="2" mb="3">
        <span className="yc-row-title" style={{ fontSize: 14 }}>
          companies
        </span>
        <span className="yc-row-meta">
          {companies.length}/{totalCount}
        </span>
      </Flex>

      {/* search */}
      <div className="yc-search" style={{ marginBottom: 12 }}>
        <input
          placeholder="search companies…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* dense ruled list */}
      <div style={{ borderTop: "1px solid var(--gray-6)" }}>
        {companies.map((company) => (
          <Link
            key={company.id}
            href={`/companies/${company.key}`}
            target="_blank"
            rel="noopener noreferrer"
            className="yc-row"
          >
            {/* logo thumbnail */}
            {company.logo_url && (
              <img
                src={company.logo_url}
                alt=""
                style={{
                  width: 24,
                  height: 24,
                  objectFit: "contain",
                  marginRight: 10,
                  borderRadius: 0,
                  flexShrink: 0,
                }}
              />
            )}

            {/* left: name + inline meta */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="yc-row-title">{company.name}</span>
                {company.industry && (
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--gray-9)",
                      padding: "0 4px",
                      border: "1px solid var(--gray-6)",
                      lineHeight: "16px",
                      textTransform: "lowercase",
                    }}
                  >
                    {company.industry}
                  </span>
                )}
              </div>
              <span className="yc-row-meta">
                {company.key && <span>{company.key}</span>}
                {company.location && <span> · {company.location}</span>}
                {company.size && <span> · {company.size}</span>}
                {company.ats_boards && company.ats_boards.length > 0 && (
                  <span>
                    {" · "}
                    {company.ats_boards.map((b) => b.vendor).join(", ")}
                  </span>
                )}
                {company.tags && company.tags.length > 0 && (
                  <span>
                    {" · "}
                    {company.tags.slice(0, 3).join(", ")}
                    {company.tags.length > 3 && ` +${company.tags.length - 3}`}
                  </span>
                )}
              </span>
            </div>

            {/* right: website + admin */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginLeft: 12,
              }}
            >
              {company.website && (
                <span
                  className="yc-cta"
                  style={{ fontSize: 11, padding: "2px 8px" }}
                >
                  website
                </span>
              )}
              {isAdmin && (
                <IconButton
                  size="1"
                  color="red"
                  variant="ghost"
                  onClick={(e) => handleDeleteCompany(company.id, e)}
                  style={{ cursor: "pointer" }}
                >
                  <TrashIcon width={12} height={12} />
                </IconButton>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* infinite scroll */}
      <Box ref={loadMoreRefCallback} py="4">
        {loading && (
          <Flex justify="center" align="center">
            <Spinner size="2" />
          </Flex>
        )}
        {!loading && hasMore && (
          <Flex justify="center">
            <span className="yc-row-meta">scroll for more…</span>
          </Flex>
        )}
        {!loading && !hasMore && companies.length > 0 && (
          <Flex justify="center">
            <span className="yc-row-meta">all companies loaded</span>
          </Flex>
        )}
      </Box>
    </Container>
  );
}
