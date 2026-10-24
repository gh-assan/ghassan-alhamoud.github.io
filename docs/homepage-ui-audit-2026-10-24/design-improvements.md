# Home page design improvements

24 October 2026 · Second Chrome review · Proposal for the existing site

The strongest direction is a calm engineering portfolio with an editorial structure: a decisive opening, visually inspectable work, clear learning collections, selected writing, and a concise personal introduction. Keep the current forest-green identity. Give each kind of content a different visual role.

This develops the five design suggestions from the conversation. The [UI audit](audit.md) records functional defects and accessibility concerns. This document specifies how the page could look and read after a focused design revision. All sizes below are proposed starting points unless explicitly marked as measured. No UI implementation was changed.

## What the second Chrome pass established

Revisited the local home page on `codex/homepage-ui-audit-2026-10-24`, at commit `750c19f`, served at `http://127.0.0.1:7104/`. The site implementation remains the original audit baseline, `2f899f5`. This pass inspected the hero, projects, principles, both handbook previews, writing, and About at 1440 × 900; the hero, AI handbook, and About at 390 × 844; and the hero at 768 × 1024 and 1000 × 900.

| Measured observation | Design implication |
| --- | --- |
| Desktop headline: 54.4px, roughly 61px line height, three lines in a 590px column | The title already has presence; the surrounding material needs editing more than the title needs enlargement |
| Desktop supporting paragraph: 24px with 38.4px line height, three lines | It competes with the headline rather than quietly explaining it |
| Desktop diagram: about 394px wide; roughly 362px at the 1000px breakpoint | Fine labels become much smaller than surrounding text |
| At 768px, the diagram moves to a 720px-wide row below the actions | Tablet has a disproportionately large diagram; responsive design needs an intermediate treatment |
| All three home-page project cards contain zero images, SVGs, or canvases | Project identity depends almost entirely on reading |
| Desktop principles descriptions occupy columns about 169px wide | Wide outer margins and tall panels create unnecessary line wrapping |
| At 390px, the page is 11,045px tall; About is 3,078px, principles 1,093px, and the two handbooks total 1,383px | Several secondary sections consume large amounts of attention |
| Mobile portrait measures about 298 × 373px | The portrait dominates the entrance to About before its heading appears |

These are rendered-page observations. The proposed benefits are design judgments; this review did not measure conversion, comprehension, or visitor preferences. The screenshots show the current page, not proposed redesigns.

## 1. Simplify the hero and make its composition more deliberate

### Why it currently feels busy

The opening stacks an uppercase eyebrow, large headline, role line, large introduction, proof paragraph, diagram, and actions. Several elements repeat public systems, documentation, agent infrastructure, and distributed-systems experience. They are individually relevant but compete for the same first impression.

The diagram has the opposite problem: an entire architecture is compressed into a small column. Enlarging the whole graphic would make the opening taller, especially on tablet. The better solution is to simplify its content and edit the surrounding copy together.

Evidence: [desktop hero](evidence/design-desktop-hero.jpg), [mobile hero](evidence/design-mobile-hero.jpg), [tablet hero](evidence/design-tablet-hero.jpg), [1000px hero](evidence/design-1000-hero.jpg).

### Proposed composition

At desktop widths, retain a text-and-diagram split with approximately 56% text, 44% visual, and a 40–48px gap within the current container. Keep the headline in a 16–19 character-width measure as a starting point. Let wrapping follow the available width; do not force desktop line breaks onto phones.

Use four content levels:

1. A short identity line: the name and engineering practice.
2. The existing headline, with punctuation and wrapping reviewed at the actual breakpoints.
3. One supporting paragraph, about 25–40 words, at 18–20px on desktop and 17–18px on mobile.
4. The two actions, followed by one quiet credibility line if needed.

Example supporting copy for editorial review:

> I build public agent systems and interactive engineering labs, drawing on 15+ years of backend and distributed-systems work. Explore the code, architecture decisions, and limitations.

This is proposed copy assembled from the current page's claims. Preserve the author's intended role and scope before adopting it. Keep the longer explanation of “AI Agent Enabler” on the About detail surface.

Keep “Explore Public Systems” as the filled primary action. Keep the handbook action as a quieter text link with a clear focus and hover treatment. Add an understated Contact link in navigation rather than a third large hero button. If “Handbooks” becomes a collection entry, update the destination and label together.

### Diagram direction

Reduce the opening visual to four readable concepts: events → runtime → durable state → human oversight. Use a small loop or return path if it communicates an actual relationship. Label the graphic as illustrative and provide a route to the detailed architecture. Preserve the text alternative and pause control when animation remains.

The hero graphic should communicate one idea at a glance. Detailed SQLite checkpoints, replay, policy flow, and evaluation internals belong on the project detail page. Do not silently change their relationships while simplifying the diagram.

### Responsive behavior

| Layout | Starting treatment |
| --- | --- |
| 1000px and wider | Two columns; simplified visual; rendered diagram labels at least 12–14px |
| 600–999px | Text first, actions next, then a centered visual with a maximum width around 480–520px |
| Below 600px | Full-width primary action, quieter secondary link, compact static strip below the actions |

Keep title size around 44–56px on desktop and 30–36px on phones, with fluid sizing between them. Reduce hero top padding from the measured 152px desktop value toward 104–128px, allowing for the header. On mobile, review a 96–112px total top inset from the page edge. These are layout experiments, not fixed-height contracts.

**Acceptance:** The page has one obvious headline and action. At 390 × 844 the first project section should become visible sooner than it does now. At 320 × 568, the action should require less scrolling than the current version. Text can enlarge without clipping. Tablet does not turn the diagram into a full extra screen.

## 2. Give public projects a visible identity and a clear focal point

### What to change

The current flagship card is wide but uses its second column for another paragraph and tags. Tamoz and ALMS repeat the same sage panel, proof box, and pill structure. Their differences emerge only after reading several sentences. [Current project section](evidence/design-desktop-systems.jpg).

Use one featured project panel followed by two smaller project panels:

- **ScaleShop:** a prominent, authentic interface preview beside the title, short summary, one evidence statement, and action.
- **Tamoz:** a small diagram of the stream-to-governed-action boundary above or beside concise copy.
- **ALMS:** a small diagram of agents accessing shared operational memory above or beside concise copy.

The second pass refines the earlier suggestion to add a preview for every project: allocate the most visual weight to ScaleShop. Give Tamoz and ALMS modest diagrams within a consistent visual system. This creates hierarchy without making the home page a gallery of competing screenshots.

### Asset brief

| Asset | What it must show | Treatment and limits |
| --- | --- | --- |
| ScaleShop preview | A real, current workshop screen with one legible incident or telemetry area | Crop to a meaningful detail; remove irrelevant browser chrome; caption it as a preview |
| Tamoz diagram | Sensor/situation input, governed decision boundary, bounded command output | 3–4 large nodes; label it illustrative; retain simulator/bench scope qualifiers |
| ALMS diagram | Agents, shared memory/protocols, and the access boundary | 3–4 large nodes; avoid implying orchestration that the project explicitly does not provide |

The repository contains `images/projects/scaleshop-social.png`. Treat it as a candidate to inspect, not an approved substitute for a current interface capture. New project previews have not been created or verified by this review. SVG is suitable for the two simple diagrams; a real interface capture is suitable for ScaleShop. Generated dashboard artwork would weaken the site's evidence-based presentation.

### Card anatomy

Use this order consistently: status → project name → one-sentence purpose → one concise evidence statement → action. Limit displayed tags to two useful distinctions; avoid repeating the title or status in them.

Suggested text budget per project is about 45–70 words across purpose and evidence. Preserve facts and limitations when shortening. Keep the fuller reasoning on the project page.

