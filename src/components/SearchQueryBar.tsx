/* =========================================================
   File: components/SearchQueryBar.tsx
   Search bar with a mode toggle; SQL opens modal (separate component)
   - Enter runs active mode
   - Shift+Enter runs the other mode
   - /sql, ? forces SQL modal
   - /find, ! forces Search
   - Debounced search typing (Search mode only)
   ========================================================= */

"use client";

import * as React from "react";
import {
  Box,
  Flex,
  Text,
  TextField,
  SegmentedControl,
  IconButton,
  Tooltip,
  Badge,
} from "@radix-ui/themes";
import { MagnifyingGlassIcon, LightningBoltIcon, Cross2Icon } from "@radix-ui/react-icons";
import { SqlQueryModal } from "./SqlQueryModal";

export type QueryMode = "search" | "sql";

type Props = {
  onSearchQueryChange?: (q: string) => void;
  onSearchSubmit?: (q: string) => void;

  sqlEndpoint?: string;

  initialMode?: QueryMode;
  initialQuery?: string;

  searchDebounceMs?: number;

  /**
   * When SQL result returns a drilldownSearchQuery, we call this and also update the bar.
   * If you want to centralize state elsewhere, you can ignore this and only use onSearchSubmit.
   */
  onDrilldownToSearch?: (q: string) => void;
};

function parseCommand(raw: string): { forcedMode?: QueryMode; normalizedQuery: string } {
  const q = raw.trim();
  if (!q) return { normalizedQuery: "" };

  if (q.startsWith("/sql ")) return { forcedMode: "sql", normalizedQuery: q.slice(5).trim() };
  if (q.startsWith("?")) return { forcedMode: "sql", normalizedQuery: q.slice(1).trim() };

  if (q.startsWith("/find ")) return { forcedMode: "search", normalizedQuery: q.slice(6).trim() };
  if (q.startsWith("!")) return { forcedMode: "search", normalizedQuery: q.slice(1).trim() };

  return { normalizedQuery: q };
}

function safeIsComposing(e: React.KeyboardEvent) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Boolean((e.nativeEvent as any)?.isComposing);
}

export function SearchQueryBar({
  onSearchQueryChange,
  onSearchSubmit,
  onDrilldownToSearch,
  sqlEndpoint = "/api/text-to-sql",
  initialMode = "search",
  initialQuery = "",
  searchDebounceMs = 120,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const debounceRef = React.useRef<number | null>(null);

  const [mode, setMode] = React.useState<QueryMode>(initialMode);
  const [value, setValue] = React.useState(initialQuery);

  const [sqlOpen, setSqlOpen] = React.useState(false);
  const [sqlSeedQuestion, setSqlSeedQuestion] = React.useState("");
  const [sqlAutoRun, setSqlAutoRun] = React.useState(false);

  const parsed = React.useMemo(() => parseCommand(value), [value]);
  const effectiveMode: QueryMode = parsed.forcedMode ?? mode;
  const normalizedQuery = parsed.normalizedQuery;

  const placeholder =
    effectiveMode === "search"
      ? "Search jobs… (tip: /sql or ? forces SQL)"
      : "Ask the data… (tip: /find or ! forces Search)";

  // Debounced typing only when in Search mode (effective)
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

  const focusInput = React.useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const clear = React.useCallback(() => {
    setValue("");
    focusInput();
  }, [focusInput]);

  const openSqlModal = React.useCallback(
    (question: string, autoRunOnOpen: boolean) => {
      setSqlSeedQuestion(question);
      setSqlAutoRun(autoRunOnOpen);
      setSqlOpen(true);
    },
    [],
  );

  const run = React.useCallback(
    (opts?: { invertMode?: boolean; fromClick?: boolean }) => {
      const q = normalizedQuery.trim();
      if (!q) return;

      const chosenMode: QueryMode = opts?.invertMode
        ? effectiveMode === "search"
          ? "sql"
          : "search"
        : effectiveMode;

      if (chosenMode === "search") {
        onSearchSubmit?.(q);
        return;
      }

      // SQL -> modal
      openSqlModal(q, true);
    },
    [effectiveMode, normalizedQuery, onSearchSubmit, openSqlModal],
  );

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (safeIsComposing(e)) return;

    if (e.key === "Escape") {
      if (value) {
        e.preventDefault();
        clear();
      }
      return;
    }

    if (e.key !== "Enter") return;
    e.preventDefault();
    run({ invertMode: e.shiftKey });
  };

  const runIcon = effectiveMode === "search" ? <MagnifyingGlassIcon /> : <LightningBoltIcon />;
  const runTooltip =
    effectiveMode === "search"
      ? "Enter: Search • Shift+Enter: SQL"
      : "Enter: SQL • Shift+Enter: Search";

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
        style={{ boxShadow: "0 0 0 1px var(--gray-a5) inset" }}
      >
        <TextField.Slot side="left">
          <SegmentedControl.Root
            size="1"
            radius="full"
            value={mode}
            onValueChange={(v) => {
              if (v === "search" || v === "sql") setMode(v);
              focusInput();
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Search input"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
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

            <Tooltip content={runTooltip}>
              <Badge
                variant="soft"
                radius="full"
                style={{ userSelect: "none", paddingLeft: 10, paddingRight: 10 }}
              >
                Enter runs
              </Badge>
            </Tooltip>

            {value.length > 0 && (
              <Tooltip content="Clear (Esc)">
                <IconButton variant="ghost" radius="full" aria-label="Clear input" onClick={clear}>
                  <Cross2Icon />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip content={runTooltip}>
              <IconButton
                variant="ghost"
                radius="full"
                aria-label={effectiveMode === "search" ? "Run search" : "Open SQL modal"}
                onClick={() => run({ fromClick: true })}
                disabled={!normalizedQuery.trim()}
              >
                {runIcon}
              </IconButton>
            </Tooltip>
          </Flex>
        </TextField.Slot>
      </TextField.Root>

      <Box mt="2">
        <Text size="2" color="gray">
          Shortcuts: <code>Enter</code> runs active mode · <code>Shift+Enter</code> runs the other ·{" "}
          <code>/sql …</code> or <code>?</code> forces SQL · <code>/find …</code> or <code>!</code> forces Search ·{" "}
          <code>Esc</code> clears
        </Text>
      </Box>

      <SqlQueryModal
        open={sqlOpen}
        onOpenChange={(o) => {
          setSqlOpen(o);
          if (!o) {
            setSqlAutoRun(false);
            // keep focus on bar when closing
            focusInput();
          }
        }}
        sqlEndpoint={sqlEndpoint}
        defaultQuestion={sqlSeedQuestion}
        autoRunOnOpen={sqlAutoRun}
        onDrilldownToSearch={(q) => {
          setMode("search");
          setValue(q);
          onDrilldownToSearch?.(q);
          onSearchSubmit?.(q);
          focusInput();
        }}
      />
    </Box>
  );
}
