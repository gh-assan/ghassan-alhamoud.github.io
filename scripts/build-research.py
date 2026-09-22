#!/usr/bin/env python3
"""
Build the Research section from Markdown + JSON into static HTML.

Usage:
    python3 scripts/build-research.py            # build every programme
    python3 scripts/build-research.py <slug>     # build one programme

Source of truth:  content/research/index.json
                  content/research/<slug>/research.json
                  content/research/<slug>/{chapters/*.md, summary.md, faq.md,
                                           glossary.json, sources.md, method.md, home.md}
Output:           research/index.html
                  research/<slug>/{index, summary, faq, glossary, sources, method, NN-chapter}.html

Authoring syntax (documented in docs/research-section/01-authoring-guide.md):
    [[term]] / [[term|shown text]] glossary link with hover definition
    [S] [P] [D] [C]                evidence-label pill
    [text](ch:slug#anchor)         cross-chapter link (validated)
    [text](ref:faq#anchor)         reference-page link (summary|faq|glossary|sources|method|home)
    > [!key|evidence|warning|try|example|note] Title     callout
    ```chart {json}```             chart rendered by research_charts.py
    ```lang title="file.ext"```    highlighted code block with copy button
    <figure class="diagram">…</figure>   inline SVG diagram (auto-numbered)
"""

import html
import json
import re
import sys
from datetime import date
from pathlib import Path

import markdown
from markdown.extensions.toc import TocExtension, slugify
from pygments import highlight
from pygments.formatters import HtmlFormatter
from pygments.lexers import TextLexer, get_lexer_by_name
from pygments.util import ClassNotFound

sys.path.insert(0, str(Path(__file__).resolve().parent))
from research_charts import render_chart  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content" / "research"
OUT = ROOT / "research"
BASE_URL = "https://ghassan-alhamoud.com"
AUTHOR = "Ghassan Alhamoud"
ROLE = "Senior Software Engineer — AI Agent Enabler, Software Architecture"
WPM = 230

EVIDENCE = {
    "S": ("Sourced", "A study, paper, or first-party engineering write-up with a stated method"),
    "P": ("Practitioner-reported", "A credible operator or project account without a published method"),
    "D": ("Derived", "Follows from a labelled claim by stated reasoning, not independently measured"),
    "C": ("Composite", "A constructed illustration, not a real incident"),
}
REF_PAGES = {"home": "index.html", "summary": "summary.html", "faq": "faq.html",
             "glossary": "glossary.html", "sources": "sources.html", "method": "method.html"}
CALLOUTS = {
    "key": "Key idea", "evidence": "Evidence", "warning": "Watch out",
    "try": "Try this", "example": "Worked example", "note": "Note",
}


def esc(s):
    return html.escape(str(s), quote=True)


# ---------------------------------------------------------------- loading
def load_index():
    return json.loads((CONTENT / "index.json").read_text(encoding="utf-8"))


def load_programme(slug):
    base = CONTENT / slug
    data = json.loads((base / "research.json").read_text(encoding="utf-8"))
    data["_base"] = base
    data["glossary"] = json.loads((base / "glossary.json").read_text(encoding="utf-8"))["terms"]
    for t in data["glossary"]:
        t["id"] = t.get("id") or slugify(t["term"], "-")
    parts = {p["id"]: p for p in data["parts"]}
    for i, ch in enumerate(data["chapters"]):
        ch["_index"] = i
        ch["_part"] = parts[ch["part"]]
        ch["_file"] = chapter_filename(ch)
    return data


def chapter_filename(ch):
    label = str(ch.get("label", ch["id"]))
    prefix = f"{int(label):02d}" if label.isdigit() else label.lower()
    return f"{prefix}-{ch['slug']}.html"


def chapter_label(ch):
    label = str(ch.get("label", ch["id"]))
    return f"Chapter {label}" if label.isdigit() else f"Appendix {label}"


def glossary_index(prog):
    idx = {}
    for t in prog["glossary"]:
        for key in [t["term"], t["id"], *t.get("aliases", [])]:
            idx[slugify(key, "-")] = t
    return idx


# ---------------------------------------------------------------- markdown
FENCE_RE = re.compile(r"^(`{3,})([^\n`]*)\n(.*?)\n\1[ \t]*$", re.S | re.M)
CALLOUT_RE = re.compile(r"^> \[!(\w+)\][ \t]*(.*)$", re.M)


