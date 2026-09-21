## The question, posed correctly

"Semantic search versus grep" is a category error. It compares a technology with a tool and ignores the variables that actually decide the outcome. Retrieval design has four independent axes.

| Axis | Options | What it governs |
|---|---|---|
| **Unit** | File, range, symbol, chunk | How much waste each retrieval carries |
| **Index** | None (live), lexical, structural, vector, hybrid | Which questions can be answered |
| **Timing** | Pre-loaded, just-in-time, small seed plus just-in-time | Relevance density over the session |
| **Agency** | Fixed pipeline, or the agent iterating | Whether the query can adapt |

"Grep versus embeddings" collapses all four into one. A pre-loaded, file-level vector search and a just-in-time, symbol-level grep differ on *every* axis. Crediting the result to "embeddings" credits the wrong variable.

> [!key] A fifth variable often dominates all four: the harness
> A 2026 study compared grep with vector retrieval on 116 questions across four [[harness|harnesses]]: a custom agent and three widely used CLI agents. Grep generally won. But **overall scores depended strongly on which harness and tool-calling style was used, on identical data** [S].

The consequence is uncomfortable: **a retrieval comparison run on someone else's harness does not transfer to yours**, including that one. It tells you the *shape* of the answer (lexical search is a strong baseline; do not skip it). It does not tell you the size of the effect on your setup. [Chapter 9](ch:evaluation) shows how to measure it yourself.

## Why code is an unusual corpus

Most retrieval intuition comes from document search. Code breaks five of its assumptions, and each break changes what works.

| Property of code | Why it matters |
|---|---|
| **Exact relevance edges already exist** | In prose, "related" is a fuzzy judgment. In code, A calls B and `test_foo` tests `foo`. These are computed facts. Approximating them with embeddings pays for a worse answer. |
| **Near-duplicates are everywhere, and adversarial** | `parse_config` in three modules, `UserService` beside `UserServiceV2`, vendored libraries, generated clients. Distractors hurt, and *which* distractor matters [S]. A method that cannot tell `UserSession` from `UserSessionStore` fails here. |
| **The corpus edits itself** | The agent changes what it retrieves from. Every index is stale from the first edit, and wrong about exactly the code most likely to matter. Live retrieval (grep, language server) cannot go stale. |
| **Names are chosen to be searchable** | `grep -rn "RETRY_LIMIT"` is exact, instant and complete. A vector search returns things *like* it, which is worse when you know the name. Semantic search helps precisely and only when you do not. |
| **Structure is a free signal** | `src/payments/stripe/webhook_handler.ts` says in 12 tokens what prose needs a paragraph for, and it never goes stale. |

## The four paradigms

### Lexical: grep and ripgrep

**How it works.** Pattern matching over file contents. No index, no staleness, no build step.

**Strengths.** Exact, complete within its query, fast on any repository size. It finds what lives *outside* the symbol graph: string literals, config keys, comments, YAML, SQL, environment variables, feature flags.

**Weaknesses.** You have to know or guess the token. It returns line fragments, which causes [[fragment blindness]]: a matched line shown with three lines of context, cut off before the `if` that governs it, read as if it always runs. The fix is trivial: use `-C 8` or expand to the enclosing function.

**Evidence.** Generally more accurate than vector retrieval in the four-harness study [S]. Eight surveyed coding agents use the model as a navigator over shell tools such as `grep`, `find` and `ripgrep` [S]. This is the majority architecture, not a fallback.

### Structural: LSP, tree-sitter, symbol index

**How it works.** Parse the code. Expose symbols, definitions, references and the [[code graph]]. Retrieve symbol bodies and traverse exact edges.

**Strengths.** The retrieval unit matches the meaning unit: a 40-line function instead of a 1,200-line file. Reference traversal has no false positives. It answers questions grep cannot express: what calls this, what implements this interface, what breaks if this signature changes. Mature toolkits cover 30+ languages via the Language Server Protocol [P].

**Weaknesses.** Needs a working language server, with setup, memory and warm-up. It has a silent failure mode: a timeout returns "no results", which looks exactly like "does not exist". It cannot see configuration, string-keyed dispatch, schemas, CI definitions or templates.

