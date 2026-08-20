#!/usr/bin/env python3
"""
clean-booking-surfaces.py — one-time, idempotent removal of the booking
and consulting-CTA surface from every published page.

Removes:
- Cal.com preconnect links
- cal-widget.js script tags
- footer "Book a Call" links (data-cal-link)
- article-level consulting CTA blocks that point at /#contact
  (resource/repository CTAs are kept)
- the "PORTFOLIO MODE" CSS block that hid these surfaces instead of
  removing them

Running the script twice must produce zero second-run changes.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

REMOVALS = [
    # (compiled regex, description)
    (re.compile(r'^[ \t]*<link rel="preconnect" href="https://app\.cal\.eu"[^>]*/>\n', re.M),
     "cal.eu preconnect"),
    (re.compile(r'^[ \t]*<script src="/assets/js/cal-widget\.js[^"]*" defer></script>\n', re.M),
     "cal-widget script tag"),
    (re.compile(r'^[ \t]*<a href="https://calendly\.com/[^>]*data-cal-link[^>]*>[^<]*</a>\n', re.M),
     "footer booking link"),
    (re.compile(r'^[ \t]*<div class="article-cta">(?:(?!</div>).)*?href="/#contact"(?:(?!</div>).)*?</div>\n', re.S | re.M),
     "consulting article CTA"),
]

CSS_BLOCK = re.compile(
    r'/\* =+\n   PORTFOLIO MODE.*?\n   =+ \*/\n\n'
    r'\.nav__link--cta\[href\$="#contact"\],.*?display: none !important;\n\}\n',
    re.S,
)


def clean_html(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    original = text
    for pattern, _ in REMOVALS:
        text = pattern.sub("", text)
    if text != original:
        path.write_text(text, encoding="utf-8")
    return text != original


def main():
    changed = []

    for pattern in ("*.html",):
        for f in sorted(ROOT.rglob(pattern)):
            if "docs" in f.parts:
                continue
            if clean_html(f):
                changed.append(str(f.relative_to(ROOT)))

    css = ROOT / "assets/css/main.css"
    text = css.read_text(encoding="utf-8")
    new = CSS_BLOCK.sub("", text)
    if new != text:
        css.write_text(new, encoding="utf-8")
        changed.append("assets/css/main.css")

    cal = ROOT / "assets/js/cal-widget.js"
    if cal.exists():
        cal.unlink()
        changed.append("assets/js/cal-widget.js (deleted)")

    print(f"{len(changed)} files changed")
    for c in changed:
        print(f"  {c}")


if __name__ == "__main__":
    main()
