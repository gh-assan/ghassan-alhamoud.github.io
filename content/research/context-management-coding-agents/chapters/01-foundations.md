## Start with the right mental model

Most people picture the context window as a **container**. It has a capacity. You put things in. When it is full, something has to come out. A bigger container means fewer problems.

That picture is wrong, and it produces most of the bad advice in this field. The contents of a container do not interfere with each other. Adding tokens changes the model's input and can change which evidence it uses.

A better picture is an **auction for attention**. The currency is not space. It is salience: how much useful signal the model can extract from the current input. Use this as an operating model, not a literal claim that every model exposes one fixed attention pool; the effect depends on model, task and position [D]. Three consequences follow.

1. **Adding correct information can lower performance.** Distractors and competing interpretations can make the relevant evidence harder to use.
2. **More capacity is not more reliable use.** The useful set grows until the next token adds more retrieval work or ambiguity than signal.
3. **"Does it fit?" is necessary, not sufficient.** Measure whether the added material changes the task outcome.

> [!key] The one-sentence version
> The context window is a budget, not a bucket, and the exchange rate is attention. See [[attention budget]].

<figure class="diagram">
<p class="diagram__title">A conceptual model: context value has a productive band</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 190" role="img" aria-labelledby="f1-t">
<title id="f1-t">A conceptual three-zone model: too little context starves the task, a small relevant set is productive, and extra distractors dilute it.</title>
<rect class="dg-box--muted" x="10" y="35" width="195" height="100" rx="10"/>
<rect class="dg-box--info" x="263" y="35" width="195" height="100" rx="10"/>
<rect class="dg-box--warn" x="515" y="35" width="195" height="100" rx="10"/>
<text class="dg-k" x="107" y="68" text-anchor="middle">STARVED</text>
<text class="dg-s" x="107" y="91" text-anchor="middle">decisive evidence</text>
<text class="dg-s" x="107" y="108" text-anchor="middle">has not arrived</text>
<text class="dg-k" x="360" y="68" text-anchor="middle">PRODUCTIVE</text>
<text class="dg-s" x="360" y="91" text-anchor="middle">small, relevant set</text>
<text class="dg-s" x="360" y="108" text-anchor="middle">makes the next action inferable</text>
<text class="dg-k" x="612" y="68" text-anchor="middle">DILUTED</text>
<text class="dg-s" x="612" y="91" text-anchor="middle">distractors and</text>
<text class="dg-s" x="612" y="108" text-anchor="middle">competing interpretations</text>
<line class="dg-line dg-line--accent" x1="205" y1="85" x2="253" y2="85"/>
<polygon class="dg-head--accent" points="253,80 263,85 253,90"/>
<line class="dg-line dg-line--accent" x1="458" y1="85" x2="505" y2="85"/>
<polygon class="dg-head--accent" points="505,80 515,85 505,90"/>
<text class="dg-s" x="360" y="165" text-anchor="middle">more material in context →</text>
</svg>
</div>
<figcaption>Working model, not a quantitative curve: the productive band depends on the model, task and position. Long-context studies show that irrelevant or competing context can reduce retrieval reliability [S]; applying that result to coding agents is an inference [D].</figcaption>
</figure>

## What long-context studies actually show

The claim that models get worse as input grows is not folklore. It has been measured carefully. (The small letters after each number are [[evidence label|evidence labels]]; S means a sourced study.)

Chroma's [[context rot|context-rot]] study tested **18 models from four vendors/model families** on controlled long-context tasks. It covered 8 input lengths and 11 needle positions [S]. Across the experiments, performance generally degraded as input grew, with non-uniform, model- and task-specific curves [S].

The third column below is an engineering inference for repository agents, not a direct coding-agent measurement [D].

| Study result [S] | What was measured | Engineering implication [D] |
|---|---|---|
| **Similarity matters** | When the question and the answer used similar words, models found the answer even in long contexts. When they did not, performance fell much faster [S]. | You ask "why is checkout slow?" and the answer is a connection-pool setting. Vocabulary mismatch is one source of difficulty; repository size is not the only determinant. |
| **Distractors compound** | One near-miss distractor hurt; four hurt more; and *which* distractor mattered [S]. | Codebases are full of near-duplicates: three `parse_config` functions, a deprecated `AuthService` next to the live one. |
| **Coherent text is harder** | Shuffled haystacks produced *better* retrieval than coherent ones, across all 18 models [S]. | A coherent design document may create a similar retrieval risk; test that on your workload. Coherence can create plausible wrong answers. |
| **Focused beats full** | On LongMemEval, ~300 tokens of relevant text beat the full ~113K-token context retaining the same answer-bearing material plus surrounding context [S]. | The focused condition retained the answer-bearing material while removing surrounding context. That is a useful subtraction test for your own agent. |