**Evidence.** Mostly mechanical rather than benchmarked: the waste argument and the exact-edge argument are both large and derivable. The rename example in [chapter 3](ch:ten-methods#m-4-structural-retrieval) shows about 15× fewer tokens with better precision.

### Semantic: embeddings and vector search

**How it works.** Chunk the repository, embed the chunks, embed the query, return nearest neighbours.

**Strengths.** Answers questions when you do not know the vocabulary: "how do we handle rate limiting?" when the code says `throttle`. Useful over non-code material such as design documents, ADRs and PR discussions.

**Weaknesses.** Index staleness, worst on recently edited code. Chunk boundaries that split functions. Approximate answers where exact ones exist. And the one that matters most: **it always returns something.** Grep returning zero hits is information. A vector search returning five irrelevant chunks is misinformation that looks like success.

**Evidence.** Generally less accurate than grep head-to-head [S]. A hybrid of semantic search and grep has been reported **12.5% more accurate** than either alone [P]. Production systems routinely combine semantic, keyword (BM25) and metadata filters [S].

### Live agentic search: the LLM as navigator

**How it works.** Not a fourth index but a control strategy. The agent iterates: search, read, decide the next query, stop when satisfied. See [[agentic search]].

**Strengths.** The query adapts to what was found. It handles the common case where the first search is wrong because the first hypothesis was wrong.

**Weaknesses.** Turns and latency. Quality depends on the model's search skill, which is exactly where the harness confound bites hardest. Practitioners report agents spending **60%+ of their time searching for context** [P].

## The comparison

| Property | Lexical | Structural | Semantic | Agentic (control) |
|---|---|---|---|---|
| Setup cost | None | Moderate | High | None |
| Goes stale | No | No (live) | **Yes** | — |
| Exact | On the pattern | On the graph | Approximate | Inherits |
| Concept questions | No | No | Yes | Yes, by iterating |
| Covers config, YAML, SQL | Yes | No | Partly | Inherits |
| Waste per retrieval | Medium (fragments) | Low | Medium to high (chunks) | Falls over turns |
| **Fails loudly** | Yes (0 hits) | Yes (not found) | **No** | Depends |
| Tokens per useful fact | Low | **Lowest** | Medium | Low, but many turns |
| Harness sensitivity | Medium | Medium | Medium | **Very high** |

> [!warning] "Fails loudly" is the most underrated row
> A method that returns nothing when there is nothing tells the agent to change strategy. A method that always returns its top five tells the agent it succeeded. For an agent that cannot easily judge its own retrieval, silent failure is much worse than moderate inaccuracy.

## The recommended architecture

Synthesised from the evidence, as a default to override with your own measurements.

<figure class="diagram">
<p class="diagram__title">Escalate through the tiers; do not run them all</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 330" role="img" aria-labelledby="r1-t">
<title id="r1-t">Tier zero is free structure, tier one lexical search, tier two structural search, tier three optional semantic search. The agent escalates only when a tier fails.</title>
<rect class="dg-box--muted" x="10" y="10" width="520" height="58" rx="8"/>
<text class="dg-k" x="24" y="32">TIER 0 · FREE PRIOR</text>
<text class="dg-t" x="24" y="54">Directory layout, naming, test-to-source mapping</text>
<text class="dg-s" x="520" y="54" text-anchor="end">~0 tokens</text>
<rect class="dg-box--accent" x="10" y="80" width="520" height="58" rx="8"/>
<text class="dg-k" x="24" y="102">TIER 1 · LEXICAL, LIVE · THE WORKHORSE</text>
<text class="dg-t" x="24" y="124">ripgrep with -C 8 or symbol expansion</text>
<text class="dg-s" x="520" y="124" text-anchor="end">"where does X appear?"</text>
<rect class="dg-box--info" x="10" y="150" width="520" height="58" rx="8"/>
<text class="dg-k" x="24" y="172">TIER 2 · STRUCTURAL, LIVE · THE PRECISION TOOL</text>
<text class="dg-t" x="24" y="194">find symbol, find references, outline</text>
<text class="dg-s" x="520" y="194" text-anchor="end">"what uses X?"</text>
<rect class="dg-box--ghost" x="10" y="220" width="520" height="58" rx="8"/>
<text class="dg-k" x="24" y="242">TIER 3 · SEMANTIC, INDEXED · OPTIONAL</text>
<text class="dg-t" x="24" y="264">over docs, ADRs and PRs at least as much as code</text>
<text class="dg-s" x="520" y="264" text-anchor="end">"how do we usually…?"</text>
<rect class="dg-box" x="555" y="10" width="155" height="268" rx="8"/>
<text class="dg-k" x="632" y="36" text-anchor="middle">CONTROL</text>
<text class="dg-t" x="632" y="60" text-anchor="middle">Agentic</text>
<text class="dg-t" x="632" y="78" text-anchor="middle">iteration</text>
<text class="dg-s" x="632" y="104" text-anchor="middle">just-in-time,</text>
<text class="dg-s" x="632" y="120" text-anchor="middle">narrowing</text>
<text class="dg-k" x="632" y="180" text-anchor="middle">SUPPORT</text>
<text class="dg-t" x="632" y="204" text-anchor="middle">Reversible</text>
<text class="dg-t" x="632" y="222" text-anchor="middle">offload</text>
<text class="dg-s" x="632" y="246" text-anchor="middle">for anything large</text>
<line class="dg-line dg-line--dash" x1="540" y1="109" x2="540" y2="249"/>
<polygon class="dg-head" points="535,249 540,258 545,249"/>
<text class="dg-s" x="270" y="310" text-anchor="middle">escalate only when the tier above returns nothing or the name is unknown</text>
</svg>
</div>
<figcaption>Lexical and structural search do most of the work, live and exact. Semantic search is an optional fallback for unknown vocabulary, pointed at prose as much as at code.</figcaption>
</figure>

Two rules govern the tiers.

1. **Escalate, do not parallelise.** Try tier 1. If the identifier is unknown or the results are empty, go up a tier. Running every tier on every query multiplies tokens and floods context with three overlapping result sets.
2. **Expand along the graph, not across the file.** Having found a hit, read its callers, implementers and tests, not the lines above and below it. Spatial adjacency in code is a weak signal; graph adjacency is a strong one. This one habit is worth more than most index choices.

## Nine ways code retrieval goes wrong

| # | Pathology | Tell | Fix |
|---|---|---|---|
| R-1 | **Whole file read for one symbol** | Read tokens far exceed cited tokens; median relevance under 20% | Read the symbol |
| R-2 | **Fragment blindness** | The agent reasons about code that only runs under a condition it never saw | At least `-C 8`; expand to the enclosing function |
| R-3 | **Vendored or generated code** | Hits in `node_modules/`, `dist/`, `vendor/`, `__generated__/` | Ignore files; exclusion globs |
| R-4 | **Near-duplicate confusion** | The agent edits `UserServiceV2` when `UserService` was live | Structural retrieval; mark deprecations in the code |
| R-5 | **Stale self-read** | The agent cites a line that its own edit moved | Re-read before re-editing; auto-refresh |
| R-6 | **Silent index staleness** | Semantic search returns pre-refactor code with no error | Prefer live retrieval; rebuild triggers |
| R-7 | **Coherent-document distraction** | The agent cites the design document for behaviour the code contradicts | Do not pre-load design docs; fetch them for questions about intent |
| R-8 | **Config blindness** | Structural-only search misses the environment variable that causes the bug | Keep lexical search; search `*.yaml`, `.env*`, `*.toml`, CI files |
| R-9 | **Over-broad first query** | `grep -r "user"` returns 4,000 hits and 6K tokens of noise | Cap results; start from the most specific token available |

Two of these are counterintuitive. **R-5 is the agent poisoning its own context with its own work**: the more productive the session, the more of what it read is now wrong. **R-7 means good documentation can hurt**. Coherent text retrieves *worse* than shuffled text across all 18 models tested [S]. That does not mean stop writing design documents. It means do not pre-load them into a coding agent. Fetch them on demand for questions about *intent*, and treat the code as the authority on *behaviour*.

## Should you seed the session with a codebase overview?

**The evidence against.** 5K tokens of targeted retrieval beat a 100K codebase summary [P]. Focused ~300-token prompts beat ~113K full ones [S]. Full context used 2.68× the tokens of the best managed method and completed fewer tasks [S]. Coherent prose retrieves worse [S]. Every result points the same way.

**The evidence for a small seed.** Just-in-time retrieval fails by starvation when the agent does not know a subsystem exists. Human-written context files improved success by about 4% [P]: small, positive, real.

**The synthesis: pre-load pointers and invariants, never content.**

| Pre-load | Do not pre-load |
|---|---|
| Entry points (3–8 paths) | Architecture prose |
| Non-obvious invariants ("all database access goes through `repo/`") | Module descriptions |
| Build and test commands | API documentation |
| Landmines ("`legacy/` is dead; do not edit") | Full file contents |
| Where things live, one line each | Design rationale |

Keep it **under 2,000 tokens**. For any candidate line, ask: *does this help the agent decide where to look, or does it try to replace looking?* The first is worth its tokens many times over. The second is the 100K summary that lost to 5K.

```markdown title="pointer seed, ~300 tokens"
## Where things live
- API entry: src/api/server.ts · routes in src/api/routes/
- Auth: src/auth/ (session.ts is the entry point)
- All database access goes through src/repo/ — never query directly

## Commands
- Test: npm test -- --silent   · Lint: npm run lint
- One package: npm test -w packages/<name>

## Landmines
- legacy/ is dead code; do not edit or import from it
- Migrations need a down-migration; the deploy skips forward-only ones silently
```

## Measure your own retrieval

The harness confound means you cannot inherit the answer. Four cheap measurements:

1. **[[Read-utilisation]].** For 20 reads, what share of retrieved tokens appears in the final diff or explanation? Median under 20%: adopt symbol-level reads. Under 5%: retrieval is your main problem.
2. **[[Read-coverage]] on failures.** For your last 10 failures, was the decisive file ever read? This splits **starvation** (never read, a recall problem) from **dilution** (read and ignored, a precision problem). They have opposite fixes. Teams that skip this often apply the precision fix to a recall problem and make it worse.
3. **Search efficiency.** Turns until the first productive edit, and the ratio of search turns to edit turns. If search is over 60% of turns [P], retrieval is the bottleneck.
4. **A real A/B.** Hold everything else fixed, vary only retrieval, run at least 20 tasks per arm, and report [[Pass^k|Pass@2 and Pass²]]. Anything less is not evidence at these effect sizes.
