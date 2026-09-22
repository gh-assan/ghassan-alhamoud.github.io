## How the scoring works

Thirty-five items across seven areas. Score each one:

- **0**: not done, or not known
- **1**: partly done, or done inconsistently
- **2**: done and verified

**"Not known" scores zero.** If you cannot state your cache hit rate, you do not have a good one; you have an unmeasured one, and the failures it enables are live.

Two rules make the result honest.

1. **Gating items** are marked ⚑. If a gating item scores 0, its whole area is capped at level 1, whatever the other items score. This stops an elaborate compaction schema from hiding a context nobody has ever measured.
2. **Your overall level is the lowest area level, not the average.** Context fails at its weakest point. A perfect retrieval stack does not help if 30K tokens of dead tool definitions are crowding it out.

> [!try] Score yourself here
> Pick a value for each item. Your area scores, overall level and **one next action** update as you go, and your answers stay in this browser. Without JavaScript this is a printable checklist.

```diagnostic
{
  "areas": [
    {"id": "1", "title": "Measurement", "note": "Gates everything downstream", "items": [
      {"text": "I know my prefix tax in tokens, measured within the last quarter", "gate": true},
      {"text": "I know my defined-to-called tool ratio", "gate": true},
      {"text": "I know my tool-result share of session tokens"},
      {"text": "I know my cache hit rate"},
      {"text": "I can produce a segment-by-segment breakdown of a recent session"}
    ]},
    {"id": "2", "title": "Prefix hygiene", "items": [
      {"text": "Zero-call MCP servers were identified from a representative 20-session sample; any deletion was task-coverage verified and remains rollbackable", "gate": true},
      {"text": "Active tool count is 20 or fewer"},
      {"text": "Tool definitions are 15K tokens or fewer, or deferred"},
      {"text": "The instruction file is 150 lines or fewer and passes the inference test"},
      {"text": "The prefix contains no timestamps, session IDs or per-turn variables"}
    ]},
    {"id": "3", "title": "Prevention", "items": [
      {"text": "Ignore files exclude node_modules/, dist/, lockfiles and generated code", "gate": true},
      {"text": "My three loudest commands are wrapped or filtered"},
      {"text": "Test output is asymmetric: one line on pass, full trace on fail"},
      {"text": "Long output is truncated head-and-tail, never in the middle"},
      {"text": "Full output goes to a file and the path is returned"}
    ]},
    {"id": "4", "title": "Retrieval", "items": [
      {"text": "I have classified recent failures as starvation or dilution", "gate": true},
      {"text": "Symbol-level retrieval is available and used by default"},
      {"text": "Grep context is at least 8 lines, or reads expand to the enclosing symbol"},
      {"text": "No codebase overview or design document is pre-loaded (pointer seed under 2K only)"},
      {"text": "Files are re-read before being re-edited"}
    ]},
    {"id": "5", "title": "State and boundaries", "items": [
      {"text": "Long tasks keep a plan file with a ruled-out section", "gate": true},
      {"text": "Large tool output is offloaded with self-describing stubs"},
      {"text": "Compaction uses an explicit schema, not \"summarise the above\""},
      {"text": "Compaction fires at sub-goal boundaries, not thresholds or timers"},
      {"text": "The plan file is re-read as the first action after any boundary"}
    ]},
    {"id": "6", "title": "Session lifecycle", "items": [
      {"text": "One session is one coherent task", "gate": true},
      {"text": "Sessions are capped at one compaction, then reset"},
      {"text": "I reset rather than argue when a wrong fact is in context"},
      {"text": "I reset on the third repeated action"},
      {"text": "Long sessions end with a written handoff containing file:line pointers"}
    ]},
    {"id": "7", "title": "Evaluation", "items": [
      {"text": "Context changes are adopted one at a time, not in bundles", "gate": true},
      {"text": "I have a task set I can re-run"},
      {"text": "I run k ≥ 2 and compute Pass²"},
      {"text": "Cost is reported cache-adjusted, not as raw tokens"},
      {"text": "I have deleted at least one context component that measurement showed was neutral"}
    ]}
  ],
  "levels": [
    {"min": 0, "name": "L0 Unmanaged", "text": "Context is whatever accumulates. Failures are blamed on the model."},
    {"min": 3, "name": "L1 Aware", "text": "The problem is recognised; responses are ad hoc."},
    {"min": 5, "name": "L2 Hygienic", "text": "Obvious waste is gone. No measurement loop yet."},
    {"min": 7, "name": "L3 Instrumented", "text": "Numbers exist and drive decisions. Changes are attributable."},
    {"min": 9, "name": "L4 Engineered", "text": "Measured, sequenced, with a stop rule and a maintenance cadence."}
  ],
  "actions": {
    "1": {"text": "Run the Phase 0 baseline. Every other action's gate depends on it.", "href": "ch:optimisation-plan#phase-0-baseline"},
    "2": {"text": "Review zero-call MCP servers from a representative sample; verify task coverage and keep rollback before deleting. Candidate win when definitions dominate.", "href": "ch:optimisation-plan#phase-1-deletion"},
    "3": {"text": "Wrap your three loudest commands. One afternoon, 60–90% less tool output.", "href": "ch:optimisation-plan#phase-2-prevention"},
    "4": {"text": "Classify your last 10 failures as starvation or dilution before changing anything.", "href": "ch:templates#7-context-postmortem"},
    "5": {"text": "Replace your compaction prompt with the explicit schema. A 15-minute edit worth up to 6.5 SWE-bench points.", "href": "ch:templates#4-compaction-schema"},
    "6": {"text": "Adopt one mechanical rule: never compact twice. Reset instead.", "href": "ch:ten-methods#m-10-session-lifecycle"},
    "7": {"text": "Build a 30-task replay set you can re-run. Everything else in evaluation depends on it.", "href": "ch:evaluation#the-minimum-viable-experiment"}
  }
}
```

