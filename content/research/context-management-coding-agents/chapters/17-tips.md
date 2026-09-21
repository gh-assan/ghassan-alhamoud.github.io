## The eight that pay for themselves in week one

If you do nothing else from this chapter, do these. Five of the eight cost nothing and need no installation.

| # | Habit | Effort | Payoff |
|---|---|---|---|
| 6 | Delete MCP servers with zero calls | 10 min | Often 25%+ of the window, permanently |
| 9 | Four shell wrappers for your loudest commands | An afternoon | 60–90% less tool output [P] |
| 1 | Ignore files | 5 min | Prevents a whole class of failures |
| 3 | The inference test on the instruction file | 20 min | Smaller *and* more salient |
| 20 | A 200-token opener | Per session | Much less exploratory retrieval |
| 43 | Compact after a test passes, never mid-debug | Free | Avoids the worst compaction failures |
| 45 | Re-read the plan file right after compaction | Free | Protects the most error-prone step |
| 51 | Reset on the third repeated action | Free | Ends distraction loops at once |

That is the shape of this whole field: **the wins are mostly deletions and habits, not architecture.**

<figure class="diagram">
<p class="diagram__title">Where the habits apply in a session's life</p>
<div class="diagram__scroll">
<svg viewBox="0 0 720 150" role="img" aria-labelledby="tp-t">
<title id="tp-t">Habits are grouped by when they apply: setup once, opening a session, during the session for retrieval, state and boundaries, delegation, and ongoing hygiene.</title>
<rect class="dg-box--accent" x="10" y="30" width="110" height="70" rx="8"/><text class="dg-t" x="65" y="60" text-anchor="middle">Setup</text><text class="dg-s" x="65" y="80" text-anchor="middle">1–18 · once</text>
<rect class="dg-box" x="130" y="30" width="110" height="70" rx="8"/><text class="dg-t" x="185" y="60" text-anchor="middle">Opening</text><text class="dg-s" x="185" y="80" text-anchor="middle">19–26</text>
<rect class="dg-box" x="250" y="30" width="110" height="70" rx="8"/><text class="dg-t" x="305" y="60" text-anchor="middle">Retrieval</text><text class="dg-s" x="305" y="80" text-anchor="middle">27–34</text>
<rect class="dg-box" x="370" y="30" width="110" height="70" rx="8"/><text class="dg-t" x="425" y="60" text-anchor="middle">State</text><text class="dg-s" x="425" y="80" text-anchor="middle">35–42</text>
<rect class="dg-box" x="490" y="30" width="110" height="70" rx="8"/><text class="dg-t" x="545" y="60" text-anchor="middle">Boundaries</text><text class="dg-s" x="545" y="80" text-anchor="middle">43–54</text>
<rect class="dg-box--info" x="610" y="30" width="100" height="70" rx="8"/><text class="dg-t" x="660" y="60" text-anchor="middle">Delegation</text><text class="dg-s" x="660" y="80" text-anchor="middle">55–60</text>
<line class="dg-line dg-line--dash" x1="65" y1="118" x2="660" y2="118"/>
<text class="dg-s" x="360" y="140" text-anchor="middle">ongoing hygiene, 61–62: re-audit quarterly; fix the repository when problems recur</text>
</svg>
</div>
<figcaption>The list below follows this order. Read the section for the moment you are in.</figcaption>
</figure>

## Before the session: setup, once

1. **Write ignore files first.** `node_modules/`, `dist/`, `build/`, `*.lock`, `__generated__/`, `vendor/`, `.next/`, snapshots, fixtures. The cheapest change in this research.
2. **Link `CLAUDE.md` to `AGENTS.md`.** One file, read by 30+ tools [P]. Two copies guarantee divergence.
3. **Apply the inference test to every instruction line.** Could a competent engineer infer it from the repository in two minutes? If yes, delete it.
4. **Put the three rules you most need obeyed at the *end* of the instruction file.** The end of a block is more attended than its middle.
5. **Turn repeatedly violated rules into machinery.** A rule broken in half your sessions is a wish. Make it a lint rule, a hook, a pre-commit check or a test.
6. **Delete every MCP server with zero calls in your last 20 sessions.** No deprecation period. Restoring takes seconds.
7. **Prefer the shell to an MCP server for anything the shell already does:** `gh`, `psql`, `curl`, `rg`, `git`.
8. **Check whether your harness already does it before installing anything.** Deferred tools, usage reporting and compaction control are increasingly built in [P].
9. **Write four shell wrappers for your four loudest commands.** Quiet flag, filter, full output to a file, a digest plus the path.
10. **Make the pass/fail asymmetry explicit in your test wrapper.** One line on pass; the full trace on fail.
11. **Never truncate the middle.** Head and tail, roughly 30/70. Errors cluster at the end.
12. **Create a gitignored `.agent/` scratch directory** as the offload target.
13. **Give `rg` sane context:** `-C 8` at least. [[Fragment blindness]] is invisible and expensive.
14. **Install a symbol-level retrieval tool** if your stack has language-server support.
15. **Get a live context-utilisation display.** Awareness alone changes behaviour.
16. **Measure your prefix tax once and write it down.** Re-measure after every harness update.
17. **Put context configuration under version control:** instruction files, ignore files, tool config, wrapper scripts.
18. **Write the transcript-grep script.** Twenty lines of shell that count tool calls, rank commands by output volume and flag repeated calls.

