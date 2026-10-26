# IOT-004 source register

Access/evidence cutoff: **2026-10-21**. All sources below were read for scoped claims. No SDK was installed, firmware compiled or board operated. Release numbers identify documentation, not a recommended production baseline.

| ID | Source / edition | Sections read and supported scope | Limits and status |
|---|---|---|---|
| S01 | [TI CC2640R2F datasheet](https://www.ti.com/lit/ds/symlink/cc2640r2f.pdf), SWRS204C, September 2020 | Features, architecture and §9.9 clock systems | Exact-part clock sources; no board clock accuracy inferred. Product catalog lists Rev. C; errata separately read |
| S02 | [TI BLE5 software architecture](https://software-dl.ti.com/simplelink/esd/simplelink_cc2640r2_sdk/5.30.01.11/exports/docs/ble5stack/ble_user_guide/html/ble-stack-5.x-guide/software_architecture.html), SDK 5.30.01.11, guide 1.01.15.00 | Single-device arrangement, TI-RTOS/ICall and task priority hierarchy | Main-CPU Cortex-M4F text conflicts with exact-part S01; Cortex-M3 in S01 governs. No supported-toolchain/build assertion |
| S03 | [TI application guide](https://software-dl.ti.com/simplelink/esd/simplelink_cc2640r2_sdk/5.30.00.03/exports/docs/ble5stack/ble_user_guide/html/ble-stack-5.x/the-application.html), SDK 5.30.00.03, guide 1.01.14.00 | Main initialization, ICall registered task requirement, callbacks and message-buffer ownership | Previous patch documentation used explicitly because equivalent 5.30.01.11 application page failed retrieval. Not a claim of byte-identical sample code across releases; no copied firmware |
| S04 | [TI GAP guide](https://software-dl.ti.com/simplelink/esd/simplelink_cc2640r2_sdk/5.30.01.11/exports/docs/ble5stack/ble_user_guide/html/ble-stack-5.x/gap-cc2640.html), guide 1.01.15.00 | Connection states and connection parameter handling | Requested parameters do not establish accepted conditions or latency bounds |
| S05 | [TI GATT guide](https://software-dl.ti.com/simplelink/esd/simplelink_cc2640r2_sdk/5.30.01.11/exports/docs/ble5stack/ble_user_guide/html/ble-stack-5.x/gatt.html), guide 1.01.15.00 | Characteristic configuration and notifications | Local submission is distinct from receiving application storage; no historical-transfer implementation claimed |
| S06 | [TI hardware configuration guide](https://www.ti.com/lit/pdf/swra640), SWRA640H, May 2024 | §12 board bring-up and troubleshooting; clock/supply configuration context | Family guide; exact-part applicability required. No schematics/pinouts are reproduced or prescribed |
| S07 | [TI CC2640R2F errata](https://www.ti.com/lit/pdf/swrz085), SWRZ085A, January 2020 | Revision identification, advisories 03 and 06 | F/G conditional clock switching/flash interaction and reset-source reporting caveat; not diagnosis or claim that chosen SDK lacks mitigation. Body revision date takes precedence over catalog display date |
| S08 | [Arm CMSIS startup](https://arm-software.github.io/CMSIS_5/5.8.0/Core/html/startup_c_pg.html), CMSIS 5.8.0 path, rendered Core 5.5.0 | Reset handler, initial stack, vector table and runtime-entry template | Generic Cortex-M startup model, not assertion that TI project uses that exact startup file |
| S09 | [Arm CMSIS-RTOS2 wait functions](https://arm-software.github.io/CMSIS_5/RTOS2/html/group__CMSIS__RTOS__Wait.html), rendered 2.1.3 | Delay and delay-until, tick units, ready versus scheduled state | Cross-runtime conceptual example only; no CMSIS API is presented as a TI API |
| S10 | [GCC volatile semantics](https://gcc.gnu.org/onlinedocs/gcc-8.1.0/gcc/Volatiles.html), GCC 8.1.0 | Volatile access versus ordering of unrelated memory | Narrow negative claim, no TI compiler instruction/barrier recommendation |
| S11 | [RFC 5905](https://www.rfc-editor.org/rfc/rfc5905.html), June 2010, §8; [RFC status](https://www.rfc-editor.org/info/rfc5905/) | Four timestamps and offset/round-trip equations; status/errata links | RFC has later updates and errata; no full NTP/security implementation, performance or current conformance claim. Original constructed exchange and asymmetric-path calculations illustrate the equations only |
| S12 | [ESP-IDF system time](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32/api-reference/system/system_time.html), v5.4.2 | SNTP immediate/smooth behavior, large-offset fallback | Implementation illustration on ESP32 only, not a TI feature or clock-setting recipe |
| S13 | [Go time package](https://pkg.go.dev/time), rendered go1.27.3 | Monotonic clocks, Since/Sub, loss of monotonic data on conversion/serialization | Supports reading of Go pacer. No claim that this documentation version is the repository's build toolchain |
| S14 | Current written chapters, local `chapter.md` files: IOT-001 v1.2, IOT-002 v1.4, IOT-003 v1.3 | System and freshness contracts; measurement/acquisition; firmware deployment, memory and BLE path | Actual local sources read, including constructed numerical requirements. Earlier review receipts are not reissued for these revisions |
| S15 | [Bluetooth Core Specification](https://www.bluetooth.com/specifications/specs/) | Connection events, sleep-clock accuracy classes and receive window widening, cited as general-specification statements | The document was not opened for the v1.1 revision and no clause numbers are cited; verify fields against the current edition. Used only for order-of-magnitude arithmetic (C25) |

## Local case study

Read-only snapshot: Streams Simulator, HEAD **2004dafb86bedb008ff9a9ae481a6a345f9c1891**, inspected 2026-10-21. This is dated source evidence, not a claim about the project’s current behavior. No simulator tests, builds or hardware runs were performed for this chapter.

| ID | Path relative to simulator repository | Evidence role |
|---|---|---|
| L01 | `docs/physical-devices/fan-experiment/PLAN.md`, §3.1 and D2 | Historical problem statement: unpaced slice progression and January world origin; owner pacing decision 2026-10-20. Describes earlier state, not proof of a current defect |
| L02 | `docs/physical-devices/fan-experiment/S-FINDINGS.md`, §1 | Historical investigation and proposed release mapping; earlier warning about wall-clock steps is superseded for the current pacer implementation |
| L03 | `internal/plantwire/internal/domain/pace.go` | Current pure origin/rate mapping and nonnegative wait calculation |
| L04 | `internal/plantwire/internal/uds/await.go`, WallPacer | Current `began` time.Time anchor; `wallNow` uses initial UnixNano plus `time.Since(began)`, rather than repeated current Unix wall readings |
| L05 | `internal/plantwire/internal/app/slices.go` | Current release before slice; Advance/data/NSYNC/barrier; HSYNC sequence predicate; three missed barriers imply host loss |
| L06 | `internal/plantwire/internal/uds/pace_test.go` | Existing source assertions inspected for intent only; not executed or counted as passing |

The chapter generalizes the lesson without requiring readers to install this project. Its 5 Whys chain is explicitly a constructed explanation, not a reproduction. Freshly read current implementation has stronger authority for present behavior than historical planning notes. The original authoring package retains the source identity hashes.

## Retrieval limits

Several TI threading/clock pages and Open Group clock pages failed retrieval. They are not accepted source records and no unsupported target-specific tick value, API or sleep-retention behavior is attributed to them. The passing mention of POSIX `CLOCK_MONOTONIC`/`CLOCK_REALTIME` is a familiarity bridge for readers, not a sourced claim. The crystal temperature coefficient (C24) is general electronics knowledge, hedged in the text, not taken from a source read for this chapter. The usable callback page is explicitly pinned to its older patch. Hardware ratings, purchasing, regulatory compliance, exact new-project SDK suitability and security-advisory coverage are outside scope.
