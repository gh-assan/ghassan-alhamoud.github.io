# Chapter 7: Human-in-the-Loop — Keeping People in Control

**Reading time:** 27 min | **Last revised:** 2026-08-09 | **Version:** 1.2

## If You Only Read One Section
Autonomy is a per-action decision, not a global setting. Classify each action by impact, reversibility, exposure, value, and applicable policy. Gate actions whose downside exceeds the organization's risk tolerance; let bounded, reversible actions proceed under monitoring. A human approval is useful only when the approver has authority, enough context, and a real opportunity to disagree. Bind every decision to an exact action, expire it, re-check preconditions, and record the result. A vague gate does not create control. It creates rubber-stamping with an audit trail.

## Prerequisites
- [Chapter 1: The ReAct Pattern](/handbook/chapter-01-react-pattern.html) — human input arrives in the loop as an observation; the loop is where you insert a stop.
- [Chapter 2: Plan-and-Execute](/handbook/chapter-02-plan-and-execute.html) — plan steps and checkpoints are the natural places to pause and ask.
- [Chapter 4: Multi-Agent Collaboration](/handbook/chapter-04-multi-agent-collaboration.html) — delegation chains between agents still need to terminate in a human authority.
- [Chapter 5: Tool Use and Skill Registries](/handbook/chapter-05-tool-use-skill-registry.html) — tool permissioning is the enforcement layer where approval gates actually bite.
- [Chapter 6: Memory & Context Management](/handbook/chapter-06-memory-context-management.html) — the write policy and review queue are where humans correct what the agent believes.

---

Friday, 17:42. Your release agent has been running for an hour. It has built the artifact, run the test suite, and staged the deployment. Now it wants to push to production. The approval request arrives on your phone: *"Deploy v2.4.1 to production? 412 builds passed, 3 flaky tests quarantined, rollback verified. Estimated blast radius: payments API. Approve / Deny / Revise."*

You are not being asked because the agent is weak. You are being asked because the action is consequential. Somewhere between "the agent does everything" and "the agent does nothing," there is a line — and where you draw it determines whether your system is a tool or a liability. This chapter is about drawing that line deliberately.

![HDBK-007 Human-in-the-Loop control architecture](/images/handbook/HDBK-007-human-in-the-loop.webp)
*Figure 1: Human oversight is configured per action. The autonomy policy selects where approval is required, the gate binds a decision to a specific proposal, and escalation routes exceptions without weakening the protected action's policy.*

## 1. The Autonomy Spectrum

Human oversight is not binary. Between full teleoperation and full autonomy there is a spectrum, and the useful question is not "is there a human in the loop?" but "**at which actions, and with what latency, does a human weigh in?**"

### The Spectrum

| Level | Code | What the Human Does | Latency Cost | Typical Use |
|---|---|---|---|---|
| **Teleoperation** | `AUTONOMY_TELEOPERATE` | Selects or directly commands each action | Seconds per action | Unproven capability, new domain, incident response |
| **Approve-on-action** | `AUTONOMY_APPROVE` | Approves before consequential actions; routine actions flow | Seconds per gate | Production agents with real blast radius |
| **Approve-on-commit** | `AUTONOMY_COMMIT` | Lets the agent act, but requires approval before the change becomes durable/visible | Minutes to hours | Drafting, staging, non-public writes |
| **Escalate-on-exception** | `AUTONOMY_ESCALATE` | Intervenes when policy, risk, or calibrated uncertainty crosses a threshold | Variable | Mature agents with evaluated exception detection |
| **Full autonomy** | `AUTONOMY_FULL` | Monitors or audits after the fact; does not approve in-path | None in-path | Bounded, reversible, low-risk, high-volume actions |

The `Code` column is not decoration: the same five values appear in the classification function below and in the delegation contract (Section 6). Keep one vocabulary everywhere — three parallel naming schemes is how action classes fall through cracks.

Most production systems are not at one level. They are a **mixture**: full autonomy for bounded internal work, approve-on-commit for reviewed artifacts, approve-on-action for consequential side effects, and exception-based escalation for conditions the policy cannot safely classify. Draw the boundary per action and destination, not per agent.

### Blast Radius Is the Core Variable

What turns a routine action into a consequential one? Four dimensions:

| Dimension | Question | Example |
|---|---|---|
| **Irreversibility** | Can this be undone, and at what cost? | Deleting a table vs. creating a draft |
| **Externality** | Does it affect people or systems outside the agent's controlled environment? | Sending an email vs. editing a local draft |
| **Value** | How much money, time, or trust is at stake? | Refunding €500 vs. reordering a pen |
| **Policy** | Do law, contract, safety rules, or internal policy require specific oversight? | A legally significant automated decision, contract execution, clinical advice |

