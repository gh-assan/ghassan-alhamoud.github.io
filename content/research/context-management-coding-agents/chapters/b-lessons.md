## How to use the lessons

Each lesson is a transferable claim with its **mechanism**, why it is true, and its **falsification condition**, the observation that would prove it wrong. A lesson you cannot falsify is a slogan.

> [!key] The five that matter most
> - **L1**: it is a budget, not a bucket. Everything follows.
> - **L11**: a large stable prefix beats a small churning one. It inverts most cost intuition.
> - **L27**: compression damage is variance first. It changes how you measure.
> - **L54**: deletion is the highest-yield action. It changes what you do first.
> - **L57**: there is a stopping point. It prevents building a framework nobody needs.

## A. The nature of context (L1–L8)

Background: [chapter 1](ch:foundations).

| # | Lesson | Why it is true | Falsified if |
|---|---|---|---|
| L1 | **The context window is an attention budget, not a container.** | attention is redistributed, not created, when tokens are added; every token dilutes every other. | a controlled study finds task performance monotonically non-decreasing in irrelevant added context. |
| L2 | **Adding correct information can reduce performance.** | correctness does not confer salience; a correct-but-irrelevant token competes for attention identically to a wrong one. | adding verified-correct, task-irrelevant context reliably improves solve rates. |
| L3 | **Degradation begins well before the window fills.** | measured across 18 models at every input-length increment tested [S]. | a frontier model shows flat performance up to ~80% of its advertised window on a distractor-rich task. |
| L4 | **Position is a resource with exactly two premium slots.** | U-shaped attention under ~50% utilisation, collapsing to recency dominance above it [S]. | mid-context placement performs equally to end-context placement at high utilisation. |
| L5 | **Your rules decay because they are early tokens in a full window, not because the model forgot them.** | L4's second regime. The instruction file at position zero is in the least-attended region once the window is more than half full. | rule-violation rate is flat with respect to session depth at constant instruction-file content. |
| L6 | **Coherent context can be worse than incoherent context.** | logical flow creates plausible alternative attractors; shuffled haystacks outperformed coherent ones across all 18 models tested [S]. | well-structured documents retrieve better than shuffled equivalents at equal token count. |
| L7 | **Effective context length is materially shorter than advertised context length.** | long-context benchmarks show falloff well before nominal limits [S]. | RULER-style task performance at 90% of the advertised window matches performance at 10%. |
| L8 | **Coding agents are a special case because verification is cheap.** | tests and compilers provide a millisecond ground-truth oracle, so a lost fact usually surfaces as a failing test rather than a plausible falsehood. | context-management errors in repos with strong test suites produce as many silent wrong answers as in repos without. |

## B. The economics (L9–L17)

Background: [chapter 10](ch:metrics-and-economics).

| # | Lesson | Why it is true | Falsified if |
|---|---|---|---|
| L9 | **Input tokens are essentially all of your token spend.** | measured at 99.75–99.87% in tool-heavy agent workloads [S]. | output exceeds 1% of total tokens in a normal coding session. |
| L10 | **Tokens in a stable prefix cost about a tenth of tokens that churn.** | prefix caching; cached reads run ~0.10 versus ~1.25 for new-token writes. | your provider's cached and uncached input prices are within 2×. |
| L11 | **A large stable prefix is cheaper than a small churning one.** | L10 applied. Worked: 24% fewer tokens produced a 6.9× cost increase when the reduction made the prefix dynamic (chapter 10). | prefix caching is unavailable, or sessions are single-turn. |
| L12 | **Compaction's financial saving is much smaller than its token saving suggests.** | the retained context was already cheap (cached); the compaction call is paid at near-full price. Breakeven ≈ 4 turns (chapter 10). | your cached-read discount is small, making retained context genuinely expensive. |
| L13 | **Compacting near the end of a session is a pure loss.** | L12's breakeven. You pay the cost and collect none of the savings. | compaction has no fixed cost in your setup. |
| L14 | **Cost per solved task is the only metric that cannot be gamed in both directions.** | under-provisioning lowers cost and lowers solves; over-provisioning raises both. The ratio catches each. | a configuration improves cost-per-solved while worsening both cost and quality. |
| L15 | **You can over-compress as easily as you can over-load.** | both are deviations from the density optimum. Worked: the over-compressed configuration had the lowest total cost and the second-worst cost-per-solved (chapter 10). | solve rate is monotone decreasing in context size across the full range. |
| L16 | **The human line is usually the largest cost in a small team.** | instruction-file upkeep, memory curation, and audits do not appear in any token metric. | a full accounting shows human hours below 10% of total cost at team scale. |
| L17 | **Multi-agent gains are substantially bought, not free.** | ~15× token cost, with token usage alone explaining ~80% of performance variance [P]. | a token-matched comparison shows multi-agent beating single-agent at equal spend. |

## C. Loss and reversibility (L18–L26)

Background: [chapter 6](ch:compaction-and-memory).

