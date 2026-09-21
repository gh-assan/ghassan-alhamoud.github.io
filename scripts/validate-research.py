#!/usr/bin/env python3
"""
validate-research.py — executable quality bar for /research/.

Implements gates R1–R30 from docs/research-section/00-research-quality-bar.md.
Run after scripts/build-research.py. Exit 0 when every gate passes.

    python3 scripts/validate-research.py
"""

import html
import importlib.util
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content" / "research"
OUT = ROOT / "research"
SITEMAP = ROOT / "sitemap.xml"
LLMS = ROOT / "llms.txt"
BASE_URL = "https://ghassan-alhamoud.com"

_spec = importlib.util.spec_from_file_location("build_research", ROOT / "scripts" / "build-research.py")
build = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(build)

REQUIRED_PROG = ["slug", "code", "title", "shortTitle", "thesis", "description", "status", "statusLabel",
                 "version", "published", "updated", "summaryLede", "sourcesLede", "methodLede",
                 "summaryStats", "finding", "paths", "parts", "chapters", "related"]
REQUIRED_CH = ["id", "slug", "part", "file", "title", "question", "tldr", "outcomes", "takeaways"]
SUMMARY_SECTIONS = ["The problem", "The finding", "What to do first", "The numbers that matter",
                    "What not to do", "Where to go next"]
HYPE = ["revolutionary", "game-changing", "game changer", "unlock the power", "supercharge",
        "bulletproof", "cutting-edge", "seamless", "leverage the power", "10x your"]
MAX_WORDS = 6500
SENTENCE_HARD, SENTENCE_WARN = 26, 22


class Report:
    def __init__(self):
        self.errors, self.warnings = [], []

    def err(self, gate, msg):
        self.errors.append(f"[{gate}] {msg}")

    def warn(self, gate, msg):
        self.warnings.append(f"[{gate}] {msg}")


def text_of(fragment):
    return html.unescape(re.sub(r"<[^>]+>", " ", fragment))


# ---------------------------------------------------------------- source gates
def check_programme(slug, rep):
    base = CONTENT / slug
    try:
        prog = build.load_programme(slug)
    except (OSError, KeyError, json.JSONDecodeError) as e:
        rep.err("R1", f"{slug}: cannot load research.json: {e}")
        return None

    for f in REQUIRED_PROG:
        if f not in prog or prog[f] in ("", [], None):
            rep.err("R1", f"{slug}: missing field '{f}'")

    ids = [c["id"] for c in prog["chapters"]]
    slugs = [c["slug"] for c in prog["chapters"]]
    if len(set(ids)) != len(ids) or len(set(slugs)) != len(slugs):
        rep.err("R2", f"{slug}: chapter ids or slugs are not unique")
    part_ids = {p["id"] for p in prog["parts"]}
    if not 3 <= len(prog["parts"]) <= 7:
        rep.err("R2", f"{slug}: {len(prog['parts'])} parts (expected 3–6 plus reference)")
    for c in prog["chapters"]:
        label = f"{slug}/{c.get('slug', '?')}"
        for f in REQUIRED_CH:
            if f not in c:
                rep.err("R1", f"{label}: missing field '{f}'")
        if c.get("part") not in part_ids:
            rep.err("R2", f"{label}: unknown part {c.get('part')}")
        if not (base / c["file"]).is_file():
            rep.err("R3", f"{label}: source {c['file']} missing")
        q = c.get("question", "")
        if not q.endswith("?") or len(q) > 140:
            rep.err("R5", f"{label}: question must end with '?' and be ≤140 chars ({len(q)})")
        tl = c.get("tldr", [])
        if not 2 <= len(tl) <= 4 or any(len(t) > 220 for t in tl):
            rep.err("R6", f"{label}: tldr needs 2–4 items of ≤220 chars")
        if not 2 <= len(c.get("outcomes", [])) <= 5:
            rep.err("R7", f"{label}: outcomes needs 2–5 items")
        if not 3 <= len(c.get("takeaways", [])) <= 6:
            rep.err("R8", f"{label}: takeaways needs 3–6 items")
    return prog


