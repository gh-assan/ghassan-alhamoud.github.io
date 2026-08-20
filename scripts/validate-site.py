#!/usr/bin/env python3
"""
validate-site.py — Release gate for the personal website.

Encodes the non-negotiable acceptance tests from
docs/website-review-2026-08-19/00-quality-bar.md as executable checks.

Usage: python3 scripts/validate-site.py
Exit code 0 when every gate passes, 1 otherwise.

Canonical site decisions (single source of truth for the checks below):
- Origin:        https://ghassan-alhamoud.com
- Role string:   Senior Software Engineer — AI Agent Enabler, Software Architecture
- Nav model:     Systems, Field Notes, Handbook, About (Contact is a footer utility)
"""

import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

ORIGIN = "https://ghassan-alhamoud.com"
ROLE = "Senior Software Engineer — AI Agent Enabler, Software Architecture"
TITLE = f"Ghassan Alhamoud — {ROLE}"
DESCRIPTION = (
    "Senior Software Engineer with 15+ years building backend platforms, "
    "distributed systems, and reliable AI-agent infrastructure. "
    "Formerly at Vinted and Wayfair."
)

# Canonical navigation model applied to every nav-bearing page.
# Fragments are normalized: "#about" and "/#about" are the same destination.
NAV_MODEL = [
    ("Systems", "/projects/"),
    ("Field Notes", "/articles/"),
    ("Handbook", "/handbook/"),
    ("About", "#about"),
]

# Strings that must never appear in a published surface (case-insensitive).
FORBIDDEN = [
    "calendly",
    "app.cal.eu",
    "data-cal-link",
    "cal-widget",
    "book a call",
    "book a free",
    "schedule your free call",
    "accepting new clients",
    "available for new engagements",
    "free 30-min call",
    "newsletter signup",
    "subscribe",
]

PUBLISHED_GLOBS = ["*.html", "rss.xml", "sitemap.xml", "llms.txt"]
PUBLISHED_DIRS = ["", "articles", "projects", "handbook", "connect", "assets"]
EXTRA_CODE_GLOBS = ["assets/js/*.js", "assets/css/*.css", "scripts/*.py"]

CV_TIMELINE = [
    "11/2021 — 06/2026",  # Vinted
    "11/2020 — 11/2021",  # PlusDental
    "02/2019 — 10/2020",  # Wayfair
    "01/2018 — 01/2019",  # secu-ring
    "07/2016 — 07/2017",  # Applicata
    "04/2014 — 02/2016",  # Logos
    "2007 — 2012",        # Billcom
]
CV_COMPANIES = ["Vinted", "PlusDental", "Wayfair", "secu-ring", "Applicata", "Logos", "Billcom"]

SYSTEM_CARD_LABELS = ["Problem", "Design", "Status", "Evidence", "Boundary"]

results = []  # (gate, ok, message)


def report(gate, ok, message=""):
    results.append((gate, ok, message))


def published_files():
    files = []
    for d in PUBLISHED_DIRS:
        base = ROOT / d if d else ROOT
        for g in PUBLISHED_GLOBS:
            files.extend(base.glob(g))
    return sorted(set(files))


def code_files():
    files = []
    for g in EXTRA_CODE_GLOBS:
        files.extend(ROOT.glob(g))
    return sorted(set(files))


def read(p):
    return p.read_text(encoding="utf-8")


def normalize_href(href):
    href = href.strip()
    if href.startswith("/#"):
        return href[1:]
    return href


# ---------------------------------------------------------------- gate 1
def check_forbidden_surfaces():
    offenders = []
    targets = published_files() + code_files()
    # The validator and the cleanup migration contain the patterns by design.
    exempt = {Path(__file__).name, "clean-booking-surfaces.py"}
    for f in targets:
        if f.name in exempt:
            continue
        text = read(f).lower()
        for pat in FORBIDDEN:
            if pat.lower() in text:
                offenders.append(f"{f.relative_to(ROOT)}: '{pat}'")
    report("forbidden-surfaces", not offenders,
           "; ".join(offenders[:12]) + (" ..." if len(offenders) > 12 else ""))


