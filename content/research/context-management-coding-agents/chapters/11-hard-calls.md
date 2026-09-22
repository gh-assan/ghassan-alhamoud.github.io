## How to use this chapter

Twenty-five decisions come up again and again with no clean answer. Each one below gives the tension, the honest case for both sides, a recommendation, and **the conditions that flip it**. The flip conditions are what make these re-decidable when your model, harness or repository changes.

Start with the summary table. Open the section for any call you are facing.

| # | The call | Recommendation | Flips when |
|---|---|---|---|
| SP-1 | Pre-load or discover? | Discover, with a pointer seed under 2K tokens | The repository fits comfortably |
| SP-2 | Compact or reset? | Reset, if you have a plan file | No person and no handoff mechanism |
| SP-3 | Static or dynamic tools? | Static, hand-pruned; deferred where supported | No prefix caching, or very short sessions |
| SP-4 | Delegate or stay linear? | Delegate read-only, additive work only | Cost is no object and latency is |
| SP-5 | Semantic index or live search? | Live lexical and structural first | Poor naming and no language server |
| SP-6 | Summarise or mask? | Mask observations, summarise reasoning | The reasoning trace is the artifact |
| SP-7 | One instruction file or many? | Root ≤150 lines, scoped files ≤50 | The harness loads every file anyway |
| SP-8 | Filter output or keep it all? | Filter hard, but redirect, never delete | You cannot write files |
| SP-9 | Optimise tokens or cache? | Cache first, then tokens | No prefix caching |
| SP-10 | Long sessions or short? | Short, with strong handoffs | No checkpointable boundaries |
| SP-11 | Memory tool or repository? | Repository first | Knowledge spans repositories or environments |
| SP-12 | Model-directed or policy compaction? | Model-directed with a policy backstop | You cannot expose a compaction tool |
| SP-13 | Optimise the common case or the tail? | Cheap prevention always; heavy machinery on the tail | All work is long-horizon |
| SP-14 | Verbatim or paraphrase in summaries? | Paraphrase narrative; exact strings verbatim | Nothing: close to a rule |
| SP-15 | Better retrieval or less retrieval? | Diagnose starvation versus dilution first | Never: the diagnosis comes first |
| SP-16 | Standardise the team or let people tune? | Standardise repository artifacts; leave session habits personal | A team of one |
| SP-17 | Fresh or inherited context for sub-agents? | Fresh, plus a brief with fixed decisions | The sub-task needs a long chain of parent reasoning |
| SP-18 | Instrument everything or stay light? | Four numbers, reviewed monthly | While running an experiment |
| SP-19 | Fix it in the agent or the repository? | Agent now; repository when it recurs | You do not own the repository |
| SP-20 | Fixed pipeline or agentic search? | Agentic, over cheap deterministic tools | A narrow, repetitive task class |
| SP-21 | Include the design document? | Not pre-loaded; fetched for intent questions | The task *is* about intent |
| SP-22 | Cap utilisation or use the whole window? | Soft cap 60%, act at 75% | One task genuinely needs more |
| SP-23 | Tune for this model or stay agnostic? | Agnostic structure, model-specific parameters | You control a model that will not change |
| SP-24 | Ship the improvement or measure first? | Tier by reversibility | Measurement is already cheap for you |
| SP-25 | Index the wiki or dereference it? | Dereference, never index | The wiki is genuinely maintained |

## Loading and retrieval

### SP-1: Pre-load or discover

**Tension.** Pre-loading maximises recall and costs density. Discovery maximises density and risks starvation.

- **For pre-loading:** the agent cannot search for a subsystem it does not know exists. Human-written context files improved success by about 4% [P].
- **For discovery:** 5K targeted beat a 100K summary [P]; focused ~300-token prompts beat ~113K full ones [S]; full context cost 2.68× and completed fewer tasks [S].

**Recommendation.** Discover, with a **pointer seed under 2,000 tokens**: entry points, invariants, landmines, build commands. Pre-load *where to look*, never *what is there*.

