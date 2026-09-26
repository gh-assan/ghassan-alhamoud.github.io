# Motion — Quality Bar v1

**Status:** Adopted 2026-09-26, amended v1.1 (G5, see ledger) · **Owner:** design direction · **Applies to:** every
animated scene on the site (home hero loop, project-page scenes, any future motion).
**Enforced by:** `scripts/validate-site.py` gate `motion-contract` + the review protocol
in §4, logged in [`03-review-ledger.md`](03-review-ledger.md).

This site argues that agent systems should be *inspectable*. Motion has to serve that
argument. A scene earns its place only if a reader understands the system's mechanism
faster with it than without it. If it merely looks busy, it fails the bar even if it
is beautiful.

---

## 1. Director's intent

> **Motion is an explanation, not a decoration.** Every scene is a 10–14 second
> silent demo of one mechanism the page claims, told in beats a first-time viewer can
> narrate back: *what came in, what decided, what was bounded, what was recorded.*

The visual register is an **engineering instrument**: calm, precise, legible, drawn
with the same line-work vocabulary as the site's SVG diagrams (`.dg-*`). It should
feel like a well-made oscilloscope, not a screensaver.

---

## 2. Gates (all must pass; any failure blocks shipping)

| # | Gate | Pass condition | How it is checked |
|---|---|---|---|
| G1 | **Meaning** | Each scene maps 1:1 to a mechanism the page states in text. Every beat has an on-canvas key label (`.dg-k` style) naming it. | Storyboard ↔ page-text trace in the plan; review screenshot at each beat. |
| G2 | **Honesty** | Figure caption starts with **"Illustrative"**. No invented metric is shown as measured; numbers on canvas are either quoted from the page or explicitly modeled (`~`, "modeled"). | Validator: caption text. Review: numbers audit. |
| G3 | **Tokens only** | Every colour is read from CSS custom properties (`--accent`, `--success`, `--warning`, `--error`, `--text-*`, `--border`, `--bg-*`). Works in `nature` and `dark`; recolours live when `data-theme` changes. | Validator: no hex literals in scene files. Review: both themes screenshotted. |
| G4 | **Performance** | Scripted work ≤ 4 ms avg / frame (M-class laptop), no dropped-frame bursts; **zero** rAF callbacks while off-screen or tab hidden; DPR capped at 2. | `Motion.stats()` sampled over 5 s; off-screen check via stats frame counter. |
| G5 | **Weight** *(amended v1.1)* | No third-party libraries. Motion JS per page ≤ **16 KB gzip**; raw caps `core.js` ≤ 28 KB, each scene ≤ 16 KB, home loop ≤ 12 KB. Scripts are `defer` and page-scoped. | Validator: gzip + raw sizes, script tags. |
| G6 | **Layout stability** | Stage reserves its box with CSS `aspect-ratio` before JS runs: CLS contribution 0. No horizontal page scroll at 320 px. | Validator: stage CSS present. Review at 360 px. |
| G7 | **Reduced motion** | `prefers-reduced-motion: reduce` ⇒ a composed static **poster frame** (the most explanatory moment), no autoplay, no intro. | Emulated reduced-motion screenshot. |
| G8 | **Control** | Any motion running > 5 s has a visible pause/play control: keyboard reachable, ≥ 44×44 hit area, `aria-pressed`, visible focus ring (WCAG 2.2.2). | Validator: toggle markup emitted by core. Review: tab to it. |
| G9 | **Access** | Canvas stage has `role="img"` and an `aria-label` that states the mechanism in one sentence. Nothing flashes > 3×/s (WCAG 2.3.1). | Validator: `data-label` present. Review. |
| G10 | **Resilience** | No-JS: no empty boxes. A scene that throws is contained (try/catch), the page keeps working, the figure falls back to its poster/hidden state. No console errors. | Console read on every page; forced-error test. |

---

## 3. Craft rules (scored in review)

**Choreography**
- A loop is a story of 3–5 **beats** (setup → tension → decision → resolution → rest).
  Each beat 1.5–3.5 s. The rest beat is ≥ 1 s so the eye can catch up.
- **One focal event at a time.** During a focal beat, ambient elements drop to
  ≤ 45 % emphasis. At most two elements glow simultaneously.
- Cause precedes effect by ≥ 120 ms; a receiver reacts only after the token arrives.
- Loops are seamless: either state at t = end equals t = 0, or the reset happens inside
  a masked dip (≤ 600 ms) during the rest beat. Never a hard pop.

**Motion quality**
- Easing: `outCubic` for arrivals, `inOutCubic` for travel, `outBack` (≤ 8 % overshoot)
  only for emphasis. Linear motion is reserved for constant streams.
- Nothing appears or disappears in under 180 ms; nothing lingers in transition > 900 ms.
- Token speed 80–180 CSS px/s; nothing moves faster than 400 px/s.
- Ambient camera drift ≤ ±8° yaw over ≥ 18 s; pointer parallax ≤ ±4°, spring-damped,
  and never while the reader is idle-reading (only on pointer movement over the stage).

**Drawing**
- Line weights: scaffolding 1 px, structure 1.25 px, active path 1.75 px (CSS px).
- Node radius 6–8 px, identical to `.dg-box`. Labels: Inter, key labels 600/10 px
  uppercase with 0.08 em tracking; titles 600/12–13 px. Never below 10 px CSS.
- Labels never overlap shapes or each other at any width ≥ 320 px; compact layouts are
  designed, not scaled down.
- Crisp at DPR 1, 2, 3 (canvas backing store scaled to DPR, capped at 2; lines on
  half-pixel where axis-aligned).
- Depth in 3D scenes is conveyed by perspective + atmospheric fade (alpha falls with
  depth), never by heavy shadows or gradients.

**Consistency**
- All scenes share one primitive set from `core.js` (node, token, chip, key label,
  path, HUD sparkline, 3D camera). A scene may not draw its own variant of a shared
  primitive.
- Colour semantics are fixed site-wide: accent = the agent/primary flow; success
  (ocean) = governance, verified, recorded; warning = tension, degradation; error =
  failure only; muted = scaffolding.

---

## 4. Review protocol (the loop)

For each scene, every iteration:

1. **Capture** poster + 3 beat screenshots (via `Motion.seek(name, t)`) at desktop
   (≥ 1100 px) in `nature`; poster at 375 px; one beat in `dark`; reduced-motion poster.
2. **Measure** `Motion.stats()` over 5 s on-screen, then scrolled off-screen
   (frames must stop), and read the console.
3. **Score** 1–5 on six axes:

   | Axis | 5 means |
   |---|---|
   | Clarity | A first-time viewer can narrate the mechanism after one loop. |
   | Choreography | Beats read in order; one focal point; rest beat breathes. |
   | Craft | Easing, spacing, alignment and type are indistinguishable from a hand-tuned SVG. |
   | Consistency | Looks like the same instrument as every other scene and the `.dg` diagrams. |
   | Performance | Gate G4 with margin (≤ 2 ms avg). |
   | Access | G7–G9 pass without caveats. |

4. **Bar:** all gates pass **and** every axis ≥ 4 **and** the scene's mean ≥ 4.3.
   Anything below is fixed and re-reviewed. Iterations and scores are logged in the
   review ledger with the concrete defect found and the fix applied.
