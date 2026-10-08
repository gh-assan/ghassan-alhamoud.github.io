# Motion — Review Ledger

Protocol: [`00-quality-bar.md`](00-quality-bar.md) §4. Bar = all gates pass, every
axis ≥ 4, scene mean ≥ 4.3. Scores are 1–5 (Clarity · Choreography · Craft ·
Consistency · Performance · Access).

## Final scores (iteration 4, 2026-09-27)

| Scene | Page | Cla | Cho | Cra | Con | Perf | Acc | Mean | Bar |
|---|---|---|---|---|---|---|---|---|---|
| Checkpoint loop (SVG) | `/` | 5 | 4 | 5 | 5 | 5 | 5 | 4.83 | ✅ |
| Learn once, share by tag | `alms.html` | 5 | 4 | 4 | 5 | 5 | 5 | 4.67 | ✅ |
| Decides what / how much | `tamoz.html` | 5 | 4 | 4 | 5 | 5 | 5 | 4.67 | ✅ |
| Admission funnel | `tamoz-technical.html` | 5 | 4 | 4 | 5 | 5 | 5 | 4.67 | ✅ |
| Evidence before architecture | `scalability-lab.html` | 4 | 4 | 4 | 5 | 5 | 5 | 4.50 | ✅ |
| Typed state through gates | `film-pipeline-langgraph.html` | 5 | 5 | 4 | 5 | 5 | 5 | 4.83 | ✅ |
| Mail becomes knowledge | `email-intelligence-platform.html` | 4 | 4 | 4 | 5 | 5 | 5 | 4.50 | ✅ |

**Measured (Chrome, M-class laptop, 120 Hz):** real rAF playback holds 120 fps;
scripted work 0.46–0.61 ms avg, ≤ 2.3 ms max per frame (G4 ≤ 4 ms). Off-screen and
hidden-tab: 0 frames. Motion JS per page 11.3–13.1 KB gzip (G5 ≤ 16 KB).

**Gate evidence:** `validate-site.py` gate `motion-contract` passes (negative-tested:
removing "Illustrative" from a caption fails it). Reduced motion verified through a
`matchMedia` stub harness: poster frame rendered (Tamoz at t = 8.1, the clamp), 0 frames
ticking, no toggle. Error containment: a scene forced to throw is hidden, logs one
warning, and the page below keeps rendering. Pause controls: focusable, 44×44,
`aria-pressed` toggles. Dark theme: every scene recolours live on `data-theme` change.

## Iteration log

### Iteration 1 — first render of each scene
| Scene | Defects found | Fix |
|---|---|---|
| ALMS | Agent C sat directly behind the core and under its chip; ambient arcs around agents read as noise; heartbeats floated without structure. | Re-seated agents at 60° offsets (no agent behind the core); removed arcs; added registry spokes that heartbeats travel along and stall on while offline. |
| ALMS (compact) | Chip hid agents C/D; ring too small; vendor label clipped. | Designed compact legend (dot + key), chip placed above the back agents, vendor moved in, labels clamped. |
| Home loop | Bolding the active word re-centred the line and made neighbours jitter. | Colour-only emphasis. Draw-in intro **dropped**: the diagram is above the fold and hiding/redrawing it flashes content. |
| Tamoz | Left edge clipped; content packed in the top half; policy plane seen edge-on; ceiling line floated unattached; code identifiers uppercased; experience arc left the frame. | Fit with label margin + vertical centring; yaw −0.5; gauge redesigned as a glass tube with a red 60 % slice and a fill that never crosses it; `code` chip style (mono, case kept) added to core; arc lowered. |
| Tamoz | Loop seam: rotor angle popped on wrap. | Rotor speed snapped so a loop turns a whole number of thirds. |
| Funnel | Top label clipped; two warm plates flashing at once (two focal points); admitted chip drawn below the canvas. | Top padding; quiet stream slowed to 5 versions with softer reject flashes; chip moved into the bottom stage's empty exit slot. |
| ScaleShop | HUD collided with the client boxes; evidence chip ran off the stage. | Flatter yaw, HUD corner reserved; `chip()` now always clamps inside the stage (core guarantee). |
| Film | Final chip covered a validator; section label sat where the v1→v2 history link lands. | Chip below `qc-ready`; label moved left. |
| Email | Diagonal composition wasted two corners; layer labels collided with MCP chip; "front" labels placed behind objects. | Flatter camera, agent spaced right. Root cause of the label bug: +z is *away* from the viewer in `camera()` — fixed in Email and Tamoz. Key labels now clamp inside the stage in core. |

