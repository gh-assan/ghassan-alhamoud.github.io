## Read this before the tables

**This is the most perishable chapter in the research.** Tooling turns over quarterly, and several capabilities listed here as third-party tools became harness defaults during 2026, deferred tool definitions most clearly [P].

Three rules for using it:

1. **Verdicts are about the category, not the specific project.** "Adopt a symbol-level retrieval tool" is durable advice. "Adopt this particular one" is not. Treat named projects as examples of a category to search for when you read this.
2. **Verify before installing.** These details come from project documentation and secondary coverage, not from running every tool. Anything you install runs with access to your code, and MCP servers receive your codebase content by design. Audit them like any dependency.
3. **Check whether your harness already does it.** The highest-value action here is often *installing nothing*. A tool that duplicates a built-in capability costs definition tokens to give you what you already had.

> [!evidence] How to read the numbers here
> Performance figures in this chapter are project claims [P] unless marked [S]. Self-reported numbers are upper bounds, and none were independently reproduced for this research.

Verdicts use four levels: **Adopt** (use by default), **Trial** (worth a measured try), **Watch** (promising, unproven here), **Skip** (not for coding agents).

<figure class="diagram">
<p class="diagram__title">Six layers, from before context exists to watching it</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 210" role="img" aria-labelledby="tl-t">
<title id="tl-t">Tooling layers: prevention, retrieval, tool surface, state and memory, compaction, and observability.</title>
<rect class="dg-box--accent" x="10" y="10" width="225" height="56" rx="8"/><text class="dg-k" x="24" y="32">LAYER 0</text><text class="dg-t" x="24" y="52">Prevention</text>
<rect class="dg-box" x="247" y="10" width="225" height="56" rx="8"/><text class="dg-k" x="261" y="32">LAYER 1</text><text class="dg-t" x="261" y="52">Retrieval</text>
<rect class="dg-box" x="484" y="10" width="226" height="56" rx="8"/><text class="dg-k" x="498" y="32">LAYER 2</text><text class="dg-t" x="498" y="52">Tool surface</text>
<rect class="dg-box" x="10" y="80" width="225" height="56" rx="8"/><text class="dg-k" x="24" y="102">LAYER 3</text><text class="dg-t" x="24" y="122">State, memory, offload</text>
<rect class="dg-box" x="247" y="80" width="225" height="56" rx="8"/><text class="dg-k" x="261" y="102">LAYER 4</text><text class="dg-t" x="261" y="122">Compaction</text>
<rect class="dg-box--info" x="484" y="80" width="226" height="56" rx="8"/><text class="dg-k" x="498" y="102">LAYER 5</text><text class="dg-t" x="498" y="122">Observability</text>
<text class="dg-s" x="24" y="164">Highest yield, least glamorous</text>
<text class="dg-s" x="24" y="184">Most crowded, thinnest evidence: layer 3</text>
<text class="dg-s" x="498" y="164">Thinnest ecosystem: layer 5</text>
</svg>
</div>
<figcaption>Start at the layer that matches your binding constraint. For most teams that is layer 0 or layer 2, and the best "tool" is a deletion or a shell script.</figcaption>
</figure>

## Layer 0: Prevention

| Tool | What it does | Cost | Verdict |
|---|---|---|---|
| **Shell primitives** (`tail`, `head`, `grep -v`, `jq`, `cut`) | Filter tool output inline | Zero | **Adopt.** Already installed; underused because it is invisible |
| **Quiet flags** (`--silent`, `-q`, `--tb=short`, `--stat`) | Reduce output at the source | Zero | **Adopt** |
| **Ignore files** (`.gitignore`-style, `.claudeignore`, `.cursorignore`) | Keep dependencies, build output, lockfiles and generated code out of globs and diffs | Zero | **Adopt.** The first thing to write |
| **RTK** | A command proxy that rewrites commands and compresses output from `git`, `pytest` and cloud CLIs | Install and configure | **Trial.** Claims 60–90% reduction [P]; compare against hand-written wrappers first |
| **Context Mode** | Keeps large outputs in a local sandbox with SQLite full-text indexing; passes summaries | Install; local database | **Trial.** Claims 98% reduction [P]; effectively packaged shaping plus offload |
| **Caveman** | Strips filler from model output before it re-enters context | Install | **Skip for most.** Agent messages are about 8% of context; low ceiling |

> [!try] If you do one thing in this chapter
> Write four shell wrappers for your four loudest commands. An afternoon, no dependency, and it usually beats any installed tool on the same problem.

## Layer 1: Retrieval

