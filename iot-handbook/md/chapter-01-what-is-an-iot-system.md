# Chapter 1: What Is an IoT System, Really?

**Version:** 0.4 draft | **Evidence cutoff:** 2026-10-08 | **Reading time:** about 31 min (≈7,100 words at 230 wpm, code and HTML markup excluded) | **Lab time:** about 90 min, plus parts check | **Status:** draft; lab-pending; review-pending

> Draft notice. The lab in this chapter has a written procedure, tested analysis code and a predicted outcome, but it has **not been run**. Every result table marked *Not yet run* is waiting for real observations. The fan incident is a recorded historical observation from the sensor study, not a new run.

## If You Only Read One Section

An IoT system connects software to the physical world through networked devices that sense, actuate, or do both. A connected temperature logger needs no actuator to qualify. The engineering difficulty is that the thing you care about — a room's temperature, a motor's rotation, a light — is outside the program, and the program only ever holds a **belief** about it.

That belief is assembled from records: a sensor reading, a decision, a command, an acknowledgement, a reported state. Each record proves something real, but less than it seems to. A command record proves that software issued a command. A firmware state of `energized: true` proves that the firmware set its outputs. Neither proves that anything moved.

The guarantee boundary of this chapter is one sentence: **an effect is established only by an observation that does not travel the command path.** Everything else in the handbook builds on that distinction. We will ask three questions of every system: What did the software believe? What happened physically? What evidence connects them?

## Prerequisites and Outcomes

**Required:** comfort with Go code. **Not required:** any electronics. This chapter introduces voltage, current, resistance and ground as it needs them.

After this chapter you should be able to:

1. Draw an actuating IoT feature as a chain of belief, decision, command, effect and observation, and identify which parts a sensor-only feature omits.
2. Say exactly what a given record (return value, acknowledgement, pin readback, sensor value, human observation) does and does not establish.
3. Size a series resistor for an LED from a datasheet limit, and explain why "5 V" on a pin is a nominal value, not a measurement.
4. Choose an observation method for an effect, and name the failures it shares with the command path.
5. Design a fault that separates two hypotheses, instead of a test that both hypotheses survive.

## The Fan That Reported Energized

*Observed. Source: round-008 execution report in the real-world-sensor study, 8–9 September 2026. Operator observation only; no rotation instrument was fitted.*

The sensor study built a small thermal rig: a DHT11 temperature and humidity sensor, an Arduino Mega 2560-compatible board, an L293D motor driver and a small fan. Software on a laptop could send the board a bounded command such as "run the fan at 45% duty for 5 seconds", and the board would report back.

On 8 September, the first fan command produced a clean record:

```json
{"message_type":"result","command_id":"physical-fan-smoke-01","boot_id":"boot-38","status":"executed"}
```

The board's state report followed: `"current_output":{"target":"fan-01","operation":"set_pwm_lease","value":450,"energized":true}`. Five and a half seconds later, the lease expired and the board reported `energized: false` and `safe_state: true`, exactly as designed. Every software check passed.

The fan did not turn.

Over two days the rig ran six governed commands, at up to 60% duty, and a raw diagnostic sketch that drove the driver at full power in both directions. Every record said the outputs were being driven. The operator watching the fan saw no rotation, no twitch and heard no hum. Eventually the operator lifted the motor leads and touched them directly to the power supply. The motor spun. The fault was in the driver stage.

The cause was two jumper wires. The driver's direction inputs were plugged into Mega pins D4 and D3. The firmware drove D6 and D7. The program was correct, the board was correct, the driver was correct, and the motor was correct. The system was wrong, because a system includes its wiring. Moving the two jumpers to D6 and D7 produced visible, audible rotation on the next governed command.

Keep this incident in mind. By the end of the chapter we will be able to say precisely which records misled us, why the "decisive" full-power test was not decisive, and which single observation would have found the wiring fault on the first day.

## What Makes a System "IoT"