| # | Lesson | Why it is true | Falsified if |
|---|---|---|---|
| L18 | **Reversibility is worth more than compression ratio.** | a recoverable 60% reduction dominates an irrecoverable 90% one, because the failure mode of the second is unbounded. | recall is never invoked and stub overhead exceeds summarisation savings. |
| L19 | **Offload before you compress.** | offloading converts irreversible loss to reversible; compressing first destroys the option. | post-compaction re-fetch rate is zero without an offload layer. |
| L20 | **Summarisation cannot be inverted.** | omitted or paraphrased details cannot be recovered [S]. | a summariser demonstrably reconstructs dropped exact strings. |
| L21 | **Compaction launders hallucinations into settled facts.** | summarisation preserves assertions better than hedges; a hypothesis becomes a statement. | summaries reliably preserve epistemic status markers. |
| L22 | **Losing information wholesale can damage state recognition less than replacing it with fluent prose.** | FIFO preserved 77.2% termination recognition versus 44.6% under summary replacement [S]. A narrative reads as though the state is known. | summarisation matches truncation on termination recognition at equal budget. |
| L23 | **A pointer the agent will not follow is equivalent to deletion.** | recall requires a relevance decision, which requires a descriptive stub. | bare identifiers produce the same recall rate as descriptive ones. |
| L24 | **Exact strings are a small fraction of tokens and a large fraction of value.** | error messages, versions, paths and line numbers are unactionable when approximated. | paraphrased error descriptions produce equal fix rates to verbatim ones. |
| L25 | **You cannot delete from a transcript by talking to it.** | transcripts are append-only; corrections add a competing claim rather than removing the original. | an appended correction reliably eliminates recurrence of the corrected fact. |
| L26 | **The best boundary is the one you author.** | a handoff note gives you direct control over what crosses; compaction delegates it to a summariser whose retention fluctuates run to run [S]. | automated summaries match hand-written handoffs on post-boundary re-fetch rate. |

## D. Measurement (L27–L36)

Background: [chapter 9](ch:evaluation).

| # | Lesson | Why it is true | Falsified if |
|---|---|---|---|
| L27 | **Compression damage is a variance phenomenon before it is a mean phenomenon.** | retention varies run to run, producing intermittency; Pass@2/Pass² gaps widen under tighter budgets [S]. | Pass² degrades no faster than mean accuracy as compression tightens. |
| L28 | **Single-run evaluation is structurally blind to the primary harm of compression.** | L27. The metric excludes the effect by construction. | single-run accuracy and Pass² move proportionally across compression settings. |
| L29 | **The harness can dominate the strategy.** | grep-vs-vector scores depended strongly on which of four harnesses ran the search, on identical data [S]. | a retrieval ranking replicates across three independent harnesses with similar margins. |
| L30 | **Published context results are hypotheses for your setup, not conclusions.** | L29 applied. | your replication reproduces the published ranking and magnitude. |
| L31 | **Paired designs cut the required sample by roughly three times.** | McNemar uses only discordant pairs. Worked: ~245 paired tasks versus ~712 unpaired for a 10-point effect (chapter 9). | your task set has near-zero discordance, which would make pairing useless. |
| L32 | **A 6-point difference on 50 tasks is not a result.** | Wilson intervals for 34/50 and 37/50 are [54.2, 79.2] and [60.4, 84.1] — overlapping across nearly their whole range. | nothing. This is arithmetic. |
| L33 | **Detectable effect size scales with the square root of your budget.** | halving the detectable difference costs ~4× the runs (chapter 9). | nothing. This is arithmetic. |
| L34 | **Retrieval recall and task outcome anticorrelate past a point.** | more retrieved context raises recall and lowers density; focused prompts beat full prompts containing the same information [S]. | solve rate rises monotonically with retrieved-token count. |
| L35 | **The compaction prompt is a confound in every other experiment.** | varying only the summariser moved SWE-bench 6.5 points [S] — larger than most effects you are trying to measure. | summariser variation produces effects below your noise floor. |
| L36 | **Measuring the input is easier than measuring the outcome, which is why most teams do it.** | tokens and utilisation are directly observable; solve rate and stability require an eval harness. | most published context-management claims report task outcomes rather than token counts. |

## E. Retrieval (L37–L44)

Background: [chapter 5](ch:retrieval).

