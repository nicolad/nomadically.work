export type TooltipData = {
  x: number;
  y: number;
  type: string;
  data: Record<string, unknown>;
};

function truncate(str: string, max: number): string {
  if (!str) return "";
  return str.length <= max ? str : str.slice(0, max).trimEnd() + "…";
}

const ANIMATION_ID = "graph-tooltip-fadein";

function ensureAnimation(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(ANIMATION_ID)) return;
  const style = document.createElement("style");
  style.id = ANIMATION_ID;
  style.textContent = `
    @keyframes graphTooltipFadeIn {
      from { opacity: 0; transform: translateX(-50%) translateY(calc(-100% - 4px)); }
      to   { opacity: 1; transform: translateX(-50%) translateY(calc(-100% - 8px)); }
    }
  `;
  document.head.appendChild(style);
}

function borderColorForType(type: string, data: Record<string, unknown>): string {
  if (type === "topic") return "var(--violet-9)";
  if (type === "center") return "var(--accent-9)";
  if (type === "requirement") {
    const completed = (data.topicsCompleted as number) ?? 0;
    const total = (data.topicsTotal as number) ?? 1;
    return completed >= total ? "var(--green-9)" : "var(--amber-9)";
  }
  return "var(--gray-6)";
}

export function GraphTooltip({ tooltip }: { tooltip: TooltipData }): JSX.Element {
  ensureAnimation();

  const { x, y, type, data } = tooltip;
  const borderColor = borderColorForType(type, data);

  const completed = (data.topicsCompleted as number) ?? 0;
  const total = (data.topicsTotal as number) ?? 1;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const progressBarColor = progressPct >= 100 ? "var(--green-9)" : "var(--amber-9)";

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y - 8,
        transform: "translateX(-50%) translateY(calc(-100% - 8px))",
        background: "var(--gray-2)",
        border: "1px solid var(--gray-5)",
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 8,
        padding: "10px 14px",
        maxWidth: 280,
        fontSize: 11,
        color: "var(--gray-12)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.28), 0 2px 6px rgba(0,0,0,0.18)",
        pointerEvents: "none" as const,
        zIndex: 50,
        lineHeight: 1.5,
        animation: "graphTooltipFadeIn 0.15s ease-out forwards",
      }}
    >
      {/* Arrow pointer — border layer */}
      <div
        style={{
          position: "absolute",
          bottom: -7,
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "7px solid transparent",
          borderRight: "7px solid transparent",
          borderTop: "7px solid var(--gray-5)",
        }}
      />
      {/* Arrow pointer — fill layer */}
      <div
        style={{
          position: "absolute",
          bottom: -5,
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "6px solid var(--gray-2)",
        }}
      />

      {type === "requirement" && (
        <>
          {data.sourceQuote && (
            <div
              style={{
                fontStyle: "italic",
                color: "var(--gray-9)",
                marginBottom: 6,
                paddingLeft: 8,
                borderLeft: "2px solid var(--gray-5)",
                lineHeight: 1.45,
              }}
            >
              &ldquo;{truncate(data.sourceQuote as string, 120)}&rdquo;
            </div>
          )}
          <div style={{ marginBottom: 4, color: "var(--gray-11)" }}>
            <span style={{ fontWeight: 600, color: "var(--gray-12)" }}>
              {data.questionCount as number}
            </span>{" "}
            interview question{(data.questionCount as number) !== 1 ? "s" : ""}
          </div>
          <div style={{ marginBottom: 6, color: "var(--gray-11)", fontSize: 10.5 }}>
            {completed}/{total} topics completed
          </div>
          <div style={{ height: 4, borderRadius: 2, background: "var(--gray-4)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                background: progressBarColor,
                borderRadius: 2,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </>
      )}

      {type === "topic" && (
        <>
          <div style={{ fontWeight: 600, marginBottom: 5, color: "var(--gray-12)", fontSize: 12 }}>
            {data.label as string}
          </div>
          {data.hasDeepDive ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--green-9)", fontWeight: 500 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: "var(--green-9)",
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                ✓
              </span>
              Deep dive available — click to view
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--violet-9)", fontWeight: 500 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  border: "1.5px solid var(--violet-9)",
                  color: "var(--violet-9)",
                  fontSize: 12,
                  fontWeight: 600,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                +
              </span>
              Click to generate deep dive
            </div>
          )}
        </>
      )}

      {type === "center" && (
        <blockquote
          style={{
            margin: 0,
            padding: "4px 0 4px 10px",
            borderLeft: "2px solid var(--accent-9)",
            color: "var(--gray-11)",
            fontStyle: "italic",
            lineHeight: 1.5,
          }}
        >
          {truncate(data.summary as string, 200)}
        </blockquote>
      )}
    </div>
  );
}
