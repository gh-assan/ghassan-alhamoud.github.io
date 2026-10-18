/* Integrated Chapter 2 checks in installed Google Chrome. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const base = process.env.IOT_VISUAL_URL || 'http://127.0.0.1:7110';
const route = '/iot-handbook/chapter-02-sensors-and-the-physical-world.html';
(async () => {
  const browser = await chromium.launch({headless: true, executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try {
    const page = await browser.newPage();
    await page.emulateMedia({reducedMotion: 'reduce'});
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    const qa = process.env.IOT_QA_DIR;
    if (qa) fs.mkdirSync(qa, {recursive: true});
    let layouts = 0;
    for (const width of [320, 375, 390, 679, 680, 759, 760, 768, 1024, 1200, 1440]) {
      await page.setViewportSize({width, height: 900});
      await page.goto(base + route);
      for (const theme of ['nature', 'dark']) {
        await page.evaluate(t => document.documentElement.dataset.theme = t, theme);
        await page.waitForFunction(t => [...document.querySelectorAll('.iot-diagram img')].every(i =>
          i.complete && i.naturalWidth > 0 && i.currentSrc.includes('-dark.svg') === (t === 'dark')), theme);
        const result = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth,
          figures: [...document.querySelectorAll('.iot-diagram picture')].map(p => ({
            width: p.getBoundingClientRect().width,
            compact: p.querySelector('img').currentSrc.includes('-compact'),
          })),
          disclosures: document.querySelectorAll('.handbook-body details').length,
          brokenAnchors: [...document.querySelectorAll('a[href^="#"]')].map(a => a.hash.slice(1)).filter(id => id && !document.getElementById(decodeURIComponent(id)))
        }));
        assert.equal(result.overflow, false, `${width}/${theme} page overflow`);
        assert.equal(result.figures.length, 3);
        result.figures.forEach(f => assert.equal(f.compact, f.width < 760, `${width}/${theme} figure selection`));
        assert(result.disclosures >= 9, 'optional models and calculations missing');
        assert.deepEqual(result.brokenAnchors, [], 'broken local navigation');
        if ([390, 1440].includes(width)) {
          const overflow = await page.evaluate(() => {
            const details = [...document.querySelectorAll('.handbook-body details:not(.on-this-page)')];
            details.forEach(d => d.open = true);
            const overflow = document.documentElement.scrollWidth > innerWidth;
            details.forEach(d => d.open = false);
            return overflow;
          });
          assert.equal(overflow, false, `${width}/${theme} expanded calculation overflow`);
        }
        if (qa && [390, 1440].includes(width)) {
          for (let i = 0; i < 3; i++) await page.locator('.iot-diagram').nth(i).screenshot({path: path.join(qa, `sensors-${width}-${theme}-${i}.png`)});
        }
        layouts++;
      }
    }
    const chapters = ['/iot-handbook/chapter-01-what-is-an-iot-system.html', route];
    for (const chapter of chapters) {
      for (const width of [390, 900, 1440]) {
        await page.setViewportSize({width, height: 900});
        await page.goto(base + chapter);
        for (const theme of ['nature', 'dark']) {
          await page.evaluate(t => document.documentElement.dataset.theme = t, theme);
          for (const id of ['summary', 'whats-next', 'related-chapters', 'frequently-asked-questions',
                            'glossary-terms-introduced']) {
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
          if (qa && width !== 900) {
            await page.locator('#frequently-asked-questions').scrollIntoViewIfNeeded();
            await page.screenshot({path: path.join(qa, `chapter-${chapters.indexOf(chapter) + 1}-faq-${width}-${theme}.png`)});
          }
          layouts++;
        }
        const related = page.locator('#related-chapters + ul a');
        assert.equal(await related.count(), 1);
        const target = chapters.find(c => c !== chapter);
        assert.equal(await related.getAttribute('href'), target);
        await related.click();
        await page.waitForURL(base + target);
      }
    }
    await page.goto(base + '/iot-handbook/chapter-01-what-is-an-iot-system.html');
    await page.locator(`a[href="${route}"]`).first().click();
    await page.waitForURL(base + route);
    const detail = page.locator('.handbook-body details').filter({hasNot: page.locator('.on-this-page')}).first();
    await detail.locator('summary').click();
    assert.equal(await detail.getAttribute('open'), '');
    await detail.locator('summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await detail.getAttribute('open'), null);
    const context = await browser.newContext({javaScriptEnabled: false, viewport: {width: 390, height: 900}});
    const staticPage = await context.newPage();
    await staticPage.goto(base + route);
    assert(await staticPage.locator('.iot-diagram img').evaluateAll(imgs => imgs.every(i => i.complete && i.naturalWidth > 0)));
    await context.close();
    assert.deepEqual(errors, []);
    console.log(`PASS: ${layouts} Chrome layouts, responsive figures, themes, navigation, keyboard disclosures and no-JavaScript figures.`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
