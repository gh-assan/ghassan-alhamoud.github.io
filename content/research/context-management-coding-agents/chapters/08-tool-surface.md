## Why measure the tool surface early

In the [worked budget](ch:anatomy#reading-a-whole-budget-a-worked-example), tool definitions were 25% of the context: **38,000 tokens for 61 tools, of which 11 were ever used.** Treat that as a constructed example, then measure your own first finding [C].

Three properties make the tool surface useful to measure early:

1. **It is prefix.** The definitions are sent on every call; actual billing depends on cache hits and request stability.
2. **Unused tools consume budget and can confuse selection.** A tool never called contributes no task value in that workload.
3. **The fix is reversible in seconds.** Delete a server; if you were wrong, add it back. The zero-call case needs no retraining, but verify the task surface after any deletion.

Compare that with retrieval discipline, which needs sustained behaviour change. Let the audit decide which surface to change first.

## The measured damage

[[Tool bloat]] hurts through chapter 3's [M-2](ch:ten-methods#m-2-tool-surface-minimisation) two channels, and confusing them leads to the wrong fix: **displacement** (definition tokens are prefix tokens — one popular [[MCP]] server consumes about **42,000 tokens of definitions** [P]; three such servers spend over 120K tokens on the *possibility* of acting) and **selection confusion** (more candidates, worse choices — independent of tokens).

| Finding | Number | Source |
|---|---|---|
| Tool-selection accuracy as tool count grows | **43% baseline → under 14%** | [S] |
| At 20 tools versus 107 tools | **19 of 20 correct → complete failure** | [S] |
| Practitioner threshold | Noticeable damage past **about 20 active tools** | [P] |

Two independent methods converging near the same threshold is strong evidence for this field. **Treat about 20 active tools as a soft ceiling and about 40 as a hard one** [D].

> [!warning] Deferred loading does not fix confusion
> If your problem is displacement, deferred definitions fix it. If your problem is selection confusion, they **do not**: the agent still chooses among the same number of descriptions. Only *having fewer tools*, or scoping them per task, fixes confusion. Teams that adopt deferred loading and still see wrong-tool picks applied the wrong remedy.

## Three architectures

### A-1: Eager definitions (the default, and the problem)

Every tool's full schema loaded upfront, every session. Simple and predictable; it is potentially cache-friendly when supported and stable. It scales badly: 60 tools with rich schemas is 40–60K tokens.

### A-2: Progressive disclosure

Short descriptions upfront; full schemas fetched when a tool is chosen. This separates *when to use it* from *how to call it*. See [[progressive disclosure]].

Reported, and vendor-reported means best case until someone reproduces it: **about 25,000 tokens of definitions became about 2,500 tokens of descriptions** [P], an order of magnitude with capability preserved. The ecosystem has converged on the idea, and by 2026 some harnesses made deferred definitions the default [P].

Costs: one round trip before a tool's first use; a discoverability risk (a capability with an unappealing description never gets used); and a recursion trap, because enough descriptions become bloat one level up.

### A-3: Code execution against an API

The most radical option and the most effective. Instead of exposing tool schemas, expose a programmatic API and let the agent write code against it. The agent filters, joins and loops over data **before** any of it reaches the context.

Vendor-reported, and the best case until someone reproduces it: **150,000 → about 2,000 tokens, a 98.7% reduction**, and 99%+ on definitions alone at 112 tools [P]. A separate production report on a GitHub MCP server found a 98% reduction with the same pattern [P]. Neither has an independent reproduction.

The headline number hides the mechanism. Two things happen:

1. **Definitions collapse.** One `execute_code` tool plus documentation replaces N schemas.
2. **Results collapse, and this is the bigger effect.** A normal tool call returns everything and the model filters in context, paying for data it throws away. Code filters *first*:

```python title="filtering before the context sees it"
# 400 issue objects never enter the context — only five integers do
[issue.number for issue in list_issues() if issue.state == "open"][:5]
```

That makes A-3 as much a result-shaping architecture as a definition-shaping one, which is why its numbers beat A-2's.

Costs: a sandbox; an API worth writing against; and a real failure mode where buggy filter code silently drops the rows that mattered.

```chart
{
  "type": "hbar",
  "title": "Prefix cost of 60 tools under each architecture",
  "categories": ["A-1 Eager definitions", "A-2 Progressive disclosure", "A-3 Code execution"],
  "series": [{"name": "Prefix tokens (midpoint of typical range)", "values": [50000, 4500, 2000]}],
  "valueFormat": "{v:,}",
  "highlight": [0],
  "labelWidth": 190,
  "categoryLabel": "Architecture",
  "caption": "Progressive disclosure is an order of magnitude; code execution is roughly another. Ranges: eager 40–60K [D]; progressive 3–6K and code execution 1–3K are vendor-reported upper bounds [P].",
  "alt": "Eager: about 50,000 tokens. Progressive: about 4,500. Code execution: about 2,000."
}
```

| | A-1 Eager | A-2 Progressive | A-3 Code execution |
|---|---|---|---|
| Prefix cost (60 tools) | 40–60K | 3–6K | 1–3K |
| Shapes results | No | No | **Yes** |
| Round trips | 0 | +1 per new tool | +1, but batches many operations |
| Cache conditions | Potentially; stable if supported | Potentially; disclosure may churn | Potentially; depends on a stable API block |
| Selection confusion | High | Moderate | **Low** (one tool) |
| Setup cost | None | Low | Moderate (sandbox) |
| Failure mode | Bloat | Discoverability | Buggy filter code |

## The 30-minute audit

The highest-yield thirty minutes in this research when the audit confirms tool-surface waste.

1. **Count.** Dump every tool schema in scope and count tokens, per server and in total. Most people are off by 3–5× [D].
2. **Attribute.** Sort servers by size. One may dominate; measure rather than assume.
3. **Use-count.** Count calls per tool across your last 20 sessions. Most harnesses log this; otherwise grep the transcripts.
4. **Classify.**

| Class | Rule | Action |
|---|---|---|
| **Dead** | 0 calls in a representative 20-session sample | **Deletion candidate; verify task coverage and keep rollback.** |
| **Redundant** | Duplicates something the shell already does | **Deletion candidate; verify task coverage and keep rollback.** `gh`, `psql`, `curl`, `rg` exist |
| **Rare but critical** | Fewer than 3 calls, but decisive | Defer it, or move it behind code execution |
| **Core** | Called often | Keep it eager; trim its description |

5. **Trim what remains.** Descriptions and examples are typically 40% trimmable with no behaviour change [D]. Deduplicating repeated schema structures with `$ref` saves another 10–30% [D].
6. **Set a budget and enforce it.** For example: at most 20 active tools and 15K definition tokens. Adding a server means removing one or writing down the exception. Without this, the surface grows back within a quarter [P].

The [tool audit template](ch:templates#2-tool-surface-audit) walks through it.

## The redundancy problem

The most common single waste is **an MCP server that duplicates what the agent can already do through the shell.**

| MCP server | Shell equivalent | Tokens saved by deleting |
|---|---|---|
| GitHub | `gh` | ~42K [P] |
| Filesystem | `ls`, `cat`, `find`, `rg` | 3–8K [D] |
| Database | `psql`, `mysql`, `sqlite3` | 5–12K [D] |
| HTTP fetch | `curl` | 2–5K [D] |
| Git | `git` | 3–6K [D] |

The shell version is usually *better*: it composes with pipes (result shaping for free), it is well represented in training data, it has no schema to load, and it has no version skew between server and command.

> [!note] The honest counter-argument
> MCP servers can provide structured output, authentication handling and safety rails a raw shell does not. If your agent runs unsupervised in a sensitive environment, a constrained MCP surface is a **security control**, and paying 42K tokens for it may be correct. **Make that trade explicitly.** What is not defensible is paying it by accident because a server was easy to install.

## Skills: progressive disclosure for procedures

[[Skill|Skills]] apply the same idea to *procedures*: a short trigger description is always loaded, and the full body loads when it matches. The always-loaded cost grows with the *number* of capabilities, not their complexity. A 3,000-word procedure costs about 15 tokens of description until it is needed.

Skills fail at **trigger design**, not content.

| Failure | Symptom | Fix |
|---|---|---|
| Too vague | Fires on everything, or the model cannot tell when it applies | Name concrete triggers: file types, command names, task phrasings |
| Too narrow | Fires only on the exact phrasing you imagined | List synonyms and neighbouring phrasings |
| Overlapping | Two skills match and the model picks one arbitrarily | Make descriptions mutually exclusive; say what each is *not* for |

**The recursion trap.** Forty skills at 40 tokens each is 1,600 tokens: fine. Four hundred is 16,000 tokens and a selection problem like the 107-tool collapse [S]. Skills move the problem up a level; they do not remove it. **Budget skill descriptions as one number**, exactly like tool definitions.

**Measure them** with trigger precision (fired correctly ÷ fired) and trigger recall (fired correctly ÷ should have fired). A skill with near-zero recall is permanent prefix cost buying nothing. Delete it.

## Results are the other half

Everything above is about definitions. Tool *results* are larger in a working session and follow the same discipline.

**The MCP result problem.** Many servers return verbose JSON: an issue object with 40 fields when the agent needed the title and number. Twenty issues at 500 tokens each is 10,000 tokens where 200 would do. Fixes, in order of preference:

1. **Code execution (A-3).** Filter before returning. Solves it structurally.
2. **Server-side field selection.** Request only the fields you need. Under-used because the parameter is buried in the schema.
3. **A shaping proxy.** Wrap the server, strip fields, and return a digest plus a pointer to the full response.
4. **Response-granularity controls.** Emerging MCP proposals include adaptive optional fields and flexible response detail so servers can match verbosity to the client's intent [P].

> [!key] Capability exposure versus capability restriction
> The MCP ecosystem's design centre is *making things possible*. Context efficiency is *making things cheap*. These pull in opposite directions, and the defaults favour the first. **You have to apply the second yourself.** Nothing in the protocol will do it for you.

## A worked audit [C] {#a-worked-audit}

```chart
{
  "type": "hbar",
  "title": "Definition tokens versus tools actually used (20 sessions)",
  "categories": ["GitHub (34 tools, 7 used)", "Database (12 tools, 0 used)", "Browser (9 tools, 0 used)", "Filesystem (6 tools, 2 used, both = cat)"],
  "series": [{"name": "Definition tokens", "values": [42000, 11000, 9000, 4000]}],
  "valueFormat": "{v:,}",
  "highlight": [1, 2, 3],
  "labelWidth": 250,
  "categoryLabel": "Server",
  "caption": "66,000 tokens, 33% of a 200K window, for nine distinct tools actually used. Highlighted servers were never needed [C].",
  "alt": "GitHub 42,000 tokens; database 11,000; browser 9,000; filesystem 4,000."
}
```

| Action | Reason | Tokens saved |
|---|---|---:|
| Delete the browser server | Zero calls | 9,000 |
| Delete the database server | Zero calls; `psql` is in the shell | 11,000 |
| Delete the filesystem server | Duplicates built-in file tools | 4,000 |
| Switch GitHub to deferred descriptions | 7 of 34 tools used; keep the capability, defer the schemas | ~38,000 |
| Trim the remaining descriptions | Verbose prose | ~1,500 |

**End state: about 2,500 tokens. Recovered: 63,500 tokens, 32% of the window, permanently, on every call.** Over the next 20 sessions: task success unchanged, median session cost down 34%, two extra round trips from deferred loading, and **no occasion where a deleted capability was missed** [C].

## Metrics

| Metric | Formula | Healthy | Detects |
|---|---|---|---|
| Definition tokens | Count all schemas | Under 15K | Bloat |
| Active tools | Tools in scope | At most 20 | Confusion risk |
| **Defined : called** | Tools defined ÷ tools ever used | Under 3:1 | Dead surface |
| Prefix share | Definitions ÷ total prefix | Under 40% | Displacement |
| Wrong-tool rate | Wrong picks ÷ tool calls | Under 2% | Confusion |
| Result waste | Returned tokens ÷ cited tokens | Under 10:1 | Need for result shaping |
| Skill trigger recall | Fired correctly ÷ should have fired | Over 0.7 | Dead skills |
| Re-bloat rate | Change in definition tokens per quarter | About 0 | Governance failing |

If you check one number today, make it **defined : called**. Above 3:1, inspect the unused surface first; the largest win remains workload-specific.
