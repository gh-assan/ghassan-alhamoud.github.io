const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const sine = x => -(Math.cos(Math.PI * x) - 1) / 2;
const ease = {
  inOutSine: sine,
  outQuart: x => 1 - (1 - x) ** 4,
  outCubic: x => 1 - (1 - x) ** 3,
  outBack: x => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2,
};

function scene(name) {
  let definition;
  const calls = { nodes: [], chips: [], bars: [], tokens: [], labels: [] };
  const lib = {
    E: ease, seg, clamp, lerp: (a, b, t) => a + (b - a) * t,
    hold: (t, a, b, edge = 0.3) => sine(seg(t, a, a + edge)) * (1 - sine(seg(t, b - edge, b))),
    col: tone => tone,
    path: points => ({ at: u => {
      const lengths = points.slice(1).map((point, i) => Math.hypot(point[0] - points[i][0], point[1] - points[i][1]));
      let distance = u * lengths.reduce((a, b) => a + b, 0);
      for (let i = 0; i < lengths.length; i++) {
        if (distance <= lengths[i]) {
          const fraction = distance / lengths[i];
          return { x: points[i][0] + (points[i + 1][0] - points[i][0]) * fraction,
            y: points[i][1] + (points[i + 1][1] - points[i][1]) * fraction };
        }
        distance -= lengths[i];
      }
      return { x: points.at(-1)[0], y: points.at(-1)[1] };
    } }), arrow: () => {},
    node: (_, options) => calls.nodes.push(options),
    chip: (_, label, x, y) => calls.chips.push({ label, x, y }),
    token: (_, x, y) => calls.tokens.push({ x, y }),
    text: (_, label, x, y) => calls.labels.push({ label, x, y }),
    spark: () => {},
  };
  const source = fs.readFileSync(path.join(root, 'assets/js/motion', `scene-${name}.js`), 'utf8');
  const Motion = { lib, register: (_, def) => { definition = def; } };
  vm.runInNewContext(source, { window: { Motion }, Motion, Math });
  assert.ok(definition, `${name} registered`);
  return { definition, calls };
}

for (const name of ['tamoz', 'scaleshop']) {
  test(`${name} phone drawing keeps key geometry on the stage`, () => {
    const { definition, calls } = scene(name);
    for (const width of [320, 375]) {
      for (const time of [0, 5.5, 7.5, 10.3]) {
        for (const values of Object.values(calls)) values.length = 0;
        const stageWidth = width - 50;
        const s = {
          compact: true, w: stageWidth, h: stageWidth * 3 / 4,
          clock: time, g: { fillRect: (x, y, w, h) => calls.bars.push({ x, y, w, h }) },
        };
        definition.draw(s, time);
        assert.ok(calls.nodes.length >= 3, `${name} draws its system at ${width}px`);
        for (const node of calls.nodes) {
          assert.ok(node.x - node.w / 2 >= 0 && node.x + node.w / 2 <= s.w,
            `${name} node ${node.title} fits horizontally at ${width}px`);
          assert.ok(node.y - node.h / 2 >= 0 && node.y + node.h / 2 < s.h - 35,
            `${name} node ${node.title} clears the beat rail at ${width}px`);
        }
        for (let i = 0; i < calls.nodes.length; i++) {
          for (let j = i + 1; j < calls.nodes.length; j++) {
            const a = calls.nodes[i], b = calls.nodes[j];
            const overlapX = Math.abs(a.x - b.x) < (a.w + b.w) / 2;
            const overlapY = Math.abs(a.y - b.y) < (a.h + b.h) / 2;
            assert.ok(!(overlapX && overlapY), `${name} ${a.title}/${b.title} do not overlap at ${width}px`);
          }
        }
        for (const chip of calls.chips) {
          assert.ok(chip.y < 60, `${name} chip clears the topology and beat rail`);
        }
      }
    }
  });
}

test('Tamoz compact policy never fills beyond the firmware ceiling', () => {
  const { definition, calls } = scene('tamoz');
  const s = { compact: true, w: 325, h: 244, clock: 8.1,
    g: { fillRect: (x, y, w, h) => calls.bars.push({ x, y, w, h }) } };
  definition.draw(s, 8.1);
  assert.ok(calls.bars[1].w > 0);
  assert.ok(calls.bars[1].w <= 78 * 0.6);
});

test('ScaleShop compact routing introduces the cache after the decision', () => {
  const { definition, calls } = scene('scaleshop');
  const s = { compact: true, w: 325, h: 244, clock: 0, g: {} };
  definition.draw(s, 0);
  assert.ok(!calls.nodes.some(node => node.title === 'cache'));
  s.clock = 10.3;
  definition.draw(s, 10.3);
  assert.ok(calls.nodes.some(node => node.title === 'cache'));
});