class Renderer:
    """Converts one Markdown document with the research extensions."""

    def __init__(self, prog, page_key):
        self.prog = prog
        self.page_key = page_key
        self.gloss = glossary_index(prog)
        self.chapters = {c["slug"]: c for c in prog["chapters"]}
        self.blocks = []
        self.terms_used = []
        self.errors = []
        self.figure_count = 0

    def _stash(self, html_block):
        self.blocks.append(html_block)
        return f"\n\n@@RSBLOCK{len(self.blocks) - 1}@@\n\n"

    def _fence(self, m):
        info, body = m.group(2).strip(), m.group(3)
        lang = info.split()[0] if info else ""
        title_m = re.search(r'title="([^"]+)"', info)
        if lang == "chart":
            cid = f"chart-{self.page_key}-{len(self.blocks)}"
            try:
                return self._stash(render_chart(body, cid))
            except (ValueError, KeyError, json.JSONDecodeError) as e:
                self.errors.append(f"chart error: {e}")
                return ""
        if lang == "diagnostic":
            try:
                return self._stash(self._diagnostic(json.loads(body)))
            except (ValueError, KeyError) as e:
                self.errors.append(f"diagnostic error: {e}")
                return ""
        try:
            lexer = get_lexer_by_name(lang) if lang and lang != "text" else TextLexer()
        except ClassNotFound:
            lexer = TextLexer()
        code = highlight(body, lexer, HtmlFormatter(nowrap=True))
        label = title_m.group(1) if title_m else (lang if lang and lang != "text" else "")
        head = (f'<div class="rs-code__head"><span class="rs-code__title">{esc(label)}</span></div>'
                if label else "")
        return self._stash(
            f'<div class="rs-code">{head}<pre class="highlight"><code>{code}</code></pre></div>'
        )

    def _diagnostic(self, spec):
        """Self-scoring checklist. A static form without JS; research.js scores it."""
        actions = {k: {"text": v["text"], "href": self.resolve_href(v["href"])}
                   for k, v in spec["actions"].items()}
        areas = []
        for area in spec["areas"]:
            items = []
            for i, item in enumerate(area["items"]):
                name = f"diag-{area['id']}-{i}"
                gate = ' data-gate="1"' if item.get("gate") else ""
                flag = '<span class="rs-diag__gate" title="Gating item">⚑</span> ' if item.get("gate") else ""
                opts = "".join(
                    f'<label class="rs-diag__opt"><input type="radio" name="{name}" value="{v}"{gate} />'
                    f'<span>{v}</span></label>' for v in (0, 1, 2))
                items.append(f'<li class="rs-diag__item"><span class="rs-diag__text">'
                             f'<span class="rs-diag__num">{area["id"]}.{i + 1}</span> {flag}{esc(item["text"])}</span>'
                             f'<span class="rs-diag__opts" role="radiogroup" aria-label="Score for item {area["id"]}.{i + 1}">{opts}</span></li>')
            note = f' <span class="rs-diag__note">{esc(area["note"])}</span>' if area.get("note") else ""
            areas.append(
                f'<fieldset class="rs-diag__area" data-area="{area["id"]}" data-title="{esc(area["title"])}">'
                f'<legend><span>Area {area["id"]} · {esc(area["title"])}</span>{note}'
                f'<output class="rs-diag__score" aria-live="polite"></output></legend>'
                f'<ol class="rs-diag__items">{"".join(items)}</ol></fieldset>')
        return (
            f'<div class="rs-diag" data-levels="{esc(json.dumps(spec["levels"]))}" '
            f'data-actions="{esc(json.dumps(actions))}">'
            f'<div class="rs-diag__legend"><span><strong>0</strong> not done or unknown</span>'
            f'<span><strong>1</strong> partly or inconsistently</span><span><strong>2</strong> done and verified</span>'
            f'<span>⚑ gating item</span></div>'
            f'<form class="rs-diag__form">{"".join(areas)}</form>'
            f'<div class="rs-diag__result" aria-live="polite"><p class="rs-diag__result-title">Your result</p>'
            f'<p class="rs-diag__empty">Score the items above to see your level and your one next action.</p></div>'
            f'</div>')

    def convert(self, text):
        text = FENCE_RE.sub(self._fence, text)
        # Glossary links like [[term|label]] inside table rows: escape the pipe
        # so the table parser does not split the cell.
        text = re.sub(r"^\|.*$", lambda m: re.sub(r"\[\[([^\]|]+)\|([^\]]+)\]\]", r"[[\1\\|\2]]", m.group(0)),
                      text, flags=re.M)
        text = CALLOUT_RE.sub(lambda m: f"> @@CALLOUT:{m.group(1).lower()}:{m.group(2).strip()}@@\n>", text)
        md = markdown.Markdown(extensions=[
            "tables", "attr_list", "md_in_html", "sane_lists",
            TocExtension(toc_depth="2-3", permalink="#", permalink_class="rs-anchor",
                         permalink_title="Link to this section"),
        ])
        body = md.convert(text)
        toc = md.toc_tokens
        body = re.sub(r"<p>@@RSBLOCK(\d+)@@</p>", lambda m: self.blocks[int(m.group(1))], body)
        body = self._callouts(body)
        body = self._links(body)
        body = self._text_transforms(body)
        body = self._number_figures(body)
        body = self._wrap_tables(body)
        return body, toc

    def _callouts(self, body):
        def repl(m):
            kind, title, inner = m.group(1), m.group(2), m.group(3)
            if kind not in CALLOUTS:
                self.errors.append(f"unknown callout type: {kind}")
            label = title or CALLOUTS.get(kind, "Note")
            return (f'<aside class="callout rs-callout rs-callout--{kind}">'
                    f'<p class="rs-callout__title">{label}</p>{inner}</aside>')
        return re.sub(
            r"<blockquote>\s*<p>@@CALLOUT:(\w+):(.*?)@@\s*</p>(.*?)</blockquote>",
            repl, body, flags=re.S)

    def resolve_href(self, href):
        if href.startswith("ch:"):
            slug, _, frag = href[3:].partition("#")
            ch = self.chapters.get(slug)
            if not ch:
                self.errors.append(f"unknown chapter link: {href}")
                return "#"
            return ch["_file"] + (f"#{frag}" if frag else "")
        if href.startswith("ref:"):
            key, _, frag = href[4:].partition("#")
            if key not in REF_PAGES:
                self.errors.append(f"unknown reference link: {href}")
                return "#"
            return REF_PAGES[key] + (f"#{frag}" if frag else "")
        return href

    def _links(self, body):
        def repl(m):
            href = self.resolve_href(html.unescape(m.group(1)))
            ext = href.startswith("http")
            extra = ' target="_blank" rel="noopener noreferrer"' if ext and "ghassan-alhamoud.com" not in href else ""
            return f'href="{esc(href)}"{extra}'
        return re.sub(r'href="([^"]+)"', repl, body)

    def _text_transforms(self, body):
        """Glossary links and evidence pills, applied to text nodes only."""
        out = []
        skip = 0
        skip_tags = ("pre", "code", "svg", "a", "script", "title", "summary")
        for token in re.split(r"(<[^>]+>)", body):
            if token.startswith("<"):
                m = re.match(r"<(/?)([a-zA-Z0-9]+)", token)
                if m and m.group(2).lower() in skip_tags and not token.endswith("/>"):
                    skip += -1 if m.group(1) else 1
                out.append(token)
                continue
            if skip > 0:
                out.append(token)
                continue
            token = re.sub(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]", self._gloss_link, token)
            token = re.sub(r"\[([SPDC])\]", self._pill, token)
            out.append(token)
        return "".join(out)

    def _gloss_link(self, m):
        key, label = m.group(1), m.group(2) or m.group(1)
        term = self.gloss.get(slugify(key, "-"))
        if not term:
            self.errors.append(f"unknown glossary term: [[{m.group(0)[2:-2]}]]")
            return label
        if term["id"] not in self.terms_used:
            self.terms_used.append(term["id"])
        return (f'<a class="rs-term" href="glossary.html#{term["id"]}" '
                f'data-def="{esc(term["definition"])}">{label}</a>')

    def _pill(self, m):
        k = m.group(1)
        name, desc = EVIDENCE[k]
        return (f'<a class="rs-ev rs-ev--{k.lower()}" href="sources.html#evidence-labels" '
                f'title="{esc(name)}: {esc(desc)}" aria-label="Evidence: {esc(name)}">{k}</a>')

    def _number_figures(self, body):
        def repl(m):
            self.figure_count += 1
            n = self.figure_count
            tag = m.group(0)
            if 'id="' not in tag:
                tag = tag.replace("<figure", f'<figure id="figure-{n}"', 1)
            return tag
        body = re.sub(r"<figure\b[^>]*>", repl, body)
        counter = iter(range(1, self.figure_count + 1))
        return re.sub(r"<figcaption>",
                      lambda m: f'<figcaption><span class="rs-fignum">Figure {next(counter)}.</span> ',
                      body)

    def _wrap_tables(self, body):
        return re.sub(r"(?<!<div class=\"table-scroll\">)<table>(.*?)</table>",
                      r'<div class="table-scroll rs-table"><table>\1</table></div>', body, flags=re.S)


def md_inline(prog, text):
    """Render a short Markdown string (tl;dr bullet, outcome) with extensions."""
    r = Renderer(prog, "inline")
    body, _ = r.convert(text)
    body = re.sub(r"^<p>(.*)</p>$", r"\1", body.strip(), flags=re.S)
    return body, r


# ---------------------------------------------------------------- prose stats
def prose_text(body_html):
    t = re.sub(r"<(pre|svg|figure|script|form)\b.*?</\1>", " ", body_html, flags=re.S)
    t = re.sub(r'<a class="rs-anchor".*?</a>', " ", t, flags=re.S)
    t = re.sub(r"<[^>]+>", " ", t)
    return html.unescape(t)


