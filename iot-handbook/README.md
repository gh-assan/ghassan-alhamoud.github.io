# IoT Engineering Handbook

The collection lives at `/iot-handbook/` and shares the AI handbook renderer,
reading styles, navigation and motion player. The AI collection keeps its
existing `/handbook/` URLs. Collection links connect both reading paths.

Chapter 1 is synchronized from the approved original in `ai-projects/articles/iot-engineering-handbook/chapters/IOT-001-what-is-an-iot-system`, revised 2026-10-12. It is independent, theoretical study material grounded in industry standards, with eight conceptual questions and worked answers. Three review lenses covered standards, teaching/language/style, and architecture/visuals. Catalogue status and editorial status describe availability and content scope separately.

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
```

`IOT_VISUAL_URL` changes the preview origin. `IOT_QA_DIR` optionally saves
review screenshots. The test covers both conceptual models, six SVGs,
240 animation states at ten widths, label clipping/overlap, a 10 px label floor
(with border-box rounding tolerance), keyboard controls, themes, reduced
motion, no-JavaScript/error fallbacks, and idle behavior. Shared motion quality
requirements remain in `docs/animation/00-quality-bar.md`.

## Adding chapters

Add Markdown in `md/`, a chapter record in `handbook.json`, and assets under
`/images/iot-handbook/`. Keep links to public resources absolute. Regenerate
HTML with the collection flag. Synchronize the homepage, sitemap and llms.txt.
Record reading time, learning outcome, prerequisites, and editorial status.
Do not label predictions or illustrative animation as physical measurements.

The former practical package is preserved only in the original source's internal archive. It is excluded from the website. The new figures explain the ITU functional model, generic sensing/actuation flows, and observation freshness. The two paused scenes model flows and freshness with static/text alternatives; all values are illustrative.
