## Why break the context down at all

"My context is full" is not something you can act on. "62% of my context is tool output, and 80% of that is one `npm install` log I never read" is.

Almost every team that measures its context for the first time finds the same thing: **the segment they were tuning was not the large one.** They polish the instruction file, which is 4% of the window, while 25% goes to definitions for tools they never call.

This chapter splits a coding agent's context into nine segments. For each one it gives the typical size, who controls it, how it fails, how to measure it, and how it behaves in the cache.

## Prefix and body

The nine segments sit in the prompt in a fixed order. That order decides both their cache behaviour and how much attention they get.

<figure class="diagram diagram--wide">
<p class="diagram__title">The nine segments, in prompt order</p>
<div class="diagram__scroll">
<svg viewBox="0 0 900 250" role="img" aria-labelledby="a1-t">
<title id="a1-t">Segments one to four form the stable, cached prefix. Segments five to nine form the growing body.</title>
<rect class="dg-box--accent" x="10" y="40" width="340" height="120" rx="10"/>
<text class="dg-k" x="20" y="30">PREFIX · STABLE · CACHED · PAID EVERY CALL</text>
<rect class="dg-box" x="20" y="55" width="75" height="90" rx="6"/>
<text class="dg-t" x="57" y="90" text-anchor="middle">1</text>
<text class="dg-s" x="57" y="110" text-anchor="middle">System</text>
<text class="dg-s" x="57" y="124" text-anchor="middle">prompt</text>
<rect class="dg-box" x="102" y="55" width="75" height="90" rx="6"/>
<text class="dg-t" x="139" y="90" text-anchor="middle">2</text>
<text class="dg-s" x="139" y="110" text-anchor="middle">Tool</text>
<text class="dg-s" x="139" y="124" text-anchor="middle">definitions</text>
<rect class="dg-box" x="184" y="55" width="75" height="90" rx="6"/>
<text class="dg-t" x="221" y="90" text-anchor="middle">3</text>
<text class="dg-s" x="221" y="110" text-anchor="middle">Instruction</text>
<text class="dg-s" x="221" y="124" text-anchor="middle">files</text>
<rect class="dg-box" x="266" y="55" width="75" height="90" rx="6"/>
<text class="dg-t" x="303" y="90" text-anchor="middle">4</text>
<text class="dg-s" x="303" y="110" text-anchor="middle">Skill</text>
<text class="dg-s" x="303" y="124" text-anchor="middle">descriptions</text>
<rect class="dg-box--info" x="365" y="40" width="525" height="120" rx="10"/>
<text class="dg-k" x="375" y="30">BODY · GROWS EVERY TURN · READ WITH FADING ATTENTION</text>
<rect class="dg-box" x="375" y="55" width="95" height="90" rx="6"/>
<text class="dg-t" x="422" y="90" text-anchor="middle">5</text>
<text class="dg-s" x="422" y="110" text-anchor="middle">Retrieved</text>
<text class="dg-s" x="422" y="124" text-anchor="middle">code</text>
<rect class="dg-box" x="477" y="55" width="95" height="90" rx="6"/>
<text class="dg-t" x="524" y="90" text-anchor="middle">6</text>
<text class="dg-s" x="524" y="110" text-anchor="middle">Tool</text>
<text class="dg-s" x="524" y="124" text-anchor="middle">results</text>
<rect class="dg-box" x="579" y="55" width="95" height="90" rx="6"/>
<text class="dg-t" x="626" y="90" text-anchor="middle">7</text>
<text class="dg-s" x="626" y="110" text-anchor="middle">Agent</text>
<text class="dg-s" x="626" y="124" text-anchor="middle">messages</text>
<rect class="dg-box" x="681" y="55" width="95" height="90" rx="6"/>
<text class="dg-t" x="728" y="90" text-anchor="middle">8</text>
<text class="dg-s" x="728" y="110" text-anchor="middle">User</text>
<text class="dg-s" x="728" y="124" text-anchor="middle">turns</text>
<rect class="dg-box--warn" x="783" y="55" width="97" height="90" rx="6"/>
<text class="dg-t" x="831" y="90" text-anchor="middle">9</text>
<text class="dg-s" x="831" y="110" text-anchor="middle">Summaries</text>
<text class="dg-s" x="831" y="124" text-anchor="middle">&amp; memory</text>
<line class="dg-line" x1="10" y1="195" x2="880" y2="195"/>
<polygon class="dg-head" points="880,190 890,195 880,200"/>
<text class="dg-s" x="10" y="220">start of prompt: premium only while under ~50% full</text>
<text class="dg-s" x="890" y="220" text-anchor="end">end of prompt: premium always</text>
<text class="dg-s" x="831" y="176" text-anchor="middle">rewrites the prefix</text>
</svg>
</div>
<p class="diagram__hint">Scroll sideways to see all nine segments.</p>
<figcaption>Everything in the prefix is paid once (if you protect the cache) and read on every turn. Everything in the body is paid repeatedly and read with falling attention. Segment 9 is the odd one out: inserting it rewrites what came before.</figcaption>
</figure>

