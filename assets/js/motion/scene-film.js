/**
 * scene-film.js — "Typed state through gates."
 * The project state moves through pre-production nodes, each appending a
 * versioned artifact to a film strip; a real interrupt waits for spend
 * approval; generation fans out to three parallel validators; one flags,
 * the repair returns to the shot bible and appends v2 while v1 stays in
 * the history; QC passes and the project reaches QC-ready state.
 * Illustrative; see /projects/film-pipeline-langgraph.html.
 */
(function () {
  'use strict';
  if (!window.Motion) return;
  var L = Motion.lib, E = L.E, seg = L.seg, hold = L.hold, col = L.col;

  var FRAMES = [
    { name: 'screenplay', v: 'v1', node: 'sp', at: 0.9 },
    { name: 'shot bible', v: 'v1', node: 'sb', at: 2.1 },
    { name: 'gen plan', v: 'v1', node: 'gp', at: 3.3 },
    { name: 'batch', v: 'v1', node: 'gen', at: 6.4 },
    { name: 'shot bible', v: 'v2', node: 'sb', at: 10.0 }
  ];
  // State-token legs: [from, to, start, end].
  var LEGS = [['in', 'sp', 0.05, 0.5], ['sp', 'sb', 1.2, 1.7], ['sb', 'gp', 2.4, 2.9],
    ['gp', 'gate', 3.6, 4.1], ['gate', 'gen', 5.9, 6.4]];

  function edge(a, b, compact) {
    var p0 = [a.x + a.w / 2, a.y], p3 = [b.x - b.w / 2, b.y];
    if (Math.abs(a.y - b.y) > 60 && compact) {
      p0 = [a.x, a.y + a.h / 2]; p3 = [b.x, b.y - b.h / 2];
      return L.path(L.bez(p0, [p0[0], p0[1] + 34], [p3[0], p3[1] - 34], p3));
    }
    var mx = (p0[0] + p3[0]) / 2;
    return L.path(L.bez(p0, [mx, p0[1]], [mx, p3[1]], p3, 16));
  }

  Motion.register('film', {
    duration: 14,
    poster: 10.9,
    beats: [
      [0, 'Artifacts, versioned'],
      [4.0, 'Interrupt: human approval'],
      [5.9, 'Generate, then fan-out QC'],
      [8.8, 'Repair keeps history'],
      [11.8, 'QC-ready state']
    ],

    layout: function (s) {
      var N = {}, c = s.compact, w = s.w;
      var nh = c ? 28 : 34;
      if (!c) {
        var gy = (s.h - 118) / 2 + 22, cw = (w - 32) / 7;
        ['sp', 'sb', 'gp', 'gate', 'gen', 'qc', 'ready'].forEach(function (k, i) {
          N[k] = { x: 16 + cw * (i + 0.5), y: gy, w: Math.min(cw - 16, 100), h: nh };
        });
      } else {
        var r1 = 34, r2 = 104, c4 = (w - 20) / 4, c3 = (w - 20) / 3;
        ['sp', 'sb', 'gp', 'gate'].forEach(function (k, i) { N[k] = { x: 10 + c4 * (i + 0.5), y: r1, w: c4 - 10, h: nh }; });
        ['gen', 'qc', 'ready'].forEach(function (k, i) { N[k] = { x: 10 + c3 * (i + 0.5), y: r2, w: c3 - 16, h: nh }; });
      }
      N.gate.w = N.gate.h = c ? 30 : 38;
      var gap = c ? 24 : 42, qh = c ? 18 : 26;
      N.qcs = [-1, 0, 1].map(function (d) { return { x: N.qc.x, y: N.qc.y + d * gap, w: N.qc.w, h: qh }; });
      N['in'] = { x: -10, y: N.sp.y, w: 0, h: 0 };
      var E2 = {};
      LEGS.forEach(function (l) { E2[l[0] + l[1]] = edge(N[l[0]], N[l[1]], c); });
      E2.fan = N.qcs.map(function (q) { return edge(N.gen, q, c); });
      E2.join = N.qcs.map(function (q) { return edge(q, N.ready, c); });
      // repair: validator → shot bible, arcing clear of the graph
      var q1 = N.qcs[1], sb = N.sb;
      var top = Math.min(N.sp.y, N.qcs[0].y) - (c ? 40 : 56);
      E2.repair = c
        ? L.path(L.bez([q1.x - q1.w / 2, q1.y], [q1.x - 70, q1.y], [sb.x, sb.y + 70], [sb.x, sb.y + sb.h / 2]))
        : L.path(L.bez([q1.x, N.qcs[0].y - qh / 2], [q1.x, top], [sb.x, top], [sb.x, sb.y - sb.h / 2]));
      var sy = c ? s.h - 88 : s.h - 98, sh = c ? 44 : 50;
      var strip = { x: c ? 8 : 12, y: sy, w: w - (c ? 16 : 24), h: sh };
      var fw = (strip.w - (c ? 6 : 16)) / 5;
      FRAMES.forEach(function (f, i) {
        f.slot = { x: strip.x + (c ? 3 : 8) + fw * i + 3, y: strip.y + 9, w: fw - 6, h: sh - 18 };
      });
      s.state.N = N; s.state.E = E2; s.state.strip = strip;
    },

    draw: function (s, t) {
      var g = s.g, N = s.state.N, Ed = s.state.E, st = s.state.strip, c = s.compact;
      var reset = E.inOutSine(seg(t, 13.2, 13.9));
      var fs = c ? 10 : 11;

      // ---- edges
      LEGS.forEach(function (l) {
        if (l[0] !== 'in') L.arrow(s, Ed[l[0] + l[1]], { tone: 'border', headSize: 5 });
      });
      Ed.fan.forEach(function (p) { L.arrow(s, p, { tone: 'border', headSize: 5 }); });
      Ed.join.forEach(function (p) { L.arrow(s, p, { tone: 'border', headSize: 5 }); });
      var rp = seg(t, 8.9, 9.8), rfade = 1 - seg(t, 11.8, 12.4);
      if (rp > 0) L.arrow(s, Ed.repair, { tone: 'warn', to: E.inOutCubic(rp), dash: [4, 4], alpha: 0.85 * rfade });

      // ---- node emphasis windows
      function act(a, b) { return hold(t, a, b, 0.25); }
      var em = {
        sp: act(0.45, 1.5), sb: Math.max(act(1.65, 2.7), act(9.7, 10.9)), gp: act(2.85, 3.9),
        gen: act(6.35, 7.4), ready: hold(t, 12.3, 13.6, 0.3)
      };
      ['sp', 'sb', 'gp', 'gen', 'ready'].forEach(function (k) {
        var n = N[k];
        var titles = { sp: 'screenplay', sb: 'shot bible', gp: 'gen plan', gen: 'generate', ready: 'qc-ready' };
        L.node(s, { x: n.x, y: n.y, w: n.w, h: n.h, title: titles[k], size: fs, emph: em[k] * (1 - reset),
          tone: k === 'sb' && t > 9.6 && t < 10.3 ? 'warn' : 'accent', fill: 'bg' });
      });

      // gate: diamond; waits (interrupt) until approved
      var gt = N.gate, wait = hold(t, 4.05, 5.95, 0.2), ok = E.outCubic(seg(t, 5.3, 5.7)) * (1 - seg(t, 6.2, 6.6));
      var pulse = wait * (0.5 + 0.5 * Math.sin((t - 4.05) * Math.PI * 2 / 1.1 - Math.PI / 2));
      g.save();
      g.translate(gt.x, gt.y);
      g.rotate(Math.PI / 4);
      var dsz = gt.w / Math.SQRT2;
      if (wait > 0.01) {
        L.rr(g, -dsz / 2 - 4, -dsz / 2 - 4, dsz + 8, dsz + 8, 7);
        g.strokeStyle = col('info', 0.25 * pulse);
        g.lineWidth = 4;
        g.stroke();
      }
      L.rr(g, -dsz / 2, -dsz / 2, dsz, dsz, 4);
      g.fillStyle = col(L.mix('bg', 'info', 0.1 * wait));
      g.fill();
      g.strokeStyle = col(L.mix('border', 'info', Math.max(wait, 0.45)));
      g.lineWidth = 1.25 + 0.5 * wait;
      g.stroke();
      g.restore();
      if (ok > 0.01) L.glyph(s, 'tick', gt.x, gt.y, { p: ok, r: 5 });
      else L.text(s, '?', gt.x, gt.y + 0.5, { size: 11, weight: 700, color: wait > 0.3 ? 'info' : 'muted' });
      var gl = c ? gt.y - gt.h / 2 - 12 : gt.y + gt.h / 2 + 16;
      if (!c) L.text(s, 'approval', gt.x, gl, { key: true, color: wait > 0.3 ? 'info' : 'muted' });
      if (wait > 0.01) L.chip(s, 'interrupt · spend approval', gt.x, c ? gt.y + gt.h / 2 + 18 : gt.y - gt.h / 2 - 26, { tone: 'info', emph: 1, alpha: wait });

      // validators: parallel progress, one flags, re-validated after repair
      N.qcs.forEach(function (q, i) {
        var run = seg(t, 7.35 + i * 0.05, 8.45 + i * 0.1);
        var bad = i === 1 ? hold(t, 8.5, 10.7, 0.2) : 0;
        var rerun = i === 1 ? seg(t, 11.2, 11.75) : 1;
        var done = (i === 1 ? seg(t, 11.7, 11.95) : seg(t, 8.45 + i * 0.1, 8.7 + i * 0.1)) * (1 - reset);
        var busy = (run > 0 && run < 1) || (i === 1 && rerun > 0 && rerun < 1);
        L.node(s, { x: q.x, y: q.y, w: q.w, h: q.h, title: c ? 'qc' : 'validator', size: 10,
          emph: Math.max(busy ? 0.6 : 0, bad, done * 0.5) * (1 - reset), tone: bad > 0.3 ? 'bad' : done > 0.5 ? 'info' : 'accent', fill: 'bg' });
        // progress bar along the bottom edge
        var prog = i === 1 && t > 10.9 ? rerun : run;
        if (prog > 0 && prog < 1) {
          g.fillStyle = col('accent', 0.8);
          g.fillRect(q.x - q.w / 2 + 4, q.y + q.h / 2 - 3, (q.w - 8) * prog, 1.5);
        }
        var gx = q.x + q.w / 2 - 9;
        if (bad > 0.01) L.glyph(s, 'cross', gx, q.y, { p: seg(t, 8.5, 8.75), r: 4, alpha: bad });
        else if (done > 0.01) L.glyph(s, 'tick', gx, q.y, { p: done, r: 4 });
      });

      // ---- film strip
      L.rr(g, st.x, st.y, st.w, st.h, 8);
      g.fillStyle = col(L.mix('bg', 'text', c ? 0.03 : 0.04));
      g.fill();
      g.strokeStyle = col('border');
      g.lineWidth = 1;
      g.stroke();
      g.fillStyle = col('border', 0.9);
      for (var hx = st.x + 10; hx < st.x + st.w - 8; hx += 12) {
        L.rr(g, hx, st.y + 3, 5, 3, 1); g.fill();
        L.rr(g, hx, st.y + st.h - 6, 5, 3, 1); g.fill();
      }
      L.text(s, 'versioned artifacts', st.x + 4, st.y - 9, { key: true, align: 'left' });

      FRAMES.forEach(function (f, i) {
        var sl = f.slot, fly = seg(t, f.at, f.at + 0.55), a = (1 - reset);
        if (fly <= 0) return;
        var n = N[f.node], k = E.inOutCubic(fly);
        var fx = L.lerp(n.x, sl.x + sl.w / 2, k), fy = L.lerp(n.y + n.h / 2, sl.y + sl.h / 2, k) - Math.sin(Math.PI * k) * 10;
        var sc = L.lerp(0.5, 1, k), fw = sl.w * sc, fh = sl.h * sc;
        var stale = i === 1 ? E.inOutSine(seg(t, 10.3, 10.8)) : 0;
        var landed = seg(fly, 0.95, 1);
        L.rr(g, fx - fw / 2, fy - fh / 2, fw, fh, 4);
        g.fillStyle = col(L.mix('bg', 'accent', 0.08 * (1 - stale) * landed), a);
        g.fill();
        g.strokeStyle = col(L.mix('border', i === 4 ? 'warn' : 'accent', 0.7 - 0.5 * stale), a);
        g.lineWidth = 1.1;
        g.stroke();
        if (landed > 0) {
          L.text(s, f.name, fx, fy - 6, { size: 10, weight: 500, color: stale > 0.5 ? 'muted' : 'text2', alpha: a * landed });
          L.text(s, f.v, fx, fy + 7, { size: 10, mono: true, weight: 600, color: stale > 0.5 ? 'muted' : i === 4 ? 'warn' : 'accent', alpha: a * landed });
        }
      });
      // dependency history: v1 → v2 link above the strip
      var link = seg(t, 10.45, 10.95);
      if (link > 0) {
        var a1 = FRAMES[1].slot, a2 = FRAMES[4].slot;
        var lp = L.path(L.bez([a1.x + a1.w / 2, st.y - 1], [a1.x + a1.w / 2, st.y - 22], [a2.x + a2.w / 2, st.y - 22], [a2.x + a2.w / 2, st.y - 1], 20));
        L.arrow(s, lp, { tone: 'warn', to: E.inOutCubic(link), alpha: 0.8 * (1 - reset), dash: [3, 3], headSize: 5 });
      }

      // ---- tokens
      LEGS.forEach(function (l) {
        var u = seg(t, l[2], l[3]);
        if (u > 0 && u < 1) L.trail(s, function (v) { return Ed[l[0] + l[1]].at(E.inOutCubic(v)); }, u, { len: 0.2 });
      });
      var fu = seg(t, 6.85, 7.35);
      if (fu > 0 && fu < 1) Ed.fan.forEach(function (p) { L.trail(s, function (v) { return p.at(E.inOutCubic(v)); }, fu, { len: 0.2 }); });
      var ru = seg(t, 8.9, 9.8);
      if (ru > 0 && ru < 1) L.trail(s, function (v) { return Ed.repair.at(E.inOutCubic(v)); }, ru, { tone: 'warn', len: 0.12 });
      var bu = seg(t, 10.7, 11.25);
      if (bu > 0 && bu < 1) L.trail(s, function (v) { return Ed.repair.at(1 - E.inOutCubic(v)); }, bu, { len: 0.12 });
      var ju = seg(t, 11.95, 12.4);
      if (ju > 0 && ju < 1) Ed.join.forEach(function (p) { L.trail(s, function (v) { return p.at(E.inOutCubic(v)); }, ju, { tone: 'info', len: 0.2 }); });

      var rc = hold(t, 12.3, 13.7, 0.3);
      if (rc > 0.01) L.chip(s, 'qc-ready project state', N.ready.x, N.ready.y + N.ready.h / 2 + (c ? 16 : 22), { emph: 1, alpha: rc });
    }
  });
})();
