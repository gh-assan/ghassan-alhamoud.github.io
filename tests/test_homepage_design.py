"""Content and accessibility invariants for the home page redesign."""
import unittest
from pathlib import Path
from html.parser import HTMLParser
ROOT = Path(__file__).resolve().parents[1]

class Elements(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.elements = []; self.feed(text)
    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))

class HomeDesignTests(unittest.TestCase):
    def setUp(self):
        self.text = (ROOT / 'index.html').read_text()
        self.elements = Elements(self.text).elements
    def test_skip_link_has_focusable_main_destination(self):
        links = [a for tag, a in self.elements if tag == 'a']
        self.assertEqual(links[0].get('href'), '#main-content')
        self.assertTrue(any(tag == 'main' and a.get('id') == 'main-content' and a.get('tabindex') == '-1' for tag, a in self.elements))
    def test_static_hero_keeps_architecture_accessible_without_motion_script(self):
        hero = self.text.split('id="hero"', 1)[1].split('</section>', 1)[0]
        self.assertIn('aria-label="Illustrative agent architecture:', hero)
        self.assertIn('checkpoints', hero)
        self.assertNotIn('data-loop', hero)
        self.assertNotIn('hero-loop.js', self.text)
    def test_homepage_style_is_loaded_after_shared_styles(self):
        self.assertGreater(self.text.index('/assets/css/homepage.css'), self.text.index('/assets/css/main.css'))

    def test_project_previews_have_dimensions_text_alternatives_and_scope_labels(self):
        images = [a for tag, a in self.elements if tag == 'img' and a.get('src', '').startswith('/images/projects/')]
        self.assertEqual(len(images), 3)
        for image in images:
            self.assertTrue(image.get('alt'))
            self.assertGreater(int(image['width']), 0)
            self.assertGreater(int(image['height']), 0)
            self.assertTrue((ROOT / image['src'].lstrip('/')).is_file())
        self.assertIn('Simulated environment, Level 5', self.text)
        self.assertIn('Five simulator rounds and a real Arduino motor bench', self.text)

    def test_collection_counts_include_only_published_registry_entries(self):
        import json
        cards = [a for tag, a in self.elements if tag == 'article' and a.get('data-collection')]
        self.assertEqual({c['data-collection'] for c in cards}, {'handbook', 'iot-handbook'})
        for card in cards:
            chapters = json.loads((ROOT / card['data-collection'] / 'handbook.json').read_text())['handbook']['chapters']
            self.assertEqual(int(card['data-published-chapters']), sum(c['status'] == 'published' for c in chapters))
    def test_collections_precede_the_lighter_principles(self):
        self.assertLess(self.text.index('id="handbook"'), self.text.index('id="principles"'))
        self.assertNotIn('handbook-feature__chapters', self.text)

    def test_career_detail_is_available_in_native_disclosure(self):
        self.assertIn('<details class="about-details">', self.text)
        for fact in ['11/2021 — 06/2026', '2007 — 2012', 'Billcom', 'secu-ring', 'Applicata', 'Logos', 'role-explainer']:
            self.assertIn(fact, self.text)
    def test_article_metadata_matches_registry(self):
        import re, json
        registry = {a['slug']: a for a in json.loads((ROOT / 'articles/articles.json').read_text())}
        notes = re.findall(r'<a class="field-note[^\"]*" href="/articles/([^\"]+)\.html">(.*?)</a>', self.text, re.S)
        self.assertEqual(len(notes), 3)
        for slug, content in notes:
            self.assertIn(registry[slug]['date'], content)
            self.assertIn(registry[slug]['readingTime'], content)

    def test_each_project_owns_its_preview(self):
        import re
        cards = re.findall(r'<article class="system-card[^\"]*".*?</article>', self.text, re.S)
        self.assertEqual(len(cards), 3)
        for card, asset in zip(cards, ['scaleshop-workshop-preview.jpg', 'tamoz-boundary.svg', 'alms-memory.svg']):
            self.assertIn('/images/projects/' + asset, card)
            self.assertEqual(card.count('<img '), 1)