def word_count(body_html):
    return len(re.findall(r"[A-Za-z0-9][\w'’.-]*", prose_text(body_html)))


def avg_sentence_length(body_html):
    """Mean words per sentence across prose paragraphs and list items.

    Each block is split on its own, so a list item without a full stop counts
    as one sentence rather than merging into its neighbours. Code, SVG, tables,
    figures and forms are excluded.
    """
    cleaned = re.sub(r"<(pre|svg|table|figure|form)\b.*?</\1>", " ", body_html, flags=re.S)
    lengths = []
    for _, block in re.findall(r"<(p|li)\b[^>]*>(.*?)</\1>", cleaned, flags=re.S):
        text = html.unescape(re.sub(r"<[^>]+>", " ", block))
        for sentence in re.split(r"(?<=[.!?])\s+", text):
            n = len(sentence.split())
            if n >= 3:
                lengths.append(n)
    return sum(lengths) / len(lengths) if lengths else 0.0


def reading_minutes(words, figures=0):
    return max(1, round(words / WPM + figures * 0.4))


# ---------------------------------------------------------------- shell
NAV = [("Systems", "/projects/"), ("Field Notes", "/articles/"), ("Handbook", "/handbook/"),
       ("Research", "/research/"), ("About", "/#about")]


def header():
    items = "\n".join(
        f'        <li><a href="{href}" class="nav__link{" nav__link--active" if label == "Research" else ""}">{label}</a></li>'
        for label, href in NAV)
    return f"""  <header class="header" id="header">
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

      <ul class="nav__menu" id="navMenu" aria-label="Main navigation">
{items}
      </ul>
    </nav>
  </header>"""


FOOTER = f"""  <footer class="footer">
    <div class="container footer__inner">
      <div class="footer__brand">
        <a href="/" class="footer__brand-link" aria-label="Home">
          <svg class="footer__monogram" width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="36" height="36" rx="8" fill="#e4006f" fill-opacity="0.15"/>
            <text x="18" y="24" text-anchor="middle" fill="#e4006f" font-family="Inter, sans-serif" font-weight="700" font-size="18">GA</text>
          </svg>
        </a>
        <p class="footer__tagline">{ROLE}</p>
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
          <span class="footer__nav-heading">Explore</span>
          <a href="/projects/" class="footer__nav-link">Systems</a>
          <a href="/articles/" class="footer__nav-link">Field Notes</a>
          <a href="/handbook/" class="footer__nav-link">Handbook</a>
          <a href="/research/" class="footer__nav-link">Research</a>
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
      </nav>
    </div>
    <div class="footer__bottom">
      <div class="container">
        <span class="footer__copy">&copy; 2026 Ghassan Alhamoud — All rights reserved</span>
      </div>
    </div>
  </footer>"""


def page(*, title, description, canonical, body, schemas=(), og_type="article", body_class=""):
    if len(description) > 160:
        description = description[:157].rstrip() + "..."
    ld = "".join(
        f'\n  <script type="application/ld+json">\n{json.dumps(s, indent=2, ensure_ascii=False)}\n  </script>'
        for s in schemas)
    return f"""<!DOCTYPE html>
<html lang="en" data-theme="nature">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>{esc(title)}</title>
  <meta name="description" content="{esc(description)}" />
  <meta name="author" content="{AUTHOR}" />
  <link rel="canonical" href="{canonical}" />

  <meta property="og:type" content="{og_type}" />
  <meta property="og:url" content="{canonical}" />
  <meta property="og:title" content="{esc(title)}" />
  <meta property="og:description" content="{esc(description)}" />
  <meta property="og:image" content="{BASE_URL}/images/og-default.webp" />
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:title" content="{esc(title)}" />
  <meta property="twitter:description" content="{esc(description)}" />
{ld}

  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="alternate" type="application/rss+xml" title="Ghassan Alhamoud — AI Architecture &amp; Automation" href="/rss.xml" />
  <link rel="preload" href="/assets/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="stylesheet" href="/assets/css/main.css" />
  <link rel="stylesheet" href="/assets/css/research.css" />
</head>
<body class="{body_class}">
{header()}

{body}

{FOOTER}

  <script>
    (function() {{
      document.documentElement.classList.add('js');
      try {{
        var saved = localStorage.getItem("theme");
        if (saved) {{ document.documentElement.setAttribute("data-theme", saved); }}
      }} catch (e) {{}}
    }})();
  </script>
  <script src="/assets/js/nav.js" defer></script>
  <script src="/assets/js/research.js" defer></script>
</body>
</html>
"""


# ---------------------------------------------------------------- shared fragments
def prog_url(prog, file=""):
    return f"/research/{prog['slug']}/{file}"


def breadcrumb(prog, trail):
    items = [("Research", "/research/"), (prog["shortTitle"], prog_url(prog))] + trail
    lis = []
    for i, (label, href) in enumerate(items):
        last = i == len(items) - 1
        if href and not last:
            lis.append(f'<li><a href="{href}">{esc(label)}</a></li>')
        elif last:
            # Exactly one breadcrumb item may be the current page, and it is the
            # leaf. An intermediate item without an href (the Part) is the current
            # section, not the current page, so it carries no aria-current.
            lis.append(f'<li aria-current="page">{esc(label)}</li>')
        else:
            lis.append(f'<li>{esc(label)}</li>')
    return f'<nav class="rs-breadcrumb" aria-label="Breadcrumb"><ol>{"".join(lis)}</ol></nav>'


def breadcrumb_schema(prog, trail):
    items = [("Home", BASE_URL + "/"), ("Research", BASE_URL + "/research/"),
             (prog["shortTitle"], BASE_URL + prog_url(prog))] + [(l, BASE_URL + h) for l, h in trail if h]
    return {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": u}
                                for i, (n, u) in enumerate(items)]}


def path_nav(prog, current=None, compact=False):
    """The whole learning path: parts + chapters + reference pages."""
    out = []
    for part in prog["parts"]:
        chs = [c for c in prog["chapters"] if c["part"] == part["id"]]
        lis = []
        for c in chs:
            cur = ' aria-current="page"' if current == c["slug"] else ""
            num = c.get("label", c["id"])
            lis.append(
                f'<li><a href="{c["_file"]}"{cur}><span class="rs-path__num">{esc(num)}</span>'
                f'<span>{esc(c["navTitle"] if "navTitle" in c else c["title"])}</span></a></li>')
        out.append(f'<li class="rs-path__part"><span class="rs-path__part-title">{esc(part["title"])}</span>'
                   f'<ol>{"".join(lis)}</ol></li>')
    refs = [("home", "Overview"), ("summary", "One-page summary"), ("faq", "FAQ"),
            ("glossary", "Glossary"), ("sources", "Sources"), ("method", "Method & scope")]
    cur_attr = ' aria-current="page"'
    ref_lis = "".join(
        f'<li><a href="{REF_PAGES[k]}"{cur_attr if current == k else ""}>{label}</a></li>'
        for k, label in refs)
    return (f'<ol class="rs-path">{"".join(out)}</ol>'
            f'<p class="rs-path__part-title rs-path__ref-title">Reference</p><ul class="rs-path__refs">{ref_lis}</ul>')


