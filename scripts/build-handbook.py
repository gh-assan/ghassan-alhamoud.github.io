#!/usr/bin/env python3
"""
Build the AI-Native Engineering Handbook from markdown into static HTML.

Usage:
    python3 scripts/build-handbook.py

Reads handbook/handbook.json and handbook/md/*.md.
Outputs handbook/index.html and handbook/chapter-NN-slug.html.
"""

import json
import re
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, Tuple

import markdown
from markdown.extensions.toc import TocExtension

ROOT = Path(__file__).parent.parent
HANDBOOK_DIR = ROOT / "handbook"
MD_DIR = HANDBOOK_DIR / "md"
OUT_DIR = HANDBOOK_DIR
JSON_PATH = HANDBOOK_DIR / "handbook.json"

BASE_URL = "https://ghassan-alhamoud.com"

CTA_HTML = """<div class="article-cta">
  <p class="article-cta__text">Building agent systems? Let's talk about how I can help your team.</p>
  <a href="/#contact" class="btn btn--primary">Get in Touch</a>
</div>"""


def load_json():
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        return json.load(f)["handbook"]


def md_to_html(text: str) -> tuple[str, str]:
    """Convert markdown to HTML and return (html, toc_html)."""
    md = markdown.Markdown(
        extensions=[
            "tables",
            "fenced_code",
            TocExtension(title=""),
        ]
    )
    html = md.convert(text)
    return html, md.toc


def extract_first_paragraph(html: str) -> str:
    """Return the first <p> content for meta description fallback."""
    m = re.search(r"<p>(.*?)</p>", html, re.DOTALL)
    if not m:
        return ""
    text = re.sub(r"<[^>]+>", "", m.group(1))
    return text.strip()


def strip_html_tags(html: str) -> str:
    return re.sub(r"<[^>]+>", "", html)


def wrap_diagrams(html: str) -> str:
    """
    Wrap handbook diagram images + figure captions in a dark panel.
    Looks for <p><img src="/images/handbook/..." ... /></p>
    followed by <p><em>Figure ...</em></p>.
    """
    # Match diagram image + caption whether they are in the same <p> or separate.
    pattern = re.compile(
        r'<p>\s*<img alt="([^"]*)" src="(/images/handbook/[^"]+)"\s*/?>\s*'
        r'(?:</p>\s*<p>\s*)?'
        r'<em>(Figure \d+:.*?)</em>\s*</p>',
        re.DOTALL,
    )

    def repl(m):
        alt, src, caption = m.groups()
        return (
            f'<figure class="diagram-panel">'
            f'<img src="{src}" alt="{alt}" loading="lazy" />'
            f'<figcaption>{caption}</figcaption>'
            f'</figure>'
        )

    return pattern.sub(repl, html)


def build_schema(chapter: dict, full_html: str) -> str:
    """Generate JSON-LD TechArticle + LearningResource schema."""
    url = f"{BASE_URL}/handbook/chapter-{chapter['id']:02d}-{chapter['slug']}.html"
    image = f"{BASE_URL}{chapter['ogImage']}"
    desc = chapter.get("description") or extract_first_paragraph(full_html)
    if len(desc) > 160:
        desc = desc[:157] + "..."

    schema = {
        "@context": "https://schema.org",
        "@type": ["TechArticle", "LearningResource"],
        "headline": f"{chapter['title']} — {chapter['subtitle']}",
        "description": desc,
        "author": {
            "@type": "Person",
            "name": "Ghassan Alhamoud",
            "url": BASE_URL + "/",
        },
        "isPartOf": {
            "@type": "Course",
            "name": "The AI-Native Engineering Handbook",
            "url": BASE_URL + "/handbook/",
        },
        "datePublished": chapter.get("publishedAt") or datetime.now().strftime("%Y-%m-%d"),
        "dateModified": chapter.get("lastModified") or chapter.get("publishedAt") or datetime.now().strftime("%Y-%m-%d"),
        "image": image,
        "learningResourceType": "Chapter",
        "position": chapter["id"],
        "mainEntityOfPage": url,
    }
    return json.dumps(schema, indent=2)


