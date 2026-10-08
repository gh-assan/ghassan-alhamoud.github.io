# Chapter package and reusable record formats

This is a process specification, not a chapter template instantiated as a draft. Create a package only when the author commissions a chapter.

## Paths and states

A commissioned chapter begins at `articles/iot-engineering-handbook/chapters/IOT-NNN-<slug>/`, where `NNN` is the next unused number in commissioning order, not its reading position in PLAN.md. Record the reading position in `status.md`. Preserve stable IDs and keep its state in `status.md`: brief → researching → lab-pending → drafting → reviewing → revision → ready. `blocked` and `review-pending` can occur at any stage and carry the unmet gate, missing input and next action. Publication is a separate state entered only after authorized publication is verified.

Minimum artifacts when ready:

- `status.md`: question, version, evidence cutoff, state, gate verdicts, dependencies and limits.
- `research-plan.md`: questions, claim/evidence matrix, outcomes, exclusions, primary-source routes and lab feasibility.
- `sources.md` and `claims.md`: source and material-claim records.
- `chapter.md`: final teaching text with actual evidence boundaries.
- `lab.md`: equipment, wiring, versions, baseline/fault/recovery protocol and observation oracle.
- `evidence/`: raw capture files, run manifest, operator observations and derived-output provenance. Keep private identifiers/credentials out of reusable packages; record redactions.
- `examples/`: firmware/scripts or executable teaching model and meaningful tests when the chapter supplies runnable code; explicitly label pseudocode separately.
- `reviews/`: revision-bound findings, responses, rerun results and final verdict.
- `cross-links.md`: existing, verified dependencies and glossary targets only. Deferred links and future glossary work belong in the collection's single [future-actions file](FUTURE-ACTIONS.md).

When a teaching visual is selected, include a visual brief/storyboard in research-plan.md and editable source, static poster/text alternative, and relevant tests under `visuals/`; record rendered checks in reviews/. See [visual design](VISUALS.md). Create these assets only for commissioned chapters.

Add charts/diagrams where they teach; defer decorative hero imagery and HTML to an explicitly commissioned publication step. No empty directories are needed at planning time. Ready does not mean published. Do not reuse `HDBK-*` IDs or assume `/handbook/` is the IoT website route.

## Teaching structure

Adapt headings to the question while retaining these functions:

1. Title, version, evidence date, reading time, separate lab time, prerequisites and outcomes.
2. “If You Only Read One Section”: mental model, decision and guarantee boundary.
3. Concrete opening problem, labeled constructed or observed.
4. Concept and mechanism: simple model first, then state/causal architecture and relevant physical reasoning.
5. Design alternatives, constraints and a worked example with intermediate reasoning.
6. Baseline experiment: predicted versus observed results, units and uncertainty.
7. Failure and recovery experiment: software belief versus physical observation; causal evidence and unknowns.
8. Design principles and applicable Tamoz/Agentic Stream integration boundary.
9. Transfer exercise plus worked answer/reasoning; misconception FAQ where helpful.
10. Summary, further questions, related written chapters when any exist, glossary, source links and revision history. Omit related-chapter navigation when there are no written targets; do not send readers to the proposed curriculum as a substitute.

The experiment can appear earlier when it motivates the mechanism. A long chapter should have an obvious core reading path and optional deep dives. Self-contained means readers can follow the required concepts; it does not mean duplicating every prerequisite chapter. Reading-time estimates should state their method; code review and lab time are separate estimates.

## Reusable record fields

Research brief: chapter ID; central question; audience; prerequisites; learning outcomes; excluded scope; misconceptions; decisions; source routes; material-claim matrix; predicted lab result; falsifier; hardware feasibility; effort; risks/dependencies; visual teaching opportunities and selected storyboard; author commissioning status.

Source record: source ID; title/issuer; exact URL/path; source role; edition/release; publication/revision date or unknown; access date; relevant section; status/errata checked; supported claim IDs; caveats.

Claim record: claim ID; exact claim and chapter location; kind (normative, empirical, implementation, design recommendation); source/run IDs; reasoning boundary; status; scope/conditions; last verified; reviewer verdict. Recommendations cite their supporting constraints and mark the judgment as the author's inference.

Lab run manifest: run ID; UTC capture time plus relevant timezone; operator; physical/simulated/captured-evidence mode; equipment/part revisions; firmware/code/config hashes; wiring; environment; limits; calibration/reference uncertainty; hypothesis; threshold; baseline/fault/recovery steps; repetitions; artifact paths/hashes; observed values; unknowns; safe reset; conclusions and limits. A hash proves artifact identity, not physical truth.

Review finding: finding ID; lens; reviewer provenance; revision hash; coverage; severity; location; source/evidence; consequence; proposed correction; disposition and reason; actual fix; affected test/lab/source rerun; recheck verdict. Final record lists unresolved items and exact accepted revision.

Backlog item: question; originating experiment/reader issue; gap in current chapter; prerequisites; physical evidence route; reader benefit; estimated effort; priority decision. Chapter change record: previous/new version; reason; claims/labs changed; dependent links; checks and review required/performed.
