## Hygiene that is not hygiene

Each antipattern below imitates a legitimate practice. The **tell** is what separates the two. Each entry gives what it looks like, the legitimate version it imitates, the tell, what it costs, and the fix.

The sixteen are grouped by the habit of mind that produces them. There are only three, and fixing a habit prevents its whole family.

<figure class="diagram">
<p class="diagram__title">Three generators, sixteen antipatterns</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 260" role="img" aria-labelledby="ap-t">
<title id="ap-t">Treating the window as a container, adding rather than subtracting, and measuring inputs instead of outcomes generate the sixteen antipatterns.</title>
<rect class="dg-box--accent" x="10" y="10" width="220" height="70" rx="10"/><text class="dg-k" x="24" y="34">GENERATOR 1</text><text class="dg-t" x="24" y="56">The window is a container</text>
<rect class="dg-box--accent" x="250" y="10" width="220" height="70" rx="10"/><text class="dg-k" x="264" y="34">GENERATOR 2</text><text class="dg-t" x="264" y="56">Adding beats subtracting</text>
<rect class="dg-box--accent" x="490" y="10" width="220" height="70" rx="10"/><text class="dg-k" x="504" y="34">GENERATOR 3</text><text class="dg-t" x="504" y="56">Measure inputs, not outcomes</text>
<rect class="dg-box" x="10" y="110" width="220" height="130" rx="8"/>
<text class="dg-s" x="24" y="136">AP-1 The briefing document</text><text class="dg-s" x="24" y="158">AP-2 Just-in-case tooling</text><text class="dg-s" x="24" y="180">AP-10 Middle truncation</text><text class="dg-s" x="24" y="202">AP-12 Correcting in place</text><text class="dg-s" x="24" y="224">AP-13 The heroic session</text>
<rect class="dg-box" x="250" y="110" width="220" height="130" rx="8"/>
<text class="dg-s" x="264" y="136">AP-3 Full-stack adoption</text><text class="dg-s" x="264" y="158">AP-5 Write-only memory</text><text class="dg-s" x="264" y="180">AP-6 The growing instruction file</text><text class="dg-s" x="264" y="202">AP-8 Multi-agent by default</text><text class="dg-s" x="264" y="224">AP-16 The context framework</text>
<rect class="dg-box" x="490" y="110" width="220" height="130" rx="8"/>
<text class="dg-s" x="504" y="136">AP-4 Compaction as hygiene</text><text class="dg-s" x="504" y="158">AP-7 Semantic search as the answer</text><text class="dg-s" x="504" y="180">AP-9 Token counting as success</text><text class="dg-s" x="504" y="202">AP-11 The unread dashboard</text><text class="dg-s" x="504" y="224">AP-14 · AP-15 Borrowed answers</text>
<line class="dg-line" x1="120" y1="80" x2="120" y2="110"/><line class="dg-line" x1="360" y1="80" x2="360" y2="110"/><line class="dg-line" x1="600" y1="80" x2="600" y2="110"/>
</svg>
</div>
<figcaption>If you catch yourself in one antipattern, check its siblings: the same habit is probably producing them too.</figcaption>
</figure>

## The tell index