A useful starting rule: **proceed on authorized, bounded, reversible, low-risk actions; gate actions that are irreversible, externally visible, high-value, safety-relevant, or policy-bound.** Reversibility is not a free pass: a deleted record may be restored while a leaked secret or sent message cannot be recalled. When possible, reduce the risk before adding a gate. Draft instead of send, stage instead of deploy, use a recoverable delete, cap the transaction, or require a separate publish step.

This framing is not new. Sheridan and Verplank's classic levels-of-automation work mapped how control can move between human and machine. Modern agent systems sharpen the operational problem: one mistaken decision can be repeated at machine speed and scale. NIST's AI Risk Management Framework therefore calls for human roles, responsibilities, and oversight processes to be explicitly defined and assessed rather than assumed.

### Autonomy Is a Per-Action Decision

```python
def autonomy_level(action, context):
    if not context.actor.can_request(action):
        return AUTONOMY_TELEOPERATE   # no delegated authority
    if action.policy_requires_approval:
        return AUTONOMY_APPROVE       # law or policy requires a decision
    if action.aggregate_value(context.window) > context.high_value_threshold:
        return AUTONOMY_APPROVE       # gate before acting
    if action.irreversible or action.exposes_sensitive_data:
        return AUTONOMY_APPROVE
    if action.can_stage_before_commit:
        return AUTONOMY_COMMIT
    if action.reversible and action.bounded and not action.external:
        return AUTONOMY_FULL          # act, notify afterwards
    return AUTONOMY_ESCALATE          # fallback: unclassified actions escalate
```

Check order matters. Authority, policy, aggregate value, sensitive-data exposure, and irreversibility are evaluated **before** the reversibility shortcut. Aggregation prevents a large action from being split into smaller calls to avoid a threshold. The final branch is the fallback: an action the policy cannot classify does not inherit permission by accident.

The important property: the decision is **computed from the action and the context**, not hardcoded per agent. The same agent can be fully autonomous for internal refactors and gated for anything touching production. This is what makes the spectrum a policy rather than a personality trait.

## 2. What Deserves an Approval Gate

A gate is a checkpoint where the agent must stop and obtain authorization before an action proceeds. Gates cost human attention, so they must be earned. The discipline: **classify actions first, then place gates.**

### The Action Classification

| Action Class | Examples | Gate? | Rationale |
|---|---|---|---|
| **Authorized read-only** | Read a permitted file, run a bounded query | Usually no | No side effect, but data scope and query cost still apply |
| **Reversible internal** | Edit a draft, create a branch, run a test | Usually no; notify as needed | Bounded and recoverable |
| **External communication** | Send an email, post a message, reply to a ticket | Approve-on-action unless an explicit policy delegates it | The side effect occurs at send time and may be impossible to recall |
| **Staged external write** | Prepare a pull-request description or page draft in a controlled workspace | Approve-on-commit | Work is reviewable before it becomes visible or durable |
| **Destructive** | Drop a table, permanently delete data, overwrite without versioning | Approve or block | Recovery may be impossible or incomplete |
| **Financial** | Issue a refund, make a payment, change a price | Thresholded approval, often dual control | Money, fraud, and audit exposure |
| **Privileged or sensitive** | Deploy, elevate permissions, access customer data | Approve with evidence and least privilege | Large blast radius and confidentiality risk |
| **Policy-bound** | Execute a contract or make a regulated high-impact decision | Apply the specific required control | Requirements depend on jurisdiction, role, and use case |

The table is a baseline, not legal advice or a substitute for a threat model. For example, GDPR Article 22 addresses certain decisions based solely on automated processing that produce legal or similarly significant effects; it does not say every erasure request requires a human decision. Translate the law and your contracts into precise policy with qualified counsel.

### Gate Placement

Gates belong **between the agent and the world**, not inside the agent's reasoning. Three rules:

1. **Gate at the tool boundary.** The enforcement lives in the tool permission layer (Chapter 5), not in the prompt. A prompt can ask nicely; a permission layer refuses.
2. **Gate before the irreversible step, not before the pipeline.** Do not make the human approve "start the job" when the dangerous part is "delete the old table" an hour in. The gate should sit on the destructive call itself.
3. **Treat novelty as evidence, not permission.** First-time or out-of-distribution actions should start under tighter supervision. Repeated approval can justify a reviewed policy change only when outcomes support it; repetition alone does not make an action safe.

### Ask, Don't Narrate

There are two ways to involve a human: **asking** (a decision is required before the action proceeds) and **telling** (the action proceeds and a notification lands afterwards). Asking is expensive; telling is cheap. The classification table above is really a rule for choosing between them. A common mistake is to make everything an ask, which guarantees the human stops reading. Reserve asks for the classes that earned them.

