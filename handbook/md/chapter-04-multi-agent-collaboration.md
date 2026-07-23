# Chapter 4: Multi-Agent Collaboration — Teams, Topologies, and Debate

**Reading time:** 13 min | **Last revised:** 2026-07-23 | **Version:** 1.3

## If You Only Read One Section
**Multi-agent collaboration** is what you reach for when one agent cannot meet a measured quality, latency, or context requirement. Instead of one agent doing everything, you split the work across specialized agents that delegate, debate, and hand off tasks. The three patterns you already know — ReAct, Plan-and-Execute, and Reflection — compose here: each Worker can run a ReAct loop, an Orchestrator uses Plan-and-Execute to decompose work, and Debate is multi-party Reflection. But every extra agent adds coordination, cost, latency, and new failure modes. Start with one agent. Add a team only when evaluation shows why the simpler design fails.

## Prerequisites
- [Chapter 1: The ReAct Pattern](/handbook/chapter-01-react-pattern.html) — every Worker can run some form of the TAO loop.
- [Chapter 2: Plan-and-Execute](/handbook/chapter-02-plan-and-execute.html) — the Orchestrator's internal engine is a planner-executor-replanner.
- [Chapter 3: The Reflection Pattern](/handbook/chapter-03-reflection.html) — debate is Reflection with multiple independent critics.

---

A single agent running ReAct can handle many tasks. Multi-agent architecture becomes useful when the workload hits one of three measured constraints:

1. **Context isolation**: Independent workstreams need large, focused contexts that should not compete in one prompt.
2. **Parallelism**: Independent sub-tasks dominate wall-clock time and can safely execute concurrently.
3. **Separation of concerns**: Different steps need distinct tools, permissions, data boundaries, or acceptance criteria.

Multi-agent systems address these constraints by distributing work across narrowly scoped agents with explicit interfaces. They do not create expertise or accountability automatically; those still come from tools, evidence, evaluation, and human ownership.

## 1. The Orchestrator Pattern: One Brain, Many Hands

The most common multi-agent topology is a **hierarchical tree**: one Orchestrator agent decomposes a goal into sub-tasks, delegates each to a specialized Worker agent, and synthesizes the results.

![HDBK-004 Multi-Agent Collaboration](/images/handbook/HDBK-004-multi-agent-collaboration.svg)
*Figure 1: Multi-agent collaboration — A user goal enters an Orchestrator that plans, routes, and synthesizes work. Specialized workers run independent ReAct loops, return structured results, and critical outputs can pass through a debate or reflection gate before the final answer.*

### Worked Example: Security Audit Report

Let's trace a representative task through the Orchestrator pattern: *"Generate a security audit report for our Python web application."*

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
    def __init__(self, workers: dict[str, Agent], router: LLM, validator: Validator):
        self.workers = workers
        self.router = router
        self.validator = validator

    async def execute(self, goal: str) -> str:
        trace_id = generate_trace_id()  # One trace per user goal

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
                    trace_id=trace_id,
                    context={"goal": goal, "previous_results": results},
                    acceptance_criteria=task.acceptance_criteria
                )
                assignments.append((task, worker_name, worker.run_async(handoff)))

            # Independent tasks can run in parallel; dependent batches wait.
            for task, worker_name, result in await await_all(assignments):
                validation = self.validator.check(task, result)
                if not validation.passed:
                    raise WorkerResultRejected(
                        worker=worker_name,
                        task_id=task.id,
                        reasons=validation.failures
                    )

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

The Orchestrator matches task requirements against these manifests. A capability registry can start as a static JSON file and evolve into a dynamic service. [Chapter 5: Tool Use and Skill Registries](/handbook/chapter-05-tool-use-skill-registry.html) covers how to scale this beyond a local catalog.

### The Routing Decision

The Orchestrator's router must answer: *which agent gets this sub-task?* Three common approaches:

| Routing Strategy | How It Works | Best For |
|-----------------|-------------|----------|
| **Rule-based** | Map explicit task types, tenants, or data classes to approved workers. | Predictable workflows and strict policy boundaries. |
| **Semantic** | Rank capability descriptions against the task, then apply permission filters. | Larger catalogs with well-defined capability metadata. |
| **Model-based** | A routing model selects from an allowlisted catalog and explains its choice. | Dynamic tasks where matching requires semantic judgment. |
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
    "Every finding cites a file and line range",
    "Unverified findings are marked for human review"
  ],
  "expected_output": "List of vulnerabilities with severity and fix suggestions"
}
```

Without a structured handoff, Workers must infer missing context and can silently diverge from the goal. With one, they behave more like services: contract in, result out, validation at the boundary.

## 2. The Debate Pattern: Multi-Party Reflection

Chapter 3 showed how a single Critic reviews a Generator's output. **Debate** scales this: multiple agents take opposing positions, argue, and converge on a consensus.

### When Debate Wins Over Single-Agent Reflection

| Scenario | Single Critic | Multi-Agent Debate |
|----------|--------------|-------------------|
| Code review | Good enough | Overkill — one thorough critic suffices. |
| Architecture decision | Risk of blind spots | **High value** — multiple perspectives catch trade-offs. |
| Content moderation | Often sufficient with a clear policy | Useful only when independent policies or escalation paths exist. |
| Scientific analysis | Can miss alternative explanations | Useful for generating challenges; evidence still decides correctness. |

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

Consensus is a stopping signal, not proof of correctness. Agents can agree on the same wrong premise. High-stakes debates still need source checks, deterministic validation, or human review.

### Preventing Echo Chambers

Multi-agent debates can devolve into agreement spirals — especially if all agents share the same base model. Mitigations:

- **Independent evidence collection**: Let agents gather evidence before they see one another's conclusions.
- **Diverse failure modes**: Vary model families, tools, data sources, or review methods where the risk justifies it. Different role prompts alone are weak diversity.
- **Evidence-bound challenge**: Require the challenger to cite a violated constraint, missing source, failed test, or counterexample.
- **Structured dissent logging**: Record every material disagreement, not just the final consensus. This creates an audit trail for human review.

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

Every Worker adds model turns, tool calls, context transfer, and coordination. A useful cost envelope is:

`total cost = orchestration + Σ(worker runs) + validation + retries + synthesis`

| Design | What Adds Cost | What Can Reduce Wall-Clock Time |
|--------|----------------|---------------------------------|
| Single agent | One growing context and its tool calls | Parallel tool calls can help, but the decision loop stays mostly serial. |
| Parallel fan-out | One Worker run per independent branch, plus synthesis | Concurrent execution of independent branches. |
| Hierarchical orchestration | Routing and synthesis at every level | Parallelism within each ready task batch. |
| Debate | Every participant, round, critique, and vote | Little; later rounds depend on earlier rounds. |

Parallelism can reduce latency without reducing token or tool spend. Measure both.

### The Single-Agent-Suffice Rule

Before building a multi-agent system, prove that a single agent fails.

**Test:** Build a representative evaluation set and run one well-prompted agent with the same tools and permissions. If it meets the product's acceptance criteria, stop. If it fails, classify the cause before changing the architecture. Common fixes are:
- Adding a [Reflection pass](/handbook/chapter-03-reflection.html).
- Expanding the agent's tools.
- Improving the system prompt.
- Reducing irrelevant context.

Multi-agent is for when the *architecture of the problem* requires parallel expertise, not when you're trying to fix a weak prompt.

## 5. Production Failure Modes

| Failure Mode | What Happens | Mitigation |
|-------------|-------------|------------|
| **Delegation Loop** | Orchestrator delegates to Worker A, which delegates back to the Orchestrator. | Track the call chain. Enforce depth, turn, and cost budgets. |
| **Echo Chamber** | Agents agree because their evidence and failure modes are correlated. | Collect evidence independently. Require counterexamples and source-backed dissent. |
| **Context Leak** | Irrelevant or sensitive history reaches a Worker that does not need it. | Use typed, least-privilege handoffs. Filter transcripts and secrets by default. |
| **Orchestrator Bottleneck** | The Orchestrator becomes a single point of failure and latency. | Run ready tasks concurrently. Persist the plan and make retries idempotent. |
| **Cost Explosion** | Workers or debate rounds continue without improving the result. | Enforce per-run budgets and stop when marginal quality gain disappears. |
| **Silent Failure** | A Worker returns a plausible but wrong result and synthesis hides it. | Validate evidence and acceptance criteria before synthesis; escalate unresolved failures. |

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
- **Span attributes**: Agent name, role, model, parent task, input tokens, output tokens, latency, tool calls, retries, and cost.
- **Handoff metadata**: Sender, receiver, schema version, context references, and acceptance criteria.
- **Validation outcome**: Checks run, evidence inspected, pass/fail result, and escalation reason.

Do not treat a model's self-reported confidence as a calibrated probability. Prefer deterministic checks where possible. For semantic work, use a rubric-based evaluator and calibrate its score against labeled examples before it controls routing or escalation.

---

## Summary
- **Multi-agent systems** compose ReAct, Plan-and-Execute, and Reflection into teams of specialized agents.
- The **Orchestrator Pattern** uses one agent to plan, route, and synthesize — each Worker runs its own ReAct loop.
- The **Debate Pattern** is multi-party Reflection: agents argue from different perspectives until consensus.
- Choose your **topology** based on task structure: sequential for pipelines, parallel for independence, debate for high-stakes decisions.
- **The first rule of multi-agent is: do not.** Prove a single agent fails before adding complexity.
- **Structured handoffs** reduce context leakage and make missing inputs visible at the boundary.

## Further Reading
- [OpenAI Agents SDK: Agent Orchestration](https://openai.github.io/openai-agents-python/multi_agent/) — manager-style orchestration, agents-as-tools, and handoffs.
- [OpenAI Agents SDK: Tracing](https://openai.github.io/openai-agents-python/tracing/) — end-to-end traces for generations, tools, handoffs, and guardrails.
- [Anthropic: How We Built Our Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system) — a production account of orchestrator-worker research, parallelism, evaluation, and coordination failures.

## What's Next?
In [Chapter 5: Tool Use and Skill Registries](/handbook/chapter-05-tool-use-skill-registry.html), we move from agent teams to the interface between agents and the outside world: reliable tool contracts, discovery, permissions, execution, and governance.

## Related Chapters
- [Chapter 1: The ReAct Pattern](/handbook/chapter-01-react-pattern.html) — the fundamental loop every Worker can run.
- [Chapter 2: Plan-and-Execute](/handbook/chapter-02-plan-and-execute.html) — the Orchestrator's internal engine.
- [Chapter 3: The Reflection Pattern](/handbook/chapter-03-reflection.html) — the foundation of the Debate pattern.
- [Chapter 5: Tool Use and Skill Registries](/handbook/chapter-05-tool-use-skill-registry.html) — the capability control plane used by the Orchestrator and Workers.

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
Add trace IDs and explicit acceptance criteria across all agent calls. Traces show where the workflow failed; acceptance criteria let the Orchestrator reject a plausible but unusable result.

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
| v1.3 | 2026-07-23 | Replaced unsupported thresholds and self-reported confidence with evaluation and evidence-based controls; corrected async orchestration, cost modeling, routing, observability, and chapter links; added primary references. |
| v1.2 | 2026-07-05 | Editorial pass: aligned pseudocode with parallel delegation, added handoff acceptance criteria, and tightened production tone. |
| v1.1 | 2026-07-05 | Website integration: added diagram asset, FAQ schema support, stable model references, and safer forward references. |
| v1.0 | 2026-07-05 | Initial publication. Post peer review: added worked example, fixed consensus mechanism (edit distance → explicit voting), expanded decision framework with latency and HITL branches, and added observability guidance and confidence scoring methods. |

## Meta
- Slug: HDBK-004-multi-agent-collaboration
- Tags: Multi-Agent, Orchestration, Debate, Topology, Collaboration, Architecture
- OG Image: /images/handbook/HDBK-004-multi-agent-collaboration.svg