def check_rendered_content(prog, rep):
    slug = prog["slug"]
    stats = {}
    for c in prog["chapters"]:
        label = f"{slug}/{c['slug']}"
        src = (prog["_base"] / c["file"]).read_text(encoding="utf-8")
        r = build.Renderer(prog, c["slug"])
        body, _ = r.convert(src)
        for e in r.errors:
            rep.err("R15" if "glossary" in e else "R16", f"{label}: {e}")
        figures = body.count("<figure")
        if figures < 1 and not c.get("visualExempt"):
            rep.err("R9", f"{label}: no figure and no visualExempt reason")
        words = build.word_count(body)
        if words > MAX_WORDS:
            rep.err("R10", f"{label}: {words} words (max {MAX_WORDS}); split the chapter")
        if re.search(r"<h1\b", body):
            rep.err("R11", f"{label}: H1 in body")
        levels = [int(h) for h in re.findall(r"<h([2-6])\b", body)]
        prev = 1
        for lv in levels:
            if lv > prev + 1:
                rep.err("R11", f"{label}: heading level skips from h{prev} to h{lv}")
                break
            prev = lv
        for chart in re.findall(r'<figure class="diagram rs-chart".*?</figure>', body, re.S):
            if "<figcaption>" not in chart or 'class="chart-data"' not in chart:
                rep.err("R18", f"{label}: chart without caption or data table")
        avg = build.avg_sentence_length(body)
        if avg > SENTENCE_HARD:
            rep.err("R19", f"{label}: average sentence length {avg:.1f} words (hard max {SENTENCE_HARD})")
        elif avg > SENTENCE_WARN:
            rep.warn("R19", f"{label}: average sentence length {avg:.1f} words (target ≤{SENTENCE_WARN})")
        prose = build.prose_text(body)
        if "§" in prose:
            rep.err("R20", f"{label}: section shorthand '§' in prose")
        low = prose.lower()
        for word in HYPE:
            if word in low:
                rep.err("R21", f"{label}: hype word '{word}'")
        check_composite_labels(label, src, rep)
        check_source_benchmark_attribution(label, src, rep)
        stats[c["slug"]] = {"words": words, "figures": figures, "avg": avg, "terms": r.terms_used}
    check_composite_consistency(prog, rep)
    return stats


# Figures that are only meaningful with the benchmark they were measured on (bar §5:
# "A result measured on one benchmark is quoted with that benchmark"). Keyed by the
# value as it appears in prose; the value must appear within R32_WINDOW chars of the
# benchmark name. Add entries here when a new load-bearing benchmark figure lands.
BENCHMARK_BOUND = {
    "6.5": "SWE-bench",
    "SWE-bench Verified": "SWE-bench",
    "AppWorld": "AppWorld",
}
R32_WINDOW = 160


def check_source_benchmark_attribution(label, src, rep):
    """R32: a benchmark-specific result is never quoted without its benchmark."""
    for value, bench in BENCHMARK_BOUND.items():
        for m in re.finditer(re.escape(value), src):
            window = src[max(0, m.start() - R32_WINDOW): m.end() + R32_WINDOW]
            if bench not in window:
                line = src[:m.start()].count("\n") + 1
                rep.err("R32", f"{label}:{line}: '{value}' quoted without its benchmark "
                               f"'{bench}'")


def check_composite_labels(label, src, rep):
    """R31: a [C] composite case is labelled in its heading.

    Bar §5: composites are labelled in the heading of any worked example or case
    that uses them, not only inline. Only case-style headings are checked (a
    chapter section may legitimately quote a [C] figure inline); the signal is a
    heading whose block opens a worked example or case.
    """
    blocks = re.split(r"^(#{2,4} .*)$", src, flags=re.M)
    # blocks = [pre, heading, body, heading, body, ...]
    for i in range(1, len(blocks) - 1, 2):
        heading, body = blocks[i], blocks[i + 1]
        if "[C]" in heading:
            continue
        # Case/worked-example headings only: CS-n, "Worked example", "The audit that…".
        if not re.match(r"^#{2,4}\s*(CS-\d+|Worked example|A worked audit)", heading, re.I):
            continue
        if "[C]" in body:
            clean = re.sub(r"\{#[^}]*\}", "", heading).strip()
            rep.err("R31", f"{label}: heading '{clean[:60]}' hosts a [C] composite "
                           f"but is not labelled [C]")


def check_composite_consistency(prog, rep):
    """R31b: the same worked audit quoted across chapters must agree.

    Compares every "<n>K of definitions" / "recovered <n>K" pair found in chapter
    sources, so one incident cannot be published with several totals.
    """
    figures = {}
    for c in prog["chapters"]:
        src = (prog["_base"] / c["file"]).read_text(encoding="utf-8")
        for m in re.finditer(r"([\d,]+)K of definitions", src):
            figures.setdefault("definitions", {}).setdefault(m.group(1), []).append(c["slug"])
        for m in re.finditer(r"Recovered: ([\d,.]+)K tokens, (\d+)% of the window", src):
            figures.setdefault("recovered", {}).setdefault(
                (m.group(1), m.group(2)), []).append(c["slug"])
    for kind, seen in figures.items():
        if len(seen) > 1:
            detail = "; ".join(f"{k}: {', '.join(v)}" for k, v in seen.items())
            rep.err("R31", f"{prog['slug']}: worked-audit {kind} figures disagree — {detail}")