# ---------------------------------------------------------------- gate 2
def check_canonical_identity():
    problems = []

    self_name = Path(__file__).name
    for f in published_files() + code_files():
        if f.name == self_name:
            continue
        if "ghassanalhamoud.github.io" in read(f):
            problems.append(f"{f.relative_to(ROOT)}: old github.io origin")

    index = read(ROOT / "index.html")

    m = re.search(r'<link rel="canonical" href="([^"]+)"', index)
    if not m or m.group(1) != ORIGIN + "/":
        problems.append("index.html: canonical link missing or wrong")

    for prop in ("og:url", "twitter:url"):
        m = re.search(rf'property="{prop}" content="([^"]+)"', index)
        if not m or m.group(1) != ORIGIN + "/":
            problems.append(f"index.html: {prop} missing or wrong")

    persons = re.findall(r'"@type":\s*"Person"', index)
    if len(persons) != 1:
        problems.append(f"index.html: expected 1 Person JSON-LD block, found {len(persons)}")

    if f"<title>{TITLE}</title>" not in index:
        problems.append("index.html: <title> does not match canonical title")
    m = re.search(r'"jobTitle":\s*"([^"]+)"', index)
    if not m or m.group(1) != ROLE:
        problems.append("index.html: JSON-LD jobTitle does not match canonical role")

    for fname in ("rss.xml", "sitemap.xml", "llms.txt"):
        text = read(ROOT / fname)
        if ORIGIN not in text:
            problems.append(f"{fname}: canonical origin missing")

    report("canonical-identity", not problems, "; ".join(problems[:10]))


# ---------------------------------------------------------------- gate 3
def check_employment_timeline():
    problems = []
    for f in published_files():
        if "Yes Soft" in read(f):
            problems.append(f"{f.relative_to(ROOT)}: still contains Yes Soft")

    index = read(ROOT / "index.html")
    for company in CV_COMPANIES:
        if company not in index:
            problems.append(f"index.html: missing employer {company}")
    for dates in CV_TIMELINE:
        if dates not in index:
            problems.append(f"index.html: missing CV date range '{dates}'")
    report("employment-timeline", not problems, "; ".join(problems[:10]))


# ---------------------------------------------------------------- gate 4
def check_navigation_contract():
    problems = []
    link_re = re.compile(
        r'<a href="([^"]+)" class="nav__link[^"]*"[^>]*>([^<]+)</a>')
    nav_pages = 0
    for f in sorted(ROOT.rglob("*.html")):
        if "docs" in f.parts or "nav__menu" not in read(f):
            continue
        nav_pages += 1
        text = read(f)
        menu = re.search(r'<ul class="nav__menu".*?</ul>', text, re.S)
        if not menu:
            problems.append(f"{f.relative_to(ROOT)}: nav menu not parseable")
            continue
        links = [(label.strip(), normalize_href(h))
                 for h, label in link_re.findall(menu.group(0))]
        expected = [(label, normalize_href(h)) for label, h in NAV_MODEL]
        if links != expected:
            problems.append(f"{f.relative_to(ROOT)}: nav {links}")
    if nav_pages == 0:
        problems.append("no nav-bearing pages found")
    report("navigation-contract", not problems,
           f"checked {nav_pages} pages; " + "; ".join(problems[:8]))


# ---------------------------------------------------------------- gate 5
def check_reduced_motion():
    css = read(ROOT / "assets/css/main.css")
    ok_css = "@media (prefers-reduced-motion: reduce)" in css
    js_ok = True
    for name in ("carousel.js", "particles.js", "counters.js"):
        p = ROOT / "assets/js" / name
        if p.exists() and "prefers-reduced-motion" not in read(p):
            js_ok = False
    report("reduced-motion", ok_css and js_ok,
           "" if (ok_css and js_ok) else "missing prefers-reduced-motion coverage")