def build_breadcrumbs(chapter: dict) -> str:
    url = f"/handbook/chapter-{chapter['id']:02d}-{chapter['slug']}.html"
    schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL + "/"},
            {"@type": "ListItem", "position": 2, "name": "Handbook", "item": BASE_URL + "/handbook/"},
            {"@type": "ListItem", "position": 3, "name": chapter["title"], "item": BASE_URL + url},
        ],
    }
    return json.dumps(schema, indent=2)


def build_faq_schema(body_html: str) -> Optional[str]:
    """Generate FAQPage schema from the FAQ section if present."""
    faq_start = body_html.find('<h2 id="frequently-asked-questions">')
    if faq_start == -1:
        return None

    next_h2 = body_html.find("<h2", faq_start + 1)
    faq_section = body_html[faq_start:next_h2] if next_h2 != -1 else body_html[faq_start:]

    # Remove the heading itself
    faq_section = re.sub(r"<h2[^>]*>.*?</h2>", "", faq_section, count=1, flags=re.DOTALL)
    # Remove CTA div if it was captured
    faq_section = re.sub(r'<div class="article-cta">.*?</div>', "", faq_section, flags=re.DOTALL)

    questions = []
    for p in re.findall(r"<p>(.*?)</p>", faq_section, re.DOTALL):
        p = p.strip()
        if not p.startswith("<strong>Q:"):
            continue
        # Split at the closing strong tag
        m = re.match(r"<strong>Q:\s*(.*?)</strong>\s*(.*)", p, re.DOTALL)
        if not m:
            continue
        q_text = strip_html_tags(m.group(1)).strip()
        a_text = strip_html_tags(m.group(2)).strip()
        if q_text and a_text:
            questions.append({
                "@type": "Question",
                "name": q_text,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": a_text,
                },
            })

    if not questions:
        return None

    schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": questions,
    }
    return json.dumps(schema, indent=2)


def find_prev_next(chapters: list, current: dict) -> Tuple[Optional[dict], Optional[dict]]:
    published = [c for c in chapters if c["status"] == "published"]
    published.sort(key=lambda c: c["id"])
    idx = next((i for i, c in enumerate(published) if c["id"] == current["id"]), -1)
    prev_ch = published[idx - 1] if idx > 0 else None
    next_ch = published[idx + 1] if 0 <= idx < len(published) - 1 else None
    return prev_ch, next_ch


def chapter_nav_html(prev_ch: Optional[dict], next_ch: Optional[dict]) -> str:
    parts = ['<nav class="chapter-nav" aria-label="Chapter navigation">']

    if prev_ch:
        url = f"/handbook/chapter-{prev_ch['id']:02d}-{prev_ch['slug']}.html"
        parts.append(
            f'<a href="{url}" class="chapter-nav__link chapter-nav__link--prev">'
            f'<div class="chapter-nav__label">← Previous Chapter</div>'
            f'<div class="chapter-nav__title">{prev_ch["title"]}</div></a>'
        )
    else:
        parts.append(
            '<div class="chapter-nav__link chapter-nav__link--prev chapter-nav__link--disabled">'
            '<div class="chapter-nav__label">← Previous Chapter</div>'
            '<div class="chapter-nav__title">—</div></div>'
        )

    if next_ch:
        url = f"/handbook/chapter-{next_ch['id']:02d}-{next_ch['slug']}.html"
        parts.append(
            f'<a href="{url}" class="chapter-nav__link chapter-nav__link--next">'
            f'<div class="chapter-nav__label">Next Chapter →</div>'
            f'<div class="chapter-nav__title">{next_ch["title"]}</div></a>'
        )
    else:
        parts.append(
            '<div class="chapter-nav__link chapter-nav__link--next chapter-nav__link--disabled">'
            '<div class="chapter-nav__label">Next Chapter →</div>'
            '<div class="chapter-nav__title">Coming Soon</div></div>'
        )

    parts.append("</nav>")
    return "\n".join(parts)