**Segments 1–4 are the [[prefix]].** They are stable across turns, cacheable, and privileged early in a session.

**Segments 5–9 are the [[body]].** They grow, they are partly uncacheable, and they come to dominate as the session goes on.

This split is the most important structural fact about your context. Cost intuitions built on one side do not transfer to the other.

## The nine segments at a glance

| # | Segment | Typical size | Controlled by | Cacheable | Typical failure |
|---|---|---|---|---|---|
| 1 | System prompt and harness | 2K–12K | Mostly the vendor | Yes | Invisible; you cannot trim it and often cannot see it |
| 2 | Tool definitions | 1K–60K+ | You (which servers and tools) | Yes, if stable | Bloat; selection collapses past ~20 tools |
| 3 | Project instruction files | 0.3K–15K | Entirely you | Yes | Grows forever; buried by position; contradicts itself |
| 4 | Skill descriptions | 0.5K–5K | You | Yes | Too vague to trigger, or so many they become segment 2 |
| 5 | Retrieved code and files | 2K–80K | Agent plus your tooling | No | Whole files read for one function; stale after its own edits |
| 6 | Tool results | 5K–150K | Agent plus output shaping | No | Largest, lowest density, mostly disposable |
| 7 | Agent reasoning and messages | 3K–60K | Model verbosity, your prompting | No | Self-written distractors; loops |
| 8 | User turns | 0.2K–10K | You | No | Vague early, contradictory later |
| 9 | Summaries and memory | 0.5K–8K | Your policy | Rewrites the prefix | Launders errors; loses the decisive detail |

The ranges are order-of-magnitude bands from observed sessions and reported figures. Treat them as a place to start measuring, not as targets [D].

## Segment 1: system prompt and harness

**What it is.** The harness's own instructions: how to call tools, output formats, safety rules, the loop's framing.

**Why it matters, even though you cannot edit it.** First, it is a fixed tax. If it is 10K, your usable window is 10K smaller than advertised, on every call. Second, it is **the biggest source of [[harness]] confound in any context experiment you run.** Two harnesses with the same model and the same retrieval behave differently because their scaffolds differ. The agentic-search study found scores depended strongly on which of four harnesses ran, on identical data [S].

**How to measure it.** Open a fresh session, send a single `.`, and read the reported input-token count. That number is segments 1–4 together: your [[prefix tax]]. Do it on every harness you use, and again after every harness update.

**Cache behaviour.** Fully cacheable and always first. That is exactly why **any harness update that changes it invalidates every cached prefix you have.** A silent scaffold change looks like a model regression and costs like one.

## Segment 2: tool definitions

**What it is.** The JSON schema for every tool in scope: names, descriptions, parameters, examples.

**Why it has a bad reputation.** One popular MCP server has been measured at about **42,000 tokens of definitions alone** [P]. That is before the system prompt, the conversation or any work. Attach three such servers and you have spent over 120K tokens on the *possibility* of doing something.

Tool count hurts in two separate ways. It displaces useful tokens, and it confuses selection.

| Finding | Number | Source |
|---|---|---|
| Tool-selection accuracy as tool count grows | 43% baseline → under 14% | [S] |
| Selection at 20 tools versus 107 tools | 19 of 20 correct → complete failure | [S] |
| Practitioner threshold | Noticeable damage past ~20 active tools | [P] |

Two independent methods landing near the same threshold is strong evidence for this field. **Treat about 20 active tools as a soft ceiling and about 40 as a hard one** [D].

**How to measure it.** Dump your tool schemas and count their tokens. Then count which tools the agent actually called in your last 20 sessions. The defined-to-used ratio is usually shocking. Tools that are defined but never used are pure loss, and deleting them is the best trade most teams have.

