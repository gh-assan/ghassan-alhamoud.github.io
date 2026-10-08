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
const V = sandbox.window.IoTVisual;

for (let t = 0; t < 18; t += 0.125) {
  const runs = ['baseline', 'wiring', 'blind'].map(sc => [sc, V.benchAt(t, sc)]);
  for (const [sc, s] of runs) {
    if (s.current) assert(s.pin && s.command, 'current preceded its drive');
    if (s.pin) assert(s.command, 'pin preceded command');
    if (s.light) assert(s.lit, 'light without a lit LED');
    if (s.verdict !== 'pending') assert.notEqual(s.observation, 'pending', 'verdict without observation');
    if (sc === 'wiring') assert.equal(s.lit, false, 'wrong wire lit the LED');
    if (sc === 'blind') assert.equal(s.reachesSensor, false, 'light reached a covered sensor');
    if (sc === 'blind') assert.notEqual(s.verdict, 'effect_consistent', 'blindness established success');
  }
  // The software records are identical in every case: that is the lesson.
  for (const [, s] of runs) assert.deepEqual([s.command, s.pin], [runs[0][1].command, runs[0][1].pin]);
}
assert.equal(V.benchAt(13, 'baseline').verdict, 'effect_consistent');
assert.equal(V.benchAt(13, 'wiring').verdict, 'effect_contradicted');
assert.equal(V.benchAt(13, 'blind').verdict, 'effect_unknown');

for (let t = 0; t < 34; t += 0.125) {
  const s = V.fanAt(t);
  if (s.spinning) assert(s.leadsOnSupply || s.inputsDriven, 'fan spun without supply or driven inputs');
  if (s.inputsDriven) assert.equal(s.move, 1, 'inputs driven before jumpers reached D6/D7');
  if (s.stage < 2) assert.equal(s.spinning, false, 'fan spun with jumpers on D4/D3');
  if (s.saw) assert(s.u >= 5.4, 'observation before the stage played out');
}
assert.equal(V.fanAt(31).software, V.fanAt(7).software, 'stage 4 report must equal stage 1 report');
assert.equal(V.fanAt(31).spinning, true);

let prevAlive = V.CAUSES.length;
for (let t = 0; t < 36; t += 0.125) {
  const s = V.testsAt(t), alive = s.alive.filter(Boolean).length;
  assert(alive <= prevAlive, 'a ruled-out cause came back');
  prevAlive = alive;
  s.cols.forEach((c, j) => {
    if (c.removed.length) assert(c.observed && V.TESTS[j].ran, 'removed without a run observation');
    if (V.TESTS[j].confirm !== undefined) assert.equal(c.removed.length, 0, 'a confirming test removed causes');
  });
  if (s.confirmed >= 0) assert(s.cols[3].observed, 'confirmed before the pin-map comparison');
}
const end = V.testsAt(35);
assert.deepEqual([...end.alive], [false, false, false, false, false, true]);
assert.deepEqual([...V.testsAt(10).alive], [false, false, true, true, true, true], 'bypass should remove exactly two');

