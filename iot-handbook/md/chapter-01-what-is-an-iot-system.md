# Chapter 1: What Is an IoT System?

**Version:** 1.1 | **Sources checked:** 2026-10-12

## If You Only Read One Section

An Internet of Things system connects things, digital representations, communications, and applications so that information about the world can be used. Many systems measure physical conditions; some also change them. A networked environmental monitor is an IoT system even when it has no actuator. A cloud service, a gateway, and artificial intelligence are possible design choices, rather than universal requirements.

For this chapter, use a practical working definition: **an IoT system combines networked devices that sense or affect the physical world with the software, communications, and operational responsibilities needed to deliver an application.** This is a teaching definition. Standards have different scopes, and we will make those differences explicit.

Study a system in three views. First, identify its functions: sensing, communication, processing, application behavior, and optional actuation. Second, identify where those functions run: on a device, near the device, or in remote infrastructure. Third, identify its contracts: what the data means, when it is valid, who may use it, and what happens during failure. A diagram becomes useful when it answers these questions.

## Prerequisites, Scope, and Learning Outcomes

You should be comfortable with software components, network requests, and basic distributed-system failure. No programming language, electronics kit, vendor platform, or previous chapter is required.

This chapter establishes a conceptual foundation. It does not provide wiring instructions, firmware, a physical experiment, protocol configuration, a certification checklist, or a complete control-system design. Examples and numerical values are constructed for reasoning; they are not measurements from a deployment.

After studying it, you should be able to:

1. Explain the distinction between a thing, an IoT device, and an IoT system, while naming the definition being used.
2. Read a reference model and distinguish functional layers from deployment locations.
3. Trace measurement, telemetry, command, and feedback flows, including their guarantee boundaries.
4. Compare device, gateway, edge, and remote-service placements under explicit constraints.
5. Analyze interoperability, timing, security, reliability, and lifecycle responsibilities in a generic system.

## 1. Definitions: Begin With the Scope

### A thing, a device, and a system

A **thing** is the entity of interest. It might be a room, a machine, a parcel, or a digital representation. A **device** is equipment that provides computing and communication capabilities. A **system** includes cooperating devices and services, their interfaces, and the people and processes responsible for operation.

These words are related, but substituting one for another hides important boundaries. The room is not its temperature sensor. A device identifier is not the identity of every object that device might observe. A replacement sensor can monitor the same room while changing calibration, credentials, and maintenance history.

