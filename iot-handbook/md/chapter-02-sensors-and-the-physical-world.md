# Chapter 2: Sensors and the Physical World

**Version:** 1.4 | **Sources checked:** 2026-10-12

## If You Only Read One Section

A sensor reading is the output of a measurement chain. Its meaning depends on what we intended to measure, how the sensor interacts with that quantity, how the signal is converted, and which corrections and assumptions we use to interpret it. The physical condition an application cares about is a further inference from that number.

Every sensor exploits a physical effect: a resistance that changes with temperature, a voltage at a junction of two metals, a capacitance that changes as a polymer absorbs water. The effect determines what the sensor actually responds to and which errors come with it. Knowing the effect tells you where to look when a reading misleads.

Start with the **measurand**: the quantity intended to be measured. Then follow the path from that quantity to the reported result, and ask what each stage can change or lose. Choose a sensing design from the decision it must support. More digits, more messages, and smoother charts add evidence only when they carry the distinction that decision needs.

## Prerequisites

[Chapter 1: What Is an IoT System?](/iot-handbook/chapter-01-what-is-an-iot-system.html) establishes measurement, telemetry, feedback, and freshness. This chapter develops the sensing part of that model. You need software experience and basic arithmetic; electronics, calculus, and a hardware kit are not prerequisites. Figures, value tables and design consequences carry the main path. Equations and detailed calculations are in optional disclosures; they are not required to follow the chapter.

This is theoretical study material. Worked readings and requirements are constructed examples, not observations from equipment. Device documents illustrate mechanisms; no part is recommended.

Terminology follows the international metrology vocabulary, **JCGM 200:2012 (VIM3)**. Uncertainty follows **NIST Technical Note 1297 (1994)**, an accessible introduction to the GUM, the *Guide to the Expression of Uncertainty in Measurement*. Editions and the 2026 GUM amendment are recorded in [the source register](/iot-handbook/sources/chapter-02.md).

### Learning Outcomes

After studying this chapter, you should be able to:

1. Define a measurand and trace a measurement chain from physical coupling to a software result.
2. Explain how common sensors convert a physical quantity into an electrical signal, and name the characteristic limitation each principle brings.
3. Distinguish resolution, sensitivity, precision, trueness, accuracy, and uncertainty, and explain what calibration and traceability establish.
4. Reason about sampling, aliasing, filtering, sensor response, and saturation under explicit assumptions.
5. Evaluate whether a measurement supports a decision, and preserve its limitations in software.


## Begin With the Quantity, Not the Device

### Opening problem: two reasonable readings

Consider a constructed room-monitoring system. One sensor reports **24.2 °C** near the center of the room. Another reports **26.0 °C** beside a warm equipment enclosure. Both values arrive on time with valid checksums. The application labels both “room temperature” and raises a disagreement alert.

Which sensor is wrong?

The numbers cannot answer that. The sensors may be measuring different local conditions. The application might need air temperature at an occupied location, an average across the room, or the maximum near equipment. Those are different measurands. A single point measurement directly addresses the quantity at its point; an average or a maximum needs more evidence or assumptions.

### Specify the measurand

