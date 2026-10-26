/* Static teaching figures and reading navigation for IoT Chapters 2–4. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const base = process.env.IOT_VISUAL_URL || 'http://127.0.0.1:7110';
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../iot-handbook/handbook.json'), 'utf8')).handbook.chapters.filter(c => c.status === 'published');
const routeFor = c => `/iot-handbook/chapter-${String(c.id).padStart(2, '0')}-${c.slug}.html`;
const staticChapters = [{id: 2, disclosures: 9, figures: 3}, {id: 3, disclosures: 7, figures: 3}, {id: 4, disclosures: 2, figures: 2}];
(async () => {
  const browser = await chromium.launch({headless: true, executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try {
    const page = await browser.newPage({reducedMotion: 'reduce'});
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    const qa = process.env.IOT_QA_DIR;
    if (qa) fs.mkdirSync(qa, {recursive: true});
    for (const file of fs.readdirSync(path.join(__dirname, '../images/iot-handbook/IOT-004'))) {
      await page.goto(base + '/images/iot-handbook/IOT-004/' + file);
      const clipped = await page.evaluate(() => {
        const svg = document.querySelector('svg'), v = svg.viewBox.baseVal;
        return [...svg.querySelectorAll('text')].filter(t => {
          const b = t.getBBox();
          return b.x < 0 || b.y < 0 || b.x + b.width > v.width || b.y + b.height > v.height;
        }).map(t => t.textContent);
      });
      assert.deepEqual(clipped, [], `${file} clipped text`);
    }
    let layouts = 0;
    for (const config of staticChapters) {
      const chapter = catalog.find(c => c.id === config.id);
      const route = routeFor(chapter);
      for (const width of [320, 375, 390, 679, 680, 759, 760, 768, 1024, 1200, 1440]) {
        await page.setViewportSize({width, height: 900});
        await page.goto(base + route);
        for (const theme of ['nature', 'dark']) {
          await page.evaluate(t => document.documentElement.dataset.theme = t, theme);
          await page.waitForFunction(t => [...document.querySelectorAll('.iot-diagram img')].every(i =>
            i.complete && i.naturalWidth > 0 && i.currentSrc.includes('-dark.svg') === (t === 'dark')), theme);
          const result = await page.evaluate(async () => ({
            overflow: document.documentElement.scrollWidth > innerWidth,
            figures: await Promise.all([...document.querySelectorAll('.iot-diagram picture')].map(async p => {
              const img = p.querySelector('img');
              const xml = new DOMParser().parseFromString(await (await fetch(img.currentSrc)).text(), 'image/svg+xml');
              const nominal = Number(xml.documentElement.getAttribute('viewBox').split(/\s+/)[2]);
              const labelSize = Math.min(...[...xml.querySelectorAll('text')].map(t => Number(t.getAttribute('font-size'))));
              return {width: p.getBoundingClientRect().width, compact: img.currentSrc.includes('-compact'),
                minLabel: labelSize * img.getBoundingClientRect().width / nominal};
            })),
            disclosures: document.querySelectorAll('.handbook-body details:not(.on-this-page)').length,
            brokenAnchors: [...document.querySelectorAll('a[href^="#"]')].map(a => a.hash.slice(1)).filter(id => id && !document.getElementById(decodeURIComponent(id)))
          }));
          assert.equal(result.overflow, false, `${chapter.id}/${width}/${theme} page overflow`);
          assert.equal(result.figures.length, config.figures);
          result.figures.forEach(f => {
            assert.equal(f.compact, f.width < 760, `${chapter.id}/${width}/${theme} figure selection`);
            assert(f.minLabel >= 9.9, `${chapter.id}/${width}/${theme} small label: ${f.minLabel}`);
          });
          assert.equal(result.disclosures, config.disclosures);
          assert.deepEqual(result.brokenAnchors, []);
          if ([390, 1440].includes(width)) {
            assert.equal(await page.evaluate(() => {
              const details = [...document.querySelectorAll('.handbook-body details:not(.on-this-page)')];
              details.forEach(d => d.open = true);
              const overflow = document.documentElement.scrollWidth > innerWidth;
              details.forEach(d => d.open = false);
              return overflow;
            }), false, `${chapter.id}/${width}/${theme} expanded calculation overflow`);
            if (qa) {
              for (let i = 0; i < config.figures; i++) await page.locator('.iot-diagram').nth(i).screenshot({path: path.join(qa, `chapter-${chapter.id}-figure-${i}-${width}-${theme}.png`)});
              await page.screenshot({path: path.join(qa, `chapter-${chapter.id}-reading-${width}-${theme}.png`)});
            }
          }
          layouts++;
        }
      }
      // The exact transition follows the container, rather than the viewport.
      await page.setViewportSize({width: 1440, height: 900});
      await page.goto(base + route);
      for (const width of [759, 760]) {
        await page.evaluate(w => document.querySelectorAll('.iot-diagram').forEach(f => f.style.width = `${w}px`), width);
        await page.waitForFunction(w => [...document.querySelectorAll('.iot-diagram img')].every(i => i.complete && i.currentSrc.includes('-compact') === (w < 760)), width);
      }
      await page.goto(base + route);
      const detail = page.locator('.handbook-body details:not(.on-this-page)').first();
      await detail.locator('summary').focus();
      await page.keyboard.press('Enter');
      assert.equal(await detail.getAttribute('open'), '');
      await page.keyboard.press('Enter');
      assert.equal(await detail.getAttribute('open'), null);
      const context = await browser.newContext({javaScriptEnabled: false, viewport: {width: 390, height: 900}});
      const staticPage = await context.newPage();
      await staticPage.goto(base + route);
      assert(await staticPage.locator('.iot-diagram img').evaluateAll((imgs, count) => imgs.length === count && imgs.every(i => i.complete && i.naturalWidth > 0), config.figures));
      await context.close();
    }
    for (const chapter of catalog) {
      for (const width of [390, 900, 1440]) {
        await page.setViewportSize({width, height: 900});
        await page.goto(base + routeFor(chapter));
        for (const theme of ['nature', 'dark']) {
          await page.evaluate(t => document.documentElement.dataset.theme = t, theme);
          for (const id of ['summary', 'whats-next', 'related-chapters', 'frequently-asked-questions', 'glossary-terms-introduced']) {
            const heading = page.locator(`#${id}`);
            assert.equal(await heading.count(), 1);
            await heading.scrollIntoViewIfNeeded();
            assert(await heading.isVisible());
          }
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          const toc = width < 900 ? page.locator('.on-this-page') : page.locator('.handbook-toc');
          if (width < 900 && await toc.getAttribute('open') === null) await toc.locator('summary').click();
          await toc.locator('a[href="#frequently-asked-questions"]').click();
          assert.equal(new URL(page.url()).hash, '#frequently-asked-questions');
          if (qa && width !== 900) await page.screenshot({path: path.join(qa, `chapter-${chapter.id}-faq-${width}-${theme}.png`)});
          layouts++;
        }
        const related = page.locator('#related-chapters + ul a');
        assert.equal(await related.count(), chapter.relatedPatterns.length);
        for (const slug of chapter.relatedPatterns) {
          const target = routeFor(catalog.find(c => c.slug === slug));
          await page.locator(`#related-chapters + ul a[href="${target}"]`).click();
          await page.waitForURL(base + target);
          await page.goto(base + routeFor(chapter));
        }
      }
    }
    assert.deepEqual(errors, []);
    console.log(`PASS: ${layouts} Chrome layouts; all static chapters, readable figures, themes, expanded calculations, container breakpoints, keyboard, no-JS and all related chapter links.`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