## 3. The Approval Gate Pattern

An approval gate is a state machine with four states and a well-defined lifecycle.

### The Lifecycle

```
propose → present → decide → validate → execute
              │          │          ├─ valid   → claim idempotency key → run
              │          │          └─ stale   → expire and re-propose
              │          ├─ deny    → abort
              │          ├─ revise  → supersede and re-propose (capped)
              │          └─ expire  → stop action or route to fallback approver
              └─ revision limit hit → escalate or abort
```

1. **Propose.** The agent assembles the action, its justification, its cost, and its risks into a structured proposal.
2. **Present.** The proposal reaches the right human through the right channel, with everything needed to decide.
3. **Decide.** An authorized human approves, denies, or requests a revision. Record the authenticated identity, role, channel, rationale, and timestamp.
4. **Validate and execute.** Verify that the decision covers the exact action, has not expired or been consumed, and still satisfies current preconditions. Then execute once under a stable operation key.

### What a Good Approval Request Contains

A request that cannot be answered in thirty seconds is a request that will be rubber-stamped or ignored. Include:

| Field | Why It Matters |
|---|---|
| **What** — the exact action and its parameters | No ambiguity about what will happen |
| **Why now** — the trigger and context | The human can judge urgency |
| **Cost** — money, resources, time | Obvious, often forgotten |
| **Risk** — what could go wrong and the mitigation | The human needs the worst case, not the best case |
| **Alternatives** — what else was considered and rejected | Shows the agent explored, not just decided |
| **Expiry** — how long the request stays valid | Prevents stale approvals |
| **Scope** — resource, environment, destination, and maximum effect | Prevents a narrow approval from authorizing a broader action |
| **Evidence** — checks, diffs, policy result, and rollback readiness | Lets the approver verify claims instead of trusting a summary |

A good proposal can reuse work the agent already did: the reflection critic from [Chapter 3: The Reflection Pattern](/handbook/chapter-03-reflection.html) is a natural source for the *why now* and *risk* fields — the critic's assessment of the proposed action becomes the justification a human reads.

### The Gate, Implemented

```python
class ApprovalGate:
    def run(self, action, context, operation_id, revision=0):
        assessment = self.policy.evaluate(action, context)
        if assessment.effect == "deny":
            return abort(action, reason=assessment.reason)
        if assessment.effect == "allow":
            return self.executor.execute_once(operation_id, action)

        proposal = self.store.create_proposal(
            proposal_id=uuid4(),
            operation_id=operation_id,       # stable across retries
            action_digest=canonical_hash(action),
            requested_scope=action.scope(),
            required_role=assessment.approver_role,
            what=action.describe(),
            why_now=context.trigger,
            cost=action.estimate_cost(),
            risk=action.worst_case(),
            evidence=action.validation_evidence(),
            alternatives=action.considered_alternatives(),
            expires_at=now() + assessment.ttl,
        )
        self.notifier.present(proposal)
        decision = self.notifier.wait(proposal, timeout=assessment.ttl)

        if decision is None:
            return self.router.on_timeout(proposal)  # abort or fallback approver
        if not self.authorizer.valid_decider(decision.actor, proposal.required_role):
            return abort(action, reason="unauthorized_approver")
        if not self.store.consume_decision_once(decision, proposal):
            return abort(action, reason="invalid_or_replayed_decision")
        if decision.kind == "deny":
            return abort(action, reason=decision.reason)
        if decision.kind == "revise":
            if revision >= self.policy.max_revisions:
                return self.router.on_revision_limit(proposal)
            self.store.supersede(proposal)
            return self.run(
                action.with_changes(decision.changes),
                context,
                operation_id,
                revision + 1,
            )

        if canonical_hash(action) != proposal.action_digest:
            return abort(action, reason="approval_scope_mismatch")
        if proposal.expired() or not action.preconditions_still_hold():
            return abort(action, reason="stale_approval")

        return self.executor.execute_once(operation_id, action)
```

### The Details That Make or Break It

