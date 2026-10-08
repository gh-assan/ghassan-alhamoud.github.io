# IOT-001 lab: one loop, three observers

Status: **procedure prepared; target build passed; physical lab not run.** Evidence level once run: physical run on the named rig, with operator-observed and (if the light sensor passes calibration) instrumented observations.

## Hypothesis and pre-registered criteria

Written before any run. Do not change after seeing data; if a criterion turns out to be wrong, record the change and the reason as a deviation.

- **H1 (baseline):** with correct wiring, every sample's command agrees with the observed LED state.
- **H2 (wiring fault F1):** with the LED moved to an undriven pin, the command record and pin readback continue to report "on" while the observation reports dark.
- **H3 (blind observer F2):** with the light sensor capped in a lit room, the analysis reports `effect_unknown`, not `effect_contradicted`.

| Criterion | Value | Where fixed |
|---|---|---|
| Calibration samples per state | ≥ 5 | `analyze_run.py` `MIN_SAMPLES` |
| Minimum lit/dark separation | 50 ADC counts (≈ 0.24 V) | `MIN_SEPARATION` |
| Band tolerance | 10 counts | `BAND_MARGIN` |
| Baseline pass | 0 `effect_contradicted`, 0 `pin_disagrees_with_command`, ≤ 1 `effect_unknown` per on/off transition | this file |
| Observation delay | 500 ms after each write | firmware `observeDelay` |
| F1 pass | ≥ 3 consecutive forced-on samples `effect_contradicted` with `pin_readback:1` | this file |
| F2 pass | ≥ 3 consecutive forced-on samples `effect_unknown`, observation `blind` | this file |
| Recovery pass | ≥ 5 consecutive `effect_consistent` in auto mode | this file |
| Repeats | Baseline once; F1 and F2 each 3 times | this file |

Without a light sensor, H3 cannot be tested; operator notes replace the instrument for H1 and H2.

## Equipment

Confirm each item on the bench and record its markings before wiring. Nothing here is assumed owned.

| Item | Status from sensor study | Needed for |
|---|---|---|
| ELEGOO Mega 2560-compatible board, USB cable | Verified by USB bring-up 2026-09-07 | All |
| DHT11 module (3-pin) | Verified readings on D2, 2026-09-08 | Signal |
| LED, any colour | Listed in inventory; part unverified | Effect |
| 330 Ω resistor (220–1 kΩ acceptable; recompute current) | Unverified | LED current limit |
| Photoresistor + 10 kΩ resistor | Kit checklist candidate; unverified | Optional instrumented observer |
| Opaque cap or tape for the light sensor | — | F2 |
| Breadboard, jumpers | Kit visible in photos | All |
| Multimeter | Not recorded | Optional continuity/voltage checks |

Read the LED's forward voltage from its datasheet or packaging and recompute the current using the chapter's worked example. Keep the result well below the 40 mA absolute maximum.

## Wiring

Make every change with USB unplugged.

```text
DHT11   S -> D2      + -> 5V      - -> GND
LED     D9 -> 330 Ω -> LED anode (long leg);  LED cathode (short leg) -> GND
Light   5V -> photoresistor -> A0;  A0 -> 10 kΩ -> GND      (optional)
```

Point the photoresistor at the LED from 1–3 cm away. If a multimeter is available, check continuity from the D9 header to the resistor before powering on, and record it. If no light sensor is fitted, set `hasLightSensor` to `false` in `examples/firmware/main.go` and rebuild.

## Software and versions

Run commands from this chapter package directory. TinyGo is the embedded compiler; standard Go runs the hardware-independent tests. The Python utility analyses host captures.

| Item | Version |
|---|---|
| Firmware | `examples/firmware/main.go` v2.0.0; decision logic in `examples/control/`; JSON encoder in `examples/wire/` |
| TinyGo / Go | 0.42.0 / go1.27.1, darwin/arm64, verified 2026-10-08 |
| Board target | `arduino-mega2560`; AVR backend is experimental |
| Driver | `tinygo.org/x/drivers` v0.36.0, pinned in go.mod and go.sum |
| Analysis | `examples/analyze_run.py` (Python 3 standard library) |
| Serial capture | arduino-cli 1.5.1; no Arduino core or C++ libraries needed to compile this firmware |
| Flash utility | `avrdude`, required separately by this TinyGo target; not installed on this machine during validation |

