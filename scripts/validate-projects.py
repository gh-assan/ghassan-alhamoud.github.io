#!/usr/bin/env python3
"""Validate the project catalog and its public discovery surfaces."""

from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "projects" / "projects.json"
SITEMAP = ROOT / "sitemap.xml"
LLMS = ROOT / "llms.txt"
REQUIRED_FIELDS = {
    "slug",
    "title",
    "name",
    "status",
    "repo",
    "summary",
    "problem",
    "outcome",
    "stack",
    "tags",
}

# The two flagship systems curated as the evidence pair on projects/index.html
# (gate: flagship-pair in scripts/validate-site.py).
FLAGSHIP_SLUGS = {"scalability-lab", "tamoz"}


def main() -> int:
    errors: list[str] = []
    projects = json.loads(CATALOG.read_text(encoding="utf-8"))
    sitemap = SITEMAP.read_text(encoding="utf-8")
    llms = LLMS.read_text(encoding="utf-8")

    if not isinstance(projects, list) or not projects:
        errors.append("projects.json must contain a non-empty array")
        projects = []

    slugs: set[str] = set()

    for index, project in enumerate(projects):
        label = project.get("slug", f"item {index}")
        missing = REQUIRED_FIELDS - project.keys()
        if missing:
            errors.append(f"{label}: missing fields: {', '.join(sorted(missing))}")
            continue

        slug = project["slug"]
        if slug in slugs:
            errors.append(f"{slug}: duplicate slug")
        slugs.add(slug)

        page = ROOT / "projects" / f"{slug}.html"
        canonical = f"https://ghassan-alhamoud.com/projects/{slug}.html"
        if not page.exists():
            errors.append(f"{slug}: missing project page")
        if canonical not in sitemap:
            errors.append(f"{slug}: missing sitemap entry")
        if canonical not in llms:
            errors.append(f"{slug}: missing llms.txt entry")

        image = project.get("image")
        if image and image.startswith("/") and not (ROOT / image.removeprefix("/")).exists():
            errors.append(f"{slug}: missing image {image}")

        if not str(project["repo"]).startswith("https://github.com/"):
            errors.append(f"{slug}: repository must use an HTTPS GitHub URL")
        if not project["stack"] or not project["tags"]:
            errors.append(f"{slug}: stack and tags must not be empty")

    highlighted_slugs = {p.get("slug") for p in projects if p.get("highlighted")}
    if highlighted_slugs != FLAGSHIP_SLUGS:
        errors.append(
            "the flagship pair must be highlighted: "
            + ", ".join(sorted(FLAGSHIP_SLUGS))
            + f" (got {', '.join(sorted(highlighted_slugs)) or 'none'})"
        )

    if errors:
        print("Project validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"Project validation passed for {len(projects)} projects.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
