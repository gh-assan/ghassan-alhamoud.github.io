import html
import importlib.util
import json
import re
import unittest
from pathlib import Path
from html.parser import HTMLParser


ROOT = Path(__file__).resolve().parents[1]


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / filename)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


validate_research = load("validate_research", "validate-research.py")
build_research = load("build_research_for_tests", "build-research.py")
charts = load("research_charts_for_tests", "research_charts.py")

SLUG = "context-management-coding-agents"


class ResearchDisclosureParser(HTMLParser):
    """Collect native research navigation disclosures without checking styling."""

    def __init__(self):
        super().__init__()
        self.disclosures = []
        self._current = None
        self._in_summary = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get("class", "").split()
        if tag == "details" and "rs-disclosure" in classes:
            self._current = {
                "classes": classes,
                "collapsed": "open" not in attrs,
                "summary": [],
                "nav_labels": [],
                "has_current_page": False,
            }
        elif self._current and tag == "summary":
            self._in_summary = True
        elif self._current and tag == "nav":
            if attrs.get("aria-label"):
                self._current["nav_labels"].append(attrs["aria-label"])
        elif self._current and tag == "a" and attrs.get("aria-current") == "page":
            self._current["has_current_page"] = True

    def handle_data(self, data):
        if self._current and self._in_summary:
            self._current["summary"].append(data)

    def handle_endtag(self, tag):
        if tag == "summary":
            self._in_summary = False
        elif tag == "details" and self._current:
            self._current["summary"] = " ".join(" ".join(self._current["summary"]).split())
            self.disclosures.append(self._current)
            self._current = None


class ResearchIndexCTAParser(HTMLParser):
    """Collect primary links in the index hero and their document order."""

    def __init__(self):
        super().__init__()
        self.in_hero = False
        self.saw_promises = False
        self.primary_ctas = []
        self._current = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get("class", "").split()
        if tag == "header" and "rs-index__hero" in classes:
            self.in_hero = True
        elif tag == "section" and "rs-index__how" in classes:
            self.saw_promises = True
        elif tag == "a" and self.in_hero and "btn--primary" in classes:
            self._current = {
                "href": attrs.get("href"),
                "text": [],
                "before_promises": not self.saw_promises,
            }

    def handle_data(self, data):
        if self._current:
            self._current["text"].append(data)

    def handle_endtag(self, tag):
        if tag == "a" and self._current:
            self._current["text"] = " ".join(" ".join(self._current["text"]).split())
            self.primary_ctas.append(self._current)
            self._current = None
        elif tag == "header" and self.in_hero:
            self.in_hero = False


class ResearchBriefDisclosureParser(HTMLParser):
    """Read native outcome disclosures without depending on their styling."""

    def __init__(self):
        super().__init__()
        self.disclosures = []
        self._current = None
        self._in_summary = False
        self._in_list = False
        self._current_item = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get("class", "").split()
        if tag == "details" and "rs-brief__outcomes" in classes:
            self._current = {
                "collapsed": "open" not in attrs,
                "summary": [],
                "items": [],
            }
        elif self._current and tag == "summary":
            self._in_summary = True
        elif self._current and tag == "ul":
            self._in_list = True
        elif self._current and self._in_list and tag == "li":
            self._current_item = []

    def handle_data(self, data):
        if not self._current:
            return
        if self._in_summary:
            self._current["summary"].append(data)
        if self._current_item is not None:
            self._current_item.append(data)

    def handle_endtag(self, tag):
        if tag == "summary":
            self._in_summary = False
        elif tag == "li" and self._current_item is not None:
            item = " ".join(" ".join(self._current_item).split())
            if item:
                self._current["items"].append(item)
            self._current_item = None
        elif tag == "ul":
            self._in_list = False
        elif tag == "details" and self._current:
            self._current["summary"] = " ".join(" ".join(self._current["summary"]).split())
            self.disclosures.append(self._current)
            self._current = None


