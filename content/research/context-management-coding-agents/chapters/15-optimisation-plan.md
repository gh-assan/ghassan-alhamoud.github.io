## How to use the plan

**The plan is ordered by yield per effort, not by intellectual interest.** Phase 1 is unglamorous deletion, and it is where most of the value is. Phase 5 is the interesting architecture, and it is where most of the *writing* about this field is. That inversion is the plan's main contribution.

Three rules make it work:

1. **Do not skip Phase 0.** Every later gate compares against the Phase 0 baseline. Without it you cannot tell whether anything helped, and in six months you will have a stack you cannot prune.
2. **Pass a phase's gate before starting the next.** Adopting five things at once produces a result nobody can attribute.
3. **Stop when the stop rule fires.** Context management has a stopping point.

<figure class="diagram">
<p class="diagram__title">Seven phases, about 16 hours over six weeks</p>
<div class="diagram__scroll">
<svg viewBox="0 0 900 300" role="img" aria-labelledby="op-t">
<title id="op-t">Phase 0 baseline and phase 1 deletion in week 1, phase 2 prevention in week 2, phase 3 retrieval in week 3, phase 4 state in week 4, optional phase 5 measurement in weeks 5 and 6, and phase 6 only if measurement demands it.</title>
<text class="dg-k" x="170" y="20">WEEK 1</text><text class="dg-k" x="290" y="20">WEEK 2</text><text class="dg-k" x="410" y="20">WEEK 3</text><text class="dg-k" x="530" y="20">WEEK 4</text><text class="dg-k" x="650" y="20">WEEKS 5–6</text><text class="dg-k" x="790" y="20">LATER</text>
<line class="dg-line dg-line--dash" x1="160" y1="28" x2="160" y2="270"/><line class="dg-line dg-line--dash" x1="280" y1="28" x2="280" y2="270"/><line class="dg-line dg-line--dash" x1="400" y1="28" x2="400" y2="270"/><line class="dg-line dg-line--dash" x1="520" y1="28" x2="520" y2="270"/><line class="dg-line dg-line--dash" x1="640" y1="28" x2="640" y2="270"/><line class="dg-line dg-line--dash" x1="780" y1="28" x2="780" y2="270"/>
<text class="dg-t" x="10" y="56">0 Baseline</text><rect class="dg-box--accent" x="165" y="40" width="50" height="24" rx="4"/><text class="dg-s" x="222" y="57">1.5 h · measure 8 numbers</text>
<text class="dg-t" x="10" y="90">1 Deletion</text><rect class="dg-box--accent" x="215" y="74" width="60" height="24" rx="4"/><text class="dg-s" x="282" y="91">2.5 h · 25–35% if waste dominates</text>
<text class="dg-t" x="10" y="124">2 Prevention</text><rect class="dg-box--accent" x="285" y="108" width="100" height="24" rx="4"/><text class="dg-s" x="392" y="125">3 h · target −50–80% if output waste dominates</text>
<text class="dg-t" x="10" y="158">3 Retrieval</text><rect class="dg-box--info" x="405" y="142" width="70" height="24" rx="4"/><text class="dg-s" x="482" y="159">2 h + habit</text>
<text class="dg-t" x="10" y="192">4 State</text><rect class="dg-box--info" x="525" y="176" width="100" height="24" rx="4"/><text class="dg-s" x="632" y="193">3 h + habit</text>
<text class="dg-t" x="10" y="226">5 Measurement</text><rect class="dg-box--ghost" x="645" y="210" width="130" height="24" rx="4"/><text class="dg-s" x="710" y="227" text-anchor="middle">4 h · optional</text>
<text class="dg-t" x="10" y="260">6 Advanced</text><rect class="dg-box--ghost" x="785" y="244" width="105" height="24" rx="4"/><text class="dg-s" x="837" y="261" text-anchor="middle">if data demands</text>
<text class="dg-s" x="165" y="292">Phases 0–2: seven hours, mostly reversible, verify changes</text>
</svg>
</div>
<p class="diagram__hint">Scroll sideways to see the full timeline.</p>
<figcaption>Every phase is valuable on its own, and you may stop after any of them. The dark bars are mostly reversible; the lighter ones need new habits, which is where adoption usually stalls.</figcaption>
</figure>

