# Chapter 4: Multi-Agent Collaboration — Teams, Topologies, and Debate

**Reading time:** 12 min | **Last revised:** 2026-07-05 | **Version:** 1.2

## If You Only Read One Section
**Multi-agent collaboration** is what you reach for when a single agent loop is not enough. Instead of one agent doing everything, you split the work across specialized agents that delegate, debate, and hand off tasks. The three patterns you already know — ReAct, Plan-and-Execute, and Reflection — compose here: each sub-agent runs a ReAct loop, an Orchestrator uses Plan-and-Execute to decompose work, and Debate is multi-party Reflection. But multi-agent systems multiply cost, latency, and failure modes. The first rule is: *do not use them unless a single agent demonstrably fails.*

## Prerequisites
- Chapter 1: The ReAct Pattern — every sub-agent in a multi-agent system runs some form of the TAO loop.
- Chapter 2: Plan-and-Execute — the Orchestrator's internal engine is a planner-executor-replanner.
- Chapter 3: The Reflection Pattern — debate is Reflection with multiple independent critics.

---

A single agent running ReAct can handle many tasks. But when tasks grow in scope, diversity, or risk, one agent hits three walls:

1. **Context saturation**: The prompt accumulates so much history that the agent loses focus.
2. **Skill breadth**: No single system prompt can make one model an expert in code review, legal analysis, and creative writing simultaneously.
3. **Accountability**: A single agent has no internal checks — it can drift without anyone noticing.

Multi-agent systems solve these by distributing work across specialized agents that each have a narrow scope, a tight system prompt, and a clear interface.

## 1. The Orchestrator Pattern: One Brain, Many Hands

The most common multi-agent topology is a **hierarchical tree**: one Orchestrator agent decomposes a goal into sub-tasks, delegates each to a specialized Worker agent, and synthesizes the results.

![HDBK-004 Multi-Agent Collaboration](/images/handbook/HDBK-004-multi-agent-collaboration.svg)
*Figure 1: Multi-agent collaboration — A user goal enters an Orchestrator that plans, routes, and synthesizes work. Specialized workers run independent ReAct loops, return structured results, and critical outputs can pass through a debate or reflection gate before the final answer.*

### Worked Example: Security Audit Report

Let's trace a real task through the Orchestrator pattern: *"Generate a security audit report for our Python web application."*

**Step 1 — Plan:** The Orchestrator decomposes the goal into three sub-tasks:

| Task ID | Description | Required Skill |
|---------|-------------|---------------|
| T1 | Code review: scan `auth.py` for SQL injection, XSS, and hardcoded secrets | security_reviewer |
| T2 | Dependency audit: check `requirements.txt` against CVE database | dependency_scanner |
| T3 | Threat model: identify attack surfaces in the API design | threat_modeler |

**Step 2 — Route:** The Orchestrator matches each task to a worker based on capability manifests:
- T1 → `security_reviewer` (capabilities: `["static_analysis", "python", "OWASP_top10"]`)
- T2 → `dependency_scanner` (capabilities: `["cve_lookup", "pip_audit", "supply_chain"]`)
- T3 → `threat_modeler` (capabilities: `["STRIDE", "attack_surface_analysis", "API_design"]`)

**Step 3 — Delegate:** Each worker receives a structured handoff and runs its ReAct loop independently. T2 and T3 execute in parallel since they have no shared dependencies.

**Step 4 — Synthesize:** The Orchestrator receives three structured result objects and composes them into a unified report with an executive summary, ranked findings, and remediation timeline.

This example shows the Orchestrator doing real work: decomposition, capability matching, parallel execution, validation, and synthesis.

### Delegation Pseudocode