# ---------------------------------------------------------------- gate 6
def check_css_parses():
    problems = []
    for f in sorted((ROOT / "assets/css").glob("*.css")):
        text = read(f)
        # comment balance: every */ must close an open /*
        depth = 0
        i = 0
        while i < len(text):
            two = text[i:i + 2]
            if two == "/*":
                depth += 1
                i += 2
                continue
            if two == "*/":
                depth -= 1
                i += 2
                if depth < 0:
                    problems.append(f"{f.name}: '*/' without opening comment")
                    depth = 0
                continue
            i += 1
        if depth != 0:
            problems.append(f"{f.name}: unclosed comment")
        if text.count("{") != text.count("}"):
            problems.append(f"{f.name}: unbalanced braces "
                            f"({text.count('{')} vs {text.count('}')})")
        # every referenced keyframe must be defined, and vice versa
        used = set(re.findall(r'animation:\s*([\w-]+)', text)) - {"none"}
        defined = set(re.findall(r'@keyframes\s+([\w-]+)', text))
        for name in sorted(used - defined):
            problems.append(f"{f.name}: animation '{name}' has no @keyframes")
    report("css-parses", not problems, "; ".join(problems))


# ---------------------------------------------------------------- gate 7
def check_proof_structure():
    """Homepage curates (slim cards); project detail pages carry the full proof."""
    problems = []
    index = read(ROOT / "index.html")
    if 'system-card__label"' in index:
        problems.append("index.html: homepage cards must stay slim — "
                        "Problem/Design/Evidence/Boundary belong on detail pages")
    for f in sorted((ROOT / "projects").glob("*.html")):
        if f.name == "index.html":
            continue
        text = read(f).lower()
        for field in ("problem", "design", "evidence", "boundary"):
            if field not in text:
                problems.append(f"projects/{f.name}: missing '{field}' section")
    report("proof-structure", not problems, "; ".join(problems[:10]))


# ---------------------------------------------------------------- gate 8
def check_metrics():
    problems = []
    index = read(ROOT / "index.html")
    articles = json.loads(read(ROOT / "articles/articles.json"))
    projects = json.loads(read(ROOT / "projects/projects.json"))

    m = re.search(r'data-target="(\d+)"[^>]*data-metric="articles"', index)
    if not m or int(m.group(1)) != len(articles):
        problems.append(
            f"articles counter must equal articles.json count ({len(articles)})")
    m = re.search(r'data-target="(\d+)"[^>]*data-metric="systems"', index)
    if not m or int(m.group(1)) != len(projects):
        problems.append(
            f"systems counter must equal projects.json count ({len(projects)})")
    # Every metric must carry a scope note.
    scopes = re.findall(r'class="counter__scope"', index)
    counters = re.findall(r'class="counter[\s"]', index)
    if len(scopes) < len(counters) or len(counters) == 0:
        problems.append("every counter needs a counter__scope note")
    # Unsupported absolute claims must not appear.
    for pat in ("zero data loss", "bulletproof", "genuinely new category",
                "0</span>\n                <span class=\"case-study__metric-label\">Hallucinatory"):
        if pat.lower() in index.lower():
            problems.append(f"unsupported claim still present: '{pat}'")
    report("metrics", not problems, "; ".join(problems))


# ---------------------------------------------------------------- gate 9
def check_internal_links():
    problems = []
    attr_re = re.compile(r'(?:href|src)="([^"#][^"]*)"')
    for f in published_files():
        for m in attr_re.finditer(read(f)):
            url = m.group(1)
            if url.startswith(("http://", "https://", "mailto:", "tel:",
                               "data:", "javascript:")):
                continue
            path = url.split("#")[0].split("?")[0]
            if not path:
                continue
            if path.startswith("/"):
                target = ROOT / path.lstrip("/")
            else:
                target = (f.parent / path)
            if path.endswith("/"):
                ok = (target / "index.html").exists()
            elif "." not in Path(path).name:
                ok = (target / "index.html").exists() or target.exists()
            else:
                ok = target.exists()
            if not ok:
                problems.append(f"{f.relative_to(ROOT)}: {url}")
    report("internal-links", not problems,
           "; ".join(problems[:10]) + (" ..." if len(problems) > 10 else ""))