1. **Bind approval to immutable intent.** Store a canonical digest of the action, arguments, resource, environment, destination, and policy version. Any material revision invalidates the old approval and creates a new proposal. A screenshot or free-text “yes” is not sufficient authority.
2. **Authenticate and authorize the decider.** Approval identity is separate from delivery identity. A message arriving through a valid channel does not prove that the sender has the required role. Protect the decision against replay and require separation of duties where the risk model calls for it.
3. **Re-validate preconditions.** Between approval and execution, a file may change, a price may move, or a branch may merge. Use version tokens, hashes, or conditional writes. When they no longer match, expire the approval and re-propose instead of executing a nearby action.
4. **Expiry is mandatory; the protected action fails closed.** No approval is valid forever. On timeout, the action does not proceed. The workflow may *fail over* to another authorized approver, but that is not fail-open: the same gate and evidence requirements remain in force.
5. **Separate proposal identity from operation identity.** A proposal ID identifies one approval attempt. A stable operation ID deduplicates execution across retries. Even then, “exactly once” is not guaranteed by a UUID: the executor needs an atomic idempotency record, durable result storage, and downstream support or reconciliation.
6. **Support asynchronous work without leaking side effects.** The agent may continue in an isolated workspace while a commit waits, provided later work cannot make the pending action broader or externally visible. The gate blocks the side effect, not unrelated computation.
7. **Learn through policy review, not approval counts.** Repeated successful approvals are evidence for proposing a narrower policy change. They do not silently widen authority. Evaluate outcomes, obtain consent, version the contract, and make rollback possible.
8. **Make decisions observable.** Record proposal, policy version, evidence, decider, rationale, timestamps, expiry, action digest, execution result, and correlation IDs. Protect the log from alteration and avoid storing unnecessary sensitive payloads.

### Sync vs. Async vs. Deferred

| Mode | Agent Behavior | Human Behavior | Use When |
|---|---|---|---|
| **Sync** | Blocks until decision | Interrupts to decide now | Irreversible, urgent, high-value |
| **Async** | Keeps working in sandbox | Decides when convenient | Approve-on-commit actions |
| **Deferred** | Executes, reports after | Reviews a report later | Reversible, low-value, needs audit |

## 4. Escalation and Interruption

Not everything that needs a human is a pre-approved action. Sometimes the agent must **stop and raise its hand** because it is out of its depth. Escalation is the mechanism; interruption is the cost.

### When to Raise the Hand

| Trigger | Example | Default |
|---|---|---|
| **Low confidence** | Model confidence below a calibrated threshold on a consequential step | Escalate |
| **Policy boundary** | Action falls outside the delegation contract's scope | Escalate, never improvise |
| **Novelty** | First time this action class is attempted | Escalate |
| **Cost spike** | Estimated cost or rate exceeds the contract's limits | Escalate |
| **Conflict** | New instruction contradicts a stored constraint (Chapter 6) | Escalate; never silently override |
| **Credential boundary** | Action requires privileges the agent does not have | Escalate, never work around |

### The Escalation Ladder

Escalation is a routing menu, not a pipeline: pick the cheapest rung that resolves the situation — you do not climb every rung. What matters is that each rung's failure has a defined next step:

```
notify  →  ask  →  page  →  block
  │          │        │        │
  info       decision  urgent   hard stop,
  (log it)   (gate)    (SMS/    (require human
                       phone)   to unblock)
```

- **Notify** — tell a human after the fact. For reversible actions that should be observed.
- **Ask** — the approval gate from Section 3. For consequential actions.
- **Page** — urgent, time-sensitive escalation: "the nightly job is about to miss its SLA, approve the fallback plan." Uses a high-priority channel and includes everything the human needs to decide in one message.
- **Block** — the hard stop. The agent refuses to proceed, no matter what, until a human explicitly unblocks. Used when the agent detects it is being manipulated (for example, instruction-shaped content from an untrusted source, Chapter 6), when policy is ambiguous, or when a paged human does not respond in time.

Fail-closed applies to the protected action: without a valid approval, it does not run. The surrounding workflow can still **fail over to a fallback approver** or take a separately authorized safe action. Failover must preserve the same evidence, role, and policy requirements; it is not permission to bypass the gate. Reserve a hard block for cases where no safe fallback exists.

### Interrupting Long-Running Work Safely

A long-running agent cannot just drop everything. The safe interruption pattern:

1. **Checkpoint at task boundaries** (the Chapter 6 pattern), so the agent can pause and resume without losing decisions or state.
2. **Use the tool's cancellation contract.** Cancel only when the operation is explicitly cancellation-safe. Otherwise let it reach a known terminal state, or run a documented compensating action. A process kill during an external write can leave the world half-changed.
3. **Quiesce dependent work.** Do not start steps whose inputs or authority depend on the pending decision. Independent work may continue inside its existing permissions.
4. **Resume with a diff.** On resume, show what completed, what remains, and which preconditions changed. Re-evaluate policy before continuing.
5. **Model interruption as a state.** “Paused for human” is not a generic error. It has a checkpoint, owner, deadline, allowed transitions, and recovery path.

### The Context-Switch Tax

Every interruption costs the human attention they were spending elsewhere. Two mitigations matter: **batch** (collect pending decisions and present them in one review session, not one message per decision) and **schedule** (for non-urgent decisions, present them at a predictable checkpoint rather than instantly). Both are policies, not implementation details — put them in the delegation contract.