def rail(prog, current):
    return (f'<nav class="rs-rail" aria-label="{esc(prog["shortTitle"])} contents">'
            f'<a class="rs-rail__home" href="index.html"><span class="rs-rail__code">{esc(prog["code"])}</span>'
            f'<span class="rs-rail__title">{esc(prog["shortTitle"])}</span></a>{path_nav(prog, current)}</nav>')


def clean_toc_name(name):
    name = re.sub(r"<[^>]+>", "", html.unescape(name))
    name = re.sub(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]", lambda m: m.group(2) or m.group(1), name)
    return re.sub(r"\s*\[[SPDC]\]", "", name).strip()


def toc_list(toc_tokens, cls="rs-toc__list"):
    def walk(tokens, depth=0):
        lis = []
        for t in tokens:
            name = clean_toc_name(t["name"])
            kids = walk(t["children"], depth + 1) if t.get("children") and depth == 0 else ""
            lis.append(f'<li><a href="#{t["id"]}">{esc(name)}</a>{kids}</li>')
        return f"<ul>{''.join(lis)}</ul>" if lis else ""
    return f'<div class="{cls}">{walk(toc_tokens)}</div>'


def mobile_nav(prog, current, toc_tokens=None):
    on_page = ""
    if toc_tokens:
        # Mirror the desktop rail exactly: the mobile disclosure is the same map
        # collapsed, not an H2-only summary of it (bar §2). Walk the same token
        # tree the rail uses, including nested H3s.
        def walk_mobile(tokens):
            lis = []
            for t in tokens:
                kids = walk_mobile(t.get("children", []))
                lis.append(f'<li><a class="on-this-page__link" href="#{t["id"]}">'
                           f'{esc(clean_toc_name(t["name"]))}</a>{kids}</li>')
            return f"<ul>{''.join(lis)}</ul>" if lis else ""
        on_page = ('<details class="on-this-page rs-disclosure"><summary>On this page</summary>'
                   f'<div class="on-this-page__list">{walk_mobile(toc_tokens)}</div></details>')
    return (f'<div class="rs-mobile-nav"><details class="rs-disclosure rs-path-disclosure">'
            f'<summary>Research contents</summary>{path_nav(prog, current)}</details>{on_page}</div>')


def related_block(prog):
    items = []
    for r in prog.get("related", []):
        status = r.get("status", "published")
        badge = f'<span class="rs-badge rs-badge--{status}">{esc(r.get("statusLabel", status.capitalize()))}</span>'
        title = (f'<a href="{esc(r["url"])}">{esc(r["title"])}</a>' if r.get("url") else esc(r["title"]))
        items.append(f'<li class="rs-related__item"><div class="rs-related__head">{title}{badge}</div>'
                     f'<p>{esc(r["relation"])}</p></li>')
    return f'<ul class="rs-related">{"".join(items)}</ul>'


def repos_block(prog):
    repos = prog.get("repositories", [])
    if not repos:
        return ""
    items = "".join(
        f'<li><a href="{esc(r["url"])}" target="_blank" rel="noopener noreferrer">{esc(r["name"])}</a> — {esc(r["description"])}</li>'
        for r in repos)
    return f'<ul class="rs-repos">{items}</ul>'


def evidence_legend():
    rows = "".join(
        f'<li><span class="rs-ev rs-ev--{k.lower()}" aria-hidden="true">{k}</span>'
        f'<strong>{esc(n)}</strong> — {esc(d)}</li>' for k, (n, d) in EVIDENCE.items())
    return f'<ul class="rs-evlegend">{rows}</ul>'


def article_schema(prog, name, url, description, section=None):
    s = {
        "@context": "https://schema.org",
        "@type": ["TechArticle", "LearningResource"],
        "headline": name[:110],
        "description": description[:300],
        "author": {"@type": "Person", "name": AUTHOR, "url": BASE_URL + "/"},
        "datePublished": prog["published"],
        "dateModified": prog["updated"],
        "mainEntityOfPage": BASE_URL + url,
        "isPartOf": {"@type": "CreativeWorkSeries", "name": prog["title"], "url": BASE_URL + prog_url(prog)},
        "inLanguage": "en",
    }
    if section:
        s["articleSection"] = section
    return s


