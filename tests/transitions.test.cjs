const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
function setup(path = '/', reduce = false) {
  const callbacks = {}, timers = [], classes = new Set(); let handler;
  const overlay = { setAttribute() {}, classList: { add: x => classes.add(x), remove: x => classes.delete(x) } };
  const url = new URL(path, 'https://example.com');
  const location = {
    get href() { return url.href; }, set href(value) { url.href = new URL(value, url.href).href; },
    get origin() { return url.origin; }, get pathname() { return url.pathname; },
    get search() { return url.search; }, get hash() { return url.hash; }, get protocol() { return url.protocol; },
  };
  const window = { location, matchMedia: () => ({ matches: reduce }), addEventListener: (name, fn) => { callbacks[name] = fn; } };
  const document = { createElement: () => overlay, body: { appendChild() {} }, addEventListener: (_, fn) => { handler = fn; } };
  vm.runInNewContext(readFileSync(join(__dirname, '../assets/js/transitions.js'), 'utf8'), {
    document, window, URL, setTimeout: fn => timers.push(fn),
  });
  const click = (href, attrs = {}, modifiers = {}) => {
    const link = { getAttribute: k => k === 'href' ? href : attrs[k], hasAttribute: k => k in attrs };
    const event = { button: 0, target: { closest: () => link }, preventDefault() { this.prevented = true; }, ...modifiers };
    if (handler) handler(event);
    return event;
  };
  return { click, timers, classes, callbacks, location };
}

test('home section anchors scroll natively without leaving a transition overlay', () => {
  for (const href of ['/#handbook', '/#contact', '#about']) {
    const s = setup(); assert.ok(!s.click(href).prevented); assert.equal(s.classes.size, 0);
    assert.equal(s.timers.length, 0);
  }
});

test('a section link from another route performs a real document navigation', () => {
  const s = setup('/projects/'); assert.ok(s.click('/#handbook').prevented);
  assert.ok(s.classes.has('page-transition--active')); s.timers[0]();
  assert.equal(s.location.pathname, '/'); assert.equal(s.location.hash, '#handbook');
});

test('modified, download, new-tab, and mail links keep native behavior', () => {
  for (const [href, attrs, modifiers] of [
    ['/projects/', {}, { ctrlKey: true }], ['/projects/', { download: '' }, {}],
    ['/projects/', { target: '_blank' }, {}], ['mailto:test@example.com', {}, {}],
  ]) assert.ok(!setup().click(href, attrs, modifiers).prevented);
});

test('back/forward restoration clears the overlay and permits another route', () => {
  const s = setup(); s.click('/projects/'); s.callbacks.pageshow();
  assert.equal(s.classes.size, 0); assert.ok(s.click('/articles/').prevented);
  assert.equal(s.timers.length, 2);
});

test('reduced motion uses immediate native navigation', () => {
  const s = setup('/', true); assert.ok(!s.click('/projects/').prevented); assert.equal(s.timers.length, 0);
});