VIM3 defines the measurand around the intended quantity and notes that its specification needs relevant information about the phenomenon, object, and state. The measurement itself can affect what is measured. [VIM3, §2.3](https://jcgm.bipm.org/vim/en/2.3.html).

For our example, a more useful specification is:

> Air temperature at the designated monitoring point, away from direct heat sources, evaluated for changes lasting at least 30 seconds.

The location and timescale are illustrative requirements of this application. If we actually need the hottest point in the room, this specification is inadequate however accurately the selected point is measured.

| Question | Example |
|---|---|
| What quantity do we want? | Air temperature at a defined location |
| What quantity affects the sensing element? | The element's own temperature, through thermal contact with its surroundings |
| What quantity does the application infer? | A condition at the monitoring point, under a stated placement and response model |

The inference is where a plausible number acquires an unjustified meaning. “Sensor A reports 24.2 °C” and “every location in the room is below 25 °C” are different claims.

This extends Chapter 1's contract view. A device identifier tells us which device sent a message; installation records are evidence of where it was placed, and a current check confirms it is still there. Communication can preserve a reading exactly while the application interprets the wrong quantity.

## Follow the Measurement Chain

A **sensor**, in VIM3's vocabulary, is the part of a measuring system directly affected by the phenomenon carrying the quantity of interest. A **measuring transducer** produces an output quantity related to an input quantity. Chapter 1 used “sensor” in the broader, everyday sense of a component producing information about a physical quantity. This chapter keeps that meaning, as in “two sensors agree,” and says **sensing element** when the narrow VIM sense matters. [VIM3, §§3.7–3.8](https://jcgm.bipm.org/vim/en/3.8.html), [measuring transducer](https://jcgm.bipm.org/vim/en/3.7.html).

<figure class="iot-diagram">
<picture data-compact-below="760">
  <source media="(max-width: 759px)" srcset="/images/iot-handbook/IOT-002/fig-1-measurement-chain-compact.svg">
  <img src="/images/iot-handbook/IOT-002/fig-1-measurement-chain.svg" alt="Measurement chain: define the quantity, couple it to a sensor, convert its response, then interpret the result. Placement, response, conversion and correction can each limit the claim." style="width:100%;height:auto">
</picture>
<figcaption>Figure 1. A teaching decomposition of the measurement chain. It describes responsibilities, not a standardized layer stack or mandatory circuit. A digital sensor can contain several stages within one package.</figcaption>
</figure>

**Quantity of interest → physical coupling → sensing response → signal conditioning and conversion → corrected result with context.**

**Physical coupling** describes how the quantity reaches the element: a temperature element exchanges heat with its surroundings, and its mounting decides which surroundings. **Signal conditioning** prepares an electrical signal for conversion, for example by amplification or filtering. **Conversion** produces a representation software can use.

### What can change the reading?

An **indication** is the value the instrument supplies before later interpretation. It can be affected by gain (how strongly the output changes with the input), a persistent offset and varying disturbances. Placement and response determine which physical condition reaches the sensing element in the first place.

Calibration can establish the indication-to-quantity relationship over a supported range. It cannot repair a wrong location or recover a transient the sensor never captured. Disturbances can depend on operating conditions; treating every effect as independent random noise needs justification.

<details markdown="1">
<summary>Optional model: gain, offset and noise</summary>

For an illustrative sensor over a limited range, write:

`r(t) = a × x_s(t) + b + n(t)`

Here `r(t)` is an **indication**, the value the instrument supplies before later interpretation; `x_s(t)` is the quantity the sensing element actually experiences; `a` is a scale factor; `b` is an offset; and `n(t)` is a varying disturbance. The unit of `a` follows from input and output, for example volts per degree Celsius. This is our simplified model, not a law for all sensors.

</details>

## How Sensors Turn Physical Quantities into Signals

A sensing element works because some physical property changes with the quantity of interest. Engineers call this **transduction**. The property is usually electrical: resistance, voltage, capacitance, or current. Signal conditioning then turns that property into something a converter can digitize.

Two broad classes behave differently. Some elements **modulate** a supplied signal: a resistor or capacitor must be driven by an **excitation** current or voltage before it reveals anything. In a resistive element, that excitation dissipates power and warms the element, an effect called **self-heating**. Other elements **generate** a signal from the quantity itself, as a thermocouple produces a voltage or a photodiode a current. They need no excitation, but their signals can be very small and are easily disturbed by wiring and interference.

### Four ways to measure temperature

**Thermistors** are resistors made from materials whose resistance changes strongly with temperature. The common **NTC** (negative temperature coefficient) type falls in resistance as it warms, and the relationship is highly nonlinear. [TI SNOAA12, §§1–2](https://www.ti.com/lit/pdf/snoaa12). Consider a constructed NTC element with 10 kΩ at 25 °C:

| Temperature | Modeled resistance | Change over the previous 25 °C |
|---:|---:|---:|
| 0 °C | 33.6 kΩ | — |
| 25 °C | 10.0 kΩ | −23.6 kΩ |
| 50 °C | 3.59 kΩ | −6.4 kΩ |

The same 25-degree step changes the resistance about 3.7 times as much at the cold end. The useful sensitivity therefore depends on temperature, and software must convert the nonlinear response with a fitted equation or a lookup table. Higher-order fits cost computation; deeper tables cost memory. [TI SNOAA12, §2](https://www.ti.com/lit/pdf/snoaa12).

<details markdown="1">
<summary>Optional derivation: the model behind the thermistor table</summary>

The table uses the simplified **beta model**, `R(T) = R₂₅ × exp(β × (1/T − 1/T₂₅))`, with temperatures in kelvin, `R₂₅ = 10 kΩ`, `T₂₅ = 298.15 K`, and an assumed `β = 3950 K`. At 0 °C, `1/273.15 − 1/298.15 ≈ 0.000307 K⁻¹`; multiplied by 3950 this gives about 1.213, and `exp(1.213) ≈ 3.36`, so `R ≈ 33.6 kΩ`. The local relative slope is `−β/T²`, about −4.4% per kelvin at 25 °C. Real thermistors are characterized more precisely, for example with the three-term Steinhart–Hart equation, and their coefficients come from the part's own documentation.

</details>

**Resistance temperature detectors (RTDs)** use a metal, typically platinum, whose resistance rises almost linearly with temperature. A Pt100 element has 100 Ω at 0 °C, and the IEC 60751 coefficients give about 109.7 Ω at 25 °C, roughly 0.39 Ω per degree. [TI SBAA275A, §1.1](https://www.ti.com/lit/pdf/sbaa275). That small change makes wiring part of the measurement: in a two-wire connection, a constructed 0.5 Ω in each lead adds 1.0 Ω, which reads as about 2.6 °C. Three-wire circuits cancel matched lead resistance, and four-wire circuits sense the element separately from the excitation path. [TI SBAA275A, §1.3](https://www.ti.com/lit/pdf/sbaa275). Excitation current also self-heats the element, by an amount that depends on construction and the surrounding medium. [TI SBAA275A, §1.5.2](https://www.ti.com/lit/pdf/sbaa275).

**Thermocouples** join two different metals. A voltage develops that depends on the temperatures of both the measuring junction and the **reference junction**, where the wires meet the measuring circuit. It tracks roughly their difference, but nonlinearly. A type K thermocouple produces only about 39.5 µV per degree near 0 °C, across a range of roughly −270 to 1370 °C. [TI SBAA274A, §§1.1–1.2](https://www.ti.com/lit/pdf/sbaa274). The system must therefore measure the reference junction separately, often with a thermistor, RTD, or integrated circuit (IC) sensor: **cold-junction compensation**. [TI SBAA274A, §1.3](https://www.ti.com/lit/pdf/sbaa274).

Standard thermocouple tables give the voltage for a reference junction at 0 °C. A warmer reference junction leaves the measured voltage short by the voltage its own temperature would produce in that table, so the compensation adds that voltage and then converts. Because the response is nonlinear, this must happen in voltage, not temperature.

<details markdown="1">
<summary>Optional calculation: cold-junction compensation</summary>

TI's worked case adds the reference junction's 1.000 mV equivalent at 25 °C to a measured 24.904 mV, then converts 25.904 mV to about 623.5 °C. Converting first and adding 25 °C afterward would give 625 °C, a 1.5 °C error. [TI SBAA274A, §1.4.4](https://www.ti.com/lit/pdf/sbaa274).

</details>

**Integrated semiconductor sensors** place the sensing element and its conditioning, and in digital parts the conversion, in one silicon device. Some supply an analog voltage, for example one that falls by about 5.19 mV per degree [TI LMT70](https://www.ti.com/lit/ds/symlink/lmt70.pdf); others supply digital readings over a bus. The package still exchanges heat with its board and surroundings, so installation and self-heating remain part of the measurement model. [TI SNOA986A, §§10–11](https://www.ti.com/lit/pdf/snoa986a).

| Family | How it works and connects | Strength; characteristic limitation |
|---|---|---|
| NTC thermistor | Resistance falls steeply with temperature; a resistor pair turns it into a voltage | Large signal near its design point; strong nonlinearity, self-heating |
| Platinum RTD | Resistance rises nearly linearly; an excitation current is compared against known resistors | Standardized, interchangeable curve; small signal, lead resistance, self-heating |
| Thermocouple | Voltage set by both junction temperatures, measured as a small voltage between two wires | Very wide range, no excitation; microvolt signals, cold-junction compensation |
| Integrated sensor | Temperature-dependent semiconductor behavior; analog voltage or digital bus | Conditioning in the package (and conversion, for digital parts); package thermal path, device-specific specifications |

These are generic characteristics, not a ranking; range, accuracy, and stability belong to a specific part's datasheet.

### Beyond temperature: what the sensor actually responds to

The same habit applies to every sensor: separate what the element responds to from what the application infers.

| Sensor → usual inference | What the element actually responds to | Characteristic limitation |
|---|---|---|
| Relative humidity → humidity of the surrounding air | Water absorbed into a polymer insulating layer (dielectric), changing its capacitance, at the element's own temperature | Contamination; hysteresis (readings depend on whether humidity was rising or falling); long-term drift; condensation may need a heater [HDC2010](https://www.ti.com/lit/ds/symlink/hdc2010.pdf) |
| Light → lighting at a work surface | Light reaching a filtered photodetector, weighted by wavelength and arrival angle | Filter match to the human eye; aperture and placement [OPT3001](https://www.ti.com/lit/ds/symlink/opt3001.pdf) |
| Hall-effect magnetic → magnet position, or current in a nearby conductor | Magnetic flux density at the package, producing a proportional voltage | Magnet temperature drift; geometry [DRV5055](https://www.ti.com/lit/ds/symlink/drv5055.pdf) |
| MEMS (micro-machined) accelerometer → motion, vibration, tilt, or a drop | Specific force (acceleration relative to free fall) on a spring-suspended proof mass, read as a capacitance change: about 1 g at rest, about 0 g in free fall | Stiffness trades range and bandwidth (how fast a change it can follow) against noise [Rao et al., 2019](https://doi.org/10.3390/mi10060380), [NXP AN3151](https://www.nxp.com/docs/en/application-note/AN3151.pdf) |
| Ultrasonic ranger → distance to a target | Round-trip time of a sound pulse | Distance uses an assumed speed of sound, which depends on air temperature [NASA Glenn](https://www.grc.nasa.gov/WWW/K-12/BGP/sound.html) |
| Metal-oxide gas → indoor air quality | Resistance of a heated metal-oxide layer as gases react at its surface | Raw signal often processed into a relative index that adapts to its environment; humidity compensation [SGP40](https://sensirion.com/media/documents/296373BB/6203C5DF/Sensirion_Gas_Sensors_Datasheet_SGP40.pdf) |

Two rows show how far the gap can open. An accelerometer at rest reads about 1 g, the force supporting it against gravity, which is why it can measure tilt. A metal-oxide gas sensor may report an index rather than a concentration, so two units can disagree while both behave as designed.

The ultrasonic row shows a gap in the conversion itself. The element times the echo correctly, but distance is computed from an assumed speed of sound, which depends on the air temperature. A sensor that assumes the 20 °C speed in 0 °C air overstates distance by about 3.6%.

## Read Specifications With Precise Vocabulary

### Resolution, sensitivity, and quantization

**Resolution** is the smallest change in the measured quantity that produces a perceptible change in indication. Noise and the operating point, meaning the input level and conditions at which the instrument works, can influence it. Displaying more digits is a formatting decision, separate from what the system can physically resolve. [VIM3, §4.14](https://jcgm.bipm.org/vim/en/4.14.html). **Sensitivity** relates a change in indication to the corresponding change in input, and it can vary across the range, as the thermistor table shows. [VIM3, §4.12](https://jcgm.bipm.org/vim/en/4.12.html).

A converter divides its input range into discrete bins: **quantization**. In the illustrative conversion below, one bin corresponds to 0.1 °C. That does not establish 0.1 °C accuracy. Offset, reference-voltage error, noise, nonlinearity and installation effects remain. Distinct inputs within one bin produce the same code; extra decimal places and repeated messages cannot distinguish them.

<details markdown="1">
<summary>Optional calculation: converter bins and temperature increments</summary>

Consider an ideal 12-bit converter spanning 0–4.096 V. It has `2^12 = 4096` codes, so each ideal bin spans `4.096 V / 4096 = 1 mV`. With an ideal linear sensor of `10 mV/°C`, one bin corresponds to `0.1 °C`. That is nominal **quantization**, not 0.1 °C accuracy. Offset, error in the converter's reference voltage (which sets its full scale), noise, nonlinearity, and installation effects remain. Distinct inputs within one bin produce the same code, and neither extra decimal places nor repeated messages distinguish them.

</details>

### Precision, trueness, and accuracy

**Precision** concerns agreement among repeated measurements under specified conditions. **Trueness** concerns agreement of the long-run average with a reference value. **Accuracy** concerns closeness to the true value; VIM3 treats it as a qualitative concept rather than a number. [VIM3, §2.15](https://jcgm.bipm.org/vim/en/2.15.html), [§2.14](https://jcgm.bipm.org/vim/en/2.14.html), [§2.13](https://jcgm.bipm.org/vim/en/2.13.html).

| Set | Indications against a 25.0 °C reference | What it illustrates |
|---|---|---|
| A | 25.8, 25.8, 25.9, 25.8 | Small spread, substantial apparent offset |
| B | 24.6, 25.4, 24.8, 25.2 | Larger spread, mean at the reference |

Set A is more tightly grouped, yet further from the reference. Set B's mean is encouraging, but four values cannot establish long-run trueness. **Standard deviation** describes spread around the mean. A small one describes a tight group, whatever value it is grouped around.

Datasheets often put error limits under an “accuracy” heading. Read what the number bounds: maximum or typical error, at which temperature, supply, and configuration. An error limit, a standard deviation, and an expanded uncertainty (see “Carry Uncertainty Into the Result”) are different statements.

### Error and uncertainty

A **measurement error** is the measured value minus a reference value. [VIM3, §2.16](https://jcgm.bipm.org/vim/en/2.16.html). **Measurement uncertainty** characterizes the dispersion of values attributed to the measurand from the available information, including contributions from corrections and references. It is more than the visible fluctuation of readings. [VIM3, §2.26](https://jcgm.bipm.org/vim/en/2.26.html). An estimated offset can be corrected, but the correction carries uncertainty from the reference and the comparison. A stable reading can therefore have significant uncertainty.

## Calibration Establishes a Relationship

**Calibration** establishes, under specified conditions, how indications relate to reference values and how that relationship yields results with uncertainty. A calibration-derived **correction** turns an unchanged indication into a corrected result. **Adjustment** changes the measuring system so that it supplies prescribed indications, possibly through firmware; recalibration is usually needed afterward. **Verification** provides objective evidence that specified requirements are fulfilled. [VIM3, calibration §2.39](https://jcgm.bipm.org/vim/en/2.39.html), [correction §2.53](https://jcgm.bipm.org/vim/en/2.53.html), [adjustment §3.11](https://jcgm.bipm.org/vim/en/3.11.html), [verification §2.44](https://jcgm.bipm.org/vim/en/2.44.html).

Changing an output until it matches another device is an adjustment, not a calibration. A meaningful adjustment needs a prior calibration against a reference with known uncertainty.

### Worked two-point example

Assume the indication is approximately linear over 20–30 °C. At two reference points it reports:

| Reference temperature | Instrument indication |
|---|---|
| 20.0 °C | 20.6 °C |
| 30.0 °C | 30.8 °C |

A fixed subtraction fits one comparison but leaves an error at the other. A linear correction accounts for both the offset and the changing discrepancy:

| Instrument indication | Subtract 0.6 °C everywhere | Linear correction from both points |
|---|---|---|
| 20.60 °C | 20.00 °C | 20.00 °C |
| 26.72 °C | 26.12 °C | 26.00 °C |
| 30.80 °C | 30.20 °C | 30.00 °C |

<details markdown="1">
<summary>Optional derivation: the two-point correction</summary>

Use `r = aT + b`, with `r` and `T` both in degrees Celsius, so `a` is dimensionless:

`a = (30.8 − 20.6) / (30.0 − 20.0) = 1.02` and `b = 20.6 − 1.02 × 20.0 = 0.2 °C`

An indication of 26.72 °C becomes `T = (26.72 − 0.2) / 1.02 = 26.0 °C`. Subtracting 0.6 °C everywhere would fit the lower point but turn 30.8 °C into 30.2 °C, leaving a discrepancy at the upper point.

</details>

Two points define a line without proving linearity between them, and the example suppresses reference and fitting uncertainty. Calibrating a bare element characterizes that element, not the assembled installation; decide which part of the chain the calibration covers.

### Traceability has a specific meaning

**Metrological traceability** relates a result to a reference through a documented, unbroken calibration chain, each step contributing uncertainty. Software lineage and serial numbers are useful records, but they are not this property. VIM3 also notes that traceability alone does not establish adequate uncertainty for the purpose. [VIM3, §2.41](https://jcgm.bipm.org/vim/en/2.41.html). Keep calibration identity, range, conditions, correction version, and uncertainty connected to the result; replacing a sensor or changing the conversion path can break that association.

## Sampling Determines What We Can Distinguish

**Sampling** observes a changing signal at selected times. To reconstruct a **band-limited** signal, one with no content above a known highest frequency, ideal sampling must be faster than twice that frequency. Practical systems need margin for real filters. Content outside the intended band can appear as a slower variation after sampling: **aliasing**. Filtering must act before the sampling that would make the content ambiguous. [Analog Devices, Anti-Aliasing Basics](https://www.analog.com/en/resources/technical-articles/antialiasing-basics-using-switchcapacitor-filters.html). A brief pulse is a different problem: it is not band-limited, and whether the samples catch it depends on their timing.


### Worked ambiguity: two signals, identical samples

<figure class="iot-diagram">
<picture data-compact-below="760">
  <source media="(max-width: 759px)" srcset="/images/iot-handbook/IOT-002/fig-2-aliasing-compact.svg">
  <img src="/images/iot-handbook/IOT-002/fig-2-aliasing.svg" alt="Constructed cosine signals at 9 Hz and 1 Hz differ between observations but have identical values at the marked 10 samples per second sampling instants. Time is in seconds; amplitude is normalized." style="width:100%;height:auto">
</picture>
<figcaption>Figure 2. Original analytical example, not a measured trace. Solid: 9 Hz input. Dashed: 1 Hz alternative. Circles: identical sample values. The samples alone do not reveal which curve generated them.</figcaption>
</figure>

An ideal sampler takes ten samples per second. Figure 2 compares a 9 Hz wave with a 1 Hz wave of the same normalized amplitude, ranging from −1 to +1.

| Sample time, s | 9 Hz input | 1 Hz alternative |
|---|---:|---:|
| 0.0 | 1.000 | 1.000 |
| 0.1 | 0.809 | 0.809 |
| 0.2 | 0.309 | 0.309 |
| 0.3 | −0.309 | −0.309 |
| 0.4 | −0.809 | −0.809 |
| 0.5 | −1.000 | −1.000 |

The equality continues at every sample, although the curves differ between them.

<details markdown="1">
<summary>Optional derivation: why the samples are identical</summary>

A cosine, `cos`, repeats after each full cycle of `2π` radians and has the same value at an angle and its negative. Write each sample time as `t_n = n/10`, where `n` is an integer. The sequences are `x_9(t_n) = cos(2π × 9n/10)` and `x_1(t_n) = cos(2π × n/10)`. Since `9n/10 = n − n/10`, the 9 Hz phase is a whole number of cycles minus the 1 Hz phase. Removing the full cycles and reversing the sign leaves the same cosine value at every integer sample index.

</details>

The sampler produced correct values that carry too little information to distinguish the two possibilities, and no downstream smoothing can recover the distinction. An anti-alias filter would remove the 9 Hz content before sampling; if 9 Hz itself matters, the bandwidth and sampling design must change instead.

### Aliased interference can look like a slow physical change

Interference can appear as an offset or a slow physical trend after sampling. In a constructed example, 50 Hz mains pickup appears constant when sampled at exactly ten samples per second. A small change in the sampling clock makes that same interference appear as a twenty-second cycle.

The apparent trend can therefore change when acquisition timing changes, even when the environment does not. This is a reason to investigate the acquisition path before treating a slow variation as a change in the measurand.

<details markdown="1">
<summary>Optional calculation: the alias frequency</summary>

Under ideal uniform sampling, a component at frequency `f` produces the same samples as one at its **alias frequency**: the distance from `f` to the nearest whole multiple of `f_s`. For 9 Hz at 10 samples/s, the nearest multiple is 10 Hz, so the alias is 1 Hz.

Consider a constructed path that picks up interference at exactly 50 Hz from the **mains**, the AC power supply (50 or 60 Hz depending on region), sampled at exactly 10 samples/s. Fifty hertz is a whole multiple of the rate, so the alias is 0 Hz: every sample meets the interference at the same point in its cycle, and it appears as a constant offset whose size depends on that point. At 9.99 samples/s, the nearest multiple is 49.95 Hz and the alias is 0.05 Hz, a slow cycle with a 20-second period. A 0.1% clock difference has turned an apparent offset into an apparent environmental cycle, and a 0.1% shift in mains frequency does the same.

</details>

Both look like plausible properties of the measurand, and small-signal sensors such as thermocouples are especially exposed. The remedy is to reduce the pickup before it can alias: at its source, with an input filter, or by sampling fast enough to represent the interference and its harmonics (components at whole multiples of 50 Hz) and removing them digitally. Small changes to the sample rate only move the alias.

### Acquisition, polling, and reporting are different rates

A device may acquire once per second while software polls ten times per second and reports once per minute. Faster polling can return repeated observations; slower reporting can hide acquired variation unless a summary preserves it. A 0.2-second excursion can fall entirely between one-second samples. Choose the rate from the phenomenon and the decision: a trend, a peak, a duration, or a waveform.

## Fresh Data Can Still Describe a Delayed Response

A measurement can be recent and still lag the physical quantity. VIM3 defines step response time by an abrupt input change and the time for the indication to settle within specified limits, so a response-time number needs its criterion and conditions. [VIM3, §4.23](https://jcgm.bipm.org/vim/en/4.23.html). For temperature, the whole thermal path matters, including mounting and self-heating. [TI SNOA986A, §§10–11](https://www.ti.com/lit/pdf/snoa986a).

### Worked first-order response

<figure class="iot-diagram">
<picture data-compact-below="760">
  <source media="(max-width: 759px)" srcset="/images/iot-handbook/IOT-002/fig-3-sensor-lag-compact.svg">
  <img src="/images/iot-handbook/IOT-002/fig-3-sensor-lag.svg" alt="Illustrative temperature step from 20 to 30 degrees Celsius with a sensor following a first-order response of time constant 10 seconds. The indication crosses 27 degrees at about 12.04 seconds and approaches 30 degrees gradually." style="width:100%;height:auto">
</picture>
<figcaption>Figure 3. An assumed model, not a sensor specification. Dashed: imposed temperature step. Solid: sensor indication. The marked threshold crossing is different from settling near the final value.</figcaption>
</figure>

Assume the temperature at the sensing location steps from 20 °C to 30 °C at the start of the example. The modeled sensor's remaining difference from 30 °C shrinks by the same proportion over equal intervals. This is a **first-order response**. Its **time constant** is 10 seconds; after one time constant it completes about 63.2% of the change.

| Time after step | Modeled indication | What it establishes in this model |
|---|---:|---|
| 5 s | 23.93 °C | A substantial change, still below 27 °C |
| 10 s | 26.32 °C | About 63.2% of the ten-degree change |
| 12.04 s, approximately | 27.00 °C | The specified threshold crossing |
| 13 s | 27.27 °C | First above-threshold sample at integer-second acquisition |
| 30 s | 29.50 °C | Approaching the final value |

A requirement to **produce an indication above 27 °C within five seconds after the 20→30 °C step** is incompatible with this response model, and no network change affects that; it needs a faster physical response. Detecting *some* departure from 20 °C is a different requirement: the indication reaches 23 °C after about 3.57 seconds. Whether a real system can distinguish it depends on noise, uncertainty, and timing.

<details markdown="1">
<summary>Optional derivation: response and threshold time</summary>

The function `exp(z)` means `e` raised to the power `z`, with `e` approximately 2.718. For `t` in seconds, the modeled indication is:

`T_s(t) = 30 − 10 × exp(−t/10), for t ≥ 0`

At 10 seconds, `exp(−1)` is about 0.368, leaving 3.68 °C of the 10 °C gap, so the indication is about 26.32 °C. For the 27 °C threshold, `exp(−t/10) = 0.3`. The natural logarithm, `ln`, inverts `exp`, giving `t = −10 × ln(0.3) ≈ 12.04 s`. For 23 °C, the remaining gap is 0.7 of the original, and `t = −10 × ln(0.7) ≈ 3.57 s`.

</details>

Response lag changes what Chapter 1's freshness calculation means. Observation age starts at the acquisition timestamp. If the input rises steadily, this model's indication eventually trails it by about one time constant: a reading acquired now approximately equals the input value of about 10 seconds earlier. Under that steady-rise model, add the time constant to the observation age when the decision concerns the physical condition. For a step and a specific threshold, use the model's crossing time for that threshold instead, which can exceed the time constant: the 27 °C crossing takes 12.04 seconds. In general, the indication is a weighted blend of recent conditions, and real thermal paths need not be first-order.

### Averaging changes both noise and time meaning

When the quantity stays fixed, a mean reduces the spread of **independent** noise, where one value tells us nothing about the next. Closely spaced observations can instead be **correlated**, varying together, and averaging then reduces the spread less. With independent noise of standard deviation 0.4 °C per observation:

| Observations in the mean | Standard deviation of the mean |
|---:|---:|
| 1 | 0.4 °C |
| 4 | 0.2 °C |
| 16 | 0.1 °C |

The spread halves each time the count quadruples, for the independent noise only; offsets, correlation, and a changing measurand need separate treatment. Statistical evaluation of repeated observations is a Type A evaluation. [NIST TN1297, §3](https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-3-type-evaluation-standard-uncertainty).

Averaging also delays. Consider an ideal step **directly at the software filter input**, ignoring sensor lag. A ten-sample trailing window holds ten values of 20 °C. After one new value of 30 °C, the mean rises to only 21 °C, and it reaches 30 °C only after ten new values. The smoother reports recent history: its output describes the window, while the application may need the current value. If the application wants the current condition, averaging is an explicit trade-off between variability and delay.

## Carry Uncertainty Into the Result

**Type A** and **Type B** classify evaluation methods: statistical analysis of observations, and evaluation from other information such as calibration reports or specifications. They are not labels for random versus systematic error. [NIST TN1297, §§3–4](https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-4-type-b-evaluation-standard-uncertainty). A **standard uncertainty** is expressed as a standard deviation. An **expanded uncertainty** multiplies the combined standard uncertainty by a coverage factor `k`. [NIST TN1297, §6](https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-6-expanded-uncertainty).

### Worked linear uncertainty budget

For a corrected temperature result and an additive model, stipulate these standard uncertainties:

| Contribution | Standard uncertainty | Assumption in this example |
|---|---|---|
| Reference comparison and correction | 0.15 °C | Correction uncertainty, not an uncorrected known bias |
| Repeatability of the reported estimate | 0.10 °C | Appropriate evaluation for that estimate |
| Quantization | 0.029 °C | Uniform position within a 0.1 °C bin |
| Remaining installation/model contribution | 0.20 °C | For the defined monitoring point; not room-wide coverage |

The quantization term assumes a uniform position within the bin. A Type B evaluation needs a reason for that distribution beyond the existence of a bound. [NIST TN1297, §4.6](https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-4-type-b-evaluation-standard-uncertainty). Assume the contributions do not vary together and each enters the result with a multiplier of one. Combining them gives a standard uncertainty of approximately **0.271 °C**.

When contributions vary together, propagation must include their **covariance**. Two sensors sharing a reference are not fully independent evidence. [NIST TN1297, §5](https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-5-combined-standard-uncertainty).

<details markdown="1">
<summary>Optional calculation: combining the uncertainty contributions</summary>

For a uniform distribution over a bin of width `q`, the standard deviation is `q/√12`; with `q = 0.1 °C`, about 0.029 °C. Under the stated assumptions, **root-sum-of-squares** squares each standard uncertainty, adds the squares, and takes the square root:

`u_c = √(0.15² + 0.10² + 0.029² + 0.20²) ≈ 0.271 °C`

With `k = 2`, the expanded uncertainty is `U = 2 × 0.271 ≈ 0.54 °C`. Shared effects or different multipliers need a model that accounts for them.

</details>

With the illustrative coverage factor of two, the expanded uncertainty is about 0.54 °C. A corrected estimate of 26.0 °C is reported as **26.0 °C ± 0.54 °C, k = 2**, with model and conditions stated. It is a coverage statement, not a guaranteed bound. Approximately 95% coverage requires suitable distribution and estimation conditions; `k = 2` alone does not establish it.

Saturation, wrong units, and a detached sensor invalidate the model rather than enlarging the uncertainty. A significantly nonlinear model may need higher-order treatment or propagation of distributions, addressed in the 2026 amendment to JCGM 100. [JCGM 100:2008/Amd.1:2026](https://doi.org/10.59161/PPDI3267).

## Worked Example: Choose a Sensor From the Decision

Return to the monitoring application. It must resolve slow changes of about 1 °C over minutes at one location, and it has a separate requirement: an indication above 27 °C within five seconds after the modeled 20→30 °C step. Compare two hypothetical designs under the same constraints:

| Design | Stipulated properties | Consequence |
|---|---|---|
| A | 0.01 °C reported increment; 10 s time constant | Fine increments; 27 °C crossing at about 12.04 s; misses the five-second requirement |
| B | 0.1 °C reported increment; 1 s time constant | Coarser increments; 27 °C crossing at about 1.20 s |

Neither row is a complete error specification, so neither establishes better accuracy. For the 27 °C requirement, B leaves time for acquisition and reporting and A does not; for a slow trend, a slower design may suffice and win on energy or cost.

The decision sequence is:

1. Define the quantity, location, range, and timescale.
2. Define the distinction the application must make and the permitted delay.
3. Choose a sensing principle whose physical effect, range, and characteristic limitation fit those needs.
4. Evaluate physical coupling and response.
5. Evaluate calibration, uncertainty, and conversion.
6. Select acquisition, filtering, and reporting that preserve the needed evidence.
7. Define invalid, stale, out-of-range, and ambiguous-result handling.

### A result near a threshold

Suppose the corrected result is **26.8 °C ± 0.54 °C, k = 2**, and the application asks whether the temperature at the point exceeds 27 °C. The interval runs from **26.26 °C to 27.34 °C** and overlaps the threshold. The point estimate is below 27 °C, but a policy requiring the whole interval below the threshold cannot classify it as below. Such a policy has three outcomes: supported below, supported above, or unresolved. This is an illustrative policy, not a conformity rule or safety guarantee; other applications weigh false alarms and missed detections differently, so define the rule explicitly.

## Common Pitfalls and Mitigations

### Noise, saturation, and repeated codes

**Noise** is unwanted variation for the measurement task; a filter can remove useful information along with it. **Saturation** occurs when a stage cannot represent further input changes. A conditioning stage or converter may clip at a limit while still producing valid-looking codes. A limit reading supports an out-of-range interpretation, not an estimate of how far beyond the range the input is. Some designs deliberately send a fault to the limit: TI notes that small resistor currents on a thermocouple input pull a burned-out thermocouple's reading to full scale. The fault becomes visible, but the reading alone no longer separates it from a true over-range input. [TI SBAA274A, §1.4.6](https://www.ti.com/lit/pdf/sbaa274).

A repeated code is ambiguous: the condition may be stable, resolution may hide small changes, software may return a cached observation, or a fault may have frozen the output. Sequence information, status flags, and reference comparisons help distinguish these cases.

### Drift and influence quantities

VIM3's **instrumental drift** is a change in indication over time caused by changes in the instrument's metrological properties. It is distinct from a change in the measured quantity or in a recognized influence quantity. [VIM3, §4.21](https://jcgm.bipm.org/vim/en/4.21.html).

In a **direct measurement**, the result comes from the instrument's indication rather than being computed from other measured quantities. There, an **influence quantity** does not change the quantity actually measured, but changes the relation between indication and result. The temperature of a converter's voltage reference can act this way by shifting gain (the scale factor) or offset, much as VIM's example treats the temperature of a micrometer, a precision length gauge, measuring a rod. Heat reaching the sensing element itself is different: it changes the measured quantity. The GUM uses a broader version of the term, so state which meaning applies. [VIM3, §2.52](https://jcgm.bipm.org/vim/en/2.52.html).

So a warmer reading after an enclosure heats up is not automatically drift. It may reflect a changed local thermal condition, self-heating, or another influence. A long-term trend may be a real environmental change or aliased interference (see “Sampling Determines What We Can Distinguish”). Comparison evidence separates these explanations. Replacement, relocation, damage, or configuration change can alter the chain before any calibration date arrives.

### A failure analysis that preserves unknowns

In a constructed incident, a room monitor reads 2 °C warmer after its enclosure is changed. Do not start by editing a firmware offset. Trace the evidence:

| Question | Evidence needed | Current conclusion |
|---|---|---|
| Did the raw indication or only the calculated result change? | Raw values, correction version, configuration history | Unknown until compared |
| Did the observation location or thermal path change? | Installation records and physical arrangement | Enclosure change is known; its effect is a hypothesis |
| Is the reference comparison at the same place and condition? | Comparable location, timing, reference uncertainty | Unresolved without that context |
| Does the discrepancy track operating activity? | Condition-matched observations | Could separate self-heating from other causes |
| Does the original calibration still cover this chain? | Calibration scope and changed components | Must be reassessed |

The analysis narrows causes rather than guessing one. An offset that fixes one observed discrepancy can conceal a condition-dependent effect; identify the affected stage first.

### Preserve measurement meaning in software

A useful observation record identifies the quantity and unit, acquisition time, installation location, raw indication where needed, correction version, and validity. Calibration and uncertainty details can live in an associated versioned record. This is a conceptual data contract, not a prescribed serialization.

Keep range failure, missing acquisition, stale data, and unresolved quality distinct from a valid number. A zero substituted for a failure looks like a physical condition, and a refreshed timestamp makes old evidence look recent. Protect the configuration that determines meaning. If an unauthorized change can replace the location, unit, or correction, authentic telemetry may carry a misleading interpretation. Authentication provides evidence of the sending identity, while placement and metrological adequacy need their own evidence.

## Summary

Begin with the claim the application needs to make. Know the physical effect the sensor uses, because it decides what the element responds to and which errors come with it: nonlinearity, lead resistance, a reference junction, an assumed conversion, a processed index. Then check whether placement, response, conversion, and calibration support the claim. Preserve location, acquisition time, uncertainty, and validity with the result.

Sampling and filtering decide which changes remain distinguishable, uncertainty connects the result to the strength of a decision, and faults can invalidate the model. Software keeps these distinctions instead of turning every number into a condition of the world.

The opening disagreement stays unresolved until location, measurement behavior, and comparison conditions are established. Both sensors could be valid for their local quantities while the shared “room temperature” label is wrong.

## What's Next?

The next topic is embedded boards: where acquisition and conversion run, how processing and interfaces fit together, and which constraints shape hardware choices. Carry this chapter's measurement requirements into that study: the board must preserve the timing, context and quality needed by the application.

## Related Chapters

- [Chapter 1: What Is an IoT System?](/iot-handbook/chapter-01-what-is-an-iot-system.html) — Places sensing within the wider system and introduces telemetry, acquisition timestamps, freshness and responsibility during failure.

## Frequently Asked Questions

**Q: Does a digital sensor eliminate analog measurement problems?**
No. The sensing element still interacts with the physical world. A digital interface can contain conditioning and conversion within a package, while placement, self-heating, response and calibration still affect the result.

**Q: Does calibration fix a sensor in the wrong location?**
No. Calibration establishes a relationship under specified conditions. It cannot make a local measurement represent a different location or an unobserved room-wide maximum.

**Q: Does faster polling give me more measurements?**
Only if the device acquires new observations at that rate. Polling faster than acquisition can return the same observation repeatedly. Preserve acquisition time so repeated delivery does not appear to be new evidence.

**Q: Can a fresh reading still describe an earlier physical condition?**
Yes. Acquisition time establishes observation age; sensor response and filtering also affect the time meaning. Evaluate them against the decision's timescale instead of using delivery time alone.

**Q: Can averaging recover a transient the sensor missed?**
No. Averaging can reduce some noise under stated conditions, but it cannot restore information lost through slow response or inadequate sampling. It can also dilute a brief change and delay a decision.

**Q: Does an uncertainty interval crossing a threshold mean the sensor failed?**
No. A valid measurement can leave a decision unresolved. Under this chapter's whole-interval policy, an interval overlapping the threshold supports neither a below-threshold nor an above-threshold classification.

## Glossary Terms Introduced

| Term | Meaning in this chapter |
|---|---|
| Sensitivity | How much the output changes per unit change in the measured quantity. It can vary across the operating range. |
| Resolution | The smallest change in the measured quantity that produces a detectable change in the reading. More displayed digits do not establish better resolution. |
| Precision | How closely repeated measurements agree under stated conditions. They can agree closely and still share a substantial error. |
| Trueness | How closely the average of many repeated measurements agrees with a reference value. A few readings cannot establish it. |
| Accuracy | How close a measured value is to the true value. In the vocabulary used here, this is a qualitative judgment; datasheet numbers need their stated error limits and conditions. |
| Calibration | Establishing how readings relate to reference values, including uncertainty, so readings can be interpreted. It does not itself adjust the instrument. |
| Adjustment | Changing the measuring system so it gives specified readings. Because the system has changed, calibration usually needs to be checked again. |
| Metrological traceability | A result’s connection to a stated reference through a documented, unbroken calibration chain. Each link contributes uncertainty; the connection alone does not establish fitness for the application. |
| Measurement uncertainty | Quantifies the spread of values that the available evidence supports for the measured quantity. It includes limitations from references and corrections, not just fluctuations between readings. |
| Aliasing | When sampling makes different signals produce the same observations. A fast variation can appear slow or constant, and later smoothing cannot recover the missing distinction. |
| Time constant | For the first-order step-response model, the time needed to complete about 63% of a sudden input change. It is not the time needed to settle or cross every threshold. |
| Instrumental drift | A change in the instrument’s reading over time caused by changes in the instrument itself. A changing environment or a changed installation is a different explanation. |

## References and Further Reading

- [VIM3 annotated vocabulary](https://jcgm.bipm.org/vim/en/): the formal definitions this chapter paraphrases.
- [NIST Technical Note 1297](https://www.nist.gov/pml/nist-technical-note-1297) and [JCGM publications](https://www.bipm.org/en/committees/jc/jcgm/publications): uncertainty evaluation, covariance, coverage, and the GUM family.
- TI application notes [SBAA275A (RTDs)](https://www.ti.com/lit/pdf/sbaa275), [SBAA274A (thermocouples)](https://www.ti.com/lit/pdf/sbaa274), and [SNOAA12 (thermistors)](https://www.ti.com/lit/pdf/snoaa12): sensing principles, wiring, compensation, and linearization.
- [NIST ITS-90 Thermocouple Database](https://srdata.nist.gov/its90/main/): reference functions behind thermocouple conversion.
- [Analog Devices: Anti-Aliasing Basics](https://www.analog.com/en/resources/technical-articles/antialiasing-basics-using-switchcapacitor-filters.html) and [TI SNOA986A](https://www.ti.com/lit/pdf/snoa986a): sampling and temperature-installation effects.

## Revision History

| Version | Date | Change |
|---|---|---|
| 1.4 | 2026-10-19 | Published sensing principles, measurement chains, calibration, sampling, response and uncertainty; aligned the handbook structure, made detailed calculations optional and reduced the glossary to twelve terms. |
| 1.3 | 2026-10-12 | Added sensing principles, worked temperature-sensor cases and six other sensor families; shortened explanations and expanded transfer exercises. |
| 1.2 | 2026-10-12 | Connected observation objectives, aliased interference, response lag and freshness to Chapter 1. |
| 1.1 | 2026-10-12 | Clarified numerical examples, terminology and responsive figures. |
| 1.0 | 2026-10-12 | Introduced the theoretical study chapter. |