```python
class Orchestrator:
    def __init__(self, workers: dict[str, Agent], router: LLM):
        self.workers = workers
        self.router = router
        self.trace_id = generate_trace_id()  # For observability across agents

    def execute(self, goal: str) -> str:
        # Step 1: Plan — what sub-tasks are needed?
        plan = self.router.plan(goal, available_skills=list(self.workers.keys()))
        
        results = {}
        for task_batch in plan.ready_batches():
            assignments = []
            for task in task_batch:
                # Step 2: Route — which worker is best for this sub-task?
                worker_name = self.router.route(task, candidates=self.workers.keys())
                worker = self.workers[worker_name]
                
                # Step 3: Delegate — worker runs its own ReAct loop
                handoff = Handoff(
                    task=task,
                    trace_id=self.trace_id,
                    context={"goal": goal, "previous_results": results},
                    acceptance_criteria=task.acceptance_criteria
                )
                assignments.append((task, worker_name, worker.run_async(handoff)))

            # Independent tasks can run in parallel; dependent batches wait.
            for task, worker_name, result in await_all(assignments):
                if not result.meets_contract or result.confidence < 0.7:
                    log.warning(f"Low quality result from {worker_name}")
                    # Option: re-delegate to a different worker or escalate to human

                results[task.id] = result
        
        # Step 4: Synthesize — combine results into a final answer
        return self.router.synthesize(goal, results)
```

### The Capability Registry: How Workers Advertise Skills

Before routing can work, workers must declare what they can do. Each worker publishes a **capability manifest**:

```json
{
  "worker_id": "security_reviewer",
  "capabilities": ["static_analysis", "python", "OWASP_top10"],
  "model_profile": "security_review",
  "cost_tier": "medium",
  "max_context_tokens": 128000,
  "required_tools": ["static_analyzer", "repo_reader"]
}
```

The Orchestrator matches task requirements against these manifests. A capability registry can start as a static JSON file and evolve into a dynamic service. A later chapter on tool use and skill registries will cover how to scale this beyond a local catalog.

### The Routing Decision

The Orchestrator's router must answer: *which agent gets this sub-task?* Three common approaches:

| Routing Strategy | How It Works | Best For |
|-----------------|-------------|----------|
| **Keyword-based** | Map task descriptions to worker names via regex or embeddings. | Simple, predictable workflows. |
| **LLM-based** | The router model reads the task and selects the best worker from a catalog. | Dynamic tasks where skill matching is non-obvious. |
| **Capability registry** | Each worker advertises a capability manifest; router matches by capability intersection. | Large agent fleets with evolving skills. |

### The "Handoff" Protocol: What Passes Between Agents

Agents should not rely on implicit shared memory. They should exchange a **structured handoff**:

```json
{
  "from": "orchestrator",
  "to": "code_reviewer",
  "trace_id": "audit-2026-07-05-001",
  "task": "Review the auth module for SQL injection vulnerabilities",
  "context": {
    "code": "<file contents>",
    "stack": "Python 3.12, FastAPI, SQLAlchemy",
    "constraints": ["Must maintain backward compatibility", "No new dependencies"]
  },
  "acceptance_criteria": [
    "Findings include severity, evidence, and remediation",
    "False positives are marked with confidence below 0.7"
  ],
  "expected_output": "List of vulnerabilities with severity and fix suggestions"
}
```

Without a structured handoff, sub-agents hallucinate missing context. With it, they operate like microservices: contract in, result out.

## 2. The Debate Pattern: Multi-Party Reflection

Chapter 3 showed how a single Critic reviews a Generator's output. **Debate** scales this: multiple agents take opposing positions, argue, and converge on a consensus.

### When Debate Wins Over Single-Agent Reflection

| Scenario | Single Critic | Multi-Agent Debate |
|----------|--------------|-------------------|
| Code review | Good enough | Overkill — one thorough critic suffices. |
| Architecture decision | Risk of blind spots | **High value** — multiple perspectives catch trade-offs. |
| Content moderation | Reasonable | **Stronger** — reduces individual bias. |
| Scientific analysis | Prone to confirmation bias | **Essential** — adversarial review catches errors. |

### Consensus Mechanism

