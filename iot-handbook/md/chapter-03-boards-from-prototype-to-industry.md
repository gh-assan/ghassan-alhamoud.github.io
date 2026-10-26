# Chapter 3: Boards — From Prototypes to Industrial Systems

**Version:** 1.5 | **Sources checked:** 2026-10-17

## If You Only Read One Section

A board gives a sensing device its execution, power and physical interfaces. Chapter 2 ended with an indication: a number produced by a measurement chain, still waiting to be given a time, a validity and a destination. The board supplies the computer and connections that do this. Its firmware decides when to acquire the indication, what it means for the application, how to communicate it, and what to do when the connection disappears.

The first architectural choice is where that work runs. A small microcontroller can own one device's sampling and Bluetooth connection. A Linux computer can receive many devices' reports and run local services. A field controller can connect to cabinet wiring and keep a local control task running. They can all belong to the same IoT system, and Chapter 1's gateway, edge and local-control roles are the jobs they take.

This chapter follows a temperature indication through a **CC2640R2F-based device**, from the physical input to a Bluetooth peer, and then compares alternative boards under shared requirements. The useful question is: **What would we program, what does the hardware provide, and which requirement makes one design preferable?**

## Prerequisites

[Chapter 1: What Is an IoT System?](/iot-handbook/chapter-01-what-is-an-iot-system.html) introduced device responsibilities, gateways, edge placement and freshness. [Chapter 2: Sensors and the Physical World](/iot-handbook/chapter-02-sensors-and-the-physical-world.html) explained how a measurement chain produces an indication, and closed by looking ahead to the board: where acquisition and conversion run, how processing and interfaces fit together, and which constraints shape hardware choices, so that the timing, context and quality the application needs are preserved. This chapter develops those board and firmware responsibilities, starting with when a sample is actually taken and what the converter's reference contributes.

This is theoretical study material for experienced software engineers. No hardware kit or prior embedded experience is required. Manufacturer documents supply the hardware examples; design values are constructed. Detailed calculations are optional. No board was operated or qualified.

### Learning Outcomes

After studying this chapter, you should be able to:

1. Explain embedded systems, edge devices and the path from source code to running firmware.
2. Trace acquisition, application logic and Bluetooth Low Energy (BLE) communication through the CC2640R2F architecture, including the bytes and timing involved.
3. Compare exact representative boards under shared requirements, including the software each runs.
4. Reason about memory, converter resolution, timing, energy and recovery before selecting hardware.
5. Write a board-selection record that separates documented capabilities from remaining evidence needs.

## What Are We Building, and What Do We Program?

### Embedded describes the device; edge describes its role

An **embedded system** combines computing hardware and software within a device that performs particular tasks. In a room monitor, the board reads the sensing element, retains state and communicates, and the firmware coordinates those activities; the embedded system is that working combination, and the board is one physical part of it.

Chapter 1 defined the roles this chapter assigns to boards, and they remain roles rather than hardware classes. An **edge device** works near the physical source of data or the place where an action happens. Our monitor is one, and so is a nearby computer that processes or stores its reports locally; edge names no particular processor, operating system or use of AI. A **gateway** connects parts of the system: here it receives local Bluetooth reports and makes them available to another network or application, and it may also validate, buffer and aggregate them. “Embedded” asks how computation forms part of the device, “edge” where work happens, and “gateway” which integration responsibility it owns.

