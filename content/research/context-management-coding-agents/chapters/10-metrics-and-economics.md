## Every metric should drive a decision

Most metric catalogues list what can be measured. This one adds the column they omit: **the decision each metric drives.** A metric that drives no decision is decoration, and should be deleted.

### If you track only five

| Metric | What it tells you | Decision it drives |
|---|---|---|
| **Prefix tax** | Fixed cost per call, paid forever | Whether to audit the tool surface |
| **Relevance density** | How diluted the context is | Whether dilution is your binding problem |
| **Post-boundary re-fetch rate** | Whether compaction drops load-bearing content | Whether to fix the summary schema or offload first |
| **Pass² ÷ Pass@2** | Whether compression is making the agent intermittent | Whether to back off compression |
| **Cache hit rate** | Whether optimisations are defeating themselves | Whether to stabilise the prefix |

Together they cover the five constraints and the one blind spot. Everything else is diagnosis once one of these moves.

### The full catalogue

<details class="rs-disclosure rs-inline-disclosure" markdown="1">
<summary>All 26 metrics, grouped</summary>

**Budget composition**

| # | Metric | Formula | Healthy | Decision |
|---|---|---|---|---|
| T1 | **Prefix tax** | Tokens in segments 1–4 | Under 15K | Audit the tool surface? |
| T2 | Tool-definition share | Tool definitions ÷ prefix | Under 40% | Defer or delete tools? |
| T3 | Defined : called | Tools defined ÷ tools ever used | Under 3:1 | Which tools to delete |
| T4 | Instruction-file size | Lines | Under 150 | Apply the inference test? |
| T5 | Skill-description budget | Sum of always-loaded descriptions | Under 3K | Have skills become bloat? |
| T6 | Peak utilisation | Maximum context ÷ window | Under 75% | Reset or offload? |
| T7 | Segment distribution | Tokens per segment ÷ total | — | Where to spend effort |

**Density and waste**

| # | Metric | Formula | Healthy | Decision |
|---|---|---|---|---|
| T8 | **Relevance density** | Plausibly citable tokens ÷ total | Over 15% mid-session | Is dilution binding? |
| T9 | **Read-utilisation** | Read tokens cited in output ÷ read tokens | Over 15% | Adopt symbol-level reads? |
| T10 | Tool-result share | Tool results ÷ session tokens | Under 35% | Invest in output shaping? |
| T11 | **Retention integral** | Σ (segment tokens × turns retained) | Trending down | Offload earlier? |
| T12 | Result waste | Tool tokens returned ÷ tokens cited | Under 10:1 | Shape results, or move to code execution? |
| T13 | Search : edit turns | Search turns ÷ edit turns | Under 1.5 | Is retrieval the bottleneck? |

**Loss and recovery**

| # | Metric | Formula | Healthy | Decision |
|---|---|---|---|---|
| T14 | **Post-boundary re-fetch** | Re-fetches in 10 turns after ÷ boundaries | Under 2 | Is the schema dropping load-bearing content? |
| T15 | Compactions per session | Count | At most 1 | Shorten sessions? |
| T16 | Exact-string survival | Strings kept verbatim ÷ strings present before | Over 95% | Is the schema followed? |
| T17 | Recall rate | Recalls ÷ stubs created | 0.1–0.4 | Are stubs dead, or offload too early? |
| T18 | Termination recognition | Correctly ended ÷ completed tasks | Over 90% | Is state surviving boundaries? [S] |
| T19 | Read-coverage on failure | Failures where the decisive file was read ÷ failures | — | **Starvation or dilution?** Opposite fixes |

**Stability and quality**

| # | Metric | Formula | Healthy | Decision |
|---|---|---|---|---|
| T20 | **Pass² ÷ Pass@2** | On a fixed evaluation set | Over 0.85 | **The compression-health indicator** [S] |
| T21 | Loop rate | Sessions with the same call ×3 ÷ sessions | Under 5% | Tighten reset triggers? |
| T22 | Rule violations by turn depth | Violations ÷ opportunities, bucketed by turn | Flat | Is position decay biting? |
| T23 | Tokens per solved task | Total tokens ÷ tasks solved | Trending down | The joint cost–quality number |

**Cost**

| # | Metric | Formula | Healthy | Decision |
|---|---|---|---|---|
| T24 | **Cache hit rate** | Cached input ÷ total input | Over 70% | Is an optimisation self-defeating? |
| T25 | **Cache-adjusted cost per turn** | Σ(cached × p_cached) + Σ(new × p_new) | Trending down | The only honest cost metric |
| T26 | Total-token multiplier | All agents' tokens ÷ single-agent baseline | Depends | Is isolation earning its keep? [P] |

</details>

## The four-line cost model

Agent cost has four lines. Most teams instrument one.