The featured preview can occupy roughly half the desktop panel with a 16:10 frame. At mobile widths, show the title and purpose before the image so the reader knows what they are seeing. Cap the preview height around 180–220px as a starting point; select a crop that remains useful at that size.

Keep “Inspect the system” when the destination is a case-study page. A link labelled “Open the lab” must actually open the lab. Avoid a nested button inside a whole-card link. Choose a single-card anchor or explicit title/action anchors and preserve keyboard visibility.

**Acceptance:** The three projects are distinguishable in a quick visual scan. The preview remains useful at 390px. If images fail, purpose and destination remain clear. Reserve image dimensions to prevent layout shifts. Suggested initial image budget: no more than about 150KB for the featured preview and 15KB for each simple diagram, subject to measured visual quality.

## 3. Present the handbooks as two editorial collections

### What the current presentation communicates

The AI handbook introduces eleven chapter links; the IoT handbook follows in a separate section with two links. On mobile these sections total about 1,383px before Field Notes. The treatment looks like two contents pages inserted into the home page. It does little to help a visitor choose which collection suits them. [Desktop handbooks](evidence/design-desktop-handbooks.jpg), [mobile AI handbook](evidence/design-mobile-handbook.jpg).

### Proposed layout

Create a single “Engineering Handbooks” section with two equal-width collection cards on desktop and two stacked cards on mobile. Each gets:

- A small collection identifier: AI engineering or IoT engineering.
- A clear title, wrapping naturally to two or three lines.
- A 30–45 word description explaining the learning goal.
- A chapter count derived from the collection's registry.
- At most three topic cues.
- One descriptive entry action.

For the AI collection, an example topic line is “Agent patterns · Memory · Evaluation.” For IoT, use “Sensing · Communication · Device lifecycle.” These describe subject areas, not claims that all planned material has been published.

On the reviewed baseline, AI has eleven published chapters and IoT has two. Display the counts from their respective sources when implementing; the original checkout contains unpublished handbook work that is outside this branch. Counts must not imply that planned chapters already exist.

Use the same title size, content padding, and action alignment for both cards. Distinguish them with a restrained diagram motif: a few connected nodes for AI, a sensor/device path for IoT. Keep motifs small enough that the cards remain primarily editorial.

Use 28–32px card padding on desktop, 20–24px on mobile, and a 24px gap. A single subtle border is sufficient. The full chapter lists remain accessible on the collection indexes. The home page should retain a clear entry route for each collection; a direct first-chapter link may be secondary if it adds useful guidance.

**Acceptance:** Both collections are visible together at normal desktop width. Their scope and publication counts are explicit. At 390px, neither requires scanning an entire contents list before finding its action. Long translated or enlarged titles can expand the cards without truncation.

## 4. Build visual rhythm through composition and typography

### Why the page feels repetitive

The palette is restrained, but the same rounded panel, green text, pill tags, and heading underline recur across unrelated content. Consistency has become uniform emphasis. The principles section takes roughly 738px on desktop while its text sits in narrow columns. [Principles](evidence/design-desktop-principles.jpg). Article cards use a similar surface language to the project cards. [Writing](evidence/design-desktop-writing.jpg).

Five whys clarify the design cause:

1. Why does the middle of the page feel repetitive? Several sections repeat the same visual silhouette.
2. Why do their silhouettes match? Rounded cards, badges, headings, and spacing are reused regardless of content role.
3. Why does that flatten hierarchy? A principle, a public system, and an article receive similar visual emphasis.
4. Why does spacing alone not solve it? Large gaps separate sections but do not explain their different purposes.
5. What is the underlying design issue? The page lacks an explicit emphasis budget tied to visitor decisions.

The first two points are visible observations. The causal interpretation is design analysis, not a claim about the original author's intent.

### Assign each section a distinct treatment

