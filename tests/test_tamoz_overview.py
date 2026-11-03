"""Check routing and evidence boundaries between the Tamoz project and pilot."""
import unittest
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://ghassan-alhamoud.com'


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.elements = []
        self.ids = set()
        self.text = []
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.elements.append((tag, attrs))
        if 'id' in attrs:
            self.ids.add(attrs['id'])

    def handle_data(self, data):
        self.text.append(data)

    @property
    def links(self):
        return [attrs['href'] for tag, attrs in self.elements
                if tag == 'a' and 'href' in attrs]


class TamozPagesTest(unittest.TestCase):
    def setUp(self):
        self.project = Page(ROOT / 'projects/tamoz.html')
        self.pilot = Page(ROOT / 'tamoz/index.html')

    def test_pages_have_distinct_canonical_routes_and_reciprocal_links(self):
        for page, route in [(self.project, '/projects/tamoz.html'),
                            (self.pilot, '/tamoz/')]:
            canonicals = [a['href'] for tag, a in page.elements
                          if tag == 'link' and a.get('rel') == 'canonical']
            self.assertEqual(canonicals, [ORIGIN + route])
            self.assertEqual(sum(tag == 'h1' for tag, _ in page.elements), 1)
        self.assertIn('/tamoz/', self.project.links)
        self.assertIn('/projects/tamoz.html', self.pilot.links)
        self.assertTrue(any(link.startswith('mailto:') for link in self.pilot.links))

    def test_page_links_assets_and_fragments_resolve(self):
        # This also covers /tamoz/ resolving to its index and technical evidence anchors.
        for page in (self.project, self.pilot):
            for tag, attrs in page.elements:
                for name in ('href', 'src'):
                    value = attrs.get(name, '')
                    parts = urlsplit(value)
                    if parts.scheme or not value or not value.startswith(('/', '#')):
                        continue
                    target = ROOT / parts.path.lstrip('/') if parts.path else (
                        ROOT / ('projects/tamoz.html' if page is self.project else 'tamoz/index.html'))
                    if target.is_dir():
                        target /= 'index.html'
                    with self.subTest(url=value):
                        self.assertTrue(target.is_file(), value)
                        if parts.fragment and target.suffix == '.html':
                            self.assertIn(parts.fragment, Page(target).ids, value)

    def test_project_keeps_evidence_and_pilot_keeps_evaluation_boundary(self):
        self.assertTrue({'problem', 'design', 'evidence', 'boundary'} <= self.project.ids)
        self.assertIn('/projects/tamoz-technical.html#trial', self.project.links)
        project = ' '.join(self.project.text).lower()
        self.assertIn('approver was scripted', project)
        self.assertIn('one simulated station', project)
        pilot = ' '.join(self.pilot.text).lower()
        self.assertIn('read-only', pilot)
        self.assertIn('install sensors', pilot)
        self.assertIn('have not yet established savings', pilot)
        for page in (self.project, self.pilot):
            text = ' '.join(page.text).lower()
            self.assertNotIn('open-source', text)
            self.assertNotIn('opensource.org', text)

    def test_landing_page_is_discoverable_and_validated(self):
        ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        entries = ET.parse(ROOT / 'sitemap.xml').findall('s:url/s:loc', ns)
        self.assertEqual(sum(e.text == ORIGIN + '/tamoz/' for e in entries), 1)
        self.assertIn(ORIGIN + '/tamoz/', (ROOT / 'llms.txt').read_text())
        import runpy
        validator = runpy.run_path(str(ROOT / 'scripts/validate-site.py'))
        self.assertIn(ROOT / 'tamoz/index.html', validator['published_files']())

    def test_rule_story_keeps_its_steps_and_recorded_numbers(self):
        steps = [attrs for tag, attrs in self.project.elements
                 if attrs.get('class') == 'rule-story__step']
        self.assertEqual(len(steps), 6)
        text = ' '.join(self.project.text)
        for recorded in ('21 s', '1.09 ms', '81 s', '60 s', 'scripted approver'):
            self.assertIn(recorded, text)
        self.assertTrue(any((attrs.get('src') or '').startswith('/assets/js/rule-story.js')
                            for tag, attrs in self.project.elements if tag == 'script'))


if __name__ == '__main__':
    unittest.main()