def check_reference_sources(prog, rep):
    slug = prog["slug"]
    base = prog["_base"]
    # R12 summary
    r = build.Renderer(prog, "summary")
    body, toc = r.convert((base / "summary.md").read_text(encoding="utf-8"))
    words = build.word_count(body)
    if words > 750:
        rep.err("R12", f"{slug}: summary is {words} words (max 750)")
    names = [build.clean_toc_name(t["name"]) for t in toc]
    for s in SUMMARY_SECTIONS:
        if s not in names:
            rep.err("R12", f"{slug}: summary missing section '{s}'")
    for e in r.errors:
        rep.err("R16", f"{slug}/summary: {e}")
    # R13 FAQ
    faq = (base / "faq.md").read_text(encoding="utf-8")
    questions = re.split(r"^### ", faq, flags=re.M)[1:]
    if len(questions) < 12:
        rep.err("R13", f"{slug}: FAQ has {len(questions)} questions (min 12)")
    groups = len(re.findall(r"^## ", faq, flags=re.M))
    if not 3 <= groups <= 6:
        rep.err("R13", f"{slug}: FAQ has {groups} groups (expected 3–6)")
    for q in questions:
        title, _, ans = q.partition("\n")
        if "](ch:" not in ans:
            rep.err("R13", f"{slug}: FAQ answer lacks a chapter link: {title.strip()[:60]}")
        n = len(re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", ans).split())
        if n > 120:
            rep.err("R13", f"{slug}: FAQ answer over 120 words ({n}): {title.strip()[:60]}")
    # R14 glossary
    terms = prog["glossary"]
    if len(terms) < 30:
        rep.err("R14", f"{slug}: glossary has {len(terms)} terms (min 30)")
    chapters = {c["slug"] for c in prog["chapters"]}
    for t in terms:
        if not t.get("definition"):
            rep.err("R14", f"{slug}: glossary term '{t['term']}' has no definition")
        ch = t.get("chapter", "")
        if not ch.startswith("ch:") or ch[3:].split("#")[0] not in chapters:
            rep.err("R14", f"{slug}: glossary term '{t['term']}' has no valid introduced-in chapter")
    # R17 sources
    src = (base / "sources.md").read_text(encoding="utf-8")
    if "## What would prove this research wrong" not in src and "falsif" not in src.lower():
        rep.err("R17", f"{slug}: sources has no falsifiers")
    if "## Verification caveat" not in src:
        rep.err("R17", f"{slug}: sources has no verification caveat")
    for key in ("sources", "method", "home"):
        rr = build.Renderer(prog, key)
        rr.convert((base / f"{key}.md").read_text(encoding="utf-8"))
        for e in rr.errors:
            rep.err("R16", f"{slug}/{key}: {e}")


def check_glossary_usage(prog, stats, rep):
    used = set()
    for s in stats.values():
        used.update(s["terms"])
    for t in prog["glossary"]:
        if t["id"] not in used:
            rep.warn("R15", f"{prog['slug']}: glossary term '{t['term']}' is never linked from a chapter")
    check_glossary_anchor_term(prog, rep)


def check_glossary_anchor_term(prog, rep):
    """R34: a glossary "introduced in" anchor must resolve to a real section.

    Bar §3.5: each term carries an "introduced in" chapter link. This gate is
    deliberately conservative: it reports a term only when the term's first
    alphabetic word appears nowhere in the chapter it points at, which is the
    signature of a link aimed at the wrong chapter.
    """
    for t in prog["glossary"]:
        target = t.get("chapter", "")
        if not target.startswith("ch:") or "#" not in target:
            continue
        slug = target[3:].split("#", 1)[0]
        ch = next((c for c in prog["chapters"] if c["slug"] == slug), None)
        if not ch:
            continue  # R16 already reports unknown chapters
        body = (prog["_base"] / ch["file"]).read_text(encoding="utf-8").lower()
        # Terms may contain punctuation and may appear in link labels, so match
        # on the first alphabetic word rather than splitting on spaces alone.
        key = re.match(r"[A-Za-z]+", t["term"])
        key = key.group(0).lower() if key else ""
        if key and key not in body:
            rep.warn("R34", f"{prog['slug']}: glossary '{t['term']}' points at "
                            f"chapter '{slug}', where the term never appears")


# ---------------------------------------------------------------- output gates
def check_page(path, rep, chapter=False):
    rel = path.relative_to(ROOT)
    if not path.is_file():
        rep.err("R4", f"{rel}: missing generated page")
        return
    page = path.read_text(encoding="utf-8")
    if len(re.findall(r"<h1\b", page)) != 1:
        rep.err("R22", f"{rel}: expected exactly one <h1>")
    t = re.search(r"<title>(.*?)</title>", page, re.S)
    if not t or len(html.unescape(t.group(1))) > 80:
        rep.err("R23", f"{rel}: title missing or over 80 chars")
    d = re.search(r'<meta name="description" content="([^"]*)"', page)
    if not d or len(html.unescape(d.group(1))) > 160:
        rep.err("R23", f"{rel}: meta description missing or over 160 chars")
    if 'rel="canonical"' not in page:
        rep.err("R23", f"{rel}: canonical missing")
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', page, re.S):
        try:
            json.loads(block)
        except json.JSONDecodeError as e:
            rep.err("R24", f"{rel}: invalid JSON-LD: {e}")
    ids = set(re.findall(r'\bid="([^"]+)"', page))
    for href in re.findall(r'(?:href|src)="([^"]+)"', page):
        href = html.unescape(href)
        if href.startswith(("http://", "https://", "mailto:", "tel:", "data:", "javascript:")):
            continue
        parsed = urlparse(href)
        if not parsed.path:
            if parsed.fragment and parsed.fragment not in ids and parsed.fragment != "top":
                rep.err("R25", f"{rel}: broken fragment #{parsed.fragment}")
            continue
        if parsed.path.startswith("/"):
            target = ROOT / parsed.path.lstrip("/")
        else:
            target = (path.parent / parsed.path).resolve()
        if target.is_dir():
            target = target / "index.html"
        if not target.exists():
            rep.err("R25", f"{rel}: broken link {href}")
            continue
        if parsed.fragment and target.suffix == ".html":
            other = target.read_text(encoding="utf-8")
            if f'id="{parsed.fragment}"' not in other:
                rep.err("R25", f"{rel}: broken fragment {href}")
    if chapter:
        if 'class="on-this-page' not in page or 'rs-path-disclosure' not in page:
            rep.err("R26", f"{rel}: missing mobile path or on-this-page disclosure")
        if 'class="rs-pn"' not in page:
            rep.err("R27", f"{rel}: missing prev/next navigation")


def check_outputs(prog, rep):
    slug = prog["slug"]
    out = OUT / slug
    pages = ["index.html", "summary.html", "faq.html", "glossary.html", "sources.html", "method.html"]
    for p in pages:
        check_page(out / p, rep)
    for c in prog["chapters"]:
        check_page(out / c["_file"], rep, chapter=True)
    home = (out / "index.html").read_text(encoding="utf-8") if (out / "index.html").exists() else ""
    for marker, name in [('class="rs-finding"', "finding"), ('class="rs-entries"', "paths"),
                         ('class="rs-lp"', "learning path"), ("<figure", "signature visual"),
                         ('class="rs-refcards"', "reference links"), ('class="rs-related"', "related research")]:
        if marker not in home:
            rep.err("R28", f"{slug}: programme home missing {name}")
    sitemap = SITEMAP.read_text(encoding="utf-8") if SITEMAP.exists() else ""
    for p in pages + [c["_file"] for c in prog["chapters"]]:
        url = f"{BASE_URL}/research/{slug}/{'' if p == 'index.html' else p}"
        if url not in sitemap:
            rep.err("R29", f"{slug}: {p} not in sitemap.xml")
    llms = LLMS.read_text(encoding="utf-8") if LLMS.exists() else ""
    if f"{BASE_URL}/research/{slug}/" not in llms:
        rep.err("R29", f"{slug}: programme home not in llms.txt")


def check_index(index, rep):
    page = OUT / "index.html"
    check_page(page, rep)
    if page.exists():
        text = page.read_text(encoding="utf-8")
        for p in index["programmes"]:
            if html.escape(p["title"]) not in text and p["title"] not in text:
                rep.err("R30", f"research index does not list '{p['title']}'")
    if f"{BASE_URL}/research/" not in (SITEMAP.read_text(encoding="utf-8") if SITEMAP.exists() else ""):
        rep.err("R29", "research index not in sitemap.xml")


def validate():
    rep = Report()
    index = json.loads((CONTENT / "index.json").read_text(encoding="utf-8"))
    for entry in index["programmes"]:
        if not (CONTENT / entry["slug"] / "research.json").exists():
            continue
        prog = check_programme(entry["slug"], rep)
        if not prog:
            continue
        stats = check_rendered_content(prog, rep)
        check_reference_sources(prog, rep)
        check_glossary_usage(prog, stats, rep)
        check_outputs(prog, rep)
    check_index(index, rep)
    return rep


def main():
    rep = validate()
    for w in rep.warnings:
        print(f"  ! {w}")
    for e in rep.errors:
        print(f"  ✗ {e}")
    if rep.errors:
        print(f"\nResearch validation failed: {len(rep.errors)} error(s), {len(rep.warnings)} warning(s).")
        sys.exit(1)
    print(f"All research gates passed ({len(rep.warnings)} warning(s)).")


if __name__ == "__main__":
    main()
