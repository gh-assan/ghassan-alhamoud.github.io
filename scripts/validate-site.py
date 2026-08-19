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
    report("css-parses", not problems, "; ".join(problems))


# ---------------------------------------------------------------- gate 7
def check_proof_structure():
    index = read(ROOT / "index.html")
    cards = re.findall(r'<article class="system-card[^"]*".*?</article>', index, re.S)
    problems = []
    if len(cards) != 3:
        problems.append(f"expected 3 featured system cards, found {len(cards)}")
    for i, card in enumerate(cards, 1):
        for label in SYSTEM_CARD_LABELS:
            if f'system-card__label">{label}<' not in card:
                problems.append(f"system card {i}: missing '{label}' field")
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