# --------------------------------------------------------------- gate 10
def check_legal_pages():
    problems = []
    for page in ("impressum.html", "privacy.html"):
        p = ROOT / page
        if not p.exists():
            problems.append(f"{page} missing")
            continue
        text = read(p)
        if "galhamoud@gmx.de" not in text:
            problems.append(f"{page}: contact email missing")
    index = read(ROOT / "index.html")
    for page in ("impressum.html", "privacy.html"):
        if f"/{page}" not in index:
            problems.append(f"index.html footer does not link /{page}")
    priv = read(ROOT / "privacy.html") if (ROOT / "privacy.html").exists() else ""
    for needle in ("localStorage", "GitHub Pages"):
        if needle.lower() not in priv.lower():
            problems.append(f"privacy.html: actual data flow '{needle}' not described")
    report("legal-pages", not problems, "; ".join(problems))


# --------------------------------------------------------------- gate 11
def check_content_validators():
    cmds = [
        ["python3", "scripts/validate-articles.py"],
        ["python3", "scripts/validate-projects.py"],
        ["python3", "scripts/validate-handbook.py"],
        ["python3", "-m", "unittest", "discover", "-s", "tests", "-q"],
    ]
    problems = []
    for cmd in cmds:
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
        if r.returncode != 0:
            tail = (r.stdout + r.stderr).strip().splitlines()[-3:]
            problems.append(f"{' '.join(cmd)}: " + " | ".join(tail))
    report("content-validators", not problems, "; ".join(problems[:6]))


# --------------------------------------------------------------- gate 12
def check_static_first():
    problems = []
    index = read(ROOT / "index.html")
    if "Loading projects" in index or "Loading articles" in index:
        problems.append("index.html: core proof still depends on JS fetch")
    # Homepage must ship static featured systems + curated field notes.
    if "system-card" not in index:
        problems.append("index.html: no static system cards")
    if not re.search(r'class="field-note"', index):
        problems.append("index.html: no static curated field notes")

    for page, needle, minimum in (
        ("projects/index.html", 'class="article-card project-card', 6),
        ("articles/index.html", 'class="article-card"', 30),
    ):
        text = read(ROOT / page)
        count = len(re.findall(needle, text))
        if count < minimum:
            problems.append(f"{page}: only {count} static cards (need {minimum})")
    report("static-first", not problems, "; ".join(problems))


# --------------------------------------------------------------- gate 13
def check_no_inline_article_styles():
    """One visual system: no page-level style forks, no undefined variables."""
    problems = []
    for f in sorted((ROOT / "articles").glob("*.html")):
        if f.name == "index.html":
            continue
        if "<style" in read(f):
            problems.append(f"articles/{f.name}: inline <style> block")
    self_name = Path(__file__).name
    for f in published_files() + code_files():
        if f.name == self_name:
            continue
        text = read(f)
        for var in ("var(--dark", "var(--card"):
            if var in text:
                problems.append(f"{f.relative_to(ROOT)}: undefined {var})")
                break
    report("no-inline-article-styles", not problems, "; ".join(problems[:10]))


# --------------------------------------------------------------- gate 14
def check_reveal_failsafe():
    """Content exists by default; reveal is progressive enhancement with a failsafe."""
    problems = []
    js_path = ROOT / "assets/js/reveal.js"
    js = read(js_path)
    if "setTimeout" not in js:
        problems.append("reveal.js: no timed failsafe that force-reveals content")
    if "getBoundingClientRect" not in js:
        problems.append("reveal.js: no immediate reveal of in-viewport content on load")
    hero = re.search(r'<section class="hero".*?</section>',
                     read(ROOT / "index.html"), re.S)
    if hero and "reveal" in hero.group(0):
        problems.append("index.html: hero content still gated behind .reveal")
    report("reveal-failsafe", not problems, "; ".join(problems))


# --------------------------------------------------------------- gate 15
def check_counters_fallback():
    """Counters render accurate final values in HTML; animation must not blank them."""
    problems = []
    js = read(ROOT / "assets/js/counters.js")
    if re.search(r"textContent\s*=\s*['\"]0", js):
        problems.append("counters.js: resets rendered value to '0' before animating")
    index = read(ROOT / "index.html")
    spans = re.findall(
        r'<span class="counter__number"([^>]*)>([^<]*)</span>', index)
    if not spans:
        problems.append("index.html: no counter__number spans found")
    for attrs, text in spans:
        target = re.search(r'data-target="(\d+)"', attrs)
        suffix = re.search(r'data-suffix="([^"]*)"', attrs)
        if not target:
            problems.append("counter span without data-target")
            continue
        expected = target.group(1) + (suffix.group(1) if suffix else "")
        if text.strip() != expected:
            problems.append(f"counter renders '{text.strip()}', expected '{expected}'")
    report("counters-fallback", not problems, "; ".join(problems))


