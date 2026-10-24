const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

function setup() {
  let document;
  class Element {
    constructor(id = '') {
      this.id = id; this.attrs = new Map(); this.children = []; this.events = {};
      this.style = { overflow: '' }; this.classes = new Set();
      this.classList = {
        add: name => this.classes.add(name), remove: name => this.classes.delete(name),
        toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name),
      };
    }
    appendChild(child) { this.children.push(child); child.parentElement = this; }
    setAttribute(k, v) { this.attrs.set(k, v); }
    getAttribute(k) { return this.attrs.get(k) ?? null; }
    hasAttribute(k) { return this.attrs.has(k); }
    removeAttribute(k) { this.attrs.delete(k); }
    addEventListener(k, callback) { this.events[k] = callback; }
    contains(el) { return el === this || this.children.some(c => c.contains(el)); }
    focus() { document.activeElement = this; }
    querySelector() { return this.children[0]; }
    querySelectorAll() { return this.children; }
  }
  const body = new Element(), header = new Element('header'), nav = new Element();
  const logo = new Element(), toggle = new Element('navToggle'), menu = new Element('navMenu');
  const main = new Element(), footer = new Element();
  body.appendChild(header); body.appendChild(main); body.appendChild(footer);
  header.appendChild(nav); nav.appendChild(logo); nav.appendChild(toggle); nav.appendChild(menu);
  const links = Array.from({ length: 5 }, () => new Element());
  links.forEach(link => menu.appendChild(link)); toggle.setAttribute('aria-expanded', 'false');
  const query = { matches: true, addEventListener: (_, fn) => { query.change = fn; } };
  document = {
    body, activeElement: body, events: {}, createElement: () => new Element(),
    getElementById: id => ({ header, navToggle: toggle, navMenu: menu })[id],
    querySelectorAll: selector => selector === '.nav__link' ? links : [],
    addEventListener: (key, fn) => { document.events[key] = fn; },
  };
  const window = { matchMedia: () => query, scrollY: 0, addEventListener() {} };
  vm.runInNewContext(readFileSync(join(__dirname, '../assets/js/nav.js'), 'utf8'), { document, window });
  const key = (name, shiftKey = false) => {
    const event = { key: name, shiftKey, prevented: false, preventDefault() { this.prevented = true; } };
    document.events.keydown(event); return event;
  };
  return { body, header, logo, toggle, menu, main, footer, links, query, document, key,
    open: () => toggle.events.click(), scrim: body.children.at(-1) };
}

test('closed drawer is inert; opening isolates background and focuses first destination', () => {
  const s = setup(); assert.ok(s.menu.hasAttribute('inert'));
  s.open(); assert.equal(s.document.activeElement, s.links[0]);
  for (const el of [s.main, s.footer, s.logo]) assert.ok(el.hasAttribute('inert'));
  assert.ok(!s.toggle.hasAttribute('inert')); assert.ok(!s.menu.hasAttribute('inert'));
  assert.equal(s.toggle.getAttribute('aria-controls'), 'navMenu');
});

test('forward and reverse keyboard boundaries wrap through the close toggle', () => {
  const s = setup(); s.open(); s.links.at(-1).focus();
  assert.ok(s.key('Tab').prevented); assert.equal(s.document.activeElement, s.toggle);
  assert.ok(s.key('Tab', true).prevented); assert.equal(s.document.activeElement, s.links.at(-1));
});

test('Escape restores prior overflow, focus, and preexisting inert state', () => {
  const s = setup(); s.body.style.overflow = 'clip'; s.footer.setAttribute('inert', '');
  s.open(); assert.equal(s.body.style.overflow, 'hidden'); s.key('Escape');
  assert.equal(s.body.style.overflow, 'clip'); assert.equal(s.document.activeElement, s.toggle);
  assert.ok(!s.main.hasAttribute('inert')); assert.ok(s.footer.hasAttribute('inert'));
  assert.ok(s.menu.hasAttribute('inert'));
});

test('open mobile drawer reconciles at desktop breakpoint without focusing hidden toggle', () => {
  const s = setup(); s.open(); s.query.matches = false; s.query.change();
  assert.equal(s.toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(s.body.style.overflow, ''); assert.ok(!s.main.hasAttribute('inert'));
  assert.ok(!s.menu.hasAttribute('inert')); assert.notEqual(s.document.activeElement, s.toggle);
  s.query.matches = true; s.query.change(); assert.ok(s.menu.hasAttribute('inert'));
});

for (const dismiss of ['scrim', 'route']) {
  test(`${dismiss} dismissal unlocks background`, () => {
    const s = setup(); s.open();
    if (dismiss === 'scrim') s.scrim.events.click(); else s.links[0].events.click();
    assert.equal(s.toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(s.body.style.overflow, ''); assert.ok(!s.main.hasAttribute('inert'));
  });
}
