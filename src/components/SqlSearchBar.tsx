/* =========================================================
   File: components/SqlSearchBar.tsx
   SQL query input that opens a dedicated modal
   - Question input for natural language SQL queries
   - Opens SqlQueryModal for results
   - Fully independent with internal state management
   ========================================================= */

"use client";

import * as React from "react";
import { Box, Flex, TextField, IconButton, Tooltip } from "@radix-ui/themes";
import { LightningBoltIcon, Cross2Icon } from "@radix-ui/react-icons";
import { SqlQueryModal } from "./SqlQueryModal";

type Props = {
  onDrilldownToSearch?: (query: string) => void;
  placeholder?: string;
};

function safeIsComposing(e: React.KeyboardEvent) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Boolean((e.nativeEvent as any)?.isComposing);
}

export function SqlSearchBar({
  onDrilldownToSearch,
  placeholder = "Ask the data…",
}: Props) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [sqlValue, setSqlValue] = React.useState("");
  const [sqlOpen, setSqlOpen] = React.useState(false);
  const [sqlAutoRun, setSqlAutoRun] = React.useState(false);

  const focusInput = React.useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const clear = React.useCallback(() => {
    setSqlValue("");
    focusInput();
  }, [focusInput]);

  const openSql = React.useCallback(() => {
    console.log("[SqlSearchBar] openSql called, sqlValue:", sqlValue);
    if (sqlValue.trim()) {
      console.log("[SqlSearchBar] Setting sqlAutoRun=true, sqlOpen=true");
      setSqlAutoRun(true);
      setSqlOpen(true);
    } else {
      console.log("[SqlSearchBar] sqlValue is empty, not opening");
    }
  }, [sqlValue]);

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (safeIsComposing(e)) return;

    if (e.key === "Escape") {
      if (sqlValue) {
        e.preventDefault();
        clear();
      }
      return;
    }

    if (e.key === "Enter") {
      console.log("[SqlSearchBar] Enter key pressed, sqlValue:", sqlValue);
      e.preventDefault();
      openSql();
    }
  };

  return (
    <Box>
      <TextField.Root
        size="3"
        radius="full"
        variant="surface"
        style={{ boxShadow: "0 0 0 1px var(--gray-a5) inset" }}
      >
        <TextField.Slot side="left">
          <LightningBoltIcon />
        </TextField.Slot>

        <TextField.Slot style={{ flex: 1 }}>
          <input
            ref={inputRef}
            value={sqlValue}
            placeholder={placeholder}
            onChange={(e) => setSqlValue(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="SQL query input"
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
            {sqlValue.length > 0 && (
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

            <Tooltip content="Query (Enter)">
              <IconButton
                variant="ghost"
                radius="full"
                aria-label="Run SQL query"
                onClick={openSql}
                disabled={!sqlValue.trim()}
              >
                <LightningBoltIcon />
              </IconButton>
            </Tooltip>
          </Flex>
        </TextField.Slot>
      </TextField.Root>

      <SqlQueryModal
        open={sqlOpen}
        onOpenChange={(o) => {
          setSqlOpen(o);
          if (!o) {
            setSqlAutoRun(false);
            focusInput();
          }
        }}
        defaultQuestion={sqlValue}
        autoRunOnOpen={sqlAutoRun}
        onDrilldownToSearch={(q) => {
          setSqlValue("");
          onDrilldownToSearch?.(q);
        }}
      />
    </Box>
  );
}
