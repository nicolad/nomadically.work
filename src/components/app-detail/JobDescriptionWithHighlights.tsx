"use client";

import type { AiInterviewPrepRequirement } from "@/__generated__/hooks";

interface JobDescriptionWithHighlightsProps {
  jobDescription: string;
  requirements: AiInterviewPrepRequirement[];
  onHighlightClick: (requirement: AiInterviewPrepRequirement) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  flashRequirement?: string | null;
}

interface TextSegment {
  text: string;
  highlight?: {
    requirement: AiInterviewPrepRequirement;
    quote: string;
  };
}

function buildSegments(
  text: string,
  quotes: { quote: string; requirement: AiInterviewPrepRequirement }[],
): TextSegment[] {
  const matches: {
    start: number;
    end: number;
    quote: string;
    requirement: AiInterviewPrepRequirement;
  }[] = [];

  for (const { quote, requirement } of quotes) {
    if (!quote) continue;
    let searchStart = 0;
    while (true) {
      const idx = text.indexOf(quote, searchStart);
      if (idx === -1) break;
      matches.push({ start: idx, end: idx + quote.length, quote, requirement });
      searchStart = idx + quote.length;
    }
  }

  if (matches.length === 0) {
    return [{ text }];
  }

  // Sort by start position; on tie prefer longer match
  matches.sort((a, b) => a.start - b.start || b.quote.length - a.quote.length);

  // Remove overlapping matches (keep whichever starts first)
  const nonOverlapping: typeof matches = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start < cursor) continue;
    nonOverlapping.push(m);
    cursor = m.end;
  }

  const segments: TextSegment[] = [];
  let pos = 0;

  for (const m of nonOverlapping) {
    if (m.start > pos) {
      segments.push({ text: text.slice(pos, m.start) });
    }
    segments.push({
      text: m.quote,
      highlight: { requirement: m.requirement, quote: m.quote },
    });
    pos = m.end;
  }

  if (pos < text.length) {
    segments.push({ text: text.slice(pos) });
  }

  return segments;
}

export function JobDescriptionWithHighlights({
  jobDescription,
  requirements,
  onHighlightClick,
  containerRef,
  flashRequirement,
}: JobDescriptionWithHighlightsProps) {
  const quotes = requirements
    .filter((r) => r.sourceQuote)
    .map((r) => ({ quote: r.sourceQuote as string, requirement: r }));

  const segments = buildSegments(jobDescription, quotes);

  return (
    <div ref={containerRef}>
      <style>{`
        @keyframes flash-highlight {
          0%   { background: var(--amber-6); }
          100% { background: var(--amber-3); }
        }
      `}</style>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          fontFamily: "inherit",
          margin: 0,
          lineHeight: 1.6,
          color: "var(--gray-12)",
          fontSize: "var(--font-size-2)",
        }}
      >
        {segments.map((seg, i) => {
          if (!seg.highlight) {
            return <span key={i}>{seg.text}</span>;
          }

          const { requirement } = seg.highlight;
          const shouldFlash = flashRequirement === requirement.requirement;

          return (
            <mark
              key={i}
              title={requirement.requirement}
              onClick={() => onHighlightClick(requirement)}
              style={{
                background: "var(--amber-3)",
                borderBottom: "2px solid var(--amber-7)",
                cursor: "pointer",
                borderRadius: 0,
                color: "inherit",
                ...(shouldFlash && { animation: "flash-highlight 1.5s ease-out" }),
              }}
            >
              {seg.text}
            </mark>
          );
        })}
      </pre>
    </div>
  );
}