```bash title="transcript-stats.sh — three routing metrics from a JSONL transcript"
#!/usr/bin/env bash
# Usage: transcript-stats.sh session.jsonl
# Adjust the jq paths to your harness's transcript format.
f="$1"
echo "== Tool calls by name =="
jq -r 'select(.type=="tool_use") | .name' "$f" | sort | uniq -c | sort -rn
echo "== Largest tool results (approx tokens = chars / 4) =="
jq -r 'select(.type=="tool_result") | "\((.content|tostring|length)/4|floor)\t\(.tool // "?")"' "$f" \
  | sort -rn | head -5
echo "== Repeated identical calls (possible loops) =="
jq -c 'select(.type=="tool_use") | {name, input}' "$f" | sort | uniq -c | awk '$1 >= 3' | sort -rn
```

## Opening a session

19. **One session, one coherent task.** New task, new session. The most violated rule here.
20. **Spend 200 tokens on the opener.** Goal, constraints, relevant paths, definition of done, and what *not* to do.
21. **Name a file in the opener,** even as a guess. It turns expensive exploration into cheap directed retrieval.
22. **State the definition of done:** "Done when `pytest tests/checkout` passes with no new lint errors." Otherwise the agent invents a stopping condition.
23. **State what not to do:** "Do not touch `legacy/`. Do not add dependencies. Do not reformat unrelated files."
24. **Do not paste the design document.** Pointers, never prose.
25. **When resuming, open with the plan file, not a narrative.** "Continue from `PLAN.md`" beats three paragraphs of recap.
26. **Ask for a plan before edits on anything over about 30 minutes.** The plan becomes the plan file, which survives every boundary.

```text title="a 200-token opener"
Goal: checkout requests time out under load (p95 > 5s since Tuesday).
Start with: src/checkout/service.ts and src/db/pool.ts.
Constraints: no new dependencies; do not touch legacy/ or change the public API.
Done when: `npm test -w checkout` passes and a load test at 200 rps keeps p95 < 800ms.
First: write PLAN.md with your hypotheses before editing anything.
```

## During the session: retrieval

27. **Locate, then inspect, then read:** `grep -l` → `grep -n` → read the symbol.
28. **Ask for symbols, not files:** "read the `handleRetry` function", not "read `client.ts`".
29. **Expand along the reference graph.** Found the function? Read its *callers*, not its neighbours.
30. **Search config explicitly when the code runs out:** `*.yaml`, `*.toml`, `.env*`, CI files, feature flags.
31. **Cap search results and narrow first.** A 3,000-hit grep is a distractor injection, not a search.
32. **Re-read before you re-edit.** Your own edits invalidate your own context.
33. **Treat zero results as information.** They redirect the hypothesis. That is grep's underrated advantage.
34. **Use `git log -S` and `git blame` for "when did this change?"** Agents rarely reach for history unprompted.

## During the session: output and state

35. **Redirect; do not delete.** Full output to a file, digest in context, path included.
36. **Make every [[stub]] self-describing.** `a3f9.log (14KB) — npm ci, exit 0, 2 peer-dep warnings`, not `a3f9.log (14KB)`.
37. **Offload after a delay,** not immediately. Offloading the output you are about to read forces a recall.
38. **Update the plan file at state changes,** not on a timer.
39. **Keep a "ruled out" section with reasons and evidence.** It prevents re-proposing a rejected approach after a boundary.
40. **Add "last updated at turn N" to the plan file.** Drift becomes visible.
41. **Cap the plan file at 80 lines.** Longer means the task needed decomposing.
42. **Commit at every checkpoint.** Git is offload with review attached, and the cheapest reversibility you own.

## During the session: boundaries

43. **Compact right after a test passes. Never mid-debug.** [[Semantic triggering]] in its simplest form.
44. **Do not compact when stuck.** Being stuck means you do not yet know what matters, so you cannot choose what to drop.
45. **Re-read the plan file as the first action after any compaction.** It protects the step with the most errors (+0.108 [S]).
46. **Never compact twice.** A second compaction summarises a summary. Reset instead.
47. **Keep exact strings verbatim in summaries:** errors, versions, paths, line numbers, config keys, IDs.
48. **Put a done / in-progress / not-started block in every summary.** It counters the 44.6% termination collapse [S].
49. **Do not compact with fewer than five turns left.** It is below breakeven.
50. **Reset instead of arguing.** Correcting a wrong fact appends a competitor and leaves the original.
51. **Reset on the third repeated action.** Rephrasing will not help; distraction is a property of the context.
52. **Write the handoff note before you need it.** Two minutes now saves twenty turns later.
53. **Put `file:line` pointers in handoffs, not descriptions.**
54. **Put verification commands in handoffs, with their results:** "`pytest tests/checkout -q` → 47 passed, at `a3f9c1`".

## Delegation

55. **Write the output schema before delegating.** If it does not fit in 20 lines, the work is not isolatable.
56. **List the implicit decisions the sub-agent will face.** If the list is not empty, fix them in the brief or do not delegate.
57. **Give sub-agents the minimum tool set.**
58. **Add a `notable_outside_scope` field to every contract.** The cheapest mitigation for [[contract loss]].
59. **Save sub-agent transcripts and give the parent the path.** It turns contract loss into offload.
60. **Never delegate debugging.** The ruled-out hypotheses are the most valuable product, and they die with the sub-agent.

## Ongoing hygiene

61. **Re-audit quarterly, on the calendar.** Thirty minutes. Without it you are back at baseline within two quarters [P].
62. **When a context problem recurs, fix the repository.** Three functions named `parse_config` is a repository problem wearing a retrieval problem's clothes.
