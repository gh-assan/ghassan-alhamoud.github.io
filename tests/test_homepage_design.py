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