| Tool | What it does | Cost | Verdict |
|---|---|---|---|
| **ripgrep (`rg`)** | Fast recursive lexical search with glob filters | Zero | **Adopt.** The workhorse; grep generally beat vector retrieval head-to-head [S] |
| **Serena** | MCP toolkit with language-server symbol operations: find symbol, find references, insert after symbol, outlines; 30+ languages [P] | A language-server process; 5–8 tool slots | **Adopt** if your stack has LSP support. The clearest drop-in for structural retrieval |
| **tree-sitter** | Incremental parser producing syntax trees | Library integration | **Adopt as a building block** for repository maps and outlines |
| **Aider-style repository map** | Compact per-file outline of top-level symbols, ranked by relevance | A build step | **Trial.** Good for large unfamiliar repositories; it costs prefix, so budget it |
| **code-review-graph** | Pre-builds a structural map with tree-sitter into SQLite | Index build | **Trial** where a language server is unavailable |
| **claude-context** | Chunks, embeds and serves semantic or hybrid search over MCP | Vector database; staleness | **Trial as a complement only.** Never primary |
| **Token Savior** | Progressive file delivery: summaries, then snippets, then full files | Install | **Trial.** Attacks whole-file reading; check it does not add a round trip per read |

**Recommended stack:** `rg`, a symbol-level MCP, and ignore files. Add semantic search only after measuring that concept questions are a real share of your work, and point it at `docs/` and ADRs rather than code.

## Layer 2: Tool surface

| Tool | What it does | Cost | Verdict |
|---|---|---|---|
| **Built-in tool search or deferred definitions** | Short descriptions upfront, schemas on demand; ~25K → ~2.5K reported [S] | None if built in | **Adopt.** A default in some harnesses as of 2026 [P]; check yours first |
| **Agent skills** | Named capabilities with short triggers and bodies loaded on match | Authoring effort | **Adopt.** Budget descriptions as one number |
| **agentgateway** | An MCP proxy that applies progressive disclosure across servers | Proxy deployment | **Trial** if you run many servers and your harness lacks deferral |
| **Code-execution patterns for MCP** | Replace tool schemas with code against an API; **150K → ~2K, 98.7%** [S] | A sandbox | **Adopt if you can sandbox.** The largest single saving in this research |
| **Schema deduplication proposals** (`$ref`, adaptive fields, response granularity) | Structural reduction, 10–30% on similar schemas [S] | Protocol-level; not universal | **Watch** |
| **Deleting an MCP server** | — | Negative | **Adopt.** The highest-yield action in the chapter |

