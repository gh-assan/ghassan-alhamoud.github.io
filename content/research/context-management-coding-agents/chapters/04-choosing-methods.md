## Why a procedure, not advice

Most guides end with "consider your needs". That is an adjective, not a method. This chapter is a procedure with time budgets. It takes **about 55 minutes, once**, and it routes two readers with different bottlenecks to different methods.

<figure class="diagram">
<p class="diagram__title">The procedure</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 150" role="img" aria-labelledby="p1-t">
<title id="p1-t">Measure for 30 minutes, route for 5, classify for 5, compose for 10, then review quarterly.</title>
<rect class="dg-box--accent" x="10" y="30" width="150" height="80" rx="10"/>
<text class="dg-k" x="85" y="55" text-anchor="middle">STEP 1 · 30 MIN</text>
<text class="dg-t" x="85" y="78" text-anchor="middle">Measure</text>
<text class="dg-s" x="85" y="96" text-anchor="middle">four numbers</text>
<rect class="dg-box" x="190" y="30" width="150" height="80" rx="10"/>
<text class="dg-k" x="265" y="55" text-anchor="middle">STEP 2 · 5 MIN</text>
<text class="dg-t" x="265" y="78" text-anchor="middle">Route</text>
<text class="dg-s" x="265" y="96" text-anchor="middle">by binding constraint</text>
<rect class="dg-box" x="370" y="30" width="150" height="80" rx="10"/>
<text class="dg-k" x="445" y="55" text-anchor="middle">STEP 3 · 5 MIN</text>
<text class="dg-t" x="445" y="78" text-anchor="middle">Classify</text>
<text class="dg-s" x="445" y="96" text-anchor="middle">the task type</text>
<rect class="dg-box" x="550" y="30" width="160" height="80" rx="10"/>
<text class="dg-k" x="630" y="55" text-anchor="middle">STEP 4 · 10 MIN</text>
<text class="dg-t" x="630" y="78" text-anchor="middle">Compose</text>
<text class="dg-s" x="630" y="96" text-anchor="middle">the stack</text>
<line class="dg-line" x1="160" y1="70" x2="182" y2="70"/><polygon class="dg-head" points="182,65 190,70 182,75"/>
<line class="dg-line" x1="340" y1="70" x2="362" y2="70"/><polygon class="dg-head" points="362,65 370,70 362,75"/>
<line class="dg-line" x1="520" y1="70" x2="542" y2="70"/><polygon class="dg-head" points="542,65 550,70 542,75"/>
<path class="dg-line dg-line--dash" d="M630,110 C630,145 85,145 85,112"/>
<text class="dg-s" x="360" y="140" text-anchor="middle">re-measure quarterly, or after one change</text>
</svg>
</div>
<figcaption>Measurement takes most of the time and is not optional. The rest of the procedure is fast because it is table lookups.</figcaption>
</figure>

## Step 1: Measure (30 minutes)

