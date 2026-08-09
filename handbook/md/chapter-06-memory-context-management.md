# Chapter 6: Memory & Context Management — Keeping What Matters

**Reading time:** 22 min | **Last revised:** 2026-07-31 | **Version:** 1.3

## If You Only Read One Section
The **context window** is the model's working set for one inference; **memory** is the state your application can carry across turns or sessions. Neither is useful merely because it is large. Context must be assembled for the current decision, with room left for the answer. Memory needs an explicit write policy, a permissioned and time-aware read path, and provenance on every record. The governing rule is simple: preserve decisions and evidence; discard or externalize noise. Design eviction before storage.

## Prerequisites
- [Chapter 1: The ReAct Pattern](/handbook/chapter-01-react-pattern.html) — every Thought/Action/Observation cycle appends to the context that drives the next decision.
- [Chapter 2: Plan-and-Execute](/handbook/chapter-02-plan-and-execute.html) — plans and partial progress are state that must survive across steps.
- [Chapter 5: Tool Use and Skill Registries](/handbook/chapter-05-tool-use-skill-registry.html) — tool results are the biggest single source of context pollution.

---

Imagine a research agent that has been working for an hour. It has read six documents, called search eleven times, drafted three versions of a report, and received two corrections about your team's naming conventions. Now you ask: *"Summarize what we decided about the release plan, using the corrected vendor name."*

If the agent replays the whole hour, the early correction competes with raw search results, obsolete drafts, and abandoned reasoning. Cost and latency grow while relevance falls. If it keeps only the last few messages, it may lose the decision entirely. The problem is not how to retain everything. It is how to reconstruct the smallest trustworthy working set for the next action.

That confusion is the difference between a demo and a system. This chapter is about the discipline of separating the two.

## 1. Context Is a Budget

A context window is not a filing cabinet. It is the maximum token envelope available to one model call. It is **finite**, **shared** by all input and output, and not used uniformly by the model. A model accepting 128K tokens does not give the application 128K tokens of free history.

![HDBK-006 Memory and Context Management Architecture](/images/handbook/HDBK-006-memory-context-management.webp)
*Figure 1: Context assembly combines policy, tools, working state, ranked evidence, and an output reserve. Durable memory enters governed stores only through an authorized write path; retrieval is authorized before search, resolves time and versions, and returns sourced evidence within a token budget.*

### The Five Payers of the Token Bill

Every call draws from the same envelope. Exact accounting varies by provider, but the design constraint is stable:

`input budget = context limit − maximum output − safety reserve`

Across the full envelope, five consumers compete. The first four consume the input budget; output headroom is reserved before input is admitted:

| Component | What It Costs | Typical Bloat |
|---|---|---|
| **Policy and instructions** | System/developer messages and runtime policy | Accreted rules, duplicated guidance |
| **Tool interface** | Names, descriptions, schemas, and protocol overhead | Too many exposed tools, verbose schemas |
| **Working state** | Recent messages, task state, and compacted history | Raw results, obsolete drafts, repeated context |
| **Current evidence** | Retrieved memories, documents, and tool results needed now | Unranked chunks, full files, duplicate evidence |
| **Output headroom** | Tokens the model may generate | Reserving too little, then truncating the answer |

A 128K-token window sounds generous until a large tool registry, an hour of transcript, retrieved documents, and a 12K output allowance share it. Treat overflow as an admission-control problem: shrink optional evidence, compact history, or split the task before the API rejects the call or the answer loses its ending.

### Ordering Effects Are Real

