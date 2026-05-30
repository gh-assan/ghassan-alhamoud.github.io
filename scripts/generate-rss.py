#!/usr/bin/env python3
"""Generate RSS 2.0 feed for Ghassan Alhamoud's personal website.

Reads articles/articles.json and produces rss.xml at the site root.
Usage:  python3 scripts/generate-rss.py
Output: rss.xml
"""
import json
import re
import xml.etree.ElementTree as ET
from datetime import datetime
from email.utils import formatdate
from pathlib import Path
from xml.sax.saxutils import unescape

SITE_URL = "https://ghassan-alhamoud.com"

BASE_DIR = Path(__file__).resolve().parent.parent
ARTICLES_JSON = BASE_DIR / "articles" / "articles.json"
OUTPUT = BASE_DIR / "rss.xml"


def build_tree(articles: list) -> ET.Element:
    """Build the RSS ElementTree. Returns the <rss> root element."""
    ET.register_namespace("atom", "http://www.w3.org/2005/Atom")

    rss = ET.Element("rss", version="2.0")

    channel = ET.SubElement(rss, "channel")

    # -- Channel metadata --
    ET.SubElement(channel, "title").text = (
        "Ghassan Alhamoud \u2014 AI Architecture & Automation"
    )
    ET.SubElement(channel, "link").text = SITE_URL
    ET.SubElement(channel, "description").text = (
        "AI architecture, systems engineering, distributed systems, "
        "and the hard problems nobody\u2019s solving \u2014 by Ghassan Alhamoud."
    )
    ET.SubElement(channel, "language").text = "en"

    now = formatdate(timeval=None, localtime=False, usegmt=True)
    ET.SubElement(channel, "lastBuildDate").text = now

    # atom:link (self-reference)
    atom_link = ET.SubElement(channel, "{http://www.w3.org/2005/Atom}link")
    atom_link.set("href", f"{SITE_URL}/rss.xml")
    atom_link.set("rel", "self")
    atom_link.set("type", "application/rss+xml")

    # -- Items (newest first) --
    for article in articles:
        item = ET.SubElement(channel, "item")

        ET.SubElement(item, "title").text = article["title"]

        article_url = f"{SITE_URL}/articles/{article['slug']}.html"
        ET.SubElement(item, "link").text = article_url

        guid = ET.SubElement(item, "guid", isPermaLink="true")
        guid.text = article_url

        dt = datetime.strptime(article["date"], "%Y-%m-%d")
        pub_date = formatdate(dt.timestamp(), localtime=False, usegmt=True)
        ET.SubElement(item, "pubDate").text = pub_date

        # Placeholder that we replace with a real CDATA section after serialisation
        ET.SubElement(item, "description").text = (
            f"__CDATA__{article['excerpt']}__CDATA__"
        )

        for tag in article.get("tags", []):
            ET.SubElement(item, "category").text = tag

    return rss


def inject_cdata(xml_str: str) -> str:
    """Replace __CDATA__...__CDATA__ placeholders with real CDATA sections."""

    def _replacer(m: re.Match) -> str:
        content = unescape(m.group(1))
        return f"<![CDATA[{content}]]>"

    return re.sub(r"__CDATA__(.*?)__CDATA__", _replacer, xml_str)


def main() -> None:
    # Load articles
    with open(ARTICLES_JSON, encoding="utf-8") as f:
        articles = json.load(f)

    # Sort newest-first
    articles.sort(key=lambda a: a["date"], reverse=True)

    # Build XML tree
    root = build_tree(articles)
    ET.indent(root, space="  ")

    # Serialise and inject CDATA
    xml_str = ET.tostring(root, encoding="unicode", xml_declaration=True)
    xml_str = inject_cdata(xml_str)

    # Write output
    OUTPUT.write_text(xml_str + "\n", encoding="utf-8")
    print(f"RSS feed written to {OUTPUT}")
    print(f"  {len(articles)} articles, sorted newest-first")


if __name__ == "__main__":
    main()