class ResearchQualityBarTests(unittest.TestCase):
    def test_all_gates_pass(self):
        report = validate_research.validate()
        self.assertEqual([], report.errors)

    def test_every_chapter_page_has_wayfinding(self):
        prog = build_research.load_programme(SLUG)
        for chapter in prog["chapters"]:
            page = (ROOT / "research" / SLUG / chapter["_file"]).read_text(encoding="utf-8")
            with self.subTest(chapter=chapter["slug"]):
                self.assertIn('class="rs-rail"', page)
                self.assertIn('class="rs-pn"', page)
                self.assertIn("On this page", page)
                self.assertIn('class="rs-brief"', page)
                self.assertIn('class="rs-endblock rs-takeaways"', page)

    def test_navigation_includes_research(self):
        for page in ("index.html", "handbook/index.html", "articles/index.html", "projects/index.html"):
            with self.subTest(page=page):
                html = (ROOT / page).read_text(encoding="utf-8")
                self.assertIn('href="/research/"', html)

    def test_programme_home_renders_audience_and_engineer_core(self):
        page = (ROOT / "research" / SLUG / "index.html").read_text(encoding="utf-8")
        self.assertIn('class="rs-home__audience"', page)
        self.assertIn('id="engineer-core"', page)

    def test_index_card_counts_match_programme_map_structure_counts(self):
        prog = build_research.load_programme(SLUG)
        label_for = lambda chapter: str(chapter.get("label", chapter["id"]))
        main_count = sum(label_for(chapter).isdigit() for chapter in prog["chapters"])
        appendix_count = len(prog["chapters"]) - main_count
        part_count = sum(part["id"] != "reference" for part in prog["parts"])
        expected = f"{main_count} chapters in {part_count} parts"
        if appendix_count:
            expected += f" + {appendix_count} appendices"

        index = (ROOT / "research" / "index.html").read_text(encoding="utf-8")
        index_meta = re.search(r'<span class="rs-prog__meta">(.*?) · updated ', index)
        self.assertIsNotNone(index_meta)
        self.assertEqual(expected, html.unescape(index_meta.group(1)))

        programme_map = (ROOT / "research" / SLUG / "index.html").read_text(encoding="utf-8")
        map_count = re.search(
            r'<li><strong>(\d+)</strong> chapters in (\d+) parts( \+ \d+ appendices)?</li>',
            programme_map,
        )
        self.assertIsNotNone(map_count)
        map_label = f"{map_count.group(1)} chapters in {map_count.group(2)} parts"
        if map_count.group(3):
            map_label += map_count.group(3)
        self.assertEqual(expected, map_label)

    def test_programme_map_title_uses_balanced_wrapping_without_forced_breaks(self):
        prog = build_research.load_programme(SLUG)
        page = (ROOT / "research" / SLUG / "index.html").read_text(encoding="utf-8")
        title = re.search(r'<h1 class="rs-home__title">(.*?)</h1>', page)
        self.assertIsNotNone(title)
        self.assertEqual(prog["title"], html.unescape(title.group(1)))
        self.assertNotIn("<br", title.group(1).lower())

        css = (ROOT / "assets" / "css" / "research.css").read_text(encoding="utf-8")
        self.assertRegex(css, r"\.rs-home__hero \.rs-home__title\s*\{[^}]*text-wrap:\s*balance;")

    def test_research_index_hero_links_to_the_only_published_programme(self):
        index = build_research.load_index()
        published_routes = []
        for entry in index["programmes"]:
            source = ROOT / "content" / "research" / entry["slug"] / "research.json"
            if source.is_file() and json.loads(source.read_text(encoding="utf-8")).get("status") == "published":
                published_routes.append(f'/research/{entry["slug"]}/')
        self.assertEqual(1, len(published_routes), published_routes)

        page = (ROOT / "research" / "index.html").read_text(encoding="utf-8")
        parser = ResearchIndexCTAParser()
        parser.feed(page)
        self.assertEqual(1, len(parser.primary_ctas), parser.primary_ctas)
        cta = parser.primary_ctas[0]
        self.assertEqual("Read the published programme", cta["text"])
        self.assertEqual(published_routes[0], cta["href"])
        self.assertTrue(cta["before_promises"])

    def test_research_index_scopes_evidence_labels_to_claims_and_verification_limits(self):
        page = (ROOT / "research" / "index.html").read_text(encoding="utf-8")
        promise = re.search(r'<li><strong>Evidence labels</strong>(.*?)</li>', page, re.S)
        self.assertIsNotNone(promise)
        promise_text = " ".join(re.sub(r"<[^>]+>", " ", promise.group(1)).split()).lower()
        self.assertIn("non-obvious numeric or contestable claims", promise_text)
        self.assertIn("sources page that lists verification limits", promise_text)
        self.assertNotIn("every number", promise_text)

        sources = (ROOT / "content" / "research" / SLUG / "sources.md").read_text(encoding="utf-8")
        self.assertIn("Labels are applied to claims that carry a number or could be contested.", sources)
        self.assertIn("## Verification caveat", sources)

    def test_research_thesis_separates_input_length_tests_from_agent_compaction(self):
        prog = build_research.load_programme(SLUG)
        thesis = prog["thesis"].lower()
        self.assertIn("controlled retrieval and question-answer tests", thesis)
        self.assertIn("specific compaction strategies", thesis)
        self.assertIn("direct coding-agent window-size effect", thesis)
        self.assertIn("universal window-size rule", thesis)
        self.assertIn("controlled retrieval and question-answer input-length tests", prog["description"].lower())

        cases = {
            ROOT / "research" / "index.html": (
                "controlled retrieval and question-answer tests",
                "specific compaction strategies",
                "direct coding-agent window-size effect",
            ),
            ROOT / "research" / SLUG / "index.html": (
                "controlled retrieval and question-answer tests",
                "specific compaction strategies",
                "universal window-size rule",
            ),
            ROOT / "research" / SLUG / "summary.html": (
                "controlled retrieval and question-answer tests varied input length",
                "agent studies compare specific compaction strategies",
                "did not test a direct effect of advertised context-window size",
                "no universal window-size rule",
            ),
            ROOT / "research" / SLUG / "01-foundations.html": (
                "controlled retrieval and question-answer tasks",
                "did not test coding-agent trajectories",
                "agent studies answer a different question",
                "advertised window size as a cause",
            ),
        }
        for path, phrases in cases.items():
            text = html.unescape(path.read_text(encoding="utf-8")).lower()
            with self.subTest(page=path.name):
                for phrase in phrases:
                    self.assertIn(phrase, text)

    def test_sourcegraph_comparison_is_bounded_and_not_a_summary_headline(self):
        base = ROOT / "content" / "research" / SLUG
        programme = json.loads((base / "research.json").read_text(encoding="utf-8"))
        values = [stat["value"] for stat in programme["summaryStats"]]
        self.assertEqual(6, len(values))
        self.assertNotIn("5K > 100K", values)
        self.assertIn("+0.108", values)
        metric_label = next(stat["label"] for stat in programme["summaryStats"] if stat["value"] == "+0.108")
        self.assertIn("marginal increase in blocked/error-action probability", metric_label)

        sources = [
            base / "summary.md",
            base / "faq.md",
            base / "chapters" / "03-ten-methods.md",
            base / "chapters" / "05-retrieval.md",
            base / "chapters" / "11-hard-calls.md",
            base / "chapters" / "13-antipatterns.md",
            base / "chapters" / "b-lessons.md",
            base / "sources.md",
        ]
        comparison_blocks = []
        for path in sources:
            text = path.read_text(encoding="utf-8")
            for block in re.split(r"\n\s*\n", text):
                if "5K" in block and "100K" in block:
                    comparison_blocks.append((path.name, block))

        self.assertEqual(8, len(comparison_blocks), [name for name, _ in comparison_blocks])
        for name, block in comparison_blocks:
            lower = block.lower()
            with self.subTest(source=name):
                self.assertIn("sourcegraph", lower)
                self.assertIn("https://sourcegraph.com/blog/context-engineering", lower)
                self.assertIn("[p]", lower)
                self.assertTrue(
                    "no task" in lower
                    or "identifies no task" in lower
                    or ("task, model, protocol" in lower and "undisclosed" in lower)
                )
                self.assertTrue(
                    "not benchmark evidence" in lower
                    or "neither benchmark evidence" in lower
                    or "not a published benchmark result" in lower
                )

        summary_page = (ROOT / "research" / SLUG / "summary.html").read_text(encoding="utf-8")
        self.assertIn("class=\"rs-stat__value\">+0.108", summary_page)
        self.assertIn("marginal increase in blocked/error-action probability", summary_page)
        self.assertIn("https://sourcegraph.com/blog/context-engineering", summary_page)
        self.assertNotIn("5K &gt; 100K", summary_page)

    def test_tool_selection_evidence_keeps_distinct_results_and_no_universal_ceiling(self):
        base = ROOT / "content" / "research" / SLUG
        sources = (base / "sources.md").read_text(encoding="utf-8")
        chapter = (base / "chapters" / "08-tool-surface.md").read_text(encoding="utf-8")
        published = (ROOT / "research" / SLUG / "08-tool-surface.html").read_text(encoding="utf-8")
        programme = "\n".join(
            path.read_text(encoding="utf-8")
            for path in base.rglob("*") if path.suffix in {".md", ".json"})

        self.assertIn("43.13% accuracy versus 13.62% for blank conditioning", sources)
        self.assertIn("separate stress test", sources)
        self.assertIn("1 to 11,100 over 20 web-search tasks", sources)
        self.assertIn("Qwen3 1.7B", chapter)
        self.assertIn("not exhaustive or rigorous", chapter)
        self.assertIn("universal 20-tool or 40-tool ceiling", chapter)
        self.assertIn("43.13% versus 13.62%", published)
        self.assertNotIn("selection accuracy fell from 43% to under 14%", programme)
        self.assertNotIn("Treat about 20 active tools as a soft ceiling", programme)
        self.assertNotIn("about 40 as a hard one", programme)
        self.assertNotIn("reach 20 tools by deletion", programme)
        self.assertNotIn("Active tool count is 20 or fewer", programme)

    def test_trace_post_compaction_result_does_not_prove_plan_rereading(self):
        base = ROOT / "content" / "research" / SLUG
        sources = (base / "sources.md").read_text(encoding="utf-8")
        programme = "\n".join(
            path.read_text(encoding="utf-8")
            for path in base.rglob("*") if path.suffix in {".md", ".json"})
        published = "\n".join(
            html.unescape(path.read_text(encoding="utf-8"))
            for path in (ROOT / "research" / SLUG).glob("*.html"))

        self.assertIn(
            "+0.108 marginal POST-minus-PRE increase in blocked/error-action probability at the first post-compaction action in AppWorld",
            sources,
        )
        self.assertIn("TRACE did not test re-reading a plan file or compare recovery actions", sources)
        self.assertIn("TRACE did not evaluate this tactic", (base / "summary.md").read_text(encoding="utf-8"))
        self.assertIn("not a demonstrated mitigation", (base / "chapters" / "03-ten-methods.md").read_text(encoding="utf-8"))
        self.assertIn("Candidate practice to evaluate", (base / "chapters" / "06-compaction-and-memory.md").read_text(encoding="utf-8"))

        for obsolete in (
            "the most dangerous step in the session",
            "protects the most error-prone step",
            "it protects the step with the most errors",
            "put the plan-file re-read exactly there",
            "+0.108 errors at that step",
        ):
            with self.subTest(obsolete=obsolete):
                self.assertNotIn(obsolete, programme.lower())
                self.assertNotIn(obsolete, published.lower())

    def test_sixteen_hour_roadmap_is_labelled_as_a_proposal_not_a_measured_payoff(self):
        base = ROOT / "content" / "research" / SLUG
        programme = (base / "research.json").read_text(encoding="utf-8")
        summary = (base / "summary.md").read_text(encoding="utf-8")
        plan = (base / "chapters" / "15-optimisation-plan.md").read_text(encoding="utf-8")
        published = "\n".join(
            html.unescape(path.read_text(encoding="utf-8"))
            for path in (ROOT / "research").glob("**/*.html"))
        content = "\n".join((programme, summary, plan)).lower()
        rendered = published.lower()

        self.assertIn("planning estimates", programme)
        self.assertIn("about 16 hours", programme)
        self.assertIn("phase gate", programme.lower())
        self.assertIn("proposed plan", summary.lower())
        self.assertIn("every phase duration is a proposed budget", plan.lower())
        self.assertIn("stop after any phase once your own measurements satisfy the stop rule", plan.lower())
        self.assertIn("not a measured payoff curve", plan.lower())

        for obsolete in (
            "covers the large majority of the benefit",
            "carry most of the benefit",
            "most of the value in the first six",
            "it is where most of the value is",
        ):
            with self.subTest(obsolete=obsolete):
                self.assertNotIn(obsolete, content)
                self.assertNotIn(obsolete, rendered)

    def test_method_page_discloses_narrative_scope_and_self_assessed_acceptance_check(self):
        base = ROOT / "content" / "research" / SLUG
        source = (base / "method.md").read_text(encoding="utf-8")
        page = html.unescape((ROOT / "research" / SLUG / "method.html").read_text(encoding="utf-8"))
        page_text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", page)).lower()
        source_text = re.sub(r"[*_`]", "", source).lower()
        combined = source_text + "\n" + page_text

        for phrase in (
            "author-led, evidence-informed narrative synthesis and practitioner framework",
            "does not report a reproducible systematic-search and inclusion protocol or an independent peer or research-method review",
            "does not claim systematic or exhaustive coverage",
            "not an empirical result or a score reviewed by an independent peer or research-method reviewer",
            "the criteria below are condensed summaries",
            "readers cannot independently reproduce the tally",
            "no independent peer or research-method reviewer scored the checklist",
            "my self-assessment",
            "not a verbatim transfer",
        ):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, combined)

        for obsolete in (
            "the answer does not work",
            "numbers, evidence labels, caveats and falsifiers are carried over unchanged",
            "result: 27 of 27 passed",
            "both anti-bar conditions passed.",
        ):
            with self.subTest(obsolete=obsolete):
                self.assertNotIn(obsolete, combined)

        self.assertIn("the three caveats", page.lower())
        self.assertIn('href="sources.html"', page.lower())

    def test_selfcompact_trigger_claims_distinguish_rationale_from_benchmarked_results(self):
        base = ROOT / "content" / "research" / SLUG
        relative_paths = (
            "chapters/03-ten-methods.md",
            "chapters/06-compaction-and-memory.md",
            "chapters/11-hard-calls.md",
            "chapters/13-antipatterns.md",
            "chapters/a-templates.md",
            "sources.md",
            "glossary.json",
        )
        source = "\n".join((base / path).read_text(encoding="utf-8") for path in relative_paths)
        rendered_pages = []
        for stem in ("03-ten-methods", "06-compaction-and-memory", "11-hard-calls", "13-antipatterns", "a-templates", "sources", "glossary"):
            page = ROOT / "research" / SLUG / f"{stem}.html"
            if page.exists():
                rendered_pages.append(html.unescape(page.read_text(encoding="utf-8")))
        combined = source.lower() + "\n" + "\n".join(
            re.sub(r"<[^>]+>", " ", page).lower() for page in rendered_pages)

        for phrase in (
            "rationale, not a general result",
            "16,000-token fixed schedule",
            "11 of 12 model/benchmark cells",
            "led by 1.1 points",
            "30%-of-context threshold baseline",
            "higher accuracy in all nine cells",
            "or coding-agent transfer",
            "one browsecomp question",
            "not an estimate of how often fixed schedules lose useful information",
            "broad trigger critique is author motivation, not a general experiment",
            "did not test these exact coding-agent events",
            "not compared in selfcompact",
        ):
            with self.subTest(phrase=phrase):
                self.assertTrue(phrase in combined, f"Missing scoped-claim text: {phrase}")

        for obsolete in (
            "semantic triggering beats both naive triggers",
            "both naive triggers fail, in opposite directions",
            "both simple triggers fail, in opposite directions",
            "both reactive and periodic triggers",
            "preserves verified facts that fixed-interval compaction destroys",
            "the worst option: fires mid-task",
            "periodic compaction erases in-use information",
            "semantic triggering beats threshold and periodic",
        ):
            with self.subTest(obsolete=obsolete):
                self.assertFalse(obsolete in combined, f"Obsolete broad claim remains: {obsolete}")

        glossary = json.loads((base / "glossary.json").read_text(encoding="utf-8"))["terms"]
        semantic_trigger = next(item for item in glossary if item["term"] == "Semantic triggering")
        self.assertEqual(
            "ch:compaction-and-memory#result-6-the-tested-trigger-comparisons",
            semantic_trigger["chapter"],
        )

    def test_tool_input_share_is_benchmark_scoped_and_not_treated_as_cost_share(self):
        base = ROOT / "content" / "research" / SLUG
        source_paths = [
            path for path in base.rglob("*")
            if path.is_file() and path.suffix in {".md", ".json"}
        ]
        source = "\n".join(path.read_text(encoding="utf-8") for path in source_paths)
        rendered_paths = list((ROOT / "research" / SLUG).glob("*.html"))
        rendered = "\n".join(
            html.unescape(path.read_text(encoding="utf-8")) for path in rendered_paths
        )
        combined = source + "\n" + rendered
        percentage_lines = [
            line for line in combined.splitlines() if "99.75–99.87%" in line
        ]

        self.assertGreaterEqual(len(percentage_lines), 10)
        for line in percentage_lines:
            with self.subTest(line=line[:180]):
                for scope in (
                    "four GPT-5 configurations",
                    "five runs",
                    "50-task Dynamics 365 hotel-expense benchmark",
                    "verbose MCP responses",
                ):
                    self.assertIn(scope, line)

        ledger = (base / "sources.md").read_text(encoding="utf-8").lower()
        summary = (base / "summary.md").read_text(encoding="utf-8").lower()
        self.assertIn("not a cost share", ledger)
        self.assertIn("separate model/provider rates", ledger)
        self.assertIn("cache status and provider pricing", ledger)
        self.assertIn("priced input/output at your cache and provider rates", summary)

        for required in (
            "token share is not cost share",
            "measure tokens by segment",
            "generated-output tokens at their separate model/provider rate",
            "input cost with cached and uncached tokens priced separately",
            "priced cost and task outcomes",
        ):
            self.assertIn(required, combined.lower())

        for obsolete in (
            "output is a rounding error",
            "input tokens are essentially all of your token spend",
            "this is where the money is",
            "full context costs 2.68×",
            "full context cost 2.68×",
            "output shaping pays immediately",
            "m-5 pays for itself in one afternoon",
            "60–90% overall saving",
        ):
            with self.subTest(obsolete=obsolete):
                self.assertNotIn(obsolete, combined.lower())