## 5. Human Review of Agent Beliefs

The most subtle human-in-the-loop surface is not actions — it is **beliefs**. Chapter 6 established the write policy: model inferences about people should go to a review queue, not directly into memory. This section is the interaction pattern around that queue.

### Provisional vs. Confirmed

A memory record needs both a belief status and source trust. The agent may **act provisionally** on a tentative belief only within policy. Human confirmation raises confidence in a claim; it does not override data permissions, freshness requirements, or the human's authority to attest to it.

| Status | Meaning | Can It Drive Consequential Action? |
|---|---|---|
| **Observed** | Directly recorded from a named source; not yet validated | Only if source trust, freshness, and policy allow it |
| **Provisional** | Model inference, flagged as unconfirmed | Reversible actions only |
| **Confirmed** | An authorized human reviewed the claim and evidence | Only within the confirmation's scope and lifetime |
| **Superseded** | Replaced by a newer confirmed record | No — resolved before retrieval (Chapter 6) |

### The Belief-Correction Loop

```
agent proposes belief + evidence + source trust
        │
        ▼
policy permits provisional use? ──yes──► bounded use, no durable promotion
        │ no
        ▼
present to authorized reviewer: "I believe X, because Y"
        │
        ├── confirm ──► write memory record (status: confirmed, source: human)
        ├── correct  ──► write corrected record, supersede old (Chapter 6)
        └── abstain  ──► no write; agent continues without the belief
```

Three properties make this loop trustworthy:

1. **Evidence travels with the belief.** The human must see *why* the agent believes something, the source's trust class, and when it was observed. "I believe the vendor is Northwind B.V. — source: authorized user correction on 2026-07-31, message 88" is reviewable; "the vendor is Northwind B.V." is not.
2. **The human corrects the record, not the agent.** When the human says "no, it's Northwind GmbH," the correction writes a new version that supersedes the old one (the Chapter 6 pattern). The agent does not need to "remember to forget" — the memory system resolves it.
3. **Abstention is a valid outcome.** If the human says "I don't know," the system must not write a guess. It continues without the belief, and the retrieval path (Chapter 6) can return an empty result rather than a fabricated fact.

### Calibrate, Don't Guess

Escalation-on-low-confidence works only when the score used for routing is **calibrated on the decision being gated**. Do not assume a model's verbal “90% confident” is a probability. Build a risk or quality score from measurable signals such as policy matches, retrieval coverage, deterministic validation, critic results, and historical error rates. On a representative labeled set, compare score bands with observed outcomes, choose thresholds against the cost of false allows and false escalations, and monitor drift. The critic loop from [Chapter 3: The Reflection Pattern](/handbook/chapter-03-reflection.html) can contribute a signal, but it must itself be evaluated. Never ship an escalation threshold you have not measured on your workload.

## 6. Delegation Contracts and the Friction Budget

A human-in-the-loop system needs an explicit agreement about what the agent may do, what it must ask about, and how much human attention it is allowed to consume. This is the **delegation contract**.

### The Contract

```json
{
  "agent": "release-agent",
  "principal": "release-service-account",
  "scope": "build, test, stage",
  "action_classes": {
    "read_internal":     "AUTONOMY_FULL",
    "external_write":    "AUTONOMY_COMMIT",
    "deploy_production": "AUTONOMY_APPROVE",
    "delete_data":       "BLOCK"
  },
  "thresholds": {
    "high_value": 500,
    "max_cost_per_run": 50,
    "max_rate": {"requests_per_minute": 60}
  },
  "escalation": {
    "page_after_minutes": 10,
    "required_role": "release-approver",
    "fallback_role": "incident-commander",
    "max_revisions": 2
  },
  "friction_budget": {
    "max_asks_per_day": 10,
    "batch_window_minutes": 30,
    "on_exhaustion": "batch_or_pause"
  },
  "policy_version": "release-policy/12",
  "expires_at": "2026-09-01T00:00:00Z"
}
```

The `action_classes` values use the autonomy vocabulary from Section 1, plus `BLOCK`, which is a policy denial rather than an autonomy level. The contract names roles rather than individual inboxes, separates the agent from its runtime principal, and versions the policy used for each decision. In a real schema, also define resources, environments, destinations, data classes, aggregation windows, approver separation, and safe fallback actions.

The contract is policy-as-code: it is versioned, reviewable, and — crucially — **enforced by the permission layer**, not by a prompt. A prompt that says "remember to ask before deploying" is a suggestion; the contract is a gate.

### The Friction Budget

Human attention is the scarcest resource in the system. Give it a budget:

