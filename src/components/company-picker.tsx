"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Popover,
  Button,
  Text,
  Flex,
  Box,
  Separator,
  ScrollArea,
} from "@radix-ui/themes";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  Link2Icon,
} from "@radix-ui/react-icons";
import {
  useGetCompaniesQuery,
  useCreateCompanyMutation,
} from "@/__generated__/hooks";

interface CompanyPickerProps {
  /** Currently linked company key (null = no company linked) */
  companyKey: string | null | undefined;
  /** Company name to display / pre-fill when creating */
  companyName: string | null | undefined;
  /** Called when a company is selected or created */
  onLinked: (companyKey: string, companyName: string) => void;
}

export function CompanyPicker({
  companyKey,
  companyName,
  onLinked,
}: CompanyPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, loading } = useGetCompaniesQuery({
    variables: { text: search || undefined, limit: 20 },
    skip: !open,
  });
  const [createCompany] = useCreateCompanyMutation();

  const companies = useMemo(
    () => data?.companies?.companies ?? [],
    [data],
  );

  const handleSelect = useCallback(
    (key: string, name: string) => {
      onLinked(key, name);
      setOpen(false);
      setSearch("");
      setError(null);
    },
    [onLinked],
  );

  const handleCreate = useCallback(async () => {
    const name = search.trim() || companyName?.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const key = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const result = await createCompany({
        variables: { input: { key, name } },
        refetchQueries: ["GetCompanies", "GetApplication"],
      });
      const created = result.data?.createCompany;
      if (created) {
        onLinked(created.key, created.name);
        setOpen(false);
        setSearch("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create company");
    } finally {
      setCreating(false);
    }
  }, [search, companyName, createCompany, onLinked]);

  // If company is already linked, show a simple link
  if (companyKey) {
    return null; // parent handles the linked state
  }

  const createName = search.trim() || companyName || "";

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <Button variant="ghost" size="1" color="gray">
          <Link2Icon /> Link Company
        </Button>
      </Popover.Trigger>
      <Popover.Content
        side="bottom"
        align="start"
        style={{ width: 300, padding: 0 }}
      >
        {/* Search input */}
        <Box p="2">
          <Flex
            align="center"
            gap="2"
            style={{
              border: "1px solid var(--gray-6)",
              borderRadius: "var(--radius-2)",
              padding: "4px 8px",
              background: "var(--gray-2)",
            }}
          >
            <MagnifyingGlassIcon style={{ color: "var(--gray-9)", flexShrink: 0 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies…"
              autoFocus
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                flex: 1,
                fontSize: "var(--font-size-2)",
                color: "var(--gray-12)",
              }}
            />
          </Flex>
        </Box>

        <Separator size="4" />

        {/* Results */}
        <ScrollArea
          style={{ maxHeight: 200 }}
          scrollbars="vertical"
        >
          <Box p="1">
            {loading && (
              <Box p="3">
                <Text size="2" color="gray">Searching…</Text>
              </Box>
            )}
            {!loading && companies.length === 0 && (
              <Box p="3">
                <Text size="2" color="gray">No companies found</Text>
              </Box>
            )}
            {companies.map((c) => (
              <Box
                key={c.id}
                onClick={() => handleSelect(c.key, c.name)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "var(--radius-2)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--accent-3)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <Text size="2" weight="medium">{c.name}</Text>
                {c.website && (
                  <Text size="1" color="gray" as="div">
                    {c.website.replace(/^https?:\/\//, "")}
                  </Text>
                )}
              </Box>
            ))}
          </Box>
        </ScrollArea>

        {/* Create new */}
        {createName && (
          <>
            <Separator size="4" />
            <Box p="2">
              <Button
                variant="soft"
                size="2"
                style={{ width: "100%" }}
                onClick={handleCreate}
                disabled={creating}
              >
                <PlusIcon />
                {creating
                  ? "Creating…"
                  : `Create "${createName}"`}
              </Button>
              {error && (
                <Text size="1" color="red" mt="1" as="div">
                  {error}
                </Text>
              )}
            </Box>
          </>
        )}
      </Popover.Content>
    </Popover.Root>
  );
}
