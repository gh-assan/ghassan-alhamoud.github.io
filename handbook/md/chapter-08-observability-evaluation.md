# Chapter 8: Observability & Evaluation — Knowing What Your Agent Did, and Whether It Was Any Good

**Reading time:** 31 min | **Last revised:** 2026-08-18 | **Version:** 1.2

## If You Only Read One Section
Observability and evaluation are two different loops, and conflating them is how agents ship broken. Observability answers *what did the agent do?* — traces, spans, events, and the audit trail. Evaluation answers *was it any good?* — test sets, rubrics, scores, and verdicts against a standard. You need both, but they should not become one undifferentiated system: telemetry records reality; evaluation applies judgment, and the two have different schemas, costs, failure modes, and owners. The practical rule that carries the rest of the chapter: **trace model calls, tool calls, observations, state transitions, and decisions with stable correlation IDs; evaluate distinct, reproducible situations; and report run-to-run variation separately from quality.** If you do only one thing, put a small, representative golden set into CI before the agent gets near production. That gate is worth more than a warehouse of dashboards nobody acts on.

## Prerequisites
- [Chapter 1: The ReAct Pattern](/handbook/chapter-01-react-pattern.html) — the Thought/Action/Observation loop is the atomic unit you trace.
- [Chapter 3: The Reflection Pattern](/handbook/chapter-03-reflection.html) — the Generator-Critic loop is evaluation in miniature; the critic's rubric is your first LLM-as-judge.
- [Chapter 5: Tool Use and Skill Registries](/handbook/chapter-05-tool-use-skill-registry.html) — tool calls are the highest-signal telemetry events, and idempotency keys are what make replay safe.
- [Chapter 6: Memory & Context Management](/handbook/chapter-06-memory-context-management.html) — retrieval quality is a component eval, and provenance is what makes a trace auditable.
- [Chapter 7: Human-in-the-Loop](/handbook/chapter-07-human-in-the-loop.html) — approvals, denials, and escalations are audit events; evaluating whether your gates actually improve outcomes is this chapter's job.

---

Monday, 09:14. Your support agent has been live for three weeks. It passed every demo, aced the hallway test, and closed real tickets in week one. This morning a customer forwards you a thread where the agent confidently refunded the wrong order, cited a policy that doesn't exist, and then — asked to explain itself — produced a plausible-sounding summary that left out the two failed tool calls that led it there.

You open the logs and find the problem: you can see *that* the agent called the refund tool, but not *why*, not what it observed before deciding, not which retries failed silently. And you have no way to know whether this is a one-off or a pattern, because you never measured the agent against anything except vibes. The demo worked; production has no ground truth.

This chapter is about building the two systems that answer the two questions the demo never asked: **what did it do, and was it any good?**

![HDBK-008 observability and evaluation architecture](/images/handbook/HDBK-008-observability-evaluation.webp)
*Figure 1: Observability reconstructs what happened; evaluation judges cases against a standard. Production failures become regression tests that connect the two loops.*

## 1. The Two Loops — Observability and Evaluation

### They Are Not the Same System

| | Observability | Evaluation |
|---|---|---|
| **Question** | What did the agent do? | How well did it do it? |
| **Object** | Real production traffic, every request | Curated samples against a standard |
| **Schema** | Traces, spans, events, timestamps | Test cases, rubrics, scores, verdicts |
| **Judgment** | None — records reality | Explicit — compares to ground truth |
| **Runs** | Continuously, on everything | On change, on sampled traffic, on drift |
| **Failure mode** | Missing/ambiguous events, broken correlation | Test-set contamination, judge bias, eval gaming |

The reason to keep them separate is practical, not aesthetic. Telemetry must be **low-overhead enough for broad coverage** and **complete enough to reconstruct control flow without collecting unnecessary content**. Evaluation can spend more on carefully built cases, repeated runs, and calibrated graders, so it runs on selected slices at the right time. If you try to make telemetry judge, you get a dashboard that says "confidence: 0.7" with no standard behind it. If you run expensive evaluation on all traffic, you burn money scoring obvious cases and can bury the rare hard one in noise.

The two loops meet in one place: **the development loop.** You trace to find a failure, you encode that failure as a test case, you add the test to the gate, and you never regress on it again. Observability finds the hole; evaluation fills it.

Keeping the two loops separate is a statement about **schema and ownership**, not a prohibition on data flow. Telemetry is the raw material evaluation consumes: a drift detector (Section 6) scores a sample of production traces, and a canary compares a new agent against live traffic. That is not conflation. Conflation is storing traces and verdicts in one undifferentiated blob, or judging *inside* the telemetry path itself. Feed telemetry into evaluation freely; just never blur the boundary between *what happened* and *how good it was.*

### "It Worked in My Demo" Is Not Evidence

The demo is an *existence proof*: it shows the agent *can* do the thing on one lucky trajectory. It says nothing about whether the agent *reliably* does the thing across the distribution of situations it will actually face. A model that passes your demo and fails 9 out of 10 real cases is not "90% almost there" — it is broken, and the demo actively misled you.