Debate without a stopping condition is just an argument. You need a **convergence protocol** that measures *agreement*, not just textual similarity:

```python
def debate(proposal: str, agents: list[Agent], max_rounds: int = 3) -> str:
    positions = [proposal]
    dissents = []  # Audit trail of all disagreements
    
    for round_num in range(max_rounds):
        critiques = []
        for agent in agents:
            critique = agent.critique(
                proposal=positions[-1],
                history=positions,
                role=agent.role
            )
            critiques.append(critique)
            if critique.disagrees:
                dissents.append({
                    "round": round_num,
                    "agent": agent.role,
                    "concern": critique.summary
                })
        
        # Synthesize critiques into a revised position
        revised = synthesize(positions[-1], critiques)
        positions.append(revised)
        
        # Convergence check: ask each agent "do you accept this version?"
        votes = [agent.vote_accept(revised) for agent in agents]
        acceptance_rate = sum(votes) / len(votes)
        
        if acceptance_rate >= 0.75:  # Supermajority threshold
            return revised
    
    # No supermajority after max rounds — return best with dissenting notes
    dissent_block = "\n".join(
        f"- [{d['round']}] {d['agent']}: {d['concern']}" for d in dissents
    )
    return positions[-1] + f"\n\nNo supermajority reached. Dissenting opinions:\n{dissent_block}"
```

**Why not edit distance?** Textual similarity measures whether two strings look alike — not whether the agents agree. Two agents can produce nearly identical text while holding opposite conclusions, or wildly different text that reaches the same verdict. Explicit voting (`vote_accept`) measures agreement directly: each agent is asked *"Do you accept this version as correct?"* and responds yes/no with reasoning.

### Preventing Echo Chambers

Multi-agent debates can devolve into agreement spirals — especially if all agents share the same base model. Mitigations:

- **Diverse model assignment**: Route different agents to different model families or system prompts so their failure modes are less correlated.
- **Adversarial role assignment**: Explicitly assign one agent the role of "Devil's Advocate" with the instruction: *"Your job is to find the weakest point in every proposal, even if you partially agree."*
- **Structured dissent logging**: Record every disagreement, not just the final consensus. This creates an audit trail for human review.

## 3. Multi-Agent Topologies: Choosing the Right Shape

Not all multi-agent systems are trees. The topology you choose determines failure modes, latency, and cost.

| Topology | Structure | Latency | Best For |
|----------|-----------|---------|----------|
| **Sequential Handoff** | A → B → C (assembly line) | High (serial) | Document pipelines: draft → review → polish. |
| **Parallel Fan-Out** | Orchestrator → [A, B, C] simultaneously | Low (parallel) | Independent sub-tasks: research topic A, B, C in parallel. |
| **Hierarchical Tree** | Orchestrator → Workers → Sub-workers | Medium | Complex projects with nested sub-goals. |
| **Peer-to-Peer Debate** | A ↔ B ↔ C (fully connected) | Medium-High | High-stakes decisions requiring consensus. |
| **Blackboard** | Agents read/write to shared state, no direct communication | Variable | Collaborative problem-solving with emergent behavior. |

### The Blackboard Pattern

In the **Blackboard** topology, there is no Orchestrator. Agents read from and write to a shared workspace. An agent wakes up when it sees something it can contribute to.

This is powerful for open-ended creative or research tasks, but it is also the hardest topology to debug because there is no single point of control.

```python
class Blackboard:
    def __init__(self):
        self.workspace: dict = {}  # Shared state visible to all agents
    
    def run_cycle(self, agents: list[Agent], max_cycles: int = 10):
        for cycle in range(max_cycles):
            contributions = 0
            for agent in agents:
                # Agent checks: "is there something here I can improve?"
                contribution = agent.contribute(self.workspace)
                if contribution:
                    self.workspace[contribution.key] = contribution.value
                    contributions += 1
            
            # Termination: no agent had anything to add
            if contributions == 0:
                break
        
        return self.workspace
```