Models are not uniform readers. In the retrieval and question-answering settings tested by [Liu et al.](https://arxiv.org/abs/2307.03172), performance was often strongest when relevant information appeared near the beginning or end and weaker in the middle. This is a warning, not a universal placement law: behavior varies by model and task. Production consequences:

1. **Keep policy stable and authoritative.** Do not mix untrusted retrieved text into the instruction layer.
2. **Restate the active task and constraints clearly.** Do not assume a long transcript still makes them salient.
3. **Rank and label evidence.** Put the most relevant material close to the question and attach source identifiers.
4. **Remove dead context.** Reordering does not rescue a prompt dominated by irrelevant tokens.
5. **Evaluate placement with your model.** A synthetic needle test is useful; a task-level regression suite is better.

### Measure the Budget, Don't Guess It

Provider usage fields tell you what was billed, but often not which application component caused it. Estimate each component with the tokenizer for the exact model and reconcile the estimate against the API's authoritative usage after the call. Include message framing and tool-schema serialization; encoding concatenated text alone is only an approximation.

```python
parts = {
    "policy": policy_messages,
    "tools": exposed_tool_schemas,
    "working_state": recent_messages + compacted_state,
    "evidence": retrieved_items,
    "task": current_request,
}

estimated_input = {
    name: model_tokenizer.count(serialized)
    for name, serialized in parts.items()
}

assert sum(estimated_input.values()) <= (
    model_context_limit - max_output_tokens - safety_reserve
)
```

Log the estimate by component, the provider-reported input and output usage, and the difference between them. Alert on absolute limits and growth rate. The mismatch is useful: it catches changed schemas, hidden wrappers, and incorrect tokenizer assumptions.

## 2. Working Memory: Managing the Conversation

Working memory is the state needed to continue the current task. The transcript is one input to that state, not the state itself. For a long-running agent, the durable working set usually contains the goal, constraints, decisions, completed steps, open questions, evidence pointers, and a short recent-message window.

### The Message Lifecycle

Not every message deserves to survive verbatim:

| Message Kind | Keep As | Why |
|---|---|---|
| Active goal and constraints | Structured state + relevant verbatim text | They define success and must survive compaction. |
| Decisions and rationale | Structured state with source pointers | Later steps need both the choice and why it was made. |
| Recent user and assistant messages | Verbatim, within a small rolling window | Local conversational meaning can be lost in summaries. |
| Tool call and result | Typed summary + trace pointer | Preserve outcome, errors, and identifiers; externalize bulk data. |
| Superseded draft or failed attempt | Outcome only | Keep what was learned, not every intermediate artifact. |
| Durable correction or preference | Candidate long-term memory | Promote only through the write policy in Section 4. |
| Small talk and scratch work | Drop | They do not help resume the task. |

The cheapest correct move is to avoid admitting low-value content. Once noise has entered a summary or an embedding index, removing it is harder.

### Truncation: The Crude Baseline

Drop the oldest messages past a budget. This is simple and sometimes sufficient for short, stateless conversations. It is unsafe when early messages contain acceptance criteria, authorization boundaries, or corrections. If you use truncation, pin those items in structured state first.

### Compaction: The Working-Memory Pattern

Compaction converts an older transcript segment into structured state plus a concise narrative, while retaining recent messages verbatim. It should be treated as a state transition with invariants, not as generic summarization.

```python
def compact(checkpoint, old_messages, recent_messages, limits):
    # Bulk results remain in the trace store. The model sees typed references.
    normalized = externalize_large_results(
        old_messages,
        max_inline_tokens=limits.max_inline_result,
    )

    candidate = summarizer.extract(
        previous=checkpoint,
        messages=normalized,
        schema={
            "goal": "string",
            "constraints": "list[string]",
            "decisions": "list[{text, source_id}]",
            "completed_steps": "list[string]",
            "open_questions": "list[string]",
            "evidence": "list[{source_id, claim}]",
            "memory_candidates": "list[{text, source_id}]",
            "brief": "string",
        },
    )

    validate_required_state(candidate, previous=checkpoint)
    candidate = fit_checkpoint_to_budget(
        candidate,
        token_budget=limits.summary_tokens,
        preserve=["goal", "constraints", "decisions", "open_questions"],
    )
    if token_count(candidate) > limits.summary_tokens:
        raise ContextBudgetError("required checkpoint state exceeds its budget")

    rendered = render(candidate, recent_messages)
    if token_count(rendered) > limits.working_memory_tokens:
        rendered = shrink_optional_evidence(rendered, limits)
    if token_count(rendered) > limits.working_memory_tokens:
        raise ContextBudgetError("split the task or reduce the recent window")

    return candidate, rendered
```

Six properties make this work:

1. **Required state is explicit.** A schema makes omissions detectable. A fluent paragraph does not.
2. **Evidence remains addressable.** Summaries point to trace IDs, files, or messages instead of laundering derived claims into facts.
3. **The summary pays tokens.** It has a hard cap inside the working-memory allocation.
4. **Compaction fails closed.** If required state cannot fit, the runtime splits the task or asks for direction. It does not silently drop constraints.
5. **Durable facts are candidates, not automatic writes.** They still pass the write policy, consent, and access checks in Section 4.
6. **Drift is tested.** Periodically rebuild from raw checkpoints and compare key fields. Repeated summary-of-summary operations accumulate errors.

Two operational notes. First, a single oversized message cannot be repaired by summarizing older messages. Store the payload outside the prompt and insert a typed reference with size, source, and retrieval method. Second, tune the recent window by tokens and task boundaries, not a universal message count. A ten-message window can be tiny or enormous.

### Budget Allocation: A Starting Point

There is no universal percentage split. Start with an explicit envelope, then tune it from traces and task success. For a 128K context, one conservative experiment might be:

| Component | Budget | Notes |
|---|---|---|
| Policy + tool interface | 16K | Keep the exposed tool set small; see Chapter 5. |
| Working state | 32K | Structured checkpoint plus recent messages. |
| Current evidence and task | 56K | Ranked sources, current result, and request. |
| Maximum output | 16K | Reserved before input is admitted. |
| Safety reserve | 8K | Serialization variance and emergency headroom. |

These numbers are not recommendations for every workload. Batch extraction may allocate almost everything to evidence; an interactive coding agent may need more recent state. Record the actual high-water mark, compaction frequency, task success, and cost. Recalculate when the model, tool set, or serialization format changes.

### Sessions Resume, They Don't Restart

Persist checkpoints at stable task boundaries and before expected session shutdown; do not assume the process will exit cleanly. Submit durable memory candidates through the write policy. On resume, load the latest committed checkpoint, then retrieve only long-term memories relevant to the new request. Do not preload a user's entire memory profile into every prompt.

## 3. Long-Term Memory: Stores and Retrieval

Working memory is session-scoped. Long-term memory persists beyond the current working set. The following taxonomy is useful because each kind has different consistency and retrieval needs:

| Kind | What It Holds | Example | Typical Store |
|---|---|---|---|
| **Working** | What is needed now | Goal, constraints, open steps | Checkpoint + context window |
| **Episodic** | What happened | "The DAG planner failed on retry recovery." | Event log plus searchable index |
| **Semantic** | What is currently believed to be true | "The legal name is Northwind B.V." | Versioned records or knowledge graph |
| **Procedural** | How to perform a repeatable task | "Refunds over €500 require approval." | Reviewed skills, policy, or code |

The categories are logical, not vendor choices. A relational database can hold all four; an embedding index can accelerate search across some of them. The common mistake is treating a vector index as the system of record. Similarity search is useful for candidate generation, but exact identity, authorization, temporal validity, supersession, and deletion belong in a governed store.

### A Memory Record

Whatever the store, a memory record needs enough structure to be governed:

```json
{
  "memory_id": "mem_9f2c1a",
  "tenant_id": "tenant_7",
  "subject_id": "vendor_23",
  "type": "semantic",
  "version": 3,
  "content": "Vendor legal name is Northwind B.V.",
  "source": {
    "kind": "user_correction",
    "session_id": "sess_4412",
    "message_id": "msg_88",
    "recorded_at": "2026-07-31T09:14:22Z",
    "content_hash": "sha256:..."
  },
  "evidence_status": "direct_user_statement",
  "valid_from": "2026-07-31T09:14:22Z",
  "valid_to": null,
  "supersedes": "mem_7ab118",
  "created_at": "2026-07-31T09:14:22Z",
  "expires_at": null,
  "retention_class": "customer_profile",
  "sensitivity": "internal",
  "access": {"owner": "user_42", "policy": "vendor-team-read"},
  "status": "active"
}
```

This schema separates three clocks: when the source was recorded, when the claim became valid, and when the application stored it. That distinction matters for late-arriving updates. `supersedes` creates an auditable chain instead of overwriting history. `evidence_status` describes how the claim was obtained; it is safer than invented confidence numbers unless those numbers are calibrated against labeled data. `expires_at: null` means no automatic expiry, not unlimited legal retention. Access and retention policy still apply.

### The Read Path

Retrieval is a pipeline, not a single lookup:

```python
def retrieve(request, principal, as_of, token_budget):
    scope = authorize_memory_scope(principal, request)  # fail closed

    candidates = memory_store.search(
        lexical_query=request.text,
        vector_query=embed(request.text),
        filters={
            "tenant_id": scope.tenant_id,
            "policy": scope.allowed_policies,
            "status": "active",
            "valid_at": as_of,
        },
    )

    candidates = remove_expired_and_superseded(candidates, as_of)
    ranked = rerank(candidates, request, features=[
        "relevance", "source_quality", "temporal_fit", "task_scope"
    ])
    accepted = apply_calibrated_abstention(ranked, request.kind)
    return pack_with_sources(accepted, token_budget)
```

Seven details matter more than the embedding model:

1. **Authorize at the query boundary.** Tenant and policy constraints must be enforced by the data layer or an equally strong boundary, not applied after unauthorized rows have been retrieved.
2. **Use hybrid candidate generation when the corpus needs it.** Lexical search helps exact names and identifiers; vector search helps paraphrases. Measure each and the fusion strategy on your data.
3. **Model time explicitly.** Retrieval should answer "what was true then?" as well as "what is active now?" Recency is not the same as validity.
4. **Resolve versions before prompt assembly.** Do not send both a superseded fact and its replacement and ask the model to arbitrate.
5. **Calibrate abstention.** Similarity scores are not probabilities and are not comparable across embedding models or indexes. Choose thresholds from labeled queries and permit an empty result.
6. **Pack to a token budget.** Deduplicate overlapping memories, preserve source IDs, and stop when marginal utility falls below marginal context cost.
7. **Treat retrieved content as data.** A remembered string cannot override system policy merely because it says "ignore previous instructions."

### Latency and Caching

Measure latency by stage: authorization, query embedding, candidate search, reranking, and prompt packing. Cache only when the cache key includes tenant, principal scope, memory version, and retrieval configuration. A fast cross-tenant cache leak is still a privacy incident. Invalidate on updates and deletion; reuse a query embedding within a turn when the query has not changed.

### Shared vs. Isolated Memory

Memory topology is an architecture decision, not an implementation detail:

| Topology | What Lives There | When |
|---|---|---|
| **Shared domain store** | Reviewed team facts, vocabulary, operating knowledge | Multiple actors need a common source of truth. |
| **User-isolated store** | Personal preferences and conversation-derived facts | Personalization with strict tenant boundaries. |
| **Hybrid** | Shared domain facts plus scoped personal state | Most multi-user assistants. |

The write policy chooses the topology; authorization enforces it. Precedence must be defined by fact ownership and scope. A personal preference may override a team default for that user, while a user memory must never override a security policy.

## 4. The Write Policy: What Deserves Memory?

Storage is cheap; polluted retrieval is expensive. Every low-value or weakly sourced record increases future ambiguity, privacy surface, and deletion cost. A write policy is a gate with a default outcome of "do not persist."

### Store or Skip

| Candidate | Store? | Where | Why |
|---|---|---|---|
| Explicit correction of a durable fact | Usually | Versioned semantic record | High value, but still scoped and sourced. |
| Decision with rationale | Usually | Episodic event + artifact link | Supports later "why" questions. |
| Stated durable preference | With applicable consent | User-scoped semantic record | Useful across sessions; must be editable. |
| Task progress | Checkpoint only | Session/task state | Resume state is not a user profile. |
| Raw tool output | No copy by default | Source system or trace store | Keep a pointer, hash, and relevant extract. |
| Model inference about a person | Rarely | Review queue, not active memory | High risk of turning a guess into a profile. |
| Credential, secret, or special-category data | No by default | Purpose-built protected system if required | Memory convenience does not justify collection. |
| One-off trivia or small talk | No | — | Adds retrieval noise without durable value. |

### Write-Time Checks

Before persisting anything, ask:

1. **Purpose:** Which future decision will this improve? If there is no concrete use, skip it.
2. **Authority:** Is this a direct statement, a tool observation, a document claim, or a model inference? Preserve that distinction.
3. **Subject and scope:** Who or what is the claim about, and is it personal, project, team, or global?
4. **Permission:** Is persistence expected and allowed for this data class and subject?
5. **Novelty:** Is it new, a duplicate, a refinement, or a contradiction? Exact fingerprints catch exact copies; semantic similarity only finds candidates for merge.
6. **Time:** When is it valid, when should it be reviewed, and when must it expire?
7. **Deletion:** Can every copy, index entry, cache item, and derived summary be found when the subject asks for removal?

The write path should be deterministic around the model:

```python
candidate = extract_candidate(message, source_id=message.id)
policy = classify_data(candidate, principal, purpose)

if not policy.may_persist:
    return WriteDecision.skipped(policy.reason)

existing = find_same_subject_and_predicate(candidate, policy.scope)
decision = resolve(candidate, existing, precedence_rules)

if decision.needs_review:
    return review_queue.enqueue(candidate, existing)

record = persist_version(decision.record, retention=policy.retention)
index_after_commit(record)  # database remains the source of truth
return WriteDecision.stored(record.memory_id)
```

### Merge, Don't Accumulate

Unresolved active contradictions make retrieval less trustworthy. Resolve updates by subject, predicate, scope, time, and source authority. "Newer wins" is insufficient: a recent model summary should not supersede a signed contract. Keep the history, mark one version active for a given time range, and surface unresolved conflicts.

### Deletion Is a Write-Path Feature

Deletion cannot be bolted on later. Maintain an inventory from the source record to vector indexes, keyword indexes, caches, summaries, analytics exports, and backups. Define the semantics of erasure versus tombstoning and verify that deleted records cannot be retrieved while asynchronous cleanup completes. Log the operation without retaining the deleted content in the log.

## 5. Provenance and Trust

A memory system that cannot answer *"where did this come from?"* will eventually act on a lie and call it knowledge.

### Every Memory Has a Source

Store the source kind, locator, capture time, and content hash on every record. A derived summary should link to the source records it summarizes. This enables the read path to exclude unsupported inferences, lets the agent cite why it believes a claim, and makes reprocessing possible when an extractor changes.

### Memory Poisoning

The dangerous failure: something wrong enters memory, gets retrieved later as a neutral fact, and shapes decisions without any flag. Poison enters through four doors:

1. **Inference promotion.** The agent converts a plausible interpretation into an asserted fact.
2. **Persistent prompt injection.** Untrusted content convinces the write path to save instructions that execute on later retrieval.
3. **Stale truth.** A formerly valid claim remains active because validity and expiry were never modeled.
4. **Identity confusion.** A statement about one person, workspace, or vendor is attached to another subject.

Controls: provenance and subject IDs on every record; allowlisted memory types; separate extraction from authorization; quarantine model inferences and instruction-shaped content; versioned updates; and audits keyed by source, subject, writer, and time range. Retrieved memories belong in a clearly delimited data section and never acquire instruction authority.

### Memory Is Permissioned

One user's conversation is not another user's context. Scope writes by tenant and subject; enforce reads with server-side authorization; encrypt data in transit and at rest; minimize operator access; and audit reads as well as writes. Test with canary records that must never cross tenants. Retention, export, correction, and deletion are part of the product contract, not housekeeping.

### The Worked Example: The Vendor Name

Walk the opening scenario end to end. You say: *"It's Northwind B.V., not Northwind GmbH."* The write path identifies the vendor subject and legal-name predicate, records a direct user correction, and finds the older active value. Because the principal is authorized for that vendor profile, it creates a new version that supersedes the old one. Three days later, retrieval is scoped to the same tenant and vendor, removes the superseded version, and packs the active claim with its source ID. The agent uses *Northwind B.V.* and can show where the correction came from. Write, version, authorize, retrieve, and cite are explicit system decisions.

## 6. Evaluate the Memory System

A memory feature is not successful because it recalled an anecdote in a demo. Evaluate the complete lifecycle: what was written, what was retrieved, what reached the prompt, and whether it improved the task.

### Offline Evaluation

Build replayable histories with labeled queries that cover:

- exact facts, paraphrases, and multi-hop references;
- corrections, contradictions, and facts valid only during a time range;
- irrelevant but semantically similar memories;
- malicious instruction-shaped records;
- tenant-isolation and deletion cases;
- long sessions with repeated compaction.

Measure retrieval recall and precision, conflict resolution, source attribution, temporal accuracy, compaction state retention, and end-to-end task success. Compare against simple baselines: recent-window only, full context when it fits, lexical retrieval, and vector retrieval. Complexity must earn its operational cost. Benchmarks such as [MemoryAgentBench](https://arxiv.org/abs/2507.05257) provide useful task categories, but your own data distribution and privacy boundaries remain decisive.

### Production Signals

Log enough to reconstruct a decision without logging sensitive content unnecessarily:

| Signal | What It Reveals |
|---|---|
| Input tokens by component + output reserve | Context growth and budgeting errors |
| Compaction count, ratio, and invariant failures | Summary pressure and drift |
| Candidate, accepted, and injected memory IDs | Where retrieval lost or added information |
| Zero-result and abstention rate | Coverage gaps and threshold behavior |
| Superseded or expired records retrieved | Temporal-consistency bugs |
| Write skip, merge, conflict, and review rates | Memory quality at ingestion |
| p50/p95 latency by retrieval stage | Performance bottlenecks |
| Cross-tenant canary hits | Isolation failure; target is zero |
| Deletion completion and post-delete retrieval tests | Lifecycle correctness |

Trace IDs should connect the model call to the checkpoint, retrieval configuration, memory versions, and source artifacts. Redact content where identifiers are sufficient.

## 7. Production Failure Modes

| Failure Mode | What Happens | Control |
|---|---|---|
| **Context overflow** | The provider rejects the request, output is truncated, or an adapter drops content. | Preflight accounting, output reserve, explicit overflow policy. |
| **Constraint loss** | Compaction removes an acceptance criterion or authorization boundary. | Structured invariants, checkpoint validation, replay tests. |
| **Summary drift** | Repeated compaction gradually changes the recorded state. | Source pointers, periodic rebuild, field-level comparison. |
| **Retrieval miss** | The right memory exists but candidate generation or filtering misses it. | Labeled queries, hybrid baselines, stage-level traces. |
| **False recall** | The model invents a memory or overstates weak evidence. | Source-bound context, calibrated abstention, citations. |
| **Memory poisoning** | Wrong or injected content returns later as trusted context. | Allowlisted types, quarantine, instruction/data separation, audits. |
| **Staleness** | An old value is returned as current. | Valid-time fields, supersession, expiry and refresh jobs. |
| **Cross-tenant leakage** | One tenant's memory reaches another tenant. | Data-layer authorization, isolation tests, canaries; target zero. |
| **Deletion shadow** | The source is deleted but an index, cache, or summary still returns it. | Dependency inventory, invalidation, post-delete verification. |
| **Feedback loop** | Model output is stored, retrieved, and treated as independent evidence. | Provenance filtering and no self-authentication of claims. |
| **Cost or latency blowup** | History, retrieval, or reranking grows without bound. | Component budgets, stage metrics, bounded candidate sets. |

### Debugging Checklist

When memory behavior is wrong, ask in this order:

1. Was the information present in the source trace?
2. Did the write policy store, skip, merge, or quarantine it — and why?
3. Does the record have the right tenant, subject, type, source, and valid time?
4. Did authorization or lifecycle filtering remove it?
5. Did candidate generation find it, and did reranking or abstention reject it?
6. Was it packed into the prompt within budget, with its source attached?
7. Did compaction preserve the active goal and constraints?
8. Can the final claim be traced to an active record and original evidence?

---

## Summary
- **Context is an envelope.** Reserve output first, then budget policy, tools, working state, and evidence.
- **Working memory is task state, not transcript replay.** Compact into structured checkpoints, retain a small recent window, and keep bulky evidence addressable outside the prompt.
- **Long-term memory is a governed lifecycle.** A vector index may assist retrieval; it is not the source of truth.
- **Writes default to skip.** Persist only purposeful, permitted, sourced, scoped, time-aware records that can later be corrected and deleted.
- **Retrieval must authorize, resolve time and versions, abstain, and pack to budget.** Relevance alone is insufficient.
- **Evaluate end to end.** A memory is useful only when it improves the task without violating privacy, trust, latency, or cost boundaries.

## Further Reading
- [Anthropic: Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — compaction, structured note-taking, and context curation for long-running agents.
- [Liu et al.: Lost in the Middle](https://arxiv.org/abs/2307.03172) — evidence that information position can affect long-context performance.
- [Packer et al.: MemGPT — Towards LLMs as Operating Systems](https://arxiv.org/abs/2310.08560) — an OS-inspired hierarchy for moving information between context and external storage.
- [Lewis et al.: Retrieval-Augmented Generation](https://arxiv.org/abs/2005.11401) — the foundational retriever-generator architecture.
- [Hu et al.: MemoryAgentBench](https://arxiv.org/abs/2507.05257) — evaluation of accurate retrieval, test-time learning, long-range understanding, and conflict resolution.

## What's Next?
In [Chapter 7: Human-in-the-Loop](/handbook/chapter-07-human-in-the-loop.html), we cover approval gates, escalation, and the interaction patterns that keep people in control of consequential agent actions — including human review of what the agent believes.

## Related Chapters
- [Chapter 1: The ReAct Pattern](/handbook/chapter-01-react-pattern.html) — each loop iteration reads from and writes to context.
- [Chapter 2: Plan-and-Execute](/handbook/chapter-02-plan-and-execute.html) — plan state and partial progress are memory that must survive steps.
- [Chapter 3: The Reflection Pattern](/handbook/chapter-03-reflection.html) — critic and rubric outputs are prime candidates for episodic and semantic memory.
- [Chapter 4: Multi-Agent Collaboration](/handbook/chapter-04-multi-agent-collaboration.html) — shared and isolated memory is a topology decision.
- [Chapter 5: Tool Use and Skill Registries](/handbook/chapter-05-tool-use-skill-registry.html) — tool results are the main context polluter; retrieval is a read path.
- [Chapter 7: Human-in-the-Loop](/handbook/chapter-07-human-in-the-loop.html) — the review queue and supersession rules become an interaction pattern for correcting agent beliefs.

## Frequently Asked Questions

**Q: When should I use summarization vs. dropping messages entirely?**
Drop content with no future task value. Externalize bulky content that may be needed again. Compact decisions, constraints, progress, and open questions into structured state with source pointers. Submit durable facts separately through the long-term write policy.

**Q: Is a vector database enough for agent memory?**
No. A vector index is useful for similarity-based candidate generation. Exact facts, identity, authorization, temporal validity, versions, and deletion need a governed source of truth. Add lexical search when exact terms and identifiers matter.

**Q: How do I stop the agent from remembering things it shouldn't?**
Default to not storing. Apply data classification, purpose and consent rules, tenant scope, retention, and allowlisted memory types before persistence. Quarantine model inferences about people and instruction-shaped content. Provide correction and deletion paths.

**Q: What is the difference between RAG and agent memory?**
RAG is primarily a read-time pattern for retrieving source material. Agent memory also has a write and lifecycle problem: information is created during interaction, then merged, versioned, scoped, expired, corrected, and deleted. The retrieval machinery can overlap; the governance requirements differ.

**Q: How do I deduplicate or merge conflicting memories?**
Match on subject, predicate, and scope before comparing values. Use fingerprints for exact duplicates and semantic search only to propose merge candidates. Resolve conflicts with source authority and valid time, not similarity or recency alone. Send unresolved cases to review.

**Q: How often should compaction run?**
Trigger it from the working-memory token budget, preferably before the hard limit. Also compact at meaningful task boundaries when a clean checkpoint will improve resumability. Never rely on a timer or message count alone.

## Glossary Terms Introduced
- **Context Window**: The maximum token envelope shared by input and generated output for one model call.
- **Working Memory**: Session-scoped task state assembled into the context needed for the current decision.
- **Compaction**: Converting older interaction history into a bounded checkpoint while retaining recent messages and evidence pointers.
- **Episodic Memory**: A record of events, attempts, decisions, and outcomes.
- **Semantic Memory**: A versioned claim about an entity, with source and temporal scope.
- **Procedural Memory**: Reviewed knowledge about how to perform a repeatable task, often represented as policy, skill, prompt, or code.
- **Memory Record**: A governed unit of persistent state with subject, content, provenance, time, lifecycle, and access metadata.
- **Memory Topology**: The decision of which stores are shared across agents and which are isolated.
- **Provenance**: The recorded origin and derivation chain of a memory.
- **Decay Policy**: A schedule that lowers the retrieval weight of a record as it ages, distinct from hard expiry.
- **Memory Poisoning**: False or injected content entering memory and later being retrieved as trusted fact.
- **Hybrid Search**: Candidate retrieval that combines lexical and vector signals, usually with metadata constraints and rank fusion.
- **RAG (Retrieval-Augmented Generation)**: A read-time pattern that retrieves relevant corpus chunks and places them in context.

## Revision History
| Version | Date | Changes |
|---|---|---|
| v1.3 | 2026-07-31 | Added the governed context-and-memory architecture diagram; corrected the input/output budget explanation; fixed compaction schema and checkpoint bounds; strengthened crash-safe checkpointing; clarified conflict and poisoning language. |
| v1.2 | 2026-07-31 | Deep editorial and technical rewrite: corrected token-envelope accounting; replaced transcript-centric compaction with validated task checkpoints; strengthened record identity, temporal semantics, authorization, deletion, and poisoning controls; removed unsupported latency and confidence constants; added end-to-end evaluation and production signals. |
| v1.1 | 2026-07-31 | Post-peer-review revision: fixed compaction pseudocode (budget accounting includes summary, defined keep_recent/tokenizer, oversized-message handling, promotion hook); added tokenizer-based measurement, retrieval budget, latency/caching, shared-vs-isolated topology, dedup and conflict guidance, provenance filtering, ground-truth checkpoints, and model/window-change controls. |
| v1.0 | 2026-07-31 | Initial publication. |

## Meta
- Slug: HDBK-006-memory-context-management
- Tags: Context Management, Memory, Compaction, RAG, Provenance, Vector Stores, Agent State, Production Patterns
- OG Image: /images/handbook/HDBK-006-memory-context-management.webp
