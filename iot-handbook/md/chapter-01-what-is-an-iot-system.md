# Chapter 1: What Is an IoT System?

**Version:** 1.2 | **Sources checked:** 2026-10-12

## If You Only Read One Section

**An IoT system combines networked devices that sense or affect the physical world with the software, communications and operational responsibilities needed to deliver an application.** This is the chapter's working definition; the standards below explain where other definitions differ.

A room monitor can deliver its purpose through sensing and communication alone. Adding a cloud service, gateway or actuator is a design decision driven by the application requirements.

Study a system in three views. First, identify its functions: sensing, communication, processing, application behavior, and optional actuation. Second, identify where those functions run: on a device, near the device, or in remote infrastructure. Third, identify its contracts: what the data means, when it is valid, who may use it, and what happens during failure. A diagram becomes useful when it answers these questions.

## Prerequisites

You should be comfortable with software components, network requests, and basic distributed-system failure. No programming language, electronics kit, vendor platform, or previous chapter is required.

This is a conceptual chapter. Examples and numerical values are constructed for reasoning; no hardware or lab work is required.

### Learning Outcomes

After studying it, you should be able to:

1. Explain the distinction between a thing, an IoT device, and an IoT system, while naming the definition being used.
2. Read a reference model and distinguish functional layers from deployment locations.
3. Trace measurement, telemetry, command, and feedback flows, including their guarantee boundaries.
4. Compare device, gateway, edge, and remote-service placements under explicit constraints.
5. Analyze interoperability, timing, security, reliability, and lifecycle responsibilities in a generic system.

## Definitions: Begin With the Scope

### The running example: a room-monitoring service

A building operator needs temperature trends and notification within **30 seconds** of a specified temperature condition change at a designated monitoring point. The application may label a reading “current” only when it was acquired no more than **five seconds** ago. The system monitors conditions; it does not control heating or cooling.

These are constructed requirements, not measured capabilities. The notification deadline and observation-age limit serve different purposes. We will follow this service from sensing through deployment, failure and device replacement, asking: **what must the system establish before the operator can rely on its result?**

### A thing, a device, and a system

A **thing** is the entity of interest. It might be a room, a machine, a parcel, or a digital representation. A **device** is equipment that provides computing and communication capabilities. A **system** includes cooperating devices and services, their interfaces, and the people and processes responsible for operation.

In the running example, the room is the thing, the monitor is a device, and the service includes the application and its operation. Replacing the monitor keeps the room identity but changes the equipment, credentials and measurement history.