# --------------------------------------------------------------- gate 16
def check_touch_targets():
    """Interactive targets must be at least 44x44px."""
    problems = []
    css = read(ROOT / "assets/css/main.css")

    def rule_text(selector):
        m = re.search(re.escape(selector) + r'\s*\{([^}]*)\}', css)
        return m.group(1) if m else None

    toggle = rule_text(".nav__toggle")
    if not toggle or not re.search(r'min-width:\s*44px', toggle) \
            or not re.search(r'min-height:\s*44px', toggle):
        problems.append(".nav__toggle: hit area below 44x44px")
    social = rule_text(".footer__social-link")
    if not social or not re.search(r'(min-)?width:\s*44px', social) \
            or not re.search(r'(min-)?height:\s*44px', social):
        problems.append(".footer__social-link: hit area below 44x44px")
    report("touch-targets", not problems, "; ".join(problems))


# --------------------------------------------------------------- gate 17
def check_shell_parity():
    """404 and Connect must use the standard shell, not a forked one."""
    problems = []
    for page in ("404.html", "connect/index.html"):
        text = read(ROOT / page)
        for needle in ("nav__menu", "nav__toggle", "footer__nav",
                       "/assets/js/nav.js"):
            if needle not in text:
                problems.append(f"{page}: missing standard shell piece '{needle}'")
        if "<style" in text:
            problems.append(f"{page}: inline <style> block (forked visual system)")
    report("shell-parity", not problems, "; ".join(problems))


# --------------------------------------------------------------- gate 18
def check_scroll_spy_contract():
    """Homepage section activity must map to route nav links."""
    js = read(ROOT / "assets/js/nav.js")
    problems = []
    for needle in ("systems", "/projects/", "/articles/"):
        if needle not in js:
            problems.append(f"nav.js: scroll-spy mapping missing '{needle}'")
    report("scroll-spy-contract", not problems, "; ".join(problems))


# --------------------------------------------------------------- gate 19
def check_homepage_card_contract():
    """Homepage system cards: summary, one proof, status, <=3 tags, one action;
    exactly one flagship."""
    problems = []
    index = read(ROOT / "index.html")
    cards = re.findall(r'<article class="system-card[^"]*"[^>]*>.*?</article>',
                       index, re.S)
    if len(cards) != 3:
        problems.append(f"expected 3 system cards, found {len(cards)}")
    flagship = sum(1 for c in cards if "system-card--flagship" in c)
    if flagship != 1:
        problems.append(f"expected exactly 1 flagship card, found {flagship}")
    for i, card in enumerate(cards, 1):
        if "system-card__proof" not in card:
            problems.append(f"card {i}: missing system-card__proof")
        if "system-card__action" not in card:
            problems.append(f"card {i}: missing system-card__action")
        tags = len(re.findall(r'system-card__tag[">\s]', card))
        if tags > 3:
            problems.append(f"card {i}: {tags} tags (max 3)")
    report("homepage-card-contract", not problems, "; ".join(problems[:10]))


# --------------------------------------------------------------- gate 20
def check_hero_contract():
    """Hero: short claim, short support, one primary action."""
    problems = []
    index = read(ROOT / "index.html")
    hero = re.search(r'<section class="hero".*?</section>', index, re.S)
    if not hero:
        report("hero-contract", False, "hero section not found")
        return
    block = hero.group(0)
    h1 = re.search(r'<h1 class="hero__title">(.*?)</h1>', block, re.S)
    if not h1:
        problems.append("hero title missing")
    else:
        text = re.sub(r"<[^>]+>", "", h1.group(1)).strip()
        if len(text) > 64:
            problems.append(f"H1 is {len(text)} chars (max 64): '{text}'")
    sub = re.search(r'<p class="hero__subtitle">(.*?)</p>', block, re.S)
    if not sub:
        problems.append("hero subtitle missing")
    else:
        text = re.sub(r"<[^>]+>", "", sub.group(1)).strip()
        if len(text) > 160:
            problems.append(f"subtitle is {len(text)} chars (max 160)")
    primaries = len(re.findall(r'btn--primary', block))
    if primaries != 1:
        problems.append(f"hero has {primaries} primary buttons (need exactly 1)")
    report("hero-contract", not problems, "; ".join(problems))


