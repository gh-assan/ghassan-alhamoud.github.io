#!/usr/bin/env python3
"""Check unique external links referenced by published article anchors."""

from __future__ import annotations

import argparse
import concurrent.futures
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urldefrag, urlsplit
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
ARTICLES_DIR = ROOT / "articles"
SITE_HOST = "ghassan-alhamoud.com"
USER_AGENT = "Mozilla/5.0 (compatible; GhassanArticleLinkAudit/1.0)"


class AnchorParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.urls: set[str] = set()

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        if tag != "a":
            return
        href = dict(attrs).get("href") or ""
        parsed = urlsplit(href)
        if parsed.scheme in {"http", "https"} and parsed.hostname != SITE_HOST:
            self.urls.add(urldefrag(href).url)


def collect_urls() -> list[str]:
    parser = AnchorParser()
    for article in sorted(ARTICLES_DIR.glob("*.html")):
        if article.name in {"index.html", "article-template.html"}:
            continue
        parser.feed(article.read_text(encoding="utf-8"))
    return sorted(parser.urls)


def request_status(url: str, timeout: float) -> tuple[str, int | None, str]:
    request = Request(url, method="HEAD", headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(request, timeout=timeout) as response:
            return url, response.status, ""
    except HTTPError as exc:
        if exc.code != 405:
            return url, exc.code, ""
    except URLError as exc:
        return url, None, str(exc.reason)

    request = Request(
        url,
        method="GET",
        headers={"User-Agent": USER_AGENT, "Range": "bytes=0-0"},
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            return url, response.status, ""
    except HTTPError as exc:
        return url, exc.code, ""
    except URLError as exc:
        return url, None, str(exc.reason)


def main() -> int:
    argument_parser = argparse.ArgumentParser()
    argument_parser.add_argument("--timeout", type=float, default=15)
    argument_parser.add_argument("--workers", type=int, default=12)
    args = argument_parser.parse_args()

    urls = collect_urls()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        results = sorted(
            pool.map(lambda url: request_status(url, args.timeout), urls)
        )

    failures: list[tuple[str, int | None, str]] = []
    warnings: list[tuple[str, int | None, str]] = []
    for result in results:
        _, status, error = result
        if status in {404, 410}:
            failures.append(result)
        elif error or status is None or status >= 400:
            warnings.append(result)

    print(f"Checked {len(results)} unique external article links.")
    for url, status, error in warnings:
        detail = error or f"HTTP {status}"
        print(f"WARNING {detail}: {url}")
    for url, status, error in failures:
        detail = error or f"HTTP {status}"
        print(f"BROKEN {detail}: {url}", file=sys.stderr)

    if failures:
        print(f"Found {len(failures)} confirmed broken link(s).", file=sys.stderr)
        return 1
    print(f"No confirmed 404/410 links; {len(warnings)} link(s) need manual review.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
