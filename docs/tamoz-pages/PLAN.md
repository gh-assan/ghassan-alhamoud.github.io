# Tamoz project and pilot pages

Date: 2026-11-02

## Problem

One page currently explains the software, sells a pilot, discusses instrumentation,
and reports technical evidence. Repeated changes to the audience have displaced
the project explanation. Visitors cannot easily distinguish the software from
the work the founding team proposes to do with them.

## Page responsibilities

- `/tamoz/`: industrial pilot landing page. Describe the customer problem, what
  Tamoz contributes, the proposed engagement, what the customer receives, sensor
  installation when needed, and the founding team's involvement. Keep the
  audience and hypothetical example together so future experiments are easy to
  edit. Use a short evidence summary linking to the project; do not duplicate
  the pump report. Keep the original animation near the top, labeled illustrative.
- `/projects/tamoz.html`: durable project overview. Explain stream monitoring,
  bounded reasoning, recommendations and governed actions, outcome verification,
  learned rules, and the roles of Tamoz, Agentic Stream, and Streams Simulator.
  Recover the useful animation and system diagram from main. Include the recorded
  pump clip and distinguish real-model simulation, scripted simulator rounds,
  the separate fan bench, and proposed industrial benefits. Link to the pilot.
- Keep the technical deep dive and use-case detail as supporting pages.

## Constraints

- Preserve the user's current uncommitted work by carrying the business copy
  into the landing page before rewriting the project overview.
- Use the existing static HTML, shared shell, CSS, motion controls, and video assets.
  No framework, duplicated project template system, forms, analytics, or tracking.
- Keep claims grounded in existing evidence. Do not invent customer savings,
  installations, co-founder identities, credentials, timelines, prices, or users.
- Keep the decision to remove open-source promotion. Do not change repository
  visibility or software licensing. Do not restore repository CTAs in these pages.
- Plain copy, no em dashes in authored content. Keep the shared site shell.
- Keep existing project and technical URLs and the `#evidence` inbound anchor.
- No automatic commit, push, or publication for this request.

## Implementation order

1. Save this plan before editing the pages.
2. Create `/tamoz/index.html` from the business copy, with distinct metadata and
   a concise evidence link instead of the full technical trial.
3. Rewrite the project overview around the system, using verified existing
   material and main's original diagram. Preserve the animation and pump clip.
4. Add reciprocal navigation, a pilot link from supporting pages, sitemap and
   discovery descriptions. Remove stale Tamoz open-source promotion on project
   discovery surfaces touched by this change.
5. Replace the overview-only regression test with checks for distinct canonical
   URLs, reciprocal links, pilot/evidence boundaries, and local route/asset links.
6. Run site and project validation, focused Python tests, motion tests, and diff
   checks. Inspect both pages in Chrome at desktop and mobile widths; test the
   pilot link, project link, animation control, mobile menu, and diagram scrolling.

## Acceptance

A customer can understand the proposed pilot and reach the founding team from
`/tamoz/`. A reader can explain what Tamoz does and assess the evidence from the
project page. Each page has its own title, description, canonical URL, and purpose.
Neither presents simulated results as industrial savings. Local checks and browser
results will be recorded in this file after implementation.

## Completed and verified

- Created the business page at `tamoz/index.html`; the audience and example sit
  together in a labeled section for future edits. Existing business copy was
  carried forward before rewriting the overview.
- Rewrote the project overview with the original main-branch system diagram,
  existing animation, recorded pump clip, decision sequence, learning loop,
  and distinct evidence accounts. Kept `#evidence` and supporting-page links.
- Added reciprocal links, supporting-page pilot links, distinct metadata,
  a sitemap entry, and discovery descriptions. Added `tamoz` to the site
  validator's published directories.
- Validation: all 35 site gates, 6-project catalog validation, 80 Python tests,
  13 motion tests, and `git diff --check` passed.
- Chrome: inspected the desktop openings and 390 x 844 mobile layouts. Both
  mobile pages had page width 390 with no document overflow. Confirmed the pilot
  fragment, project-to-pilot and pilot-to-project routes, animation pause,
  mobile menu open/close, and keyboard horizontal scrolling in both diagrams.
- Desktop and mobile preview screenshots were saved under `/private/tmp/`.
- No commit, push, or publication. The local QA server was stopped after review.
