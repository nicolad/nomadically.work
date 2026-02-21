/* =========================================================
   File: components/JobsSearchBar.tsx
   Full-text search input for jobs
   - Debounced typing as you search
   - Enter to submit
   - Esc to clear
   ========================================================= */

"use client";

import * as React from "react";
import { Flex, TextField, IconButton, Tooltip } from "@radix-ui/themes";
import { MagnifyingGlassIcon, Cross2Icon } from "@radix-ui/react-icons";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (query: string) => void;
  onClear?: () => void;
  debounceMs?: number;
  placeholder?: string;
};

function safeIsComposing(e: React.KeyboardEvent) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Boolean((e.nativeEvent as any)?.isComposing);
}

export function JobsSearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
  debounceMs = 120,
  placeholder = "Search jobs…",
}: Props) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const debounceRef = React.useRef<number | null>(null);

  const focusInput = React.useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const clear = React.useCallback(() => {
    onChange("");
    onClear?.();
    focusInput();
  }, [onChange, onClear, focusInput]);

  const handleChange = React.useCallback(
    (text: string) => {
      onChange(text);

      // Debounced submission on typing
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        if (text.trim()) {
          onSubmit(text);
        }
      }, debounceMs);
    },
    [onChange, onSubmit, debounceMs],
  );

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
      if (value.trim()) {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        onSubmit(value);
      }
    }
  };

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <TextField.Root
      ref={inputRef}
      size="3"
      radius="none"
      variant="surface"
      value={value}
      placeholder={placeholder}
      onChange={(e) => handleChange(e.target.value)}
      onKeyDown={handleKeyDown}
      aria-label="Search input"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      style={{ boxShadow: "0 0 0 1px var(--gray-a5) inset" }}
    >
      <TextField.Slot side="left">
        <MagnifyingGlassIcon />
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

          <Tooltip content="Search (Enter)">
            <IconButton
              variant="ghost"
              radius="full"
              aria-label="Run search"
              onClick={() => {
                if (value.trim()) onSubmit(value);
              }}
              disabled={!value.trim()}
            >
              <MagnifyingGlassIcon />
            </IconButton>
          </Tooltip>
        </Flex>
      </TextField.Slot>
    </TextField.Root>
  );
}
