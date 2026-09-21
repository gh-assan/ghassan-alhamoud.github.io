## The problem

Context windows grew about a hundredfold. Coding-agent reliability did not follow. Every controlled study found models getting worse as input grows, at every length tested, well before the window is full [S]. Handing an agent a 100K-token codebase summary did *worse* than 5K tokens of targeted retrieval [P].

So the window is not a bucket to fill. It is an [[attention budget]], and every token dilutes the others. When a coding agent fails on your codebase, it usually did not fail to reason. The fact it needed was lost in a compaction, crowded out by 42,000 tokens of unused tool definitions, or contradicted by a hallucination it wrote itself at turn 12.

## The finding

**For most teams in 2026, the binding constraint is not the model or the tools. It is context discipline.** Four results carry that claim:

- **Subtraction wins, and the evidence is lopsided.** Masking matched summarisation at lower cost [S]; fewer tools beat more tools [S]; focused prompts beat full ones containing the same information [S].
- **Compression damage is unreliability first.** Compressed agents solve a task, then fail it on a rerun. Reliability degrades faster than mean accuracy, so teams measuring single runs conclude compaction is nearly free [S].
- **The summariser is a quality lever.** Changing only the summariser moved SWE-bench accuracy from 49.0% to 55.5%, a 6.5-point swing [S].
- **The cache can flip the sign of an optimisation.** Stable prefix tokens cost about a tenth of churning ones. A 24% token cut that made the prefix dynamic raised cost 6.9× [C].

## What to do first

1. **Measure for 30 minutes.** Prefix tax, tool definitions versus tools actually called, tool-output share, cache hit rate. The large segment is rarely the one you were tuning. [How to measure](ch:optimisation-plan#phase-0-baseline).
2. **Delete.** Remove every [[MCP]] server with zero calls in 20 sessions, write ignore files, and cut the instruction file to what cannot be inferred from the code. Usually 25–35% of the window comes back, with no behaviour change. [Phase 1](ch:optimisation-plan#phase-1-deletion).
3. **Shape tool output.** Wrap your four loudest commands: one line on success, the full trace on failure, the full log in a file. 60–90% less output [P].
4. **Keep a plan file with a "ruled out" section**, and re-read it first after any compaction.
5. **Compact at most once, at a sub-goal boundary, after offloading.** Then reset with a handoff note.
6. **Measure changes with Pass², not single runs:** run each task at least twice.

## The numbers that matter

| Number | What it means |
|---|---|
| 18 of 18 models | Degraded as input grew, at every length tested [S] |
| 43% → under 14% | Tool-selection accuracy as tool count grows [S] |
| 77.4% → 53.0% | [[Pass^k|Pass²]] with no compression versus FIFO truncation on AppWorld [S] |
| +0.108 | Extra errors at the first step after a compaction [S] |
| 98.7% | Token reduction from code execution instead of tool schemas [S] |
| About 4 turns | Before a compaction pays for itself financially [C] |

## What not to do

- Do not buy a bigger window to fix reliability. It enlarges the region where the problem happens.
- Do not add MCP servers "just in case". Unused tools cost on every call and confuse selection.
- Do not pre-load architecture documents. Coherent prose is a distractor field; point to where things live instead.
- Do not correct a hallucinated fact inline. Reset to before it.
- Do not delegate interlocking implementation or debugging to parallel sub-agents.
- Do not bulk-index your wiki. Fetch pages by name and verify them against the code.
- Do not adopt ten methods at once. Fix one constraint, measure, repeat, and stop when the [stop rule](ch:optimisation-plan#the-stop-rule) fires.

## Where to go next

- **Score yourself** in 30 minutes and get one next action: [the diagnostic](ch:diagnostic).
- **Follow the plan**: about 16 hours, most of the value in the first six: [the optimisation plan](ch:optimisation-plan).
- **Understand why**: start the learning path at [chapter 1](ch:foundations).