### Iteration 2 — compact (375 px) pass
| Scene | Result | Fix |
|---|---|---|
| Tamoz | **Failed**: horizontal flow shrank to a strip, chips overlapped. | Compact camera (yaw −0.95, pitch 0.46) runs the flow diagonally through depth; chips dock to fixed top slots; threshold label dropped, ceiling shortened to "60 %". |
| ScaleShop | **Failed**: page overflowed to 590 px. Root cause pre-existing: the `<pre>` incident block widened the grid item (`min-width: auto`). Also option chips covered the sparkline. | `main.css`: `.article-layout > article { min-width: 0 }`; compact chips in the bottom band; cache label under the block. |
| Film | **Failed**: second row collided with the film strip. | Compact geometry (rows at 34/104, tighter validators, strip at h − 88), approval chip below the gate, wider frames. |
| Email | **Failed**: labels piled up at tiny scale. | Compact camera (yaw −0.78), shorter labels, MCP chip and allowlist label relocated. |
| ALMS, Funnel | Passed. | — |

### Iteration 3 — gates, themes, performance, resilience
All gates pass; scores above. No blocking defects.

### Iteration 4 — owner feedback: "a lot of empty space on desktop"
| Finding | Fix |
|---|---|
| ALMS, Email, Film and ScaleShop pages kept an empty 280 px sidebar column, so content hugged the left ~55 % of a desktop viewport and the new hero made it obvious. | Those project pages (and SkillLedger, for consistency) now use `article-layout--single`, like both Tamoz pages; the scene spans the facts row (≤ 1000 px). |
| Inside the stages, content filled only ~55–60 % of the frame: hand-tuned layouts reserved more margin than the drawings used. | New `Motion.lib.fit()` frames each 3D scene from its real geometry (extent points incl. labels) into the stage minus fixed insets. ALMS, Tamoz and Email moved to it. |
| One stage ratio (2.25 : 1) suited no scene exactly; wide, short compositions left bands empty. | Per-scene `--aspect` set inline on the stage (CLS-safe, reserved before JS): ALMS 2.4, Tamoz 2.45, Funnel 2.25, ScaleShop 2.4, Film 2.5, Email 2.7. Phones keep 4 : 3. |
| Refit regressions on phones: Email's draft chip over the rail, allowlist label under the toggle. | Draft chip docks to the top slot on compact; compact insets widened. |

## Iteration 5 — branch review (2026-09-27)

| Finding | Root cause | Fix and evidence |
|---|---|---|
| Tamoz and ScaleShop were illegible at 320–375 px, despite fitting inside the stage. | Their desktop world coordinates were scaled to phone width. Increasing stage height could not recover the lost horizontal resolution. | Added compact two-row routing diagrams that preserve each scene's decision sequence. Browser screenshots at 320 and 375 px show readable nodes and labels; geometry tests exercise 320/375 px and four beats. |
| The active beat text ran into the pause button on phones. | The rail appended text after five segments on one line, leaving too little width for its longest labels. | Compact rail places the beat label above its segments. Browser check at 320 px shows clearance. |
| The homepage signature strip could continue its one-shot rAF loop after leaving view or entering a hidden tab. | Intersection was checked only when starting; each frame scheduled the next unconditionally. | The loop now tracks visibility, cancels pending frames, and resumes elapsed time on return. The shared canvas scheduler and full homepage loop also cancel pending frames when inactive. |
| Film Pipeline spent too much height on an empty band above and below its graph. | The desktop stage ratio was taller than this horizontal diagram needed. | Desktop aspect changed from 2.5 to 2.9; the repair path, graph, and artifact strip remain inside the stage. Phone ratio remains 4:3. |

**Verification:** six scene pages checked at 320 px: no horizontal overflow or console warnings/errors, and every pause control was present. Pause/play state was exercised on Email Intelligence. `npm run test:motion` and `python3 scripts/validate-site.py` pass. This round did not repeat the original performance benchmark or reduced-motion emulation; the previous iteration's measurements remain the evidence for those gates.

## Iteration 6 — Handbook Chapter 22 scenes (2026-10-02)

Scores are the author's review against the bar. Nobody has done an independent pass yet.

