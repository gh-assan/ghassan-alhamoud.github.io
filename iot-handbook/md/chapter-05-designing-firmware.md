# Chapter 5: Designing Firmware — Architecture, State, and Reliability

**Version:** 1.1 | **Sources checked:** 2026-10-24

## If You Only Read One Section

Firmware architecture determines what the device keeps doing when a sensor stalls, a connection disappears, memory fills or power fails. Its quality is visible in the behavior of the whole device: which responsibilities continue, which guarantees no longer hold, and whether the device can recover without hiding the loss.

Begin with the service the device must provide. Assign each mutable resource an owner, make important state transitions explicit, and put limits on memory, waiting and recovery. Then carry those decisions through startup, overload, update and replacement. A working communication stack or a responsive main loop establishes only part of that argument.

For the room monitor in this chapter, a network outage must not stop local acquisition. Historical replay must not make current observations late. A reset must create a distinguishable new session. An update must preserve a usable recovery path. Each of these is an architectural obligation before it becomes an implementation detail.

The central question is: **What must remain true throughout the device's lifetime, and how does the firmware preserve it?**

## Prerequisites

[Chapter 3: Boards — From Prototypes to Industrial Systems](/iot-handbook/chapter-03-boards-from-prototype-to-industry.html) explains the hardware resources and deployment boundaries firmware must work within. [Chapter 4: Firmware, Clocks, and Timing](/iot-handbook/chapter-04-firmware-clocks-and-timing.html) distinguishes execution, elapsed deadlines and calendar time. Chapters [1](/iot-handbook/chapter-01-what-is-an-iot-system.html) and [2](/iot-handbook/chapter-02-sensors-and-the-physical-world.html) supply the system and measurement contracts behind the monitor.

The examples below are constructed design studies. They establish reasoning and decision rules, not measured behavior on a selected board. The chapter uses architecture diagrams, state models and timelines without code or dependence on a particular SDK.

### Learning Outcomes

After studying this chapter, you should be able to:

1. Derive firmware responsibilities and execution boundaries from service requirements.
2. Choose memory, ownership and concurrency strategies with explicit exhaustion behavior.
3. Explain how timing, power, overload and recovery affect service stability together.
4. Review persistence, updates, security and diagnostics across the device lifecycle.
5. Evaluate a framework or SDK against the architecture and identify the evidence still needed.

## Start With the Service Contract

### One outage, three defects

A constructed incident shows why the architecture, and not any single component, decides the outcome. At 03:12 the gateway restarts for an update and stays away for four minutes. The monitor keeps sampling, so 240 records wait for it. When the gateway returns, three things go wrong in turn. The dashboard shows 03:12 readings as current, because replayed records arrive looking new. Then the sensor is reported faulty, because a read stalled behind the replay on a shared bus. Finally the monitor resets, and the gateway, seeing sequence numbers start again from zero, merges two sessions into one history. None of these is a driver bug. The first breaks the meaning of acquisition time, the second the ownership of a shared resource under load, the third the identity of a session. The chapter takes each apart.

### A running monitor with explicit limits

Continue the room-monitoring service. Its application may call an observation current only while its acquisition age is within five seconds. Here we examine the endpoint design, with these additional constructed requirements:

| Responsibility | Contract for this design |
|---|---|
| Acquisition | One scheduled opportunity per second; record failed or missed opportunities separately from valid observations |
| Connected reporting | Target gateway application receipt within 250 ms of acquisition under a declared connected workload |
| Gateway outage | Retain every valid observation acquired during a five-minute outage from a recovered state, while endpoint power remains available |
| Recovery traffic | Restore historical records without starving current reporting or acquisition |
| Endpoint reset | Begin a new boot generation; expose loss of volatile history and rebuild time quality |
| Configuration | Activate a complete validated configuration, with a recoverable previous committed version |
| Update | Authenticate an eligible image and retain a defined way to recover from failed activation |

A **boot generation** is a value that changes on every reset, so that records from before and after a reset cannot be confused; "session" is its plain-language name, one boot generation being one stretch of uninterrupted operation. Chapter 3's first-sample-after-reset flag marks the same event; the boot generation refines that flag, as the recovery section explains.

The 250 ms target applies to the device-to-gateway path. It does not replace the system's five-second freshness limit or the physical sensor's response time. Nor does a five-minute gateway-outage guarantee imply five minutes of history survives loss of endpoint power. Those are different storage requirements.

This distinction prevents a common design failure: claiming more service than the chosen state can preserve. If the operator requires history through battery replacement, volatile buffering is insufficient. We would need a persistent journal (an append-only log written to nonvolatile storage in sequence, so that no region is rewritten until the log wraps) or another acquisition source, with its own cost, wear and consistency analysis.

### State requirements as invariants

An **invariant** is a condition the design must preserve across all permitted transitions. For this monitor, a retained record keeps its acquisition identity and time until the gateway has acknowledged storage. A late sensor completion cannot become a new observation. An unavailable clock mapping cannot produce an apparently valid calendar timestamp. A network fault cannot make acquisition wait indefinitely.

These statements help assess architecture because they cross component boundaries. A driver can return correct bytes while the application gives them the wrong operation identity. A queue can preserve all 300 entries of an outage while delivering the oldest long after the five-second freshness limit has passed. Review the whole path from sensor result to gateway receipt: an invariant fails at a seam, and every component can pass its own test.

## Boundaries Should Follow Ownership and Change

### Separate policy from hardware mechanisms

A driver knows how to operate a peripheral and report its result. An acquisition service knows when a result is needed and how to handle timeout or invalid data. Application policy decides whether the observation is useful, how long it should be retained and when degraded service is acceptable.

Keep those responsibilities distinguishable even if they execute in one task. A sensor-driver replacement should not require changing historical replay policy. A radio-stack update should not alter the meaning of acquisition time. Conversely, a layer that only forwards every call can add navigation and indirection without containing any real decision.

A useful boundary has a contract: accepted inputs, ownership transfer, possible outcomes, maximum retained resources and permitted calling contexts. “Read temperature” is incomplete if the result might be a cached register, completion might arrive after cancellation, or the call might block while holding a shared resource. Consider a read wrapper that makes up to three attempts inside the driver while holding the bus lock. If each attempt takes a constructed 12 ms, it has quietly turned a 12 ms read into a stall of up to 36 ms for every other user of that bus, and nothing in its signature says so.

<figure class="iot-diagram">
<picture data-compact-below="760">
  <source media="(max-width: 759px)" srcset="/images/iot-handbook/IOT-005/fig-1-ownership-compact.svg">
  <img src="/images/iot-handbook/IOT-005/fig-1-ownership.svg" alt="Firmware responsibilities: acquisition owns sensor operations; record storage owns immutable observations; communication borrows records and releases them only after application receipt. Lifecycle policy supervises these owners and diagnostics observe bounded evidence." style="width:100%;height:auto">
