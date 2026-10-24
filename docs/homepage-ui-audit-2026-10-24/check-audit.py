#!/usr/bin/env python3
"""Check audit evidence integrity and local home-page link destinations.

Does not replay browser interactions. Run from any directory.
"""
import hashlib
import json
import re
import struct
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.ids = set()
        self.links = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        if tag == 'a' and attrs.get('href'):
            self.links.append(attrs['href'])


def main():
    folder = Path(__file__).resolve().parent
    root = folder.parents[1]
    reports = sorted(folder.glob('*.md'))
    report = '\n'.join(path.read_text() for path in reports)
    for name in re.findall(r'\]\(([^)#]+\.md)\)', report):
        assert (folder / name).is_file(), 'Missing report: ' + name
    evidence = sorted(set(re.findall(r'\]\((evidence/[^)]+)\)', report)))
    assert evidence, 'No linked evidence'
    manifest = []
    for name in evidence:
        path = folder / name
        data = path.read_bytes()
        item = {'path': name, 'sha256': hashlib.sha256(data).hexdigest()}
        if path.suffix == '.jpg':
            assert data[:3] == bytes.fromhex('ffd8ff'), name
            offset = 2
            while offset < len(data):
                assert data[offset] == 255, name
                marker = data[offset + 1]
                length = int.from_bytes(data[offset + 2:offset + 4], 'big')
                if marker in (192, 193, 194):
                    height, width = struct.unpack('>HH', data[offset + 5:offset + 9])
                    break
                offset += 2 + length
            else:
                raise AssertionError('Missing JPEG dimensions: ' + name)
            assert width > 0 and height > 0, name
            item.update(width=width, height=height)
            if path.name.startswith('design-'):
                expected = (1440, 900)
                if path.name.startswith('design-mobile-'):
                    expected = (390, 844)
                elif path.name.startswith('design-tablet-'):
                    expected = (768, 1024)
                elif path.name.startswith('design-1000-'):
                    expected = (1000, 900)
                assert (width, height) == expected, (name, width, height)
        elif path.suffix == '.json':
            rows = json.loads(data)
            expected = {320, 375, 768, 999, 1000, 1280, 1440}
            if path.name == 'after-layout.json':
                expected = {320, 390, 768, 999, 1000, 1440}
                assert all(not r['mainOverflow'] for r in rows)
            assert expected == {r['width'] for r in rows}
            assert all(r['scrollWidth'] == r['width'] for r in rows)
        manifest.append(item)

    page = Page((root / 'index.html').read_text())
    count = 0
    for href in page.links:
        url = urlsplit(href)
        if url.scheme or url.netloc:
            continue
        target = root / unquote(url.path).lstrip('/') if url.path else root / 'index.html'
        if target.is_dir():
            target /= 'index.html'
        assert target.is_file(), f'Missing local destination: {href}'
        if url.fragment:
            assert unquote(url.fragment) in Page(target.read_text()).ids, href
        count += 1
    print(json.dumps({'reports_checked': [p.name for p in reports],
                      'evidence_count': len(manifest), 'local_links_checked': count,
                      'evidence': manifest}, indent=2))


if __name__ == '__main__':
    main()