- **Max asks per day.** A load-shedding threshold for non-urgent review. Exhausting it must never downgrade an action from required approval to execute-and-report. Batch, pause, reroute, or block according to policy.
- **Batch window.** Collect decisions and present them together. A human reviewing five proposals in one session spends far less than five interrupted sessions.
- **Learn, then review.** Repeated approvals with successful outcomes can become a policy-change candidate through the Chapter 6 write path. A human reviews the proposed scope, evidence, expiry, and rollback before the contract changes. The runtime never edits its own authority.

### The Rubber-Stamp Failure Mode

When asks are frequent, vague, or almost always approved, the human stops reading and clicks "approve." This is **rubber-stamp approval**: the workflow records a decision without gaining meaningful judgment. The defenses are upstream—fewer asks, better evidence, independent verification, calibrated routing, and enough time and authority to refuse. Measure suspiciously fast decisions, approval concentration, override rates, post-approval incidents, and sampled review quality. Do not secretly plant dangerous-looking approvals to test people; any simulation or control test should be governed, non-harmful, and disclosed to the responsible assurance function.

## 7. Evaluate the Oversight System

A gate is not effective because it exists. It is effective when it reduces expected harm at an acceptable cost without transferring the same risk to an overloaded approver. Evaluate the combined human-machine system, not just the model.

### Start with Decision Outcomes

For each action class, maintain a labeled evaluation set containing ordinary cases, boundary cases, policy violations, stale approvals, adversarial instructions, and changed preconditions. Replay the policy and presentation layer without executing the side effect. Measure:

| Measure | Question It Answers |
|---|---|
| **Unsafe-allow rate** | How often did the system execute an action that policy or a qualified reviewer says should have been blocked? |
| **Unnecessary-escalation rate** | How often did a safe, delegated action consume human attention? |
| **Decision quality** | Did the approver reach the correct decision with the evidence presented? |
| **Time to decision** | Can the right person respond before the approval becomes stale? |
| **Override and revision rate** | Are humans adding judgment, or merely confirming the default? |
| **Stale-precondition catch rate** | Does validation stop actions whose target state changed after approval? |
| **Duplicate-effect rate** | Do retries or concurrent workers repeat a side effect? |
| **Fallback success rate** | Does routing reach an authorized fallback without weakening the gate? |

Optimize against asymmetric cost. One unsafe payment may matter more than hundreds of unnecessary escalations, while an emergency-response system may assign substantial cost to delay. Report the trade-off curve instead of hiding it behind one “accuracy” number.

### Test the State Machine, Not Just the Happy Path

At minimum, automate these cases:

1. An unauthorized or expired decision is rejected.
2. A revised action cannot reuse the original approval.
3. Two concurrent approvals cannot consume the same proposal twice.
4. A crash after claiming the operation key does not duplicate the side effect on retry.
5. A changed resource version forces re-proposal.
6. A timeout stops the action and routes only to configured fallback roles.
7. Friction-budget exhaustion never weakens a mandatory gate.
8. Audit events join proposal, decision, policy version, execution, and outcome without logging secrets.

Then observe production by action class and policy version. Alert on shifts in approval volume, decision latency, timeout rate, override rate, unsafe outcomes, and approver concentration. Review samples with domain experts. A 99% approval rate may mean the classifier is excellent, or that the gate is wasting attention; the outcome data tells you which.

## 8. Production Failure Modes

| Failure Mode | What Happens | Control |
|---|---|---|
| **Rubber-stamp approval** | Human approves without meaningful review; the gate is theater | Fewer asks, decision-ready evidence, sampled quality review, workload limits |
| **Alert fatigue** | Too many notifications → human ignores everything, including real ones | Batch, schedule, friction budget, escalation ladder |
| **Stale approval** | World changed between approval and execution; agent executes anyway | Precondition re-validation, expiry, fail-closed |
| **Gate deadlock** | Human is unavailable; an approval-required action waits forever | Expiry with fail-closed routing to an authorized fallback approver |
| **Approval gaming** | Agent splits one €1,000 action into three €400 actions to dodge a threshold | Rate and aggregate checks in the permission layer, not per-call checks |
| **Prompt-only gates** | "Please ask before deleting" in the system prompt, no enforcement | Gates enforced at the tool boundary (Chapter 5) |
| **Context-switch tax** | Human is interrupted 40 times a day by one agent | Batch window, scheduled checkpoints, friction budget |
| **Uncalibrated escalation** | Agent escalates everything (or nothing) because confidence is unmeasured | Calibration evaluation, labeled thresholds |
| **Scope drift** | The executed resource, arguments, or environment differ from the approved proposal | Canonical action digest, immutable proposal, re-propose on change |
| **Unauthorized approval** | A valid account without the required role approves the action | Strong authentication, role checks, separation of duties, replay protection |
| **Audit gap** | Proposal, decision, and execution cannot be reconstructed | Tamper-evident correlated events with data minimization ([Chapter 8](/handbook/chapter-08-observability-evaluation.html)) |
| **Belief laundering** | A provisional inference gets stored, retrieved, and treated as fact | Status field, review queue, evidence with belief (Chapter 6) |

