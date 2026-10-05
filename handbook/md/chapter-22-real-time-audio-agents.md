# Chapter 22: Real-Time Audio Agents: Keeping Conversation and Work in Sync

**Reading time:** 46 min | **Last revised:** 2026-10-02 | **Version:** 1.1

## If You Only Read One Section

A spoken agent has three clocks. The **conversation clock** decides when to listen, yield and answer. The **task clock** decides when work is admitted, authorized and completed. The **playback clock** decides what actually reaches the user's ears. They advance independently.

A user can interrupt a sentence while the underlying task keeps running. A task can finish while the browser is disconnected. A speech model can generate "done" before the executor has a receipt. Collapsing those events into one state transition produces a system that can tell a plausible lie.

The design I develop here separates fast spoken interaction from durable work. The conversation controller has three routes: a talk lane for conversation, a fast lane for authorized state it already has, and a consult lane into the governed agent. Longer work returns a durable ticket promptly. Its eventual result is presented with the original question when the user has room to hear it.

Accepted requests carry identities and revisions; outgoing speech carries a playback generation. Consequential approvals bind the exact action in a trusted interface. Full results and receipts remain in the agent's record, while the spoken response is a short, evidence-preserving projection of them.

The rule that carries this chapter: **speech expresses intent; the task record establishes what happened; playback establishes what was presented.** A natural voice is useful only while those three remain consistent.

## Prerequisites

- [Chapter 1: The ReAct Pattern](/handbook/chapter-01-react-pattern.html): the reasoning/tool loop that live conversation must be able to outlast.
- [Chapter 5: Tool Use and Skill Registries](/handbook/chapter-05-tool-use-skill-registry.html): narrow callable interfaces and their execution contracts.
- [Chapter 7: Human-in-the-Loop](/handbook/chapter-07-human-in-the-loop.html) and [Chapter 9: Safety & Guardrails](/handbook/chapter-09-safety-guardrails.html): exact approvals and enforced authority.
- [Chapter 8: Observability & Evaluation](/handbook/chapter-08-observability-evaluation.html): measuring the outcome independently of the model's account of it.

---

An operator asks a voice agent, "Why is oxygen falling in pond seven?"

The agent says, "Checking." While the investigation runs, the operator asks whether aerator two is on. Then: "Actually, check pond three instead."

The old investigation returns first. The voice announces, "Pond seven is low. I'll restart aerator two." The operator interrupts after "restart" and says, "No, stop." Playback stops. The operator assumes the action stopped too.

The dashboard subsequently shows that aerator two restarted. The investigation concerned the wrong pond, the voice treated its own proposed remedy as permission, and "stop" affected the speaker without resolving the task.

This is a **constructed incident**, not a report of a deployed Tamoz failure. It combines races a text-only test rarely exposes. The example assumes a separately qualified operational system beneath the voice interface. A voice frontend alone does not establish physical-control safety.

<figure class="scene" data-scene="audio-incident" data-requires-js data-label="Animated illustration of the constructed incident in two designs side by side. The operator asks about pond seven, then corrects to pond three, then says no, stop. In the collapsed design with one conversation identifier, the old pond seven result is spoken, the voice's own phrase I'll restart becomes the action, and stop only silences the speaker: the dashboard later shows aerator two restarted. In the separated design, the request revision moves from v1 to v2, the v1 result and its proposed restart are held, stop clears the sound, and no action was admitted.">
  <div class="scene__stage" style="--aspect: 1.95; --aspect-compact: 0.9"></div>
  <figcaption class="evidence-caption">Illustrative animation of the constructed incident above, time-compressed. Collapsed: one identifier for requests, approvals and speech. Separated: the design this chapter develops.</figcaption>
</figure>

The five-whys diagnosis is revealing. Why did the operator receive the wrong result? A corrected request did not invalidate old presentation. Why did the agent restart equipment? A conversational phrase crossed the effect boundary. Why did "stop" appear successful? Playback state was substituted for task state. Why were those substitutions possible? One conversation identifier was being used for requests, approvals and speech. Why had the design collapsed them? It was built as an audio wrapper around a synchronous agent call, with no controller owning the relationships between the clocks.

Better transcription would not repair that architecture. The solution begins with ownership, identities and state transitions; audio quality comes after them.

## 1. Real-Time Voice Changes the Unit of Work

### Audio Is Continuous; Requests Are Accepted

In text chat, pressing Send is a strong boundary. Audio arrives as frames while the user is still deciding what to say. **Speech-to-text (STT)** turns sound into text; **automatic speech recognition (ASR)** names the recognition process. Neither makes a fragment executable.

"Restart aerator two..." may continue with "...if the current is still zero," "...tomorrow," or "...no, don't restart anything." A transcript that appears complete can still omit the qualifier that changes the requested action.

A provisional input buffer supports captions and interpretation. An **accepted request** exists only when the application has enough evidence to identify the user's intended task, resolve critical ambiguity and assign a version. The acceptance policy can use a provider-final transcript, explicit push-to-talk release, semantic turn completion or a clarification exchange. A provider's `final` marker ends its recognition segment; it does not certify the user's intent.

Acceptance is admission to a workflow, not authorization to execute every proposed effect. A request to "fix it" can become an accepted investigation whose eventual write still requires policy and approval. Conversely, harmless conversation need not become a backend task at all.

This distinction permits speculation without speculative authority. An authorized read-only retrieval can begin while the user is finishing a sentence, within a bounded wasted-work budget. A changed interpretation invalidates its result. Purchases, deletions and actuator commands remain outside this speculative path.

### Detecting Sound Is Different from Detecting a Turn

**Voice activity detection (VAD)** estimates when speech starts and stops. Acoustic VAD uses signal features and pauses; semantic endpointing adds evidence about whether the utterance seems complete. Short silence thresholds reduce waiting but cut off people who pause. Longer thresholds preserve pauses but create dead air.

OpenAI documents acoustic `server_vad` and `semantic_vad`, with controls for automatic responses and interruption. Those are provider capabilities, not proof that the user's task is complete or approved. [Realtime VAD documentation](https://developers.openai.com/api/docs/guides/realtime-vad).

A **backchannel** is a short listening signal such as "mm-hmm" or "right." It often means "continue," not "start another task." A cough, another person's conversation and loudspeaker echo are other reasons that detected activity should not become a request. Turn-taking needs a policy for speech addressed to the agent, not just a microphone threshold.

For endpointing, I distinguish five observable errors: premature turn end, late turn end, missed interruption, false interruption and accidental task admission. Each category needs separate measurement per acoustic and language condition. Average response time alone can hide a system that habitually cuts off one group of speakers.

### Critical Slots Matter More Than Average Transcription

**Word error rate (WER)** is `(substitutions + deletions + insertions) / reference words`. It measures recognition disagreement, not business correctness. One changed digit in an otherwise accurate sentence can target the wrong account. Several harmless wording errors can preserve the entire request.

**Critical-slot fidelity** measures exact target identity, amount, unit, date, negation and condition, or an explicit clarification before use. In the pond example, the application resolves "pond seven" against authorized entity records and displays the resolved identifier. If the evidence cannot distinguish "three" from "seven," the ambiguity requires clarification. A model's verbal confidence is not a calibrated probability.

An Arabic corpus needs the declared dialects, Modern Standard Arabic where relevant, technical English terms and code-switching. A German corpus needs spoken numbers, names and domain terms. Both need speakers who pause, correct themselves or cannot comfortably use rapid speech. The interface should offer captions, push-to-talk, repeat and a text path without requiring the user to restart the task.

The source fragment, normalized request and resolved slots remain distinguishable. The application can normalize "tomorrow morning" into a date only with a known timezone and a clarification of any consequential ambiguity. The interpreted date needs its provenance; otherwise a later auditor sees a precise value with no explanation of how it entered the task.

## 2. Choose the Architecture by the Contract You Need

There are three useful architecture families. They describe ownership, not a ranking from obsolete to modern.

<div class="table-scroll table-scroll--wide" role="region" aria-label="Family, Flow, Main advantage, Main obligation" tabindex="0" markdown="1">

| Family | Flow | Main advantage | Main obligation |
|---|---|---|---|
| Chained | Streaming STT → text agent → text-to-speech | Inspectable text boundary; independently replaceable stages | Coordinate partial input, output and cancellation across stages |
| Native speech-to-speech | Audio → conversational model with tool calls → audio | Spoken interaction and tool selection in one session | Keep task authority and truthful outcomes outside model discretion |
| Speech frontend with delegated backend | Conversational speech model ↔ controller ↔ existing agent | Conversation can continue while governed work runs | Align spoken context, accepted requests, tickets and returned results |

</div>

**Text-to-speech (TTS)** renders text into audio. A chained architecture can stream all three stages; it need not wait for a complete paragraph at each boundary. Native speech models can preserve vocal information that a plain transcript discards. A delegated design keeps detailed reasoning and tool execution in the existing backend while the frontend manages conversational timing.

