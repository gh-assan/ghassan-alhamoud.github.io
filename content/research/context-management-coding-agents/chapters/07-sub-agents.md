## The disagreement, stated fairly

In June 2025 two credible teams published opposite conclusions, one day apart. Most writing since has picked a side instead of finding the axis that separates them.

| | **Position A: Cognition, "Don't Build Multi-Agents"** | **Position B: Anthropic, multi-agent research system** |
|---|---|---|
| Claim | Share full context and full traces, not messages. Actions carry implicit decisions, and conflicting decisions produce bad results [P]. | A lead agent plans and spawns 3–5 parallel [[sub-agent|sub-agents]], then synthesises. Delegation is essential for scaling this kind of task [P]. |
| Evidence | A Flappy Bird clone split across sub-agents. One produced a Super Mario–style background; another produced a bird that neither looked nor moved like the target [P]. | Beat single-agent Claude Opus 4 by **90.2%** on an internal research evaluation [P]. |
| Prescription | Single-threaded linear agents with continuous context | Orchestrator with parallel workers |

**Both are correct**, and treating this as a matter of taste is the mistake.

> [!key] The axis that reconciles them
> Sub-agents are safe when their outputs **compose without negotiation**, and dangerous when they do not.

Research is **additive**: two agents finding two facts gives you two facts, and "union" is the way to combine them. Implementation is **interlocking**: two agents building two components must agree on a hundred unstated conventions, such as error shapes, naming, null handling, logging and what a return value means. Each is an *implicit decision*, made independently, and independent decisions do not compose.

This is a property of the *work*, not of the architecture. That is why the argument cannot be settled in general and is easy to settle for a given task.

<figure class="diagram">
<p class="diagram__title">Delegation depends on the shape of the work</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 300" role="img" aria-labelledby="s1-t">
<title id="s1-t">Read-mostly additive work such as search, surveys and triage is safe to delegate. Work that writes interlocking artifacts, such as shared interfaces, is not.</title>
<rect class="dg-box--info" x="10" y="10" width="340" height="230" rx="10"/>
<text class="dg-k" x="24" y="36">READ-MOSTLY · ADDITIVE</text>
<text class="dg-t dg-t--lg" x="24" y="62">Safe to delegate</text>
<text class="dg-s" x="24" y="92">✓ find all callers of a symbol</text>
<text class="dg-s" x="24" y="114">✓ survey how a pattern is used</text>
<text class="dg-s" x="24" y="136">✓ triage 40 failing tests into buckets</text>
<text class="dg-s" x="24" y="158">✓ audit dependencies for a CVE</text>
<text class="dg-s" x="24" y="180">✓ extract the error pattern from a huge log</text>
<text class="dg-s" x="24" y="210">combine by: union, concatenate, max</text>
<rect class="dg-box--warn" x="370" y="10" width="340" height="230" rx="10"/>
<text class="dg-k" x="384" y="36">WRITES INTERLOCKING ARTIFACTS</text>
<text class="dg-t dg-t--lg" x="384" y="62">Keep in one thread</text>
<text class="dg-s" x="384" y="92">✗ two endpoints sharing an error format</text>
<text class="dg-s" x="384" y="114">✗ a schema and the code that uses it</text>
<text class="dg-s" x="384" y="136">✗ "build the feature", split three ways</text>
<text class="dg-s" x="384" y="158">✗ debugging (the ruled-out ideas die)</text>
<text class="dg-s" x="384" y="180">~ tests for a stable module: cautiously</text>
<text class="dg-s" x="384" y="210">combine by: negotiation (impossible)</text>
<text class="dg-s" x="360" y="272" text-anchor="middle">You can apply this rule in ten seconds, before spending a single token.</text>
</svg>
</div>
<figcaption>Everything on the left reads and adds up. Everything on the right writes pieces that must fit together. That one distinction resolves the public disagreement.</figcaption>
</figure>

## The composability test

Apply it before delegating. Four questions; a "no" to any one means do not parallelise. See [[composability]].

1. **Is the way to combine the outputs trivial?** Can you say in one sentence how they merge: "concatenate the findings", "union the file lists", "take the most severe result"? If combining needs judgment, you have not delegated work. You have deferred an integration problem and made it harder, because the reasoning behind each part is gone.
2. **Can you write the output schema in under 20 lines?** If the result needs prose to explain itself, the sub-agent held something the schema cannot carry, and the parent will need it.
3. **Are the implicit decisions already fixed?** List what the sub-agent must decide that is not in its brief. For a search task: nothing. For "implement the retry logic": backoff strategy, jitter, maximum attempts, which errors are retryable, logging, metric names, where config lives. That is seven decisions another agent might make differently. **Fix them in the brief or do not delegate.** A brief that fixes all seven is dictation, and you have done the thinking anyway. That is not failure. It is recognising that the thinking was the work.
4. **Can the parent verify the result without redoing it?** "Return the file and line where X is defined" takes one read to check. "Return a refactored module" takes a review as careful as writing it. Unverifiable delegation moves work; it does not remove it.

