# Motion — Implementation Plan v1

**Status:** Draft for review (see [`02-plan-review.md`](02-plan-review.md)) ·
**Bar:** [`00-quality-bar.md`](00-quality-bar.md)

## 1. Goal

1. Bring the home-page checkpoint-loop diagram to life so it *demonstrates* the loop
   (event → plan/act/observe → checkpoint → human gate → eval → evidence → next run).
2. Give each project page one bespoke hero scene, 2D or 3D, that shows the project's
   core mechanism in a single loop.

Constraints from the codebase: static site on GitHub Pages, no build step, vanilla JS
(IIFE style like `reveal.js`), two themes driven by CSS custom properties, strong
existing culture of fail-safe scripts and validator gates.

## 2. Architecture

```
assets/js/motion/core.js          shared runtime + primitives (Motion global)
assets/js/motion/hero-loop.js     home page: SVG enhancement (not canvas)
assets/js/motion/scene-<name>.js  one per project scene, registers with Motion
assets/css/motion.css             stage, toggle, captions (page-scoped, no main.css churn)
```

**Why canvas 2D + a tiny projection instead of WebGL/Three.js.** Three.js is ~600 KB
raw for what are line-work scenes with < 200 moving elements. A 3D camera with
perspective projection, depth sort and atmospheric fade is ~80 lines, keeps us inside
the G5 weight gate, and lets 3D scenes share drawing primitives (and therefore the
visual language) with 2D scenes.

**Why SVG for the home loop.** The diagram already exists as crisp, themed, accessible
SVG. Enhancing it in place (stroke draw-in, tokens along paths, tspans highlighting)
keeps text as real text and the no-JS state identical to today.

### core.js responsibilities

- **Mount:** find `[data-scene]` figures, create stage + canvas + pause toggle, apply
  `role="img"` and `aria-label` from `data-label`. Try/catch per scene (G10).
- **Sizing:** `ResizeObserver` → backing store `w·dpr × h·dpr` (dpr ≤ 2) → call
  `scene.layout(ctx)`; layouts receive `ctx.compact` (< 560 px) and design for it.
- **Scheduling:** one shared rAF loop; scenes tick only while intersecting and the tab
  is visible; loop stops entirely when no scene is active (G4).
- **Time:** per-scene clock; `t` in `[0, duration)`; `cycle` counter; pause freezes
  the clock. First cycle may run an intro.
- **Reduced motion:** render `scene.poster` time once; re-render on resize/theme only.
- **Theme:** read tokens from `getComputedStyle(documentElement)`; `MutationObserver`
  on `data-theme` re-reads and re-renders.
- **Fonts:** wait for `document.fonts.ready` (with timeout) before first paint.
- **Primitives (`Motion.lib`):** easing set, `seg(t,a,b)` beat helper, seeded RNG,
  `path(points)` with `at(u)` and partial `stroke(from,to)`, `node`, `chip`, `key`
  label, `token` (cached glow sprite), `arrowHead`, `sparkline`, `camera` (yaw/pitch,
  perspective `project`, depth fade), `isoBox`, `ring3d`.
- **QA hooks:** `Motion.seek(name, t)` (pauses and renders), `Motion.stats()`
  (frames, avg/max ms per scene).

## 3. Scenes — storyboards

Colour semantics per the bar: accent = agent/primary flow, success = governance /
recorded, warning = tension, error = failure only.

### 3.0 Home — checkpoint loop (SVG, 10 s loop, 1.6 s intro once)
Traces: hero caption "checkpoint loop behind Tamoz and ALMS".
- **Intro:** boxes stroke-draw in data-flow order; labels fade up after their box;
  arrows draw last.
- **B1 Ingest (0–1.4):** token leaves `events` → `runtime`.
- **B2 Step (1.4–5.2):** `plan → act → observe` words light in turn; each step drops
  a checkpoint token to `sqlite`, whose 3 slot marks fill one by one. After *act*, a
  token goes to `human gate`, the gate strokes success-colour with ✓ approve, and the
  token returns on the dashed line.
- **B3 Evaluate (5.2–7.2):** replay token `sqlite → eval harness` (new faint connector),
  then `eval → evidence log`, which appends a row.
- **B4 Feed back (7.2–8.8):** token rides the dashed curve to `events`; the
  "evidence feeds the next run" label brightens.
- **Rest (8.8–10):** slot marks and rows ease out, ready for the next run.
- Mobile strip (`.hero__signature`): one 4 s pass lighting each box, then settles.

### 3.1 ScaleShop — "evidence before architecture" (isometric 3D, 14 s)
Traces: "diagnose bottlenecks from telemetry and choose the smallest sufficient change".
Topology on an iso ground grid: clients → load balancer → 3 app nodes → primary DB.
HUD sparkline top-left: `p95 read latency`.
- **B1 Normal (0–3):** request particles flow; p95 flat.
- **B2 Degrade (3–6):** traffic ramps; particles queue in front of the DB; DB top
  warms to warning; p95 climbs, HUD key `TELEMETRY · P95 ↑`.
- **B3 Evidence (6–8):** bracket frames the DB queue: `EVIDENCE · READS SATURATE
  PRIMARY`; four option chips appear, `add read cache` is selected, the others dim.
- **B4 Smallest change (8–11):** a cache block extrudes (outBack) between apps and
  DB; most reads return from cache; queue drains; p95 descends.
- **Rest (11–14):** `MODELED OUTCOME · P95 BACK UNDER BUDGET`; masked reset.