The antidote is a **golden set**: a curated, versioned collection of representative cases with expected outcomes or scoring rules. Run deterministic cases once and repeat only the cases whose model or environment can vary enough to affect a release decision. The golden set is not a benchmark you run once and screenshot. It is a maintained test asset that grows from real failures and gates changes. Everything in Sections 3–6 is about building and using it correctly.

## 2. Agent Telemetry — Tracing the Loop

### The Trace Model

A single user request produces a nested structure. Naming it once, consistently, is the single highest-leverage telemetry decision you will make:

```
session                         ← one conversation or workflow
  └─ trace                     ← one agent turn or run
       ├─ span: model_call       ← request, response metadata, usage
       ├─ span: tool_call        ← one tool operation with duration
       │     ├─ event: request     (name, redacted args, operation key)
       │     └─ event: result      (status, redacted result, latency)
       ├─ event: context_update  ← what entered working context
       └─ event: decision        ← chosen next step or final outcome
```

A **span** is an operation with a duration, such as a model or tool call. An **event** is a point-in-time occurrence, such as a state transition, approval, retry, or result attached to a span. Spans nest; events attach to trace context — keep them distinct. This mirrors OpenTelemetry's general model, but GenAI semantic conventions are still evolving, so version the convention your instrumentation implements instead of treating today's attribute names as permanent. Multi-agent systems add cross-agent links (Chapter 4), while Plan-and-Execute agents add a plan span whose steps fail independently (Chapter 2). This trace is the atomic core they build on.

Three rules make this model actually useful:

1. **Every span carries a trace ID and span ID; non-root spans carry a parent span ID or explicit link.** Add a domain request or operation ID when one user intent may cross multiple traces. Correlation turns a pile of records into a connected execution graph.
2. **Record governed tool inputs and outputs, not just the tool name.** A log line that says `tool=refund status=ok` cannot explain why the tool acted on the wrong order. Capture a redacted or tokenized representation under an explicit content-capture policy.
3. **Record the observation that entered context, not only the raw tool result.** The model may receive a truncated, summarized, filtered, or cached form. Store a content hash and transformation metadata by default; retain payload content only when policy permits it.

```python
def trace_event(trace_id, span_id, parent_span_id, sequence, kind, payload, ts=None):
    return {
        "trace_id": trace_id,
        "span_id": span_id,
        "parent_span_id": parent_span_id,
        "sequence": sequence,       # producer-local order; spans/links model concurrency
        "kind": kind,               # model_call | tool_call | context_update | decision
        "ts": ts or now_iso(),      # useful across services; not sufficient for ordering
        "payload": payload,
    }

# Tool-call span carries a governed request/result pair:
tool_span = trace_event(
    trace_id, span_id, parent_model_span_id, sequence=7, kind="tool_call",
    payload={
        "function": "refund_order",
        "args": {"order_id": "tok_order_7f2", "amount_euro": 41.00},
        "operation_id": "op_refund_01J5...",  # stable across retries
        "result": {"status": "ok", "refund_id": "tok_refund_91a"},
        "latency_ms": 840,
        "content_capture": "tokenized-v2",
    },
)
```

The stable operation ID is not decorative (Chapter 5). It lets a shadow replay replace side-effecting tools with safe fakes and deduplicate accidental retries. Reconstructing the situation also requires the prompt and policy versions, requested and returned model identifiers, tool-definition hash, memory or retrieval snapshot IDs, sampling parameters, and provider response metadata. Record a sampling seed only when the provider supports one, and treat it as best effort: hosted inference can still vary. The honest promise is **input reconstruction**, not byte-identical token reproduction.

### What to Record on Every Loop

The ReAct loop (Chapter 1) has a natural per-iteration shape. Capture at minimum:

| Event | Fields | Why It Matters |
|---|---|---|
| **Model call** | prompt/policy versions, requested and returned model, parameters, response ID, usage | To identify the exact configuration that produced the next action |
| **Action** | tool name, governed args, stable operation ID, policy decision | To reproduce or safely simulate the call and validate authorization |
| **Observation** | status, latency, content hash, transformation metadata, optional governed payload | To know what entered context rather than assuming it matched the raw result |
| **Decision** | chosen next step, public rationale or planner record when explicitly emitted | To evaluate the observable choice and state transition |
| **Outcome** | completion status, side effects, retries, token/currency cost | To catch loops, duplicate effects, latency, and budget breaches |

Two boundaries matter:

- **Do not invent access to hidden reasoning.** Some providers expose a public rationale or reasoning summary; others return opaque reasoning state. Even when text is exposed, research shows it may not faithfully describe the mechanism that produced the answer. Log explicitly emitted summaries as model output, not as ground truth. Evaluate the observable action against the allowed or expected action set.
- **Distinguish raw from as-observed content.** Context truncation and summarization (Chapter 6) silently reshape what the model sees. When policy allows full capture, label both forms and the transformation between them. Otherwise store hashes, source IDs, truncation ranges, and compactor versions.

### Telemetry Is a Privacy and Cost Liability

Recording everything is a privacy bill and a cost bill, and the two requirements — "cheap" and "lossless" — pull against each other. "Cheap enough to run on every request" and "lossless enough to reconstruct the decision" cannot both be literally true at full fidelity; resolve the tension with three controls:

