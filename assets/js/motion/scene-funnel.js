/**
 * scene-funnel.js — "The agent never decides whether to wake up."
 * Situation versions fall into the cognitive scheduler's admission
 * funnel. Quiet versions exit at the stage that rejects them, each with a
 * recorded reason; one material change clears every stage and a bounded
 * episode is admitted (snapshot · budget · fence). Stage names and the
 * Round 3 figure come from /projects/tamoz-technical.html. Illustrative.
 */
(function () {
  'use strict';
  if (!window.Motion) return;
  var L = Motion.lib, E = L.E, seg = L.seg, hold = L.hold, col = L.col;

  var STAGES = [
    { y: 150, r: 112, name: 'trigger condition', exit: 'ignored' },
    { y: 116, r: 92, name: 'score ≥ threshold', exit: 'ignored' },
    { y: 82, r: 73, name: 'fresh + complete', exit: 'deferred' },
    { y: 48, r: 56, name: 'debounce · coalesce', exit: 'coalesced' },
    { y: 14, r: 42, name: 'episode admitted', exit: null }
  ];
  var TOP = 205;
  // Quiet versions: [start time, stage that rejects it, angle of exit].
  var QUIET = [[0.15, 0, 2.7], [0.95, 1, 3.5], [1.75, 2, 2.9], [2.55, 0, 3.4], [3.3, 3, 3.1]];
  var MATERIAL = 4.5;
  var FALL = 0.3, SLIDE = 0.55;

  // World position of a falling version; `rej` = stage index or -1 (admitted).
  function where(t, t0, rej, ang) {
    var u = t - t0;
    if (u < 0) return null;
    var enter = 0.45;
    if (u < enter) {
      var k = E.inCubic(u / enter);
      return { x: 0, y: L.lerp(TOP, STAGES[0].y, k), z: 0, a: seg(u, 0, 0.15), at: -1 };
    }
    u -= enter;
    var last = rej < 0 ? STAGES.length - 1 : rej;
    var stage = Math.min(Math.floor(u / FALL), last);
    if (stage < last) {
      var f = E.inOutCubic((u - stage * FALL) / FALL);
      return { x: 0, y: L.lerp(STAGES[stage].y, STAGES[stage + 1].y, f), z: 0, a: 1, at: stage };
    }
    u -= last * FALL;
    if (rej < 0) return { x: 0, y: STAGES[last].y, z: 0, a: 1, at: last, done: u };
    var sl = E.inOutCubic(Math.min(u / SLIDE, 1)), r = STAGES[rej].r * 1.12 * sl;
    var drop = Math.max(0, u - SLIDE);
    return {
      x: Math.cos(ang) * r, y: STAGES[rej].y - E.inCubic(Math.min(drop / 0.4, 1)) * 26,
      z: Math.sin(ang) * r * 0.6, a: 1 - seg(drop, 0.05, 0.4), at: rej, exit: u
    };
  }

  Motion.register('funnel', {
    duration: 12,
    poster: 8.4,
    beats: [
      [0, 'Quiet versions exit, recorded'],
      [4.4, 'A material change clears it'],
      [7.2, 'A bounded episode is admitted'],
      [10, 'Every outcome has a reason']
    ],

    setup: function (s) {
      s.state.cam = L.camera({ pitch: 0.42, dist: 1000, focal: 1000 });
    },

    layout: function (s) {
      var cam = s.state.cam;
      cam.scale = 1; cam.cx = 0; cam.cy = 0; cam.yaw = 0; cam.pitch = 0.42;
      var top = cam.project(0, TOP + 26, 0).y, bot = cam.project(0, 0, -STAGES[4].r).y;
      var spanX = STAGES[0].r * 2 + (s.compact ? 150 : 330);
      var avail = s.h - 40 - 28;
      cam.scale = Math.min(avail / (bot - top), (s.w - 24) / spanX);
      cam.cx = s.compact ? s.w * 0.38 : s.w * 0.44;
      cam.cy = 28 + avail / 2 - (top + bot) / 2 * cam.scale;
    },

    draw: function (s, t) {
      var g = s.g, cam = s.state.cam;
      cam.yaw = Math.sin(s.clock * 2 * Math.PI / 24) * 0.12 + s.pointer.x * 0.05;
      cam.pitch = 0.42 + s.pointer.y * 0.03;
      var P = cam.project;

      // which stage flashes: pass (info) or reject (warn)
      var pass = [0, 0, 0, 0, 0], rej = [0, 0, 0, 0, 0];
      QUIET.forEach(function (q) {
        var p = where(t, q[0], q[1], q[2]);
        if (!p) return;
        for (var k = 0; k < q[1]; k++) pass[k] = Math.max(pass[k], hold(t, q[0] + 0.45 + k * FALL - 0.05, q[0] + 0.45 + (k + 1) * FALL + 0.1, 0.1) * 0.6);
        if (p.exit !== undefined) rej[q[1]] = Math.max(rej[q[1]], hold(p.exit, 0, 0.9, 0.2) * 0.75);
      });
      for (var k = 0; k < 5; k++) {
        pass[k] = Math.max(pass[k], hold(t, MATERIAL + 0.45 + k * FALL - 0.05, MATERIAL + 0.45 + k * FALL + 0.6, 0.15));
      }
      var admitted = hold(t, 7.1, 11.6, 0.4);
      var recap = hold(t, 10, 11.8, 0.35);

      // funnel walls (silhouette lines) then plates bottom → top
      [-1, 1].forEach(function (side) {
        g.beginPath();
        STAGES.forEach(function (st, i) {
          var p = P(side * st.r, st.y, 0);
          if (i) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y);
        });
        g.strokeStyle = col('border', 0.8);
        g.lineWidth = 1;
        g.stroke();
      });
      for (var i = STAGES.length - 1; i >= 0; i--) {
        var st = STAGES[i], last = i === 4;
        var e = last ? admitted : Math.max(pass[i], rej[i]);
        var tone = last ? 'accent' : rej[i] > pass[i] ? 'warn' : 'info';
        L.ring3(s, cam, 0, st.y, 0, st.r, {
          fill: L.col(L.mix('bg', tone, 0.04 + 0.1 * e), 0.55),
          stroke: L.col(L.mix('border', tone, e), 1), width: 1.25 + 0.5 * e
        });
        // stage label, right rim
        var lp = P(st.r + 14, st.y, 0);
        L.text(s, st.name, lp.x, lp.y, { key: true, align: 'left', color: e > 0.4 ? tone : last ? 'text2' : 'muted' });
        // exit reason, left rim
        if (st.exit) {
          var xp = P(-st.r - 14, st.y, 0), ea = Math.max(rej[i], recap);
          L.text(s, st.exit, xp.x, xp.y, { key: true, align: 'right', color: ea > 0.3 ? 'warn' : 'muted', alpha: 0.45 + 0.55 * ea });
        }
      }

      // episode fence: a thin cylinder rising around the bottom stage
      var fence = E.outCubic(seg(t, 7.4, 8.1)) * (1 - E.inOutSine(seg(t, 11.2, 11.8)));
      if (fence > 0.01) {
        L.ring3(s, cam, 0, STAGES[4].y + 22 * fence, 0, STAGES[4].r, { stroke: col('accent', 0.8 * fence), width: 1.5 });
        [-1, 1].forEach(function (side) {
          var a = P(side * STAGES[4].r, STAGES[4].y, 0), b = P(side * STAGES[4].r, STAGES[4].y + 22 * fence, 0);
          g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y);
          g.strokeStyle = col('accent', 0.8 * fence); g.lineWidth = 1.25; g.stroke();
        });
      }

      // falling versions
      QUIET.forEach(function (q) {
        var p = where(t, q[0], q[1], q[2]);
        if (!p || p.a <= 0.01) return;
        var pp = P(p.x, p.y + 4, p.z);
        L.token(s, pp.x, pp.y, { r: 3, tone: p.exit !== undefined ? 'warn' : 'info', alpha: p.a * 0.95, halo: 3.5 });
      });
      var m = where(t, MATERIAL, -1, 0);
      if (m) {
        var ma = 1 - seg(t, 11.2, 11.8);
        L.trail(s, function (u) {
          var w = where(MATERIAL + u, MATERIAL, -1, 0);
          var q2 = P(w.x, w.y + 5, w.z);
          return q2;
        }, Math.min(t - MATERIAL, 0.45 + 4 * FALL), { tone: m.done !== undefined ? 'accent' : 'warn', r: 4, alpha: ma, len: 0.35 });
        if (m.done !== undefined && admitted > 0.01) {
          var cp = P(-STAGES[4].r - 14, STAGES[4].y, 0);
          L.chip(s, s.compact ? 'budget · fence' : 'snapshot · budget · fence', cp.x, cp.y, { emph: 1, alpha: admitted, align: 'right' });
        }
      }

      // version label above the mouth
      var vp = P(0, TOP + 12, 0);
      var vl = hold(t, MATERIAL - 0.1, MATERIAL + 1.4, 0.3);
      L.text(s, vl > 0.5 ? 'situation v47 · material change' : 'situation versions', vp.x, vp.y - 4, { key: true, color: vl > 0.5 ? 'warn' : 'muted' });

      // quoted measurement (Round 3)
      if (!s.compact) {
        var ma2 = 1 - hold(t, 4.3, 10.2, 0.4) * 0.6;
        L.text(s, 'measured · round 3', s.w - 16, 24, { key: true, align: 'right', color: 'accent', alpha: ma2 });
        L.text(s, '7,200 quiet events → 0 episodes', s.w - 16, 42, { size: 12, align: 'right', color: 'text2', alpha: ma2 });
      }
    }
  });
})();
