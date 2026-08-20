#!/usr/bin/env python3
"""
build-indexes.py — render static catalog cards into the index pages.

Writes static project cards into projects/index.html (#projectsPageList)
and static article cards into articles/index.html (#articlesPageList)
between STATIC-CARDS markers. JavaScript may later enhance or refresh
the lists, but the core proof no longer depends on a fetch succeeding.

The generated markup mirrors the JS renderers exactly so enhancement
is seamless. Idempotent: a second run changes nothing.
"""

import html
import json
import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

BEGIN = "<!-- STATIC-CARDS:BEGIN -->"
END = "<!-- STATIC-CARDS:END -->"

LEGEND_BEGIN = "<!-- STATUS-LEGEND:BEGIN -->"
LEGEND_END = "<!-- STATUS-LEGEND:END -->"

# Bounded maturity taxonomy for project cards. Keep in sync with the
# status-taxonomy gate in scripts/validate-site.py.
STATUS_LEGEND = [
    ("Live workshop", "running, playable"),
    ("Public release", "versioned, installable"),
    ("MVP", "working core, narrow scope"),
    ("In active development", "design in motion, expect gaps"),
]


def status_legend():
    items = "".join(
        f'<span class="status-legend__item"><strong>{esc(label)}</strong>'
        f' &mdash; {esc(definition)}</span>'
        for label, definition in STATUS_LEGEND
    )
    return (
        f'<div class="status-legend" aria-label="Project status legend">'
        f'{items}</div>'
    )


def esc(s):
    return html.escape(str(s), quote=True)


def format_date(date_str):
    d = datetime.strptime(date_str, "%Y-%m-%d")
    return f"{d.strftime('%b')} {d.day}, {d.year}"


def project_card(p):
    classes = "article-card project-card"
    if p.get("highlighted"):
        classes += " project-card--featured"
    tags = "".join(
        f'<span class="article-card__tag project-card__tag">{esc(t)}</span>'
        for t in p.get("tags", [])
    )
    content = (
        f'<div class="article-card__meta project-card__meta">'
        f'<span class="article-card__date project-card__status">{esc(p["status"])}</span>'
        f'<span class="article-card__dot"></span>'
        f'<span class="article-card__reading-time project-card__stack">{esc(" / ".join(p["stack"][:3]))}</span>'
        f'</div>'
        f'<div class="article-card__title project-card__title">{esc(p["title"])}</div>'
        f'<div class="article-card__excerpt project-card__summary">{esc(p["summary"])}</div>'
        f'<div class="article-card__excerpt project-card__outcome"><strong>Outcome:</strong> {esc(p["outcome"])}</div>'
        f'<div class="article-card__tags project-card__tags">{tags}</div>'
    )
    # "Explore the live workshop" names ScaleShop's live deployment, so it is
    # keyed off the slug, not the highlighted flag.
    action_label = ("Explore the live workshop" if p["slug"] == "scalability-lab"
                    else "Inspect the system")
    content += f'<span class="project-card__action">{action_label} &rarr;</span>'
    if p.get("image"):
        content = (
            f'<div class="project-card__visual"><img class="project-card__image" '
            f'src="{esc(p["image"])}" alt="" width="1200" height="630" loading="lazy"></div>'
            f'<div class="project-card__content">{content}</div>'
        )
    elif p.get("highlighted"):
        # Featured cards render as a two-column grid (visual + content) on
        # wide screens; without an image the content column must span both
        # tracks so the card does not collapse into its first grid cell.
        content = (
            f'<div class="project-card__content" style="grid-column: 1 / -1">'
            f'{content}</div>'
        )
    return f'        <a class="{classes}" href="/projects/{esc(p["slug"])}.html">{content}</a>'


def article_card(a, featured=False):
    tags = "".join(
        f'<span class="article-card__tag">{esc(t)}</span>' for t in a.get("tags", [])
    )
    classes = "article-card article-card--featured" if featured else "article-card"
    return (
        f'        <a class="{classes}" href="/articles/{esc(a["slug"])}.html">'
        f'<div class="article-card__meta">'
        f'<span class="article-card__date">{esc(format_date(a["date"]))}</span>'
        f'<span class="article-card__dot"></span>'
        f'<span class="article-card__reading-time">{esc(a["readingTime"])}</span>'
        f'</div>'
        f'<div class="article-card__title">{esc(a["title"])}</div>'
        f'<div class="article-card__excerpt">{esc(a["excerpt"])}</div>'
        f'<div class="article-card__tags">{tags}</div>'
        f'</a>'
    )


def inject(page: Path, container_id: str, cards: list[str]) -> bool:
    text = page.read_text(encoding="utf-8")
    inner = "\n".join(cards)

    if BEGIN in text and END in text:
        # Idempotent refresh: replace only the marked region.
        pattern = re.compile(re.escape(BEGIN) + r".*?" + re.escape(END), re.S)
        new_text = pattern.sub(f"{BEGIN}\n{inner}\n        {END}", text, count=1)
    else:
        # First run: replace the loading placeholder inside the container.
        # The placeholder contains no nested <div>, so the first closing
        # </div> belongs to the container itself.
        pattern = re.compile(
            rf'(<div[^>]*id="{container_id}"[^>]*>).*?(</div>)', re.S)
        m = pattern.search(text)
        if not m:
            raise RuntimeError(f"{page}: container #{container_id} not found")
        new_text = (text[:m.start(1)] + m.group(1)
                    + f"\n        {BEGIN}\n{inner}\n        {END}\n      "
                    + text[m.start(2):])

    if new_text != text:
        page.write_text(new_text, encoding="utf-8")
        return True
    return False


def inject_legend(page: Path) -> bool:
    """Keep the status legend between its markers, or insert it once."""
    text = page.read_text(encoding="utf-8")
    if LEGEND_BEGIN in text and LEGEND_END in text:
        pattern = re.compile(
            re.escape(LEGEND_BEGIN) + r".*?" + re.escape(LEGEND_END), re.S)
        new_text = pattern.sub(
            f"{LEGEND_BEGIN}\n      {status_legend()}\n      {LEGEND_END}",
            text, count=1)
    else:
        # First run: place the legend directly under the page header.
        pattern = re.compile(
            r'(<div class="projects-page__header">.*?</div>\n)', re.S)
        m = pattern.search(text)
        if not m:
            raise RuntimeError(f"{page}: projects-page__header not found")
        new_text = (text[:m.start(1)] + m.group(1)
                    + f"      {LEGEND_BEGIN}\n      {status_legend()}\n"
                    + f"      {LEGEND_END}\n" + text[m.end(1):])
    if new_text != text:
        page.write_text(new_text, encoding="utf-8")
        return True
    return False


def main():
    projects = json.loads((ROOT / "projects/projects.json").read_text())
    articles = json.loads((ROOT / "articles/articles.json").read_text())
    articles.sort(key=lambda a: a["date"], reverse=True)

    changed = []
    if inject_legend(ROOT / "projects/index.html"):
        changed.append("projects/index.html (status legend)")
    if inject(ROOT / "projects/index.html", "projectsPageList",
              [project_card(p) for p in projects]):
        changed.append("projects/index.html")
    if inject(ROOT / "articles/index.html", "articlesPageList",
              # Newest article leads the index as the featured note.
              [article_card(a, featured=(i == 0))
               for i, a in enumerate(articles)]):
        changed.append("articles/index.html")

    print(f"{len(changed)} files changed")
    for c in changed:
        print(f"  {c}")


if __name__ == "__main__":
    main()
