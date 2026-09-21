## Reading rules

Five rules were applied to every source. They explain how much weight each number in this research can carry.

| Rule | What it means |
|---|---|
| **R1: Vendor claims are upper bounds** | Any number a vendor or project reports about its own product is labelled [P] and treated as a best case unless a method is published. This covers every figure in [the tooling chapter](ch:tooling). |
| **R2: Papers carry their benchmark** | A compaction result on a 147-task API benchmark is not automatically a result on your monorepo. Every [S] figure is quoted with its benchmark; transfer to other workloads is stated as inference. |
| **R3: Long-context findings transfer to agents only by inference** | Almost all long-context research uses static text. An agent's context is a growing transcript containing its own reasoning and errors, plausibly worse, but not measured. |
| **R4: Harness-confounded results are flagged** | Where a result depends on which agent harness ran it, that is stated, because harness effects can exceed the effect under study [S]. |
| **R5: Numbers are quoted, not rounded into slogans** | "43% → under 14%", not "accuracy collapses". |

Labels are applied to claims that carry a number or could be contested. They are not applied to definitions, to this research's own frameworks (the nine segments, the five forces, starvation as a failure mode), or to conclusions restated from a labelled claim in the same chapter.

## Long-context research

### Chroma, "Context Rot: How Increasing Input Tokens Impacts LLM Performance"

