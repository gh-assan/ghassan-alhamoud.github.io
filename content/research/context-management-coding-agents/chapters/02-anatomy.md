## Why break the context down at all

"My context is full" is not something you can act on. "62% of my context is tool output, and 80% of that is one `npm install` log I never read" is.

A first audit is valuable because the segment being tuned is often not the large one. The worked example below spends 4% of its window on instructions and 25% on definitions for tools the agent rarely calls [C].

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

## How to act on each segment

For each segment, the useful questions are the same: how it fails, how to measure it and what to change first.

| Segment | Decisive risk | Measure | Default action |
|---|---|---|---|
| <span id="segment-1-system-prompt-and-harness">**1. System prompt and harness**</span> | Fixed [[prefix tax]] and the largest [[harness]] confound. A scaffold change can look like a model regression. | In a fresh session, send one token and record input tokens; repeat after harness upgrades. | Treat it as a versioned dependency and keep it stable. |
| <span id="segment-2-tool-definitions">**2. Tool definitions**</span> | Displacement plus selection confusion. Reported examples reach 42K tokens [P]; selection degrades as tool count grows [S]. | Schema tokens, active tool count and defined-to-called ratio across 20 sessions. | Delete zero-call tools; defer definitions; use about 20 active tools as a soft ceiling [D]. |
| <span id="segment-3-project-instruction-files">**3. Project instructions**</span> | Growth, contradiction, staleness and position decay. | Lines, tokens and violations per rule. | Keep under about 150 lines [P]; retain only what a competent engineer cannot infer in two minutes; scope specialist rules beside their code. |
| <span id="segment-4-skill-descriptions">**4. Skill descriptions**</span> | Vague triggers never fire; too many descriptions recreate tool bloat. | Trigger precision, trigger recall and total always-loaded tokens. | Keep the trigger short; load the procedure on demand. |
| <span id="segment-5-retrieved-code">**5. Retrieved code**</span> | Whole-file waste and stale copies after the agent edits the file. | [[Read-utilisation]] and [[read-coverage]] on failures. | Read symbols or bounded ranges; re-read before re-editing. |
| <span id="segment-6-tool-results">**6. Tool results**</span> | The largest, lowest-density body segment; flooding, truncation and long retention. | Result tokens, top commands and [[retention integral]]: tokens × turns retained. | One line on success, full trace on failure, full log offloaded to a file. |
| <span id="segment-7-agent-reasoning-and-messages">**7. Agent messages**</span> | Narration becomes a plausible self-authored distractor; repeated actions become a loop. | Assistant-token share and identical tool-call repeats. | Persist plans, invariants and ruled-out hypotheses; cut narration. |
| <span id="segment-8-user-turns">**8. User turns**</span> | Under-specification causes exploration; later changes create [[clash]]. | Turns to first productive edit and requirement reversals. | State scope early; after a change, restate the complete current requirement. |
| <span id="segment-9-summaries-and-memory">**9. Summaries and memory**</span> | Lossy re-encoding that can launder errors and rewrites the prefix. | Compactions, compression ratio, post-compaction re-fetch rate and [[Pass^k|Pass²]]. | Offload first; compact once at a semantic boundary with an explicit schema. |

Three numbers change the default action and are worth keeping here:

| Evidence | Consequence |
|---|---|
| Tool selection fell from 43% to under 14% as tool count grew; another test went from 19/20 correct at 20 tools to failure at 107 [S]. | Fewer tools solve both displacement and confusion; deferred schemas solve only displacement. |
| Input tokens were 99.75–99.87% of usage in tool-heavy agents, and full-context runs used 2.68× the tokens while completing fewer tasks [S]. | Shape tool output before tuning model output. |
| Changing only the summariser moved SWE-bench from 49.0% to 55.5% [S]. | A compactor is a quality component, not plumbing. |
| On AppWorld, no compression reached 85.7% accuracy / 77.4% Pass²; prompt compaction reached 71.4% / 59.5%; FIFO reached 63.7% / 53.0% [S]. | Compression damage appears in repeatability before averages. |

> [!try] The inference test for instruction files
> Keep a line only if a competent engineer could not infer it from the repository in two minutes. Move enforceable rules into tests or linters; move specialist rules beside the code they govern.

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

1. **Tool definitions: 38,000 tokens, 50 unused tools.** Drop to one server or defer definitions. That recovers about 30,000 tokens of *prefix*, permanently, at no task cost. **Do this first in this example.** It is the largest, cheapest and most reversible win, and it needs no behaviour change.
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
  "caption": "Together about 49,000 tokens, roughly 32% of this 152K context, with no loss of information available to the agent. Three of the four actions are pure waste removal [C].",
  "alt": "Bars: defer or delete unused tools 30,000; filter the npm log 13,000; instruction file 4,000; symbol reads 2,000."
}
```

The example shows why the [optimisation plan](ch:optimisation-plan) opens with measurement instead of technique: the highest-leverage segment is workload-specific.

## The four numbers for your dashboard

If you track nothing else, track these.

| Metric | Formula | What it tells you | Healthy |
|---|---|---|---|
| **Prefix tax** | Tokens in segments 1–4 | Fixed cost per call, paid forever | Under 15K |
| **Relevance density** | Plausibly citable tokens ÷ total | Dilution risk | Over 15% mid-session |
| **Retention integral** | Σ (segment tokens × turns retained) | The true cost of hoarding | Trending down |
| **Cache hit rate** | Cached prefix tokens ÷ total input | Whether your optimisations defeat themselves | Over 70% |

The full catalogue of 26 metrics is in [chapter 10](ch:metrics-and-economics).