# ---------------------------------------------------------------- chapter pages
def render_chapter(prog, ch, stats):
    src = (prog["_base"] / ch["file"]).read_text(encoding="utf-8")
    r = Renderer(prog, ch["slug"])
    body, toc = r.convert(src)
    words = word_count(body)
    figures = body.count("<figure")
    minutes = reading_minutes(words, figures)
    stats[ch["slug"]] = {"words": words, "figures": figures, "minutes": minutes,
                         "avg_sentence": avg_sentence_length(body), "errors": r.errors,
                         "terms": r.terms_used, "body": body}

    chs = prog["chapters"]
    prev_ch = chs[ch["_index"] - 1] if ch["_index"] > 0 else None
    next_ch = chs[ch["_index"] + 1] if ch["_index"] < len(chs) - 1 else None

    def inline(t):
        h, rr = md_inline(prog, t)
        r.errors.extend(rr.errors)
        for term in rr.terms_used:
            if term not in r.terms_used:
                r.terms_used.append(term)
        return h

    tldr = "".join(f"<li>{inline(t)}</li>" for t in ch["tldr"])
    outcomes = "".join(f"<li>{inline(t)}</li>" for t in ch["outcomes"])
    takeaways = "".join(f"<li>{inline(t)}</li>" for t in ch["takeaways"])

    gl = {t["id"]: t for t in prog["glossary"]}
    terms = "".join(
        f'<li><a href="glossary.html#{tid}"><strong>{esc(gl[tid]["term"])}</strong></a> — {esc(gl[tid]["definition"])}</li>'
        for tid in r.terms_used[:14])
    terms_block = (f'<section class="rs-endblock rs-terms" aria-labelledby="terms-h">'
                   f'<h2 id="terms-h" class="rs-endblock__title">Terms used in this chapter</h2><ul>{terms}</ul></section>'
                   if terms else "")

    def pn(c, rel):
        if not c:
            return (f'<span class="rs-pn__link rs-pn__link--{rel} rs-pn__link--end">'
                    f'<span class="rs-pn__label">{"Back to" if rel == "next" else "Start at"}</span>'
                    f'<a class="rs-pn__title" href="index.html">The overview</a></span>')
        arrow = "← Previous" if rel == "prev" else "Next →"
        return (f'<a class="rs-pn__link rs-pn__link--{rel}" href="{c["_file"]}">'
                f'<span class="rs-pn__label">{arrow} · {esc(chapter_label(c))}</span>'
                f'<span class="rs-pn__title">{esc(c["title"])}</span>'
                f'<span class="rs-pn__part">{esc(c["_part"]["title"])}</span></a>')

    related = ""
    if ch.get("see"):
        items = []
        for s in ch["see"]:
            href = r.resolve_href(s["href"])
            items.append(f'<li><a href="{esc(href)}">{esc(s["title"])}</a>'
                         f'{" — " + esc(s["why"]) if s.get("why") else ""}</li>')
        related = (f'<section class="rs-endblock rs-see" aria-labelledby="see-h"><h2 id="see-h" class="rs-endblock__title">'
                   f'Go deeper</h2><ul>{"".join(items)}</ul></section>')

    url = prog_url(prog, ch["_file"])
    trail = [(ch["_part"]["title"], None), (chapter_label(ch), url)]
    part_pos = [c for c in chs if c["part"] == ch["part"]].index(ch) + 1
    part_len = len([c for c in chs if c["part"] == ch["part"]])
    overall = ch["_index"] + 1

    body_html = f"""  <main id="top" class="rs-page rs-page--chapter">
    <div class="rs-progress" aria-hidden="true"><span class="rs-progress__bar"></span></div>
    <div class="rs-container rs-layout">
      {rail(prog, ch["slug"])}
      <article class="rs-article">
        {breadcrumb(prog, [(ch["_part"]["title"], None), (chapter_label(ch), None)])}
        <header class="rs-hero">
          <p class="rs-kicker"><span class="rs-kicker__part">Part {esc(ch["_part"]["number"])} · {esc(ch["_part"]["title"])}</span><span class="rs-kicker__sep" aria-hidden="true">/</span><span>{esc(chapter_label(ch))}</span></p>
          <h1 class="rs-hero__title">{esc(ch["title"])}</h1>
          <p class="rs-hero__question"><span class="rs-hero__q-label">The question</span> {esc(ch["question"])}</p>
          <div class="rs-meta">
            <span>{minutes} min read</span><span aria-hidden="true">·</span>
            <span>{ch.get("level", "Practitioner")}</span><span aria-hidden="true">·</span>
            <span>Step {overall} of {len(chs)}</span><span aria-hidden="true">·</span>
            <span>{part_pos}/{part_len} in this part</span>
          </div>
        </header>
        {mobile_nav(prog, ch["slug"], toc)}
        <section class="rs-brief" aria-label="Chapter brief">
          <div class="rs-brief__col">
            <h2 class="rs-brief__title">In 30 seconds</h2>
            <ul>{tldr}</ul>
          </div>
          <div class="rs-brief__col rs-brief__col--outcomes">
            <h2 class="rs-brief__title">You will be able to</h2>
            <ul>{outcomes}</ul>
          </div>
        </section>
        <div class="article-single__body rs-body">
{body}
        </div>
        <section class="rs-endblock rs-takeaways" aria-labelledby="takeaways-h">
          <h2 id="takeaways-h" class="rs-endblock__title">Key takeaways</h2>
          <ol>{takeaways}</ol>
        </section>
        {related}
        {terms_block}
        <nav class="rs-pn" aria-label="Chapter navigation">{pn(prev_ch, "prev")}{pn(next_ch, "next")}</nav>
      </article>
      <aside class="rs-toc" aria-label="On this page">
        <p class="rs-toc__title">On this page</p>
        {toc_list(toc)}
        <a class="rs-toc__top" href="#top">Back to top ↑</a>
      </aside>
    </div>
  </main>"""
    desc = ch.get("description") or ch["question"]
    title = f"{ch['title']} — {prog['shortTitle']}"
    if len(title) > 80:
        title = ch["title"][:80]
    return page(title=title, description=desc, canonical=BASE_URL + url, body=body_html,
                schemas=[article_schema(prog, ch["title"], url, desc, ch["_part"]["title"]),
                         breadcrumb_schema(prog, trail)])


# ---------------------------------------------------------------- reference pages
def simple_ref_page(prog, key, title, lede, inner, toc=None, extra_schemas=(), wide=False, body_class=""):
    url = prog_url(prog, REF_PAGES[key])
    label = {"summary": "Summary", "faq": "FAQ", "glossary": "Glossary",
             "sources": "Sources", "method": "Method"}[key]
    body_html = f"""  <main id="top" class="rs-page rs-page--ref rs-page--{key}">
    <div class="rs-progress" aria-hidden="true"><span class="rs-progress__bar"></span></div>
    <div class="rs-container rs-layout{' rs-layout--wide' if wide else ''}">
      {rail(prog, key)}
      <article class="rs-article">
        {breadcrumb(prog, [(label, None)])}
        <header class="rs-hero">
          <p class="rs-kicker"><span class="rs-kicker__part">{esc(prog["code"])} · Reference</span></p>
          <h1 class="rs-hero__title">{esc(title)}</h1>
          <p class="rs-hero__lede">{lede}</p>
        </header>
        {mobile_nav(prog, key, toc)}
        {inner}
      </article>
      <aside class="rs-toc" aria-label="On this page">
        {'<p class="rs-toc__title">On this page</p>' + toc_list(toc) if toc else ''}
      </aside>
    </div>
  </main>"""
    return page(title=f"{title} — {prog['shortTitle']}"[:80], description=re.sub(r"<[^>]+>", "", lede),
                canonical=BASE_URL + url, body=body_html, body_class=body_class,
                schemas=[article_schema(prog, f"{title} — {prog['title']}", url, re.sub(r"<[^>]+>", "", lede)),
                         breadcrumb_schema(prog, [(label, url)]), *extra_schemas])


def render_summary(prog, stats):
    r = Renderer(prog, "summary")
    body, toc = r.convert((prog["_base"] / "summary.md").read_text(encoding="utf-8"))
    stats["_summary"] = {"words": word_count(body), "errors": r.errors, "body": body}
    tiles = "".join(
        f'<div class="rs-stat"><p class="rs-stat__value">{esc(s["value"])}</p>'
        f'<p class="rs-stat__label">{md_inline(prog, s["label"])[0]}</p></div>'
        for s in prog["summaryStats"])
    inner = f"""<div class="rs-onepager">
          <div class="rs-onepager__meta"><span>{esc(prog["title"])}</span><span>{esc(prog["code"])} · v{esc(prog["version"])} · {esc(prog["updated"])}</span></div>
          <div class="rs-stats" role="list">{tiles}</div>
          <div class="article-single__body rs-body rs-body--summary">
{body}
          </div>
          <p class="rs-onepager__actions"><a class="btn btn--primary" href="{prog["chapters"][0]["_file"]}">Start the learning path</a> <button type="button" class="btn btn--secondary rs-print" data-print>Print this page</button></p>
        </div>"""
    return simple_ref_page(prog, "summary", "The one-page summary", esc(prog["summaryLede"]), inner, toc,
                           body_class="rs-print-onepager")