Small embedded devices also live under tighter limits than a server. RFC 7228 groups constrained nodes by approximate memory: Class 1 devices have roughly 10 KiB of RAM and 100 KiB of code space, and Class 2 devices roughly 50 KiB and 250 KiB. A **KiB** is 1,024 bytes. [RFC 7228, §3](https://www.rfc-editor.org/info/rfc7228/). The chip we study later sits between those two classes, so every buffer and library in the design competes for a small, countable budget.

### One reading crosses several software owners

Continue the room-monitoring service from Chapters 1 and 2. For this chapter, assume one sample per second, a 16-byte observation record and five minutes of lossless buffering during a gateway outage. These are constructed requirements, not a claim that a chosen board meets them. The gateway handles trends and remote notification; the endpoint must preserve the observations it acquires.

Follow its data path:

**Digital temperature sensor → board firmware → BLE link → gateway application → remote service.**

Firmware requests the indication over a local connection, checks its status and creates an application record. A Bluetooth software stack handles the communication procedure and the radio sends the signals; a gateway application interprets the record and separate network software forwards it. In Chapter 1's vocabulary, this is the telemetry path: acquisition, a record with quantity, unit, identity and time, communication, then interpretation under a data contract.

A local **controller** has another responsibility: decide and apply an output within the application's required time. Chapter 1 called this local control with remote supervision, a closed loop whose decision stays near the process. If it must continue during a network outage, it needs a local execution path, on the monitor's board or in a separate product, so we assign the responsibility before choosing the board.

### Firmware is the device software

**Firmware** is software operating close to the device's hardware: it deploys to the device, operates that hardware and implements its behavior. For the room monitor, our work includes the sampling schedule, input validation, record format, Bluetooth service, buffering and recovery policy. Drivers and libraries supply mechanisms; the application decides when and why to use them. [Chapter 4](/iot-handbook/chapter-04-firmware-clocks-and-timing.html) follows the image from build to running system in depth.

A **microcontroller** (MCU) integrates the processor core, memory and peripherals in one chip, so the program lives inside it. Firmware commonly executes from programmable **flash**, which retains its contents without power. Think of flash as the deployed image: it survives a power cycle, but it is erased in whole blocks and programmed in smaller units. Programming can only clear bits from 1 to 0, so changing a stored value usually means erasing its block first, and each erase consumes a limited endurance budget. We therefore do not treat flash as a log file. **RAM** holds changing state: the current reading, task stacks, queues and protocol buffers. The static kind built into the chip is **SRAM**. After reset, startup code reinitializes the application according to its memory layout, so state that must survive needs an explicit retention or persistence design.

The development path is:

1. **Write source and configuration on the development computer,** selecting the actual board, drivers, communication components and memory arrangement. Source files are not yet executable MCU instructions.
2. **Compile and link for the target.** Linking combines application code, startup code and libraries within the target's memory layout, producing one or several firmware images depending on the SDK configuration.
3. **Program the device.** A programmer, debugger or supported bootloader transfers the images into programmable memory. A USB connector may provide this route through additional circuitry; its presence alone does not tell us which processor is being programmed.
4. **Reset and execute.** Startup code initializes the execution environment, then the application and any selected runtime start. On the TI Bluetooth configuration discussed below, application and stack tasks run under TI-RTOS, TI’s real-time operating system (RTOS), reacting to timer, input and communication events.
5. **Observe and debug.** A debugger inspects execution and memory; logs and measurements reveal other behavior. Reaching a breakpoint confirms execution reached that instruction, while checking the physical input or output is a separate task, the distinction Chapter 1 drew between a device's report and a physical observation.

The link step also answers what occupies the chip's memory. The linker writes a **map file** listing how much flash and RAM each part of the image takes: application code, SDK libraries, stacks, static data and any reserved heap. You read it the way you read `size` output or a heap profile for a service, except that it shows build-time layout and reservations; runtime allocations, stack growth and workload peaks still need evaluation.

TI documents its application/stack configuration and C interfaces in the [SDK software architecture guide](https://software-dl.ti.com/simplelink/esd/simplelink_cc2640r2_sdk/5.30.01.11/exports/docs/ble5stack/ble_user_guide/html/ble-stack-5.x-guide/software_architecture.html); an actual build must use the compiler and IDE versions its SDK release supports. We explain the workflow here rather than supplying a compiled firmware project.

### The software changes with the board's role

| Target | What we normally develop | What supplies the surrounding execution |
|---|---|---|
| MCU endpoint | Firmware for inputs, device state, communication and power policy | Startup code, drivers, optional RTOS and protocol stack |
| Linux gateway | An application or service receiving, storing and forwarding reports | Linux kernel, drivers, filesystem and process/service management |
| Automation controller | Controller logic and I/O configuration in its supported environment | The selected controller runtime and I/O implementation |

On a Linux gateway, a Python, Go or C++ service runs as a process on an existing operating system. On an MCU, our firmware build has more direct responsibility for the device's execution environment. An Arduino-style sketch expresses application behavior within a framework, while a vendor SDK project exposes different configuration and runtime decisions; the language alone does not identify the architecture. “Programming a board” therefore means deploying software to its processors through the board's supported programming path, then making it cooperate with the peripherals and physical connections.

## What We Mean by a Board

### Chip, module and board are different boundaries

A **system-on-chip**, or **SoC**, integrates several system functions. It overlaps with the MCU defined above (a wireless MCU can also be described as an SoC), and neither word by itself tells us whether the product runs Linux.

A **printed circuit board**, or **PCB**, carries components and the conductive connections between them. A populated board adds what a chip needs around it: voltage regulation, clocks, connectors, protection, memory and programming access.

A **radio module** packages a radio device with some of its supporting circuitry. Depending on the module, it may include an antenna or an antenna connector. A **development board** adds convenient access for evaluation and programming, and the module can be one component on it.

A **single-board computer**, or **SBC**, provides a computer on one board, commonly used with an operating system such as Linux. A **system-on-module**, or **SoM**, packages a computing subsystem for attachment to a **carrier board**, which supplies application-specific connections and supporting circuitry. Raspberry Pi explicitly distinguishes its Compute Modules from the IO boards used to develop and prototype with them. [Raspberry Pi Compute Module documentation](https://www.raspberrypi.com/documentation/computers/compute-module.html).

| Name on a discussion or purchase request | What it identifies | What still needs identifying |
|---|---|---|
| TI CC2640R2F | Wireless MCU chip | Package, surrounding circuit and actual board |
| ESP32-DevKitC V4 | Development-board design with module variants | Fitted module and board revision |
| Raspberry Pi Compute Module 5 | Computing module | Variant, carrier, power and enclosure |
| Industrial controller | Product category | Exact model, I/O limits and installation conditions |

Every specification describes one boundary. A chip's temperature rating describes the die, while the assembled board's range depends on its regulator, connectors and enclosure. An MCU lists the pins it has, and the board decides which reach a connector. A module lists what its radio can do, and the installed firmware decides what runs. Name the boundary before quoting a number from it.

### What surrounds the processor?

Figure 1 groups the responsibilities of a board around the processor, so that each later specification can be placed at the boundary it describes.

<figure class="iot-diagram">
<picture data-compact-below="760">
  <source media="(max-width: 759px)" srcset="/images/iot-handbook/IOT-003/fig-1-board-anatomy-compact.svg">
  <img src="/images/iot-handbook/IOT-003/fig-1-board-anatomy.svg" alt="Conceptual board anatomy: power conditioning, compute and memory, clock and reset, programming and debug, and physical interfaces. The board boundary includes their connections and implementation." style="width:100%;height:auto">
</picture>
<figcaption>Figure 1. Board responsibilities, not a wiring diagram. Components may be integrated into one package or distributed across several devices.</figcaption>
</figure>

**Power circuitry** converts or distributes the incoming supply. A **regulator** maintains a supply voltage within its specified conditions, and **decoupling capacitors** store a little charge near components to supply short current demands. Power quality is therefore part of computation: code cannot recover information lost in an uncontrolled reset without a persistence design.

**Clock and reset circuitry** governs when the processor runs and how it starts again. A **brownout** is a drop in supply voltage below a relevant operating threshold. Reset behavior must leave external outputs in an application-appropriate condition before normal software resumes.

**Memory** holds executable code, working data and sometimes persistent configuration. **Connectors and interface circuitry** determine what the board can physically reach. **Programming and debug access** determines how developers load software and investigate failures. An **antenna and RF path**, where present, connect the radio to the physical environment.

Those functions explain why two boards using the same MCU can behave differently: one may include a power LED and USB interface where another removes them to save energy, and one may expose bare logic pins where another adds field-interface circuitry. Choosing the processor leaves these decisions open.

## An Overview of Available Board Families

Start with the job: evaluate device firmware, build a battery endpoint, run gateway services, or connect field I/O. These roles overlap (a wireless development board can evaluate an endpoint, and a gateway can be an industrial product), so the tables name representative platforms and what each helps investigate. Exact variants and installation requirements still govern selection.

### Development boards for learning and connected prototypes

How quickly can we get a program running against real pins and a debugger?

| Board | What it provides | A useful evaluation role |
|---|---|---|
| **Arduino UNO R4 WiFi** | RA4M1 main MCU and a separate ESP32-S3 connectivity module | Learn physical I/O and prototype a connected device while keeping the two processors' responsibilities visible |
| **ESP32-DevKitC V4** | ESP32 module, USB connection and accessible headers; several module configurations exist | Evaluate a connected MCU design and its firmware ecosystem |
| **STM32 NUCLEO-F446RE** | STM32F446RE development platform, expansion connectors and integrated ST-LINK debug/programming | Explore local processing, peripherals and firmware debugging |

Sources: [Arduino UNO R4 WiFi manual, §§5–6](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf), [Espressif DevKitC V4 guide, ESP-IDF v4.4](https://docs.espressif.com/projects/esp-idf/en/v4.4/esp32/hw-reference/esp32/get-started-devkitc.html), [ST NUCLEO-F446RE documentation](https://www.st.com/en/evaluation-tools/nucleo-f446re.html).

Accessible headers and examples shorten the path to an evaluation, including for eventual consumer products; a deployed product still needs decisions about connectors, enclosure, power, firmware recovery and manufacturing. “Arduino,” “ESP32” and “STM32” also name ecosystems or families, not one electrical specification: Arduino sells industrial products too, STM32 includes many MCU variants, and Espressif documents module-dependent pin availability on the DevKitC V4. Record the full identity before comparing resources or planning connections.

### Boards for low-power wireless devices

How does a battery-powered endpoint reach a nearby peer while spending as little energy as possible? These boards put a radio next to the MCU, which is why the next section studies one in detail.

| Board | Documented focus | Selection question |
|---|---|---|
| **TI LAUNCHXL-CC2640R2** | Evaluation platform for the CC2640R2 wireless MCU | Do the device, stack and memory configuration fit the BLE endpoint? |
| **Nordic nRF52840 DK** | Development kit for Bluetooth LE and protocols including Thread and Zigbee | Which protocol and software configuration fit the application? |

Sources: [TI LaunchPad documentation](https://www.ti.com/tool/LAUNCHXL-CC2640R2), [Nordic nRF52840 DK documentation](https://www.nordicsemi.com/Products/Development-hardware/nRF52840-DK/Download).

A BLE endpoint commonly communicates with a nearby phone or gateway that provides the wider application connection, so internet access, message delivery, range and energy use each need evidence beyond the protocol's name. A list of supported protocols is a list of options: check that the combination you need is supported together, in one software configuration, and compare topology and firmware support rather than counting radio logos.

### Computers and modules for gateways

A gateway receives many devices' reports, so the question changes from energy to services: what can we run alongside the receiving code?

| Platform | What changes | A useful evaluation role |
|---|---|---|
| **Raspberry Pi 5** | SBC with a general-purpose computing environment | Local services, protocol adapters, storage, user interfaces and gateway applications |
| **Raspberry Pi Compute Module 5** | Computing module integrated through a carrier | A product needing tailored connectors and mechanical design |

Sources: [Raspberry Pi 5 product documentation](https://www.raspberrypi.com/products/raspberry-pi-5/), [Compute Module hardware documentation](https://www.raspberrypi.com/documentation/computers/compute-module.html).

Running Linux gives a gateway familiar software tools but creates operating-system and storage responsibilities: plan image updates, service supervision, credentials, writable storage, power interruption and thermal behavior. A restart brings back the process, not its memory. Records held only in RAM are gone unless the service wrote them to storage first, and that storage must itself survive a sudden power loss.

A Compute Module moves part of the integration work onto the carrier without eliminating power, interface or environmental engineering. A custom carrier is useful when that work serves a product requirement and adds design and verification cost when an existing board already fits.

### Industrial boards and controllers

How does software connect to field equipment: through suitable terminals, load-rated outputs and a runtime that meets the local timing requirements?

| Product | Documented distinction | What to examine next |
|---|---|---|
| **Arduino Portenta Machine Control** | 24 V DC supply; field-oriented digital and configurable analog interfaces, including 0–10 V and 4–20 mA inputs | Channel limits, grounding, protection and installation |
| **Arduino Opta** | Micro-PLC family with supply terminals, input terminals and relay outputs | Exact variant, load ratings, response and recovery behavior |

Sources: [Portenta Machine Control manual, features and interface sections](https://docs.arduino.cc/resources/datasheets/AKX00032-datasheet.pdf), [Opta collective datasheet, §§3–5](https://docs.arduino.cc/resources/datasheets/AFX00001-AFX00002-AFX00003-datasheet.pdf).

A **programmable logic controller**, or **PLC**, is a controller platform intended for automation tasks, often bringing an installation format and programming workflow along with its I/O. Capabilities vary, so check the execution speed and any safety certification of the specific product; the name “PLC” promises neither.

The comparison now moves beyond processor resources: wiring termination, field voltage, service access and output behavior become central, and a relay output and a transistor output impose different load and switching constraints. **Galvanic isolation** separates conductive paths between parts of a system; establish it for the particular channels and supply domains, and do not infer that every connection is isolated from one advertised isolation feature.

This overview covers useful starting points, not every specialist option. Cellular, long-range radio, vision and accelerated-compute boards add other constraints, but the method holds: define the role and evaluate an exact implementation against it.

## Understand the CC2640R2F Through One Device

We study the **CC2640R2F** because it is small enough to see whole. It is TI's wireless microcontroller for small connected devices, combining computation, peripheral interfaces and a 2.4 GHz radio in one chip. A board built around it can acquire an input and communicate over BLE without a separate general-purpose application processor, but it has no Wi-Fi interface and does not run the Linux gateway application in our example. It belongs to an older generation, so the chapter uses it to make the chip, board and software boundaries concrete; a new product would compare current candidates, as the architecture comparisons later in this chapter do.

Its application processor is an **Arm Cortex-M3**, running up to **48 MHz**. It has **128 KB of programmable flash** and up to **28 KB of system SRAM**, with **8 KB shared between cache and RAM use**. Cache holds recently needed instructions and data to accelerate access; reclaiming that memory as RAM changes the memory configuration. These are silicon resources, before a selected firmware image reserves its share. [CC2640R2F datasheet, §§1 and 9](https://www.ti.com/lit/ds/symlink/cc2640r2f.pdf). Against RFC 7228's classes, this is a device between Class 1 and Class 2: tens of kilobytes of RAM and a code space measured in a hundred or so kilobytes.

### Three execution responsibilities inside the chip

| Subsystem | What it does | What it means for our program |
|---|---|---|
| Main Cortex-M3 | Application execution and higher Bluetooth software layers | Our normal application logic runs here alongside the required software services |
| Dedicated RF subsystem with Cortex-M0 | Time-critical radio execution | Treat it like a network card running vendor firmware: our code requests transmissions and TI's code owns their timing. It is not a spare core for a second application |
| Autonomous Sensor Controller | Small sensing tasks while the main CPU can remain asleep | Optional separately configured work, useful only when the input and task fit its supported capabilities |

The exact-part datasheet names these owners; the [family technical reference manual](https://www.ti.com/lit/ug/swcu117i/swcu117i.pdf) explains the underlying peripheral, power and controller architecture. This is a division of responsibilities, not three interchangeable desktop CPU cores.

Start with the ordinary path. Our main application asks an **I²C peripheral** to read a compatible digital temperature sensor. I²C is a local serial interface: two shared wires, one carrying a clock and one carrying data, with each sensor answering to a short address. The peripheral handles the signaling while a driver presents read and write operations to firmware. If the sensor instead supplies an analog voltage, the acquisition path needs an **ADC**, an analog-to-digital converter. The two input types have different peripheral and electrical requirements, and the next subsection works through both.

The application interprets the returned bytes and creates a record. In a suitable design, some work could instead be delegated to the Sensor Controller so the main application subsystem need not wake for every small sensing task. It covers only the inputs and tasks its supported capabilities include; existing sensor drivers do not move onto it by themselves. Begin with a clear main-CPU implementation, then decide whether the autonomous path saves enough work to justify its configuration.

Figure 2 shows who owns each step on the way from the sensor to the nearby peer, including the optional autonomous path.

<figure class="iot-diagram">
<picture data-compact-below="760">
  <source media="(max-width: 759px)" srcset="/images/iot-handbook/IOT-003/fig-2-cc2640-flow-compact.svg">
  <img src="/images/iot-handbook/IOT-003/fig-2-cc2640-flow.svg" alt="Illustrative CC2640R2F path: local sensor through peripheral and driver into Cortex-M3 application and RAM, then through Bluetooth stack work and the dedicated RF subsystem to a nearby peer. An optional Sensor Controller can perform supported sensing work and wake the main application. RF core is not a general application core." style="width:100%;height:auto">
</picture>
<figcaption>Figure 2. Execution owners in the room-monitor example. Higher Bluetooth work shares the main CPU with the application; radio timing belongs to the RF subsystem. The optional autonomous sensing path is shown separately.</figcaption>
</figure>

### From the pin to an indication: converter, reference and time

Two input paths lead from a sensor to firmware. Compare what each requires from the board, then use the optional calculations to inspect the numbers.

**The digital path.** Firmware reads a result through the sensor's local interface. In the constructed I²C register read below (two data bytes, five bytes on the wire), the transfer takes under a millisecond at a 100 kHz or 400 kHz bus clock. That is the cost of moving the result, not the acquisition latency: sensor conversion, bus contention and driver behavior belong in the timing budget.

<details markdown="1">
<summary>Optional calculation: the digital sensor transaction</summary>

A constructed sensor returns its result as one 16-bit register read over I²C. The transaction sends the sensor's address with a write flag, the register to read, a repeated start, the address again with a read flag, and then two data bytes: five bytes on the wire. I²C sends nine clock periods per byte (eight data bits and an acknowledge), so the transfer takes about 45 clock periods. At 100 kHz that is `45 / 100,000 Hz = 0.45 ms`; at 400 kHz, about 0.11 ms, plus a little for start and stop conditions.

</details>

**The analog path.** An ADC measures the input relative to a reference voltage. Assume a constructed sensor that outputs 10 mV per °C, read by a 12-bit converter with a 3.3 V reference. The converter divides the 3.3 V range into 4096 codes, so one code is about 0.806 mV, or about 0.081 °C. A finer code step helps only if the reference is trustworthy, because reference error shifts every decoded result.

| Constructed case | Firmware result for the same 25.0 °C input | Design consequence |
|---|---|---|
| Reference matches the assumed value | About 24.98 °C | Quantization remains even with the correct scale |
| Actual reference is 1% higher than assumed | About 24.73 °C | Reference error can dominate the converter step |

<details markdown="1">
<summary>Optional calculation: converter codes and reference error</summary>

The sensor outputs `0 V` at `0 °C`, and the ADC's full scale is its **reference voltage**, `3.3 V` (Chapter 2's converter example with a different reference). There are `2^12 = 4096` codes, so one code spans `3.3 V / 4096 = 0.806 mV`, which is `0.0806 °C` at `10 mV/°C`. A true `25.0 °C` is `250 mV`, which falls at code `250 / 0.806 ≈ 310.3`, so the converter reports 310. Firmware decodes `310 × 0.806 mV = 249.8 mV`, or `24.98 °C`. The 0.02 °C gap is quantization: no code distinguishes inputs within one 0.0806 °C step.

The reference is the second contributor: the converter measures the input as a fraction of it, so reference error scales every result. If the actual reference is `1%` high at `3.333 V` while firmware still assumes `3.3 V`, the same `250 mV` input yields code 307, and firmware decodes `24.73 °C`: about 0.27 °C low, of which 0.25 °C is the 1% reference error and the rest quantization.

</details>

<details markdown="1">
<summary>Optional calculation: carrying the converter into Chapter 2's uncertainty budget</summary>

Quantization with a uniform position inside a bin of width `q = 0.0806 °C` has standard uncertainty `q/√12 ≈ 0.023 °C`, using Chapter 2's method. Treat a stipulated `±1%` reference bound at 25 °C as a uniform bound of `±0.25 °C`, giving `0.25/√3 ≈ 0.144 °C`. Combining these two contributions by root-sum-of-squares gives `√(0.023² + 0.144²) ≈ 0.146 °C`, before offset, noise, self-heating and installation terms. The reference dominates: halving the converter step to 13 bits would barely change the result.

</details>

**When is the sample taken?** Define the timestamp against the sensor's acquisition behavior. A device may sample over an interval or convert after capturing the input, so result availability and the physical sampling instant are not necessarily identical. Record the acquisition-time convention and any delay or uncertainty, rather than stamping the record when it enters a queue or leaves the radio; Chapter 1's freshness check depends on that meaning. A faster read schedule still cannot remove the thermal response lag explained in Chapter 2.

### What we write for the room monitor

Our firmware needs an application state: no valid sample yet, latest valid sample, local sample sequence, link state and pending work. Chapter 2 listed what a useful observation record carries: quantity and unit, acquisition time, location, the raw indication where needed, a correction version and validity. A constructed 16-byte record can hold that evidence:

| Field | Bytes | Role |
|---|---:|---|
| Sequence number | 4 | Lets a receiver detect gaps and duplicates within one session |
| Acquisition time | 4 | Seconds on a declared clock; documented acquisition convention |
| Temperature | 2 | Signed integer in hundredths of °C |
| Status flags | 1 | Valid, out-of-range, sensor fault, first sample after reset |
| Correction version | 1 | Links to a versioned calibration record |
| Sensor identity | 2 | Keys a separate installation record holding location, unit and range |
| Checksum | 2 | Detects corruption of the record |

Quantity and unit are fixed by the format version; the installation record supplies location. Both peers must agree on scale, byte order and validity. The 16-byte record fits within the 20-byte value payload of a notification using the default 23-byte ATT MTU. That limit concerns message size, not the number of records retained during an outage. [TI GATT guide, MTU](https://software-dl.ti.com/simplelink/esd/simplelink_cc2640r2_sdk/5.30.01.11/exports/docs/ble5stack/ble_user_guide/html/ble-stack-5.x/gatt.html#maximum-transmission-unit-mtu).

<details markdown="1">
<summary>Optional example: decoding the record bytes</summary>

Our constructed record uses little-endian byte order and hundredths of a degree Celsius. A reading of 24.30 °C is encoded as 2430, or `0x097E`, with temperature bytes `7E 09`. Bytes `26 0B` decode to `0x0B26 = 2854`, or 28.54 °C. These are choices of this application format: Bluetooth does not supply the meaning of a custom value, so the receiver also needs the format version, field types, scale and validity rules.

</details>

The device's behavior is to initialize the sensor connection, application state and Bluetooth service; acquire and validate a sample on a scheduled event; update the current value and retain records according to the buffering requirement; request a Bluetooth update when the connection and subscription permit; handle queue pressure, disconnection and restart; and let the runtime enter a low-power state when work permits. We supply that policy. TI's stack supplies protocol mechanisms and the RF subsystem handles scheduled radio work, so we neither write a Bluetooth implementation nor time every transmitted bit.

### How that record reaches another device

Choose one communication path for this example: the monitor is a **BLE peripheral** and the gateway is a **central**, roles that describe connection establishment. The monitor advertises so a scanning central can discover it and initiate a connection. Advertising is the discovery step in this design; a different application could put small reports directly into advertisements without this connected path. [TI GAP guide](https://software-dl.ti.com/simplelink/esd/simplelink_cc2640r2_sdk/5.30.01.11/exports/docs/ble5stack/ble_user_guide/html/ble-stack-5.x/gap-cc2640.html).

Over the connection, we use **GATT**, the Generic Attribute Profile, to expose application data. A **service** groups related functionality. A **characteristic** supplies a value and associated access and behavior metadata. A software engineer can read a characteristic like a key in a small key-value store: it holds the latest value, a new write overwrites the old one, and it is not a queue. Our monitor acts as a GATT server exposing a temperature characteristic and the gateway as a client; GATT roles are distinct from central/peripheral roles, and this is the pairing chosen for the example.

The client discovers the service and enables notifications by writing the characteristic's **Client Characteristic Configuration Descriptor** (CCCD), a small switch attached to the characteristic. Then firmware can ask the stack to send a notification when there is a new value. A notification pushes a value without an ATT confirmation, so an application that must establish that the gateway stored every record needs its own receipt and replay policy. Updating the local characteristic and requesting a notification are separate operations: until the gateway sets the CCCD, the monitor stores each new value and sends nothing for it.

That switch does not necessarily survive a disconnection. The Bluetooth Core Specification keeps a client's CCCD value across connections only for a bonded client, meaning one that has paired and stored its keys; otherwise the value returns to "off" when the link ends. After every reconnection the gateway must therefore discover the service again if needed and re-enable notifications, unless a bond preserves the setting. Until it does, the monitor is connected but has nothing to send, and the endpoint's state table needs a row for that case. [Bluetooth Core Specification, attribute and GATT parts](https://www.bluetooth.com/specifications/specs/); [TI GATT guide, services, characteristics and client configuration](https://software-dl.ti.com/simplelink/esd/simplelink_cc2640r2_sdk/5.30.01.11/exports/docs/ble5stack/ble_user_guide/html/ble-stack-5.x/gatt.html).

Chapter 1's request-and-response table applies to this link. The firmware's call to submit a notification is a request issued, the stack accepting it is a communication stage, the gateway application storing the record under its contract is an application stage, and a physical observation of the room is another. Each is separate evidence for a different claim, and only the last says anything about the temperature at the monitoring point.

Security also begins here, and Chapter 1's distinction between authentication and authorization applies. Decide which central may connect, whether it must pair and bond before reading, and which client may write the CCCD or any configuration characteristic. A characteristic that lets any nearby device change the sampling interval or correction version is an exposed local interface, and a changed correction version alters what every later record means.

| Event | Device/application behavior | What happens next |
|---|---|---|
| Startup | Mark sample invalid; initialize drivers and service | Start discovery/connection procedure |
| Sampling event | Read and validate input; update record and sequence | Retain according to the data policy |
| Connected, awaiting subscription | Keep the current readable value and keep retaining records | Send nothing until the gateway enables notifications; a new, non-bonded connection starts here |
| Connected and subscribed | Submit an update if stack capacity permits | Stack/radio schedule transmission; peer processes received data |
| Stack temporarily cannot accept work | Keep pending work within a finite bound | Retry later or apply the explicit overflow policy |
| Disconnected | Continue sampling within the retention policy | Reconnect within an energy budget; report any gaps, then wait for the subscription |

If lossless historical transfer matters, add a protocol for identifying retained records, acknowledging their receipt at the required application boundary and retrying them after reconnection. The sequence number in our record makes that possible: within one session, the gateway can ask for everything after the last sequence it stored. A characteristic holding only the latest value cannot reconstruct readings overwritten during an outage.

The phrase "within one session" matters. If the sequence counter lives in RAM, a reset starts it again, and a request for "everything after sequence 5,000" then returns nothing, or matches different records that reuse those numbers. A reliable replay therefore also needs a boot or session identity associated with every record, so that the pair (identity, sequence) is unique. Chapters 4 and 5 call this identity a **boot generation**. The 16-byte record above has no spare field for it. A design could carry it as session metadata that the gateway associates with the records of a connection, or spend some of the record's capacity on it, for example by shortening the counter. Later chapters develop that choice; here we only note that the sequence number alone is not enough across a reset.

This is a conceptual event flow, not drop-in TI code:

```text
on_sample_event:
    result = acquire_input()
    if result is valid:
        record = encode(result, next_sequence, acquisition_time)
        update_current_value(record)
        retain_under_bounded_policy(record)
        if connected and notifications_enabled:
            request_update_or_keep_pending(record)
    else:
        mark_acquisition_unavailable_without_refreshing_old_sample_time()

when_no_work_is_ready:
    allow_runtime_power_management()
```

Each name stands for behavior we must implement or obtain from the selected SDK: in a TI project, application C code uses drivers and Bluetooth APIs, with tasks, events and synchronization supplied by the supported runtime. The structure resembles an event loop more than a request handler, and is quite unlike a gateway process opening a database and an internet connection. The code reacts to timer, input and radio events and then returns control, because blocking and waiting must fit the runtime's scheduling and power-management rules.

### What low power means in this device

The mechanism is to do the required work briefly and keep unnecessary domains inactive between events. The main CPU can stop executing while retained state and wake sources support later work; the radio is the larger cost, and a connected BLE link spends it on a schedule.

Two BLE peers exchange data at scheduled **connection events**. The **connection interval** sets their spacing, so it affects both radio activity and the wait before a new report can be sent. Sampling once per second does not make the connection operate once per second: the radio meets its peer on the connection's schedule whether or not there is data. Select communication timing from the latency and energy requirements together.

In the constructed event budget below, increasing the interval from 100 ms to one second reduces the modeled connection-event current tenfold, while lengthening the possible wait for the next event. This isolates one trade-off; the whole board still consumes energy between events.

<details markdown="1">
<summary>Optional calculation: connection-event energy and latency</summary>

The Bluetooth Core Specification allows the connection interval to range from 7.5 ms up to 4 s. [Bluetooth Core Specification, Vol. 6, Part B](https://www.bluetooth.com/specifications/specs/). In each connection event the radio wakes, exchanges at least one packet pair and sleeps again, whether or not there is data to send (a peripheral can be configured to skip some events, which trades latency for energy again), and this is where the energy goes. A constructed event that keeps the radio at `8 mA` for `1 ms` (a round number chosen for the arithmetic, not the datasheet's radio current) costs `8 mA × 0.001 s = 0.008 mA·s`. At a 100 ms interval there are 10 events per second, an average of `0.008 × 10 = 0.08 mA` from connection maintenance alone. At a 1 s interval it is 0.008 mA, ten times less. The interval also sets latency: a notification submitted just after an event waits for the next one, up to the whole interval. The interval therefore trades responsiveness for energy, and sampling less often saves nothing when the link costs more than the sampling does.

The interval is also limited from the other side by link survival. A link is declared lost when no valid packet arrives within the **supervision timeout**, and the Core Specification requires that timeout to exceed `(1 + peripheral latency) × interval × 2`, where peripheral latency is the number of events the peripheral may skip. With no latency, a 100 ms interval needs a timeout above 200 ms, a 1 s interval above 2 s, and the 4 s maximum above 8 s. A longer timeout also means the endpoint notices a vanished gateway later, which delays the moment its outage policy starts.

</details>

**Standby** and **shutdown** have different consequences. With appropriate retention, standby lets execution resume after a wake event, while shutdown loses normal RAM state and wakes through a reset path, so a retained sample queue needs a different design if shutdown is part of normal operation. These modes are described in the [technical reference manual's power architecture](https://www.ti.com/lit/ug/swcu117i/swcu117i.pdf) and the exact-part datasheet's §9.8.

This makes the CC2640R2F a useful candidate for modest sensing, device-state logic and intermittent BLE communication. A requirement for direct Wi-Fi connection, a Linux application environment or a firmware image beyond its internal flash capacity changes the architecture or the part choice. Low-power intent still needs a whole-board energy budget (regulator losses, LEDs, sensor operation and reconnection work remain), which the section on energy and failure below builds.

### Chip, LaunchPad and finished product

The **LAUNCHXL-CC2640R2** is TI's development platform for evaluating this device. A development board gives us physical access for programming, debugging and peripheral connections. A finished board can arrange its supply, input circuitry, radio path and connectors differently. [TI LaunchPad documentation](https://www.ti.com/tool/LAUNCHXL-CC2640R2).

A chip name gives us this computational model and nothing more. To understand a specific board built around it, look next to its schematic, fitted parts, firmware project and intended power and communication behavior, where each responsibility above can be located in the real implementation.

The software baseline also matters. **SimpleLink CC2640R2 SDK 5.30.01.11** includes separate BLE-Stack and BLE5-Stack components. Our explanatory API/task model uses the **BLE5-Stack 1.01.15.00 guide's single-device configuration**; it does not claim this room-monitor firmware was built or sized. The memory-oriented BLE-Stack route is another configuration to evaluate. A larger Bluetooth version label does not select the best memory/feature trade-off for an application. [SDK documentation overview](https://software-dl.ti.com/simplelink/esd/simplelink_cc2640r2_sdk/5.30.01.11/exports/docs/Documentation_Overview.html), [software architecture](https://software-dl.ti.com/simplelink/esd/simplelink_cc2640r2_sdk/5.30.01.11/exports/docs/ble5stack/ble_user_guide/html/ble-stack-5.x-guide/software_architecture.html).

## Compare Architectures Under the Same Requirements

### CC2640R2F versus nRF52840: memory changes what we can keep local

Compare the two **chips** first, then their development boards. Nordic's nRF52840 supports BLE as well as 802.15.4-based protocols including Thread and Zigbee. These are documented hardware capabilities; a product still selects compatible software. [Nordic nRF52840](https://www.nordicsemi.com/products/nrf52840).

| Silicon resource | CC2640R2F | nRF52840 |
|---|---|---|
| Application CPU | Cortex-M3, up to 48 MHz | Cortex-M4 with FPU, 64 MHz |
| Programmable flash | 128 KB | 1 MB |
| System working memory | Up to 28 KB, with cache/RAM qualification | 256 KB RAM |

The table keeps each vendor's unit. Datasheets write "KB" and sometimes mean 1,024 bytes, so we do not convert; the constructed budgets in this chapter use KiB, which always means 1,024 bytes. The memory difference buys room for different firmware and data arrangements, not an automatic speed or battery-life result: a larger image, additional protocol services and retained records share finite resources with their runtimes, and clock frequency is a weaker first discriminator when a candidate cannot hold the required program or queue.

Use identical constructed requirements: a compatible 3.3 V I²C input, one sample per second, a nearby BLE gateway, and five minutes of lossless RAM buffering at **16 bytes per record**. "Lossless" here assumes the buffer is empty when the outage starts and power is maintained throughout; a reset empties RAM. The record storage alone needs 4,800 bytes, before queue metadata and runtime allocations. Both chips have the relevant I²C and BLE capabilities, and neither is accepted on specification alone. The CC2640R2F cannot assume its advertised RAM is free, and the nRF52840's extra RAM still needs a build and memory budget for the 4,800 bytes plus software. The battery objective needs whole-board activity and idle current evaluated on both, because larger memory does not settle energy.

For a **new design expecting substantial feature growth**, the nRF52840 route is the first to evaluate, because its documented memory gives more room for those requirements. For an **existing CC2640R2F design already meeting the workload**, first establish its actual remaining budget and energy behavior: reusing a working TI board and firmware avoids a hardware and stack migration if the requirements still fit, and a larger specification number alone does not justify the migration work. These are conditional design judgments, not measured product rankings.

Now change one requirement: the complete deployed executable image must occupy **160 KiB entirely in internal programmable flash**, with no external program storage. That is 163,840 bytes, which exceeds the CC2640R2F's documented 128 KB capacity whether we read it as 128,000 or 131,072 bytes, so the part fails this constraint regardless of processor utilization. The nRF52840's total flash survives this first screen; board compatibility, reserved regions and actual execution still need checking. This is a changed teaching requirement, not a claim that our small monitor needs a 160 KiB image.

For physical development, compare **LAUNCHXL-CC2640R2** with **nRF52840 DK** separately. Nordic documents an onboard J-Link debugger and current-measurement access for its DK. Those facilities help investigate code and energy. A development board carries extra circuitry, so its measured consumption is specific to that board and workload, not an upper bound or prediction for a different production board. [Nordic DK](https://www.nordicsemi.com/Products/Development-hardware/nRF52840-DK/Download).

### UNO R4 WiFi versus ESP32-S3: where does the connected application run?

On the **UNO R4 WiFi**, the main RA4M1 runs the normal application while a separate ESP32-S3 module provides connectivity. On an **ESP32-S3-DevKitC-1**, the ESP32-S3 is both the primary application MCU and the networking platform, so the same family name can refer to a helper on one board and the main processor on another.

| Resource or boundary | UNO R4 WiFi | ESP32-S3-DevKitC-1-N8R8 |
|---|---|---|
| Main application MCU | 48 MHz RA4M1 | Dual-core LX7 ESP32-S3, up to 240 MHz |
| Main internal SRAM | 32 KB on RA4M1 | 512 KB on ESP32-S3 |
| Flash / additional RAM | 256 KB RA4M1 flash; connectivity module has its own memory | Named module variant: 8 MB flash and 8 MB PSRAM |
| Application I/O domain | Main RA4M1 domain operates at 5 V; ESP32-S3 domain is 3.3 V | ESP32-S3 uses a 3.3 V logic domain; board power input is a separate boundary |

Sources: [UNO R4 WiFi manual](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf), [ESP32-S3 datasheet v2.2](https://documentation.espressif.com/esp32_s3_datasheet_en.pdf), [DevKitC-1 guide v1.1, N8R8 variant](https://documentation.espressif.com/esp-dev-kits/en/latest/esp32s3/esp32-s3-devkitc-1/user_guide_v1.1.html). This S3 board is distinct from the earlier ESP32-DevKitC V4.

**PSRAM** is additional working memory accessed through an external memory interface. It can support larger data buffers, but it is not interchangeable with all internal SRAM: access paths, timing and SDK allocation rules differ. [ESP-IDF v5.4.2 external-RAM guide](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32s3/api-guides/external-ram.html). Likewise, the UNO's two processors do not combine their memories into one ordinary application heap. The board also decides which pins remain free: on the N8R8 variant, whose PSRAM is accessed through an octal interface, Espressif reserves GPIO35 to GPIO37 for that memory, so they should not be used as general-purpose I/O.

For an application centered on network buffers and local connected processing, evaluation begins on the ESP32-S3 architecture. For an existing UNO-oriented teaching setup or supported expansion hardware, the UNO R4 architecture may shorten integration. The answer reverses when the decisive dependency changes: an existing hardware interface can outweigh surplus CPU capacity, while an application exceeding the main MCU's available RAM needs a different memory arrangement.

This also changes debugging. With separate application and connectivity processors, investigate their communication and firmware compatibility as well as the main program; with an integrated connected MCU, account for scheduling and resource contention between application and network work. Neither makes a local deadline hold automatically.

### Pico 2 W versus NUCLEO-F446RE: programmable I/O or a particular peripheral platform?

**Raspberry Pi Pico 2 W is an MCU board.** Its RP2350 has 520 KB SRAM, up to 150 MHz operation, and a choice of dual Arm Cortex-M33 or dual Hazard3 RISC-V cores; those alternatives are not four application cores running together. The board supplies 4 MB flash, wireless connectivity and programmable I/O, or **PIO**, state machines. [Raspberry Pi Pico documentation](https://www.raspberrypi.com/documentation/microcontrollers/pico-series.html).

PIO runs small programs that coordinate pin-level I/O independently of ordinary application instructions, much as a tiny dedicated processor would drive a bit-banged protocol so the main code does not. It is useful when the task calls for a particular signal sequence or custom interface timing. Its pins still carry only logic levels: a field transceiver or a voltage converter has to supply anything beyond that.

The **NUCLEO-F446RE** instead evaluates a particular STM32F446RE: Cortex-M4 up to 180 MHz, 512 KB flash and 128 KB main SRAM, with timers, ADCs and communication peripherals. Its board includes ST-LINK programming/debug facilities. [STM32F446RE](https://www.st.com/en/microcontrollers-microprocessors/stm32f446re.html), [Nucleo board](https://www.st.com/en/evaluation-tools/nucleo-f446re.html).

The two boards divide the work differently. **DMA**, direct memory access, is a hardware engine that moves data between a peripheral and memory without the CPU copying every element, so a converter can fill a buffer while the program does something else. Timers and DMA support regular peripheral acquisition; PIO programs generate or capture custom pin sequences. Compare the mechanism the actual interface requires, rather than treating those features or clock speeds as interchangeable.

For a prototype driven by custom pin timing and a local wireless connection, Pico 2 W is an attractive first investigation. For a design driven by a specific STM32 peripheral arrangement, compatible driver stack or existing STM32 firmware, the Nucleo board exposes the target architecture directly. Check the required peripheral channels, pin multiplexing and driver support before selecting either.

### MCU versus Raspberry Pi computer: firmware image or Linux service?

Pico 2 W executes MCU firmware; **Raspberry Pi 5** provides an application-computer platform. On the latter, our gateway can run a receiving service, a local database and a network client as separate processes, which makes sense when the system needs those services and can support the board's power, boot and storage needs. [Raspberry Pi 5](https://www.raspberrypi.com/products/raspberry-pi-5/).

| Question | MCU endpoint | Linux gateway |
|---|---|---|
| What do we deploy? | Target firmware image/configuration | OS image plus application/service packages |
| Where is live state? | Explicit RAM allocations under the selected runtime | Process memory, kernel buffers and application storage |
| What happens after restart? | Startup initializes device behavior | Boot, filesystem and service startup must restore the application |
| What does richer software cost? | Code and memory pressure on a small target | OS/storage maintenance, resource supervision and a larger system to operate |

If the job is to sample once per second and communicate a small record, a Linux environment adds responsibilities that may be unnecessary. If it is to buffer many devices' reports, run a database and integrate network services, an MCU may force us to rebuild facilities the OS already supplies. Local timing can remain with a suitable controller while Linux handles aggregation.

A **Compute Module 5** is another integration choice within the application-computer category: the computing subsystem sits on a module, and a carrier supplies the product's connectors and surrounding design. Choose it when dimensions, interfaces or manufacturing justify the carrier work; it is not a software escape from Linux maintenance or a completed industrial installation. [Compute Module documentation](https://www.raspberrypi.com/documentation/computers/compute-module.html).

### Industrial gateway versus controller: data integration or field I/O?

The **Siemens SIMATIC IOT2050** illustrates an industrial gateway computer. Its documented interfaces include Ethernet and configurable RS232/RS422/RS485, with a 12–24 V DC supply in the cited model family. Those facilities support integration with existing equipment; they do not turn every gateway application into a PLC control task. Exact hardware revisions and installation limits remain model-specific. [Siemens operating instructions, 04/2023, §§1 and 9–10](https://cache.industry.siemens.com/dl/files/016/109779016/att_1018122/v2/iot2050_operating_instructions_en_en-US.pdf).

**Portenta Machine Control** and **Opta** address different field-I/O arrangements. Machine Control provides configurable analog input types and high-side digital outputs; a **high-side switch** controls the positive supply path to a load. Opta provides relay outputs; a **relay** switches contacts, with load and switching characteristics specified separately. Opta's family includes variants with different communications, so optional connectivity must be checked on the selected model. [Machine Control manual](https://docs.arduino.cc/resources/datasheets/AKX00032-datasheet.pdf), [Opta datasheet](https://docs.arduino.cc/resources/datasheets/AFX00001-AFX00002-AFX00003-datasheet.pdf).

For reading an existing controller's serial data and forwarding it to services, evaluate an industrial gateway. For acquiring field-level analog signals and applying local outputs, evaluate the required I/O/controller combination. For a relay-switched load, evaluate the actual relay ratings and switching behavior; replacing it with a transistor output changes the electrical design. Putting all three products in an “industrial” column would hide the choice that matters.

A typical PLC-style program runs as a repeating scan rather than a reaction to events: it reads the input state, executes the controller logic and writes the outputs, then repeats. Depending on the runtime, the scan is either free-running, with a limit on its maximum duration, or started at a configured period. That is a different execution responsibility from a gateway process waiting for a remote response, and it is what makes the cycle time something the controller can state and bound. The exact scan/task model and timing belong to the selected controller runtime. Safety functions require their own documented capability and assessment; ordinary automation suitability is insufficient.

## Read Interfaces at the Correct Boundary

A **GPIO** is a general-purpose digital input or output. An **ADC** converts an analog input into a digital code, as the CC2640R2F walkthrough showed. **PWM**, pulse-width modulation, varies the fraction of time an output is active. A **timer** tracks time or generates events; it can support periodic sampling, pulse measurement or PWM. An **interrupt** asks the processor to respond to an event without continuously polling for it. It works like a signal handler: it preempts the main program wherever that program happens to be, so it must be short and must not block.

These capabilities help only when the board exposes them with suitable electrical behavior. A pin's alternate functions may compete, some connections are already used by onboard memory or other devices, and board labels, MCU pin names and software pin identifiers can differ.

For each external connection, trace:

**External signal → connector → protection/conditioning/transceiver → MCU peripheral → driver → application.**

A **transceiver** implements a physical signaling interface. A controller that implements a protocol in logic may still lack the line interface on its board. Arduino's UNO R4 WiFi manual, for example, specifies that CAN requires an external transceiver. [UNO R4 WiFi manual, main-MCU features](https://docs.arduino.cc/resources/datasheets/ABX00087-datasheet.pdf).

Likewise, accepting a higher voltage at a power connector does not establish that the signal pins tolerate that voltage. Supply inputs, logic levels, analog ranges and output-drive limits are separate specifications. Ground reference, input thresholds, output current and power-off behavior also matter. The chapter's diagrams show responsibilities, not wiring, and imply no connection procedure.

A constructed cabinet input carrying 24 V cannot be selected against an exposed 3.3 V logic pin merely because both are described as “digital.” The choice is between boards or interface designs that implement the required conversion and protection. The software value `true` hides the circuitry that makes it meaningful.

## Resources: Memory and Timing Before Clock Speed

### Available memory is a budget

Flash commonly stores firmware; RAM holds live state such as buffers, stacks and protocol data; **ROM** contains fixed code or data. They are not interchangeable, and a total memory number is only the starting point, because the selected software takes its share first and the linker's map file shows how much. On the CC2640R2F the application competes with the Bluetooth stack, drivers and runtime for the same RAM, so the map is unknown until a build exists. The numbers below show the method.

Consider a constructed MCU configuration with **20 KiB** available to divide among the following allocations. A KiB is 1,024 bytes. These are teaching assumptions, not the CC2640R2F memory map.

| Allocation | Assumed RAM |
|---|---:|
| Protocol stack and drivers | 8 KiB |
| Task stacks and runtime | 4 KiB |
| Application state | 3 KiB |
| Reserved margin | 2 KiB |
| Remaining sample buffer | 3 KiB |

At **16 bytes per stored record**, the buffer holds **192 records**. At **one record per second**, an initially empty buffer fills after 192 seconds without draining. A five-minute outage generates 300 records. The design therefore needs another policy: more storage, a lower retained rate, aggregation, or explicit dropping with loss metadata.

The remaining memory is not automatically free heap: real allocations include alignment and metadata, stack demand varies, and reserved memory may be inaccessible to an allocator. The example teaches budgeting, not a safe allocation target; check the selected build's memory map and runtime behavior.

<details markdown="1">
<summary>Optional calculation: the buffer and the outage</summary>

The 20 KiB total is `20 × 1,024 = 20,480` bytes. The four fixed allocations take `8 + 4 + 3 + 2 = 17 KiB`, leaving `3 × 1,024 = 3,072` bytes for samples. Each record is 16 bytes, so `3,072 / 16 = 192` records, exactly, with no remainder. A five-minute outage needs `300 × 16 = 4,800` bytes, 1,728 more than the buffer holds. Growing the record to 22 bytes with a longer timestamp would shrink the capacity to `⌊3,072 / 22⌋ = 139` records, about 2 minutes 19 seconds, so record size is a design variable as well as a protocol detail.

</details>

### Real time means meeting a deadline

Deadline and jitter are separate ideas. A **deadline** is the latest time by which a result must be available. **Jitter** is variation in timing. Clock frequency alone does not bound either. The path may include peripheral conversion, interrupt handling, scheduling, resource contention and output transfer.

Assume a constructed application must update a local output within **5 ms** of an input event. Its assumed worst-case budget is:

| Stage | Assumed upper bound |
|---|---:|
| Acquisition and conversion | 0.8 ms |
| Dispatch and waiting | 1.2 ms |
| Decision computation | 0.5 ms |
| Output transfer | 0.5 ms |
| Total | 3.0 ms |

That leaves 2.0 ms against the deadline, provided the bounds are justified and all relevant work is included. An unbounded network wait invalidates the argument. An average completion time of 3 ms also fails to establish a 5 ms worst case. The 0.8 ms acquisition allowance must be justified for the chosen sensor and event; the short register-transfer example cannot establish it, especially if conversion has not completed before the read.

This 5 ms budget is the board's share of the deadline. Chapter 2 showed that the physical path has its own clock: a sensor with a one-second time constant needs about 1.2 s before its indication crosses a 27 °C threshold, and a ten-second one needs 12 s. Faster firmware shortens the part of the response the board controls. It cannot shorten the part the thermal path controls, so a requirement stated in terms of the physical quantity needs both budgets.

A **bare-metal** program runs without a general-purpose operating system; it can use a main loop and interrupts. A **real-time operating system**, or **RTOS**, provides scheduling and other services designed for embedded timing needs. A deadline holds when every wait on its path has a bound. Write those bounds for blocking calls, interrupt priorities and queue depth, then compare their sum with the budget.

Hardware timers can maintain a waveform without software toggling every edge. Interrupts capture important events promptly, but long handlers delay other work, so prefer short capture and acknowledgement followed by bounded processing. Whether that suffices depends on the actual deadline and hardware.

For our constructed system, the local timing responsibility belongs on a controller whose complete path can be bounded. The Linux gateway can handle storage and services. That is the local-control-with-remote-supervision pattern from Chapter 1, assigned to boards. It is an architectural judgment: Linux can be configured for real-time work, and an MCU only meets the deadline if its own waits are bounded.

## Energy and Failure: What the Whole Board Does

### Sleep current is one state in a cycle

Figure 3 lays out one endpoint cycle as a sequence of states; the constructed currents that follow attach numbers to it.

<figure class="iot-diagram">
<picture data-compact-below="760">
  <source media="(max-width: 759px)" srcset="/images/iot-handbook/IOT-003/fig-3-duty-cycle-compact.svg">
  <img src="/images/iot-handbook/IOT-003/fig-3-duty-cycle.svg" alt="Constructed endpoint cycle: sleep, acquire, buffer, attempt radio transfer, then return to sleep. If the link is unavailable, use a bounded retry policy and preserve or explicitly drop queued data. Sending alone does not prove delivery." style="width:100%;height:auto">
</picture>
<figcaption>Figure 3. A conceptual state sequence, not a measured trace. Each active state and the rest of the board contribute to energy use. The diagram does not depict acknowledgement or physical-effect verification.</figcaption>
</figure>

Assume a constructed endpoint spends **20 ms at 8 mA** and **980 ms at 0.005 mA** in each one-second cycle. Both currents are assumed whole-endpoint values at the same supply boundary, for a board with no other always-on load. They are not specifications or measurements for a named board. The 8 mA is the round teaching number from the connection-event model above. The 20 ms active window corresponds to the one-second connection interval: it is assumed to contain the wake-up and settling time, the sensor read, record handling and that cycle's one connection event, which is why it is much longer than the 1 ms event alone. Wake-up and processing overhead around a short radio event can matter as much as the radio current.

The modeled average is **0.1649 mA**. With **220 mAh of usable charge**, the simple charge budget gives about **1,334 hours**, or **55.6 days**.

Now add an extra always-on load of **1 mA** to the same endpoint, perhaps a power LED and a regulator that draws quiescent current. The modeled average becomes **1.1649 mA**, reducing the charge-budget estimate to about **7.9 days**. The extra load is 86% of the new average and the entire radio duty cycle only 14%: the MCU can sleep correctly while the assembled board misses its energy objective.

<details markdown="1">
<summary>Optional calculation: the two battery estimates</summary>

The active term is `8 mA × 0.020 s = 0.1600 mA·s` and the sleep term `0.005 mA × 0.980 s = 0.0049 mA·s`, so over a one-second cycle the average is `0.1649 mA`. Dividing the assumed charge by the average gives `220 mAh / 0.1649 mA ≈ 1,334 h`, and `1,334 / 24 ≈ 55.6` days. The second variant is `220 / 1.1649 ≈ 188.9 h`, `188.9 / 24 ≈ 7.9` days. The 1 mA load cuts the estimate by a factor of seven, and no change to the MCU's sleep current can recover that.

</details>

Retransmission, reconnect attempts and sensor warm-up can change the active time. If supply voltage varies or conversion losses matter, model energy at the appropriate boundary rather than combining currents measured at different voltages. Battery behavior, voltage limits and the real workload change a charge-budget estimate, so measure the final implementation across its relevant states before making a battery-life claim.

### Loss of communication must be a normal state

A finite board cannot store unlimited data during an indefinite outage. Define how long it retains records, what gets discarded, and how the application reports gaps. Bound retry effort so an absent peer cannot consume the battery indefinitely. Chapter 2's rule applies on the board too: a failed acquisition is recorded as unavailable with its old time intact, and firmware never substitutes zero or refreshes a stale timestamp.

On restart, decide which state is trustworthy: a persistent configuration may survive while a volatile queue does not, and a reset output may differ from the last commanded output. Firmware should expose restart identity or reset diagnostics where the design supports them, and consumers should distinguish unavailable observations from current ones. The record's first-sample-after-reset flag marks that discontinuity, but a flag on one sample is not a complete boundary: if that sample is lost or never sent, the receiver sees no break. A reliable boundary also needs a boot identity associated with the records, the boot generation that Chapters 4 and 5 develop.

A **watchdog** is a hardware timer that resets the chip unless the program keeps restarting it. Think of it as a liveness probe, with the difference that there is no orchestrator to reschedule the work: the whole chip restarts. A kicked watchdog proves only that the code doing the kicking still runs, so place the kick after the health check that matters and log every reset. Recovery also needs safe initialization, valid configuration and a way to diagnose repeated resets. Report the actual recovery outcome, including unknowns.

### The comparison needs a common measurement boundary

When comparing two candidate boards, capture current at the same declared supply boundary and under the same sampling, connection and retry conditions, separating active bursts from the idle baseline. An always-on support circuit can dominate the energy saved by changing MCU sleep modes, so locate that load before attributing a difference to the processor family.

## What Makes an Industrial Board Suitable?

“Industrial” becomes useful when translated into requirements for the complete assembly and installation.

| Requirement | Evidence to request |
|---|---|
| Supply and field wiring | Input range, transients, protection and grounding requirements |
| Environment | Board/product operating limits, enclosure conditions and relevant test reports |
| Timing and outputs | Defined response, startup state, overload behavior and load-specific ratings |
| Installation and maintenance | Connectors, mounting, service access and replacement procedure |
| Security and updates | Device identity, key handling, update/recovery design and patch responsibility |
| Service life | Hardware revision control, supplier support information and migration plan |

**Electromagnetic compatibility**, or **EMC**, concerns equipment operating acceptably in its electromagnetic environment and limiting the disturbances it produces. Installed cables, power arrangement and enclosure belong in that evaluation, because the assembled system is what radiates and what is disturbed.

An enclosure also changes heat flow and access, and Chapter 2's thermal-path reasoning returns here: a sensor inside a warm enclosure measures the enclosure. Ask where temperature is specified (ambient around a product, board location or semiconductor junction) and match that definition to the installation. A wide-temperature component is evidence for that component; other parts and system conditions need their own ratings.

Industrial reliability and **functional safety** are separate questions. Functional safety concerns risk reduction that depends on a system performing specified safety functions. No board in this chapter is presented as implementing such a function. Where one is required, selection needs the applicable safety requirements, documented product capability and qualified engineering assessment.

Industrial products may save engineering work by supplying field interfaces and service provisions. Custom boards may be justified by volume, dimensions, energy or unusual interfaces. Compare the total cost: hardware, development, tooling, verification, installation, updates, support and replacement. A low unit price can coexist with a high maintenance burden.

## Worked Example: Make the Board Choice Reviewable

Return to the opening system. A defensible initial architecture is:

| Job | Candidate category | Evidence still needed |
|---|---|---|
| Battery BLE endpoint | Wireless MCU board or production module; CC2640R2F-based design is one example | Whole-board energy, stack/memory fit, link behavior and recovery |
| Powered gateway | Linux SBC or SoM with suitable carrier | Storage under interruption, buffering, thermal behavior and updates |
| Wired cabinet control | Industrial controller or qualified custom interface design | Field electrical limits, local deadlines, output states and installation |

For our five-minute retention requirement, the record payload alone needs 4,800 bytes. In the constructed 20 KiB budget, the 3 KiB left for samples holds only 192 of the 300 records, so that configuration fails the requirement and would need more storage or an explicitly revised retention contract. Neither chip is accepted until its actual build shows how much memory remains for those 4,800 bytes, and its runtime margin and board-level energy behavior are established.

These are candidate categories, not selected products. If the endpoint must connect directly to a Wi-Fi network without a nearby BLE peer, revisit the endpoint radio architecture. If the gateway only forwards a tiny payload and needs no Linux services, a smaller MCU gateway may suffice. If field I/O already belongs to an existing PLC, a separate board may add unnecessary maintenance.

Record the decision in a short document:

1. **Job and failure consequence:** what the board owns and what must remain local.
2. **Requirements:** interfaces, timing, energy, memory, environment, security and service life.
3. **Exact candidate:** board SKU and revision, fitted modules, firmware/SDK and required accessories.
4. **Evidence:** manufacturer specifications, analysis, build results and measurements, each labeled separately.
5. **Unknowns and rejection criteria:** what would disqualify the candidate and what check resolves it.

Reject a candidate that fails a mandatory constraint before applying a preference score. Excellent documentation cannot compensate for an incompatible voltage range. Extra RAM cannot compensate for a missing required interface. Mark unknowns explicitly; an unknown is a reason to investigate, rather than an implicit pass or a fabricated failure.

A development board is a good place to learn whether an architecture is plausible. A deployment decision needs the identity and evidence of the implementation that will actually be installed.

## Common Pitfalls and Mitigations

| Pitfall | Consequence | Mitigation |
|---|---|---|
| Choosing by processor speed | A mandatory interface or memory constraint is missed | Apply the required electrical, storage and timing constraints first |
| Treating chip totals as application resources | The built firmware or retained history does not fit | Inspect the selected memory layout and runtime peaks |
| Treating supply input as pin tolerance | Incompatible signal levels reach the device interface | Trace connectors, protection, transceivers and MCU pin limits separately |
| Copying a chip sleep-current figure | Board loads and reconnection work defeat the energy budget | Compare complete activity cycles at the same supply boundary |
| Keeping only the latest BLE value | Intermediate observations are lost despite a working connection | Use an explicit queue, record identity and receipt policy when history matters |
| Treating reset as successful recovery | Configuration, queued records or outputs return incorrectly | Define startup state and verify the recovery path |
| Selecting by an “industrial” label | Installation or lifecycle requirements remain unresolved | Request channel-specific limits, support and system-level evidence |

## Summary

A board implements responsibilities around computation: input interfaces, power, timing, memory, communication and recovery. Choose it from the work that must run locally and the evidence needed when communication or power fails.

The room monitor's sensor result becomes a useful report only when firmware preserves its meaning, acquisition time and validity. The CC2640R2F walkthrough shows how application code, Bluetooth services and radio execution cooperate; the comparisons show when a different memory, interface or operating-system arrangement changes the choice. Review the complete installed design against its requirements before treating a development platform as a deployable product.

To return to the opening question: we program the policy, meaning when to sample, what a record means, what to retain and how to recover. The board and its SDK provide the execution environment, power management and physical interfaces. The requirement that makes one design preferable is the first mandatory constraint a candidate fails, whether that is a voltage range, memory for the retention promise, a local deadline or a field interface. Preference scores come only after that screen.

## What's Next?

[Chapter 4: Firmware, Clocks, and Timing](/iot-handbook/chapter-04-firmware-clocks-and-timing.html) looks inside the firmware this chapter placed on the board. You will follow the monitor from reset to normal operation, see how work reaches the processor, and decide which clock gives each timestamp its meaning. Carry the acquisition-time convention, the record's sequence number and the outage policy into that study; each becomes a timing or ownership contract there.

## Related Chapters

- [Chapter 1: What Is an IoT System?](/iot-handbook/chapter-01-what-is-an-iot-system.html) — Defines the device, gateway and local-control responsibilities that boards must implement, including freshness and failure contracts.
- [Chapter 2: Sensors and the Physical World](/iot-handbook/chapter-02-sensors-and-the-physical-world.html) — Explains the sensing response, conversion and uncertainty that firmware must preserve when it records and communicates an observation.

- [Chapter 4: Firmware, Clocks, and Timing](/iot-handbook/chapter-04-firmware-clocks-and-timing.html) — Develops firmware execution, acquisition timestamps and clock behavior through drift, sleep and reset.

## Frequently Asked Questions

**Q: Can we move an Arduino application to an ESP32 board without changing the design?**
Compare exact boards and requirements. Arduino is an ecosystem spanning different processors and product roles. The same language can sit on different electrical designs, so check voltage and pin limits, libraries, peripherals, energy and recovery for each board.

**Q: When does a Linux gateway justify its extra operating responsibilities?**
When the job benefits from services such as local storage, protocol adapters or a managed application environment. Include power, boot, updates and storage recovery in the decision. An endpoint with a small fixed workload may be better served by MCU firmware.

**Q: When should we design a custom PCB?**
When a concrete requirement justifies the design and lifecycle work. First identify what an existing board fails to provide. A module on a carrier can be a useful intermediate choice, but its final interfaces and power implementation still require engineering.

**Q: Why focus on an older named part such as CC2640R2F?**
It is a documented part with an established SDK, and it is small enough to see whole: one application core, one radio subsystem and a memory budget you can count. That makes the chip, board and software boundaries concrete. A new product selection should compare current candidates and support commitments against its own requirements.

**Q: Does faster firmware remove a slow sensor response?**
No. Firmware controls acquisition, processing and communication delays. The sensor and installation have their own response behavior; the decision deadline must account for both.

**Q: Does a BLE notification prove the gateway stored the observation?**
No. Stack submission, radio delivery and gateway storage are different stages. Lossless historical transfer needs a bounded retention policy and an application protocol that establishes which records the gateway retained.

## Glossary Terms Introduced

| Term | Meaning in this chapter |
|---|---|
| Firmware | Software that runs on the device itself, operates its hardware and implements its behavior. It is deployed as an image into the device's programmable memory. |
| Brownout | A supply-voltage drop below a relevant operating threshold. The design must define reset and output behavior while power is inadequate. |
| Map file | Linker output showing where code and data are placed and what memory is reserved. Runtime stack and heap demand still need evaluation. |
| Carrier board | The board that supplies product-specific connections and support for a computing module. The module does not complete the surrounding electrical design. |
| Transceiver | Circuitry that implements a physical signaling interface. A processor peripheral can support a protocol while the board still lacks the line interface. |
| GATT | The BLE model of services, characteristic values and access behavior. A characteristic holding the latest value is not a historical record queue. |
| CCCD | Per-client configuration that enables notifications or indications for a BLE characteristic. Updating a local value and sending an update are separate operations. |
| Connection interval | Time between scheduled BLE connection events. It affects radio activity and report latency independently of the sensor sampling interval. |
| Standby | A low-power mode that can retain selected state and resume after a wake event. Retention and wake sources depend on the device configuration. |
| Shutdown | A deeper power mode that loses normal RAM state on the device discussed here and wakes through reset. A volatile sample queue needs a separate survival policy. |
| Galvanic isolation | An electrical separation that prevents a direct conductive path between parts of a system. Verify the specific channels and supply domains rather than assuming whole-board isolation. |
| Interrupt | A hardware event that makes the processor pause its current code and run a handler. The handler must be short and must not block. |
| Deadline and jitter | The latest acceptable completion time of a response, and the variation in that timing. Clock frequency alone bounds neither. |
| Watchdog | A hardware timer that resets the chip unless software keeps restarting it. It proves only that the code doing the restarting still runs. |

## References and Further Reading

- [Source register](/iot-handbook/sources/chapter-03.md): document editions, access dates and scope for the manufacturer references used below.
- [RFC 7228](https://www.rfc-editor.org/info/rfc7228/): constrained-node classes, used to place a chip's memory in context.
- [CC2640R2F datasheet](https://www.ti.com/lit/ds/symlink/cc2640r2f.pdf) and [family technical reference manual](https://www.ti.com/lit/ug/swcu117i/swcu117i.pdf): the resources, subsystems and power modes discussed in the CC2640R2F walkthrough.
- [TI BLE5-Stack user guide: software architecture, GAP and GATT](https://software-dl.ti.com/simplelink/esd/simplelink_cc2640r2_sdk/5.30.01.11/exports/docs/ble5stack/ble_user_guide/html/ble-stack-5.x-guide/software_architecture.html): how application and stack share the chip.
- [Bluetooth Core Specification](https://www.bluetooth.com/specifications/specs/): connection events, intervals and the attribute protocol.
- [Raspberry Pi Compute Module documentation](https://www.raspberrypi.com/documentation/computers/compute-module.html): the module-and-carrier division in a gateway setting.
- Manufacturer documents cited beside each board in the board overview and architecture comparisons, for exact variants and revisions.

## Revision History

| Version | Date | Change |
|---|---|---|
| 1.5 | 2026-10-26 | Tightened repetition (calculation disclosures, firmware and edge/gateway background, board overview, architecture comparisons, caveats stated once); no content removed. |
| 1.4 | 2026-10-24 | Linked the hand-off to Chapter 4; corrected the Chapter 2 hand-off in the prerequisites and a garbled sentence; explained flash erase and program units, notification subscription after reconnection, and why replay needs a session identity as well as a sequence number; bridged the two energy models and added the supervision-timeout limit; added figure lead-ins, a summary that returns to the opening question, and glossary entries for firmware, interrupt, deadline and jitter, and watchdog. |
| 1.3 | 2026-10-19 | Aligned the structure and language with Chapters 1 and 2; retained the room-monitoring thread, made detailed calculations optional, removed the separate exercises, added pitfalls and FAQs, and reduced the glossary. |
| 1.2 | 2026-10-17 | Connected the chapter to the measurement path; added converter, record-byte, GATT and connection-event worked examples and reordered the figures. |
| 1.1 | 2026-10-17 | Added embedded-system and firmware foundations, the programming lifecycle, a CC2640R2F walkthrough and comparisons under shared requirements. |
| 1.0 | 2026-10-17 | Introduced the board overview. |
