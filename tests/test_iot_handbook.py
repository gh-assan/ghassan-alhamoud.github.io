"""Publication and renderer regressions for the IoT collection."""
import importlib.util
import json
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
        for text in ('Version:</strong> 1.1', 'id="iot-flow-kind"', 'on-this-page', 'device is retired'):
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
