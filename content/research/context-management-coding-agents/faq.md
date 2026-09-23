## The basics

### Why doesn't a bigger context window fix my agent?

Because performance can become less reliable as input grows, even before the window is full. A study of 18 models from four vendors/model families found the direction across controlled tasks, with model- and task-specific variation [S]. A bigger window gives you more room to fit things, not a guarantee that the model will use them well. See [chapter 1](ch:foundations#what-long-context-studies-actually-show).

### What is "context rot"?

The everyday name for performance becoming less reliable as input length grows. Chroma measured it across 18 models; the size and shape of the effect varied by model and task. It also worsened with vocabulary gaps, near-duplicate distractors and coherent surrounding prose. See [chapter 1](ch:foundations#what-long-context-studies-actually-show).

### Why does my agent stop following CLAUDE.md or AGENTS.md late in a session?

Position, not memory, can matter. In cited retrieval tasks, relevant information in the middle performed worse than information near the beginning or end; the effect depends on model, task and harness [S]. Keep critical rules near the action and verify late-session behavior. See [position decay](ch:foundations#position-is-a-task-dependent-risk).

### What should I measure first?

Four numbers, in about 30 minutes: your prefix tax (send `.` in a fresh session and read the input count), tool-definition tokens versus tools actually called, tool output as a share of the session, and cache hit rate. See [Phase 0](ch:optimisation-plan#phase-0-baseline).

## Tools and MCP

### How many tools or MCP servers is too many?

Treat about 20 active tools as a soft ceiling and 40 as a hard one. Selection accuracy fell from 43% to under 14% as tool count grew in one study, and from 19 of 20 correct at 20 tools to complete failure at 107 in another [S]. See [chapter 8](ch:tool-surface#the-measured-damage).

### Doesn't deferred tool loading solve tool bloat?

Only half of it. Deferred definitions fix *displacement* (tokens crowding out work). They do not fix *selection confusion*, because the agent still chooses among the same number of options. Only fewer tools, or per-task scoping, fixes confusion. See [chapter 8](ch:tool-surface#the-measured-damage).

### Should I use an MCP server or the shell?

Prefer the shell for anything it already does: `gh`, `psql`, `curl`, `rg`, `git`. It composes with pipes, loads no schema, and is well represented in training data. Keep an MCP server deliberately when it is a security control, and write that decision down. See [chapter 8](ch:tool-surface#the-redundancy-problem).

### Why did my costs go up after I reduced tokens?

Probably the cache. Prompt caching is prefix-exact: changing anything early in the prompt invalidates everything after it. A worked example cut tokens 24% by loading tools dynamically and raised cost 6.9× [C]. Measure cache-adjusted cost, not raw tokens. See [chapter 10](ch:metrics-and-economics#belief-1-cutting-tokens-cuts-cost).

## Compaction and memory

### Is /compact bad?

Not bad, but costlier than it looks. Changing only the summariser moved SWE-bench 6.5 points, and compression made agents intermittent before it lowered their average [S]. Compact at a sub-goal boundary, at most once per session, after offloading large outputs, and with an explicit schema. See [chapter 6](ch:compaction-and-memory#the-compaction-design-space).

### Should I compact or start a new session?

If you keep a plan file, start a new session. A reset costs about 500 tokens to reload the plan, removes every accumulated distractor and poisoned fact, and lets you author exactly what crosses the boundary. A second compaction in one session is the signal to reset. See [chapter 3](ch:ten-methods#m-10-session-lifecycle).

### What should a compaction summary contain?

Goal; state as done, in progress and not started; decisions with reasons; ruled-out approaches with evidence; exact strings verbatim (errors, versions, paths, line numbers); open questions; offloaded artifacts; and anything unverified marked as such. See the [compaction schema](ch:templates#4-compaction-schema).

### Do I need a memory tool for my coding agent?

Usually not. The repository is the best memory: ADRs, tests and comments are versioned, reviewed and repaired with the code. Use a memory tool only for expensive-to-learn facts with no repository home, and delete it if it produces fewer than one retrieval a week that changes an action. See [chapter 6](ch:compaction-and-memory#cross-session-memory).

### Should the agent search our wiki?

Let it fetch a page by name when a person points to it, and treat the page as a hypothesis to check against the code. Do not bulk-index the wiki: stale pages about exactly your module are the most plausible distractors available. Migrate durable facts into the repository instead. See [chapter 6](ch:compaction-and-memory#the-wiki).

## Retrieval and multi-agent

### Should I use embeddings or grep for code search?

Grep and the symbol graph first. In a four-harness comparison grep generally beat vector retrieval, and the harness mattered more than the strategy [S]. Use semantic search as a complement when you do not know the name of what you are looking for, and point it at docs and ADRs. See [chapter 5](ch:retrieval#the-recommended-architecture).

### Should I give the agent an architecture overview at the start?

Give it pointers, not prose: entry points, invariants, landmines and commands, under 2,000 tokens. 5K tokens of targeted retrieval beat a 100K codebase summary [P], and coherent documents retrieve worse than fragments [S]. See [chapter 5](ch:retrieval#should-you-seed-the-session-with-a-codebase-overview).

### When should I use sub-agents?

For read-mostly work whose outputs simply add up: finding callers, surveys, test triage, dependency audits. Not for interlocking implementation, and never for debugging. If you cannot write the sub-agent's output schema in 20 lines, do not delegate. See [chapter 7](ch:sub-agents#the-composability-test).

### Why did my multi-agent setup cost so much more?

Each sub-agent pays its own prefix tax, so parent context falls while total spend rises. A published research system used about 15× the tokens of a chat, and spend alone explained about 80% of its gain [P]. See [chapter 7](ch:sub-agents#what-isolation-buys-and-what-it-costs).

## Measuring

### How do I know a context change actually helped?

Run the same tasks through both configurations, at least twice each, and compare Pass² (solved on both runs) with McNemar's test. On 50 tasks, 68% versus 74% is not a result: the intervals overlap almost entirely. See [chapter 9](ch:evaluation#the-minimum-viable-experiment).

### What is Pass² and why does it matter?

Pass² counts a task as solved only if it succeeds on both of two runs; Pass@2 counts it if either succeeds. Compression damages Pass² about three times more than Pass@2, so it is the metric that catches "it worked yesterday". See [chapter 9](ch:evaluation#pass-k-worked).

### When should I stop optimising context?

When cache hit rate is over 70%, fewer than 3 tools are defined per tool used, tool output is under 35% of the session, read-utilisation is over 15%, post-compaction re-fetches are under 2, and Pass² ÷ Pass@2 is over 0.85. Past that, your constraint is elsewhere. See [the stop rule](ch:optimisation-plan#the-stop-rule).
