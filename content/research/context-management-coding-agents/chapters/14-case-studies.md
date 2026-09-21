## How to read these cases

Eight cases. Six are documented studies or first-party accounts, labelled [S] or [P]. Two are **composites** [C]: constructed from documented mechanics and verified arithmetic, because no public write-up of the specific incident exists. Composites are labelled in their headings, not just in a footnote.

The set deliberately includes **one change that made things worse** (CS-5) and **one win that came from removal** (CS-6).

| Case | Evidence | Lesson in one line |
|---|---|---|
| [CS-1 The sub-agents that built different games](#cs-1-the-sub-agents-that-built-different-games-p) | [P] | Isolation fails when outputs must interlock |
| [CS-2 The research system that beat one agent by 90%](#cs-2-the-research-system-that-beat-one-agent-by-90-p) | [P] | The same architecture wins when outputs just add up, and the win is bought |
| [CS-3 Swapping only the summariser moved SWE-bench 6.5 points](#cs-3-swapping-only-the-summariser-moved-swe-bench-65-points-s) | [S] | The boundary component is a first-class quality lever |
| [CS-4 Compression that hurt reliability more than accuracy](#cs-4-compression-that-hurt-reliability-more-than-accuracy-s) | [S] | Damage appears in variance before the mean |
| [CS-5 Dynamic tool loading made things worse](#cs-5-dynamic-tool-loading-made-things-worse-c) | [C] | The cache can flip the sign of a token optimisation |
| [CS-6 Removal as the answer: code execution](#cs-6-removal-as-the-answer-code-execution-s) | [S] | Eliminating a category beats compressing it |
| [CS-7 Grep beat embeddings, and the harness beat both](#cs-7-grep-beat-embeddings-and-the-harness-beat-both-s) | [S] | Published retrieval rankings are hypotheses for you |
| [CS-8 The audit that recovered a third of the window](#cs-8-the-audit-that-recovered-a-third-of-the-window-c) | [C] | The first audit finds waste, not trade-offs |

## CS-1: The sub-agents that built different games [P]

**Situation.** A team building a coding agent tested a parallel multi-agent design on a task with an unambiguous specification: clone Flappy Bird.

**What was done.** The task was split and assigned to parallel sub-agents, each with its own context: the textbook orchestrator-worker pattern.

**What happened.** The sub-agent briefed to build the background produced something in the style of Super Mario Bros. The one briefed to build the bird produced an asset that neither looked like a game sprite nor moved like the target. **Neither sub-agent failed its brief. The combination was unusable** [P].

**The mechanism.** Actions carry implicit decisions. "Build the background" does not specify art style, palette, parallax or scale. Each sub-agent decided independently and reasonably, and independent reasonable decisions did not compose.

**What it establishes.** Isolation is not free even when each isolated context is correct. The boundary destroys the shared implicit state that makes outputs compatible.

**What this research takes from it.** Question 3 of the [composability test](ch:sub-agents#the-composability-test): list the implicit decisions the sub-agent must make that are not in its brief. For "build the background" the list is long, and that is the signal not to delegate.

## CS-2: The research system that beat one agent by 90% [P]

**Situation.** A frontier lab built a feature that answers open-ended questions needing broad information gathering.

**What was done.** A lead agent plans, spawns three to five parallel sub-agents with their own context windows, synthesises their findings, and runs a separate citation pass.

**What happened.** It beat single-agent Claude Opus 4 by **90.2%** on the lab's internal research evaluation. It also used about **15× the tokens of a chat** (agents generally about 4×), and **token usage alone explained about 80% of the performance variance** [P].

**The mechanism.** Research is additive. Two sub-agents finding two facts yield two facts, combined by union, with almost no implicit decisions to conflict over.

**The honest reading.** If raw spend explains 80% of the variance, the architecture is largely a way to spend more tokens productively. That is a real achievement, but it is not evidence that *isolation itself* is the active ingredient, and not evidence that the pattern transfers to coding.

**What this research takes from it.** The 15× and the 80% appear next to the 90.2% everywhere the benefit is cited, and [chapter 9](ch:evaluation#twelve-results-that-shape-the-design) requires topology comparisons at equal token spend.

<figure class="diagram">
<p class="diagram__title">Same architecture, opposite outcomes</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 200" role="img" aria-labelledby="cs-t">
<title id="cs-t">Parallel sub-agents failed on an interlocking game build and succeeded on additive research. The difference was whether outputs compose.</title>
<rect class="dg-box--warn" x="10" y="10" width="340" height="180" rx="10"/>
<text class="dg-k" x="24" y="34">CS-1 · INTERLOCKING</text>
<text class="dg-t" x="24" y="58">"Clone Flappy Bird", split</text>
<rect class="dg-box" x="30" y="78" width="130" height="44" rx="6"/><text class="dg-s" x="95" y="105" text-anchor="middle">background: Mario style</text>
<rect class="dg-box" x="200" y="78" width="130" height="44" rx="6"/><text class="dg-s" x="265" y="105" text-anchor="middle">bird: wrong look, motion</text>
<text class="dg-t dg-bad" x="180" y="160" text-anchor="middle">✗ combination unusable</text>
<rect class="dg-box--info" x="370" y="10" width="340" height="180" rx="10"/>
<text class="dg-k" x="384" y="34">CS-2 · ADDITIVE</text>
<text class="dg-t" x="384" y="58">Open-ended research, 3–5 workers</text>
<rect class="dg-box" x="390" y="78" width="90" height="44" rx="6"/><text class="dg-s" x="435" y="105" text-anchor="middle">facts A</text>
<rect class="dg-box" x="495" y="78" width="90" height="44" rx="6"/><text class="dg-s" x="540" y="105" text-anchor="middle">facts B</text>
<rect class="dg-box" x="600" y="78" width="90" height="44" rx="6"/><text class="dg-s" x="645" y="105" text-anchor="middle">facts C</text>
<text class="dg-t dg-info" x="540" y="152" text-anchor="middle">✓ +90.2%, combined by union</text>
<text class="dg-s" x="540" y="172" text-anchor="middle">at ~15× the tokens</text>
</svg>
</div>
<figcaption>The work decided the outcome, not the architecture. Research adds up; implementation must fit together.</figcaption>
</figure>

## CS-3: Swapping only the summariser moved SWE-bench 6.5 points [S]

**Situation.** Researchers studying compaction in long-horizon agents wanted to know how much compaction quality matters relative to everything else.

**What was done.** The agent, tools, benchmark and harness were all held fixed. **Only the summarising model changed.**

**What happened.** SWE-bench accuracy moved from **49.0% to 55.5%**, a 6.5-point swing from the summariser alone. Compaction-aware training then added **+5.5 and +7.0 points** on SWE-bench Verified across two model sizes, and **+6.8 and +3.1** on Terminal-Bench 2.0 [S].

**The mechanism.** The summariser decides what crosses an irreversible boundary. Everything it drops is gone, and everything it asserts is treated downstream as established. It is a decision-making component in the critical path, not compression infrastructure.

**What it establishes.** Compaction quality is worth about as much as a meaningful model upgrade. A team that has never read its compaction prompt has an unexamined six-point lever.

**What this research takes from it.** The [compaction schema](ch:compaction-and-memory#decision-3-the-summary-schema), and the rule to hold the compaction prompt constant in every other experiment.

## CS-4: Compression that hurt reliability more than accuracy [S]

**Situation.** A 2026 study of context compression for long-horizon agents on AppWorld, a 147-task benchmark of stateful API use.

**What was done.** Seven strategies were compared (full context, FIFO truncation, token pruning, two prompt-based compaction schemes, guideline-based approaches, and a verifier-guided method), measuring both single-run accuracy and Pass²: solved on both of two runs.

**What happened.** No compression: **85.7% accuracy, 77.4% Pass²**. Verifier-guided: 77.1% / 67.3%. Prompt-based: 71.4% / 59.5%. FIFO: 63.7% / 53.0%. The gap between Pass@2 and Pass² **widened as budgets tightened**. Correct termination was **44.6%** with summary replacement versus **77.2%** with FIFO at 2K, and the first step after compaction carried **+0.108** extra blocked or error actions [S].

**The counterintuitive detail.** FIFO, which loses the *most* information, preserved the agent's sense of state *better* than summarisation. Losing information wholesale is less damaging to "where am I?" than replacing it with a fluent narrative that reads as if the state is known.

**What this research takes from it.** k ≥ 2 and Pass² as non-negotiable, the explicit state block in the compaction schema, and the warning that token dashboards cannot see this.

## CS-5: Dynamic tool loading made things worse [C]

**Situation.** A team measured a 38K-token tool-definition prefix, 25% of their context, and set out to fix it.

**What was done.** Per-turn dynamic tool selection: infer which tools each turn needs and include only those. Definitions fell from 38K to 9K, and raw tokens per call fell about 24%.

**What happened.** **The bill went up sharply.** Latency got worse. Task quality did not improve.

**The mechanism.** The tool block sits about 10K tokens into the prompt. Changing it every turn invalidates the cache for everything after it. At generic prices, the static setup cost **14.9** units per turn and the dynamic one **102.3**. **A 24% token cut bought a 6.9× cost increase.**

**Resolution.** The team reverted to a static, hand-pruned surface: every zero-call tool deleted, the rest deferred. 38K fell to about 4K, the cache hit rate was preserved, and both bills went down.

**What it establishes.** The most counterintuitive rule in this research: **static pruning beats dynamic selection**, because stable prefix tokens cost a tenth of churning ones.

*Composite:* constructed from documented cache mechanics [P] and the arithmetic in [chapter 10](ch:metrics-and-economics#belief-1-cutting-tokens-cuts-cost). No public write-up of this exact incident is known.

## CS-6: Removal as the answer: code execution [S]

**Situation.** Agents connected to many tools were spending a huge share of context on tool definitions before doing any work.

**What was done.** Instead of optimising the definitions, they were **removed as a category.** The agent got a code-execution environment and a programmatic API, and writes code against it instead of choosing among schemas.

**What happened.** **150,000 tokens fell to about 2,000: a 98.7% reduction**, with 99%+ on definitions alone at 112 tools [S]. An independent production report on a GitHub MCP server found a 98% reduction [P].

**The mechanism.** Two effects, and the second is larger. Definitions collapse into one tool plus documentation. And results collapse, because code filters data before returning it: `[i.number for i in list_issues() if i.state == "open"][:5]` puts five integers in context instead of 400 issue objects.

**What it establishes.** The largest wins come from **eliminating a category of context**, not compressing it. Progressive disclosure is an order of magnitude; category elimination is two.

## CS-7: Grep beat embeddings, and the harness beat both [S]

**Situation.** A 2026 study asked whether semantic retrieval is necessary for agentic search.

**What was done.** Grep versus vector retrieval on 116 questions derived from LongMemEval, run across **four harnesses** (a custom agent and three widely used CLI agents), with both inline and file-based tool results. A second experiment added unrelated history to measure distractor sensitivity.

**What happened.** Grep generally won. **But overall scores depended strongly on which harness and tool-calling style was used, even on identical data** [S].

**The mechanism.** Retrieval strategy decides *what can be found*. The harness decides *how the agent iterates, what it sees of the results and when it stops*, and for multi-step search the iteration policy dominates any single query.

**What it establishes.** Lexical search is a strong baseline the field skipped past. More importantly, **retrieval comparisons do not transfer between harnesses**, so most published retrieval advice, including the first finding, is a hypothesis for your setup.

## CS-8: The audit that recovered a third of the window [C]

**Situation.** A five-engineer team using coding agents daily, with rising costs and a feeling that quality dropped on long tasks. Nothing was measured.

**What was done.** The 30-minute audit from [chapter 3](ch:ten-methods#before-any-method-measure).

**Findings.**

| Segment | Tokens | Note |
|---|---:|---|
| Tool definitions | 66,000 | 61 tools across 4 servers; **9 distinct tools ever called** in 20 sessions |
| Tool results | 58,000 | One `npm ci` log was 14,000 of it |
| Instruction file | 6,500 | 380 lines, 8 months of accretion, zero deletions |
| Retrieved code | 22,000 | Four whole-file reads that should have been symbol reads |

**Actions, in the order the routing table gave them:**

1. Deleted three zero-call servers and moved the fourth to deferred definitions. **66,000 → about 2,500 tokens.**
2. Routed the four loudest commands through quiet flags and file redirection. **Tool results down about 70%.**
3. Applied the inference test to the instruction file. **380 → 140 lines.**
4. Left retrieval behaviour alone: the smallest win, the hardest to sustain, and last in the routing.

```chart
{
  "type": "hbar",
  "title": "Mid-session context before and after the audit",
  "categories": ["Before", "After"],
  "series": [{"name": "Share of a 200K window", "values": [55, 24]}],
  "max": 100,
  "valueFormat": "{v}%",
  "highlight": [1],
  "categoryLabel": "State",
  "caption": "110K → 48K tokens. Median session cost fell about 50% with task success unchanged, and no deleted capability was missed in 20 sessions [C].",
  "alt": "Before: 55% of the window. After: 24%."
}
```

**The under-reported half.** The cost saving was the visible result. The more important one was moving from 55% to 24% utilisation: out of the regime where the instruction file is the least attended region [S], into the one where the prefix is still read. That quality effect appears in no cost number.

*Composite:* assembled from the figures in [chapter 2](ch:anatomy#reading-a-whole-budget-a-worked-example), [chapter 8](ch:tool-surface#a-worked-audit) and [chapter 10](ch:metrics-and-economics#worked-monthly-economics). The individual numbers derive from [S] and [P] sources; the incident is constructed.

## Patterns across the cases

| Pattern | Cases | Statement |
|---|---|---|
| Isolation succeeds or fails on **composability**, not architecture | CS-1, CS-2 | Same pattern, opposite outcomes; the work decided |
| The **boundary component** is a first-class quality lever | CS-3, CS-4 | The summariser alone was worth 6.5 points |
| Damage shows up in **variance before the mean** | CS-4 | Single-run measurement cannot see it |
| **Eliminating a category beats compressing it** | CS-6, CS-8 | 98.7% from removing definitions; 96% from deleting unused tools |
| **Cache mechanics can flip the sign** of an optimisation | CS-5 | 24% fewer tokens, 6.9× the cost |
| **The harness confounds everything** | CS-7 | Published rankings are hypotheses |
| The first audit finds **waste, not trade-offs** | CS-8 | Most of the win needs no behaviour change |

> [!key] The through-line
> Six of these eight cases turned on a decision about what to remove or where to draw a boundary. None turned on a cleverer algorithm.