def render_faq(prog, stats):
    text = (prog["_base"] / "faq.md").read_text(encoding="utf-8")
    r = Renderer(prog, "faq")
    groups = re.split(r"^## ", text, flags=re.M)
    out, qa_schema, toc = [], [], []
    count = 0
    for g in groups[1:]:
        gtitle, _, rest = g.partition("\n")
        gid = slugify(gtitle, "-")
        toc.append({"id": gid, "name": gtitle.strip(), "children": []})
        items = []
        for q in re.split(r"^### ", rest, flags=re.M)[1:]:
            qtext, _, ans = q.partition("\n")
            qtext = qtext.strip()
            qid = slugify(qtext, "-")[:80]
            ans_html, _ = r.convert(ans.strip())
            ans_html = re.sub(r'<a class="rs-anchor"[^>]*>.*?</a>', "", ans_html)
            count += 1
            items.append(f'<details class="rs-faq__item" id="{qid}"><summary>{esc(qtext)}</summary>'
                         f'<div class="rs-faq__answer article-single__body">{ans_html}</div></details>')
            plain = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", ans_html))).strip()
            qa_schema.append({"@type": "Question", "name": qtext,
                              "acceptedAnswer": {"@type": "Answer", "text": plain}})
            stats.setdefault("_faq", []).append({"q": qtext, "html": ans_html,
                                                 "words": len(plain.split())})
        out.append(f'<section class="rs-faq__group"><h2 id="{gid}">{esc(gtitle.strip())}</h2>{"".join(items)}</section>')
    stats["_faq_errors"] = r.errors
    inner = f'<p class="rs-faq__tools"><button type="button" class="rs-textbtn" data-expand-all>Expand all answers</button></p><div class="rs-faq">{"".join(out)}</div>'
    schema = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": qa_schema}
    return simple_ref_page(prog, "faq", "Frequently asked questions",
                           f"{count} short answers, each linking to the chapter that makes the full argument.",
                           inner, toc, extra_schemas=[schema])


def render_glossary(prog, stats):
    r = Renderer(prog, "glossary")
    terms = sorted(prog["glossary"], key=lambda t: t["term"].lower())
    letters, items = [], []
    current = None
    for t in terms:
        L = t["term"][0].upper()
        if L != current:
            # A new letter closes the previous <dl> and opens its own: <h2> is not a
            # permitted child of <dl>, and one list per letter keeps the heading
            # outside the description list while preserving the anchor.
            if current is not None:
                items.append("</dl>")
            current = L
            letters.append(L)
            items.append(f'<h2 class="rs-gloss__letter" id="letter-{L.lower()}">{L}</h2>'
                         f'<dl class="rs-gloss__list">')
        note = ""
        if t.get("note"):
            note_html, _ = md_inline(prog, t["note"])
            note = f'<p class="rs-gloss__note">{note_html}</p>'
        intro = ""
        if t.get("chapter"):
            href = r.resolve_href(t["chapter"])
            slug = t["chapter"][3:].split("#")[0]
            ch = next((c for c in prog["chapters"] if c["slug"] == slug), None)
            if ch:
                intro = f'<p class="rs-gloss__see">Introduced in <a href="{esc(href)}">{esc(chapter_label(ch))}: {esc(ch["title"])}</a></p>'
        aliases = (f'<p class="rs-gloss__aliases">Also: {esc(", ".join(t["aliases"]))}</p>' if t.get("aliases") else "")
        items.append(f'<div class="rs-gloss__entry" id="{t["id"]}" data-term="{esc((t["term"] + " " + " ".join(t.get("aliases", []))).lower())}">'
                     f'<dt>{esc(t["term"])}</dt><dd><p>{esc(t["definition"])}</p>{note}{aliases}{intro}</dd></div>')
    if current is not None:
        items.append("</dl>")
    stats["_glossary_errors"] = r.errors
    jump = "".join(f'<a href="#letter-{L.lower()}">{L}</a>' for L in letters)
    inner = f"""<div class="rs-gloss">
          <div class="rs-gloss__tools">
            <label class="rs-gloss__search"><span class="visually-hidden">Filter terms</span><input type="search" placeholder="Filter {len(terms)} terms…" data-gloss-filter /></label>
            <nav class="rs-gloss__jump" aria-label="Jump to letter">{jump}</nav>
          </div>
          {"".join(items)}
          <p class="rs-gloss__empty" hidden>No term matches that filter.</p>
        </div>"""
    schema = {"@context": "https://schema.org", "@type": "DefinedTermSet", "name": f"{prog['title']} — Glossary",
              "hasDefinedTerm": [{"@type": "DefinedTerm", "name": t["term"], "description": t["definition"],
                                  "url": BASE_URL + prog_url(prog, "glossary.html") + "#" + t["id"]} for t in terms]}
    return simple_ref_page(prog, "glossary", "Glossary",
                           f"{len(terms)} terms, defined narrowly. Hover a dotted term in any chapter to see its definition without leaving the page.",
                           inner, None, extra_schemas=[schema])


def render_md_ref(prog, key, title, lede, stats, prefix_html=""):
    r = Renderer(prog, key)
    body, toc = r.convert((prog["_base"] / f"{key}.md").read_text(encoding="utf-8"))
    stats[f"_{key}"] = {"errors": r.errors, "body": body}
    inner = f'{prefix_html}<div class="article-single__body rs-body">{body}</div>'
    return simple_ref_page(prog, key, title, lede, inner, toc)


