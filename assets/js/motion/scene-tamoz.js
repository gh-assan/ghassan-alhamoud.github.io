/**
 * scene-tamoz.js — "The agent decides what; policy decides how much."
 * Readings stream in and warm past a threshold; Agentic Stream seals a
 * Situation; Tamoz (a turning wireframe) chooses an intent with no
 * magnitude in it; the policy plane turns it into a bounded command under
 * the firmware ceiling (60 % duty, 10 s lease, per /projects/tamoz.html);
 * the fan spins while the lease runs, the readings cool, and the outcome
 * returns as experience. Illustrative.
 */
(function () {
  'use strict';
  if (!window.Motion) return;
  var L = Motion.lib, E = L.E, seg = L.seg, hold = L.hold, col = L.col;

  var X0 = -390, WIN = -205, CORE = -30, PLANE = 110, GAUGE = 160, FAN = 285;
  var FAN_Y = 74, FAN_R = 42, THRESH = 58, CEIL = 0.6, DUTY = 0.48, V = 120;

  // Temperature at emission time τ (loop seconds): rises, holds until the
  // fan has run, then relaxes. Periodic in the loop, so the stream is seamless.
  function temp(tau) {
    return 26 + 44 * E.inOutSine(seg(tau, 0.6, 1.9)) * (1 - E.inOutSine(seg(tau, 8.9, 11.2)));
  }
  function spin(t) { return E.inOutSine(seg(t, 8.45, 9.3)) * (1 - E.inOutSine(seg(t, 11.5, 12.6))); }
  // Blade angle = OMEGA·∫spin. OMEGA is snapped so a full loop turns the
  // three-blade rotor a whole number of thirds: no pop at the loop seam.
  function spun(t) {
    var a = 0, n = 60;
    for (var i = 0; i < n; i++) a += spin(t * (i + 0.5) / n) * t / n;
    return a;
  }
  var THIRD = Math.PI * 2 / 3, TOTAL = spun(13);
  var OMEGA = Math.round(14 * TOTAL / THIRD) * THIRD / TOTAL;

  // Readable two-row topology for phones.
  function drawCompact(s, t) {
    var g = s.g, w = s.w, left = 72, right = w - 72;
    var top = Math.round(s.h * 0.32), bottom = Math.round(s.h * 0.63);
    var paths = [
      L.path([[left + 54, top], [right - 54, top]]),
      L.path([[right, top + 23], [right, bottom - 29], [left, bottom - 29]]),
      L.path([[left + 54, bottom], [right - 54, bottom]])
    ];
    paths.forEach(function (p) { L.arrow(s, p, { tone: 'border', headSize: 5 }); });

    var warm = hold(t, 1.0, 4.0, 0.5);
    var decide = hold(t, 4.2, 6.7, 0.4);
    var govern = hold(t, 6.4, 8.7, 0.4);
    var act = hold(t, 8.4, 11.7, 0.4);
    L.node(s, { x: left, y: top, w: 108, h: 46, title: 'readings', sub: warm > 0.4 ? 'threshold crossed' : 'sensor stream', tone: warm > 0.4 ? 'warn' : 'accent', emph: warm });
    L.node(s, { x: right, y: top, w: 108, h: 46, title: 'Tamoz', sub: 'chooses intent', emph: decide });
    L.node(s, { x: left, y: bottom, w: 108, h: 54, title: 'policy', sub: 'ceiling 60 %', tone: 'info', emph: govern });
    L.node(s, { x: right, y: bottom, w: 108, h: 46, title: 'fan-01', sub: '10 s lease', tone: 'info', emph: act });

    var duty = E.outQuart(seg(t, 7.9, 8.3)) * (1 - E.inOutSine(seg(t, 11.8, 12.7)));
    var gx = left - 39, gy = bottom + 19;
    g.fillStyle = col('border'); g.fillRect(gx, gy, 78, 2);
    g.fillStyle = col('info'); g.fillRect(gx, gy, 78 * DUTY * duty, 2);
    g.fillStyle = col('bad'); g.fillRect(gx + 78 * CEIL, gy - 3, 2, 8);

    var u = seg(t, 3.9, 5.0);
    if (u > 0 && u < 1) { var p = paths[0].at(u); L.token(s, p.x, p.y, { tone: 'accent' }); }
    u = seg(t, 6.45, 7.85);
    if (u > 0 && u < 1) { p = paths[1].at(u); L.token(s, p.x, p.y, { tone: 'info' }); }
    u = seg(t, 8.0, 8.8);
    if (u > 0 && u < 1) { p = paths[2].at(u); L.token(s, p.x, p.y, { tone: 'info' }); }
    if (t < 6.4 && decide > 0.01) L.chip(s, 'mode: bounded_cooling', w / 2, 23, { code: true, emph: decide, alpha: decide });
    else if (t < 8.6 && govern > 0.01) L.chip(s, 'set_pwm_lease · ≤ 60 %', w / 2, 23, { code: true, tone: 'info', emph: govern, alpha: govern });
    else if (act > 0.01) L.chip(s, 'bounded command', w / 2, 23, { tone: 'info', emph: act, alpha: act });
  }

  Motion.register('tamoz', {
    duration: 13,
    poster: 8.1,
    beats: [
      [0, 'Readings stream in'],
      [2.4, 'A Situation is sealed'],
      [4.2, 'Tamoz decides what'],
      [6.4, 'Policy decides how much'],
      [8.4, 'Bounded action, then learn']
    ],

    setup: function (s) {
      s.state.cam = L.camera({ yaw: -0.5, pitch: 0.36, dist: 1100, focal: 1100 });
    },

    layout: function (s) {
      if (s.compact) return;
      var cam = s.state.cam;
      s.state.yaw = -0.5;
      s.state.pitch = 0.36;
      cam.yaw = s.state.yaw; cam.pitch = s.state.pitch;
      // extents: stream, window, core, policy plane, gauge, fan, ground labels
      var pts = [[X0, 0, 0], [X0, THRESH + 16, 0], [WIN - 22, 96, 30], [WIN + 22, 0, -30],
        [CORE, 62 + 41, 0], [PLANE, 118, 55], [PLANE, 0, -60], [GAUGE, 124, 0],
        [FAN + FAN_R + 12, FAN_Y, 0], [FAN, FAN_Y + FAN_R + 12, 0], [FAN, 0, -18], [CORE, 0, -25]];
      pts.push([CORE, 62 + 41 + 34, 0], [GAUGE, 124 + 34, 0], [(FAN + CORE) / 2 + 40, FAN_Y + FAN_R + 56, 0]);
      L.fit(s, cam, pts, { top: 16, bottom: 50, left: 14, right: 14 });
    },

    draw: function (s, t) {
      if (s.compact) { drawCompact(s, t); return; }
      var g = s.g, cam = s.state.cam;
      cam.yaw = s.state.yaw + Math.sin(s.clock * 2 * Math.PI / 20) * 0.05 + s.pointer.x * 0.04;
      cam.pitch = s.state.pitch + s.pointer.y * 0.02;
      var P = cam.project;
      var reset = E.inOutSine(seg(t, 11.8, 12.6));

      // ground: dotted grid with atmospheric fade
      for (var gx = X0; gx <= FAN + 40; gx += 45) {
        for (var gz = -90; gz <= 90; gz += 45) {
          var p = P(gx, 0, gz);
          g.fillStyle = col('border', cam.fade(p.d, 300, 0.3));
          g.fillRect(p.x - 1, p.y - 1, 2, 2);
        }
      }
      // axis rail + threshold line under the stream
      var r0 = P(X0, 0, 0), r1 = P(FAN, 0, 0);
      g.beginPath(); g.moveTo(r0.x, r0.y); g.lineTo(r1.x, r1.y);
      g.strokeStyle = col('border'); g.lineWidth = 1; g.stroke();
      var th0 = P(X0, THRESH, 0), th1 = P(WIN - 30, THRESH, 0);
      g.beginPath(); g.moveTo(th0.x, th0.y); g.lineTo(th1.x, th1.y);
      g.setLineDash([3, 4]); g.strokeStyle = col('warn', 0.55); g.stroke(); g.setLineDash([]);
      L.text(s, 'threshold', th0.x + 2, th0.y - 8, { key: true, align: 'left', color: 'warn', alpha: 0.8 });

      // ---- 1. readings: stems + dots; height = temperature at emission
      var step = 0.2, now = s.clock, n = Math.ceil((WIN + 20 - X0) / (V * step)) + 1;
      var base = Math.floor(now / step) * step;
      for (var k = 0; k < n; k++) {
        var e = base - k * step, x = X0 + (now - e) * V;
        if (x > WIN + 20) continue;
        var tau = ((e % 13) + 13) % 13, v = temp(tau);
        var hot = v > THRESH;
        var a = seg(x, X0, X0 + 40) * (1 - seg(x, WIN - 10, WIN + 20));
        var pb = P(x, 0, 0), pt = P(x, v, 0);
        g.beginPath(); g.moveTo(pb.x, pb.y); g.lineTo(pt.x, pt.y);
        g.strokeStyle = col(hot ? 'warn' : 'border', a * (hot ? 0.6 : 0.9)); g.lineWidth = 1; g.stroke();
        L.token(s, pt.x, pt.y, { r: 2.4, tone: hot ? 'warn' : 'info', alpha: a * 0.95, halo: 2.5 });
      }

      // ---- 2. window → sealed Situation cube
      var seal = E.inOutCubic(seg(t, 2.6, 3.4));
      var flyU = E.inOutCubic(seg(t, 4.3, 5.1));
      var winGlow = hold(t, 2.4, 3.6, 0.3);
      L.box3(s, cam, WIN, 0, 0, 44, 96, 60, { tone: 'info', emph: winGlow, alpha: 0.9, fill: 'bg2', edgeTint: 0.35 });
      var wl = P(WIN, 0, -30);
      L.text(s, 'agentic stream', wl.x, wl.y + 14, { key: true });
      var cubeA = seal * (1 - E.outCubic(seg(t, 5.0, 5.4)));
      if (cubeA > 0.01) {
        var cx = L.lerp(WIN, CORE, flyU), cy = 48 + Math.sin(Math.PI * flyU) * 40;
        var sz = L.lerp(4, 22, seal) * (1 - 0.4 * flyU);
        L.box3(s, cam, cx, cy - sz / 2, 0, sz, sz, sz, { tone: 'warn', emph: 1, alpha: cubeA, tint: 0.1, edgeTint: 1 });
        var cl = P(cx, Math.max(cy + sz / 2 + 14, 112), 0);
        var la = cubeA * (1 - seg(t, 4.3, 4.6));
        if (la > 0.01) L.chip(s, 'situation v47', cl.x, cl.y, { tone: 'warn', emph: 1, alpha: la });
      }

      // ---- 3. Tamoz: turning octahedron; faster + accent while deciding
      var think = hold(t, 4.95, 6.6, 0.35);
      var rot = s.clock * 0.5 + think * 0.9 + E.inOutCubic(seg(t, 5.0, 6.2)) * 2.2;
      var R3 = 34, cyC = 62;
      var V6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(function (q) {
        var x = q[0] * Math.cos(rot) - q[2] * Math.sin(rot), z = q[0] * Math.sin(rot) + q[2] * Math.cos(rot);
        var y = q[1] * Math.cos(0.35) - z * Math.sin(0.35), z2 = q[1] * Math.sin(0.35) + z * Math.cos(0.35);
        return P(CORE + x * R3, cyC + y * R3 * 1.2, z2 * R3);
      });
      var stemB = P(CORE, 0, 0), stemT = P(CORE, cyC - R3 * 1.2, 0);
      g.beginPath(); g.moveTo(stemB.x, stemB.y); g.lineTo(stemT.x, stemT.y);
      g.strokeStyle = col('border'); g.lineWidth = 1; g.stroke();
      var coreC = P(CORE, cyC, 0);
      L.token(s, coreC.x, coreC.y, { r: 3 + 2 * think, alpha: 0.5 + 0.5 * think, halo: 4 + 3 * think });
      for (var i = 0; i < 6; i++) {
        for (var j = i + 1; j < 6; j++) {
          if ((i >> 1) === (j >> 1)) continue;
          var dz = (V6[i].d + V6[j].d) / 2;
          var ea = L.clamp(0.75 - dz / (R3 * 2.2), 0.25, 1);
          g.beginPath(); g.moveTo(V6[i].x, V6[i].y); g.lineTo(V6[j].x, V6[j].y);
          g.strokeStyle = col(L.mix('muted', 'accent', 0.55 + 0.45 * think), ea);
          g.lineWidth = 1.25 + 0.5 * think * ea;
          g.stroke();
        }
      }
      var tl = P(CORE, 0, -25);
      L.text(s, 'tamoz', tl.x, tl.y + 14, { key: true, color: think > 0.3 ? 'accent' : 'muted' });

      // candidate intents fan out; one is kept
      var fan = seg(t, 5.3, 5.9), keep = seg(t, 5.9, 6.3), drop = 1 - seg(t, 6.2, 6.6);
      [-0.55, 0, 0.55].forEach(function (ang, idx) {
        if (fan <= 0) return;
        var chosen = idx === 1;
        var al = (chosen ? 1 : 1 - keep) * drop * (1 - reset);
        if (!chosen && al < 0.01) return;
        var len = 46 * E.outCubic(fan);
        var ex = CORE + Math.cos(ang) * (R3 + 8 + len), ey = cyC + Math.sin(ang) * (R3 + 8 + len);
        var sx = P(CORE + Math.cos(ang) * (R3 + 8), cyC + Math.sin(ang) * (R3 + 8), 0), ep = P(ex, ey, 0);
        g.beginPath(); g.moveTo(sx.x, sx.y); g.lineTo(ep.x, ep.y);
        g.strokeStyle = col('accent', al * (chosen ? 0.9 : 0.4)); g.lineWidth = chosen ? 1.5 : 1;
        g.setLineDash(chosen ? [] : [2, 3]); g.stroke(); g.setLineDash([]);
        L.token(s, ep.x, ep.y, { r: chosen ? 3 : 2, alpha: al * (chosen ? 1 : 0.5), halo: 3 });
      });
      var ic = hold(t, 5.95, 8.5, 0.35) * (1 - reset);
      var icp = P(CORE, cyC + R3 * 1.2 + 26, 0);
      if (ic > 0.01) L.chip(s, 'intent · mode: bounded_cooling', icp.x, icp.y - (1 - ic) * 4, { emph: 1, alpha: ic, code: true });

      // intent travels core → policy plane; command continues to the fan
      var iu = seg(t, 6.45, 7.05);
      if (iu > 0 && iu < 1) {
        L.trail(s, function (u) {
          var k2 = E.inOutCubic(u);
          return P(L.lerp(CORE + R3 + 50, PLANE, k2), cyC + Math.sin(Math.PI * k2) * 18, 0);
        }, iu, { len: 0.2 });
      }

      // ---- 4. policy plane + ceiling gauge
      var pol = hold(t, 6.95, 8.2, 0.3);
      var pa = 0.85;
      var corners = [P(PLANE, 0, -55), P(PLANE, 118, -55), P(PLANE, 118, 55), P(PLANE, 0, 55)];
      g.beginPath();
      corners.forEach(function (q, ci) { if (ci) g.lineTo(q.x, q.y); else g.moveTo(q.x, q.y); });
      g.closePath();
      g.fillStyle = col('info', (0.05 + 0.1 * pol) * pa);
      g.fill();
      g.strokeStyle = col(L.mix('border', 'info', 0.5 + 0.5 * pol), pa);
      g.lineWidth = 1.25 + 0.5 * pol;
      g.stroke();
      var pl = P(PLANE, 0, -60);
      L.text(s, 'policy', pl.x, pl.y + 14, { key: true, color: pol > 0.3 ? 'info' : 'muted' });

      // gauge: a glass tube (0–100 %), a hard ceiling slice at 60 %, and the
      // policy-chosen duty filling below it — never above
      var H = 120, rise = E.outQuart(seg(t, 7.35, 8.05)) * (1 - reset);
      if (rise > 0.005) L.box3(s, cam, GAUGE, 0, 0, 16, Math.max(1, H * DUTY * rise), 16, { tone: 'info', emph: 1, tint: 0.1, edgeTint: 1 });
      L.box3(s, cam, GAUGE, 0, 0, 22, H, 22, { fill: 'bg', alpha: 0.35, tone: 'info', edgeTint: 0.25 });
      var cs = [P(GAUGE - 11, H * CEIL, -11), P(GAUGE + 11, H * CEIL, -11), P(GAUGE + 11, H * CEIL, 11), P(GAUGE - 11, H * CEIL, 11)];
      g.beginPath();
      cs.forEach(function (q, ci) { if (ci) g.lineTo(q.x, q.y); else g.moveTo(q.x, q.y); });
      g.closePath();
      g.fillStyle = col('bad', 0.12); g.fill();
      g.strokeStyle = col('bad', 0.85); g.lineWidth = 1.5; g.stroke();
      var c1 = P(GAUGE + 11, H * CEIL, -11);
      L.text(s, 'ceiling 60 %', c1.x + 8, c1.y, { key: true, align: 'left', color: 'bad', alpha: 0.9 });
      var cc = hold(t, 7.9, 10.2, 0.35) * (1 - reset);
      var ccp = P(GAUGE, H + 26, 0);
      if (cc > 0.01) L.chip(s, 'set_pwm_lease · ≤ 60 % · 10 s', ccp.x, ccp.y - (1 - cc) * 4, { tone: 'info', emph: 1, alpha: cc, code: true });

      var cu = seg(t, 8.05, 8.55);
      if (cu > 0 && cu < 1) {
        L.trail(s, function (u) {
          return P(L.lerp(GAUGE + 14, FAN - FAN_R - 6, E.inOutCubic(u)), FAN_Y, 0);
        }, cu, { tone: 'info', len: 0.25 });
      }

      // ---- 5. fan-01: post, housing, blades (motion-smeared), lease ring
      var w = spin(t);
      var phi = OMEGA * spun(t) - Math.PI / 2;
      var pb2 = P(FAN, 0, 0), pt2 = P(FAN, FAN_Y - FAN_R, 0);
      g.beginPath(); g.moveTo(pb2.x, pb2.y); g.lineTo(pt2.x, pt2.y);
      g.strokeStyle = col('border'); g.lineWidth = 2; g.stroke();
      function ringXY(r, a0, a1, style, lw) {
        g.beginPath();
        for (var q = 0; q <= 48; q++) {
          var an = a0 + (a1 - a0) * q / 48, pp = P(FAN + Math.cos(an) * r, FAN_Y + Math.sin(an) * r, 0);
          if (q) g.lineTo(pp.x, pp.y); else g.moveTo(pp.x, pp.y);
        }
        g.strokeStyle = style; g.lineWidth = lw; g.stroke();
      }
      ringXY(FAN_R + 4, 0, Math.PI * 2, col(L.mix('border', 'accent', 0.4 * w)), 1.25);
      for (var ghost = 3; ghost >= 0; ghost--) {
        var ga = ghost === 0 ? 1 : 0.22 * w;
        if (ga < 0.02) continue;
        for (var b = 0; b < 3; b++) {
          var a0 = phi - ghost * 0.14 * w + b * Math.PI * 2 / 3;
          g.beginPath();
          var pts = [[9, a0 - 0.28], [FAN_R - 3, a0 - 0.2], [FAN_R - 2, a0 + 0.24], [9, a0 + 0.3]];
          pts.forEach(function (q, qi) {
            var pp = P(FAN + Math.cos(q[1]) * q[0], FAN_Y + Math.sin(q[1]) * q[0], 0);
            if (qi) g.lineTo(pp.x, pp.y); else g.moveTo(pp.x, pp.y);
          });
          g.closePath();
          g.fillStyle = col(L.mix('bg', 'accent', 0.1 + 0.18 * w), ga);
          g.fill();
          g.strokeStyle = col(L.mix('border', 'accent', 0.35 + 0.65 * w), ga);
          g.lineWidth = 1.1;
          g.stroke();
        }
      }
      var hub = P(FAN, FAN_Y, 0);
      g.beginPath(); g.arc(hub.x, hub.y, 5 * hub.k / cam.scale, 0, Math.PI * 2);
      g.fillStyle = col('bg'); g.fill(); g.strokeStyle = col('accent'); g.lineWidth = 1.25; g.stroke();
      var lease = hold(t, 8.45, 11.6, 0.2) * (1 - seg(t, 8.6, 11.4));
      if (lease > 0.005) ringXY(FAN_R + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lease, col('info', 0.9), 2);
      var fl = P(FAN, 0, -18);
      L.text(s, 'fan-01', fl.x, fl.y + 14, { key: true, color: w > 0.3 ? 'accent' : 'muted' });

      // ---- 6. experience returns to Tamoz
      var xu = seg(t, 10.2, 11.4);
      if (xu > 0 && xu < 1) {
        L.trail(s, function (u) {
          var k3 = E.inOutCubic(u);
          return P(L.lerp(FAN, CORE, k3), FAN_Y + FAN_R + 6 + Math.sin(Math.PI * k3) * 34, 0);
        }, xu, { tone: 'info', len: 0.14 });
      }
      var xc = hold(t, 10.4, 11.9, 0.3);
      if (xc > 0.01) {
        var xp = P((FAN + CORE) / 2 + 40, FAN_Y + FAN_R + 50, 0);
        L.chip(s, 'experience', xp.x, xp.y, { tone: 'info', emph: 1, alpha: xc });
      }
    }
  });
})();
