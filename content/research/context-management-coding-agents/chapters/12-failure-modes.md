## Use this chapter two ways

**During an incident**, start with the [symptom index](#symptom-to-cause-index): find what you are seeing, then jump to the likely causes. **Before a long task**, read the [four questions](#four-questions-that-pre-empt-most-of-this) at the end.

Every failure below has the same four fields:

- **Tell**: what you notice.
- **Detect**: how to confirm it.
- **Contain**: what to do right now, in the session.
- **Fix**: what to change so it does not happen again.

<figure class="diagram">
<p class="diagram__title">Forty-four failures in eight clusters</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 230" role="img" aria-labelledby="fm-t">
<title id="fm-t">Eight clusters: dilution and displacement, staleness and poisoning, compaction, retrieval, isolation, cache and cost, session and state, and measurement.</title>
<rect class="dg-box" x="10" y="10" width="170" height="96" rx="8"/><text class="dg-k" x="24" y="32">A · 7</text><text class="dg-t" x="24" y="56">Dilution and</text><text class="dg-t" x="24" y="74">displacement</text><text class="dg-s" x="24" y="94">too much, too loud</text>
<rect class="dg-box--warn" x="190" y="10" width="170" height="96" rx="8"/><text class="dg-k" x="204" y="32">B · 6</text><text class="dg-t" x="204" y="56">Staleness and</text><text class="dg-t" x="204" y="74">poisoning</text><text class="dg-s" x="204" y="94">wrong, and trusted</text>
<rect class="dg-box" x="370" y="10" width="170" height="96" rx="8"/><text class="dg-k" x="384" y="32">C · 7</text><text class="dg-t" x="384" y="56">Compaction</text><text class="dg-s" x="384" y="94">lost at the boundary</text>
<rect class="dg-box--accent" x="550" y="10" width="160" height="96" rx="8"/><text class="dg-k" x="564" y="32">D · 7</text><text class="dg-t" x="564" y="56">Retrieval</text><text class="dg-s" x="564" y="94">never arrived</text>
<rect class="dg-box" x="10" y="120" width="170" height="96" rx="8"/><text class="dg-k" x="24" y="142">E · 5</text><text class="dg-t" x="24" y="166">Isolation</text><text class="dg-s" x="24" y="204">split the wrong work</text>
<rect class="dg-box" x="190" y="120" width="170" height="96" rx="8"/><text class="dg-k" x="204" y="142">F · 5</text><text class="dg-t" x="204" y="166">Cache and cost</text><text class="dg-s" x="204" y="204">cheaper tokens, bigger bill</text>
<rect class="dg-box" x="370" y="120" width="170" height="96" rx="8"/><text class="dg-k" x="384" y="142">G · 6</text><text class="dg-t" x="384" y="166">Session and</text><text class="dg-t" x="384" y="184">state</text><text class="dg-s" x="384" y="204">the session outlived itself</text>
<rect class="dg-box--info" x="550" y="120" width="160" height="96" rx="8"/><text class="dg-k" x="564" y="142">H · 1</text><text class="dg-t" x="564" y="166">Measurement</text><text class="dg-s" x="564" y="204">measured the wrong axis</text>
</svg>
</div>
<figcaption>Most real incidents combine two clusters: for example a compaction failure (C) that launders a stale fact (B). That is why the symptom index lists several causes per symptom.</figcaption>
</figure>

## Symptom-to-cause index

| What you see | Likely causes, most likely first |
|---|---|
| The agent ignores a rule it followed earlier | F-38, F-2, F-19 |
| The agent repeats the same action | F-39, F-18, F-14 |
| Confidently wrong output, clean-looking transcript | **F-21**, F-9, F-11, F-23 |
| The agent asks for something already in context | F-15, F-16, F-18 |
| Costs rose after an "optimisation" | F-33, F-35, F-36, F-37 |
| The agent edits the wrong file | F-23, F-10, F-8 |
| The agent uses an odd tool | F-1, F-24 |
| The agent cannot tell it is finished | **F-16**, F-41 |
| Quality falls over a long session | F-38, F-19, F-43, F-7 |
| Parallel work produces incompatible pieces | **F-29**, F-28 |
| The bill tripled with no visible change | F-37, F-33 |
| The bug turned out to be in config | F-24 |
| It worked yesterday and not today | **F-44**: variance you never measured |

## A: Dilution and displacement

| # | Failure | Tell | Detect | Contain | Fix |
|---|---|---|---|---|---|
| F-1 | **Tool-definition bloat** | Prefix tax over 25K; capabilities never used | Count schema tokens; count calls over 20 sessions | Disable the largest unused server | Tool audit; budget 20 tools, 15K tokens; re-audit quarterly |
| F-2 | **Instruction-file sprawl** | Over 200 lines; rules ignored late in sessions | Line count over time; violations per rule | Move the three most-violated rules to the end | Inference test; scoped files; turn violated rules into hooks or lints |
| F-3 | **Tool-output flooding** | One command uses over 10% of the window | Rank commands by token volume | Re-run with a quiet flag; do not keep the log | Output shaping; redirect to a file with a digest |
| F-4 | **Whole-file reading** | Read-utilisation under 5%; 1,200 lines read to change 4 | Sample 20 reads | Ask for a range or symbol | Structural retrieval |
| F-5 | **Over-broad first search** | A grep returning 3,000+ hits, all loaded | Result counts in transcripts | Cap results; narrow before reading | Search tools with hard caps; openers that name an identifier |
| F-6 | **Coherent-document distraction** | The agent cites the design doc for behaviour the code contradicts | Trace wrong beliefs back to a document | Remove the document; ask again | Never pre-load design documents |
| F-7 | **Retention hoarding** | A 12K log from turn 8 still present at turn 60 | [[Retention integral]] | Offload or compact it | Offload after a short delay |

## B: Staleness and poisoning

| # | Failure | Tell | Detect | Contain | Fix |
|---|---|---|---|---|---|
| F-8 | **Stale self-read** | The agent cites a line its own edit moved | Compare the in-context copy with disk | Re-read the file | Re-read before re-editing; auto-refresh after edits |
| F-9 | **Hallucination laundered by compaction** | A fact in the summary that never appeared in a tool result | Find each summary fact's first appearance | **Reset to before the poison.** Do not argue | A "verified how" field in the schema; ground claims in tool output |
| F-10 | **Index staleness** | Semantic search returns pre-refactor code, no error | Search for a symbol you just renamed | Fall back to live search | Prefer live retrieval; rebuild triggers |
| F-11 | **Stale memory entry** | The agent asserts a fact that was true six months ago | Sample 20 entries against the repository | Delete the entry | Memories only about slow-changing things; prefer ADRs |
| F-12 | **Stale instruction rule** | A rule describing a refactor that already happened | Read the file against the code quarterly | Delete the line | Review the instruction file in PRs that change what it describes |
| F-13 | **Prompt injection via retrieved content** | The agent follows an instruction found in a file, log or README | Tool calls not traceable to a user turn | Stop the session; audit what was retrieved | Treat all retrieved content as data; never give tool output authority |

> [!warning] Poisoning cannot be argued away
> F-9 is the most dangerous failure here. Correcting it inline appends a competing claim and leaves the original in place, and a later compaction may keep the wrong one. See [[poisoning]] and [[laundering]].

## C: Compaction

| # | Failure | Tell | Detect | Contain | Fix |
|---|---|---|---|---|---|
| F-14 | **Compaction mid-sub-goal** | The agent restarts partly finished work | Compare compaction times with sub-goal boundaries | Restate the current sub-goal | Semantic triggers with suppression rules |
| F-15 | **Detail loss** | The agent knows "there was an error" but not which | Exact-string survival rate | Re-run the command | A verbatim exact-strings section |
| F-16 | **Lost sense of state** | The agent cannot tell whether it is done | Termination recognition: 44.6% versus 77.2% in one study [S] | Ask "what is done and what remains?" | A done / in-progress / not-started block; re-read the plan file |
| F-17 | **Post-compaction error spike** | The turn right after compaction fails more (+0.108 errors [S]) | Error rate in the 3 turns after each boundary | Insert a deliberate orientation step | Make the plan-file re-read the first action |
| F-18 | **Regressive exploration** | Re-fetching and replaying right after a compaction | Re-fetch rate in the next 10 turns | Point at the offloaded artifact | Offload before compacting |
| F-19 | **Compaction cascade** | Three or more compactions; a summary of summaries | Compactions per session | Reset now | Cap at one; session discipline |
| F-20 | **Nondeterministic retention** | The same transcript compacted twice keeps different facts [S] | Run the compaction twice and diff | Nothing in-session | A strict schema; addressable stubs for observations |

## D: Retrieval

| # | Failure | Tell | Detect | Contain | Fix |
|---|---|---|---|---|---|
| F-21 | **[[Starvation]]** | Confidently wrong output; clean transcript; no error | **[[Read-coverage]] audit**: was the decisive file ever opened? | Name the file and re-run | Better retrieval *quality*, not more volume |
| F-22 | **[[Fragment blindness]]** | Reasoning as if code always runs when it sits inside a condition | Check grep context settings | Re-read the enclosing function | At least `-C 8`; prefer symbol reads |
| F-23 | **Near-duplicate confusion** | The agent edits `UserServiceV2` when `UserService` was live | Grep for near-duplicate names | Point at the right one | Structural retrieval; better, **delete the duplicate** |
| F-24 | **Config blindness** | The agent exhausts the code and never checks YAML, env vars or flags | Was the cause in a non-code file never searched? | Search config explicitly | Keep lexical search; include config globs by default |
| F-25 | **Silent zero-result** | Five irrelevant chunks returned; the agent proceeds as if it found something | Relevance-sample 20 queries | Switch to grep, which fails loudly | Score thresholds with an explicit "no confident match" |
| F-26 | **Generated-code pollution** | Hits in `node_modules/`, `dist/`, `__generated__/` | Path distribution of search hits | Re-run with exclusions | Ignore files; exclusion defaults |
| F-27 | **Searching without narrowing** | Search turns over 60% of the session, no edits | Search-to-edit turn ratio | State the hypothesis and the file to check | Better openers; expand along the reference graph |

## E: Isolation

| # | Failure | Tell | Detect | Contain | Fix |
|---|---|---|---|---|---|
| F-28 | **[[Contract loss]]** | The parent re-derives something the sub-agent knew | Redo rate after delegations | Read the sub-agent's saved transcript | A `notable_outside_scope` field; save transcripts |
| F-29 | **Conflicting implicit decisions** | Outputs individually coherent, mutually incompatible [P] | Conflict rate across parallel delegations | Reconcile by hand (expensive) | The composability test; fix decisions in the brief |
| F-30 | **Prefix tax multiplication** | Total spend rises sharply with no reliability gain | Total-token multiplier versus one agent | Delegate coarser units | Linear thread with disposable scouts |
| F-31 | **Verbose sub-agent results** | A transcript comes back instead of a result | Parent growth per delegation | Ask for the summary of the summary | Strict output schema with a token cap |
| F-32 | **Unverifiable delegation** | Checking the output costs as much as producing it | Time verifying versus doing it directly | Stop delegating this kind of work | Delegate only what is cheap to verify |

## F: Cache and cost

| # | Failure | Tell | Detect | Contain | Fix |
|---|---|---|---|---|---|
| F-33 | **Cache thrash from a dynamic prefix** | Hit rate under 30%; cost per turn rising faster than tokens | Cache hit rate per session | Freeze the tool set and instruction file | Prefix stability; static, hand-pruned tools |
| F-34 | **Timestamp in the prefix** | Near-zero hit rate despite a "stable" configuration | Diff the first 2,000 tokens of two requests | Remove the injected variable | No timestamps, session IDs or counters in the prefix |
| F-35 | **Compaction costing more than it saves** | Cost rises after enabling compaction | Cache-adjusted cost per turn, before and after | Raise the threshold | Compact less often; prefer resets |
| F-36 | **Optimising raw tokens** | A "20% token saving" that raised the bill | Separate cached from uncached input | Revert | Report [[cache-adjusted cost]] |
| F-37 | **Sub-agent cost blindness** | The parent context looks great; the bill tripled | Total spend across all agents | Cap delegations per session | Track the total-token multiplier |

## G: Session and state

| # | Failure | Tell | Detect | Contain | Fix |
|---|---|---|---|---|---|
| F-38 | **[[Position decay]] of rules** | Rules followed early, ignored after two hours | Violation rate by turn depth | Restate the rule in the current turn | Session caps; shorter instruction files; constraints next to the action |
| F-39 | **Distraction loop** | Same tool, same arguments, three or more times | A [[loop detector]] | Reset or redirect firmly; rephrasing does not work | Reset triggers; a ruled-out list |
| F-40 | **Requirement clash** | Output satisfies a requirement withdrawn 20 turns ago | Count requirement reversals | Restate the **full** current requirement | A living plan document as the single source of truth |
| F-41 | **Plan-file drift** | The plan says step 3; the agent is on step 6 | Compare the plan with recent actions | Rewrite the plan now | Update at state changes; a "last updated at turn N" line |
| F-42 | **Handoff too thin** | The new session spends 20 turns re-establishing context | Turns to first productive edit after a reset | Paste in more detail | A handoff with `file:line` pointers and verification commands |
| F-43 | **Sunk-cost session** | Hours into a degrading session, still pushing | Quality against elapsed time | Reset | Mechanical caps: one compaction, or two hours |

## H: Measurement

| # | Failure | Tell | Detect | Contain | Fix |
|---|---|---|---|---|---|
| F-44 | **Measuring the wrong axis** | "Compaction is basically free" from single runs, while users say "it worked yesterday" | Compute Pass² alongside Pass@2; a widening gap is the signal [S] | Nothing at runtime: it is a measurement defect | k ≥ 2, always; track [[Pass^k|Pass²]] ÷ Pass@2 |

## Four questions that pre-empt most of this

Ask them before any long agent task.

1. **What is my prefix tax, and how much of it is dead?** (F-1, F-2, F-33)
2. **What is the largest thing that will enter context, and where will it go afterwards?** (F-3, F-7, F-18)
3. **If this session is compacted or reset, what must survive, and where is it written down?** (F-14 to F-19, F-42)
4. **If this fails, will I be able to tell whether the agent was starved or diluted?** (F-21, F-44)

> [!key] The question teams never ask
> Question 4 decides whether the next six months of context work is directed or random. The [postmortem template](ch:templates#7-context-postmortem) answers it in 15 minutes.