**Cache behaviour.** Cacheable if stable. Two traps: tool lists that reorder between sessions break the prefix every time, and "load only the relevant tools" changes the prefix per task. Dynamic tool sets are cache-hostile by design and can cost more than the bloat they remove [D]. [Chapter 8](ch:tool-surface) covers the fix.

## Segment 3: project instruction files

**What it is.** `CLAUDE.md`, `AGENTS.md`, `.cursorrules` and similar files: conventions, build commands, architectural rules.

**Where things stand.** `AGENTS.md` is read natively by 30+ agent tools, used in 60,000+ repositories, and stewarded by the Agentic AI Foundation under the Linux Foundation [P]. It is the closest thing the field has to a standard.

**The size problem.** These files only grow. Every incident adds a rule and nothing removes one. A 400-line file is common and actively harmful. It sits at the start of the window, which is premium only while the window is under half full. Three hours into a session, your rules are early tokens in a full window. They are also so numerous that no single rule stands out.

**What the evidence suggests.** Practitioners converge on **under 150 lines**, hand-written, with concrete examples, containing only what the agent cannot infer from the code [P]. One comparison found human-written context files improved success by about 4% [P]. That is real but modest, which is itself informative: the instruction file is not where your leverage is.

> [!try] The inference test
> For each line, ask: **could a competent engineer infer this from the repository in under two minutes?** If yes, delete it. "We use TypeScript" is visible in `tsconfig.json`. Delete. "Run tests with `npm test`" is in `package.json`. Delete. "Never add a migration without a down-migration; the deploy pipeline silently skips forward-only migrations" is not inferable. Keep. Most files lose about 60% of their lines to this test alone [D].

**How it fails.** Dilution (30 rules, none salient). Contradiction (rules from different months conflict). Staleness (a rule describing a refactor that already happened, which is worse than no rule). Position decay.

**How to measure it.** Track line and token counts over time; the trend matters more than the level. Then, for each rule, count violations in the last 20 sessions. A rule never violated is either followed or irrelevant. A rule violated constantly is not working as text and should become a hook, a lint rule or a test.

**A hierarchy that works** [D]:

```text title="instruction-file layout"
CLAUDE.md (root)          ≤ 150 lines  global invariants only
  ├─ src/api/CLAUDE.md    ≤  50 lines  loaded when working in api/
  └─ src/ui/CLAUDE.md     ≤  50 lines  loaded when working in ui/
```

Scoped files keep the always-loaded part small, and they put specialist rules next to the code they govern, arriving when they are relevant. Harness support varies, so check yours. Batch edits between sessions: editing the file mid-session invalidates the prefix.

## Segment 4: skill descriptions

**What it is.** [[Skill|Skills]] are named capabilities with a short description that is always loaded and a full procedure that loads only when it matches.

**Why it is a separate segment.** Skills are the architectural answer to segment 2: separate *when to use this* from *how to do it*. The trigger description is small and always present; the procedure is large and loaded on demand. It is [[progressive disclosure]] applied to capability.

**How it fails.** Skills fail at *trigger design*, not content. A vague description never fires; a narrow one fires only on the exact phrasing you imagined. And there is a recursion trap: with enough skills, their descriptions become a bloat problem of their own.

**How to measure it.** Trigger precision (fired correctly ÷ fired) and trigger recall (fired correctly ÷ should have fired), sampled from real sessions. Budget the total tokens of always-loaded descriptions as one number.

## Segment 5: retrieved code

**What it is.** Source the agent has read: whole files, ranges, grep hits, symbol bodies.

**The usual waste.** Reading a 1,200-line file to see one 30-line function wastes about 97% of the tokens. It happens constantly because "read the file" is the easiest action available.

**The staleness trap.** A file read at turn 5 and edited at turn 30 is now *wrong in context*. It is wrong in the most dangerous way: a precise, plausible, previously correct copy. The agent's own edits poison its own context. **Re-read before you re-edit.** Harnesses that refresh files automatically after an edit are doing real work for you.

**How to measure it.** Two ratios matter.

- **[[Read-utilisation]]**: tokens of read code that appear in the final diff or explanation, divided by all tokens read. Under 5% means retrieval is your problem.
- **[[Read-coverage]] on failures**: after a failed task, did the agent ever read the file that decided the right answer? "No" is starvation. "Yes" is a reasoning or dilution failure. **These two need opposite fixes**, and telling them apart is the most valuable ten minutes of any postmortem.

## Segment 6: tool results

