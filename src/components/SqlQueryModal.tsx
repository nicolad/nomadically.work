/* =========================================================
   File: components/SqlQueryModal.tsx
   Text-to-SQL in a Radix Themes Dialog (modal)
   - Ctrl/Cmd+Enter to run
   - Abortable fetch (Stop)
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
} from "@radix-ui/themes";
import {
  Cross2Icon,
  CopyIcon,
  StopIcon,
  PlayIcon,
} from "@radix-ui/react-icons";

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

  sqlEndpoint?: string;

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

async function runTextToSql(
  endpoint: string,
  question: string,
  signal?: AbortSignal,
): Promise<SqlResult> {
  console.log("[runTextToSql] Calling endpoint:", endpoint, "with question:", question);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question }),
    signal,
  });

  console.log("[runTextToSql] Response status:", res.status);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Text-to-SQL request failed (${res.status})`);
  }

  const result = (await res.json()) as SqlResult;
  console.log("[runTextToSql] Parsed result:", result);
  return result;
}

export function SqlQueryModal({
  open,
  onOpenChange,
  sqlEndpoint = "/api/text-to-sql",
  defaultQuestion = "",
  autoRunOnOpen = false,
  onDrilldownToSearch,
}: Props) {
  const questionRef = React.useRef<HTMLTextAreaElement | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const didAutoRunRef = React.useRef(false);

  const [question, setQuestion] = React.useState(defaultQuestion);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<SqlResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const stop = React.useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  const clear = React.useCallback(() => {
    setQuestion("");
    setResult(null);
    setError(null);
    setCopied(false);
    requestAnimationFrame(() => questionRef.current?.focus());
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
    const q = question.trim();
    if (!q) return;

    setError(null);
    setCopied(false);
    setLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const r = await runTextToSql(sqlEndpoint, q, controller.signal);
      setResult(r);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setResult(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [question, sqlEndpoint]);

  // Run query with explicit question
  const runWithQuestion = React.useCallback(
    async (q: string) => {
      if (!q.trim()) {
        console.log("[SqlQueryModal] Question is empty, not running");
        return;
      }

      console.log("[SqlQueryModal] runWithQuestion called with:", q);
      console.log("[SqlQueryModal] sqlEndpoint:", sqlEndpoint);

      setError(null);
      setCopied(false);
      setLoading(true);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        console.log("[SqlQueryModal] Fetching from endpoint...");
        const r = await runTextToSql(sqlEndpoint, q, controller.signal);
        console.log("[SqlQueryModal] Result:", r);
        setResult(r);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          console.log("[SqlQueryModal] Request aborted");
          return;
        }
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error("[SqlQueryModal] Error:", errorMsg);
        setResult(null);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [sqlEndpoint],
  );

  // When opening: seed state + focus + reset auto-run latch
  React.useEffect(() => {
    if (!open) {
      console.log("[SqlQueryModal] Closing modal");
      stop();
      return;
    }

    console.log("[SqlQueryModal] Opening modal with defaultQuestion:", defaultQuestion);
    console.log("[SqlQueryModal] autoRunOnOpen:", autoRunOnOpen);

    didAutoRunRef.current = false;
    setQuestion(defaultQuestion);
    setError(null);
    setCopied(false);

    requestAnimationFrame(() => questionRef.current?.focus());
  }, [open, defaultQuestion, stop]);

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

    console.log("[SqlQueryModal] Auto-running with defaultQuestion:", defaultQuestion);
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
        // When closing, abort any inflight request
        if (!next) stop();
        onOpenChange(next);
      }}
    >
      <Dialog.Content style={{ maxWidth: 980 }}>
        <Flex align="center" justify="between" gap="3">
          <Box>
            <Dialog.Title>Ask SQL</Dialog.Title>
            <Dialog.Description>
              Write a question in natural language. Press <Code>Ctrl</Code>+
              <Code>Enter</Code> (or <Code>⌘</Code>+<Code>Enter</Code>) to run.
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

        <Box mt="4">
          <TextArea
            ref={questionRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="e.g. Top 10 companies hiring React in the last 14 days"
            rows={4}
            style={{ width: "100%" }}
          />
        </Box>

        <Flex mt="3" gap="2" justify="between" wrap="wrap">
          <Flex gap="2" align="center">
            <Button
              onClick={() => void run()}
              disabled={loading || !question.trim()}
            >
              {loading ? <Spinner /> : <PlayIcon />}
              Run
            </Button>

            <Button
              variant="soft"
              color="red"
              onClick={stop}
              disabled={!loading}
            >
              <StopIcon />
              Stop
            </Button>

            <Button
              variant="soft"
              onClick={clear}
              disabled={loading && !question}
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
          {error && (
            <Callout.Root color="red" role="alert">
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          {!error && loading && (
            <Flex gap="2" align="center">
              <Spinner />
              <Text>Generating and executing SQL…</Text>
            </Flex>
          )}

          {!loading && !error && !result && (
            <Callout.Root>
              <Callout.Text>
                Run a question to see generated SQL + results here.
              </Callout.Text>
            </Callout.Root>
          )}

          {!loading && result && (
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
