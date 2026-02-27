"use client";

import * as React from "react";
import { useState } from "react";
import { useGetOpportunitiesQuery, useDeleteOpportunityMutation, useUpdateOpportunityMutation } from "@/__generated__/hooks";
import type { GetOpportunitiesQuery } from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import {
  Badge,
  Box,
  Button,
  Callout,
  Container,
  Flex,
  Heading,
  Select,
  Spinner,
  Table,
  Text,
} from "@radix-ui/themes";
import { ExclamationTriangleIcon, ExternalLinkIcon, TrashIcon } from "@radix-ui/react-icons";

type Opportunity = NonNullable<
  GetOpportunitiesQuery["opportunities"]["opportunities"]
>[number];

const STATUS_OPTIONS = ["", "open", "applied", "rejected", "offer", "closed"] as const;

const STATUS_COLORS: Record<string, "gray" | "blue" | "red" | "green" | "orange"> = {
  open: "blue",
  applied: "orange",
  rejected: "red",
  offer: "green",
  closed: "gray",
};

const PAGE_SIZE = 50;

export function OpportunitiesClient() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);

  const { data, loading, refetch } = useGetOpportunitiesQuery({
    variables: {
      status: statusFilter || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    skip: !isAdmin,
    fetchPolicy: "cache-and-network",
  });

  const [deleteOpportunity] = useDeleteOpportunityMutation();
  const [updateOpportunity] = useUpdateOpportunityMutation();

  if (!isAdmin) {
    return (
      <Container size="3" p="8">
        <Callout.Root color="red">
          <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
          <Callout.Text>Access denied. Admin only.</Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  const list = data?.opportunities?.opportunities ?? [];
  const totalCount = data?.opportunities?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  async function handleDelete(id: string) {
    if (!confirm("Delete this opportunity?")) return;
    await deleteOpportunity({ variables: { id } });
    refetch();
  }

  async function handleStatusChange(id: string, status: string) {
    await updateOpportunity({ variables: { id, input: { status } } });
    refetch();
  }

  async function handleApplied(id: string, applied: boolean) {
    await updateOpportunity({ variables: { id, input: { applied, appliedAt: applied ? new Date().toISOString() : null } } });
    refetch();
  }

  return (
    <Container size="4" p="6">
      <Flex justify="between" align="center" mb="4">
        <Heading size="5">Opportunities</Heading>
        <Flex align="center" gap="3">
          <Text size="2" color="gray">{totalCount} total</Text>
          <Select.Root value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <Select.Trigger placeholder="All statuses" />
            <Select.Content>
              <Select.Item value="">All statuses</Select.Item>
              {STATUS_OPTIONS.filter(Boolean).map((s) => (
                <Select.Item key={s} value={s}>{s}</Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Flex>
      </Flex>

      {loading && <Spinner />}

      {!loading && list.length === 0 && (
        <Text color="gray">No opportunities found.</Text>
      )}

      {list.length > 0 && (
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Title</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Company</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Reward</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Applied</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Deadline</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {list.map((opp: Opportunity) => (
              <Table.Row key={opp.id}>
                <Table.Cell>
                  <Flex align="center" gap="2">
                    <Text size="2" weight="medium">{opp.title}</Text>
                    {opp.url && (
                      <a href={opp.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLinkIcon style={{ color: "var(--gray-9)" }} />
                      </a>
                    )}
                  </Flex>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2" color="gray">{opp.company?.name ?? "—"}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Select.Root
                    value={opp.status}
                    onValueChange={(v) => handleStatusChange(opp.id, v)}
                  >
                    <Select.Trigger>
                      <Badge color={STATUS_COLORS[opp.status] ?? "gray"} size="1">
                        {opp.status}
                      </Badge>
                    </Select.Trigger>
                    <Select.Content>
                      {STATUS_OPTIONS.filter(Boolean).map((s) => (
                        <Select.Item key={s} value={s}>{s}</Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2" color="gray">
                    {opp.rewardUsd ? `$${opp.rewardUsd.toLocaleString()}` : opp.rewardText ?? "—"}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <input
                    type="checkbox"
                    checked={opp.applied}
                    onChange={(e) => handleApplied(opp.id, e.target.checked)}
                  />
                </Table.Cell>
                <Table.Cell>
                  <Text size="2" color="gray">{opp.deadline ?? "—"}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Box
                    style={{ cursor: "pointer", color: "var(--red-9)" }}
                    onClick={() => handleDelete(opp.id)}
                  >
                    <TrashIcon />
                  </Box>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}

      {totalPages > 1 && (
        <Flex gap="2" mt="4" justify="center" align="center">
          <Button size="1" variant="soft" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <Text size="2" color="gray">{page + 1} / {totalPages}</Text>
          <Button size="1" variant="soft" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
        </Flex>
      )}
    </Container>
  );
}