1. **Redact before you store.** Tool arguments, prompts, observations, outputs, and human rationales can carry PII, secrets, and customer data. Redact or tokenize at the instrumentation boundary so sensitive content never reaches the general trace store.
2. **Tier your capture.** Log lean events broadly: span names, statuses, latency, usage, hashes, versions, and IDs. Enable full-fidelity content only for an authorized sample or incident workflow. Failure-triggered capture must still obey consent, residency, and retention policy.
3. **Retain with a policy.** Telemetry carrying customer data is regulated data. Set a retention window, an access-control list, and a deletion path, and treat the trace store like any other store you would be unhappy to leak.

The rule of thumb: **capture enough to debug, redact what you would not want in a breach report, and sample the expensive stuff.**

### Telemetry Is the Audit Trail

Chapter 7 ended with a promise: every approval, denial, and escalation is an audit event. In the telemetry model, human decisions are first-class events on the same trace:

```python
audit_event = trace_event(
    trace_id, span_id, parent_gate_id, sequence=12, kind="human_decision",
    payload={
        "gate": "external_write:refund",
        "decision": "approve",            # approve | deny | revise | expire
        "actor_ref": "staff_tok_7f2",     # resolvable only by authorized auditors
        "reason_code": "LOW_VALUE_VERIFIED",
        "proposal_id": "PROP-2241",       # links back to what was asked
    },
)
```

This is what makes oversight measurable rather than theatrical. Six months later, you can join `human_decision` events to `refund_order` outcomes and compare error, delay, revision, and escalation rates by gate policy. The join shows association, not causation: risk-based gates intentionally receive harder cases. To ask whether a gate *reduced* bad refunds, use a safe randomized rollout, stepped-wedge release, or a risk-adjusted comparison with explicit assumptions. That analysis is evaluation (Section 3), running on top of observability.

## 3. The Evaluation Pyramid

Evaluation is not one thing; it is three questions at three altitudes. Conflating them is the second most common mistake (after conflating observability and evaluation).

| Level | Question | Unit | Method | Cost / Signal |
|---|---|---|---|---|
| **Component** | Does this *part* work? | Single capability | Deterministic checks + small judges | Low cost, high precision, narrow scope |
| **Task** | Does the *agent* complete the job? | End-to-end trajectory | Golden set + judge + rubric | Medium cost, the real measure |
| **System** | Does the *product* get better? | Business outcome | A/B, user metrics, human review | High cost, the only thing that pays |

### Component Evals

Before you evaluate the whole agent, evaluate its parts in isolation, because a component failure contaminates every downstream signal and is a nightmare to localize after the fact:

- **Tool calling** — given a prompt, does the agent emit the right tool with the right arguments? This is frequently *verifiable*, so use a deterministic checker (exact/typed match, JSON-schema validation), not an LLM judge. Only fall back to a judge for open-ended argument semantics.
- **Retrieval** (Chapter 6) — given a query, does it fetch the right chunks? Evaluate precision and recall against a labeled retrieval set; this is classic IR evaluation and needs no LLM at all.
- **Compaction / summarization** — after compressing context, does the compacted context still support the correct answer? Test the *compactor* against the same golden set you use for the full agent.
- **Memory writes** — do records land with correct provenance, status, and supersession? Deterministic checks against the memory schema.

Component evals are the ones you run on every commit, because they are fast and their failures are unambiguous.

### Task Evals

The task eval runs the full agent on a trajectory and scores the outcome. This is the heart of the golden set. A task case is a *situation* — a starting state, an instruction, and an expected result — not a single message. The agent starts in the situation, runs its loop, and is scored on where it ended up and how it got there.

### System Evals

The system eval asks whether the agent made the *product* better: resolution rate, refund error rate, churn, revenue, time-to-resolution. These are slow, noisy, and the measures that ultimately matter to the business. The trap is to treat a good task-eval score as proof of a good system outcome. They are correlated but not identical: an agent can pass every task in the golden set and still make the product worse because it is too slow, surprises users, shifts work to another queue, or erodes trust in a way no test case captures. Monitor system metrics continuously and evaluate causal impact at an appropriate cadence, but do not expect a top-line metric to identify which component regressed — that is what the lower levels are for.

Attribution is the hard part. When churn drops 2%, you want to know *why*, and a system metric alone cannot tell you. Join outcomes to telemetry by system version and case slice, then use a randomized experiment or an explicit quasi-experimental design when causality matters. A simple before/after comparison can be confounded by seasonality, traffic mix, policy changes, or concurrent releases. The system metric says *whether an outcome moved*; task and component evals help localize which part of the agent plausibly contributed.

## 4. Building a Test Set That Isn't Theater

Most agent test sets are theater: a handful of happy-path examples, sampled from the same distribution the model already aced, scored pass/fail on a single run. They pass forever and tell you nothing. A test set that earns its place obeys five rules.

### Rule 1: The Unit Is a Seeded Situation, Not a Prompt

The primary evaluation unit is a **distinct seeded situation** — a specific starting state with specific entities, faults, and confounders — not a bare prompt repeated with different wording. "Refund order 1001" is a prompt. "Refund order 1001 where the customer has two open orders, the item was already partially shipped, and the payment was split across two cards" is a situation.

