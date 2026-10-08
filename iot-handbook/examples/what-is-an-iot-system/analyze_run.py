#!/usr/bin/env python3
"""Compare what the firmware believed with what was observed (IOT-001 lab).

Usage:
  python3 examples/analyze_run.py calibrate RUN.jsonl CAL.json
  python3 examples/analyze_run.py classify RUN.jsonl [--calibration CAL.json] [--operator NOTES.csv]

RUN.jsonl is the captured serial stream. Non-JSON lines and boot events are
skipped. NOTES.csv has columns seq,observation,note where observation is
lit, dark or not_observed. Use one capture and notes file per boot; sequence
numbers must be unique within each file.

Standard library only. The thresholds below are fixed before any run; change
them in lab.md's pre-registration, not after seeing results.
"""
import argparse
import csv
import json
import sys

# Pre-registered criteria (raw 10-bit ADC counts; about 4.9 mV per count at 5 V).
MIN_SAMPLES = 5            # per calibration state
MIN_SEPARATION = 50        # lit minimum must exceed dark maximum by this much
BAND_MARGIN = 10           # tolerance added around each calibrated band


class CalibrationError(ValueError):
    pass


def load_records(lines):
    """Yield sample records; ignore boot events and noise."""
    seen = set()
    for line in lines:
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            continue
        if "seq" in record and "commanded" in record:
            if record["seq"] in seen:
                raise ValueError("duplicate sequence in capture; use one file per boot")
            seen.add(record["seq"])
            yield record


def calibrate(records):
    dark = [r["light_raw"] for r in records if r.get("reason") == "forced_off" and "light_raw" in r]
    lit = [r["light_raw"] for r in records if r.get("reason") == "forced_on" and "light_raw" in r]
    if len(dark) < MIN_SAMPLES or len(lit) < MIN_SAMPLES:
        raise CalibrationError(
            f"need {MIN_SAMPLES} forced-off and forced-on samples with light_raw; "
            f"got {len(dark)} and {len(lit)}")
    separation = min(lit) - max(dark)
    if separation < MIN_SEPARATION:
        raise CalibrationError(
            f"light sensor cannot discriminate the LED: separation {separation} counts "
            f"< {MIN_SEPARATION}. Use operator observation or reposition the sensor.")
    return {
        "dark_low": min(dark), "dark_high": max(dark),
        "lit_low": min(lit), "lit_high": max(lit),
        "separation": separation, "n_dark": len(dark), "n_lit": len(lit),
    }


def light_state(raw, cal):
    """Classify a light reading. 'blind' means darker than the LED-off band:
    the observer itself is covered or the room changed, so it proves nothing."""
    if raw < cal["dark_low"] - BAND_MARGIN:
        return "blind"
    if raw <= cal["dark_high"] + BAND_MARGIN:
        return "dark"
    if raw > cal["lit_high"] + BAND_MARGIN:
        return "out_of_calibration"
    if raw >= cal["lit_low"] - BAND_MARGIN:
        return "lit"
    return "ambiguous"


def classify(record, cal=None, operator=None):
    commanded = bool(record["commanded"])
    result = {"seq": record["seq"], "belief": "on" if commanded else "off"}
    operator_observation = operator.get(record["seq"]) if operator else None
    if operator_observation is not None:
        result["operator_observation"] = operator_observation

    if record.get("pin_readback") is not None and bool(record["pin_readback"]) != commanded:
        result.update(observation=None, evidence="pin", verdict="pin_disagrees_with_command")
        return result

    observation, evidence = None, "none"
    if cal is not None and "light_raw" in record:
        observation, evidence = light_state(record["light_raw"], cal), "instrumented"
    elif operator and record["seq"] in operator:
        observation, evidence = operator[record["seq"]], "operator_observed"

    if observation in ("lit", "dark"):
        expected = "lit" if commanded else "dark"
        verdict = "effect_consistent" if observation == expected else "effect_contradicted"
    else:
        verdict = "effect_unknown"
    if (evidence == "instrumented" and observation in ("lit", "dark")
            and operator_observation in ("lit", "dark")
            and observation != operator_observation):
        # Keep both observations; neither silently overrides contradictory evidence.
        verdict = "effect_unknown"
        result["evidence_conflict"] = True
    result.update(observation=observation, evidence=evidence, verdict=verdict)
    return result


def load_operator_notes(path):
    with open(path, newline="") as f:
        notes = {}
        for row in csv.DictReader(f):
            seq = int(row["seq"])
            if seq in notes:
                raise ValueError("duplicate sequence in notes; use one notes file per capture")
            observation = row["observation"].strip()
            if observation not in ("lit", "dark", "not_observed"):
                raise ValueError(f"invalid operator observation: {observation}")
            notes[seq] = observation
        return notes


def summarize(results):
    counts = {}
    for r in results:
        counts[r["verdict"]] = counts.get(r["verdict"], 0) + 1
    return counts


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    p_cal = sub.add_parser("calibrate")
    p_cal.add_argument("run")
    p_cal.add_argument("out")
    p_cls = sub.add_parser("classify")
    p_cls.add_argument("run")
    p_cls.add_argument("--calibration")
    p_cls.add_argument("--operator")
    args = parser.parse_args(argv)

    with open(args.run) as f:
        records = list(load_records(f))

    if args.command == "calibrate":
        try:
            cal = calibrate(records)
        except CalibrationError as e:
            print(f"calibration failed: {e}", file=sys.stderr)
            return 2
        with open(args.out, "w") as f:
            json.dump(cal, f, indent=2)
        print(json.dumps(cal))
        return 0

    cal = None
    if args.calibration:
        with open(args.calibration) as f:
            cal = json.load(f)
    operator = load_operator_notes(args.operator) if args.operator else None
    results = [classify(r, cal, operator) for r in records]
    for r in results:
        print(json.dumps(r))
    print(json.dumps({"summary": summarize(results)}), file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
