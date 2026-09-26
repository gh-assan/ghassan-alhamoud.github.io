/**
 * hero-loop.js — brings the home-page checkpoint-loop diagram to life.
 *
 * Progressive enhancement of the existing SVG: the static diagram is the
 * no-JS and reduced-motion state, untouched. With motion allowed, one
 * run plays every 10 s: an event enters the runtime, plan → act → observe
 * each write a checkpoint, the act step asks the human gate, the eval
 * harness replays the checkpoints into the evidence log, and the evidence
 * feeds the next run. Pauses off-screen / in background tabs; a pause
 * control satisfies WCAG 2.2.2. Contract: docs/animation/00-quality-bar.md
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !document.querySelector) return;

  var NS = 'http://www.w3.org/2000/svg';
  var DUR = 10;

  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function seg(t, a, b) { return clamp((t - a) / (b - a)); }
  function inOut(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function outCubic(x) { return 1 - Math.pow(1 - x, 3); }
  // 0 → 1 → 0 across [a, b] with eased shoulders.
  function hold(t, a, b, e) {
    e = e || 0.3;
    return outCubic(seg(t, a, a + e)) * (1 - inOut(seg(t, b - e, b)));
  }
  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  // One travelling token: halo + core, positioned along a path element.
  function makeToken(layer, tone) {
    var g = el('g', { opacity: 0 }, layer);
    el('circle', { r: 7, fill: tone, opacity: 0.16 }, g);
    el('circle', { r: 3.2, fill: tone }, g);
    return g;
  }
  function place(tok, p, u, alpha) {
    if (u <= 0 || u >= 1) { tok.setAttribute('opacity', 0); return; }
    var pt = p.getPointAtLength(inOut(u) * p.getTotalLength());
    tok.setAttribute('transform', 'translate(' + pt.x.toFixed(2) + ' ' + pt.y.toFixed(2) + ')');
    // fade in/out over the first/last 12% so tokens never pop
    tok.setAttribute('opacity', ((alpha || 1) * Math.min(1, u / 0.12, (1 - u) / 0.12)).toFixed(3));
  }

  function loop(fig) {
    var svg = fig.querySelector('svg');
    function q(name) { return svg.querySelector('[data-hl="' + name + '"]'); }
    var box = {};
    ['events', 'runtime', 'sqlite', 'gate', 'eval', 'evidence'].forEach(function (n) { box[n] = q(n); });
    var words = { plan: q('plan'), act: q('act'), observe: q('observe'), approve: q('approve') };
    var retLabel = q('return-label');
    if (!box.runtime || !words.plan) return;

    var layer = el('g', { 'pointer-events': 'none' }, svg);
    var under = el('g', { 'pointer-events': 'none' });
    var defs = svg.querySelector('defs');
    svg.insertBefore(under, defs ? defs.nextSibling : svg.firstChild);

    // Halo behind each box, driven per frame.
    var halo = {};
    Object.keys(box).forEach(function (n) {
      var b = box[n];
      halo[n] = el('rect', {
        x: +b.getAttribute('x') - 3, y: +b.getAttribute('y') - 3,
        width: +b.getAttribute('width') + 6, height: +b.getAttribute('height') + 6,
        rx: 11, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 5, opacity: 0
      }, under);
    });
    halo.gate.setAttribute('stroke', 'var(--success)');

    // Invisible travel paths (viewBox units).
    var P = {};
    var D = {
      ingest: 'M 100 168 L 146 155',
      cp: 'M 256 196 L 256 234',
      ask: 'M 364 130 L 402 130',
      back: 'M 404 118 L 366 118',
      replay: 'M 364 262 C 384 262 382 232 398 228',
      record: 'M 454 248 L 454 286',
      feed: box.events && q('return') ? q('return').getAttribute('d') : ''
    };
    Object.keys(D).forEach(function (k) {
      P[k] = el('path', { d: D[k], fill: 'none', stroke: 'none' }, layer);
    });

    // Checkpoint slots inside sqlite; evidence rows inside the log.
    var slots = [0, 1, 2].map(function (i) {
      return el('rect', { x: 318 + i * 13, y: 244, width: 9, height: 9, rx: 2,
        fill: 'var(--accent)', stroke: 'var(--accent)', 'stroke-width': 1, 'fill-opacity': 0, opacity: 0 }, layer);
    });
    var rows = [0, 1, 2].map(function (i) {
      return el('rect', { x: 422 + i * 22, y: 325, width: 18, height: 2.5, rx: 1.25,
        fill: 'var(--accent)', opacity: 0 }, layer);
    });

    var tk = {
      main: makeToken(layer, 'var(--accent)'),
      cp: makeToken(layer, 'var(--accent)'),
      gate: makeToken(layer, 'var(--success)'),
      replay: makeToken(layer, 'var(--accent)')
    };

    // Beat windows (seconds within the 10 s run).
    var CP = [[1.25, 1.75], [3.55, 4.05], [4.75, 5.25]];
    var clock = 0, last = 0, raf = 0, visible = false, paused = false, runs = 0;

    function word(name, on) {
      var w = words[name];
      if (!w) return;
      var col = name === 'approve' ? 'var(--success)' : 'var(--accent)';
      w.style.transition = 'fill 0.35s ease';
      w.style.fill = on ? col : '';
    }

    function draw(t, run) {
      // tokens
      place(tk.main, P.ingest, seg(t, 0.1, 0.8));
      var cpU = 0;
      CP.forEach(function (w) { if (t >= w[0] && t <= w[1]) cpU = seg(t, w[0], w[1]); });
      place(tk.cp, P.cp, cpU, 0.9);
      place(tk.gate, t < 3 ? P.ask : P.back, t < 3 ? seg(t, 2.1, 2.65) : seg(t, 3.05, 3.6));
      if (t < 3 && t >= 2.1) tk.gate.firstChild.nextSibling.setAttribute('fill', 'var(--accent)');
      else tk.gate.firstChild.nextSibling.setAttribute('fill', 'var(--success)');
      place(tk.replay, P.replay, seg(t, 5.45, 6.15));
      if (t >= 6.55 && t < 7.2) place(tk.main, P.record, seg(t, 6.55, 7.15));
      else if (t >= 7.3) place(tk.main, P.feed, seg(t, 7.3, 9.0), 0.9);

      // words: plan → act → observe
      word('plan', t >= 0.85 && t < 1.95);
      word('act', t >= 1.95 && t < 4.15);
      word('observe', t >= 4.15 && t < 5.4);
      word('approve', t >= 2.75 && t < 3.6);

      // box halos (one focal point at a time)
      var h = {
        events: Math.max(hold(t, 0, 0.5, 0.25) * 0.8, hold(t, 8.85, 9.6, 0.3)),
        runtime: hold(t, 0.7, 5.45, 0.35) * 0.55 + hold(t, 0.7, 1.3, 0.25) * 0.45,
        sqlite: Math.max(hold(t, 1.7, 2.2), hold(t, 4.0, 4.5), hold(t, 5.2, 5.8)),
        gate: hold(t, 2.6, 3.4),
        eval: hold(t, 6.1, 6.8),
        evidence: hold(t, 7.1, 7.8)
      };
      Object.keys(h).forEach(function (n) { halo[n].setAttribute('opacity', (h[n] * 0.22).toFixed(3)); });

      // checkpoint slots fill per step, clear during the rest beat
      var clear = 1 - seg(t, 9.2, 9.8);
      slots.forEach(function (sl, i) {
        var on = outCubic(seg(t, CP[i][1] - 0.05, CP[i][1] + 0.3));
        sl.setAttribute('opacity', (Math.max(0.35, on) * clear).toFixed(3));
        sl.setAttribute('fill-opacity', (on * 0.85).toFixed(3));
      });
      // evidence rows accumulate across three runs, then roll over
      var n = run % 3;
      var roll = n === 2 ? 1 - seg(t, 9.3, 9.9) : 1;
      rows.forEach(function (r, i) {
        var o = i < n ? 1 : i === n ? outCubic(seg(t, 7.1, 7.5)) : 0;
        r.setAttribute('opacity', (o * 0.8 * roll).toFixed(3));
      });

      if (retLabel) {
        retLabel.style.transition = 'fill 0.4s ease';
        retLabel.style.fill = t >= 7.4 && t < 9.1 ? 'var(--accent)' : '';
      }
    }

    function frame(now) {
      raf = 0;
      if (!visible || paused || document.hidden) return;
      var dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      clock += dt;
      runs = Math.floor(clock / DUR);
      draw(clock % DUR, runs);
      raf = requestAnimationFrame(frame);
    }
    function wake() {
      last = 0;
      if (!raf && visible && !paused && !document.hidden) raf = requestAnimationFrame(frame);
    }

    // Pause control in the caption row.
    var cap = fig.querySelector('figcaption');
    if (cap) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'scene__toggle loop-toggle';
      btn.setAttribute('aria-label', 'Pause diagram animation');
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path class="i-pause" d="M5 3.5v9M11 3.5v9"/><path class="i-play" d="M5.5 3.5v9l7-4.5z"/></svg>';
      btn.addEventListener('click', function () {
        paused = !paused;
        btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        btn.setAttribute('aria-label', paused ? 'Play diagram animation' : 'Pause diagram animation');
        btn.classList.toggle('scene__toggle--paused', paused);
        wake();
      });
      cap.appendChild(btn);
    }

    draw(0, 0);
    function go() {
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) {
          visible = en[0].isIntersecting;
          wake();
        }, { threshold: 0.2 }).observe(fig);
      } else {
        visible = true;
        wake();
      }
      document.addEventListener('visibilitychange', wake);
    }
    // Start after the page-transition overlay has faded out.
    if (document.readyState === 'complete') setTimeout(go, 400);
    else window.addEventListener('load', function () { setTimeout(go, 400); });
    fig.__loop = { seek: function (t) { paused = true; clock = t; draw(t % DUR, Math.floor(t / DUR)); } };
  }

  // Mobile signature strip: a single 4 s pass, then it rests (under 5 s,
  // so no control is needed).
  function strip(fig) {
    var svg = fig.querySelector('svg');
    var rects = [0, 1, 2, 3].map(function (i) { return svg.querySelector('[data-hl="s' + i + '"]'); });
    if (!rects[0]) return;
    var tok = makeToken(svg, 'var(--accent)');
    var p = el('path', { d: 'M 8 28 L 308 28', fill: 'none', stroke: 'none' }, svg);
    var halos = rects.map(function (r) {
      return el('rect', { x: +r.getAttribute('x') - 2, y: 8, width: 66, height: 40, rx: 10,
        fill: 'none', stroke: 'var(--accent)', 'stroke-width': 4, opacity: 0 }, svg);
    });
    var t0 = 0, done = false;
    function frame(now) {
      if (!t0) t0 = now;
      var t = (now - t0) / 1000;
      place(tok, p, seg(t, 0.2, 3.6));
      halos.forEach(function (h, i) {
        var c = 0.35 + i * 0.95;
        h.setAttribute('opacity', (hold(t, c, c + 0.9, 0.3) * 0.25).toFixed(3));
      });
      if (t < 4) requestAnimationFrame(frame);
    }
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (en, obs) {
      if (en[0].isIntersecting && !done && !document.hidden) {
        done = true;
        obs.disconnect();
        setTimeout(function () { requestAnimationFrame(frame); }, 500);
      }
    }, { threshold: 0.5 }).observe(fig);
  }

  function boot() {
    var fig = document.querySelector('.hero__artifact[data-loop]');
    if (fig) loop(fig);
    var s = document.querySelector('.hero__signature[data-loop-strip]');
    if (s) strip(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