| Scene | Page | Cla | Cho | Cra | Con | Perf | Acc | Mean | Bar |
|---|---|---|---|---|---|---|---|---|---|
| Three clocks | `handbook/chapter-22-…` | 5 | 4 | 4 | 5 | 5 | 4 | 4.50 | ✅ |
| Cancellation races commit | `handbook/chapter-22-…` | 5 | 4 | 4 | 5 | 5 | 4 | 4.50 | ✅ |

| Finding | Fix |
|---|---|
| Desktop: the v1-result marker sat on the task bar and read as part of it. | Hollow mark below the bar with its caption ("kept, not spoken"). |
| Desktop: the poster frame (barge-in) left the completed bar unlabelled. | Bar labels fall back to shorter text when narrow; poster moved to the rest beat, where every identity change is visible. |
| Chips uppercased identifiers (`G4 → G5`), the iteration-1 defect again. | Chips name the change ("new generation"); the mono readouts beside each lane carry the identifiers in their real case. |
| Cancel scene: ".205 sound stops" ran into the reply panel; the undo chip overflowed it; "commit came first" crowded the rail. | Label right-aligned before the stop mark; undo became a panel row; lanes raised. |
| Phones: at 4:3 the cancel scene's waveform, lane labels and reply band collided; at 320 px the clocks scene's label rows touched its captions. | `motion.css` gains an optional `--aspect-compact` (still reserved by CSS before JS, so CLS stays 0). Both scenes use 1.15. On phones the user's speech overlays the voice lane, which is a full-duplex channel. |
| G5: the two scenes as separate files made the page 16.97 KB gzip. The gate missed it because it checked core + one scene per figure. | Scenes merged into `scene-audio.js` with shared timeline helpers, which brings the page to 15.6 KB gzip. The gate now sums core and every scene file a page loads. The raw cap of 16 KB applies per registered scene. Negative test: padding the file fails the gate at 16.4 KB. |

**Verification:** the beats were screenshotted at 720 px desktop and at 375 px and 320 px, plus one desktop beat
in `dark`, which recoloured live. No horizontal overflow at 320 px, and no console messages.
`npm run test:motion` covers both scenes: labels stay on the stage and clear the rail at
320/375/720 px across the loop, identities change only at their own events, the receipt
label survives barge-in and reconnect, and "It already completed." appears only after
the commit is shown. The browser pane was hidden, so live rAF fps was not
re-measured. Synchronous draw cost over 600 frames per scene: 0.17 / 0.13 ms
average and ≤ 2.8 ms max (G4 ≤ 4 ms). With the document hidden, 0 frames ran.
Reduced-motion emulation was not re-run; the scenes use core's unchanged poster path.

## Iteration 7 — Chapter 22 opening scene (2026-10-02)

| Scene | Page | Cla | Cho | Cra | Con | Perf | Acc | Mean | Bar |
|---|---|---|---|---|---|---|---|---|---|
| The plausible lie (split view) | `handbook/chapter-22-…` | 5 | 4 | 4 | 5 | 5 | 4 | 4.50 | ✅ |

These scores are the author's own review.

| Finding | Fix |
|---|---|
| The panel title collided with the verdict ("…ONE CONVERSATION IDTHE PLAUSIBLE LIE"). | On desktop the verdict sits at the panel foot. Phones use short titles ("collapsed · one id") with the verdict to the right. |
| "v1 result held · restart only proposed" ran past the separated panel's border. | Split into two lines: "v1 result held" and "its proposed restart: not approved, not run". |
| The operator strip went blank between lines, so the poster frame lost its cause. | The latest line stays, dimmed, until the next one starts. |
| A muted-speaker cross appeared after lines that ended normally. | The cross is drawn only when playback is cut. |
| At 320 px the row labels left too little width for the spoken line. | Phones drop the row labels; the speaker and aerator glyphs carry them. |
| The caption said "Left/Right", which is wrong on phones, where the panels stack. | The caption now names the designs, "Collapsed" and "Separated". |
| The test's text-width estimate (0.62 em) was 24 % above Inter's measured 0.50 em, which gave a false overflow failure. | Calibrated to 0.56 em, still 12 % conservative, and the measurement is recorded in the test. |

