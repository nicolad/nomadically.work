"use client";

import { LightningBoltIcon, Link2Icon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Button, Flex, Text } from "@radix-ui/themes";

interface TextSelectionToolbarProps {
  selectedText: string;
  selectionRect: DOMRect | null;
  isGenerating: boolean;
  onGenerate: (text: string) => void;
  onLinkToExisting: (text: string) => void;
  bestMatch?: { requirement: string; score: number } | null;
  onAutoLink?: (requirement: string) => void;
  onDiveDeep?: (text: string) => void;
  isDiving?: boolean;
  willDiveAfterGenerate?: boolean;
  activeLinkTarget?: string | null;
  onCancelLinkTarget?: () => void;
}

function getConfidenceLabel(score: number): { label: string; color: string } {
  if (score >= 0.8) return { label: "Best match", color: "var(--green-11)" };
  if (score >= 0.5) return { label: "Good match", color: "var(--amber-11)" };
  if (score >= 0.3) return { label: "Possible", color: "var(--amber-9)" };
  return { label: "Weak", color: "var(--gray-10)" };
}

export function TextSelectionToolbar({
  selectedText,
  selectionRect,
  isGenerating,
  onGenerate,
  onLinkToExisting,
  bestMatch,
  onAutoLink,
  onDiveDeep,
  isDiving,
  willDiveAfterGenerate,
  activeLinkTarget,
  onCancelLinkTarget,
}: TextSelectionToolbarProps) {
  if (!selectedText || !selectionRect) return null;

  const top = selectionRect.top + window.scrollY - 80;
  const left = selectionRect.left + selectionRect.width / 2;

  const { label: confidenceLabel, color: confidenceColor } = bestMatch
    ? getConfidenceLabel(bestMatch.score)
    : { label: "", color: "" };

  const displayName = bestMatch
    ? bestMatch.requirement.length > 36
      ? bestMatch.requirement.slice(0, 36) + "..."
      : bestMatch.requirement
    : "";

  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minWidth: 280,
      }}
    >
      <div
        style={{
          background: "var(--gray-2)",
          border: "1px solid var(--gray-6)",
          borderRadius: 4,
          padding: "6px 8px",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 6,
          boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
          animation: "toolbar-enter 150ms ease-out",
          width: "100%",
        }}
      >
        {/* Row 1: always visible */}
        {isGenerating ? (
          <Text size="1" color="gray" style={{ animation: "toolbar-pulse 1.5s ease-in-out infinite", padding: "2px 0" }}>
            Generating…
          </Text>
        ) : activeLinkTarget ? (
          <Flex align="center" justify="between" gap="2">
            <Button
              size="1"
              variant="solid"
              color="blue"
              onClick={() => onAutoLink && onAutoLink(activeLinkTarget)}
            >
              <Link2Icon />
              <Text size="1" weight="medium">
                Link to "{activeLinkTarget.length > 28 ? activeLinkTarget.slice(0, 28) + "…" : activeLinkTarget}"
              </Text>
            </Button>
            <Button
              size="1"
              variant="ghost"
              color="gray"
              onClick={onCancelLinkTarget}
            >
              <Text size="1">Cancel</Text>
            </Button>
          </Flex>
        ) : (
          <Flex align="center" justify="between" gap="2">
            {bestMatch && bestMatch.score >= 0.8 && !activeLinkTarget ? (
              <Button
                size="1"
                variant="ghost"
                color="gray"
                disabled={isGenerating}
                onClick={() => onGenerate(selectedText)}
              >
                <LightningBoltIcon />
                <Text size="1">New…</Text>
              </Button>
            ) : !activeLinkTarget ? (
              <Button
                size="1"
                variant="solid"
                color="blue"
                disabled={isGenerating}
                onClick={() => onGenerate(selectedText)}
              >
                <LightningBoltIcon />
                <Text size="1" weight="medium">
                  {willDiveAfterGenerate ? "Generate & Dive" : "Generate prep"}
                </Text>
              </Button>
            ) : null}
            <Button
              size="1"
              variant="ghost"
              color="gray"
              disabled={isGenerating}
              onClick={() => onLinkToExisting(selectedText)}
            >
              <Link2Icon />
              <Text size="1">{bestMatch ? "All…" : "Link to existing"}</Text>
            </Button>
          </Flex>
        )}

        {/* Row 2: match chip — only when bestMatch exists */}
        {bestMatch && onAutoLink && (
          <Flex
            align="center"
            gap="2"
            style={{
              padding: "3px 6px",
              background: "var(--amber-3)",
              border: "1px solid var(--amber-7)",
              borderRadius: 3,
            }}
          >
            <Text
              size="1"
              weight="bold"
              style={{ color: confidenceColor, flexShrink: 0 }}
            >
              {confidenceLabel}
            </Text>
            <Text
              size="1"
              title={bestMatch.requirement}
              style={{
                color: "var(--amber-11)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                flex: 1,
                minWidth: 0,
              }}
            >
              {displayName}
            </Text>
            {isDiving ? (
              <Flex align="center" gap="1" style={{ flexShrink: 0 }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 12,
                    height: 12,
                    border: "2px solid var(--amber-9)",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "toolbar-spin 0.6s linear infinite",
                  }}
                />
                <Text size="1" style={{ color: "var(--amber-11)" }}>Diving…</Text>
              </Flex>
            ) : (
              <Flex align="center" gap="1" style={{ flexShrink: 0 }}>
                <Button
                  size="1"
                  variant="ghost"
                  disabled={isDiving}
                  style={{ color: "var(--amber-11)", padding: "0 4px", minWidth: "auto" }}
                  onClick={() => onAutoLink(bestMatch.requirement)}
                >
                  <Link2Icon />
                  <Text size="1">Link</Text>
                </Button>
                {onDiveDeep && (
                  <Button
                    size="1"
                    variant={bestMatch.score >= 0.5 ? "solid" : "ghost"}
                    color="amber"
                    disabled={isDiving}
                    style={{ padding: "0 6px", minWidth: "auto" }}
                    onClick={() => onDiveDeep(selectedText)}
                  >
                    <MagnifyingGlassIcon />
                    <Text size="1">Dive</Text>
                  </Button>
                )}
              </Flex>
            )}
          </Flex>
        )}
      </div>

      {/* Caret */}
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