The practical lesson is to retrieve by relevance and verify against the repository, not to assume that a coherent document is automatically useful.

### Position is a task-dependent risk

The cited *Lost in the Middle* study found a U-shaped position effect on its retrieval tasks: relevant information near the beginning or end performed better than information in the middle [S]. The magnitude varies by model and task, so do not turn it into a universal 50% utilisation threshold.

<figure class="diagram">
<p class="diagram__title">Position can change retrieval reliability (schematic)</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 210" role="img" aria-labelledby="f2-t">
<title id="f2-t">In the cited long-context retrieval tasks, relevant information near the start or end performed better than information in the middle. The effect varies by model and task.</title>
<rect class="dg-box--info" x="10" y="45" width="210" height="95" rx="8"/>
<rect class="dg-box--warn" x="255" y="45" width="210" height="95" rx="8"/>
<rect class="dg-box--info" x="500" y="45" width="210" height="95" rx="8"/>
<text class="dg-k" x="115" y="75" text-anchor="middle">START</text>
<text class="dg-s" x="115" y="101" text-anchor="middle">favoured in the</text>
<text class="dg-s" x="115" y="119" text-anchor="middle">cited retrieval tasks</text>
<text class="dg-k" x="360" y="75" text-anchor="middle">MIDDLE</text>
<text class="dg-s" x="360" y="101" text-anchor="middle">lower retrieval</text>
<text class="dg-s" x="360" y="119" text-anchor="middle">in the cited tasks</text>
<text class="dg-k" x="605" y="75" text-anchor="middle">END</text>
<text class="dg-s" x="605" y="101" text-anchor="middle">favoured in the</text>
<text class="dg-s" x="605" y="119" text-anchor="middle">cited retrieval tasks</text>
<line class="dg-line" x1="220" y1="92" x2="250" y2="92"/>
<polygon class="dg-head" points="250,87 260,92 250,97"/>
<line class="dg-line" x1="465" y1="92" x2="495" y2="92"/>
<polygon class="dg-head" points="495,87 505,92 495,97"/>
<text class="dg-s" x="360" y="177" text-anchor="middle">same fact · different placement · different reliability</text>
</svg>
</div>
<figcaption>The cited Lost in the Middle tasks found higher retrieval at the beginning and end than in the middle. This is schematic; the effect depends on model, task and harness [S].</figcaption>
</figure>

The practical response is placement plus verification: keep a critical constraint near the action it governs, then test whether late-session behavior actually improves. System-prompt placement is harness-dependent.

> [!key] Why agents "stop following CLAUDE.md"
> In some harnesses, an early rule becomes harder to retrieve as the context grows [D]. Test that before adding stronger instructions; re-state the rule near the action or reset the session. See [[position decay]].

### Advertised length is not effective length

Advertised length is therefore not a promise of task reliability. Suites differ in construction, so their scores are not directly comparable; the detailed benchmark record belongs on the [Sources page](ref:sources). See [[effective context length]].

> [!warning] The honest caveat
> All of this was measured on retrieval tasks over mostly static text. An agent's context is different: it is a growing transcript the agent wrote itself, including its own mistakes. Degradation there is plausibly *worse*, because self-written distractors are maximally plausible. But that transfer is reasoning, not measurement [D].

## Five constraints around a context decision

These are the research's operating categories, not five literal forces in every model. Use the first signal you can observe to choose what to measure and change.

