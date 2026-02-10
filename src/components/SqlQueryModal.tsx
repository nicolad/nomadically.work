/* =========================================================
   File: components/SqlQueryModal.tsx
   Text-to-SQL in a Radix Themes Dialog (modal)
   - Ctrl/Cmd+Enter to run
   - Copy SQL
   - Optional drilldown back to search
   ========================================================= */

"use client";

import * as React from "react";
import {
  Box,
  Flex,
  Text,
  Dialog,
  TextArea,
  Button,
  IconButton,
  Callout,
  Code,
  Table,
  Spinner,
  Tabs,
} from "@radix-ui/themes";
import { Cross2Icon, CopyIcon, PlayIcon } from "@radix-ui/react-icons";
import {
  useTextToSqlLazyQuery,
  useExecuteSqlLazyQuery,
} from "@/__generated__/hooks";

export type SqlResult = {
  sql: string;
  explanation?: string;
  columns: string[];
  rows: Array<Array<string | number | boolean | null>>;
  drilldownSearchQuery?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /** Seed the modal with the current query from your search bar */
  defaultQuestion?: string;

  /**
   * If true, the modal runs once automatically when it opens.
   * (Useful when user hit Enter in the bar.)
   */
  autoRunOnOpen?: boolean;

  /** Called when user clicks "Show matching jobs" */
  onDrilldownToSearch?: (searchQuery: string) => void;
};