### Debugging Checklist

When human-in-the-loop behavior is wrong, ask in this order:

1. Was the action classified correctly? Is it really consequential — or reversible and over-gated?
2. Is the gate enforced at the tool boundary, or only in a prompt?
3. What did the approval request actually contain? Could a busy human answer it in 30 seconds?
4. Did the agent re-validate preconditions after approval?
5. What happened on timeout — fail closed, or silent proceed?
6. Is escalation calibrated, or is the agent raising its hand for everything?
7. Are repeated asks being remembered and reduced, or is the human answering the same question daily?
8. Is every approval, denial, and escalation in the audit log with decider and timestamp?
9. Does the approval digest match the exact action, resource, environment, and policy version that executed?
10. Do outcome metrics show that the gate prevents harm rather than merely adding latency?

---

## Summary
- **Autonomy is per-action, not per-agent.** Classify by authority, impact, reversibility, exposure, aggregate value, and policy; gate the consequential and bound the rest.
- **Gates are state machines, not prompts.** Propose → present → decide → validate → execute, with immutable scope, expiry, precondition checks, and fail-closed defaults.
- **Escalation is a ladder.** Notify → ask → page → block, chosen by severity, never binary.
- **Humans correct beliefs, not just actions.** The review queue, status field, and supersession from Chapter 6 make belief correction a system decision.
- **Write a delegation contract.** Scope, thresholds, escalation, and a friction budget — enforced by the permission layer, versioned, and expiring.
- **Bind authority to exact intent.** Authenticate the approver, hash the action and scope, separate proposal and operation IDs, and re-propose after any material change.
- **Evaluate the joint system.** Track unsafe allows, unnecessary escalations, decision quality, staleness, duplicate effects, and production outcomes by policy version.
- **The enemy is rubber-stamping.** Badly-asked approvals train humans to click through; design for fewer, better, batched asks.

