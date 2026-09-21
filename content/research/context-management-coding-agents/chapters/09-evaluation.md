## Why this is harder than ordinary agent evaluation

Context changes have four properties that break the standard playbook. Ignore them and you will run experiments that cannot answer your question, which is worse than running none.

| Property | What it means | Consequence |
|---|---|---|
| **1. Small effects** | Model upgrades move benchmarks 10–20 points. Context changes usually move them 2–6. The summariser swap, a *large* one, was 6.5 on SWE-bench [S]. | Detecting 3 points takes roughly ten times more trials than detecting 15 |
| **2. Total harness confound** | Scores depended strongly on which of four [[harness|harnesses]] ran, on identical data [S]. Context lives inside the harness. | Every result is a joint measurement of your strategy *and* your harness |
| **3. Damage lives in the variance** | Pass@2/Pass² gaps widen under tighter compression while averages barely move [S]. | **Single-run evaluation cannot see the main harm you are looking for** |
| **4. Costs and benefits in different units** | Tokens, latency, cache hit rate, solve rate, human hours | Picking one number is a decision, not a measurement |

## Twelve results that shape the design

These come first because the design choices follow from them.

| # | Result | Consequence for your experiment |
|---|---|---|
| E1 | All 18 models degraded at every length step [S] | "Does it fit?" is not an acceptance criterion; control length across arms |
| E2 | Compression hurts stability more than average accuracy [S] | Reporting only single-run accuracy is invalid. Pass^k is mandatory |
| E3 | The summariser alone moved SWE-bench 49.0% → 55.5% [S] | Hold the compaction prompt constant in every other comparison |
| E4 | Harness effects can exceed strategy effects [S] | Published retrieval comparisons do not transfer. Re-run them |
| E5 | Tool-selection accuracy collapses with tool count [S] | Tool count is a controlled variable, not an incidental one |
| E6 | Focused context beats full context with the same information [S] | Measure task outcomes, not retrieval coverage |
| E7 | Input is 99.75–99.87% of agent token usage [S] | Tracking output tokens measures noise. Instrument input by segment |
| E8 | Full context costs 2.68× the best managed method and completes fewer tasks [S] | A full-context arm bounds cost; it is not a quality ceiling |
| E9 | Simple masking matches LLM summarisation at lower cost [S] | Masking is the baseline any summarisation proposal must beat |
| E10 | Addressable compaction wins big on retrieval, slightly on reasoning [S] | Choose a benchmark that matches your failure mode |
| E11 | The first step after compaction is the most error-prone [S] | Instrument the post-boundary window specifically |
| E12 | Multi-agent gains largely came from spending ~15× the tokens [P] | Compare topologies at **equal token spend**, or you are measuring spend |

## Eight design choices

### 1. What you measure

| Option | Cost | Fidelity | Can be gamed by | Use when |
|---|---|---|---|---|
| Token count | Free | Very low | Anything that moves tokens without moving outcomes | Never alone |
| Context utilisation | Free | Low | Compacting more | Monitoring, not deciding |
| Single-run solve rate | Medium | Medium | Variance | Only with k > 1 |
| **Pass^k (all k runs)** | k× | **High** | Hard to game | **Default for compression changes** |
| Tokens per solved task | Medium | High | Dropping hard tasks | Joint cost and quality decisions |
| Human rating | Very high | High | Rater drift | Where there is no oracle |

**Recommendation:** primary metric **Pass^k with k ≥ 2**, reported with **tokens per solved task**.

### 2. The task set

| Option | Validity for *your* repository | Risk |
|---|---|---|
| Public benchmark | Low | Contamination; wrong distribution |
| **Replayed tickets from your history** | **High** | The fix leaking into the repository |
| Synthetic tasks in your repository | Medium | Unrepresentative difficulty |
| Live shadow runs | Highest | No ground truth; slow |

**Recommendation:** 30–60 replayed tickets, stratified by size and subsystem, with the repository pinned to the commit before each fix. Use public benchmarks for sanity checks, never for choosing your configuration.

> [!warning] The replay leakage trap
> If the fix commit is reachable from the pinned commit, or the ticket text quotes the fix, the agent can find the answer. Check by running one arm with retrieval disabled. If it still solves tasks, you have leakage.

### 3. How many runs per task

