/**
 * scene-scaleshop.js — "Evidence before architecture."
 * Requests flow clients → load balancer → app nodes → primary database.
 * Traffic grows, reads queue at the primary and the p95 sparkline climbs;
 * the evidence is framed, one option is chosen from four, a read cache
 * extrudes into place, most reads return early and p95 recovers.
 * Illustrative, not one of the lab's scored scenarios; see
 * /projects/scalability-lab.html.
 */
(function () {
  'use strict';
  if (!window.Motion) return;
  var L = Motion.lib, E = L.E, seg = L.seg, hold = L.hold, col = L.col;

  var DUR = 14, SLOT = 0.075, TRIP = 1.55;
  var CL = -300, LB = -175, APP = -45, CACHE = 85, DB = 215;
  var APPZ = [-70, 0, 70];

  function hash(i, k) {
    var x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  // Offered load 0..1 over the loop.
  function load(t) { return 0.3 + 0.7 * E.inOutSine(seg(t, 2.6, 5.4)); }
  // Cache presence 0..1.
  function cache(t) { return E.outBack(seg(t, 8.7, 9.5)) * (1 - E.inOutSine(seg(t, 13.1, 13.8))); }
  // p95 (normalised): climbs with saturation, falls once the cache takes reads.
  function p95(t) {
    t = ((t % DUR) + DUR) % DUR;
    var sat = E.inOutSine(seg(t, 3.4, 6.6));
    var relief = E.inOutSine(seg(t, 9.4, 11.6)) * (1 - E.inOutSine(seg(t, 13.1, 13.9)));
    return 0.24 + 0.58 * sat * (1 - relief) + 0.02 * Math.sin(t * 5.3);
  }
  function queue(t) { return Math.round(7 * E.inOutSine(seg(t, 3.6, 6.4)) * (1 - E.inOutSine(seg(t, 9.6, 11.2)))); }

  Motion.register('scaleshop', {
    duration: DUR,
    poster: 10.3,
    beats: [
      [0, 'Normal load'],
      [2.8, 'Traffic grows, p95 climbs'],
      [6.2, 'Read the evidence'],
      [8.5, 'Smallest sufficient change'],
      [11.3, 'Modeled: p95 back under budget']
    ],

    setup: function (s) {
      s.state.cam = L.camera({ yaw: -0.38, pitch: 0.58, dist: 2600, focal: 2600 });
    },

    layout: function (s) {
      var cam = s.state.cam;
      cam.scale = 1; cam.cx = 0; cam.cy = 0; cam.yaw = -0.38; cam.pitch = 0.58;
      var pts = [[CL - 30, 0, -40], [CL - 30, 0, 40], [DB + 50, 0, -50], [DB + 50, 0, 50], [DB, 90, 0], [APP, 60, -90], [APP, 0, 100]];
      var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      pts.forEach(function (q) {
        var p = cam.project(q[0], q[1], q[2]);
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      });
      // desktop: HUD owns the top-left corner, the topology sits right of it
      var topPad = s.compact ? 64 : 40, botPad = 70, leftPad = s.compact ? 16 : 120;
      cam.scale = Math.min((s.w - leftPad - 20) / (maxX - minX), (s.h - topPad - botPad) / (maxY - minY));
      cam.cx = leftPad + (s.w - leftPad - 20) / 2 - (minX + maxX) / 2 * cam.scale;
      cam.cy = topPad + (s.h - topPad - botPad) / 2 - (minY + maxY) / 2 * cam.scale;
    },

    draw: function (s, t) {
      var g = s.g, cam = s.state.cam;
      cam.yaw = -0.38 + Math.sin(s.clock * 2 * Math.PI / 24) * 0.06 + s.pointer.x * 0.04;
      cam.pitch = 0.58 + s.pointer.y * 0.02;
      var P = cam.project;
      var ld = load(t), ca = cache(t), q = queue(t);
      var heat = E.inOutSine(seg(t, 3.8, 6.4)) * (1 - E.inOutSine(seg(t, 9.6, 11.4)));
      var evidence = hold(t, 6.2, 8.6, 0.35);

      // ground grid
      for (var gx = CL - 40; gx <= DB + 60; gx += 40) {
        for (var gz = -120; gz <= 120; gz += 40) {
          var gp = P(gx, 0, gz);
          g.fillStyle = col('border', 0.7);
          g.fillRect(gp.x - 1, gp.y - 1, 2, 2);
        }
      }

      // links on the ground
      function link(a, b, alpha) {
        var p1 = P(a[0], 0, a[1]), p2 = P(b[0], 0, b[1]);
        g.beginPath(); g.moveTo(p1.x, p1.y); g.lineTo(p2.x, p2.y);
        g.strokeStyle = col('border', alpha || 1); g.lineWidth = 1; g.stroke();
      }
      [-45, 0, 45].forEach(function (z) { link([CL, z], [LB, 0]); });
      APPZ.forEach(function (z) { link([LB, 0], [APP, z]); link([APP, z], [DB - 40, 0]); });

      // nodes, back to front
      [-45, 0, 45].forEach(function (z) {
        L.box3(s, cam, CL, 0, z, 18, 12, 18, { tone: 'info', edgeTint: 0.3 });
      });
      L.box3(s, cam, LB, 0, 0, 30, 22, 44, { tone: 'accent', edgeTint: 0.35 });
      APPZ.forEach(function (z) {
        L.box3(s, cam, APP, 0, z, 34, 40, 34, { tone: 'accent', emph: 0.15 + 0.35 * heat * 0.5, edgeTint: 0.4 });
      });

      // requests
      var n = Math.ceil(TRIP / SLOT) + 2, base = Math.floor(s.clock / SLOT);
      for (var k = 0; k < n; k++) {
        var i = base - k, e = i * SLOT, u = (s.clock - e) / TRIP;
        if (u < 0 || u > 1) continue;
        var et = ((e % DUR) + DUR) % DUR;
        if (hash(i, 1) > load(et)) continue;
        var cz = [-45, 0, 45][i % 3], az = APPZ[(i >> 1) % 3];
        var hit = cache(et + TRIP * 0.55) > 0.6 && hash(i, 2) < 0.82;
        var end = hit ? CACHE - 26 : DB - 44 - (q > 0 ? q * 7 : 0);
        var pts = [[CL, cz], [LB, 0], [APP, az], [end, 0]];
        var seglen = [0.28, 0.3, 0.42];
        var acc = 0, x = 0, z = 0;
        for (var j = 0; j < 3; j++) {
          if (u <= acc + seglen[j] || j === 2) {
            var f = L.clamp((u - acc) / seglen[j], 0, 1);
            x = L.lerp(pts[j][0], pts[j + 1][0], f);
            z = L.lerp(pts[j][1], pts[j + 1][1], f);
            break;
          }
          acc += seglen[j];
        }
        var arrive = seg(u, 0.93, 1);
        var p = P(x, 10, z);
        var tone = hit ? 'accent' : heat > 0.5 ? 'warn' : 'info';
        L.token(s, p.x, p.y, { r: 2.2, tone: tone, alpha: (1 - arrive) * seg(u, 0, 0.05), halo: 2.5 });
      }

      // cache block
      if (ca > 0.01) {
        L.box3(s, cam, CACHE, 0, 0, 36, 34 * ca, 60, { tone: 'accent', emph: 0.6 + 0.4 * hold(t, 8.7, 10.2, 0.4), tint: 0.04, edgeTint: 1 });
        var cl = s.compact ? P(CACHE, 0, -44) : P(CACHE, 34 * ca + 18, 0);
        L.text(s, 'read cache', cl.x, cl.y + (s.compact ? 10 : 0), { key: true, color: 'accent', alpha: seg(ca, 0.5, 1) });
      }

      // queue at the primary
      for (var qi = 0; qi < 7; qi++) {
        var qa = L.clamp(q - qi, 0, 1);
        if (qa <= 0) continue;
        var qp = P(DB - 44 - qi * 7, 10, 0);
        L.token(s, qp.x, qp.y, { r: 2.4, tone: 'warn', alpha: qa, halo: 2 });
      }

      // primary database
      L.cyl3(s, cam, DB, 0, 0, 34, 56, { tone: heat > 0.02 ? 'warn' : 'info', emph: heat, tint: 0.02, edgeTint: 0.35 });
      var dl = P(DB, 56, 0);
      L.text(s, 'primary db', dl.x, dl.y + (evidence > 0.01 ? -16 - 6 * evidence : -16), { key: true, color: heat > 0.4 ? 'warn' : 'muted' });
      var ll = P(LB, 22, 0);
      L.text(s, 'lb', ll.x, ll.y - 12, { key: true });
      var al = P(APP, 0, -112);
      L.text(s, 'app × 3', al.x, al.y + 8, { key: true });

      // evidence bracket around queue + db
      if (evidence > 0.01) {
        var b0 = P(DB - 100, 0, 44), b1 = P(DB + 40, 70, -40);
        var x0 = Math.min(b0.x, b1.x) - 8, x1 = Math.max(b0.x, b1.x) + 8;
        var y0 = Math.min(b0.y, b1.y) - 6, y1 = Math.max(b0.y, b1.y) + 6;
        var grow = E.outCubic(seg(t, 6.2, 6.7)), cs = 10;
        g.strokeStyle = col('warn', evidence);
        g.lineWidth = 1.5;
        var cx = (x0 + x1) / 2, cyy = (y0 + y1) / 2;
        x0 = L.lerp(cx, x0, grow); x1 = L.lerp(cx, x1, grow); y0 = L.lerp(cyy, y0, grow); y1 = L.lerp(cyy, y1, grow);
        [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(function (c) {
          g.beginPath();
          g.moveTo(c[0], c[1] + cs * c[3]); g.lineTo(c[0], c[1]); g.lineTo(c[0] + cs * c[2], c[1]);
          g.stroke();
        });
        L.chip(s, s.compact ? 'reads saturate primary' : 'evidence · reads saturate primary', (x0 + x1) / 2, y0 - 34, { tone: 'warn', emph: 1, alpha: evidence });
      }

      // options: four considered, one chosen
      var opt = hold(t, 7.0, 9.8, 0.35);
      if (opt > 0.01) {
        var labels = ['tune queries', 'read cache', 'read replica', 'change nothing'];
        var pick = seg(t, 7.9, 8.3);
        var ox = s.compact ? 14 : 16, oy = s.compact ? 44 : s.h - 64;
        if (s.compact) { ox = 12; oy = s.h - 50; labels = ['queries', 'cache', 'replica', 'nothing']; }
        labels.forEach(function (lb, li) {
          var chosen = li === 1;
          var a = opt * (chosen ? 1 : 1 - 0.6 * pick) * seg(t, 7.0 + li * 0.1, 7.3 + li * 0.1);
          ox += L.chip(s, lb, ox, oy, { align: 'left', emph: chosen ? pick : 0, alpha: a }) + 6;
        });
      }

      // HUD: p95 sparkline
      var hx = s.compact ? 14 : 16, hy = s.compact ? 12 : 16, hw = s.compact ? 110 : 130, hh = s.compact ? 22 : 34;
      var vals = [];
      for (var vi = 0; vi < 40; vi++) vals.push(p95(t - (39 - vi) * 0.1));
      var cur = vals[39], over = cur > 0.55;
      L.text(s, 'p95 read latency', hx, hy + 4, { key: true, align: 'left', color: over ? 'warn' : 'muted' });
      var sy = hy + 14;
      g.beginPath();
      g.moveTo(hx, sy + hh * (1 - 0.55)); g.lineTo(hx + hw, sy + hh * (1 - 0.55));
      g.setLineDash([2, 3]); g.strokeStyle = col('border'); g.lineWidth = 1; g.stroke(); g.setLineDash([]);
      if (!s.compact) {
        g.beginPath(); g.moveTo(hx, sy + hh + 14); g.lineTo(hx + 14, sy + hh + 14);
        g.setLineDash([2, 3]); g.strokeStyle = col('muted'); g.stroke(); g.setLineDash([]);
        L.text(s, 'budget', hx + 20, sy + hh + 14.5, { key: true, align: 'left', alpha: 0.8 });
      }
      L.spark(s, hx, sy, hw, hh, vals, { tone: over ? 'warn' : 'info' });
      var dot = { x: hx + hw, y: sy + hh * (1 - cur) };
      L.token(s, dot.x, dot.y, { r: 2.6, tone: over ? 'warn' : 'info', halo: 3 });
    }
  });
})();