# ---------------------------------------------------------------- programme home
def render_home(prog, stats):
    r = Renderer(prog, "home")
    home_md = (prog["_base"] / "home.md").read_text(encoding="utf-8")
    body, _ = r.convert(home_md)
    stats["_home"] = {"errors": r.errors, "body": body}
    total_words = sum(s["words"] for k, s in stats.items() if not k.startswith("_"))
    total_min = sum(s["minutes"] for k, s in stats.items() if not k.startswith("_"))
    total_fig = sum(s["figures"] for k, s in stats.items() if not k.startswith("_"))

    finding = "".join(
        f'<li><p class="rs-finding__claim">{md_inline(prog, f["claim"])[0]}</p>'
        f'<p class="rs-finding__detail">{md_inline(prog, f["detail"])[0]}</p></li>' for f in prog["finding"])

    paths = []
    for p in prog["paths"]:
        href = r.resolve_href(p["href"])
        paths.append(f'<a class="rs-entry" href="{esc(href)}"><span class="rs-entry__time">{esc(p["time"])}</span>'
                     f'<span class="rs-entry__title">{esc(p["title"])}</span>'
                     f'<span class="rs-entry__text">{esc(p["text"])}</span><span class="rs-entry__go" aria-hidden="true">→</span></a>')

    by_slug = {c["slug"]: c for c in prog["chapters"]}
    core = [by_slug[slug] for slug in prog["corePath"]]
    core_min = sum(stats[c["slug"]]["minutes"] for c in core)
    core_steps = "".join(
        f'<li><a href="{c["_file"]}"><span class="rs-core__num">{i}</span>'
        f'<span class="rs-core__body"><strong>{esc(c["title"])}</strong>'
        f'<span>{esc(c["question"])}</span></span>'
        f'<span class="rs-core__min">{stats[c["slug"]]["minutes"]} min</span></a></li>'
        for i, c in enumerate(core, 1))

    parts_html = []
    for part in prog["parts"]:
        chs = [c for c in prog["chapters"] if c["part"] == part["id"]]
        mins = sum(stats[c["slug"]]["minutes"] for c in chs)
        lis = "".join(
            f'<li><a class="rs-lp__chapter" href="{c["_file"]}"><span class="rs-lp__num">{esc(c.get("label", c["id"]))}</span>'
            f'<span class="rs-lp__body"><span class="rs-lp__title">{esc(c["title"])}</span>'
            f'<span class="rs-lp__q">{esc(c["question"])}</span></span>'
            f'<span class="rs-lp__min">{stats[c["slug"]]["minutes"]} min</span></a></li>' for c in chs)
        parts_html.append(
            f'<li class="rs-lp__part"><div class="rs-lp__head"><span class="rs-lp__pnum">Part {esc(part["number"])}</span>'
            f'<h3 class="rs-lp__ptitle">{esc(part["title"])}</h3><p class="rs-lp__pintro">{esc(part["intro"])}</p>'
            f'<p class="rs-lp__pmeta">{len(chs)} chapters · {mins} min</p></div><ol class="rs-lp__chapters">{lis}</ol></li>')

    refs = [("summary", "One-page summary", "The whole programme on a page, for a five-minute decision."),
            ("faq", "FAQ", "Short answers to the questions readers ask most."),
            ("glossary", "Glossary", f"{len(prog['glossary'])} terms, narrowly defined."),
            ("sources", "Sources", "Every source, what it supports, and how much to trust it."),
            ("method", "Method & scope", "The question, the commitments, and the bar this work had to meet.")]
    ref_html = "".join(f'<a class="rs-refcard" href="{REF_PAGES[k]}"><span class="rs-refcard__title">{t}</span>'
                       f'<span class="rs-refcard__text">{d}</span></a>' for k, t, d in refs)

    url = prog_url(prog)
    n_app = sum(1 for c in prog["chapters"] if not str(c.get("label", c["id"])).isdigit())
    n_main = len(prog["chapters"]) - n_app
    n_parts = sum(1 for p in prog["parts"] if p["id"] != "reference")
    body_html = f"""  <main id="top" class="rs-page rs-page--home">
    <div class="rs-container rs-home">
      {breadcrumb(prog, [])}
      <header class="rs-home__hero">
        <p class="rs-kicker"><span class="rs-badge rs-badge--code">{esc(prog["code"])}</span><span class="rs-badge rs-badge--{esc(prog["status"])}">{esc(prog["statusLabel"])}</span></p>
        <h1 class="rs-home__title">{esc(prog["title"])}</h1>
        <p class="rs-home__thesis">{esc(prog["thesis"])}</p>
        <p class="rs-home__audience"><strong>Who this is for.</strong> {esc(prog["audience"])}</p>
        <ul class="rs-home__meta">
          <li><strong>{n_main}</strong> chapters in {n_parts} parts{f" + {n_app} appendices" if n_app else ""}</li>
          <li><strong>{round(total_words / 1000)}k</strong> words</li>
          <li><strong>{total_fig}</strong> figures</li>
          <li><strong>{core_min} min</strong> engineer core</li>
          <li><strong>~{round(total_min / 60)} h</strong> complete archive</li>
          <li>Updated <strong>{esc(prog["updated"])}</strong> · v{esc(prog["version"])}</li>
        </ul>
        <div class="rs-home__cta">
          <a class="btn btn--primary" href="summary.html">Read the one-page summary</a>
          <a class="btn btn--secondary" href="#engineer-core">See the engineer core</a>
        </div>
      </header>

      <section class="rs-home__section" aria-labelledby="finding-h">
        <h2 id="finding-h" class="rs-home__h2">The finding in 60 seconds</h2>
        <ol class="rs-finding">{finding}</ol>
      </section>

      <section class="rs-home__section" aria-labelledby="paths-h">
        <h2 id="paths-h" class="rs-home__h2">Choose your path</h2>
        <p class="rs-home__sub">Pick the entry point that matches the time you have. Every path ends with something you can do.</p>
        <div class="rs-entries">{"".join(paths)}</div>
      </section>

      <section id="engineer-core" class="rs-home__section rs-core" aria-labelledby="core-h">
        <div class="rs-core__head">
          <div>
            <p class="rs-core__eyebrow">Recommended for working engineers</p>
            <h2 id="core-h" class="rs-home__h2">The {core_min}-minute engineer core</h2>
          </div>
          <p>{len(core)} chapters carry the complete argument from mechanism to measurement to an operating plan. The remaining chapters are evidence, catalogs and reference material to open when the decision in front of you needs them.</p>
        </div>
        <ol class="rs-core__steps">{core_steps}</ol>
      </section>

      <section class="rs-home__section rs-home__prose">
        <div class="article-single__body rs-body">
{body}
        </div>
      </section>

      <section class="rs-home__section" aria-labelledby="lp-h">
        <h2 id="lp-h" class="rs-home__h2">The learning path</h2>
        <p class="rs-home__sub">Five parts, one arc: understand the problem, learn the methods, measure them, make the hard calls, then act. Each chapter answers one question.</p>
        <ol class="rs-lp">{"".join(parts_html)}</ol>
      </section>

      <section class="rs-home__section" aria-labelledby="ref-h">
        <h2 id="ref-h" class="rs-home__h2">Reference</h2>
        <div class="rs-refcards">{ref_html}</div>
      </section>

      <section class="rs-home__section rs-home__twocol" aria-labelledby="ev-h">
        <div>
          <h2 id="ev-h" class="rs-home__h2">How to read the evidence</h2>
          <p class="rs-home__sub">Every non-obvious number carries a label. Click any label to see its source rules.</p>
          {evidence_legend()}
        </div>
        <div>
          <h2 id="related-h" class="rs-home__h2">Related research</h2>
          {related_block(prog)}
          {('<h3 class="rs-home__h3">Repositories</h3>' + repos_block(prog)) if prog.get("repositories") else ''}
        </div>
      </section>
    </div>
  </main>"""
    schema = article_schema(prog, prog["title"], url, prog["description"])
    schema["@type"] = ["TechArticle", "Report"]
    schema["hasPart"] = [{"@type": "TechArticle", "name": c["title"], "url": BASE_URL + prog_url(prog, c["_file"])}
                         for c in prog["chapters"]]
    return page(title=f"{prog['title']} — Research"[:80], description=prog["description"],
                canonical=BASE_URL + url, body=body_html,
                schemas=[schema, breadcrumb_schema(prog, [])])