| k | Interval width at n = 50 (approx.) | Cost | Detects |
|---|---|---|---|
| 1 | ±13 points | 1× | Only large effects |
| **2** | ±9 points, plus Pass² | 2× | **Compression damage** |
| 3 | ±7 points | 3× | Moderate effects |
| 5 | ±6 points | 5× | Small effects; run-level variance |

**Recommendation: k = 2 minimum, always.** Not for the interval, but because Pass² is the only way to see intermittency. k = 1 is not a cheaper version of the experiment. It is a different, less valid one.

### 4. Comparison design

| Design | Power | Note |
|---|---|---|
| Independent groups | Low | Wastes the pairing that is freely available |
| **Paired: same tasks in both arms** | **High** | The obvious right choice |
| Before and after, over time | Low | Confounded by model updates and repository drift |
| Ablation: remove one component | High | Best for attributing a stack |

**Recommendation:** paired, always, analysed with McNemar's test on the tasks where the arms disagree. As shown below, it needs roughly a third of the tasks.

### 5. What to hold constant

| Variable | Hold constant? | Why |
|---|---|---|
| Model version | **Yes** | Violated constantly by "we upgraded during the test" |
| Harness version | **Yes** | E4 |
| Tool surface | **Yes** | E5 |
| **Compaction prompt** | **Yes** | E3: 6.5 SWE-bench points hide here |
| Temperature and sampling | **Yes** | Otherwise you measure sampling |
| Repository commit | **Yes** | Otherwise you measure the repository |
| Time of day and load | No, but log it | Provider-side variance is real |

The most violated row is the compaction prompt. A team comparing retrieval strategies while the summariser differs between arms is measuring the summariser.

### 6. Cost accounting

Report **[[cache-adjusted cost]]**. Cached and uncached tokens differ in price by about an order of magnitude, and context changes often move the *ratio* rather than the total. A change that cuts tokens 20% while halving the cache hit rate is a cost *increase*, and a raw token count reports it as a win. [Chapter 10](ch:metrics-and-economics) works the numbers.

### 7. Where you measure

Always instrument the **10 turns after each compaction, reset or sub-agent return** (E11). Aggregate metrics average this window away. The re-fetch rate inside it is the cheapest high-signal metric in this research.

### 8. The baseline

| Baseline | What it proves |
|---|---|
| Full context, no management | Upper-bound cost; **not** a quality ceiling (E8) |
| FIFO truncation | The floor: did you beat doing nothing clever? |
| **Observation masking** | **The honest bar for any summarisation proposal** (E9) |
| Your previous configuration | Regression check |

**Recommendation:** three arms: masking, your proposal, and full context.

## Pass^k, worked {#pass-k-worked}

[[Pass^k|Pass@k]] and Pass^k answer opposite questions and diverge sharply. Assume each run succeeds independently with probability *p* = 0.80.

| Metric | Formula | Value | The question it answers |
|---|---|---|---|
| Pass@2 | 1 − (1 − p)² | **0.960** | Can it ever do this? |
| Pass² | p² | **0.640** | Can it reliably do this? |

A 32-point spread from one underlying number. Now suppose aggressive compaction drops *p* to 0.70.

```chart
{
  "type": "hbar",
  "title": "The same compression costs three times more on reliability",
  "categories": ["Pass@2 (ever solved)", "Pass² (always solved)"],
  "series": [
    {"name": "p = 0.80", "values": [96.0, 64.0]},
    {"name": "p = 0.70, after compression", "values": [91.0, 49.0]}
  ],
  "max": 100,
  "valueFormat": "{v}%",
  "labelWidth": 170,
  "categoryLabel": "Metric",
  "caption": "Illustrative arithmetic: at p=0.80 a single run succeeds 80% of the time, but Pass² falls to 64%; at p=0.70 it falls to 49%. The same shape appears in measurement — on AppWorld, compression moved single-run accuracy 14.3 points (85.7% to 71.4%) but Pass² 17.9 points (77.4% to 59.5%) [S].",
  "alt": "At p 0.80: Pass@2 96%, Pass² 64%. At p 0.70: Pass@2 91%, Pass² 49%."
}
```

> [!key] The operating rule
> Report Pass² as primary and Pass@2 as secondary. Treat the ratio **Pass² ÷ Pass@2** as your compression-health indicator. Below about 0.85 you are shipping intermittency.

## Sample size, honestly

### The interval on one arm

50 tasks, 34 solved. The [[Wilson interval]] at 95% (z = 1.96):