ITU-T Y.4000, originally published as Y.2060 in 2012, describes IoT in terms of interconnected physical and virtual things. Its device definition requires communication while treating sensing, actuation, capture, storage, and processing as optional capabilities. NISTIR 8228 uses a narrower device scope centered on a network interface and sensing or actuating capability. A gateway can therefore be an IoT device in one vocabulary and supporting infrastructure in another. Neither definition should be silently applied outside its context. See [ITU-T Y.4000/Y.2060, §3.2](https://www.itu.int/rec/T-REC-Y.2060-201206-I/en) and [NISTIR 8228, §2](https://doi.org/10.6028/NIST.IR.8228).

**ISO/IEC 20924:2024** is the ISO/IEC vocabulary standard for IoT and digital twins. It is a useful terminology reference, but this chapter does not reproduce its definitions or claim clause-level coverage from an inaccessible full text. The official catalogue identifies edition 3, published in February 2024, replacing the 2021 edition. [ISO/IEC 20924:2024](https://www.iso.org/standard/88799.html).

The study habit is simple: when a definition affects an argument, name its source and scope. Ask whether the discussion concerns physical equipment, an information model, a communication participant, or an entire operational system.

### What qualifies under our working definition?

Consider four constructed examples:

| Example | Classification for this chapter | Reason |
|---|---|---|
| A standalone thermometer with a display | Sensing equipment | It measures, but has no networked system relationship |
| A networked temperature monitor sending readings to a local application | IoT system | Physical sensing and communication support an application |
| A connected valve receiving authorized remote commands | Actuating IoT system | Physical interaction need not be sensing-only |
| A conventional online document editor | Networked software application | Networking alone does not establish the physical-device boundary in our working definition |

These classifications are teaching examples, not an exhaustive taxonomy. A software service can be part of an IoT system without itself being a physical IoT device. W3C's Web of Things also models virtual Things and services. Broader models remain useful, provided their scope is stated. [W3C WoT Architecture 1.1, §3](https://www.w3.org/TR/2023/REC-wot-architecture11-20231205/#terminology).

A networked system can operate inside a private local network. Public Internet reachability is a deployment property. Likewise, a sensing application can deliver useful information without a return control path. These observations prevent two common mistakes: requiring a cloud backend in every diagram and requiring an actuator in every system.

## 2. Reference Architectures: Functions Before Machines

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

The mapping is our example. It is not a list of mandatory products. The monitor might connect directly to a service or communicate through a gateway. Processing and storage might share one application process. Some supporting functions might run on the device itself.

A useful way to read the figure is to ask what each layer contributes, then draw a separate deployment view. A single gateway can communicate, store data, and perform application logic. It can therefore realize functions associated with several layers. Conversely, one functional layer can span several services.

Security cannot be confined to the remote backend. An authenticated application still depends on device identity, interface access, and the protection of data in transit. Management cannot be reduced to a dashboard: configuration and updates must reach the equipment they affect. The cross-layer columns remind us to follow these responsibilities through the entire system.

### A complementary NIST dataflow model

NIST SP 800-183 describes five primitives: **sensor**, **aggregator**, **communication channel**, **external utility (eUtility)**, and **decision trigger**. They help analyze how data becomes an application result. An external utility can provide supporting products or services; a decision trigger can lead to an action or transaction, and need not control an actuator. [NIST SP 800-183, §2](https://doi.org/10.6028/NIST.SP.800-183).

Do not equate these primitives one-to-one with the ITU layers. One model organizes capabilities; the other helps reason about dataflow. For example, an aggregator function could execute in device firmware, a gateway, or a remote service. Calling it an aggregator tells us what it does, while its deployment location tells us which resources and failures it depends on.

## 3. Components and Their Responsibilities

The following vocabulary is a teaching organization used throughout this chapter. It is not an additional standardized layer stack.

### Sensors and actuators

A **sensor** produces information about a physical quantity or condition. An **actuator** changes a physical condition. Together, these are transducer capabilities at the boundary between physical and digital environments. Measurement and actuation are distinct functions; a device can provide either or both. [NISTIR 8228, §2](https://doi.org/10.6028/NIST.IR.8228).

A sensing path connects a quantity of interest to an observation. For example, a sensor at one point in a room provides evidence about temperature at that location and time. The application may estimate the room's condition from that reading. The estimate requires assumptions about placement and relevance. A precise digital value does not eliminate those assumptions.

An actuation path connects a requested operation to physical equipment. An application may request a valve position. The request describes intent; equipment determines what actually happens. Feedback can provide evidence about the resulting position or process condition. The needed evidence depends on the application: a valve's position and the flow through it are different quantities.

### Devices and firmware

A device combines hardware capabilities with software that accesses them. **Firmware** is software operating close to that hardware: it may acquire observations, manage communication, maintain configuration, or execute local decisions. An embedded system does not imply a particular operating system or programming language.

Resource limits shape design. RFC 7228 discusses constrained nodes in terms of memory, processing, power, and deployment accessibility, and separately discusses constrained networks. It is an **Informational RFC**, rather than a requirements standard for every IoT device. A powerful industrial computer and a small battery-operated node can both participate in IoT while having very different constraints. [RFC 7228, §§2–4](https://www.rfc-editor.org/info/rfc7228/).

From those constraints, reason about responsibilities. A battery-operated sensor may sleep between transmissions, so continuous remote availability cannot simply be assumed. A device with small storage cannot retain unlimited disconnected history. Firmware that must meet a local deadline needs a plan for what happens while another component is unavailable. These are engineering consequences of stated constraints, not universal device characteristics.

### Networks, gateways, and edge computing

A **network** carries information among participants. **Gateway** describes a role at an interface: it may bridge protocols, relay communication, normalize data, or mediate access. A gateway is useful when an actual boundary needs that service. Adding one introduces another component to operate and another failure mode to analyze.

**Edge computing** places processing near the source or use of information. A device can perform edge computation. A gateway can do so too. The terms are therefore not interchangeable: a gateway describes an interface responsibility, while edge describes placement. A relay gateway need not run application analytics.

A **remote service** provides processing or storage away from the equipment. Cloud infrastructure is one possible implementation. Whether to place a function remotely depends on deadlines, connectivity, capacity, administration, and data policy. Location does not automatically establish reliability or security.

### Applications and operations

An application interprets information for a purpose: monitoring, alerting, reporting, optimization, or control. Its correctness depends on the meaning and quality of its inputs as well as its own logic.

Operations includes onboarding equipment, assigning identity, changing configuration, applying updates, monitoring health, maintaining devices, and retiring them. A useful system definition includes these responsibilities because software that works on installation day still needs a supportable lifecycle. We will return to lifecycle in Section 8.

## 4. Flows: Measurement, Telemetry, Command, and Feedback

<div class="iot-controls"><label class="iot-scenario" for="iot-flow-kind">Illustrative flow<select id="iot-flow-kind"><option value="sensing">Sensing only</option><option value="actuating" selected>With optional actuation</option></select></label><button type="button" class="iot-reset" data-iot-reset="iot-study-flow">Reset flow</button></div>

<figure id="iot-flow-scene" class="scene iot-scene" data-scene="iot-study-flow" data-kind="actuating" data-label="Illustrative sequence: measurement, telemetry, optional command, optional actuation, and relevant feedback">
  <div class="scene__stage"><picture><source media="(max-width: 679px)" srcset="/images/iot-handbook/IOT-001/fig-2-flows-compact.svg"><img src="/images/iot-handbook/IOT-001/fig-2-flows.svg" alt="Static alternative: measurement and telemetry, with an optional return command and actuation path."></picture></div>
  <figcaption class="evidence-caption">Illustrative teaching model, initially paused. Time is stretched for explanation. Sequence: observation acquired → telemetry received → optional operation requested → operation applied → relevant new observation. The sequence supplies no measured timing or outcome guarantee.</figcaption>
</figure>

### Measurement and telemetry

**Measurement** produces an observation about a quantity. **Telemetry** communicates observations or other device information for use elsewhere. Telemetry can include measurement data, equipment status, or diagnostics; these have different meanings.

Follow a constructed observation from a room monitor:

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

The table is engineering reasoning, not a universal response vocabulary. Some systems combine stages; others expose fewer records. Always read the actual interface contract.

A feedback path must observe something relevant to the question. A device's copy of its commanded value provides useful software-state information, but it cannot by itself establish a physical process outcome. A physical observation also has limitations: placement, delay, calibration, and shared failures can affect its interpretation. Evidence is evaluated against a claim, rather than treated as an absolute proof of all system behavior.

### Open-loop and closed-loop control

In an **open-loop** control model, the operation is selected without using feedback about the resulting controlled quantity to adjust it. In a **closed-loop** model, feedback about that quantity influences subsequent control. This is the control vocabulary used in our teaching model.

A system can be connected while its physical control loop remains local. A remote application might select a desired value while a local controller repeatedly measures and adjusts the process. A monitoring application can receive feedback without controlling anything. Consequently, telemetry does not automatically imply closed-loop control, and a closed loop does not automatically imply remote control.

The design question is which component owns the decision at each timescale. A person changing a daily schedule and a controller responding to a fast disturbance have different timing contracts. Drawing both simply as “control” conceals those differences.

## 5. Deployment Patterns and Placement Decisions

Compare the following illustrative placements of the same functions. W3C WoT discusses local, intermediary, edge, and remote arrangements. [WoT Architecture 1.1, §§5 and 9](https://www.w3.org/TR/2023/REC-wot-architecture11-20231205/#common-deployment-patterns).

| Pattern | Where key work happens | Useful when | Question to resolve |
|---|---|---|---|
| Direct telemetry | Device communicates with an application service | The device supports the required communication and data contract | What happens during disconnection? |
| Gateway-assisted telemetry | Gateway mediates between devices and applications | Protocol translation or local consolidation is needed | Does gateway failure stop all dependent devices? |
| Local control with remote supervision | Immediate control is local; a remote application supplies goals or history | Physical response must continue through remote outages | What authority and limits does each controller have? |
| Remote processing | A remote service processes device information | Centralized capacity or cross-device analysis matters | Are delay and availability compatible with the application? |

### Worked comparison: a generic monitoring system

Assume a constructed building application must show environmental trends and notify an operator about an out-of-range condition. It has no automatic actuator. Consider two deployments under the same functional requirements.

**Option A:** each monitor sends observations directly to a remote service. This removes a separately managed gateway from the path. It places the communication and identity responsibilities on each device and its service relationship.

**Option B:** monitors send observations to a site gateway that stores and forwards them. This can consolidate communication and preserve some history through a remote outage. It adds local storage, gateway maintenance, and a shared dependency. A failed gateway may affect many monitors.

The decision cannot be made from the word “IoT.” First establish whether the devices support the remote interface, whether connectivity interruptions matter, and whether someone can maintain the gateway. Next establish what the application must deliver during an outage. Preserving observations for later trend analysis is different from delivering an immediate notification.

A gateway with a buffer can address the first requirement without addressing the second. If nobody can receive the notification while disconnected, later replay does not restore the missed opportunity to respond. This counterexample shows why a useful architecture starts from an application contract, rather than a preferred technology.

### Worked reasoning: freshness is separate from delivery

Assume a constructed application evaluates a reading at **12:00:10**. The observation was acquired at **12:00:00** and arrived at **12:00:09**. Assume synchronized clocks and negligible timestamp uncertainty for this exercise. The application permits observations no older than **5 seconds**.

The observation's age at evaluation is:

**age = evaluation time − measurement time = 10 seconds**

Its age exceeds the assumed limit, so it cannot support the application's “current condition” decision. Arrival only one second earlier does not make the measurement one second old. It can still contribute to historical analysis if that use accepts older data.

The 5-second limit is an invented application requirement. There is no universal IoT freshness limit. In a real contract, clock uncertainty and the interval between sensing and timestamp assignment also matter. When that uncertainty crosses the allowed age boundary, the decision needs an explicit policy for uncertain freshness.

This reasoning separates four terms: sampling interval, communication delay, observation age, and decision deadline. Increasing the sampling rate does not remove a long transmission queue. Reliable delivery does not make old information timely.


<div class="iot-controls"><button type="button" class="iot-reset" data-iot-reset="iot-study-freshness">Reset timeline</button></div>

<figure id="iot-freshness-scene" class="scene iot-scene" data-scene="iot-study-freshness" data-label="Illustrative observation age increases from measurement through arrival to evaluation">
  <div class="scene__stage"><picture><source media="(max-width: 679px)" srcset="/images/iot-handbook/IOT-001/fig-3-freshness-compact.svg"><img src="/images/iot-handbook/IOT-001/fig-3-freshness.svg" alt="Static alternative: the observation is already too old for this decision when it arrives."></picture></div>
  <figcaption class="evidence-caption">Illustrative teaching model, initially paused. Sequence: measured at age zero → assumed age limit passes → received at age nine seconds → evaluated at age ten seconds. Receipt does not reset the measurement time. The prose and static figure carry the same lesson.</figcaption>
</figure>

## 6. Interoperability: Agreement at Several Levels

Interoperability requires enough agreement for participants to exchange and use information correctly. We will distinguish three levels for study:

- **Communication:** participants can establish the required exchanges.
- **Representation:** participants agree on encoding, field structure, and data types.
- **Meaning:** participants agree on quantity, units, identity, location, time, and behavior.

Standards may group these three levels differently. The distinction helps identify what two participants have actually agreed on.

Two devices may use the same transport and JSON encoding while assigning different meanings to `temperature`. One may report air temperature in degrees Celsius, the other equipment temperature in degrees Fahrenheit. Both messages can be syntactically valid. An application comparing their numbers directly is still wrong.

W3C WoT provides an interaction model with **Properties**, **Actions**, and **Events**. A Property exposes state, an Action invokes functionality, and an Event provides asynchronous notifications. Thing Descriptions describe interaction affordances and supporting metadata; protocol bindings connect interaction descriptions to concrete protocols. This complements existing IoT technologies. [WoT Architecture 1.1, §§6.1, 6.5, and 6.7](https://www.w3.org/TR/2023/REC-wot-architecture11-20231205/#interaction-model).

For a constructed monitor, current temperature might be exposed as a Property, a requested calibration procedure as an Action, and an alarm notification as an Event. These are possible interface choices. A time-series sample can also be communicated as an Event, so “measurement” does not map exclusively to Property.

A description helps consumers understand how to interact. It does not independently prove that a sensor is calibrated or that an Action achieved a physical outcome. Metadata and measurement evidence serve different purposes.

### Protocols occupy part of the architecture

MQTT 5.0 specifies publish/subscribe messaging with three delivery QoS levels. CoAP's base specification describes a constrained application protocol with request/response semantics and confirmable-message exchanges. These are application-protocol choices, not complete IoT system architectures. [OASIS MQTT 5.0, §§1 and 4.3](https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html); [RFC 7252, §§2 and 4](https://www.rfc-editor.org/info/rfc7252/).

MQTT's “exactly once” QoS concerns its message-delivery exchange. It does not mean a separate actuator changed the world exactly once. In CoAP, an empty acknowledgement can precede a separate response; message acknowledgement and application response are distinct protocol concepts. Neither protocol can establish a physical outcome without an application-specific evidence path. [MQTT 5.0, §4.3.3](https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html); [RFC 7252, §5.2.2](https://www.rfc-editor.org/info/rfc7252/).

Choose a protocol by the required interactions and constraints, then specify the remaining application semantics. A broker, a resource endpoint, a data schema, and an authorization rule have different responsibilities even when one product implements several of them.

## 7. Reliability: Identify What Must Continue

Reliability reasoning begins with a named service and its conditions. “The system is available” is incomplete until we know whether that means local sensing, remote visibility, timely notification, control, or historical retrieval.

Consider these constructed failures:

| Failure | Possible consequence | Responsibility to make explicit |
|---|---|---|
| Sensor stops updating | Application may display a plausible old value | Detect freshness and distinguish missing from current data |
| Network disconnects | Remote information or commands may stop | Define local behavior and disconnected-data policy |
| Device restarts | Volatile state and communication sessions may change | Define initialization and state recovery |
| Gateway fails | Several devices may lose a shared path | Identify dependency scope and recovery ownership |
| Command response is lost | Sender may not know whether an operation occurred | Define reconciliation and retry semantics |
| Storage fills during outage | Old or new observations may be discarded | Bound capacity and define the loss policy |

Select the failures relevant to the deployment and consequence being studied.

A retry is an application decision. Repeating “set desired temperature to 20 °C” and repeating “dispense one unit” have different meanings. Even a state-setting operation can become inappropriate when delayed past its validity period. Duplicate handling, validity, and recovery need a contract that extends beyond successful transmission.

Unknown outcomes deserve representation. If a response is missing, the sender may have evidence of neither success nor failure. Reporting failure as certainty can invite an unsafe retry; reporting success as certainty can hide a missed action. A system can instead expose uncertainty and use reconciliation or a relevant new observation to narrow it.

Observability should follow the same boundaries. Device health, communication status, application processing, and process outcomes answer different questions. A connected device may have a broken sensor. A healthy remote service may hold stale observations. A dashboard that combines these into one green indicator discards information needed for diagnosis.

## 8. Security, Privacy, and Lifecycle

An identifier answers “which entity?” Authentication establishes evidence of identity under a mechanism. Authorization determines which operations that identity may perform. Keeping these concepts separate matters when equipment is installed, replaced, transferred, or retired.

NISTIR 8259A's **2020 device cybersecurity core baseline** organizes six capability areas: device identification, device configuration, data protection, logical access to interfaces, software update, and cybersecurity state awareness. The baseline is a starting point for requirements, rather than a guarantee that any device offering six labeled features is secure. Later NIST catalogues may expand the taxonomy; the six-area list here is specifically the 2020 document. [NISTIR 8259A, §2 and Table 1](https://doi.org/10.6028/NIST.IR.8259A).

Follow a device through a conceptual lifecycle: selection, onboarding, operation, maintenance, and retirement. This sequence is a teaching organization. At selection, establish whether the equipment can meet the required support and security needs. At onboarding, establish identity and authorized configuration. During operation, protect interfaces and monitor relevant state. During maintenance, manage changes and updates. At retirement, resolve credentials, stored information, and any remaining service relationships.

A system with protected remote APIs can still have an exposed local configuration interface. A device with signed updates can still be operated under a weak authorization policy. Security is a relationship among capabilities, configuration, people, and consequences.

Privacy also extends beyond personal names. A stream of room-occupancy observations may reveal activity patterns. The data's value to an application does not settle who should have access, how long it should be retained, or which uses are permitted. Those decisions require an explicit purpose and policy.

NISTIR 8228 discusses how IoT's physical interactions and management differences affect cybersecurity and privacy risk. Protecting information and preserving physical operation can require different considerations from conventional IT. [NISTIR 8228, §3](https://doi.org/10.6028/NIST.IR.8228).

For this introductory chapter, learn to identify the boundary and consequence. A full safety assessment, industrial security profile, radio approval, or sector-specific regulatory assessment requires the relevant domain standards and expertise. None is established by calling a design “IoT” or by drawing a layered architecture.

## 9. Study Questions and Worked Answers

Attempt the questions before reading the answers. They assess conceptual reasoning and require no hardware.

### Questions

1. A monitor sends measurements to a local application over a private network. It has no actuator and no cloud account. Is it an IoT system under this chapter's working definition? Which details would matter under a different definition?
2. A gateway translates a device protocol, stores observations, and runs alarm logic. Does this contradict a four-layer reference model?
3. A temperature observation was measured at 09:15:00, received at 09:15:08, and evaluated at 09:15:12. Assume synchronized clocks and a maximum permitted age of 10 seconds. Can it support the current-condition decision?
4. A valve command was delivered with MQTT QoS 2. The application reports success. What additional question must you answer before concluding that the intended flow occurred?
5. Two monitors publish the same field name through the same protocol. What information is still needed before their readings can be compared?
6. An application must notify a remote operator within 30 seconds of a condition change. A gateway buffers every observation during an hour-long remote outage. Has the requirement been met?
7. A connected controller continues a local feedback loop while its remote application is unavailable. Which responsibilities must still be distinguished?
8. A building monitor is replaced, and the old device is retired. What responsibilities must be resolved for identity, permissions, software support, and stored information?

### Worked answers

**1.** Yes. It combines physical sensing, networking, and an application. Actuation and cloud hosting are optional. When using another definition, check its scope for physical and virtual things, device capabilities, and the role of communication. A vocabulary choice should be explicit rather than inferred from a brand or topology.

**2.** No. Functional layers are not machine boundaries. One deployment component can realize communication, service-support, and application functions. The deployment still needs clear interfaces and responsibilities among those functions.

**3.** The observation is 12 seconds old at evaluation, exceeding the assumed 10-second limit. Its four seconds since arrival do not determine measurement age. It may still be useful as historical data. The answer changes only if the actual requirement or timestamp assumptions change.

**4.** Ask what “success” means in that application's contract and what evidence concerns the physical process. Message delivery and an application response do not, by themselves, establish flow. Valve position can support one claim; a relevant flow observation supports another. Freshness and measurement limitations still apply.

**5.** Establish the quantity, unit, identity, measurement location, measurement time, and relevant quality information. Matching transport and syntax do not establish matching meaning. Even matching units do not make two different physical locations interchangeable.

**6.** No. Buffering can preserve history, but the stated remote notification deadline was missed. The architecture needs a feasible timely notification path or a revised requirement. Replay cannot make the original notification timely.

**7.** Distinguish immediate control decisions, remotely supplied goals, authority to change them, reporting, and recovery after reconnection. Determine whether the controller can continue meeting its local contract and how old remote commands or conflicting state will be handled. Remote outage tolerance is a claim about defined behavior, rather than an automatic property of local placement.

**8.** Establish the replacement device’s identity and authorize it for its intended role; do not assume the old device’s permissions transfer automatically. Resolve the old device’s credentials and service access so retirement removes its authority to participate. Confirm who will configure, update, and monitor the replacement over its support life. Decide what to retain, transfer, or erase from the old device and associated services under the data policy. Physical replacement, authorization, software support, and information retention are separate lifecycle responsibilities.

## 10. Glossary

| Term | Working meaning in this chapter |
|---|---|
| Thing | Entity of interest; physical or virtual depending on the cited vocabulary |
| IoT device | Equipment within the scope of the selected device definition |
| IoT system | A system combining networked devices that sense or affect the physical world with the software, communications, and operational responsibilities needed to deliver an application |
| Sensor | Component producing information about a physical quantity or condition |
| Actuator | Component changing a physical condition |
| Firmware | Software operating close to device hardware |
| Telemetry | Communication of observations or device information |
| Gateway | Component mediating an interface between participants or technologies |
| Edge computing | Processing placed near the source or use of information |
| Reference model | Abstract concepts and relationships for reasoning |
| Reference architecture | Architectural vocabulary and reusable organization |
| Deployment architecture | Assignment of functions to actual equipment and services |
| Feedback | Information used to assess state or response and, in a closed loop, influence control |
| Freshness | Whether information's age is acceptable for a stated use |
| Interoperability | Ability to exchange and correctly use information under agreed contracts |
| Authentication | Establishing evidence of identity under a mechanism |
| Authorization | Determining which operations an identity may perform |
| Lifecycle | Responsibilities spanning selection, onboarding, use, maintenance, and retirement |

## 11. What the Foundation Lets You Explain

An IoT system is understood through its purpose, physical and digital participants, functional responsibilities, deployment, and contracts. A component list alone does not explain how observations become useful information or how requested operations relate to physical outcomes.

Reference models provide vocabulary. Deployment decisions allocate work under constraints. Data and interaction contracts establish meaning. Reliability, security, and lifecycle reasoning establish what must hold as equipment and communication conditions change.

When studying an unfamiliar system, begin with five questions: What is its purpose? What does it observe or affect? Which functions run where? What do its exchanges establish? Who owns its behavior during failure and change? The answers produce a useful architecture before selecting a platform.

## Further Reading

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
| 1.0 | 2026-10-12 | Prepared independent, standards-grounded study material after author approval and three review lenses; aligned the glossary, added a lifecycle exercise, and tightened repeated scope caveats |
| 1.1 | 2026-10-12 | Redesigned compact return paths and causal motion; added an explicit freshness threshold, shared visual styling and equivalent static fallbacks |
