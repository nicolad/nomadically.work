#!/usr/bin/env python3
"""
build-golden-datasets.py — Query Langfuse for BMAD traces and build golden datasets.

Collects best/worst scored BMAD outputs into Langfuse datasets for regression testing.

Usage:
    python3 scripts/build-golden-datasets.py [--min-score 0.8] [--max-items 50] [--workflow bmad:create-prd]
"""

import argparse
import json
import os
import sys
from typing import Dict, List, Optional

try:
    from langfuse import Langfuse
except ImportError:
    print("Error: langfuse package not installed. Run: pip install langfuse", file=sys.stderr)
    sys.exit(1)

# Workflow tag -> dataset name
DATASET_MAP = {
    "bmad:create-prd": "bmad-prd-golden-set",
    "bmad:create-product-brief": "bmad-prd-golden-set",
    "bmad:create-architecture": "bmad-arch-golden-set",
    "bmad:code-review": "bmad-review-golden-set",
}


def get_langfuse_client() -> Langfuse:
    public_key = os.environ.get("LANGFUSE_PUBLIC_KEY")
    secret_key = os.environ.get("LANGFUSE_SECRET_KEY")
    host = os.environ.get("LANGFUSE_BASE_URL", "https://cloud.langfuse.com")
    if not public_key or not secret_key:
        print("Error: LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY must be set", file=sys.stderr)
        sys.exit(1)
    return Langfuse(public_key=public_key, secret_key=secret_key, host=host)


def fetch_bmad_traces(lf: Langfuse, workflow_tag: str, limit: int = 200) -> List[Dict]:
    """Fetch traces tagged with a specific BMAD workflow."""
    traces = []
    page = 1
    while len(traces) < limit:
        result = lf.fetch_traces(tags=[workflow_tag], limit=min(50, limit - len(traces)), page=page)
        if not result.data:
            break
        for trace in result.data:
            traces.append({
                "id": trace.id,
                "name": trace.name,
                "input": trace.input,
                "output": trace.output,
                "metadata": trace.metadata,
                "tags": trace.tags,
                "session_id": trace.session_id,
            })
        page += 1
    return traces


def get_trace_scores(lf: Langfuse, trace_id: str) -> Dict[str, float]:
    """Fetch all scores for a trace."""
    try:
        result = lf.fetch_scores(trace_id=trace_id)
        scores = {}
        for score in result.data:
            if score.value is not None:
                scores[score.name] = score.value
        return scores
    except Exception:
        return {}


def avg_score(scores: Dict[str, float], prefix: str = "") -> float:
    """Average score across dimensions, optionally filtered by prefix."""
    vals = [v for k, v in scores.items() if k.startswith(prefix) and isinstance(v, (int, float))]
    return sum(vals) / len(vals) if vals else 0.0


def build_dataset(lf: Langfuse, workflow_tag: str, min_score: float, max_items: int) -> None:
    dataset_name = DATASET_MAP.get(workflow_tag)
    if not dataset_name:
        print(f"No dataset mapping for workflow tag: {workflow_tag}", file=sys.stderr)
        return

    print(f"Fetching traces for {workflow_tag}...")
    traces = fetch_bmad_traces(lf, workflow_tag)
    if not traces:
        print(f"No traces found for {workflow_tag}")
        return

    print(f"Found {len(traces)} traces. Fetching scores...")

    # Score each trace and sort
    scored_traces = []
    for trace in traces:
        scores = get_trace_scores(lf, trace["id"])
        if not scores:
            continue
        # Use BMAD-specific scores if available, otherwise generic
        prefix = workflow_tag.replace("bmad:", "bmad-")
        score_avg = avg_score(scores, prefix) or avg_score(scores)
        scored_traces.append({
            "trace": trace,
            "scores": scores,
            "avg_score": score_avg,
        })

    scored_traces.sort(key=lambda x: x["avg_score"], reverse=True)

    # Filter by min score
    golden = [t for t in scored_traces if t["avg_score"] >= min_score][:max_items]

    if not golden:
        print(f"No traces meet min_score threshold of {min_score}")
        return

    print(f"Creating/updating dataset '{dataset_name}' with {len(golden)} items...")

    # Create dataset if it doesn't exist
    try:
        lf.create_dataset(name=dataset_name, description=f"Golden dataset for {workflow_tag}")
    except Exception:
        pass  # Dataset may already exist

    # Fetch existing items to avoid duplicates
    existing_trace_ids = set()
    try:
        dataset = lf.get_dataset(name=dataset_name)
        for item in dataset.items:
            meta = item.metadata or {}
            if "trace_id" in meta:
                existing_trace_ids.add(meta["trace_id"])
    except Exception:
        pass

    added = 0
    for entry in golden:
        trace = entry["trace"]
        if trace["id"] in existing_trace_ids:
            continue

        lf.create_dataset_item(
            dataset_name=dataset_name,
            input=trace.get("input", ""),
            expected_output=trace.get("output", ""),
            metadata={
                "trace_id": trace["id"],
                "session_id": trace.get("session_id"),
                "scores": entry["scores"],
                "avg_score": entry["avg_score"],
                "workflow_tag": workflow_tag,
            },
        )
        added += 1

    lf.flush()
    print(f"Added {added} new items to '{dataset_name}' (skipped {len(golden) - added} duplicates)")


def main():
    parser = argparse.ArgumentParser(description="Build golden datasets from BMAD traces in Langfuse")
    parser.add_argument("--min-score", type=float, default=0.8, help="Minimum average score (default: 0.8)")
    parser.add_argument("--max-items", type=int, default=50, help="Max items per dataset (default: 50)")
    parser.add_argument("--workflow", type=str, default=None,
                        help="Specific workflow tag (e.g., bmad:create-prd). Default: all mapped workflows")
    args = parser.parse_args()

    lf = get_langfuse_client()

    workflows = [args.workflow] if args.workflow else list(DATASET_MAP.keys())
    for wf in workflows:
        build_dataset(lf, wf, args.min_score, args.max_items)

    print("Done.")


if __name__ == "__main__":
    main()
