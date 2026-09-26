# Motion — Plan Review

**Reviewed:** [`01-plan.md`](01-plan.md) v1 against [`00-quality-bar.md`](00-quality-bar.md)
**Date:** 2026-09-26 · **Verdict:** approved with the changes below (adopted into the
build; the plan text stays as the v1 record).

## Findings and decisions

| # | Finding | Severity | Decision |
|---|---|---|---|
| R1 | **Invented numbers break G2.** Film Pipeline shows `$4.20`; Tamoz shows `40 % · LEASE 30 s`, which contradicts the page (firmware caps `set_pwm_lease` on `fan-01` at **60 % duty, 10 s lease**). | Blocker | Film gate reads `SPEND APPROVAL` with no amount. Tamoz uses the page's real values: intent `mode: bounded_cooling` → command `set_pwm_lease · ≤ 60 % · 10 s lease`. Every on-canvas number must be quoted from its page or marked modeled. |
| R2 | **Cognitive overload.** 5 beats × several key labels per scene means readers chase text. | High | Adopt a shared **beat rail** in `core.js`: bottom-left segments, one per beat, active segment filled, with the single active beat label beside it. Only structural node labels stay on the canvas otherwise. This is also the consistency device across all scenes. |
| R3 | **Above-the-fold cost.** A 2 : 1 stage pushes `.project-facts` below the fold on 1280×800. | Medium | Stage aspect **2.25 : 1** desktop (≈ 305 px tall in the article column), **4 : 3** below 560 px. |
| R4 | **Tamoz duplication.** The hero scene and "The loop Tamoz lives in" diagram tell the same loop. | Medium | Narrow the scene to the page's thesis: *the agent decides what, policy decides how much*. The clamp to the 60 % ceiling is the focal beat; stages 1–2 are compressed. The diagram remains the complete reference. |
| R5 | **Home diagram accuracy.** `eval harness` has no input edge today; the animation needs one. | Low | Add a faint `sqlite → eval harness` replay connector to the SVG itself (static too), so the diagram and the animation agree. Caption already says Illustrative. |
| R6 | **Pause control placement** could collide with the beat rail. | Low | Toggle bottom-right, rail bottom-left, both inside a 12 px safe inset; scene layouts keep that 36 px band clear. |
| R7 | **Start timing vs. page-transition overlay.** The overlay fades out ~350 ms after `load`; an intro that starts earlier is wasted. | Low | Clocks start on first intersection **after** `load` + 200 ms. Scrolling away pauses; returning resumes where it left off (continuity over restart). |
| R8 | **Scope risk: 8 scenes** (7 after R12). Quality could thin out toward the end. | Medium | Primitives-first build order stays; every scene must clear the bar before the next is considered done, and the ledger records each score. No scene ships below the bar; if one cannot reach it, it is cut, not shipped weak. |
| R9 | **Pointer parallax** adds motion the reader didn't ask for. | Low | 3D scenes only, ≤ 3°, active only while the pointer is over the stage, spring-damped back to rest on leave. |
| R10 | **Poster frames** for reduced motion must be the *explanatory* moment, not t = 0. | Medium | Each scene declares `poster` at its decision beat (e.g. Tamoz at the clamp, ALMS mid-sync, ScaleShop with cache in place and p95 descending). |
| R11 | **Canvas text vs. theme switch.** Token re-read must also invalidate cached glow sprites. | Low | Sprite cache is keyed by colour string; theme change clears it. |
| R12 | **Scope change from the owner:** SkillLedger may be removed from the systems list. | — | SkillLedger scene dropped; 6 project scenes + home loop remain. |

## What the review confirmed

- Canvas 2D + in-house projection over Three.js: correct for weight (G5) and for a
  shared line-work language.
- SVG enhancement for the home diagram: correct; keeps real text and today's no-JS state.
- Page-scoped `motion.css` avoids a `main.css` version bump across ~100 pages.
