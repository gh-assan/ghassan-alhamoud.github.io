## The research question

At inference time, a model can act on two sources: patterns encoded in its weights and information placed in the current input. The repository, yesterday's conversation, CI logs and the ticket affect the next action only when the harness retrieves and presents them. That machinery is rarely designed as one system. It accretes.

The question is **not** "how do I fit more into the window?" That has an answer (buy a bigger window), and the answer does not work. It is:

> [!key] The question
> Given a coding agent working on a real repository over a multi-hour task, **what should be in its context at each step, what should not, who decides, how do you know the decision was right**, and how do you build a system that keeps deciding well as the repository, the model and the harness change underneath you?

The strong claim under test: **before changing the model or adding tools, teams running long repository tasks should test whether context discipline is their binding constraint.**

Context failures are also the quietest. An agent with a bad loop spins visibly. An agent with bad evaluation reports a number you can argue about. An agent with bad context management quietly gets things wrong, and the transcript looks reasonable the whole way down.

## Sub-questions and where they are answered

| Sub-question | Answered in |
|---|---|
| What is context mechanically, and when does adding more make coding agents less reliable? | [Chapter 1](ch:foundations) |
| What are the segments of a context budget, and which can you control? | [Chapter 2](ch:anatomy) |
| Which ten methods survive scrutiny, and how do you choose among them? | [Chapters 3](ch:ten-methods) and [4](ch:choosing-methods) |
| How should code enter context? | [Chapter 5](ch:retrieval) |
| How do compaction, offload and memory lose information, at what measured cost? | [Chapter 6](ch:compaction-and-memory) |
| When does splitting context across sub-agents help or hurt? | [Chapter 7](ch:sub-agents) |
| How do tools, MCP servers and skills consume context? | [Chapter 8](ch:tool-surface) |
| How do you evaluate a context change, with what statistical design? | [Chapter 9](ch:evaluation) |
| What do you measure, and what does context really cost? | [Chapter 10](ch:metrics-and-economics) |
| Which calls have no clean answer? | [Chapter 11](ch:hard-calls) |
| How does context management fail, and how do you contain it? | [Chapter 12](ch:failure-modes) |
| What looks like good hygiene and is not? | [Chapter 13](ch:antipatterns) |
| What do these decisions look like on documented incidents? | [Chapter 14](ch:case-studies) |
| What is a concrete, sequenced plan? | [Chapter 15](ch:optimisation-plan) |
| How does a team score itself and get one next action? | [Chapter 16](ch:diagnostic) |
| What small habits pay for themselves? | [Chapter 17](ch:tips) |
| Which open-source tools are worth adopting? | [Chapter 18](ch:tooling) |
| Which forms make this operational? | [Appendix A](ch:templates) |
| What are the transferable, falsifiable lessons? | [Appendix B](ch:lessons) |

## Eight design commitments

Fixed before writing, to avoid the usual failure of "context engineering best practices" content: mostly restated blog posts, some vendor pitch, very little measurement.

| # | Commitment | What it rules out |
|---|---|---|
| C1 | **Context is a budget with a return curve, not a container with a capacity.** The question is always what a token displaces, never whether it fits. | "Does it fit?" reasoning |
| C2 | **No technique without its loss and its cost.** Every method states its mechanism, preconditions, cost, what it loses, how to detect trouble and a decision test. | Advertised techniques |
| C3 | **The harness confound is first-class.** Every claim says whether it is about the model, the strategy, the harness or an unseparated mix. | Harness results presented as strategy results |
| C4 | **Statistical honesty.** No single-run comparison is presented as a finding; where a study reports Pass@k and Pass^k, both are quoted. | Quoting only averages |
| C5 | **Subtraction is the default, and removal is a legitimate output.** "Delete this", "turn that off" are reachable conclusions. | False balance toward adding |
| C6 | **Cost has four lines**: tokens, cache, latency and people. | Token-only cost claims |
| C7 | **Model-, vendor- and tool-agnostic.** Products appear as examples of a mechanism, never as endorsements; product-specific behaviour is marked as a moving target. | Advice that expires with the next release |
| C8 | **Everything stated so it can be wrong.** Numbers carry provenance, claims carry falsification conditions, composites are labelled. | Unfalsifiable slogans |

## Method

