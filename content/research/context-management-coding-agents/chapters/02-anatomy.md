## Why break the context down at all

Chapter 1 gave the constraints; this chapter locates them in the nine segments you can measure and change.

"My context is full" is not something you can act on. A segment-by-segment audit is.

In this constructed example, the instruction file is only 4% of the window; tool definitions occupy 25% for tools the agent rarely calls [C].

This chapter splits a coding agent's context into nine segments. For each one it gives the typical size, who controls it, how it fails, how to measure it, and how it behaves in the cache.

## Prefix and body

The nine segments sit in a common prompt layout. Exact ordering, cache behaviour and position effects depend on the harness and provider.

<figure class="diagram">
<p class="diagram__title">The nine segments, in a common prompt layout</p>
<div class="diagram__scroll">
<svg viewBox="0 0 900 250" role="img" aria-labelledby="a1-t">
<title id="a1-t">A common layout: segments one to four form a stable prefix, while segments five to nine form a growing body. Cache and position effects depend on the harness.</title>
<rect class="dg-box--accent" x="10" y="40" width="340" height="120" rx="10"/>
<text class="dg-k" x="20" y="30">PREFIX · STABLE · CACHE-ELIGIBLE</text>
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
<text class="dg-k" x="375" y="30">BODY · GROWS WITH SESSION · CHURN VARIES</text>
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
<text class="dg-s" x="10" y="220">start of prompt: placement effect varies by task</text>
<text class="dg-s" x="890" y="220" text-anchor="end">end of prompt: placement effect varies by task</text>
<text class="dg-s" x="831" y="176" text-anchor="middle">compaction can rewrite</text>
</svg>
</div>
<p class="diagram__hint">Scroll sideways to see all nine segments.</p>
<figcaption>Prefix segments are sent every call and may be eligible for provider caching; billing depends on cache hits. Body segments grow with the session, and unchanged portions may be reused by some providers while churn drives uncached work. Compaction can rewrite earlier context; cross-session memory placement varies by policy [D].</figcaption>
</figure>

Use the [[prefix]]/[[body]] split as an audit model; exact ordering and cache semantics depend on the harness and provider.

## The nine segments at a glance

| # | Segment | Typical size [D] | Controlled by | Cache behavior [D] | Typical failure |
|---|---|---|---|---|---|
| 1 | System prompt and harness | 2K–12K | Mostly the vendor | Usually stable; provider-cacheable if unchanged | Invisible; you cannot trim it and often cannot see it |
| 2 | Tool definitions | 1K–60K+ | You (which servers and tools) | Stable when the tool set is stable | Bloat; selection degrades as the set grows |
| 3 | Project instruction files | 0.3K–15K | Entirely you | Stable when unchanged | Grows forever; buried by position; contradicts itself |
| 4 | Skill descriptions | 0.5K–5K | You | Stable when unchanged | Too vague to trigger, or so many they become segment 2 |
| 5 | Retrieved code and files | 2K–80K | Agent plus your tooling | Growing body; often churns | Whole files read for one function; stale after its own edits |
| 6 | Tool results | 5K–150K | Agent plus output shaping | Growing body; often uncached while changing | Flooding, truncation and long retention |
| 7 | Agent reasoning and messages | 3K–60K | Model verbosity, your prompting | Growing body; churns each turn | Self-written distractors; loops |
| 8 | User turns | 0.2K–10K | You | Growing body; unchanged turns may be reused | Vague early, contradictory later |
| 9 | Summaries and memory | 0.5K–8K | Your policy | Compaction may rewrite; memory placement varies | Launders errors; loses the decisive detail |

The ranges are order-of-magnitude bands from observed sessions and reported figures. Treat them as a place to start measuring, not as targets [D].

## How to act on each segment

For each segment, the useful questions are the same: how it fails, how to measure it and what to change first. The row number maps to the inventory above.

