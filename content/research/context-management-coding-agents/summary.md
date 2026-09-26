## The problem

Chroma's controlled retrieval and question-answer tests varied input length across 18 models; performance generally fell as input grew, with model- and task-specific curves [S]. Agent studies compare specific compaction strategies—for example, TRACE compared no compression, verifier-guided compression and FIFO truncation on AppWorld [S]. These are different questions: this programme did not test a direct effect of advertised context-window size on coding-agent reliability, and it establishes no universal window-size rule. Sourcegraph reports 5K-token targeted retrieval beating a 100K-token summary on the same task [P] ([post](https://sourcegraph.com/blog/context-engineering)). Task, model, protocol and results table are undisclosed; this vendor/practitioner observation is neither benchmark evidence nor a universal size rule.

So the window is not a bucket to fill. It is an [[attention budget]]: additional tokens can reduce the salience of the relevant ones. When a coding agent fails, the missing fact may have been lost in compaction, displaced by unused tool definitions, or contradicted by the agent's own earlier claim.

## The finding

**Before changing the model or adding tools, test whether context discipline is the binding constraint.** Four results make that test worth running:

- **Subtraction wins, and the evidence is lopsided.** Masking matched summarisation at lower cost [S]; fewer tools beat more tools [S]; focused prompts beat full ones retaining the same answer-bearing material while removing surrounding context [S].
- **Compression damage is unreliability first.** Compressed agents solve a task, then fail it on a rerun. Reliability degrades faster than mean accuracy, so teams measuring single runs conclude compaction is nearly free [S].
- **The summariser is a quality lever.** Changing only the summariser moved SWE-bench accuracy from 49.0% to 55.5%, a 6.5-point swing [S].
- **The cache can reverse an optimisation.** An illustrative input-only model raises estimated input cost 6.9× after a 24% input-token cut breaks caching; output charges are excluded [C].

## What to do first

1. **Measure for 30 minutes.** Prefix tax, tool definitions versus tools actually called, tool-output share, cache hit rate. The largest controllable segment may not be the one you were tuning. [How to measure](ch:optimisation-plan#phase-0-baseline).
2. **Audit and delete.** In a representative 20-session sample, remove dead or duplicate [[MCP]] capabilities, write ignore files, and apply the inference test to the instruction file. A practitioner estimate suggests 25–35% of the window may come back when dead or duplicate capabilities dominate; verify task coverage and keep rollback [P]. [Phase 1](ch:optimisation-plan#phase-1-deletion).
3. **Test output shaping.** Practitioner reports describe 60–90% less output [P], not savings. Measure segments, task outcomes and priced input/output at your cache and provider rates.
4. **Keep a plan file with a "ruled out" section.** You can test rereading it after compaction as an orientation practice; TRACE did not evaluate this tactic.
5. **Compact at most once, at a sub-goal boundary, after offloading.** Then reset with a handoff note.
6. **Measure changes with Pass², not single runs:** run each task at least twice.

## The numbers that matter

| Number | What it means |
|---|---|
| 18 models | Tested across eight lengths; performance generally fell as input grew [S] |
| 43.13% vs 13.62% | RAG-MCP versus blank conditioning on a held-out web-search set; method comparison, not a tool-count curve [S] |
| 77.4% → 53.0% | [[Pass^k|Pass²]] with no compression versus FIFO truncation on AppWorld [S] |
| +0.108 | TRACE reports a marginal increase in blocked/error-action probability at the first post-compaction action in AppWorld [S] |
| 98.7% | Token reduction from code execution instead of tool schemas, vendor-reported [P] |
| About 4 turns | Before a compaction pays for itself financially [C] |

## What not to do

- Do not assume a bigger window fixes reliability; measure first.
- Do not add MCP servers "just in case". Unused tools consume prompt budget on every call; billing depends on cache hits and request stability, and they can confuse selection.
- Do not preload large architecture documents by default. Coherent text performed worse than shuffled text in the cited retrieval tasks [S]; test the transfer to coding agents [D]. Point to where things live instead.
- Do not correct a hallucinated fact inline. Reset to before it.
- Do not delegate interlocking implementation or debugging to parallel sub-agents.
- Do not bulk-index your wiki. Fetch pages by name and verify them against the code.
- Do not adopt ten methods at once. Fix one constraint, measure, repeat, and stop when the [stop rule](ch:optimisation-plan#the-stop-rule) fires.

## Where to go next

- **Score yourself** in 30 minutes and get one next action: [the diagnostic](ch:diagnostic).
- **Follow the proposed plan**: about 16 hours budgeted across seven phases; each phase has a gate, and the stop rule tells you when to pause: [the optimisation plan](ch:optimisation-plan).
- **Understand why**: start the learning path at [chapter 1](ch:foundations).
