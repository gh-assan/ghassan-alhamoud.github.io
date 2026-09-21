## Three things people confuse

Three different mechanisms all get called "memory". Mixing them up leads to bad architecture.

| | **[[Compaction]]** | **[[Offload]]** | **[[Memory]]** |
|---|---|---|---|
| Scope | Within one session | Within one session | Across sessions |
| Operation | Compress | Relocate | Persist |
| Reversible | **No** | **Yes** | Yes |
| Triggered by | Token pressure or a boundary | A size threshold | An explicit write |
| Typical failure | Loses the decisive detail | The pointer is never followed | Stale, or never read |
| Cost | A model call plus a full cache invalidation | Close to zero | People's time to maintain |

> [!key] The rule that governs this chapter
> **Offload before you compact, and persist only what you would otherwise have to re-derive.** Most teams do the reverse: they compact aggressively, offload nothing and persist everything.

## What the 2026 research actually established

Several independent research efforts converged in 2026. Together they should change how you configure compaction today.

### Result 1: The summariser alone is worth several points

Holding the agent completely fixed and changing **only the summarising model**, SWE-bench accuracy moved from **49.0% to 55.5%**, a 6.5-point swing [S].

This is the most decision-relevant number in the chapter. Compaction is not plumbing that either works or does not. It is a component with a quality dimension comparable to a model upgrade. **A team that has never read its compaction prompt is leaving several points on the table.**

Training on compacted trajectories adds more: **+5.5 and +7.0 points** on SWE-bench Verified (two model sizes) and **+6.8 and +3.1** on Terminal-Bench 2.0 [S]. Most teams cannot train, but the direction is clear: handling compaction is a skill that can be improved.

### Result 2: Compression damages reliability before accuracy

This finding changes practice the most, and almost nobody has absorbed it.

The TRACE study compared compression strategies on AppWorld, a 147-task benchmark of stateful API use. It measured both single-run accuracy and **[[Pass^k|Pass²]]**: solved on *both* of two independent runs [S].

```chart
{
  "type": "hbar",
  "title": "AppWorld: accuracy versus Pass² by compression strategy",
  "categories": ["No compression", "Verifier-guided (TRACE)", "Prompt-based compaction", "FIFO truncation"],
  "series": [
    {"name": "Single-run accuracy", "values": [85.7, 77.1, 71.4, 63.7]},
    {"name": "Pass² (solved on both runs)", "values": [77.4, 67.3, 59.5, 53.0]}
  ],
  "max": 100,
  "valueFormat": "{v}%",
  "labelWidth": 180,
  "categoryLabel": "Strategy",
  "caption": "As compression tightens, the gap between \"solved once\" and \"solved reliably\" widens. Compressed agents are not uniformly worse; they are intermittent [S].",
  "alt": "No compression: 85.7% accuracy, 77.4% Pass². Verifier-guided: 77.1%, 67.3%. Prompt-based: 71.4%, 59.5%. FIFO: 63.7%, 53.0%."
}
```

The paper's own conclusion is the practical takeaway: *compression quality is better reflected by multi-run stability than by single-run performance* [S].