### 3.2 Tamoz — "the agent decides what, policy decides how much" (3D, 13 s)
Traces: "never be the thing that decides how hard a motor spins"; loop stages 1–6.
- **B1 Sense (0–2.5):** readings stream along a 3D ribbon receding into depth (a
  gentle temperature wave). A window frame slides with them.
- **B2 Situate (2.5–4.5):** readings climb to warning; the window seals into a cube
  labelled `SITUATION v47`.
- **B3 Understand (4.5–6.5):** the cube flies to the Tamoz core (slowly turning
  wireframe); three candidate intents fan out; one is chosen: `INTENT · COOL`.
- **B4 Govern (6.5–8.5):** the intent's requested magnitude bar hits the policy
  envelope (success colour) and is clamped to the ceiling: `COMMAND · 40 % · LEASE 30 s`.
- **B5 Act + learn (8.5–11.5):** a 3D fan rotor spins up to the bounded speed;
  readings relax back to normal; an `EXPERIENCE` token returns to the core.
- **Rest (11.5–13).**

### 3.3 Tamoz technical — "the admission funnel" (3D, 12 s)
Traces: Figure 2 and "the agent never decides whether to wake up".
Five stacked elliptical plates in perspective (trigger, score, fresh, debounce,
admitted), narrowing downward.
- **B1 Quiet stream (0–4):** Situation versions fall in; each exits sideways at the
  plate that rejects it with a small reason tick (`ignored`, `deferred`,
  `coalesced`), counters on the side increment. Nothing reaches the bottom.
- **B2 Material change (4–7):** one warning-tinted version passes every plate; each
  plate flashes success as it clears.
- **B3 Admitted (7–10):** the bottom plate lights accent: `EPISODE ADMITTED ·
  SNAPSHOT · BUDGET · FENCE`.
- **Rest (10–12).**

### 3.4 ALMS — "learn once, share by tag" (3D orbit, 14 s)
Traces: "repeated rediscovery", "gap-safe sync with acknowledgement", "tag-based
protocols", "keep working when ALMS is offline".
Centre: ALMS core. Six agents on a tilted orbit, two tag families (accent, success).
- **B1 Rediscovery (0–2.5):** agent A hits an edge case (error ring, retry).
- **B2 Publish (2.5–4.5):** a learning glyph travels A → core; core stacks `LEARNING #128`.
- **B3 Sync + ack (4.5–7.5):** core sends it only to agents with A's tag; each returns
  an ack pip: `GAP-SAFE SYNC · ACK`.
- **B4 Reuse (7.5–9.5):** agent D meets the same edge case and passes (success ring).
- **B5 Offline (9.5–12.5):** core dims and dashes `ALMS OFFLINE`; agents keep orbiting
  and heart-beating locally: `AGENTS KEEP WORKING`. Core returns.
- **Rest (12.5–14).**

### 3.5 Film Pipeline — "typed state through gates" (2D graph + film strip, 14 s)
Traces: typed state, interrupts, versioned artifacts, spend approval, parallel QC.
Graph: idea → screenplay → shot bible → gen plan → ◇ approval → generate →
3 × QC → QC-ready. A film strip below collects artifacts as frames.
- **B1 Pre-production (0–4):** state card moves through the first three nodes; each
  appends a frame `v1` to the strip.
- **B2 Interrupt (4–6):** state pauses at the gate: `SPEND APPROVAL · $4.20`; ✓.
- **B3 Fan-out QC (6–9):** generate; three validators fill in parallel; one flags.
- **B4 Repair (9–11.5):** repair path returns to shot bible; a `v2` frame appends,
  `v1` stays greyed and linked: dependency history preserved; QC passes.
- **B5 QC-ready (11.5–14).**

### 3.6 Email Intelligence — "mail becomes queryable knowledge" (isometric, 13 s)
Traces: Maildir immutable source; SQLite (FTS5, vectors, facts/actions, events);
MCP; draft-first, allowlist sending.
- **B1 Ingest (0–3):** envelopes drop onto a locked Maildir stack.
- **B2 Enrich (3–6):** each envelope passes a prism and splits into shards (summary,
  fact, action, entity) that settle into four iso plates; events plate ticks.
- **B3 Query (6–9):** an agent's MCP beam crosses the plates; matching shards light
  and return an answer.
- **B4 Draft-first (9–11.5):** the agent writes a draft; it waits in `REVIEW` in
  front of the allowlist gate; approval lets it through.
- **Rest (11.5–13).**

### 3.7 SkillLedger — removed
Dropped from v1 at the owner's request (the project may leave the systems list).

## 4. Placement

- Project pages: `<figure class="scene" data-scene="…" data-label="…">` directly
  after the page header (before `.project-facts`), with an `Illustrative …` caption.
  Stage aspect 2 : 1 desktop, 4 : 3 below 560 px.
- ScaleShop: the scene replaces the static hero image; the image stays as the no-JS
  fallback inside the figure.
- Home: `hero-loop.js` enhances the existing `.hero__artifact` SVG and the mobile
  signature strip. Pause toggle lives in the figcaption row.
- `motion.css` + `core.js` + one scene file are added only to pages that use them.

## 5. Build order

1. `core.js` + `motion.css` + validator gate skeleton.
2. Home loop (highest traffic).
3. ALMS scene (proves the 3D camera + primitives).
4. Tamoz, Tamoz technical, ScaleShop (3D set).
5. Film Pipeline, Email Intelligence.
6. Review loop per the bar; ledger entries; final validator run.

## 6. Out of scope (v1)

Projects index cards, article pages, handbook and research diagrams, any audio,
scroll-jacking, WebGL.
