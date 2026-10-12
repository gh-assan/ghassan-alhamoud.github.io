/* Chrome visual regression for the integrated IoT chapter. Requires Playwright. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {chromium} = require('playwright');
const base = process.env.IOT_VISUAL_URL || 'http://127.0.0.1:7110';

// ---------------------------------------------------------------- models
// Causal invariants are checked on the pure state functions before drawing.
const sandbox = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/motion/scene-iot.js'), 'utf8'), sandbox);
const V = sandbox.window.IoTStudy;
for (let t = 0; t <= 18; t += 0.1) {
  const v = V.flowAt(t, 'actuating');
  assert(!v.received || v.measured, 'telemetry before measurement');
  assert(!v.requested || v.received, 'request before telemetry in this model');
  assert(!v.applied || v.requested, 'operation before request');
  assert(!v.observed || v.applied, 'feedback before operation');
  const monitoring = V.flowAt(t, 'sensing');
  assert(!monitoring.requested && !monitoring.applied && !monitoring.observed, 'monitoring requires actuation');
}
assert.equal(V.freshnessAt(5).usable, true);
assert.equal(V.freshnessAt(5.1).usable, false);
assert.equal(V.freshnessAt(9).age, 9, 'receipt reset measurement age');
assert.equal(V.freshnessAt(9).received, true);
assert.equal(V.freshnessAt(9).usable, false);
assert.equal(V.freshnessAt(10).age, 10);

// --------------------------------------------------------------- browser
const SCENES = [
  {name: 'iot-study-flow', id: 'iot-flow-scene', times: [0, 0.8, 1.8, 2.7, 4.1, 5.4, 6.6, 8, 9.1, 10, 11.4, 12.4, 13.8], scenarios: ['sensing', 'actuating']},
  {name: 'iot-study-freshness', id: 'iot-freshness-scene', times: [0, 4, 5, 5.1, 8.9, 9, 10, 12.4, 13.8]}
];

(async () => {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const browser = await chromium.launch({headless: true, ...(executablePath ? {executablePath} : {})});
  try {
    const page = await browser.newPage();
    const qaDir = process.env.IOT_QA_DIR;
    if (qaDir) fs.mkdirSync(qaDir, {recursive: true});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    // Standalone SVG pages make the browser ask for /favicon.ico; that is not a scene error.
    page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') &&
      !(m.location().url || '').endsWith('/favicon.ico')) errors.push(m.text()); });
    // Record every label in CSS pixels, through whatever transform a scene applies.
    await page.addInitScript(() => {
      const proto = CanvasRenderingContext2D.prototype;
      const clear = proto.clearRect, draw = proto.fillText;
      proto.clearRect = function (...args) { this.canvas.__labels = []; return clear.apply(this, args); };
      proto.fillText = function (text, x, y, ...args) {
        const m = this.measureText(text), T = this.getTransform(), dpr = T.a ? this.canvas.width / this.canvas.getBoundingClientRect().width : 1;
        const left = this.textAlign === 'center' ? x - m.width / 2 : this.textAlign === 'right' ? x - m.width : x;
        const top = y - m.actualBoundingBoxAscent;
        const p = new DOMPoint(left, top).matrixTransform(T);
        (this.canvas.__labels ||= []).push({text: String(text), x: p.x / dpr, y: p.y / dpr,
          w: m.width * T.a / dpr, h: (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) * T.d / dpr,
          px: parseFloat((this.font.match(/([\d.]+)px/) || [0, NaN])[1]) * T.a / dpr});
        return draw.call(this, text, x, y, ...args);
      };
    });

    const files = ['fig-1-reference-model', 'fig-2-flows', 'fig-3-freshness']
      .flatMap(n => [n + '.svg', n + '-compact.svg', n + '-dark.svg', n + '-compact-dark.svg']);
    for (const file of files) {
      await page.goto(base + '/images/iot-handbook/IOT-001/' + file);
      const issues = await page.evaluate(() => {
        const out = [], v = document.querySelector('svg').viewBox.baseVal;
        for (const t of document.querySelectorAll('text')) {
          const b = t.getBBox(), p = t.closest('[data-card]');
          if (b.x < 0 || b.y < 0 || b.x + b.width > v.width || b.y + b.height > v.height) out.push('canvas: ' + t.textContent);
          if (p) {
            const [x, y, w, h] = p.dataset.bounds.split(',').map(Number);
            if (b.x < x + 8 || b.x + b.width > x + w - 8 || b.y < y + 5 || b.y + b.height > y + h - 5) out.push('card: ' + t.textContent);
          }
        }
        return out;
      });
      assert.deepEqual(issues, [], file + ' clipping');
    }

    let framesChecked = 0, minLabel = Infinity, minAt = '';
    for (const width of [320, 375, 400, 508, 560, 600, 679, 680, 720, 1200]) {
      await page.setViewportSize({width, height: 900});
      await page.goto(base + '/iot-handbook/chapter-01-what-is-an-iot-system.html');
      await page.waitForFunction(n => document.querySelectorAll('figure.scene').length === n &&
        [...document.querySelectorAll('figure.scene')].every(f => f.__motion), SCENES.length);
      const initial = await page.evaluate(() => Motion.stats());
      assert(initial.every(s => s.paused), 'autoplay at ' + width);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'horizontal page scroll at ' + width + ': ' + JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).map(e => [e.tagName, e.className, e.getBoundingClientRect().right]).slice(0, 12))));
      if (qaDir && [375, 1200].includes(width)) {
        for (let i = 0; i < 1; i++) await page.locator('.iot-diagram').nth(i).screenshot({path: path.join(qaDir, `diagram-${i}-${width}.png`)});
      }
      for (const sc of SCENES) {
        await page.locator('#' + sc.id).scrollIntoViewIfNeeded();
        for (const scenario of sc.scenarios || [null]) {
          if (scenario) await page.selectOption('#iot-flow-kind', scenario);
          const times = scenario === 'sensing' ? [0, 0.8, 1.8, 2.7, 4.1, 5.6, 6.8] : sc.times;
          for (const time of times) {
            await page.evaluate(([n, t]) => Motion.seek(n, t), [sc.name, time]);
            const res = await page.evaluate(id => {
              const s = document.getElementById(id).__motion, out = [], a = s.canvas.__labels || [];
              let min = Infinity;
              for (const b of a) {
                if (b.x < -0.5 || b.x + b.w > s.w + 0.5 || b.y < -0.5 || b.y + b.h > s.h + 0.5) out.push('clipped: ' + b.text);
                if (b.text.trim()) min = Math.min(min, b.px);
              }
              for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
                const p = a[i], q = a[j];
                if (Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x) > 1 &&
                    Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y) > 1) out.push('overlap: ' + p.text + ' / ' + q.text);
              }
              return {out, min};
            }, sc.id);
            assert.deepEqual(res.out, [], `${sc.name} ${width}px ${scenario || ''} t=${time}`);
            if (res.min < minLabel) { minLabel = res.min; minAt = `${sc.name} ${width}px t=${time}`; }
            if (qaDir && [375, 1200].includes(width) && (time === times.at(-1) || (width === 1200 && times.indexOf(time) < 3))) await page.locator('#' + sc.id).screenshot({path: path.join(qaDir, `${sc.name}-${width}-${scenario || 'final'}-${time}.png`)});
            framesChecked++;
          }
        }
      }
    }
    // The shared runtime sizes the canvas to the stage border box but shows it in the
    // padding box (1 px border each side), so 10 px labels display ~0.7 % smaller.
    assert(minLabel >= 9.9, 'label rendered below 10 CSS px: ' + minLabel.toFixed(2) + ' at ' + minAt);

    await page.setViewportSize({width: 1200, height: 900});
    await page.goto(base + '/iot-handbook/chapter-01-what-is-an-iot-system.html');
    await page.waitForFunction(() => [...document.querySelectorAll('figure.scene')].every(f => f.__motion));
    // A narrow handbook column on a wide viewport must use compact assets.
    await page.evaluate(() => document.querySelector('.article-layout').style.maxWidth = '548px');
    await page.waitForFunction(() => [...document.querySelectorAll('picture img')].every(img => img.currentSrc.includes('-compact')));
    await page.evaluate(() => document.querySelector('.article-layout').style.maxWidth = '');
    await page.waitForFunction(() => [...document.querySelectorAll('.iot-diagram picture')].every(p => p.querySelector('img').currentSrc.includes('-compact') === (p.getBoundingClientRect().width < 680)));

    await page.setViewportSize({width: 375, height: 900});
    await page.selectOption('#iot-flow-kind', 'actuating');
    await page.evaluate(() => Motion.seek('iot-study-flow', 12.4));
    const flowLabels = await page.evaluate(() => document.querySelector('#iot-flow-scene canvas').__labels.map(x => x.text));
    for (const label of ['Measure', 'Telemetry', 'Command', 'Actuate', 'New evidence received']) assert(flowLabels.includes(label), 'mobile semantic parity: ' + label);
    await page.selectOption('#iot-flow-kind', 'sensing');
    await page.evaluate(() => Motion.seek('iot-study-flow', 5.6));
    const sensing = await page.evaluate(() => ({duration: document.querySelector('#iot-flow-scene').__motion.def.duration, labels: document.querySelector('#iot-flow-scene canvas').__labels.map(x => x.text)}));
    assert.equal(sensing.duration, 7, 'monitoring sequence did not end independently');
    assert(!sensing.labels.includes('Command') && !sensing.labels.includes('Actuate'), 'optional control leaked into monitoring');
    await page.locator('[data-iot-reset="iot-study-flow"]').click();
    assert.equal(await page.evaluate(() => document.querySelector('#iot-flow-scene').__motion.clock), 0, 'reset flow');
    await page.selectOption('#iot-flow-kind', 'actuating');
    await page.evaluate(() => Motion.seek('iot-study-freshness', 10));
    assert(await page.evaluate(() => document.querySelector('#iot-freshness-scene canvas').__labels.some(x => x.text === '5 s limit')), 'missing visible freshness threshold');
    await page.setViewportSize({width: 1200, height: 900});

    const perf = [];
    for (const sc of SCENES) {
      await page.locator('#' + sc.id).scrollIntoViewIfNeeded();
      const toggle = page.locator(`#${sc.id} .scene__toggle`);
      await toggle.focus();
      await page.keyboard.press('Space');
      assert.equal(await toggle.getAttribute('aria-label'), 'Pause animation', sc.name + ' keyboard play');
      await page.evaluate(() => Motion.resetStats());
      await page.waitForTimeout(5000);
      const st = await page.evaluate(n => Motion.stats().find(s => s.name === n), sc.name);
      assert(st.frames > 30, sc.name + ' did not animate');
      assert(st.avgMs < 4, sc.name + ' frame cost ' + st.avgMs);
      perf.push({scene: sc.name, avgMs: st.avgMs, maxMs: st.maxMs});
      await page.keyboard.press('Space');
      assert.equal(await toggle.getAttribute('aria-label'), 'Play animation', sc.name + ' keyboard pause');
    }
    await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
    await page.evaluate(() => Motion.seek('iot-study-flow', 12.4));
    assert.equal(await page.evaluate(() => Motion.lib.colors().dark), true);
    await page.waitForFunction(() => [...document.querySelectorAll('.iot-diagram img')].every(img => img.currentSrc.includes('-dark.svg')));
    if (qaDir) for (const sc of SCENES) {
      await page.locator('#' + sc.id).scrollIntoViewIfNeeded();
      await page.evaluate(n => { const s = document.querySelector(`[data-scene="${n}"]`).__motion; Motion.seek(n, s.def.poster); }, sc.name);
      await page.locator('#' + sc.id).screenshot({path: path.join(qaDir, sc.name + '-dark-poster.png')});
    }

    // Off-screen and hidden-tab scenes do no work.
    await page.locator('#iot-flow-scene .scene__toggle').click();
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(350);
    const off0 = await page.evaluate(() => Motion.stats().find(s => s.name === 'iot-study-flow').frames);
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(() => Motion.stats().find(s => s.name === 'iot-study-flow').frames), off0, 'offscreen frames');
    await page.locator('#iot-flow-scene').scrollIntoViewIfNeeded();
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', {configurable: true, get: () => true}); document.dispatchEvent(new Event('visibilitychange')); });
    const hidden0 = await page.evaluate(() => Motion.stats().find(s => s.name === 'iot-study-flow').frames);
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(() => Motion.stats().find(s => s.name === 'iot-study-flow').frames), hidden0, 'hidden-tab frames');

    const reduced = await browser.newPage({viewport: {width: 375, height: 900}, reducedMotion: 'reduce'});
    await reduced.goto(base + '/iot-handbook/chapter-01-what-is-an-iot-system.html');
    await reduced.waitForFunction(() => [...document.querySelectorAll('figure.scene')].every(f => f.__motion));
    const posters = await reduced.evaluate(() => [...document.querySelectorAll('figure.scene')].map(f => [f.__motion.name, f.__motion.clock, f.__motion.def.poster]));
    for (const [n, clock, poster] of posters) assert.equal(clock, poster, n + ' reduced-motion poster');
    assert.equal(await reduced.locator('.scene__toggle').count(), 0);
    if (qaDir) for (const sc of SCENES) await reduced.locator('#' + sc.id).screenshot({path: path.join(qaDir, sc.name + '-reduced-poster.png')});
    await reduced.selectOption('#iot-flow-kind', 'sensing');
    assert.equal(await reduced.evaluate(() => document.querySelector('#iot-flow-scene').__motion.clock), 5.6, 'sensing reduced-motion poster');
    await reduced.locator('[data-iot-reset="iot-study-flow"]').click();
    assert.equal(await reduced.evaluate(() => document.querySelector('#iot-flow-scene').__motion.clock), 5.6, 'reset preserved sensing poster');
    const r0 = await reduced.evaluate(() => Motion.stats().map(s => s.frames));
    await reduced.waitForTimeout(350);
    assert.deepEqual(await reduced.evaluate(() => Motion.stats().map(s => s.frames)), r0, 'reduced-motion autoplay');

    const nojs = await browser.newPage({viewport: {width: 375, height: 900}, javaScriptEnabled: false});
    await nojs.goto(base + '/iot-handbook/chapter-01-what-is-an-iot-system.html');
    assert.equal(await nojs.locator('canvas').count(), 0);
    for (const sc of SCENES) assert(await nojs.locator(`#${sc.id} img`).isVisible(), sc.name + ' no-JS fallback');

    await page.evaluate(() => { const s = document.getElementById('iot-freshness-scene').__motion; s.def.draw = () => { throw Error('intentional QA fault'); }; Motion.seek('iot-study-freshness', 5); });
    assert(await page.locator('#iot-freshness-scene.scene--failed img').isVisible(), 'renderer fault fallback');
    await page.waitForFunction(() => document.querySelector('#iot-freshness-scene.scene--failed img').currentSrc.includes('-dark.svg'));
    const real = errors.filter(e => !e.includes('intentional QA fault'));
    assert.deepEqual(real, [], 'browser errors');
    console.log(JSON.stringify({browser: browser.version(), svgFiles: files.length, framesChecked,
      minLabelPx: +minLabel.toFixed(2), perf,
      checks: 'causal models, SVG clipping, canvas clipping and label overlap at 10 widths, min label size, compact switching, keyboard, themes, offscreen, hidden tab, reduced motion, no-JS, error fallback'}, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
