/* =========================================================
   File: components/UnifiedQueryBar.tsx
   Improved: correct Radix TextField composition, cleaner UX,
   mode-aware behavior, debounced search typing, abortable SQL,
   copy SQL, clear input, better keyboard handling.
   ========================================================= */

"use client";

import * as React from "react";
import {
  Box,
  Flex,
  Text,
  Tabs,
  Table,
  TextField,
  SegmentedControl,
  IconButton,
  Tooltip,
  Badge,
  Button,
  Spinner,
  Callout,
  Code,
} from "@radix-ui/themes";
import {
  MagnifyingGlassIcon,
  LightningBoltIcon,
  Cross2Icon,
  CopyIcon,
} from "@radix-ui/react-icons";
import { useTextToSqlLazyQuery } from "@/__generated__/hooks";

export type QueryMode = "search" | "sql";

export type SqlResult = {
  sql: string;
  explanation?: string;
  columns: string[];
  rows: Array<Array<string | number | boolean | null>>;
  drilldownSearchQuery?: string;
};

type Props = {
  /** Called as the user types (only when effective mode === "search"). Great for local filtering. */
  onSearchQueryChange?: (q: string) => void;

  /** Called when user "runs" a search (Enter in search mode). */
  onSearchSubmit?: (q: string) => void;

  /** Initial mode of the toggle. Default: "search". */
  initialMode?: QueryMode;

  /** Optional: render something in the Jobs tab (e.g., your cards). */
  jobsPanel?: React.ReactNode;

  /** Optional: set an initial value in the input. */
  initialQuery?: string;

  /** Debounce for onSearchQueryChange (ms). Default: 120 */
  searchDebounceMs?: number;

  /** If true, keeps last SQL result when you switch to Search. Default: false */
  persistSqlResult?: boolean;
};

function parseCommand(raw: string): {
  forcedMode?: QueryMode;
  normalizedQuery: string;
} {
  const q = raw.trim();
  if (!q) return { normalizedQuery: "" };

  // SQL force
  if (q.startsWith("/sql "))
    return { forcedMode: "sql", normalizedQuery: q.slice(5).trim() };
  if (q.startsWith("?"))
    return { forcedMode: "sql", normalizedQuery: q.slice(1).trim() };

  // Search force
  if (q.startsWith("/find "))
    return { forcedMode: "search", normalizedQuery: q.slice(6).trim() };
  if (q.startsWith("!"))
    return { forcedMode: "search", normalizedQuery: q.slice(1).trim() };

  return { normalizedQuery: q };
}

