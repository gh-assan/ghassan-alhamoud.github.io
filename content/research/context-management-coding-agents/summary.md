## The problem

Longer advertised windows add capacity, but they do not guarantee more reliable coding-agent behaviour. In Chroma's controlled study, performance generally became less reliable as input grew, with model- and task-specific variation across 18 models [S]. A Sourcegraph practitioner report similarly found 5K tokens of targeted retrieval outperforming a 100K-token codebase summary on the same task [P].

So the window is not a bucket to fill. It is an [[attention budget]]: additional tokens can reduce the salience of the relevant ones. When a coding agent fails, the missing fact may have been lost in compaction, displaced by unused tool definitions, or contradicted by the agent's own earlier claim.

## The finding

**Before changing the model or adding tools, test whether context discipline is the binding constraint.** Four results make that test worth running:

- **Subtraction wins, and the evidence is lopsided.** Masking matched summarisation at lower cost [S]; fewer tools beat more tools [S]; focused prompts beat full ones retaining the same answer-bearing material while removing surrounding context [S].
- **Compression damage is unreliability first.** Compressed agents solve a task, then fail it on a rerun. Reliability degrades faster than mean accuracy, so teams measuring single runs conclude compaction is nearly free [S].
- **The summariser is a quality lever.** Changing only the summariser moved SWE-bench accuracy from 49.0% to 55.5%, a 6.5-point swing [S].
- **The cache can flip the sign of an optimisation.** In the worked price model, a 24% token cut that made the prefix dynamic raised cost 6.9× [C].

## What to do first

1. **Measure for 30 minutes.** Prefix tax, tool definitions versus tools actually called, tool-output share, cache hit rate. The largest controllable segment may not be the one you were tuning. [How to measure](ch:optimisation-plan#phase-0-baseline).
2. **Audit and delete.** In a representative 20-session sample, remove dead or duplicate [[MCP]] capabilities, write ignore files, and apply the inference test to the instruction file. A practitioner estimate suggests 25–35% of the window may come back when dead or duplicate capabilities dominate; verify task coverage and keep rollback [P]. [Phase 1](ch:optimisation-plan#phase-1-deletion).
3. **Shape tool output.** Wrap your four loudest commands: one line on success, the full trace on failure, the full log in a file. 60–90% less output [P].
4. **Keep a plan file with a "ruled out" section**, and re-read it first after any compaction.
5. **Compact at most once, at a sub-goal boundary, after offloading.** Then reset with a handoff note.
6. **Measure changes with Pass², not single runs:** run each task at least twice.

## The numbers that matter

| Number | What it means |
|---|---|
| 18 models | Tested across eight lengths; performance generally fell as input grew [S] |
| 43% → under 14% | Tool-selection accuracy as tool count grows [S] |
| 77.4% → 53.0% | [[Pass^k|Pass²]] with no compression versus FIFO truncation on AppWorld [S] |
| +0.108 | Extra errors at the first step after a compaction [S] |
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
- **Follow the plan**: about 16 hours, most of the value in the first six: [the optimisation plan](ch:optimisation-plan).
- **Understand why**: start the learning path at [chapter 1](ch:foundations).
