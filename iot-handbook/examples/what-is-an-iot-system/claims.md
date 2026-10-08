# IOT-001 material claims

Status values: supported, qualified, illustrative, inference, pending. "Inference" marks the author's reasoning from cited facts.

| ID | Claim (chapter location) | Kind | Evidence | Status / boundary |
|---|---|---|---|---|
| C1 | TinyGo `Pin.Set` returns nothing (Model, record table) | API | S4 | Supported |
| C2 | Firmware state, transport ack and decision logs are not caused by the effect (Model) | Inference | C1, S8 | Inference from what writes each record |
| C3 | AVR pin level can be read whatever the pin direction (Readback) | Device | S1 §13.2.4 | Supported; TinyGo 0.42.0 `Pin.Get` implementation reads the PIN register (S4) |
| C4 | 40.0 mA absolute max per I/O pin; stresses beyond may cause permanent damage (Electricity) | Device | S1 | Supported |
| C5 | V_OH ≥ 4.2 V at I_OH = −20 mA, V_CC = 5 V; LED current 6.7–9.1 mA for 330 Ω, V_f 2.0 V (worked example) | Device + calc | S1; arithmetic | V_OH supported; V_f = 2.0 V **illustrative**; range is a bound, not a measurement |
| C6 | Pins default to high-impedance inputs; floating inputs read noise; pull-up can dimly light an LED (Electricity; F1 falsifier) | Platform | S3 | Supported |
| C7 | Floating A0 produced ≈ 100 °C readings at bring-up (Electricity) | Captured evidence | S9 | Supported as recorded; not re-run |
| C8 | With EN high, each L293D output follows its input; equal inputs give equal outputs, no motor voltage (Electricity) | Device + inference | S2 Table 1 | Table supported; "no voltage across motor" is inference from it. The report's "both LOW" is the report's inference; chapter says so |
| C9 | Mega ADC is 10-bit, ≈ 4.9 mV per count at 5 V reference; TinyGo left-aligns it by six bits (Lab) | Platform | S4, S1 | Supported for this target; firmware shifts right by six to preserve 10-bit counts |
| C10 | Fan commands returned `executed` and `energized: true` while the operator saw no rotation; 4 governed commands on 8 Sep, 2 on 9 Sep, plus raw full-power sketch | Captured evidence | S8 | Supported; operator observation |
| C11 | Candidate causes listed after 8 Sep omitted input wiring | Captured evidence | S8 "Operator observation" section | Supported |
| C12 | Raw sketch used the same pin map (D5/D6/D7); report concluded firmware ruled out and blamed motor power | Captured evidence | S8 | Supported |
| C13 | Motor touched to supply spun; root cause inputs on D4/D3; moving to D6/D7 gave operator-observed rotation (boot-59) | Captured evidence | S8 | Supported; operator observation, no instrument |
| C14 | A motor-terminal voltage check would have read near 0 V under the actual fault; a D6-to-driver continuity check would have found it | Inference | C8, C13 | Inference; not performed |
| C15 | TinyGo DHT explicit measurement API retains successful values and does not enforce spacing; firmware checks current read before consumption and starts reads 2.5 seconds apart | Implementation | S7 | Supported for v0.36.0 source; runtime timing on the named rig pending |
| C16 | `PhysicalEvidenceComplete` checks completeness flag, non-empty source and decodable digest only | Implementation | S10 | Supported at `be37f6b` |
| C18 | A photoresistor responds far more slowly than an LED; 500 ms observation delay (Lab) | General physics + design choice | None cited; part unverified | **Qualified** — verify against the actual part's datasheet during calibration; falsifiable by readings still settling |
| C17 | Lab predictions (baseline, F1, F2) | Prediction | lab.md | **Pending** — not run |
| C19 | IoT devices have a sensor or actuator and a network interface; local LED loop is a precursor, connected sensor-only logger qualifies | Definition + application | S5 | Supported as NIST's working definition, not universal terminology |
| C20 | System map shows telemetry, optional bounded control, history and physical feedback; roles can be colocated | Architecture illustration | Author design; C19 defines networked sensor-only boundary | **Illustrative** — not a deployment diagram or implemented Tamoz/Agentic Stream bridge |
| C21 | Bench animation produces consistent, contradicted or unknown verdicts for the three selected scenarios with identical command and readback records | Teaching model | visuals/scene-iot.js `benchAt`; round 5 causal tests | **Illustrative** — timings are staged; covered-observer detection assumes a distinguishable calibrated band; no lab execution claim |
| C22 | Fan animation stages: governed commands and raw sketch drive D5–D7 with inputs on D4/D3 and no rotation; motor on supply spins; jumpers moved to D6/D7 spin with the same software report | Captured evidence, replayed | S8; C10–C13 | **Illustrative replay** — stages compressed; jumper positions known only in hindsight and marked so; rotation operator-observed |
| C23 | Figure 3 / test animation: each test removes only causes predicting a different result; bypass removes 2, supply test removes 1, pin-map comparison confirms wiring without excluding others, rewiring removes supply and ground | Inference from captured evidence | S8; C8, C11–C14 | **Inference** — single-fault predictions are the author's reasoning; the meter test was proposed in S8 and never run |