def render_toc(toc_html: str) -> str:
    """Render the table of contents for the sidebar."""
    if not toc_html.strip():
        return ""
    # The toc extension wraps in <div class="toc"><ul>...</ul></div>
    # We want to use our own class names.
    toc = toc_html.replace('<div class="toc">', '').replace('</div>', '')
    toc = toc.replace("<ul>", '<ul class="handbook-toc__list">', 1)
    toc = toc.replace('href="#', 'class="handbook-toc__link" href="#')
    return (
        '<div class="handbook-toc">'
        '<h3 class="handbook-toc__title">On this page</h3>'
        f'{toc}'
        '</div>'
    )


def render_prerequisites(chapter: dict, all_chapters: dict) -> str:
    """Render prerequisites box."""
    prereqs = chapter.get("prerequisites", [])
    if not prereqs:
        return (
            '<div class="prerequisites-box">'
            '<h3 class="prerequisites-box__title">Prerequisites</h3>'
            '<p class="prerequisites-box__text">None. This is a foundational chapter.</p>'
            '</div>'
        )

    by_slug = {c["slug"]: c for c in all_chapters}
    items = []
    for slug in prereqs:
        ref = by_slug.get(slug)
        if not ref:
            continue
        url = f"/handbook/chapter-{ref['id']:02d}-{ref['slug']}.html"
        items.append(f'<li><a href="{url}">{ref["title"]}</a></li>')

    return (
        '<div class="prerequisites-box">'
        '<h3 class="prerequisites-box__title">Prerequisites</h3>'
        f'<ul>{"".join(items)}</ul>'
        '</div>'
    )