## Further Reading
- [Sheridan & Verplank: Human and Computer Control of Undersea Teleoperators](https://ntrl.ntis.gov/NTRL/dashboard/searchResults/titleDetail/ADA057655.xhtml) — the original levels-of-automation taxonomy; the intellectual ancestor of every autonomy dial.
- [Amershi et al.: Guidelines for Human-AI Interaction](https://doi.org/10.1145/3290605.3300233) — 18 interaction guidelines including "make clear why the system did what it did" and "support efficient dismissal/correction."
- [NIST: AI Risk Management Framework 1.0](https://doi.org/10.6028/NIST.AI.100-1) — governance guidance for defining human-AI roles, oversight, measurement, and risk ownership.
- [EU General Data Protection Regulation, Article 22](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679) — the primary legal text on certain solely automated decisions and safeguards including human intervention.
- [OpenAI: Practices for Governing Agentic AI Systems](https://cdn.openai.com/papers/practices-for-governing-agentic-ai-systems.pdf) — a research paper on review processes, human oversight, and escalation for agentic systems.
- [Monarch: Human-in-the-Loop Machine Learning](https://www.manning.com/books/human-in-the-loop-machine-learning) — active learning and annotation as the practical foundation for human review loops.
- [Anthropic: Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) — workflow patterns including where human-in-the-loop checkpoints fit in agent designs.

## What's Next?
Continue with [Chapter 8: Observability & Evaluation](/handbook/chapter-08-observability-evaluation.html) for the telemetry layer that makes human-in-the-loop decisions auditable: approval trails, escalation logs, and evidence that gates and escalations actually improve outcomes.

## Related Chapters
- [Chapter 1: The ReAct Pattern](/handbook/chapter-01-react-pattern.html) — the loop where human input and approval arrive as observations.
- [Chapter 2: Plan-and-Execute](/handbook/chapter-02-plan-and-execute.html) — plan checkpoints are the natural home of approval gates.
- [Chapter 3: The Reflection Pattern](/handbook/chapter-03-reflection.html) — the critic's rubric is the natural source of calibrated confidence for escalation and belief review.
- [Chapter 4: Multi-Agent Collaboration](/handbook/chapter-04-multi-agent-collaboration.html) — delegation chains need a terminating human authority.
- [Chapter 5: Tool Use and Skill Registries](/handbook/chapter-05-tool-use-skill-registry.html) — the permission layer is where gates are enforced.
- [Chapter 6: Memory & Context Management](/handbook/chapter-06-memory-context-management.html) — the write policy, review queue, and supersession that make belief correction possible.

## Frequently Asked Questions

**Q: Should every agent action require human approval?**
No. Approval is a scarce resource. Classify actions by authority, impact, reversibility, exposure, aggregate value, and applicable policy. Bounded internal actions can often run autonomously; consequential actions need the control selected by the threat model and policy. Externality raises risk, but it does not make every external action identical.

**Q: How do I prevent the agent from gaming approval thresholds?**
Enforce thresholds in the permission layer with aggregation, not per-call checks: sum financial actions per session, rate-limit external writes, and flag patterns that split one large action into several small ones. A gate that checks "is this single action over €500?" while the agent fires five €400 actions is not a gate.

**Q: What happens if the approver doesn't respond?**
The approval expires and the gate fails closed: abort the action or route it to a configured fallback approver who satisfies the required role. Never silently proceed on an expired approval. Timeouts should be short enough that "approved" still describes the world.

**Q: How is human-in-the-loop different from just having a human review the output?**
The timing and authority differ. In approve-on-action, the human authorizes a side effect before it occurs. In approve-on-commit, the agent prepares a staged artifact and a human authorizes making it durable or visible. Post-hoc review happens after the side effect and is monitoring, not approval. Choose among them from the action's risk and reversibility.

**Q: How much should the agent ask? How do I know if it's too much?**
Set a friction budget for non-urgent attention, batch compatible decisions, and measure decision quality and outcomes. Never let budget exhaustion bypass a mandatory gate. If people approve without review, reduce unnecessary asks and improve the evidence before adding more checkpoints.

**Q: Does a confirmed memory ever need re-confirmation?**
Yes, when the world changes. Confirmation is a point-in-time judgment. A "confirmed" status means a human reviewed the belief, not that the belief is eternally true. Supersession (Chapter 6) handles updates; re-confirmation matters for facts with expiry or when the evidence chain changes.

## Glossary Terms Introduced
- **Human-in-the-Loop (HITL)**: A design where a human makes or approves consequential decisions within an agent workflow, as opposed to reviewing outcomes afterwards.
- **Autonomy Spectrum**: The range of human oversight levels from teleoperation to full autonomy, applied per action rather than per system.
- **Blast Radius**: The reach and severity of an action's worst credible outcome across people, systems, data, money, trust, and policy obligations.
- **Approval Gate**: A checkpoint where an agent must obtain authorization before a consequential action proceeds.
- **Approve-on-Action**: An oversight mode where a human decides before the agent executes a consequential action.
- **Approve-on-Commit**: An oversight mode where the agent acts in a sandbox but requires approval before the change becomes durable or visible.
- **Escalation Ladder**: A set of increasingly interruptive routing options (notify, ask, page, block) selected by urgency and risk, with a defined failure path.
- **Delegation Contract**: Policy-as-code defining an agent's scope, action classes, thresholds, escalation, and friction budget.
- **Friction Budget**: An operational budget for non-urgent human attention, managed through ask limits, batching, routing, and reviewed policy changes without bypassing mandatory gates.
- **Rubber-Stamp Approval**: Approving without reading, caused by frequent or vague asks; the failure mode that makes gates theater.
- **Provisional Belief**: A model inference flagged as unconfirmed, usable for reversible actions but not for consequential ones.
- **Belief-Correction Loop**: The pattern where a human confirms or corrects an agent's belief, writing a versioned memory record via supersession.

## Revision History
| Version | Date | Changes |
|---|---|---|
| v1.2 | 2026-08-09 | Production correctness pass: separated fail-closed from approver failover; bound approvals to authenticated roles, immutable action scope, policy versions, and stable operation IDs; corrected idempotency and legal overclaims; tightened belief provenance and confidence calibration; prevented friction budgets from weakening gates; added oversight evaluation metrics and state-machine tests. |
| v1.1 | 2026-08-09 | Post-peer-review revision: fixed autonomy-classification ordering (compliance/value now gate before the reversibility shortcut); unified the spectrum/code/contract vocabularies onto one set of levels; capped the revise loop with escalation on limit; added request IDs, idempotent execution keys, decider recording, and four-eyes approval; defined fail-closed and sandbox on first use; clarified the escalation ladder as a routing menu with fail-open-to-fallback semantics; made "remember, don't re-ask" concrete; cross-linked Chapter 3 (Reflection) for calibration and proposal justification. |
| v1.0 | 2026-08-09 | Initial publication. |

## Meta
- Slug: HDBK-007-human-in-the-loop
- Tags: Human-in-the-Loop, Approval Gates, Escalation, Autonomy, Delegation, Guardrails, Agent Control, Production Patterns
- OG Image: /images/handbook/HDBK-007-human-in-the-loop.webp
