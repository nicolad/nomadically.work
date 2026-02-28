"use client";

import { Button, Text } from "@radix-ui/themes";

interface StudyConceptToolbarProps {
  selectedText: string;
  selectionRect: DOMRect | null;
  isLoading: boolean;
  onExplain: (text: string) => void;
}

export function StudyConceptToolbar({
  selectedText,
  selectionRect,
  isLoading,
  onExplain,
}: StudyConceptToolbarProps) {
  if (!selectedText || !selectionRect) return null;

  // selectionRect is viewport-relative (getBoundingClientRect); fixed positioning
  // uses the same coordinate space, so no scroll offset needed.
  const top = selectionRect.top - 50;
  const left = selectionRect.left + selectionRect.width / 2;

  return (
    <div
      style={{
        position: "fixed",
        top,
        left,
        transform: "translateX(-50%)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          background: "var(--gray-2)",
          border: "1px solid var(--gray-6)",
          borderRadius: 4,
          padding: "6px 8px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}
      >
        <Button
          size="1"
          color="blue"
          disabled={isLoading}
          onClick={() => onExplain(selectedText)}
        >
          <Text size="1" weight="medium">
            {isLoading ? "Explaining..." : "Explain this"}
          </Text>
        </Button>
      </div>
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "6px solid var(--gray-6)",
        }}
      />
    </div>
  );
}
