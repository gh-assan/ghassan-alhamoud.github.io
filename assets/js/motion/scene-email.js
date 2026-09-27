/**
 * scene-email.js — "Mail becomes queryable knowledge."
 * Mail lands on an immutable Maildir stack; a copy passes through
 * enrichment and splits into shards stored across SQLite layers (FTS5,
 * vectors, facts · actions, events); an agent queries through MCP and
 * gets an answer; its reply is a draft that waits for review and leaves
 * only through the allowlist. Illustrative; see
 * /projects/email-intelligence-platform.html.
 */
(function () {
  'use strict';
  if (!window.Motion) return;
  var L = Motion.lib, E = L.E, seg = L.seg, hold = L.hold, col = L.col;

  var MD = -270, PR = -115, DBX = 50, AG = 290;
  var LAYERS = [
    { y: 84, name: 'fts5' }, { y: 58, name: 'vectors' },
    { y: 32, name: 'facts · actions' }, { y: 6, name: 'events' }
  ];
  var ARRIVE = [0.3, 1.0, 1.7];

  function hash(i) {
    var x = Math.sin(i * 91.7 + 13.1) * 43758.5453;
    return x - Math.floor(x);
  }

  Motion.register('email', {
    duration: 13,
    poster: 7.4,
    beats: [
      [0, 'Mail lands in Maildir'],
      [2.8, 'Enriched into knowledge'],
      [6.2, 'Agents query through MCP'],
      [9.2, 'Draft first, allowlist to send']
    ],

    setup: function (s) {
      s.state.cam = L.camera({ yaw: -0.2, pitch: 0.5, dist: 2600, focal: 2600 });
    },

    layout: function (s) {
      var cam = s.state.cam, c = s.compact;
      s.state.yaw = c ? -0.78 : -0.2;
      s.state.pitch = c ? 0.6 : 0.56;
      cam.yaw = s.state.yaw; cam.pitch = s.state.pitch;
      // extents: maildir + lock, prism, sqlite layers (+ labels), agent,
      // review tray, allowlist gate and the outgoing path
      var pts = [[MD - 34, 0, -24], [MD + 34, 0, 24], [MD, 64, 0], [PR - 28, 52, 0],
        [DBX - 56, 0, -42], [DBX + 56, 92, 42], [DBX, 104, 40], [AG - 18, 50, 0], [AG + 18, 0, -18],
        [AG - 26, 0, -78], [AG + 110, 0, -60], [AG + 70, 44, -60], [AG, 0, -96]];
      if (!c) pts.push([DBX + 150, 84, -40]);
      L.fit(s, cam, pts, { top: c ? 36 : 20, bottom: c ? 58 : 44, left: 12, right: c ? 20 : 12 });
    },

    draw: function (s, t) {
      var g = s.g, cam = s.state.cam, P = cam.project;
      cam.yaw = s.state.yaw + Math.sin(s.clock * 2 * Math.PI / 24) * 0.06 + s.pointer.x * 0.04;
      cam.pitch = s.state.pitch + s.pointer.y * 0.02;
      var reset = E.inOutSine(seg(t, 12.1, 12.9));

      // ground links
      function link(a, b, tone, alpha, dash) {
        var p1 = P(a[0], a[1], a[2]), p2 = P(b[0], b[1], b[2]);
        g.beginPath(); g.moveTo(p1.x, p1.y); g.lineTo(p2.x, p2.y);
        g.strokeStyle = col(tone || 'border', alpha || 1); g.lineWidth = 1;
        if (dash) g.setLineDash(dash);
        g.stroke(); g.setLineDash([]);
      }
      link([MD, 0, 0], [PR, 0, 0]);
      link([PR, 0, 0], [DBX - 55, 0, 0]);
      link([DBX + 55, 0, 0], [AG, 0, 0]);
      link([AG, 0, 0], [AG, 0, -60]);
      link([AG, 0, -60], [AG + 100, 0, -60], 'border', 1, [3, 4]);

      // ---- Maildir: base stack + arrivals (never modified in place)
      var n = 3;
      ARRIVE.forEach(function (a) { n += E.outCubic(seg(t, a, a + 0.5)) * (1 - reset); });
      for (var i = 0; i < 6; i++) {
        var land = i < 3 ? 1 : L.clamp(n - i, 0, 1);
        if (land <= 0) continue;
        var y = i * 7 + (1 - land) * 60;
        L.box3(s, cam, MD, y, 0, 64, 5, 46, { tone: 'info', emph: i >= 3 ? 0.4 * (1 - seg(t, ARRIVE[i - 3] + 0.5, ARRIVE[i - 3] + 1.2)) : 0, alpha: i < 3 ? 1 : land, edgeTint: 0.35 });
      }
      var top = P(MD, 6 * 7 + 18, 0);
      // lock glyph
      g.strokeStyle = col('info'); g.lineWidth = 1.4;
      g.beginPath(); g.arc(top.x, top.y - 4, 3.5, Math.PI, 0); g.stroke();
      L.rr(g, top.x - 5.5, top.y - 4, 11, 8, 2); g.fillStyle = col('bg'); g.fill(); g.stroke();
      var ml = P(MD, 0, -30);
      L.text(s, s.compact ? 'maildir' : 'maildir · immutable', ml.x, ml.y + 16, { key: true });

      // ---- enrichment prism (triangular, wireframe)
      var glow = hold(t, 3.5, 4.4, 0.25);
      var tri = [[-26, 0], [26, 0], [0, 44]], Z = 22;
      var front = tri.map(function (q) { return P(PR + q[0], q[1] + 8, -Z); });
      var back = tri.map(function (q) { return P(PR + q[0], q[1] + 8, Z); });
      g.lineWidth = 1.25 + 0.5 * glow;
      g.strokeStyle = col(L.mix('border', 'accent', 0.45 + 0.55 * glow));
      g.fillStyle = col('accent', 0.05 + 0.1 * glow);
      [back, front].forEach(function (f) {
        g.beginPath(); g.moveTo(f[0].x, f[0].y); g.lineTo(f[1].x, f[1].y); g.lineTo(f[2].x, f[2].y); g.closePath();
        g.fill(); g.stroke();
      });
      for (i = 0; i < 3; i++) { g.beginPath(); g.moveTo(front[i].x, front[i].y); g.lineTo(back[i].x, back[i].y); g.stroke(); }
      var pl = P(PR, 0, -30);
      L.text(s, 'enrich', pl.x, pl.y + 16, { key: true, color: glow > 0.3 ? 'accent' : 'muted' });

      // copy of the newest mail travels to the prism (the original stays)
      var cu = seg(t, 2.9, 3.6);
      if (cu > 0 && cu < 1) {
        var k = E.inOutCubic(cu);
        L.box3(s, cam, L.lerp(MD, PR, k), 40 + Math.sin(Math.PI * k) * 30 - 30 * k + 8, 0, 40, 4, 30,
          { tone: 'info', emph: 1, alpha: 0.9 * Math.min(1, (1 - cu) * 4), edgeTint: 1 });
      }

      // ---- SQLite layers with stored items
      var q = hold(t, 6.9, 8.6, 0.3);
      for (var li = LAYERS.length - 1; li >= 0; li--) {
        var Ly = LAYERS[li], land2 = seg(t, 4.55 + li * 0.1, 4.9 + li * 0.1);
        var hit = hold(t, 4.8 + li * 0.1, 5.8, 0.3);
        L.box3(s, cam, DBX, Ly.y, 0, 110, 4, 80, { tone: 'accent', emph: Math.max(hit, q * 0.6), alpha: 0.9, tint: 0.01, edgeTint: 0.3 });
        for (var d = 0; d < 6; d++) {
          var fresh = d === 5;
          var a = fresh ? land2 * (1 - reset) : 0.55;
          if (a <= 0.01) continue;
          var px = DBX - 44 + hash(li * 7 + d) * 88, pz = -30 + hash(li * 7 + d + 3) * 60;
          var pp = P(px, Ly.y + 5, pz);
          var lit = fresh || d % 2 === 0 ? q : 0;
          L.token(s, pp.x, pp.y, { r: fresh ? 2.6 : 2, tone: fresh || lit > 0.2 ? 'accent' : 'muted', alpha: Math.min(1, a + lit), halo: fresh ? 3 : 2 });
        }
        var lp = P(DBX + 58, Ly.y + 2, -40);
        if (!s.compact) L.text(s, Ly.name, lp.x + 8, lp.y, { key: true, align: 'left', color: hit > 0.3 ? 'accent' : 'muted' });
      }
      var dl = P(DBX, LAYERS[0].y + 4, 40);
      L.text(s, 'sqlite', dl.x, dl.y - 14, { key: true, color: 'text2' });

      // shards: prism → each layer
      LAYERS.forEach(function (Ly, li) {
        var u = seg(t, 4.1 + li * 0.1, 4.9 + li * 0.1);
        if (u <= 0 || u >= 1) return;
        var tx = DBX - 44 + hash(li * 7 + 5) * 88, tz = -30 + hash(li * 7 + 8) * 60;
        L.trail(s, function (v) {
          var k2 = E.inOutCubic(v);
          return P(L.lerp(PR + 20, tx, k2), L.lerp(30, Ly.y + 5, k2) + Math.sin(Math.PI * k2) * 30, L.lerp(0, tz, k2));
        }, u, { len: 0.18, r: 2.6 });
      });

      // ---- agent + MCP
      var aglow = Math.max(hold(t, 6.3, 7.0, 0.2), hold(t, 8.4, 9.1, 0.25), hold(t, 9.3, 9.8, 0.2));
      L.box3(s, cam, AG, 0, 0, 34, 34, 34, { tone: 'accent', emph: aglow, edgeTint: 0.45 });
      var al = P(AG, 34, 0);
      L.text(s, 'agent', al.x, al.y - 14, { key: true, color: aglow > 0.3 ? 'accent' : 'muted' });
      var mc = P(L.lerp(DBX + 55, AG, s.compact ? 0.35 : 0.64), 0, 0);
      L.chip(s, 'mcp', mc.x, mc.y - 16, { emph: q > 0.1 || hold(t, 6.3, 8.6, 0.2) > 0.1 ? 1 : 0.3 });
      var qu = seg(t, 6.35, 6.95), au = seg(t, 7.85, 8.45);
      if (qu > 0 && qu < 1) L.trail(s, function (v) { return P(L.lerp(AG - 18, DBX + 56, E.inOutCubic(v)), 50, 0); }, qu, { len: 0.2 });
      if (au > 0 && au < 1) L.trail(s, function (v) { return P(L.lerp(DBX + 56, AG - 18, E.inOutCubic(v)), 50, 0); }, au, { tone: 'info', len: 0.2 });

      // ---- draft → review → allowlist
      var tray = [AG, 0, -60];
      L.box3(s, cam, tray[0], 0, tray[2], 50, 6, 34, { tone: 'info', emph: hold(t, 9.9, 11.0, 0.25), edgeTint: 0.3 });
      var tl = P(tray[0] - 40, 0, tray[2]);
      L.text(s, 'review', tl.x - 4, tl.y, { key: true, align: 'right' });
      var gx = AG + 70;
      [-18, 18].forEach(function (z) {
        L.box3(s, cam, gx, 0, -60 + z, 5, 30, 5, { tone: 'info', emph: hold(t, 10.9, 11.7, 0.2), edgeTint: 0.5 });
      });
      var gl = P(gx, 30, -60);
      var gb = P(gx, 0, -60);
      L.text(s, 'allowlist', s.compact ? gb.x : gl.x, s.compact ? gb.y + 14 : gl.y - 12, { key: true, color: hold(t, 10.9, 11.7, 0.2) > 0.3 ? 'info' : 'muted' });

      var du = seg(t, 9.4, 10.0), wait = hold(t, 9.95, 11.0, 0.15), go = seg(t, 11.0, 11.8);
      if (du > 0 && go < 1) {
        var kx, ky, kz;
        if (du < 1) { var k3 = E.inOutCubic(du); kx = AG; ky = L.lerp(34, 8, k3) + Math.sin(Math.PI * k3) * 12; kz = L.lerp(0, -60, k3); }
        else { var k4 = E.inOutCubic(go); kx = L.lerp(AG, AG + 110, k4); ky = 8; kz = -60; }
        var da = Math.min(1, (1 - go) * 3);
        L.box3(s, cam, kx, ky, kz, 26, 3, 18, { tone: 'accent', emph: 1, alpha: da, edgeTint: 1 });
        if (wait > 0.01) {
          var dq = P(kx, 0, kz - 40);
          L.chip(s, 'draft · awaits review', s.compact ? s.w - 12 : dq.x, s.compact ? 20 : dq.y + 26, { tone: 'info', emph: 1, alpha: wait, align: s.compact ? 'right' : undefined });
        }
        var tk = P(AG + 24, 20, -60);
        L.glyph(s, 'tick', tk.x, tk.y, { p: seg(t, 10.6, 10.9) * (1 - seg(t, 11.3, 11.6)), r: 4.5 });
      }

      // arriving mail from outside
      ARRIVE.forEach(function (a) {
        var u = seg(t, a - 0.45, a);
        if (u <= 0 || u >= 1) return;
        var p = P(MD, 110 - 70 * E.inCubic(u), 0);
        L.token(s, p.x, p.y, { r: 2.4, tone: 'info', alpha: u * 0.9, halo: 3 });
      });
    }
  });
})();