export function SqlQueryModal({
  open,
  onOpenChange,
  defaultQuestion = "",
  autoRunOnOpen = false,
  onDrilldownToSearch,
}: Props) {
  const questionRef = React.useRef<HTMLTextAreaElement | null>(null);
  const sqlInputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const didAutoRunRef = React.useRef(false);

  const [question, setQuestion] = React.useState(defaultQuestion);
  const [rawSql, setRawSql] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"question" | "sql">(
    "question",
  );
  const [result, setResult] = React.useState<SqlResult | null>(null);
  const [copied, setCopied] = React.useState(false);

  const [executeQuery, { loading, error, data }] = useTextToSqlLazyQuery();
  const [executeSql, { loading: sqlLoading, error: sqlError, data: sqlData }] =
    useExecuteSqlLazyQuery();

  // Update result when data changes
  React.useEffect(() => {
    if (data?.textToSql) {
      setResult({
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

  // Update result when SQL execution data changes
  React.useEffect(() => {
    if (sqlData?.executeSql) {
      setResult({
        sql: sqlData.executeSql.sql,
        explanation: sqlData.executeSql.explanation ?? undefined,
        columns: sqlData.executeSql.columns,
        rows: sqlData.executeSql.rows.map((row) =>
          (row ?? []).map((cell) => cell as string | number | boolean | null),
        ),
        drilldownSearchQuery:
          sqlData.executeSql.drilldownSearchQuery ?? undefined,
      });
    }
  }, [sqlData]);

  const clear = React.useCallback(() => {
    setQuestion("");
    setRawSql("");
    setResult(null);
    setCopied(false);
  }, []);

  const copySql = React.useCallback(async () => {
    if (!result?.sql) return;
    try {
      await navigator.clipboard.writeText(result.sql);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 900);
    } catch {
      // ignore
    }
  }, [result?.sql]);

  const run = React.useCallback(async () => {
    if (activeTab === "question") {
      const q = question.trim();
      if (!q) return;

      setCopied(false);
      await executeQuery({ variables: { question: q } });
    } else {
      const sql = rawSql.trim();
      if (!sql) return;

      setCopied(false);
      await executeSql({ variables: { sql } });
    }
  }, [question, rawSql, activeTab, executeQuery, executeSql]);

  // Run query with explicit question
  const runWithQuestion = React.useCallback(
    async (q: string) => {
      if (!q.trim()) {
        console.log("[SqlQueryModal] Question is empty, not running");
        return;
      }

      console.log("[SqlQueryModal] runWithQuestion called with:", q);
      setCopied(false);
      await executeQuery({ variables: { question: q } });
    },
    [executeQuery],
  );

  // When opening: seed state + focus + reset auto-run latch
  React.useEffect(() => {
    if (!open) {
      console.log("[SqlQueryModal] Closing modal");
      return;
    }

    console.log(
      "[SqlQueryModal] Opening modal with defaultQuestion:",
      defaultQuestion,
    );
    console.log("[SqlQueryModal] autoRunOnOpen:", autoRunOnOpen);

    didAutoRunRef.current = false;
    setQuestion(defaultQuestion);
    setRawSql("");
    setActiveTab("question");
    setCopied(false);

    requestAnimationFrame(() => {
      setTimeout(() => questionRef.current?.focus(), 0);
    });
  }, [open, defaultQuestion]);

  // Focus when switching tabs
  React.useEffect(() => {
    requestAnimationFrame(() => {
      if (activeTab === "question") {
        questionRef.current?.focus();
      } else {
        sqlInputRef.current?.focus();
      }
    });
  }, [activeTab]);

  // Auto-run once per open (if requested)
  React.useEffect(() => {
    if (!open) return;
    if (!autoRunOnOpen) {
      console.log("[SqlQueryModal] autoRunOnOpen is false, skipping auto-run");
      return;
    }
    if (didAutoRunRef.current) {
      console.log("[SqlQueryModal] Already ran, skipping");
      return;
    }

    console.log(
      "[SqlQueryModal] Auto-running with defaultQuestion:",
      defaultQuestion,
    );
    didAutoRunRef.current = true;

    // Only run if there's something to run
    if (defaultQuestion.trim()) {
      console.log("[SqlQueryModal] Calling runWithQuestion");
      void runWithQuestion(defaultQuestion);
    } else {
      console.log("[SqlQueryModal] defaultQuestion is empty, not running");
    }
  }, [open, autoRunOnOpen, defaultQuestion, runWithQuestion]);

  // Ctrl/Cmd+Enter to run inside the modal
  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Escape") {
      // allow dialog to handle close
      return;
    }
    if (e.key !== "Enter") return;
    if (!e.metaKey && !e.ctrlKey) return;

    e.preventDefault();
    void run();
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
      }}
    >
      <Dialog.Content style={{ maxWidth: 980 }}>
        <Flex align="center" justify="between" gap="3">
          <Box>
            <Dialog.Title>Ask SQL</Dialog.Title>
            <Dialog.Description>
              Write a question in natural language or input raw SQL. Press{" "}
              <Code>Ctrl</Code>+<Code>Enter</Code> (or <Code>⌘</Code>+
              <Code>Enter</Code>) to run.
            </Dialog.Description>
          </Box>

          <Flex gap="2" align="center">
            <IconButton
              variant="ghost"
              radius="full"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
            >
              <Cross2Icon />
            </IconButton>
          </Flex>
        </Flex>

        <Tabs.Root
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "question" | "sql")}
          mt="4"
        >
          <Tabs.List>
            <Tabs.Trigger value="question">Natural Language</Tabs.Trigger>
            <Tabs.Trigger value="sql">Raw SQL</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="question" mt="4" key="question-tab">
            <TextArea
              key="question-input"
              ref={questionRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="e.g. Top 10 companies hiring React in the last 14 days"
              rows={4}
              style={{ width: "100%" }}
            />
          </Tabs.Content>

          <Tabs.Content value="sql" mt="4" key="sql-tab">
            <TextArea
              key="sql-input"
              ref={sqlInputRef}
              value={rawSql}
              onChange={(e) => setRawSql(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="SELECT * FROM jobs LIMIT 10;"
              rows={4}
              style={{ width: "100%" }}
            />
          </Tabs.Content>
        </Tabs.Root>

        <Flex mt="3" gap="2" justify="between" wrap="wrap">
          <Flex gap="2" align="center">
            <Button
              onClick={() => void run()}
              disabled={
                (activeTab === "question" && (loading || !question.trim())) ||
                (activeTab === "sql" && (sqlLoading || !rawSql.trim()))
              }
            >
              {(activeTab === "question" && loading) ||
              (activeTab === "sql" && sqlLoading) ? (
                <Spinner />
              ) : (
                <PlayIcon />
              )}
              Run
            </Button>

            <Button
              variant="soft"
              onClick={clear}
              disabled={
                (activeTab === "question" && loading) ||
                (activeTab === "sql" && sqlLoading)
              }
            >
              Clear
            </Button>
          </Flex>

          <Flex gap="2" align="center">
            <Button variant="soft" onClick={copySql} disabled={!result?.sql}>
              {copied ? "Copied" : "Copy SQL"} <CopyIcon />
            </Button>

            {result?.drilldownSearchQuery && (
              <Button
                variant="soft"
                onClick={() => {
                  onDrilldownToSearch?.(result.drilldownSearchQuery!);
                  onOpenChange(false);
                }}
              >
                Show matching jobs
              </Button>
            )}
          </Flex>
        </Flex>

        <Box mt="4">
          {(error || sqlError) && (
            <Callout.Root color="red" role="alert">
              <Callout.Text>
                {activeTab === "question" ? error?.message : sqlError?.message}
              </Callout.Text>
            </Callout.Root>
          )}

          {activeTab === "question" && !error && loading && (
            <Flex gap="2" align="center">
              <Spinner />
              <Text>Generating and executing SQL…</Text>
            </Flex>
          )}

          {activeTab === "sql" && !sqlError && sqlLoading && (
            <Flex gap="2" align="center">
              <Spinner />
              <Text>Executing SQL…</Text>
            </Flex>
          )}

          {!loading && !sqlLoading && !error && !sqlError && !result && (
            <Callout.Root>
              <Callout.Text>
                Run a question to see generated SQL + results here.
              </Callout.Text>
            </Callout.Root>
          )}

          {!loading && !sqlLoading && result && (
            <Box>
              <Text weight="bold">Generated SQL</Text>
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
                  {result.sql}
                </Code>
              </Box>

              {result.explanation && (
                <Box mt="2">
                  <Text color="gray">{result.explanation}</Text>
                </Box>
              )}

              <Box mt="4" style={{ overflowX: "auto" }}>
                <Table.Root variant="surface">
                  <Table.Header>
                    <Table.Row>
                      {result.columns.map((c) => (
                        <Table.ColumnHeaderCell key={c}>
                          {c}
                        </Table.ColumnHeaderCell>
                      ))}
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {result.rows.map((row, idx) => (
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
      </Dialog.Content>
    </Dialog.Root>
  );
}