```text title="Wilson score interval, 34 of 50"
p̂        = 34/50                        = 0.680
z²/n     = 3.8416/50                    = 0.076832
z²/2n    = 0.038416
z²/4n²   = 3.8416/10000                 = 0.00038416
p̂q̂/n     = (0.680)(0.320)/50            = 0.0043520

√(0.0043520 + 0.00038416) = √0.0047362  = 0.068819
1.96 × 0.068819                         = 0.134885

centre = 0.680 + 0.038416               = 0.718416
lower  = (0.718416 − 0.134885)/1.076832 = 0.5419
upper  = (0.718416 + 0.134885)/1.076832 = 0.7924
```

**68%, with a 95% interval of 54.2% to 79.2%: 25 points wide.** The treatment arm, 37 of 50, gives **74%, interval 60.4% to 84.1%**.

<figure class="diagram">
<p class="diagram__title">Two arms, 50 tasks each: overlapping almost entirely</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 170" role="img" aria-labelledby="e1-t">
<title id="e1-t">Control 68 percent with interval 54.2 to 79.2; treatment 74 percent with interval 60.4 to 84.1. The intervals overlap across most of their range.</title>
<line class="dg-line" x1="120" y1="140" x2="700" y2="140"/>
<text class="dg-s" x="120" y="160" text-anchor="middle">50%</text><text class="dg-s" x="265" y="160" text-anchor="middle">60%</text><text class="dg-s" x="410" y="160" text-anchor="middle">70%</text><text class="dg-s" x="555" y="160" text-anchor="middle">80%</text><text class="dg-s" x="700" y="160" text-anchor="middle">90%</text>
<rect class="dg-box--info" x="271" y="22" width="272" height="108" rx="4" opacity="0.5"/>
<text class="dg-s" x="407" y="16" text-anchor="middle">overlap: 60.4% to 79.2%</text>
<text class="dg-t" x="10" y="55">Control</text><text class="dg-s" x="10" y="72">34/50</text>
<line class="dg-line" x1="181" y1="60" x2="543" y2="60" stroke-width="3"/>
<line class="dg-line" x1="181" y1="50" x2="181" y2="70"/><line class="dg-line" x1="543" y1="50" x2="543" y2="70"/>
<circle class="dg-dot" cx="381" cy="60" r="6"/>
<text class="dg-s" x="381" y="44" text-anchor="middle">68%</text>
<text class="dg-t" x="10" y="105">Treatment</text><text class="dg-s" x="10" y="122">37/50</text>
<line class="dg-line dg-line--accent" x1="271" y1="110" x2="614" y2="110" stroke-width="3"/>
<line class="dg-line dg-line--accent" x1="271" y1="100" x2="271" y2="120"/><line class="dg-line dg-line--accent" x1="614" y1="100" x2="614" y2="120"/>
<circle class="dg-dot--accent" cx="468" cy="110" r="6"/>
<text class="dg-s" x="468" y="94" text-anchor="middle">74%</text>
</svg>
</div>
<figcaption>68% versus 74% on 50 tasks is not a result. Teams ship context changes on smaller differences than this every week.</figcaption>
</figure>

### How many tasks you would need

For an unpaired comparison of 60% versus 65% (a 5-point effect), at α = 0.05 two-sided and 80% power:

```text title="two-proportion power calculation"
p̄ = 0.625, q̄ = 0.375
z_α/2 · √(2p̄q̄)      = 1.9600 × 0.684653 = 1.34192
z_β · √(p₁q₁ + p₂q₂) = 0.8416 × 0.683740 = 0.57544
(1.34192 + 0.57544)² = 3.67627
n = 3.67627 / 0.05²  = 1470.5   →  about 1,471 tasks per arm
```

At k = 2 that is 5,884 agent runs, for a 5-point effect. For a 10-point effect (60% versus 70%) the same method gives **about 356 per arm**. **The detectable effect shrinks only with the square root of your budget**: halving it costs four times the runs.

### The paired design rescues this

McNemar's test uses only the **discordant pairs**, tasks where the two arms disagree. With ψ the share of discordant pairs that favour the treatment:

```text title="McNemar, required discordant pairs"
n_disc ≈ (z_α/2 + z_β)² / (2ψ − 1)²
       = (1.9600 + 0.8416)² / (2 × 0.70 − 1)²
       = 7.84896 / 0.16
       = 49.06   →  about 49 discordant pairs
```

If 20% of tasks are discordant, you need **about 245 tasks in total**, against 712 unpaired for the same 10-point effect.