def render_chapter(chapter: dict, all_chapters: list) -> str:
    md_path = MD_DIR / chapter["file"]
    if not md_path.exists():
        raise FileNotFoundError(f"Markdown file not found: {md_path}")

    raw_md = md_path.read_text(encoding="utf-8")

    # Remove Meta section from rendered body; we keep it only in source.
    raw_md = re.split(r"\n## Meta\n", raw_md)[0]

    body_html, toc_html = md_to_html(raw_md)
    body_html = wrap_diagrams(body_html)

    # Clean up title line so it doesn't render as H1 in body (we use hero)
    body_html = re.sub(r"<h1[^>]*>.*?</h1>", "", body_html, count=1, flags=re.DOTALL)

    prev_ch, next_ch = find_prev_next(all_chapters, chapter)
    nav_html = chapter_nav_html(prev_ch, next_ch)
    cta_html = CTA_HTML
    toc_sidebar = render_toc(toc_html)
    prereq_box = render_prerequisites(chapter, all_chapters)

    page_url = f"/handbook/chapter-{chapter['id']:02d}-{chapter['slug']}.html"
    canonical = BASE_URL + page_url
    og_image = BASE_URL + chapter["ogImage"]
    description = chapter.get("description") or extract_first_paragraph(body_html)
    if len(description) > 160:
        description = description[:157] + "..."

    title = f"Chapter {chapter['id']}: {chapter['title']} — AI-Native Engineering Handbook"

    badge = f"HDBK-{chapter['id']:03d}"
    difficulty = chapter.get("difficulty", "").capitalize()
    reading_time = chapter.get("readingTime", "")
    last_modified = chapter.get("lastModified") or chapter.get("publishedAt") or ""

    schema = build_schema(chapter, body_html)
    breadcrumbs = build_breadcrumbs(chapter)
    faq_schema = build_faq_schema(body_html)
    faq_script = (
        f'\n  <script type="application/ld+json">\n{faq_schema}\n  </script>'
        if faq_schema else ""
    )

    html = f"""<!DOCTYPE html>
<html lang="en" data-theme="nature">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>{title}</title>
  <meta name="description" content="{description}" />
  <meta name="author" content="Ghassan Alhamoud" />
  <link rel="canonical" href="{canonical}" />

  <meta property="og:type" content="article" />
  <meta property="og:url" content="{canonical}" />
  <meta property="og:title" content="Chapter {chapter['id']}: {chapter['title']} — {chapter['subtitle']}" />
  <meta property="og:description" content="{description}" />
  <meta property="og:image" content="{og_image}" />
  <meta property="article:published_time" content="{chapter.get('publishedAt', '')}" />
  <meta property="article:author" content="Ghassan Alhamoud" />

  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content="{canonical}" />
  <meta property="twitter:title" content="Chapter {chapter['id']}: {chapter['title']} — {chapter['subtitle']}" />
  <meta property="twitter:description" content="{description}" />
  <meta property="twitter:image" content="{og_image}" />

  <script type="application/ld+json">
{schema}
  </script>
  <script type="application/ld+json">
{breadcrumbs}
  </script>{faq_script}

  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="alternate" type="application/rss+xml" title="Ghassan Alhamoud — AI Architecture &amp; Automation" href="/rss.xml" />
  <link rel="preload" href="/assets/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preconnect" href="https://app.cal.eu" crossorigin />
  <link rel="stylesheet" href="/assets/css/main.css" />
  <link rel="stylesheet" href="/assets/css/handbook.css" />
</head>
<body>
  <header class="header" id="header">
    <nav class="nav container">
      <a href="/" class="nav__logo" aria-label="Home">
        <svg class="nav__monogram" width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="36" height="36" rx="8" fill="#e4006f" fill-opacity="0.15"/>
          <text x="18" y="24" text-anchor="middle" fill="#e4006f" font-family="Inter, sans-serif" font-weight="700" font-size="18">GA</text>
        </svg>
        <span class="nav__name">Ghassan Alhamoud</span>
      </a>

      <button class="nav__toggle" id="navToggle" aria-label="Toggle navigation menu" aria-expanded="false">
        <span class="nav__toggle-bar"></span>
        <span class="nav__toggle-bar"></span>
        <span class="nav__toggle-bar"></span>
      </button>

      <ul class="nav__menu" id="navMenu" role="navigation">
        <li><a href="/#services" class="nav__link">Services</a></li>
        <li><a href="/#work" class="nav__link">Work</a></li>
        <li><a href="/articles/" class="nav__link">Articles</a></li>
        <li><a href="/handbook/" class="nav__link nav__link--active">Handbook</a></li>
        <li><a href="/#about" class="nav__link">About</a></li>
        <li><a href="/#contact" class="nav__link nav__link--cta">Contact</a></li>
      </ul>
    </nav>
  </header>

  <main class="article-single handbook-page">
    <div class="container article-layout">
      <article>
        <header class="article-single__header handbook-hero">
          <span class="handbook-hero__badge">{badge}</span>
          <h1 class="handbook-hero__title">{chapter['title']}</h1>
          <p class="handbook-hero__subtitle">{chapter['subtitle']}</p>
          <div class="handbook-hero__meta">
            <span>Chapter {chapter['id']}</span>
            {f'<span class="handbook-hero__dot">•</span><span>{reading_time}</span>' if reading_time else ''}
            {f'<span class="handbook-hero__dot">•</span><span>{difficulty}</span>' if difficulty else ''}
            {f'<span class="handbook-hero__dot">•</span><span>Updated {last_modified}</span>' if last_modified else ''}
          </div>
        </header>

        {prereq_box}

        <div class="article-single__body handbook-body">
{body_html}
        </div>

        {nav_html}

        {cta_html}
      </article>

      <aside class="article-sidebar handbook-sidebar">
        {toc_sidebar}
      </aside>
    </div>
  </main>

  <footer class="footer">
    <div class="container footer__inner">
      <div class="footer__brand">
        <a href="/" class="footer__brand-link" aria-label="Home">
          <svg class="footer__monogram" width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="36" height="36" rx="8" fill="#e4006f" fill-opacity="0.15"/>
            <text x="18" y="24" text-anchor="middle" fill="#e4006f" font-family="Inter, sans-serif" font-weight="700" font-size="18">GA</text>
          </svg>
        </a>
        <p class="footer__tagline">AI Architecture Consulting — Worldwide</p>
        <div class="footer__socials">
          <a href="https://github.com/gh-assan" target="_blank" rel="noopener noreferrer" class="footer__social-link" aria-label="GitHub">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          </a>
          <a href="https://linkedin.com/in/ghassanalhamoud" target="_blank" rel="noopener noreferrer" class="footer__social-link" aria-label="LinkedIn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          </a>
        </div>
      </div>
      <nav class="footer__nav" aria-label="Footer navigation">
        <div class="footer__nav-col">
          <span class="footer__nav-heading">Services</span>
          <a href="/#services" class="footer__nav-link">System Design</a>
          <a href="/#services" class="footer__nav-link">AI Architecture</a>
          <a href="/#services" class="footer__nav-link">LLM Coaching</a>
          <a href="/#services" class="footer__nav-link">Architecture Reviews</a>
        </div>
        <div class="footer__nav-col">
          <span class="footer__nav-heading">Explore</span>
          <a href="/#work" class="footer__nav-link">Case Studies</a>
          <a href="/articles/" class="footer__nav-link">Articles</a>
          <a href="/handbook/" class="footer__nav-link">Handbook</a>
          <a href="/#about" class="footer__nav-link">About</a>
        </div>
        <div class="footer__nav-col">
          <span class="footer__nav-heading">Connect</span>
          <a href="/#contact" class="footer__nav-link">Contact</a>
          <a href="https://calendly.com/ghassan-alhamoud/30min" target="_blank" rel="noopener noreferrer" class="footer__nav-link" data-cal-link="ghassan-alhamoud/30min" data-cal-namespace="30min">Book a Call</a>
          <a href="https://github.com/gh-assan" target="_blank" rel="noopener noreferrer" class="footer__nav-link">GitHub</a>
          <a href="https://linkedin.com/in/ghassanalhamoud" target="_blank" rel="noopener noreferrer" class="footer__nav-link">LinkedIn</a>
        </div>
      </nav>
    </div>
    <div class="footer__bottom">
      <div class="container">
        <span class="footer__copy">&copy; 2026 Ghassan Alhamoud — All rights reserved</span>
      </div>
    </div>
  </footer>

  <script>
    (function() {{
      var saved = localStorage.getItem("theme");
      if (saved) {{
        document.documentElement.setAttribute("data-theme", saved);
      }}
    }})();
  </script>
  <script src="/assets/js/nav.js" defer></script>
  <script src="/assets/js/cal-widget.js" defer></script>
</body>
</html>"""

    return html


