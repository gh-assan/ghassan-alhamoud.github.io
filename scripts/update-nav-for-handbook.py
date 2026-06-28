#!/usr/bin/env python3
"""Add the Handbook link to the main navigation of all HTML pages."""

import re
from pathlib import Path

ROOT = Path(__file__).parent.parent

# Match the Articles nav item and insert Handbook after it.
PATTERN = re.compile(
    r'(<li><a href="/articles/" class="nav__link)([^"]*)(">Articles</a></li>)'
)


def update_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    new_text, count = PATTERN.subn(
        r'\1\2\3\n        <li><a href="/handbook/" class="nav__link">Handbook</a></li>',
        text,
    )
    if count:
        path.write_text(new_text, encoding="utf-8")
        return True
    return False


def main():
    updated = 0
    for path in ROOT.rglob("*.html"):
        # Skip handbook files (already have Handbook in nav)
        if "handbook" in path.parts:
            continue
        if update_file(path):
            print(f"  ✓ {path.relative_to(ROOT)}")
            updated += 1
    print(f"Updated {updated} files.")


if __name__ == "__main__":
    main()