</picture>
<figcaption>Figure 1. Logical ownership boundaries. Read the boxes from top to bottom for the data path; lifecycle policy and diagnostics supervise all of them. They do not require one thread per box; a smaller implementation can preserve them in a single event loop.</figcaption>
</figure>

### Give resources a clear owner

The owners follow from the contract rows. Each row forces a mechanism, and the mechanism needs exactly one place that is responsible for it:

| Contract row | What it forces | Owner that follows |
|---|---|---|
| One scheduled opportunity per second; failed and missed opportunities counted | A clock-driven release and a recorded outcome for every opportunity | Acquisition owner with a monotonic release schedule and an outcome counter |
| Retain 300 observations through an outage | Bounded storage, released only on application receipt | Record store with fixed slots; communication borrows a record and the store reclaims it on receipt |
| Recover without starving current reporting | Two classes of traffic sharing one service rate | Communication owner with a live and historical split |
| New boot generation on reset | An identity that survives the loss of RAM | A boot-generation source, chosen in the worked example |
| Complete validated configuration with a recoverable previous version | Two generations and a commit point | Configuration authority |
| Authenticated image and a recovery path | Image slots and health confirmation | Lifecycle owner |

For this design (Figure 1), one acquisition owner serializes sensor operations. A bounded record store owns retained observations. Communication obtains access to records for transfer but does not overwrite or reclaim them simply because its stack accepted a send request. Configuration has a single activation authority; consumers see an immutable active version.

Single ownership reduces the number of interactions that require locking. It also creates a service boundary that can be supervised and tested. It does not eliminate bottlenecks: an owner with an unbounded request queue merely centralizes overload. Every request path still needs capacity, cancellation and fairness rules.

State the lifetime of each handoff. With small observations, copying into a fixed slot often makes ownership easier to understand. Passing a reference avoids copying, but requires an explicit rule for how long the producer must leave the memory untouched. That rule must hold during retransmission, disconnection and cancellation, not just the normal path.

## Choose an Execution Model From the Workload

### An event loop is a serious architectural option

A cooperative event loop processes ready work in bounded steps. It is attractive when peripheral operations can complete asynchronously and no step blocks the others for too long. The critical question is the longest delay a newly ready acquisition event can experience while other work runs.

For the monitor, a cooperative acquisition state machine can coexist with a communication owner if sensor waiting does not occupy the loop. Starting a conversion and later processing completion is different from waiting inside a conversion call. A library that hides a long synchronous wait can invalidate an otherwise simple design.

A real-time operating system supplies scheduling and coordination mechanisms that can help when independent work must wait or run at different priorities. It also introduces task stacks, scheduling interactions and shared-resource contention. More tasks create more execution contexts to budget and supervise. Add a task only when you can name the scheduling or isolation need it serves.

| Workload condition | Architectural implication |
|---|---|
| Short bounded handlers and asynchronous drivers | A cooperative loop may offer the simplest complete model |
| Supported vendor stack requires tasks or particular contexts | Preserve those constraints and arrange application work around them |
| Independent blocking operations with different urgency | Tasks can help, provided waits, resources and priorities are bounded |
| Strict local deadline | Analyze the complete response path under either model |
| Application grows into many unrelated contexts | Revisit ownership and interfaces before adding more synchronization |

### Priorities express urgency, not importance

A task can be important to the product without needing the highest runtime priority. Background history transfer matters, but it must not delay acquisition or a current report. Conversely, a small interrupt handler can be urgent while doing very little work.