## Phase 0: Baseline (1.5 hours, week 1) {#phase-0-baseline}

You cannot optimise what you have not measured, and you cannot claim an improvement without a "before".

**Do:**

1. **Prefix tax.** Open a fresh session, send a single `.`, record the input tokens. Write it down with the date and harness version.
2. **Tool inventory.** Dump every tool schema and count tokens, in total and per server. Then list every tool actually called in your last 20 sessions.
3. **Session profile.** Take your three longest recent sessions and bucket their tokens by segment with the [budget audit](ch:templates#1-context-budget-audit). You are looking for the largest segment *you control*.
4. **Command ranking.** Rank shell commands by total output tokens. Expect three to five commands to be over 70% of tool output.
5. **Cache hit rate.** Record it if your harness or provider reports it. If not, write down that you cannot measure it: that is a finding.
6. **Failure sample.** For your last 10 failed or unsatisfying tasks, answer one question: **was the decisive file ever read?** Tally starvation (never read) against dilution (read and ignored).

```text title="phase-0-baseline.txt"
Date: ____________   Harness version: ____________
T1   prefix tax                   _______ tokens
T2   tool-definition share        _______ %
T3   defined : called             _______ : 1
T6   peak utilisation             _______ %
T10  tool-result share            _______ %
T24  cache hit rate               _______ %   (or "cannot measure")
T19  starvation : dilution        _______ : _______
Largest segment I control:        ____________________
```

**Gate:** the numbers are written down somewhere you will find them again. That is the whole gate.

**Why it exists.** A first audit may reveal that the largest segment is not the one the team was tuning, and that some of it is waste rather than a trade-off. Skipping this means optimising someone else's bottleneck.

## Phase 1: Deletion (2.5 hours, week 1) {#phase-1-deletion}

**The highest-yield, most reversible phase when the audit finds dead or duplicate surface.** Delete candidate waste first, verify task coverage after each change, and keep rollback. Instruction pruning changes behaviour, so measure it separately.

**Do:**

1. **Review MCP servers with zero calls** in a representative 20-session sample. Remove candidates only after task-coverage verification; keep a rollback. *(30 min)*
2. **Review MCP servers that duplicate the shell**: GitHub if you have `gh`, filesystem if you have file tools, database if you have `psql`, fetch if you have `curl`. If a server is a *security* control, keep it, but write that decision down; otherwise verify coverage before removal. *(30 min)*
3. **Enable deferred tool definitions** for what survives, if your harness supports them. *(15 min)*
4. **Write ignore files**: `node_modules/`, `dist/`, `build/`, `*.lock`, `__generated__/`, `vendor/`, snapshots, fixtures. *(15 min)*
5. **Apply the inference test** to your instruction file: could a competent engineer infer this line from the repository in two minutes? If yes, delete it. Aim for at most 150 lines, and move the three rules you most need obeyed to the **end**. Delete rules that describe refactors already done. *(45 min)*

**Gate:** re-measure prefix tax, tool share and the defined : called ratio. **Target a 50–90% prefix-tax reduction when dead or duplicate surface dominates [P]; measure it before treating it as a target.** Then run 10 normal sessions and count occasions where a deleted capability was missed. Expect zero; if more than one, restore that specific server and note why.

**Payoff:** a practitioner estimate is **25–35% of the window back** when unused or duplicated capabilities dominate [P]; measure your own workload before treating it as a target.

## Phase 2: Prevention (3 hours, week 2) {#phase-2-prevention}

Shape output before it becomes context.

**Do:**

1. **Wrap your four loudest commands.** Each wrapper applies the quiet flag, filters obvious noise, sends the full output to `.agent/logs/`, and returns a digest plus the path. *(2 h)*
2. **Build in the pass/fail asymmetry.** Passing test runs return one line; failing runs return the full trace. This one rule is most of the value.
3. **Truncate head-and-tail** at 2–8K tokens with a 30/70 split for anything not wrapped. **Never truncate the middle.** *(15 min)*
4. **Create a gitignored `.agent/` directory.** *(5 min)*
5. **Set search defaults**: `rg -C 8` plus your standard exclusions. *(15 min)*
6. **Check the cache hit rate.** If Phase 1 or 2 lowered it, something you did made the prefix dynamic. Find it and revert. *(15 min)*

```bash title="bin/agent-test — a wrapper with the pass/fail asymmetry"
#!/usr/bin/env bash
# Run the test suite; return one line on success, the failure detail on failure.
mkdir -p .agent/logs
log=".agent/logs/test-$(date +%s).log"
if pytest -q --tb=short "$@" >"$log" 2>&1; then
  echo "PASS: $(tail -n 1 "$log")   (full log: $log)"
else
  echo "FAIL (full log: $log)"
  head -n 20 "$log"          # the command and first failures
  echo "…"
  tail -n 60 "$log"          # errors cluster at the end
  exit 1
fi
```

**Gate:** re-measure tool-result share and cache hit rate. **Expect tool-result tokens down 50–80%** [P] and the cache hit rate flat or up. Then count re-runs with more verbose flags over 10 sessions. A rise means you filtered too hard: loosen that digest; do not abandon the approach.

**Payoff:** a practitioner-reported 20–30% when output waste dominates [P]; it can compound with Phase 1 because the phases act on different segments, but measure your own sessions.

## Phase 3: Retrieval (2 hours plus a habit, week 3) {#phase-3-retrieval}

The first phase that needs behaviour change, which is why it is third.

**First, read your Phase 0 failure tally.** It decides what you do.

- **Mostly starvation** (decisive file never read): a *recall* problem. Do items 1 and 2. **Do not reduce retrieval volume**; that makes it strictly worse.
- **Mostly dilution** (read and ignored): a *precision* problem. Do items 1, 2 and 3.

1. **Install a symbol-level retrieval tool** if your stack has language-server support. Budget five to eight tool slots for it. *(1 h)*
2. **Adopt locate → inspect → read**: `grep -l`, then `grep -n`, then read the symbol. Expand along the reference graph, not the file.
3. **Stop pre-loading.** Replace any codebase overview with a pointer seed under 2,000 tokens. *(1 h)*
4. **Re-read before re-editing.** Your own edits invalidate your own context.

**Gate:** sample 20 reads and compute [[read-utilisation]]. **Expect the median to roughly double**, typically from under 10% to 15–25%. Re-run the failure tally on the next 10 failures: the balance should move toward dilution. If it moved toward starvation, you cut too much; widen the pointer seed.

## Phase 4: State and boundaries (3 hours, week 4) {#phase-4-state-and-boundaries}

Making sessions survivable. This is where quality on long tasks comes from.

1. **Adopt a plan-file convention** with goal, constraints, decisions, **ruled out**, and next step. Cap it at 80 lines; update it at state changes; include "last updated at turn N". *(1 h)*
2. **Adopt an offload convention** with **self-describing** stubs: `a3f9.log (14KB) — npm ci, exit 0, 2 peer-dep warnings`, never just `a3f9.log (14KB)`. *(30 min)*
3. **Replace your compaction prompt** with the [explicit schema](ch:templates#4-compaction-schema). Worth up to 6.5 SWE-bench points [S], and it is a text edit. *(30 min)*
4. **Set compaction rules:** right after a test passes or a sub-task closes; never mid-debug or when stuck; never more than once per session; never with fewer than five turns left.
5. **Make the plan-file re-read the first action after any compaction.** It protects the most error-prone step in the session [S].
6. **Adopt reset triggers:** a second compaction is needed, the same action repeats three times, a poisoned fact appears, the task pivots, or utilisation passes 70% with a lot left.
7. **Adopt a [handoff template](ch:templates#5-session-handoff)** with `file:line` pointers and verification commands with their results. *(30 min)*

**Gate:** post-boundary re-fetch rate **under 2**, compactions per session **at most 1**, and, over 10 long sessions, **zero** re-proposals of an approach the plan file lists as ruled out.

**Why adoption stalls here:** the payoff is invisible on short tasks.

## Phase 5: Measurement (4 hours, weeks 5–6, optional) {#phase-5-measurement}

Only if you intend to keep making context changes. If Phases 1–4 solved your problem, **skip this and go to the stop rule.**

1. **Build a small evaluation set:** 30–40 replayed tickets, repository pinned to the commit before each fix, stratified by size and subsystem. Check for leakage by running one arm with retrieval disabled. *(2 h)*
2. **Build a k = 2 runner** that computes Pass@2 and Pass². *(1 h)*
3. **Run one paired A/B** on the change you are least sure about, analysed with McNemar. *(1 h plus compute)*
4. **Add the two missing instruments:** post-boundary re-fetch rate and Pass² ÷ Pass@2. Neither exists off the shelf.

**Gate:** you can say, with an interval, "our configuration solves X of 40 tasks reliably, at Y cache-adjusted cost per solved task", and you know how wide the interval is.

**Worth it** if you will make more than three further context changes. Not otherwise.

## Phase 6: Advanced (only if measurement demands it) {#phase-6-advanced}

Do not start these without a measured reason from Phase 5.

| Change | Justified when | Expect |
|---|---|---|
| **Code execution against an API** | Tool definitions still over 15K after Phase 1, or result waste over 10:1 | Candidate for the largest remaining win; 98.7% on definitions is vendor-reported [P] |
| **Sub-agents with disposable scouts** | Survey work regularly saturates the main context | Parent context flat; total spend up |
| **Addressable-recall compaction** | Post-boundary re-fetch stays over 2 after Phase 4 | The best published compaction result [S]; you will probably build it |
| **Semantic search over docs and ADRs** | Concept questions are a measured share of your work | A complement, never primary |
| **A memory system** | You can name three facts you re-derive weekly that have no repository home | Only with the retrieval gate below |

> [!warning] The memory gate is not negotiable
> Instrument *retrievals that changed an action, per week* from day one. Under one a week after a month: delete the system.

## The stop rule

Check monthly. **Stop optimising context when all of these hold:**

- Cache hit rate over 70%
- Defined : called tools under 3:1
- Tool-result share under 35%
- Read-utilisation over 15%
- Post-boundary re-fetch under 2
- Pass² ÷ Pass@2 over 0.85, or you are not compacting

When they all hold, **your binding constraint is elsewhere**: model choice, task decomposition or the verification loop. Investing further in context past this point produces frameworks, not results.

## The maintenance loop

Context management regresses. Without a recurring audit you are back at baseline within two quarters [P].

**Quarterly, 30 minutes:**

1. Re-run Phase 0's measurements.
2. Compare them with last quarter.
3. For any metric that regressed, re-apply that phase.
4. Delete any instruction rule that was neither violated nor relevant all quarter.
5. Review any tool with zero calls this quarter; if the sample is representative, verify task coverage and remove it with rollback.
6. Delete any stale memory entry.

Five of the six steps are deletions. That is not an accident.

## The plan on one page

| Phase | Effort | Do | Gate | Typical gain |
|---|---|---|---|---|
| **0 Baseline** | 1.5 h | Measure eight numbers | Numbers written down | — |
| **1 Deletion** | 2.5 h | Review dead-tool candidates; ignore files; prune instructions | Prefix tax −50–90%; verify coverage | 25–35% if waste dominates [P] |
| **2 Prevention** | 3 h | Wrap loud commands; head-and-tail; `.agent/` | Tool output −50–80%; cache flat or up | 20–30% if output waste dominates [P] |
| **3 Retrieval** | 2 h + habit | Symbol tool; locate → inspect → read; pointer seed | Read-utilisation roughly doubles | Smaller, sustained |
| **4 State** | 3 h + habit | Plan file, stubs, schema, reset triggers | Re-fetch under 2; at most one compaction | Long-task quality |
| **5 Measurement** | 4 h | Evaluation set, k = 2, paired A/B | Pass² with an interval | Future changes attributable |
| **6 Advanced** | Open | Code execution, scouts, addressable recall, memory | Per-change gates | Diminishing |

> [!try] If you have one afternoon
> Phase 0 steps 1–4, then Phase 1 steps 1–2. Two hours; use the recovery estimate only if the audit shows dead or duplicate surface, then verify and keep rollback.