Install TinyGo using its [official installation instructions](https://tinygo.org/getting-started/install/macos/). Validation used a checksum-verified official arm64 archive in a temporary directory; no global TinyGo installation was made. Record exact versions and source hashes at run time. If using another OS/compiler/Go combination, record and build it explicitly rather than assuming compatibility.

```bash
make -C examples test
(cd examples && go mod download tinygo.org/x/drivers)
make -C examples compile
```

The Mega target build passed with the listed compiler/Go/driver combination: 19,741 bytes flash, 1,499 bytes static RAM (813 data + 686 bss). This excludes stack and dynamic heap usage; fitting at link time is not proof of runtime stability. Physical sensor timing, serial reception and repeated-run stability are unverified. The DHT driver masks interrupts while acquiring pulses: send one command at a time, check the next sample's mode/threshold, and repeat if absent. Unplugging USB is the immediate stop.

Upload operates hardware; run only as part of the author's lab, after checking the procedure and installing avrdude:

```bash
make -C examples flash PORT=/dev/cu.usbmodemXXXX
```

Capture (the operator types commands into the same serial monitor):

```bash
arduino-cli monitor -p /dev/cu.usbmodemXXXX -c baudrate=115200 | tee evidence/run-01.jsonl
```

Use a new capture filename on every reboot. Do not concatenate boot epochs or append a new run to an old file. Stop the monitor with Ctrl-C before opening another serial session. For capture after a calibration pause without a reboot, resume the same run with `tee -a evidence/run-01.jsonl`; if the board resets when the monitor reconnects, start a fresh file and corresponding notes instead. The analyzer rejects repeated sequence numbers.

## Procedure

Write separate operator notes for each capture, for example `evidence/run-01-operator.csv` (`seq,observation,note`; observation is `lit`, `dark` or `not_observed`). Note a sample only when you actually looked at the LED as that sequence number appeared. Each sequence can appear once in that notes file; a reboot needs a new capture/notes pair, since the counter restarts.

1. **Setup.** Wire with USB unplugged. Note room lighting. Plug in USB. Confirm the boot line and that `reading` is `ok`.
2. **Calibrate (light sensor only).** Send `0`; wait for ≥ 5 samples. Send `1`; wait for ≥ 5 samples. Stop capture, run `python3 examples/analyze_run.py calibrate evidence/run-01.jsonl evidence/calibration.json`. If calibration fails, record the message and continue with operator observation only, omitting the calibration option below. Resume capture as described above before continuing.
3. **Baseline.** Send `a`. Use `+`/`-` to set the threshold about 1.5 °C above the current reading. Warm the DHT11 with a fingertip until the LED should turn on; hold for ≥ 5 samples; release and let it cool until the LED should turn off. Write operator notes throughout.
4. **F1, wiring fault (×3).** Unplug USB. Move the LED's jumper from D9 to D10. Reconnect; send `1`. Observe ≥ 3 samples. Unplug, restore D9, reconnect. Repeat three times, each with a fresh capture file.
5. **F2, blind observer (×3, light sensor only).** With the LED on D9 and room lights on, send `1`. Cap the light sensor for ≥ 3 samples, uncap for ≥ 3. Repeat three times.
6. **Recovery.** Send `a`, confirm ≥ 5 consecutive consistent samples. Send `0`. Unplug USB.
7. **Analyse.** Use the matching capture/notes pair each time. For a successful calibration:

   ```bash
   python3 examples/analyze_run.py classify evidence/run-01.jsonl --calibration evidence/calibration.json --operator evidence/run-01-operator.csv
   ```

   Without a successful calibration:

   ```bash
   python3 examples/analyze_run.py classify evidence/run-01.jsonl --operator evidence/run-01-operator.csv
   ```

   Substitute each actual run's filenames. Fill the chapter's *Observed* columns from these outputs, not from memory. Above-range readings and conflicting operator/sensor observations remain unknown; both observations are retained. A changed room or sensor position needs fresh calibration.

## Stop and reset

Unplugging USB removes all power; keep it within reach. Safe state is LED off (`0`) or unpowered. If anything gets warm, smells, or the board resets repeatedly, unplug and check wiring before continuing. Do not substitute a relay, motor or mains load for the LED in this lab.

## Run manifest

Fill one manifest per capture in `evidence/manifest.md`, using the [package contract's](package-contract.md) lab run manifest fields: run ID; UTC time and timezone; operator; mode (physical); exact parts and markings; firmware and analysis SHA-256; wiring as built; room lighting; hypothesis and thresholds above; steps performed and deviations; artifact paths and hashes; observed values; unknowns; safe reset; conclusions and limits.

## Limits of what this lab can show

One rig, one room, a few repeats. The light sensor and the LED share the same board, so a board-wide failure affects both. Operator observation is timed only to the nearest sample. Results do not generalize to networked systems, other loads, or reliability claims.