| Content | Proposed treatment | Reason |
| --- | --- | --- |
| Hero | Open background, large type, one compact visual | Establish identity and direction |
| Projects | Strongest panels and imagery | Make the work the main evidence |
| Principles | Three open columns with small numbers and a fine divider | Explain the method without competing with the work |
| Handbooks | Two editorial cards | Present a clear choice of learning paths |
| Writing | One lead article plus two lighter linked rows | Help readers choose a starting point |
| About | Portrait beside concise prose and a small impact list | Add a human voice and professional context |
| Contact | A quiet, clear end point with one strong action | Finish with an obvious next step |

Keep principles to a heading and one or two sentences each; about 20–30 words per principle. Link their supporting material where useful. Removing their large enclosing panels lets the descriptions use more of the available width. On phones, stack them with 24–32px gaps and subtle separators.

For writing, feature one article with a larger title and a short excerpt; give two supporting articles compact rows. Use publication date and reading time only when backed by the registry. Reserve the emphasis for titles, not uppercase category labels. The full archive remains one obvious link away.

### Proposed visual rules

| Element | Starting rule |
| --- | --- |
| Palette | Retain page `#f5f7f5`, panel `#edf2ed`, primary text `#1a2e1a`, secondary text `#4a6741`, action `#1d6f42` |
| Headings | Hero 44–56px desktop / 30–36px mobile; section titles 32–40px / 28–32px |
| Main text | 17–18px with 1.55–1.7 line height; avoid shrinking copy to meet a height target |
| Supporting copy | 14–16px; very small uppercase text only for short, optional metadata |
| Reading measure | Approximately 55–70 characters for extended paragraphs |
| Section spacing | 80–96px desktop, 48–64px mobile; adjust for section role rather than applying one value everywhere |
| Component spacing | Use a small shared scale: 8, 12, 16, 24, 32, 48px |
| Corners | 12–16px for major panels; 6–8px for controls; pills reserved for real status/category metadata |
| Shadows | One restrained shadow on the lead project or hover; avoid a shadow on every surface |
| Actions | Filled forest green for primary actions; quieter links elsewhere; a visible focus ring on all controls |
| Motion | Short, optional transitions around 120–180ms; no delayed access to text; reduced-motion support |

These rules reuse the existing identity. Adding another font family, a theme switcher, a large gradient background, or more animation would add maintenance without addressing the observed hierarchy problem.

**Acceptance:** The page remains recognizable in the current palette, but projects, principles, learning, and writing have visibly different compositions. A grayscale review should still reveal the main hierarchy. Hover feedback cannot be the only sign of interactivity. Validate contrast on actual text/surface combinations after implementation; this proposal is not a contrast certification.

## 5. Make About concise, personal, and easy to scan

### Current tension

About performs four jobs: defining the role, introducing the person, demonstrating impact, and reproducing the career timeline. On mobile, a 373px-tall portrait precedes the heading. The section grows to about 3,078px, roughly 28% of the full page height. [Desktop About](evidence/design-desktop-about.jpg), [mobile About](evidence/design-mobile-about.jpg).

### Proposed composition

Lead with the About heading and a direct personal introduction. Place a portrait alongside it on desktop. On mobile, use a smaller portrait, approximately 140–180px wide, with the heading and opening text immediately adjacent or following closely. Preserve the natural portrait crop and existing alt text; avoid a decorative circular crop unless it improves the actual photograph.

Keep the home-page biography to roughly 70–100 words. Follow it with three short impact statements, each containing an employer, scope, and concrete responsibility. The current Vinted extraction, Wayfair database decoupling, and PlusDental API migration provide material. Preserve their limits and avoid invented business metrics.

Move the detailed timeline, expanded role definition, and full skill inventory to an About page or an accessible native disclosure. Creating an About route would be new implementation work; do not add a link until the destination exists. If retaining an inline disclosure, use a descriptive summary and test focus, expansion, and printing.

