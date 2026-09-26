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

## Bar amendments

- **G5 v1.1 (weight).** The v1 raw cap (`core.js` ≤ 16 KB) was mis-calibrated: the
  consistency rule deliberately moved every shared primitive into core (26 KB raw,
  8.4 KB gzip). The gate now budgets what users download — ≤ 16 KB gzip of motion JS
  per page — with raw caps kept as a creep guard. Owner confirmed the size is fine.

## Known limits (not blocking)

- ScaleShop's chosen option (read cache) is illustrative, not the lab's reference
  answer; the caption says so.
- Scenes pause when scrolled away and resume where they left off (by design, R7).