<figure class="diagram">
<p class="diagram__title">Route the symptom to a first move</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 330" role="img" aria-labelledby="f3-t">
<title id="f3-t">A diagnostic map from an observed context symptom to one of five constraints and a first engineering move.</title>
<text class="dg-k" x="20" y="20">OBSERVED SIGNAL</text>
<text class="dg-k" x="265" y="20">CONSTRAINT</text>
<text class="dg-k" x="455" y="20">FIRST MOVE</text>
<rect class="dg-box" x="10" y="35" width="220" height="45" rx="7"/>
<text class="dg-s" x="20" y="62">Irrelevant material dominates</text>
<rect class="dg-box--accent" x="255" y="35" width="170" height="45" rx="7"/>
<text class="dg-t" x="340" y="62" text-anchor="middle">Dilution</text>
<rect class="dg-box" x="445" y="35" width="265" height="45" rx="7"/>
<text class="dg-s" x="455" y="62">Narrow retrieval and remove dead context</text>
<line class="dg-line" x1="230" y1="57" x2="255" y2="57"/>
<polygon class="dg-head" points="255,52 265,57 255,62"/>
<line class="dg-line" x1="425" y1="57" x2="445" y2="57"/>
<polygon class="dg-head" points="445,52 455,57 445,62"/>
<rect class="dg-box" x="10" y="95" width="220" height="45" rx="7"/>
<text class="dg-s" x="20" y="122">A rule is ignored late</text>
<rect class="dg-box--accent" x="255" y="95" width="170" height="45" rx="7"/>
<text class="dg-t" x="340" y="122" text-anchor="middle">Position</text>
<rect class="dg-box" x="445" y="95" width="265" height="45" rx="7"/>
<text class="dg-s" x="455" y="122">Restate it near the action; test again</text>
<line class="dg-line" x1="230" y1="117" x2="255" y2="117"/>
<polygon class="dg-head" points="255,112 265,117 255,122"/>
<line class="dg-line" x1="425" y1="117" x2="445" y2="117"/>
<polygon class="dg-head" points="445,112 455,117 445,122"/>
<rect class="dg-box" x="10" y="155" width="220" height="45" rx="7"/>
<text class="dg-s" x="20" y="182">Two facts conflict</text>
<rect class="dg-box--accent" x="255" y="155" width="170" height="45" rx="7"/>
<text class="dg-t" x="340" y="182" text-anchor="middle">Recency bias in conflicts</text>
<rect class="dg-box" x="445" y="155" width="265" height="45" rx="7"/>
<text class="dg-s" x="455" y="182">Reset with handoff; save state first</text>
<line class="dg-line" x1="230" y1="177" x2="255" y2="177"/>
<polygon class="dg-head" points="255,172 265,177 255,182"/>
<line class="dg-line" x1="425" y1="177" x2="445" y2="177"/>
<polygon class="dg-head" points="445,172 455,177 445,182"/>
<rect class="dg-box" x="10" y="215" width="220" height="45" rx="7"/>
<text class="dg-s" x="20" y="242">Cost jumps after a prompt edit</text>
<rect class="dg-box--accent" x="255" y="215" width="170" height="45" rx="7"/>
<text class="dg-t" x="340" y="242" text-anchor="middle">Cache</text>
<rect class="dg-box" x="445" y="215" width="265" height="45" rx="7"/>
<text class="dg-s" x="455" y="242">Stabilise the prefix; price the rewrite</text>
<line class="dg-line" x1="230" y1="237" x2="255" y2="237"/>
<polygon class="dg-head" points="255,232 265,237 255,242"/>
<line class="dg-line" x1="425" y1="237" x2="445" y2="237"/>
<polygon class="dg-head" points="445,232 455,237 445,242"/>
<rect class="dg-box" x="10" y="275" width="220" height="45" rx="7"/>
<text class="dg-s" x="20" y="302">An important detail disappears</text>
<rect class="dg-box--accent" x="255" y="275" width="170" height="45" rx="7"/>
<text class="dg-t" x="340" y="302" text-anchor="middle">Information loss</text>
<rect class="dg-box" x="445" y="275" width="265" height="45" rx="7"/>
<text class="dg-s" x="455" y="302">Offload first; compress second</text>
<line class="dg-line" x1="230" y1="297" x2="255" y2="297"/>
<polygon class="dg-head" points="255,292 265,297 255,302"/>
<line class="dg-line" x1="425" y1="297" x2="445" y2="297"/>
<polygon class="dg-head" points="445,292 455,297 445,302"/>
</svg>
</div>
<figcaption>A first-pass routing map. The categories overlap in real failures; choose the most observable signal, then verify the change [D].</figcaption>
</figure>

