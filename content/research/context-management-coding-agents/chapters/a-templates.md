## Why forms rather than advice

Every template here exists because a specific, measured failure happens when the decision behind it is made implicitly. A form is not bureaucracy. **It is a way to make a decision before you are under pressure to make it badly.**

Use them in a scratch directory, in the repository or in a notes app. The value is in filling them in, not in filing them.

| Template | Use it for | Time |
|---|---|---|
| [Context budget audit](#1-context-budget-audit) | The Phase 0 baseline and the quarterly re-audit | 60–90 minutes the first time, 30 after |
| [Tool surface audit](#2-tool-surface-audit) | Phase 1 deletion and quarterly re-bloat control | 30 minutes |
| [Plan file](#3-plan-file) | The living state document | 5 minutes to start, 1 minute per update |
| [Compaction schema](#4-compaction-schema) | Replacing your compaction prompt | 15 minutes |
| [Session handoff](#5-session-handoff) | Ending a session deliberately | 5 minutes |
| [Sub-agent contract](#6-sub-agent-contract) | Deciding whether and how to delegate | 10 minutes |
| [Context postmortem](#7-context-postmortem) | Understanding a failed or unsatisfying task | 15 minutes |
| [Context experiment spec](#8-context-experiment-spec) | Any measured context change | 20 minutes |

> [!key] If eight is too many
> Three carry most of the value: the [context budget audit](#1-context-budget-audit) (without it you optimise someone else's bottleneck), the [compaction schema](#4-compaction-schema) (the best value-per-minute bet this research offers [D]) and the [context postmortem](#7-context-postmortem) (the starvation/dilution split decides every later decision).

## 1. Context budget audit

**For:** the Phase 0 baseline and the quarterly re-audit. **When:** before any optimisation, then every quarter. **Time:** 60–90 minutes the first time, 30 after.

**The field that matters: section 6, the failure split.** Every other number tells you *where the tokens are*. This one tells you *which direction to move*. Get it backwards and you apply the volume fix to a recall problem and make things measurably worse.

````markdown title="context-budget-audit.md"
# Context Budget Audit

**Date:** ____________  **Harness + version:** ____________  **Repo:** ____________
**Sessions sampled:** ____________ (use your 3 longest recent sessions)

## 1. Prefix tax (segments 1–4)

Fresh session, send a single `.`, record reported input tokens.

| Measure | Tokens |
|---|---:|
| Total prefix tax (T1) | |
| — of which tool definitions | |
| — of which instruction files | |
| — of which skill descriptors | |
| — remainder (system prompt, inferred) | |

## 2. Tool surface

| Server | Tools | Definition tokens | Invocations (20 sessions) | Verdict |
|---|---:|---:|---:|---|
| | | | | delete / defer / keep |
| | | | | |
| **Total** | | | | |

- Defined:invoked ratio (T3): ______ : 1   *(target < 3:1)*
- Active tool count: ______   *(set a local target from task coverage, selection errors and prompt cost)*

## 3. Session distribution

For each sampled session, bucket tokens by segment.

| Segment | Session A | Session B | Session C | Median % |
|---|---:|---:|---:|---:|
| 1 System prompt | | | | |
| 2 Tool definitions | | | | |
| 3 Instruction files | | | | |
| 4 Skill descriptors | | | | |
| 5 Retrieved code | | | | |
| 6 Tool results | | | | |
| 7 Agent messages | | | | |
| 8 User turns | | | | |
| 9 Summaries / memory | | | | |
| **Total** | | | | 100% |

**Largest segment I control:** ____________________

**Median input tokens per sampled session:** ____________________

**Retention integral:** first convert each median share to tokens (`median % × median input tokens ÷ 100`),
then multiply by the turns that segment stays in context.
Record the before/after totals and rank the largest contributions before choosing a change.

| Segment | Median % | Median tokens | Turns retained | Before tokens × turns | After tokens × turns |
|---|---:|---:|---:|---:|---:|
| 1 System prompt | | | | | |
| 2 Tool definitions | | | | | |
| 3 Instruction files | | | | | |
| 4 Skill descriptors | | | | | |
| 5 Retrieved code | | | | | |
| 6 Tool results | | | | | |
| 7 Agent messages | | | | | |
| 8 User turns | | | | | |
| 9 Summaries / memory | | | | | |
| **Total** | | | | | |

## 4. Command ranking

| Command | Total output tokens | % of tool output | Wrapped? |
|---|---:|---:|---|
| | | | |
| | | | |
| | | | |

Top 3 as % of session tokens: ______%   *(if > 25%, test output shaping; keep it only if measured task outcomes and priced costs justify the setup)*

## 5. Density and waste

| Metric | Value | Target |
|---|---:|---|
| T6 Peak utilisation | % | < 75% |
| T8 Relevance density (est.) | % | > 15% |
| T9 Read-utilisation (sample 20 reads) | % | > 15% |
| T10 Tool-result share | % | < 35% |
| T24 Cache hit rate | % | > 70% |

## 6. Failure split (last 10 failures)

For each failure: **was the decisive file ever read?**

| # | Task | Decisive file | Ever read? | Class |
|---|---|---|---|---|
| 1 | | | Y / N | starvation / dilution |

**Starvation : Dilution = ______ : ______**

> Mostly starvation → fix retrieval *quality*; do NOT reduce volume.
> Mostly dilution → reduce volume, raise density.

## 7. Routing decision

From the routing table (choosing your methods, step 2), my binding constraint is: ____________________
First method to apply: ____________________
Re-measure on: ____________ (date)
````

## 2. Tool surface audit

**For:** Phase 1 deletion and quarterly re-bloat control. **When:** after the Phase 0 baseline; a candidate when tool definitions are the largest controllable segment. **Time:** 30 minutes.

**The field that matters: the security exceptions table.** Keeping a server that duplicates the shell is defensible when it is a security control (constrained surface, auth handling, audit trail). It is not defensible when it happened by accident. The table forces the distinction, and most rows come back empty.

````markdown title="tool-surface-audit.md"
# Tool Surface Audit

**Date:** ____________  **Budget:** ______ active tools, ≤15K definition tokens *(set the tool-count budget from measured workload needs)*

## Inventory

| # | Tool | Server | Schema tokens | Invocations (20 sessions) | Shell equivalent? | Class |
|---|---|---|---:|---:|---|---|
| 1 | | | | | | dead / redundant / rare-critical / core |

**Totals:** ______ tools, ______ tokens, ______ distinct tools invoked

## Classification rules

| Class | Criterion | Action |
|---|---|---|
| Dead | 0 invocations in a representative 20-session sample | **Deletion candidate; verify task coverage and keep rollback.** |
| Redundant | Duplicates `gh` / `psql` / `curl` / `rg` / `git` | **Deletion candidate; verify coverage and keep rollback**, unless a security control (state why below) |
| Rare-critical | < 3 invocations but decisive | Defer definitions, or move behind code execution |
| Core | Frequent | Keep eager; trim description prose |

## Security exceptions

Any redundant server kept as a *security* control rather than a convenience — state it here, or delete it.

| Server | Tokens | Security justification |
|---|---:|---|
| | | |

## Actions taken

| Action | Server / tool | Tokens saved |
|---|---|---:|
| | | |
| **Total recovered** | | |

Prefix tax before: ______  after: ______  (−____%)

## Post-change verification (next 20 sessions)

- Capabilities missed: ______  *(target 0; restore that specific server if > 1)*
- Extra round trips from deferral: ______
- Wrong-tool selections: ______  *(target < 2% of tool calls)*
- Task success change: ______

## Next audit due

____________ (quarterly)
````

## 3. Plan file

**For:** the living state document. **When:** any task over about 30 minutes. **Time:** 5 minutes to start, 1 minute per update.

**The field that matters: Ruled out, with evidence.** The transcript already records what was tried. What it does not hold, anywhere attended, is *why it will not work*, and that is exactly what gets re-proposed after a boundary. Runner-up: the *last updated* line, which makes drift visible.

````markdown title="plan-file.md"
# PLAN.md — living state document

> Rewrite **in place**. This is state, not a log. Cap: 80 lines.
> If it exceeds 80 lines, the task needed decomposition.
> Optional practice to evaluate: re-read after a compaction, reset, or sub-agent return as an orientation step. TRACE did not test this action.

**Last updated:** turn ____ / after ____________________

## Goal

<one sentence — the original task, verbatim where possible>

## Definition of done

<the exact verification that ends this task, e.g. `pytest tests/checkout -q` passes and lint is clean>

## Constraints

- <what must not change>
- <what must not be touched>

## Decisions

| Decision | Reason | Evidence |
|---|---|---|
| | | file:line or command |

## Ruled out

> The most valuable section. Prevents re-proposing a rejected approach after a boundary.

| Approach | Why it failed | Evidence |
|---|---|---|
| | | file:line, command output, or error |

## State

- **Done:** <verified complete, with how verified>
- **In progress:** <the current sub-goal, explicitly>
- **Not started:** <remaining>

## Open questions

- <question> — blocking? Y/N

## Offloaded artifacts

| ID / path | What it is |
|---|---|
| `.agent/artifacts/____` | |

## Next action

<one concrete step>
````

## 4. Compaction schema

**For:** replacing your compaction prompt. **When:** before your next long session: it is a text edit. **Time:** 15 minutes.

**The field that matters: exact strings, verbatim.** Paraphrased errors, versions and line numbers cannot be acted on, and they are cheap to keep. Close behind: *Uncertain / unverified*, the only defence against compaction laundering a hypothesis into a fact. A summariser swap alone moved SWE-bench 6.5 points [S], and this is a summariser swap.

````markdown title="compaction-schema.md"
# Compaction Schema

> Replace "summarise the conversation so far" with this.
> Varying only the summariser moved SWE-bench 49.0% → 55.5% [S].
> Each section maps to a measured failure mode.

## Instructions to the summarising model

Produce a summary using EXACTLY the sections below. Do not add narrative.
Preserve every string in "Exact strings" **verbatim** — do not paraphrase,
round, abbreviate, or reformat them. If a fact was hypothesised rather than
verified, say so; do not convert a hypothesis into an assertion.

---

## Goal
<the original task, verbatim where possible>

## State
<counters the 44.6% termination-recognition collapse (AppWorld) [S]>
- **Done:** <item> — verified by: <exact command and result>
- **In progress:** <the single current sub-goal>
- **Not started:** <remaining items>

## Decisions
<counters requirement clash>
- <decision> — because <reason> — evidence: <file:line or command>

## Ruled out
<counters regressive exploration>
- <approach> — because <reason> — evidence: <file:line or command output>

## Exact strings — VERBATIM, DO NOT PARAPHRASE
<counters detail loss>
- Errors:
- Versions:
- Paths and line numbers:
- Config keys / IDs:
- Commands run and their exact results:

## Open questions
- <question> — what would answer it

## Offloaded artifacts
<counters irrecoverability>
| ID / path | Contents |
|---|---|

## Uncertain / unverified
<counters hallucination laundering>
- <claim> — status: hypothesised, not verified

---

## Candidate operating rules to test

| Candidate practice | Evidence and limit |
|---|---|
| Fire on sub-goal closure, test pass, or hypothesis resolution | Inspired by SelfCompact's task-specific rubric; the paper did not test these exact coding-agent events [D] |
| Suppress mid-derivation, mid-edit, when stuck, right after an error | Its math rubric checks for mid-derivation or stuck states; mid-edit and post-error are coding-agent analogies to evaluate [S][D] |
| Max 1 per session | A second compaction summarises a summary |
| Not with < 5 turns remaining | Below the cost breakeven of about four turns [C] (chapter 10) |
| Offload large artifacts BEFORE compacting | Converts irreversible loss to reversible |
| **TRACE result** | +0.108 additional blocked/error actions at the first post-compaction step in AppWorld [S] |
| **Candidate practice** | Test whether rereading PLAN.md as an orientation step improves outcomes; TRACE did not evaluate it |
````

## 5. Session handoff

**For:** ending a session deliberately. **When:** every session that will have a successor. **Time:** 5 minutes.

**The field that matters: key pointers, as `file:line`, never prose.** A pointer survives compression, paraphrase and re-reading. Runner-up: the pre-written *opening line for the next session*, which turns the most expensive moment of the next session into a paste.

````markdown title="session-handoff.md"
# Session Handoff

> Written at the END of a session so the next one starts from state, not chatter.
> This is the **highest-control** context boundary — you author what crosses.
> Pointers survive compression; descriptions do not.

**From session:** ____________  **Date:** ____________
**Repo @ commit:** ____________  **Branch:** ____________

## Where we are, in one sentence

<...>

## Goal (unchanged from the original task)

<...>

## Definition of done

<exact verification command>

## Completed and verified

| What | Verified by (exact command) | Result |
|---|---|---|
| | | |

## In progress

**Current sub-goal:** <...>
**Next concrete action:** <...>
**Files mid-change:** <path — what state they are in, committed or not>

## Ruled out — do not retry

| Approach | Why | Evidence (file:line / command) |
|---|---|---|
| | | |

## Key pointers

> file:line, never prose descriptions.

| What | Where |
|---|---|
| The function that does X | `path:line` |
| The config that controls Y | `path:line` |
| The failing test | `path::test_name` |

## Exact strings that matter

```
<error messages, versions, IDs — verbatim>
```

## Offloaded artifacts

| Path | Contents |
|---|---|
| `.agent/artifacts/____` | |

## Open questions

- <question> — blocking? Y/N

## Opening line for the next session

> Paste this as the first message.

```
Continue from HANDOFF.md and PLAN.md. Current sub-goal: <...>.
Next action: <...>. Do not <...>.
```
````

## 6. Sub-agent contract

**For:** deciding whether and how to delegate. **When:** before every delegation, until the judgment is second nature. **Time:** 10 minutes.

**The field that matters: Q3 of the pre-check**, listing every implicit decision not in the brief. It is the whole Flappy Bird failure reduced to a 60-second question. Runner-up: `notable_outside_scope`, the only in-band mitigation for contract loss.

````markdown title="subagent-contract.md"
# Sub-Agent Contract

> Write this BEFORE delegating. If you cannot fill in "Output schema"
> in under 20 lines, the work is not isolatable — do it linearly.

## Composability pre-check

| # | Question | Answer |
|---|---|---|
| Q1 | Is the composition operator trivial? (state it in one sentence) | |
| Q2 | Can the output schema fit in < 20 lines? | Y / N |
| Q3 | List every implicit decision the sub-agent must make that is NOT in its brief | |
| Q4 | Can the parent verify the result without redoing the work? | Y / N |

**Any "no" or a non-empty Q3 list → do not delegate, or fix the decisions in the brief.**

---

## Task

<one sentence>

## Scope

- **In:** <paths / modules / the question>
- **Out:** <explicitly excluded>

## Tools available

<the minimum set — narrow surfaces are the main quality lever>

## Fixed decisions — do not re-decide

- <convention the parent has already chosen>
- <error shape / naming / logging convention>

## Output schema

```yaml
findings:
  - path: <file:line>
    what: <one line>
    confidence: high | medium | low
notable_outside_scope:      # contract-loss mitigation — do not omit
  - <anything surprising you saw>
transcript_path: <written on termination, for parent recall>
```

## Limits

- `max_result_tokens:` 1500
- `max_turns:` 25

---

## Post-delegation review

| Metric | Value | Healthy |
|---|---:|---|
| Isolation ratio (sub-agent tokens / result tokens) | | > 20:1 |
| Parent context growth | | < 2K |
| Did the parent re-do any of this work? | Y / N | N |
| Did `notable_outside_scope` contain anything useful? | Y / N | — |
````

## 7. Context postmortem

**For:** understanding a failed or unsatisfying task. **When:** after every failure worth understanding. **Time:** 15 minutes.

**The field that matters: section 3, the split.** Starvation, loss, dilution and poisoning look identical from outside and need four different fixes. One question separates them: *was the decisive file ever in context?* Runner-up: section 5, the first-appearance trace, a five-minute grep that confirms or rules out poisoning.

````markdown title="context-postmortem.md"
# Context Postmortem

> Run after any failed or unsatisfying agent task. 15 minutes.
> The goal is one question: **starvation or dilution?** They have opposite fixes.

**Date:** ____________  **Task:** ____________  **Session length:** ____ turns

## 1. What went wrong, in one sentence

<...>

## 2. The decisive fact

What single piece of information, had the agent had it and attended to it, would have produced the right answer?

**Fact:** ____________________
**Where it lives:** `path:line` / command output / not in the repo

## 3. The split

| Question | Answer |
|---|---|
| Was the decisive file/output ever in context? | Y / N |
| If yes — was it still in context at the moment of the wrong decision? | Y / N |
| If it was dropped, what dropped it? | compaction / eviction / sub-agent boundary / reset / never retrieved |

**Classification:**

- **Never retrieved → STARVATION.** Fix retrieval *quality* (structural retrieval). Do NOT reduce volume.
- **Retrieved, dropped at a boundary → LOSS.** Fix offload and the compaction schema.
- **Present and ignored → DILUTION.** Reduce volume, raise density (just-in-time retrieval, output shaping).
- **Present but wrong (stale/hallucinated) → POISONING.** Fix re-read discipline or grounding.

## 4. Context state at the moment of failure

| Measure | Value |
|---|---:|
| Utilisation | % |
| Turns elapsed | |
| Compactions so far | |
| Sub-agent returns so far | |
| Turns since the last boundary | |

> TRACE reports additional blocked/error actions at the first post-compaction step in AppWorld. Use a wider post-boundary window as a local monitoring choice, not as the paper's measured interval.

## 5. First appearance trace (poisoning check)

For the wrong belief the agent held: find its **first** appearance in the transcript.

- Appeared first in: tool result / assistant message / user turn / summary
- If assistant message or summary → **poisoning confirmed**; it was never grounded.

## 6. Loop check

- Same tool + same args ≥ 3 times? Y / N
- If yes, at what turn did it start? ______  *(that is your reset trigger point)*

## 7. Action

| Failure class | Action taken | Owner | Due |
|---|---|---|---|
| | | | |

## 8. Is this recurring?

Occurrences of this class in the last month: ______

> If ≥ 3, the fix is probably in the **repository**, not the agent.
> e.g. near-duplicate symbols, dead code, undocumented invariants.
````

## 8. Context experiment spec

**For:** any measured context change. **When:** before running, never after. **Time:** 20 minutes.

**The field that matters: section 5, is N sufficient?** Most context experiments are underpowered. The useful response is not to abandon them but to **say so**. "+6 points on 40 tasks; the interval is wide and does not separate a real effect from noise" is a legitimate result. "+6 points" alone is not.

````markdown title="context-experiment-spec.md"
# Context Experiment Spec

> Fill in BEFORE running. An experiment specified afterwards is a story.

**Date:** ____________  **Owner:** ____________

## 1. The question

> One sentence, falsifiable.

"Does <change> improve <metric> on <workload>?"

## 2. The single change

**Control (current):** ____________________
**Treatment (one change only):** ____________________

> If you cannot state the change in one line, split the experiment.

## 3. Held constant

| Variable | Value | Verified |
|---|---|---|
| Model + version | | ☐ |
| Harness + version | | ☐ |
| Tool surface (count + tokens) | | ☐ |
| **Compaction prompt** | | ☐ |
| Temperature / sampling | | ☐ |
| Repository commit | | ☐ |

> The compaction prompt is the most-violated row. It is worth 6.5 SWE-bench points of confound [S].

## 4. Task set

- Source: replayed tickets / synthetic / public benchmark
- N = ______  *(see section 5: is this enough?)*
- Stratified by: ____________________
- **Leakage check:** run one arm with retrieval disabled. Tasks still solved: ______
  *(non-zero → the answer is in the ticket text; fix before proceeding)*

## 5. Statistical design

| Parameter | Value |
|---|---|
| Runs per task per arm (k) | ______ *(minimum 2 — Pass² is mandatory)* |
| Design | paired (same tasks both arms) |
| Test | McNemar on discordant pairs |
| Expected effect size | ______ points |
| Required N (see the sample-size section of chapter 9) | ______ |
| **Is N sufficient?** | Y / N — if N, say so in the writeup |

## 6. Metrics

| | Metric | Predicted direction |
|---|---|---|
| Primary | **Pass²** | |
| Secondary | Pass@2 | |
| Cost | cache-adjusted input tokens per solved task | |
| Diagnostic | post-boundary re-fetch rate | |
| Guardrail | cache hit rate | must not fall |

## 7. Stop rule (decide now)

- Total runs: ______ . **No peeking-and-extending.**
- Abandon early if: ____________________

## 8. Results

| Arm | Pass² | Pass@2 | Ratio | Tokens/solved | Cache hit |
|---|---:|---:|---:|---:|---:|
| Control | | | | | |
| Treatment | | | | | |

Discordant pairs: ______ (favouring treatment: ______)
McNemar p: ______
Wilson CI, control: [____, ____]  treatment: [____, ____]

## 9. Conclusion

☐ Adopt  ☐ Reject  ☐ **Inconclusive — intervals overlap** (the most common honest outcome)

**What this does NOT prove:** ____________________
````
