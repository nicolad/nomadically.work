import { Panel } from "@xyflow/react";
import type { AiInterviewPrepRequirement } from "@/__generated__/hooks";

function getMiniBarColor(percent: number): string {
  if (percent === 100) return "var(--green-9)";
  if (percent > 0) return "var(--amber-9)";
  return "var(--gray-5)";
}

function MiniStatRow({
  label,
  value,
  total,
  percent,
}: {
  label: string;
  value: number | string;
  total?: number;
  percent: number;
}) {
  const barColor = getMiniBarColor(percent);

  return (
    <div style={{ marginTop: 7 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "var(--gray-11)",
          fontSize: 11,
          marginBottom: 3,
        }}
      >
        <span>{label}</span>
        <span
          style={{
            fontWeight: 600,
            color: "var(--gray-12)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {total !== undefined ? `${value}/${total}` : `${value}%`}
        </span>
      </div>
      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: "var(--gray-4)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 2,
            width: `${percent}%`,
            background: barColor,
            transition: "width 0.4s ease, background 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

export function ProgressPanel({ requirements }: { requirements: AiInterviewPrepRequirement[] }) {
  const total = requirements.length;
  const withDeepDive = requirements.filter((r) => r.deepDive).length;
  const totalTopics = requirements.reduce((sum, r) => sum + r.studyTopics.length, 0);
  const completedTopics = requirements.reduce(
    (sum, r) => sum + (r.studyTopicDeepDives?.filter((d) => d.deepDive).length ?? 0),
    0,
  );
  const overallPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  const reqPercent = total > 0 ? Math.round((withDeepDive / total) * 100) : 0;
  const topicsPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  const isReady = overallPercent === 100;

  return (
    <Panel position="top-left">
      <div
        style={{
          background: "var(--gray-2)",
          border: `1px solid ${isReady ? "var(--green-9)" : "var(--gray-6)"}`,
          borderRadius: 10,
          minWidth: 180,
          fontSize: 12,
          boxShadow: isReady
            ? "0 2px 12px rgba(0,0,0,0.12), 0 0 0 1px var(--green-9)"
            : "0 2px 12px rgba(0,0,0,0.12)",
          overflow: "hidden",
          transition: "border-color 0.3s ease, box-shadow 0.3s ease",
        }}
      >
        {/* Branded top accent bar */}
        <div
          style={{
            height: 3,
            background: isReady ? "var(--green-9)" : "var(--accent-9)",
            transition: "background 0.3s ease",
          }}
        />

        <div style={{ padding: "10px 14px 12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 2,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 700,
                fontSize: 13,
                color: "var(--gray-12)",
              }}
            >
              <svg width={14} height={14} viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
                <circle cx={7} cy={7} r={6} stroke={isReady ? "var(--green-9)" : "var(--accent-9)"} strokeWidth={1.5} />
                <circle cx={7} cy={7} r={3.5} stroke={isReady ? "var(--green-9)" : "var(--accent-9)"} strokeWidth={1.25} />
                <circle cx={7} cy={7} r={1.5} fill={isReady ? "var(--green-9)" : "var(--accent-9)"} />
              </svg>
              Interview Prep
            </div>

            {isReady && (
              <span
                style={{
                  background: "var(--green-9)",
                  color: "white",
                  fontSize: 10,
                  fontWeight: 700,
                  borderRadius: 20,
                  padding: "2px 7px",
                  letterSpacing: "0.02em",
                  lineHeight: 1.5,
                  flexShrink: 0,
                  marginLeft: 6,
                }}
              >
                Ready!
              </span>
            )}
          </div>

          <MiniStatRow label="Requirements" value={withDeepDive} total={total} percent={reqPercent} />
          <MiniStatRow label="Topics" value={completedTopics} total={totalTopics} percent={topicsPercent} />
          <MiniStatRow label="Overall" value={overallPercent} percent={overallPercent} />
        </div>
      </div>
    </Panel>
  );
}