Each situation should be **seeded** so that it is reproducible: a fixed initial state (database rows, account balances, message history) from which the agent starts every time. Without a seed, two runs of "the same" test are not the same test, and your scores are comparing different worlds.

### Rule 2: Vary Entities, Faults, and Confounders — Independently

Build the set as a cross-product, not a grab bag:

- **Entities** — different orders, customers, accounts, documents, each with realistic attributes.
- **Faults** — missing data, malformed input, contradictory evidence, tool failures, timeouts.
- **Confounders** — plausible distractors: an old order with the same ID prefix, a policy that was updated last week, a similarly-named customer.

A case that combines an entity, a fault, and a confounder is where agents actually break. Happy paths saturate fast; the signal is in the collisions.

### Rule 3: Report Stochastic Variance Separately

First, a naming trap: this rule's "seed" is the *sampling seed* — when a provider exposes one — not the "seeded situation" from Rule 1 (the fixed initial state). Two different concepts, two different jobs: Rule 1 fixes the *world*; repeated inference estimates run-to-run variation.

The same situation can produce different results because of sampling, parallel tool scheduling, nondeterministic infrastructure, or a changed model/backend version. A pinned model snapshot reduces one source of change; it does not make the whole agent deterministic. The cardinal sin is to run a variable case once and report a universal claim:

- **Repeat cases where variance can change the decision.** Use different provider-supported seeds or independent runs and report the outcome distribution. Keep fast deterministic checks single-run.
- **Report variance as variance.** "Passed 7/10 samples" is data. "Passed" (on the one lucky sample) is theater.
- **Report uncertainty with the estimate.** A pass rate without its sample count or interval hides how little you know. Compare candidates on paired cases and use a predeclared practical margin, not just a noisy mean.

**Aggregate in CI, don't serialize.** Repeated runs do not have to be a bottleneck. Run independent samples in parallel, store per-run results, and aggregate in the gate. Reserve higher sample counts for variable or decision-critical slices; stable cases need fewer runs.

This matters doubly for any task with a score distribution: if the agent emits a *distribution* over possible answers — the right behavior when the task is genuinely ambiguous — score the whole distribution (e.g., log-loss / Brier score on the correct label), not just whether the argmax was right. A confident wrong answer and a hesitant wrong answer are different failures, and a scalar pass/fail erases the difference.

### Rule 4: Include Adversarial and Edge Cases

A test set with no adversarial cases is a comfort blanket. Add, where they match the system's threat model:

- **Boundary cases** — exactly at the threshold (€50 refund, 500-token context, 10-step limit).
- **Negatives** — cases where the correct answer is *no* (do not refund, do not escalate, do not act).
- **Adversarial inputs** — prompt-injection attempts, contradictory instructions, and the classic "ignore previous instructions." Evaluate whether the agent *resists* them, not just whether it handles the happy path.
- **Holdout cases** — unpublished situations outside the development set, to catch optimization against familiar fixtures.

### Rule 5: Keep the Test Set Out of the Training Set

Test-set contamination — the system has been optimized on the cases it is supposed to be measured against — silently inflates scores. With hosted foundation models you usually cannot know every pretraining example, so control the surfaces you own:

- **Version the set and its provenance.** Know when each case was added and from where.
- **Separate development, regression, and holdout slices.** Do not put the holdout answers into prompts, fine-tuning data, or optimization loops.
- **Add fresh production failures after fixing them**, while retaining an unpublished slice for honest release decisions.
- **Prefer parameterized situations over verbatim prompts.** Varying state, entities, faults, and confounders tests behavior instead of string recall.

### A Worked Example

The refund case from the opening, formalized as a seeded situation:

```json
{
  "case_id": "refund-0041",
  "situation": {
    "seed": {
      "orders": [
        {"id": "ORD-8841", "status": "partially_shipped", "total": 41.00},
        {"id": "ORD-8842", "status": "delivered", "total": 41.00}
      ],
      "payments": [
        {"order": "ORD-8841", "cards": ["****1234", "****5678"], "split": [20.00, 21.00]}
      ],
      "customer": {"id": "CUS-117", "history": "no prior refunds"}
    },
    "instruction": "Customer says they were double-charged for ORD-8841. Resolve.",
    "entity": "ORD-8841",
    "fault": "payment split across two cards",
    "confounder": "ORD-8842 has the same total and a similar ID"
  },
  "expected": {
    "action": "refund_only",
    "amount": 41.00,
    "order": "ORD-8841",
    "must_not": ["refund ORD-8842", "refund 82.00"]
  },
  "scoring": {
    "primary": "exact_match_on_action_and_target",
    "fallback": "judge_rubric_refund"
  }
}
```

Every rule is at work here: the **seed state** fixes the world, the **entity / fault / confounder** make it a real case rather than a prompt, and the **expected result** includes what must *not* happen — the negative space happy-path tests omit. If repeated runs are warranted, report both the result and the denominator: "9/10 refunded only ORD-8841," not merely "passed."

## 5. LLM-as-Judge Done Right

Sometimes there is no deterministic checker — "is this refund explanation correct and appropriately worded?" has no exact answer. Then you use an LLM as a judge. Done badly, the judge is the weakest link in the pipeline and you have merely moved the uncertainty around. Done well, it is a force multiplier. The discipline is the same as any measurement: control the bias, define the scale, and validate the instrument.