## 4. The Cost Problem: When Multi-Agent Is a Mistake

Every sub-agent is an LLM call. Every debate round multiplies that cost:

| System | Calls per Task | Cost Factor |
|--------|---------------|-------------|
| Single ReAct agent | 3–10 calls | 1× |
| Plan-and-Execute | 5–15 calls | 1.5–3× |
| Orchestrator + 3 Workers | 10–40 calls | 3–8× |
| 4-Agent Debate (3 rounds) | 12+ calls | 4–10× |

### The Single-Agent-Suffice Rule

Before building a multi-agent system, prove that a single agent fails.

**Test:** Give the task to one well-prompted agent with access to the same tools. If it succeeds more than 80% of the time, you probably do not need multi-agent. The remaining failures can often be handled by:
- Adding a Reflection pass (Chapter 3).
- Expanding the agent's tools.
- Improving the system prompt.

Multi-agent is for when the *architecture of the problem* requires parallel expertise, not when you're trying to fix a weak prompt.

## 5. Production Failure Modes

| Failure Mode | What Happens | Mitigation |
|-------------|-------------|------------|
| **Delegation Loop** | Orchestrator delegates to Worker A, which delegates back to Orchestrator, which delegates to Worker A... | Max delegation depth (2–3 levels). Track call chain. |
| **Echo Chamber** | All agents agree because they share the same model and biases. | Diverse model assignment. Mandatory Devil's Advocate role. |
| **Context Leak** | Worker A's internal reasoning bleeds into Worker B's prompt, confusing it. | Structured handoffs only. Never pass raw agent transcripts. |
| **Orchestrator Bottleneck** | Orchestrator becomes the single point of failure and latency. | Parallel fan-out where possible. Timeout per sub-agent. |
| **Cost Explosion** | A debate that should take 2 rounds takes 8 because convergence threshold is too tight. | Hard cap on debate rounds (3–5). Cost budget per task. |
| **Silent Failure** | A worker returns a plausible but wrong result. Orchestrator doesn't detect it. | Every worker result gets a confidence score. Low-confidence results trigger re-delegation or human escalation. |

## 6. Decision Framework: Should You Go Multi-Agent?

```
Is the task decomposable into independent sub-tasks?
    │
    ├── NO → Single agent (Chapters 1–3 are sufficient)
    │
    └── YES → Do sub-tasks require different expertise?
                  │
                  ├── NO → Parallel fan-out with same agent type
                  │
                  └── YES → Is latency critical? (sub-2s SLA?)
                                │
                                ├── YES → Parallel fan-out. Skip debate — it adds rounds.
                                │
                                └── NO → Is the cost of an error high?
                                              │
                                              ├── NO → Orchestrator + Workers
                                              │
                                              └── YES → Orchestrator + Workers + Debate on critical sub-tasks
                                                           │
                                                           └── Can a human resolve ambiguous cases?
                                                                 │
                                                                 ├── YES → Add Human-in-the-Loop gate for low-confidence results
                                                                 │
                                                                 └── NO → Full automated debate with structured dissent audit trail
```

### Adding Observability from Day One

Multi-agent systems are distributed systems. Debugging them without observability is slow and unreliable. Every agent call should emit:

- **Trace ID**: A single ID that follows the entire orchestration from user goal to final output.
- **Span attributes**: Agent name, role, model, input tokens, output tokens, latency, cost.
- **Confidence score**: Every worker result gets a score. The Orchestrator's pseudocode in §1 already includes this check.

**Getting confidence scores from LLMs:** There is no universal standard, but three approaches work in practice:

| Method | How | Accuracy |
|--------|-----|----------|
| **Explicit prompt** | Add to system prompt: *"End every response with `Confidence: [0-10]` and a one-sentence justification."* | Moderate — models tend toward 7-8 by default. |
| **Log-probability** | Average token log-probabilities over the output. Low average = uncertain generation. | Good for factual answers, poor for creative ones. |
| **Verifier agent** | A separate lightweight agent reads the result and scores it against a rubric. | Best — but adds a call. Use for high-stakes sub-tasks only. |

