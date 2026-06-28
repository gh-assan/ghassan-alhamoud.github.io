#!/usr/bin/env python3
"""Validate the generated handbook HTML."""

import json
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).parent.parent
HANDBOOK_DIR = ROOT / "handbook"


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
        target = local_path(href)
        if not target.exists():
            errors.append(f"broken internal link: {href}")

    # Check internal images
    for src in re.findall(r'src="([^"]+)"', html):
        if not is_internal(src):
            continue
        target = local_path(src)
        if not target.exists():
            errors.append(f"broken image: {src}")

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

    if all_ok:
        print("\nAll handbook pages validated successfully.")
    else:
        print("\nValidation completed with errors.")


if __name__ == "__main__":
    main()