> [!warning] Why this matters more than the accuracy column
> A team evaluating compaction with one run per task on a 30-task suite sees a small difference, concludes compaction is nearly free, and ships it. Production then shows exactly the complaint users make most: "it worked yesterday". The variance was always there. The measurement could not see it. [Chapter 9](ch:evaluation#pass-k-worked) makes Pass^k mandatory for this reason.

### Result 3: Compaction breaks "where am I?", and the next step is the worst

Three measured effects [S]:

- **Correct termination fell to 44.6%** with summary replacement, against **77.2%** for FIFO truncation, at a 2K budget. The agent loses the ability to recognise that it is done.
- **+0.108 extra blocked or error actions** at the *first step after compaction*.
- **Regressive exploration**: agents re-fetch and replay to recover what the summary dropped.

The mechanism: summaries preserve *what happened* much better than *where we are*. A fluent narrative leaves the agent unsure whether the current sub-goal is open or closed.

Two design consequences follow.

1. **The summary must carry explicit state**, not narrative: a done, in-progress, not-started list, not "we have been working on X".
2. **Re-read the plan file immediately after compaction.** The most dangerous step in the session is the one you can protect most cheaply.

### Result 4: Lossless addressable compaction beats every lossy baseline

[[Addressable recall]] compaction is deterministic, uses no model call, and is content-addressed. Old observations become citation stubs (an ID plus a head-and-tail preview), and the agent calls `recall <id>` when it needs one. It was compared against five baselines: full context, sliding window, LLM summary, structured state and RAG memory [S].

| Benchmark | Addressable recall (8B / 32B) | Best baseline | Margin |
|---|---|---|---|
| Needle-in-haystack, 1,000 tasks | **99.00% / 99.80%** | 79.57% / 96.67% (RAG) | +19.43 / +3.13 points |
| LongBench-v2 Hard, 311 tasks | **27.47% / 32.47%** | 25.83% / 30.87% | +1.64 / +1.60 points |

It also saved 38.8–80.3% of memory bandwidth against a sliding window [S]. The paper states it bluntly: omitted or paraphrased details *cannot be recovered* from a summary.

Read the two rows honestly. The margin is **huge on retrieval** and **modest on hard reasoning**. Addressability fixes *access* to information; it does not make the model reason better with it.

### Result 5: Simple masking is competitive with summarisation

An independent comparison found that **observation [[masking]] achieves solve rates comparable to LLM summarisation** on SWE-bench across two model sizes, at substantially lower cost, because it needs no extra model call [S]. Its recommendation: try simple methods before building summarisation infrastructure.

Combined with Result 4, the order is clear, and it is the opposite of what most teams build:

> [!key] Masking and addressable stubs first
> Use LLM summarisation only for what genuinely needs prose, and only after offloading.

### Result 6: Semantic triggering beats both naive triggers

Both simple triggers fail, in opposite directions [S].

- **Threshold (reactive)**: fire at X% full. It waits until the context is already full of stale and wrong tokens that have been degrading output for many steps. You compact after the damage.
- **Periodic**: fire every N turns. It discards indiscriminately and often fires mid-task, erasing information still in use.

The self-compaction work gates on **closed reasoning units**: fire when a sub-task resolves or the trajectory converges; hold off mid-derivation or when stuck. That preserves verified facts that fixed-interval compaction destroys [S]. See [[semantic triggering]].

The same literature adds three operational notes [S]. Summarisation is a **blocking call that can stall the agent for tens of seconds**. Prompt instructions about summary length are largely ignored. And what the summary keeps **varies substantially from run to run**, which is a direct cause of Result 2.

## The compaction design space

Six decisions. The recommendations follow from the results above.

### Decision 1: the trigger

| Option | Behaviour | Verdict |
|---|---|---|
| Threshold | Fire at X% full | A backstop, not a policy [S] |
| Periodic | Every N turns | **The worst option**: fires mid-task [S] |
| Semantic | When a sub-goal closes | **The best** [S] |
| Model-decided | The agent calls a compaction tool under a rubric | Best where supported; needs an explicit rubric [S] |
| Human-triggered | You compact at boundaries | Excellent when a person is present |

**Recommendation:** semantic triggering as the policy, with a threshold backstop set *high* (85–90%) so it only fires when the policy failed. If you cannot change your harness's automatic trigger, **compact manually at boundaries so the automatic one never fires.**

### Decision 2: what gets compressed

| Option | Reversible | Cost | Verdict |
|---|---|---|---|
| FIFO truncation | No | Free | Worst accuracy, yet it preserved *state recognition* better than summarisation (77.2% versus 44.6%) [S] |
| Observation masking | If kept | Free | **A strong default**: comparable to summarisation at lower cost [S] |
| Citation stubs | **Yes** | Almost free | **Best** where you can build it [S] |
| LLM summary | No | Model call and latency | Use sparingly, for reasoning traces |
| Structured state extraction | Partly | Model call | Good for the state block specifically |

<figure class="diagram">
<p class="diagram__title">A layered compaction policy</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 230" role="img" aria-labelledby="c2-t">
<title id="c2-t">Tool observations become reversible stubs, reasoning is summarised into a schema, the plan lives in a file and is never compressed, and exact strings are kept verbatim.</title>
<rect class="dg-box" x="10" y="10" width="300" height="46" rx="8"/><text class="dg-t" x="24" y="38">Old tool observations</text>
<rect class="dg-box--info" x="400" y="10" width="310" height="46" rx="8"/><text class="dg-t" x="414" y="38">Citation stub · reversible</text>
<rect class="dg-box" x="10" y="66" width="300" height="46" rx="8"/><text class="dg-t" x="24" y="94">Old reasoning and messages</text>
<rect class="dg-box--warn" x="400" y="66" width="310" height="46" rx="8"/><text class="dg-t" x="414" y="94">LLM summary into a fixed schema</text>
<rect class="dg-box" x="10" y="122" width="300" height="46" rx="8"/><text class="dg-t" x="24" y="150">Plan and decisions</text>
<rect class="dg-box--accent" x="400" y="122" width="310" height="46" rx="8"/><text class="dg-t" x="414" y="150">Never compressed · lives in PLAN.md</text>
<rect class="dg-box" x="10" y="178" width="300" height="46" rx="8"/><text class="dg-t" x="24" y="206">Errors, versions, paths, line numbers</text>
<rect class="dg-box--accent" x="400" y="178" width="310" height="46" rx="8"/><text class="dg-t" x="414" y="206">Verbatim · never paraphrased</text>
<line class="dg-line" x1="310" y1="33" x2="392" y2="33"/><polygon class="dg-head" points="392,28 400,33 392,38"/>
<line class="dg-line" x1="310" y1="89" x2="392" y2="89"/><polygon class="dg-head" points="392,84 400,89 392,94"/>
<line class="dg-line" x1="310" y1="145" x2="392" y2="145"/><polygon class="dg-head" points="392,140 400,145 392,150"/>
<line class="dg-line" x1="310" y1="201" x2="392" y2="201"/><polygon class="dg-head" points="392,196 400,201 392,206"/>
</svg>
</div>
<figcaption>Different content deserves different treatment. Only reasoning traces pay for a model-written summary; everything else is either reversible or untouched.</figcaption>
</figure>

### Decision 3: the summary schema

Worth up to **6.5 accuracy points** [S], this is the highest-leverage prompt in your system. "Summarise the conversation so far" leaves that on the table. Each section below maps to a measured failure.

```markdown title="compaction-schema.md (excerpt)"
## Goal
<one sentence: the original task, verbatim where possible>

## State                          ← counters the 44.6% termination collapse
- Done: <verified complete, and how it was verified>
- In progress: <the one current sub-goal>
- Not started: <what remains>

## Decisions
- <decision> — because <reason>

## Ruled out                      ← counters regressive exploration
- <approach> — because <reason>, evidence: <file:line or command>

## Exact strings (verbatim, do not paraphrase)   ← counters detail loss
- errors, versions, paths, line numbers, config keys, IDs

## Open questions

## Offloaded artifacts            ← counters irrecoverability
- <id or path> — <one-line description>
```

The full version, with operating rules, is in [the templates appendix](ch:templates#4-compaction-schema).

### Decision 4: target size

Smaller summaries lose more. But FIFO, which loses the *most*, kept state recognition better than summarisation. So the amount lost is not the only axis; *what kind* of loss matters more.

**Recommendation:** no fixed token target. Compress narrative aggressively; keep the state block and exact strings in full. A 1,200-token summary with verbatim error strings beats a 400-token one that paraphrased them.

### Decision 5: how often

Research setups cap at **three compactions per run** [S]. The practitioner rule is stricter: **more than one compaction means the session should have ended.**

**Recommendation:** cap at one, then reset with a handoff note. A second compaction compresses something already compressed. Errors compound, details are twice removed, and the variance effect of Result 2 stacks.

### Decision 6: the cache

Compaction rewrites everything after the stable prefix and invalidates the cache from that point. The [worked arithmetic](ch:metrics-and-economics#belief-2-compaction-saves-money) shows that compacting a 120K context to 40K **breaks even after about four more turns**.

Two consequences. First, **compacting near the end of a session is a pure loss**: you pay and never collect. Second, because cached tokens were already cheap, **compaction's money saving is much smaller than its token count suggests, while its quality cost is not.** You pay measured reliability damage for a modest, slow saving.

**Recommendation:** compact less often and more decisively.

## Offload: the pattern to reach for first

Offload beats compaction wherever it applies, because it is reversible.

```text title="the offload pattern"
tool returns 14,000 tokens
  → write to  .agent/artifacts/a3f9.log
  → context receives:
      .agent/artifacts/a3f9.log (14.2KB)
      npm ci — exit 0, 2 peer-dep warnings (react-dom, @types/node)
  → the agent can `recall a3f9` or grep inside the store at any time
```

Three design rules, each learned from a failure:

1. **The [[stub]] must carry enough to decide whether to recall it.** `a3f9.log (14.2KB)` is dead weight. Adding the exit code and a warning summary costs 15 tokens and turns a deleted file into a working pointer.
2. **Do not offload what is still in use.** Offloading the log from the command that just ran forces an immediate recall. Offload after a few turns or at a sub-goal boundary.
3. **Keep the manifest bounded.** Past about 30 items, an always-visible manifest becomes the problem it solved. Switch to a searchable store with a one-line index.

**Where to put it.** A gitignored scratch directory outside the source tree (for example `.agent/`) for logs and intermediate output. In the repository, versioned, for anything a person should review, such as plans and decision records. At this scale the filesystem beats a database: the agent already has file tools, there is no schema, and `grep` works.

## Cross-session memory

This is the area with the weakest evidence and the most enthusiastic tooling. It is treated sceptically for that reason.

### What memory is for

Only one use survives scrutiny: **facts that were expensive to learn and stay true.** Everything else belongs in the repository.

| Candidate memory | Verdict |
|---|---|
| "The staging database needs the VPN; the symptom is a 30-second hang, not an auth error" | **Keep.** Expensive to learn, stable, not in the repository |
| "The `orders` service owns idempotency keys; do not add them in `payments`" | **Keep.** Architectural, lasting, not obvious |
| "The user prefers 2-space indentation" | **Delete.** It is in the formatter config |
| "Last week we fixed a bug in `retry.ts`" | **Delete.** It is in `git log` |
| "The auth module is complex" | **Delete.** No decision follows from it |

The test: **would this change a decision, and would re-deriving it cost a lot?** It needs both.

### Three ways memory fails

1. **Write-only memory.** The system collects thousands of entries and never surfaces a decisive one. Every memory tool demos writing; almost none measure reading. **If you cannot report "memories retrieved that changed an action, per week", you do not know whether your memory works.**
2. **Staleness.** A memory about code that has since been refactored is *worse than nothing*: confidently wrong and silent. Prefer memories about things that change slowly: infrastructure, conventions, contracts between systems, operational knowledge.
3. **Prefix cost.** Memory loaded at session start is prefix. A growing memory file is a growing tax on every call. Ten memories is a tool; a thousand is the tool-bloat problem again, with worse selection.

### An architecture that survives the objections

| Tier | What it holds | Cost |
|---|---|---|
| **1. Always loaded** (hard cap: 40 lines) | Invariants that apply to nearly every task; effectively part of the instruction file | Prefix tokens on every call |
| **2. Searchable store** (Markdown files, indexed) | Facts retrieved on demand by explicit query | Only when used |
| **3. The repository** | Code, tests, [[ADR|ADRs]], git history | Already paid |

### Tier 3: the repository does the most work

The repository is the authoritative memory: versioned, reviewed, and repaired by the same process that changes the code. **An ADR committed to the repository is a better memory than a database entry.** It is discoverable by grep, updated alongside the code, and needs no MCP server.

The honest position on memory tooling: the ecosystem is large, the mechanisms are reasonable, and **published evidence that it improves coding-agent outcomes is thin.** Adopt it with a measurement plan, not on the strength of a demo.

## External knowledge stores: wiki, database, graph

Your organisation already has a wiki, probably a database or two, and possibly someone building a knowledge graph. What should the agent do with them?

The short answer is **[[dereference, don't index|dereference, never index]]**. The reasoning matters more than the rule, because it generalises to stores that do not exist yet.

### The governing variable is staleness rate

Every store can hold a fact. What separates them is **what happens to that fact when the code changes underneath it.** See [[staleness rate]].

| Property | Repository | Wiki | Database or memory store | Knowledge graph |
|---|---|---|---|---|
| Changes with the code, in the same review | **Yes** | No | No | No |
| Something fails when it goes stale | **Yes**: tests, build, review | Nothing | Nothing | Nothing |
| Who repairs it | Whoever changed the code | Nobody in particular | A curation process you must staff | A re-ingestion pipeline |
| Readable without tooling | Yes | Yes | Usually not | No |
| Searchable by grep | Yes | Only if mirrored | No | No |

**Only the first column has a repair mechanism.** That is the whole argument. It is not that Markdown beats SQL. A fact living next to the code it describes is the only fact with a maintainer.

<figure class="diagram">
<p class="diagram__title">Where a fact should live, by how fast it goes stale</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 200" role="img" aria-labelledby="c3-t">
<title id="c3-t">Facts that last hours go in the plan file; days to weeks in commits and pull requests; months to years in ADRs; external facts are fetched on demand.</title>
<line class="dg-line" x1="20" y1="60" x2="700" y2="60"/>
<polygon class="dg-head" points="700,55 710,60 700,65"/>
<text class="dg-k" x="20" y="36">FACT HALF-LIFE →</text>
<circle class="dg-dot--accent" cx="80" cy="60" r="6"/><circle class="dg-dot--accent" cx="230" cy="60" r="6"/><circle class="dg-dot--accent" cx="390" cy="60" r="6"/><circle class="dg-dot--accent" cx="540" cy="60" r="6"/><circle class="dg-dot--accent" cx="660" cy="60" r="6"/>
<text class="dg-t" x="80" y="92" text-anchor="middle">Hours</text><text class="dg-s" x="80" y="112" text-anchor="middle">the failing test</text><text class="dg-s" x="80" y="140" text-anchor="middle">→ plan file</text>
<text class="dg-t" x="230" y="92" text-anchor="middle">Days–weeks</text><text class="dg-s" x="230" y="112" text-anchor="middle">"defer the rewrite"</text><text class="dg-s" x="230" y="140" text-anchor="middle">→ commit, PR</text>
<text class="dg-t" x="390" y="92" text-anchor="middle">Months–years</text><text class="dg-s" x="390" y="112" text-anchor="middle">"orders owns keys"</text><text class="dg-s" x="390" y="140" text-anchor="middle">→ ADR in the repo</text>
<text class="dg-t" x="540" y="92" text-anchor="middle">Years, external</text><text class="dg-s" x="540" y="112" text-anchor="middle">provider rate limit</text><text class="dg-s" x="540" y="140" text-anchor="middle">→ ADR, or fetch docs</text>
<text class="dg-t" x="660" y="92" text-anchor="middle">Never</text><text class="dg-s" x="660" y="112" text-anchor="middle">language specs</text><text class="dg-s" x="660" y="140" text-anchor="middle">→ fetch on demand</text>
<text class="dg-s" x="360" y="186" text-anchor="middle">The common failure is a mismatch: a two-week fact in a store with a two-year repair cycle.</text>
</svg>
</div>
<figcaption>Ask two questions of any store: how long do these facts stay true, and does this store get repaired faster than that? The dominant failure is not a wrong store but a mismatch between the two.</figcaption>
</figure>

### The wiki

Most organisations' largest knowledge store, and the worst calibrated for agents.

**The asymmetry.** Code that becomes wrong fails a test. A wiki page that becomes wrong fails *nothing*. There is no CI for prose, so a wiki's error rate only rises with age.

**Why it is worse for an agent than for a person.** A person discounts a page by its last-modified date and has been burned before. An agent does neither. Worse, **a stale wiki page about exactly your subsystem is a maximally plausible distractor.** Distractor damage rises with similarity to the query [S], and a page describing the exact module you are working on, in your vocabulary, is at the top of that curve. Bulk-indexing the wiki is therefore not neutral. **It manufactures high-similarity distractors** [D].

| Do | Do not |
|---|---|
| Fetch a specific page when a person names it | Bulk-index the wiki into a vector store |
| Treat a fetched page as a **hypothesis** to check against code | Pre-load wiki content into the prefix |
| Migrate the durable facts out (below) | Let the agent search the wiki on its own |
| Record the page's last-modified date with its content | Cite the wiki in a summary without the check result |

**The migration, the one thing worth doing.** A bounded, one-time extraction. Then stop reading the wiki.

1. List the pages the team actually opened last quarter. Ignore the long tail.
2. For each, ask: does a decision depend on this, and is it expensive to re-derive?
3. For each survivor, ask the harder question: **where in the repository would this fail loudly if it became wrong?** Next to the config it describes, in an ADR beside the decision, as a comment above the workaround, or best of all as a test.
4. Move it there, in a reviewed pull request.
5. **Replace the wiki page with a link to its new home.** This stops the two from drifting apart again.

Steps 3 and 5 are the ones teams skip, and skipping either turns a clean-up into a duplication.

**What legitimately stays in the wiki:** facts with no code home, such as on-call rotations, escalation paths, vendor contacts and team ownership. These are also, notably, facts a coding agent rarely needs.

### When a database beats the filesystem

The question is not *whether* to use a database. It is **what makes the filesystem stop being enough.**

Markdown files under `ripgrep` are versioned, diffable, reviewable, searchable with the same tools for people and agents, portable, and free to run. Below roughly ten thousand documents, nothing beats that [D]. A real store earns its place when one of these holds:

| Trigger | Why files stop working |
|---|---|
| Several agents writing at once | Lost updates; no transactions |
| More than about 10⁴–10⁵ entries | Grep becomes too slow for interactive use |
| Structured queries: time ranges, aggregation, expiry | Grep cannot express them |
| A retention or access policy is required | Files have no enforcement point |

If you cross one, the order is **SQLite with full-text search first**, then Postgres, then anything else. SQLite keeps the property that mattered: it is still a file.

> [!warning] Avoid vector-only memory
> Embeddings are weak at exact recall: version numbers, error strings, flag names, paths. That is exactly what agent memory has to get right. Addressable, exact recall beat every lossy baseline by 19.43 points on needle retrieval [S]. If you embed, keep full-text search alongside it and route exact-token queries there.

### Knowledge graphs, and a disambiguation

"Graph" means two completely different things in this research. Mixing them up is how graph-memory services get justified with structural retrieval's evidence.

| | **[[Code graph]]** | **[[Knowledge graph]]** |
|---|---|---|
| Edges | Imports, calls, references, types | Entities and relations extracted from prose |
| Built by | A compiler or language server | An LLM extraction pipeline |
| Accuracy | **Exact** | Probabilistic; false edges are routine |
| Freshness | Current by construction | As fresh as the last ingestion |
| Cost | Near zero, already computed | A service, a schema, a pipeline, curation |
| Verdict | **Adopt**: it is structural retrieval | **Skip for coding**, with one exception |

Why knowledge graphs underperform for coding, strongest reason first:

1. **The graph you want already exists and is exact.** A compiler computes it, for free, continuously. An LLM-extracted graph over the same code is a lossy, stale approximation.
2. **Extraction is a poisoning surface.** A false edge looks like schema, not opinion, and poisoning cannot be removed by appending a correction.
3. **Agent questions do not match graph traversal.** "Where is X defined?" and "what calls Y?" are grep and language-server questions. "Why is Z like this?" is not a graph query at all; it is an ADR.
4. **Ingestion lag is unbounded.** The code changes every merge; the graph changes when the pipeline runs.

**The real exception:** relationships **no single compiler can see**, such as service dependencies across repositories, data lineage across systems, ownership and on-call mapping, and API contracts between repositories. If your proposed graph covers one repository's source, the compiler already won.

### Methods before tools

| Method | What it is | Why it works |
|---|---|---|
| **ADR as memory** | Decisions as numbered Markdown in `docs/decisions/`, reviewed in the PR that makes them | The only memory with a maintainer |
| **Co-location** | Write the fact where a change would break it | Turns silent staleness into a review conflict |
| **Assert it instead** | If a test can assert the fact, write the test | A test is a memory with CI attached |
| **Dereference, don't index** | Fetch named pages on demand; never bulk-ingest | Avoids manufacturing distractors |
| **Expiry stamps** | Each stored fact has a written-on and review-by date | Makes rot visible |
| **The staleness audit** | Quarterly: sample 20 entries, check each against the repository | Turns "is our memory any good?" into a number. Above ~20% false, delete the store |

> [!key] The gate for every store
> **Retrievals from this store that changed an action, per week.** Instrument it on day one. Under one a week after a month: delete the store. In practice the wiki integration fails this first, because most wiki content answers questions nobody was blocked on.

Tools for this layer, with verdicts, are in [chapter 18](ch:tooling#state-memory-and-offload).

## The complete policy

Everything above as a configuration you could implement this week:

```yaml title="context-policy.yaml"
prevention:
  output_shaping: true              # do this first
  ignore_files: [node_modules, dist, "*.lock", __generated__]

offload:                            # before any compression
  threshold_tokens: 1500
  delay_turns: 2
  stub_includes: [path, size, exit_code, one_line_summary]
  store: .agent/artifacts/
  manifest_max_items: 30

compaction:
  trigger:
    semantic: [subtask_complete, hypothesis_resolved, tests_pass]
    suppress: [mid_edit, stuck, immediately_after_error]
    backstop_threshold: 0.88
  strategy:
    observations: citation_stub     # reversible
    reasoning: llm_summary          # into the fixed schema
    plan: never                     # lives in PLAN.md
    exact_strings: verbatim
  max_per_session: 1
  post_compaction: reread PLAN.md   # protects the highest-error step

memory:
  tier1_max_lines: 40
  tier2: searchable_markdown
  tier3: the_repository             # ADRs, tests, comments
  metric: retrievals_that_changed_an_action

external_stores:
  wiki: {bulk_index: false, autonomous_search: false, fetch_by_name: true, treat_as: hypothesis}
  database: {default: sqlite_fts5, vector_only: false}
  knowledge_graph: {over_source_code: false, cross_system_only: true}
  staleness_audit: {cadence: quarterly, sample: 20, delete_above_false_rate: 0.20}

session:
  reset_after: [second_compaction_needed, loop_detected, poison_found]
```

## Measuring the compression layer

| Metric | Formula | Healthy | Detects |
|---|---|---|---|
| Post-compaction re-fetch rate | Re-fetches in the 10 turns after ÷ compactions | Under 2 | The summary drops load-bearing content |
| Compactions per session | Count | At most 1 | Sessions running too long |
| Recall rate | Recalls ÷ stubs created | 0.1–0.4 | Too low: dead pointers. Too high: offloading too early |
| **Pass² ÷ Pass@2** | On a fixed evaluation set | Over 0.85 | **Compression damage** [S] |
| Termination recognition | Tasks correctly ended ÷ tasks completed | Over 0.9 | Lost state [S] |
| Cache hit rate around compaction | Before versus after | Recovers within ~3 turns | Compaction cost |
| Exact-string survival | Strings kept verbatim ÷ strings present before | Over 0.95 | Schema adherence |

If you add only one, add **Pass² ÷ Pass@2**. It measures Result 2 directly, no single-run evaluation can see it, and it predicts the complaint you are about to get.