| Constraint | What changes | Measure |
|---|---|---|
| **Dilution** | More candidates compete for relevance. Track [[relevance density]], not window utilisation. | Relevant tokens ÷ total tokens; compare a narrow read with a complete one. |
| **Position** | Retrieval depends on where material lands and on the task. | Place the same fact at different positions in a small repeat test. |
| **Recency bias in conflicts** | A later claim can dominate an earlier one when facts conflict; this is model- and harness-dependent [D]. | Find whether the first appearance of a claim came from tool output or an assistant message. |
| **Cache** | [[Prefix caching]] stops at the first changed byte [P]. | Cache hit rate and cache-adjusted cost; see [chapter 10](ch:metrics-and-economics#belief-1-cutting-tokens-cuts-cost). |
| **Information loss** | Summaries, masks and truncation remove detail; only some cuts are reversible. | Re-fetch rate after compaction; record what was offloaded and addressable. |

> [!key] A rule worth memorising
> You cannot delete from a transcript by talking to it. That is why resetting a session beats arguing with it.

For information loss, the decisive distinction is recoverability:

| Loss type | Recoverable? | Example |
|---|---|---|
| **Reversible offload** | Yes: the content still exists and has an address | Tool output written to a file, replaced in context by its path |
| **Lossy compression** | No: a paraphrase cannot be inverted | An LLM summary of the transcript |
| **Hard truncation** | No, unless it was logged elsewhere | Dropping the oldest turns first |
| **Masking** | Depends: masked-but-kept is recoverable, masked-and-dropped is not | Replacing old tool output with placeholders |

**Reversibility is usually worth more than compression ratio.** The measured addressable-recall comparison is in [chapter 6](ch:compaction-and-memory#result-4-lossless-addressable-compaction-beats-every-lossy-baseline) [S].

A reset clears poisoned history, but it also discards unrecorded state; write a handoff before paying that cost.

## Five ways context fails

Drew Breunig describes four failure modes. This research adds starvation because a missing file can leave no transcript trace.

<figure class="diagram">
<p class="diagram__title">The five failure modes, and how visible each one is</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 230" role="img" aria-labelledby="f4-t">
<title id="f4-t">Poisoning, distraction, confusion and clash are usually inspectable in the transcript. Starvation is often silent.</title>
<rect class="dg-box" x="10" y="20" width="130" height="120" rx="8"/>
<text class="dg-t" x="75" y="46" text-anchor="middle">Poisoning</text>
<text class="dg-s" x="75" y="70" text-anchor="middle">a false fact</text>
<text class="dg-s" x="75" y="86" text-anchor="middle">becomes canon</text>
<rect class="dg-box" x="152" y="20" width="130" height="120" rx="8"/>
<text class="dg-t" x="217" y="46" text-anchor="middle">Distraction</text>
<text class="dg-s" x="217" y="70" text-anchor="middle">the agent copies</text>
<text class="dg-s" x="217" y="86" text-anchor="middle">its own history</text>
<rect class="dg-box" x="294" y="20" width="130" height="120" rx="8"/>
<text class="dg-t" x="359" y="46" text-anchor="middle">Confusion</text>
<text class="dg-s" x="359" y="70" text-anchor="middle">irrelevant context</text>
<text class="dg-s" x="359" y="86" text-anchor="middle">gets used</text>
<rect class="dg-box" x="436" y="20" width="130" height="120" rx="8"/>
<text class="dg-t" x="501" y="46" text-anchor="middle">Clash</text>
<text class="dg-s" x="501" y="70" text-anchor="middle">contradictions</text>
<text class="dg-s" x="501" y="86" text-anchor="middle">get blended</text>
<rect class="dg-box--accent" x="580" y="20" width="130" height="120" rx="8"/>
<text class="dg-t" x="645" y="46" text-anchor="middle">Starvation</text>
<text class="dg-s" x="645" y="70" text-anchor="middle">a needed fact</text>
<text class="dg-s" x="645" y="86" text-anchor="middle">never arrives</text>
<line class="dg-line dg-line--info" x1="10" y1="175" x2="566" y2="175"/>
<text class="dg-k" x="288" y="200" text-anchor="middle">USUALLY INSPECTABLE</text>
<line class="dg-line dg-line--accent dg-line--dash" x1="580" y1="175" x2="710" y2="175"/>
<text class="dg-k" x="645" y="200" text-anchor="middle">OFTEN SILENT</text>
<text class="dg-s" x="645" y="218" text-anchor="middle">survives review</text>
</svg>
</div>
<figcaption>Four failures are usually inspectable in the transcript. Starvation can leave a clean-looking trajectory and a wrong answer, so it is easy to miss in review.</figcaption>
</figure>

The diagram gives the taxonomy. This table gives the diagnostic action.

| Failure | The tell | Containment |
|---|---|---|
| **Poisoning** | A confident symbol or API claim first appeared in an assistant message, not tool output. Compaction may [[laundering|launder]] it into a settled fact. | Restart from before the false claim and reground it in tool output. |
| **Distraction** | The same tool and arguments recur without new information. | Reset with a short note of what was tried and ruled out; instrument a [[loop detector]]. |
| **[[confusion|Confusion]]** | The agent chooses something applicable but wrong for the situation, such as web search instead of local grep. | Remove irrelevant material or tools. The measured tool-count effect is in [chapter 8](ch:tool-surface#the-measured-damage). |
| **Clash** | Output blends current and withdrawn requirements. | Keep one current decision record; treat the transcript as evidence, not state. |
| **Starvation** | The decisive file was never read, so the trajectory looks clean and ends wrong. | Run a [[read-coverage]] audit and improve retrieval. |

> [!key] The first diagnostic question
> Did the decisive fact or file ever enter context? If not, investigate starvation. If yes, inspect the trace for poisoning, distraction, confusion or clash.
>
> **Starvation argues for better retrieval, not more context.** It is the one failure that the subtraction default does not fix. The answer is not "add more". It is "add the right thing", which is a retrieval-quality problem. See [chapter 5](ch:retrieval).

Constraints describe what pushes context off course. Failure modes describe the resulting symptom. Use the constraint map to choose what to measure, then this table to choose containment. The operations below describe where to intervene.

## Why coding-agent context is distinctive

The mechanisms above are general. Coding agents make them especially consequential because context contains mutable repository state, executable evidence and large tool outputs.

| Property | What it means | Practical consequence |
|---|---|---|
| **The repository is the working surface and evidence source** | The agent edits what it reads. A previously read file can become stale after the agent changes it. | Re-read before you re-edit; use just-in-time retrieval. |
| **Verification is executable** | Tests, compilers and linters turn many claims into machine-checkable results. | Let the test suite determine how much compaction risk you can afford. |
| **Tool output is large and often disposable** | A `pytest` run or install log may contain thousands of tokens where one line matters. | Shape output first; detailed measurements belong in [chapter 2](ch:anatomy) and [chapter 18](ch:tooling). |
| **Structure is a precise retrieval signal** | Directory layout, import graphs, symbol tables and test-to-source mapping can be recomputed from source. | Start with structural retrieval; add semantic retrieval where vocabulary gaps justify it. |

## The operations you can perform on context

A useful operational taxonomy is four transformations plus a prevention gate: write, select, compress and isolate, with prevent stopping waste before it enters. This adapts LangChain's write/select/compress/isolate frame and adds prevention as a preceding gate [P].

<figure class="diagram">
<p class="diagram__title">A common operating order, not a requirement</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 205" role="img" aria-labelledby="f5-t">
<title id="f5-t">A common, non-mandatory operating order: prevent waste, write recoverable state, select what is needed, compress after offloading, and isolate when a new boundary is useful.</title>
<rect class="dg-box--accent" x="10" y="35" width="125" height="90" rx="8"/>
<text class="dg-k" x="72" y="58" text-anchor="middle">PREVENT</text>
<text class="dg-s" x="72" y="82" text-anchor="middle">stop waste</text>
<text class="dg-s" x="72" y="100" text-anchor="middle">before it enters</text>
<line class="dg-line dg-line--accent" x1="135" y1="80" x2="150" y2="80"/>
<polygon class="dg-head--accent" points="150,75 160,80 150,85"/>
<rect class="dg-box" x="160" y="35" width="125" height="90" rx="8"/>
<text class="dg-k" x="222" y="58" text-anchor="middle">WRITE</text>
<text class="dg-s" x="222" y="82" text-anchor="middle">offload and</text>
<text class="dg-s" x="222" y="100" text-anchor="middle">leave an address</text>
<line class="dg-line" x1="285" y1="80" x2="300" y2="80"/>
<polygon class="dg-head" points="300,75 310,80 300,85"/>
<rect class="dg-box" x="310" y="35" width="125" height="90" rx="8"/>
<text class="dg-k" x="372" y="58" text-anchor="middle">SELECT</text>
<text class="dg-s" x="372" y="82" text-anchor="middle">retrieve only</text>
<text class="dg-s" x="372" y="100" text-anchor="middle">what is needed</text>
<line class="dg-line" x1="435" y1="80" x2="450" y2="80"/>
<polygon class="dg-head" points="450,75 460,80 450,85"/>
<rect class="dg-box" x="460" y="35" width="125" height="90" rx="8"/>
<text class="dg-k" x="522" y="58" text-anchor="middle">COMPRESS</text>
<text class="dg-s" x="522" y="82" text-anchor="middle">reduce after</text>
<text class="dg-s" x="522" y="100" text-anchor="middle">offloading</text>
<line class="dg-line" x1="585" y1="80" x2="600" y2="80"/>
<polygon class="dg-head" points="600,75 610,80 600,85"/>
<rect class="dg-box" x="610" y="35" width="100" height="90" rx="8"/>
<text class="dg-k" x="660" y="58" text-anchor="middle">ISOLATE</text>
<text class="dg-s" x="660" y="82" text-anchor="middle">new scope,</text>
<text class="dg-s" x="660" y="100" text-anchor="middle">then select</text>
<path class="dg-line dg-line--accent dg-line--dash" d="M522,130 C522,175 372,180 372,130"/>
<polygon class="dg-head--accent" points="372,130 367,140 377,140"/>
<path class="dg-line dg-line--accent dg-line--dash" d="M660,130 C660,166 430,175 372,130"/>
<polygon class="dg-head--accent" points="372,130 367,140 377,140"/>
<text class="dg-s" x="360" y="198" text-anchor="middle">compressing can return to selection; isolation starts a new selection scope</text>
</svg>
</div>
<figcaption>Prevention reduces what enters context; the remaining operations decide what survives, enters, shrinks or is isolated. This is a common order, not a requirement; verify the loop for your harness [D].</figcaption>
</figure>

| Operation | Coding-agent examples | Main risk |
|---|---|---|
| **Prevent** | Output shaping, ignore files, fewer tools, quiet flags | Hiding a line you needed |
| **Write** | Scratch files, plan files, decision logs, memory | Staleness or memory nobody reads |
| **Select** | grep, file reads, symbol lookup, recall | The wrong thing, or too much |
| **Compress** | Compaction, summaries, masking | Losing the decisive fact for good |
| **Isolate** | Sub-agents, session resets, per-task scope | Losing shared understanding |

The loop matters: offload before compressing; after isolation, select again in the new scope. Compression rewrites the prompt and can fight the cache [P].

## What "good" looks like

Here is a definition that later chapters can be checked against.

> [!key] A well-managed context
> At each step, the tokens present are the **smallest set** that makes the correct next action **inferable**. Everything absent is **recoverable** on demand. And keeping it that way **costs less** than the errors it prevents.

Each clause is a testable property.

| Property | Violated by | How to test it |
|---|---|---|
| **Sufficiency**: the next action is inferable | Starvation | Read-coverage audits on failures |
| **Minimality**: the smallest such set | Distraction, confusion, dilution | Relevance density; remove a segment and see if the solve rate moves |
| **Recoverability**: what is missing can be fetched | Lossy compaction with no offload | After each compaction, ask: could the agent get that back? |
| **Economy**: it costs less than it saves | Elaborate memory nobody queries | The cost model in [chapter 10](ch:metrics-and-economics) |

This programme therefore optimises for sufficiency, minimality, recoverability and economy—not completeness for its own sake.

## Your next action

Take one failed coding-agent run. Mark the decisive context as **starvation (missing), distraction or confusion (irrelevant), clash (conflicting), poisoning (false/unverified), or information loss (unrecoverable)**. Record the first observable tell, then choose one response: **retrieve, remove, offload or reset**. Use the [context postmortem](ch:templates#7-context-postmortem), then carry the diagnosis into [Chapter 2](ch:anatomy) or the [retrieval chapter](ch:retrieval).