**Verification:** desktop beats at 720 px; posters at 375 px and 320 px with no
horizontal overflow; dark theme recolours live; no console messages. Draw cost is 0.09 ms
average over 600 frames. One frame took 4.0 ms (G4 is an average limit). Page weight is 17.9 KB
gzip, within the v1.2 limit of 20 KB. Tests now cover the three scenes, including
that only the collapsed design restarts the aerator, only after its own phrase, and
that the separated design shows "no action admitted" at the end.

## Bar amendments

- **G5 v1.1 (weight).** The v1 raw cap (`core.js` ≤ 16 KB) was mis-calibrated: the
  consistency rule deliberately moved every shared primitive into core (26 KB raw,
  8.4 KB gzip). The gate now budgets what users download — ≤ 16 KB gzip of motion JS
  per page — with raw caps kept as a creep guard. Owner confirmed the size is fine.

- **G5 v1.2 (weight, 2026-10-02).** The per-page check now sums core and every scene
  file the page loads, which closes an enforcement gap: it used to check core + one scene.
  A handbook chapter teaching with two or more scenes may use ≤ 20 KB gzip, and other
  pages keep ≤ 16 KB. The raw 16 KB cap applies per registered scene. Owner chose
  raising the limit over lazy-loading or dropping a scene.

## Known limits (not blocking)

- ScaleShop's chosen option (read cache) is illustrative, not the lab's reference
  answer; the caption says so.
- Scenes pause when scrolled away and resume where they left off (by design, R7).

## Iteration 8 — branch-only Chrome review and video export (2026-10-02)

Scope: only the three Chapter 22 animations introduced on
`add-ai-handbook-chapter22`. The homepage and existing project scenes were not changed.
This is the author's browser and code review, not an independent review.

| Finding | Root cause | Correction |
|---|---|---|
| The collapsed design restarted the aerator while the caption was still spelling “restart”. | The speech reveal, causal token and actuator had independent timing constants. The earlier test asserted the actuator's existing start time rather than the completed phrase. | The phrase finishes at 7.7 s; the causal token then travels until restart at 8.1 s. Playback stops at 8.15 s. Only the collapsed design acts; the separated design retains the old result and admits no action. |
| The two identifiers overprinted during revision, generation and owner transitions. | Six pixels of vertical separation was less than the 10.5 px font height, with both values visible during the crossfade. | Each value fades for 200 ms, with a 50 ms gap before the next fades in. The identities still change only at their own events. |
| A narrow handbook column on a desktop viewport stacked the incident panels into a box sized for the wide layout. | CSS selected the aspect by viewport; the drawing selected geometry by stage width. The existing tests covered phones and 720 px stages, missing intermediate columns. | Audio scenes now choose compact geometry below a 680 px stage. Container queries reserve matching heights, with less vertical padding in 400–679 px columns. The change is limited to Chapter 22 audio scenes. |
| Desktop “sound stops” extended beyond its incident panel. | The annotation was appended after a long spoken phrase without a panel-width budget. | Desktop annotations occupy their own line below the phrase. Compact annotations retain the short inline form. |
| The three-clock beat announced barge-in while the current result was still being presented. | Beat and chip timings anticipated the actual interruption by over a second. | Both now start at the 7.8 s interruption. |

| Scene | Clarity | Choreography | Craft | Consistency | Performance | Access | Mean |
|---|---|---|---|---|---|---|---|
| Incident comparison | 4 | 4 | 4 | 5 | 5 | 4 | 4.33 |
| Three clocks | 4 | 4 | 4 | 5 | 5 | 4 | 4.33 |
| Cancellation races commit | 5 | 4 | 4 | 5 | 5 | 4 | 4.50 |

Verification used Chrome with the actual chapter embedded in a temporary local
review harness. It exercised posters and explanatory beats, both themes, 320/375 px
pages, a 900 px page with a narrow handbook column, and a 1440 px page. An actual
canvas text-measurement sweep at 0.1 s intervals found no text intersections or
stage overflow at those four page widths after the fixes. Unit geometry tests also
cover 400, 508, 560, 600, 679, 679.5 and 680 px stages, plus the original phone and desktop cases.

Five-second live measurements: incident 576 frames, 1.349 ms average / 9.4 ms max;
clocks 601 frames, 1.209 ms average / 7.1 ms max; cancellation 601 frames,
1.107 ms average / 7.0 ms max. After scrolling out of view and allowing the observer
to settle, counters stayed unchanged for a further second (577 / 603 / 602).
Pause/play was exercised by these measurements. No Chrome warnings or errors were
reported. The reduced-motion JavaScript path was forced before loading the chapter:
all three scenes mounted at their composed poster time with no playback controls.
This checks the runtime branch; it is not an OS-level preference emulation.