| # | Decisive risk | Measure | Default action |
|---|---|---|---|
| <span id="segment-1-system-prompt-and-harness">**1 · System**</span> | Fixed [[prefix tax]] and the largest [[harness]] confound. A scaffold change can look like a model regression. | In a fresh session, send one token and record input tokens; repeat after harness upgrades. | Treat it as a versioned dependency and keep it stable. |
| <span id="segment-2-tool-definitions">**2 · Tools**</span> | Definition tokens displace work; larger candidate pools can also complicate selection, though current tests do not isolate that effect cleanly. A reported server reaches 42K tokens [P]. | Schema tokens, active tool count, defined-to-called ratio, wrong-tool rate and missed capabilities across representative sessions. | Treat zero-call tools as deletion candidates; verify task coverage and keep rollback. Set any local budget from measured task outcomes. |
| <span id="segment-3-project-instruction-files">**3 · Instructions**</span> | Growth, contradiction, staleness and position effects. | Lines, tokens and violations per rule. | Keep under about 150 lines [P]; retain only what a competent engineer cannot infer in two minutes; scope specialist rules beside their code. |
| <span id="segment-4-skill-descriptions">**4 · Skills**</span> | Vague triggers never fire; too many descriptions recreate tool bloat. | Trigger precision, trigger recall and total always-loaded tokens. | Keep the trigger short; load the procedure on demand. |
| <span id="segment-5-retrieved-code">**5 · Retrieved code**</span> | Whole-file waste and stale copies after the agent edits the file. | [[Read-utilisation]] and [[read-coverage]] on failures. | Read symbols or bounded ranges; re-read before re-editing. |
| <span id="segment-6-tool-results">**6 · Tool results**</span> | Can be the largest, low-density body segment; flooding, truncation and long retention. | Result tokens, top commands and [[retention integral]]: tokens × turns retained. | One line on success, full trace on failure, full log offloaded to a file. |
| <span id="segment-7-agent-reasoning-and-messages">**7 · Agent messages**</span> | Narration becomes a plausible self-authored distractor; repeated actions become a loop. | Assistant-token share and identical tool-call repeats. | Persist plans, invariants and ruled-out hypotheses; cut narration. |
| <span id="segment-8-user-turns">**8 · User turns**</span> | Under-specification causes exploration; later changes create [[clash]]. | Turns to first productive edit and requirement reversals. | State scope early; after a change, restate the complete current requirement. |
| <span id="segment-9-summaries-and-memory">**9 · Summaries / memory**</span> | Lossy re-encoding can launder errors; compaction may rewrite earlier context. | Compactions, compression ratio, post-compaction re-fetch rate and [[Pass^k|Pass²]]. | Offload first; compact once at a semantic boundary with an explicit schema. |

Four evidence results change the default action and are worth keeping here:

| Evidence | Consequence |
|---|---|
| RAG-MCP scored 43.13% versus 13.62% for blank conditioning in a held-out web-search method comparison. Its separate 20-task stress test varied a one-relevant-tool pool from 1 to 11,100 and found non-monotonic degradation at large sizes [S]. | Treat candidate-pool size as a workload variable; evaluate selection, task success and prompt cost under your own harness [D]. |
| A vendor Dog API demonstration reports Qwen3 1.7B got 19/20 calls correct at 20 tools, 3/4 at 40, and frequent errors at 107 [P]. | This small, explicitly non-rigorous example does not set a general ceiling; test the relevant model and task mix. |
| Across four GPT-5 configurations averaged over five runs on a 50-task Dynamics 365 hotel-expense benchmark with verbose MCP responses, input tokens were 99.75–99.87% of token volume; full-context used 2.68× the total tokens of the best-performing managed setup while completing fewer tasks [S]. | Treat output shaping as a hypothesis for similarly verbose workflows. Measure segment volumes, task outcomes, and priced input/output cost using your provider's rates and cache status [D]. |
| Changing only the summariser moved SWE-bench from 49.0% to 55.5% [S]. | A compactor is a quality component, not plumbing [D]. |
| On AppWorld, no compression reached 85.7% accuracy / 77.4% Pass²; prompt compaction reached 71.4% / 59.5%; FIFO reached 63.7% / 53.0% [S]. | Compression damage appears in repeatability before averages [D]. |