Priority inversion occurs when urgent work waits for a resource held by less urgent work. A short wait is bounded and merely costly. The dangerous case is unbounded: medium-priority work that does not need the resource preempts the holder, so the holder cannot run to release it, and the urgent task waits as long as the medium work keeps running. Priority inheritance temporarily raises the holder to the waiter's priority, which removes the middle actor's advantage. Runtimes provide it for particular mutex-type locks under their own rules; it does not bound a resource that is held indefinitely, for example across external I/O. The [Zephyr mutex documentation](https://docs.zephyrproject.org/latest/kernel/services/synchronization/mutexes.html) describes one concrete implementation and its constraints. Prefer short critical regions and avoid holding them across external I/O. Where practical, use one peripheral owner and bounded requests instead of distributing direct access.

Shared-resource waits can also form a cycle: acquisition holds one resource while waiting for communication, which holds another while waiting for acquisition. Neither owner can make progress. Use a consistent acquisition order where shared locks are necessary, or remove the cycle through ownership and messages. A timeout must still unwind the operation and release its resources correctly. Repeatedly retrying that same cycle can replace deadlock with activity that produces no useful progress.

An interrupt or callback also has a context contract. A callback may execute in a driver, timer, stack or application context. Its name alone establishes neither its urgency nor which operations are legal. Preserve the selected runtime's constraints, and hand off substantial work through a bounded mechanism.

For our endpoint, the provisional choice is one acquisition owner and one communication owner, implemented within the selected radio runtime. Their exact task arrangement follows the supported stack. We do not introduce a separate thread for every diagnostic, configuration or storage function. A larger workload may justify a different arrangement; the boundary contracts should survive that change.

## Design Memory as a Finite Service

### Choose allocation by lifetime and failure consequence

Static allocation reserves storage before normal operation. It simplifies capacity reasoning but can waste memory on rarely overlapping states. It also cannot prevent out-of-bounds access, stack overflow or incorrect ownership. “No heap” is not a memory-safety argument.

A fixed-block pool reserves a known number of equal-size objects and allocates them as work arrives. It bounds how many objects can exist and avoids variable-size external fragmentation within that pool. It can still exhaust or suffer permanent capacity loss when blocks are not returned. Unused space inside an oversized block is internal fragmentation; it differs from free regions being separated outside allocations. Zephyr's [memory slab documentation](https://docs.zephyrproject.org/latest/kernel/memory_management/slabs.html) describes a slab, its name for such a pool of equal-size blocks, and serves as a concrete example of this mechanism.

A general heap accommodates variable sizes and lifetimes. Its suitability depends on allocation timing, implementation, contention and workload. Fragmentation can leave ample total free memory without a sufficiently large eligible contiguous block. Coalescing adjacent free blocks helps but does not remove every fragmentation pattern. FreeRTOS's [versioned heap implementation](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/MemMang/heap_4.c) illustrates coalescing as a particular policy.

A small constructed case shows both kinds of waste. Take a 12 KiB heap holding twelve 1 KiB blocks, and free every other one. Six KiB are free, yet no 2 KiB request can succeed, because the free blocks are separated by allocated ones that coalescing cannot merge: that is external fragmentation. A pool of 1 KiB blocks cannot suffer it, but storing a 100-byte record in one 1 KiB block wastes the remaining 924 bytes: that is internal fragmentation. The pool trades one kind of waste for the other, which is acceptable when, as here, the objects are all about the same size.

For the monitor, reserve observation slots and critical working storage before entering normal service. Optional management work can use separately bounded resources if its failure does not prevent acquisition or diagnosis. This is a choice for a small, stable workload; variable-size image processing might justify a different allocation design.

### Budget simultaneous demand, not isolated features

The worst memory state may occur during reconnection: a full observation queue, radio buffers, authentication work, diagnostic records and update negotiation can coexist. Measuring idle free memory misses that overlap. In the monitor below, the worst moment is a reconnection with all 360 observation slots occupied, just when the radio stack needs its largest buffers. A release must be evaluated with the features and failure states that can actually occur together.

Account for application state, protocol buffers, task stacks, driver storage, allocator overhead and the recovery reserve described later. A stack high-water measurement shows what a tested workload used; unvisited error paths and deeper call patterns remain relevant. Tie the margin to plausible demand and its uncertainty; an unexplained universal percentage hides both.

Memory also has capabilities, meaning properties of a region beyond its size. A peripheral that moves data by direct memory access may be able to reach only some regions or require aligned buffers; retained storage may behave differently during sleep. ESP-IDF's [memory allocation guide](https://docs.espressif.com/projects/esp-idf/en/v6.1/esp32/api-reference/system/mem_alloc.html) documents why a platform can have several eligible memory regions. A large total-memory figure cannot establish that a particular operation can allocate what it needs.

### Make the observation budget complete

Chapter 3 used a 16-byte wire record. This design reserves **32 bytes per internal observation slot**. A constructed itemization shows where the bytes go: the 16-byte record as it travels (sequence, acquisition time, temperature, status flags, correction version, sensor identity and checksum), 4 bytes of boot generation, 4 bytes of local monotonic time and 8 bytes of bookkeeping such as ownership state, a receipt flag and a retry count. The sum is 16 + 4 + 4 + 8 = 32. This is a fixed-slot representation to verify against a real implementation, not a claim that doubling a payload always covers an implementation's metadata.

At one valid observation per second, a five-minute outage creates **300 records**. Reserve **360 slots**: 360 × 32 = **11,520 bytes** within a **12 KiB arena**, which is one block of memory set aside for this single purpose and divided into equal slots. Since 12 KiB is 12,288 bytes, **768 bytes** remain outside the slots. Driver, task, stack and other runtime memory sit outside this arena and require their own budget. Chapter 3 counted only the payload for the same outage, 300 × 16 = 4,800 bytes; the internal slot and the spare slots raise the requirement to 11,520.

The 60 spare slots are not a burst allowance for a vague transient. They cover the time between the last receipt and the point where draining resumes. Count the five minutes from the last record the gateway acknowledged, because that is when the store stops draining, and not from the moment the endpoint notices the link is gone. The endpoint notices only when the link's supervision timeout expires, which the Bluetooth Core Specification allows to be as long as 32 s, and after the gateway returns, reconnection and the first receipts take further time. Records that were sent but not yet acknowledged when the link failed also stay in their slots. At one record per second, 60 slots are 60 s of margin for all of these. The margin does not extend every guarantee indefinitely.

Now check whether this fits the part Chapters 3 and 4 followed. The CC2640R2F has at most 28 KB of system SRAM, which the Bluetooth stack, drivers and application share. Chapter 3's constructed 20 KiB teaching budget put 17 KiB into the stack, runtime, application state and margin, and 17 KiB plus 11,520 bytes is 28,928 bytes. That exceeds 28 KB however the figure is read (28,000 or 28,672 bytes), before any margin. Chapter 3's remaining 3 KiB would hold 3,072 / 32 = 96 slots, a 96-second promise. Those budget figures were a teaching assumption, not the part's memory map, but the conflict is real: this is the conclusion the budget exists to surface. Four options follow, each with a cost:

- A smaller slot: keep only the 16-byte record in each slot and store the boot generation and time association once per session. That gives 3,072 / 16 = 192 slots, still short of 300, and every lookup now depends on a separate session table.
- A shorter retention promise: negotiate fewer minutes of outage with the operator, and say so in the contract.
- External storage: this adds a device, wear and consistency analysis, the persistent-journal cost described earlier.
- A larger-RAM device, such as the nRF52840 that Chapter 3 compared, which has 256 KB of RAM.

The worked design keeps the 360-slot arena as the contract that whichever option is chosen must satisfy. No particular chip is declared to fit the whole application.

The five-minute retention promise begins from a recovered state with at least 300 free slots. Each record still waiting at the start of an outage removes one second of retention, because retention equals the free slots at one record per second. A recovered store that has drained completely has 360 free slots, the full promise plus its margin. A concrete case: after a full 300-record outage, draining at two historical records per second reduces the backlog to 60 after (300 − 60) / 2 = 120 s, which restores the 300 free slots, and to zero after 150 s. If the gateway disappears again after only 60 s of connected recovery, the backlog is 300 − 2 × 60 = 180 records, 180 slots are free, and the store keeps 180 s of observations, a shorter promise than the contract's 300 s. Expose that remaining capacity instead of promising another complete five minutes. A stronger repeated-outage guarantee needs a different arrival and service analysis.

The choice deliberately exposes a trade-off: retaining every observation costs memory. If the complete build cannot afford it, add appropriate storage, choose a different device, or negotiate a different service contract. Quietly replacing history with the newest value would violate the declared contract.

## Stability Includes Overload and Long Operation

### Separate capacity from useful service

A queue protects memory only if it has a limit. It protects service only if the work can be processed in time. A queue that never overflows can still deliver observations too old for the operator's decision.

Follow one record through the store. When it is acquired, it takes a free slot and stays there, which is how it survives an outage. The endpoint sends it live as a current report while the slot remains occupied. When the gateway's application receipt arrives, the slot is released. A record whose live attempt has passed without a receipt is, from then on, **historical**: still valid and still waiting, but no longer current, and sent at lower priority. While the gateway is reachable, this cycle takes a fraction of a second and occupancy stays near zero. During an outage no receipts arrive, so occupancy rises by one slot per second: 300 after five minutes and 360 after six. The store can therefore fill only if an outage lasts more than 360 s from the last receipt, or if an earlier backlog has not yet drained.

Use distinct treatment for current state and historical transfer. For our monitor, the current report refers to its retained slot while that slot exists. One separately reserved working record permits a new current report even when history storage is exhausted; it is accounted for outside the record arena. There is no unbounded second queue. Current reporting receives transmission priority; older records retain their identities and acquisition times. Historical arrival does not make a record current.

After a 300-record outage, assume the verified effective application path can store **three records per second** at the gateway under the recovery workload. Allocate one opportunity per second to the arriving live record and two to historical records. The backlog drains in **150 seconds** (300 / 2), with no increase above its initial 300 records in this idealized steady case; Figure 2 plots the drain. If total effective service falls to one record per second, no surplus remains and the backlog never drains. More RAM postpones the next overflow but does not repair that rate mismatch. The same arithmetic is the general rule for any queue: it is stable only when its service rate exceeds its arrival rate.

What sets the effective rate is the acknowledgement path. If the gateway confirms each record before the next is sent, throughput is bounded by roughly one record per one to two connection intervals; the exact count depends on the stack and the operation used, and must be verified. Chapter 4 allocated 100 ms of the 250 ms budget to waiting for communication capacity, so this monitor's connection interval is set by its latency requirement, at about 100 ms or less. That puts a per-record ceiling near 5 to 10 records per second, and the assumed 3 per second leaves room for retries and gateway processing. The one-second interval behind Chapter 3's tenfold energy saving is not available to this monitor: with per-record confirmation it would give about one record per second or less, the no-surplus case above. Batching several records into each exchange and acknowledging cumulatively, meaning "received through sequence N", removes the ceiling, at the cost of a larger unacknowledged window that must still fit in the slots.

<figure class="iot-diagram">
<picture data-compact-below="760">
  <source media="(max-width: 759px)" srcset="/images/iot-handbook/IOT-005/fig-3-recovery-compact.svg">
  <img src="/images/iot-handbook/IOT-005/fig-3-recovery.svg" alt="Constructed outage recovery: five minutes creates 300 retained records; reconnect serves one live and two historical records per second; backlog falls to 150 after 75 seconds and zero after 150 seconds. Application receipts release slots; failed or missing receipts retain records." style="width:100%;height:auto">
</picture>
<figcaption>Figure 2. A capacity model using assumed effective application throughput. Radio bitrate alone cannot establish the three-record service rate; retries, acknowledgements and competing work must be included.</figcaption>
</figure>

### Define what happens outside the guarantee

At 360 occupied slots, the 361st unacknowledged observation finds no free slot. This design declines to retain it, increments a volatile loss counter and latches history incomplete for the current boot. The observation still sits in the working record, so it can be reported live; if the gateway acknowledges that report, nothing is lost. If the receipt never arrives before the next acquisition reuses the working record, the observation is gone and counted as history loss. Acquisition and current reporting continue without waiting for the gateway. After reset, the new boot generation exposes a discontinuity even if the exact pre-reset loss count is unavailable. The design has now entered degraded service; it must not claim the original lossless guarantee.

Keeping old history is the policy here because the operator needs continuity from the beginning of the outage. Another application may prefer the newest window and explicitly evict the oldest record. Neither is universally correct. State which information is sacrificed and expose that loss where users interpret the data.

Reserve diagnostic capacity separately so a full observation store cannot suppress its own overflow evidence. That capacity, kept deliberately free for diagnosis and recovery, is the **recovery reserve**. Aggregate repetitive failures into counts; one retained log entry per failed retry would fill the very space that diagnosis needs. Bound retry effort by time and energy, and include a quiet retry period when the peer remains absent.

### Look for degradation that accumulates

Long-running defects often conserve apparent progress while consuming a finite resource. A reconnect path may fail to release a buffer. A failed update may leave reserved space occupied. Repeated errors can flood diagnostic storage. A counter can wrap after months while the main loop continues running.

Review each resource as a cycle: acquisition, transfer, release and reacquisition. The number of occupied objects should return to its expected baseline when a cycle finishes. In the 360-slot design below, a store that still shows 360 occupied slots long after a reconnection has finished is leaking slots; the baseline after every complete drain is zero. Investigate trends in free eligible memory, largest allocation opportunity, queue age, stack usage and restart frequency. A flat metric under an idle workload does not establish stability under recurrent failures.

## Model Service State Without a Single Healthy Flag

### Acquisition, communication and time quality are separate

A device can acquire valid observations while disconnected. It can communicate while its sensor is unavailable. It can preserve correct local acquisition order while calendar time remains unknown. Collapsing these into one healthy/unhealthy flag hides the recovery action that is actually needed.

Keep a small set of independent state dimensions, with rules governing their combinations. Acquisition may be ready, active or faulted. Communication may be absent, connected or draining history. Lifecycle may be initializing, serving, degraded, updating (including the trial after an update) or recovering. Time quality has its own mapping validity. This avoids enumerating every possible combination as another giant state machine while retaining explicit consistency rules. Figure 3 shows the lifecycle transitions; the other dimensions change independently of them, so a link that disappears alters communication state without forcing a lifecycle restart.

<figure class="iot-diagram">
<picture data-compact-below="760">
  <source media="(max-width: 759px)" srcset="/images/iot-handbook/IOT-005/fig-2-lifecycle-compact.svg">
  <img src="/images/iot-handbook/IOT-005/fig-2-lifecycle.svg" alt="Lifecycle transitions: initialization reaches serving after prerequisites hold; a recoverable subsystem fault leads to degraded service and then serving after validation; failed image validation selects recovery. Link absence changes communication state without forcing lifecycle restart." style="width:100%;height:auto">
</picture>
<figcaption>Figure 3. Lifecycle and subsystem health have separate transitions. Recovery requires evidence that service is restored, not a completed reset.</figcaption>
</figure>

### A timeout ends waiting, not necessarily the operation

Chapter 4 showed why a late completion must not be mistaken for a later request. At the architecture level the same fact becomes a resource-lifetime rule. A software engineer knows the pattern from a deadline on a request context: the caller stops waiting, but the callee keeps running unless it checks. Here the callee is hardware that may still write into the result storage, and an identity on each operation plays the role of an idempotency key, letting the owner recognize an arrival that belongs to an earlier attempt. The analogy has a limit: a software callee that ignores its deadline wastes effort, whereas a peripheral that finishes late can corrupt memory that has been reused.

**Operation fencing** is the combination of both halves. The timeout path invalidates the operation's identity, so a late result is rejected, and then waits for **quiescence**, the state in which the driver can no longer touch the result storage under its documented contract. Only then may the storage be reused or the next operation begin. Rejecting an obsolete event does not by itself stop hardware from writing into a reused buffer.

| Constructed event | Decision and resulting state |
|---|---|
| Acquisition A begins | Acquisition owner reserves its result storage and operation identity |
| A exceeds its allowance | Mark the scheduled observation missing; invalidate A and start bounded driver recovery |
| A's late completion arrives | Reject its result; do not change the current observation or its timestamp |
| Driver confirms a reusable state | Release A's resources according to the driver contract |
| Acquisition B begins | Allocate a new identity; accept only a matching completion |
| Recovery cannot finish | Keep acquisition unavailable and expose the fault while other bounded services continue |

The important boundary is resource lifetime, not the particular event mechanism. A correct cancellation design must consider both software completion messages and the peripheral's remaining access to memory.

## Keep Time and Power in the Architecture

Chapter 4 established why local elapsed deadlines and calendar timestamps have different contracts. Here those distinctions constrain interfaces. Each acquisition carries its local time and boot generation; an optional calendar mapping supplies a versioned interpretation. When no mapping is available, the record says so and carries no default date.

The connected 250 ms target needs a budget for acquisition-result availability, scheduling, communication capacity, transmission and gateway handling. Historical transfer is background work in that budget. A deadline allocation becomes credible only when its individual bounds hold together under the same workload.

Power management is another participant in the state model. Sleep can stop a counter, remove a peripheral's configuration or lose memory. Before entering a mode, each owner must agree which of its pending operations must finish and which of its state survives. Chapter 4 works through the clock and wake-budget consequences; the architectural addition is that the wake allowance belongs to the owners jointly, so no single owner can sleep on its own schedule.

Startup also has a physical interval before ordinary application code runs. For products with outputs, acceptable pin and output behavior must be established by the hardware and reset arrangement as well as later initialization. This monitor has no control output; extending it to control equipment would require a new consequence analysis and an appropriately justified output policy.

## Recover the Service, Not Just the Processor

Chapter 4 explained why a watchdog fed by an unrelated periodic interrupt hides a permanently blocked acquisition. The architectural addition concerns several owners: the watchdog is satisfied only when every critical owner has shown progress, and an operation that is legitimately long, such as a flash erase or a reconnection, must announce its allowance so that it is not mistaken for a stall. Zephyr's [task watchdog documentation](https://docs.zephyrproject.org/latest/services/task_wdt/index.html) illustrates supervision of multiple contexts with a hardware fallback; that mechanism still needs application-specific health criteria.

For the monitor, a missing gateway is a communication state and must not cause a reboot loop. A sensor bus fault may justify bounded driver reinitialization. A corrupted application state may require restart. Choose the smallest recovery action that can restore a known state, then verify its result. Escalate only when the evidence supports escalation.

On reset, issue a new boot generation, mark calendar quality unknown until justified and initialize observation validity. Buffered RAM history is lost under this contract. The gateway detects the session change and records a discontinuity; it cannot assume continuity from a reset sequence number. Chapter 3's record marks the first sample after a reset with a flag. The boot generation refines that mark: a flag is lost with the sample that carried it, whereas the generation travels with every record, so the discontinuity remains visible even if the first sample never arrives.

Successful recovery means the service again meets its declared conditions. A completed boot, a driver reopening or a radio reconnect are intermediate observations. Confirm a valid acquisition, coherent identity/time, and the required reporting behavior before declaring the relevant service restored. Repeated unsuccessful recovery ends in a bounded maintenance state that keeps useful diagnostics available.

## Persistence and Updates Share a Consistency Problem

### Configuration must have a recoverable commit point

A calibration value, its units and its correction version belong together. If power fails after only one field changes, a checksum over some bytes cannot make the mixed meaning correct. Store and activate configuration as a validated versioned unit.

One conceptual approach retains two configuration generations. Write the candidate to inactive space, validate its complete contents and eligibility, then perform the **commit point**: the one transition after which the boot-time recovery rule treats the new generation as active. On interruption, choose the last valid committed generation; if none exists, enter a defined unconfigured state. The pattern is the one used to replace a file safely: write a temporary file completely, then rename it over the original, so a reader sees either the old file or the new one. The analogy has a limit. Flash offers no atomic rename, so the commit marker must itself be a unit that is either completely written or detectably invalid. The actual storage primitive must support that rule; two copies alone do not establish atomic activation.

A constructed example shows what the rule buys. Slot A holds version 7, valid and committed. We write version 8 into slot B and finish with a commit marker protected by a checksum. At boot the rule is to select the valid committed slot with the highest version.

| Interruption or fault | What the next boot finds | Active configuration |
|---|---|---|
| Power fails while B's body is being written | B fails its checksum | A, version 7 |
| Power fails after B's body, before the marker | B has no marker, so it is not committed | A, version 7 |
| Power fails during the marker write | The marker fails its checksum and counts as absent | A, version 7 |
| Power fails after the marker is complete | B is valid, committed and highest | B, version 8 |
| A and B are both invalid | Nothing valid to select | A defined unconfigured state |

Flash usually erases a region larger than its minimum programmable unit. Those granularities, endurance limits and interrupted-operation behavior belong to the exact device. A journal can spread writes and preserve recovery information, but consumes capacity and requires reclaim rules. Count configuration changes, fault counters and diagnostics as well as observations when assessing wear. Do not persist every fast-changing metric merely because flash is available: persisting one value every second means one erase of the same sector per second, 86,400 per day, and against an assumed endurance of 100,000 erase cycles (a constructed figure; read the real one from the device documentation) that sector lasts 100,000 / 86,400, about 1.2 days. Spreading the writes over more sectors extends the life in proportion, and not persisting the metric extends it indefinitely.

Programming and erasing can also stall the processor for tens of milliseconds on some devices, depending on the part and how the code is arranged. A commit made in the live path therefore counts against the 250 ms response budget and the connection timing. Schedule commits outside the acquisition and connection deadlines, bound their duration, and take the exact erase and program times from the documentation of the selected device.

### An update must preserve a way back to useful service

An image may be authentic but incompatible with a hardware revision, persistent schema or gateway protocol. Eligibility therefore includes identity and integrity checks plus compatibility policy. Running a new image under confirmation, a **trial activation**, should end in acceptance only on meaningful local health evidence. The trial is the blue-green pattern familiar from web services: run the new version, check its health, return to the old one on failure. The limits are that the device is a single machine with no load balancer to absorb mistakes, and that the old version must still be able to read whatever the new one wrote. If gateway availability is not required for normal boot, requiring a cloud response before accepting an image can create avoidable rollback loops.

Preserving an old executable is insufficient if the new image irreversibly migrates shared data. Plan migration and recovery together: preserve compatible data, delay irreversible changes, or provide a separately validated recovery route. Include bootloader, image slots, metadata and configuration in the storage budget before selecting the MCU.

ESP-IDF's [versioned OTA guide](https://docs.espressif.com/projects/esp-idf/en/v6.1/esp32/api-reference/system/ota.html) illustrates distinct image states and optional rollback. Its protected application-update arrangement does not imply arbitrary bootloader, partition or data changes have the same interruption behavior. Treat update safety as a property of the complete selected mechanism, not the word OTA.

Rollback for availability and prevention of rollback to vulnerable releases can conflict. Define which recovery images remain eligible and when security-version changes become irreversible. NIST's [firmware resiliency guidance](https://csrc.nist.gov/pubs/sp/800/193/final) separates protection, detection and recovery; an architecture needs all relevant responsibilities even when one SDK supplies several mechanisms.

## Design for Operation, Manufacture and Change

### Security authority must survive lifecycle transitions

Identify who may change configuration, supply time, install firmware, access debug facilities and read diagnostics. Link protection does not by itself authorize a particular operation. A signed update is useful only when the verification authority and its update policy remain protected.

Manufacturing provisions device identity and any required credentials. Servicing may replace hardware, restore configuration or transfer ownership. Retirement must address retained secrets and data. Keep room identity distinct from device identity so replacing a monitor does not merge two devices' boot histories or calibration records.

Debug access is especially context-dependent. Leaving unrestricted production debug access may bypass other controls; permanently disabling every recovery route can increase servicing risk. Choose an access and recovery policy consistent with the threat model and the hardware's actual capabilities. Record irreversible provisioning decisions before production.

### Diagnostics must work when resources are scarce

Retain enough evidence to distinguish failure causes: image/build identity, hardware revision, boot generation, reset diagnostics with known limitations, acquisition misses, queue occupancy and oldest age, loss counters and recovery attempts. Record units and time domains. Avoid logging secrets or turning diagnostics into an unbounded storage consumer.

A useful diagnostic tells an operator what service is affected and what action is possible. “Sensor unavailable after bounded recovery” is more actionable than a generic healthy flag or a raw error code alone. Rate-limit repetitive events, retain first/last occurrence and counts where appropriate, and reserve space for the transition that explains the failure.

Instrumentation can alter timing and energy. A diagnostic build with synchronous logging may behave differently from the deployed image. Validate relevant behavior on the release configuration and preserve enough nonintrusive field evidence to investigate it. Reproduction requires the exact image, configuration and dependency identity, not just a release nickname.

### Portability should protect valuable decisions

Separate the observation contract and application policy from board pin mappings and driver details. This makes hardware substitution more manageable. It does not promise identical behavior across processors: cancellation semantics, memory capabilities, scheduling and power retention may differ.

Support each hardware revision explicitly; a mismatched image must not proceed with plausible pin definitions. Pin compiler, SDK, component versions and build configuration for a release; assess vendor errata and dependencies under their actual conditions. Preserve the build inputs and verification evidence needed to recreate and support it.

Manufacturing and field service also need acceptance criteria. Can the test detect a disconnected sensor, wrong calibration identity, failed persistence or unusable communication path? A device booting at the end of the line does not establish that its service works. Use a known external stimulus or reference where the physical claim requires it; firmware self-report alone cannot establish the physical condition.

## Worked Example: Review the Monitor's Firmware Architecture

The provisional architecture is now specific: the selected radio runtime hosts acquisition and communication owners; bounded record storage holds 360 immutable slots; current traffic has priority; historical storage is released only after gateway application receipt. Allocation for critical paths is reserved before serving begins. Volatile history covers gateway outages with power maintained.

| Phase | What the architecture establishes | What it must not claim |
|---|---|---|
| Startup | Configuration validated; new boot generation; drivers and owners initialized | A current observation before successful acquisition |
| First valid observation | Value, validity, acquisition time, session and configuration association stay together | Valid calendar time when the mapping is unavailable |
| Gateway absent for 300 s | Up to 300 valid observations occupy 300 of 360 slots under the sampling assumptions | Durability through endpoint power loss |
| Reconnected under verified recovery capacity | One live and two historical records per second; historical backlog drains in 150 s | Freshness merely because a historical record just arrived |
| Gateway stores a record but its receipt is lost | Endpoint retains and resends; gateway deduplicates by device, boot and sequence | That local stack acceptance allows record reclamation |
| Sensor operation times out | Missing acquisition recorded; obsolete completion fenced and driver quiesced | That a later register read reconstructs the missed past observation |
| Endpoint restarts | New session exposes discontinuity; volatile losses and time-quality reset are visible | Continuity of sequence or elapsed time across boots |
| Candidate image fails local activation checks | Defined eligible recovery image and compatible configuration can restore service | That authentication alone establishes application health |

The record identity uses device identity, boot generation and sequence, with a documented wrap policy. The field width decides how much policy is needed. A 32-bit sequence at one record per second wraps after 2^32 seconds, about 136 years, which in practice never happens. A 16-bit sequence wraps after 65,536 seconds, about 18.2 hours, and needs a defined rule for comparing numbers across the wrap. When delivery is in order and acknowledgements are cumulative, the gateway needs only one high-water mark per device and boot generation to discard duplicates, not a store of every identifier it has seen.

Boot generations must remain distinguishable across resets, and the way the endpoint produces them is itself a design decision with a cost on each path. A counter kept in flash costs an erase and a write on every boot. In a reset loop that spends wear exactly when the device is least healthy: with a constructed five-second loop and the assumed 100,000-cycle endurance, the counter's sector is exhausted after 100,000 × 5 s = 500,000 s, about 5.8 days. Two mitigations exist, each with a failure. Appending each increment as a new entry in an erased page lets one erase serve many increments, provided the flash permits repeated programming between erases. Deferring the increment until the device has run stably for a defined period bounds the wear, but boots that fail early then share a generation, which is acceptable only if they send nothing the gateway keeps. A counter in retained RAM costs no wear and survives some resets, but not a loss of power, so it needs a second source after power-up. A random 64-bit value costs no wear, and its collision probability is negligible (for 1,000 boots of one device, roughly 3 in 10^14); it depends entirely on an entropy source that is sound at early boot, because a source that returns the same bytes on every boot collides every time. Whichever is chosen, record which failure was accepted.

The wire protocol can associate stable session metadata separately, but the association must remain resolvable for retained records. The itemized 32-byte slot above carries the boot generation itself, so a retained record never depends on a table lost with the reset; that budget is a reservation to verify, not a universal binary layout.

This architecture favors explicit ownership and reserved memory because the workload is small and predictable. It would change if images, audio or variable-size workloads dominated; if history had to survive power loss; or if no recovery throughput above the live arrival rate were achievable. The decision is defensible because the contract, costs and reversal conditions are visible.

## Where Frameworks and SDKs Fit

An SDK supplies hardware-specific tools, drivers, libraries and examples. An RTOS supplies execution and coordination services. A framework establishes application conventions and abstractions. Real environments combine these roles, so they are not mutually exclusive products to rank in one list.

### Representative environments and their architectural role

| Environment | What it can supply | What the firmware architect still decides |
|---|---|---|
| TI SimpleLink SDK with TI-RTOS and BLE5-Stack, the environment of Chapters 3 and 4 | Drivers, an RTOS and the Bluetooth stack with its own task, callback and priority model | Which work runs in application context and which in stack context, what the application owns, and how update and recovery are arranged |
| Vendor SDK without an application RTOS | Startup, peripheral support and board/toolchain integration | Cooperative scheduling, ownership, bounded waits and service recovery |
| FreeRTOS-based environment | Kernel scheduling and synchronization, with a selected port and surrounding libraries | Task arrangement, memory policy, driver/stack integration and update architecture |
| Zephyr | Kernel plus configurable device, networking and management subsystems | Exact board/driver support, resource configuration, application policy and lifecycle acceptance |
| ESP-IDF | ESP-family development environment with platform services and update mechanisms | Supported target/release, partitions, confirmation criteria, data compatibility and resource budgets |
| STM32Cube | STM32-family packages and tools, including HAL/LL drivers and middleware | Supported combinations, generated/custom ownership, execution model and product lifecycle |
| Arduino ecosystem | Board packages, core abstractions and libraries supporting an accessible application workflow | Exact core/library behavior, blocking and memory costs, update and operational requirements |

These are representative routes, not popularity or quality rankings. Official references describe [FreeRTOS kernel allocation](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/MemMang/heap_4.c), [Zephyr subsystems](https://docs.zephyrproject.org/latest/introduction/index.html), [ESP-IDF platform memory](https://docs.espressif.com/projects/esp-idf/en/v6.1/esp32/api-reference/system/mem_alloc.html), [STM32CubeF4 package contents](https://github.com/STMicroelectronics/STM32CubeF4) and [Arduino platform definitions](https://docs.arduino.cc/arduino-cli/platform-specification/). Platform-specific documentation does not establish identical support across every board or release.

### Evaluate the exact dependency, not the ecosystem name

First check that the exact processor, board revision, peripherals and required protocol combination are supported together. Then inspect the mechanisms on the critical path: driver completion/cancellation, callback contexts, memory ownership, power transitions and update recovery. An abstraction that hides these contracts can become a source of uncertainty even when its example is easy to run.

For the monitor, choose the supported radio environment first, then confirm that it can preserve acquisition ownership, bounded storage, current-traffic priority and update recovery. A familiar API is useful; a missing required driver or unbounded critical operation outweighs that convenience. Keep a small integration boundary around vendor behavior where it protects an actual application contract.

Assess maintenance alongside functionality. Who maintains dependencies and security fixes? Can the release be rebuilt, debugged and tested? What licensing and distribution obligations apply to the selected components? What happens if the vendor deprecates the target or changes a callback contract? These questions belong to the exact release and support arrangement, not a general endorsement of the brand.

Framework evaluation ends with a narrow feasibility investigation and a decision record. It does not replace the architecture. A capable kernel cannot choose the correct overflow policy, and an OTA library cannot decide when the device has recovered useful service.

## Verify the Architecture Before Accepting It

Treat the service invariants as reviewable predictions. Under a five-minute outage, 300 acquired valid records must fit. With an effective total service of three records per second, live acquisition must continue while historical occupancy falls by two records per second. If a receipt is lost, retry must preserve identity and the gateway must avoid duplicate history. Each prediction names both the workload and the expected result.

Changing one number shows which assumption the design depends on. Suppose the operator asks for ten minutes of outage retention and sampling doubles to two records per second. The outage now creates 600 × 2 = 1,200 records. The same 60 s of margin adds 120 slots, giving 1,320 slots × 32 bytes = 42,240 bytes, about 41 KiB, or 3.4 times the 12 KiB arena. The arena does not survive this change, and the design moves to the options listed in the memory budget. Next, hold the effective total service at three records per second. Live traffic now takes two of the three, leaving one for history, so 1,200 backlog records drain in 1,200 s, twenty minutes. During that time the retention promise stays reduced, and a second ten-minute outage would find fewer free slots. If the service rises to four records per second, history gets two and the backlog drains in 600 s. The five-second freshness limit is unaffected in both cases because live records keep priority; what suffers is the time to restore the retention promise.

Use different evidence for different boundaries:

| Evidence | What it can establish | What remains outside it |
|---|---|---|
| State and capacity analysis | Internal consistency, explicit loss/recovery policy and resource needs under assumptions | Actual timing, memory layout and physical behavior |
| Host behavioral model | Ownership, replay, stale-completion and recovery rules across controlled event sequences | Selected SDK semantics and on-device scheduling |
| Target integration checks | Actual resource use, context rules, driver behavior and executable compatibility | Unexercised electrical, environmental and long-duration conditions |
| Physical fault and endurance tests | Named device behavior under documented faults, duration and conditions | Every future deployment or a safety qualification |
| Production and field evidence | Manufacturing consistency, observed failure rates and support behavior within the collected population | Faults absent from the observations or unrecorded operating conditions |

Test combinations that compete for resources: reconnection during a full queue, diagnostics during memory pressure, interrupted configuration activation and a reset during update confirmation. Long duration alone is insufficient if the workload never exercises those transitions. Repeated fast failure/recovery cycles can expose a leak sooner, while temperature, aging or long counter intervals may require different evidence.

The design review should end with decisions and unresolved acceptance conditions. For our monitor, the owners and storage policy are selected; actual runtime fit, the effective recovery rate of three records per second, cancellation semantics and update interruption behavior remain acceptance checks on the chosen implementation. That is a concrete design with honest limits.

## Common Pitfalls and Mitigations

| Pitfall | Consequence | Mitigation |
|---|---|---|
| One task for every module | Stack growth and synchronization obscure the service path | Assign logical owners first; add contexts for justified execution needs |
| One healthy flag | A working link hides failed acquisition or invalid time | Expose independent state dimensions and service-level consequences |
| Heap-free means memory-safe | Lifetime errors and stack overflow remain unnoticed | Review bounds, ownership and simultaneous demand under each allocation strategy |
| Larger queues solve overload | History grows stale or backlog never drains | Budget arrival and effective service together; define exhaustion behavior |
| Timeout means stopped | Late work corrupts a retry or reused storage | Fence operation identity and establish peripheral quiescence |
| Reboot means recovered | Loss, configuration faults or reset loops remain hidden | Verify restored service and bound recovery escalation |
| Keep the old image and rollback is solved | New persistent data may be unreadable by it | Review image, schema migration and eligible recovery paths together |
| Choose the framework first | Application guarantees inherit unchecked library behavior | Evaluate exact dependencies against the service contract |

## Summary

Firmware architecture makes service obligations explicit across ownership, execution, storage, power and lifecycle transitions. Memory management and stability are connected: a retained buffer consumes capacity, a delayed record consumes freshness, and an unbounded retry consumes time and energy needed elsewhere.

The monitor's design preserves acquisition through network loss, distinguishes current from historical service, exposes reset discontinuity and retains a defined update recovery path. Its architecture can be explained before code exists because the responsibilities, state transitions, budgets and acceptance evidence have been specified.

The opening question asked what must remain true throughout the device's lifetime. Acquisition continues through network loss. Retained history is bounded, and any loss of it is visible. A reset begins a distinguishable new session. Recovery is declared when the service is restored, not when the processor restarts. The firmware preserves these properties through single ownership, reserved memory, independent state dimensions and a recoverable commit point for every persistent change.

## What's Next?

A natural next question is what happens at one external interface of this design: its electrical behavior, how a transaction completes or is canceled, how errors are reported and how the owner recovers. That is where the architectural assumptions about a sensor or communication owner meet the selected hardware and driver behavior.

## Related Chapters

- [Chapter 1: What Is an IoT System?](/iot-handbook/chapter-01-what-is-an-iot-system.html) — System responsibilities, freshness and evidence boundaries.
- [Chapter 2: Sensors and the Physical World](/iot-handbook/chapter-02-sensors-and-the-physical-world.html) — Acquisition validity, measurement response and interpretation.
- [Chapter 3: Boards — From Prototypes to Industrial Systems](/iot-handbook/chapter-03-boards-from-prototype-to-industry.html) — Hardware resources and board-selection constraints.
- [Chapter 4: Firmware, Clocks, and Timing](/iot-handbook/chapter-04-firmware-clocks-and-timing.html) — Execution timing, clock domains and timestamp validity.

## Frequently Asked Questions

**Q: When is dynamic allocation justified in firmware expected to run for years?**
When its flexibility serves a real workload and allocation cost, eligible capacity, fragmentation and failure behavior are acceptable on the relevant paths. A bounded variable-size management workload can be reasonable even when critical acquisition uses reserved slots. Review the actual allocator and lifetime patterns; neither a universal ban nor unrestricted use follows from device uptime alone.

**Q: When does an RTOS improve stability?**
When its scheduling and coordination mechanisms resolve a concrete execution problem while the resulting waits and resources remain bounded. It can separate independent blocking work, but can also introduce contention, stack pressure and priority mistakes. Compare complete response paths, not the presence of a scheduler.

**Q: Should a watchdog restart the device whenever the network is unavailable?**
Only if that failure genuinely means the device cannot continue its required local service and restart is a justified recovery action. For this monitor, network absence is expected and acquisition must continue. Restarting repeatedly would discard volatile history and consume energy without repairing the missing gateway.

**Q: Can we offer lossless history with finite memory?**
Only under a bounded contract: acquisition rate, record size, outage duration, reset behavior and recovery capacity must be specified. Outside it, choose and expose a loss or suspension policy. A finite queue cannot preserve an unlimited sequence through an unlimited outage.

**Q: How much portability should the architecture buy?**
Protect stable application decisions and data meaning where hardware changes are plausible. Avoid constructing a universal driver framework before there is a second implementation or a concrete variation to support. Some hardware contracts genuinely differ and should remain visible.

**Q: What makes an update successful?**
The device has activated an authorized compatible image and met defined service checks while preserving a usable recovery path. Download completion, signature verification and entry into the main application are separate milestones. Confirmation and data migration must be designed together.

## Glossary Terms Introduced

| Term | Meaning in this chapter |
|---|---|
| Invariant | A condition the design must preserve across all permitted state transitions |
| Boot generation | A value that changes on every reset so records from before and after it cannot be confused; the plain-language name is a session |
| Quiescence | A state in which an operation can no longer access the resource being canceled, replaced or reused |
| Operation fencing | Rejecting obsolete work by identity, combined with the resource-lifetime rules needed to prevent it affecting a later operation |
| External fragmentation | Free storage split into regions that cannot satisfy a required contiguous allocation despite adequate total free capacity |
| Internal fragmentation | Reserved space inside an allocation unit that the stored object does not use |
| Priority inversion | Defined in Chapter 4: urgent work waiting on a resource held by less urgent work. It becomes unbounded when intermediate-priority work keeps the holder from running |
| Commit point | The defined transition after which recovery treats a new persistent generation as active |
| Trial activation | Running an eligible candidate image pending explicit health confirmation and a defined failure response |
| Recovery reserve | Capacity deliberately kept available for diagnosis and recovery when normal work reaches its resource limit |

## References and Further Reading

- [Source register](/iot-handbook/sources/chapter-05.md) — Access dates, editions, inspected scope and source limitations.
- [Zephyr memory slabs](https://docs.zephyrproject.org/latest/kernel/memory_management/slabs.html) and [task watchdog](https://docs.zephyrproject.org/latest/services/task_wdt/index.html) — Concrete examples of bounded allocation and supervised progress.
- [Zephyr mutexes](https://docs.zephyrproject.org/latest/kernel/services/synchronization/mutexes.html) and [Zephyr introduction](https://docs.zephyrproject.org/latest/introduction/index.html) — Priority inheritance under one runtime's rules, and the shape of a configurable kernel with optional subsystems.
- [FreeRTOS Kernel V11.2.0 heap policy](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/MemMang/heap_4.c) — A specific coalescing allocator; other heaps behave differently.
- [ESP-IDF v6.1 memory allocation](https://docs.espressif.com/projects/esp-idf/en/v6.1/esp32/api-reference/system/mem_alloc.html) and [OTA architecture](https://docs.espressif.com/projects/esp-idf/en/v6.1/esp32/api-reference/system/ota.html) — Memory capabilities, image states and recovery boundaries on the documented target.
- [NIST SP 800-193](https://csrc.nist.gov/pubs/sp/800/193/final) — Protection, detection and recovery as distinct firmware-resiliency responsibilities.
- [STM32CubeF4](https://github.com/STMicroelectronics/STM32CubeF4) and [Arduino platform specification](https://docs.arduino.cc/arduino-cli/platform-specification/) — What these ecosystems package, as examples of the roles in the framework table.

## Revision History

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-24 | Aligned with Chapters 3 and 4: pointed to Chapter 4 for late-completion fencing, wake budget and watchdog repeats; itemized the 32-byte slot; reconciled the arena with the CC2640R2F memory; added the retention clock, repeated-outage arithmetic, slot lifecycle, acknowledgement-path service rate, boot generation mechanisms, configuration commit interruption table, flash wear and stalls, an ownership derivation table, a sensitivity check and a TI row in the framework table. |
| 1.0 | 2026-10-23 | First chapter on firmware architecture, ownership, memory management, stability and lifecycle design, with a supporting SDK overview. |