**What it is.** Everything tools return: test output, build logs, `git` output, HTTP responses, database rows, MCP payloads.

**Why it matters most.** In tool-heavy agents, input tokens were measured at **99.75–99.87% of all token usage** [S]. Output is a rounding error, and the largest input component in a working session is tool results. In one comparison, full-context approaches used **2.68× the tokens** of the best managed method *and completed fewer tasks* [S].

**The density problem.** Tool output has the worst information density of any segment.

```chart
{
  "type": "hbar",
  "title": "Useful share of common tool outputs (illustrative)",
  "categories": ["npm install", "Passing pytest (200 tests)", "Failing pytest", "git diff with lockfile", "Verbose MCP JSON", "git status, dirty repo"],
  "series": [{"name": "Useful tokens", "values": [0.05, 0.3, 1.5, 1, 2, 5]}],
  "max": 6,
  "valueFormat": "{v}%",
  "highlight": [0, 1],
  "labelWidth": 190,
  "categoryLabel": "Output",
  "caption": "One to two orders of magnitude of waste. A passing test run of 2,000–6,000 tokens carries about ten useful ones: \"200 passed\". Values illustrative, from observed output shapes [D].",
  "alt": "Horizontal bars showing the useful share of tool outputs: npm install about 0.05%, passing pytest 0.3%, failing pytest 1.5%, git diff with lockfile 1%, verbose MCP JSON 2%, git status 5%."
}
```

Output shaping attacks this directly. A command-rewriting proxy reports **60–90% reductions** on common dev commands [P]. Isolating large outputs in a local indexed sandbox and passing summaries reports **98%** [P].

**How it fails.** Flooding (one command eats 30% of the window). Silent truncation (the harness cuts the middle of a log, including the error). Retention (the same 8K build log sits in context for 40 turns after it stopped mattering).

**How to measure it.** Per session: total tool-result tokens, the top five commands by volume, and the **[[retention integral]]**: tokens × turns retained. A 10K log kept for 50 turns costs 500K token-turns. A 40K log kept for 3 turns costs 120K. **Optimise the integral, not the peak.**

> [!warning] The economics push you toward hoarding
> Tool output is appended, so it is cache-safe on arrival. Removing it later, by masking or compaction, rewrites the prompt and breaks the cache. It is cheap to add and expensive to keep. Knowing that is the difference between a policy and a habit.

## Segment 7: agent reasoning and messages

**What it is.** The model's own thinking, plans, explanations and narration.

**The overlooked cost.** A model that writes 600 tokens per turn has added 24,000 tokens by turn 40. That text is low-density and maximally plausible as a distractor, because the model wrote it.

**Why "less" is not automatically right here.** Reasoning in context is not pure cost. Written plans and stated conclusions genuinely improve later steps. The distinction that resolves this:

- **Load-bearing reasoning**: a plan, a ruled-out hypothesis, a discovered invariant. Keep it, and ideally move it into a durable note.
- **Narration**: restating what a tool returned, announcing what comes next, politeness. Pure cost, and usually the majority.

**How to measure it.** Assistant tokens as a share of the total, and a [[loop detector]] for repeated identical tool calls.

## Segment 8: user turns

**What it is.** What you typed. Usually 1–3% of the context, with the most leverage of any segment.

A vague opener produces exploratory reading that costs 30K tokens. A specific one produces a targeted read that costs 3K.

The two failures are opposites. **Under-specification** early forces exploration. **Contradiction** later (you change your mind at turn 25 while the original framing is still in context) creates [[clash]]. The fix for the second is not a polite correction. It is a **restatement of the full current requirement**, so recency resolves it cleanly.

**How to measure it.** Turns until the first productive edit is a good proxy for opener quality. Requirement reversals per session is a good proxy for clash risk.

## Segment 9: summaries and memory

**What it is.** The output of compression: a model-written summary replacing earlier turns, plus any cross-session memory loaded at the start.

**Why it is special.** It is the only *derived* segment: no primary information, only a lossy re-encoding of other segments. It is also the only one whose insertion **rewrites the prompt**, breaking the cache from that point.

**The measured damage.** Three independent 2026 studies are worth stating precisely, because this is routinely underestimated.