<figure class="diagram">
<p class="diagram__title">Total cost = compute + cache writes + latency + people</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 150" role="img" aria-labelledby="k1-t">
<title id="k1-t">Four cost lines: compute, cache-write premium, latency, and human time. Most teams measure only the first.</title>
<rect class="dg-box--accent" x="10" y="20" width="165" height="100" rx="10"/>
<text class="dg-k" x="92" y="44" text-anchor="middle">LINE 1</text><text class="dg-t" x="92" y="68" text-anchor="middle">Compute</text><text class="dg-s" x="92" y="88" text-anchor="middle">input, split by</text><text class="dg-s" x="92" y="104" text-anchor="middle">cache state</text>
<rect class="dg-box" x="190" y="20" width="165" height="100" rx="10"/>
<text class="dg-k" x="272" y="44" text-anchor="middle">LINE 2</text><text class="dg-t" x="272" y="68" text-anchor="middle">Cache writes</text><text class="dg-s" x="272" y="88" text-anchor="middle">churn is paid</text><text class="dg-s" x="272" y="104" text-anchor="middle">at a premium</text>
<rect class="dg-box" x="370" y="20" width="165" height="100" rx="10"/>
<text class="dg-k" x="452" y="44" text-anchor="middle">LINE 3</text><text class="dg-t" x="452" y="68" text-anchor="middle">Latency</text><text class="dg-s" x="452" y="88" text-anchor="middle">blocking compaction,</text><text class="dg-s" x="452" y="104" text-anchor="middle">round trips</text>
<rect class="dg-box--warn" x="550" y="20" width="160" height="100" rx="10"/>
<text class="dg-k" x="630" y="44" text-anchor="middle">LINE 4</text><text class="dg-t" x="630" y="68" text-anchor="middle">People</text><text class="dg-s" x="630" y="88" text-anchor="middle">often the largest,</text><text class="dg-s" x="630" y="104" text-anchor="middle">rarely counted</text>
<text class="dg-s" x="92" y="142" text-anchor="middle">what most teams measure</text>
</svg>
</div>
<figcaption>A memory system that needs weekly curation costs no tokens, which does not make it free. In a small team the people line is usually the largest.</figcaption>
</figure>

**Line 1: compute.** Input tokens are **99.75–99.87% of agent token usage** [S]. Output is a rounding error. Any cost model that reports "tokens" without splitting input by cache state can be off by an order of magnitude. This chapter uses a generic price shape, in relative units per 1K tokens:

| Token class | Relative price |
|---|---|
| Cached read | **0.10** |
| New input, written to the cache | **1.25** |
| Uncached input, no caching | 1.00 |

The 12.5× spread between a cached read and a new write is why cache behaviour dominates.

**Line 2: the cache-write premium.** New tokens cost *more* than plain uncached input, because writing them into the cache carries a premium. That is why **churn is expensive**: a token that enters, is invalidated and re-enters is paid at 1.25 twice, instead of 0.10 per turn if it had simply stayed.

**Line 3: latency.** Compaction is a **blocking call that can stall the agent for tens of seconds** [S]. Deferred tool loading adds a round trip. Sub-agents add orchestration overhead. Latency becomes money through engineers waiting.

**Line 4: people.** Instruction-file upkeep, memory curation, tool audits, shaping scripts, transcript review. A 30-minute quarterly audit is cheap. A memory system that needs weekly curation is not.

## Two beliefs the arithmetic overturns

### Belief 1: "Cutting tokens cuts cost" [C] {#belief-1-cutting-tokens-cuts-cost}

**False whenever the cut is in the prefix.** A team replaces a static 38K tool surface with per-turn dynamic selection, cutting definitions to 9K.

| | Context | Cached | New | Cost per turn |
|---|---|---|---|---|
| Static | 120K | 117.5K | 2.5K | `117.5 × 0.10 + 2.5 × 1.25` = **14.9** |
| Dynamic | 91K | 10K | 81K | `10 × 0.10 + 81 × 1.25` = **102.3** |

A **24% token cut produced a 6.9× cost increase**, because the tool block sits about 10K into the prompt and changing it invalidates everything after it [C].

> [!key] The rule
> Tokens in a *stable prefix* cost 0.10 per turn. Tokens that *churn* cost 1.25 every time they re-enter. A large stable prefix is cheaper than a small churning one, often by an order of magnitude.

### Belief 2: "Compaction saves money" [C] {#belief-2-compaction-saves-money}

**True, but far less than the token count suggests, and only if the session continues.**

Take a 120K context compacted to 40K (a 25K stable prefix that stays cached, plus a 15K new summary), with 2.5K added per turn afterwards. The compaction call itself (reading the transcript and writing a ~2K summary) costs about 17.4 units.

```chart
{
  "type": "line",
  "title": "Cumulative cost after a compaction",
  "x": [1, 2, 3, 4, 8, 12],
  "series": [
    {"name": "No compaction", "values": [14.9, 30.0, 45.4, 61.0, 126.0, 195.0]},
    {"name": "Compacted", "values": [38.6, 45.8, 53.1, 60.8, 93.8, 130.8]}
  ],
  "min": 0, "max": 200,
  "valueFormat": "{v}",
  "xLabel": "turns after compaction",
  "yLabel": "cumulative cost (relative units)",
  "annotations": [{"x": 4, "text": "breakeven ≈ 4 turns"}],
  "categoryLabel": "Turns after",
  "caption": "Compaction starts 24 units behind and breaks even after about four turns. Compacting with fewer than about five turns left is a pure loss [C].",
  "alt": "Two lines. Compacted starts higher at 38.6 versus 14.9 and crosses below the no-compaction line at turn 4; by turn 12 it is 130.8 versus 195."
}
```