| # | Lesson | Why it is true | Falsified if |
|---|---|---|---|
| L37 | **Exact beats approximate when exact is available.** | code has computed relevance edges (calls, implements, tests) that embeddings only approximate. | semantic retrieval outperforms symbol-graph traversal on "what calls X" queries. |
| L38 | **Lexical search is a strong baseline, not a fallback.** | identifiers are near-unique and deliberately searchable; grep generally outperformed vector retrieval head-to-head [S]. | vector retrieval beats grep on identifier-known queries in your repository. |
| L39 | **Silent failure is worse than moderate inaccuracy.** | grep returning zero hits redirects the agent; a vector search returning five irrelevant chunks does not. | agents reliably detect and discard low-relevance semantic results without a score threshold. |
| L40 | **Structural blindness is real: keep lexical search alongside structural.** | config, env vars, string-keyed dispatch, CI YAML and schemas are outside the symbol graph, and a large class of bugs lives there. | symbol-graph retrieval alone matches hybrid retrieval on config-caused bugs. |
| L41 | **Expand along the reference graph, not along file adjacency.** | graph adjacency is a strong relevance signal in code; spatial adjacency is weak. | reading neighbouring lines retrieves the decisive code as often as reading callers. |
| L42 | **Pre-load pointers, never content.** | pointers help the agent decide where to look at ~1% of the cost; content substitutes for looking and dilutes. 5K targeted beat 100K summary [P]. | a content pre-load outperforms a pointer seed at matched task difficulty. |
| L43 | **The agent's own edits poison its own retrieved context.** | a file read at turn 5 and edited at turn 30 remains in context as a precise, plausible, obsolete rendering. | models reliably prefer newer file versions over older ones in context without prompting. |
| L44 | **Fix retrieval quality before reducing retrieval volume — but diagnose first.** | starvation and dilution have opposite fixes; applying the volume fix to a recall problem makes it strictly worse. | reducing retrieved context improves outcomes on tasks whose failures were starvation. |

## F. Tools and isolation (L45–L52)

Background: [chapters 7 and 8](ch:sub-agents).

| # | Lesson | Why it is true | Falsified if |
|---|---|---|---|
| L45 | **Tool count harms through two independent channels.** | displacement (prefix tokens) and selection confusion (worse choice among more candidates), which respond to different fixes. | deferring definitions eliminates wrong-tool selection as well as token cost. |
| L46 | **Roughly twenty active tools is a soft ceiling.** | selection accuracy 43% → under 14% with growing count; 19/20 at 20 tools → failure at 107 [S]; practitioner threshold ~20 [P]. | a current model maintains selection accuracy above 90% at 60+ tools. |
| L47 | **Category elimination beats compression.** | progressive disclosure is an order of magnitude (25K → 2.5K [S]); replacing schemas with code execution is two (150K → 2K [S]). | schema compression achieves comparable ratios to code execution. |
| L48 | **Sub-agents are safe when their outputs compose without negotiation.** | actions carry implicit decisions; independent implicit decisions do not compose [P]. Additive work has no implicit decisions to conflict over. | parallel sub-agents reliably produce compatible interlocking implementations without a shared brief. |
| L49 | **If you cannot write the output schema in twenty lines, do not delegate.** | an unspecifiable output means the sub-agent's context held something the contract cannot carry. | delegations with prose-only contracts show re-do rates comparable to schema-specified ones. |
| L50 | **Isolation optimises the parent's context at the expense of total spend.** | each sub-agent re-pays the prefix tax; parent context falls while total rises. | total token spend falls when delegation is introduced. |
| L51 | **Contract loss has no in-session mitigation from the parent's side.** | the sub-agent's context is destroyed on termination; unlike offload, there is nothing to recall — unless you persisted the transcript. | parents reliably recover unreported sub-agent findings without a persisted trace. |
| L52 | **Do not delegate debugging.** | debugging is a chain of dependent inferences, and its most valuable product — the ruled-out hypotheses — dies with the sub-agent. | delegated debugging matches linear debugging on time-to-root-cause. |

## G. Practice and organisation (L53–L58)

Background: [chapter 15](ch:optimisation-plan).

| # | Lesson | Why it is true | Falsified if |
|---|---|---|---|
| L53 | **Measure before you optimise; the large segment is rarely the one you were tuning.** | tool definitions and tool results dominate, while attention goes to instruction files. | first audits typically confirm the team's prior about which segment is largest. |
| L54 | **Deletion is the highest-yield, lowest-risk, most reversible action available.** | zero-invocation tools, dead rules, and unfiltered output are pure waste, not tradeoffs. No behaviour change required, restorable in seconds. | removing zero-invocation tools measurably reduces task success. |
| L55 | **Fix the repository, not the retriever, when the problem recurs.** | a codebase that is hard for an agent to navigate is hard for humans too; deleting `UserServiceV2` beats any retrieval improvement aimed at distinguishing it. | repository clarity improvements show no effect on agent success. |
| L56 | **Reset more often than feels natural.** | the instinct to preserve a long session is a sunk-cost error, and the transcript being preserved is mostly the reason things are going badly. A reset costs ~500 tokens. | task quality is flat with respect to session duration in your workload. |
| L57 | **Context management has a stopping point.** | once cache, tool surface, output shaping and retrieval are handled, the binding constraint moves elsewhere — model choice, decomposition, or the verification loop. | marginal context effort continues to yield measurable gains indefinitely. |
| L58 | **Adopt one change at a time or you will never be able to remove any of them.** | bundled adoption produces unattributable outcomes; the later ablation finds neutral components that now feel risky to delete. | teams that adopt stacks wholesale can, on request, name what each component contributes. |