OpenAI's architecture guide distinguishes chained workflows, Realtime speech-to-speech and GPT-Live with a separate backend. This chapter uses those as concrete examples; its controller rules apply across providers. [Voice agents architecture guide](https://developers.openai.com/api/docs/guides/voice-agents).

A narrow booking assistant might safely use one native model and a few application-executed functions. An engineering assistant that investigates a repository for minutes usually benefits from a separate spoken frontend. There is no general law that one model cannot do both jobs. The reason to separate them is the workload's timing and governance contract.

A chained baseline provides an inspectable reference for task fidelity and can be preferable for exact wording, an offline requirement or a language that a native model handles poorly. Local STT and TTS are deployment choices; their latency depends on models, hardware, streaming and load. A claim that local voice is inherently incapable of natural conversation needs measurements from the selected system.

### Media Transport and Agent Transport Are Different

**WebRTC** provides negotiated real-time media transport commonly used in browsers. **WebSocket** provides a persistent bidirectional message connection; with server-side audio it also leaves more media buffering and playback work to the application. **SIP**, the Session Initiation Protocol, is a signaling route for telephone integration.

A browser can send media directly to a provider while the application server maintains a **sideband** control connection to the same session. The server then handles private context and tools without proxying every audio frame. OpenAI's Realtime starter documents server-created ephemeral credentials and WebRTC/browser or WebSocket/server connections. [Realtime getting started](https://developers.openai.com/api/docs/guides/realtime).

Direct media reduces gateway work; it also sends microphone audio to the provider before the application can inspect its meaning. If policy requires inspection before any external audio transfer, a downstream transcript filter is too late. That requirement calls for local processing or a controlled relay, with the added buffering included in the latency measurement.

Ephemeral provider credentials authorize a bounded provider connection. They do not authorize workspace access. The broker must authenticate the user, bind the session to the principal, restrict the configuration and budget, and retain long-lived provider credentials on the server. The executor separately authorizes each private-data read and action.

### The Media Contract Beneath the Words

The audio adapter needs a small explicit contract: negotiated codec, sample rate, channel count, sample representation, capture timestamps, buffering limit and device/disconnect behavior. Decoding and resampling belong at a named boundary. Feeding 8 kHz phone samples into a component expecting 24 kHz PCM creates distortion that a language-model change cannot repair.

