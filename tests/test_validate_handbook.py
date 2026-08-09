import importlib.util
import io
import json
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