# ---------------------------------------------------------------- research index
def render_index(index, progs):
    cards = []
    for entry in index["programmes"]:
        prog = progs.get(entry["slug"])
        if prog:
            cards.append(
                f'<a class="rs-prog" href="/research/{prog["slug"]}/"><span class="rs-prog__top">'
                f'<span class="rs-badge rs-badge--code">{esc(prog["code"])}</span>'
                f'<span class="rs-badge rs-badge--{esc(prog["status"])}">{esc(prog["statusLabel"])}</span></span>'
                f'<span class="rs-prog__title">{esc(prog["title"])}</span>'
                f'<span class="rs-prog__thesis">{esc(prog["thesis"])}</span>'
                f'<span class="rs-prog__meta">{len(prog["chapters"])} chapters · {len(prog["parts"])} parts · updated {esc(prog["updated"])}</span>'
                f'<span class="rs-prog__go">Open the research →</span></a>')
        else:
            cards.append(
                f'<div class="rs-prog rs-prog--upcoming"><span class="rs-prog__top">'
                f'<span class="rs-badge rs-badge--upcoming">In preparation</span></span>'
                f'<span class="rs-prog__title">{esc(entry["title"])}</span>'
                f'<span class="rs-prog__thesis">{esc(entry["question"])}</span></div>')
    body_html = f"""  <main id="top" class="rs-page rs-page--index">
    <div class="rs-container rs-index">
      <header class="rs-index__hero">
        <p class="rs-kicker"><span class="rs-badge rs-badge--code">RSCH</span></p>
        <h1 class="rs-home__title">Research</h1>
        <p class="rs-home__thesis">{esc(index["intro"])}</p>
      </header>
      <section class="rs-index__how" aria-labelledby="how-h">
        <h2 id="how-h" class="rs-home__h2">What every research programme gives you</h2>
        <ul class="rs-index__promise">
          <li><strong>A one-page summary</strong> to decide in five minutes whether it matters to you.</li>
          <li><strong>A learning path</strong> in parts, from the problem to a plan you can run on Monday.</li>
          <li><strong>Evidence labels</strong> on every number, and a sources page that says what was not verified.</li>
          <li><strong>Diagrams, charts, templates and code</strong> you can copy.</li>
          <li><strong>An FAQ and a glossary</strong> for the questions and terms that come up most.</li>
        </ul>
      </section>
      <section aria-labelledby="progs-h">
        <h2 id="progs-h" class="rs-home__h2">Programmes</h2>
        <div class="rs-progs">{"".join(cards)}</div>
      </section>
    </div>
  </main>"""
    schema = {"@context": "https://schema.org", "@type": "CollectionPage", "name": "Research",
              "description": index["description"], "url": BASE_URL + "/research/",
              "author": {"@type": "Person", "name": AUTHOR, "url": BASE_URL + "/"}}
    return page(title="Research — Ghassan Alhamoud", description=index["description"],
                canonical=BASE_URL + "/research/", body=body_html, og_type="website", schemas=[schema])


# ---------------------------------------------------------------- build
def build_programme(slug):
    prog = load_programme(slug)
    out = OUT / slug
    out.mkdir(parents=True, exist_ok=True)
    stats = {}
    pages = {}
    for ch in prog["chapters"]:
        pages[ch["_file"]] = render_chapter(prog, ch, stats)
    pages["summary.html"] = render_summary(prog, stats)
    pages["faq.html"] = render_faq(prog, stats)
    pages["glossary.html"] = render_glossary(prog, stats)
    evidence = f'<section class="rs-ref-legend" id="evidence-labels"><h2 class="rs-endblock__title">Evidence labels</h2>{evidence_legend()}</section>'
    pages["sources.html"] = render_md_ref(prog, "sources", "Sources and evidence",
                                          esc(prog["sourcesLede"]), stats, evidence)
    pages["method.html"] = render_md_ref(prog, "method", "Method, scope and quality bar",
                                         esc(prog["methodLede"]), stats)
    pages["index.html"] = render_home(prog, stats)
    for name, content in pages.items():
        (out / name).write_text(content, encoding="utf-8")
    return prog, stats, pages


def update_discovery(progs):
    """Keep sitemap.xml and llms.txt in sync with the research pages (idempotent)."""
    sitemap = ROOT / "sitemap.xml"
    text = sitemap.read_text(encoding="utf-8")
    text = re.sub(r"\s*<ns0:url>\s*<ns0:loc>https://ghassan-alhamoud\.com/research/.*?</ns0:url>", "", text, flags=re.S)
    entries = [("/research/", 0.9, "weekly", date.today().isoformat())]
    for prog in progs.values():
        pages = ["", "summary.html"] + [c["_file"] for c in prog["chapters"]] + \
                ["faq.html", "glossary.html", "sources.html", "method.html"]
        for p in pages:
            entries.append((f"/research/{prog['slug']}/{p}", 0.9 if p in ("", "summary.html") else 0.7,
                            "monthly", prog["updated"]))
    block = "".join(
        f"\n  <ns0:url>\n    <ns0:loc>{BASE_URL}{u}</ns0:loc>\n    <ns0:lastmod>{d}</ns0:lastmod>\n"
        f"    <ns0:changefreq>{f}</ns0:changefreq>\n    <ns0:priority>{p}</ns0:priority>\n  </ns0:url>"
        for u, p, f, d in entries)
    text = text.replace("\n</ns0:urlset>", block + "\n</ns0:urlset>", 1)
    sitemap.write_text(text, encoding="utf-8")

    llms = ROOT / "llms.txt"
    lt = llms.read_text(encoding="utf-8")
    profile_line = ("- [Research](https://ghassan-alhamoud.com/research/): Long-form, evidence-labelled "
                    "research programmes on AI coding agents, each with a one-page summary, learning path, FAQ and glossary.")
    if "https://ghassan-alhamoud.com/research/)" not in lt:
        lt = lt.replace("\n\n## Open Source Projects", f"\n{profile_line}\n\n## Open Source Projects", 1)
    lines = ["## Research", ""]
    for prog in progs.values():
        lines.append(f"- [{prog['title']}]({BASE_URL}/research/{prog['slug']}/): {prog['description']}")
        lines.append(f"- [{prog['title']}: one-page summary]({BASE_URL}/research/{prog['slug']}/summary.html): "
                     f"The problem, the finding, the first actions and the key numbers on one page.")
    section = "\n".join(lines) + "\n"
    if "## Research\n" in lt:
        lt = re.sub(r"## Research\n.*?(?=\n## |\Z)", section, lt, count=1, flags=re.S)
    else:
        lt = lt.replace("\n## External Profiles", f"\n{section}\n## External Profiles", 1)
    llms.write_text(lt, encoding="utf-8")


def main(argv):
    index = load_index()
    slugs = [p["slug"] for p in index["programmes"] if (CONTENT / p["slug"] / "research.json").exists()]
    if len(argv) > 1:
        slugs = [s for s in slugs if s in argv[1:]]
    progs, all_errors = {}, []
    for slug in slugs:
        prog, stats, pages = build_programme(slug)
        progs[slug] = prog
        errs = []
        for key, s in stats.items():
            if isinstance(s, dict):
                errs += [f"{key}: {e}" for e in s.get("errors", [])]
        errs += [f"faq: {e}" for e in stats.get("_faq_errors", [])]
        errs += [f"glossary: {e}" for e in stats.get("_glossary_errors", [])]
        all_errors += [f"{slug}/{e}" for e in errs]
        words = sum(s["words"] for k, s in stats.items() if not k.startswith("_"))
        print(f"  ✓ {slug}: {len(pages)} pages, {len(prog['chapters'])} chapters, {words:,} words")
    OUT.mkdir(exist_ok=True)
    all_progs = {p["slug"]: load_programme(p["slug"]) for p in index["programmes"]
                 if (CONTENT / p["slug"] / "research.json").exists()}
    (OUT / "index.html").write_text(render_index(index, all_progs), encoding="utf-8")
    print("  ✓ research/index.html")
    update_discovery(all_progs)
    print("  ✓ sitemap.xml and llms.txt")
    if all_errors:
        print("\nBuild warnings:")
        for e in all_errors:
            print(f"  - {e}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
