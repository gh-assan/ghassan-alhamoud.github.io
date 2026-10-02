// Geometry and meaning checks for the Handbook Chapter 22 scenes
// (assets/js/motion/scene-audio.js), drawn against a recording stub of
// Motion.lib at phone and desktop widths.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const sine = x => -(Math.cos(Math.PI * x) - 1) / 2;
const ease = { inOutSine: sine, outCubic: x => 1 - (1 - x) ** 3, inOutCubic: sine };

// Conservative text width: Inter measures ~0.50 em per glyph in these sentences
// (canvas measureText, 2026-10-02); 0.56 keeps a 12 % margin. Key labels are
// uppercase with tracking.
const width = (str, o = {}) => String(str).length * (o.size || (o.key ? 10 : 12)) * (o.key ? 0.72 : 0.56);

function load() {
  const defs = {};
  const calls = { text: [], chip: [] };
  const ctx = new Proxy({}, { get: (_, k) => (k in ctx2 ? ctx2[k] : () => {}), set: () => true });
  const ctx2 = {};
  const lib = {
    E: ease, seg, clamp, lerp: (a, b, t) => a + (b - a) * t,
    hold: (t, a, b, edge = 0.3) => sine(seg(t, a, a + edge)) * (1 - sine(seg(t, b - edge, b))),
    rng: () => () => 0.5, col: () => '', mix: () => [0, 0, 0], rr: () => {},
    measure: (_, str, o) => width(str, o),
    text: (_, str, x, y, o = {}) => calls.text.push({ str, x, y, o }),
    chip: (_, str, x, y) => calls.chip.push({ str, x, y }),
    glyph: () => {}, trail: () => {}, arrow: () => {}, token: () => {},
    path: pts => ({ at: () => ({ x: pts[0][0], y: pts[0][1] }) }),
  };
  const Motion = { lib, register: (name, def) => { defs[name] = def; } };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/js/motion/scene-audio.js'), 'utf8'),
    { window: { Motion }, Motion, Math });
  const run = (name, w, h, t) => {
    calls.text.length = 0;
    calls.chip.length = 0;
    const s = { compact: w < 560, w, h, state: {}, g: ctx };
    defs[name].layout(s);
    defs[name].draw(s, t);
    return { s, text: calls.text.slice(), chip: calls.chip.slice() };
  };
  return { defs, run };
}

// [phone --aspect-compact, desktop --aspect] as set in the chapter source
const ASPECT = { 'audio-clocks': [1.15, 2.05], 'audio-cancel': [1.15, 2.1], 'audio-incident': [0.9, 1.95] };
const stages = name => [
  ['320 px', 270, 270 / ASPECT[name][0]], ['375 px', 325, 325 / ASPECT[name][0]], ['desktop', 720, 720 / ASPECT[name][1]],
];
const STAGES = stages('audio-cancel');

for (const name of Object.keys(ASPECT)) {
  test(`${name}: labels stay on the stage and clear the beat rail`, () => {
    const { defs, run } = load();
    assert.ok(defs[name], `${name} registered`);
    for (const [label, w, h] of stages(name)) {
      const railTop = w < 560 ? h - 46 : h - 26;
      for (let t = 0; t < defs[name].duration; t += 0.25) {
        const { text } = run(name, w, h, t);
        assert.ok(text.length >= 3, `${name} draws its lanes at ${label}`);
        for (const item of text) {
          if ((item.o.alpha ?? 1) < 0.05 || !item.str) continue;
          const tw = width(item.str, item.o);
          const left = item.o.align === 'left' ? item.x : item.o.align === 'right' ? item.x - tw : item.x - tw / 2;
          assert.ok(left >= 4 && left + tw <= w - 4,
            `${name} "${item.str}" fits horizontally at ${label}, t=${t} (${left.toFixed(0)}..${(left + tw).toFixed(0)} of ${w})`);
          assert.ok(item.y > 6 && item.y < railTop,
            `${name} "${item.str}" clears the rail at ${label}, t=${t} (y=${item.y.toFixed(0)})`);
        }
      }
    }
  });
}

test('audio-clocks: the receipt survives barge-in and reconnect', () => {
  const { run } = load();
  // from the moment the bar is wide enough to carry its label
  for (let t = 8.5; t <= 13.5; t += 0.5) {
    const { text } = run('audio-clocks', 720, 351, t);
    assert.ok(text.some(x => /^completed/.test(x.str)), `completed task bar labelled at t=${t}`);
  }
});

test('audio-clocks: identities change only at their own events', () => {
  const { run } = load();
  const readout = (t, key) => run('audio-clocks', 720, 351, t).text
    .filter(x => x.str.startsWith(key) && (x.o.alpha ?? 1) > 0.5).map(x => x.str);
  assert.deepEqual(readout(7.0, 'generation'), ['generation g4']);
  assert.deepEqual(readout(8.6, 'generation'), ['generation g5']);
  assert.deepEqual(readout(9.0, 'owner'), ['owner o3']);
  assert.deepEqual(readout(10.8, 'owner'), ['owner o4']);
  assert.deepEqual(readout(4.0, 'request'), ['request r7/v1']);
  assert.deepEqual(readout(5.8, 'request'), ['request r7/v2']);
});

test('audio-cancel: "It already completed" is only said after the commit evidence', () => {
  const { run } = load();
  for (let t = 0; t < 13.5; t += 0.1) {
    for (const [, w, h] of STAGES) {
      const said = run('audio-cancel', w, h, t).text.some(x => x.str === '“It already completed.”' && x.o.alpha > 0);
      if (said) assert.ok(t >= 9.4, `completion reply appears only after the commit is shown (t=${t.toFixed(1)})`);
    }
  }
});

test('audio-incident: only the collapsed design restarts the aerator, and only after its own phrase', () => {
  const { run } = load();
  for (let t = 0; t < 15.5; t += 0.1) {
    for (const [, w, h] of stages('audio-incident')) {
      const text = run('audio-incident', w, h, t).text.filter(x => (x.o.alpha ?? 1) > 0.05).map(x => x.str);
      const restarted = text.filter(x => /restart sent|aerator 2 restarted/.test(x)).length;
      assert.ok(restarted <= 1, `at most one panel shows a restart (t=${t.toFixed(1)})`);
      if (restarted) assert.ok(t >= 7.7, `restart follows the spoken phrase (t=${t.toFixed(1)})`);
      if (t >= 10.6 && t < 14.6) assert.ok(text.includes('unchanged · no action admitted'), `separated design admitted no action (t=${t.toFixed(1)})`);
    }
  }
});