- **Supports:** degradation on every model tested (18 models, four vendors, 8 input lengths, 11 needle positions); the effect of question–answer similarity; distractors compounding non-uniformly; **coherent text retrieving worse than shuffled text** across all 18 models; the focused (~300 tokens) versus full (~113K) LongMemEval gap.
- **Discount:** static retrieval tasks, not agent trajectories. Rule R3 applies to every use.
- **Used in:** [chapter 1](ch:foundations#the-evidence-every-model-degrades-with-length), [chapter 5](ch:retrieval#nine-ways-code-retrieval-goes-wrong), [lessons A](ch:lessons).
- **Link:** [trychroma.com/research/context-rot](https://www.trychroma.com/research/context-rot)

### Long-context benchmarks: RULER, LongBench-v2, multi-needle retrieval

- **Supports:** the gap between effective and advertised context length; the difficulty of long-context tasks (LongBench-v2 human baseline 53.7%, leading models in the low 60s).
- **Discount:** constructions vary; scores are not comparable across suites.
- **Used in:** [chapter 1](ch:foundations#advertised-length-is-not-effective-length).

### Positional-attention ("lost in the middle") research

- **Supports:** the U-shaped attention pattern under ~50% utilisation, its collapse into recency dominance above it, and more than 30% degradation for mid-context placement.
- **Discount:** the size of the effect depends on model and task.
- **Used in:** [chapter 1](ch:foundations#position-two-regimes).

## 2026 agent-context papers

### "Toward Reliable Context Compression for Long-Horizon Agents: An Empirical Study of Execution Instability" (TRACE)

- **Supports:** the AppWorld table (no compression 85.7% / 77.4% Pass²; verifier-guided 77.1% / 67.3%; prompt-based 71.4% / 59.5%; FIFO 63.7% / 53.0%); **the Pass@2/Pass² gap widening under tighter budgets**; correct termination 44.6% versus 77.2% at 2K; +0.108 blocked or error actions at the first step after compaction.
- **Discount:** one benchmark (147 API tasks) and specific model pairings. The *direction* transfers; the magnitudes may not.
- **Used in:** [chapter 6](ch:compaction-and-memory#result-2-compression-damages-reliability-before-accuracy), [chapter 9](ch:evaluation#pass-k-worked), [case CS-4](ch:case-studies#cs-4-compression-that-hurt-reliability-more-than-accuracy-s).
- **Link:** [arXiv 2608.06503](https://arxiv.org/abs/2608.06503)

### "Addressable Recall Compaction for Long Context-Window Control in AI Agents" (ARC)

- **Supports:** the five-baseline comparison; needle 99.00% / 99.80% versus RAG 79.57% / 96.67%; LongBench-v2 Hard 27.47% / 32.47% versus 25.83% / 30.87%; 38.8–80.3% bandwidth savings; the statement that omitted summary details cannot be recovered.
- **Discount:** 8B and 32B models, not frontier scale. The reasoning margin is small; do not overstate it.
- **Used in:** [chapter 3](ch:ten-methods#m-6-reversible-offload), [chapter 6](ch:compaction-and-memory#result-4-lossless-addressable-compaction-beats-every-lossy-baseline).
- **Link:** [arXiv 2607.25066](https://arxiv.org/abs/2607.25066)

### "CompactionRL: Reinforcement Learning with Context Compaction for Long-Horizon Agents"

- **Supports:** **the summariser-only swing, SWE-bench 49.0% → 55.5%**; +5.5 / +7.0 on SWE-bench Verified and +6.8 / +3.1 on Terminal-Bench 2.0 from compaction-aware training; operating parameters (10,240-token threshold, at most 3 compactions per run, at most 250 turns).
- **Discount:** the training results need access most readers lack. The 6.5-point swing at inference time does not.
- **Used in:** [chapter 6](ch:compaction-and-memory#result-1-the-summariser-alone-is-worth-several-points), [case CS-3](ch:case-studies#cs-3-swapping-only-the-summariser-moved-swe-bench-65-points-s).
- **Link:** [arXiv 2607.05378](https://arxiv.org/abs/2607.05378)

### "Self-Compacting Language Model Agents" (SelfCompact)

- **Supports:** rubric-gated self-triggered compaction (fire on sub-task resolution or convergence; hold off mid-derivation or when stuck); the failure of both reactive and periodic triggers; preservation of verified facts that fixed-interval compaction destroys.
- **Discount:** the rubric is one instantiation.
- **Used in:** [chapter 6](ch:compaction-and-memory#result-6-semantic-triggering-beats-both-naive-triggers).
- **Link:** [arXiv 2606.23525](https://arxiv.org/abs/2606.23525)

### "The Complexity Trap: Simple Observation Masking Is as Efficient as LLM Summarization for Agent Context Management"

- **Supports:** masking matching LLM summarisation on SWE-bench solve rates across two model sizes at substantially lower cost; preferring simple methods first.
- **Discount:** the numeric detail was captured from the paper's summary rather than a full read. **Re-verify before citing externally.**
- **Used in:** [chapter 6](ch:compaction-and-memory#result-5-simple-masking-is-competitive-with-summarisation).
- **Link:** [arXiv 2508.21433](https://arxiv.org/abs/2508.21433)

### "Is Grep All You Need? How Agent Harnesses Reshape Agentic Search"

- **Supports:** grep generally beating vector retrieval on 116 LongMemEval-derived questions; **four harnesses** compared, inline versus file-based results; overall scores depending strongly on harness and tool-calling style on identical data; eight surveyed agents using the model as a navigator over shell tools.
- **Discount:** the questions are conversational-memory shaped, not repository shaped. The harness finding transfers more confidently than the grep-versus-vector ranking.
- **Used in:** [chapter 5](ch:retrieval#the-question-posed-correctly), [case CS-7](ch:case-studies#cs-7-grep-beat-embeddings-and-the-harness-beat-both-s).
- **Link:** [arXiv 2605.15184](https://arxiv.org/abs/2605.15184)

### Token economics of tool-heavy agents (including arXiv 2606.10209)

- **Supports:** input tokens at 99.75–99.87% of total usage; full context at 2.68× the tokens of the best managed method with fewer tasks completed.
- **Discount:** tool-heavy workloads specifically; ratios differ for chat.
- **Used in:** [chapter 2](ch:anatomy#segment-6-tool-results), [chapter 10](ch:metrics-and-economics#the-four-line-cost-model).
- **Link:** [arXiv 2606.10209](https://arxiv.org/abs/2606.10209)

## Practitioner engineering writing

### Anthropic, "Effective context engineering for AI agents"

- **Supports:** just-in-time retrieval with lightweight identifiers; progressive disclosure; metadata as a relevance signal; compaction keeping decisions and unresolved bugs while discarding redundant output.
- **Discount:** first-party, describing its own products. Read for mechanism.
- **Used in:** [chapter 3](ch:ten-methods#m-3-just-in-time-retrieval).

### Anthropic, multi-agent research system write-up

- **Supports:** the orchestrator-worker architecture; **90.2%** over single-agent Opus 4 on an internal research evaluation; about **15×** chat tokens (agents about 4×); **about 80%** of performance variance explained by token usage.
- **Discount:** research tasks, not coding; an internal evaluation; first-party. The 15× and 80% must always be quoted with the 90.2%.
- **Used in:** [chapter 7](ch:sub-agents#the-disagreement-stated-fairly), [case CS-2](ch:case-studies#cs-2-the-research-system-that-beat-one-agent-by-90-p).

### Cognition, "Don't Build Multi-Agents"

- **Supports:** share full traces, not messages; actions carry implicit decisions; the Flappy Bird failure; single-threaded linear agents.
- **Discount:** first-party, arguing for its own architecture. The failure description is the durable content.
- **Used in:** [chapter 7](ch:sub-agents#the-disagreement-stated-fairly), [case CS-1](ch:case-studies#cs-1-the-sub-agents-that-built-different-games-p).

### LangChain, write / select / compress / isolate, and Deep Agents

- **Supports:** the four-operation taxonomy; filesystem offload; compression middleware.
- **Discount:** framework-specific implementation details.
- **Used in:** [chapter 1](ch:foundations#the-operations-you-can-perform-on-context).

### Sourcegraph, context-engineering guidance

- **Supports:** **5K of targeted retrieval beating a 100K codebase summary** on identical coding tasks; the subtraction default; reserving headroom.
- **Discount:** [P]. The comparison's full method was not available, and the page returned HTTP 403 during research, so figures were captured from search summaries. Its direction is corroborated by the focused-versus-full result above. **Re-verify before citing externally.**
- **Used in:** [chapter 3](ch:ten-methods#m-3-just-in-time-retrieval), [chapter 5](ch:retrieval#should-you-seed-the-session-with-a-codebase-overview).

### Drew Breunig, "How Long Contexts Fail"

- **Supports:** the poisoning, distraction, confusion and clash taxonomy, now the field's shared vocabulary.
- **Discount:** a taxonomy, not a measurement. This research adds starvation as a fifth mode.
- **Used in:** [chapter 1](ch:foundations#five-ways-context-fails).
- **Link:** [dbreunig.com](https://www.dbreunig.com/2025/06/22/how-contexts-fail-and-how-to-fix-them.html)

### Tool-count degradation reporting

- **Supports:** 43% → under 14% as tool count grows; 19 of 20 at 20 tools → failure at 107; the ~20-tool practitioner threshold; the ~42,000-token single-server figure.
- **Discount:** mixed [S] and [P]. The strength is two independent methods converging near 20; individual figures are weaker.
- **Used in:** [chapter 8](ch:tool-surface#the-measured-damage).

### Progressive disclosure and code-execution reporting

- **Supports:** ~25,000 → ~2,500 tokens for descriptions versus definitions; **150,000 → ~2,000 (98.7%)** for code execution; 99%+ on definitions at 112 tools; an independent 98% production report on a GitHub MCP server.
- **Discount:** first-party and community reports; no independent reproduction found.
- **Used in:** [chapter 8](ch:tool-surface#three-architectures), [case CS-6](ch:case-studies#cs-6-removal-as-the-answer-code-execution-s).

### Prefix-caching operational reporting

- **Supports:** 85.2% hit rate with ~46,059 tokens reused per request; 90% hit rate giving sub-200 ms time to first token and 80–90% compute savings; byte-exact prefix matching.
- **Discount:** [P], specific to particular serving stacks. The relative prices in chapter 10 are generic shapes, not any provider's rate card.
- **Used in:** [chapter 1](ch:foundations#force-4-the-cache), [chapter 10](ch:metrics-and-economics).

### AGENTS.md and instruction-file practice

- **Supports:** 30+ tools reading it; 60,000+ repositories; Agentic AI Foundation stewardship; the ≤150-line guidance; ~4% success improvement from human-written context files.
- **Discount:** [P] throughout. The 4% figure has no published method.
- **Used in:** [chapter 2](ch:anatomy#segment-3-project-instruction-files).

### Open-source tooling documentation

- **Supports:** the tooling catalogue; the 60–90% and 98% output-reduction claims; symbol-level operations; language coverage.
- **Discount:** self-reported, none reproduced here. Audit before installing.
- **Used in:** [chapter 18](ch:tooling).

## Verification caveat

Primary sources were read directly for the load-bearing claims: the compaction cluster (TRACE, ARC, CompactionRL, SelfCompact), the masking comparison, the agentic-search harness study and the context-rot study. **Several supporting figures were captured from abstracts, search summaries or secondary coverage** instead of a full read, and one source (Sourcegraph) could not be accessed directly.

Figures in that category:

- the Sourcegraph 5K-versus-100K comparison
- the observation-masking numeric detail
- the ~42,000-token single-server figure
- the 43% → 14% and 19/20 → failure tool-count figures
- the AGENTS.md adoption and ~4% figures
- the 85.2% / 46,059-token prefix-cache figures
- every percentage in the tooling chapter

**Re-verify any of these before citing them externally.** None is the only support for a load-bearing conclusion; each is corroborated in direction by at least one [S] source.

## What would prove this research wrong

Six observations would materially undermine the conclusions. Each is cheap to test on your own workload, which is the point of stating them.

1. **A frontier model with flat performance to about 80% of its window** on a distractor-rich task. That would undercut the attention-budget framing and much of the subtraction default.
2. **A controlled study where Pass² degrades no faster than mean accuracy under compression.** That would remove the variance-first finding and make single-run evaluation legitimate again.
3. **A retrieval ranking that replicates across three independent harnesses with similar margins.** That would weaken the harness-confound rule and make published comparisons transferable.
4. **A current model keeping over 90% tool-selection accuracy at 60+ tools.** That would remove the ~20-tool ceiling and most of the urgency in chapter 8.
5. **Parallel sub-agents reliably producing compatible interlocking implementations without a shared brief.** That would invalidate the composability test.
6. **Total token spend falling when delegation is introduced.** That would change the isolation economics entirely.