### Use a Rubric, Not a Vibe

A judge that returns "8/10" with no criteria is a vibe machine. The rubric decomposes the target quality into scored, observable dimensions:

```
Correctness   — is the answer factually right, given the ground truth?   (0-3)
Completeness  — does it address every part of the instruction?           (0-2)
Groundedness  — is every claim traceable to the provided context?        (0-3)
Concision     — is it appropriately brief, no filler?                    (0-1)
Tone          — is it appropriately polite and on-brand?                 (0-1)
```

A machine-parseable version, so a harness can consume it without re-typing:

```json
{
  "rubric_id": "refund-explain-v1",
  "dimensions": [
    {"key": "correctness", "label": "Correctness", "max": 3,
     "anchors": {"3": "factually right vs ground truth", "0": "hallucinates a fact"}},
    {"key": "completeness", "label": "Completeness", "max": 2,
     "anchors": {"2": "addresses every part", "0": "misses a required part"}},
    {"key": "groundedness", "label": "Groundedness", "max": 3,
     "anchors": {"3": "every claim traceable to context", "0": "unsupported claim"}},
    {"key": "concision", "label": "Concision", "max": 1},
    {"key": "tone", "label": "Tone", "max": 1}
  ]
}
```

Each dimension gets anchors (for example, "3 = every claim is verifiable in context; 0 = at least one material claim is unsupported"). Anchors improve consistency, but do not guarantee that two judges or two runs use the scale identically. A rubric score is a quality measurement, not automatically the agent's probability of being correct. Use it for escalation only after validating that the chosen threshold predicts the failure you care about; otherwise it is confidence theater.

### Pointwise vs. Pairwise

- **Pointwise** — score a single output against the rubric. Cheap, absolute, but subject to the judge's scale drift (a "3" today is not a "3" tomorrow).
- **Pairwise** — present two outputs and ask which is better. More robust to scale drift, because it only asks for a relative judgment. More expensive, because it needs a comparison partner.

The practical rule: **use deterministic or pass/fail graders for hard gates, calibrated pointwise scores for trend monitoring, and pairwise comparison for choosing between candidates.** Pairwise is especially useful for prompt, model, and canary comparisons, where the question is literally "is the new one better than the old one?" For pairwise judging, swap answer order and require consistent preference or record a tie.

### Control the Known Biases

LLM judges have systematic, well-documented biases. Control the big four:

| Bias | Symptom | Control |
|---|---|---|
| **Position bias** | Judge prefers the first (or last) answer | Randomize order; or run pairwise both ways and require agreement |
| **Self-preference** | Judge may favor outputs from itself or related models | Blind model identity; test cross-family judges; calibrate every chosen judge against human labels |
| **Verbosity bias** | Longer answers score higher | Add a concision dimension; or score length-neutral criteria |
| **Leniency / severity drift** | Judge's scale creeps over time | Anchor the rubric; periodically re-anchor against a fixed set of human-labeled cases |

### Calibrate the Judge Before You Trust It

A judge is a measurement instrument, and you don't trust an instrument you haven't validated. Before relying on LLM-as-judge scores:

1. **Collect a held-out labeled set.** Use qualified reviewers, clear instructions, and multiple labels for ambiguous or high-impact dimensions.
2. **Measure human-human agreement first.** If reviewers disagree, the task or rubric may be underspecified; a model cannot repair an undefined standard.
3. **Score the same set with the judge** and use a metric appropriate to the output: accuracy/F1 for classes, rank correlation for orderings, or agreement by rubric dimension.
4. **Investigate disagreement.** The cause may be the rubric, judge, missing evidence, label noise, or genuine ambiguity. Refine the instrument or route that slice to human review.
5. **Track calibration over time.** Pin the judge and rubric versions, then re-run the labeled set whenever either changes and periodically while they remain in use.

### When Not to Use a Judge

The most important skill with LLM-as-judge is knowing when to refuse it:

- **Verifiable tasks** — if the answer can be checked with a schema, execution, exact target, invariant, or authoritative reference, use that evidence. An LLM judge adds cost and uncertainty.
- **High-stakes, low-volume decisions** — use qualified human review or domain-specific verification unless a validated automated control meets the required risk tolerance.
- **Claims without sufficient evidence** — a judge asked whether medical, legal, or financial content is correct cannot reliably grade facts it was not given the authority and evidence to verify.

### Resist Eval Gaming

Evaluation creates an incentive, and incentives create gaming. Watch for:

- **Overfitting to the rubric** — the agent learns to hit scored dimensions while ignoring the task. Counter: keep the production rubric stable for comparability, maintain hidden holdout cases, and periodically test whether the rubric still predicts human and system outcomes.
- **Threshold splitting** — the agent splits one disallowed action into several just-below-threshold actions to dodge a rule (the same pattern as approval gaming in Chapter 7). Counter: evaluate on *aggregates*, not per-call.
- **Stale-time tricks** — the agent exploits a stale snapshot or an extended validity window to "pass" a case it shouldn't. Counter: enforce freshness gates in the harness itself, and **never extend action validity just to help the model pass.**
- **Silent fixture fallback** — in a shadow environment, a model that fails may quietly fall back to a deterministic "fixture brain" that always passes. Counter: record *which* component answered, and flag any trajectory where the scored output didn't come from the system under test.
- **Reward hacking** — the RLHF/RLAIF cousin of eval gaming: the agent maximizes the learned reward signal while degrading the true objective. The structural lesson is the same as everywhere else in this chapter: any proxy that can be gamed will be. Treat every eval metric as a proxy for the real goal, and re-anchor it against ground truth periodically.