A useful baseline is [NIST's IoT-device definition](https://csrc.nist.gov/glossary/term/iot_device): a device interacts with the physical world through a sensor or actuator and has a network interface. Definitions vary with context, but this includes a connected temperature logger without requiring it to control anything.

For a system that acts, we will use a four-part control model: something that **senses**, something that **decides**, something that **acts**, and something that **observes** whether the action had the intended effect. A network may distribute these parts; it does not supply the missing observation.

If you have built distributed services, much of this will feel familiar: messages, retries, timeouts, partial failure. Three differences matter from the first chapter.

**Physical state is not yours to roll back.** A database transaction can abort. Heat already delivered to a room cannot. A motor that already ran for 10 seconds has already moved whatever it moves. Retrying a command is therefore not neutral: if the first attempt worked and you could not tell, the retry does it twice.

**You never read physical state directly.** A service reads its own memory. An IoT system reads a sensor, which converts a physical quantity into a voltage, which a converter turns into a number, which firmware turns into a reading, which a gateway turns into an event. Each step has its own delay, resolution and failure modes. The reading is evidence about the temperature, not the temperature.

**The wiring is part of the program.** In a service, the code that calls a function and the function it calls are both in the repository. In an IoT system, the firmware says "drive pin 6" and a physical wire decides what pin 6 is connected to. No compiler, type checker or test suite sees that wire. The fan incident is not an exotic failure; it is the characteristic failure of a system whose interface contract is a jumper.

The local USB-connected LED rig below isolates this sensing/control problem before networked integration. It is a precursor to an IoT system, rather than evidence that networking is optional in the definition. A standalone thermostat shares these physical-control problems; a networked sensor-only logger shares measurement uncertainty but has no actuator effect to verify.

### The whole system, before the local loop

<figure class="iot-diagram">
<picture>
  <source media="(max-width: 679px)" srcset="/images/iot-handbook/IOT-001/fig-0-iot-system-map-compact.svg">
  <img src="/images/iot-handbook/IOT-001/fig-0-iot-system-map.svg" alt="Illustrative IoT architecture: sensor and firmware send readings through transport, gateway and event processing. History is a separate branch. Optional decisions return bounded commands through local control to an actuator. Physical feedback returns through sensing." style="width:100%;height:auto">
</picture>
<figcaption>System map. Illustrative roles and flows, not a deployment diagram or an implemented product bridge. Readings travel outward; optional commands return; physical feedback supplies evidence about the effect.</figcaption>
</figure>

The top journey carries telemetry: the device samples and identifies a reading, transport carries it, a gateway can normalize or buffer it, and processing interprets it. History storage supports later queries and replay. A sensor-only logger can stop there.

The return journey carries control: a rule, person or supervisory agent decides, local control applies timing and output limits, and an actuator affects the physical world. These are roles, not one server per box; several can run on the same machine. Observe the physical quantity or effect to close the loop. A message acknowledgement closes only a transport hop.

Our USB-connected lab isolates the device, local control, actuator and observer. It teaches the physical boundary before adding network failure, remote decisions or fleets.

## The Model: Belief, Command, Effect, Observation

<figure class="iot-diagram">
<picture>
  <source media="(max-width: 679px)" srcset="/images/iot-handbook/IOT-001/fig-1-belief-and-physics-compact.svg">
  <img src="/images/iot-handbook/IOT-001/fig-1-belief-and-physics.svg" alt="Illustrative LED loop: a DHT11 reading crosses into software; a decision commands D9; current and light depend on wiring; a separate observer supplies evidence that is compared with the command." style="width:100%;height:auto">
</picture>
<figcaption>Figure 1. The same loop for the lab in this chapter. Software holds a reading, a decision and a command. Physics holds a temperature, a voltage, a current and light. Three arrows cross the boundary. Only the observation, which crosses back on a separate path, can be compared with the command to say whether the effect happened.</figcaption>
</figure>

Figure 1 shows the loop we will build in the lab. Read the desktop view as two rows that touch in three places; the compact view uses two columns with the same crossings.

**Sensing** crosses from physics to software. Air temperature changes the DHT11's internal element; the module converts that into a digital message on pin D2; a library turns the message into a number such as 26.3 °C. Software now holds a *reading*, which it treats as its belief about the room.

**Actuation** crosses from software to physics. The decision "LED on" becomes a command: `machine.D9.Set(true)`. That call sets a bit in the microcontroller's output register, which switches the pin's output transistor, which raises the pin's voltage, which drives current through the LED, which emits light. Every step after the register is physics.

**Observation** crosses back. A light sensor, or a person, detects the light and produces a record: lit, dark, or unknown. That record is the only one in the loop that is caused by the effect itself.

The comparison reached by Figure 1's dashed command path — command against observation — is the core operation of every reliable IoT system. It is how we know whether the world matches the belief.

### What each record establishes

The useful habit is to ask of every record: *what caused this to be written?* A record can only establish the things that had to be true for it to exist.

| Record | Written because… | Establishes | Does not establish |
|---|---|---|---|
| Decision log line "LED on" | Code reached that branch | The decision logic produced this output for this input | That the input was fresh or correct |
| `machine.D9.Set(true)` completed | The function returned | Nothing about the pin; [TinyGo `Pin.Set` returns nothing](https://tinygo.org/docs/reference/microcontrollers/machine/arduino-mega2560/#func-pin-set) | That the pin was configured as an output |
| Firmware state `energized: true` | Firmware set its own variable | Firmware believes it drove the outputs | That any pin moved, or that the right pins were wired |
| Transport acknowledgement (serial, broker) | A message reached the next hop | Delivery to that hop | That the receiver acted, or that the action had an effect |
| Pin readback HIGH | The input circuit saw the pin above its threshold | The pin is at a logic-high level | That current flows through the load, or that the load is on that pin |
| Light sensor "lit" | Light reached the sensor | Light at the sensor's position | That the light came from *this* LED, or that the sensor is healthy |
| Human observation "lit" | A person looked and saw light | Light was visible at that time | Precise timing or brightness; and people miss things |

Read down the "does not establish" column and the fan incident explains itself. The command result, the firmware state, and even the full-power diagnostic sketch's trace all sit in the first four rows. None of them was caused by the motor turning. They were all true, and all consistent with a motor that never moved.

### Readback is better than nothing, and less than it looks

The ATmega2560 lets firmware read a pin's actual logic level whatever the pin's direction, including while it is an output ([ATmega2560 datasheet](#sources), §13.2.4). In TinyGo, `machine.D9.Get()` reads that level, including in output mode. Our lab firmware records it as `pin_readback`.

Readback catches some real faults. If the pin is shorted to ground, or the output transistor is damaged, readback reports LOW while the firmware commanded HIGH. But in the fan incident, readback on D6 and D7 would have reported exactly what the firmware commanded, because those pins were driving nothing. Readback is evidence about the pin. The wiring fault lived after the pin.

## Just Enough Electricity

The lab drives an LED. That needs four ideas and one formula.

**Voltage** is the difference in electrical potential between two points, measured in volts (V). It is always *between* two points. "The pin is at 5 V" means 5 V relative to the board's ground.

**Ground** is the reference point all other voltages on a circuit are measured against. Two circuits that need to exchange signals must share a ground, or a "5 V" signal from one means nothing to the other. Missing common ground was one of the fan incident's candidate causes; it was a reasonable suspect.

**Current** is the rate of charge flow, measured in amperes (A) or milliamperes (mA). Current flows only around a closed loop: out of a source, through a load, back to the source's ground.

**Resistance** opposes current and is measured in ohms (Ω). For a resistor, **Ohm's law** relates them: *V = I × R*. Voltage in volts, current in amperes, resistance in ohms.

An LED is not a resistor. Once it conducts, the voltage across it stays roughly at its **forward voltage**, *V_f*, whatever the current. That is why an LED needs a series resistor: without one, almost nothing limits the current except the pin's own output stage.

### Worked example: sizing the LED resistor

*Illustrative values. Read the forward voltage from your LED's datasheet; it varies by colour and part.*

The ATmega2560 datasheet lists 40.0 mA as the absolute maximum DC current per I/O pin, and warns that stresses beyond the absolute maximum ratings "may cause permanent damage." An absolute maximum is a cliff edge, not an operating point; we want to stay well below it. Choose a target of 10 mA, and assume a red LED with *V_f* = 2.0 V.

The resistor sees the pin voltage minus the LED's forward voltage:

*R = (V_pin − V_f) / I = (5.0 V − 2.0 V) / 0.010 A = 300 Ω*

Resistors come in standard values, so take the next one up: 330 Ω. Now check the current with the value we actually fitted:

*I = (5.0 V − 2.0 V) / 330 Ω ≈ 9.1 mA*

That assumes the pin really sits at 5.0 V. It does not, under load. The datasheet guarantees only that a high output stays at or above **4.2 V while sourcing 20 mA** from a 5 V supply. At about 9 mA the drop will be smaller, but we only have the guaranteed bound, so use it for the worst case:

*I_min ≈ (4.2 V − 2.0 V) / 330 Ω ≈ 6.7 mA*

So the honest statement is "between roughly 6.7 and 9.1 mA, depending on the actual pin voltage and LED", not "9.1 mA". Both ends are far below 40 mA, and the LED will be clearly visible. Power dissipated in the resistor is *I²R* ≈ 0.0091² × 330 ≈ 27 mW, small for a typical through-hole resistor (check its rating).

Two lessons travel beyond LEDs. First, "5 V" on a pin is a nominal value; a datasheet gives you bounds under stated conditions, and your design should hold across the bound. Second, the calculation needs the part's own datasheet. Arduino's own guide says a pin cannot supply enough current for most relays, solenoids or motors ([Arduino digital pins](#sources)); that is why the fan needed an L293D driver at all.

### A pin that is not driven is not LOW

At power-up, Arduino (ATmega) pins default to inputs in a high-impedance state, and an input with nothing connected picks up noise and reports apparently random levels ([Arduino digital pins](#sources)). An undriven pin is not 0 V. It is *undefined*.

The sensor study met this twice. During USB bring-up, analog pin A0 had no sensor connected, and the board reported temperatures around 100 °C: a floating input converted into a confident-looking number. In the fan incident, the driver's inputs were wired to D4 and D3, pins the firmware never configured. The firmware was not holding them LOW; it was not holding them at all. The execution report describes them as LOW; strictly, that is an inference. What we can say from the L293D datasheet is enough: with the enable input high, each output follows its input ([TI L293D](#sources), Table 1), so whenever the two direction inputs sat at the same level, both motor terminals sat at the same voltage, and a motor with no voltage across it does not turn.

## Revisiting the Fan With the Model

<figure class="iot-diagram">
<picture>
  <source media="(max-width: 679px)" srcset="/images/iot-handbook/IOT-001/fig-2-fan-incident-timeline-compact.svg">
  <img src="/images/iot-handbook/IOT-001/fig-2-fan-incident-timeline.svg" alt="Recorded investigation, 8–9 September 2026: governed commands and a raw diagnostic reported drive while the operator saw no rotation. Direct supply connection spun the motor; correcting D4/D3 jumpers to D6/D7 produced rotation. Earlier wiring is shown in hindsight." style="width:100%;height:auto">
</picture>
<figcaption>Figure 2. Five stages of the recorded investigation, separating software reports, operator observations and diagnostic interpretation. The governed reports said executed and energized before and after the repair; the physical outcome changed. Early wiring is reconstructed in hindsight. Rotation was operator-observed, with no tachometer or current probe.</figcaption>
</figure>

Figure 2 lays the incident out as evidence rather than narrative. Three things stand out.

**The software rows never changed.** Command result and firmware state were green in every governed run, including the ones where the fan was stationary. They could not distinguish success from this failure, because nothing in them was caused by rotation.

**The candidate list did not contain the answer.** After the first day, the report listed the motor supply rail, common ground, motor terminal wiring and startup torque as suspects. The input wiring was not on the list. That is an easy trap: we suspect the parts we think of as "hardware", and treat the pin map as settled because it is written in the firmware. The firmware's pin map is a claim about the wiring, not an observation of it.

**The "decisive" test was decisive about the wrong thing.** The raw full-power sketch bypassed the command protocol, the governance limits and the duty ceiling. When the fan still did not move, the report concluded that this "conclusively rules out firmware" and placed the fault in motor power delivery. It did rule out the governance path. But the raw sketch used the same pin map — D5, D6, D7 — as the governed firmware. Both programs shared the faulty assumption, so both failed the same way. A test can only discriminate between hypotheses that predict different outcomes for it, and "the inputs are on the wrong pins" predicted exactly what was seen.

The report's proposed next step was a multimeter across the motor terminals during a driven phase, reading "~0 V confirms the VCC2/ground fault." That reading would almost certainly have been close to 0 V — the motor never even hummed — and would have been read as confirming the wrong cause, because the input-wiring fault also leaves no voltage across the motor. The step that actually split the hypotheses was the isolation test: connect the motor straight to the supply. It spun, which eliminated the motor and supply together and left only the driver stage. From there, comparing the physical jumpers with the firmware's pin map found the fault.

<figure class="iot-diagram">
<picture>
  <source media="(max-width: 679px)" srcset="/images/iot-handbook/IOT-001/fig-3-test-discrimination-compact.svg">
  <img src="/images/iot-handbook/IOT-001/fig-3-test-discrimination.svg" alt="Reasoning model: six candidate causes against five tests. The raw sketch rules out only firmware and torque; a proposed meter reading would not separate supply, ground and wiring; motor on supply rules out the motor; comparing jumpers with the pin map confirms a wiring fault; rewiring alone fixing it rules out supply and ground." style="width:100%;height:auto">
</picture>
<figcaption>Figure 3. Which test could tell the causes apart? A reasoning model built from the recorded report: each cell is what the test would show if that cause were the only fault. A test removes only the causes whose prediction differs from what was observed. The meter test was proposed and never run.</figcaption>
</figure>

Figure 3 makes the argument mechanical. Six causes were plausible after the first day. The full-power sketch observed "still"; only two causes predicted anything else, so it removed two and left four. The proposed meter would have read about 0 V under three of the remaining four, so it could not have separated them. The supply test removed the motor. Comparing the jumpers with the pin map *confirmed* a wiring fault, but finding one fault does not exclude a second; it was rewiring alone producing rotation that ruled out a supply or ground fault as well.

Which single observation would have found it on day one? A continuity check — one multimeter probe on the driver's 1A input (pin 2), one on the Mega's D6 header — would have shown no connection. That check compares the wiring against the pin map directly, instead of inferring the wiring from symptoms. The habit to form now is to **verify the wiring against the code's pin map before believing either.**

## Choosing How to Know

Every effect needs an observation, but not every observation is equally good, equally cheap, or equally independent. Here are the options for our LED, in increasing distance from the command path.

| Method | What it can catch | What it shares with the command path | Cost |
|---|---|---|---|
| Trust the call returned | Nothing about the effect | Everything | Free |
| Firmware state flag | Logic bugs that skip the command | Firmware, board, wiring | Free |
| Pin readback | Shorted or damaged pin; wrong pin *mode* | Firmware, board, wiring after the pin | Free on AVR |
| Electrical measurement (current through the load) | Open circuit, missing load, wrong wiring | Board power; measurement wiring | An instrument or sense circuit |
| Independent physical sensor (light sensor for light) | Load missing, wrong pin, dead LED | Board, if the same board reads the sensor; room light | A sensor, a pin, calibration |
| Human observation | Gross failures of all kinds | Little, but timing is imprecise and attention lapses | Someone watching |

Two judgements follow from the table.

**Independence is a spectrum, and you should say where you are on it.** In our lab, the light sensor is read by the same Mega that drives the LED. The *physical* path — pin, LED, light, sensor — is independent of the firmware's belief, which is what matters for catching wiring faults. But a board-wide failure, such as a brown-out or a frozen loop, would affect both the command and the observation. A light sensor on a second board would remove that shared failure. For a lab LED, the same board is good enough; for a heater, it would not be.

**Match the observer to the claim.** A light sensor can say "light reached me." It cannot say the LED is at full brightness, nor that the light was not a desk lamp. If the claim you need is "the fan is cooling the room", rotation is not enough either; you need a temperature measurement downstream of the fan, and time for it to change. The rule: the observation must be caused by the effect you are claiming, not by a step before it.

A decision rule for this chapter: *observe any effect whose silent failure would mislead a person or a later decision.* The counterexample is an indicator LED that duplicates information already shown elsewhere; observing it costs more than its failure. The fan in a thermal loop is the opposite case: if it silently fails, the controller will keep believing it is cooling while the room heats. That belief needs evidence before it can support another decision.

### Watch it happen

Three paused animations follow the evidence from command to physical observation. Use each play control to advance the scene. The diagrams and captions retain the lesson without JavaScript or motion.

<label class="iot-scenario" for="iot-scenario">Illustrative LED bench
<select id="iot-scenario">
<option value="wiring">Wrong wire: command on, LED dark</option>
<option value="baseline">Correct wiring: light observed</option>
<option value="blind">Covered observer: effect unknown</option>
</select></label>

### Same Command, Three Benches

<figure class="scene iot-scene" id="evidence-scene" data-scene="iot-evidence" data-scenario="wiring" data-label="Illustrative sequence: command issued, pin driven, physical effect, observation, then comparison. A wrong wire produces dark evidence; a covered observer produces unknown.">
<div class="scene__stage"><picture><source media="(max-width: 679px)" srcset="/images/iot-handbook/IOT-001/fig-1-belief-and-physics-compact.svg"><img src="/images/iot-handbook/IOT-001/fig-1-belief-and-physics.svg" alt="Static alternative: a command crosses into physics, then a separate observation is compared with it."></picture></div>
<figcaption class="evidence-caption">Illustrative. No sensor values or hardware timings were measured. The command and readback records are identical in all three cases; only the wire, the light and the observer differ. Correct wiring yields agreement; a jumper on the wrong pin yields contradiction; a covered observer leaves the effect unknown. The cases assume usable calibration; in a dim room a cap can resemble ordinary darkness, which the physical lab must check.</figcaption></figure>

### The Fan Incident in Four Stages

<figure class="scene iot-scene" id="fan-scene" data-scene="iot-fan" data-label="Recorded fan incident in four stages: governed commands and a raw sketch drive D5, D6 and D7 while the driver inputs are jumpered to D4 and D3, so the fan stays still; connecting the motor to its supply spins it; moving the jumpers to D6 and D7 makes the fan spin with the same software record.">
<div class="scene__stage"><picture><source media="(max-width: 679px)" srcset="/images/iot-handbook/IOT-001/fig-2-fan-incident-timeline-compact.svg"><img src="/images/iot-handbook/IOT-001/fig-2-fan-incident-timeline.svg" alt="Static alternative: five recorded stages of the fan incident."></picture></div>
<figcaption class="evidence-caption">Illustrative replay of a recorded incident (round-008, 8–9 September 2026). Stages are compressed; rotation was observed by the operator, with no tachometer or current probe. The jumper positions were only known in hindsight; the scene marks that moment.</figcaption></figure>

### Which Test Tells the Causes Apart?

<figure class="scene iot-scene" id="tests-scene" data-scene="iot-tests" data-label="Reasoning model: five diagnostic tests against six candidate causes. The raw full-power sketch rules out only firmware and startup torque; a proposed meter reading would not separate supply, ground and wiring; motor-on-supply rules out the motor; comparing jumpers with the pin map confirms a wiring fault; rewiring alone fixing it rules out supply and ground.">
<div class="scene__stage"><picture><source media="(max-width: 679px)" srcset="/images/iot-handbook/IOT-001/fig-3-test-discrimination-compact.svg"><img src="/images/iot-handbook/IOT-001/fig-3-test-discrimination.svg" alt="Static alternative: table of candidate causes against diagnostic tests."></picture></div>
<figcaption class="evidence-caption">Illustrative reasoning model built from the recorded report, not a recorded sequence of instrument readings. Each cell is what the test would show if that cause were the only fault. The meter test was proposed in the report and never run.</figcaption></figure>

## The Lab: One Loop, Three Observers

The full procedure, wiring, safety limits and pre-registered criteria are in [lab.md](/iot-handbook/examples/what-is-an-iot-system/lab.md). Here is what it tests and what we predict.

**Rig.** The historical rig's Mega 2560-compatible board and DHT11 on D2 (both verified working in the sensor study on 8 September). An LED with a 330 Ω series resistor on D9. Optionally, a photoresistor facing the LED, read on A0. All parts must be confirmed against the actual bench before wiring; none is assumed.

**Firmware.** [`main.go`](/iot-handbook/examples/what-is-an-iot-system/firmware/main.go) uses TinyGo on the Mega 2560-compatible board. It starts a DHT11 measurement every 2.5 seconds, decides whether the LED should be on, drives D9, waits 500 ms for the light sensor to settle, and prints one JSON record per sample. The decision logic lives in [`decide.go`](/iot-handbook/examples/what-is-an-iot-system/control/decide.go), with no hardware imports, so standard Go can test it on a laptop:

```go
func Decide(mode Mode, reading Reading, thresholdDeciC int16) Decision {
    if mode == ForceOn { return Decision{true, "forced_on"} }
    if mode == ForceOff { return Decision{false, "forced_off"} }
    if !reading.Valid { return Decision{false, "invalid_reading"} }
    if reading.TempDeciC >= thresholdDeciC {
        return Decision{true, "at_or_above_threshold"}
    }
    return Decision{false, "below_threshold"}
}
```

Temperature is stored in tenths of a degree: `260` means 26.0 °C, matching the driver's integer units. A failed sensor read is not evidence that the room is cool. The function falls back to the benign output and records *why*, so an analyst cannot mistake `invalid_reading` for `below_threshold`. The firmware consumes a temperature only after the current measurement succeeds; the driver's retained value is not accepted after failure.

TinyGo's Mega ADC returns a left-aligned 16-bit value with 10-bit precision. The firmware shifts it right by six before reporting `light_raw`, preserving the lab's 0–1023 calibration scale. Go tests cover decisions, failure/recovery, serial commands and JSON encoding; a target build checks the hardware APIs. Neither establishes physical behaviour. See lab.md for the exact versions and build result. The host analysis utility remains Python.

Each record carries the whole belief chain for one sample:

```json
{"seq":12,"t_ms":30017,"mode":"auto","reading":"ok","temp_c":26.3,"threshold_c":26.0,
 "reason":"at_or_above_threshold","commanded":1,"pin_readback":1,"light_raw":731}
```

*Illustrative record showing the format, not a measurement.*

**Three observers.** Pin readback (cheap, close to the command path), the light sensor (instrumented, physically independent), and the operator (a person writing down what they see against the sequence number). The analysis script [`analyze_run.py`](/iot-handbook/examples/what-is-an-iot-system/analyze_run.py) compares each record's command with the best available observation and classifies it as `effect_consistent`, `effect_contradicted`, `effect_unknown` or `pin_disagrees_with_command`.

### Phase 1: calibrate the observer

Before the light sensor can testify, we check that it can tell lit from dark at all. Force the LED off for at least five samples, then on for at least five. The calibration step refuses to proceed unless the lowest lit reading exceeds the highest dark reading by at least 50 ADC counts. With the Mega's 10-bit converter on a 5 V reference, one count is about 4.9 mV ([ATmega2560 datasheet and TinyGo machine API](#sources)), so 50 counts is about 0.24 V. The threshold is fixed before the run, in the script and in lab.md; we do not move it after looking at the data.

If the sensor cannot separate the two states, that is a result: the lab falls back to operator observation and says so.

### Phase 2: baseline

Run in automatic mode, with the threshold set about 1.5 °C above the room's reading. Warm the DHT11 gently with a fingertip until the reading crosses the threshold, then let it cool.

| Prediction (written before the run) | Observed |
|---|---|
| LED is commanded on in the same sample in which the reading first reaches the threshold | *Not yet run* |
| Every `commanded:1` record has `pin_readback:1` | *Not yet run* |
| No record is `effect_contradicted`; at most one `effect_unknown` per on/off transition | *Not yet run* |
| Operator notes agree with the light sensor on every sampled record | *Not yet run* |

An above-range reading is `out_of_calibration`, not proof that the LED is on. When a recorded operator observation disagrees with an in-band sensor observation, analysis retains both and returns `effect_unknown`.

The allowance for one unknown per transition is there because a photoresistor responds far more slowly than an LED; if the 500 ms wait is too short for the actual part, transitions will read *ambiguous*. Expect a second wrinkle too: with a single threshold and a noisy reading, the LED may flicker on and off while the temperature sits near the threshold. That is not a fault in the lab; it is the problem hysteresis solves, which introduces separate turn-on and turn-off thresholds.

### Phase 3: fault F1 — the wiring no longer matches the pin map

This is the fan incident, made benign. Unplug USB, move the LED's jumper from D9 to D10, a pin the firmware never drives, and reconnect. The board reboots into automatic mode, so force the LED on again.

| Prediction | Observed |
|---|---|
| Firmware continues to report `commanded:1` | *Not yet run* |
| `pin_readback` stays 1: D9 is still high; it is just connected to nothing | *Not yet run* |
| Light sensor reads in the dark band; analysis reports `effect_contradicted` | *Not yet run* |
| Operator sees the LED dark | *Not yet run* |

*What would falsify the prediction:* `pin_readback` reading 0 would mean D9 is not at the level the firmware set, which our model says should not happen with nothing attached. Any glow from the LED would mean something is supplying current through D10. A high-impedance input cannot do that, but a pin with its internal pull-up enabled can light an LED dimly ([Arduino digital pins](#sources)); a glow would therefore tell us D10 is not in the state we assumed. Either outcome is a result to record, not a run to discard.

### Phase 4: fault F2 — the observer goes blind

Restore the LED to D9. With the LED forced on, cover the light sensor with an opaque cap.

| Prediction | Observed |
|---|---|
| `commanded:1`, `pin_readback:1`, LED visibly lit to the operator | *Not yet run* |
| In a lit room, the light reading falls *below* the calibrated dark band | *Not yet run* |
| Analysis reports `effect_unknown` (observer blind), **not** `effect_contradicted` | *Not yet run* |

*What would falsify the prediction:* a capped reading inside the dark band. That happens if the room is so dim that "LED off" and "covered" look alike, and it would mean this observer cannot detect its own blindness under these conditions — a limitation to report.

This fault tests the observer, not the LED. A naive check — "light sensor says dark, so the LED is off" — would report a failure that did not happen. Because calibration recorded what "LED off in this room" looks like, a reading darker than that is evidence that the observer itself is compromised. The correct output is *unknown*. An IoT system that cannot distinguish "the effect failed" from "I can no longer see the effect" will either raise false alarms or, worse, teach its operators to ignore them.

### Phase 5: recovery

Uncover the sensor, confirm the LED is on D9, return to automatic mode, and run until at least five consecutive records are `effect_consistent`. Then force the LED off and unplug USB, which removes all power from the rig. That is the physically accessible stop for this lab.

### What the lab can and cannot show

When run, this lab will show — on one named rig, under one room's lighting — that a command record and a pin readback can both stay true while the effect disappears, and that a calibrated independent observer catches it. It will be an operator-observed and instrumented physical run with a small number of repeats. It cannot show that the method is reliable across rigs, that the light sensor is accurate in any absolute sense, or anything about systems with networks between the parts. Each would require a separately scoped experiment and more evidence.

## Safety, Security and Stale Data From Day One

The lab is low-energy by design: a 5 V USB-powered board, an LED, a sensor. That is a choice, not a limitation to work around.

- **A benign output first.** An LED proves an optical response only. It does not qualify a motor, heater or pump. Do not swap in a mains relay because the code "already works": nothing in this chapter has established the safety of a load that can hurt someone.
- **A physical stop you can reach.** Unplugging USB removes all power. Know where it is before you start. Software stops come later and never replace this one.
- **Rated wiring.** Every part has limits; the resistor calculation above exists so the pin stays far from its 40 mA absolute maximum. Change wiring with USB unplugged.
- **Trust boundaries.** The serial port accepts single-character commands from anything that opens it. That is acceptable for a laptop on your desk and unacceptable on a network. Treat every input that crosses into the device as untrusted. A networked command path needs an authenticated device identity and authorization.
- **No secrets in firmware.** This lab has none. When later chapters add network credentials, they stay out of source files and evidence logs.
- **Stale data.** A reading is a statement about the past. The TinyGo DHT driver retains the last successful value; its explicit measurement API does not enforce the two-second interval. Our firmware starts measurements 2.5 seconds apart and checks each attempt before consuming a value (drivers v0.36.0). The driver also masks interrupts during pulse acquisition, so serial commands can be delayed or lost; `0` is a convenient control, while unplugging USB is the immediate stop. A decision made on a stale reading is a decision about a room that may no longer exist.
- **Acknowledgement is not effect.** The serial log confirms that each record was sent and received. None of those records turned on an LED.

## Where Tamoz and Agentic Stream Fit

*Optional. Readers can skip this section without losing the chapter's argument.*

The sensor study connects this kind of rig to two research products: Agentic Stream, which turns events into deterministic situations, and Tamoz, which orchestrates supervisory agents. Here we examine one boundary in that architecture.

Agentic Stream records whether a physical transition has complete evidence. Its check, as of commit `be37f6b`, is:

```go
func PhysicalEvidenceComplete(details map[string]any) bool {
	if !claimsComplete(details) {
		return false
	}
	source, _ := details["source"].(string)
	digest, _ := details["evidence_digest"].(string)
	_, err := canonicaljson.DecodeDigest(digest)
	return source != "" && err == nil
}
```

This verifies the *shape* of the evidence — a completeness claim, a named source, a well-formed digest. It cannot verify that the evidence is true; no code can, from inside the software row of Figure 1. That is a correct design, not a gap: the function's job is to refuse transitions without evidence, and the observation's job is to be caused by the effect. A system is only as good as the observer behind the digest. The same applies to an agent: a supervisory decision that was admitted, logged and executed is still a belief until something in the physical row says otherwise.

## Design Principles

1. **Write down the belief.** For every effect your system causes, name the record that represents the software's belief about it, and what wrote that record.
2. **Observe off the command path.** Establish an effect only with an observation caused by the effect. Say which failures the observer shares with the command path.
3. **Make unknown a first-class answer.** "Not observed", "observer blind" and "reading invalid" are distinct from "off", "dark" and "cool". Collapsing them produces confident wrong answers.
4. **Verify wiring against the pin map.** The pin map is a claim. A continuity check or a deliberate one-pin test is the observation that confirms it.
5. **Calibrate before you trust.** An observer that has not been shown to separate the states you care about is not yet an observer.
6. **Design faults that discriminate.** Before running a diagnostic, write down what each hypothesis predicts. If they all predict the same outcome, the test cannot help.
7. **Start benign.** Prove the evidence chain on a load that cannot hurt anyone, then earn the right to drive a bigger one.

## Transfer Exercise

A team runs a greenhouse. A controller reads soil moisture every 10 minutes and, when it drops below a threshold, publishes "open valve 3 for 60 seconds" to a broker. A gateway near the valves receives it, energizes a solenoid valve through a relay, and publishes `{"valve":3,"state":"open"}`. A dashboard shows the valve open for 60 seconds. One week, bed 3's plants wilt, although the dashboard shows the valve opening twice a day.

1. Draw the loop as in Figure 1. Mark the sensing, actuation and observation crossings.
2. List every record in the chain and, for each, what it does and does not establish.
3. Propose two hypotheses for the wilting and one observation that distinguishes them.
4. Propose the cheapest observation that would establish water actually flowed.

### Worked answer

**1.** Sensing: soil moisture probe → controller. Actuation: gateway → relay → solenoid → valve → water. Observation: *there is none*. The arrow back from physics to software that Figure 1 requires is missing; the dashboard's "open" comes from the gateway's own state.

**2.** The broker acknowledgement establishes delivery to the broker. The gateway's `state: open` establishes that the gateway believes it energized the relay, like the fan's `energized: true`. The dashboard establishes that the dashboard received the gateway's message. None was caused by water moving. The moisture reading is the only physical record, and it is upstream of the action.

**3.** Hypothesis A: the valve opens but water does not reach bed 3 (blocked line, closed manual valve, low pressure). Hypothesis B: the relay is wired to the wrong solenoid, so a different bed is being watered. Both predict that bed 3's moisture does not rise after each "open". They differ on the other beds: B predicts a neighbouring bed's moisture rises after each valve-3 command; A does not. Comparing all beds' moisture traces against valve-3 command times distinguishes them without new hardware. A continuity or one-valve-at-a-time test then confirms B directly.

**4.** A flow sensor on bed 3's line is the direct observer. Cheaper, and good enough to start: bed 3's own moisture reading 20–30 minutes after each opening, compared with before. It is slow and indirect (moisture depends on soil and weather), so it cannot say *when* water flowed, but it is caused by water arriving, which no current record is.

## Misconceptions

**"If the protocol guarantees delivery, the command was carried out."** Delivery guarantees are about messages between endpoints. Carrying out a command is the receiver's behaviour, and the effect is the world's. MQTT and CoAP delivery semantics must be assessed separately from the physical effect.

**"Reading the pin back proves the output works."** It proves the pin is at a logic level. The fan incident's D6 and D7 would have read back correctly while driving nothing.

**"If the software shows no error, the hardware is fine."** The fan rig had no errors. Software can only report the failures it can sense, and it had no sensor on the shaft.

**"More logging would have caught the fan fault."** More logs from the same path repeat the same belief. Catching it needed one observation from a different path.

**"The diagnostic sketch bypassed the firmware, so it tested the hardware."** It bypassed the governance code and kept the pin map. A bypass tests only what it does not share.

## Summary

An IoT system holds beliefs about physical state it cannot read directly. Its records — decisions, commands, acknowledgements, reported states, pin readbacks — each establish less than they appear to, and the useful question for every record is what caused it to be written. An effect is established only by an observation caused by the effect, travelling off the command path, from an observer that has been calibrated and can say "unknown".

The fan that reported `energized: true` for two days was a correct program in a wrongly wired system. The records that misled were all true. The test called decisive shared the fault it was meant to find. The observation that ended it — a motor touched to its supply — was the first one that could tell the hypotheses apart.

The next question follows directly. We have treated the DHT11's 26.3 °C as a reading to compare against a threshold. But what does a sensor actually measure, how wrong can it be, and how would you know? That question concerns the sensing arrow in our model.

## Glossary

- **Absolute maximum rating:** a stress limit beyond which a part may be permanently damaged; not an operating target.
- **Actuation:** software causing a physical change, through an output pin and usually a driver.
- **Belief:** the software's current record of a physical state; always derived, possibly stale or wrong.
- **Effect:** the physical change a command was meant to cause.
- **Floating input:** an input pin with nothing driving it; its reading is undefined.
- **Forward voltage (V_f):** the roughly constant voltage across a conducting LED or diode.
- **Ground:** the reference point voltages are measured against; communicating circuits must share it.
- **Observation:** a record caused by the effect itself, via a path separate from the command.
- **Ohm's law:** *V = I × R* for a resistor.
- **Pin map:** the firmware's declaration of which pin does what; a claim about the wiring, not a measurement of it.
- **Pin readback:** reading the logic level of an output pin; evidence about the pin, not about the load.

## Sources

Material claims and their status are recorded in [claims.md](/iot-handbook/examples/what-is-an-iot-system/claims.md); full source records are in [sources.md](/iot-handbook/examples/what-is-an-iot-system/sources.md).

- **ATmega2560 datasheet:** Atmel, *ATmega640/V-1280/V-1281/V-2560/V-2561/V datasheet*, 2549Q–AVR–02/2014. §13.2.4 (reading the pin value); Electrical Characteristics (40.0 mA absolute maximum per I/O pin; V_OH ≥ 4.2 V at I_OH = −20 mA, V_CC = 5 V). [PDF](https://ww1.microchip.com/downloads/en/devicedoc/atmel-2549-8-bit-avr-microcontroller-atmega640-1280-1281-2560-2561_datasheet.pdf)
- **TI L293D:** Texas Instruments, *L293x Quadruple Half-H Drivers*, SLRS008D, revised January 2016. Table 1 function table; VCC1/VCC2 description. [PDF](https://www.ti.com/lit/ds/symlink/l293d.pdf)
- **Arduino digital pins:** Arduino, *Digital Pins*, last revision 02/09/2026. [docs.arduino.cc](https://docs.arduino.cc/learn/microcontrollers/digital-pins/)
- **TinyGo Mega API:** `Pin.Set`, `Pin.Get`, `ADC.Get`; v0.42.0 machine implementation inspected 2026-10-08. [tinygo.org](https://tinygo.org/docs/reference/microcontrollers/machine/arduino-mega2560/)
- **NIST IoT device:** network interface plus a sensor or actuator; glossary entry referring to NISTIR 8425, accessed 2026-10-08. [csrc.nist.gov](https://csrc.nist.gov/glossary/term/iot_device)
- **TinyGo DHT driver v0.36.0:** explicit measurement API, retained values and interrupt masking; source inspected 2026-10-08. [upstream source](https://github.com/tinygo-org/drivers/tree/v0.36.0/dht)
- **Sensor study:** real-world-sensor, round-008 execution report and Round 2 hardware inventory, working tree at `6f523d4` (dirty); report SHA-256 `8d167169…ebf790b`.
- **Agentic Stream:** `internal/authority/internal/domain/safety.go` at `be37f6b`, inspected 2026-10-08.

## Revision History

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-10-08 | First draft. Lab procedure, firmware, analysis code and figures prepared; lab not run; not independently reviewed. |
| 0.2 | 2026-10-08 | Convert embedded examples to TinyGo and host Go tests; remove unwritten-chapter navigation and centralize deferred links. Correct IoT scope, run-bound observations, calibration limits and lab commands from round 2. Physical lab and independent review remain pending. |
| 0.3 | 2026-10-08 | Redesign control and fan evidence diagrams; add whole-system map, compact variants and local illustrative motion preview using the existing runtime. Physical evidence remains pending. |
| 0.4 | 2026-10-08 | Add Figure 3 (test discrimination) and its explanation; replace the abstract animation with a physical bench scene; add fan-incident and test-elimination animations. Fix the closing temperature value and a pronoun slip. Physical evidence and independent review remain pending. |