ITU-T Y.4000, originally published as Y.2060 in 2012, describes IoT in terms of interconnected physical and virtual things. Its device definition requires communication while treating sensing, actuation, capture, storage, and processing as optional capabilities. NISTIR 8228 uses a narrower device scope centered on a network interface and sensing or actuating capability. A gateway can therefore be an IoT device in one vocabulary and supporting infrastructure in another. Neither definition should be silently applied outside its context. See [ITU-T Y.4000/Y.2060, §3.2](https://www.itu.int/rec/T-REC-Y.2060-201206-I/en) and [NISTIR 8228, §2](https://doi.org/10.6028/NIST.IR.8228).

**ISO/IEC 20924:2024** is the ISO/IEC vocabulary standard for IoT and digital twins. It is a useful terminology reference, but this chapter does not reproduce its definitions or claim clause-level coverage from an inaccessible full text. The official catalogue identifies edition 3, published in February 2024, replacing the 2021 edition. [ISO/IEC 20924:2024](https://www.iso.org/standard/88799.html).

Name the source when a vocabulary difference changes an architectural decision.

### What qualifies under our working definition?

Consider four constructed examples:

| Example | Classification for this chapter | Reason |
|---|---|---|
| A standalone thermometer with a display | Sensing equipment | It measures, but has no networked system relationship |
| A networked temperature monitor sending readings to a local application | IoT system | Physical sensing and communication support an application |
| A connected valve receiving authorized remote commands | Actuating IoT system | Physical interaction need not be sensing-only |
| A conventional online document editor | Networked software application | Networking alone does not establish the physical-device boundary in our working definition |

A software service can belong to the system without being a physical device. W3C's Web of Things also models virtual Things and services. [W3C WoT Architecture 1.1, §3](https://www.w3.org/TR/2023/REC-wot-architecture11-20231205/#terminology).

The room service could run on a private local network. Remote notification introduces a communication requirement; it does not by itself prescribe cloud hosting.

## Reference Architectures: Functions Before Machines

A **reference model** provides an abstract vocabulary and relationships. A **reference architecture** organizes architectural concepts and reusable structures. A **deployment architecture** assigns a particular system's functions to equipment and services. These working distinctions help us avoid treating every box in a teaching diagram as a required server.

Standards address different questions:

| Reference | Role in this chapter | Scope boundary |
|---|---|---|
| ISO/IEC 20924:2024 | Terminology reference | Vocabulary does not choose a deployment |
| ISO/IEC 30141:2024 | IoT reference-architecture context | Common architecture vocabulary and reusable designs; no chapter claim of conformance |
| ITU-T Y.4000/Y.2060 | Four-layer functional model | Layers describe capabilities, not four mandatory machines |
| NIST SP 800-183 | Dataflow reasoning vocabulary | An analytical model, not a mandatory protocol stack |
| W3C WoT Architecture 1.1 | Interactions and interoperability | Complements existing technologies; does not replace every IoT protocol |

ISO/IEC 30141:2024 is edition 2 of the IoT reference-architecture standard, published in August 2024. Its official abstract describes a foundational view and additional views, including construction patterns. Only the public scope and edition information are used here; the detailed model below comes from the openly available ITU recommendation. [ISO/IEC 30141:2024](https://www.iso.org/standard/88800.html).

### The ITU four-layer model

<figure class="iot-diagram">
<picture>
  <source media="(max-width: 679px)" srcset="/images/iot-handbook/IOT-001/fig-1-reference-model-compact.svg">
  <img src="/images/iot-handbook/IOT-001/fig-1-reference-model.svg" alt="ITU functional model, paraphrased: application, service support and application support, network, and device layers. Management and security apply across all four layers." style="width:100%;height:auto">
</picture>
<figcaption>Figure 1. Author-drawn paraphrase of the ITU functional model. Security and management span all layers. Box size and position do not specify deployment or ownership.</figcaption>
</figure>

ITU-T Y.4000/Y.2060 §8 identifies four layers: **device**, **network**, **service support and application support**, and **application**. Management and security capabilities are associated with all four. Read upward from capabilities close to equipment toward the application using them. [ITU-T Y.4000/Y.2060, §8](https://www.itu.int/rec/T-REC-Y.2060-201206-I/en).

Here is a constructed mapping for a building's environmental monitoring application:

| Functional layer | Illustrative responsibility |
|---|---|
| Device | Acquire observations and provide device communication capabilities |
| Network | Move information between communication participants |
| Service support and application support | Offer reusable storage, processing, or application-specific support |
| Application | Present room conditions and notify an operator |

For the room service, these functions need owners before they need separate machines. One gateway could communicate, store observations and evaluate the notification condition; one application process could combine processing and storage. Draw a deployment view to expose which responsibilities share resources and failures.

Security cannot be confined to the remote backend. An authenticated application still depends on device identity, interface access, and the protection of data in transit. Management cannot be reduced to a dashboard: configuration and updates must reach the equipment they affect. The cross-layer columns remind us to follow these responsibilities through the entire system.

### A complementary NIST dataflow model

NIST SP 800-183 describes five primitives: **sensor**, **aggregator**, **communication channel**, **external utility (eUtility)**, and **decision trigger**. They help analyze how data becomes an application result. An external utility can provide supporting products or services; a decision trigger can lead to an action or transaction, and need not control an actuator. [NIST SP 800-183, §2](https://doi.org/10.6028/NIST.SP.800-183).

Do not equate these primitives one-to-one with the ITU layers. One model organizes capabilities; the other helps reason about dataflow. For example, an aggregator function could execute in device firmware, a gateway, or a remote service. Calling it an aggregator tells us what it does, while its deployment location tells us which resources and failures it depends on.

## Components and Their Responsibilities

Follow the room service across its physical interface, device software, communication path and application. Each introduces responsibilities that need an owner.

### Sensors and actuators

A **sensor** produces information about a physical quantity or condition. An **actuator** changes a physical condition. Together, these are transducer capabilities at the boundary between physical and digital environments. Measurement and actuation are distinct functions; a device can provide either or both. [NISTIR 8228, §2](https://doi.org/10.6028/NIST.IR.8228).

For our service, the sensor observes temperature at the designated point. Interpreting that value as the condition of the entire room would introduce a different requirement. Placement and response must support the claim the application actually makes; Chapter 2 examines that evidence.

An actuation path connects a requested operation to physical equipment. An application may request a valve position. The request describes intent; equipment determines what actually happens. Feedback can provide evidence about the resulting position or process condition. The needed evidence depends on the application: a valve's position and the flow through it are different quantities.

### Devices and firmware

A device combines hardware capabilities with software that accesses them. **Firmware** is software operating close to that hardware: it may acquire observations, manage communication, maintain configuration, or execute local decisions. An embedded system does not imply a particular operating system or programming language.

Resource limits shape design. RFC 7228 discusses constrained nodes in terms of memory, processing, power, and deployment accessibility, and separately discusses constrained networks. It is an **Informational RFC**, rather than a requirements standard for every IoT device. A powerful industrial computer and a small battery-operated node can both participate in IoT while having very different constraints. [RFC 7228, §§2–4](https://www.rfc-editor.org/info/rfc7228/).

For the room monitor, sleeping between transmissions must fit the observation-age and notification requirements. Local storage must be bounded. Firmware must define what continues when the application cannot be reached.

### Networks, gateways, and edge computing

A **network** carries information among participants. **Gateway** describes a role at an interface: it may bridge protocols, relay communication, normalize data, or mediate access. A gateway is useful when an actual boundary needs that service. Adding one introduces another component to operate and another failure mode to analyze.

**Edge computing** places processing near the source or use of information. A device can perform edge computation. A gateway can do so too. The terms are therefore not interchangeable: a gateway describes an interface responsibility, while edge describes placement. A relay gateway need not run application analytics.

A **remote service** provides processing or storage away from the equipment. The room service could use it for cross-room trends and operator notification, provided connectivity and delay fit those responsibilities.

### Applications and operations

An application interprets information for a purpose: monitoring, alerting, reporting, optimization, or control. Its correctness depends on the meaning and quality of its inputs as well as its own logic.

Operations keeps the service valid as equipment changes: onboarding monitors, assigning identity, managing configuration and updates, checking health, and retiring devices. A replacement at the same monitoring point must inherit the intended role through an explicit procedure.

## Flows: Measurement, Telemetry, Command, and Feedback

<div class="iot-controls"><label class="iot-scenario" for="iot-flow-kind">Illustrative flow<select id="iot-flow-kind"><option value="sensing">Sensing only</option><option value="actuating" selected>With optional actuation</option></select></label><button type="button" class="iot-reset" data-iot-reset="iot-study-flow">Reset flow</button></div>

<figure id="iot-flow-scene" class="scene iot-scene" data-scene="iot-study-flow" data-kind="actuating" data-label="Illustrative sequence: measurement, telemetry, optional command, optional actuation, and relevant feedback">
  <div class="scene__stage"><picture><source media="(max-width: 679px)" srcset="/images/iot-handbook/IOT-001/fig-2-flows-compact.svg"><img src="/images/iot-handbook/IOT-001/fig-2-flows.svg" alt="Static alternative: measurement and telemetry, with an optional return command and actuation path."></picture></div>
  <figcaption class="evidence-caption">Illustrative teaching model, initially paused. Time is stretched for explanation. Sequence: observation acquired → telemetry received → optional operation requested → operation applied → relevant new observation. The sequence supplies no measured timing or outcome guarantee.</figcaption>
</figure>

### Measurement and telemetry

**Measurement** produces an observation about a quantity. **Telemetry** communicates observations or other device information for use elsewhere. Telemetry can include measurement data, equipment status, or diagnostics; these have different meanings.

Follow one observation through the room service:

1. A sensor acquires a temperature observation.
2. Device software associates it with a quantity, unit, identity, and measurement time.
3. Communication carries a representation of that observation.
4. A receiving application interprets it under its data contract.
5. The application uses it to display a condition or make a decision.

The value `24.0` alone does not tell a receiver what was measured, which unit applies, where the observation came from, or when it was acquired. Receiving valid bytes is only one part of understanding the observation.

SenML, specified in RFC 8428, is one standardized way to represent sensor measurements, including names, units, values, and time. Its time representation can be absolute or relative. We use the concept of measurement metadata here without prescribing a serialization or inventing a SenML message. [RFC 8428, §§4–5](https://www.rfc-editor.org/info/rfc8428/).

### Commands and feedback

A **command** requests an operation. A **response** communicates something about handling that request. **Feedback** provides information used to assess the system's state or response. These can be carried by the same communication network, but they answer different questions.

For a constructed connected-valve example, distinguish these records:

| Record | What it can support, given a trustworthy implementation | What remains separate |
|---|---|---|
| Request issued | The application requested a position | Receipt and execution |
| Communication acknowledgement | The relevant protocol exchange reached its acknowledged stage | Application acceptance and physical movement |
| Application response: accepted | The receiving application accepted the operation under its contract | Completion and process outcome |
| Device report: target position set | Device software reports a state change | Actual valve position |
| Position observation | Evidence about position at a stated time | Whether the intended flow was achieved |
| Flow observation | Evidence about flow at the observation point | Other process objectives and future behavior |

The valve is a contrast to our sensing-only service: adding control introduces claims about operation and process outcome. Interfaces may combine or omit stages in the table, so establish which evidence their responses actually provide. Physical observations still depend on placement, timing and measurement quality.

### Open-loop and closed-loop control

In an **open-loop** control model, the operation is selected without using feedback about the resulting controlled quantity to adjust it. In a **closed-loop** model, feedback about that quantity influences subsequent control. This is the control vocabulary used in our teaching model.

A system can be connected while its physical control loop remains local. A remote application might select a desired value while a local controller repeatedly measures and adjusts the process. A monitoring application can receive feedback without controlling anything. Consequently, telemetry does not automatically imply closed-loop control, and a closed loop does not automatically imply remote control.

The design question is which component owns the decision at each timescale. A person changing a daily schedule and a controller responding to a fast disturbance have different timing contracts. Drawing both simply as “control” conceals those differences.

## Deployment Patterns and Placement Decisions

Compare the following illustrative placements of the same functions. W3C WoT discusses local, intermediary, edge, and remote arrangements. [WoT Architecture 1.1, §§5 and 9](https://www.w3.org/TR/2023/REC-wot-architecture11-20231205/#common-deployment-patterns).

| Pattern | Where key work happens | Useful when | Question to resolve |
|---|---|---|---|
| Direct telemetry | Device communicates with an application service | The device supports the required communication and data contract | What happens during disconnection? |
| Gateway-assisted telemetry | Gateway mediates between devices and applications | Protocol translation or local consolidation is needed | Does gateway failure stop all dependent devices? |
| Local control with remote supervision | Immediate control is local; a remote application supplies goals or history | Physical response must continue through remote outages | What authority and limits does each controller have? |
| Remote processing | A remote service processes device information | Centralized capacity or cross-device analysis matters | Are delay and availability compatible with the application? |

### Worked comparison: where should the room service run?

Compare two deployments against the same trend, notification and freshness requirements.

**Option A:** each monitor sends observations directly to a remote service. This removes a separately managed gateway from the path. It places the communication and identity responsibilities on each device and its service relationship.

**Option B:** monitors send observations to a site gateway that stores and forwards them. This can consolidate communication and preserve some history through a remote outage. It adds local storage, gateway maintenance, and a shared dependency. A failed gateway may affect many monitors.

For either option, establish device-interface support and the communication path to the operator. Option B can preserve observations for later trend analysis during a remote outage, but buffering alone does not satisfy the 30-second notification deadline. A gateway adds value only where it addresses a required responsibility and can be maintained.

### Worked reasoning: freshness is separate from delivery

Suppose the room service evaluates a reading at **12:00:10**. It was acquired at **12:00:00** and arrived at **12:00:09**. Assume synchronized clocks and negligible timestamp uncertainty. Apply the service's **five-second** observation-age limit.

The observation's age at evaluation is:

**age = evaluation time − measurement time = 10 seconds**

Its age exceeds the assumed limit, so it cannot support the application's “current condition” decision. Arrival only one second earlier does not make the measurement one second old. It can still contribute to historical analysis if that use accepts older data.

This five-second limit belongs to our application. In an implementation, clock uncertainty and the interval between sensing and timestamp assignment also affect the age estimate. Define how the service handles an estimate that straddles the limit.

This reasoning separates four terms: sampling interval, communication delay, observation age, and decision deadline. Increasing the sampling rate does not remove a long transmission queue. Reliable delivery does not make old information timely.


<div class="iot-controls"><button type="button" class="iot-reset" data-iot-reset="iot-study-freshness">Reset timeline</button></div>

<figure id="iot-freshness-scene" class="scene iot-scene" data-scene="iot-study-freshness" data-label="Illustrative observation age increases from measurement through arrival to evaluation">
  <div class="scene__stage"><picture><source media="(max-width: 679px)" srcset="/images/iot-handbook/IOT-001/fig-3-freshness-compact.svg"><img src="/images/iot-handbook/IOT-001/fig-3-freshness.svg" alt="Static alternative: the observation is already too old for this decision when it arrives."></picture></div>
  <figcaption class="evidence-caption">Illustrative teaching model, initially paused. Sequence: measured at age zero → assumed age limit passes → received at age nine seconds → evaluated at age ten seconds. Receipt does not reset the measurement time. The prose and static figure carry the same lesson.</figcaption>
</figure>

## Interoperability: Agreement at Several Levels

Interoperability requires enough agreement for participants to exchange and use information correctly. We will distinguish three levels for study:

- **Communication:** participants can establish the required exchanges.
- **Representation:** participants agree on encoding, field structure, and data types.
- **Meaning:** participants agree on quantity, units, identity, location, time, and behavior.

Standards may group these three levels differently. The distinction helps identify what two participants have actually agreed on.

Suppose a replacement room monitor uses the same transport and JSON field `temperature`, but reports equipment temperature in degrees Fahrenheit instead of air temperature in degrees Celsius. The message passes syntax checks while violating the service's measurement contract.

W3C WoT provides an interaction model with **Properties**, **Actions**, and **Events**. A Property exposes state, an Action invokes functionality, and an Event provides asynchronous notifications. Thing Descriptions describe interaction affordances and supporting metadata; protocol bindings connect interaction descriptions to concrete protocols. This complements existing IoT technologies. [WoT Architecture 1.1, §§6.1, 6.5, and 6.7](https://www.w3.org/TR/2023/REC-wot-architecture11-20231205/#interaction-model).

For our monitor, current temperature could be a Property and an alarm notification an Event. An Action could request a calibration procedure, without establishing its successful completion. These interface descriptions explain how to interact; measurement and completion evidence determine what the result supports.

### Protocols occupy part of the architecture

MQTT 5.0 specifies publish/subscribe messaging with three delivery QoS levels. CoAP's base specification describes a constrained application protocol with request/response semantics and confirmable-message exchanges. These are application-protocol choices, not complete IoT system architectures. [OASIS MQTT 5.0, §§1 and 4.3](https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html); [RFC 7252, §§2 and 4](https://www.rfc-editor.org/info/rfc7252/).

MQTT's “exactly once” QoS concerns its message-delivery exchange. It does not mean a separate actuator changed the world exactly once. In CoAP, an empty acknowledgement can precede a separate response; message acknowledgement and application response are distinct protocol concepts. The valve evidence table shows which application outcomes remain to be established. [MQTT 5.0, §4.3.3](https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html); [RFC 7252, §5.2.2](https://www.rfc-editor.org/info/rfc7252/).

Choose a protocol by the required interactions and constraints, then specify the remaining application semantics. A broker, a resource endpoint, a data schema, and an authorization rule have different responsibilities even when one product implements several of them.

## Reliability: Identify What Must Continue

For the room service, distinguish continued acquisition, historical retention, current-condition display and timely notification. A component can remain available while one of these outcomes fails. Review the deployment against the following failures:

| Failure | Possible consequence | Responsibility to make explicit |
|---|---|---|
| Sensor stops updating | Application may display a plausible old value | Detect freshness and distinguish missing from current data |
| Network disconnects | Remote information or commands may stop | Define local behavior and disconnected-data policy |
| Device restarts | Volatile state and communication sessions may change | Define initialization and state recovery |
| Gateway fails | Several devices may lose a shared path | Identify dependency scope and recovery ownership |
| Command response is lost | Sender may not know whether an operation occurred | Define reconciliation and retry semantics |
| Storage fills during outage | Old or new observations may be discarded | Bound capacity and define the loss policy |

During a remote outage, trend storage may continue while the notification deadline is missed. Report those as separate service outcomes, with recovery ownership for each.

A retry is an application decision. Repeating “set desired temperature to 20 °C” and repeating “dispense one unit” have different meanings. Even a state-setting operation can become inappropriate when delayed past its validity period. Duplicate handling, validity, and recovery need a contract that extends beyond successful transmission.

Unknown outcomes deserve representation. If a response is missing, the sender may have evidence of neither success nor failure. Reporting failure as certainty can invite an unsafe retry; reporting success as certainty can hide a missed action. A system can instead expose uncertainty and use reconciliation or a relevant new observation to narrow it.

For the room service, observe the last acquisition, data quality, communication state and notification outcome separately. One green “connected” indicator cannot show whether the operator received a timely notification or is viewing stale data.

## Security, Privacy, and Lifecycle

An identifier answers “which entity?” Authentication establishes evidence of identity under a mechanism. Authorization determines which operations that identity may perform. Keeping these concepts separate matters when equipment is installed, replaced, transferred, or retired.

NISTIR 8259A's **2020 device cybersecurity core baseline** organizes six capability areas: device identification, device configuration, data protection, logical access to interfaces, software update, and cybersecurity state awareness. The baseline is a starting point for requirements, rather than a guarantee that any device offering six labeled features is secure. Later NIST catalogues may expand the taxonomy; the six-area list here is specifically the 2020 document. [NISTIR 8259A, §2 and Table 1](https://doi.org/10.6028/NIST.IR.8259A).

Follow the monitor through selection, onboarding, operation, maintenance and retirement. Establish support and security needs before selection; authorize its identity and configuration at onboarding; monitor state and manage updates during operation. When replacing it, verify its location and measurement configuration, record the equipment change, and revoke the retired unit's service access. Resolve retained data and update ownership as part of the same procedure.

A system with protected remote APIs can still have an exposed local configuration interface. A device with signed updates can still be operated under a weak authorization policy. Security is a relationship among capabilities, configuration, people, and consequences.

Adding occupancy data to the room service could reveal activity patterns. Define its purpose, access, retention and permitted uses before collecting it.

NISTIR 8228 discusses how IoT's physical interactions and management differences affect cybersecurity and privacy risk. Protecting information and preserving physical operation can require different considerations from conventional IT. [NISTIR 8228, §3](https://doi.org/10.6028/NIST.IR.8228).

Domain-specific safety, security and regulatory assessments require the relevant standards and expertise beyond this architectural introduction.

## Worked Example: Review the Room-Monitoring Service

Bring the decisions together before selecting equipment or a platform. The notification deadline remains 30 seconds; the current-condition display accepts observations no older than five seconds.

| View | Design question | Responsibility |
|---|---|---|
| Functions | What must the system do? | Sense temperature, acquire an observation, communicate it, evaluate the condition, notify the operator |
| Deployment | Where does each function run? | A device acquires readings; a gateway can evaluate locally; a remote application delivers the notification |
| Contracts | What makes the result usable? | Defined quantity and location, acquisition time, valid reading, bounded delay and an explicit notification outcome |
| Failure | What happens during a remote outage? | Buffering preserves history; meeting the deadline needs a timely notification path |
| Lifecycle | What happens when the device is replaced? | Re-establish placement, identity, permissions, configuration and support responsibilities |

The review leaves two acceptance questions: can the installed sensing-to-notification path meet 30 seconds, and does the display avoid presenting observations older than five seconds as current under the clock assumptions? A gateway and a buffer do not answer either question on their own. Define the operating conditions, allocate delay across the path, and require evidence for the complete result. Chapter 2 examines the sensing part of that budget.

## Common Pitfalls and Mitigations

| Pitfall | Consequence | Mitigation |
|---|---|---|
| Treating functional layers as machines | Extra services and interfaces without a requirement | Assign functions to equipment after defining responsibilities |
| Requiring a cloud service or actuator | Excluding valid sensing-only or local systems | Begin with the application purpose and physical interaction |
| Treating delivery as physical success | Reporting an outcome that was never observed | Define the claim and identify evidence for the physical process |
| Calculating freshness from arrival time | Old observations appear current | Preserve acquisition time and state clock assumptions |
| Treating buffering as timely notification | Preserved history conceals a missed deadline | Evaluate delivery delay separately from data retention |
| Treating replacement as a hardware-only task | Old authority remains or the new device lacks configuration | Resolve identity, permissions, placement, updates and retirement |

## Summary

An IoT system is understood through its purpose, physical and digital participants, functional responsibilities, deployment, and contracts. A component list alone does not explain how observations become useful information or how requested operations relate to physical outcomes.

Reference models provide vocabulary. Deployment decisions allocate work under constraints. Data and interaction contracts establish meaning. Reliability, security, and lifecycle reasoning establish what must hold as equipment and communication conditions change.

When studying an unfamiliar system, begin with five questions: What is its purpose? What does it observe or affect? Which functions run where? What do its exchanges establish? Who owns its behavior during failure and change? The answers produce a useful architecture before selecting a platform.

## What's Next?

[Chapter 2: Sensors and the Physical World](/iot-handbook/chapter-02-sensors-and-the-physical-world.html) follows an observation back to its physical origin. You will examine sensing principles, calibration, sampling, response lag and uncertainty to decide whether a reading supports the application's claim.

## Related Chapters

- [Chapter 2: Sensors and the Physical World](/iot-handbook/chapter-02-sensors-and-the-physical-world.html) — Develops this chapter's measurement and freshness contracts, including why timely telemetry can still describe a delayed physical response.
- [Chapter 3: Boards — From Prototypes to Industrial Systems](/iot-handbook/chapter-03-boards-from-prototype-to-industry.html) — Maps device, gateway and local-control responsibilities onto hardware and firmware choices.

## Frequently Asked Questions

**Q: Does an IoT system need the public Internet or a cloud service?**
No. A networked sensing application can operate on a private local network. Cloud hosting is a deployment choice; the system still needs defined communication, application and operational responsibilities.

**Q: Does an IoT system need an actuator?**
No. A networked environmental monitor can deliver its application through sensing alone. When actuation is present, distinguish command delivery, device operation and evidence of the physical outcome.

**Q: Is a gateway a separate architectural layer?**
A gateway is a deployment component. It may realize several functions, including communication, buffering and application logic. Functional layers describe responsibilities rather than a required number of machines.

**Q: Does reliable message delivery prove that a valve opened?**
No. Delivery establishes a communication outcome under the protocol's guarantees. Valve position and resulting flow are separate claims requiring relevant observations.

**Q: Does buffering during an outage satisfy a notification deadline?**
Buffering can preserve history, but replay does not make a late notification timely. Assess the notification path against the deadline and define behavior during an outage.

## Glossary Terms Introduced

| Term | Meaning in this chapter |
|---|---|
| Reference model | An abstract description of functions and their relationships. Use it to reason about responsibilities; its layers do not specify separate machines. |
| Reference architecture | A reusable way to organize architectural responsibilities and relationships. A particular system still needs its own deployment and interface decisions. |
| Deployment architecture | Where the system’s functions run: on devices, gateways, local infrastructure or remote services. Several functions can share one component. |
| Telemetry | Observations or device information communicated to another component. Receiving telemetry does not establish that it is current or that a physical operation succeeded. |
| Feedback | Information about the state or result of an operation. It must observe something relevant to the claimed outcome; a copy of a command is not evidence that the physical process followed it. |
| Freshness | Whether an observation is recent enough for a specific decision. Evaluate its age from acquisition, accounting for clock uncertainty; recent arrival alone is insufficient. |
| Interoperability | The ability of components to exchange information and use it with the intended meaning. Matching protocols or field names alone does not establish it. |

## References and Further Reading

Read these sources according to their roles. A recommendation, an Informational RFC, a protocol specification, and a technical baseline do not have identical normative status.

- [ITU-T Y.4000/Y.2060: Overview of the Internet of things](https://www.itu.int/rec/T-REC-Y.2060-201206-I/en), June 2012; renumbered in 2016. Study §§3 and 8 for definitions and the functional model.
- [ISO/IEC 20924:2024: IoT and digital twin vocabulary](https://www.iso.org/standard/88799.html), edition 3. Official catalogue and scope; full definitions are not reproduced here.
- [ISO/IEC 30141:2024: IoT reference architecture](https://www.iso.org/standard/88800.html), edition 2. Official catalogue and scope; detailed clauses require the standard itself.
- [NIST SP 800-183: Networks of Things](https://doi.org/10.6028/NIST.SP.800-183), July 2016. Study §2 as a complementary analytical vocabulary.
- [W3C WoT Architecture 1.1](https://www.w3.org/TR/2023/REC-wot-architecture11-20231205/), Recommendation, 5 December 2023. Study the interaction model and deployment examples alongside its [errata](https://w3c.github.io/wot-architecture/errata11.html).
- [RFC 7228: Terminology for Constrained-Node Networks](https://www.rfc-editor.org/info/rfc7228/), Informational, May 2014. Study device, network, and energy constraints.
- [RFC 8428: Sensor Measurement Lists](https://www.rfc-editor.org/info/rfc8428/), August 2018. Study measurement metadata and time representation; consult the status page for updates and errata.
- [OASIS MQTT 5.0](https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html), OASIS Standard, 7 March 2019; and [RFC 7252: CoAP](https://www.rfc-editor.org/info/rfc7252/), June 2014. Study interaction and delivery semantics separately from physical-effect claims; consult RFC status for extensions and errata.
- [NISTIR 8259A](https://doi.org/10.6028/NIST.IR.8259A), May 2020; and [NISTIR 8228](https://doi.org/10.6028/NIST.IR.8228), June 2019. Study capability baselines and IoT risk considerations as guidance for scoped requirements.

## Revision History

| Version | Date | Change |
|---|---|---|
| 1.2 | 2026-10-19 | Aligned the handbook structure, added FAQs and a concise glossary, and threaded a room-monitoring service through the architecture, deployment, failure and lifecycle decisions; tightened repeated qualifications. |
| 1.1 | 2026-10-12 | Redesigned compact return paths and causal motion; added an explicit freshness threshold, shared visual styling and equivalent static fallbacks. |
| 1.0 | 2026-10-12 | Introduced the standards-grounded foundation, glossary and lifecycle exercise. |
