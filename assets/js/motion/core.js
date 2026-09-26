/**
 * motion/core.js — shared runtime for the illustrative canvas scenes.
 *
 * Contract (docs/animation/00-quality-bar.md):
 *  - Scenes register with Motion.register(name, def) and mount on
 *    <figure class="scene" data-scene="name" data-label="...">.
 *  - One shared rAF loop; a scene ticks only while on-screen and the tab
 *    is visible, and the loop stops when nothing is active.
 *  - prefers-reduced-motion: a single static poster frame, no autoplay.
 *  - Every colour comes from the CSS theme tokens; theme changes recolour.
 *  - A scene that throws is contained; the page keeps working.
 */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var defs = {};
  var insts = [];
  var colors = null;
  var raf = 0;
  var started = false;
  var sprites = {};

  // ---------------------------------------------------------------- math
  var E = {
    linear: function (x) { return x; },
    inCubic: function (x) { return x * x * x; },
    outCubic: function (x) { return 1 - Math.pow(1 - x, 3); },
    inOutCubic: function (x) {
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    },
    outQuart: function (x) { return 1 - Math.pow(1 - x, 4); },
    inOutSine: function (x) { return -(Math.cos(Math.PI * x) - 1) / 2; },
    outBack: function (x) {
      var c1 = 1.2, c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }
  };
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  // Progress of t through [a, b], clamped to 0..1 — the beat helper.
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  // 0 → 1 → 0 across [a, b] with eased shoulders of width `edge`.
  function hold(t, a, b, edge) {
    edge = edge || 0.3;
    return E.inOutSine(seg(t, a, a + edge)) * (1 - E.inOutSine(seg(t, b - edge, b)));
  }
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var r = Math.imul(seed ^ seed >>> 15, 1 | seed);
      r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r;
      return ((r ^ r >>> 14) >>> 0) / 4294967296;
    };
  }

  // -------------------------------------------------------------- colour
  function parse(v) {
    v = (v || '').trim();
    if (v[0] === '#') {
      if (v.length === 4) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
      var n = parseInt(v.slice(1, 7), 16);
      return [n >> 16 & 255, n >> 8 & 255, n & 255];
    }
    var m = v.match(/[\d.]+/g);
    return m ? [+m[0], +m[1], +m[2]] : [128, 128, 128];
  }
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    function t(n) { return parse(cs.getPropertyValue(n)); }
    var c = {
      accent: t('--accent'), info: t('--success'), warn: t('--warning'),
      bad: t('--error'), text: t('--text-primary'), text2: t('--text-secondary'),
      muted: t('--text-muted'), border: t('--border'), bg: t('--bg-primary'),
      bg2: t('--bg-secondary'), bg3: t('--bg-tertiary')
    };
    c.dark = (c.bg[0] + c.bg[1] + c.bg[2]) / 3 < 110;
    return c;
  }
  // col('accent', .5) or col([r,g,b], .5) → css colour string
  function col(k, a) {
    var c = typeof k === 'string' ? colors[k] : k;
    return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' +
      (a === undefined ? 1 : clamp(a, 0, 1)) + ')';
  }
  function mix(a, b, t) {
    a = typeof a === 'string' ? colors[a] : a;
    b = typeof b === 'string' ? colors[b] : b;
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  }

  // ---------------------------------------------------------- primitives
  function rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function font(size, weight, mono) {
    return (weight || 500) + ' ' + size + 'px ' + (mono
      ? "'SFMono-Regular', Consolas, Menlo, monospace"
      : "Inter, -apple-system, 'Segoe UI', sans-serif");
  }

  // Text; o.key → uppercase key-label style (.dg-k).
  function text(s, str, x, y, o) {
    o = o || {};
    var g = s.g;
    var size = o.size || (o.key ? 10 : 12);
    g.font = font(size, o.weight || (o.key ? 700 : 600), o.mono);
    g.textAlign = o.align || 'center';
    g.textBaseline = o.baseline || 'middle';
    if ('letterSpacing' in g) g.letterSpacing = o.key ? '0.08em' : '0px';
    g.fillStyle = col(o.color || (o.key ? 'muted' : 'text'), o.alpha === undefined ? 1 : o.alpha);
    if (o.key && s.w) {
      // key labels never run off the stage
      var hw = g.measureText(String(str).toUpperCase()).width;
      var lo = g.textAlign === 'left' ? 8 : g.textAlign === 'right' ? 8 + hw : 8 + hw / 2;
      x = clamp(x, lo, s.w - 8 - (g.textAlign === 'left' ? hw : g.textAlign === 'right' ? 0 : hw / 2));
    }
    g.fillText(o.key ? String(str).toUpperCase() : str, x, y);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
  }
  function measure(s, str, o) {
    o = o || {};
    s.g.font = font(o.size || (o.key ? 10 : 12), o.weight || (o.key ? 700 : 600), o.mono);
    if ('letterSpacing' in s.g) s.g.letterSpacing = o.key ? '0.08em' : '0px';
    var w = s.g.measureText(o.key ? String(str).toUpperCase() : str).width;
    if ('letterSpacing' in s.g) s.g.letterSpacing = '0px';
    return w;
  }

  // Node box centred on (x, y). emph 0..1 moves border/glow toward tone.
  function node(s, o) {
    var g = s.g, a = o.alpha === undefined ? 1 : o.alpha;
    var tone = o.tone || 'accent', e = o.emph || 0;
    var x = o.x - o.w / 2, y = o.y - o.h / 2;
    if (e > 0.01) {
      rr(g, x - 3, y - 3, o.w + 6, o.h + 6, 10);
      g.strokeStyle = col(tone, 0.16 * e * a);
      g.lineWidth = 5;
      g.stroke();
    }
    rr(g, x, y, o.w, o.h, o.r || 7);
    g.fillStyle = col(o.fill ? mix(o.fill, tone, 0.06 * e) : mix('bg', tone, 0.07 * e), a);
    g.fill();
    g.strokeStyle = col(mix(o.base || 'border', tone, Math.max(e, o.tint || 0)), a);
    g.lineWidth = 1.25 + 0.5 * e;
    if (o.dash) g.setLineDash(o.dash);
    g.stroke();
    g.setLineDash([]);
    var ty = o.sub ? o.y - 7 : o.y;
    if (o.title) text(s, o.title, o.x, ty, { size: o.size || 12, alpha: a });
    if (o.sub) text(s, o.sub, o.x, o.y + 9, { size: 10, weight: 500, color: 'text2', alpha: a });
  }

  // Pill chip; returns its width.
  function chip(s, str, x, y, o) {
    o = o || {};
    var g = s.g, a = o.alpha === undefined ? 1 : o.alpha, e = o.emph || 0;
    var tone = o.tone || 'accent';
    var ts = o.code ? { mono: true, size: 10.5, weight: 500 } : { key: true };
    var w = measure(s, str, ts) + 16, h = 20;
    var left = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
    left = clamp(left, 8, s.w - w - 8); // chips never leave the stage
    rr(g, left, y - h / 2, w, h, h / 2);
    g.fillStyle = col(mix('bg', tone, 0.1 * e), a);
    g.fill();
    g.strokeStyle = col(mix('border', tone, e), a);
    g.lineWidth = 1;
    g.stroke();
    ts.color = e > 0.5 ? tone : 'muted';
    ts.alpha = a;
    text(s, str, left + w / 2, y + 0.5, ts);
    return w;
  }

  function sprite(c) {
    var key = c.join(',');
    if (sprites[key]) return sprites[key];
    var cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    var g = cv.getContext('2d');
    var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, col(c, 0.55));
    gr.addColorStop(0.35, col(c, 0.18));
    gr.addColorStop(1, col(c, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return (sprites[key] = cv);
  }

  // Moving token: soft halo + solid core.
  function token(s, x, y, o) {
    o = o || {};
    var g = s.g, a = o.alpha === undefined ? 1 : o.alpha;
    var c = typeof o.tone === 'object' ? o.tone : colors[o.tone || 'accent'];
    var r = o.r || 3.2;
    if (a <= 0.01) return;
    var halo = r * (o.halo || 5) * (colors.dark ? 1 : 0.8);
    g.globalAlpha = a * (colors.dark ? 1 : 0.75);
    g.drawImage(sprite(c), x - halo, y - halo, halo * 2, halo * 2);
    g.globalAlpha = 1;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = col(c, a);
    g.fill();
  }

  // Token with a fading trail; at(u) → {x, y}. Trail length in u units.
  function trail(s, at, u, o) {
    o = o || {};
    var n = o.n || 7, len = o.len || 0.12, a = o.alpha === undefined ? 1 : o.alpha;
    var g = s.g, c = colors[o.tone || 'accent'];
    for (var i = n; i >= 1; i--) {
      var uu = u - len * i / n;
      if (uu < 0) continue;
      var p = at(uu), k = 1 - i / (n + 1);
      g.beginPath();
      g.arc(p.x, p.y, (o.r || 3.2) * (0.35 + 0.5 * k), 0, Math.PI * 2);
      g.fillStyle = col(c, a * 0.4 * k);
      g.fill();
    }
    var q = at(u);
    token(s, q.x, q.y, o);
    return q;
  }

  // Polyline path with arc-length parameterisation.
  function path(pts) {
    var L = [0];
    for (var i = 1; i < pts.length; i++) {
      L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    var len = L[L.length - 1] || 1;
    function at(u) {
      var d = clamp(u, 0, 1) * len, i = 1;
      while (i < L.length - 1 && L[i] < d) i++;
      var sl = L[i] - L[i - 1] || 1, k = (d - L[i - 1]) / sl;
      var p = pts[i - 1], q = pts[i];
      return { x: lerp(p[0], q[0], k), y: lerp(p[1], q[1], k), a: Math.atan2(q[1] - p[1], q[0] - p[0]) };
    }
    function trace(g, u0, u1) {
      var d0 = clamp(u0, 0, 1) * len, d1 = clamp(u1, 0, 1) * len;
      var p = at(u0);
      g.beginPath();
      g.moveTo(p.x, p.y);
      for (var i = 1; i < pts.length - 1; i++) {
        if (L[i] > d0 && L[i] < d1) g.lineTo(pts[i][0], pts[i][1]);
      }
      p = at(u1);
      g.lineTo(p.x, p.y);
    }
    return { pts: pts, len: len, at: at, trace: trace };
  }
  // Cubic bezier sampled to points.
  function bez(p0, p1, p2, p3, n) {
    var out = [];
    n = n || 24;
    for (var i = 0; i <= n; i++) {
      var t = i / n, u = 1 - t;
      out.push([
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
      ]);
    }
    return out;
  }

  // Stroke a path (partially), optional arrowhead at the drawn end.
  function arrow(s, p, o) {
    o = o || {};
    var g = s.g, a = o.alpha === undefined ? 1 : o.alpha;
    var u0 = o.from || 0, u1 = o.to === undefined ? 1 : o.to;
    if (u1 - u0 <= 0.001 || a <= 0.01) return;
    var c = col(o.tone || 'muted', a);
    p.trace(g, u0, u1);
    g.strokeStyle = c;
    g.lineWidth = o.width || 1.25;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    if (o.dash) g.setLineDash(o.dash);
    g.stroke();
    g.setLineDash([]);
    if (o.head !== false && u1 > 0.02) {
      var e = p.at(u1), hs = o.headSize || 6.5;
      g.save();
      g.translate(e.x, e.y);
      g.rotate(e.a);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(-hs, -hs * 0.55);
      g.lineTo(-hs, hs * 0.55);
      g.closePath();
      g.fillStyle = c;
      g.fill();
      g.restore();
    }
  }

  // Tick/cross glyphs centred at (x, y) drawn to `p` progress.
  function glyph(s, kind, x, y, o) {
    o = o || {};
    var g = s.g, r = o.r || 5, p = o.p === undefined ? 1 : o.p;
    if (p <= 0) return;
    g.strokeStyle = col(o.tone || (kind === 'tick' ? 'info' : 'bad'), o.alpha === undefined ? 1 : o.alpha);
    g.lineWidth = o.width || 1.75;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    var pts = kind === 'tick'
      ? path([[x - r, y], [x - r * 0.3, y + r * 0.7], [x + r, y - r * 0.7]])
      : null;
    if (pts) { pts.trace(g, 0, p); g.stroke(); return; }
    var k = r * 0.8, p1 = Math.min(p * 2, 1), p2 = Math.max(p * 2 - 1, 0);
    g.beginPath();
    g.moveTo(x - k, y - k); g.lineTo(x - k + 2 * k * p1, y - k + 2 * k * p1);
    if (p2 > 0) { g.moveTo(x + k, y - k); g.lineTo(x + k - 2 * k * p2, y - k + 2 * k * p2); }
    g.stroke();
  }

  // Sparkline in a box; values in 0..1.
  function spark(s, x, y, w, h, vals, o) {
    o = o || {};
    var g = s.g;
    g.beginPath();
    for (var i = 0; i < vals.length; i++) {
      var px = x + (i / (vals.length - 1)) * w, py = y + h - clamp(vals[i], 0, 1) * h;
      if (i) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.strokeStyle = col(o.tone || 'accent', o.alpha === undefined ? 1 : o.alpha);
    g.lineWidth = 1.5;
    g.lineJoin = 'round';
    g.stroke();
  }

  // ------------------------------------------------------------------ 3D
  // y-up world; yaw about Y, pitch tilts the view down onto the XZ plane.
  function camera(o) {
    var cam = {
      yaw: o.yaw || 0, pitch: o.pitch || 0.5, dist: o.dist || 900, focal: o.focal || 900,
      cx: 0, cy: 0, scale: 1,
      project: function (x, y, z) {
        var cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
        var x1 = x * cy - z * sy, z1 = x * sy + z * cy;
        var cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
        var y1 = y * cp + z1 * sp, z2 = -y * sp + z1 * cp;
        var d = cam.dist + z2, k = cam.focal / d * cam.scale;
        return { x: cam.cx + x1 * k, y: cam.cy - y1 * k, d: z2, k: k };
      },
      // Atmospheric fade: 1 near, → floor at the far end of `range`.
      fade: function (d, range, floor) {
        return clamp(1 - (d + range) / (2 * range) * (1 - (floor || 0.45)), floor || 0.45, 1);
      }
    };
    return cam;
  }

  // Frame a 3D scene: project its extent points at scale 1, then scale and
  // centre them into the stage minus insets (projection is linear in both).
  function fit(s, cam, pts, ins) {
    ins = ins || {};
    var T = ins.top === undefined ? 28 : ins.top, B = ins.bottom === undefined ? 40 : ins.bottom;
    var Lf = ins.left === undefined ? 16 : ins.left, Rt = ins.right === undefined ? 16 : ins.right;
    cam.scale = 1; cam.cx = 0; cam.cy = 0;
    var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (var i = 0; i < pts.length; i++) {
      var q = cam.project(pts[i][0], pts[i][1], pts[i][2]);
      if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x;
      if (q.y < y0) y0 = q.y; if (q.y > y1) y1 = q.y;
    }
    var aw = s.w - Lf - Rt, ah = s.h - T - B;
    cam.scale = Math.min(aw / (x1 - x0), ah / (y1 - y0));
    cam.cx = Lf + aw / 2 - (x0 + x1) / 2 * cam.scale;
    cam.cy = T + ah / 2 - (y0 + y1) / 2 * cam.scale;
  }

  // Box with back-face culling; o.top/o.side colours, o.edge stroke.
  var BOX_FACES = [[4, 5, 6, 7], [0, 3, 2, 1], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 4, 7, 3]];
  function box3(s, cam, x, y, z, w, h, d, o) {
    o = o || {};
    var g = s.g, a = o.alpha === undefined ? 1 : o.alpha;
    var v = [
      [x - w / 2, y, z - d / 2], [x + w / 2, y, z - d / 2], [x + w / 2, y, z + d / 2], [x - w / 2, y, z + d / 2],
      [x - w / 2, y + h, z - d / 2], [x + w / 2, y + h, z - d / 2], [x + w / 2, y + h, z + d / 2], [x - w / 2, y + h, z + d / 2]
    ].map(function (p) { return cam.project(p[0], p[1], p[2]); });
    var tone = o.tone || 'accent', e = o.emph || 0;
    for (var f = 0; f < 6; f++) {
      var q = BOX_FACES[f];
      var area = 0;
      for (var i = 0; i < 4; i++) {
        var p1 = v[q[i]], p2 = v[q[(i + 1) % 4]];
        area += p1.x * p2.y - p2.x * p1.y;
      }
      if (area <= 0) continue;
      g.beginPath();
      g.moveTo(v[q[0]].x, v[q[0]].y);
      for (i = 1; i < 4; i++) g.lineTo(v[q[i]].x, v[q[i]].y);
      g.closePath();
      var shade = f === 0 ? 0 : f === 2 || f === 3 ? 0.05 : 0.09;
      var base = mix(o.fill || 'bg', colors.dark ? 'bg3' : 'text', shade);
      g.fillStyle = col(mix(base, tone, (f === 0 ? 0.14 : 0.08) * e + (o.tint || 0)), a);
      g.fill();
      g.strokeStyle = col(mix('border', tone, Math.max(e, o.edgeTint || 0)), a);
      g.lineWidth = 1;
      g.lineJoin = 'round';
      g.stroke();
    }
    return v;
  }

  // Circle in the XZ plane at height y (for orbits, plates).
  function ring3(s, cam, cx, y, cz, r, o) {
    o = o || {};
    var g = s.g, n = o.n || 64;
    g.beginPath();
    for (var i = 0; i <= n; i++) {
      var t = i / n * Math.PI * 2;
      var p = cam.project(cx + Math.cos(t) * r, y, cz + Math.sin(t) * r);
      if (i) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y);
    }
    if (o.fill) { g.fillStyle = o.fill; g.fill(); }
    if (o.stroke !== false) {
      g.strokeStyle = o.stroke || col('border', o.alpha === undefined ? 1 : o.alpha);
      g.lineWidth = o.width || 1;
      if (o.dash) g.setLineDash(o.dash);
      g.stroke();
      g.setLineDash([]);
    }
  }

  // Vertical cylinder standing on (x, y, z): the datastore primitive.
  function cyl3(s, cam, x, y, z, r, h, o) {
    o = o || {};
    var g = s.g, a = o.alpha === undefined ? 1 : o.alpha, n = 40;
    var tone = o.tone || 'accent', e = o.emph || 0;
    var top = [], bot = [], lo = 0, hi = 0;
    for (var i = 0; i < n; i++) {
      var t = i / n * Math.PI * 2, cx = x + Math.cos(t) * r, cz = z + Math.sin(t) * r;
      bot.push(cam.project(cx, y, cz));
      top.push(cam.project(cx, y + h, cz));
      if (bot[i].x < bot[lo].x) lo = i;
      if (bot[i].x > bot[hi].x) hi = i;
    }
    var fill = col(mix(mix(o.fill || 'bg', colors.dark ? 'bg3' : 'text', 0.06), tone, 0.08 * e + (o.tint || 0)), a);
    var edge = col(mix('border', o.edgeTone || tone, Math.max(e, o.edgeTint || 0)), a);
    // body: near half of the bottom rim + silhouette + top rim
    var dmax = Math.max(bot[lo].d, bot[hi].d), near = [];
    for (i = 0; i < n; i++) if (bot[i].d <= dmax) near.push(bot[i]);
    near.sort(function (p, q) { return p.x - q.x; });
    g.beginPath();
    g.moveTo(top[lo].x, top[lo].y);
    g.lineTo(bot[lo].x, bot[lo].y);
    for (i = 0; i < near.length; i++) g.lineTo(near[i].x, near[i].y);
    g.lineTo(bot[hi].x, bot[hi].y);
    g.lineTo(top[hi].x, top[hi].y);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.strokeStyle = edge;
    g.lineWidth = 1;
    if (o.dash) g.setLineDash(o.dash);
    g.stroke();
    g.beginPath();
    for (i = 0; i <= n; i++) {
      var p = top[i % n];
      if (i) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y);
    }
    g.fillStyle = col(mix(o.fill || 'bg', tone, 0.12 * e + (o.tint || 0)), a);
    g.fill();
    g.stroke();
    g.setLineDash([]);
    return { top: cam.project(x, y + h, z), bottom: cam.project(x, y, z) };
  }

  // --------------------------------------------------------- beat rail
  function rail(s, t) {
    var beats = s.def.beats;
    if (!beats) return;
    var g = s.g, n = beats.length, cur = 0;
    for (var i = 0; i < n; i++) if (t >= beats[i][0]) cur = i;
    var x = 14, y = s.h - 18, sw = s.compact ? 10 : 14;
    for (i = 0; i < n; i++) {
      var end = i < n - 1 ? beats[i + 1][0] : s.def.duration;
      var p = i < cur ? 1 : i > cur ? 0 : seg(t, beats[i][0], end);
      rr(g, x + i * (sw + 4), y - 1.5, sw, 3, 1.5);
      g.fillStyle = col('border', 0.9);
      g.fill();
      if (p > 0) {
        rr(g, x + i * (sw + 4), y - 1.5, sw * p, 3, 1.5);
        g.fillStyle = col(i === cur ? 'accent' : 'muted', i === cur ? 1 : 0.55);
        g.fill();
      }
    }
    var fadeIn = E.outCubic(seg(t, beats[cur][0], beats[cur][0] + 0.35));
    text(s, beats[cur][1], x + n * (sw + 4) + 6 + (1 - fadeIn) * 4, y + 0.5,
      { key: true, align: 'left', color: 'text2', alpha: fadeIn });
  }

  // ------------------------------------------------------------ runtime
  function render(s) {
    var g = s.g, t0 = performance.now();
    g.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    g.clearRect(0, 0, s.w, s.h);
    try {
      s.def.draw(s, s.clock % s.def.duration, s.dt);
      rail(s, s.clock % s.def.duration);
    } catch (err) {
      fail(s, err);
      return;
    }
    var ms = performance.now() - t0;
    s.stats.frames++;
    s.stats.total += ms;
    if (ms > s.stats.max) s.stats.max = ms;
  }

  function fail(s, err) {
    s.dead = true;
    s.fig.classList.add('scene--failed');
    if (s.canvas.parentNode) s.canvas.parentNode.removeChild(s.canvas);
    if (s.btn.parentNode) s.btn.parentNode.removeChild(s.btn);
    if (s.fallback) s.stage.appendChild(s.fallback);
    if (window.console) console.warn('[motion] scene "' + s.name + '" disabled:', err);
  }

  function resize(s) {
    var r = s.stage.getBoundingClientRect();
    if (!r.width) return;
    s.dpr = Math.min(window.devicePixelRatio || 1, 2);
    s.w = r.width;
    s.h = r.height;
    s.compact = s.w < 560;
    s.canvas.width = Math.round(s.w * s.dpr);
    s.canvas.height = Math.round(s.h * s.dpr);
    try { if (s.def.layout) s.def.layout(s); } catch (err) { fail(s, err); return; }
    render(s);
  }

  function frame(now) {
    raf = 0;
    var any = false;
    for (var i = 0; i < insts.length; i++) {
      var s = insts[i];
      if (s.dead || !s.visible || s.paused || reduceMotion || !started) continue;
      var dt = s.last ? Math.min((now - s.last) / 1000, 0.1) : 0;
      s.last = now;
      s.dt = dt;
      s.clock += dt;
      s.cycle = Math.floor(s.clock / s.def.duration);
      s.pointer.x += (s.pointer.tx - s.pointer.x) * (1 - Math.exp(-dt * 5));
      s.pointer.y += (s.pointer.ty - s.pointer.y) * (1 - Math.exp(-dt * 5));
      render(s);
      any = true;
    }
    if (any) wake();
  }
  function wake() {
    if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function setPaused(s, paused) {
    s.paused = paused;
    s.last = 0;
    s.btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    s.btn.setAttribute('aria-label', paused ? 'Play animation' : 'Pause animation');
    s.btn.classList.toggle('scene__toggle--paused', paused);
    if (!paused) wake();
  }

  function mount(fig) {
    var name = fig.getAttribute('data-scene'), def = defs[name];
    if (!def || fig.__motion) return;
    var stage = fig.querySelector('.scene__stage');
    if (!stage) {
      stage = document.createElement('div');
      stage.className = 'scene__stage';
      fig.insertBefore(stage, fig.firstChild);
    }
    var fallback = stage.firstElementChild;
    var canvas = document.createElement('canvas');
    canvas.className = 'scene__canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', fig.getAttribute('data-label') || '');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'scene__toggle';
    btn.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path class="i-pause" d="M5 3.5v9M11 3.5v9"/><path class="i-play" d="M5.5 3.5v9l7-4.5z"/></svg>';
    if (fallback) stage.removeChild(fallback);
    stage.appendChild(canvas);
    if (!reduceMotion) stage.appendChild(btn);

    var s = {
      name: name, def: def, fig: fig, stage: stage, canvas: canvas, btn: btn,
      fallback: fallback, g: canvas.getContext('2d'), w: 0, h: 0, dpr: 1,
      compact: false, clock: reduceMotion ? def.poster : 0, dt: 0, last: 0,
      cycle: 0, visible: !('IntersectionObserver' in window), paused: false,
      pointer: { x: 0, y: 0, tx: 0, ty: 0 }, state: {},
      stats: { frames: 0, total: 0, max: 0 },
      lib: Motion.lib
    };
    fig.__motion = s;
    btn.addEventListener('click', function () { setPaused(s, !s.paused); });
    setPaused(s, false);
    stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect();
      s.pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      s.pointer.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    stage.addEventListener('pointerleave', function () { s.pointer.tx = s.pointer.ty = 0; });
    try { if (def.setup) def.setup(s); } catch (err) { fail(s, err); return; }
    insts.push(s);
    resize(s);
  }

  function boot() {
    colors = readColors();
    var figs = document.querySelectorAll('figure.scene[data-scene]');
    for (var i = 0; i < figs.length; i++) mount(figs[i]);
    if (!insts.length) return;

    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(function (entries) {
        entries.forEach(function (en) {
          var s = en.target.parentNode && en.target.parentNode.__motion;
          if (s && !s.dead) resize(s);
        });
      });
      insts.forEach(function (s) { ro.observe(s.stage); });
    } else {
      window.addEventListener('resize', function () { insts.forEach(resize); });
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var s = en.target.__motion;
          s.visible = en.isIntersecting;
          s.last = 0;
          if (s.visible) wake();
        });
      }, { threshold: 0.12 });
      insts.forEach(function (s) { io.observe(s.fig); });
    }

    new MutationObserver(function () {
      colors = readColors();
      sprites = {};
      insts.forEach(function (s) { if (!s.dead) render(s); });
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    document.addEventListener('visibilitychange', function () {
      insts.forEach(function (s) { s.last = 0; });
      wake();
    });

    function go() { setTimeout(function () { started = true; wake(); }, 200); }
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go);
  }

  var Motion = window.Motion = {
    register: function (name, def) { defs[name] = def; },
    lib: {
      E: E, clamp: clamp, lerp: lerp, seg: seg, hold: hold, rng: rng,
      col: col, mix: mix, rr: rr, font: font, text: text, measure: measure,
      node: node, chip: chip, token: token, trail: trail, path: path, bez: bez,
      arrow: arrow, glyph: glyph, spark: spark, camera: camera, fit: fit, box3: box3,
      ring3: ring3, cyl3: cyl3,
      colors: function () { return colors; }
    },
    // QA hooks (docs/animation/00-quality-bar.md §4).
    seek: function (name, t) {
      insts.forEach(function (s) {
        if (s.name !== name || s.dead) return;
        setPaused(s, true);
        s.clock = t;
        render(s);
      });
    },
    stats: function () {
      return insts.map(function (s) {
        return {
          name: s.name, frames: s.stats.frames,
          avgMs: s.stats.frames ? +(s.stats.total / s.stats.frames).toFixed(3) : 0,
          maxMs: +s.stats.max.toFixed(3), visible: s.visible, paused: s.paused
        };
      });
    },
    resetStats: function () {
      insts.forEach(function (s) { s.stats = { frames: 0, total: 0, max: 0 }; });
    }
  };

  function whenFontsReady(fn) {
    var done = false;
    function once() { if (!done) { done = true; fn(); } }
    if (document.fonts && document.fonts.ready) {
      document.fonts.load("600 12px Inter").then(once, once);
      setTimeout(once, 900);
    } else {
      once();
    }
  }

  document.addEventListener('DOMContentLoaded', function () { whenFontsReady(boot); });
})();
