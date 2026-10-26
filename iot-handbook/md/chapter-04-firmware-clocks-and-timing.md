# Chapter 4: Firmware, Clocks, and Timing

**Version:** 1.1 | **Sources checked:** 2026-10-21

## If You Only Read One Section

Firmware turns a board's capabilities into behavior: it initializes the device, acquires inputs, owns memory, schedules work, communicates and recovers. Its correctness includes **when** those operations happen and **which clock** gives their timestamps meaning.

Three questions are easy to confuse. **Coordination:** has another participant reached the required point? **Pacing:** how quickly may work advance relative to elapsed time? **Clock synchronization:** how closely do participants' time estimates agree? A reply can coordinate two processes without pacing them, and a working radio connection can coordinate packets without giving an application UTC.

Use a suitable **monotonic clock** for local elapsed intervals and deadlines. Use **wall time** for calendar timestamps and comparisons that require a shared time reference. Preserve the mapping, its uncertainty and its lifetime. Neither a timestamp with many digits nor a “synchronized” flag establishes the accuracy a decision needs.

The question for this chapter is: **For every operation in the monitor, which clock gives it meaning, and what happens to that meaning when the clock steps, drifts, sleeps or resets?**

## Prerequisites

[Chapter 1: What Is an IoT System?](/iot-handbook/chapter-01-what-is-an-iot-system.html) introduced freshness and system responsibilities. [Chapter 2: Sensors and the Physical World](/iot-handbook/chapter-02-sensors-and-the-physical-world.html) separated physical response, acquisition and reporting. [Chapter 3: Boards — From Prototypes to Industrial Systems](/iot-handbook/chapter-03-boards-from-prototype-to-industry.html) traced firmware and BLE through a CC2640R2F-based monitor and ended with a 16-byte observation record and a conceptual event loop. Here we examine the execution and time contracts inside that device.

This is theoretical study material for experienced software engineers. Numerical examples and timelines are constructed. The simulator case is a source-based analysis, separately identified; it is not a hardware experiment, and no target firmware image was run. Code blocks marked pseudocode describe design responsibilities rather than compilable TI firmware. Detailed calculations are optional; no kit is required.

### Learning Outcomes

After studying this chapter, you should be able to:

1. Trace firmware from reset through acquisition, task handoffs and communication.
2. Distinguish physical clocks, counters, runtime ticks, monotonic time, wall time and simulation time.
3. Explain synchronization error, drift and clock correction with worked examples.
4. Design bounded scheduling, memory ownership and timestamp handling through sleep and reset.
5. Select evidence that separates board, firmware, scheduling and clock failures.

## A System Can Be in Sync and Still Run at the Wrong Speed

Chapter 3 ended with a 16-byte record that carries a sequence number and an acquisition time, and a conceptual event loop that fills it. This chapter asks two questions of that firmware: how does work actually reach the processor, and what does the acquisition time in the record mean? We begin with a case from outside the monitor in which a system was coordinated correctly and still ran at the wrong speed, because it shows three easily confused questions (coordination, pacing and clock synchronization) in their simplest form.

### The simulator case

