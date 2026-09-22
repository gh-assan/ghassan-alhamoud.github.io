## The ten on one page

These ten passed the four tests described below; the [benched list](#what-was-benched-and-why) records what failed and why.

<figure class="diagram">
<p class="diagram__title">Where each method acts, in the order it acts</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 380" role="img" aria-labelledby="m0-t">
<title id="m0-t">The ten methods arranged from prevention before context exists, through prefix, selection, state, compression and topology, to the session lifecycle.</title>
<rect class="dg-box--accent" x="10" y="10" width="700" height="44" rx="8"/>
<text class="dg-k" x="24" y="37">PREVENTION</text>
<text class="dg-t" x="160" y="37">M-5 Output shaping</text>
<text class="dg-s" x="700" y="37" text-anchor="end">before context exists</text>
<rect class="dg-box" x="10" y="62" width="700" height="44" rx="8"/>
<text class="dg-k" x="24" y="89">PREFIX</text>
<text class="dg-t" x="160" y="89">M-2 Tool minimisation · M-1 Prefix stability</text>
<text class="dg-s" x="700" y="89" text-anchor="end">per session, static</text>
<rect class="dg-box" x="10" y="114" width="700" height="44" rx="8"/>
<text class="dg-k" x="24" y="141">SELECTION</text>
<text class="dg-t" x="160" y="141">M-4 Structural retrieval · M-3 Just-in-time</text>
<text class="dg-s" x="700" y="141" text-anchor="end">what unit, and when</text>
<rect class="dg-box--info" x="10" y="166" width="700" height="44" rx="8"/>
<text class="dg-k" x="24" y="193">STATE</text>
<text class="dg-t" x="160" y="193">M-7 Living plan · M-6 Reversible offload</text>
<text class="dg-s" x="700" y="193" text-anchor="end">survives every boundary</text>
<rect class="dg-box" x="10" y="218" width="700" height="44" rx="8"/>
<text class="dg-k" x="24" y="245">COMPRESSION</text>
<text class="dg-t" x="160" y="245">M-8 Semantic-boundary compaction</text>
<text class="dg-s" x="700" y="245" text-anchor="end">only after offload</text>
<rect class="dg-box" x="10" y="270" width="700" height="44" rx="8"/>
<text class="dg-k" x="24" y="297">TOPOLOGY</text>
<text class="dg-t" x="160" y="297">M-9 Sub-agent isolation</text>
<text class="dg-s" x="700" y="297" text-anchor="end">only for composable work</text>
<rect class="dg-box--muted" x="10" y="322" width="700" height="44" rx="8"/>
<text class="dg-k" x="24" y="349">LIFECYCLE</text>
<text class="dg-t" x="160" y="349">M-10 Session discipline</text>
<text class="dg-s" x="700" y="349" text-anchor="end">the outer loop</text>
</svg>
</div>
<figcaption>The methods layer rather than compete. Three orderings are mandatory: offload (M-6) before compaction (M-8), externalised state (M-7) before resets (M-10), and every method checked against the cache (M-1).</figcaption>
</figure>

| Method | Core move | Acts on | Main loss |
|---|---|---|---|
| **M-1** Prefix stability | Keep the start of the prompt byte-identical; never edit it mid-session | Cache | Freshness |
| **M-2** Tool surface minimisation | Delete unused tools; load short descriptions, fetch schemas on demand | Dilution, confusion | A rarely used tool |
| **M-3** Just-in-time retrieval | Carry pointers; fetch content at the moment of need | Dilution | Starvation |
| **M-4** Structural retrieval | Follow the reference graph the compiler already knows | Dilution | Config blind spots |
| **M-5** Output shaping | The cheapest token is the one never generated | Dilution | Hiding a line you needed |
| **M-6** Reversible offload | Move it out, leave a self-describing stub | Information loss | Pointers never followed |
| **M-7** Externalised state | A short plan file with a **ruled-out** section | Clash, distraction | Drift |
| **M-8** Semantic-boundary compaction | Compact when a sub-goal closes, never on a timer or mid-debug | Information loss | Anything not in the schema |
| **M-9** Sub-agent isolation | Delegate only composable work, only with a written contract | Dilution | Contract loss; total spend |
| **M-10** Session lifecycle | Scope sessions, hand off deliberately, never compact twice | Position, poisoning | Tacit understanding |

## How the ten were chosen

Most "context engineering best practices" are restated blog posts. A method made this list only by passing **four tests**; candidates that failed any one were benched, and the [benched list](#what-was-benched-and-why) is part of the result.

| Test | Question |
|---|---|
| **T1 Mechanism** | Is there a stated reason, in terms of attention, position, cache or information loss, why it changes agent behaviour? "It works for me" is not a mechanism. |
| **T2 Evidence** | Is there at least one measured result: a paper, a controlled comparison, or a credible account with numbers? Testimonials alone are benched. |
| **T3 Independence** | Is it more than a special case of a method already on the list? Two variants of one idea count once. |
| **T4 Decidability** | Can a reader run a test *today*, on their own workload, to decide whether to use it — and remove it later if it fails? |

Every method below follows the same spine — how to do it, why it works, what it costs and loses, and a decision test — plus trouble signs and a worked example where one adds proof. The table above carries each method's claim.

## Before any method: measure

Measure your distribution first. In the composite budget used here, **the segment being optimised was not the large one**: the instruction file is 4% of the window, while 25% is definitions for tools never called [C].

The minimum measurement takes about an hour:

1. Fresh session, send `.`, record input tokens — your [[prefix tax]].
2. Dump tool schemas; count their tokens.
3. Bucket your three longest recent sessions by segment, with the [budget audit template](ch:templates#1-context-budget-audit).
4. List every tool defined and every tool actually called in those sessions.

You are looking for one thing: **the largest segment you control.** Choose methods against it. A team whose largest segment is tool definitions should read M-2 and stop; adopting all ten is itself an [antipattern](ch:antipatterns#ap-3-full-stack-adoption).

## M-1: Prefix stability

**How to do it.**

1. Split context into a *stable prefix* (system prompt, tool definitions, instruction files, skill descriptions) and a *growing body* (retrieval, tool results, messages).
2. Make the prefix deterministic: fixed tool order; no timestamps, session IDs or dynamically assembled rules.
3. Make context changes **append-only** wherever possible.
4. Batch all prefix edits (instruction files, tool configuration) to session boundaries.
5. Track [[prefix caching|cache]] hit rate, and treat a drop like a production incident.

**Why it works.** The cache reuses the computed state of an unchanged prefix, up to the first changed byte, turning the largest repeated part of the prompt from a per-call cost into a one-time cost. Reported: **85.2% hit rate with about 46,059 tokens reused per request** [P]; at 90%, time to first token typically drops from seconds to under 200 ms and compute cost falls 80–90% [P].

The less obvious half: this **inverts the cost ranking of context operations**. Deleting tokens *from the prefix* costs money, because it invalidates everything after it for the rest of the session.

**Costs and losses.** Almost no tokens, but real discipline: dynamic tool selection, per-turn memory rewriting and injected timestamps all break the prefix, which is why this method is usually broken by accident. The loss is freshness — a stable prefix is stale by construction — so put volatile facts in the *body* (a user turn or tool result), where recency weights them more anyway.

**Trouble signs.** Hit rate under about 50% on multi-turn sessions — that is an incident. The decision test below fires earlier, at 60%. Cost per turn rising faster than token count. Latency that never improves as a conversation "warms up".

> [!example] Worked example: the dynamic tool trap [C]
> A team adds "dynamic tool loading", cutting definitions from 38K to 9K tokens — 24% fewer per call. But the tool block sits about 10K tokens into the prompt and changes every turn, so everything after it misses the cache. At generic prices (cached read 0.10, new-token write 1.25, per 1K tokens), the per-turn bill moves from `117.5 × 0.10 + 2.5 × 1.25 ≈ 14.9` units to `10 × 0.10 + 81 × 1.25 ≈ 102.3` — **a 6.9× cost increase from a 24% token cut.** The team reverts to a static, hand-pruned 14-tool surface, and both bills go down.

```chart
{
  "type": "hbar",
  "title": "Cost per turn: fewer tokens, far higher bill",
  "categories": ["Static 38K tool block (120K context)", "Dynamic 9K tool block (91K context)"],
  "series": [{"name": "Relative cost per turn", "values": [14.9, 102.3]}],
  "valueFormat": "{v}",
  "highlight": [1],
  "labelWidth": 250,
  "categoryLabel": "Configuration",
  "caption": "Static pruning beats dynamic selection, mostly for cache reasons; the numbers are in the worked example and the data table [C].",
  "alt": "Static: 14.9 units per turn. Dynamic: 102.3 units per turn."
}
```

> [!try] Decision test
> Run one representative session and record the cache hit rate. If it is below 60%, M-1 is your highest-value method and everything else can wait.

## M-2: Tool surface minimisation

**How to do it.**

1. List every tool in scope and count its schema tokens.
2. Count how often each tool was called in your last 20 sessions.
3. Treat zero-call tools as deletion candidates after a representative sample; verify task coverage and keep rollback.
4. For what remains, prefer, in order: **built-in tools** over MCP equivalents (the shell already has `grep`, `find`, `curl`); **one general tool** over five narrow ones; **deferred definitions** (short descriptions upfront, schemas on demand); and **code execution** against an API instead of tool schemas at all.
5. Scope tools per sub-agent or per task type where the harness allows.
6. Set a hard budget, for example 20 active tools and 15K definition tokens, and enforce it in review.

**Why it works.** Tools hurt through two separate channels, and mixing them up leads to the wrong fix.

- **Displacement.** Definition tokens are prefix tokens and crowd out work. One popular MCP server measures about **42,000 tokens** of definitions [P].
- **Selection confusion.** More candidates means worse choices, independent of tokens. Accuracy fell **from 43% to under 14%** as tool count grew [S]; **19 of 20 at 20 tools became complete failure at 107** [S].

[[Progressive disclosure]] fixes displacement; code execution fixes both, with the agent writing code against a documented API instead of choosing among schemas. Reported, and vendor-reported means best case: **25,000 tokens of definitions became about 2,500 tokens of descriptions** [P], and **150,000 → about 2,000 tokens, a 98.7% reduction** [P].

**Costs and losses.** A one-time effort, then governance: surfaces grow back because adding an MCP server is one click and its cost invisible; without a recurring audit this regresses within a quarter [P]. The risk is dropping a tool the agent needed rarely but decisively — a representative zero-call sample plus task-coverage verification guards against it, and removal is reversible. Over-deferral also adds a round trip before each tool's first use.

**Trouble signs.** Definitions over 20% of the prefix. More than three tools defined for each tool used. The agent choosing an applicable but wrong tool. The agent *talking about* a capability it never calls.

> [!example] Worked example: four servers, nine tools used [C]
> Four MCP servers — GitHub (42K), database (11K), browser (9K), filesystem (4K) — put 66K of definitions, 33% of a 200K window, before any work. Over 20 sessions, 9 of the 61 defined tools were called — seven from GitHub (six duplicating the `gh` command) and two filesystem calls that duplicated `cat`. The team deletes the three never-called or duplicated servers and switches GitHub to deferred definitions: **about 2,500 prefix tokens. Recovered: 63,500 tokens, 32% of the window.** Task success is unchanged over the next 20 sessions; median session cost falls 34%.

> [!try] Decision test
> Count definition tokens and the defined-to-called ratio. If definitions exceed 15K tokens or the ratio exceeds 3:1, M-2 is a strong candidate; verify that the unused surface is your largest controllable segment before changing it.

Details, including the audit procedure, are in [chapter 8](ch:tool-surface).

## M-3: Just-in-time retrieval

**How to do it.**

1. Pre-load nothing by default. The session opens with the task and the repository, not a briefing document.
2. Give the agent tools that return *locations*, not content: `ls`, `glob`, `grep -l`, a symbol index.
3. Give it tools that fetch one location at a time: read a range, read a symbol.
4. Encourage narrowing: **locate, then inspect, then read.** Three cheap steps beat one expensive one.
5. When information stops being needed, let it fall out or offload it (M-6).

**Why it works.** [[Just-in-time retrieval]] keeps [[relevance density]] high: pre-loading maximises recall and pays for it in precision; carrying pointers until the moment of need keeps density high at the cost of a few small round trips. It is especially strong for code:

| Property of code | Consequence for retrieval |
|---|---|
| The filesystem is always current | An index can be stale; `cat` cannot |
| Paths and names carry relevance for free | `src/auth/session.ts` says a lot in five tokens |
| Needs are discovered by looking | The agent often cannot say what to pre-load |

The evidence: focused ~300-token prompts beat ~113K-token prompts holding the same answer-bearing material, on LongMemEval [S]; 5K of targeted retrieval beat a 100K codebase summary [P]; full-context approaches used **2.68×** the tokens of the best managed method *and completed fewer tasks* [S].

**Costs and losses.** More turns and latency; on a small repository pre-loading may genuinely be cheaper. Just-in-time wins once the repository exceeds a few windows' worth [D]. The loss is [[starvation]], the most dangerous failure in this research because it is silent: the agent never looks at the file that governs the behaviour and produces a confidently wrong change from a clean-looking transcript. That is why read-coverage audits are mandatory alongside this method.

> [!example] Worked example: "the checkout flow times out under load" [C]
> **Pre-load:** an architecture document (18K), the checkout module (22K), the payment client (9K) and recent related PRs (14K): 63K tokens before the first thought, at perhaps 4% density. The well-written architecture document is an unusually effective distractor.
>
> **Just-in-time:** `grep -rl "checkout"` returns 14 paths (200 tokens). A second grep for `timeout|deadline` in those finds 6 hits (400). Two symbol bodies (1.8K) and the pool config (600). **About 3K tokens at about 40% density.**
>
> The honest trade: if the cause lives in a file that never mentions "checkout" or "timeout", say a middleware holding a lock, just-in-time misses it. The fix is not pre-loading. It is a second search along a different axis, such as the import graph or recent commits: that is M-4.

> [!try] Decision test
> Take your last three failed tasks. Was the decisive information (a) in context and ignored, or (b) never retrieved? Mostly (a): adopt M-3 aggressively. Mostly (b): fix retrieval quality (M-4) *before* reducing volume.

## M-4: Structural retrieval

**How to do it.**

1. Expose structure-aware operations: find a symbol, find its references, outline a file, list imports.
2. Read symbol bodies by default, not files.
3. Expand along the reference graph: found the function, now read *its callers*, not its neighbours in the file.
4. Optionally keep a compact repository map, a per-file outline of top-level symbols. A 10,000-file repository maps to a few thousand tokens.
5. Keep grep as the complement, not the competitor.

**Why it works.** [[Structural retrieval]] — by symbols, references, imports and the call graph, not whole files or embedding similarity — works because a file is a *storage* unit while a symbol is a *meaning* unit. Reading files to answer symbol questions wastes, by construction, the part of the file you did not need, typically over 90% [D].

More importantly, code has **exact relevance edges that prose lacks** — A calls B, C implements I, `test_T` tests T — and a language server computes them precisely and keeps them current. Using embeddings to guess at "related code" pays for a worse version of something you already own.

The evidence, stated carefully because it is often misreported: a 2026 study compared grep with vector retrieval across four harnesses on 116 LongMemEval-derived questions. **Grep generally won**, and **the harness mattered more than the retrieval strategy**, on identical data [S]. The discount: the questions are conversational-memory shaped, not repository shaped — the harness finding transfers more confidently than the ranking. A hybrid of semantic search and grep has been reported **12.5% more accurate** than either alone [P]. The synthesis: *exact beats approximate when exact is available; approximate helps when you do not know the name of what you are looking for.*

**Costs and losses.** Minutes to hours of setup for a language-server toolkit, and a running process. Token cost is *negative*. It adds five to eight tools to your budget, which is usually a good trade. The loss is structural blindness: configuration values, environment variables, string-keyed dispatch, database schemas, CI files and feature flags are not in the symbol graph. **Always keep grep.**

> [!example] Worked example: rename `UserSession` to `AuthSession` in a 240K-line monorepo [C]
> **Grep:** 180 hits, including comments, strings, a similarly named `UserSessionStore` and two unrelated packages. The agent reads about 40 files (~90K tokens) and makes three wrong edits.
>
> **Structural:** one declaration, then 47 exact references with file and line. **About 6K tokens, zero false positives**, and `UserSessionStore` correctly untouched because it is a different symbol. Fifteen times fewer tokens and better correctness, because the compiler already knew the answer.

> [!try] Decision test
> Sample 20 recent file reads. For each, what fraction of the file was relevant? If the median is under 20%, M-4 pays immediately. If your stack has poor language-server support or your bugs mostly live in config, deprioritise it.

The retrieval architecture this fits into, including when embeddings still earn their place, is [chapter 5](ch:retrieval)'s subject.

## M-5: Output shaping

**How to do it.**

1. Rank commands by token volume across recent sessions. Usually three to five commands make up over 70% of tool output [D].
2. For each, apply in order: **quieter flags** (`npm ci --silent`, `pytest -q`, `git diff --stat`); **filtering** (`tail`, `grep -v`, `jq`); **redirection** (full output to a file, path plus a short preview into context); **wrapping** (a small script that returns a structured digest).
3. Cap output with **head-and-tail truncation, never middle truncation**. The ends carry the command and the error.
4. Add ignore files so lockfiles, `dist/`, `node_modules/`, snapshots and fixtures never enter through globs or diffs.
5. Make the digest task-aware: a failing test run keeps the trace; a passing one needs one line.

**Why it works.** Pure density gain with **no information loss when done right**, because the discarded text contained nothing: "200 passed in 14.2s" is complete; the 4,000 tokens of dots were noise. Reported: **60–90% reduction** on common dev commands [P] and **98%** by isolating large outputs in an indexed sandbox [P]. Since input is 99.75–99.87% of agent token usage [S] and tool results are the largest input, this is where the money is.

**Costs and losses.** An afternoon of scripting for the top five commands; near zero afterwards. The real cost is over-filtering — hiding the warning that mattered, like the peer-dependency warning that explains a bug three hours later. The mitigation that works: **never delete, always redirect.** Full output to a file, digest to context, path included: an irreversible loss becomes a reversible one for about 15 tokens.

**Trouble signs.** The agent re-running a command with different verbosity flags to see more. That signal is clean and worth counting: a rise means you cut too deep.

> [!example] Worked example: before and after, one session [C]
> | Command | Before | After |
> |---|---|---|
> | `npm ci` | 14K | ~200 — `--silent`, `tail -5`; full log in `/tmp/npm-ci.log` |
> | `npm test` | 9K | ~150 passing, ~1.5K failing — `pytest -q --tb=short` |
> | `git diff` | 6K | ~400 — `--stat` first, full diff on request |
> | `docker build` | 11K | ~150 — `--quiet`; full log in a file |
> | **Total** | **40K** | **~1K–2.5K: a 94–97% reduction, every full log one `cat` away** |

> [!try] Decision test
> Rank your commands by token volume. If the top three exceed 25% of session tokens, M-5 pays for itself in one afternoon and carries the lowest risk of any method here.

## M-6: Reversible offload

**How to do it.**

1. Send large tool outputs to files. Return the path, the size and a short head-and-tail preview.
2. Give every offloaded item a stable identifier: a path, a content hash, or an ID in a manifest.
3. Expose a recall operation: read by ID, read a range, search inside the store.
4. At compaction, replace old observations with **citation stubs** (ID, one-line description, preview) instead of a paraphrase.
5. Keep a small manifest of what exists and where.

**Why it works.** Never discard what you can relocate: offload converts irreversible loss into reversible loss, decoupling *what is in the window* from *what is available*. The measured result is unusually clean: [[addressable recall]] compaction — deterministic, no model call, content-addressed, with `recall <id>` — against five baselines including sliding window, LLM summary, structured state and RAG [S].

```chart
{
  "type": "hbar",
  "title": "Addressable recall versus the best lossy baseline",
  "categories": ["Needle tasks, 8B", "Needle tasks, 32B", "LongBench-v2 Hard, 8B", "LongBench-v2 Hard, 32B"],
  "series": [
    {"name": "Addressable recall", "values": [99.0, 99.8, 27.47, 32.47]},
    {"name": "Best baseline", "values": [79.57, 96.67, 25.83, 30.87]}
  ],
  "max": 100,
  "valueFormat": "{v}%",
  "labelWidth": 170,
  "categoryLabel": "Benchmark",
  "caption": "A huge gain on retrieval (+19.43 points on 8B) and a modest one on hard reasoning (+1.6). Offload fixes access to information, not thinking. Claiming more would overstate it [S].",
  "alt": "Needle 8B: 99.0% vs 79.57%. Needle 32B: 99.8% vs 96.67%. LongBench-v2 Hard 8B: 27.47% vs 25.83%. 32B: 32.47% vs 30.87%."
}
```

It also saved 38.8–80.3% of memory bandwidth versus a sliding window [S]. The mechanism is not sophistication: nothing was thrown away.

**Costs and losses.** Stubs are 20–60 tokens each, plus one round trip when recall is needed. Two failure modes: the manifest can grow until it becomes the problem, one level down; and the agent may never recall something it cannot recognise as relevant — **a pointer the agent will not follow is equivalent to deletion.** A stub must carry enough to make the recall decision, and nothing more:

| Stub | Can the agent decide? |
|---|---|
| `log_a3f9.txt (14KB)` | No — nearly useless |
| `log_a3f9.txt (14KB) — npm ci output, 2 peer-dep warnings, exit 0` | Yes — actionable |

> [!example] Worked example: a flaky test over 60 turns [C]
> Twelve test runs at about 8K tokens each would be 96K tokens if kept. With offload, each run writes `runs/test-<n>.log` and context receives a stub such as `runs/test-7.log (8.2KB) — 1 failure: test_checkout_retry, AssertionError line 214, 3 warnings`. Twelve stubs are about 500 tokens; the agent recalls two in full when comparing failures. **Peak cost: about 17K instead of 96K**, with all twelve logs available. The agent can still answer "did run 4 have the same warning as run 9?", a question lossy summarisation would have destroyed.

> [!try] Decision test
> After your next compaction, count how often the agent re-fetches something it already had in the following ten turns. More than twice means you are losing recoverable information, and M-6 is a better fix than tuning the summariser.

The full offload architecture, including where offloaded files should live, is [chapter 6](ch:compaction-and-memory)'s subject.

## M-7: Externalised state, the living plan

**How to do it.**

1. At the start of a task, have the agent write a plan file: goal, constraints, approach, open questions, done and not done.
2. **Rewrite it in place** at each meaningful checkpoint. It is a state document, not a log.
3. Include a **ruled-out** section: the most valuable and most often omitted part.
4. Re-read it after every compaction, reset or sub-agent return.
5. Keep it to 30–80 lines. Longer means the task needed splitting.

**Why it works.** It attacks [[clash]] and [[distraction]] at once by treating the plan file, not the transcript, as the state. The transcript is an append-only log of everything that happened, including everything wrong, and the model resolves its contradictions by recency. A plan file is a *mutable* statement of what is currently true: the wrong thing is gone, not outvoted. It lives on disk, so it **survives compaction and resets intact** — the only structure in this research that gives *deliberate* control over what crosses a context boundary. And the ruled-out section counters the most expensive repeated behaviour in agent sessions: trying a failed approach again.

**Costs and losses.** 300–800 tokens resident, plus a few hundred per rewrite. Read it as a body message, not injected into the prefix, so it stays cache-safe. The loss is drift: a document that stops matching reality is a confidently wrong source, worse than having none. Update at *state changes*, not on a timer, and include a "last updated at turn N" line so staleness is visible.

> [!example] Worked example: a four-hour auth refactor with three compactions [C]
> **Without a plan file:** after compaction 1, the summary keeps "working on auth refactor" but drops "we decided against the middleware approach because it breaks the WebSocket path". At turn 71 the agent proposes the middleware approach again. The user re-explains. About 20 turns wasted, and that cost appears in no metric.
>
> **With one:** `PLAN.md` says, under *Ruled out*: `middleware interception — breaks WS upgrade path (see ws/upgrade.ts:88)`. After compaction it is re-read, 400 tokens, and the approach is never proposed again.

> [!try] Decision test
> Review your last long session. After a compaction or reset, did the agent re-derive a conclusion or re-propose a rejected approach? If it happened even once, M-7 pays. For any task over an hour it is close to free.

The [plan-file template](ch:templates#3-plan-file) is ready to copy.

## M-8: Semantic-boundary compaction

**How to do it.**

1. Define close boundaries for your work, and the conditions that suppress compaction:

| Compact when a boundary closes | Suppress when |
|---|---|
| A test passes | Mid-derivation |
| A plan item completes | Mid-edit |
| A hypothesis is confirmed or ruled out | Stuck |
| An edit is verified | Just after an error |

2. Compact only at boundaries, unless a hard ceiling forces it.
3. Compact with an explicit schema, not "summarise the above": goal and state; decisions with reasons; ruled-out approaches with reasons; **exact strings** (errors, versions, paths, line numbers); open questions; and what was verified and how.
4. **Offload first** (M-6), so anything dropped is recoverable.
5. Re-read the plan file (M-7) immediately afterwards.

**Why it works.** **Threshold** compaction waits until the context is already full of stale and wrong tokens that have been degrading output for many steps; **periodic** compaction discards indiscriminately and often fires mid-task. Both naive triggers fail, in opposite directions [S]. [[Semantic triggering]] fires when information is genuinely finished: the 2026 self-compaction work gates on closed reasoning units and preserves verified facts that fixed-interval compaction destroys [S].

**Why the quality of compaction deserves this attention.** Holding the agent fixed and changing *only the summariser* moved SWE-bench from **49.0% to 55.5%** [S]. Compaction-aware training added **+5.5 and +7.0** on SWE-bench Verified and **+6.8 and +3.1** on Terminal-Bench 2.0 [S]. And the damage is mostly variance: on AppWorld, no compression scored **85.7% / 77.4% Pass²**, prompt-based compaction **71.4% / 59.5%**, FIFO **63.7% / 53.0%** [S].

> [!warning] The first step after a compaction is the most dangerous step in the session
> It carries **+0.108** extra blocked or error actions [S]. Put the plan-file re-read exactly there.

**Costs and losses.** A blocking model call per compaction, sometimes tens of seconds [S], plus a full cache invalidation — often the bigger cost, and almost never counted. See [chapter 10](ch:metrics-and-economics#belief-2-compaction-saves-money). The loss is anything not in the schema. Compaction is the most lossy operation here and the only one that can *invent*: a paraphrase can assert what the transcript only hypothesised. That is [[laundering]]. Mitigate it with a "verified how" field, verbatim exact strings, and offload.

> [!example] Worked example: bisecting a flaky test [C]
> **Threshold compaction** fires at 85% full, midway through the bisect. Summary: "investigating a flaky test in the checkout suite; several runs performed." Lost: which four commits were already bisected. The agent restarts. **Ten turns and ~25K tokens wasted**, with no sign anything went wrong.
>
> **Semantic compaction** fires right after the bisect isolates commit `a3f9c1`. Summary: "Bisected checkout flake to `a3f9c1` (PR #4412, adds connection pooling). Verified by 20 runs at `a3f9c1^` (0 failures) and `a3f9c1` (7/20 failures). Ruled out: test ordering (still fails with `-p no:randomly`), CI environment (reproduces locally). Next: read the `db/pool.ts` diff in `a3f9c1`." Same token cost; the whole result survives.

> [!try] Decision test
> Look at your last five compactions. If more than one fired mid-sub-goal — mid-derivation, mid-edit, just after an error — fix the trigger. If the triggers are clean but the agent re-fetches information it held before a compaction, the schema is dropping load-bearing strings; compare what the summaries kept against the schema list above.

The full compaction schema, field by field, is [chapter 6](ch:compaction-and-memory)'s subject.

## M-9: Sub-agent isolation with a contract

**How to do it.**

1. Identify isolatable work and delegate it to a [[sub-agent]] with a fresh context, a narrow tool set and a written contract. Keep the rest in the main thread:

| Delegate: bounded, verifiable, small result from a large amount of reading | Keep in the main thread |
|---|---|
| Search, surveys, log analysis, test triage, dependency audits | Work that needs shared judgment or interlocking decisions |

2. Write the contract *before* delegating: inputs, scope, tools, **output schema**, size cap.
3. Give the sub-agent only the tools it needs, and take back a **structured result**, not a transcript: a ranked list of `file:line` entries with one-line reasons.

**Why it works.** Isolation converts a large intermediate context into a small result. A search that reads 40 files (60K tokens) to conclude "the retry logic is in `client/retry.ts:88`" returns 20 tokens to the parent. Reported: about **9K total tokens** for a multi-domain query with isolated sub-agents versus **15K** with an accumulating pattern [P]. A parallel research system beat a single agent by **90.2%** on an internal research eval [P].

**The other half, which most write-ups omit.** That same system used about **15× the tokens of a chat interaction**, and **token usage alone explained about 80% of the performance difference** [P]. The gain is real, and it is bought.

**Costs and losses.** The most of any method here. Each sub-agent pays its own prefix tax. **Sub-agents shrink the parent's context at the expense of total spend.** If your constraint is cost, this is often wrong. If it is the parent's attention, it is often right. The loss is [[contract loss]]: the sub-agent saw something decisive and did not report it because the contract did not ask. Add a "notable observations outside scope" field; it is cheap and recovers a surprising amount.

> [!try] Decision test
> Write the sub-agent's output schema *before* delegating. If it does not fit in 20 lines, the work is not isolatable. Do it in the main thread. This test alone prevents most multi-agent disasters.

The full treatment, including the public disagreement between two well-known teams, is in [chapter 7](ch:sub-agents).

## M-10: Session lifecycle

**How to do it.**

1. **One session, one coherent task.** New task, new session.
2. **Open well.** The first message is the highest-leverage 200 tokens you will write: goal, constraints, relevant paths, definition of done, and what *not* to do.
3. **Checkpoint at boundaries.** Commit, and update the plan file.
4. **[[Reset]] instead of arguing.** When the context is poisoned or the agent loops, start fresh from the plan file.
5. **Hand off explicitly.** End long sessions with a [handoff note](ch:templates#5-session-handoff).
6. **Decide your reset triggers in advance:** a second compaction is needed; the agent repeats the same action three times; you find a poisoned fact; the task pivots; the window is over 70% full with a lot left to do.

**Why it works.** A reset restores the premium position of the prefix, removes every accumulated distractor at once, and is the **only** way to remove poisoned content from an append-only transcript. A good opener replaces exploratory retrieval — the most expensive thing an agent does — with directed retrieval.

The economics are stark: **a reset costs one plan-file read (about 500 tokens) and buys back everything.** Continuing a degraded session pays full context on every turn *and* succeeds less often. The instinct to keep a long session alive is a sunk-cost error.

**Costs and losses.** Tacit understanding: which approaches feel promising, the codebase's idioms, what the user really meant. Not all of it fits in a plan file. That is the honest argument against resetting aggressively. A better handoff note reduces the loss; the rest is the price.

> [!example] Worked example: a six-hour feature [C]
> **Undisciplined:** one session, four automatic compactions. By hour four the agent contradicts decisions from hour one and re-proposes rejected designs. Every turn carries a near-full window.
>
> **Disciplined:** four sessions of about 90 minutes, each opened with the plan file plus a two-line focus, each closed with a commit and a plan update. Zero compactions. The window never passes about 40% full. Quality is constant, because **every session runs the model in its best regime.**

> [!try] Decision test
> Take your quality measure from [chapter 9](ch:evaluation) and plot it against elapsed session time for your last ten sessions. If quality falls after some duration, that duration is your session cap. Enforce it mechanically.

## What was benched, and why

The popular advice that did not make the list. This table is a result, not an omission.

| Candidate | Why it is popular | Test failed | Verdict |
|---|---|---|---|
| **"Use a bigger context window"** | Trivially available | T1: no mechanism by which more capacity improves attention; the evidence runs the other way | Not a method. Capacity relieves fitting pressure only |
| **Embedding-based code search as the primary retriever** | Familiar from document search | T2: grep generally beat vector retrieval head-to-head [S]; index staleness is a running cost | A complement (hybrid +12.5% [P]), not the primary. Folded into M-4 |
| **Automatic memory extraction ("remember everything")** | Compelling demos | T4: no test tells you whether a memory helped | Bench until you can measure recall value |
| **"Be concise" instructions** | One line, feels free | T2: no measured effect on total context | Marginal. The real fix is M-5 |
| **Per-turn dynamic tool selection** | Obviously right | T1/T2: cache-hostile, often net-negative | Bench unless you can prove the cache economics |
| **Multi-agent by default** | Impressive architecture | T4: no test separates decomposable from non-decomposable work without M-9's contract | Folded into M-9 with a decision rule |
| **Knowledge-graph project memory** | Intellectually attractive | T2: no coding-specific measured result; high upkeep | Watch. Promising across repositories, unproven here |
| **Middle truncation of long output** | Simple to build | T1: removes the region where errors usually are | Strictly dominated by head-and-tail |
| **Priming with a codebase overview** | Feels like onboarding | T2: the 5K-versus-100K result and the coherent-text finding (chapter 1) both point against it | A small pointer seed survives as an M-3 setting |
| **"Focus" reminders sprinkled through a session** | Cheap, feels responsive | T3: a weaker version of M-7 | Use M-7 |

Two of these, bigger windows and default multi-agent, absorb a disproportionate share of the field's attention and money.