class ResearchRendererTests(unittest.TestCase):
    def setUp(self):
        self.prog = build_research.load_programme(SLUG)

    def render(self, text):
        renderer = build_research.Renderer(self.prog, "test")
        body, _ = renderer.convert(text)
        return body, renderer

    def test_glossary_link_resolves_with_label(self):
        body, renderer = self.render("A [[prefix|stable prefix]] matters.")
        self.assertIn('href="glossary.html#prefix"', body)
        self.assertIn(">stable prefix</a>", body)

    def test_adjacent_callouts_render_as_two_asides(self):
        """A callout directly following another callout must not be swallowed
        into the first aside (R37 defect class)."""
        text = ("> [!example] Worked example [C]\n"
                "> Content of the example.\n"
                "\n"
                "> [!try] Decision test\n"
                "> Run the test.\n")
        body, renderer = self.render(text)
        self.assertNotIn("@@CALLOUT", body)
        self.assertEqual(2, body.count('<aside class="callout rs-callout'))
        self.assertIn("rs-callout--example", body)
        self.assertIn("rs-callout--try", body)
        self.assertIn("<p>Run the test.</p>", body)
        self.assertEqual([], renderer.errors)

    def test_glossary_tooltip_definition_stays_plain_text(self):
        """A glossary definition carrying an evidence label must not leak
        markup into the tooltip's data-def attribute (R37 defect class)."""
        body, renderer = self.render("Watch [[position decay]] in long inputs.")
        defs = re.findall(r'data-def="([^"]*)"', body)
        self.assertTrue(defs, "expected a data-def tooltip")
        for d in defs:
            self.assertNotIn("<", d, f"markup leaked into data-def: {d}")
        self.assertNotIn('">Position decay of', body)
        self.assertEqual([], renderer.errors)
        self.assertEqual([], renderer.errors)

    def test_unknown_glossary_term_is_reported(self):
        _, renderer = self.render("An [[unknown-term-xyz]] here.")
        self.assertTrue(any("unknown glossary term" in e for e in renderer.errors))

    def test_evidence_label_becomes_pill_outside_code(self):
        body, _ = self.render("Measured [S].\n\n```text\nliteral [S]\n```")
        self.assertIn('class="rs-ev rs-ev--s"', body)
        self.assertIn("literal [S]", body)

    def test_chapter_links_resolve_and_bad_ones_are_reported(self):
        body, renderer = self.render("[a](ch:foundations#force-4-the-cache) [b](ch:nope)")
        self.assertIn('href="01-foundations.html#force-4-the-cache"', body)
        self.assertTrue(any("unknown chapter link" in e for e in renderer.errors))

    def test_callout_renders_as_aside(self):
        body, _ = self.render("> [!warning] Careful\n> Body text.")
        self.assertIn('class="callout rs-callout rs-callout--warning"', body)
        self.assertIn("Careful", body)

    def test_glossary_link_inside_table_keeps_columns(self):
        body, _ = self.render("| A | B |\n|---|---|\n| [[harness|harnesses]] | x |")
        self.assertIn(">harnesses</a>", body)
        self.assertEqual(2, body.count("<td>"))


