"""Protect the pilot and evidence boundaries on the Tamoz overview."""
import unittest
from html.parser import HTMLParser
from pathlib import Path


class OverviewParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.links = []
        self.text = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.add(attrs['id'])
        if tag == 'a':
            self.links.append(attrs.get('href', ''))

    def handle_data(self, data):
        self.text.append(data)


class TamozOverviewTest(unittest.TestCase):
    def test_pilot_and_trial_remain_evidence_bounded(self):
        parser = OverviewParser()
        parser.feed((Path(__file__).resolve().parents[1] / 'projects/tamoz.html').read_text())
        text = ' '.join(parser.text).lower()
        self.assertTrue({'evidence', 'pilot', 'boundary'} <= parser.ids)
        self.assertIn('/projects/tamoz-technical.html#trial', parser.links)
        self.assertIn('read-only', text)
        self.assertIn('one simulated station', text)
        self.assertIn('approver was scripted', text)
        self.assertIn('first operational pilot', text)
        self.assertIn('installing sensors', text)
        self.assertIn('have not yet established savings', text)
        self.assertIn('small hardware bench', text)


if __name__ == '__main__':
    unittest.main()