## 6. Evaluation-Driven Development

Evaluation is not a report you generate at the end; it is the gate every change passes through. Wire it into the loop:

### The CI Regression Gate

Every behavior-changing change — prompt, tool, model, routing rule, memory policy, guardrail, or judge — should run the relevant eval slices in CI. Use a tiered gate: fast deterministic component checks on every commit, representative task evals before merge, and broader repeated or adversarial runs before release. Hard safety invariants may require 100% pass; stochastic quality metrics need paired comparisons, uncertainty estimates, and a predeclared tolerance.

```
push → build → component evals (fast, deterministic)
              → task evals (reproducible situations, paired by case)
              → regression gate: invariants + slice floors + tolerated delta
              → merge or block
```

Concretely, the gate is a little logic around the scores, not a flowchart:

```yaml
# eval-gate.yml (concept)
gate:
  baseline: golden-set-v17@agent-v2.4.0
  candidate: golden-set-v17@agent-v2.4.1
  rules:
    - hard_invariant: "no_wrong_order_refund"
      required_pass_rate: 1.0
    - slice: "refund_edge_cases"
      min_pass_rate: 0.95
    - metric: "paired_task_success_delta"
      min_acceptable_delta: -0.02
      confidence: 0.95
    - metric: "p95_cost_per_success"
      max_relative_increase: 0.10
  on_fail: block
```

The `baseline` is the point. A gate without a comparison target is just a score. Run baseline and candidate on the same case version, keep per-run evidence, and block on declared invariants or meaningful slice-level regressions — not on one noisy case moving from pass to fail once. Thresholds in the example are illustrative; derive yours from the harm, traffic, sample size, and cost of false promotion versus false rejection.

### Version the Dataset and the System Together

An eval result is only meaningful against a *known* dataset version and a *known* system version. If both change, run a comparison matrix — baseline and candidate on the same old and new slices — so a score movement can be attributed. Treat the whole evaluated system as versioned artifacts:

- **Dataset version** — `golden-set v17` (added 3 adversarial refund cases; retired 2 contaminated cases).
- **System version** — agent code, prompt, policy, tool schemas, retrieval index, model, judge, and rubric versions.

Store the version tuple with every score so any result can be reconstructed or, at minimum, explained.

### Canary Evaluation

Before a change goes to everyone, route a slice of traffic through it and compare:

1. **Start in shadow mode** when the agent can create side effects. Replay or mirror production inputs through stubbed or isolated tools so evaluation cannot refund, send, delete, or deploy.
2. **Route a risk-appropriate slice** to the live canary only after offline and shadow gates pass. The percentage and duration depend on traffic, harm, and the sample needed to decide.
3. **Score baseline and candidate** against the same rubric and traffic slice — pairwise when appropriate — while keeping model identity blinded from the judge.
4. **Compare system outcomes and guardrail metrics** — resolution rate, error rate, refund mistakes, latency, escalation load, and cost — not just task scores.
5. **Promote, hold, or roll back** using predeclared criteria. A canary is the last safety net, not the first.

The canary is where the two loops finally converge: telemetry (Section 2) feeds real traffic into evaluation (Section 3), and the result drives the release decision.

### Drift Detection in Production

Inputs, user behavior, tools, retrieval corpora, policies, and the world change. A moving model alias or provider backend can also change; a pinned snapshot removes that source only while the provider preserves it. A golden set that passed last month therefore needs current production evidence. Detect change by **scoring an authorized sample of production traffic** against a versioned rubric and watching for movement:

| Signal | What It Catches |
|---|---|
| **Score distribution shift** | Output quality or the production case mix changed; investigate before assigning cause |
| **Novel-tool / novel-argument rate** | The agent is doing things it never did before (Chapter 7: escalate) |
| **Retry-storm / loop rate** | The agent is stuck in a cycle (Section 7) |
| **Cost-per-trajectory drift** | The agent is spending more tokens for the same work |
| **Latency p95/p99 drift** | The agent is getting slower, or a dependency is |

The unifying principle from Chapter 7 carries over: **every gate decision is an audit event, and every audit event is a telemetry event.** Evaluating whether your gates, escalations, and approvals actually *improve outcomes* — rather than just *occur* — is an evaluation task, and it is how you close the loop from "we have oversight" to "oversight works."

## 7. Production Failure Modes