def render_index(handbook: dict, chapters: list) -> str:
    published = [c for c in chapters if c["status"] == "published"]
    published.sort(key=lambda c: c["id"])
    title = f"{handbook['title']} — Production-tested agent patterns"
    canonical = BASE_URL + "/handbook/"
    og_image = BASE_URL + "/images/og-default.webp"
    description = (
        "A production-tested reference for AI-native engineering patterns: "
        "ReAct, Plan-and-Execute, Reflection, multi-agent systems, and more."
    )

    schema = {
        "@context": "https://schema.org",
        "@type": "Course",
        "name": handbook["title"],
        "description": description,
        "url": canonical,
        "author": {
            "@type": "Person",
            "name": "Ghassan Alhamoud",
            "url": BASE_URL + "/",
        },
        "courseCode": "HDBK",
        "educationalLevel": "Advanced",
        "hasCourseInstance": [
            {
                "@type": "CourseInstance",
                "courseMode": "online",
                "courseWorkload": "PT8M",
                "instructor": {"@type": "Person", "name": "Ghassan Alhamoud"},
            }
        ],
    }

    item_list = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": idx + 1,
                "name": c["title"],
                "url": BASE_URL + f"/handbook/chapter-{c['id']:02d}-{c['slug']}.html",
            }
            for idx, c in enumerate(published)
        ],
    }

    breadcrumbs = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL + "/"},
            {"@type": "ListItem", "position": 2, "name": "Handbook", "item": canonical},
        ],
    }

    chapter_cards = []
    for c in published:
        url = f"/handbook/chapter-{c['id']:02d}-{c['slug']}.html"
        chapter_cards.append(
            f'<a href="{url}" class="handbook-index__card">'
            f'<span class="handbook-index__card-number">HDBK-{c["id"]:03d}</span>'
            f'<h3 class="handbook-index__card-title">{c["title"]}</h3>'
            f'<p class="handbook-index__card-desc">{c["description"]}</p>'
            f'<span class="handbook-index__card-meta">{c.get("readingTime", "")} • {c.get("difficulty", "").capitalize()}</span>'
            f'</a>'
        )

    html = f"""<!DOCTYPE html>
<html lang="en" data-theme="nature">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>{title}</title>
  <meta name="description" content="{description}" />
  <meta name="author" content="Ghassan Alhamoud" />
  <link rel="canonical" href="{canonical}" />

  <meta property="og:type" content="website" />
  <meta property="og:url" content="{canonical}" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{description}" />
  <meta property="og:image" content="{og_image}" />

  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content="{canonical}" />
  <meta property="twitter:title" content="{title}" />
  <meta property="twitter:description" content="{description}" />
  <meta property="twitter:image" content="{og_image}" />

  <script type="application/ld+json">
{json.dumps(schema, indent=2)}
  </script>
  <script type="application/ld+json">
{json.dumps(item_list, indent=2)}
  </script>
  <script type="application/ld+json">
{json.dumps(breadcrumbs, indent=2)}
  </script>

  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="alternate" type="application/rss+xml" title="Ghassan Alhamoud — AI Architecture &amp; Automation" href="/rss.xml" />
  <link rel="preload" href="/assets/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preconnect" href="https://app.cal.eu" crossorigin />
  <link rel="stylesheet" href="/assets/css/main.css" />
  <link rel="stylesheet" href="/assets/css/handbook.css" />
</head>
<body>
  <header class="header" id="header">
    <nav class="nav container">
      <a href="/" class="nav__logo" aria-label="Home">
        <svg class="nav__monogram" width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="36" height="36" rx="8" fill="#e4006f" fill-opacity="0.15"/>
          <text x="18" y="24" text-anchor="middle" fill="#e4006f" font-family="Inter, sans-serif" font-weight="700" font-size="18">GA</text>
        </svg>
        <span class="nav__name">Ghassan Alhamoud</span>
      </a>

      <button class="nav__toggle" id="navToggle" aria-label="Toggle navigation menu" aria-expanded="false">
        <span class="nav__toggle-bar"></span>
        <span class="nav__toggle-bar"></span>
        <span class="nav__toggle-bar"></span>
      </button>

      <ul class="nav__menu" id="navMenu" role="navigation">
        <li><a href="/#services" class="nav__link">Services</a></li>
        <li><a href="/#work" class="nav__link">Work</a></li>
        <li><a href="/articles/" class="nav__link">Articles</a></li>
        <li><a href="/handbook/" class="nav__link nav__link--active">Handbook</a></li>
        <li><a href="/#about" class="nav__link">About</a></li>
        <li><a href="/#contact" class="nav__link nav__link--cta">Contact</a></li>
      </ul>
    </nav>
  </header>

  <main class="handbook-index">
    <div class="container">
      <div class="handbook-index__hero">
        <span class="handbook-hero__badge">HDBK</span>
        <h1 class="section__title">{handbook['title']}</h1>
        <p class="section__subtitle">{handbook['subtitle']}</p>
        <p class="handbook-index__intro">
          A structured, production-tested guide to the patterns that make autonomous agents reliable.
          Each chapter includes diagrams, pseudocode, decision frameworks, and the failure modes you will hit in production.
        </p>
      </div>

      <div class="handbook-index__grid">
{chr(10).join(chapter_cards)}
      </div>

      <div class="article-cta handbook-index__cta">
        <p class="article-cta__text">Need help applying these patterns to your system? Let's talk.</p>
        <a href="/#contact" class="btn btn--primary">Get in Touch</a>
      </div>
    </div>
  </main>

  <footer class="footer">
    <div class="container footer__inner">
      <div class="footer__brand">
        <a href="/" class="footer__brand-link" aria-label="Home">
          <svg class="footer__monogram" width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="36" height="36" rx="8" fill="#e4006f" fill-opacity="0.15"/>
            <text x="18" y="24" text-anchor="middle" fill="#e4006f" font-family="Inter, sans-serif" font-weight="700" font-size="18">GA</text>
          </svg>
        </a>
        <p class="footer__tagline">AI Architecture Consulting — Worldwide</p>
        <div class="footer__socials">
          <a href="https://github.com/gh-assan" target="_blank" rel="noopener noreferrer" class="footer__social-link" aria-label="GitHub">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          </a>
          <a href="https://linkedin.com/in/ghassanalhamoud" target="_blank" rel="noopener noreferrer" class="footer__social-link" aria-label="LinkedIn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          </a>
        </div>
      </div>
      <nav class="footer__nav" aria-label="Footer navigation">
        <div class="footer__nav-col">
          <span class="footer__nav-heading">Services</span>
          <a href="/#services" class="footer__nav-link">System Design</a>
          <a href="/#services" class="footer__nav-link">AI Architecture</a>
          <a href="/#services" class="footer__nav-link">LLM Coaching</a>
          <a href="/#services" class="footer__nav-link">Architecture Reviews</a>
        </div>
        <div class="footer__nav-col">
          <span class="footer__nav-heading">Explore</span>
          <a href="/#work" class="footer__nav-link">Case Studies</a>
          <a href="/articles/" class="footer__nav-link">Articles</a>
          <a href="/handbook/" class="footer__nav-link">Handbook</a>
          <a href="/#about" class="footer__nav-link">About</a>
        </div>
        <div class="footer__nav-col">
          <span class="footer__nav-heading">Connect</span>
          <a href="/#contact" class="footer__nav-link">Contact</a>
          <a href="https://calendly.com/ghassan-alhamoud/30min" target="_blank" rel="noopener noreferrer" class="footer__nav-link" data-cal-link="ghassan-alhamoud/30min" data-cal-namespace="30min">Book a Call</a>
          <a href="https://github.com/gh-assan" target="_blank" rel="noopener noreferrer" class="footer__nav-link">GitHub</a>
          <a href="https://linkedin.com/in/ghassanalhamoud" target="_blank" rel="noopener noreferrer" class="footer__nav-link">LinkedIn</a>
        </div>
      </nav>
    </div>
    <div class="footer__bottom">
      <div class="container">
        <span class="footer__copy">&copy; 2026 Ghassan Alhamoud — All rights reserved</span>
      </div>
    </div>
  </footer>

  <script>
    (function() {{
      var saved = localStorage.getItem("theme");
      if (saved) {{
        document.documentElement.setAttribute("data-theme", saved);
      }}
    }})();
  </script>
  <script src="/assets/js/nav.js" defer></script>
  <script src="/assets/js/cal-widget.js" defer></script>
</body>
</html>"""
    return html


def main():
    data = load_json()
    chapters = data["chapters"]

    os.makedirs(OUT_DIR, exist_ok=True)

    published = [c for c in chapters if c["status"] == "published"]
    published.sort(key=lambda c: c["id"])

    print(f"Building {len(published)} handbook chapters...")
    for chapter in published:
        html = render_chapter(chapter, chapters)
        out_path = OUT_DIR / f"chapter-{chapter['id']:02d}-{chapter['slug']}.html"
        out_path.write_text(html, encoding="utf-8")
        print(f"  ✓ {out_path.name}")

    index_html = render_index(data, chapters)
    index_path = OUT_DIR / "index.html"
    index_path.write_text(index_html, encoding="utf-8")
    print(f"  ✓ {index_path.name}")

    print("Done.")


if __name__ == "__main__":
    main()