| Work | Q1 | Q2 | Q3 | Q4 | Delegate? |
|---|---|---|---|---|---|
| Find callers, surveys, test triage, CVE audit, log extraction — the figure's safe panel | ✓ | ✓ | ✓ | ✓ | **Yes** |
| Review a diff against a checklist | ✓ | ✓ | ✓ | ~ | **Yes**, with spot checks |
| Apply one fully specified mechanical change to 30 files | ✓ | ✓ | ✓ | ✓ | **Yes** |
| Write tests for a stable module | ~ | ~ | ~ | ✓ | Cautiously |
| Implement two endpoints that share an error format | ✗ | ✗ | ✗ | ✗ | **No** |
| Design a schema and the code that uses it | ✗ | ✗ | ✗ | ✗ | **No** |
| "Build the feature", split three ways | ✗ | ✗ | ✗ | ✗ | **No**: the documented failure [P] |

## What isolation buys, and what it costs

### The benefit is real and specific

[[Isolation]] turns a *large intermediate context* into a *small result*. A survey that reads 45K tokens and concludes in 350 tokens returns under 1% of its context to the parent — chapter 3's [M-9](ch:ten-methods#m-9-sub-agent-isolation-with-a-contract) numbers: about **9K** total tokens isolated versus **15K** accumulating [P].

The parent's context stays clean and dense. It never sees the 40 files that turned out to be irrelevant, so **they never become distractors** for the rest of the session. The benefit is the dilution avoided, not only the tokens saved.

### The cost is larger than usually reported

| Cost | Size | Note |
|---|---|---|
| Prefix tax per sub-agent | 10K–40K each | Segments 1–4 are paid again for every agent |
| Total token multiplier | About 15× a chat for full multi-agent; about 4× for single agents [P] | The cost side of the 90.2% internal-eval gain; usually quoted alone |
| How much raw spend explains | Token usage alone explained **about 80%** of performance variance [P] | Read this carefully: the gain it explains is the 90.2% research-eval result |
| Contract loss | Unbounded | The sub-agent knew things it did not report |
| Latency | Sometimes better (parallel), often worse (round trips) | |
| Debuggability | Much worse | Failures spread across transcripts you must correlate |

The 80% figure deserves a moment. If spend explains most of the gain, **the architecture is largely a way of spending more tokens productively.** The real question becomes whether the same spend used differently (more attempts, a better model, longer single-agent runs) would buy as much. For research tasks, apparently not: parallel exploration genuinely helps. For coding, which is more sequential and interlocking, **there is no comparable published result.** Do not import the research finding into your coding agent without testing it.

### Contract loss

[[Contract loss]] is the failure the parent cannot fix on its own. The sub-agent read a file that revealed the real cause and returned only what was asked. The parent cannot know what it was not told, and when the sub-agent ends, its context is gone.

Mitigations, most effective last:

1. **The "notable observations outside scope" field** from chapter 3's [M-9](ch:ten-methods#m-9-sub-agent-isolation-with-a-contract). Cheap, and it recovers a surprising amount.
2. **Return `file:line` pointers instead of conclusions**, so the parent can re-derive cheaply.
3. **Save the sub-agent's transcript to a file** and give the parent the path. This turns contract loss into [offload](ch:compaction-and-memory#offload-the-pattern-to-reach-for-first): the parent can read it if the summary is not enough. It is the best available answer and rarely done.

## Five topologies

Ordered from least to most isolation.