class ChartTests(unittest.TestCase):
    def test_chart_requires_caption(self):
        with self.assertRaises(ValueError):
            charts.render_chart(json.dumps({"type": "hbar", "categories": ["a"],
                                            "series": [{"name": "s", "values": [1]}]}), "c1")

    def test_chart_ships_data_table_and_accessible_name(self):
        out = charts.render_chart(json.dumps({
            "type": "hbar", "caption": "Cap", "categories": ["a", "b"],
            "series": [{"name": "s", "values": [1, 2]}]}), "c2")
        self.assertIn('class="chart-data"', out)
        self.assertIn('role="img"', out)
        self.assertIn("<figcaption>Cap</figcaption>", out)


class RegressionGateTests(unittest.TestCase):
    """R31/R32 catch defect classes that shipped once and must not return:
    a benchmark figure quoted without its benchmark, and a [C] composite case
    whose heading is unlabelled."""

    def test_benchmark_figure_without_benchmark_is_caught(self):
        report = validate_research.Report()
        validate_research.check_source_benchmark_attribution(
            "t", "The summariser swap was worth 6.5 points overall.", report)
        self.assertTrue(any("R32" in e for e in report.errors), report.errors)

    def test_benchmark_figure_with_benchmark_passes(self):
        report = validate_research.Report()
        validate_research.check_source_benchmark_attribution(
            "t", "The swap was worth 6.5 points on SWE-bench (49.0% to 55.5%).", report)
        self.assertEqual([], report.errors)

    def test_unlabelled_composite_case_heading_is_caught(self):
        report = validate_research.Report()
        validate_research.check_composite_labels(
            "t", "## CS-9: A case\n\nSome [C] construction here.\n", report)
        self.assertTrue(any("R31" in e for e in report.errors), report.errors)

    def test_labelled_composite_case_heading_passes(self):
        report = validate_research.Report()
        validate_research.check_composite_labels(
            "t", "## CS-9: A case [C]\n\nSome [C] construction here.\n", report)
        self.assertEqual([], report.errors)

    def test_inline_composite_in_prose_is_not_flagged(self):
        """A method section may quote a [C] figure inline without being a case."""
        report = validate_research.Report()
        validate_research.check_composite_labels(
            "t", "## M-5: Output shaping\n\nThe worked arithmetic is [C].\n", report)
        self.assertEqual([], report.errors)

    def test_glossary_dl_has_no_heading_children(self):
        """<h2> is not a permitted child of <dl> (HTML validity)."""
        html = (ROOT / "research" / SLUG / "glossary.html").read_text(encoding="utf-8")
        for inner in re.findall(r"<dl[^>]*>(.*?)</dl>", html, re.S):
            self.assertNotIn("<h2", inner)
            self.assertNotIn("<h3", inner)

    def test_no_inline_event_handlers(self):
        for page in sorted((ROOT / "research" / SLUG).glob("*.html")):
            with self.subTest(page=page.name):
                self.assertNotRegex(page.read_text(encoding="utf-8"),
                                    r"\son(click|change|submit|input|load|mouseover)=")

    def test_exactly_one_breadcrumb_item_is_the_current_page(self):
        """Only the leaf crumb may claim aria-current="page"; the Part is a section."""
        for page in sorted((ROOT / "research" / SLUG).glob("*.html")):
            html = page.read_text(encoding="utf-8")
            crumb = re.search(r'class="rs-breadcrumb".*?</nav>', html, re.S)
            if not crumb:
                continue
            with self.subTest(page=page.name):
                self.assertEqual(1, crumb.group(0).count('aria-current="page"'))

    def test_vendor_figure_labelled_s_is_caught(self):
        """A figure sources.md calls unreproduced must not be labelled [S]."""
        report = self._vendor_report("Reported: 150,000 to about 2,000 tokens, a 98.7% reduction [S].\n")
        self.assertTrue(any("R35" in e for e in report.errors), report.errors)

    def test_vendor_figure_labelled_p_passes(self):
        report = self._vendor_report(
            "Vendor-reported: 150,000 to about 2,000 tokens, a 98.7% reduction [P].\n")
        self.assertEqual([], report.errors)

    def test_engineer_core_over_90_minutes_is_caught(self):
        report = validate_research.Report()
        validate_research.check_core_path_duration(
            {"slug": "t", "corePath": ["a", "b", "c"]},
            {"a": {"words": 7500, "figures": 0},
             "b": {"words": 7500, "figures": 0},
             "c": {"words": 7500, "figures": 0}},
            report)
        self.assertTrue(any("R36" in e for e in report.errors), report.errors)

    def test_current_engineer_core_is_within_90_minutes(self):
        prog = build_research.load_programme(SLUG)
        stats = {}
        for chapter in prog["chapters"]:
            renderer = build_research.Renderer(prog, chapter["slug"])
            body, _ = renderer.convert((prog["_base"] / chapter["file"]).read_text(encoding="utf-8"))
            stats[chapter["slug"]] = {"words": build_research.word_count(body),
                                      "figures": body.count("<figure")}
        report = validate_research.Report()
        validate_research.check_core_path_duration(prog, stats, report)
        self.assertEqual([], report.errors)

    @staticmethod
    def _vendor_report(text):
        import tempfile
        tmp = tempfile.TemporaryDirectory()
        base = Path(tmp.name)
        (base / "fixture.md").write_text(text, encoding="utf-8")
        report = validate_research.Report()
        validate_research.check_vendor_label_consistency(
            {"slug": "t", "_base": base, "chapters": [{"slug": "c", "file": "fixture.md"}]}, report)
        tmp.cleanup()
        return report

    def test_unresolved_build_marker_is_caught(self):
        """R37: a page carrying an unresolved build marker must fail."""
        import tempfile
        tmp = tempfile.TemporaryDirectory(dir=ROOT)
        page = Path(tmp.name) / "fixture.html"
        page.write_text("<p>@@CALLOUT:try:Decision test@@</p>\n", encoding="utf-8")
        report = validate_research.Report()
        validate_research.check_page(page, report)
        tmp.cleanup()
        self.assertTrue(any("R37" in e for e in report.errors), report.errors)

    def test_compact_on_this_page_mirrors_the_rail(self):
        """The compact disclosure is the desktop rail collapsed (bar section 2)."""
        for page in sorted((ROOT / "research" / SLUG).glob("*.html")):
            html = page.read_text(encoding="utf-8")
            rail = re.search(r'class="rs-toc__list">(.*?)</div>', html, re.S)
            mobile = re.search(r'class="on-this-page rs-disclosure".*?</details>', html, re.S)
            if not (rail and mobile):
                continue
            with self.subTest(page=page.name):
                self.assertEqual(len(re.findall(r'<a href="#', rail.group(1))),
                                 len(re.findall(r"on-this-page__link", mobile.group(0))))

    def test_chapter_and_reference_wayfinding_uses_accessible_collapsed_disclosures(self):
        """Path and outline controls stay native, named, and closed until requested."""
        pages = sorted((ROOT / "research" / SLUG).glob("*.html"))
        for page in pages:
            html = page.read_text(encoding="utf-8")
            if 'class="rs-rail"' not in html:
                continue
            parser = ResearchDisclosureParser()
            parser.feed(html)
            by_summary = {d["summary"]: d for d in parser.disclosures}
            with self.subTest(page=page.name):
                self.assertIn("Programme path", by_summary)
                path = by_summary["Programme path"]
                self.assertTrue(path["collapsed"])
                self.assertIn("Programme path", path["nav_labels"])
                self.assertTrue(path["has_current_page"])

                has_outline = 'class="rs-toc__list"' in html
                if has_outline:
                    self.assertIn("On this page", by_summary)
                    outline = by_summary["On this page"]
                    self.assertTrue(outline["collapsed"])
                    self.assertIn("On this page", outline["nav_labels"])

    def test_wide_desktop_rails_are_independently_collapsible(self):
        """Wide layouts expose separate native controls for chapters and page contents."""
        pages = sorted((ROOT / "research" / SLUG).glob("*.html"))
        checked = 0
        for page in pages:
            source = page.read_text(encoding="utf-8")
            if 'class="rs-rail-panel"' not in source:
                continue
            checked += 1
            with self.subTest(page=page.name):
                left = re.search(r'<details class="rs-rail-panel" open>(.*?)</details>', source, re.S)
                self.assertIsNotNone(left)
                self.assertIn('<summary class="rs-panel-toggle">Chapters', left.group(1))
                self.assertIn('aria-label="Programme chapters and references"', left.group(1))

                if 'class="rs-toc__list"' in source:
                    right = re.search(r'<details class="rs-toc-panel" open>(.*?)</details>', source, re.S)
                    self.assertIsNotNone(right)
                    self.assertIn('<summary class="rs-panel-toggle">On this page', right.group(1))
                    self.assertIn('aria-label="On this page"', right.group(1))

        self.assertGreater(checked, 0)
        css = (ROOT / "assets" / "css" / "research.css").read_text(encoding="utf-8")
        self.assertIn("fit-content(var(--rs-rail-w))", css)
        self.assertIn("fit-content(var(--rs-toc-w))", css)
        self.assertIn("minmax(760px, var(--rs-read-w))", css)
        self.assertIn(".rs-rail-panel:not([open])", css)
        self.assertIn(".rs-toc-panel:not([open])", css)
        self.assertIn(".rs-panel-toggle:focus-visible", css)
        self.assertRegex(
            css,
            r"@media \(min-width: 1368px\) \{\s+\.rs-rail-panel,\s+\.rs-toc-panel \{\s+display: block;",
        )
        self.assertIn(".rs-toc-panel .rs-toc { display: block; }", css)

    def test_learning_outcomes_are_collapsed_native_disclosures_on_all_chapters(self):
        prog = build_research.load_programme(SLUG)
        expected_by_file = {chapter["_file"]: len(chapter["outcomes"]) for chapter in prog["chapters"]}
        rendered = 0

        for page in sorted((ROOT / "research" / SLUG).glob("*.html")):
            source = page.read_text(encoding="utf-8")
            if 'class="rs-brief"' not in source:
                continue
            parser = ResearchBriefDisclosureParser()
            parser.feed(source)
            with self.subTest(page=page.name):
                self.assertIn(page.name, expected_by_file)
                self.assertEqual(1, len(parser.disclosures))
                disclosure = parser.disclosures[0]
                self.assertTrue(disclosure["collapsed"])
                self.assertEqual("You will be able to", disclosure["summary"])
                self.assertEqual(expected_by_file[page.name], len(disclosure["items"]))
                self.assertTrue(all(disclosure["items"]))
            rendered += 1

        self.assertEqual(len(expected_by_file), rendered)


if __name__ == "__main__":
    unittest.main()
