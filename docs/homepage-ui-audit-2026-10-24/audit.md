# Home page UI audit — 24 October 2026

**Implementation:** See [the implementation and Chrome verification record](implementation.md) for the completed changes. Observations below describe the earlier baseline.

The home page has a coherent visual identity, credible engineering evidence, and useful public work. Keep those strengths. The highest priorities are fixing the mobile menu state model, making contact easier to find, and reducing the amount of reading required before a visitor can choose a path.

This is an audit and implementation proposal. No website UI was changed.

For the deeper visual direction and a second Chrome review, see [Home page design improvements](design-improvements.md).

## Baseline and method

- Branch: `codex/homepage-ui-audit-2026-10-24`.
- Base: fetched `origin/main`, commit `2f899f57334d06da9f71cd726765ad5074650485` (PR #36 merge).
- Worktree: `/Users/ghassan/.codex/worktrees/homepage-ui-audit/personal-website`.
- Browser: actual Chrome, controlled through its connected browser session.
- Target: `http://127.0.0.1:7104/`, served from the clean worktree. This is a source audit of latest main, not a claim about the deployed site's current state.
- Inspected every home page section on desktop and at 390 × 844: hero, systems, principles, both handbooks, Field Notes, About, counters, Contact, and footer. Tablet hero inspected at 768 × 1024. Small-phone hero inspected at 320 × 568.
- Additional layout measurements: widths 320, 375, 768, 999, 1000, 1280, and 1440 at 900px height; initial desktop 1841 × 1099. See [responsive measurements](evidence/responsive-matrix.json).
- Used screenshots, rendered DOM geometry, accessibility state, keyboard interaction, source inspection, and existing site checks. Tested mobile open/close, Tab, Escape, resizing while open, diagram pause, section anchors, and both hero CTA destinations.

Priority means P1: fix next; P2: planned improvement; P3: polish. “Observed” describes evidence. “Recommendation” describes a design judgment, not proven visitor behavior. No conversion analytics or user interviews were available.

## What to retain

1. The sage/forest palette, readable body typography, restrained borders, and consistent spacing form a recognizable engineering identity.
2. Public Systems leads with concrete work. Descriptions include scope and limitations rather than unsupported claims.
3. Primary and secondary hero actions have a useful hierarchy. Both navigate successfully to the projects and AI handbook indexes in Chrome.
4. The desktop diagram is relevant to the subject. Its pause button changes to “Play diagram animation” with `aria-pressed="true"`; its hit area measured 44 × 44px.
5. Mobile navigation is removed from the accessibility tree while closed. Escape closes the drawer and restores focus to its toggle.
6. The layout adapts without measured horizontal overflow at the tested widths. At 390px the entire page width is 390px; stacked cards remain readable.
7. Static content, self-hosted Inter, a main landmark, heading hierarchy, portrait alt text, and visible keyboard focus styles provide a good base.

## Prioritized findings

| ID | Priority | Type | Finding | Main owner |
| --- | --- | --- | --- | --- |
| UI-01 | P1 | Confirmed defect | Focus leaves the open mobile drawer | `assets/js/nav.js` |
| UI-02 | P1 | Confirmed defect | Resizing an open drawer to desktop retains scroll lock | `assets/js/nav.js` |
| UI-03 | P2 | Accessibility gap | No skip-to-content link | `index.html` |
| UI-04 | P2 | Navigation improvement | Contact and IoT handbook have weak persistent discovery | Header/footer in `index.html` |
| UI-05 | P2 | Content/design | Long page delays visitor decisions | Home page section composition |
| UI-06 | P2 | Typography | Desktop diagram labels render too small | Hero SVG and layout |
| UI-07 | P2 | Interaction improvement | Chapter links have small clickable boxes | Handbook list CSS |
| UI-08 | P2 | Navigation clarity | Route navigation also behaves like section tracking | Scroll spy and navigation labels |
| UI-09 | P2 | Content/design | Hero repeats positioning before showing work | Hero content |
| UI-10 | P2 | Content/design | About combines biography, role definition, impact, and full CV | About section |
| UI-11 | P3 | Content/design | Article previews give little help choosing a reading commitment | Field Notes cards |
| UI-12 | P3 | Visual/interaction polish | Repeated cards and reveal effects flatten the page rhythm | Shared section/card styles |
| UI-13 | P3 | Editorial polish | Counter captions expose implementation language | Counters |

### UI-01 — Open drawer does not contain keyboard focus

**Observed:** At 390 × 844, opening navigation focuses Systems. Five Tab presses move through the five menu links and then focus the hero's “Explore Public Systems” link while the drawer remains open and the background remains dimmed. The rest of the page is still present in the accessibility tree. [Drawer evidence](evidence/mobile-menu-focus-escape.jpg) shows the visual state; focus escape itself was verified through `document.activeElement`, not inferred from the screenshot.

**Impact:** Keyboard users can operate obscured content while page scrolling is locked. The drawer looks modal but does not behave consistently as one.

**Root cause:** `openMenu()` focuses the first link and locks body overflow; it neither makes background content inert nor cycles focus within the drawer and its close toggle. `applyInertState()` only disables the menu when closed.

**Change:** Keep the existing small implementation. Explicitly define an open-mobile-menu state. While open, isolate background content and keep Tab/Shift+Tab within the menu and close control. Preserve Escape, scrim dismissal, and focus restoration. Add `aria-controls="navMenu"` to the toggle. Avoid adding a general dialog framework for one drawer.

**Acceptance:** With the drawer open, forward and reverse keyboard traversal never reaches the hero or footer. Escape restores focus and scrolling. Choosing a route or About closes cleanly. Screen-reader navigation cannot reach the dimmed background.

### UI-02 — Open mobile menu leaves desktop scrolling locked

**Observed:** Open at 390px, then resize to 1280px. The toggle becomes `display:none`, but `aria-expanded` remains `true` and body inline overflow remains `hidden`. Desktop CSS hides the scrim, so the cause is no longer visible. Escape clears the stale state. [Resize evidence](evidence/desktop-after-open-menu-resize.jpg).

**Root cause, using five whys:**

1. Why is desktop scrolling locked? The mobile menu's inline overflow lock remains.
2. Why does it remain? Crossing the breakpoint does not call `closeMenu()`.
3. Why does the breakpoint callback not close it? It only runs `applyInertState()`.
4. Why is that insufficient? That function updates accessibility reachability but does not reconcile expanded state, open classes, or overflow.
5. Why can desktop look closed while JS says open? CSS owns visibility while JavaScript owns the menu lifecycle, without one transition that reconciles both.

**Change:** On entering the desktop breakpoint, close the mobile drawer, clear its scrim and lock, and normalize expanded state. Do not return focus to a hidden toggle. Restore the prior overflow value rather than assuming every page always starts with an empty one.

**Acceptance:** Open at 999px, cross to 1000px, and scroll normally; expanded state is false and no scrim remains. Return to mobile: the menu is closed and inert. Repeat with keyboard focus in the menu.

### UI-03 — Add a bypass link

**Observed:** A main landmark exists, but the home page has zero skip links. A keyboard visitor traverses the header before reaching content on every visit.

**Change:** Add a first-focusable “Skip to content” link targeting an identifiable main element. Reveal it on focus. Ensure the target receives useful focus and remains clear of the fixed header.

**Acceptance:** On a fresh page, the first Tab exposes the link. Enter moves to main content. This is a keyboard improvement; the existing main landmark already helps screen-reader users.

### UI-04 — Make contact and both learning collections easier to discover

**Observed:** Header links are Systems, Field Notes, Handbook, Research, and About. Contact is absent. “Handbook” points only to the AI collection. The home footer omits both Research and the IoT collection. At 390px, Contact starts around y=9,922 on an 11,045px page. [Contact/footer](evidence/desktop-contact-footer.jpg).

**Recommendation:** Add a compact Contact route or anchor to desktop and mobile navigation. Expose both handbooks through one clearly named collections entry or a simple pair of links; do not add an elaborate mega-menu. Include IoT and Research consistently in the footer. Offer a visible email address alongside the mailto action so visitors without a configured mail client can copy it.

**Acceptance:** From the initial viewport, desktop and mobile visitors can reach Contact and either handbook without scanning the full page. Mailto remains a valid action; no message should be sent by tests.

### UI-05 — Reduce the home page's decision cost

**Observed:** At 390 × 844, the page is 11,045px tall, roughly 13 viewport heights. About alone occupies about 3,078px. At the initial desktop width the page is 7,777px tall. Long-form material and two contents lists sit between the first project evidence and the personal/contact information.

**Recommendation:** Use the home page to help visitors choose among inspecting systems, learning, and contacting the author. Keep three systems, two concise collection previews, a smaller article selection, and a compact About/impact section. Move the full career history to a dedicated About page or an accessible native disclosure. Retain direct access to the detail.

**Proposed sequence:** concise hero with early contact access → public systems → two handbook summaries → selected writing → short About with selected impact → contact/footer. Integrate Operating Principles into a short evidence-backed block or the handbook preview.

**Acceptance:** At 390px, a visitor can scan the major choices without reading a CV or complete chapter list. Agree a content budget before implementation; do not reduce height by shrinking text. A suggested first experiment is a 25–35% height reduction, not an asserted optimal metric.

### UI-06 — Desktop diagram detail is below comfortable reading size

**Observed:** At 1440px the SVG is about 393.6px wide with a 520-unit viewBox. Labels specified at 10–14 units therefore render at approximately 7.6–10.6 CSS pixels. The pause hit area is already 44px; a tiny-looking icon is not evidence of a tiny click target. Tablet instead gives the diagram a full-width row, about 720px wide. [Desktop hero](evidence/desktop-hero.jpg), [tablet hero](evidence/tablet-768-hero.jpg).

**Recommendation:** Simplify the inline diagram to a handful of readable concepts, or allocate it enough width for at least 12–14px rendered labels. Put detailed architecture on a project page. Keep its text alternative and motion control. Make “Inspect the public repos” actionable if it remains in the caption; it is currently plain text.

**Acceptance:** Labels are legible at normal desktop zoom, including the 1000px layout threshold. The diagram does not displace the primary action on small screens. Review the result at tablet width as well as wide desktop.

### UI-07 — Enlarge chapter link hit areas

**Observed:** At 390px the first chapter link boxes are 20px high inside 32px list rows. Only the inline text is clickable. Footer text links also measured about 20px high. [Mobile handbook](evidence/mobile-handbook.jpg).

**Recommendation:** Make the whole chapter row clickable with block links and comfortable vertical padding; aim for roughly 44px rows on touch layouts. Preserve ordered-list semantics. Apply the same approach to footer links where practical.

**Limit:** These measurements alone do not establish a WCAG failure: spacing exceptions may apply. This is a usability recommendation, not a compliance verdict.

### UI-08 — Clarify route links versus in-page navigation

**Observed:** Systems, Field Notes, and Handbook navigate away; About jumps within the home page. `nav.js` also maps visible home sections to those route links for active styling. The IoT section is absent from this mapping.

**Recommendation:** Keep the global navigation consistently about site destinations. If local section navigation is useful, label it separately and keep it compact. Avoid styling a route as though the user has navigated there merely because a corresponding preview is visible. Use `aria-current` only for the chosen semantic model.

**Acceptance:** Visible active state, destination, and accessible current state agree. Scrolling through the IoT and AI previews does not imply the visitor is on a different page.

### UI-09 — Tighten the first screen

**Observed:** The hero has an eyebrow, headline, role line, introduction, proof paragraph, diagram, and two actions. “Agent systems,” public documentation, and distributed-systems experience recur. At 320 × 568, the primary action begins around y=739 and is below the first viewport. At 390 × 844 it fits. [390px hero](evidence/mobile-390-hero.jpg), [320px hero](evidence/mobile-320-hero.jpg).

**Recommendation:** Keep the strong headline and one short supporting paragraph. Combine the role/proof material into one compact credibility line. Place the action before the mobile decorative strip. Make the ambiguous “AI Agent Enabler” phrase secondary to the concrete engineering work; its long explanation currently appears much later in About.

**Acceptance:** At 320 × 568 the main action can be reached with minimal scrolling and the first screen communicates who this is, what they build, and where to go next. Preserve the user's actual positioning and factual scope when editing copy.

### UI-10 — Shorten About and lead with useful evidence

**Observed:** A large portrait precedes the heading on mobile, followed by a role definition, several biography paragraphs, selected impacts, seven career entries, and skill tags. The desktop portrait stays alongside the extended narrative. [About desktop](evidence/desktop-about.jpg), [About mobile](evidence/mobile-about.jpg).

**Recommendation:** Lead with a brief personal introduction and the strongest two or three impacts. Reduce the mobile portrait footprint. Give the full history its own destination. Avoid repeating all three public systems in both the hero and biography.

**Acceptance:** Visitors can understand the author's experience without reading the role definition or full timeline. Keep scope qualifiers on professional claims; do not invent performance metrics to make the section shorter.

### UI-11 — Help readers choose an article

**Observed:** Four selected cards have category, title, and excerpt, but no visible date or reading-time estimate. Long titles compete equally. [Mobile Field Notes](evidence/mobile-field-notes.jpg).

**Recommendation:** Feature one starting point and two or three complementary notes. Add reliable reading time and publication/update information from the existing content registry where available. Use “Selected Field Notes” if the selection is curated rather than strictly newest. Keep entire-card links and visible focus.

### UI-12 — Add deliberate visual rhythm and restrain reveal effects

**Observed:** Multiple sections repeat green text, rounded sage panels, pill tags, and generous vertical gaps. Desktop process cards have narrow text columns. Normal scroll passes briefly showed blank regions before reveal content appeared; subsequent observations showed it correctly. No persistent blank-content defect was established. `reveal.js` uses delayed opacity/translation and observer thresholds.

**Recommendation:** Compress the principles presentation, vary section composition through editorial hierarchy rather than more decoration, and keep content immediately available during fast scrolling. Reduce stagger delays, especially for text-heavy cards. Compare small, deliberate spacing changes before changing the palette or adding animation.

**Acceptance:** Rapid scrolling does not require waiting to read a section. Keyboard-focused items remain visible. Test reduced motion and script failure in a follow-up browser pass before claiming those runtime cases pass.

### UI-13 — Replace internal counter captions

**Observed:** Captions include “Open source, listed in projects.json” and “Registered in articles.json.” They expose storage details without helping readers decide what to inspect. “Handbook Chapters” counts the AI handbook while another handbook appears on the page.

**Recommendation:** Use reader-facing captions and link counts to their indexes. Label the chapter count as the AI handbook or deliberately aggregate both collections. Keep registry validation internally.

## Implementation order and regression cases

**First change: menu reliability and keyboard bypass.** Address UI-01 through UI-03 together without redesigning navigation. Add real-browser tests for forward/reverse focus, Escape, scrim close, route selection, About selection, and open-menu breakpoint changes in both directions. Assert scroll position can change after the breakpoint transition, not just that a CSS class disappeared.

**Second change: discovery and hierarchy.** Address contact, collection discovery, first-screen copy, diagram legibility, chapter hit areas, and counter labels. Capture 320, 390, 768, 999, 1000, and 1440px screenshots. Verify existing destinations and content registries remain consistent.

**Third change: page composition.** Reduce About and handbook previews, then reassess principles and article selection. Review with a reader trying to inspect work, a learner choosing an entry point, and someone trying to contact the author. Prefer direct task completion over a cosmetic score.

| Regression | Expected outcome |
| --- | --- |
| Open drawer; Tab beyond last link; Shift+Tab before first | Focus stays in the active navigation controls |
| Escape and scrim dismissal | Drawer closes, background unlocks, focus returns appropriately |
| Open at 999px; resize to 1000px | Expanded=false, no lock, no scrim, normal scrolling |
| Return from desktop to mobile | Closed drawer is inert; toggle is operable |
| Fresh load; first Tab; Enter | Skip link transfers focus to main |
| Navigate by hero CTAs and chapter links | Correct destination and visible content |
| 320px, 390px, tablet, desktop | No clipped text or horizontal overflow; legible diagram |
| Reduced motion, JavaScript disabled, reveal script unavailable | Content stays available; motion respects preferences |
| Contact with no configured mail client | Visible address remains available to copy |

The last two runtime scenarios and screen-reader operation remain follow-up validation requirements, not completed tests in this audit.

## Verification and limits

- `python3 scripts/validate-site.py`: all 35 gates pass on the clean base. Its content-validator stage includes 74 Python tests. An initial restricted run failed because a regression test could not create its temporary directory in the worktree; rerunning with worktree write access passed. This was an environment restriction, not a site failure.
- `npm run test:motion`: 13 tests pass. These test motion geometry and behavior; they do not prove mobile-menu accessibility.
- Chrome console warning/error capture on the home page: no entries returned at the sampled point.
- Closed-menu breakpoint/overflow measurements are in the JSON evidence. They do not cover every intermediate width, browser zoom setting, or operating system.
- `check-audit.py` validates the report's local evidence references and image headers, records evidence checksums, and checks home-page local destinations against files/anchors. It is an audit-package check, not an automated replay of Chrome interactions.
- No Lighthouse score, Core Web Vitals, production network profile, CPU trace, automated accessibility certification, live deployment parity, physical phone test, Safari/Firefox test, 200% text zoom, no-JavaScript browser pass, reduced-motion browser emulation, or screen-reader test was performed. Do not infer those results from source checks or screenshots.
- No contact messages were sent and no public deployment or push was performed. The original checkout and its unpublished handbook edits were preserved.

## Evidence index

Screenshots are observations at specific scroll positions, not stitched full-page captures. For menu defects, use the reproduction and state observations above; an image cannot independently prove focus or body overflow.

- [Desktop hero](evidence/desktop-hero.jpg)
- [Desktop systems](evidence/desktop-systems.jpg)
- [Desktop principles / AI handbook transition](evidence/desktop-principles.jpg)
- [Desktop IoT / Field Notes transition](evidence/desktop-handbooks.jpg)
- [Desktop About](evidence/desktop-about.jpg)
- [Desktop counters, contact, footer](evidence/desktop-contact-footer.jpg)
- [Mobile hero](evidence/mobile-390-hero.jpg)
- [Small-phone hero](evidence/mobile-320-hero.jpg)
- [Tablet hero](evidence/tablet-768-hero.jpg)
- [Mobile systems](evidence/mobile-systems.jpg)
- [Mobile principles](evidence/mobile-principles.jpg)
- [Mobile handbook](evidence/mobile-handbook.jpg)
- [Mobile Field Notes](evidence/mobile-field-notes.jpg)
- [Mobile About](evidence/mobile-about.jpg)
- [Mobile Contact](evidence/mobile-contact.jpg)
- [Open mobile drawer](evidence/mobile-menu-focus-escape.jpg)
- [Desktop after open-menu resize](evidence/desktop-after-open-menu-resize.jpg)