<figure class="diagram diagram--wide">
<p class="diagram__title">Topologies for coding agents</p>
<div class="diagram__scroll">
<svg viewBox="0 0 900 250" role="img" aria-labelledby="s2-t">
<title id="s2-t">Five topologies: single linear agent, linear agent with disposable scouts, orchestrator with parallel workers, sequential relay, and persistent specialists.</title>
<rect class="dg-box" x="10" y="10" width="165" height="190" rx="10"/>
<text class="dg-k" x="92" y="32" text-anchor="middle">T-1</text>
<text class="dg-t" x="92" y="52" text-anchor="middle">Single linear</text>
<circle class="dg-dot--accent" cx="92" cy="100" r="14"/>
<text class="dg-s" x="92" y="150" text-anchor="middle">interlocking work,</text>
<text class="dg-s" x="92" y="166" text-anchor="middle">debugging</text>
<rect class="dg-box--accent" x="185" y="10" width="165" height="190" rx="10"/>
<text class="dg-k" x="267" y="32" text-anchor="middle">T-2 · DEFAULT</text>
<text class="dg-t" x="267" y="52" text-anchor="middle">Linear + scouts</text>
<circle class="dg-dot--accent" cx="267" cy="100" r="14"/>
<circle class="dg-dot" cx="222" cy="130" r="7"/><circle class="dg-dot" cx="312" cy="130" r="7"/>
<line class="dg-line dg-line--dash" x1="256" y1="110" x2="228" y2="125"/><line class="dg-line dg-line--dash" x1="278" y1="110" x2="306" y2="125"/>
<text class="dg-s" x="267" y="166" text-anchor="middle">most coding work</text>
<rect class="dg-box" x="360" y="10" width="165" height="190" rx="10"/>
<text class="dg-k" x="442" y="32" text-anchor="middle">T-3</text>
<text class="dg-t" x="442" y="52" text-anchor="middle">Orchestrator</text>
<circle class="dg-dot--accent" cx="442" cy="85" r="12"/>
<circle class="dg-dot" cx="395" cy="125" r="8"/><circle class="dg-dot" cx="442" cy="125" r="8"/><circle class="dg-dot" cx="489" cy="125" r="8"/>
<line class="dg-line" x1="435" y1="95" x2="400" y2="118"/><line class="dg-line" x1="442" y1="97" x2="442" y2="117"/><line class="dg-line" x1="449" y1="95" x2="484" y2="118"/>
<text class="dg-s" x="442" y="166" text-anchor="middle">additive research</text>
<rect class="dg-box" x="535" y="10" width="165" height="190" rx="10"/>
<text class="dg-k" x="617" y="32" text-anchor="middle">T-4</text>
<text class="dg-t" x="617" y="52" text-anchor="middle">Relay</text>
<circle class="dg-dot--accent" cx="567" cy="100" r="10"/><circle class="dg-dot--accent" cx="617" cy="100" r="10"/><circle class="dg-dot--accent" cx="667" cy="100" r="10"/>
<line class="dg-line" x1="577" y1="100" x2="605" y2="100"/><line class="dg-line" x1="627" y1="100" x2="655" y2="100"/>
<text class="dg-s" x="617" y="150" text-anchor="middle">clean phases,</text>
<text class="dg-s" x="617" y="166" text-anchor="middle">written handoffs</text>
<rect class="dg-box--warn" x="710" y="10" width="180" height="190" rx="10"/>
<text class="dg-k" x="800" y="32" text-anchor="middle">T-5 · AVOID</text>
<text class="dg-t" x="800" y="52" text-anchor="middle">Persistent specialists</text>
<circle class="dg-dot" cx="760" cy="100" r="10"/><circle class="dg-dot" cx="840" cy="100" r="10"/><circle class="dg-dot" cx="800" cy="135" r="10"/>
<line class="dg-line dg-line--bad" x1="770" y1="100" x2="830" y2="100"/><line class="dg-line dg-line--bad" x1="766" y1="108" x2="794" y2="128"/><line class="dg-line dg-line--bad" x1="834" y1="108" x2="806" y2="128"/>
<text class="dg-s" x="800" y="166" text-anchor="middle">max interlock, max split</text>
<text class="dg-s" x="450" y="232" text-anchor="middle">more isolation →</text>
</svg>
</div>
<figcaption>For coding, T-2 keeps every decision in one thread (satisfying Position A) while isolating the expensive reading (capturing Position B's benefit). T-5 is listed only because it is proposed so often.</figcaption>
</figure>

| Topology | Best for | Fails when |
|---|---|---|
| **T-1 Single linear agent** | Implementation, debugging, anything with interlocking decisions | The task truly exceeds one context and cannot be split in sequence |
| **T-2 Linear agent with disposable scouts** (recommended default) | Most serious coding work in a large repository | Scout contracts are so narrow that the main thread redoes the work |
| **T-3 Orchestrator with parallel workers** | Additive, exploratory work: research, broad audits, multi-repository surveys | Applied to interlocking implementation: the Flappy Bird failure [P]. Budget explicitly for the synthesis step |
| **T-4 Sequential relay** | Long tasks with clean phases: investigate → plan → implement → verify | The handoff is thin. It depends entirely on the plan file and handoff quality |
| **T-5 Persistent specialists** ("frontend agent", "database agent") | Very little in coding | Always: it maximises interlocking decisions *and* context separation. Each specialist drifts its own model of the shared interfaces |

## The boundary problem

Every isolation boundary is a lossy channel. What crosses it is what survives. The four kinds of boundary differ in how much control you have.

```chart
{
  "type": "hbar",
  "title": "How much control you have over what crosses each boundary",
  "categories": ["Session reset with a handoff note", "Sub-agent return with a schema", "Compaction", "Context eviction policy"],
  "series": [{"name": "Control (0 = none, 3 = full)", "values": [3, 2, 1, 0]}],
  "max": 3,
  "tickStep": 1,
  "valueFormat": "{v}",
  "highlight": [0],
  "labelWidth": 230,
  "categoryLabel": "Boundary",
  "caption": "You write a handoff note yourself. You specify a sub-agent's schema. You can only hope a summariser follows yours, and its output varies run to run [D]. An eviction policy firing mid-task gives you no control at all. Illustrative ordinal, not a measured scale [D].",
  "alt": "Session reset: full control. Sub-agent return: high. Compaction: low. Eviction: none."
}
```

This ranking is a strong, under-appreciated reason to prefer resets over compaction that has nothing to do with tokens: **with a reset you author what survives.**

Five principles for designing boundaries:

1. **Make the boundary explicit.** A boundary you did not design, such as an eviction firing mid-task, is one you cannot reason about.
2. **Write the contract before crossing.** Before delegating or resetting, write down what must survive. Writing it changes what you do.
3. **Pointers cross better than prose.** `file:line` survives compression, paraphrase and re-reading. A description of what is at that line does not.
4. **Verification claims must carry their method.** "Tests pass" cannot be checked later. "`pytest tests/checkout -q` → 47 passed, at commit `a3f9c1`" can.
5. **Cross once.** Every extra boundary compounds loss. Two compactions, a delegation and a reset put the original task statement through four lossy channels.

## The sub-agent contract

```markdown title="subagent-contract.md"
## Task
<one sentence>

## Scope
In:  <paths, modules, the question>
Out: <explicitly out of scope>

## Tools available
<the minimum set; narrow tool sets are the main quality lever>

## Fixed decisions (do not re-decide)
- <any convention the parent has already chosen>

## Output schema
findings:
  - path: <file:line>
    what: <one line>
    confidence: high|medium|low
notable_outside_scope:      # the contract-loss mitigation
  - <anything surprising you saw>
transcript_path: <written on exit, so the parent can recall it>

## Limits
max_result_tokens: 1500
max_turns: 25
```

Three fields do the heavy lifting. **Fixed decisions** prevent implicit-decision conflicts. **`notable_outside_scope`** recovers contract loss. **`transcript_path`** turns contract loss into offload. The version with a pre-check is in the [templates appendix](ch:templates#6-sub-agent-contract).

## When not to isolate

- **The task fits comfortably in one context.** All overhead, no benefit.
- **The work interlocks.** Question 3 says no.
- **You cannot verify the result cheaply.** You have moved work, not removed it.
- **Cost is your binding constraint.** Isolation raises total spend by design.
- **You are debugging.** Debugging is a chain of dependent inferences. Splitting it breaks the chain, and the sub-agent's dead ends, the most valuable part of a debugging trace, die with it.
- **The task is short.** Under about 20 turns, the prefix tax dominates.

The last two are the ones people get wrong most often.

## Measuring isolation

| Metric | Formula | Healthy | Detects |
|---|---|---|---|
| Isolation ratio | Sub-agent tokens ÷ result tokens returned | Over 20:1 | Whether isolation earns its keep |
| Parent growth per delegation | Change in parent tokens | Under 2K | Results that are too verbose |
| **Redo rate** | Delegations the parent redid ÷ delegations | Under 0.1 | Contracts that are too narrow |
| Conflict rate | Delegations with incompatible outputs | About 0 | Non-composable work was delegated |
| Total-token multiplier | Total tokens ÷ single-agent baseline | Depends | Whether you bought the 15× without the 90.2%-class gain [P] |
| Outside-scope yield | Notable observations that mattered ÷ delegations | Over 0.1 | Value of the contract-loss field |

The **redo rate** is the most diagnostic. A high value means you pay the full cost of isolation for a fraction of the benefit, and you can measure it by reading five transcripts.