Start with explicit prompting. Add verifier agents only for sub-tasks where a wrong answer has real consequences.

---

## Summary
- **Multi-agent systems** compose ReAct, Plan-and-Execute, and Reflection into teams of specialized agents.
- The **Orchestrator Pattern** uses one agent to plan, route, and synthesize — each Worker runs its own ReAct loop.
- The **Debate Pattern** is multi-party Reflection: agents argue from different perspectives until consensus.
- Choose your **topology** based on task structure: sequential for pipelines, parallel for independence, debate for high-stakes decisions.
- **The first rule of multi-agent is: do not.** Prove a single agent fails before adding complexity.
- **Structured handoffs** between agents prevent context leaks and hallucination.

## What's Next?
In the next chapter, we will move from agent teams to the interface between agents and the outside world: how to design tools that agents can use reliably, and how to build a skill registry that scales.

## Related Chapters
- Chapter 1: The ReAct Pattern — the fundamental loop every sub-agent runs.
- Chapter 2: Plan-and-Execute — the Orchestrator's internal engine.
- Chapter 3: The Reflection Pattern — the foundation of the Debate pattern.

## Frequently Asked Questions

**Q: Should I start with a multi-agent system?**
No. Start with one agent plus strong tools, tests, and a reflection pass. Add multiple agents only when the task naturally decomposes into independent expertise or when a single context becomes the bottleneck.

**Q: Is an Orchestrator just a router?**
No. A router only selects a destination. An Orchestrator owns decomposition, routing, validation, retry policy, synthesis, and the trace that ties the whole workflow together.

**Q: How do agents share memory safely?**
Use structured handoffs and shared external state. Do not pass raw transcripts between agents unless the receiving agent truly needs them; transcripts leak irrelevant reasoning and inflate context.

**Q: When is debate worth the extra calls?**
Use debate when the cost of a wrong answer is higher than the cost of extra latency: architecture decisions, security findings, policy judgments, high-impact content, and ambiguous trade-offs.

**Q: What is the first production control I should add?**
Add trace IDs across all agent calls. Without end-to-end traces, a multi-agent workflow becomes hard to debug as soon as one worker produces a plausible but wrong result.

<!-- CTA -->

## Glossary Terms Introduced
- **Orchestrator**: The agent responsible for decomposing a goal, routing sub-tasks to workers, and synthesizing results.
- **Handoff Protocol**: A structured data format (typically JSON) that passes task, context, and expected output between agents.
- **Debate Pattern**: A multi-agent collaboration where agents argue from opposing perspectives and converge on consensus.
- **Blackboard Pattern**: A topology where agents read/write to a shared workspace with no central orchestrator.
- **Topology**: The communication structure of a multi-agent system — sequential, parallel, hierarchical, peer-to-peer, or blackboard.
- **Echo Chamber**: A failure mode where all agents agree because they share the same model and biases, producing no real scrutiny.

## Revision History
| Version | Date | Changes |
|---------|------|---------|
| v1.2 | 2026-07-05 | Editorial pass: aligned pseudocode with parallel delegation, added handoff acceptance criteria, and tightened production tone. |
| v1.1 | 2026-07-05 | Website integration: added diagram asset, FAQ schema support, stable model references, and safer forward references. |
| v1.0 | 2026-07-05 | Initial publication. Post peer review: added worked example, fixed consensus mechanism (edit distance → explicit voting), expanded decision framework with latency and HITL branches, and added observability guidance and confidence scoring methods. |

## Meta
- Slug: HDBK-004-multi-agent-collaboration
- Tags: Multi-Agent, Orchestration, Debate, Topology, Collaboration, Architecture
- OG Image: /images/handbook/HDBK-004-multi-agent-collaboration.svg
