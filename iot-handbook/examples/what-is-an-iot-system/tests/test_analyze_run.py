"""Tests for analyze_run.py. Records here are synthetic fixtures, not lab evidence."""
import os
import sys
import unittest
import tempfile
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import analyze_run as ar  # noqa: E402


def rec(seq, commanded, readback=None, light=None, reason="at_or_above_threshold"):
    r = {"seq": seq, "commanded": commanded, "reason": reason}
    if readback is not None:
        r["pin_readback"] = readback
    if light is not None:
        r["light_raw"] = light
    return r


CAL = {"dark_low": 200, "dark_high": 220, "lit_low": 600, "lit_high": 640}


class Calibration(unittest.TestCase):
    def test_separated_states_calibrate(self):
        records = [rec(i, 0, 0, 210 + i, "forced_off") for i in range(5)]
        records += [rec(i, 1, 1, 610 + i, "forced_on") for i in range(5)]
        cal = ar.calibrate(records)
        self.assertEqual(cal["dark_high"], 214)
        self.assertEqual(cal["lit_low"], 610)

    def test_overlapping_states_refuse_to_calibrate(self):
        records = [rec(i, 0, 0, 300, "forced_off") for i in range(5)]
        records += [rec(i, 1, 1, 320, "forced_on") for i in range(5)]
        with self.assertRaises(ar.CalibrationError):
            ar.calibrate(records)

    def test_too_few_samples_refuse_to_calibrate(self):
        records = [rec(0, 0, 0, 200, "forced_off"), rec(1, 1, 1, 700, "forced_on")]
        with self.assertRaises(ar.CalibrationError):
            ar.calibrate(records)


class Classification(unittest.TestCase):
    def test_baseline_on_is_consistent(self):
        self.assertEqual(ar.classify(rec(1, 1, 1, 620), CAL)["verdict"], "effect_consistent")

    def test_wiring_fault_contradicts_belief(self):
        # Fault F1: firmware drives the pin, LED wired elsewhere, sensor sees dark.
        result = ar.classify(rec(2, 1, 1, 210), CAL)
        self.assertEqual(result["belief"], "on")
        self.assertEqual(result["verdict"], "effect_contradicted")

    def test_covered_sensor_is_unknown_not_off(self):
        # Fault F2: the observer is blind; that is not evidence the LED is dark.
        result = ar.classify(rec(3, 1, 1, 40), CAL)
        self.assertEqual(result["observation"], "blind")
        self.assertEqual(result["verdict"], "effect_unknown")

    def test_reading_between_bands_is_unknown(self):
        self.assertEqual(ar.classify(rec(4, 1, 1, 400), CAL)["verdict"], "effect_unknown")

    def test_above_lit_band_and_saturation_are_unknown(self):
        for raw in (651, 1023):
            result = ar.classify(rec(4, 1, 1, raw), CAL)
            self.assertEqual(result["observation"], "out_of_calibration")
            self.assertEqual(result["verdict"], "effect_unknown")
        self.assertEqual(ar.classify(rec(4, 1, 1, 650), CAL)["verdict"], "effect_consistent")

    def test_conflicting_operator_evidence_is_retained(self):
        result = ar.classify(rec(4, 1, 1, 620), CAL, {4: "dark"})
        self.assertEqual(result["operator_observation"], "dark")
        self.assertTrue(result["evidence_conflict"])
        self.assertEqual(result["verdict"], "effect_unknown")

    def test_pin_disagreement_is_reported_before_light(self):
        result = ar.classify(rec(5, 1, 0, 620), CAL)
        self.assertEqual(result["verdict"], "pin_disagrees_with_command")

    def test_operator_note_used_without_sensor(self):
        result = ar.classify(rec(6, 1, 1), None, {6: "dark"})
        self.assertEqual(result["evidence"], "operator_observed")
        self.assertEqual(result["verdict"], "effect_contradicted")

    def test_no_observation_is_unknown(self):
        result = ar.classify(rec(7, 0, 0), None, {6: "dark"})
        self.assertEqual(result["evidence"], "none")
        self.assertEqual(result["verdict"], "effect_unknown")


class Parsing(unittest.TestCase):
    def test_boot_events_and_noise_are_skipped(self):
        lines = ["garbage", '{"event":"boot"}', '{"seq":1,"commanded":0}', "{broken"]
        self.assertEqual([r["seq"] for r in ar.load_records(lines)], [1])

    def test_capture_cannot_mix_reboot_sequences(self):
        with self.assertRaises(ValueError):
            list(ar.load_records(['{"seq":1,"commanded":0}', '{"seq":1,"commanded":1}']))

    def test_notes_are_bound_to_separate_captures_and_reject_duplicates(self):
        with tempfile.TemporaryDirectory() as tmp:
            a, b = Path(tmp)/"baseline.csv", Path(tmp)/"fault.csv"
            a.write_text("seq,observation,note\n1,lit,baseline\n")
            b.write_text("seq,observation,note\n1,dark,fault\n")
            sample = rec(1, 1, 1)
            self.assertEqual(ar.classify(sample, None, ar.load_operator_notes(a))["verdict"], "effect_consistent")
            self.assertEqual(ar.classify(sample, None, ar.load_operator_notes(b))["verdict"], "effect_contradicted")
            a.write_text(a.read_text()+"1,dark,other boot\n")
            with self.assertRaises(ValueError):
                ar.load_operator_notes(a)


if __name__ == "__main__":
    unittest.main()