1. **Ground truth.** Three bodies of work read against each other: empirical long-context research (for the *shape* of the degradation curve), the 2026 agent-context papers (for measured changes at compaction boundaries) and practitioner engineering writing (for mechanism, discounted for product claims). Vendor numbers about vendor products are upper bounds.
2. **Derive the frame.** A segment entered the [anatomy](ch:anatomy) only if a documented class of failure is exactly "this segment was too large, too small, stale or in the wrong place".
3. **Catalogue.** Ten methods chosen by four tests (mechanism, evidence, independence, decidability), with a published benched list. See [how the ten were chosen](ch:ten-methods#how-the-ten-were-chosen).
4. **Measurement layer.** Evaluation design specific to context changes, because their effects are small, fully harness-confounded, and show up in variance first.
5. **Apparatus.** Hard calls, failures, metrics, antipatterns, cases, tooling, lessons, habits, templates and a scored diagnostic.
6. **Personalise.** A sequenced plan with a measurement gate per phase, so nothing is adopted on faith.

## Out of scope

Stated so that the omissions are choices, not oversights.

- **Model internals**: attention variants, kernel-level cache eviction, positional encodings. Referenced only where they explain observable behaviour.
- **Training-time context**: long-context pretraining and compaction-aware training appear only where they change what an operator should do today.
- **Non-coding agents**: browser, GUI and research agents appear only where a finding transfers. Coding agents are special because the filesystem is simultaneously the task, persistent memory and a major evidence source; it is not complete ground truth.
- **Prompt quality**: how to write a good instruction is prompt engineering. How much of it to load, when and at what cost is context engineering.
- **Security**: context poisoning through prompt injection is named as a failure with containment; the adversarial surface is another research programme's subject.

## The acceptance bar

The work was not considered done until 27 criteria passed, plus two "anti-bar" conditions that fail the work even if every criterion passes. **Result: 27 of 27 passed. Three passed with stated caveats. Both anti-bar conditions passed.**

<details class="rs-disclosure rs-inline-disclosure" markdown="1">
<summary>The 27 criteria, condensed</summary>

| Area | Criterion | Delivered |
|---|---|---|
| Foundations | Context defined mechanically; degradation backed by a multi-model study | 18 models, four vendors |
| Anatomy | Segments with size, owner, failure mode and measurement | 9 segments |
| Methods | Exactly 10 methods with the selection tests applied visibly, plus a benched list | 10 methods, 10 benched |
| Methods | Each method has procedure, mechanism, cost, loss, detection, example and decision test | All ten |
| Methods | An executable procedure with time budgets for choosing | 55-minute procedure |
| Retrieval | Lexical, semantic, structural and LSP compared; harness confound explicit | 4 paradigms, 9 pathologies |
| Compaction | Measured results from at least three 2026 studies, including a stability result | 6 results, 5 studies |
| Multi-agent | Both documented positions and a decision rule | The composability test |
| Tools | Measured degradation numbers and progressive-disclosure arithmetic | Two converging methods |
| Evaluation | At least 8 design axes, 10 named results, a worked interval and power calculation | 8 axes, 12 results |
| Decisions | At least 20 hard calls with both sides and flip conditions | 25 |
| Failures | At least 35 failure modes with tell, detection, containment and fix | 44 |
| Metrics | At least 20 metrics with formula and the decision each drives | 26 |
| Economics | Worked economics including the cache and people lines | Four-line model |
| Antipatterns | At least 14 with the distinguishing tell | 16 |
| Cases | At least 6, including one that made things worse and one removal | 8 |
| Tooling | At least 20 named tools with layer, cost and verdict | 54 entries |
| Lessons | At least 50 with mechanism and falsification | 58 |
| Habits | At least 40, ordered by when they apply | 62 |
| Plan | Phases, effort, a gate per phase and a stop rule | 7 phases, ~16 hours |
| Templates | At least 8 standalone templates | 8 |
| Diagnostic | A scored self-audit producing one next action | 35 items |
| Evidence | Non-obvious claims labelled; sources with support, discount and falsifiers | Throughout |
| Siblings | Explicit boundaries with related research | See below |

</details>

### The three caveats

- **Case studies, "majority sourced", is true only on a generous reading.** Of eight cases, four are [S], two are [P] first-party accounts, and two are labelled composites [C]. Strictly, [S] is a plurality, not a majority. Six of eight describe real events; four have a published method.
- **Derived claims are under-labelled.** Rule R3 (long-context findings transfer to agents only by inference) applies far more widely than the explicit [D] labels suggest. Treat every application of static-text research to a live agent as derived, whether or not it carries the label.
- **One of the central empirical claims is under-verified.** The observation-masking result was captured from the paper's summary. It is corroborated in direction and is not the sole support for any conclusion, but re-read it before citing. The [sources page](ref:sources#verification-caveat) lists every figure in this category.

### The two anti-bar conditions

1. **If a reader with a real agent cannot, after reading the methods and the diagnostic, name their single largest wasteful segment and the change that would shrink it, the work has failed.** It passes: the [one-question version](ch:diagnostic#the-one-question-version) branches to a named action, and a reader whose largest segment is tool definitions reaches the representative-sample deletion check in under fifteen minutes.
2. **If any section could be replaced by "just use a bigger window" or "just run `/compact`" without loss, it is filler.** It passes, and the research argues the opposite of both: more context is not a reliability guarantee, and naive compaction is where the damage is.

## Relationship to sibling research

> [!key] One-line division of responsibility
> Loop engineering designs the machine, evaluation designs the tape measure, and context management decides what the machine is allowed to look at.

| Research | Its question | Boundary with this one |
|---|---|---|
| Loop engineering | How does the agent's iterate-and-repair loop work, and what makes it converge? | That asks what the agent does next; this asks what it can see when it decides |
| Agent evaluation | How do you know the agent got better? | That designs the instrument; chapter 9 specialises it to context changes |
| Prompt cache architecture | What does editing a file mid-session cost once caching is priced in? | The cache annex to this research's cost arithmetic |
| Multi-agent maturity model | When is a team ready for multi-agent systems? | Chapter 7 covers only the context argument |

## About this edition

This web edition was rewritten from the original research package (about 72,000 words across 32 files, locked 2026-09-05) for readability and navigation: plain language, one question per chapter, a learning path in five parts, figures and charts, a one-page summary, an FAQ and a glossary. Numbers, evidence labels, caveats and falsifiers are carried over unchanged. Where the original used internal section references, this edition uses links.

## How to cite

```text title="citation"
Alhamoud, G. (2026). Context Management in Coding Agents (RSCH-001, v1.0).
https://ghassan-alhamoud.com/research/context-management-coding-agents/
```
