"""Publication and renderer regressions for the IoT collection."""
import importlib.util
import json
import re
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def load_script(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / f'{name}.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class IoTHandbookTests(unittest.TestCase):
    def test_sensor_chapter_publication_is_complete(self):
        chapter = 'chapter-02-sensors-and-the-physical-world.html'
        page = (ROOT / 'iot-handbook' / chapter).read_text()
        self.assertIn('Version:</strong> 1.4', page)
        self.assertEqual(3, page.count('class="iot-diagram"'))
        self.assertIn('/assets/js/iot-handbook.js', page)
        self.assertNotIn('/assets/js/motion/core.js', page)
        self.assertNotIn('src="visuals/', page)
        self.assertNotIn('../IOT-001-', page)
        self.assertIn('/iot-handbook/sources/chapter-02.md', page)
        self.assertTrue((ROOT / 'iot-handbook/sources/chapter-02.md').is_file())
        for surface in ('index.html', 'llms.txt', 'sitemap.xml',
                        'iot-handbook/index.html', 'iot-handbook/chapter-01-what-is-an-iot-system.html'):
            self.assertIn(chapter, (ROOT / surface).read_text(), surface)
        self.assertEqual(12, len(list((ROOT / 'images/iot-handbook/IOT-002').glob('*.svg'))))

    def test_static_sensor_figures_load_without_motion_runtime(self):
        builder = load_script('build-handbook')
        head, body = builder.motion_assets('<figure class="iot-diagram"><picture></picture></figure>')
        self.assertEqual('', head)
        self.assertIn('/assets/js/iot-handbook.js', body)
        self.assertNotIn('/motion/', body)
        self.assertEqual(('', ''), builder.motion_assets('<p>No figures.</p>'))

    def test_svg_text_contrast_in_both_themes(self):
        def luminance(color):
            channels = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
            linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
            return sum(c * w for c, w in zip(linear, (0.2126, 0.7152, 0.0722)))

        ns = '{http://www.w3.org/2000/svg}'
        for file in (ROOT / 'images/iot-handbook/IOT-001').glob('*.svg'):
            svg = ET.fromstring(file.read_text())
            background = luminance(svg.find(ns + 'rect').get('fill'))
            for text in svg.findall(ns + 'text'):
                foreground = luminance(text.get('fill'))
                contrast = (max(background, foreground) + 0.05) / (min(background, foreground) + 0.05)
                self.assertGreaterEqual(contrast, 4.5, f'{file.name}: {text.text}')

    def test_mqtt_term_allowed_but_subscription_cta_still_rejected(self):
        validator = load_script('validate-site')
        page = ROOT / 'iot-handbook/chapter-01-what-is-an-iot-system.html'
        for text, expected in [('MQTT publish/subscribe messaging', True),
                               ('MQTT publish/subscribe. Subscribe to my newsletter', False)]:
            validator.results.clear()
            with patch.object(validator, 'published_files', return_value=[page]), \
                 patch.object(validator, 'code_files', return_value=[]), \
                 patch.object(validator, 'read', return_value=text):
                validator.check_forbidden_surfaces()
            self.assertEqual(expected, validator.results[-1][1])

    def test_iot_catalog_and_public_pages(self):
        validator = load_script('validate-handbook')
        directory = ROOT / 'iot-handbook'
        with patch.object(validator, 'HANDBOOK_DIR', directory), patch.object(validator, 'HANDBOOK_JSON', directory / 'handbook.json'):
            self.assertEqual([], validator.validate_catalog())
            for page in directory.glob('*.html'):
                self.assertEqual([], validator.validate_file(page), page.name)

    def test_scenes_load_with_extra_classes_and_different_attribute_order(self):
        builder = load_script('build-handbook')
        head, body = builder.motion_assets('<figure id="bench" class="scene iot-scene" data-scene="iot-study-flow"></figure><figure data-scene="iot-study-freshness" class="scene"></figure>')
        self.assertIn('/assets/css/motion.css', head)
        self.assertEqual(1, body.count('/assets/js/motion/scene-iot.js'))
        self.assertLess(body.index('core.js'), body.index('scene-iot.js'))
        self.assertIn('/assets/js/iot-handbook.js', body)

    def test_unknown_scene_fails_build(self):
        builder = load_script('build-handbook')
        with self.assertRaisesRegex(ValueError, 'no motion scene registers'):
            builder.motion_assets('<figure id="unknown" class="scene extra" data-scene="unknown"></figure>')

    def test_collection_configuration_does_not_leak_into_ai(self):
        builder = load_script('build-handbook')
        builder.configure_collection('iot-handbook')
        chapter = builder.load_json()['chapters'][0]
        schema = json.loads(builder.build_schema(chapter, ''))
        self.assertEqual('The IoT Engineering Handbook', schema['isPartOf']['name'])
        self.assertIn('/iot-handbook/', schema['mainEntityOfPage'])
        builder.configure_collection('handbook')
        self.assertEqual('HDBK', builder.COLLECTION['code'])
        self.assertEqual('AI-Native Engineering Handbook', builder.COLLECTION['shortTitle'])

    def test_chapter_publishes_independent_study_material(self):
        page = (ROOT / 'iot-handbook/chapter-01-what-is-an-iot-system.html').read_text()
        for scene in ('iot-study-flow', 'iot-study-freshness'):
            self.assertIn(f'data-scene="{scene}"', page)
        for text in ('Version:</strong> 1.2', 'id="iot-flow-kind"', 'on-this-page', 'id="security-privacy-and-lifecycle"'):
            self.assertIn(text, page)
        self.assertEqual(1, page.count('class="iot-diagram"'))
        self.assertNotIn('/Users/', page)
        self.assertIn('/assets/js/motion/scene-iot.js', page)
        self.assertIn('/iot-handbook/', (ROOT / 'handbook/index.html').read_text())

    def test_private_experiment_is_excluded_from_deployable_collection(self):
        self.assertFalse((ROOT / 'iot-handbook/examples').exists())
        for file in (ROOT / 'iot-handbook').rglob('*'):
            if file.suffix not in ('.html', '.md', '.json'):
                continue
            text = file.read_text()
            for private in ('Tamoz', 'Agentic Stream', 'DHT11', 'L293D', 'TinyGo', 'iot-fan', 'iot-evidence', 'lab-pending'):
                self.assertNotIn(private, text, file.name)
        self.assertEqual(12, len(list((ROOT / 'images/iot-handbook/IOT-001').glob('*.svg'))))

    def test_reading_structure_reports_missing_duplicate_and_reordered_sections(self):
        validate = load_script('validate-handbook').validate_chapter_structure
        required = ['Summary', "What's Next?", 'Related Chapters']
        self.assertEqual([], validate('## Summary\n\n## What\'s Next?\n\n## Related Chapters\n', required))
        self.assertTrue(any('found 0' in e for e in validate('## Summary\n', required)))
        self.assertTrue(any('found 2' in e for e in validate('## Summary\n\n## Summary\n', ['Summary'])))
        self.assertIn('shared chapter sections are out of order',
                      validate('## Related Chapters\n\n## Summary\n\n## What\'s Next?\n', required))
        self.assertEqual([], validate('## Other format\n', []))

    def test_iot_faq_schema_matches_visible_questions(self):
        for page in (ROOT / 'iot-handbook').glob('chapter-*.html'):
            html = page.read_text()
            schemas = [json.loads(s) for s in re.findall(
                r'<script type="application/ld\+json">(.*?)</script>', html, re.S)]
            faq = next(s for s in schemas if s['@type'] == 'FAQPage')
            self.assertEqual(html.count('<strong>Q:'), len(faq['mainEntity']))
            self.assertGreaterEqual(len(faq['mainEntity']), 5)
            self.assertTrue(all(q['acceptedAnswer']['text'] for q in faq['mainEntity']))
            self.assertNotIn('Author review pending', html)
            self.assertNotIn('provenance in reviews/', html)
            for anchor in ('summary', 'whats-next', 'related-chapters', 'frequently-asked-questions',
                           'glossary-terms-introduced'):
                self.assertIn(f'href="#{anchor}"', html)
                self.assertIn(f'id="{anchor}"', html)

    def test_study_question_section_is_excluded(self):
        catalog = json.loads((ROOT / 'iot-handbook/handbook.json').read_text())['handbook']
        self.assertNotIn('Study Questions and Worked Answers', catalog['requiredSections'])
        for chapter in catalog['chapters']:
            source = ROOT / 'iot-handbook/md' / chapter['file']
            page = ROOT / 'iot-handbook' / source.with_suffix('.html').name
            for file in (source, page):
                self.assertNotIn('Study Questions and Worked Answers', file.read_text())
                self.assertNotIn('study-questions-and-worked-answers', file.read_text())

    def test_iot_revision_histories_preserve_older_records_and_consolidate_today(self):
        for source in (ROOT / 'iot-handbook/md').glob('chapter-*.md'):
            history = source.read_text().split('## Revision History\n', 1)[1]
            records = re.findall(r'^\| ([\d.]+) \| (\d{4}-\d{2}-\d{2}) \|', history, re.M)
            self.assertEqual(1, sum(date == '2026-10-19' for _, date in records), source.name)
            expected = ['1.1', '1.0'] if source.name.startswith('chapter-01-') else ['1.3', '1.2', '1.1', '1.0']
            self.assertEqual(expected, [version for version, date in records if date == '2026-10-12'])
            versions = [tuple(map(int, version.split('.'))) for version, _ in records]
            for newer, older in zip(versions, versions[1:]):
                self.assertEqual((older[0], older[1] + 1), newer, source.name)
            self.assertIn(f'**Version:** {records[0][0]}', source.read_text())

    def test_sensor_equations_are_optional_but_design_consequences_remain_visible(self):
        page = (ROOT / 'iot-handbook/chapter-02-sensors-and-the-physical-world.html').read_text()
        details = re.findall(r'<details>(.*?)</details>', page, re.S)
        main = re.sub(r'<details\b.*?</details>', '', page, flags=re.S)
        for equation in ('r(t) =', 'R(T) =', 'r = aT + b', 'T_s(t) =', 'u_c =', '2^12 ='):
            self.assertTrue(any(equation in body for body in details), equation)
            self.assertNotIn(equation, main)
        for result in ('26.12 °C', '12.04', '0.54 °C', 'cannot repair a wrong location'):
            self.assertIn(result, main)
        self.assertNotIn('<details open', page)
