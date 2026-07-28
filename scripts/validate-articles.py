#!/usr/bin/env python3
"""Validate published article identity, metadata, and internal links."""

from __future__ import annotations

import json
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
ARTICLES_DIR = ROOT / "articles"
ARTICLE_DATA = ARTICLES_DIR / "articles.json"
SITE_ORIGIN = "https://ghassan-alhamoud.com"
EXCLUDED_ARTICLE_FILES = {"index.html", "article-template.html"}


class DocumentParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.links: list[dict[str, str]] = []
        self.canonicals: list[str] = []
        self.og_urls: list[str] = []
        self.h1_count = 0
        self._json_ld_depth = 0
        self._json_ld_chunks: list[str] = []
        self.json_ld_blocks: list[str] = []

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        values = {key: value or "" for key, value in attrs}

        if identifier := values.get("id"):
            self.ids.append(identifier)
        if tag == "h1":
            self.h1_count += 1
        if tag == "a" and values.get("href"):
            self.links.append(values)
        if (
            tag == "link"
            and values.get("rel") == "canonical"
            and values.get("href")
        ):
            self.canonicals.append(values["href"])
        if (
            tag == "meta"
            and values.get("property") == "og:url"
            and values.get("content")
        ):
            self.og_urls.append(values["content"])
        if tag == "script" and values.get("type") == "application/ld+json":
            self._json_ld_depth += 1
            self._json_ld_chunks = []

    def handle_data(self, data: str) -> None:
        if self._json_ld_depth:
            self._json_ld_chunks.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self._json_ld_depth:
            self.json_ld_blocks.append("".join(self._json_ld_chunks))
            self._json_ld_chunks = []
            self._json_ld_depth -= 1


def parse_document(path: Path) -> DocumentParser:
    parser = DocumentParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser


def local_target(source: Path, href: str) -> tuple[Path | None, str]:
    parsed = urlsplit(href)
    if parsed.scheme in {"mailto", "tel", "javascript", "data"}:
        return None, ""
    if parsed.scheme in {"http", "https"}:
        if parsed.netloc != urlsplit(SITE_ORIGIN).netloc:
            return None, ""
        raw_path = parsed.path
    elif parsed.scheme or parsed.netloc:
        return None, ""
    else:
        raw_path = parsed.path

    if not raw_path:
        return source, unquote(parsed.fragment)

    if raw_path.startswith("/"):
        target = ROOT / unquote(raw_path.lstrip("/"))
    else:
        target = source.parent / unquote(raw_path)

    if raw_path.endswith("/") or target.is_dir():
        target = target / "index.html"

    return target.resolve(), unquote(parsed.fragment)


def validate() -> list[str]:
    errors: list[str] = []
    article_records = json.loads(ARTICLE_DATA.read_text(encoding="utf-8"))
    slugs = [record["slug"] for record in article_records]

    if len(slugs) != len(set(slugs)):
        errors.append("articles/articles.json contains duplicate slugs")

    published_files = sorted(
        path
        for path in ARTICLES_DIR.glob("*.html")
        if path.name not in EXCLUDED_ARTICLE_FILES
    )
    expected_files = {ARTICLES_DIR / f"{slug}.html" for slug in slugs}
    actual_files = set(published_files)

    for missing in sorted(expected_files - actual_files):
        errors.append(f"missing article file: {missing.relative_to(ROOT)}")
    for unlisted in sorted(actual_files - expected_files):
        errors.append(f"article missing from articles.json: {unlisted.relative_to(ROOT)}")

    document_cache: dict[Path, DocumentParser] = {}

    for article in published_files:
        parser = parse_document(article)
        document_cache[article.resolve()] = parser
        expected_url = f"{SITE_ORIGIN}/articles/{article.name}"

        if parser.h1_count != 1:
            errors.append(f"{article.relative_to(ROOT)}: expected one h1, found {parser.h1_count}")
        if parser.canonicals != [expected_url]:
            errors.append(
                f"{article.relative_to(ROOT)}: canonical must be exactly {expected_url}"
            )
        if parser.og_urls != [expected_url]:
            errors.append(f"{article.relative_to(ROOT)}: og:url must be exactly {expected_url}")
        if len(parser.ids) != len(set(parser.ids)):
            errors.append(f"{article.relative_to(ROOT)}: duplicate HTML id")

        valid_article_schema = False
        for block in parser.json_ld_blocks:
            try:
                payload = json.loads(block)
            except json.JSONDecodeError as exc:
                errors.append(f"{article.relative_to(ROOT)}: invalid JSON-LD: {exc}")
                continue
            schemas = payload if isinstance(payload, list) else [payload]
            for item in schemas:
                if not isinstance(item, dict) or item.get("@type") not in {
                    "Article",
                    "TechArticle",
                    "BlogPosting",
                }:
                    continue
                main_entity = item.get("mainEntityOfPage")
                entity_url = (
                    main_entity.get("@id")
                    if isinstance(main_entity, dict)
                    else main_entity
                )
                valid_article_schema = valid_article_schema or entity_url == expected_url
        if not valid_article_schema:
            errors.append(
                f"{article.relative_to(ROOT)}: missing Article JSON-LD for {expected_url}"
            )

    pages_to_check = published_files + [ARTICLES_DIR / "index.html", ROOT / "index.html"]
    for source in pages_to_check:
        parser = document_cache.setdefault(source.resolve(), parse_document(source))
        for link in parser.links:
            href = link["href"]
            target, fragment = local_target(source.resolve(), href)

            if link.get("target") == "_blank":
                rel_tokens = set(link.get("rel", "").split())
                if not {"noopener", "noreferrer"}.issubset(rel_tokens):
                    errors.append(
                        f"{source.relative_to(ROOT)}: target=_blank link lacks "
                        f"noopener noreferrer: {href}"
                    )

            if target is None:
                continue
            try:
                target.relative_to(ROOT)
            except ValueError:
                errors.append(f"{source.relative_to(ROOT)}: link escapes site root: {href}")
                continue
            if not target.is_file():
                errors.append(f"{source.relative_to(ROOT)}: missing internal target: {href}")
                continue
            if fragment:
                target_parser = document_cache.setdefault(target, parse_document(target))
                if fragment not in set(target_parser.ids):
                    errors.append(
                        f"{source.relative_to(ROOT)}: missing fragment #{fragment} in "
                        f"{target.relative_to(ROOT)}"
                    )

    return errors


def main() -> int:
    errors = validate()
    if errors:
        print(f"Article validation failed with {len(errors)} error(s):", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print("Article validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