| Failure Mode | What Happens | Control |
|---|---|---|
| **Retry storm** | A failing tool call retries unboundedly, burning tokens and money | Retry budget per span, exponential backoff, circuit breaker |
| **Loop / cycle** | The agent alternates between two steps without converging | Step cap per trajectory, loop detector on repeated (state → action) pairs |
| **Silent degradation** | The agent gets slowly worse and no one notices | Continuous scoring of sampled traffic, drift alerts (Section 6) |
| **Eval gaming** | The agent optimizes the metric, not the task | Hidden holdout cases, outcome checks, aggregate controls, no fixture fallback |
| **Test-set contamination** | Development or tuning leaks holdout cases | Versioned provenance, separated slices, fresh private cases, parameterized situations |
| **Judge drift** | A judge, rubric, or backend change moves the scale | Pin and version the instrument; revalidate against held-out human labels |
| **Telemetry that lies** | Logs show a raw result but omit what actually entered context | Record transformation metadata and governed as-observed evidence (Section 2) |
| **Variance-as-quality** | A lucky run is reported as universal success | Repeat variable slices; report sample count, distribution, and uncertainty |
| **Dashboard theater** | Beautiful dashboards no one reads, no action follows | Tie every dashboard to a gate or an alert, or delete it |
| **Cost-blindness** | Token spend grows invisibly until the bill lands | Cost telemetry per span, budget alerts, per-trajectory cost floor/ceiling |

### Debugging Checklist

When an agent misbehaves in production, ask in this order:

1. Can I reconstruct the trajectory from the trace? (If not, telemetry is broken — fix that first.)
2. What did the model *observe* before the bad decision — and was it the raw result or a truncated summary?
3. Was this a known case? Is it in the golden set, and if not, why not?
4. Was the failure stable or variable? (Re-run the same seeded situation when another run would change the diagnosis.)
5. Did a gate or escalation fire — and was it *correct* to fire or not fire here?
6. Is the score distribution drifting, or was this a one-off outlier?
7. Did the failure come from the model, a tool, the memory, or the judge?
8. What single test case, added to the golden set, would have caught this — and is it in CI now?

---

## Summary
- **Observability and evaluation are two different loops.** Observability records what the agent did; evaluation judges how well it did it. Conflating them breaks both.
- **Trace the observable loop as structured operations and events** with trace/parent IDs, governed tool evidence, versions, and the as-observed context — not imagined access to hidden reasoning.
- **Evaluate at three altitudes:** component (does the part work), task (does the agent complete the job), and system (does the product get better). All three, for different reasons.
- **Build test sets around distinct reproducible situations** — entities, faults, and confounders as the unit — and report run-to-run variation with its sample count and uncertainty.
- **Treat LLM-as-judge as an instrument:** rubric it, control position/self/verbosity bias, calibrate against human labels, and refuse it for verifiable or high-stakes tasks.
- **Wire evaluation into CI** with hard invariants, slice floors, and baseline comparisons; version the full evaluated system; then shadow, canary, and monitor in production.
- **Every gate decision is an audit event, and every audit event is a telemetry event** — evaluating whether oversight *works* is this chapter's job, closing the loop from Chapter 7.