Run the [minimum measurement](ch:ten-methods#before-any-method-measure) and produce four numbers.

| Symbol | What it is | How to get it |
|---|---|---|
| **P** | [[Prefix tax]] in tokens | Fresh session, send `.`, read the input count |
| **T** | Tool-definition tokens, and the defined-to-called ratio | Dump and count the schemas; count calls in your last 20 sessions |
| **O** | Tool results as a share of session tokens | Bucket three long sessions by segment |
| **C** | Cache hit rate | Harness or provider usage report |

> [!warning] Do not proceed without these
> Every wrong context decision in this research was made by someone reasoning from intuition about which segment was large.

## Step 2: Route by your binding constraint (5 minutes)

Your [[binding constraint]] is the one limitation currently capping results. Find it in the table, start with the method in bold, and keep the next one ready.

| If… | Your binding constraint is | Start with | Then |
|---|---|---|---|
| C is under 60% | Cache thrash | **[M-1 prefix stability](ch:ten-methods#m-1-prefix-stability)** | M-8 (compaction is often the culprit) |
| T is over 15K, or more than 3 tools defined per tool used | Tool bloat | **[M-2 tool minimisation](ch:ten-methods#m-2-tool-surface-minimisation)** | M-1 |
| O is over 35% of the session | Tool-output flooding | **[M-5 output shaping](ch:ten-methods#m-5-output-shaping)** | M-6 |
| Sessions often exceed the window | History growth | **M-8 and M-6** | M-7, M-10 |
| [[Read-utilisation]] under 5% | Retrieval precision | **[M-4 structural retrieval](ch:ten-methods#m-4-structural-retrieval)** | M-3 |
| Failures are starvation (decisive file never read) | Retrieval recall | **M-4 first, then M-3** | — |
| Quality falls with session length | Session hygiene | **[M-10 session lifecycle](ch:ten-methods#m-10-session-lifecycle)** | M-7 |
| The agent re-derives things after compaction | State loss | **[M-7 the living plan](ch:ten-methods#m-7-externalised-state-the-living-plan)** | M-8, M-6 |
| Survey work saturates the main context | Topology | **[M-9 sub-agents](ch:ten-methods#m-9-sub-agent-isolation-with-a-contract)** | M-6 |

<figure class="diagram">
<p class="diagram__title">The routing decision, as a flow</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 400" role="img" aria-labelledby="p2-t">
<title id="p2-t">Check cache hit rate first, then tool bloat, then tool output, then retrieval, then session and state problems.</title>
<rect class="dg-box" x="10" y="10" width="240" height="46" rx="8"/><text class="dg-t" x="130" y="38" text-anchor="middle">Cache hit rate under 60%?</text>
<rect class="dg-box--accent" x="480" y="10" width="230" height="46" rx="8"/><text class="dg-t" x="595" y="38" text-anchor="middle">M-1 Prefix stability</text>
<rect class="dg-box" x="10" y="76" width="240" height="46" rx="8"/><text class="dg-t" x="130" y="104" text-anchor="middle">Tools over 15K or ratio over 3:1?</text>
<rect class="dg-box--accent" x="480" y="76" width="230" height="46" rx="8"/><text class="dg-t" x="595" y="104" text-anchor="middle">M-2 Tool minimisation</text>
<rect class="dg-box" x="10" y="142" width="240" height="46" rx="8"/><text class="dg-t" x="130" y="170" text-anchor="middle">Tool output over 35%?</text>
<rect class="dg-box--accent" x="480" y="142" width="230" height="46" rx="8"/><text class="dg-t" x="595" y="170" text-anchor="middle">M-5 Output shaping</text>
<rect class="dg-box" x="10" y="208" width="240" height="46" rx="8"/><text class="dg-t" x="130" y="236" text-anchor="middle">Failures: file never read?</text>
<rect class="dg-box--accent" x="480" y="208" width="230" height="46" rx="8"/><text class="dg-t" x="595" y="236" text-anchor="middle">M-4, then M-3</text>
<rect class="dg-box" x="10" y="274" width="240" height="46" rx="8"/><text class="dg-t" x="130" y="302" text-anchor="middle">Quality falls over time?</text>
<rect class="dg-box--accent" x="480" y="274" width="230" height="46" rx="8"/><text class="dg-t" x="595" y="302" text-anchor="middle">M-10, then M-7</text>
<rect class="dg-box--muted" x="10" y="340" width="700" height="46" rx="8"/><text class="dg-t" x="360" y="368" text-anchor="middle">None of these? Context may not be your binding constraint.</text>
<line class="dg-line dg-line--accent" x1="250" y1="33" x2="472" y2="33"/><polygon class="dg-head--accent" points="472,28 480,33 472,38"/><text class="dg-s" x="362" y="26" text-anchor="middle">yes</text>
<line class="dg-line dg-line--accent" x1="250" y1="99" x2="472" y2="99"/><polygon class="dg-head--accent" points="472,94 480,99 472,104"/><text class="dg-s" x="362" y="92" text-anchor="middle">yes</text>
<line class="dg-line dg-line--accent" x1="250" y1="165" x2="472" y2="165"/><polygon class="dg-head--accent" points="472,160 480,165 472,170"/><text class="dg-s" x="362" y="158" text-anchor="middle">yes</text>
<line class="dg-line dg-line--accent" x1="250" y1="231" x2="472" y2="231"/><polygon class="dg-head--accent" points="472,226 480,231 472,236"/><text class="dg-s" x="362" y="224" text-anchor="middle">yes</text>
<line class="dg-line dg-line--accent" x1="250" y1="297" x2="472" y2="297"/><polygon class="dg-head--accent" points="472,292 480,297 472,302"/><text class="dg-s" x="362" y="290" text-anchor="middle">yes</text>
<line class="dg-line" x1="130" y1="56" x2="130" y2="70"/><polygon class="dg-head" points="125,70 130,76 135,70"/>
<line class="dg-line" x1="130" y1="122" x2="130" y2="136"/><polygon class="dg-head" points="125,136 130,142 135,136"/>
<line class="dg-line" x1="130" y1="188" x2="130" y2="202"/><polygon class="dg-head" points="125,202 130,208 135,202"/>
<line class="dg-line" x1="130" y1="254" x2="130" y2="268"/><polygon class="dg-head" points="125,268 130,274 135,268"/>
<line class="dg-line" x1="130" y1="320" x2="130" y2="334"/><polygon class="dg-head" points="125,334 130,340 135,334"/>
<text class="dg-s" x="140" y="67">no</text><text class="dg-s" x="140" y="133">no</text><text class="dg-s" x="140" y="199">no</text><text class="dg-s" x="140" y="265">no</text><text class="dg-s" x="140" y="331">no</text>
</svg>
</div>
<figcaption>Check the cache first because a broken cache can make every other optimisation self-defeating. Check tools second because it is the biggest, cheapest, most reversible win.</figcaption>
</figure>

> [!key] Fix one constraint, measure, then route again
> Adopting five methods at once makes the effect impossible to attribute. It is the most common way teams end up unable to say whether any of it helped.

## Step 3: Classify the task type (5 minutes)

Different work has a different context shape. The same method can be right for one and wrong for another.

| Task type | Context shape | Methods that dominate | Avoid |
|---|---|---|---|
| Small bug fix (under 30 minutes) | Narrow, shallow | M-3, M-4 | M-8, M-9: overhead exceeds benefit |
| Large feature (hours) | Broad, deep, long | M-7, M-10, M-8, M-6 | Unstructured long sessions |
| Codebase-wide refactor | Broad, shallow, repetitive | M-4, M-9, M-5 | M-3 alone: it misses the long tail |
| Debugging or investigation | Narrow, deep, iterative | M-6, M-5, M-8 | M-9: judgment cannot be delegated |
| Code review or audit | Broad, read-only | M-9, M-4 | M-7: there is no evolving state |
| Greenfield build | Small repository, deep specification | M-7, M-10 | M-4: nothing to index yet |
| Dependency or migration work | Broad, mechanical, huge output | M-5, M-9 | Whole-file reads |

## Step 4: Compose the stack (10 minutes)

Methods layer. A reasonable default for serious coding work, ordered by when each acts:

```text title="default stack"
Prevention   M-5  output shaping ................ before context exists
Prefix       M-2  tool minimisation ............. per session, static
             M-1  prefix stability .............. a constraint on all the others
Selection    M-4  structural retrieval .......... what unit
             M-3  just-in-time .................. when
State        M-7  living plan document .......... survives every boundary
             M-6  reversible offload ............ before any compression
Compression  M-8  semantic-boundary compaction .. only after M-6
Topology     M-9  sub-agent isolation ........... only for composable work
Lifecycle    M-10 session discipline ............ the outer loop
```

Three ordering rules are not optional.

1. **Offload before compaction** (M-6 before M-8). Otherwise compression is irreversible.
2. **Externalised state before resets** (M-7 before M-10). A reset without a plan file is data loss.
3. **The cache constrains everything** (M-1). Check the cache impact of any method before adopting it.

## Step 5: The decision table

For the recurring calls, so you do not have to re-derive them at 2 a.m.

| Situation | Do | Not | Because |
|---|---|---|---|
| Context at 70%, task half done | Reset with a handoff | Compact and continue | Compaction is lossy *and* breaks the cache; a reset costs about 500 tokens |
| The agent called the same tool 3 times | Reset or redirect firmly | Rephrase the request | Distraction is a property of the context, not a misunderstanding |
| You need one function from a 2,000-line file | Read the symbol | Read the file | About 97% waste, plus new distractors |
| A 12K test log just arrived | Offload it and keep a digest | Leave it in | 12K tokens kept for 40 turns is 480K token-turns |
| You find a hallucinated fact in context | Reset to before it | Correct it inline | A correction appends; the wrong fact stays |
| A sub-task just finished | Compact now | Wait for the threshold | Boundaries are the only safe compaction points |
| Adding an MCP server "just in case" | Don't | Add it | Every unused tool is permanent prefix cost and confusion |
| 40 files need surveying | Delegate | Read them in the main thread | Surveys compose; this is the ideal delegation |
| 4 interlocking components need building | Build them in one thread | Delegate in parallel | Implicit decisions conflict [P] |
| The instruction file reached 300 lines | Apply the inference test | Add a "be concise" rule | Dilution is the problem; more text makes it worse |
| A requirement changed at turn 25 | Restate the full requirement | Append the change | Partial specs clash; a full restatement lets recency resolve it |

## Step 6: Set the review cadence

Context management regresses. Tool surfaces grow back, instruction files regrow, and output filters go stale as commands change. Put a **30-minute quarterly re-measurement** in the calendar and rerun Step 1. Teams that skip it find their prefix tax back at its original level within two quarters [P].

> [!try] Your next step
> If you have not measured yet, go to [Phase 0 of the optimisation plan](ch:optimisation-plan#phase-0-baseline). If you have, the routing table above names your first method.