export function UnifiedQueryBar({
  onSearchQueryChange,
  onSearchSubmit,
  initialMode = "search",
  jobsPanel,
  initialQuery = "",
  searchDebounceMs = 120,
  persistSqlResult = false,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const debounceRef = React.useRef<number | null>(null);

  const [mode, setMode] = React.useState<QueryMode>(initialMode);
  const [value, setValue] = React.useState(initialQuery);
  const [activeTab, setActiveTab] = React.useState<"jobs" | "data">("jobs");

  const [sqlResult, setSqlResult] = React.useState<SqlResult | null>(null);
  const [copied, setCopied] = React.useState(false);

  const [executeQuery, { loading, error, data }] = useTextToSqlLazyQuery();

  // Update result when data changes
  React.useEffect(() => {
    if (data?.textToSql) {
      setSqlResult({
        sql: data.textToSql.sql,
        explanation: data.textToSql.explanation ?? undefined,
        columns: data.textToSql.columns,
        rows: data.textToSql.rows.map((row) =>
          (row ?? []).map((cell) => cell as string | number | boolean | null),
        ),
        drilldownSearchQuery: data.textToSql.drilldownSearchQuery ?? undefined,
      });
    }
  }, [data]);

  const parsed = React.useMemo(() => parseCommand(value), [value]);
  const effectiveMode: QueryMode = parsed.forcedMode ?? mode;
  const normalizedQuery = parsed.normalizedQuery;

  const placeholder =
    effectiveMode === "search"
      ? "Search jobs… (tip: /sql or ? forces SQL)"
      : "Ask the data… (tip: /find or ! forces Search)";

  // Debounced local filtering (only when effective mode is search)
  React.useEffect(() => {
    if (!onSearchQueryChange) return;
    if (effectiveMode !== "search") return;

    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    debounceRef.current = window.setTimeout(() => {
      onSearchQueryChange(normalizedQuery);
    }, searchDebounceMs);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [effectiveMode, normalizedQuery, onSearchQueryChange, searchDebounceMs]);

  const clear = React.useCallback(() => {
    setValue("");
    setCopied(false);
    if (!persistSqlResult) setSqlResult(null);
    // Keep focus for fast iteration
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [persistSqlResult]);

  const copySql = React.useCallback(async () => {
    if (!sqlResult?.sql) return;
    try {
      await navigator.clipboard.writeText(sqlResult.sql);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 900);
    } catch {
      // no-op: clipboard can fail in some contexts
    }
  }, [sqlResult?.sql]);

  const run = React.useCallback(
    async (opts?: { invertMode?: boolean }) => {
      const q = normalizedQuery.trim();
      if (!q) return;

      const chosenMode: QueryMode = opts?.invertMode
        ? effectiveMode === "search"
          ? "sql"
          : "search"
        : effectiveMode;

      setCopied(false);

      if (chosenMode === "search") {
        setActiveTab("jobs");
        if (!persistSqlResult) setSqlResult(null);
        onSearchSubmit?.(q);
        return;
      }

      // SQL mode
      setActiveTab("data");
      await executeQuery({ variables: { question: q } });
    },
    [
      effectiveMode,
      normalizedQuery,
      onSearchSubmit,
      persistSqlResult,
      executeQuery,
    ],
  );

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    // Avoid interfering with IME composition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isComposing = (e.nativeEvent as any)?.isComposing;
    if (isComposing) return;

    if (e.key === "Escape") {
      if (value) {
        e.preventDefault();
        clear();
      }
      return;
    }

    if (e.key !== "Enter") return;
    e.preventDefault();

    // Enter runs effective mode, Shift+Enter runs the other mode
    void run({ invertMode: e.shiftKey });
  };

  const runIcon =
    effectiveMode === "search" ? (
      <MagnifyingGlassIcon />
    ) : (
      <LightningBoltIcon />
    );
  const runTooltip =
    effectiveMode === "search"
      ? "Enter: Search • Shift+Enter: SQL"
      : "Enter: SQL • Shift+Enter: Search";

  // Small mode hint if user forced a mode via prefix, without being loud
  const forcedHint =
    parsed.forcedMode && parsed.forcedMode !== mode
      ? parsed.forcedMode === "sql"
        ? "Forced: SQL"
        : "Forced: Search"
      : null;

  return (
    <Box>
      <TextField.Root
        size="3"
        radius="full"
        variant="surface"
        style={{
          // Helps match your screenshot: subtle border + roomy "pill"
          boxShadow: "0 0 0 1px var(--gray-a5) inset",
        }}
      >
        <TextField.Slot side="left">
          <SegmentedControl.Root
            size="1"
            radius="full"
            value={mode}
            onValueChange={(v) => {
              if (v === "search" || v === "sql") setMode(v);
              // Keep the caret in the input when toggling
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            aria-label="Query mode"
          >
            <SegmentedControl.Item value="search">Search</SegmentedControl.Item>
            <SegmentedControl.Item value="sql">SQL</SegmentedControl.Item>
          </SegmentedControl.Root>
        </TextField.Slot>

        <TextField.Slot style={{ flex: 1 }}>
          <input
            ref={inputRef}
            value={value}
            placeholder={placeholder}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setValue(e.target.value)
            }
            onKeyDown={onKeyDown}
            aria-label="Unified search / text-to-sql input"
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: "inherit",
              color: "inherit",
              fontFamily: "inherit",
            }}
          />
        </TextField.Slot>

        <TextField.Slot side="right">
          <Flex gap="2" align="center">
            {forcedHint && (
              <Badge variant="soft" radius="full">
                {forcedHint}
              </Badge>
            )}

            {/* "Enter runs" pill like in your screenshot (compact, not shouty) */}
            <Tooltip content={runTooltip}>
              <Badge
                variant="soft"
                radius="full"
                style={{
                  userSelect: "none",
                  paddingLeft: 10,
                  paddingRight: 10,
                }}
              >
                Enter runs
              </Badge>
            </Tooltip>

            {value.length > 0 && (
              <Tooltip content="Clear (Esc)">
                <IconButton
                  variant="ghost"
                  radius="full"
                  aria-label="Clear input"
                  onClick={clear}
                >
                  <Cross2Icon />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip content={runTooltip}>
              <IconButton
                variant="ghost"
                radius="full"
                aria-label={
                  effectiveMode === "search" ? "Run search" : "Run SQL"
                }
                onClick={() => void run()}
                disabled={loading && effectiveMode === "sql"}
              >
                {loading && effectiveMode === "sql" ? <Spinner /> : runIcon}
              </IconButton>
            </Tooltip>
          </Flex>
        </TextField.Slot>
      </TextField.Root>

      <Box mt="3">
        <Tabs.Root
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "jobs" | "data")}
        >
          <Tabs.List>
            <Tabs.Trigger value="jobs">Jobs</Tabs.Trigger>
            <Tabs.Trigger value="data">Data</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="jobs">
            <Box mt="3">
              {jobsPanel ?? (
                <Callout.Root>
                  <Callout.Text>
                    Render your job cards here. While in <b>Search</b> mode,
                    typing calls <code>onSearchQueryChange</code> for debounced
                    filtering.
                  </Callout.Text>
                </Callout.Root>
              )}
            </Box>
          </Tabs.Content>

          <Tabs.Content value="data">
            <Box mt="3">
              {loading && (
                <Flex gap="2" align="center">
                  <Spinner />
                  <Text>Generating and executing SQL…</Text>
                </Flex>
              )}

              {error && (
                <Callout.Root color="red" role="alert">
                  <Callout.Text>{error.message}</Callout.Text>
                </Callout.Root>
              )}

              {!loading && !error && !sqlResult && (
                <Callout.Root>
                  <Callout.Text>
                    Switch to <b>SQL</b> mode and press Enter to run a
                    Text-to-SQL query.
                  </Callout.Text>
                </Callout.Root>
              )}

              {!loading && sqlResult && (
                <Box>
                  <Flex gap="2" align="center" justify="between" wrap="wrap">
                    <Text weight="bold">SQL</Text>

                    <Flex gap="2" align="center">
                      <Button
                        variant="soft"
                        onClick={copySql}
                        disabled={!sqlResult.sql}
                      >
                        {copied ? "Copied" : "Copy SQL"}
                        <CopyIcon />
                      </Button>

                      {sqlResult.drilldownSearchQuery && (
                        <Button
                          variant="soft"
                          onClick={() => {
                            setMode("search");
                            setActiveTab("jobs");
                            setValue(sqlResult.drilldownSearchQuery ?? "");
                            requestAnimationFrame(() =>
                              inputRef.current?.focus(),
                            );
                          }}
                        >
                          Show matching jobs
                        </Button>
                      )}
                    </Flex>
                  </Flex>

                  <Box mt="2">
                    <Code
                      variant="ghost"
                      style={{
                        display: "block",
                        whiteSpace: "pre",
                        overflowX: "auto",
                        padding: 12,
                        borderRadius: 12,
                        boxShadow: "0 0 0 1px var(--gray-a5) inset",
                      }}
                    >
                      {sqlResult.sql}
                    </Code>
                  </Box>

                  {sqlResult.explanation && (
                    <Box mt="2">
                      <Text color="gray">{sqlResult.explanation}</Text>
                    </Box>
                  )}

                  <Box mt="3" style={{ overflowX: "auto" }}>
                    <Table.Root variant="surface">
                      <Table.Header>
                        <Table.Row>
                          {sqlResult.columns.map((c) => (
                            <Table.ColumnHeaderCell key={c}>
                              {c}
                            </Table.ColumnHeaderCell>
                          ))}
                        </Table.Row>
                      </Table.Header>

                      <Table.Body>
                        {sqlResult.rows.map((row, idx) => (
                          <Table.Row key={idx}>
                            {row.map((cell, j) => (
                              <Table.Cell key={j}>
                                {cell === null ? (
                                  <Text color="gray">NULL</Text>
                                ) : (
                                  String(cell)
                                )}
                              </Table.Cell>
                            ))}
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  </Box>
                </Box>
              )}
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </Box>

      <Box mt="2">
        <Text size="2" color="gray">
          Shortcuts: <code>Enter</code> runs the active mode ·{" "}
          <code>Shift+Enter</code> runs the other · <code>/sql …</code> or{" "}
          <code>?</code> forces SQL · <code>/find …</code> or <code>!</code>{" "}
          forces Search · <code>Esc</code> clears
        </Text>
      </Box>
    </Box>
  );
}