// --------------------------------------------------------------- browser
const SCENES = [
  {name: 'iot-evidence', id: 'evidence-scene', times: [0, 2.5, 4.5, 6.5, 9, 11, 13], scenarios: ['baseline', 'wiring', 'blind']},
  {name: 'iot-fan', id: 'fan-scene', times: [1, 3, 5, 7, 11, 15, 18, 21, 23, 25, 27, 31]},
  {name: 'iot-tests', id: 'tests-scene', times: [1, 5, 7.5, 12, 14, 20, 24, 27.5, 30, 34]}
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

    const files = ['fig-0-iot-system-map', 'fig-1-belief-and-physics', 'fig-2-fan-incident-timeline', 'fig-3-test-discrimination']
      .flatMap(n => [n + '.svg', n + '-compact.svg']);
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
        for (let i = 0; i < 4; i++) await page.locator('.iot-diagram').nth(i).screenshot({path: path.join(qaDir, `diagram-${i}-${width}.png`)});
      }
      for (const sc of SCENES) {
        await page.locator('#' + sc.id).scrollIntoViewIfNeeded();
        for (const scenario of sc.scenarios || [null]) {
          if (scenario) await page.selectOption('#iot-scenario', scenario);
          for (const time of sc.times) {
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
            if (qaDir && [375, 1200].includes(width) && (time === sc.times.at(-1) || (width === 1200 && sc.times.indexOf(time) < 3))) await page.locator('#' + sc.id).screenshot({path: path.join(qaDir, `${sc.name}-${width}-${scenario || 'final'}-${time}.png`)});
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
    await page.waitForFunction(() => [...document.querySelectorAll('picture img')].every(img => img.currentSrc.includes('-compact.svg')));
    await page.evaluate(() => document.querySelector('.article-layout').style.maxWidth = '');
    await page.waitForFunction(() => [...document.querySelectorAll('.iot-diagram picture')].every(p => p.querySelector('img').currentSrc.includes('-compact.svg') === (p.getBoundingClientRect().width < 680)));

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
    await page.evaluate(() => Motion.seek('iot-fan', 31));
    assert.equal(await page.evaluate(() => Motion.lib.colors().dark), true);
    if (qaDir) for (const sc of SCENES) {
      await page.locator('#' + sc.id).scrollIntoViewIfNeeded();
      await page.evaluate(n => { const s = document.querySelector(`[data-scene="${n}"]`).__motion; Motion.seek(n, s.def.poster); }, sc.name);
      await page.locator('#' + sc.id).screenshot({path: path.join(qaDir, sc.name + '-dark-poster.png')});
    }

    // Off-screen and hidden-tab scenes do no work.
    await page.locator('#fan-scene .scene__toggle').click();
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(350);
    const off0 = await page.evaluate(() => Motion.stats().find(s => s.name === 'iot-fan').frames);
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(() => Motion.stats().find(s => s.name === 'iot-fan').frames), off0, 'offscreen frames');
    await page.locator('#fan-scene').scrollIntoViewIfNeeded();
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', {configurable: true, get: () => true}); document.dispatchEvent(new Event('visibilitychange')); });
    const hidden0 = await page.evaluate(() => Motion.stats().find(s => s.name === 'iot-fan').frames);
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(() => Motion.stats().find(s => s.name === 'iot-fan').frames), hidden0, 'hidden-tab frames');

    const reduced = await browser.newPage({viewport: {width: 375, height: 900}, reducedMotion: 'reduce'});
    await reduced.goto(base + '/iot-handbook/chapter-01-what-is-an-iot-system.html');
    await reduced.waitForFunction(() => [...document.querySelectorAll('figure.scene')].every(f => f.__motion));
    const posters = await reduced.evaluate(() => [...document.querySelectorAll('figure.scene')].map(f => [f.__motion.name, f.__motion.clock, f.__motion.def.poster]));
    for (const [n, clock, poster] of posters) assert.equal(clock, poster, n + ' reduced-motion poster');
    assert.equal(await reduced.locator('.scene__toggle').count(), 0);
    if (qaDir) for (const sc of SCENES) await reduced.locator('#' + sc.id).screenshot({path: path.join(qaDir, sc.name + '-reduced-poster.png')});
    const r0 = await reduced.evaluate(() => Motion.stats().map(s => s.frames));
    await reduced.waitForTimeout(350);
    assert.deepEqual(await reduced.evaluate(() => Motion.stats().map(s => s.frames)), r0, 'reduced-motion autoplay');

    const nojs = await browser.newPage({viewport: {width: 375, height: 900}, javaScriptEnabled: false});
    await nojs.goto(base + '/iot-handbook/chapter-01-what-is-an-iot-system.html');
    assert.equal(await nojs.locator('canvas').count(), 0);
    for (const sc of SCENES) assert(await nojs.locator(`#${sc.id} img`).isVisible(), sc.name + ' no-JS fallback');

    await page.evaluate(() => { const s = document.getElementById('tests-scene').__motion; s.def.draw = () => { throw Error('intentional QA fault'); }; Motion.seek('iot-tests', 5); });
    assert(await page.locator('#tests-scene.scene--failed img').isVisible(), 'renderer fault fallback');
    const real = errors.filter(e => !e.includes('intentional QA fault'));
    assert.deepEqual(real, [], 'browser errors');
    console.log(JSON.stringify({browser: browser.version(), svgFiles: files.length, framesChecked,
      minLabelPx: +minLabel.toFixed(2), perf,
      checks: 'causal models, SVG clipping, canvas clipping and label overlap at 10 widths, min label size, compact switching, keyboard, themes, offscreen, hidden tab, reduced motion, no-JS, error fallback'}, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