**Flips when** the repository fits comfortably (pre-load it all; the density penalty is small), or the agent has no filesystem access.

### SP-5: Semantic index or live search

**Tension.** Embeddings answer concept questions; they go stale and fail silently.

- **For:** finds code when you do not know the vocabulary; hybrid reported at +12.5% [P].
- **Against:** grep generally won head-to-head [S]; the index is wrong about the code you just edited; it returns plausible results for questions with no answer.

**Recommendation.** **Live lexical and structural search first; semantic search as an optional complement**, preferably over prose (ADRs, PRs, design documents) rather than code.

**Flips when** the codebase has poor naming and no language-server support, or users mostly ask concept questions ("how do we do auth?") instead of location questions.

### SP-15: Better retrieval or less retrieval

**Tension.** Both reduce waste, with opposite failure modes.

- **For quality:** structural retrieval cuts waste without cutting information.
- **For volume:** simpler, immediate, and directly attacks dilution.

**Recommendation.** **Diagnose first.** Classify your last 10 failures: decisive file never read (a recall problem: improve quality, do not reduce volume) or read and ignored (a precision problem: reduce volume). Applying the volume fix to a recall problem makes things strictly worse, and it is the most common misdiagnosis in this space.

**Flips:** never. The diagnosis is the recommendation.

### SP-20: Fixed pipeline or agentic search

**Tension.** Fixed pipelines are predictable and cheap. Agentic search adapts and costs turns.

**Recommendation.** **Agentic, over cheap deterministic tools.** The agent decides *what* to search; `ripgrep` and the language server decide *how*. Eight surveyed agents already use the model as a navigator over shell tools [S].

**Flips when** the task class is narrow and repetitive, like a triage bot for one kind of bug.

### SP-21: Include the design document or not

**Tension.** Design documents explain intent the code does not. They are also unusually effective distractors.

- **Against including:** coherent text retrieves *worse* than shuffled text across all 18 models [S], and design documents are often out of date: confidently wrong.

**Recommendation.** **Do not pre-load design documents.** Fetch them for questions about *intent*. Treat the code as the authority on *behaviour*.

**Flips when** the task *is* about intent, such as an architecture review. Then load it deliberately and say why.

### SP-25: Index the wiki or dereference it

**Tension.** Years of organisational prose exist. Indexing it takes a weekend and makes it all searchable.

- **For indexing:** the content is real and often exists nowhere else.
- **Against:** a wiki has no CI. Its error rate rises with age, and the pages most likely to be retrieved describe the exact module you are working on in your exact vocabulary: the top of the distractor-damage curve [S]. Bulk indexing manufactures plausible wrong answers [D].

