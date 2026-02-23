#!/usr/bin/env python3
"""
upload-bmad-prompts.py — Upload BMAD agent system prompts to Langfuse as versioned prompts.

Reads agent markdown files from _bmad/bmm/agents/ and _bmad/core/agents/,
extracts their content, and uploads to Langfuse for version control.

Usage:
    python3 scripts/upload-bmad-prompts.py [--label production] [--dry-run]
"""

import argparse
import hashlib
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

try:
    from langfuse import Langfuse
except ImportError:
    print("Error: langfuse package not installed. Run: pip install langfuse", file=sys.stderr)
    sys.exit(1)

# Project root — resolve relative to this script's location
PROJECT_ROOT = Path(__file__).resolve().parent.parent

AGENT_DIRS = [
    PROJECT_ROOT / "_bmad" / "bmm" / "agents",
    PROJECT_ROOT / "_bmad" / "core" / "agents",
]


def get_langfuse_client() -> Langfuse:
    public_key = os.environ.get("LANGFUSE_PUBLIC_KEY")
    secret_key = os.environ.get("LANGFUSE_SECRET_KEY")
    host = os.environ.get("LANGFUSE_BASE_URL", "https://cloud.langfuse.com")
    if not public_key or not secret_key:
        print("Error: LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY must be set", file=sys.stderr)
        sys.exit(1)
    return Langfuse(public_key=public_key, secret_key=secret_key, host=host)


def parse_frontmatter(content: str) -> Tuple[Dict[str, str], str]:
    """Extract YAML frontmatter and body from a markdown file."""
    metadata = {}
    body = content
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)", content, re.DOTALL)
    if match:
        fm_text = match.group(1)
        body = match.group(2)
        for line in fm_text.splitlines():
            if ":" in line:
                key, _, val = line.partition(":")
                metadata[key.strip()] = val.strip().strip('"').strip("'")
    return metadata, body


def discover_agents() -> List[Dict]:
    """Find all BMAD agent markdown files."""
    agents = []
    for agent_dir in AGENT_DIRS:
        if not agent_dir.exists():
            continue
        for md_file in sorted(agent_dir.glob("*.md")):
            content = md_file.read_text(encoding="utf-8", errors="replace")
            metadata, body = parse_frontmatter(content)
            name = metadata.get("name", md_file.stem)
            agents.append({
                "name": name,
                "description": metadata.get("description", ""),
                "file": str(md_file),
                "content": content,
                "body": body,
                "content_hash": hashlib.sha256(content.encode()).hexdigest()[:16],
            })
    return agents


def get_current_prompt_hash(lf: Langfuse, prompt_name: str) -> Optional[str]:
    """Get the hash of the current Langfuse prompt version to skip no-ops."""
    try:
        prompt = lf.get_prompt(prompt_name)
        # Check if the config metadata contains our content hash
        config = prompt.config or {}
        return config.get("content_hash")
    except Exception:
        return None


def upload_prompt(lf: Langfuse, agent: Dict, label: str, dry_run: bool) -> bool:
    """Upload an agent's prompt to Langfuse. Returns True if uploaded."""
    prompt_name = f"bmad-agent-{agent['name']}"

    # Check if content matches current version
    current_hash = get_current_prompt_hash(lf, prompt_name)
    if current_hash == agent["content_hash"]:
        print(f"  SKIP {prompt_name} (content unchanged)")
        return False

    if dry_run:
        print(f"  DRY-RUN {prompt_name} ({agent['description']}) - would upload")
        return False

    try:
        lf.create_prompt(
            name=prompt_name,
            prompt=agent["content"],
            labels=[label],
            config={
                "content_hash": agent["content_hash"],
                "source_file": agent["file"],
                "agent_description": agent["description"],
            },
            type="text",
        )
        print(f"  UPLOADED {prompt_name} ({agent['description']})")
        return True
    except Exception as e:
        print(f"  ERROR {prompt_name}: {e}", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(description="Upload BMAD agent prompts to Langfuse")
    parser.add_argument("--label", type=str, default="production", help="Label for the prompt version (default: production)")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be uploaded without uploading")
    args = parser.parse_args()

    agents = discover_agents()
    if not agents:
        print("No BMAD agent files found")
        return

    print(f"Found {len(agents)} BMAD agents:")
    for a in agents:
        print(f"  - {a['name']}: {a['description']} ({a['file']})")
    print()

    if args.dry_run:
        print("DRY RUN mode — no changes will be made\n")

    lf = get_langfuse_client()
    uploaded = 0
    for agent in agents:
        if upload_prompt(lf, agent, args.label, args.dry_run):
            uploaded += 1

    lf.flush()
    print(f"\nDone. Uploaded {uploaded}/{len(agents)} prompts (label: {args.label})")


if __name__ == "__main__":
    main()