The MCP ecosystem optimises for *capability exposure*. Context efficiency is *capability restriction*. Nothing in the protocol will restrict for you; the [30-minute audit](ch:tool-surface#the-30-minute-audit) is the tool.

## Layer 3: State, memory and offload {#state-memory-and-offload}

The most crowded category and the thinnest evidence. Read [the memory section of chapter 6](ch:compaction-and-memory#cross-session-memory) before adopting anything here.

| Tool | What it does | Cost | Verdict |
|---|---|---|---|
| **A plan file in the repository** | Goal, decisions, ruled-out approaches, current state | Zero | **Adopt.** Beats every tool in this table on evidence per unit of effort |
| **ADRs in the repository** | Versioned, reviewed decision records | Writing discipline | **Adopt.** The best memory system is the one your PR process already maintains |
| **A scratch directory** (`.agent/`, gitignored) | Offloaded logs and intermediate artifacts | Zero | **Adopt** |
| **scratch** | A folder plus manifest for agent notes and output, outside the source tree | Install | **Trial.** Check the manifest stays bounded |
| **OpenMemory / mem0** | Persistent MCP memory across clients, auto-capturing preferences and patterns | Service; prefix tokens; curation | **Trial with a gate.** Auto-capture is where write-only memory starts |
| **mcp-memory-service** | Memory for agent pipelines with an API, a graph and consolidation | Service | **Trial**, only for multi-agent pipelines |
| **Official memory MCP server** | Knowledge-graph memory for entities and relations | Service | **Skip for coding.** Coding facts belong in the repository |
| **mcp-memory (SQLite FTS5)** | Long-term memory with full-text search | Local SQLite | **Trial.** The lightest credible option; full-text beats embeddings for exact facts |
| **cognee** | Knowledge engine with graph-based extraction | Library | **Watch.** No coding-specific outcome evidence found |
| **Agentage Memory** | Cross-vendor memory stored as plain Markdown you own | Service | **Trial.** Plain Markdown is the right instinct |
| **memsearch** | Decisions as searchable Markdown, indexed for recall across sessions | Index | **Trial.** Closest to the searchable-tier design |

**The gate for every tool here:** if you cannot report *retrievals that changed an action, per week* after one month, delete it.

### External knowledge stores

| Tool | Substrate | Verdict |
|---|---|---|
| **ripgrep over `docs/`** | Filesystem | **Adopt.** The baseline everything else must beat, and most do not |
| **adr-tools** | Filesystem | **Adopt.** Near-zero cost; the supersede chain is what matters |
| **Log4brains** | Filesystem | **Trial.** When people also browse the ADRs |
| **MkDocs or Docusaurus in the repository** | Filesystem | **Adopt** if you need a rendered site; keeps docs in the same PRs as code |
| **Basic Memory** | Filesystem + MCP | **Trial.** Plain Markdown you own: inspectable, greppable, portable |
| **sqlite-vec / txtai** | File-backed database | **Trial** only with a measured semantic need; pair with full-text search |
| **Confluence or Notion MCP servers** | Wiki | **Restricted adopt.** Fetch by name only; disable autonomous search; never index |
| **GraphRAG / LightRAG** | Graph | **Skip for coding.** Built for prose; over source code the compiler graph wins |
| **Graphiti** | Graph | **Watch.** Time-aware edges are a real answer to staleness |
| **Graph database MCP servers** | Graph | **Adopt only for the exception**: cross-system dependency, lineage or ownership graphs you already run |

## Layer 4: Compaction

| Tool | What it does | Verdict |
|---|---|---|
| **Built-in compaction** (`/compact` and similar) | Summarises and restarts, usually on a threshold | **Adopt, but control the timing.** Trigger it at boundaries so the automatic threshold never fires |
| **Manual `/clear` plus a handoff note** | A reset with authored state | **Adopt.** The highest-control boundary; preferred wherever a plan file exists |
| **Observation masking** | Replaces old tool output with placeholders | **Adopt as the baseline.** Comparable to summarisation at lower cost [S] |
| **LangChain DeepAgents** | Filesystem offload plus summarisation middleware | **Trial** if you are building an agent, not using a CLI one |
| **LLMLingua-style token pruning** | Removes low-information tokens | **Skip for coding.** A mid-pack baseline in the comparison [S]; the loss is opaque |
| **Context-manager and pruning plugins** | Checkpoints that survive compaction; duplicate-call tracking; sub-task marking | **Trial.** Few tools address the post-compaction error spike; these do |
| **Addressable-recall patterns** | A content-addressed observation store with `recall <id>`; +19.43 points on needle tasks [S] | **Watch, or build.** The strongest result in the category, not yet packaged. Approximate it with a scratch directory and descriptive stubs |

## Layer 5: Observability

You cannot manage what you cannot see, and this is the thinnest layer.

| Tool | What it does | Verdict |
|---|---|---|
| **claude-hud** | Live context usage, active tools, running agents, to-do progress | **Adopt.** Awareness changes behaviour immediately |
| **Token-usage CLIs** | Parse local session logs into per-session token and cost reports | **Adopt**, but check it separates cached from uncached input; many do not, which makes them misleading |
| **Built-in usage reporting** | Per-session accounting | **Adopt first**, before installing anything |
| **A transcript-grep script** | Counts tool calls, finds repeats, ranks commands by output volume | **Adopt.** [Twenty lines of shell](ch:tips#before-the-session-setup-once) power the metrics that route every decision |

> [!warning] The gap worth naming
> No widely available tool computes the two metrics that matter most here: **post-boundary re-fetch rate** and **Pass² ÷ Pass@2**. You will have to build both. The gap exists because the field still measures inputs rather than outcomes.

## Standards and conventions

| Thing | Status | Verdict |
|---|---|---|
| **AGENTS.md** | Read by 30+ tools; 60,000+ repositories; stewarded by the Agentic AI Foundation under the Linux Foundation [P] | **Adopt.** Keep it under 150 lines |
| **CLAUDE.md** | The same idea under a vendor-specific name | **Adopt.** Link it to `AGENTS.md` if your tools allow |
| **MCP** | Broad adoption | **Adopt selectively.** The protocol is fine; attaching many servers by default is the problem |
| **Agent skills** | Adopted across major vendors [P] | **Adopt.** The right shape for procedures |

## A starter stack, in order

For a team using a CLI coding agent on a large repository. Each week is valuable on its own, so stop when the [stop rule](ch:optimisation-plan#the-stop-rule) fires.

```text title="four-week starter stack"
Week 1  prevention and deletion (no behaviour change)
        ignore files
        four shell wrappers for your loudest commands
        delete every zero-call MCP server
        instruction file → inference test → ≤ 150 lines
        a usage reporter + the transcript-grep script

Week 2  retrieval
        ripgrep by default, with -C 8 and exclusions
        a symbol-level MCP (Serena or your stack's equivalent)

Week 3  state
        a plan-file convention
        a .agent/ scratch directory with self-describing stubs

Week 4  boundaries
        semantic compaction triggers; one compaction per session
        a handoff template; mechanical session caps
        a live context display

Later, only if measurement demands it
        code execution against an API (the largest remaining win)
        semantic search over docs and ADRs
        a memory system, with the retrieval gate from day one
```

Weeks 1 and 2 carry most of the value and need almost no ongoing discipline. Weeks 3 and 4 need behaviour change, which is where adoption usually stalls.

## What the ecosystem is missing

These are gaps a builder could fill. Their absence explains several of the field's blind spots.

1. **Cache-aware accounting.** Nothing widely available reports cache-adjusted cost, so nobody sees regressions like the [dynamic-tool case](ch:case-studies#cs-5-dynamic-tool-loading-made-things-worse-c).
2. **Post-boundary instrumentation.** The most error-prone moment in a session is unmonitored everywhere by default.
3. **Pass^k runners for local workloads.** Running your own tasks k times and computing Pass² should be one command. It is not.
4. **Read-coverage auditing.** Separating starvation from dilution still means reading transcripts by hand.
5. **Packaged addressable-recall compaction.** The strongest published compaction result has no widely available implementation.