# --------------------------------------------------------------- gate 21
def check_handbook_mobile_toc():
    """Every handbook chapter exposes an 'On this page' control for small screens."""
    problems = []
    for f in sorted((ROOT / "handbook").glob("chapter-*.html")):
        if "on-this-page" not in read(f):
            problems.append(f"handbook/{f.name}: no on-this-page control")
    report("handbook-mobile-toc", not problems, "; ".join(problems[:10]))


# --------------------------------------------------------------- gate 22
def check_fieldnotes_curation():
    """Field Notes index: one featured note plus a way to narrow the archive."""
    problems = []
    text = read(ROOT / "articles/index.html")
    if "article-card--featured" not in text:
        problems.append("articles/index.html: no featured note")
    if 'type="search"' not in text:
        problems.append("articles/index.html: no search/topic filter control")
    report("fieldnotes-curation", not problems, "; ".join(problems))


# --------------------------------------------------------------- gate 23
def check_owned_visual_language():
    """No borrowed-brand cues; homepage families use distinct compositions."""
    problems = []
    for f in sorted((ROOT / "assets/css").glob("*.css")):
        if "thoughtworks" in read(f).lower():
            problems.append(f"{f.name}: borrowed-brand reference 'ThoughtWorks'")
    index = read(ROOT / "index.html")
    principles = re.search(r'<section class="process.*?</section>', index, re.S)
    if principles and ("system-card" in principles.group(0)
                       or "article-card" in principles.group(0)):
        problems.append("principles section reuses the card composition")
    report("owned-visual-language", not problems, "; ".join(problems))


# --------------------------------------------------------------- gate 24
def check_tablet_principles():
    """The process row must not activate below 900px (no 3x208px row at 768px)."""
    problems = []
    css = read(ROOT / "assets/css/main.css")
    for m in re.finditer(r'@media\s*\(min-width:\s*(\d+)px\)\s*\{', css):
        start = int(m.group(1))
        # scan forward a bounded window for a process__steps layout activation
        window = css[m.end():m.end() + 1200]
        if "process__steps" in window and start < 900:
            problems.append(
                f"process__steps layout activates at {start}px (< 900px)")
    report("tablet-principles", not problems, "; ".join(problems))


GATES = [
    check_forbidden_surfaces,
    check_canonical_identity,
    check_employment_timeline,
    check_navigation_contract,
    check_reduced_motion,
    check_css_parses,
    check_proof_structure,
    check_metrics,
    check_internal_links,
    check_legal_pages,
    check_content_validators,
    check_static_first,
    check_no_inline_article_styles,
    check_reveal_failsafe,
    check_counters_fallback,
    check_touch_targets,
    check_shell_parity,
    check_scroll_spy_contract,
    check_homepage_card_contract,
    check_hero_contract,
    check_handbook_mobile_toc,
    check_fieldnotes_curation,
    check_owned_visual_language,
    check_tablet_principles,
]


def main():
    for gate in GATES:
        try:
            gate()
        except Exception as exc:  # a crashed gate is a failed gate
            report(gate.__name__, False, f"crashed: {exc}")

    width = max(len(g) for g, _, _ in results)
    failed = 0
    for gate, ok, message in results:
        mark = "PASS" if ok else "FAIL"
        if not ok:
            failed += 1
        line = f"[{mark}] {gate.ljust(width)}"
        if message and not ok:
            line += f"  — {message}"
        print(line)
    print()
    if failed:
        print(f"{failed}/{len(results)} gates failing — bar not met.")
        return 1
    print(f"All {len(results)} gates pass — bar met.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