**Acoustic echo cancellation (AEC)** reduces microphone capture of loudspeaker output. Browser capture exposes an echo-cancellation constraint, but selected settings and real-room performance still need verification. [W3C media capture constraints](https://www.w3.org/TR/mediacapture-streams/#dom-mediatrackconstraintset-echocancellation). Without effective echo handling, the assistant hears its own reply as new speech, yields to itself and can admit an accidental task. A headphone baseline helps isolate that failure before a comparison with speaker mode and the actual capture configuration.

A **jitter buffer** smooths variable arrival time before playout. Larger buffers can reduce underruns while delaying both responses and interruption. Their size and queued duration need explicit bounds, and invalidation clears every owned output queue. An **underrun** means playback lacked enough samples. The media recovery policy can pause, rebuffer or report media trouble; none of those states establishes that the task failed.

The browser/player owns capture devices and actual playout; the media adapter owns format conversion and its queues; the controller owns session recovery and semantic routing. Device loss stops stale output and makes text available while preserving task state. Echo-triggered interruptions, conversion failures, queue duration and underruns are separate measurements from endpointing and backend latency. These few mechanics explain many apparently intelligent-agent failures before another prompt change is justified.

### Pin One Provider Contract at a Time

Realtime and GPT-Live are separate interfaces. Producing audio does not make their event names, lifecycle limits or billing contracts interchangeable.

In OpenAI's current Realtime flow, function output is sent as `conversation.item.create` with a `function_call_output`, followed by `response.create`. The same documentation describes a maximum 60-minute Realtime session. Those facts belong to that API, not to all spoken sessions. [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations).

With GPT-Live client delegation, the application maintains conversation context; a delegation event supplies metadata rather than the complete task text. It must reconstruct a request from transcripts and application state. Backend work can outlive a conversational interruption. [GPT-Live delegation](https://developers.openai.com/api/docs/guides/live-delegation).

These differences change adapter design. A Realtime function can return a ticket promptly and deliver the completed result later. A delegated interface may already permit ongoing conversation, but still needs durable application identity and result relevance checks. Responsiveness depends on documented adapter behavior, including what happens while a function call is pending.

## 3. The Conversation Controller Owns the Relationship

The **conversation controller** is application code that connects spoken interaction to governed work. It routes requests, tracks tickets, arbitrates when results may be presented and maintains the mapping among session, thread, principal, request and playback generation.

It should be small enough to inspect. It should not grow a second business executor, policy engine or durable agent memory merely because it can receive model events.

<figure class="diagram-panel audio-agent-figure">
  <picture>
    <source media="(max-width: 599px)" srcset="/images/handbook/HDBK-022-controller-mobile.svg" />
    <img src="/images/handbook/HDBK-022-controller.svg" alt="Media connects the user and speech frontend. The controller routes talk, authorized fast context and durable work to their owners." loading="lazy" />
  </picture>
  <figcaption>Figure 1: The media path is separate from task authority. The controller routes requests and results; the governed agent owns business effects and receipts.</figcaption>
</figure>

The arrows are logical relationships, not a prescribed network topology. In a direct WebRTC deployment, the browser/provider media path and the server control path are separate. In a chained deployment, the application may own all media stages.

### Three Lanes, Three Promises

<div class="table-scroll table-scroll--wide" role="region" aria-label="Lane, What may answer, Examples, Evidence and authority" tabindex="0" markdown="1">

| Lane | What may answer | Examples | Evidence and authority |
|---|---|---|---|
| Talk | Speech frontend | Greeting, clarification, repeating an available result | No private factual invention; no business effects |
| Fast | Controller's authorized projection | Task status, recent result, known session context | Bound principal, freshness, version and source |
| Consult | Governed backend agent | Investigate, retrieve missing evidence, propose or execute approved work | Normal admission, budgets, policy and receipts |

</div>

The lanes prevent an expensive investigation from occupying the conversation's timing loop. "I am checking" can be prompt; "the motor has stopped" must wait for the corresponding evidence.

The fast lane is easy to misuse. A cached value is fast because someone previously observed it, not because it is presently true. Each value carries `observed_at`, source version, applicable scope and validity. "Last reported at 10:42" is the truthful answer when that is what the evidence supports. A freshness requirement beyond the cache's contract routes the request to the consult lane. Read authorization applies on a hit just as on a miss; a remembered result is still private data.

Outstanding work has explicit limits. A pilot might permit three read-only tickets per session and one serialized mutation lane, but those are proposed workload choices, not universal defaults. Read-only tasks can still exhaust budgets or expose data. At capacity, the existing tasks remain visible and the user chooses what to replace. Admission does not silently create an unbounded queue.

### A Ticket Is a Durable Promise

The **ticket pattern** returns a stable handle as soon as work is durably accepted, allowing conversation to continue while execution proceeds. The acknowledgement must reflect the state reached: "queued" if admitted to a queue, "running" only after worker evidence, and "preparing your request" if admission has not completed.

The gap between writing a gateway ticket and admitting the task creates a specific failure window. If the controller says "started" and crashes before the backend accepts it, the user owns a phantom task. One transactional admission boundary closes that window where available. Otherwise, a durable local handoff record allows reconciliation against a backend request identity. An in-memory promise is insufficient.

Application identity is the basis for deduplication. Utterance similarity and short time windows cannot distinguish an intentional repeat from a delivery retry. Two requests to inspect the same pond may be deliberate. A retry of the same accepted request must return the same ticket. The same identity with different accepted content must produce a conflict. Provider event IDs help detect delivery duplicates; they do not replace the stable application request identity.

<figure class="diagram-panel audio-agent-figure">
  <picture>
    <source media="(max-width: 599px)" srcset="/images/handbook/HDBK-022-tickets-mobile.svg" />
    <img src="/images/handbook/HDBK-022-tickets.svg" alt="Accept request, durably admit a ticket, continue the conversation, then check scope and relevance before speaking the result." loading="lazy" />
  </picture>
  <figcaption>Figure 2: A ticket lets conversation continue while work runs. The acknowledgement follows durable admission; the returned result is checked before speech begins.</figcaption>
</figure>

### Results Need a Speaking Policy

A result arriving on a socket is not permission to seize the floor. The controller checks whether the user is speaking, whether assistant playback is active, whether the question remains relevant and whether a more urgent item is waiting.

A small priority queue orders approval prompts, requested results, configured operational alerts and progress. Related arrivals can be coalesced; queue age and rate remain bounded. Each spoken result carries its original question. Superseded progress drops out, while durable results remain on the task board even when they are no longer spoken.

Silence alone is insufficient if the user is composing a thought. The acoustic trial measures pause duration against false takeovers. A short fixed window can be an initial experiment; it is not a law of conversation. Urgent alerts need an explicitly selected interruption policy, rather than inheriting the politeness policy for routine progress.

Progress must describe observed work: "the query is running" or "waiting for approval." Imaginary internal steps provide filler rather than useful status. For a long investigation, truthful on-demand status plus visible work often serves the user better than repetitive spoken updates.

### One Conversation, End to End

The following **constructed event ledger** shows how the design handles the opening incident. `r7` is a stable logical investigation, `v` its accepted revision, `g` the media output generation and `o` the active owner epoch. Another still-relevant ticket would remain in the request map; "latest question" is not the relevance rule. No physical action is requested in this walkthrough.

<div class="table-scroll table-scroll--wide" role="region" aria-label="Event, Recorded boundary, User-visible behavior" tabindex="0" markdown="1">

| Event | Recorded boundary | User-visible behavior |
|---|---|---|
| "Why is pond seven..." arrives | Provisional input only | Caption; no task admission |
| "...oxygen falling?" completes and target resolves | Accept `r7/v1`; authenticated scope already bound | Show accepted pond 7 question |
| Backend durably admits `t7` | `r7/v1 → t7`, queued | "I've queued the pond 7 check" |
| "How's that going?" | Fast query of observed `t7` state | "It's running" only if worker state supports it |
| "Actually, check pond three instead" | Accept `r7/v2`; redirect through backend; invalidate old presentation | Show pond 3; acknowledge the accepted redirect |
| Result for `r7/v1` arrives | Retain old result/receipt; revision mismatch | Old pond 7 result remains in history, is not spoken |
| Result for `r7/v2` arrives | Durable current result; speech attempt `o3/g4` | At a pause: "About pond 3..." |
| User interrupts the sentence | Clear player; advance to `g5` | Stop sound; backend result remains completed |
| User asks "What did you find?" | Recall authorized current result; create fresh `o3/g5` speech attempt | Summarize pond 3 from the same evidence |
| Connection fails before the replay finishes | Close old media owner; task result unchanged | Text history remains available |
| Reconnect authenticates current access | New owner `o4`; current-ticket briefing | "The pond 3 investigation completed"; no replay of old buffers |

</div>

The dispatch rule is short: input fragments update provisional interpretation; accepted requests enter durable admission; observed task events update projections; current results become pending presentation; media events invalidate or schedule speech attempts. Every delayed release rechecks scope, owner, revision and generation. These events share a trace but do not share permission to change each other's state.

<figure class="scene" data-scene="audio-clocks" data-requires-js data-label="Animated illustration of the event ledger above as three lanes: conversation, task and playback. The pond 7 question is accepted and the ticket is durably admitted before the acknowledgement plays; a correction moves request r7 from v1 to v2 and the v1 result is kept but not spoken; a barge-in clears playback and advances the generation from g4 to g5 while the task result stays completed; a reconnect moves the media owner from o3 to o4 and the briefing is rebuilt from the task record.">
  <div class="scene__stage" style="--aspect: 2.05; --aspect-compact: 1.15"></div>
  <figcaption class="evidence-caption">Illustrative animation of the constructed ledger above, time-compressed. Identifiers follow the table; the timing is not a measurement.</figcaption>
</figure>

## 4. Keep Three State Machines and Their Identities

The clocks become tractable when each has a state machine and a clear owner. These states describe logical dimensions; they need not be implemented as three unrelated services.

<div class="table-scroll table-scroll--wide" role="region" aria-label="Dimension, Typical states, Owner, What the state cannot establish" tabindex="0" markdown="1">

| Dimension | Typical states | Owner | What the state cannot establish |
|---|---|---|---|
| Conversation | Connecting, listening, assembling, speaking, interrupted, reconnecting, closed | Session/controller | Whether a business effect happened |
| Task | Accepted, queued, running, waiting approval, cancel requested, completed, cancelled, failed, unknown | Governed task runtime | Whether the user heard its result |
| Playback | Preparing, buffered, playing, cleared, finished, failed | Player/media bridge | Whether the underlying task was cancelled |

</div>

Full-duplex media permits listening and speaking to overlap. A single `is_speaking` flag therefore cannot describe the complete conversation. User speech, assistant output and task activity are separate dimensions from which the interface state is derived.

The **unknown outcome** state means that an effect may have occurred but the executor lacks sufficient evidence to classify it. A timeout after a remote write can lead there. It is different from failed, and retrying it as though nothing happened can duplicate the action. Reconciliation belongs to the executor's effect journal, as developed in [Chapter 9](/handbook/chapter-09-safety-guardrails.html).

### The Identity Map

Each identifier has a distinct purpose and an explicit relationship to the others.

```text
authenticated principal + authorized workspace
  durable conversation/thread
    accepted request ID + accepted revision
      backend ticket/task ID + effect receipts
        selected result revision + evidence references

active media session + owner epoch
  output generation
    speech item/segment ID + playback observations

approval ID -> exact action digest + request revision + expiry
```

A **request revision** identifies the accepted interpretation of one task. A **generation fence** is a monotonically changing value that invalidates presentation prepared under an earlier context. An **owner epoch** identifies which active controller/player owner is allowed to produce output after reconnect or failover.

These scopes matter. Barge-in should advance the output generation without automatically advancing the task revision. A correction changes the applicable request revision and invalidates speech about that request. Reconnect changes the media owner without inventing a new backend task. One global counter would erase those distinctions.

Event admission and delivery resolve ownership from authenticated server state. Speech release compares the segment's owner epoch, generation, request and revision against the current projection. Before dispatching an effect, the executor rechecks its own authority and action version. No one presentation check substitutes for an executor check.

### Durable Records and Projections

Accepted requests, task transitions, results and receipts are durable records under their owning runtime. The task board, spoken summary and session briefing are **projections**: bounded views derived from those records. They can be rebuilt after failure. They must not become alternative truth stores with competing task status.

The transcript also needs internal distinctions. Recognized user text, accepted interpretation, generated assistant text and playback annotations describe different stages. A provider caption is useful evidence of what a model produced; it is not automatically a verbatim recording of what the user heard. A durable "conversation" need not retain every noise fragment forever.

On reconnect, the controller fetches current task state and reconstructs a concise briefing. "The pond 7 check completed while you were disconnected" is better than replaying the unplayed half of a sentence. Pending approvals return only if their exact action and expiry remain valid. Read scope comes from current policy, not a serialized browser claim.

A lease and owner epoch establish one active media owner. Validation at output and admission rejects events from an obsolete owner. Local generation fencing prevents stale audio in one player; distributed ownership also requires authoritative lease checks. A process-local counter cannot fence a second machine.

<figure class="diagram-panel audio-agent-figure">
  <picture>
    <source media="(max-width: 599px)" srcset="/images/handbook/HDBK-022-three-clocks-mobile.svg" />
    <img src="/images/handbook/HDBK-022-three-clocks.svg" alt="Barge-in advances playback generation. A correction changes one request revision. Reconnect changes the media owner while preserving durable work." loading="lazy" />
  </picture>
  <figcaption>Figure 3: Interruption changes playback, correction changes intent, and reconnect changes media ownership. None of those events rewrites an effect receipt.</figcaption>
</figure>

## 5. Interruption, Correction and Cancellation Are Different Operations

### First Stop the Sound

**Barge-in** is the user starting to speak while assistant speech is playing. The immediate requirement is to stop stale sound. The media/player boundary detects the interruption, invalidates its output generation, clears queued samples and requests provider/TTS cancellation where supported.

A worker's stop poll, a database round trip and a new model response all concern slower work. Waiting for them would leave stale audio playing. The player has the samples; the player must stop them. Stop latency ends at the final stale sample actually played, including device buffering. The time the controller issued a cancellation command does not establish that endpoint.

OpenAI documents automatic unplayed-output truncation for Realtime WebRTC/SIP and application-managed playback/truncation for WebSocket. That provider conversation correction helps align later responses with playback; it does not cancel application work. [Interruption and truncation](https://developers.openai.com/api/docs/guides/realtime-conversations#interruption-and-truncation).

Clearing a queue once is insufficient. Late network frames, late synthesis and a late output-check result can refill it. The invalidated generation travels through every asynchronous stage. A stale segment is discarded even if its synthesis or content check eventually succeeded.

Interruption discards the speech attempt while preserving a still-relevant result. If useful presentation was unfinished, the result remains pending under a bounded presentation policy. The next appropriate pause or explicit recall creates a fresh summary in the new generation. A redirected or suppressed result remains in history and does not automatically re-enter that pending queue. This keeps stale audio out without silently losing the ticket's promised answer.

### Then Interpret the Intent

<div class="table-scroll table-scroll--wide" role="region" aria-label="Utterance or event, Immediate media behavior, Task behavior" tabindex="0" markdown="1">

| Utterance or event | Immediate media behavior | Task behavior |
|---|---|---|
| User begins speaking | Clear stale playback | Continue until a semantic control request is accepted |
| "Say that again" | Prepare a new speech item | Repeat an available result; no new business action |
| "How is it going?" | Yield, then answer | Query authorized task state |
| "Actually, pond three" | Invalidate old presentation | Resolve the target, accept a revision and redirect under backend semantics |
| "Cancel the pond seven check" | Yield | Submit bound cancellation, then wait for its outcome |
| "And check pond three too" | Yield | Admit a separate request if capacity and policy permit |

</div>

When two tickets are active, "stop that" may be ambiguous. The controller stops the sound promptly, then asks which task to cancel. An ambiguous control request must not randomly cancel one of them. With one unambiguous target, the cancellation request binds that target and the reply reports the transition actually requested.

A **false interruption** is activity that caused yielding without a real user request. LiveKit documents configurable recovery when speech detection produces an empty transcription. That illustrates an available mechanism, not a portable default for every media stack. [LiveKit turn handling](https://docs.livekit.io/agents/logic/turns/).

Recovery must also consider relevance. Resuming the exact interrupted sentence may be acceptable after a cough. It may be wrong after a new task result or a correction. Resumption therefore revalidates relevance. Empty recognition alone does not make obsolete content eligible.

### Cancellation Has a Race with Commit

Suppose the executor sends a restart command at 10:00:00.100. The remote system accepts it at .180. A cancel request arrives at .200. The controller cannot truthfully say "cancelled" merely because it stopped speaking at .205.

The executor may report completed, stopped before dispatch, partially completed, or unknown pending reconciliation. That evidence determines the wording. "I requested cancellation" acknowledges a command; "the action was cancelled before dispatch" describes a verified outcome. "It already completed" may disappoint the user, but it preserves the task's truth.

<figure class="scene" data-scene="audio-cancel" data-requires-js data-label="Animated illustration of the cancellation race on a millisecond axis: the executor dispatches a restart at .100, the remote system accepts and commits it at .180, the user's cancel request reaches the executor at .200 and the sound stops at .205. Because the commit came first, the reply Cancelled is rejected and It already completed is spoken; an undo would be a new action needing its own approval.">
  <div class="scene__stage" style="--aspect: 2.1; --aspect-compact: 1.15"></div>
  <figcaption class="evidence-caption">Illustrative animation, slowed down. The four timestamps are this section's worked example; the reply wording follows the executor's reported outcome.</figcaption>
</figure>

Compensation is a new action. A restarted motor cannot be un-restarted; stopping it afterward has its own risks and authority requirements. A deleted resource may require restoration rather than cancellation. This distinction between recovery and compensation also applies to physical control, which requires separate hardware-in-the-loop qualification.

Correction after commit follows the same rule: a new request revision can change what should happen next, but cannot rewrite the action that already happened. The old receipt remains intact while outstanding effects are reconciled and corrective work receives separate authorization. Replacing the receipt's target or silently retrying with new arguments would rewrite the account of what happened.

### A Small Executable Fence

The following function isolates the final presentation decision. Download the [complete Python example](/handbook/examples/real-time-audio-agents/output_fence.py), its [adversarial tests](/handbook/examples/real-time-audio-agents/test_output_fence.py) and the [running instructions](/handbook/examples/real-time-audio-agents/README.md). It is a pure decision model, not an authenticated media gateway or durable executor.

```python
def decide_output(current: View, item: SpeechItem) -> Decision:
    if item.owner_epoch != current.owner_epoch:
        return Decision.DROP
    if item.generation != current.generation:
        return Decision.DROP
    if item.access_epoch != current.access_epoch:
        return Decision.DROP
    if current.request_revisions.get(item.request_id) != item.revision:
        return Decision.DROP
    if not item.grounded:
        return Decision.DROP
    if current.user_speaking or current.assistant_playing:
        return Decision.WAIT
    return Decision.PLAY
```

`grounded` stands for an application-verification result. The speech model cannot set it for itself. Production code must validate input shape, authorized scope, bounded age and evidence before constructing the item. It must run this check again on a wait/resume boundary and fence the actual player enqueue operation; a check followed by an unrelated enqueue can race with interruption.

`request_revisions` maps every still-relevant ticket to its accepted revision. Asking a second question does not remove the first. Correction updates only the affected ticket's revision; cancellation or an explicit decision to suppress its presentation removes that ticket from this view. The durable task record remains separate. Multiple valid results can wait together, then the scheduler selects one to present and rechecks this fence.

`access_epoch` represents the current validated read-scope version. Revocation invalidates affected prepared private output. Matching epochs alone do not authenticate anyone: the application must update this projection from authoritative policy and synchronize its check with release. The example models invalidation, not a policy service.

The most useful test changes the world between preparation and delivery: a result is prepared under generation 4, an interruption advances to generation 5, and generation 4 arrives late. The expected outcome is no playback, with the durable result still available. A second test corrects the request revision while the old task finishes. A third reconnects with a new owner and delivers the old owner's "approved" speech item. These interleavings expose failures that a happy-path list of states cannot.

## 6. Ground the Voice Without Giving It Another Executor

### Short Speech Is a Projection of a Full Result

A backend investigation can return evidence, caveats, receipts and long explanatory text. A spoken answer should usually answer the question in a few sentences and point to the detailed view. This is a compression problem with a correctness contract: shortening the result still has to preserve the fields that make it true.

For the pond example, the preservation fields are target, observation time, value and unit, evidence source, action status, and uncertainty. "The aerator caused the drop" is not an acceptable shortening of "current fell to zero shortly before oxygen fell; this suggests a cause but does not establish one." Neither is "fixed" an acceptable shortening of "restart requested; verification pending."

A typed result makes those preservation fields explicit:

```json
{
  "request_id": "r7",
  "revision": 2,
  "question": "Why is pond 3 oxygen falling?",
  "status": "completed",
  "observations": [{
    "entity": "pond:3",
    "value": 4.3,
    "unit": "mg/L",
    "observed_at": "2026-10-01T08:42:00Z",
    "evidence_ref": "observation:103"
  }],
  "interpretation": "Aerator current loss is a candidate cause",
  "uncertainty": "Sensor fault and other causes remain possible",
  "effects": [],
  "full_result_ref": "result:r7:2"
}
```

This is a **proposed application contract**, not a registered Tamoz schema. Here `completed` describes the investigation, and `effects: []` means no action was executed. The spoken summary must not turn task completion into a claim that the operational problem was fixed.

Critical status uses a trusted vocabulary. The controller can render "queued," "waiting for approval," "completed with receipt" and "outcome unconfirmed" from verified task state. The speech model can explain reasoning and rephrase noncritical context; critical targets and outcomes come from checked fields.

### A Prompt Is a Behavior Guide

The frontend prompt can express the speaking policy in a few instructions:

```text
Explain private-system facts only from authorized task results or fast context.
If the result is missing or too old, consult or ask for clarification.
Name the original question when returning a delayed result.
Do not describe a requested action as completed.
For consequential changes, direct the user to the exact approval sheet.
Yield to the user; avoid repeating progress that adds no new information.
```

These instructions improve behavior. They cannot enforce effect permissions or guarantee every spoken claim is grounded. Giving the frontend raw business tools that bypass the executor would make the consult route optional, regardless of what the prompt says.

The frontend has access to narrow operations such as `consult`, `task_status` and `recall`. Each call is a proposal whose schema, principal, referenced ticket and limits require validation. A `cancel` operation also needs target ownership and current-version semantics. Capability narrowing protects both the business action path and private data.

### Grounding Checks Have to Precede Hearing

Auditing an unsupported claim after the user hears it detects the problem; it does not prevent it. For ordinary explanatory speech, a product may accept that residual risk and monitor it. Critical status, exact quantities and sensitive disclosures instead require verified templates or validation of buffered speech before release.

OpenAI documents player/media-bridge buffering for checking output, and states that a sideband alone cannot control playback. Corrective instructions cannot retract already heard speech. Buffering therefore buys a control boundary by spending latency. [Server-side playback controls](https://developers.openai.com/api/docs/guides/voice-server-controls).

Audio, transcript, check result and playback share one item and generation. If alignment is insufficient to approve a fragment safely, the player holds a larger segment or uses application-rendered speech from verified text. A delayed check of old speech must not release it after the task was corrected.

The enforcement topology must match the promise. Unchecked browser/provider playout accepts residual paraphrase risk. A controlled browser player can hold segments until validation; an application media bridge can enforce the same release rule centrally; verified-text TTS can restrict critical wording before audio exists. The selected route must enforce that release rule, with its buffering included in qualification. Observing a transcript over sideband does not turn direct unchecked playout into a gate.

Withheld speech also changes conversational recovery. GPT-Live's documented behavior leaves discarded speech in model context, so the frontend may assume it said something the user never heard. Recovery records the withheld item and fallback, corrects that assumption through the adapter's supported context mechanisms, and tests the following turn. Realtime's interruption truncation must not be assumed to repair arbitrary withholding in another API family. [Output checking and recovery](https://developers.openai.com/api/docs/guides/voice-server-controls#check-speech-before-playback).

Approximate provider timing cannot establish the exact words heard. The client can establish playback position or an uncertain interval; human attention is a separate question. Generated, transmitted, played and understood are four different assertions.

## 7. Spoken Intent Does Not Mint Authority

Voice introduces familiar-sounding ambiguity into a system that already has authority rules. A recognizable voice, transcript saying "I am the administrator," caller ID or speaker label cannot establish permission. Authentication belongs to the application; authorization belongs to the owning executor.

Read-only is not anonymous. Status, logs and investigation results can expose secrets. Principal, tenant, workspace and profile come from authenticated server state and bind the session. Every ticket lookup and cancel request checks access. Client-supplied claims cannot widen that scope. A remembered result needs the same read check as a fresh one.

### Approval Binds One Exact Action

For this architecture, ordinary spoken "yes" is insufficient approval evidence for consequential changes. I make that policy choice because consequential approval needs an exact action binding; it is not a universal prohibition on spoken confirmation. The risk is that "yes" can refer to the wrong task, a sentence the user never heard completely or audio produced by someone else.

The authenticated approval interface shows the exact operation, target, arguments or diff, affected scope, uncertainty and expiry. The approval binds the action digest and accepted request revision. If the user changes pond seven to pond three, the old approval cannot travel with the new request.

**WebAuthn**, the Web Authentication API, supports challenge-based public-key authentication with origin/relying-party checks and user presence or verification. Those mechanisms can establish authentication evidence; business authorization and transaction binding remain application responsibilities. [W3C WebAuthn relying-party operations](https://www.w3.org/TR/webauthn-3/#sctn-rp-operations).

One simple application design stores a fresh, unpredictable challenge as the key to an immutable server-side approval record:

```text
challenge -> principal, credential scope, approval ID,
             canonical action digest, accepted request revision,
             policy version, expiry, unused/consumed state
```

Assertion verification belongs in an established WebAuthn library and checks expected challenge, origin, relying-party ID, credential ownership, signature, and required user-verification flags. The application also checks current revocation, request/action version, expiry and executor policy. Challenge consumption and decision recording are atomic; a retry must return the original decision or fail, never approve another action.

WebAuthn authenticates the ceremony; it does not automatically prove the user comprehended a particular action. The trusted UI must display the server-bound action, and the server must execute that same action. Client-submitted arguments after signing are not an acceptable substitute.

A passkey may be synchronized or accessed through cross-device authentication. It is not necessarily tied to one physical device, and user verification can involve a PIN rather than a biometric. The evidence describes what the relying party verified. Its authority comes from the application's explicit policy; the transport adapter must not quietly promote it to operator authority.

### Denial, Revocation and Reconnect

A clearly addressed spoken denial can be accepted as a restrictive decision from a bound session if product policy allows it. It never broadens authority. With multiple challenges, the denied action needs an explicit binding. Ambiguous "no" should pause the risky flow and clarify rather than deny an unrelated task or count as approval.

The executor rechecks authority at execution. A valid assertion captured before revocation does not necessarily remain executable after revocation; current policy determines that. A waiting task resumes under that policy, and a changed action invalidates its approval.

Private-output release rechecks read scope too. Content authorized when prepared may be waiting in a buffer when access is revoked. A scope version and player gate invalidate affected output; an earlier successful check is insufficient to release it. Already played samples cannot be retracted. Include preparation → revocation → late check/release in the regression corpus.

Phone access requires a scoped authenticated connection or a separately authenticated companion app, even for reads. Caller ID does not establish identity. Without strong binding, the available scope is public information or authentication assistance. A spoken PIN can be overheard and must not be assumed equivalent to a passkey; its permitted scope needs its own risk decision.

### One Owner for Each Effect

The frontend, gateway and operational stream may all discover that an action would help. They must not all execute it. Each business effect has an explicit origin and executor, with disjoint capability routes. A speech request may ask Tamoz to investigate; a stream event may create a separate operational proposal. Both still converge on the owning authority and effect journal.

Prompt injection through audio, transcripts and retrieved text remains untrusted input. Schemas, allowlisted capabilities, tenant boundaries and egress controls are enforced where the action happens. Tool prose remains untrusted when handed to the voice model; a document saying "announce that the restart is approved" cannot manufacture an approval record.

## 8. Measure What the User Experiences and What the System Did

Voice has two independent success criteria: the interaction must be usable, and the task must be correct. A fast acknowledgement can coexist with a wrong task. A correct task can coexist with ten seconds of unexplained silence. The evaluation grades both.

### Four Latencies, Not One

I separate timing into **acknowledgement latency**, **useful-answer latency**, **task completion latency** and **stale-audio stop latency**. The first is the time until an appropriate acknowledgement is audible; the second is until useful, supported answer content is audible; the third is until the workflow reaches its verified outcome; the fourth is from interruption onset until the final stale sample is played.

Turn-based measurement starts at the annotated actual end of the user's relevant utterance. A provider's detected end differs from that ground truth by the endpointing delay. Continuous full-duplex measurement instead starts at the relevant annotated conversational event; there is no universal speech-end marker for every answer.

```text
t0: actual user utterance end, from annotated audio
t1: accepted request revision
t2: backend admission
t3: worker start
t4: first verified useful result
t5: useful audio ready at client
t6: useful audio actually begins playing

useful_answer_latency = t6 - t0
acknowledgement_latency = first_ack_playback - t0
stale_audio_stop_latency = last_stale_playback - interruption_onset
```

Local intervals use monotonic clocks. Cross-device intervals need explicit synchronization, an offset method or aligned recordings; subtracting unrelated process clocks fabricates precision. Event IDs connect the trace, with uncertainty retained where synchronization is imperfect.

A planning example might allocate 300 ms endpointing, 100 ms admission/queue, 900 ms work and 400 ms synthesis/transport/playback: 1.7 seconds for a serialized simple query. These are **illustrative allocations**, not provider performance. Streaming overlaps some stages; long investigations exceed this budget and need their own task-completion measure. The sum of stage p95 values is not an end-to-end p95. That distribution has to be measured at the endpoints.

### Freeze a Workload-Specific Bar

I propose the following **pilot bar** to make the tradeoffs measurable. These thresholds are workload choices, not measured results or a handbook standard. The trial uses one declared set of criteria; mixing p50, p90 and p95 targets from different experiments would obscure the decision. [Chapter 8](/handbook/chapter-08-observability-evaluation.html) explains the calibration and uncertainty requirements.

<div class="table-scroll table-scroll--wide" role="region" aria-label="Property, Proposed pilot criterion, Measurement or oracle" tabindex="0" markdown="1">

| Property | Proposed pilot criterion | Measurement or oracle |
|---|---|---|
| Long-task acknowledgement | p95 ≤ 800 ms | End of utterance to actual acknowledgement playback |
| Simple read-only useful answer | p95 ≤ 2.5 s | Supported answer playback, excluding filler |
| Stale sound after barge-in | p95 ≤ 250 ms | Recorded interruption onset to final stale sample |
| Task fidelity | ≥95% held-out read-only completion; at most 2 percentage points below text baseline | Independent final-state/evidence grading; report intervals |
| Critical slots | ≥99% exact capture or explicit clarification | Target/quantity/condition oracle; report clarification rate separately |
| Safety/truth | Zero observed unauthorized or duplicate effects and false completion/cancellation claims | Receipt and side-effect audit on the declared corpus |
| Recovery | Every deterministic crash-point case preserves logical request identity and suppresses stale output | Fault injection and journal inspection |
| Declared load | Safe rejection at twice planned session concurrency | Bounded queues, no cross-session leakage, existing work recoverable |

</div>

Clarification counts as safe handling of an ambiguous slot, not a completed task. Capture accuracy, clarification frequency, abandonment and successful resolution are reported separately; an assistant that clarifies everything can meet a safety handling metric while being unusable.

For the initial feasibility screen, these percentages apply to observed point estimates, accompanied by intervals and cell counts. Passing that screen permits a larger trial; it does not establish the stated population rates. Qualification needs a predeclared confidence level, clustered/paired comparison procedure and decision rule. For example, require the completion-rate lower bound to meet the chosen floor and the upper bound on paired degradation against text to remain within the chosen margin. Insufficient precision makes the result inconclusive and calls for a larger sample; it does not justify replacing confidence bounds with point estimates. The same distinction applies to slot handling and latency quantiles.

Similarly, zero observed failures is a test result, not proof of zero risk. Under independent Bernoulli trials, the approximate 95% upper failure-rate bound after zero failures is `3/n`; 300 independent trials give roughly 1%. Repeated calls by the same scripted speaker are clustered. Counting them as independent users would overstate precision.

### Build the Corpus Around Failures

The evaluation progresses through three stages: deterministic text/event fixtures for controller races, synthetic audio for repeatable recognition and timing comparisons, and consenting human sessions for natural pauses, echo, dialect and correction. Synthetic audio is useful for reproducibility, but it does not qualify the real acoustic experience.

Prompt and threshold tuning use the development set, leaving the held-out set untouched. A feasibility study can start with 40 development scenarios, at least 100 held-out task scenarios and at least 10 speakers, expanding coverage for each critical language/noise cell. These are **proposed sampling minima**, not enough to establish rare-error reliability. A cell with too few cases remains underpowered; pooling it into a multilingual score does not establish its performance.

Architecture comparisons hold backend task logic, authority policy and expected application state constant, with paired voice and typed requests. Human trials randomize candidate order and, where practical, use audio reviewers unaware of the candidate. Repeated model-dependent scenarios retain within-scenario clustering. Failures belong in the report alongside averages.

<div class="table-scroll table-scroll--wide" role="region" aria-label="Experiment, Change one factor, What it reveals" tabindex="0" markdown="1">

| Experiment | Change one factor | What it reveals |
|---|---|---|
| Endpointing | Acoustic/semantic/manual completion policy | Premature cutoffs versus waiting; accidental admissions |
| Frontend architecture | Chained/native/delegated, fixed backend | Audible timing versus task/slot fidelity |
| Slow backend | Deterministic short/medium/long delay | Ticket flow, truthful progress, conversational continuity |
| Steering race | Correct before admission, while queued, during work, after effect | Revision binding and truthful outcome language |
| Output control | Free paraphrase, checked segments, verified templates | Grounding/fidelity versus extra buffering latency |
| Reconnect | Lose media before/after completion and approval | Stable task identity, current scope, no stale replay |
| Language and channel | Dialect, code-switching, noise, browser/phone | Actual supported acoustic cells rather than a pooled score |

</div>

The voice model cannot be the sole judge of its spoken truth. An independent evaluator grades final application state and compares spoken status and quantities against receipts and evidence. Human listening covers pronunciation, timing and ambiguity. A transcript-only evaluator can miss unintelligible audio and playback overlap.

### The Regression Gate

The controller regression gate covers the following interleavings before naturalness becomes the optimization target:

1. Deliver the same accepted event twice; assert one logical task. Reuse its identity with different content; assert conflict.
2. Correct a target, then deliver the old result; retain the receipt, suppress obsolete speech.
3. Interrupt while audio is buffered and a check is pending; neither late frames nor late check approval may resume old speech.
4. Cancel immediately before and after remote commit; only the backend's reconciled state determines the reply.
5. Disconnect after completion before display; reconnect to the original task and show its result once in the current view.
6. Present stale, expired, forged and replayed approval assertions; assert no authorized effect emerges.
7. Ask for another tenant's ticket and cached result; assert denial on both hit and miss paths.
8. Restart a session owner, then deliver the old owner's events; assert fencing at admission and playback.
9. Prepare authorized private output, revoke access, then release a late check result; assert no stale private audio. Withhold an output segment and test the next turn for false assumptions about what was presented.

These are product integration obligations. The small executable fence linked above verifies only the presentation decisions it models; it does not claim to pass this full gate. Release notes need to preserve that distinction between example coverage and product qualification.

A run manifest records provider/API contract, model version, prompts, code digest, principal/policy configuration, language/dialect, transport/codec, network condition, scenario ID, accepted revisions, receipts, playback annotations, errors and final usage. Incomplete sessions and unconfirmed outcomes remain in the denominator or a clearly disclosed failure category. A provider timeout remains a failed or incomplete run even when it lacks a final transcript.

## 9. Economics, Capacity and Privacy Are Architecture Decisions

### Bill According to the Endpoint

Voice cost is not one universal dollars-per-minute formula. The accounting separates speech recognition, frontend speech, backend reasoning, tools, media and infrastructure. Interrupted, speculative and retried work contributes alongside successful replies.

For a chained system:

```text
C_chain = billed_STT_units * STT_rate
        + billed_TTS_units * TTS_rate
        + sum(backend_input_tokens * input_rate
              + backend_output_tokens * output_rate)
        + tools + media + compute
```

Each rate uses its actual billing unit. A character-based TTS price is not an audio-minute price. If prices are per million tokens, divide token counts by one million. Local inference removes a provider charge, not hardware, utilization and operations cost.

A token-billed Realtime endpoint uses the selected model's rates and actual input/output usage by modality and cache category. A duration-billed Live endpoint uses final billable duration plus separate backend usage. OpenAI's current documentation distinguishes these accounting models and states that Live duration snapshots are cumulative replacements, not increments. [Voice cost accounting](https://developers.openai.com/api/docs/guides/voice-latency-cost).

Connected minutes are not a substitute for token-based Realtime usage. Silent connected time and active recognized audio have different semantics. Conversely, duration billing can charge idle connection time. The accounting therefore follows the chosen endpoint's usage contract, with final events reconciled against billing records.

The outcome measure is cost per verified successful task:

```text
cost_per_successful_task = total_measured_expenditure / verified_successful_tasks
```

With zero verified successes, the measure is undefined, not zero. An illustrative pilot costing $80 across 100 attempted tasks with 90 verified successes costs about $0.89 per successful task. This is arithmetic with **assumed totals**, not a provider quote. For sessions with several tasks, the denominator counts verified task successes rather than sessions.

### Bound the Cost of Being Conversational

An open microphone can cause accidental turns, long histories and expensive model activity. Push-to-talk, idle closure, shorter spoken results and limited consult concurrency are product controls as well as cost controls. Their settings are a usability tradeoff: aggressive idle closure can force the user to fight a timer whenever they pause.

Context policy also matters. The frontend carries stable speaking instructions, bounded recent conversation and a compact task/result projection. Detailed investigations remain in the backend. Reconnect and compaction preserve the current request, pending commitments, exact approval references, outstanding tickets and uncertainty. A short summary that drops "do not restart" is cheaper and wrong.

Session replacement, abandoned speculation, transcript processing and output checks each contribute measurable frequency and cost. A low per-token rate can hide a large volume of unnecessary frontend turns. Explicit context assembly and preservation contracts apply here, even though cache mechanics differ across audio APIs.

### Scale the Two Loops Separately

Media sessions occupy long-lived connections; task workers occupy compute and effect capacity. Their capacity requirements are independent. A larger media fleet does not make one entity's business mutations safely concurrent, and more task workers do not fix audio jitter.

For rough mean-capacity planning, concurrent sessions are arrival rate times mean session duration. At 0.2 new sessions/second and 300 seconds/session, the mean is 60 sessions. This is an **illustrative steady-state estimate**, not burst capacity or a load-test result.

Buffer memory can be estimated separately:

```text
raw_audio_bytes = sessions * buffered_seconds * sample_rate
                * bytes_per_sample * channels * buffered_directions
```

At 100 sessions, 2 buffered seconds, 24,000 samples/second, 2 bytes/sample, mono and two directions, the result is 19.2 MB decimal. Runtime objects, encoded copies, transcript/check queues and provider state add overhead. Unbounded buffers consume memory and make stale-audio stop worse at the same time.

Admission, per-session audio buffering, text/event sizes, outstanding tasks, output-check time and retries each have explicit bounds. Backpressure acts before latency collapses. At capacity, the service reports the limit and preserves admitted work. Retry storms after an outage create new load; jittered reconnect and stable request identity prevent recovery from replaying every request as a new task.

### Build a Copy Inventory

Audio and transcripts can pass through browser capture, media relay, recognition provider, speech model, TTS provider, task memory, event logs, metrics, evaluation corpus and backups. Deleting the gateway's file does not delete every copy.

My proposed retention policy avoids permanent raw audio in normal sessions, retains only needed accepted text and task evidence, and records evaluation audio for an explicit purpose, with consent and a deletion deadline. This is an application policy; it does not imply the provider retains nothing.

Provider controls depend on endpoint, feature and project eligibility. A region or a `store` setting alone cannot establish deletion across the selected configuration. [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

Where the media topology permits it, secrets are redacted before persistence and provider transfer. Metric labels exclude transcripts, entity names and user identifiers. Logs use bounded safe references; recordings have explicit access controls; deletion checks include evaluation artifacts and backup policy.

The product clearly discloses the artificial voice. Accessible captions and controls, along with text alternatives, support situations where speech, hearing or environment makes audio unsuitable. Public phone deployment additionally needs the selected jurisdiction's recording and telecom requirements resolved. This chapter defines engineering boundaries, not a compliance determination.

## 10. Applying the Pattern to an Existing Agent

I use [Tamoz](/projects/tamoz.html) as a worked example because the interesting problem is adding speech to an existing governed agent. The design has to preserve the runtime's ownership of work while giving the conversation its own timing loop. This is a **proposed integration**; it does not describe a deployed Tamoz voice surface.

In my proposed design, the Voice Gateway is a messaging surface. The conversation controller handles speech and tickets; the existing runtime retains admission, threads, approvals, effects and receipts. The browser interface provides a microphone, speaker, task board and exact approval sheet. Voice requests enter through the runtime's transport and delivery boundaries, so adding speech does not create a second execution path.

The integration points are identity, transport, cancellation, redirect and the effect journal. A new voice identity, passkey evidence category or progress/result delivery type has to fit the current contracts at those boundaries. Compatibility is established through integration tests against the selected runtime version; the architecture diagram alone cannot establish it.

### Prove the Channel Before Adding Audio

I stage the proposed implementation around the failure model, with each phase establishing the evidence needed for the next:

<div class="table-scroll table-scroll--wide" role="region" aria-label="Phase, Concrete deliverable, Required proof before moving on" tabindex="0" markdown="1">

| Phase | Concrete deliverable | Required proof before moving on |
|---|---|---|
| Decisions | Declared languages, authorized identity route, provider/account access, media topology, workload bar | Recorded contract and open constraints |
| Text gateway | Text requests through the same future voice channel, durable tickets and exact approvals | Deduplication, restart, cancel/redirect, tenant and approval-binding tests |
| Read-only live speech | Media, captions, three lanes, interjection and output fencing | Audible timing, slot fidelity, grounding and recovery in declared cells |
| Governed changes | Executor-approved mutations with truthful status | Approval/revision/race integration gate; no alternate effect route |
| Optional operational context | Scoped evidence cache and configured alerts | Freshness, supersession, provenance and paired workload benefit |
| Telephone | Authenticated caller binding, codec path and handoff | Requalification on the telephone channel; pending-task ownership |

</div>

The text gateway comes first because it isolates durability and authority defects before audio makes them difficult to diagnose. Live conversation remains the product goal. A lost text ticket becomes a lost voice ticket; speech cannot repair admission.

### Keep Operational Streams Optional

An operational stream can supply situation evidence and alerts when the workflow concerns ongoing operations. It need not sit on every greeting, transcript fragment or task-status query. A voice-only request should not acquire stream machinery merely because audio is continuous.

The relevant stream contract includes notifications and an authorized snapshot query. A partial cache derived from notifications is not automatically a complete current situation. Without a supported snapshot route, the controller consults the owning backend or explicitly qualifies the cached observation.

When both human voice and a stream propose the same action, the effect still has one selected origin route and executor. Replay disables live effects and speech; otherwise historical data can produce a present-tense warning or physical command. The stream's situation version, the task's request revision and the player's output generation describe different things. Relevant versions travel together; one convenient timestamp cannot replace them.

### Telephone Is a New Qualification Cell

Telephone integration introduces codec constraints, network buffering, caller authentication, call transfer and disconnect behavior. A browser result does not establish telephone intelligibility or interruption quality.

Twilio's bidirectional media messages use μ-law audio at 8 kHz, and clearing its output buffer returns pending marks. A mark returned after clear is therefore not by itself evidence that the corresponding speech played. Delivery classification therefore records which generation was cleared. [Twilio Media Streams message contract](https://www.twilio.com/docs/voice/media-streams/websocket-messages).

A provider-native SIP route is another possible adapter. One selected route gives the workload a bounded qualification target; multiple phone stacks would each require their own evidence. Human handoff transfers accepted task state, current receipts and pending approvals, with explicit ownership of unfinished work. A call ending does not silently cancel a committed task.

The worked example establishes a design and qualification sequence. It supplies no voice-trial results, measured latency or provider-account evidence. Those results remain necessary before this proposed integration can be described as qualified.

## 11. Production Failure Modes

<div class="table-scroll table-scroll--wide" role="region" aria-label="Symptom, Likely root cause, Correction and verification" tabindex="0" markdown="1">

| Symptom | Likely root cause | Correction and verification |
|---|---|---|
| Agent acts before the user finishes | Provisional recognition treated as accepted intent | Separate provisional/accepted input; test trailing negation and conditions |
| Wrong target despite low WER | Critical identifier resolution omitted | Exact-slot corpus; display resolved target and clarify ambiguity |
| "Queued" work disappears after restart | Acknowledgement preceded durable admission | Transactional or reconcilable handoff; crash at each write boundary |
| Same request creates two tasks | Provider retry identity treated as new application request | Stable binding and conflicting-payload detection; duplicate storm test |
| Old pond result interrupts new topic | Missing request/revision relevance check | Keep receipt, suppress speech; out-of-order result test |
| Audio resumes after interruption | Late frame/check bypasses generation fence | Fence synthesis, validation and actual enqueue; delayed-completion test |
| Voice says "cancelled" but action occurred | Playback cancellation substituted for task outcome | Wait for executor reconciliation; before/after-commit race fixtures |
| Voice says "fixed" after an investigation | Summary collapsed task completion into effect completion | Typed result and verified outcome vocabulary; receipt/audio audit |
| A spoken "yes" authorizes wrong action | Approval lacks exact target/revision binding | Trusted action sheet and one-use bound challenge; replay/correction tests |
| Fast answer leaks another user's result | Cache hit skips read authorization | Principal-scoped lookup and current access check; hit/miss isolation tests |
| Two controllers speak after reconnect | No authoritative media-owner fence | Lease plus owner epoch; old-owner admission/output tests |
| Idle cost exceeds the estimate | Connected duration mistaken for token usage, or converse | Endpoint-specific final usage accounting and invoice reconciliation |
| Pilot works; busy service collapses | Unbounded queues and coupled media/task scaling | Backpressure, separate capacity budgets, overload and recovery trial |
| Deleted recording remains elsewhere | Incomplete copy/retention inventory | Verify deletion and access across logs, providers, corpus and backups |
| Phone mark claims an unheard answer | Flushed output mark interpreted as played | Record clear generation and distinguish flush from completion |

</div>

### Debugging Checklist

The debugging path follows one trace: authenticated session → accepted request/revision → durable ticket → backend result/receipt → selected speech item/generation → playback evidence. The first boundary where the account changes identifies the next investigation.

1. **Intent:** What audio/transcript evidence produced the accepted request? Were target, negation, amount and condition preserved? A clean final caption is not proof of correct interpretation.
2. **Admission:** Did the acknowledgement follow durable binding? Did retries return the original ticket? Inspect the conflict record, not just HTTP success.
3. **Authority:** Which principal and policy authorized reads, approvals and effects? Did a cache, adapter or model call bypass the owning executor?
4. **Revision:** Which accepted request did the result answer? Was a correction recorded before the old speech item was prepared or released?
5. **Task truth:** Which receipt supports "completed" or "cancelled"? Was the outcome unknown, and did presentation incorrectly replace it with success?
6. **Playback:** Which owner and generation released the audio? Did already buffered samples stop? Did a late frame or output-check approval refill the player?
7. **Timing:** Are the measured timestamps actual speech and playback boundaries? Separate acknowledgement from useful content and endpointing from backend delay.
8. **Scope and resources:** Is the fast context current and authorized? Were queue, provider, disk or session limits reached? Did reconnect preserve tasks while recovering media?

In the opening incident, the accepted revision for pond three should invalidate presentation for pond seven. The proposed restart cannot execute without an exact authorized action. Barge-in clears audio while an explicit cancel obtains the backend outcome. If the command already committed, the voice reports that truth and offers the separately governed next step. Each failure has an owning boundary and a test; none is repaired by changing the voice's personality.

## Summary

- **Continuous audio is evidence, not an executable task.** Resolve critical slots and accept a versioned request before governed work begins.
- **Choose the architecture by ownership and workload.** Chained, native and delegated voice each preserve different control surfaces; keep an inspectable baseline.
- **Separate conversation, task and playback state.** A spoken sentence, a completed workflow and a played result establish different facts.
- **Use three lanes and durable tickets.** Keep conversation moving while the owning agent investigates; acknowledge only the durable state actually reached.
- **Fence presentation.** Corrections, interruption and reconnect invalidate different identities; late output must be checked at the player boundary.
- **Ground critical speech in verified results.** Preserve quantities, conditions and uncertainty; buffering and exact templates trade latency for control.
- **Bind approval to one exact action.** Authentication evidence is interpreted by executor policy; a conversational "yes" must not travel to another target.
- **Qualify acoustics and task correctness separately.** Measure actual useful playback, critical slots, outcome truth and recovery per declared language/channel cell.
- **Account for the selected endpoint and every copy.** Final usage, bounded queues, scoped caches and a retention inventory are part of the architecture.

## Further Reading

The provider references below were checked on 2026-10-02. They establish documented API behavior, not comparative quality, selected-account access or measured product readiness.

- [OpenAI: Voice agents](https://developers.openai.com/api/docs/guides/voice-agents): **vendor architecture guidance** comparing chained, Realtime and delegated spoken workflows.
- [OpenAI: Realtime getting started](https://developers.openai.com/api/docs/guides/realtime) and [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations): **API documentation** for credentials, session/tool flow and transport-specific interruption.
- [OpenAI: GPT-Live delegation](https://developers.openai.com/api/docs/guides/live-delegation): **API documentation** showing application-owned context and tasks for client delegation.
- [OpenAI: Realtime VAD](https://developers.openai.com/api/docs/guides/realtime-vad): **API documentation** for acoustic and semantic turn controls.
- [OpenAI: Server-side controls](https://developers.openai.com/api/docs/guides/voice-server-controls): **API/control guidance** distinguishing sideband steering from actual playback control.
- [OpenAI: Voice latency and cost](https://developers.openai.com/api/docs/guides/voice-latency-cost) and [Data controls](https://developers.openai.com/api/docs/guides/your-data): **vendor accounting and configuration documentation**; endpoint-specific, with project eligibility to verify.
- [LiveKit: Turn handling](https://docs.livekit.io/agents/logic/turns/): **framework documentation** for endpointing/interruption controls and false-interruption recovery.
- [Twilio: Media Streams WebSocket messages](https://www.twilio.com/docs/voice/media-streams/websocket-messages): **transport documentation** for phone media, marks and buffer clearing.
- [W3C: Web Authentication](https://www.w3.org/TR/webauthn-3/): **specification** for authentication ceremonies; application action-binding and authorization remain separate responsibilities.

The provider pages establish interface behavior. The controller policies, pilot thresholds and worked examples in this chapter are engineering proposals. No measured voice performance or production qualification is claimed.

## What's Next?

The design leads to a concrete experiment. The text gateway establishes durable admission and current-action approval. A comparison between a chained baseline and the selected live frontend then holds backend tasks constant while measuring spoken timing and task fidelity. Passing the deterministic race gate makes a human acoustic pilot a defensible next stage. That sequence tests whether the architecture delivers a useful conversation without weakening the agent's execution contract.

## Related Chapters

- [Chapter 5: Tool Use and Skill Registries](/handbook/chapter-05-tool-use-skill-registry.html): narrow frontend operations and owning executor contracts.
- [Chapter 6: Memory & Context Management](/handbook/chapter-06-memory-context-management.html): durable conversation state and retention versus ephemeral spoken context.
- [Chapter 7: Human-in-the-Loop](/handbook/chapter-07-human-in-the-loop.html): exact human decisions at consequential boundaries.
- [Chapter 8: Observability & Evaluation](/handbook/chapter-08-observability-evaluation.html): independent task oracles, metrics and release evidence.
- [Chapter 9: Safety & Guardrails](/handbook/chapter-09-safety-guardrails.html): authority, action receipts, unknown outcomes and complete mediation.

## Frequently Asked Questions

**Q: Can I just add STT and TTS to my existing agent?**  
Yes, for a useful baseline, especially with push-to-talk and short tasks. Live interaction still needs accepted-turn rules, playback cancellation and honest task status. The architectural jump occurs when the user can talk while work runs, correct it mid-flight and reconnect before completion. At that point the controller needs explicit relationships among the three clocks.

**Q: Does a separate speech frontend mean two agents can change my system?**  
No. The frontend handles conversation and narrow request operations; business tools remain in the owning executor. The controller routes an accepted request into that executor. If the frontend can directly call the same mutating tool, the architecture has created a second effect route and must remove or independently govern it.

**Q: Why distinguish "stop talking" from "cancel"?**  
Because they operate on different state. Clearing a speaker queue is immediate presentation control. Cancelling work is a request that may race with a remote commit. The system can stop audio promptly and still report that an action completed before cancellation reached it. The user needs that difference explained through truthful wording.

**Q: Is a passkey approval always stronger than an existing local operator approval?**  
No. It provides specified authentication evidence under a relying party's ceremony. The application decides whether that evidence meets its action policy. Passkey synchronization, recovery, current revocation and the UI's action binding also matter. A new voice adapter cannot choose an authority rank for itself.

**Q: Can the model guarantee that it speaks only verified facts?**  
Instructions help, but an unconditional guarantee needs more control than a prompt. Trusted status templates or checked buffered output provide a control boundary for critical content, with evidence references and tests of actual playback. Less critical explanation can retain paraphrase risk, but qualification has to make that risk explicit; generated sentences are not automatically verified.

**Q: Are Arabic, German and English handled equally well?**  
That is an empirical question for the chosen model, dialects, channel and hardware. Critical-slot capture and human intelligibility need evaluation per declared cell, including code-switching and noisy rooms. A provider's supported-language list does not establish language-quality parity for the workload.

**Q: Must I use an operational stream for real-time voice?**  
No. Continuous media does not imply that every request is an operational stream event. Situation evidence and alerts belong where the workflow benefits and the integration has a supported freshness/query contract. Conversation routing and durable task execution keep their existing owners.

**Q: What happens when audio or the provider fails?**  
Media recovery clears stale output, preserves accepted task identities and offers text/status access through the same governed channel. Reconnect restores current results and approval state. An effect with an unknown outcome remains subject to reconciliation rather than resubmission as a fresh task. If task execution also failed, the executor reports that separately from media failure.

## Glossary Terms Introduced

- **Speech-to-text (STT) / ASR:** Conversion or recognition of spoken audio into text; recognition boundaries do not themselves certify task intent.
- **Word error rate (WER):** Recognition substitutions, deletions and insertions divided by reference word count; it does not weight a wrong target by its business impact.
- **Text-to-speech (TTS):** Rendering text into audio, optionally as streaming segments.
- **Voice activity detection (VAD):** Estimating speech onset and offset from audio, used for media/turn decisions.
- **Semantic endpointing:** Estimating utterance completion using linguistic evidence in addition to silence or acoustic features.
- **Backchannel:** A brief listening signal that need not constitute a request or interruption.
- **Critical-slot fidelity:** Exact preservation or explicit clarification of identifiers, quantities, negation and conditions relevant to task correctness.
- **Accepted request:** An application-bound interpretation admitted as a versioned workflow request, distinct from provisional recognition and effect authorization.
- **Conversation controller:** Application code that aligns spoken interaction, durable tasks, authorized context and result presentation.
- **Ticket pattern:** Returning a stable durable work handle promptly, then presenting its eventual result while conversation can continue.
- **Full duplex:** Simultaneous input and output media; it does not imply concurrent authority to mutate business state.
- **Sideband:** A secondary control/event connection to a media session; it does not alone establish player control.
- **Acoustic echo cancellation (AEC):** Reducing microphone capture of loudspeaker output, subject to actual device and room behavior.
- **Jitter buffer / underrun:** A bounded queue smoothing variable sample arrival; an underrun occurs when playback lacks available samples.
- **Barge-in:** User speech beginning during assistant output, requiring prompt yielding and invalidation of stale presentation.
- **Request revision:** The version of an accepted task interpretation to which results and action approvals are bound.
- **Generation fence:** A changing presentation value used to reject output prepared before interruption or other invalidation.
- **Access epoch:** A version of validated read scope used to invalidate affected buffered output after an authority change.
- **Owner epoch:** The version of session ownership that rejects events from an obsolete controller/player owner.
- **Projection:** A bounded view derived from authoritative records, such as a task board or spoken summary.
- **Unknown outcome:** A task/effect state requiring reconciliation because available evidence cannot establish whether the effect occurred.
- **Useful-answer latency:** Time from the relevant annotated user event until supported answer content is actually played, excluding filler.
- **WebAuthn:** Challenge-based public-key authentication whose evidence the application must bind to its selected action and authority policy.

## Revision History

<div class="table-scroll table-scroll--wide" role="region" aria-label="Version, Date, Changes" tabindex="0" markdown="1">

| Version | Date | Changes |
|---|---|---|
| v1.1 | 2026-10-02 | Chapter-wide editorial revision: consistent authorial perspective, an explicitly proposed Tamoz integration, and clearer explanations of design choices, evaluation and recovery. Technical contracts and executable examples retained. |
| v1.0 | 2026-10-02 | Website edition with responsive teaching figures, runnable examples, published cross-links and rechecked provider references: architecture and media contracts, accepted speech, three lanes/clocks, durable tickets, multi-ticket/access output fencing, truthful cancellation, grounded results, action-bound approvals, qualification, economics and integration boundaries. |

</div>

## Meta

- Slug: HDBK-022-real-time-audio-agents
- Tags: Audio Agents, Voice Agents, Real-Time Conversation, Speech-to-Speech, Turn-Taking, Barge-In, Durable Execution, Grounding, Approvals, Evaluation
- OG Image: /images/handbook/HDBK-022-real-time-audio-agents.webp
