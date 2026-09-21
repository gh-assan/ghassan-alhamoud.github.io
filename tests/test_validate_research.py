import importlib.util
import json
import re
import unittest
from pathlib import Path


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

    def test_mobile_on_this_page_mirrors_the_rail(self):
        """The mobile disclosure is the desktop rail collapsed (bar section 2)."""
        for page in sorted((ROOT / "research" / SLUG).glob("*.html")):
            html = page.read_text(encoding="utf-8")
            rail = re.search(r'class="rs-toc__list">(.*?)</div>', html, re.S)
            mobile = re.search(r'class="on-this-page rs-disclosure".*?</details>', html, re.S)
            if not (rail and mobile):
                continue
            with self.subTest(page=page.name):
                self.assertEqual(len(re.findall(r'<a href="#', rail.group(1))),
                                 len(re.findall(r"on-this-page__link", mobile.group(0))))


if __name__ == "__main__":
    unittest.main()