The case comes from the Streams Simulator, a multi-process simulation project used here only as a source of timing failures. Its simulated world advances in **slices**. A host process may release the next slice only after a peer process answers a **barrier**: a point in the exchange where one side waits until the other reports that it has reached a defined position in the sequence. (In the project's protocol the exchange is the `NSYNC`/`HSYNC` pair.)

Constructed numbers show what that arrangement implies. They illustrate the mechanism; they are not measurements of the simulator, whose real slice length and reply time this chapter does not claim. Suppose each slice stands for one simulated second and a warm spell lasts twenty simulated minutes, which is 1,200 slices. If the peer answers every barrier within 1 ms, the host releases all 1,200 slices in 1,200 × 1 ms = 1.2 s of real time. The simulation clock reaches ten minutes at slice 600, after 0.6 s of elapsed time. A person or a piece of equipment that needs seconds to respond has no chance to act on a spell that has already ended. The barrier guaranteed order: each slice waited for the previous reply. It said nothing about pace, because a reply that arrives immediately satisfies the barrier immediately.

The project's plan for a physical-device (fan) experiment recorded this as the first of two problems: its simulated world advanced one slice after each host barrier reply, so a responsive host could let a long simulated warm spell finish before a real decision-maker responded. Second, the world's initial date differed from current wall time, so a deadline created by one participant could be interpreted against another time domain.

The barrier's maximum wait was a **cap**: “give up after this long.” It was not a **minimum release time**: “do not advance before this instant.”

Current source adds an optional pacer. It records a wall-time origin and releases world slices according to elapsed time. The inspected implementation derives its progressing time from an initial calendar value plus monotonic elapsed duration. Earlier notes warning about repeated wall-clock reads describe an earlier revision, not this code. See the dated [source analysis](/iot-handbook/sources/chapter-04.md).

This gives us four separate contracts:

| Mechanism | Question it answers |
|---|---|
| Sequence barrier | Has the peer answered through the required sequence? |
| Pacer | Is it time to release the next simulation slice? |
| Clock mapping | What calendar instant corresponds to this simulated or local time? |
| Timeout | How long will we tolerate missing progress? |

Pacing does not make slow work finish on time. If a process falls behind, it needs an explicit catch-up, skip, or stop policy. Nor does one calendar anchor continuously synchronize independent machines: their oscillators can drift afterward. These are distinct remaining design questions.

### Carry the lesson into the room monitor

Continue the one-sample-per-second monitor from Chapter 3. Assume a fresh valid observation should reach a gateway within 250 ms of acquisition under defined connected conditions. Chapter 1's separate five-second freshness limit still applies when the application uses it. These are constructed requirements at different boundaries.

Firmware might sample on schedule while a transmit queue grows. It might transmit promptly while stamping acquisition with the later send time. It might schedule correctly until synchronization moves its calendar clock backward. Each failure can produce plausible readings and healthy connection indicators.

We need to follow both paths: **how work executes**, and **how time is represented**.

## What Firmware Actually Contains

### An image is a complete execution arrangement

A deployed firmware image combines application code with the selected startup, runtime, drivers and libraries. Chapter 3 followed the build from source to image and showed how the map file reports what occupies flash and RAM. Here we care about what the image contains and which choices it fixes: memory placement, enabled peripherals, task stacks, protocol features and board-specific settings. A successful link establishes that the declared layout fits, while runtime peaks and physical behavior need further evidence.

On a small device, it helps to divide responsibilities this way:

| Responsibility | Example in the monitor | Typical defect |
|---|---|---|
| Startup and board configuration | Establish clocks, pin functions and initial state | Wrong board definition or initialization order |
| Hardware access | Request a sensor conversion and receive its result | Wrong pin, mode, timeout or completion interpretation |
| Application state | Track valid data, sequence, pending acquisition and failures | Cached value presented as new |
| Scheduling and synchronization | Release work and transfer ownership between contexts | Missed event, blocking callback or race |
| Communication | Encode records, handle subscription and backpressure | Queue accepted but record never consumed |
| Timekeeping | Maintain elapsed time and an estimated UTC mapping | Timeout driven by a corrected calendar clock |
| Recovery and diagnostics | Bound failures, restart, report gaps and clock quality | Reset loop hides the original fault |

These are responsibilities, not mandatory software layers or separate tasks. One application task may own several. Splitting every row into a thread would add stacks and synchronization without necessarily improving behavior.

### From reset to normal operation

The processor reaches a reset handler before the application entry point. A Cortex-M startup arrangement supplies the initial stack pointer and the **vector table**, the table of handler addresses the processor jumps to on reset and on each exception or interrupt. It then enters system and language-runtime initialization. Arm's [CMSIS startup description](https://arm-software.github.io/CMSIS_5/5.8.0/Core/html/startup_c_pg.html) illustrates that boundary; the selected vendor/toolchain determines the actual implementation.

In a conventional embedded C build, initialized writable data is copied into RAM and zero-initialized storage is cleared before ordinary application code relies on them. Toolchains commonly call these regions `.data` and `.bss`; look for them in the map file Chapter 3 introduced. The stack holds call frames and local state; a heap, if configured, supplies dynamic allocations. Startup code, linker placement and runtime initialization must agree. A wrong image layout can fail before the sensor or application loop ever runs.

For our monitor, a useful initialization dependency order is:

1. Establish board-appropriate electrical and pin states.
2. Initialize the clock/runtime and the drivers needed next.
3. Validate configuration and prepare queues, buffers and completion handlers.
4. Establish a new **boot generation** and mark calendar time unknown unless it is supported by retained evidence. A boot generation is a counter or identifier that differs for every start of the firmware, so records from before and after a reset are never merged. (Chapter 5 calls the span it identifies a session.)
5. Start acquisition and communication under their respective readiness conditions.

This is a conceptual dependency order. The selected SDK can require a particular sequence. Do not enable an interrupt-producing operation before its handler and destination state are ready. Do not declare a sensor usable just because the MCU booted.

A bootloader, when used, decides which application image to enter or how to receive one. It does not replace application initialization. Recovery also needs a policy for invalid configuration, interrupted persistence and incompatible image/data versions. Preserving a timestamp in flash preserves a past number; it does not account for time spent without power.

### Memory ownership is part of timing

Suppose acquisition submits a pointer to a transmit queue, then immediately reuses that buffer. The consumer may later send a different sample under the original sequence or timestamp. The queue operated correctly; the ownership contract failed.

A simple bounded design copies small records into fixed-capacity queue slots. A pool-based design can reduce copying, but it must specify who allocates, transfers and releases each buffer, including error paths. A callback must not retain a pointer to a local variable whose lifetime ends on return. SDK-provided buffers can also have specific release functions and lifetimes; follow that API's contract.

Stack exhaustion can corrupt unrelated state and appear as a sporadic timing failure. Heap exhaustion can prevent queuing or stack submission. Inspect stack high-water evidence, allocation failures and queue occupancy under the stressed workload; a map file alone does not establish runtime margin. Keeping allocation out of critical acquisition paths is a design option when predictable bounded storage fits the workload.

## How Work Reaches the Processor

### Polling, interrupts and tasks

A **polling loop** checks whether work is ready. It is simple when every operation has a short bound. If the loop waits synchronously for a sensor, a serial write or a radio operation, everything else in that loop waits too.

An **interrupt** redirects execution in response to a hardware event. Its handler, often called an interrupt service routine or ISR, services that event under the runtime's restrictions. A **task** is a schedulable execution context. In a preemptive RTOS, higher-priority ready work can interrupt lower-priority task execution, subject to interrupt masking and kernel rules.

A callback is just a function invoked by another component. Its name does not tell us whether it runs in interrupt context, a timer service, the protocol stack or an application task. Determine the context before deciding what is legal there.

In TI's documented `simple_peripheral` callback pattern (`simple_peripheral` is TI's reference BLE peripheral example), callbacks hand work to application context; blocking RTOS calls and stack API calls are excluded from those callbacks. ICall, TI's mechanism by which the application task calls into the BLE stack's task, also requires that a caller be an appropriately registered task. These are versioned SDK constraints, not rules inferred from C syntax. [TI application guide, SDK 5.30.00.03](https://software-dl.ti.com/simplelink/esd/simplelink_cc2640r2_sdk/5.30.00.03/exports/docs/ble5stack/ble_user_guide/html/ble-stack-5.x/the-application.html).

### A bounded acquisition path

<figure class="iot-diagram">
<picture data-compact-below="760">
  <source media="(max-width: 759px)" srcset="/images/iot-handbook/IOT-004/fig-1-firmware-compact.svg">
  <img src="/images/iot-handbook/IOT-004/fig-1-firmware.svg" alt="Illustrative firmware ownership: a release event hands work to an acquisition owner, the driver reports completion, a copied record enters a bounded queue, and a communication owner submits it to BLE. UTC mapping labels the acquisition time without driving its release." style="width:100%;height:auto">
</picture>
<figcaption>Figure 1. An ownership model, not a TI API diagram. Each handoff needs a capacity, failure policy and time convention.</figcaption>
</figure>

For a sensor that supports a separate conversion request and completion, use an explicit state machine:

**Idle → converting → result ready → record queued → idle**, with a bounded error path from each operation. A different sensor may instead expose continuously updated registers; its driver must determine whether a read represents a new conversion.

The following is **pseudocode**. The event-post and driver operations must be replaced by supported, context-appropriate mechanisms:

```text
short_release_callback:
    post_release_nonblocking_or_count_loss()

acquisition_owner_on_release:
    if state != idle:
        count_missed_release()
        apply_overrun_policy()
        return
    state = converting
    start_supported_acquisition_with_timeout_or_handle_start_failure()

acquisition_owner_on_completion:
    verify_result_status_and_acquisition_time_meaning()
    copy_value_sequence_boot_and_time_into_owned_record()
    enqueue_without_unbounded_wait_or_report_overflow()
    state = idle

acquisition_owner_on_timeout:
    cancel_or_recover_driver_as_documented()
    mark_acquisition_missing()
    return_to_idle_only_after_old_completion_is_fenced()
```

A timeout introduces a subtle race: a late completion can arrive after a retry starts. To **fence** an obsolete completion is to make it unable to affect the new request. A common way is to tag each operation with an identity and discard any completion whose tag is not the one currently expected, within what the driver contract allows. Trace it with constructed times:

| Time | Event | Owner's action |
|---:|---|---|
| 0 ms | Request 1 starts, tag 1 | Wait for tag 1 |
| 20 ms | Timeout; request 2 starts, tag 2 | Mark request 1 missing; wait for tag 2 |
| 25 ms | A completion arrives carrying tag 1 | Tag is not 2: discard it and count a late completion |
| 30 ms | A completion arrives carrying tag 2 | Accept it as the answer to request 2 |

Without the tag, the 25 ms completion looks like the answer to request 2, and request 2's record carries request 1's data. A timer expiring does not establish that a peripheral operation stopped.

If you have written Go, this is the hazard of a goroutine that keeps running after its `context` deadline fires unless it checks the context: the timeout ended your waiting, not the work. The analogy stops short of the hardware case. Here the abandoned operation may still write into your buffer, and nothing in the language cancels it, so the owner needs the driver's confirmation that the operation has finished or been canceled before it reuses that storage.

A single event flag can deliberately coalesce several releases. That is useful for “refresh the latest state,” but insufficient when every scheduled observation matters. A counting mechanism or queue can preserve releases up to a bound; neither recreates physical samples that were never acquired. Catch-up reads of the present cannot fill a missing past waveform.

### Synchronizing access is another meaning of “sync”

Task synchronization coordinates shared work. Clock synchronization estimates time relationships. A mutex can protect a clock mapping from concurrent modification without making that mapping accurate.

Anticipating the clock mapping that a later section defines, suppose it is a record `(local_anchor, utc_anchor, rate, uncertainty, version)`. A reader seeing half the old mapping and half the new one can manufacture an impossible timestamp. Publish a consistent snapshot through a supported synchronization mechanism. Keep the protected region short; do not hold it across a bus transaction or network operation.

Marking C state `volatile` is insufficient to design that handoff. In particular, GCC documents that volatile accesses do not order unrelated non-volatile memory writes. Atomicity and ordering need the compiler/runtime's supported mechanisms; this observation is not a prescription to use GCC barriers in a TI compiler project. [GCC volatile semantics](https://gcc.gnu.org/onlinedocs/gcc-8.1.0/gcc/Volatiles.html).

## The Board Has Several Kinds of Time

### Oscillators produce ticks, not dates

An **oscillator** produces a repeating electrical signal. A **counter** counts selected clock events. A timer can divide that source, compare a counter with a programmed value, or capture the count at an input transition. Software converts counts to units using an assumed frequency.

Imagine a counter expected to receive one million ticks per second. Dividing its count by one million produces seconds only to the extent that the frequency assumption holds. Nanosecond formatting cannot recover accuracy absent from the source or timestamp capture.

The CC2640R2F datasheet specifies a 24 MHz crystal reference for the radio and describes separate low-frequency sources. Its optional 32 kHz crystal and internal low-frequency oscillator have different design implications; the internal source's suitability for connected sleep is conditional. A working CPU clock therefore does not establish correct radio or sleep-clock behavior. [CC2640R2F datasheet, §9.9](https://www.ti.com/lit/ds/symlink/cc2640r2f.pdf).

The sleep clock matters to a connected monitor because of the connection events from Chapter 3. Between events the peripheral sleeps, and the sleep clock counts the time until it must wake to meet the central. A less accurate sleep clock forces a wider listening window around each event, which costs energy, and a clock worse than the accuracy the link assumes makes the device miss events. The sleep-clock source is therefore a connection-level energy parameter, not a detail.

<details markdown="1">
<summary>Optional calculation: ticks, counter width and the sleep clock</summary>

Everything below is arithmetic on an assumed 32.768 kHz source, with the 20 ppm figure used elsewhere in this chapter. It is not a measured or datasheet accuracy for the CC2640R2F.

- **Tick.** 32,768 Hz is 2^15 Hz, so one tick is 1/32,768 s ≈ 30.52 µs. That is the finest interval the counter can resolve.
- **Frequency error.** 20 ppm of 32,768 Hz is 0.655 Hz, about 0.66 tick per second. The same error is 20 µs per second, so a full tick of error accumulates in roughly 1.5 s.
- **Wrap.** A 16-bit counter of these ticks wraps after 65,536 / 32,768 = 2 s. A 32-bit counter wraps after 2^32 / 32,768 = 2^17 s = 131,072 s, about 36.4 h. Software that needs longer elapsed time must extend the counter, for example by counting wraps.
- **20 ppm is optimistic over temperature.** The frequency of a 32.768 kHz tuning-fork crystal follows roughly a parabola in temperature around a turnover point near room temperature. A coefficient of the order of −0.03 to −0.04 ppm per °C² is commonly quoted; take the real value from the crystal's data sheet. With 0.034 ppm/°C², a 20 °C excursion costs about 0.034 × 20² ≈ 14 ppm and a 40 °C excursion about 0.034 × 40² ≈ 54 ppm, before initial tolerance and aging. An internal RC low-frequency oscillator is far worse than a crystal unless it is calibrated against a better reference.
- **Link to energy.** The Bluetooth Core Specification defines classes of sleep-clock accuracy, from 500 ppm down to 20 ppm for a device's declared figure. A receiver must widen its listening window by about `(SCA_central + SCA_peripheral) / 10^6 × time since the last anchor`, where SCA is sleep-clock accuracy in ppm. This is a general statement of the specification, not re-derived here; check the current edition for exact fields. At a 1 s interval with 500 + 500 ppm the widening is 1 ms; with 20 + 20 ppm it is 40 µs. The window must stay open correspondingly later too, so treat these as the order of the added receive time per event. At the round 8 mA receive current Chapter 3 used, 1 ms of extra listening per second averages 8 µA, against the 5 µA sleep current in Chapter 3's duty-cycle example; 40 µs averages 0.32 µA. Because widening grows with the time since the last anchor, a 100 ms interval at 1,000 ppm adds 100 µs per event and 10 events per second, the same 1 ms per second.

</details>

### Give every time value a domain

| Time value | Meaning | Appropriate use | Important limit |
|---|---|---|---|
| Peripheral counter | Count in a specific hardware clock domain | Capture an edge or time peripheral work | Frequency, width, power state and capture semantics |
| RTOS tick count | Runtime scheduling units | Kernel waits and releases | Tick period and scheduling rules |
| Local monotonic time | Nondecreasing local elapsed coordinate | Durations and local deadlines | Origin, sleep behavior, reset and finite width |
| Wall time | Estimate of a calendar instant | UTC records and cross-system correlation | Corrections, source quality and uncertainty |
| Simulation time | Coordinate owned by a model | Model evolution and deterministic replay | Advances under the model's rules |

A **tick period** is the represented interval per runtime tick. It is not a guarantee that an application runs at that exact interval. Expiration makes work eligible; scheduling determines when it executes. Arm's [CMSIS-RTOS2 wait specification](https://arm-software.github.io/CMSIS_5/RTOS2/html/group__CMSIS__RTOS__Wait.html) makes that ready-versus-running distinction explicit. It illustrates the concept; these APIs are not substituted for TI-RTOS APIs here.

“Monotonic” does not mean UTC, perfect frequency or automatic survival through sleep. Read the actual clock's contract. A counter that pauses in a low-power mode measures active execution time across that interval unless the runtime compensates. A counter reset by reboot needs a new boot generation before its values are compared with earlier records.

An **RTC**, or real-time clock, is timekeeping hardware. Its name does not prove it already knows UTC, has backup power, or retains time through every reset. Firmware may use it as an elapsed counter until a reference establishes a calendar mapping.

### Units and epochs are part of the type

A duration of `5000` can mean five seconds in milliseconds or five milliseconds in microseconds. An absolute value can count from boot, the Unix epoch, a protocol epoch or simulation start. Identical integer representations do not make them comparable.

Use names such as `acquired_mono_us`, `deadline_utc_ns` and `boot_generation`, with typed wrappers where practical. An **epoch** is the origin of a time coordinate: the instant it counts from, such as the Unix epoch, a protocol epoch or the start of a simulation. A boot generation is a different concept: it identifies which start of the firmware a monotonic value counts from.

UTC is a reference timescale; a local timezone is a presentation rule and never belongs in an elapsed timeout. Changing Berlin's display offset should not alter a five-second timeout. Calendar scheduling such as “every day at 08:00 local time” is different: there the timezone rules are part of the application policy.

## Why Wall Time Breaks an Elapsed Timeout

If you have used `CLOCK_MONOTONIC` and `CLOCK_REALTIME` on a POSIX system, or noticed that Go's `time.Since` measures with the monotonic reading that `time.Now` carries, this is the same split. The board adds one complication: the counter behind the monotonic clock may stop in sleep or restart at reset.

Suppose an operation starts at monotonic time **100 s**, when wall time reads **12:00:00**. Its allowed duration is five seconds. At monotonic time **102 s**, synchronization corrects wall time backward by 30 seconds.

<figure class="iot-diagram">
<picture data-compact-below="760">
  <source media="(max-width: 759px)" srcset="/images/iot-handbook/IOT-004/fig-2-clock-step-compact.svg">
  <img src="/images/iot-handbook/IOT-004/fig-2-clock-step.svg" alt="Constructed clock correction: elapsed time advances from zero through two to five seconds. Wall time changes from 12:00:02 to 11:59:32 after two elapsed seconds. The five-second monotonic deadline still expires after five seconds; the old wall deadline now waits thirty seconds longer." style="width:100%;height:auto">
</picture>
<figcaption>Figure 2. A backward wall-clock correction changes calendar labels while the local operation keeps aging.</figcaption>
</figure>

| Elapsed since start | Monotonic reading | Wall reading after correction | Five-second local timeout |
|---:|---:|---|---|
| 0 s | 100 s | 12:00:00 | Started |
| 2 s | 102 s | 11:59:32 | Three seconds remain |
| 5 s | 105 s | 11:59:35 | Expired |
| 35 s | 135 s | 12:00:05 | Wall-based deadline finally reached |

A comparison against the original wall deadline waits 35 elapsed seconds. Subtracting wall timestamps at elapsed five seconds gives **−25 seconds**. A forward correction can instead expire the operation prematurely. The physical operation did not travel through time; its software mixed an adjustable coordinate with an elapsed requirement.

The design rule is to capture a suitable monotonic start and compare elapsed duration within that clock's valid domain. Calendar labels can still be attached to diagnostics. A monotonic implementation can itself undergo rate discipline, so do not assume mathematical perfection; the necessary property here is that setting calendar time does not step the duration coordinate.

A **step** changes the current wall estimate immediately. A **slew** adjusts its rate so the error is reduced gradually. Slewing avoids some discontinuities but does not instantly make time accurate. ESP-IDF v5.4.2 documents both immediate and smooth SNTP modes, including a large-offset case that still steps in smooth mode. That is an ESP32 implementation example, not a CC2640R2F setting. [ESP-IDF system time](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32/api-reference/system/system_time.html).

### A deadline from another machine needs a mapping

“Stop in five local seconds” and “do not execute after 12:00:05 UTC” are different contracts. For the latter, estimate the remaining valid time using a trustworthy UTC mapping and its uncertainty. A conservative acceptance policy can use the latest plausible current UTC, leaving margin for dispatch. Record what happens if the mapping changes or becomes untrusted before execution.

A relative TTL received over a network also needs a starting boundary. Five seconds from receipt permits network delay to extend the sender's intended lifetime. Five seconds from creation needs evidence about creation time and transit. Convert explicitly; do not silently change the meaning to avoid clock synchronization.

## How Clock Synchronization Works

### A calendar mapping sits on top of elapsed time

An illustrative mapping is:

**estimated UTC = UTC anchor + elapsed since local anchor × rate correction**

The UTC anchor supplies an estimated calendar instant. The local anchor identifies the corresponding monotonic count in the same boot. Rate correction accounts for a modeled frequency difference. The mapping is useful only with a stated uncertainty and valid interval.

For example, suppose that at local monotonic reading 100.0 s the device was told it is 12:00:00.000 UTC. A reading at local 160.0 s maps to 12:00:00.000 + 60.0 s × 1 = 12:01:00.000 when no rate correction applies. A rate correction of 1.00002 would give 60.0 s × 1.00002 = 60.0012 s, which is 1.2 ms later. The next subsections attach an error bound to such an estimate.

If the reference disappears, local time can continue. Its UTC estimate enters **holdover**: it is extrapolated from the last reference. The estimate's quality ages even while readings continue arriving every second.

A time-quality state might progress from **unknown → synchronized → holdover → unsuitable for the requested comparison**. “Synchronized” should mean a particular source, correction state, last-update age and error model, rather than a permanent boolean. A newly received synchronization message may still be queued, rejected, unauthenticated or awaiting application.

### One timestamp does not reveal one-way delay

A gateway says “it is 12:00:00.” The board receives the message later. If it simply sets its own clock to that value, it ignores preparation, transmission, retransmission, reception and scheduling delay. Repeating this operation more often can repeat the same bias.

A two-way exchange gives more information. NTP uses four timestamps: client send `t1`, server receive `t2`, server send `t3`, and client receive `t4`. Its offset and round-trip calculations separate server handling time from the overall exchange. [RFC 5905, §8](https://www.rfc-editor.org/rfc/rfc5905.html#section-8).

Here is a constructed exchange in seconds. Both peers use compatible units and their clocks have negligible rate change during this short exchange:

| Event | Timestamp on that participant's clock |
|---|---:|
| Client sends, t1 | 100.000 |
| Server receives, t2 | 100.060 |
| Server sends, t3 | 100.070 |
| Client receives, t4 | 100.050 |

Read the table from each clock's point of view, assuming for now that each direction takes the same time. Outbound, the server's stamp minus the client's is t2 − t1 = 60 ms: the trip time plus however far ahead the server's clock is. On the way back, the client's stamp minus the server's is t4 − t3 = −20 ms: the trip time minus that same offset. Adding the two gives twice the one-way trip time, 40 ms, so 20 ms each way. Subtracting gives twice the offset, 80 ms, so the server is 40 ms ahead. As a check, the server receives at client-equivalent time 100.020, adds its 0.040 offset and stamps 100.060. Ten milliseconds of handling follow, and the reply reaches the client at 100.050.

<details markdown="1">
<summary>Optional calculation: estimated offset and network delay</summary>

`offset = ((t2 − t1) + (t3 − t4)) / 2`

`= (0.060 + 0.020) / 2 = 0.040 s`

`network round trip = (t4 − t1) − (t3 − t2)`

`= 0.050 − 0.010 = 0.040 s`

The offset estimate assumes symmetric path delay for this interpretation. If the forward path instead takes 35 ms and the return 5 ms, with the same true 40 ms server offset, the exchange reads t2 = 100.075, t3 = 100.085 and t4 = 100.050, and the estimated offset becomes 55 ms. Its 15 ms error is half the 30 ms path asymmetry: (35 − 5) / 2. Software timestamp placement can add further effective asymmetry.

</details>

Even without knowing the asymmetry, one exchange bounds the error. The two one-way delays cannot be negative and together make the 40 ms round trip, so their difference lies between −40 ms and +40 ms, and the offset estimate, which is off by half that difference, lies within **±20 ms**, half the round-trip delay. The 15 ms error above sits inside this envelope. A tighter claim needs a shorter delay, a filtered series of exchanges or an independent reason to trust symmetry. The bound also assumes the clocks keep their rate during the exchange and the timestamps are captured at the stated points.

This explains an estimator, not a full synchronization implementation. Filtering, clock discipline, invalid exchanges, source selection and security remain. A BLE time-setting characteristic is not automatically NTP, and a radio connection event is not automatically an application UTC reference. A gateway-mediated design must define where its own timestamps are captured and which delays its protocol actually estimates.

### Drift turns disconnection into growing uncertainty

**Offset** is a time difference at an instant. **Frequency error** is a rate difference. Clock drift describes how the difference changes over time; temperature and operating conditions can change the rate.

Assume a stipulated frequency-error bound of **20 parts per million**, or 20 µs per second. With no further correction it permits 72 ms of accumulated error per hour and 1.728 s per day. These are arithmetic consequences of the assumed bound, not measured CC2640R2F accuracy.

For an illustrative error envelope, begin with a 10 ms synchronization bound and grow it by 20 ppm. The 40 ms exchange above supports only ±20 ms by itself. Ten milliseconds is what the same half-the-delay argument gives for an exchange with a 20 ms round trip, so treat it as a modeling choice rather than a result of that example. A 100 ms total error allowance leaves 90 ms for growth, exhausted after **4,500 seconds, or 75 minutes**. Had we started from ±20 ms, the same allowance would last 80 ms / 20 µs/s = 4,000 seconds, about 67 minutes. The firmware should stop presenting the mapping as meeting that allowance when the bound expires.

Returning to the mapping example, the bound grows with elapsed local time while the estimate keeps advancing:

| Local monotonic reading | Estimated UTC | Error bound |
|---:|---|---:|
| 100.0 s (anchor) | 12:00:00.000 | ±10 ms |
| 160.0 s | 12:01:00.000 | ±11.2 ms |
| 4,600.0 s | 13:15:00.000 | ±100 ms |

Elapsed local time is 60.0 s and then 4,500.0 s, so the bound is 10 ms + 60 × 20 µs = 11.2 ms and then 10 ms + 4,500 × 20 µs = 100 ms. In the last row the mapping still produces a timestamp, but it no longer supports a comparison that needs better than ±100 ms. A measured rate correction could reduce the growth only as far as the correction itself is justified. The 20 ppm figure is also optimistic over temperature; see the optional oscillator calculation.

Two devices with separate 20 ppm bounds can diverge by up to 40 ppm under opposite rate errors, before their initial synchronization errors are added. Clock comparison depends on both endpoints. If the bound excludes temperature changes or sleep modes actually encountered, the calculation provides no guaranteed envelope for those conditions.

## Scheduling Correctly Is More Than Setting a Timer

### Period, latency, jitter and deadline

A **period** separates intended releases. **Latency** is elapsed time between named events. **Jitter** is variation relative to a specified timing reference. A **deadline** is the latest acceptable completion boundary. State the events and conditions before quoting any of them.

For the monitor, the nominal period is one second; the connected acquisition-to-gateway deadline is 250 ms. Sensor response to an actual room change is a separate Chapter 2 contribution. A “10 ms timer” cannot establish the whole path's latency.

A constructed timing budget is:

| Stage after the defined acquisition instant | Assumed upper allocation |
|---|---:|
| Result availability and driver completion | 12 ms |
| Application scheduling and record work | 8 ms |
| Waiting for communication capacity/event | 100 ms |
| Transfer, peer scheduling and application handling | 80 ms |
| Total | 200 ms |

That leaves 50 ms of margin against 250 ms **if each bound holds under compatible conditions**. The radio row is an allocation to verify, not a BLE worst-case guarantee. Disconnection, retries and queue saturation can break it. A measurement of average latency does not establish these upper bounds, and percentile limits need an explicit acceptance policy.

The 100 ms row has a consequence for the link. A notification submitted just after a connection event waits for the next one, up to a whole connection interval (Chapter 3). A 100 ms allocation therefore implies an interval of at most about 100 ms with no skipped events. One missed event then doubles the wait to about 200 ms and the total to 12 + 8 + 200 + 80 = 300 ms, which exceeds the 250 ms target. Chapter 3's one-second interval, which cut the modeled connection-event current from 0.08 mA to 0.008 mA, would put that row at up to 1,000 ms. The latency requirement picks the interval, and the energy follows. With a 250 ms target, the trade-off Chapter 3 illustrated has to be settled in favor of latency; if the energy budget cannot afford the resulting connection overhead, the requirement, not the arithmetic, has to change.

### Relative sleep accumulates work time

In pseudocode, `do_work(); sleep(1 second)` produces a start-to-start period equal to the work duration plus one second, even before wake-up delays. If each job takes 40 ms, starts occur at 0, 1.04, 2.08 and 3.12 seconds in the idealized model. The phase error accumulates.

An absolute release schedule targets 0, 1, 2 and 3 seconds from one monotonic origin. Work taking 40 ms leaves 960 ms before the next target. A scheduler may still run the task late, but its target does not move by every previous execution's cost.

If a job finishes after its next target, choose the policy deliberately. Skip missed releases when only new current-condition samples are useful, preserve a bounded backlog when actual acquired history matters, or report failure when missing any release invalidates the requirement. Repeatedly executing overdue acquisition jobs does not backdate their physical observations.

This is the firmware form of the simulator distinction: a barrier determines whether progress is permitted, while a release schedule determines when it is due.

### CPU speed does not bound response time

A high-priority task can wait for a resource held by a lower-priority task. Waiting briefly for a lock holder is **bounded blocking**; it is normal wherever locks exist, and its length is the holder's critical section. It becomes **priority inversion** when other ready work keeps the holder from running, because the wait then has no bound of its own. Take three tasks and constructed times:

| Time | Event | Running |
|---:|---|---|
| 0 ms | Low (L) takes the sensor-bus lock; it needs 2 ms more inside the critical section | L |
| 1 ms | High (H) becomes ready, preempts L, requests the lock and blocks; Medium (M), which needs nothing from L, becomes ready and outranks L | M |
| 41 ms | M finishes its 40 ms of work | L |
| 43 ms | L completes its remaining 2 ms and releases the lock | H |

H waited from 1 ms to 43 ms, which is 42 ms for a 2 ms critical section, held up by work less important than H. Without M, the wait would have been 2 ms. **Priority inheritance** temporarily lifts L to H's priority while H waits, so M cannot starve L and H's wait shrinks to L's remaining 2 ms. Runtimes that offer it generally apply it only to mutex-type locks, not to every semaphore, event flag or resource held across an interrupt, and it does not bound a holder that is itself waiting on I/O. Check the exact synchronization object, and keep resource holding and driver operations bounded. A practical first design is one owner for a peripheral and messages describing bounded requests.

Disabling interrupts to protect a long operation can delay unrelated interrupts and runtime work. Busy-waiting can prevent another task or the idle power policy from running. Retrying a failed bus indefinitely can convert one device fault into system-wide starvation. Resolve the blocking boundary before increasing task priority or processor speed.

In the selected TI BLE architecture, application and stack tasks share the main execution environment, and the stack's required priority relationship must be preserved. The RF subsystem handles low-level radio work; it does not make application CPU, memory and callback constraints disappear. [TI software architecture, BLE5-Stack 1.01.15.00](https://software-dl.ti.com/simplelink/esd/simplelink_cc2640r2_sdk/5.30.01.11/exports/docs/ble5stack/ble_user_guide/html/ble-stack-5.x-guide/software_architecture.html).

### Bounded queues protect memory, not every service guarantee

Suppose acquisition produces ten records per second while communication can sustain eight. A 100-record buffer fills in roughly 50 seconds in a fluid approximation, before accounting for bursts and metadata. More storage postpones sustained overload; it does not remove the rate mismatch. When the consumer cannot keep up, its limited capacity must slow, shape or drop what the producer is allowed to enqueue; that effect is **backpressure**, and a bounded queue is where it first becomes visible.

Choose overflow behavior from the service: retain latest state, preserve an explicitly bounded history, stop acquiring, or report data loss. Count drops and expose queue age. A record can be valid and successfully transmitted after it has become too old for the intended decision.

BLE connection timing belongs in this budget. Record the actual accepted parameters, not only the interval firmware requested, because the central may accept different values. A local stack accepting a notification also does not establish gateway application storage. [TI GAP connection parameters](https://software-dl.ti.com/simplelink/esd/simplelink_cc2640r2_sdk/5.30.01.11/exports/docs/ble5stack/ble_user_guide/html/ble-stack-5.x/gap-cc2640.html), [GATT notifications](https://software-dl.ti.com/simplelink/esd/simplelink_cc2640r2_sdk/5.30.01.11/exports/docs/ble5stack/ble_user_guide/html/ble-stack-5.x/gatt.html).

## Sleep, Reset and Counter Wrap Change the Contract

Before sleeping, establish which acquisition and communication operations remain pending, which clocks keep counting, which state is retained and how early wake-up must begin. The wake budget includes oscillator stabilization, peripheral readiness, scheduling and application work. Waking at the required completion instant is already too late.

During a constructed ten-minute sleep, a counter that stops would report zero elapsed time across the gap. Another supported timebase must account for the interval if the application needs sleep-inclusive age. Otherwise mark that age unknown. Compensating for sleep using an inaccurate low-frequency source introduces its uncertainty into the reconstructed elapsed time.

After reboot, a monotonic value of five seconds belongs to a new boot. Persisting the previous value of 1,000 seconds does not make the new counter continuous. Couple local timestamps with the boot generation, and invalidate or rebuild the UTC mapping according to actual retention. Continue acquiring useful local records if the application allows it, while distinguishing calendar time that is still unknown.

A finite-width counter also wraps. A 32-bit counter at one million ticks per second wraps in about **71.58 minutes**; at one thousand per second, about **49.71 days**. A poll that can miss an entire wrap needs an extension or another clock; it cannot reconstruct the lost wrap from the two counter values.

How a program compares such values decides whether the wrap is harmless. Take a 32-bit millisecond counter and a timeout that starts 96 ms before the wrap, at `start = 2^32 − 96 = 4,294,967,200`. A 200 ms timeout gives `deadline = start + 200`, which wraps to 104. The pseudocode-level C comparisons behave differently:

| Test for expiry | What happens |
|---|---|
| `now >= deadline` (absolute values) | True at the start, because 4,294,967,200 ≥ 104: the timeout fires with zero elapsed time |
| `(uint32)(now − start) >= timeout` (unsigned modulo) | At `now = 54` the difference wraps to 150, not yet; at `now = 104` it is 200, so it expires on time |
| `(int32)(now − deadline) >= 0` (signed half-range) | Correct here, but only while `deadline` lies within 2^31 ms (24.86 days) of `now` |

The unsigned form is correct as long as the true elapsed interval is shorter than one complete wrap. The signed form answers "which of two instants is earlier?" and is valid only when they are less than half a wrap apart: 2^31 ticks, about 35.8 minutes at one million ticks per second and 24.86 days at one thousand. Beyond that, "earlier" and "later" swap. A 30-day timeout, 2,592,000,000 ms, exceeds 2^31 ms = 2,147,483,648 ms. At its start, `now − deadline` is −2,592,000,000 modulo 2^32, which is +1,702,967,296 as a signed 32-bit value, so the check reads "expired" at once.

Tick counts add a second effect. A runtime that counts tick boundaries resolves time only to one tick, 1 ms at 1 kHz. A delay of one tick requested 0.9 ms into the current tick expires at the next boundary, 0.1 ms later, so a delay of N ticks lasts between N−1 and N tick periods unless the runtime documents otherwise (some add a tick). A timestamp taken from the tick count likewise carries up to one tick of uncertainty.


## Preserve What a Timestamp Establishes

### Acquisition time and processing time answer different questions

A sensor may timestamp the conversion, expose a data-ready edge, or only return a register whose update history must be interpreted. Define the observation instant or acquisition interval supported by that mechanism. A driver callback timestamp records when software learned of completion; it may include interrupt and scheduling delay.

For a register with unknown last-update time, stamping the read as “acquired now” can overstate freshness. Preserve a defensible interval or the uncertainty implied by the update behavior. A timestamp attached at send time conceals every earlier queue wait.

An illustrative observation envelope could include:

```json
{
  "device_id": "room-monitor-7",
  "boot_generation": "boot-b",
  "sequence": 42,
  "temperature_c": 24.6,
  "acquired_mono_us": 105000000,
  "estimated_utc": "2026-10-21T10:00:05Z",
  "clock_mapping_version": 3,
  "clock_state": "holdover",
  "clock_error_bound_ms": 80
}
```

This is a conceptual envelope, not the 16-byte BLE payload of Chapter 3. That record has room for neither a boot generation nor a mapping version: its status flags mark the first sample after a reset, and its correction version names a calibration record, not a clock mapping. Its acquisition time is a 4-byte count of seconds, and a seconds field cannot support the ±80 ms claims used below, because it can round the instant by up to a whole second, more than ten times that bound. A design that needs those claims has three options. It can carry a finer time field and the extra identifiers in the record, at the cost of a smaller counter or a larger record. It can send the boot generation and mapping as session metadata once per connection and associate them with every retained record. Or it can send a per-session base time with short offsets. Chapter 5 returns to this session association. An error bound must identify its conditions and coverage; do not generate one merely because the schema has a field. If no justified UTC estimate exists, represent it as unavailable instead of a plausible default date.

Keep original local acquisition information when a mapping changes. A later improved UTC estimate can be a derived annotation linked to its mapping revision. Silently replacing stored timestamps hides the evidence used by an earlier decision. Across reboot, sequence and mapping identity also need their boot association.

### Freshness becomes an interval

Assume a mapped acquisition timestamp has a justified ±80 ms bound and the receiving decision clock a ±20 ms bound. A nominal age of 4.95 s has a conservative range of **4.85–5.05 s**, before any additional unaccounted timestamp-placement error.

Against a five-second maximum age, the interval straddles the limit. A policy requiring evidence that the observation is within five seconds cannot accept it as certainly fresh. It can expose “freshness unresolved,” request another observation, or follow an explicitly more conservative application policy. This parallels Chapter 2's threshold reasoning with measurement uncertainty.

Likewise, two observations estimated ten milliseconds apart do not establish physical order if their timing uncertainty intervals overlap. A per-device sequence orders records within its defined scope. A barrier shows that a peer reached a point in a sequence, not when in real time it did. Neither alone establishes the UTC ordering of independent physical events.

## Investigate the Boundary Before Changing the Board

### Begin with bring-up, then add concurrency

A custom board can differ from a development kit in power, clock loading, pin routing, debug access and RF configuration. Keep firmware settings aligned with the actual schematic and package. TI's [hardware guide, §12](https://www.ti.com/lit/pdf/swra640) provides board bring-up and troubleshooting context; its family coverage does not make every configuration apply to CC2640R2F.

Establish a minimal baseline, then add sensor access, scheduling, radio traffic, sleep and persistence in controlled steps. If the first failure appears when sleep is enabled, investigate that transition and the relevant clock contracts before changing the sensor conversion. If it appears only under radio load, inspect execution, buffers and supply behavior together.

For the CC2640R2F, errata also matter. SWRZ085A describes conditional clock-switching/flash interactions and a reset-source indication limitation on silicon revisions F/G. A recorded reset cause is therefore useful evidence with a documented limit, rather than an infallible oracle. Check the advisory's conditions and the selected SDK's handling before attributing an observed hang. [CC2640R2F errata, advisories 03 and 06](https://www.ti.com/lit/pdf/swrz085).

### Gather observations that discriminate causes

| Symptom | Competing explanations | Useful next evidence |
|---|---|---|
| Simulation outruns hardware | Barrier mistaken for pacing; wrong rate mapping | World delta versus elapsed delta and release configuration |
| Calendar timestamps jump | Clock step; mapping replacement; boot; unit conversion | Paired local/wall readings, boot and mapping version |
| Timer work starts late | Interrupt masking; task contention; lock; delayed release | Release, handler-entry, task-start and completion times |
| Readings look recent but are old | Cached sensor register; send-time timestamp; backlog | Acquisition evidence, sequence and queue age |
| First report after sleep is wrong | Stopped counter; changed source; stale mapping; incomplete wake | Power-mode transition, retained state and clock-source record |
| Only heavy BLE traffic fails | Buffer exhaustion; illegal context; scheduling or supply issue | API return status, memory/queue metrics, event and supply traces |

Logging can change the failure. A blocking serial print adds execution and may perturb scheduling. Prefer bounded compact trace records in a critical path and flush them elsewhere. A logic analyzer can reveal pin transitions; an oscilloscope can reveal supply behavior; neither automatically measures application UTC accuracy. GPIO instrumentation marks when code toggled the pin, with its own overhead, rather than necessarily the original acquisition instant.

### Use the 5 Whys as a hypothesis chain

For a constructed simulator-style failure:

1. Why did a twenty-minute scenario finish before a human responded? Its model clock advanced faster than elapsed time.
2. Why could it advance that quickly? Every successful barrier permitted another slice immediately.
3. Why was that mistaken for synchronization with hardware? A maximum wait was treated as a release schedule.
4. Why did deadlines also disagree? Participants compared values with different origins or rates.
5. Why was this hard to see? The records did not make time domains and mappings sufficiently explicit for the analysis.

Each answer needs source or observed evidence. In a real incident, stop when the next causal link is unknown and choose a discriminating check. Do not label this constructed chain a verified root cause of every timing failure. The source-reviewed simulator case supplies the first mechanisms; the last question is a design-review prompt.

### Verify the invariant at the right level

Host tests can inject a backward wall step, drift, reset, counter wrap, stalled consumer or late completion deterministically. Driver/target tests establish supported API use and on-device execution. Physical observations establish the named board's timing, supply and sensing behavior under the tested conditions. Keep those conclusions separate.

The numerical examples in this chapter were recomputed independently of the prose. A passing check qualifies no firmware scheduler, synchronizes no real clock and does not reproduce the simulator experiment.

## Worked Example: A Firmware Design Record You Can Review

For the room monitor, write the time contract before accepting the implementation:

| Decision | Example policy to verify |
|---|---|
| Acquisition | Release once per local second; identify actual conversion timing; count missed acquisitions |
| Clock ownership | Suitable local monotonic source for elapsed work; versioned mapping for UTC |
| Startup | Calendar quality unknown until supported; new boot generation fences old work |
| Synchronization | Named source/path, correction policy, exchange boundaries and error model |
| Holdover | Age the error envelope; stop claiming the required quality after its limit |
| Scheduling | Bounded acquisition path; legal callbacks; explicit late-release and queue policies |
| Sleep | Identify surviving clocks and state; include wake work in the deadline budget |
| Remote commands | Explicit deadline domain, trust and uncertainty checks; bounded local validity |
| Recovery | Preserve gaps and failure evidence; recover pending operations before retry |

A watchdog, introduced in Chapter 3, detects missing progress and triggers a defined recovery. Two points belong here: tie it to the progress the service needs rather than to an unrelated timer, and bound repeated recovery so a permanently broken sensor does not cause endless resets. Chapter 5 (forthcoming) treats liveness when several owners must each show progress. A watchdog reset establishes a recovery action; subsequent valid acquisition establishes recovery of the service.

Time input is also an authority boundary. An unauthorized clock-setting operation can alter freshness and command validity decisions. Validate who may supply time, reject stale/replayed updates under the chosen protocol, and expose degraded time quality. A connected peer is not automatically an adequate or authorized time source.

### Worked reasoning: reconnection after a two-hour outage

A monitor continues sampling locally once per second through a two-hour gateway outage. It last synchronized with a justified 10 ms error bound. Assume its clock remains within 20 ppm through every encountered power mode. On reconnection, the gateway marks every buffered observation “current” because it just arrived. Is the repair simply to synchronize again?

Before reading on, work out two things: how large the error envelope is for the newest buffered observation, and which observations a new synchronization can improve.

No. Synchronizing the clock again does not repair the gateway's mistake. The oldest observations are historical regardless of reconnection time. Even the newest one's UTC mapping has a pre-reconnection error envelope of `10 ms + 20 µs/s × 7,200 s = 10 ms + 144 ms = 154 ms`. Synchronization can improve a new mapping, but a correction does not turn buffered history into current acquisition. Preserve local timestamps, boot generation and mapping history; associate any improved historical estimates with their derivation. Evaluate freshness at the actual decision boundary with both clocks' uncertainty.

If the board rebooted during the outage and cannot account for unpowered time, the assumed continuous mapping is invalid. Keep that segment's calendar time unresolved rather than extending the 154 ms result across an unsupported gap.

## Common Pitfalls and Mitigations

| Pitfall | Consequence | Mitigation |
|---|---|---|
| Using one integer type for every time | Invalid cross-domain comparisons | Name units, origin, boot and mapping |
| Treating barrier replies as real-time pacing | Model outruns physical equipment | Separate progress permission from release time |
| Using wall time for local timeout | Early or late expiry after correction | Use a suitable monotonic elapsed clock |
| Treating timer expiry as task execution | Budget omits contention | Trace eligibility, execution and completion separately |
| Retrying after timeout without fencing | Late old result becomes new result | Track operation identity and completion lifetime |
| Treating sync as permanent | Holdover uncertainty becomes invisible | Age quality from source, drift and elapsed time |
| Reusing a queue buffer too soon | Value, identity and time no longer agree | Explicit ownership or bounded copying |
| Assuming a clock survives sleep/reset | Age is understated or crosses boots | Verify retention and invalidate unsupported mappings |
| Changing an offset to hide the symptom | Another condition breaks the workaround | Identify the failing boundary and test a rival cause |
| Comparing raw counter values across a wrap | Timeouts fire early or never | Use unsigned elapsed subtraction within one wrap; keep signed ordering within half a wrap |
| Assuming a lock wait is bounded by its critical section | Intermediate-priority work stretches a high-priority wait | Bound holders, use one owner per peripheral, and check what inheritance covers |

## Summary

The simulator's barrier problem exposes a general firmware responsibility: define which time coordinate owns progress, release, expiry and interpretation. A coordinated exchange does not establish real-time pace or a shared calendar.

Firmware makes that contract executable through initialization, ownership, scheduling, driver behavior and recovery. Elapsed deadlines need an appropriate local clock; calendar records need an explicit mapping and time quality. Clock corrections, power transitions and resets must preserve those distinctions. The opening monitor becomes trustworthy when its valid reading, acquisition instant, execution path and delivery delay can each support the claim the application makes.

The chapter asked which clock gives each operation its meaning, and what happens to that meaning when the clock steps, drifts, sleeps or resets. Each operation names its clock domain. Elapsed deadlines and releases use a local monotonic clock, compared with wrap-safe arithmetic. Calendar claims use a versioned UTC mapping whose age and error bound grow during holdover. A reset begins a new boot generation, so values from before and after it are never merged.

## What's Next?

Chapter 5: Designing Firmware — Architecture, State, and Reliability (forthcoming) widens the view from time to the whole device. It asks which responsibilities each part of the firmware owns, how memory and queues stay bounded, and how the monitor recovers from overload, reset and a failed update. Carry this chapter's bounded queues, fenced completions and time-quality states into that design.

## Related Chapters

- [Chapter 1: What Is an IoT System?](/iot-handbook/chapter-01-what-is-an-iot-system.html) — Defines the system contracts and freshness boundary that the timestamps in this chapter must support.
- [Chapter 2: Sensors and the Physical World](/iot-handbook/chapter-02-sensors-and-the-physical-world.html) — Explains physical response, acquisition and uncertainty, which the acquisition-time convention here must preserve.
- [Chapter 3: Boards — From Prototypes to Industrial Systems](/iot-handbook/chapter-03-boards-from-prototype-to-industry.html) — Supplies the firmware image, the CC2640R2F execution path and the 16-byte record whose timing this chapter examines.

## Frequently Asked Questions

**Q: Does monotonic time solve synchronization between boards?**
No. It supplies a local elapsed coordinate with its own contract. Comparing independent devices needs a mapping or another shared observation, with error accounted for.

**Q: Is an RTC the same as wall time?**
An RTC is hardware. Wall time is a calendar interpretation. The hardware can run without a valid date, and its retention depends on the design.

**Q: Does a Bluetooth connection synchronize the application clock?**
It coordinates link behavior. Application UTC needs an explicitly supported reference and mapping; the connection alone does not establish it.

**Q: Can a time correction be avoided by saving UTC at boot?**
An anchor plus elapsed time gives a useful session mapping. It still inherits initial error, oscillator drift, sleep behavior and reset limits. Maintaining UTC accuracy over long operation requires an explicit discipline/holdover policy.

**Q: Does one NTP-style exchange tell a device how wrong its clock is?**
It bounds the error. Without assuming symmetric paths, the offset estimate lies within plus or minus half the exchange's round-trip delay, so a long round trip supports only a loose claim.

**Q: Should a missed sample be acquired repeatedly to catch up?**
Only if new current acquisitions serve the application. They cannot observe the past. Replay of actually acquired buffered samples is a separate operation.

**Q: Does priority inheritance remove priority inversion?**
It can cap it for mutex-type locks in runtimes that implement it. It does not cover every synchronization object, and it does not bound a holder that is waiting on I/O.

**Q: Will a faster MCU fix late callbacks?**
It helps only if computation is the limiting cause. Illegal callback operations, locked resources, unbounded queues, wrong clock domains and missing acquisition evidence need different repairs.

## Glossary Terms Introduced

| Term | Meaning in this chapter |
|---|---|
| Monotonic clock | Local nondecreasing time coordinate suitable for specified elapsed measurements; power and reset semantics still apply |
| Wall time | Calendar-time estimate, commonly interpreted relative to UTC, subject to synchronization policy |
| Clock domain | A time coordinate with a particular source, rate, units, origin and validity scope |
| Epoch | The origin a time coordinate counts from, such as the Unix epoch or the start of a simulation |
| Boot generation | A counter or identifier that differs for every start of the firmware, so records from before and after a reset are never merged |
| Clock mapping | A record of local anchor, UTC anchor, rate correction, uncertainty and version that turns a local monotonic reading into an estimated UTC instant |
| Pacing | Releasing work according to a relationship with elapsed time |
| Barrier | A coordination point requiring a peer's defined progress before proceeding; it orders work without setting its pace |
| Holdover | Continued time estimation after a reference is unavailable |
| Step | An immediate correction of the current wall-time estimate |
| Slew | A gradual adjustment of the clock's rate so an error shrinks over time |
| Frequency error (ppm) | A clock's rate difference from its reference in parts per million; 20 ppm is 20 µs of error per second |
| Counter wrap | A fixed-width counter returning to zero; unsigned elapsed subtraction survives one wrap, signed ordering only half a wrap |
| Operation fencing | Making an obsolete completion unable to affect a newer request, for example by tagging operations and discarding results with an old tag |
| Priority inversion | A high-priority task's wait stretching beyond the lock holder's critical section because intermediate-priority work keeps the holder from running |
| Backpressure | A downstream capacity constraint that must influence upstream acceptance, buffering or loss policy |

## References and Further Reading

- [Source register](/iot-handbook/sources/chapter-04.md): editions, access dates and the provenance of the simulator case.
- [RFC 5905: Network Time Protocol Version 4](https://www.rfc-editor.org/rfc/rfc5905.html#section-8): the four-timestamp offset and delay calculation (§8).
- [Arm CMSIS startup](https://arm-software.github.io/CMSIS_5/5.8.0/Core/html/startup_c_pg.html) and [CMSIS-RTOS2 wait functions](https://arm-software.github.io/CMSIS_5/RTOS2/html/group__CMSIS__RTOS__Wait.html): the reset-to-application boundary, and the difference between a delay that has expired and a task that is running.
- [TI application guide](https://software-dl.ti.com/simplelink/esd/simplelink_cc2640r2_sdk/5.30.00.03/exports/docs/ble5stack/ble_user_guide/html/ble-stack-5.x/the-application.html), [software architecture](https://software-dl.ti.com/simplelink/esd/simplelink_cc2640r2_sdk/5.30.01.11/exports/docs/ble5stack/ble_user_guide/html/ble-stack-5.x-guide/software_architecture.html), [GAP](https://software-dl.ti.com/simplelink/esd/simplelink_cc2640r2_sdk/5.30.01.11/exports/docs/ble5stack/ble_user_guide/html/ble-stack-5.x/gap-cc2640.html) and [GATT](https://software-dl.ti.com/simplelink/esd/simplelink_cc2640r2_sdk/5.30.01.11/exports/docs/ble5stack/ble_user_guide/html/ble-stack-5.x/gatt.html) guides: callback constraints, task priorities, connection parameters and notifications.
- [CC2640R2F datasheet](https://www.ti.com/lit/ds/symlink/cc2640r2f.pdf) (§9.9), [errata SWRZ085](https://www.ti.com/lit/pdf/swrz085) and [hardware configuration guide SWRA640](https://www.ti.com/lit/pdf/swra640): clock sources, documented silicon limits and board bring-up.
- [Bluetooth Core Specification](https://www.bluetooth.com/specifications/specs/): connection events, sleep-clock accuracy and window widening (stated here as general-specification facts; check the current edition for exact fields).
- [ESP-IDF system time](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32/api-reference/system/system_time.html) and [Go time package](https://pkg.go.dev/time): examples of step and smooth SNTP modes, and of a language runtime that carries a monotonic reading beside the wall time.
- [GCC volatile semantics](https://gcc.gnu.org/onlinedocs/gcc-8.1.0/gcc/Volatiles.html): what `volatile` does and does not order.

## Revision History

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-24 | Connected the opening to Chapter 3 and made the simulator case self-contained; added the chapter question, the NTP derivation and error bound, a worked clock mapping, an optional oscillator and sleep-clock calculation, worked failures for timeouts, priority inversion and counter wrap, the connection-interval consequence of the 250 ms target, a folded reconnection example, What's Next and an annotated reference list. |
| 1.0 | 2026-10-21 | Introduced firmware structure, clock domains, synchronization, scheduling, power transitions and diagnostic reasoning with a simulator pacing case and constructed timing budgets. |
