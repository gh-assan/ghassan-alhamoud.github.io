#!/usr/bin/env python3
"""
apply-shell.py — canonical site shell propagation.

Applies the single navigation model and footer model from
docs/website-review-2026-08-19/02-review-matrix.md / 07-technical-sanity-check.md
to every nav-bearing HTML page.

Canonical nav:    Systems · Field Notes · Handbook · About
Canonical footer: Explore · Connect · Legal
Footer tagline:   canonical role string

The script is idempotent: a second run changes nothing. index.html is
already canonical and is skipped for the nav (its About link is the
same-page fragment #about instead of /#about).
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

ROLE = "Senior Software Engineer — AI Agent Enabler, Software Architecture"

# Page family -> nav item that carries the active state
ACTIVE = {
    "articles": "Field Notes",
    "projects": "Systems",
    "handbook": "Handbook",
}

NAV_ITEMS = [
    ("Systems", "/projects/"),
    ("Field Notes", "/articles/"),
    ("Handbook", "/handbook/"),
    ("About", None),  # href decided per page
]

FOOTER_COLS = """<nav class="footer__nav" aria-label="Footer navigation">
        <div class="footer__nav-col">
          <span class="footer__nav-heading">Explore</span>
          <a href="/projects/" class="footer__nav-link">Systems</a>
          <a href="/articles/" class="footer__nav-link">Field Notes</a>
          <a href="/handbook/" class="footer__nav-link">Handbook</a>
          <a href="/#about" class="footer__nav-link">About</a>
        </div>
        <div class="footer__nav-col">
          <span class="footer__nav-heading">Connect</span>
          <a href="mailto:galhamoud@gmx.de" class="footer__nav-link">Email</a>
          <a href="https://github.com/gh-assan" target="_blank" rel="noopener noreferrer" class="footer__nav-link">GitHub</a>
          <a href="https://linkedin.com/in/ghassanalhamoud" target="_blank" rel="noopener noreferrer" class="footer__nav-link">LinkedIn</a>
        </div>
        <div class="footer__nav-col">
          <span class="footer__nav-heading">Legal</span>
          <a href="/impressum.html" class="footer__nav-link">Impressum</a>
          <a href="/privacy.html" class="footer__nav-link">Privacy</a>
        </div>
      </nav>"""

TAGLINE_RE = re.compile(
    r'<p class="footer__tagline">[^<]*</p>')
NAV_RE = re.compile(r'<ul class="nav__menu"[^>]*>.*?</ul>', re.S)
FOOTER_NAV_RE = re.compile(r'<nav class="footer__nav"[^>]*>.*?</nav>', re.S)


def nav_block(path: Path) -> str:
    rel = path.relative_to(ROOT)
    family = rel.parts[0] if len(rel.parts) > 1 else ""
    active = ACTIVE.get(family)
    about_href = "#about" if rel.name == "index.html" and family == "" else "/#about"
    items = []
    for label, href in NAV_ITEMS:
        href = about_href if href is None else href
        cls = "nav__link" + (" nav__link--active" if label == active else "")
        items.append(f'        <li><a href="{href}" class="{cls}">{label}</a></li>')
    return ('<ul class="nav__menu" id="navMenu" aria-label="Main navigation">\n'
            + "\n".join(items) + "\n      </ul>")


def apply(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    original = text

    if 'class="nav__menu"' in text:
        text = NAV_RE.sub(lambda m: nav_block(path), text, count=1)
    if 'class="footer__nav"' in text:
        text = FOOTER_NAV_RE.sub(lambda m: FOOTER_COLS, text, count=1)
    if 'class="footer__tagline"' in text:
        text = TAGLINE_RE.sub(f'<p class="footer__tagline">{ROLE}</p>', text)

    if text != original:
        path.write_text(text, encoding="utf-8")
    return text != original


def main():
    changed = []
    for f in sorted(ROOT.rglob("*.html")):
        if "docs" in f.parts:
            continue
        if f.name == "index.html" and f.parent == ROOT:
            # Homepage nav About fragment differs; footer already canonical.
            text = f.read_text(encoding="utf-8")
            new = NAV_RE.sub(lambda m: nav_block(f), text, count=1)
            new = TAGLINE_RE.sub(f'<p class="footer__tagline">{ROLE}</p>', new)
            if new != text:
                f.write_text(new, encoding="utf-8")
                changed.append(str(f.relative_to(ROOT)))
            continue
        if apply(f):
            changed.append(str(f.relative_to(ROOT)))
    print(f"{len(changed)} files changed")
    for c in changed:
        print(f"  {c}")


if __name__ == "__main__":
    main()
