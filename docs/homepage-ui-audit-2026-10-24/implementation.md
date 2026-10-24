# Home page implementation and Chrome verification

Implemented on 24 October 2026 on `codex/homepage-ui-audit-2026-10-24`. Each focused change was committed separately. The original checkout and its unpublished handbook changes remain separate from this worktree. No push or deployment was performed.

## Delivered

- Shorter hero, one primary action, and a readable static agent-architecture diagram. Phone layouts use a compact text model after the actions.
- One authentic ScaleShop workshop preview, captured from the live public interface. Its caption identifies a simulated environment and Level 5. The image is about 91KB. Small Tamoz and ALMS diagrams are explicitly illustrative and retain accessible text alternatives.
- Paired AI and IoT collection cards, with published counts checked against each collection's registry. The complete chapter lists remain on the collection indexes.
- Open, concise operating principles; a lead article and two supporting notes with registry-backed dates and reading times.
- A smaller portrait, concise biography and selected impacts, and a native disclosure containing the full career timeline, role explanation, and further context.
- Compact, static metrics with reader-facing captions and direct index links; a visible email address alongside the email action.
- Handbooks and Contact in shared navigation; both collections and Research in footers. Published shells and the handbook/research generators were updated together.
- A skip link, background isolation and keyboard containment for the mobile menu, reversible scroll locking, focus recovery across breakpoints, and a no-JavaScript home navigation stylesheet.
- Route activity now describes the actual destination or parent collection rather than activating route links as unrelated home previews pass by.
- Root-relative home anchors preserve native scrolling. Page transitions recover on back/forward restoration and use native navigation for reduced motion.

The static home content remains in `index.html`. Page-specific composition lives in `assets/css/homepage.css`, loaded after the shared stylesheet. Existing content validators continue to guard publication scope, identity, employment history, and links.

## Measured layout results

Measurements were taken in actual Chrome against the local implementation at `http://127.0.0.1:7104/`, with the career disclosure closed. These are layout observations, not production performance or usability-study results.

| Viewport | Page height | Document scroll width | Main content outside viewport | Primary actions begin at |
| --- | ---: | ---: | --- | ---: |
| 320 × 568 | 10,197px | 320px | None measured | 495px |
| 390 × 844 | 9,131px | 390px | None measured | 431px |
| 768 × 1024 | 7,554px | 768px | None measured | 348px |
| 999 × 900 | 7,116px | 999px | None measured | 366px |
| 1000 × 900 | 6,817px | 1000px | None measured | 442px |
| 1440 × 900 | 6,041px | 1440px | None measured | 489px |

At 390px the earlier baseline was 11,045px tall; the implementation is about 17% shorter. At 1440px the earlier baseline was 7,777px tall; the implementation is about 22% shorter. About at 390px reduced from about 3,078px to 1,378px with its detail collapsed. The design proposal's suggested 7,000–8,000px phone budget was not reached: project previews and readable evidence were retained rather than hidden or squeezed to meet that number.

[Machine-readable layout observations](evidence/after-layout.json).

## Verification

- All 35 site gates pass. The content-validator stage covers 83 Python tests, including nine new home-page invariants for accessible structure, preview ownership, publication counts, article metadata, and preserved career detail.
- All 13 navigation/transition regression tests pass. They run inside the navigation-state site gate and through `npm run test:nav`.
- All 13 existing motion tests pass through `npm run test:motion`.
- `git diff --check` passes. The audit-package checker validates linked evidence, image headers, report links, and home-page local destinations.
- Chrome: the skip link receives first keyboard focus and Enter transfers focus to `main-content`.
- Chrome at 390px: opening the drawer focuses Systems and makes main content inert. Six forward Tab presses reach the close toggle; Shift+Tab wraps to Contact. Escape restores toggle focus and clears the scroll lock and background isolation.
- Chrome: opening on mobile then crossing to 1000px closes the drawer and restores scrolling. A subsequent scroll moved the page from y=0 to y=900.
- Chrome: selecting Contact from the mobile drawer closes it, updates the fragment, and leaves no active transition overlay.
- Chrome: the IoT collection action reaches `/iot-handbook/`; Handbooks has the parent-collection current state.
- Chrome: opening career detail exposes the role explanation and career entries; closing it restores the compact presentation.
- Chrome warning/error capture returned no entries at the sampled final point.

The phone, tablet, 999px/1000px boundary, and desktop layouts were inspected. Screenshots below were captured from the implementation. Viewport overrides were reset after checking.

## Screenshot record

### Opening layouts

- [320px phone](evidence/after-hero-320.jpg)
- [390px phone](evidence/after-hero-390.jpg)
- [768px tablet](evidence/after-hero-768.jpg)
- [999px boundary](evidence/after-hero-999.jpg)
- [1000px boundary](evidence/after-hero-1000.jpg)
- [1440px desktop](evidence/after-hero-1440.jpg)

### Section checks

- [Mobile public systems](evidence/after-systems-mobile.jpg)
- [Desktop handbook collections](evidence/after-handbooks-desktop.jpg)
- [Mobile handbook collections](evidence/after-handbooks-mobile.jpg)
- [Desktop About](evidence/after-about-desktop.jpg)
- [Mobile About](evidence/after-about-mobile.jpg)
- [Mobile Contact](evidence/after-contact-mobile.jpg)

## Remaining validation limits

This is a local implementation reviewed in Chrome. Safari, Firefox, physical phones, a screen-reader session, 200% text zoom, and a browser session with JavaScript disabled were not exercised. The native disclosure and no-script stylesheet provide static fallbacks; their presence does not prove those unexecuted scenarios. No Lighthouse, Core Web Vitals, deployment-parity, or production-network result is claimed.

## Commit groups

The history contains separate commits for menu reliability; hero and keyboard bypass; project previews; phone diagram readability; collections and principles; writing and About; shared navigation and generating sources; Chrome-driven corrections; and transition reliability. The final documentation commit records the evidence and validation results without changing the website.
