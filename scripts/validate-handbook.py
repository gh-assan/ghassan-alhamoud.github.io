#!/usr/bin/env python3
"""Validate the generated handbook HTML."""

import json
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).parent.parent
HANDBOOK_DIR = ROOT / "handbook"
HANDBOOK_JSON = HANDBOOK_DIR / "handbook.json"
SITEMAP = ROOT / "sitemap.xml"
LLMS_TXT = ROOT / "llms.txt"


def is_internal(url: str) -> bool:
    parsed = urlparse(url)
    return not parsed.netloc or parsed.netloc == "ghassan-alhamoud.com"


def local_path(url: str) -> Path:
    parsed = urlparse(url)
    path = parsed.path
    if path.startswith("/"):
        path = path[1:]
    return ROOT / path


def validate_file(path: Path) -> list[str]:
    errors = []
    html = path.read_text(encoding="utf-8")

    # Basic HTML checks
    if html.count("<html") != 1:
        errors.append("multiple or missing <html> tags")
    if html.count("</html>") != 1:
        errors.append("multiple or missing </html> tags")
    if html.count("<body") != 1:
        errors.append("multiple or missing <body> tags")
    if html.count("</body>") != 1:
        errors.append("multiple or missing </body> tags")

    # Check title
    title_match = re.search(r"<title>(.*?)</title>", html)
    if not title_match or len(title_match.group(1)) > 80:
        errors.append("missing or overly long title")

    # Check meta description
    desc_match = re.search(r'<meta name="description" content="([^"]*)"', html)
    if not desc_match or len(desc_match.group(1)) > 170:
        errors.append("missing or overly long meta description")

    # Check canonical
    if 'rel="canonical"' not in html:
        errors.append("missing canonical link")

    # Check H1
    h1s = re.findall(r"<h1[^>]*>.*?</h1>", html, re.DOTALL)
    if len(h1s) != 1:
        errors.append(f"expected exactly 1 h1, found {len(h1s)}")

    # Validate JSON-LD
    for script in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL):
        try:
            json.loads(script.strip())
        except json.JSONDecodeError as e:
            errors.append(f"invalid JSON-LD: {e}")

    # Check internal links
    for href in re.findall(r'href="([^"]+)"', html):
        if not is_internal(href):
            continue
        if href.startswith("/#") or href == "/" or href.startswith("mailto:"):
            continue
        target = path if not urlparse(href).path else local_path(href)
        if not target.exists():
            errors.append(f"broken internal link: {href}")
            continue

        fragment = urlparse(href).fragment
        if fragment and target.is_file():
            target_html = html if target == path else target.read_text(encoding="utf-8")
            if not re.search(rf'\bid="{re.escape(fragment)}"', target_html):
                errors.append(f"broken internal fragment: {href}")

    # Check internal images
    for src in re.findall(r'src="([^"]+)"', html):
        if not is_internal(src):
            continue
        target = local_path(src)
        if not target.exists():
            errors.append(f"broken image: {src}")

    return errors


def validate_catalog() -> list[str]:
    """Validate metadata and discovery surfaces for every published chapter."""
    errors = []

    try:
        data = json.loads(HANDBOOK_JSON.read_text(encoding="utf-8"))["handbook"]
    except (OSError, KeyError, json.JSONDecodeError) as error:
        return [f"cannot load handbook.json: {error}"]

    chapters = data.get("chapters", [])
    ids = [chapter.get("id") for chapter in chapters]
    slugs = [chapter.get("slug") for chapter in chapters]

    if len(ids) != len(set(ids)):
        errors.append("chapter ids must be unique")
    if len(slugs) != len(set(slugs)):
        errors.append("chapter slugs must be unique")

    by_slug = {chapter.get("slug"): chapter for chapter in chapters}
    sitemap = SITEMAP.read_text(encoding="utf-8") if SITEMAP.exists() else ""
    llms_txt = LLMS_TXT.read_text(encoding="utf-8") if LLMS_TXT.exists() else ""

    for chapter in chapters:
        if chapter.get("status") != "published":
            continue

        chapter_id = chapter.get("id")
        slug = chapter.get("slug")
        if not isinstance(chapter_id, int) or not isinstance(slug, str) or not slug:
            errors.append(f"published chapter has invalid id or slug: {chapter!r}")
            continue

        label = f"chapter {chapter_id} ({slug})"

        source_name = chapter.get("file")
        if not isinstance(source_name, str) or not source_name:
            errors.append(f"{label}: markdown source is not set")
        else:
            source = HANDBOOK_DIR / "md" / source_name
            if not source.is_file():
                errors.append(f"{label}: missing markdown source {source.relative_to(ROOT)}")

        output_name = f"chapter-{chapter_id:02d}-{slug}.html"
        output = HANDBOOK_DIR / output_name
        if not output.is_file():
            errors.append(f"{label}: missing generated page handbook/{output_name}")

        og_image = chapter.get("ogImage", "")
        if not og_image or not local_path(og_image).is_file():
            errors.append(f"{label}: missing OG image {og_image or '(not set)'}")

        canonical = f"https://ghassan-alhamoud.com/handbook/{output_name}"
        if canonical not in sitemap:
            errors.append(f"{label}: missing sitemap entry")
        if canonical not in llms_txt:
            errors.append(f"{label}: missing llms.txt entry")

        for prerequisite in chapter.get("prerequisites", []):
            target = by_slug.get(prerequisite)
            if not target:
                errors.append(f"{label}: unknown prerequisite {prerequisite}")
            elif target.get("status") != "published":
                errors.append(f"{label}: prerequisite {prerequisite} is not published")

        for related in chapter.get("relatedPatterns", []):
            if related not in by_slug:
                errors.append(f"{label}: unknown related pattern {related}")

    return errors


def main():
    files = sorted(HANDBOOK_DIR.glob("chapter-*.html")) + [HANDBOOK_DIR / "index.html"]

    all_ok = True
    for path in files:
        errors = validate_file(path)
        if errors:
            all_ok = False
            print(f"✗ {path.name}")
            for e in errors:
                print(f"    - {e}")
        else:
            print(f"✓ {path.name}")

    catalog_errors = validate_catalog()
    if catalog_errors:
        all_ok = False
        print("✗ handbook catalog")
        for error in catalog_errors:
            print(f"    - {error}")
    else:
        print("✓ handbook catalog")

    if all_ok:
        print("\nAll handbook pages validated successfully.")
    else:
        print("\nValidation completed with errors.")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