`npm run test:motion`: 13 passing tests. `npm run validate`: all 35 gates pass.
The new checks cover disjoint identifier visibility and incident panel annotations;
the semantic test now forbids restart before the complete spoken phrase.

Videos are rendered from the revised scenes in Chrome using explicit 30 fps frame
steps, then encoded as 1920×1080 H.264 MP4, yuv420p, with fast-start metadata.
Each keeps the illustrative label, a title and a 2.5 s final-state hold; it omits
the website's loop-reset fade. They are silent educational illustrations, not
recorded agent runs. Delivery target: `~/Movies/personal-website/chapter-22-2026-10-02`.

All three MP4s passed a full decode check and completed playback in Chrome without
media errors (16.8 / 15.8 / 14.7 s). The three videos, poster PNGs, local preview
gallery, README and provenance manifest were saved to the requested destination;
all nine copied files matched their source SHA-256 hashes.

## Iteration 9 — IoT handbook integration (2026-10-08)

Scope: IOT-001, its four responsive diagrams and three existing source-package
animations. This is a self-review using the installed Chrome 154.0.8037.98;
it does not constitute independent technical acceptance or a physical lab run.

| Finding | Root cause | Correction |
|---|---|---|
| Static posters appeared instead of working animations. | The builder matched one exact figure attribute order and class value. IoT figures have an ID and an additional class. | Discover scene figures regardless of attribute order and extra classes. Load core before the single scene file. A regression test reproduces the missed markup; the release gate now recognizes it too. |
| Wide SVGs were selected in narrow desktop reading columns. | The source package used a viewport media query; the website adds a sidebar. | Observe each diagram's column width and select its compact composition below 680 px. Reserve matching compact scene height with container queries. |
| A firmware field widened the 320 px page. | Inline code contained a long JSON field with no break opportunity. | Allow inline code to wrap; keep source code blocks copyable. |
| Compact scene labels fell to 9 px on the narrowest phone. | The source preview used 12 px page margins; the website uses 24 px. Later motion CSS also overrode the initial correction. | Give IoT figures 12 px outer margins below 360 px with a sufficiently specific selector. Final canvas label floor is 9.93 px including border-box rounding, nominally 10 px. |
| The chapter hero said there were no prerequisites. | No prerequisite chapters was treated as no prerequisite knowledge. | Catalog supports prerequisite text; this chapter states comfort with Go and no required electronics experience. |

| Scene | Clarity | Choreography | Craft | Consistency | Performance | Access | Mean |
|---|---|---|---|---|---|---|---|
| Same command, three benches | 5 | 4 | 4 | 5 | 5 | 4 | 4.50 |
| Fan incident | 5 | 4 | 4 | 5 | 5 | 4 | 4.50 |
| Test discrimination | 5 | 4 | 4 | 5 | 5 | 4 | 4.50 |

The bench keeps command/readback invariant while wiring and observation change.
The fan replay distinguishes recorded operator observation from software state.
The diagnostic scene removes a candidate only when a performed test discriminates
against it. All start paused; captions identify illustrative timing and evidence
limits. These longer teaching sequences retain the source's paced stages.

`tests/iot-visuals.cjs` verifies 430 states at 320, 375, 400, 508, 560, 600,
679, 680, 720 and 1200 px; eight SVGs; label overlap/clipping; compact selection;
keyboard play/pause; scenario selection; live theme changes; reduced motion;
no-JavaScript and renderer-error fallbacks; off-screen and hidden-tab idling.
Review captures include desktop opening beats and poster states, mobile posters,
dark posters and reduced-motion posters in `/private/tmp/iot-handbook-qa/`.
These are temporary QA artifacts; regenerate using `IOT_QA_DIR`.

Five-second live samples: bench 0.738 ms average / 1.5 ms maximum; fan
0.649 / 1.5 ms; diagnostic 0.524 / 1.2 ms. All are below the 2 ms review target.
Chrome reported no unexpected warnings or errors. The visible Chrome tab was
also used to inspect the collection, chapter shell and LED playback.

Final verification: all 35 website gates, 64 Python publication tests, 13 existing
motion tests, Go control/wire tests and 15 lab-analysis tests pass. The first
chapter remains a draft with physical lab and independent review pending.
