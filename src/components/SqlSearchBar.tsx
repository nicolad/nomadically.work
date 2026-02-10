/* =========================================================
   File: components/SqlSearchBar.tsx
   SQL query input that opens a dedicated modal
   - Question input for natural language SQL queries
   - Opens SqlQueryModal for results
   ========================================================= */

"use client";

import * as React from "react";
import { Box, Flex, TextField, IconButton, Tooltip } from "@radix-ui/themes";
import { LightningBoltIcon, Cross2Icon } from "@radix-ui/react-icons";
import { SqlQueryModal } from "./SqlQueryModal";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (query: string) => void;
  onDrilldownToSearch?: (query: string) => void;
  sqlEndpoint?: string;
  placeholder?: string;
};

function safeIsComposing(e: React.KeyboardEvent) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Boolean((e.nativeEvent as any)?.isComposing);
}

export function SqlSearchBar({
  value,
  onChange,
  onSubmit,
  onDrilldownToSearch,
  sqlEndpoint = "/api/text-to-sql",
  placeholder = "Ask the data…",
}: Props) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [sqlOpen, setSqlOpen] = React.useState(false);
  const [sqlAutoRun, setSqlAutoRun] = React.useState(false);

  const focusInput = React.useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const clear = React.useCallback(() => {
    onChange("");
    focusInput();
  }, [onChange, focusInput]);

  const openSql = React.useCallback(() => {
    if (value.trim()) {
      onSubmit(value);
      setSqlAutoRun(true);
      setSqlOpen(true);
    }
  }, [value, onSubmit]);

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (safeIsComposing(e)) return;

    if (e.key === "Escape") {
      if (value) {
        e.preventDefault();
        clear();
      }
      return;
    }

    if (e.key === "Enter") {
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
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
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

            <Tooltip content="Query (Enter)">
              <IconButton
                variant="ghost"
                radius="full"
                aria-label="Run SQL query"
                onClick={openSql}
                disabled={!value.trim()}
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
        sqlEndpoint={sqlEndpoint}
        defaultQuestion={value}
        autoRunOnOpen={sqlAutoRun}
        onDrilldownToSearch={(q) => {
          onDrilldownToSearch?.(q);
        }}
      />
    </Box>
  );
}
