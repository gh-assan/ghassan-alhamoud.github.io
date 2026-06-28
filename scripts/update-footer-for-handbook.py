#!/usr/bin/env python3
"""Add the Handbook link to the footer Explore column of all HTML pages."""

import re
from pathlib import Path

ROOT = Path(__file__).parent.parent

# Match Articles footer link and insert Handbook after it.
PATTERN = re.compile(
    r'(<a href="/articles/" class="footer__nav-link">Articles</a>)'
)


def update_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    new_text, count = PATTERN.subn(
        r'\1\n          <a href="/handbook/" class="footer__nav-link">Handbook</a>',
        text,
    )
    if count:
        path.write_text(new_text, encoding="utf-8")
        return True
    return False


def main():
    updated = 0
    for path in ROOT.rglob("*.html"):
        if "handbook" in path.parts:
            continue
        if update_file(path):
            print(f"  ✓ {path.relative_to(ROOT)}")
            updated += 1
    print(f"Updated {updated} files.")


if __name__ == "__main__":
    main()