## Further Reading
- [OpenTelemetry GenAI Semantic Conventions](https://github.com/open-telemetry/semantic-conventions-genai) — the current OpenTelemetry repository for GenAI spans, metrics, events, and provider conventions; track its version because the specification is still evolving.
- [OpenAI: Evaluation Best Practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) — task-specific evals, continuous evaluation, human calibration, edge cases, and grader selection.
- [NIST AI RMF: Generative AI Profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf) — risk-based guidance for measurement, monitoring, testing, evaluation, verification, and validation.
- [Zheng et al.: Judging LLM-as-a-Judge](https://arxiv.org/abs/2306.05685) — MT-Bench research documenting position, verbosity, self-enhancement, and reasoning limitations in model judges.
- [Anthropic: Measuring Faithfulness in Chain-of-Thought Reasoning](https://www.anthropic.com/research/measuring-faithfulness-in-chain-of-thought-reasoning) — evidence that generated reasoning text is not automatically a faithful explanation of model behavior.
- [Ragas Documentation](https://docs.ragas.io/) — practical component metrics for retrieval and retrieval-augmented generation, including context precision and recall.

## What's Next?
In Chapter 9: Safety and Guardrails, we turn from *measuring* the agent to *constraining* it — policy checks, input/output filters, and the guardrail layer that makes evaluation thresholds enforceable. Where this chapter asked "is it good?", the next asks "can it do harm, and how do we stop it?"

## Related Chapters
- [Chapter 1: The ReAct Pattern](/handbook/chapter-01-react-pattern.html) — the loop you trace; Thought/Action/Observation is the event vocabulary.
- [Chapter 2: Plan-and-Execute](/handbook/chapter-02-plan-and-execute.html) — a plan span and per-step execution spans change what you trace; plan-adherence is its own component eval.
- [Chapter 3: The Reflection Pattern](/handbook/chapter-03-reflection.html) — the critic's rubric is your first LLM-as-judge, and its calibrated confidence feeds escalation.
- [Chapter 4: Multi-Agent Collaboration](/handbook/chapter-04-multi-agent-collaboration.html) — cross-agent trace propagation and attribution add a dimension to every trace.
- [Chapter 5: Tool Use and Skill Registries](/handbook/chapter-05-tool-use-skill-registry.html) — tool-call telemetry and idempotency keys that make replay safe.
- [Chapter 6: Memory & Context Management](/handbook/chapter-06-memory-context-management.html) — retrieval evals, provenance, and compaction correctness as component evals.
- [Chapter 7: Human-in-the-Loop](/handbook/chapter-07-human-in-the-loop.html) — approvals, denials, and escalations as audit events; evaluating whether gates work.

## Frequently Asked Questions

**Q: Do I really need both observability and evaluation, or is one enough?**
You need both. Observability without evaluation tells you what happened but not whether it was good; you'll spot anomalies but can't tell a bug from a feature. Evaluation without observability gives you scores with no production signal — you'll know the agent passed the golden set but not whether it fails in the wild. The two meet in the development loop: you trace a failure, encode it as a case, and gate on it.

**Q: How big does my golden set need to be?**
There is no universal case count. Start with the smallest set that covers each critical capability, harm, boundary, and known failure slice, then measure coverage and add production failures. Ten diverse, reviewed situations can be more useful than 1,000 paraphrases, but the right size depends on how many behaviors and risk strata the system must cover.

**Q: How do I know if my LLM-as-judge is trustworthy?**
You do not until you validate it. Build a held-out, human-labeled set, measure human-human agreement, then compare the judge by dimension. Disagreement may come from the rubric, judge, evidence, or labels. Pin the judge and rubric versions, investigate errors, and route unsupported slices to human review.

**Q: Should I use a different model as judge than as generator?**
Test it; do not assume model family alone decides quality. A cross-family judge can reduce one source of self-preference, but it can introduce different errors. Blind model identity, test position swaps, and choose the judge that best agrees with qualified human labels on your rubric. For verifiable tasks, skip the judge and use deterministic evidence.

**Q: How often should I re-run evaluation in production?**
Continuously as a feedback process, not necessarily on every request. Run fast deterministic checks on each change, relevant task slices before merge, broad repeated/adversarial suites before release, and an authorized production sample on a risk-appropriate schedule. The release suite is a *change gate*; sampled production evaluation is a *health signal*.

**Q: How do I stop the agent from gaming the evaluation?**
Assume any optimized proxy can be gamed. Keep a stable rubric for comparability, protect hidden holdout cases, evaluate real outcomes and aggregates, record *which* component answered, and never extend validity windows or fall back to a fixture brain just to make the suite pass. The goal is evidence, not a green checkmark.

## Glossary Terms Introduced
- **Observability**: Recording what a system did — traces, spans, events, and the audit trail — without judgment, so behavior can be reconstructed after the fact.
- **Evaluation**: Judging how well a system performed against a standard, using test sets, rubrics, and scores.
- **Trace / Span / Event**: The nested structure of telemetry: a trace is a whole request, a span is one unit of work within it, and an event is a point-in-time record within a span.
- **Golden Set**: A curated, versioned collection of representative cases with expected outcomes or scoring rules, used to compare and gate changes.
- **Seeded Situation**: A reproducible evaluation unit defined by a fixed initial state plus entities, faults, and confounders — the primary unit of a good test set.
- **Stochastic Variance**: The run-to-run variation in model output from sampling and nondeterminism, which must be reported separately from quality.
- **LLM-as-Judge**: Using a language model to score output quality against a rubric, used when no deterministic checker exists.
- **Rubric**: A scored, dimensioned set of criteria (with anchors) that makes evaluation consistent and comparable.
- **Pointwise vs. Pairwise Evaluation**: Scoring a single output against a rubric (pointwise) versus comparing two outputs directly (pairwise).
- **Regression Gate**: A release check that applies declared invariants, slice floors, and tolerated baseline deltas to evaluation evidence.
- **Drift Detection**: Monitoring input, behavior, outcome, cost, and score distributions to detect change that needs investigation.
- **Eval Gaming**: The agent optimizing the evaluation (rubric, threshold, fixture) rather than the underlying task.

## Revision History
| Version | Date | Changes |
|---|---|---|
| v1.2 | 2026-08-18 | Website editorial and evidence pass: replaced hidden-thought logging with observable model/tool/context events; aligned trace identifiers and content governance with current OpenTelemetry guidance; corrected seed and replay claims; added uncertainty-aware CI gates, full-system versioning, safe shadowing, nuanced drift attribution, stronger holdout controls, calibrated judge guidance, current primary references, and a new verified handbook diagram. |
| v1.1 | 2026-08-16 | Post-peer-review revision: reconciled the two-loops doctrine with drift scoring (telemetry feeds evaluation as data, not as one merged system); corrected the deterministic-replay overstatement (replay is faithful only when model version, temperature, seed, and inputs are logged — now in the trace schema); added a telemetry privacy/cost subsection (redaction, tiered capture, retention); added a worked seeded-situation example and a machine-parseable rubric; added concrete CI-gate YAML and system-eval attribution; disambiguated "seed" (situation vs. sampling) and span vs. event; added reward hacking; added Chapter 2 and Chapter 4 cross-links. |
| v1.0 | 2026-08-16 | Initial publication. |

## Meta
- Slug: HDBK-008-observability-evaluation
- Tags: Observability, Evaluation, Telemetry, Tracing, LLM-as-Judge, Golden Set, Regression Gate, Drift Detection, Eval-Driven Development, Production Patterns
- OG Image: /images/handbook/HDBK-008-observability-evaluation.webp
