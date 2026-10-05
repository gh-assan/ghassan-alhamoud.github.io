import importlib.util
import ast
import io
import json
import re
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts" / "validate-handbook.py"
SPEC = importlib.util.spec_from_file_location("validate_handbook", MODULE_PATH)
validate_handbook = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(validate_handbook)


class HandbookValidationTests(unittest.TestCase):
    def test_published_catalog_is_complete(self):
        self.assertEqual([], validate_handbook.validate_catalog())

    def test_human_in_the_loop_page_is_valid(self):
        page = ROOT / "handbook" / "chapter-07-human-in-the-loop.html"
        self.assertTrue(page.is_file())
        self.assertEqual([], validate_handbook.validate_file(page))

    def test_human_in_the_loop_backlinks_are_present(self):
        catalog = json.loads(
            (ROOT / "handbook" / "handbook.json").read_text(encoding="utf-8")
        )["handbook"]["chapters"]
        by_id = {chapter["id"]: chapter for chapter in catalog}

        for chapter_id in (0, 2, 3, 4, 5, 6):
            chapter = by_id[chapter_id]
            source = ROOT / "handbook" / "md" / chapter["file"]
            markdown = source.read_text(encoding="utf-8")
            self.assertIn(
                "/handbook/chapter-07-human-in-the-loop.html",
                markdown,
                f"chapter {chapter_id} is missing its Chapter 7 backlink",
            )
            self.assertIn("human-in-the-loop", chapter["relatedPatterns"])

    def test_observability_evaluation_chapter_is_integrated(self):
        page = ROOT / "handbook" / "chapter-08-observability-evaluation.html"
        source = ROOT / "handbook" / "md" / "chapter-08-observability-evaluation.md"
        diagram = (
            ROOT
            / "images"
            / "handbook"
            / "HDBK-008-observability-evaluation.webp"
        )

        self.assertTrue(page.is_file())
        self.assertTrue(source.is_file())
        self.assertTrue(diagram.is_file())
        self.assertEqual([], validate_handbook.validate_file(page))

        markdown = source.read_text(encoding="utf-8")
        self.assertIn("input reconstruction", markdown)
        self.assertNotIn("reasoning text, model, temperature", markdown)

    def test_human_in_the_loop_links_to_observability_evaluation(self):
        catalog = json.loads(
            (ROOT / "handbook" / "handbook.json").read_text(encoding="utf-8")
        )["handbook"]["chapters"]
        by_id = {chapter["id"]: chapter for chapter in catalog}
        chapter = by_id[7]
        source = ROOT / "handbook" / "md" / chapter["file"]
        markdown = source.read_text(encoding="utf-8")

        self.assertIn(
            "/handbook/chapter-08-observability-evaluation.html", markdown
        )
        self.assertIn("observability-evaluation", chapter["relatedPatterns"])

    def test_safety_guardrails_chapter_is_integrated(self):
        page = ROOT / "handbook" / "chapter-09-safety-guardrails.html"
        source = ROOT / "handbook" / "md" / "chapter-09-safety-guardrails.md"
        diagram = ROOT / "images" / "handbook" / "HDBK-009-safety-guardrails.webp"

        self.assertTrue(page.is_file())
        self.assertTrue(source.is_file())
        self.assertTrue(diagram.is_file())
        self.assertEqual([], validate_handbook.validate_file(page))

        markdown = source.read_text(encoding="utf-8")
        self.assertIn(
            "Effective authority is an intersection, never a union", markdown
        )
        self.assertIn("Treat Tool Discovery as a Supply-Chain Boundary", markdown)
        self.assertIn("class DecisionReceipt", markdown)
        self.assertIn(
            "https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/",
            markdown,
        )

    def test_observability_evaluation_links_to_safety_guardrails(self):
        catalog = json.loads(
            (ROOT / "handbook" / "handbook.json").read_text(encoding="utf-8")
        )["handbook"]["chapters"]
        by_id = {chapter["id"]: chapter for chapter in catalog}
        chapter = by_id[8]
        source = ROOT / "handbook" / "md" / chapter["file"]
        markdown = source.read_text(encoding="utf-8")

        self.assertIn("/handbook/chapter-09-safety-guardrails.html", markdown)
        self.assertIn("safety-guardrails", chapter["relatedPatterns"])

    def test_audio_chapter_has_complete_public_reading_surfaces(self):
        page = ROOT / "handbook" / "chapter-22-real-time-audio-agents.html"
        self.assertEqual([], validate_handbook.validate_file(page))
        html = page.read_text(encoding="utf-8")
        self.assertNotIn('language-mermaid', html)
        self.assertNotIn('/Users/', html)
        self.assertEqual(3, html.count('class="diagram-panel audio-agent-figure"'))
        self.assertEqual(3, html.count('<source media="(max-width: 599px)"'))
        self.assertEqual(10, html.count('class="table-scroll table-scroll--wide"'))
        self.assertEqual(10, html.count('<table>'))
        for filename in ('output_fence.py', 'test_output_fence.py', 'README.md'):
            href = f'/handbook/examples/real-time-audio-agents/{filename}'
            self.assertIn(f'href="{href}"', html)
            self.assertTrue(validate_handbook.local_path(href).is_file())
        schemas = [json.loads(s) for s in re.findall(
            r'<script type="application/ld\+json">(.*?)</script>', html, re.S
        )]
        faq = next(s for s in schemas if s['@type'] == 'FAQPage')
        self.assertEqual(8, len(faq['mainEntity']))
        self.assertTrue(all(q['acceptedAnswer']['text'] for q in faq['mainEntity']))

    def test_audio_chapter_navigation_skips_unpublished_routes(self):
        previous = (ROOT / 'handbook/chapter-09-safety-guardrails.html').read_text()
        current = (ROOT / 'handbook/chapter-22-real-time-audio-agents.html').read_text()
        index = (ROOT / 'handbook/index.html').read_text()
        self.assertIn('/handbook/chapter-22-real-time-audio-agents.html', previous)
        self.assertIn('/handbook/chapter-09-safety-guardrails.html', current)
        self.assertIn('Series numbers are retained', index)
        for missing in (10, 15, 19, 20, 21, 23):
            self.assertNotRegex(current, rf'href="/handbook/chapter-{missing:02d}-')
        for chapter_id in (8, 9):
            catalog = json.loads((ROOT / 'handbook/handbook.json').read_text())
            chapter = next(c for c in catalog['handbook']['chapters'] if c['id'] == chapter_id)
            self.assertIn('real-time-audio-agents', chapter['relatedPatterns'])

    def test_published_audio_fence_matches_the_runnable_example(self):
        source = (ROOT / 'handbook/md/chapter-22-real-time-audio-agents.md').read_text()
        snippet = re.search(r'```python\n(.*?)\n```', source, re.S)
        self.assertIsNotNone(snippet)
        published = ast.parse(snippet.group(1)).body[0]
        example = ROOT / 'handbook/examples/real-time-audio-agents/output_fence.py'
        runnable = next(
            node for node in ast.parse(example.read_text()).body
            if isinstance(node, ast.FunctionDef) and node.name == 'decide_output'
        )
        # The download includes a docstring that is omitted from the excerpt.
        runnable.body = runnable.body[1:]
        self.assertEqual(ast.dump(runnable), ast.dump(published))

    def test_homepage_handbook_count_matches_published_catalog(self):
        catalog = json.loads((ROOT / 'handbook/handbook.json').read_text())
        published = [c for c in catalog['handbook']['chapters'] if c['status'] == 'published']
        homepage = (ROOT / 'index.html').read_text()
        count = re.search(r'data-target="(\d+)" data-metric="handbook"', homepage)
        self.assertIsNotNone(count)
        self.assertEqual(len(published), int(count.group(1)))
        self.assertIn(f'{len(published)} handbook chapters', homepage)

    def test_missing_responsive_image_is_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'desktop.svg').write_text('<svg/>')
            page = root / 'chapter.html'
            page.write_text(
                '<html><head><title>Example</title>'
                '<meta name="description" content="Example" />'
                '<link rel="canonical" href="https://example.com/" />'
                '</head><body><h1>Example</h1><picture>'
                '<source srcset="/missing.svg 1x, /desktop.svg 2x" />'
                '<img src="/desktop.svg" /></picture></body></html>'
            )
            with patch.object(validate_handbook, 'ROOT', root):
                self.assertEqual(['broken image: /missing.svg'], validate_handbook.validate_file(page))

    def test_cli_exits_nonzero_when_validation_fails(self):
        output = io.StringIO()
        with redirect_stdout(output):
            with (
                patch.object(validate_handbook, "validate_file", return_value=["broken"]),
                patch.object(validate_handbook, "validate_catalog", return_value=[]),
                self.assertRaisesRegex(SystemExit, "1"),
            ):
                validate_handbook.main()
        self.assertIn("Validation completed with errors.", output.getvalue())


if __name__ == "__main__":
    unittest.main()
