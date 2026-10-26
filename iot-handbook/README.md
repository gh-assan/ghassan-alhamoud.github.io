# IoT Engineering Handbook

The collection lives at `/iot-handbook/` and shares the AI handbook renderer,
reading styles, navigation and motion player. The AI collection keeps its
existing `/handbook/` URLs. Collection links connect both reading paths.

Chapter 1 was imported from the approved original in `ai-projects/articles/iot-engineering-handbook/chapters/IOT-001-what-is-an-iot-system`, revised 2026-10-12. Website edition 1.2 reorganizes it around the AI handbook structure and adds a worked architecture example, pitfalls and five FAQs. A running room-monitoring service links the explanations to a 30-second notification deadline and a separate five-second observation-age limit. Its glossary keeps seven useful distinctions rather than basic software or component vocabulary. The original source's three review lenses covered that source revision; they do not imply independent review of the website additions. Catalogue status and editorial status describe availability and content scope separately.

Chapter 2 was imported from `IOT-002-sensors-and-the-physical-world`, source version 1.3, on 2026-10-19. Website edition 1.4 adopts the shared structure and adds six FAQs. It covers sensing principles, measurement chains, calibration, sampling, lag and uncertainty. Its three static figure families retain all twelve source SVG variants. Compact figures are selected below a 760 px reading-column width; theme changes select the corresponding dark variants. The source register is available at `sources/chapter-02.md`. Numerical examples are constructed theoretical models. The main reading path retains figures, tables and design consequences; equations and detailed calculations are in optional native disclosures.

Chapter 3 is integrated from `IOT-003-boards-from-prototype-to-industry` source v1.5, revised 2026-10-26. It covers board roles, firmware execution, the CC2640R2F/BLE path and board selection under memory, timing, energy, interface and recovery requirements. Its twelve SVG variants use the same container-width/theme helper as Chapter 2. Detailed calculations remain optional; the source register is at `sources/chapter-03.md`. Catalogue availability does not imply hardware qualification or a new independent technical review. Chapter 4 references remain plain text marked forthcoming until that chapter is published. The original Chapter 3 package remains unchanged by integration. Optional chapter `shortTitle` metadata shortens the browser title while retaining the full reader title.

## Build and validation

```sh
python3 scripts/build-handbook.py --collection iot-handbook
python3 scripts/validate-handbook.py --collection iot-handbook
python3 -m unittest discover -s tests -q
npm run validate
npm run test:motion
```

For Chrome visual regression, install/use Playwright in your environment,
serve this repository on localhost port 7110 and run:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:iot-visuals
npm run test:iot-static-visuals
```

The static suite covers Chapters 2 and 3 and navigation among all published IoT chapters. `test:iot-sensors-visuals` remains an alias for compatibility.

`IOT_VISUAL_URL` changes the preview origin. `IOT_QA_DIR` optionally saves
review screenshots. The test covers both conceptual models, twelve SVG variants,
290 animation states at ten widths, label clipping/overlap, a 10 px label floor
(with border-box rounding tolerance), keyboard controls, themes, reduced
motion, no-JavaScript/error fallbacks, and idle behavior. Shared motion quality
requirements remain in `docs/animation/00-quality-bar.md`.

## Adding chapters

Add Markdown in `md/`, a chapter record in `handbook.json`, and assets under
`/images/iot-handbook/`. Keep links to public resources absolute. Regenerate
HTML with the collection flag. Synchronize the homepage, sitemap and llms.txt.
Record reading time, learning outcome, prerequisites, and editorial status.
Do not label predictions or illustrative animation as physical measurements.

Follow the AI handbook reading structure: “If You Only Read One Section,”
“Prerequisites” (with learning outcomes), topic-specific explanations and worked
examples, “Common Pitfalls and Mitigations,” “Summary,” “What's Next?,”
“Related Chapters,” “Frequently Asked Questions,” “Glossary Terms Introduced,” “References and Further Reading,” and
“Revision History.” Use descriptive headings without section numbers. FAQs
answer quick questions. Do not include a separate study-question section.
Link related chapters only when their website routes exist. A next-topic
transition may explain the learning progression without linking an unpublished
chapter. Keep internal review records outside public revision history. The Chapter 1 glossary retains seven terms and Chapter 2 retains twelve terms whose technical distinctions help interpret measurements; basic vocabulary, sensor-family summaries and specialized derivation terms stay in their teaching sections.

`requiredSections` in `handbook.json` records the shared sections in order.
`validate-handbook.py --collection iot-handbook` rejects missing, duplicated or
reordered sections. Topic headings remain flexible. The existing renderer
generates FAQ structured data from the visible `**Q: ...**` paragraphs, plus
desktop and mobile tables of contents. `npm run validate` also runs this gate.

The former practical package is preserved only in the original source's internal archive. It is excluded from the website. The new figures explain the ITU functional model, generic sensing/actuation flows, and observation freshness. The two paused scenes model flows and freshness with static/text alternatives; all values are illustrative.

Visual revision 1.1 consolidates static and animated figure pairs, keeps command and actuation paths visible on compact layouts, uses the shared motion primitives, and marks the assumed five-second freshness threshold. Nature and dark SVG variants follow the website theme. Sensing-only playback ends on its own seven-second sequence; optional actuation uses a fourteen-second sequence with an eased loop boundary.

Public revision histories preserve earlier dated entries. Chapters 1 and 2 consolidate their changes dated 2026-10-19 into one record each; Chapter 3 retains the supplied v1.5 history. Original source histories remain in the source packages.
