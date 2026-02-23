#!/usr/bin/env python3
"""
analyze-traces.py — Analyze Langfuse traces and produce reports.

Fetches Claude Code session traces from Langfuse and generates reports on
tool usage, session patterns, BMAD workflow stats, score trends, and failures.

Usage:
    python3 scripts/analyze-traces.py [--days 30] [--tag bmad:create-prd] [--json]
"""

import argparse
import json
import os
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

try:
    from langfuse import Langfuse
except ImportError:
    print("Error: langfuse package not installed. Run: pip install langfuse", file=sys.stderr)
    sys.exit(1)


def get_langfuse_client() -> Langfuse:
    public_key = os.environ.get("LANGFUSE_PUBLIC_KEY")
    secret_key = os.environ.get("LANGFUSE_SECRET_KEY")
    host = os.environ.get("LANGFUSE_BASE_URL", "https://cloud.langfuse.com")
    if not public_key or not secret_key:
        print("Error: LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY must be set", file=sys.stderr)
        sys.exit(1)
    return Langfuse(public_key=public_key, secret_key=secret_key, host=host)


def fetch_all_traces(lf: Langfuse, tags: Optional[List[str]], from_dt: datetime, limit: int = 500) -> List:
    """Fetch traces with pagination."""
    traces = []
    page = 1
    while len(traces) < limit:
        kwargs = {"limit": min(50, limit - len(traces)), "page": page}
        if tags:
            kwargs["tags"] = tags
        result = lf.fetch_traces(**kwargs)
        if not result.data:
            break
        for trace in result.data:
            # Filter by date client-side (Langfuse SDK may not support from_timestamp)
            created = trace.timestamp if hasattr(trace, "timestamp") else None
            if created and hasattr(created, "timestamp"):
                if created < from_dt:
                    continue
            traces.append(trace)
        page += 1
        if len(result.data) < 50:
            break
    return traces


def fetch_all_scores(lf: Langfuse, limit: int = 1000) -> List:
    """Fetch scores with pagination."""
    scores = []
    page = 1
    while len(scores) < limit:
        result = lf.fetch_scores(limit=min(100, limit - len(scores)), page=page)
        if not result.data:
            break
        scores.extend(result.data)
        page += 1
        if len(result.data) < 100:
            break
    return scores


# ── Analysis Functions ────────────────────────────────────────────────────────

def analyze_tool_usage(traces: List) -> Dict[str, int]:
    """Count tool usage across all traces from metadata."""
    tool_counts = Counter()
    for trace in traces:
        meta = trace.metadata or {}
        tool_count = meta.get("tool_count", 0)
        if tool_count:
            tool_counts["(total tools)"] += tool_count
        # Individual tool names come from observations, not easily available here
        # Count by trace-level info
        turn_count = meta.get("turn_count", 0)
        if turn_count:
            tool_counts["(total turns)"] += turn_count
    return dict(tool_counts.most_common(20))


def analyze_turn_distribution(traces: List) -> Dict[str, int]:
    """Histogram of turns per session."""
    buckets = Counter()
    for trace in traces:
        meta = trace.metadata or {}
        turns = meta.get("turn_count", 0)
        if turns <= 0:
            continue
        if turns <= 5:
            bucket = "1-5"
        elif turns <= 10:
            bucket = "6-10"
        elif turns <= 20:
            bucket = "11-20"
        elif turns <= 50:
            bucket = "21-50"
        else:
            bucket = "51+"
        buckets[bucket] += 1
    # Sort buckets in order
    order = ["1-5", "6-10", "11-20", "21-50", "51+"]
    return {k: buckets.get(k, 0) for k in order if buckets.get(k, 0) > 0}


def analyze_bmad_workflows(traces: List) -> Dict[str, int]:
    """Count BMAD workflow frequency."""
    wf_counts = Counter()
    for trace in traces:
        tags = trace.tags or []
        for tag in tags:
            if tag.startswith("bmad:"):
                wf_counts[tag] += 1
    return dict(wf_counts.most_common(20))


