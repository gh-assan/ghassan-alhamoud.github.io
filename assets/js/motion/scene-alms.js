/**
 * scene-alms.js — "Learn once, share by tag."
 * Six agents on an orbit around ALMS. Agent A hits a vendor-API edge
 * case, publishes the learning, ALMS syncs it only to agents with the
 * same tag (with acknowledgement), agent B reuses it, and the fleet keeps
 * working while ALMS is offline. Illustrative; see /projects/alms.html.
 */
(function () {
  'use strict';
  if (!window.Motion) return;
  var L = Motion.lib, E = L.E, seg = L.seg, hold = L.hold, col = L.col;

  var R = 200;
  var AGENTS = [
    { id: 'A', deg: -60, tag: 'accent' },
    { id: 'B', deg: 0, tag: 'accent' },
    { id: 'C', deg: 60, tag: 'info' },
    { id: 'D', deg: 120, tag: 'accent' },
    { id: 'E', deg: 180, tag: 'info' },
    { id: 'F', deg: 240, tag: 'info' }
  ];
  var VENDOR = [R * 1.55, 0, -R * 0.15];
  var CORE_H = 46;

  // Beat timing (seconds).
  var T = {
    callA: [0.35, 1.15], errBack: [1.25, 1.95], errRing: [1.95, 2.7],
    pub: [2.85, 3.85], absorb: [3.85, 4.5],
    sync: [4.8, 5.85], ack: [6.15, 6.95],
    callB: [7.85, 8.6], okBack: [8.7, 9.35], okTick: [9.35, 9.8],
    off: [9.95, 12.55], reset: [13.2, 14]
  };

  function pos(a, lift) {
    var r = a.deg * Math.PI / 180;
    return [Math.cos(r) * R, lift === undefined ? 24 : lift, Math.sin(r) * R];
  }

  // Arc through 3D space between world points, projected each call.
  function fly(cam, a, b, h) {
    return function (u) {
      var k = E.inOutCubic(L.clamp(u, 0, 1));
      return cam.project(
        a[0] + (b[0] - a[0]) * k,
        a[1] + (b[1] - a[1]) * k + Math.sin(Math.PI * k) * h,
        a[2] + (b[2] - a[2]) * k);
    };
  }

  function travel(s, cam, a, b, h, win, t, tone, alpha) {
    var u = seg(t, win[0], win[1]);
    if (u <= 0 || u >= 1) return;
    var at = fly(cam, a, b, h);
    L.trail(s, function (v) { return at(v); }, u, { tone: tone, alpha: alpha === undefined ? 1 : alpha, len: 0.16 });
  }

  Motion.register('alms', {
    duration: 14,
    poster: 5.6,
    beats: [
      [0, 'Agent A hits an edge case'],
      [2.7, 'A publishes the learning'],
      [4.6, 'Sync by tag, with ack'],
      [7.6, 'B reuses it, no rediscovery'],
      [9.8, 'Offline: agents keep working']
    ],

    setup: function (s) {
      s.state.cam = L.camera({ pitch: 0.56, dist: 1100, focal: 1100 });
    },

    layout: function (s) {
      var cam = s.state.cam;
      VENDOR[0] = R * (s.compact ? 1.42 : 1.55);
      cam.yaw = 0; cam.pitch = 0.56;
      // extents: orbit (with agent discs), agent tops, core, vendor box + label
      var pts = [[0, CORE_H, 0], [VENDOR[0] + 34, 0, VENDOR[2] - 30], [VENDOR[0] + 34, 38, VENDOR[2] + 30], [VENDOR[0] - 34, 64, VENDOR[2]]];
      for (var i = 0; i < 12; i++) {
        var a = i / 12 * Math.PI * 2;
        pts.push([Math.cos(a) * (R + 16), 0, Math.sin(a) * (R + 16)], [Math.cos(a) * R, 42, Math.sin(a) * R]);
      }
      L.fit(s, cam, pts, { top: s.compact ? 44 : 50, bottom: 34, left: 12, right: 12 });
    },

    draw: function (s, t) {
      var g = s.g, cam = s.state.cam, c = L.colors();
      cam.yaw = Math.sin(s.clock * 2 * Math.PI / 22) * 0.1 + s.pointer.x * 0.05;
      cam.pitch = 0.56 + s.pointer.y * 0.03;

      var offline = hold(t, T.off[0], T.off[1], 0.45);
      var reset = E.inOutSine(seg(t, T.reset[0], T.reset[1]));
      var syncFocus = hold(t, 4.6, 7.6, 0.4);

      // orbit + spokes
      L.ring3(s, cam, 0, 0, 0, R, { alpha: 0.9, dash: [3, 5] });
      L.ring3(s, cam, 0, 0, 0, R * 0.36, { alpha: 0.5 });

      // registry spokes; heartbeats ride them agent → core, and stall
      // half-way while ALMS is offline
      var P0 = AGENTS.map(function (a) { return pos(a); });
      AGENTS.forEach(function (a, i) {
        var pa = cam.project(P0[i][0] * 0.9, P0[i][1], P0[i][2] * 0.9);
        var pc = cam.project(P0[i][0] * 0.24, CORE_H * 0.5, P0[i][2] * 0.24);
        var dim = (a.tag === 'info' ? 1 - 0.6 * syncFocus : 1) * cam.fade(cam.project(P0[i][0], 0, P0[i][2]).d, R, 0.5);
        g.beginPath();
        g.moveTo(pa.x, pa.y);
        g.lineTo(pc.x, pc.y);
        g.strokeStyle = col('border', (0.9 - 0.5 * offline) * dim);
        g.lineWidth = 1;
        g.setLineDash(offline > 0.5 ? [2, 4] : []);
        g.stroke();
        g.setLineDash([]);
        var u = ((s.clock + i * 0.61) % 3.6) / 1.6;
        if (u < 1 && !(offline > 0.5 && u > 0.5)) {
          var hb = 0.55 * dim * (offline > 0.5 ? 1 - seg(u, 0.3, 0.5) : 1) * L.hold(u, 0, 1, 0.15);
          L.token(s, L.lerp(pa.x, pc.x, u), L.lerp(pa.y, pc.y, u), { r: 1.9, tone: a.tag, alpha: hb, halo: 3 });
        }
      });

      // agents: learned flags
      var learned = [
        E.outCubic(seg(t, 2.45, 2.85)),
        E.outBack(seg(t, T.sync[1] - 0.1, T.sync[1] + 0.3)),
        0,
        E.outBack(seg(t, T.sync[1] - 0.05, T.sync[1] + 0.35)),
        0, 0
      ].map(function (v) { return v * (1 - reset); });

      var P = AGENTS.map(function (a) { return pos(a); });
      var proj = P.map(function (p) { return cam.project(p[0], p[1], p[2]); });
      var order = [0, 1, 2, 3, 4, 5].sort(function (i, j) { return proj[j].d - proj[i].d; });

      function drawAgent(i) {
        var a = AGENTS[i], p = proj[i], base = cam.project(P[i][0], 0, P[i][2]);
        var fade = cam.fade(p.d, R, 0.55);
        var dim = a.tag === 'info' ? 1 - 0.55 * syncFocus : 1;
        var alpha = fade * dim;
        var r = (s.compact ? 10 : 12.5) * p.k / cam.scale;
        g.beginPath();
        g.moveTo(base.x, base.y);
        g.lineTo(p.x, p.y + r);
        g.strokeStyle = col('border', alpha);
        g.lineWidth = 1;
        g.stroke();
        g.beginPath();
        g.ellipse(base.x, base.y, r * 0.6, r * 0.22, 0, 0, Math.PI * 2);
        g.fillStyle = col('border', 0.5 * alpha);
        g.fill();

        var err = i === 0 ? hold(t, T.errBack[1] - 0.1, T.pub[0], 0.25) : 0;
        var ok = i === 1 ? hold(t, T.okBack[1], 9.95, 0.25) : 0;
        var tone = err > 0.01 ? 'bad' : ok > 0.01 ? 'info' : a.tag;
        var emph = Math.max(err, ok, i === 0 ? hold(t, T.callA[0] - 0.2, T.pub[1], 0.3) * 0.6 : 0,
          i === 1 ? hold(t, T.callB[0] - 0.2, T.okBack[1], 0.3) * 0.6 : 0);

        // offline: each agent keeps a local rhythm (it is still working)
        if (offline > 0.01) {
          var br = (s.clock * 0.9 + i * 0.17) % 1;
          g.beginPath();
          g.arc(p.x, p.y, r + 3 + br * 9, 0, Math.PI * 2);
          g.strokeStyle = col(a.tag, offline * (1 - br) * 0.5 * alpha);
          g.lineWidth = 1.25;
          g.stroke();
        }

        if (emph > 0.01) {
          g.beginPath();
          g.arc(p.x, p.y, r + 8, 0, Math.PI * 2);
          g.strokeStyle = col(tone, 0.18 * emph * alpha);
          g.lineWidth = 5;
          g.stroke();
        }
        g.beginPath();
        g.arc(p.x, p.y, r, 0, Math.PI * 2);
        g.fillStyle = col(L.mix('bg', tone, 0.08 + 0.1 * emph), alpha);
        g.fill();
        g.strokeStyle = col(L.mix('border', tone, 0.65 + 0.35 * emph), alpha);
        g.lineWidth = 1.25 + 0.5 * emph;
        g.stroke();
        L.text(s, a.id, p.x, p.y + 0.5, { size: s.compact ? 10 : 11, weight: 700, color: emph > 0.3 ? tone : 'text', alpha: alpha });

        // error pulse ring
        if (i === 0) {
          var er = seg(t, T.errRing[0], T.errRing[1]);
          if (er > 0 && er < 1) {
            g.beginPath();
            g.arc(p.x, p.y, r + 4 + er * 18, 0, Math.PI * 2);
            g.strokeStyle = col('bad', (1 - er) * 0.7);
            g.lineWidth = 1.5;
            g.stroke();
          }
        }
        // learned badge: small diamond
        var lv = learned[i];
        if (lv > 0.01) {
          var bx = p.x + r * 0.78, by = p.y - r * 0.78, bs = 4.2 * lv;
          g.beginPath();
          g.moveTo(bx, by - bs); g.lineTo(bx + bs, by); g.lineTo(bx, by + bs); g.lineTo(bx - bs, by);
          g.closePath();
          g.fillStyle = col('accent', alpha);
          g.fill();
          g.strokeStyle = col('bg', alpha);
          g.lineWidth = 1.5;
          g.stroke();
        }
        if (i === 1) {
          L.glyph(s, 'tick', p.x, p.y - r - 12, { p: E.outCubic(seg(t, T.okTick[0], T.okTick[1])) * (1 - seg(t, 10.2, 10.7)), r: 5 });
        }
      }

      // far agents, core, near agents
      var coreDrawn = false;
      order.forEach(function (i) {
        if (!coreDrawn && proj[i].d < 0) { drawCore(); coreDrawn = true; }
        drawAgent(i);
      });
      if (!coreDrawn) drawCore();

      function drawCore() {
        var pulse = hold(t, T.absorb[0] - 0.1, T.absorb[1] + 0.3, 0.3);
        var sending = hold(t, T.sync[0] - 0.2, T.ack[1], 0.3) * 0.7;
        var e = Math.max(pulse, sending) * (1 - offline);
        var a = 1 - 0.55 * offline;
        L.cyl3(s, cam, 0, 0, 0, 44, CORE_H, { emph: e, alpha: a, tint: 0.03, edgeTint: 0.45 * (1 - offline), dash: offline > 0.5 ? [4, 4] : null });
        // stored learnings: thin rings stacking inside the core
        var n = seg(t, T.absorb[0], T.absorb[1]) > 0.5 && t < T.reset[1] ? 3 : 2;
        for (var k = 0; k < n; k++) {
          L.ring3(s, cam, 0, 10 + k * 11, 0, 44, { alpha: (k === 2 ? 0.8 * (1 - reset) : 0.5) * a, stroke: k === 2 ? col('accent', 0.8 * (1 - reset) * a) : null });
        }
        var top = cam.project(0, CORE_H, 0);
        L.text(s, 'ALMS', top.x, top.y + 1, { size: s.compact ? 10 : 12, weight: 700, alpha: a });
        var back = Math.min.apply(null, proj.map(function (p) { return p.y; }));
        var chipY = Math.min(top.y - 30, back - (s.compact ? 22 : 26));
        var lc = hold(t, T.absorb[0], 9.7, 0.35);
        if (lc > 0.01) L.chip(s, 'learning stored', top.x, chipY + (1 - lc) * 4, { emph: 1, alpha: lc });
        if (offline > 0.01) L.chip(s, 'offline', top.x, chipY + (1 - offline) * 4, { emph: 1, tone: 'warn', alpha: offline });
      }

      // vendor API box
      var vtone = hold(t, T.errBack[0] - 0.1, T.errRing[1], 0.25) > 0.01 ? 'bad' : 'info';
      var vemph = Math.max(hold(t, T.callA[1] - 0.1, T.errBack[0] + 0.3, 0.2), hold(t, T.callB[1] - 0.1, T.okBack[0] + 0.3, 0.2));
      L.box3(s, cam, VENDOR[0], 0, VENDOR[2], 64, 38, 56, { tone: vtone, emph: vemph, tint: 0.02, edgeTint: 0.25 });
      var vt = cam.project(VENDOR[0], 38, VENDOR[2]);
      var vw = L.measure(s, 'vendor API', { key: true });
      L.text(s, 'vendor API', Math.min(vt.x, s.w - 12 - vw / 2), vt.y - 26, { key: true });

      var cTop = [0, CORE_H, 0];
      var vFront = [VENDOR[0] - 34, 22, VENDOR[2]];
      travel(s, cam, P[0], vFront, 30, T.callA, t, 'accent');
      travel(s, cam, vFront, P[0], 30, T.errBack, t, 'bad');
      travel(s, cam, P[0], cTop, 16, T.pub, t, 'accent');
      travel(s, cam, cTop, P[1], 16, T.sync, t, 'accent');
      travel(s, cam, cTop, P[3], 16, T.sync, t, 'accent');
      travel(s, cam, P[1], cTop, 8, T.ack, t, 'info', 0.85);
      travel(s, cam, P[3], cTop, 8, T.ack, t, 'info', 0.85);
      travel(s, cam, P[1], vFront, 30, T.callB, t, 'accent');
      travel(s, cam, vFront, P[1], 30, T.okBack, t, 'info');

      // tag legend
      if (s.compact) {
        var x0 = 14;
        [['vendor-api', 'accent', 1], ['deploy', 'info', 1 - 0.5 * syncFocus]].forEach(function (l) {
          g.beginPath();
          g.arc(x0 + 3, 18, 3, 0, Math.PI * 2);
          g.fillStyle = col(l[1], l[2]);
          g.fill();
          L.text(s, 'tag · ' + l[0], x0 + 11, 18.5, { key: true, align: 'left', alpha: l[2] });
          x0 += 22 + L.measure(s, 'tag · ' + l[0], { key: true });
        });
      } else {
        var ly = 22, lx = s.w - 14;
        var w2 = L.chip(s, 'tag · deploy', lx, ly, { align: 'right', tone: 'info', emph: 0.6 * (1 - syncFocus) + 0.2, alpha: 1 - 0.4 * syncFocus });
        L.chip(s, 'tag · vendor-api', lx - w2 - 8, ly, { align: 'right', emph: 0.6 + 0.4 * syncFocus });
      }
    }
  });
})();