Replace the large counter band with a compact evidence line only if those counts help the story. Link public-system and writing counts to their destinations. Use audience-facing labels rather than `projects.json` or `articles.json` captions.

Place an accessible Contact link near the introduction and a visible email address in the final contact section. Keep mailto as a convenient action and make copying the address possible without JavaScript.

**Acceptance:** A reader can find the person, professional scope, strongest impacts, and contact route without reading the full career history. As a starting content budget, aim for an About section below about 1,000–1,300px at 390px, allowing it to expand for text enlargement. The portrait supports the introduction instead of delaying it.

## Proposed page structure

```text
Header — name | Systems | Handbooks | Writing | Research | About | Contact

Hero — headline + short explanation + actions | simplified diagram

Selected public systems
  ScaleShop — authentic preview + purpose + evidence + case-study action
  Tamoz — small diagram + purpose     ALMS — small diagram + purpose

Engineering handbooks
  AI collection card                 IoT collection card

Operating principles — three concise open columns, linked to supporting work

Selected Field Notes — one lead article + two lighter rows

About — smaller portrait + short introduction + three impacts

Contact — visible address + email action
Footer — compact navigation, both collections, social and legal destinations
```

This is the proposed desktop hierarchy. Mobile follows the same content order in one column. Keep the current header container width; fit labels through testing rather than forcing seven links into the existing desktop breakpoint. “Handbooks” needs a real collection destination or an accessible collection control. Header naming is part of the proposal, not a ready-to-apply label substitution.

## Delivery sequence and review criteria

| Pass | Work | Scope and verification |
| --- | --- | --- |
| 1 | Hero copy, type hierarchy, diagram simplification | Small HTML/CSS/SVG change; review 320, 390, 768, 999, 1000, and 1440px |
| 2 | Project previews and card hierarchy | Asset creation plus card layout; verify asset accuracy, dimensions, loading, keyboard behavior, and destinations |
| 3 | Paired handbook cards and lighter principles | Reuse collection registries; preserve published counts and index access |
| 4 | Writing hierarchy, concise About, compact counts, contact | Editorial decisions and possibly a new About surface; verify all removed material remains accessible where intended |

Fix UI-01 and UI-02 from the audit before treating the new header as complete. They concern focus escape and stale scroll lock. A new appearance does not resolve either defect automatically.

For the first combined revision, target roughly 7,000–8,000px total page height at 390px, compared with the measured 11,045px. This is a review budget, not a reason to clip text, impose fixed card heights, or hide evidence. Typography and task completion take precedence over reaching the number.

### Tests to add when implementing

- Responsive visual captures at 320 × 568, 390 × 844, 768 × 1024, 999 × 900, 1000 × 900, and 1440 × 900. Check natural title wrapping, graphic labels, and unequal card-content lengths.
- Keyboard traversal through each project, both collections, articles, About details, and Contact. No nested interactive controls; focus always remains visible.
- Image-failure and slow-image scenarios. Titles, evidence, and actions must remain available; dimensions must prevent content jumps.
- Collection count checks against each registry. A planned chapter cannot increase a published count.
- Text enlargement, reduced motion, and JavaScript unavailable. Content and destinations must remain usable.
- The existing site gates plus real-browser menu regressions from the audit. Update layout-contract tests only after reviewing the intended design change, not merely to make old assertions pass.

### What this pass verified

This was a second actual Chrome review of the unchanged local site. Eleven new section/viewport screenshots support the proposal. Their links and image headers are included in the audit package check. The proposed layouts, copy budgets, and assets have not been implemented or tested. This pass did not rerun the previous full site gates because the changes are documentation and evidence only; their earlier results remain recorded in the UI audit.

No production parity, user preference, performance improvement, or conversion gain is claimed. The next meaningful validation is to implement the first focused revision and compare it in Chrome against these acceptance criteria.
