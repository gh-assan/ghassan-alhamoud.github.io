# Chapter 0: The Agentic Landscape — Autonomy, Tools, and the Patterns That Make Agents Work

**Reading time:** 10 min | **Last revised:** 2026-06-28 | **Version:** 1.0

## If You Only Read One Section
An **AI agent** is a system that uses a language model to reason, makes decisions, and takes actions through tools to pursue a goal over multiple turns. The patterns in this handbook are reusable answers to the question: *how do you coordinate reasoning and action so the system stays useful outside a demo?*

## Prerequisites
- Basic familiarity with Large Language Models (LLMs) and prompt engineering.
- (Optional) Experience calling an LLM API such as OpenAI, Anthropic, or a local model.

---

If you have used a chatbot, you have used an LLM. If you have used a system that *plans*, *calls tools*, and *keeps working until a job is done*, you have used an agent.

The gap between the two is what this handbook is about.

## 1. What Is an AI Agent?

An **AI agent** is a loop, not a prompt. It has three defining properties:

1. **Goal-directedness**: It is given an objective, not just a question.
2. **Tool use**: It can interact with external systems (search, APIs, databases, code execution, browsers).
3. **Autonomy**: It decides what to do next, when to stop, and how to recover from errors.

A single-turn LLM call answers a question. An agent keeps running until the *world state* matches the goal.

### Agent vs. Application
A traditional application encodes a fixed workflow: `if A then B then C`. An agent encodes a *strategy* for discovering the workflow. That makes agents more flexible, but also harder to debug, test, and operate.

## 2. Levels of Autonomy

Not every agent is fully autonomous. Most production systems sit somewhere on a spectrum:

| Level | Name | Description | Example |
|-------|------|-------------|---------|
| 0 | **Tool Assistant** | Model suggests actions; human approves every step. | Copilot-style suggestions |
| 1 | **Tool User** | Model calls tools within a fixed workflow. | RAG with a single retrieval |
| 2 | **Loop Agent** | Model reasons, acts, observes, and repeats. | ReAct agent with a search tool |
| 3 | **Planner** | Model builds a multi-step plan and executes it. | Plan-and-Execute research agent |
| 4 | **Collaborative System** | Multiple specialized agents coordinate. | Multi-agent coding platform |
| 5 | **Autonomous Operator** | Long-running, self-improving, minimal human oversight. | (Mostly experimental) |

Most teams should aim for **Level 2 or 3** first. Higher autonomy increases capability, but it also increases failure modes, cost, and observability demands.

## 3. Tool Use Is the Superpower

The reason agents feel different from chatbots is **tool use**. A model without tools can only remix its training data. A model with tools can:

- retrieve current information,
- perform calculations,
- execute code,
- read and write databases,
- call other APIs,
- and, recursively, call other agents.

Tool use turns a text generator into an actor in the world.

### The Tool Contract
Every tool needs:
- a **name** the model can reference,
- a **description** the model can read,
- a **schema** for arguments,
- and a **return format** the model can consume.

If any of these are vague, the agent will misuse the tool.

## 4. The Pattern Catalog

This handbook is organized around patterns—reusable architectural solutions to common agentic problems. Here is the map:

| Pattern | Solves | Chapter |
|---------|--------|---------|
| **ReAct** | How an agent reasons and acts in a single loop. | 1 |
| **Plan-and-Execute** | How an agent handles multi-step, dependent tasks. | 2 |
| **Reflection** | How an agent reviews and improves its own output. | 3 |
| **Multi-Agent Collaboration** | How specialized agents divide work and hand off results. | 4 |
| **Tool Use & Skill Registry** | How agents discover and manage tools. | 5 |
| **Memory & Context Management** | How agents retain and retrieve relevant context. | 6 |
| **Human-in-the-Loop** | When and how to bring a human back into the loop. | 7 |
| **Observability & Evaluation** | How to measure and debug agent behavior. | 8 |
| **Safety & Guardrails** | How to constrain agent behavior. | 9 |
| **Agent Platform** | How to build the infrastructure that hosts many agents. | 10 |

You do not need all of them. Start with ReAct, add Plan-and-Execute when tasks grow, and add Reflection when quality becomes critical.

## 5. How to Read This Handbook

Each chapter follows the same structure:

- **If You Only Read One Section**: the one-paragraph takeaway.
- **Prerequisites**: what you should know first.
- **Conceptual explanation**: how the pattern works and why.
- **Diagram**: a visual map of the pattern.
- **Implementation**: pseudocode and prompt patterns.
- **When to use / avoid**: decision guidance.
- **Example**: a concrete scenario.
- **Pitfalls**: how the pattern breaks in production.
- **FAQ**: common questions.
- **Glossary**: terms introduced.

Treat the chapters as modular but sequential. Later patterns build on earlier ones.

## 6. The Hardest Part Is Not the Pattern

The patterns are teachable. The hard part is usually:

- **Observability**: Can you see what the agent is doing and why?
- **Evaluation**: How do you know it is getting better or worse?
- **Failure handling**: What happens when a tool times out, returns garbage, or the user changes their mind?
- **Cost control**: How many LLM calls is this problem worth?

Keep those questions in mind as you read the rest of the handbook. The patterns solve the *shape* of the problem; you still have to solve the *operational* reality.

---

## Summary
- An **AI agent** is a goal-directed, tool-using, autonomous loop.
- **Autonomy** is a spectrum; most production systems sit at Level 2–3.
- **Tool use** is what separates agents from chatbots.
- The handbook patterns are reusable solutions to coordination, planning, quality, scaling, and governance problems.

## What's Next?
In **Chapter 1: The ReAct Pattern**, we start with the simplest complete agent loop: reasoning, acting, and observing.

## Related Chapters
- **Chapter 1: The ReAct Pattern**
- **Chapter 2: Plan-and-Execute**
- **Chapter 3: Reflection**

## Frequently Asked Questions

**Q: Is every LLM application an agent?**
No. A chatbot that only answers questions is not an agent. An application becomes an agent when it uses tools and makes decisions over multiple turns to pursue a goal.

**Q: Do agents need to be autonomous?**
Not fully. Many production agents are human-in-the-loop systems where the agent proposes actions and a human approves them. Autonomy should match the risk and cost of mistakes.

**Q: What is the difference between an agent and a workflow?**
A workflow has a fixed control flow. An agent discovers the control flow through reasoning and observation. Workflows are more predictable; agents are more flexible.

**Q: Which pattern should I start with?**
Start with **ReAct** (Chapter 1). It is the simplest pattern that demonstrates the core idea of interleaving reasoning and action.

**Q: Do I need special infrastructure to run agents?**
You can run simple agents in a single Python script. As you add planning, reflection, multi-agent collaboration, and observability, you will want persistent state, logging, and evaluation infrastructure.

<!-- CTA -->

## Glossary Terms Introduced
- **AI Agent**: A system that uses an LLM to reason, use tools, and act autonomously toward a goal.
- **Tool Use**: The ability of an agent to call external functions or APIs.
- **Autonomy**: The degree to which an agent can act without human approval.
- **ReAct**: A pattern that interleaves reasoning and acting in a single loop.
- **Plan-and-Execute**: A pattern that separates strategy from execution via a structured plan.
- **Reflection**: A pattern that adds a quality-review loop to agent outputs.

## Revision History
| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2026-06-28 | Initial draft. |

## Meta
- Slug: HDBK-000-agentic-landscape
- Tags: Agents, Architecture, Tool-Use, Autonomy
- OG Image: /images/handbook/HDBK-000-agentic-landscape.webp
