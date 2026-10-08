"""Publication and renderer regressions for the IoT collection."""
import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def load_script(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / f'{name}.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class IoTHandbookTests(unittest.TestCase):
    def test_iot_catalog_and_public_pages(self):
        validator = load_script('validate-handbook')
        directory = ROOT / 'iot-handbook'
        with patch.object(validator, 'HANDBOOK_DIR', directory), patch.object(validator, 'HANDBOOK_JSON', directory / 'handbook.json'):
            self.assertEqual([], validator.validate_catalog())
            for page in directory.glob('*.html'):
                self.assertEqual([], validator.validate_file(page), page.name)

    def test_scenes_load_with_extra_classes_and_different_attribute_order(self):
        builder = load_script('build-handbook')
        head, body = builder.motion_assets('<figure id="bench" class="scene iot-scene" data-scene="iot-evidence"></figure><figure data-scene="iot-fan" class="scene"></figure>')
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

    def test_chapter_preserves_draft_and_exposes_all_three_scenes(self):
        page = (ROOT / 'iot-handbook/chapter-01-what-is-an-iot-system.html').read_text()
        for scene in ('iot-evidence', 'iot-fan', 'iot-tests'):
            self.assertIn(f'data-scene="{scene}"', page)
        for text in ('not been run', 'lab-pending', 'review-pending', 'Comfort with Go code.', 'id="iot-scenario"', 'on-this-page'):
            self.assertIn(text, page)
        self.assertEqual(4, page.count('class="iot-diagram"'))
        self.assertNotIn('/Users/', page)
        self.assertIn('/assets/js/motion/scene-iot.js', page)
        self.assertIn('/iot-handbook/', (ROOT / 'handbook/index.html').read_text())
