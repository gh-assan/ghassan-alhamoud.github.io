# Tamoz technical deep dive review

Reviewed: 2026-11-02. Website baseline: `51c5b60`. Line numbers refer to that baseline.

## Scope

Read `projects/tamoz-technical.html` and cross-check its material claims against
local Tamoz `d9fcbdb7`, Agentic Stream `52b08710`, and Streams Simulator `6dd667cb`.
These are local checkout snapshots, not a claim about current remote heads.
Run records in `.e2e-run` and `agent-research-lab/integration/e2e-runs` were also
read. Product repositories were read only; unrelated untracked work was untouched.
No software suites or physical experiments were rerun for this review.

## Findings

### P1: the hardware section says the physical seam is open, but the loop has closed

Lines 200, 1259-1262 (the "seam open" label in Figure 8), 1269, 1287, and 1300 say
the Tamoz-to-device route is work in progress and that no joined physical run exists.
The same claim appears at `projects/tamoz.html:195` and
`projects/tamoz-use-cases.html:165`.

`streams-simulator/docs/physical-devices/fan-experiment/REAL-RUN-PREP.md` records
real-board sessions on 2026-10-25: "the loop closed on the real board". Commands
were proposed by the model, approved by the owner, accepted and completed by the
board, and verified from the board's reading. The third session's `stream.db` holds
2 produced episode attempts, 2 decisions, and 2 verifications, and its worker profile
names `zai/glm-5.3-flash`. Its `worker.log` is empty and the model calls were not
decoded here, so the real-model statement rests on the run record and that profile.

Replace the open-seam wording and keep these limits beside the result:

- The thresholds were bench-scale (open at 23 C, escalate at 26 C, close at 22 C,
  rather than 30, 38, and 28), and the owner warmed the sensor by hand.
- The owner approved every command. A fan command is a 5-second firmware lease, at
  most 6 per hour, so the run proves the loop, not sustained cooling.
- The first session records deny, hold, expiry, unplug and replug, host loss, and
  emergency stop as not exercised. The second session later exercised a node refusal.
- With the motor supply disconnected, the chain still verified `set_cooling 45` as
  `succeeded`, because the board reports the commanded duty. Line 1287's "no
  independent instrument" and line 1127 therefore still stand. Do not claim a
  measured physical effect.
- The earlier direct-serial run and the pump-station trial remain separate evidence.

### P2: investigation and tool-surface descriptions are out of date

Lines 383 and 1304 describe an exclusive six-tool surface and say there is no active
investigation. Line 967 repeats the point as "no go and look step" and should be
dated or reworded. Current `tamoz/documentation/guides/investigation.md` describes
operator-declared, read-only MCP probes and `tamoz investigate`.
`gems/tamoz-stream/lib/tamoz/stream/situation_request.rb:807` builds the episode
host with probes, and lines 835 onward include granted probes in the model surface.

Probes are enabled by configuration: the worker needs `--runtime-dir` with
`sources.probes` enabled, and the operator catalog must declare them. Without probes
the surface is at most the six named tools, and the stream tools appear only when the
evidence channel is open.

The correct status is partial integration, not absence. The limitations document
at lines 193-208 reports development-only measurements, no held-out result,
fabricated findings in 7 of 232 episodes, and a missing `evidence_time_range` on
the stream side. Update both the capability boundary and open-findings row to
explain the governed probes and their remaining limits. Do not describe this as
qualified industrial investigation. Build `d9fcbdb7` is also the campaign 2b build,
and this review did not establish whether that trial used probes, so do not imply it.

### P2: the page overcounts executed simulator rounds

Line 200 says the composition ran across five rounds, and line 1141 says reasoning
was scripted in all five. Lines 1192-1193 explicitly say Round 4 was prepared and
never run; its README says "READY-TO-START (scaffold)". Distinguish the five planned
rounds from the four executed rounds (1, 2, 3, 5), and preserve:

- the partial outcomes in Round 3. The page's table reflects the 14 August run; the
  later greenhouse rerun passed M5 with M6 still partial.
- that Round 5 was itself partial. Cold chain and logistics ran; `auth-edr` and
  `agent-fleet` did not (`e2e-runs/round-005/ASSESSMENT.md`).

Rounds 6 and 7 have run folders in `.e2e-run` and are not on the page. This review
did not read them. Decide whether they belong in the rewrite.

### P2: the worker API omits the rule-drafting RPC