```chart
{
  "type": "hbar",
  "title": "Tasks needed to detect a 10-point effect",
  "categories": ["Unpaired (2 × 356)", "Paired with McNemar"],
  "series": [{"name": "Total tasks", "values": [712, 245]}],
  "valueFormat": "{v}",
  "highlight": [1],
  "labelWidth": 170,
  "categoryLabel": "Design",
  "caption": "Roughly a threefold reduction, for free, purely from analysing the right thing. Most teams run unpaired because it is the default in every tutorial [D].",
  "alt": "Unpaired: 712 tasks. Paired: 245 tasks."
}
```

### When you cannot afford even that

Three honest fallbacks, most valid first:

1. **Measure a bigger effect.** Do not A/B a 2-point tweak; A/B the whole stack against no management.
2. **Measure a tighter proxy.** Tokens per solved task varies far less than solve rate; cache hit rate is almost deterministic. Weaker evidence, but measurable.
3. **Adopt on mechanism, then monitor.** Adopt because the mechanism is sound, and watch a small canary set for regressions. This is what most teams should do for most changes, and it is defensible **only if you say so** instead of presenting it as measured.

## The minimum viable experiment

```yaml title="context-experiment.yaml"
tasks:        40 replayed tickets from your repository, stratified by size
arms:         2   # control = current config, treatment = ONE change
runs:         k = 2 per task per arm   # 160 runs in total
design:       paired; identical tasks; identical seeds where possible
held_fixed:   [model, harness, tool_surface, compaction_prompt, temperature]
primary:      Pass² per arm; McNemar on discordant pairs
secondary:    cache-adjusted input tokens per solved task
diagnostic:   re-fetch rate in the 10 turns after each boundary
stop_rule:    decided before running; no peeking and extending
```

> [!warning] Change exactly one thing
> Bundling five improvements produces a result you cannot attribute. You will know the stack helped, never which part, and when it regresses you will not know what to revert.

The [experiment spec template](ch:templates#8-context-experiment-spec) turns this into a form.

## Attributing a stack: ablation

Once several methods are adopted, "which one is doing the work?" needs leave-one-out ablation on a fixed task set.

| Arm | Configuration | What it tells you |
|---|---|---|
| Full stack | All methods | The reference |
| Minus tool minimisation | Tool surface restored | What M-2 contributes |
| Minus output shaping | Shaping off | What M-5 contributes |
| Minus offload | Offload off | What M-6 contributes |
| Minus semantic compaction | Threshold compaction instead | What M-8 contributes |
| None | No management | Total value of the stack |

Expect two things. **Effects are not additive**: semantic compaction's value depends on offload being present. And **some ablations will come out neutral or positive.** A method that does not help on your workload shows up as a wash when removed. That is the point: removal is a legitimate result. Six arms × 40 tasks × k = 2 is 480 runs, so run it quarterly, not weekly.

## Evaluating a memory system

Memory is the hardest thing here to evaluate and the easiest to fool yourself about, because writing works and reading is what matters.

| Question | Measurement |
|---|---|
| Is anything retrieved? | Retrievals per session. **If about zero, stop: nothing else matters** |
| Does retrieval change behaviour? | Sessions where a retrieved memory shaped a later action ÷ sessions with retrievals |
| Is what comes back correct? | Sample 20 retrievals; count stale or wrong ones |
| Does it improve outcomes? | Paired A/B, memory on versus off, on tasks with plausible prior context |
| What does it cost? | Always-loaded prefix tokens, storage and maintenance hours |

**The gate:** if retrievals that changed an action are under one per week, the system is decoration. Delete it.

## Evaluation mistakes to avoid

| Mistake | Why it fails |
|---|---|
| Reporting token savings as the result | Tokens are a cost, not an outcome (E6, E8) |
| One run per task | Blind to the main harm (E2) |
| Unpaired design | Wastes about three times the budget |
| Changing five things at once | Cannot be attributed or reverted |
| Peeking and extending until significant | Inflates false positives without limit |
| A public benchmark as the decision criterion | The harness dominates; wrong distribution (E4) |
| Ignoring the cache in cost | Can flip the sign of the result |
| Judging after one session | The interval at n = 1 spans almost everything |
| Different compaction prompts across arms | 6.5 SWE-bench points of confound (E3) |
| Measuring retrieval recall instead of task outcome | Past a point, recall and outcome move in opposite directions (E6) |
