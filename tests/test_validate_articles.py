import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts" / "validate-articles.py"
SPEC = importlib.util.spec_from_file_location("validate_articles", MODULE_PATH)
validate_articles = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(validate_articles)


class ArticleValidationTests(unittest.TestCase):
    def test_parser_collects_h1_text_inside_inline_elements(self):
        parser = validate_articles.DocumentParser()
        parser.feed("<h1>How to test <code>tmux</code>: a workflow</h1>")

        self.assertEqual(1, parser.h1_count)
        self.assertEqual(
            "How to test tmux: a workflow",
            " ".join("".join(parser.h1_text_chunks).split()),
        )

    def test_validation_rejects_catalog_metadata_drift(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            articles_dir = root / "articles"
            articles_dir.mkdir()
            (root / "index.html").write_text("<html></html>", encoding="utf-8")
            (root / "sitemap.xml").write_text("<urlset></urlset>", encoding="utf-8")
            (root / "rss.xml").write_text(
                "<rss><channel></channel></rss>", encoding="utf-8"
            )
            (articles_dir / "index.html").write_text(
                "<html></html>", encoding="utf-8"
            )
            (articles_dir / "example.html").write_text(
                """<!DOCTYPE html>
<html><head>
<meta name="description" content="Page description">
<link rel="canonical" href="https://ghassan-alhamoud.com/articles/example.html">
<meta property="og:url" content="https://ghassan-alhamoud.com/articles/example.html">
<script type="application/ld+json">{"@type":"Article","mainEntityOfPage":"https://ghassan-alhamoud.com/articles/example.html"}</script>
</head><body><h1>Page title</h1></body></html>
""",
                encoding="utf-8",
            )
            (articles_dir / "articles.json").write_text(
                (
                    '[{"slug":"example","title":"Catalog title",'
                    '"excerpt":"Catalog description"}]'
                ),
                encoding="utf-8",
            )

            with (
                patch.object(validate_articles, "ROOT", root),
                patch.object(validate_articles, "ARTICLES_DIR", articles_dir),
                patch.object(
                    validate_articles,
                    "ARTICLE_DATA",
                    articles_dir / "articles.json",
                ),
                patch.object(validate_articles, "SITEMAP", root / "sitemap.xml"),
                patch.object(validate_articles, "RSS", root / "rss.xml"),
            ):
                errors = validate_articles.validate()

        self.assertIn(
            "articles/example.html: H1 must match articles.json title",
            errors,
        )
        self.assertIn(
            "articles/example.html: meta description must match articles.json excerpt",
            errors,
        )
        self.assertIn("articles/example.html: missing sitemap entry", errors)
        self.assertIn("articles/example.html: missing RSS entry", errors)

    def test_validation_accepts_complete_discovery_surfaces(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            articles_dir = root / "articles"
            articles_dir.mkdir()
            canonical = "https://ghassan-alhamoud.com/articles/example.html"
            (root / "index.html").write_text("<html></html>", encoding="utf-8")
            (root / "sitemap.xml").write_text(
                f"<urlset><url><loc>{canonical}</loc></url></urlset>",
                encoding="utf-8",
            )
            (root / "rss.xml").write_text(
                f"<rss><channel><item><link>{canonical}</link></item></channel></rss>",
                encoding="utf-8",
            )
            (articles_dir / "index.html").write_text(
                "<html></html>", encoding="utf-8"
            )
            (articles_dir / "example.html").write_text(
                f"""<!DOCTYPE html>
<html><head>
<meta name="description" content="Description">
<link rel="canonical" href="{canonical}">
<meta property="og:url" content="{canonical}">
<script type="application/ld+json">{{"@type":"Article","mainEntityOfPage":"{canonical}"}}</script>
</head><body><h1>Example</h1></body></html>
""",
                encoding="utf-8",
            )
            (articles_dir / "articles.json").write_text(
                '[{"slug":"example","title":"Example","excerpt":"Description"}]',
                encoding="utf-8",
            )

            with (
                patch.object(validate_articles, "ROOT", root),
                patch.object(validate_articles, "ARTICLES_DIR", articles_dir),
                patch.object(validate_articles, "ARTICLE_DATA", articles_dir / "articles.json"),
                patch.object(validate_articles, "SITEMAP", root / "sitemap.xml"),
                patch.object(validate_articles, "RSS", root / "rss.xml"),
            ):
                errors = validate_articles.validate()

        self.assertEqual([], errors)


if __name__ == "__main__":
    unittest.main()