Line 309 says `EpisodeWorker` has two RPCs. The shared protobuf and generated Ruby
service expose three: `Handshake`, `Execute`, and the feature-gated
`DraftPlaybookRule`. See
`tamoz/gems/tamoz-stream/lib/tamoz/stream/gen/runtime-v1_services_pb.rb:23-33`.
The worker announces the feature only when started with `--draft-model-policy`.
The page already describes drafting in section 8.2, so the interface introduction
contradicts the later explanation. List the core episode methods plus the
optional drafting method and explain its separate purpose.

### P3: stale counts, paths, and one unsupported claim

- Lines 196 and 878 say 27 gems. `tamoz/gems/` has 32 gemspecs. Tamoz's own
  `documentation/README.md:21` says 29, so that document needs correcting as well.
- Line 1335 says 55 ADRs. `documentation/adr/` has 62 numbered decisions: 53 current
  and 9 retired.
- Line 1333 names two moved files. They are now
  `internal/decisions/internal/domain/validator.go` and
  `internal/actions/internal/app/dispatch.go`.
- Line 838 says S7 was "exercised by a separate test". `RESULT.md` says only that
  the campaign did not cover it. Name the test or cut the sentence.

## Positioning and maintenance

- The owner plans to make the repositories private. This has not happened yet: all
  three were public on 2026-11-02. This review did not change visibility or licenses.
  Copy and evidence should survive the switch:
  - Remove the promotional wording at lines 60, 70 (audience: "reuse a piece of it,
    or contribute"), 118, 871, and 1343.
  - Remove the 12 "public repo" caption references (lines 66, 200, 296, 377, 405,
    481, 622, 680, 784, 1027, 1082, 1109) and the one at
    `projects/tamoz-use-cases.html:155`.
  - Remove `codeRepository` from the structured data in the technical page and the
    use-cases page (line 23 of each).
  - Rewrite section 20 (lines 1322-1343) as a description of the components. It
    invites readers to check code they will not be able to open.
  - Recheck the MIT statements at lines 118 and 1343 when the switch happens.
- The page has 4 deep evidence links, all on mutable branches: `RESULT.md` and
  `evidence/` on `rule-promotion` (lines 849 and 1339) and `limitations.md` on `main`
  (line 1320). Pinning them to commits will not help once the repositories are
  private. Publish `RESULT.md` and an evidence extract on this site before the switch,
  label them as a frozen record, and keep them distinct from later fixes. Section 9.5
  names the run builds, which are not the revision of the result document. Add a
  visible reviewed date and source revision table.
- The page has 21 major headings including the walkthrough and 13 SVG diagrams.
  It contains architecture, a trial report, general-agent internals, a simulator
  manual, and a chronological lab record. Group the contents into system design,
  learning and investigation, evaluation evidence, and operating limits. Preserve
  existing anchors so links from the overview continue working.
- Line 59 already links to `/tamoz/`. Change the remaining pilot CTA at line 1348
  (`mailto`, "Email me about a pilot") to point to `/tamoz/` and use team wording.
  Add the real bench photograph beside the hardware topology. Keep the real-board
  runs, the direct-serial run, and the simulated real-model trial explicit and separate.

## What is supported

The campaign-2b table's 13 versus 15 model episodes, 5 rule decisions, 7 versus 6
on-time repairs, 0/3 interventions on look-alikes, failed P1 target, and 147-second
P5 latency agree with the recorded `streams-simulator/docs/rule-promotion/RESULT.md`.
The result correctly separates the later recovery-check and acknowledgement fixes
from the frozen campaign numbers. This evidence should survive a rewrite.

"Works with any model" (lines 120 and 743) stands. Providers are a short table in
`gems/tamoz-agent-kernel/lib/tamoz/agent/model_client_factory.rb:12` over one
OpenAI-compatible transport, each with an API-base override, so adding a model is a
small change. Anthropic and Gemini families are reached through OpenRouter rather
than their native protocols. Keep the GLM trial attribution beside the claim.

The page also distinguishes software self-healing from equipment rule promotion,
and separates receipt, report, and effect. These are useful technical explanations
to keep. The separation is now backed by the unplugged-fan session.

## Checks

A static HTML audit found no duplicate IDs and no missing same-page anchor targets.
In the local preview, the 22 local links and assets resolved, the desktop load had no
console errors, and there was no horizontal overflow at 1024 or 375 px wide. External
GitHub links were not opened.

Round details and campaign numbers were checked by a delegated read of the records.
The hardware record, gem and ADR counts, moved paths, limitations text, link counts,
and Round 4 and 5 status were checked directly. The review did not qualify the
implementations or validate every historical claim. No technical page edits were
made. Fix the factual drift before a structural rewrite, starting with the hardware
section.