## Levels

Work out a level per area, then take the minimum.

| Area score | Level | What it looks like |
|---:|---|---|
| 0–2 | **L0 Unmanaged** | Context is whatever accumulates. Failures are blamed on "the model". |
| 3–4 | **L1 Aware** | The problem is recognised; responses are ad hoc (`/compact` when it complains). |
| 5–6 | **L2 Hygienic** | The obvious waste is gone. Deletion has happened. No measurement loop. |
| 7–8 | **L3 Instrumented** | Numbers exist and drive decisions. Changes are attributable. |
| 9–10 | **L4 Engineered** | Measured, sequenced, with a stop rule and a maintenance cadence. Removal is routine. |

Most teams that have never audited land at **L0–L1 overall**, often with one area at L3. Usually that area is retrieval, because it is the interesting one to work on. That single high score is diagnostic: effort went where the writing is, not where the tokens are.

## Your one next action

Find your **lowest-scoring area**. Break ties toward the earlier area; the order is deliberate.

| Lowest area | Your next action | Where |
|---|---|---|
| **1 Measurement** | Run the Phase 0 baseline. Nothing else is worth doing first. | [Phase 0](ch:optimisation-plan#phase-0-baseline) |
| **2 Prefix hygiene** | Review zero-call MCP servers from a representative sample; verify task coverage and keep rollback before deleting. | [Phase 1](ch:optimisation-plan#phase-1-deletion) |
| **3 Prevention** | Wrap your three loudest commands: one afternoon, 60–90% less output [P]. | [Phase 2](ch:optimisation-plan#phase-2-prevention) |
| **4 Retrieval** | Classify your last 10 failures as starvation or dilution *before* changing anything. | [Postmortem template](ch:templates#7-context-postmortem) |
| **5 State** | Replace your compaction prompt with the explicit schema: a 15-minute edit worth up to 6.5 SWE-bench points [S]. | [Compaction schema](ch:templates#4-compaction-schema) |
| **6 Lifecycle** | Adopt one mechanical rule: never compact twice; reset instead. | [Session lifecycle](ch:ten-methods#m-10-session-lifecycle) |
| **7 Evaluation** | Build a 30-task replay set you can re-run. | [Minimum viable experiment](ch:evaluation#the-minimum-viable-experiment) |

> [!key] One action, not a programme
> Complete it, re-score that area, then run the diagnostic again. Teams that take the whole list at once cannot attribute anything, which is how you end up with a stack you cannot prune.

## A worked audit [C] {#a-worked-audit}

A team scores itself:

```chart
{
  "type": "hbar",
  "title": "Area scores for one team (out of 10)",
  "categories": ["1 Measurement (gate at 0)", "2 Prefix hygiene (capped)", "3 Prevention", "4 Retrieval", "5 State", "6 Lifecycle", "7 Evaluation (gate at 0)"],
  "series": [{"name": "Area score", "values": [2, 4, 3, 8, 5, 4, 1]}],
  "max": 10,
  "valueFormat": "{v}",
  "highlight": [0, 6],
  "labelWidth": 200,
  "categoryLabel": "Area",
  "caption": "Overall level L0, the minimum of areas 1 and 7. The team's strongest area, retrieval at 8, cannot be trusted because evaluation is at 1 [C].",
  "alt": "Measurement 2, prefix hygiene 4, prevention 3, retrieval 8, state 5, lifecycle 4, evaluation 1."
}
```

| Area | Score | Level | Note |
|---|---:|---|---|
| 1 Measurement | 2 | L0 | Both gating items at 0: nothing measured |
| 2 Prefix hygiene | 4 | L1 | Capped: four servers attached, never audited |
| 3 Prevention | 3 | L1 | Ignore file exists; no command wrapping |
| 4 Retrieval | **8** | L3 | Symbol-level tool installed, tuned, used well |
| 5 State | 5 | L2 | Plan files used inconsistently; default compaction prompt |
| 6 Lifecycle | 4 | L1 | Long heroic sessions, several compactions |
| 7 Evaluation | 1 | L0 | Capped: changes adopted in bundles |

**The reading.** This team invested real effort in retrieval, the interesting, well-written-about layer, while never measuring, never auditing tools, and adopting changes in bundles. Their retrieval work may be excellent, and they cannot tell, because evaluation scores 1.

**Their one next action:** area 1, the Phase 0 baseline, not the retrieval improvement they were planning. The likely finding: four unaudited MCP servers consume more context than the carefully tuned retrieval stack ever saves.

**This shape, one strong area and everything else near zero, is the most common failure pattern in the diagnostic.** It is the signature of optimising someone else's bottleneck.

## When to re-audit

| Situation | Cadence |
|---|---|
| Actively optimising | After each phase |
| Steady state | Quarterly |
| After a harness upgrade | Immediately: re-measure the prefix tax; scaffold changes are silent |
| After a model change | Re-tune the parameters (utilisation cap, compaction threshold, output cap). The structure transfers; the numbers do not |
| When someone says "it worked yesterday" | Immediately: check area 7. That is the Pass² signal |

## The one-question version

If you will not run 35 items, run this one:

> [!key] What fraction of your context, right now, is tool definitions for tools you have never called?
> If you cannot answer, your level is L0 and your next action is [Phase 0](ch:optimisation-plan#phase-0-baseline). If you can and it is above 15%, your next action is [Phase 1](ch:optimisation-plan#phase-1-deletion). Those two branches cover most readers.