def analyze_score_trends(scores: List) -> Dict[str, Dict[str, float]]:
    """Average scores by dimension."""
    dim_values = defaultdict(list)
    for score in scores:
        if score.value is not None and score.name:
            dim_values[score.name].append(score.value)

    trends = {}
    for dim, vals in sorted(dim_values.items()):
        trends[dim] = {
            "avg": round(sum(vals) / len(vals), 3),
            "min": round(min(vals), 3),
            "max": round(max(vals), 3),
            "count": len(vals),
        }
    return trends


def analyze_low_score_patterns(scores: List, threshold: float = 0.65) -> Dict[str, int]:
    """Count failure types from low-scoring dimensions."""
    failure_counts = Counter()
    for score in scores:
        if score.value is not None and score.value < threshold:
            comment = score.comment or ""
            # Extract failure_type pattern from comment if available
            dim = score.name or "unknown"
            failure_counts[f"{dim} (low)"] += 1
    return dict(failure_counts.most_common(15))


# ── Output Formatting ────────────────────────────────────────────────────────

def print_table(title: str, data: Dict[str, Any], col1: str = "Key", col2: str = "Value") -> None:
    if not data:
        print(f"\n{title}\n  (no data)\n")
        return
    max_key = max(len(str(k)) for k in data.keys())
    max_key = max(max_key, len(col1))
    print(f"\n{title}")
    print(f"  {'─' * (max_key + 20)}")
    print(f"  {col1:<{max_key}}  {col2}")
    print(f"  {'─' * (max_key + 20)}")
    for k, v in data.items():
        if isinstance(v, dict):
            v_str = "  ".join(f"{sk}={sv}" for sk, sv in v.items())
        else:
            v_str = str(v)
        print(f"  {str(k):<{max_key}}  {v_str}")
    print()


def main():
    parser = argparse.ArgumentParser(description="Analyze Langfuse traces")
    parser.add_argument("--days", type=int, default=30, help="Number of days to look back (default: 30)")
    parser.add_argument("--tag", type=str, default=None, help="Filter by specific tag (e.g., bmad:create-prd)")
    parser.add_argument("--json", action="store_true", help="Output as JSON instead of tables")
    args = parser.parse_args()

    lf = get_langfuse_client()
    from_dt = datetime.now(timezone.utc) - timedelta(days=args.days)
    tags = ["claude-code"]
    if args.tag:
        tags.append(args.tag)

    print(f"Fetching traces from last {args.days} days (tags: {tags})...")
    traces = fetch_all_traces(lf, tags, from_dt)
    print(f"Found {len(traces)} traces")

    print("Fetching scores...")
    scores = fetch_all_scores(lf)
    print(f"Found {len(scores)} scores")

    # Run analyses
    tool_usage = analyze_tool_usage(traces)
    turn_dist = analyze_turn_distribution(traces)
    bmad_wf = analyze_bmad_workflows(traces)
    score_trends = analyze_score_trends(scores)
    low_patterns = analyze_low_score_patterns(scores)

    if args.json:
        output = {
            "period_days": args.days,
            "trace_count": len(traces),
            "score_count": len(scores),
            "tool_usage": tool_usage,
            "turn_distribution": turn_dist,
            "bmad_workflow_frequency": bmad_wf,
            "score_trends": score_trends,
            "low_score_patterns": low_patterns,
        }
        print(json.dumps(output, indent=2))
    else:
        print(f"\n{'=' * 60}")
        print(f"  TRACE ANALYSIS REPORT — Last {args.days} days")
        print(f"  Traces: {len(traces)}  |  Scores: {len(scores)}")
        print(f"{'=' * 60}")

        print_table("1. TOOL USAGE", tool_usage, "Metric", "Count")
        print_table("2. SESSION TURN DISTRIBUTION", turn_dist, "Turns", "Sessions")
        print_table("3. BMAD WORKFLOW FREQUENCY", bmad_wf, "Workflow", "Count")
        print_table("4. SCORE TRENDS", score_trends, "Dimension", "Stats")
        print_table("5. LOW-SCORE PATTERNS (<0.65)", low_patterns, "Pattern", "Count")


if __name__ == "__main__":
    main()