| Finding | Numbers | Source |
|---|---|---|
| Summary quality alone swings outcomes | Same agent, only the summariser changed: SWE-bench **49.0% → 55.5%** | [S] |
| Compression hurts reliability more than accuracy | AppWorld: no compression **85.7% accuracy / 77.4% Pass²**; prompt-based compaction **71.4% / 59.5%**; FIFO **63.7% / 53.0%** | [S] |
| Compaction breaks "where am I?" | Correct termination **44.6%** with summary replacement versus **77.2%** with FIFO at a 2K budget; **+0.108** extra blocked or error actions at the first step after compaction | [S] |
| Lossless beats lossy | Addressable recall **99.00% / 99.80%** versus best baseline **79.57% / 96.67%** on 1,000 needle tasks | [S] |

> [!key] Compression makes agents intermittent before it makes them worse
> A team measuring single runs will conclude compaction is nearly free. Production will disagree. [Chapter 9](ch:evaluation) shows how to measure it properly with [[Pass^k|Pass²]].

**How to measure it.** Compactions per session; tokens before and after; and the one that matters most, **post-compaction re-fetch rate**: in the next few turns, how often does the agent fetch something it already had? A high rate means your summary drops load-bearing content.

## Reading a whole budget: a worked example

Here is a representative mid-session snapshot from a large monorepo. It is illustrative [C], but its shape matches what teams find on first measurement.

```chart
{
  "type": "stack",
  "title": "A 152K-token context, by segment",
  "categories": ["1 System prompt", "2 Tool definitions", "3 Instruction files", "4 Skill descriptions", "5 Retrieved code", "6 Tool results", "7 Agent messages", "8 User turns", "9 Summaries"],
  "series": [{"name": "Tokens", "values": [9000, 38000, 6500, 1800, 22000, 58000, 12000, 1700, 3000]}],
  "highlight": [1, 5],
  "valueFormat": "{v:,}",
  "categoryLabel": "Segment",
  "caption": "Two segments hold 63% of the window: tool definitions (3 MCP servers, 61 tools, 11 ever used) and tool results (one <code>npm ci</code> log alone is 14,000 tokens). The instruction file most teams tune is 4% [C].",
  "alt": "A stacked bar. Tool results 38%, tool definitions 25%, retrieved code 15%, agent messages 8%, system prompt 6%, instruction files 4%, summaries 2%, skills 1%, user turns 1%."
}
```

What a practitioner does with this, in priority order:

1. **Tool definitions: 38,000 tokens, 50 unused tools.** Drop to one server or defer definitions. That recovers about 30,000 tokens of *prefix*, permanently, at no task cost. **Always do this first.** It is the largest, cheapest and most reversible win, and it needs no behaviour change.
2. **Tool results: one command is 14,000 tokens.** Route `npm ci` through a filter or send it to a file. That recovers about 13,000 tokens and, more importantly, ends its long retention.
3. **Instruction file: 380 lines.** Apply the inference test and expect about 140 lines. It saves about 4,000 tokens *and* makes what remains more salient.
4. **Retrieved code: four unnecessary whole-file reads.** A behaviour change, the hardest to sustain and the smallest win. Do it last.

```chart
{
  "type": "hbar",
  "title": "Tokens recovered by each action",
  "categories": ["Defer or delete unused tools", "Filter or offload the npm ci log", "Inference test on instruction file", "Symbol reads instead of whole files"],
  "series": [{"name": "Tokens recovered", "values": [30000, 13000, 4000, 2000]}],
  "valueFormat": "{v:,}",
  "highlight": [0],
  "categoryLabel": "Action",
  "caption": "Together about 47,000 tokens, roughly 31% of the window, with no loss of information available to the agent. Three of the four actions are pure waste removal [C].",
  "alt": "Bars: defer or delete unused tools 30,000; filter the npm log 13,000; instruction file 4,000; symbol reads 2,000."
}
```

This is the ordinary result of a first measurement. It is why the [optimisation plan](ch:optimisation-plan) opens with measurement instead of technique.

## The four numbers for your dashboard

If you track nothing else, track these.

| Metric | Formula | What it tells you | Healthy |
|---|---|---|---|
| **Prefix tax** | Tokens in segments 1–4 | Fixed cost per call, paid forever | Under 15K |
| **Relevance density** | Plausibly citable tokens ÷ total | Dilution risk | Over 15% mid-session |
| **Retention integral** | Σ (segment tokens × turns retained) | The true cost of hoarding | Trending down |
| **Cache hit rate** | Cached prefix tokens ÷ total input | Whether your optimisations defeat themselves | Over 70% |

The full catalogue of 26 metrics is in [chapter 10](ch:metrics-and-economics).