> [!try] The inference test for instruction files
> Keep a line only if a competent engineer could not infer it from the repository in two minutes. Move enforceable rules into tests or linters; move specialist rules beside the code they govern.

## Reading a whole budget: a worked example [C] {#reading-a-whole-budget-a-worked-example}

Here is a constructed 152K-token mid-session snapshot from a large monorepo. It is illustrative [C], not a measured incident.

```chart
{
  "type": "stack",
  "title": "A 152K-token context, by segment",
  "categories": ["1 System prompt", "2 Tool definitions", "3 Instruction files", "4 Skill descriptions", "5 Retrieved code", "6 Tool results", "7 Agent messages", "8 User turns", "9 Summaries"],
  "series": [{"name": "Tokens", "values": [9000, 38000, 6500, 1800, 22000, 58000, 12000, 1700, 3000]}],
  "highlight": [1, 5],
  "valueFormat": "{v:,}",
  "categoryLabel": "Segment",
  "caption": "Two segments hold 63% of this constructed window: tool definitions (3 MCP servers, 61 tools, 11 ever used) and tool results (one <code>npm ci</code> log alone is 14,000 tokens). The instruction file is 4% [C].",
  "alt": "A stacked bar. Tool results 38%, tool definitions 25%, retrieved code 14%, agent messages 8%, system prompt 6%, instruction files 4%, summaries 2%, skills 1%, user turns 1%."
}
```

What a practitioner does with this, in priority order:

1. **Start with unused tool definitions.** In this example, treat zero-call or duplicated capabilities as removal candidates; verify task coverage and keep rollback before deleting, or defer their schemas. This is the largest reversible prefix win in this example.
2. **Shape the loudest command output.** Filter `npm ci` on success and offload the full log so it does not remain in the body.
3. **Prune the instruction file.** Apply the inference test; this changes the rules, so verify the resulting behaviour.
4. **Change retrieval last.** Symbol reads instead of whole files alter how the agent searches, so measure the trade-off rather than treating the saved tokens as free.

```chart
{
  "type": "hbar",
  "title": "Tokens recovered by each action",
  "categories": ["Defer or delete unused tools", "Filter or offload the npm ci log", "Inference test on instruction file", "Symbol reads instead of whole files"],
  "series": [{"name": "Tokens recovered", "values": [30000, 13000, 4000, 2000]}],
  "valueFormat": "{v:,}",
  "highlight": [0],
  "categoryLabel": "Action",
  "caption": "Together about 49,000 tokens, roughly 32% of this constructed 152K context. The first two actions reduce or defer volume; every change remains measurable and reversible, while the latter two also change behaviour and need verification [C].",
  "alt": "Bars: defer or delete unused tools 30,000; filter the npm log 13,000; instruction file 4,000; symbol reads 2,000."
}
```

The example shows why the [optimisation plan](ch:optimisation-plan) opens with measurement instead of technique: the highest-leverage segment is workload-specific.

## The four numbers for your dashboard

If you track nothing else, track these.

| Metric | Formula | What it tells you | Healthy |
|---|---|---|---|
| **Prefix tax** | Tokens in segments 1–4 | Fixed input present on each call; cached billing varies | Start below 15K; calibrate to provider |
| **Relevance density** | Plausibly citable tokens ÷ total | Dilution risk | Start above 15% mid-session; calibrate to workload |
| **Retention integral** | Σ (segment tokens × turns retained) | The true cost of hoarding | Trending down |
| **Cache hit rate** | Cached prefix tokens ÷ total input | Whether your optimisations defeat themselves | Start above 70%; calibrate to provider |

These are derived starting targets, not universal health values; calibrate them to your provider, harness and workload. The full catalogue of 26 metrics is in [chapter 10](ch:metrics-and-economics).

## Your next action

Run the [context budget audit](ch:templates#1-context-budget-audit). Record the nine segments, identify the two largest retention contributors, make one reversible change, and re-measure prefix tax, relevance density, retention integral and cache hit rate.