**Recommendation.** **Dereference, never index.** Allow fetch by name or URL; disable autonomous wiki search; treat fetched pages as hypotheses. Then run the [one-time migration](ch:compaction-and-memory#the-wiki) and **replace each migrated page with a link to its new home.**

**Flips when** the wiki is genuinely maintained: review dates, owners, and a sampled false rate under about 10%. That is rare, so measure before assuming. It also flips for content with no code home, such as on-call rotations and team ownership.

## Compression and state

### SP-2: Compact or reset

**Tension.** Compaction keeps continuity, lossily and cheaply. A reset loses continuity but restores a clean, high-attention context.

- **For compaction:** no person needed; the agent keeps going.
- **For a reset:** compaction is lossy, breaks the cache, damages state recognition (44.6% versus 77.2% correct termination) [S] and raises errors at the next step (+0.108) [S]. A reset lets you *author* what crosses the boundary.

**Recommendation.** **Reset, if you have externalised state.** At most one compaction per session; needing a second means the session should have ended.

**Flips when** no person is present and no handoff mechanism exists, or session start-up is unusually expensive in your harness.

### SP-6: Summarise or mask

**Tension.** Summaries keep meaning in prose; [[masking]] keeps structure and costs nothing.

- **For masking:** comparable solve rates at lower cost [S]; no extra model call, no blocking, no laundering of hypotheses into facts.

**Recommendation.** **Mask observations, summarise reasoning.** Masking is the baseline any summariser must beat, and a surprising number do not.

**Flips when** the reasoning trace *is* the artifact, such as a long investigation whose conclusions matter more than its steps. Summarise then, with an explicit schema.

### SP-8: Filter output hard or keep full fidelity

**Tension.** Filtering saves enormously; it can hide the decisive line.

**Recommendation.** **Filter aggressively, but redirect instead of deleting.** Full output to a file, digest to context, path included. Passing runs get one line; failing runs get the full trace.

**Flips when** you cannot write files. Then filter conservatively and truncate head-and-tail.

### SP-12: Model-directed or policy compaction

**Tension.** Model-directed compaction adapts. Policy compaction is predictable, and does not depend on the model's judgment late in a long session, which is exactly when compaction is needed.

**Recommendation.** **Model-directed with a policy backstop.** Give the model a compaction tool and an explicit rubric (fire on closure or convergence; hold off mid-derivation or when stuck) [S], plus a high threshold that fires only if the model never does.

**Flips when** you cannot expose a compaction tool. Then use a policy triggered by observable boundaries such as a passing test or a commit.

### SP-14: Verbatim or paraphrase in summaries

**Tension.** Verbatim keeps precision and costs tokens; paraphrase compresses about 10:1.

**Recommendation.** **Paraphrase narrative aggressively; keep exact strings verbatim, always.** "An assertion error in the checkout tests" cannot be acted on. `AssertionError: expected 3, got 0 at test_checkout.py:214` can.

**Flips:** essentially never. The only real question is which fields count as exact.

### SP-11: Memory tool or repository

**Recommendation.** **Repository first.** An [[ADR]] beats a memory entry: versioned, reviewed, discoverable, repaired with the code. Use a memory system only for facts with no repository home, capped at about 40 always-loaded lines plus a searchable tier.

**Flips when** knowledge spans repositories, or the facts are about the *environment* (staging quirks, VPN requirements, flaky infrastructure) rather than the code.

## Sessions and topology

### SP-4: Delegate or stay linear

- **For delegating:** 9K versus 15K tokens on a multi-domain query [P]; 90.2% gain on research tasks [P].
- **Against:** about 15× the tokens [P]; spend alone explained about 80% of the variance [P]; conflicting implicit decisions produce unusable composites [P].

**Recommendation.** Delegate **read-mostly, additive** work only. Apply the [composability test](ch:sub-agents#the-composability-test). If the output schema does not fit in 20 lines, do not delegate.

**Flips when** cost is no constraint and latency is, or the work is embarrassingly parallel, like one fully specified change to 30 files.

### SP-10: Long sessions or short ones

- **For long:** tacit understanding no handoff captures.
- **For short:** performance generally falls as input grows [S]; position effects can bury rules; every turn pays for the whole history.

**Recommendation.** **Short sessions with strong handoffs.** Cap at one compaction or about two hours, whichever comes first.

**Flips when** the task has no checkpointable boundaries. Usually the better fix is a better handoff.

### SP-17: Fresh or inherited context for sub-agents

**Tension.** Fresh contexts are clean but pay the prefix tax again. Inherited contexts share understanding and the parent's noise.

**Recommendation.** **Fresh context plus a brief that lists the decisions the sub-agent must not re-make.** It captures most of the benefit of inheritance, and naming the implicit decisions is where the value is.

**Flips when** the sub-task depends on a long chain of parent reasoning that no brief can carry. That is a signal the work is not isolatable.

### SP-22: Cap utilisation or use the whole window

- **For a cap:** performance can degrade as input grows, but the curve and any position effect are model- and task-dependent [S].
- **For the full window:** you paid for it.

**Recommendation.** **Use 60% as a soft operating cap and 75% as an escalation point.** Above 60%, prefer offload and resets. This is a workload heuristic, not a universal reliability threshold.

**Flips when** one task genuinely needs more, such as a large file that must be read whole. Take the hit deliberately and reset right after.

## Cost and measurement

### SP-3: Static or dynamic tool surface

- **For dynamic:** attacks a 40K+ prefix directly.
- **For static:** a dynamic set changes the prefix per task and collapses the cache hit rate. The [worked example](ch:ten-methods#m-1-prefix-stability) turned a 24% token cut into a 6.9× cost increase.

**Recommendation.** **Static and hand-pruned:** reach 20 tools by deletion, not selection logic. Where the harness supports deferred definitions (stable descriptions, schemas fetched on use), that is the best of both.

**Flips when** your provider does not cache, or sessions are too short to amortise it.

### SP-9: Optimise tokens or the cache

**Recommendation.** **Cache first, tokens second.** Establish a stable prefix, then minimise within it. Measure [[cache-adjusted cost]], never raw tokens.

**Flips when** there is no prefix caching, or sessions are single-turn.

### SP-13: Optimise the common case or the tail

**Recommendation.** **Cheap always-on prevention** (tool minimisation, output shaping) for everything, since it costs nothing on short sessions. **Heavy machinery** (offload, compaction policy, sub-agents) only when a session crosses a length or utilisation threshold.

**Flips when** all your work is long-horizon. Then make the heavy machinery the default.

### SP-18: Instrument everything or stay light

**Recommendation.** **Four numbers, reviewed monthly**: prefix tax, relevance density, retention integral, cache hit rate. Add post-compaction re-fetch if you compact. Four numbers acted on beat forty ignored.

**Flips when** you are running an experiment. Then instrument the variable under test heavily, and temporarily.

### SP-23: Tune for this model or stay model-agnostic

**Recommendation.** **Agnostic structure, model-specific parameters.** The structure (stable prefix, offload, semantic compaction, plan file) transfers. The numbers (utilisation cap, compaction threshold, output cap) are parameters to re-tune per model. Keep them in one config block.

**Flips when** you control the model and it will not change.

### SP-24: Ship the improvement or measure it first

Measurement is expensive: a 5-point effect needs about 1,471 tasks per arm unpaired. Shipping unmeasured accumulates changes nobody can attribute.

| Change class | Action |
|---|---|
| Pure waste removal: dead tools, ignore files, quiet flags | **Ship unmeasured.** The mechanism is deletion; the risk is near zero |
| Structural and reversible: offload, plan file, session caps | Ship with monitoring; check the four numbers after two weeks |
| Behaviour-changing: retrieval strategy, compaction schema, topology | **Measure**: paired, k = 2, at least 40 tasks |
| Anything claiming a quality gain | Measure, or say explicitly that it is unmeasured |

**Flips when** your evaluation harness already exists. Then measure everything; the marginal cost is low and the data compounds.

## Organisation

### SP-7: One instruction file or many

**Recommendation.** **A root file of at most 150 lines for global invariants; scoped files of at most 50 lines next to the code they govern.** Specialist rules then arrive when they are relevant, not three hours early.

**Flips when** your harness loads every file regardless of scope (then you have made it worse), or the team will not maintain several files. One maintained file beats five stale ones.

### SP-16: Standardise the team or let individuals tune

**Recommendation.** **Standardise the repository artifacts** (instruction files, ignore files, tool surface, output shaping) and **leave session habits personal** (when to reset, how to open). The first is shared context; the second is personal workflow.

**Flips when** the team is one person, or you are debugging a team-wide regression (standardise everything temporarily to isolate it).

### SP-19: Fix it in the agent or in the repository

**Recommendation.** **Agent-side for the immediate problem, repository-side for the recurring one.** If the agent keeps confusing `UserService` with `UserServiceV2`, the fix is not a better retriever. **It is deleting `UserService`.** A codebase that is easy for an agent to navigate is easy for people too.

**Flips when** you do not own the repository, or the change is too large to justify. Then agent-side is all you have. Say so.

## The pattern behind all twenty-five

Read the recommendations together and a pattern appears. **Almost all of them lean toward reversibility, explicitness and staying in the model's good regime. Almost none lean toward cleverness.**

<figure class="diagram">
<p class="diagram__title">What the recommendations prefer</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 300" role="img" aria-labelledby="h1-t">
<title id="h1-t">The recommendations consistently prefer deleting over selecting, redirecting over filtering, resetting over compacting, pointing over copying, verbatim over paraphrase, static over dynamic, dereferencing over indexing, and fixing the repository over the retriever.</title>
<text class="dg-k" x="170" y="22" text-anchor="middle">PREFER</text>
<text class="dg-k" x="550" y="22" text-anchor="middle">OVER</text>
<g>
<rect class="dg-box--accent" x="70" y="34" width="200" height="26" rx="6"/><text class="dg-t" x="170" y="52" text-anchor="middle">delete</text><rect class="dg-box--ghost" x="450" y="34" width="200" height="26" rx="6"/><text class="dg-s" x="550" y="52" text-anchor="middle">select</text>
<rect class="dg-box--accent" x="70" y="66" width="200" height="26" rx="6"/><text class="dg-t" x="170" y="84" text-anchor="middle">redirect</text><rect class="dg-box--ghost" x="450" y="66" width="200" height="26" rx="6"/><text class="dg-s" x="550" y="84" text-anchor="middle">filter away</text>
<rect class="dg-box--accent" x="70" y="98" width="200" height="26" rx="6"/><text class="dg-t" x="170" y="116" text-anchor="middle">reset</text><rect class="dg-box--ghost" x="450" y="98" width="200" height="26" rx="6"/><text class="dg-s" x="550" y="116" text-anchor="middle">compact again</text>
<rect class="dg-box--accent" x="70" y="130" width="200" height="26" rx="6"/><text class="dg-t" x="170" y="148" text-anchor="middle">point</text><rect class="dg-box--ghost" x="450" y="130" width="200" height="26" rx="6"/><text class="dg-s" x="550" y="148" text-anchor="middle">copy</text>
<rect class="dg-box--accent" x="70" y="162" width="200" height="26" rx="6"/><text class="dg-t" x="170" y="180" text-anchor="middle">verbatim</text><rect class="dg-box--ghost" x="450" y="162" width="200" height="26" rx="6"/><text class="dg-s" x="550" y="180" text-anchor="middle">paraphrase</text>
<rect class="dg-box--accent" x="70" y="194" width="200" height="26" rx="6"/><text class="dg-t" x="170" y="212" text-anchor="middle">static</text><rect class="dg-box--ghost" x="450" y="194" width="200" height="26" rx="6"/><text class="dg-s" x="550" y="212" text-anchor="middle">dynamic</text>
<rect class="dg-box--accent" x="70" y="226" width="200" height="26" rx="6"/><text class="dg-t" x="170" y="244" text-anchor="middle">dereference</text><rect class="dg-box--ghost" x="450" y="226" width="200" height="26" rx="6"/><text class="dg-s" x="550" y="244" text-anchor="middle">index</text>
<rect class="dg-box--accent" x="70" y="258" width="200" height="26" rx="6"/><text class="dg-t" x="170" y="276" text-anchor="middle">fix the repository</text><rect class="dg-box--ghost" x="450" y="258" width="200" height="26" rx="6"/><text class="dg-s" x="550" y="276" text-anchor="middle">tune the retriever</text>
</g>
<line class="dg-line" x1="285" y1="160" x2="435" y2="160"/>
<text class="dg-s" x="360" y="150" text-anchor="middle">reversible, explicit</text>
<text class="dg-s" x="360" y="178" text-anchor="middle">beats clever</text>
</svg>
</div>
<figcaption>Context management is a loss problem, and the dominant strategy in a loss problem is to avoid irreversible operations, not to perform them more skilfully.</figcaption>
</figure>

That is not conservatism. It falls out of the mechanics in [chapter 1](ch:foundations). Every irreversible operation you can turn into a reversible one is worth more than any improvement to how well you perform the irreversible version.