Two consequences.

1. **Compacting near the end of a session is a pure loss.** You pay the full price and collect none of the saving. With fewer than about five turns left, do not compact.
2. **The saving is modest because the kept context was already cheap.** Holding 80K extra cached tokens costs 8 units per turn (80 × 0.10), not the 100 units the raw count implies. Meanwhile the *quality* cost is undiminished: the 6.5-point SWE-bench summariser swing, the Pass² drop and the 44.6% termination rate are paid in full [S].

> [!key] The corrected framing
> Compaction is **a quality decision with a modest financial upside**, not a cost optimisation with a quality caveat. That inversion changes when you reach for it, and it strengthens the case for resets, which cost about 500 tokens and carry none of the summarisation damage.

## Worked monthly economics

A five-engineer team, each running about six agent sessions a day, 20 working days a month.

```text title="baseline, unmanaged"
Sessions per month          = 5 × 6 × 20                 = 600
Turns per session                                        = 45
Mid-session context                                      = 110K
Prefix tax (3 MCP servers, 380-line instruction file)    = 62K
New tokens per turn                                      = 2.6K

Cost per turn    = (110 − 2.6) × 0.10 + 2.6 × 1.25       = 13.99 units
Cost per session = 45 × 13.99                            = 630 units
Cost per month   = 600 × 630                             = 377,900 units
```

```text title="after tool audit, output shaping and just-in-time retrieval"
Prefix tax            62K → 6K    (tool audit + inference test)
Mid-session context  110K → 48K   (shaping + offload + just-in-time)
New tokens per turn   2.6K → 1.9K (output shaping)

Cost per turn    = (48 − 1.9) × 0.10 + 1.9 × 1.25        = 6.99 units
Cost per session = 45 × 6.99                             = 315 units
Cost per month   = 600 × 315                             = 188,800 units
```

**Compute saving: 50%.** Now the lines everyone forgets.

| Line | Before | After | Note |
|---|---:|---:|---|
| Compute | 377,900 | 188,800 | −50% |
| Setup (people, one-off) | — | ~24 h | Tool audit 4 h, shaping 8 h, offload 8 h, instruction file 4 h |
| Maintenance (people, recurring) | ~2 h/month | ~3 h/month | Quarterly audit plus script upkeep |
| Latency | baseline | slightly better | Smaller contexts prefill faster; just-in-time adds round trips |

**Where the value actually is.** The cost saving is real, but it is not the headline. Mid-session context fell from 110K to 48K, from **55% of a 200K window to 24%**. That gives the workload a lower-utilisation condition to compare with the higher one; any quality effect should be measured with [chapter 9](ch:evaluation)'s design.

> [!try] Presenting this
> To a budget holder, lead with the cost number. To an engineering team, lead with the utilisation number.

## Cost per solved task

The one number that captures cost and quality together:

```text
cost_per_solved = total_cost / tasks_solved
```

It cannot be gamed in either easy direction. Cutting context aggressively lowers cost and lowers the solve rate; the ratio catches it. Dumping in more context raises solve rate slightly and cost sharply; the ratio catches that too.

```chart
{
  "type": "hbar",
  "title": "Three configurations over 40 tasks: cost per solved task",
  "categories": ["Full context, no management (27 solved)", "Managed stack (29 solved)", "Over-compressed, tuned on single runs (21 solved)"],
  "series": [{"name": "Cost per solved task", "values": [919, 393, 424]}],
  "valueFormat": "{v}",
  "highlight": [1],
  "labelWidth": 290,
  "categoryLabel": "Configuration",
  "caption": "The over-compressed configuration had the lowest total cost (8,900 versus 11,400 managed and 24,800 full) and is the second-worst choice. The token dashboard would applaud it all the way down [C].",
  "alt": "Full context: 919 per solved task. Managed: 393. Over-compressed: 424."
}
```

This is the arithmetic form of a measured result: full context cost 2.68× the best method while completing fewer tasks [S]. It adds a lesson: **you can over-compress as easily as you can over-load.**

## Where to spend the next unit of effort

Run this checklist in order. Stop at the first "yes".

1. **Cache hit rate under 60%?** Fix the prefix. Everything else is downstream and may be self-defeating.
2. **More than 3 tools defined per tool used?** Delete tools. The largest, cheapest, most reversible win.
3. **Tool results over 35% of the session?** Output shaping: one afternoon, 60–90% reduction [P].
4. **Read-utilisation under 5%?** Structural retrieval.
5. **Post-boundary re-fetch over 2?** Offload before compaction; fix the schema.
6. **Pass² ÷ Pass@2 under 0.85?** You are shipping intermittency. Back off compression.
7. **None of the above?** **Stop optimising context.** Your binding constraint is elsewhere: model choice, task decomposition or the verification loop.

Step 7 is the one people skip. Context management has a stopping point, and continuing past it is how teams end up maintaining machinery that costs people's time and buys nothing.