| AP | Tell |
|---|---|
| [AP-1](#ap-1-the-briefing-document) | The document is prose, not pointers |
| [AP-2](#ap-2-just-in-case-tooling) | More than three tools defined per tool called |
| [AP-3](#ap-3-full-stack-adoption) | You cannot say which change produced which effect |
| [AP-4](#ap-4-compaction-as-hygiene) | Triggered by a threshold or timer, not a task event |
| [AP-5](#ap-5-write-only-memory) | You cannot name a retrieval that changed an action |
| [AP-6](#ap-6-the-growing-instruction-file) | File history shows additions, never deletions |
| [AP-7](#ap-7-semantic-search-as-the-answer) | Grep treated as the fallback, not the workhorse |
| [AP-8](#ap-8-multi-agent-by-default) | No 20-line output schema for the sub-agent |
| [AP-9](#ap-9-token-counting-as-success) | The reported metric is a cost, not an outcome |
| [AP-10](#ap-10-middle-truncation) | The truncation marker sits where the error was |
| [AP-11](#ap-11-the-unread-dashboard) | Nobody can name a decision a metric changed |
| [AP-12](#ap-12-correcting-in-place) | The "fixed" wrong fact returns later in the session |
| [AP-13](#ap-13-the-heroic-session) | More than one compaction |
| [AP-14](#ap-14-optimising-someone-elses-bottleneck) | You overhauled one segment while another was the problem |
| [AP-15](#ap-15-trusting-transferred-benchmarks) | You cite a number you have not reproduced |
| [AP-16](#ap-16-the-context-framework) | More configuration options than measured problems |

## Generator 1: treating the window as a container

If context is a bucket, filling it is free until it overflows, and the only question is "does it fit?". Every antipattern here is what that model recommends. The correction is [chapter 1](ch:foundations#start-with-the-right-mental-model): the window is an attention budget whose useful band depends on the task.

### AP-1: The briefing document

- **Looks like:** a carefully written 40K-token architecture overview loaded at the start of every session, so the agent "understands the system".
- **The real version:** a pointer seed under 2,000 tokens: entry points, invariants, landmines, commands.
- **Tell:** the document is *prose* rather than *pointers*. If it explains instead of locating, this is it.
- **Cost:** 5K targeted retrieval beat a 100K summary [P], and coherent documents retrieve *worse* than incoherent ones across all 18 models [S]. You pay 40K tokens for a well-built distractor that goes stale silently.
- **Fix:** convert it to pointers. "Auth lives in `src/auth/`, entry `session.ts`; all database access via `repo/`" replaces four paragraphs at 3% of the cost. The pointer seed is [chapter 5](ch:retrieval#should-you-seed-the-session-with-a-codebase-overview)'s.

### AP-2: Just-in-case tooling

- **Looks like:** every plausibly useful MCP server attached, because the agent "might need it".
- **The real version:** a curated surface of at most 20 tools matched to the actual work.
- **Tell:** more than three tools defined for every tool called.
- **Cost:** 42K tokens for a single server [P]; selection collapsing from 19 of 20 at 20 tools to failure at 107 [S]. Prompt budget is present on every call, but billing depends on cache hits and request stability.
- **Fix:** delete candidates with zero calls in a representative sample; verify task coverage and keep rollback. The [30-minute audit](ch:tool-surface#the-30-minute-audit) does this systematically.

### AP-10: Middle truncation

- **Looks like:** capping long output by keeping the start and end characters, or worse, only the start.
- **The real version:** head-and-tail truncation, roughly 30/70, with a pointer to the full artifact.
- **Tell:** the truncation marker sits exactly where the error would have been.
- **Cost:** errors and stack traces cluster at the end. The agent reasons about a failure it never saw.
- **Fix:** head-and-tail, plus offload so the full text is one `cat` away ([chapter 3](ch:ten-methods#m-5-output-shaping) owns the truncation rule).

### AP-12: Correcting in place

- **Looks like:** finding a wrong fact in the agent's context and explaining the correction in the next turn.
- **The real version:** resetting to before the poison and restating from clean ground.
- **Tell:** the wrong fact comes back later in the same session after you "fixed" it.
- **Cost:** the wrong fact stays as a permanent distractor, and a compaction may keep the wrong version.
- **Fix:** reset. You cannot delete from a transcript by talking to it ([chapter 12](ch:failure-modes#b-staleness-and-poisoning)'s F-9 carries the containment).

### AP-13: The heroic session

- **Looks like:** an eight-hour session with four compactions, treated as impressive persistence.
- **The real version:** four 90-minute sessions with explicit handoffs.
- **Tell:** more than one compaction.
- **Cost:** degradation compounds [S], rules fade, distraction dominates, and every turn is priced against a nearly full window. Quality falls just as your sunk-cost commitment rises.
- **Fix:** mechanical caps that need no judgment in the moment: one compaction, or two hours ([chapter 3's M-10](ch:ten-methods#m-10-session-lifecycle)).

## Generator 2: adding instead of subtracting

Adding is visible and feels like work. Deleting looks like doing nothing. So instruction files grow, memory accumulates, frameworks get built and stacks get adopted wholesale. The evidence is lopsidedly pro-subtraction: masking beats summarising at equal solve rate [S], fewer tools beat more [S], 5K beats 100K [P]. The incentives are lopsidedly pro-addition. **The correction is to make removal a reported result**: an ablation that deletes a component is a finding, not an admission.

### AP-3: Full-stack adoption

- **Looks like:** reading a guide, this one included, and implementing all ten methods in a week.
- **The real version:** measure, find the binding constraint, fix one thing, measure again.
- **Tell:** you cannot say which change produced which effect. Asked what the offload layer bought you, the answer is a shrug.
- **Cost:** outcomes nobody can attribute, complexity nobody can revert, and permanent maintenance for parts that may do nothing.
- **Fix:** one change at a time. The [routing table](ch:choosing-methods#step-2-route-by-your-binding-constraint-5-minutes) picks the first.

### AP-5: Write-only memory

- **Looks like:** a memory system with thousands of entries, growing steadily, demoed enthusiastically.
- **The real version:** a small curated memory with a measured read path.
- **Tell:** you cannot say how many retrievals *changed an action* last week.
- **Cost:** always-loaded prefix tokens, curation time, and stale entries that are confidently wrong without failing loudly.
- **Fix:** instrument retrievals that changed an action. Under one a week, delete the system. Move durable knowledge into [[ADR|ADRs]]. The memory architecture is [chapter 6](ch:compaction-and-memory#cross-session-memory)'s.

### AP-6: The growing instruction file

- **Looks like:** every incident adds a rule; the file reaches 400 lines; nothing is ever removed.
- **The real version:** at most 150 lines of rules that cannot be inferred, pruned as often as extended.
- **Tell:** monotone growth. If the file's history has no deletions, this is it.
- **Cost:** dilution, position effects as utilisation rises [S], and contradictions between rules written months apart.
- **Fix:** the [inference test](ch:anatomy#how-to-act-on-each-segment) on every line. Turn repeatedly violated rules into hooks, lints or tests. Text that is not followed is not a control.

### AP-8: Multi-agent by default

- **Looks like:** splitting every non-trivial task across parallel sub-agents.
- **The real version:** one linear thread with disposable read-only scouts, delegating only composable work.
- **Tell:** you cannot write the sub-agent's output schema in 20 lines.
- **Cost:** about 15× the tokens [P] — the cost side of the 90.2% internal-eval gain; individually coherent, mutually incompatible outputs [P]; debugging across fragmented transcripts.
- **Fix:** the [composability test](ch:sub-agents#the-composability-test).

### AP-16: The context framework

- **Looks like:** building an in-house context-management framework with policies, plugins and configuration before establishing that context is the bottleneck.
- **The real version:** four shell scripts, an ignore file, a pruned tool list and a plan-file convention.
- **Tell:** the framework has more configuration options than you have measured problems.
- **Cost:** maintenance forever, a layer that makes debugging harder, and decisions frozen before you had data.
- **Fix:** check whether context is still your binding constraint ([the stop rule](ch:optimisation-plan#the-stop-rule)). Most wins in this research are deletions and shell scripts, not architecture.

## Generator 3: measuring the input instead of the outcome

Tokens, utilisation and index size are easy to measure. Solve rate, stability and cost per solved task are hard. So teams optimise what they can see and are surprised when it does not help. The correction is [chapter 9](ch:evaluation), and above all the insistence on k ≥ 2, because the harm you are least able to see is the one your measurement design excludes.

### AP-4: Compaction as hygiene

- **Looks like:** compacting often to "keep the context clean", as routine maintenance.
- **The real version:** compacting at sub-goal boundaries, at most once per session, after offloading.
- **Tell:** compaction is triggered by a token threshold or a timer, not a task event.
- **Cost:** mid-task firing [S], termination recognition collapsing to 44.6% (AppWorld) [S], +0.108 errors at the next step [S], Pass² damage larger than accuracy damage [S], and a financial saving that only breaks even after about four turns [C] (chapter 10).
- **Fix:** semantic triggers with suppression rules; cap at one; then reset. The trigger design space is [chapter 6](ch:compaction-and-memory#the-compaction-design-space)'s.

### AP-7: Semantic search as the answer

- **Looks like:** an embedding index over the codebase as the primary retriever.
- **The real version:** live lexical and structural search first; semantic search as a complement.
- **Tell:** grep is treated as the fallback rather than the workhorse.
- **Cost:** grep generally won head-to-head [S]; the index is stale about exactly the code you edited; five plausible irrelevant chunks look identical to success.
- **Fix:** invert the order. The hybrid result, +12.5% over either alone [P], says the answer is *both*, in the right order. The tier architecture is [chapter 5](ch:retrieval)'s.

### AP-9: Token counting as success

- **Looks like:** a dashboard trending tokens down, celebrated as progress.
- **The real version:** cost per solved task, with cache-adjusted cost and Pass².
- **Tell:** the reported metric is a cost, not an outcome.
- **Cost:** in the [worked example](ch:metrics-and-economics#cost-per-solved-task), the over-compressed configuration had the lowest total cost and the second-worst cost per solved task.
- **Fix:** report tokens per solved task and Pass². Optimising an input is how you get a cheap agent that does not work.

### AP-11: The unread dashboard

- **Looks like:** forty context metrics, collected, charted and never acted on.
- **The real version:** four or five numbers reviewed monthly, each with a decision attached.
- **Tell:** nobody can name a decision any given metric has ever changed.
- **Cost:** the collection effort, plus the false confidence that "we measure this".
- **Fix:** delete every metric with no attached decision. Keep the [five](ch:metrics-and-economics#if-you-track-only-five).

### AP-14: Optimising someone else's bottleneck

- **Looks like:** adopting a technique from a blog post whose author had a different binding constraint.
- **The real version:** measure, find *your* largest controllable segment, act on that.
- **Tell:** you overhauled retrieval while 25% of your context was unused tool definitions.
- **Cost:** effort on a segment that was not the problem, and the opportunity cost of the one that was.
- **Fix:** thirty minutes of measurement before any technique ([chapter 4](ch:choosing-methods#step-1-measure-30-minutes)).

### AP-15: Trusting transferred benchmarks

- **Looks like:** adopting a retrieval or compaction strategy because a published comparison favoured it.
- **The real version:** using published results for the *shape* of the answer, then re-running on your harness.
- **Tell:** you cite a number you have not reproduced.
- **Cost:** scores depended strongly on which of four harnesses ran, on identical data [S]. The published ranking may invert on your setup.
- **Fix:** treat external results as hypotheses. The [minimum viable experiment](ch:evaluation#the-minimum-viable-experiment) is 160 runs.

Audit yourself against the sixteen once a quarter; the same three generators produce all of them, and the [diagnostic](ch:diagnostic) tells you which is active.
