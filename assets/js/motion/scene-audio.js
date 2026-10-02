/**
 * scene-audio.js — Handbook Chapter 22 timeline scenes (illustrative).
 * audio-clocks: the chapter's event ledger on three lanes (conversation,
 *   task, playback); correction, barge-in and reconnect each change one
 *   identity (revision, generation, owner) and never the task receipt.
 * audio-cancel: the cancellation race (.100 dispatch, .180 commit, .200
 *   cancel, .205 silence); the reply follows the executor's evidence.
 */
(function () {
  'use strict';
  if (!window.Motion) return;
  var L = Motion.lib, E = L.E, seg = L.seg, hold = L.hold, col = L.col;

  function noise(seed, n) {
    var r = L.rng(seed), out = [];
    for (var i = 0; i < n; i++) out.push(0.35 + 0.65 * r());
    return out;
  }
  var WAVE = noise(22, 160);

  // ---------------------------------------------------- shared timeline
  // k = { s, A (reset fade), X (time → x), now, ly (lane centres), bh }
  function lanes(k, x0, x1) {
    var g = k.s.g;
    for (var i = 0; i < k.ly.length; i++) {
      g.beginPath();
      g.moveTo(x0, Math.round(k.ly[i]) + 0.5);
      g.lineTo(x1, Math.round(k.ly[i]) + 0.5);
      g.strokeStyle = col('border', 0.8 * k.A);
      g.lineWidth = 1;
      g.stroke();
    }
  }
  // State bar recorded up to the cursor; o.label may list fallbacks.
  function bar(k, lane, a, b, o) {
    var s = k.s, g = s.g, xa = k.X(a), xb = k.X(Math.min(b, k.now)), e = o.emph || 0;
    if (xb - xa < 1) return;
    L.rr(g, xa, k.ly[lane] - k.bh / 2, xb - xa, k.bh, 4);
    g.fillStyle = col(L.mix('bg', o.tone, 0.08 + 0.1 * e), k.A);
    g.fill();
    g.strokeStyle = col(L.mix('border', o.tone, o.tint === undefined ? 0.75 : o.tint), k.A);
    g.lineWidth = 1.25 + 0.5 * e;
    g.stroke();
    var lb = [].concat(o.label || []).filter(function (x) {
      return x && L.measure(s, x, { size: 10 }) + 12 < xb - xa;
    })[0];
    if (lb) L.text(s, lb, xa + 6, k.ly[lane] + 0.5, { size: 10, weight: 600, align: 'left', color: o.tone, alpha: k.A });
  }
  // User speech centred on y, recorded from time a up to the cursor.
  function wave(k, a, b, y, o) {
    var g = k.s.g, xa = k.X(a), xf = k.X(b), xb = k.X(Math.min(b, k.now));
    for (var x = xa, j = o.j || 0; x <= xb; x += o.step, j++) {
      var h = o.amp * Math.pow(Math.sin(Math.PI * (x - xa) / (xf - xa)), 0.6) * WAVE[j % WAVE.length];
      g.fillStyle = col(o.tone, k.A * o.alpha);
      g.fillRect(Math.round(x), y - h, 1.5, h * 2);
    }
  }
  function link(k, t, p0, p1, t0, t1, tone) {
    var u = seg(t, t0, t1);
    if (u <= 0 || u >= 1) return;
    var p = L.path([p0, p1]);
    L.trail(k.s, function (v) { return p.at(E.inOutCubic(v)); }, u, { tone: tone, len: 0.24, alpha: k.A });
  }
  function cursor(k, yt, yb, a, head) {
    var g = k.s.g, px = Math.round(k.X(k.now)) + 0.5;
    if (a <= 0.01) return;
    g.beginPath();
    g.moveTo(px, yt);
    g.lineTo(px, yb);
    g.strokeStyle = col('accent', 0.35 * a);
    g.lineWidth = 1;
    g.stroke();
    if (!head) return;
    g.beginPath();
    g.moveTo(px - 4, yt - 5);
    g.lineTo(px + 4, yt - 5);
    g.lineTo(px, yt);
    g.closePath();
    g.fillStyle = col('accent', 0.7 * a);
    g.fill();
  }
  function line(g, x0, y0, x1, y1, tone, a, w) {
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.strokeStyle = col(tone, a);
    g.lineWidth = w || 1;
    g.stroke();
  }

  // These timelines need the stacked composition below a 680 px column.
  // Match the container queries in motion.css, rather than viewport width.

  // =============================================== audio-clocks
  var T_END = 12; // the cursor stops here; the rest beat follows
  // User speech: [start, end, caption, phone caption].
  var SPEECH = [[0.2, 1.6, '“…pond 7 oxygen falling?”', 'pond 7?'],
    [3.6, 4.6, '“actually, pond 3”', 'pond 3'],
    [7.8, 8.5, 'interrupts', 'barge-in']];
  // Assistant playback: [start, end, caption, phone caption].
  var PLAY = [[2.6, 3.4, '“I’ve queued the pond 7 check”', 'ack'],
    [7.1, 7.95, 'g4 · “About pond 3…”', 'g4'],
    [10.7, 12, 'o4 · briefing from the record', 'briefing']];
  // Causal hand-offs: [fromLane, toLane, start, end, tone].
  var LINKS = [[0, 1, 1.6, 2.1, 'accent'], [1, 2, 2.1, 2.6, 'accent'],
    [0, 1, 4.6, 5.1, 'warn'], [1, 2, 6.6, 7.1, 'info'],
    [0, 2, 7.8, 7.95, 'warn'], [1, 2, 10.2, 10.7, 'info']];
  var CHIPS = [[0.3, 3.4, 'ticket durably admitted, then acknowledged', 'accent'],
    [3.7, 6.4, 'correction: new revision · old result kept, not spoken', 'warn'],
    [7.8, 9.1, 'barge-in: new generation · result stays completed', 'warn'],
    [9.4, 11.9, 'reconnect: new owner · briefing rebuilt from the record', 'info'],
    [12.1, 13.7, 'speech expressed intent · the record kept what happened', 'info']];

  Motion.register('audio-clocks', {
    duration: 14.5,
    poster: 12.6,
    beats: [
      [0, 'Accept, admit, then acknowledge'],
      [3.5, 'Correction changes the revision'],
      [7.8, 'Barge-in clears playback only'],
      [9.2, 'Reconnect changes the owner'],
      [12, 'The receipt never moved']
    ],

    layout: function (s) {
      var c = s.compact = s.w < 680, top = c ? 8 : 40, sp = (s.h - top - (c ? 50 : 44)) / 3;
      s.state.x0 = c ? 10 : 124;
      s.state.x1 = s.w - (c ? 10 : 18);
      s.state.ly = [0, 1, 2].map(function (i) { return top + sp * (i + (c ? 0.62 : 0.5)); });
      s.state.bh = c ? 14 : 18;
    },

    draw: function (s, t) {
      var g = s.g, st = s.state, c = s.compact, ly = st.ly, x0 = st.x0, x1 = st.x1, bh = st.bh;
      var A = 1 - E.inOutSine(seg(t, 13.8, 14.3)), now = Math.min(t, T_END);
      function X(te) { return x0 + (te / T_END) * (x1 - x0); }
      function seen(te) { return te <= now; }
      var k = { s: s, A: A, X: X, now: now, ly: ly, bh: bh };
      var below = c ? 17 : 24;
      // caption clamped inside the timeline
      function cap(str, x, y, o) {
        var hw = L.measure(s, str, { size: 10 }) / 2;
        L.text(s, str, L.clamp(x, x0 + hw, x1 - hw), y,
          { size: 10, weight: 500, color: o.color || 'text2', alpha: A * o.alpha });
      }

      // ---- lanes, labels and identity readouts
      lanes(k, x0, x1);
      var names = ['conversation', 'task', 'playback'];
      var playing = PLAY.filter(function (p) { return now >= p[0] && now < p[1]; })[0];
      var states = [
        now >= 9.3 && now < 10.1 ? ['reconnecting', 'bad'] : ['listening', 'muted'],
        now < 1.6 ? null : now < 2.1 ? ['accepted', 'accent'] : now < 3.4 ? ['queued', 'muted']
          : now < 6.6 ? ['running', 'accent'] : ['completed', 'info'],
        playing ? ['playing', 'accent'] : now >= 7.95 && now < 10.7 ? ['cleared', 'warn']
          : now >= 3.4 ? ['finished', 'muted'] : null
      ];
      var ids = [
        { k: 'owner', a: 'o3', b: 'o4', at: 10.1, tone: 'info' },
        { k: 'request', a: now >= 1.6 ? 'r7/v1' : 'r7/—', b: 'r7/v2', at: 5.1, tone: 'warn' },
        { k: 'generation', a: 'g4', b: 'g5', at: 7.95, tone: 'warn' }
      ];
      for (var i = 0; i < 3; i++) {
        var id = ids[i], flip = seg(t, id.at, id.at + 0.45), glow = hold(t, id.at, id.at + 1.6, 0.25);
        var lx = c ? x0 : 16, ky = c ? ly[i] - 19 : ly[i] - 8, ry = c ? ky : ly[i] + 9;
        L.text(s, names[i], lx, ky, { key: true, align: 'left', alpha: A });
        // phones: each clock's current state rides on its label row
        if (c && states[i]) {
          L.text(s, '· ' + states[i][0], lx + L.measure(s, names[i], { key: true }) + 6, ky,
            { key: true, align: 'left', color: states[i][1], alpha: A });
        }
        var rx = c ? x1 : lx, ral = c ? 'right' : 'left', pre = c ? '' : id.k + ' ';
        if (glow > 0.01) {
          var gw = L.measure(s, pre + id.b, { mono: true, size: 10.5 }) + 10;
          L.rr(g, c ? rx - gw + 5 : rx - 5, ry - 9, gw, 18, 9);
          g.fillStyle = col(L.mix('bg', id.tone, 0.12), glow * A);
          g.fill();
          g.strokeStyle = col(id.tone, 0.7 * glow * A);
          g.lineWidth = 1;
          g.stroke();
        }
        // Fade out before fading in: overprinted IDs are hard to read.
        if (flip < 1) L.text(s, pre + id.a, rx, ry - 6 * flip, { mono: true, size: 10.5, weight: 500, align: ral, color: 'text2', alpha: A * (1 - seg(t, id.at, id.at + 0.2)) });
        if (flip > 0) L.text(s, pre + id.b, rx, ry + 6 * (1 - flip), { mono: true, size: 10.5, weight: 600, align: ral, color: glow > 0.3 ? id.tone : 'text2', alpha: A * seg(t, id.at + 0.25, id.at + 0.45) });
      }

      // ---- conversation: user speech, connection loss
      SPEECH.forEach(function (sp, n) {
        var focal = hold(t, sp[0], sp[1] + 0.8, 0.25);
        wave(k, sp[0], sp[1], ly[0], { amp: c ? 8 : 10, step: c ? 3 : 4, j: n * 37,
          tone: n === 2 ? 'warn' : 'text2', alpha: 0.45 + 0.4 * focal });
        if (seen(sp[0] + 0.3)) cap(c ? sp[3] : sp[2], (X(sp[0]) + X(sp[1])) / 2, ly[0] + below, { alpha: 0.6 + 0.4 * focal });
      });
      if (seen(9.3)) {
        var lost = hold(t, 9.3, 11, 0.25);
        g.setLineDash([3, 3]);
        line(g, X(9.3), ly[0], X(Math.min(10.1, now)), ly[0], 'bad', A * (0.45 + 0.5 * lost), 1.75);
        g.setLineDash([]);
        L.glyph(s, 'cross', X(9.3), ly[0], { r: 4, p: seg(t, 9.3, 9.6), alpha: A });
        if (seen(10.1)) {
          g.beginPath();
          g.arc(X(10.1), ly[0], 3, 0, Math.PI * 2);
          g.fillStyle = col('info', A);
          g.fill();
        }
        if (!c) cap('connection lost', X(9.7), ly[0] - 22, { color: 'bad', alpha: 0.5 + 0.5 * lost });
      }

      // ---- task: one ticket, durably recorded
      var ce = hold(t, 6.5, 7.9, 0.25) + hold(t, 12, 13.7, 0.3);
      bar(k, 1, 2.1, 3.4, { tone: 'muted', tint: 0.5, label: c ? '' : 'queued', emph: hold(t, 2.0, 3.4, 0.25) });
      bar(k, 1, 3.4, 6.6, { tone: 'accent', label: c ? '' : ['running · t7', 'running'] });
      bar(k, 1, 6.6, T_END, { tone: 'info', label: c ? '' : ['completed · receipt ✓', 'completed ✓'], emph: ce });
      if (seen(5.1)) {
        var mx = Math.round(X(5.1)) + 0.5, mk = bh / 2 + (c ? 3 : 6);
        line(g, mx, ly[1] - mk, mx, ly[1] + mk, 'warn', A, 1.75);
        if (!c) L.text(s, 'v2', mx + 4, ly[1] - bh / 2 - 8, { mono: true, size: 10, align: 'left', color: 'warn', alpha: A * (0.6 + 0.4 * hold(t, 5.1, 6.4, 0.25)) });
      }
      if (seen(5.6)) {
        // the v1 result lands in the record (hollow: kept, never presented)
        var held = hold(t, 5.6, 6.8, 0.25), hx = X(5.6);
        g.beginPath();
        g.arc(hx, ly[1] + bh / 2 + 1, 3.5, 0, Math.PI * 2);
        g.fillStyle = col('bg', A);
        g.fill();
        g.strokeStyle = col(held > 0.3 ? 'text2' : 'muted', A);
        g.lineWidth = 1.25;
        g.stroke();
        cap(c ? 'v1 kept, unspoken' : 'v1 result · kept, not spoken', hx, ly[1] + below,
          { color: held > 0.3 ? 'text' : 'text2', alpha: 0.6 + 0.4 * held });
      }
      if (seen(6.6)) L.glyph(s, 'tick', X(6.6), ly[1] - bh / 2 - 9, { r: 4, p: seg(t, 6.6, 6.9), alpha: A });

      // ---- playback: speech attempts, the cleared one, the briefing
      PLAY.forEach(function (p, n) {
        if (!seen(p[0])) return;
        var f = hold(t, p[0], p[1] + 0.6, 0.25);
        bar(k, 2, p[0], p[1], { tone: n === 2 ? 'info' : 'accent', emph: f, tint: n === 1 && now > p[1] ? 0.35 : 0.75 });
        cap(c ? p[3] : p[2], (X(p[0]) + X(p[1])) / 2, ly[2] + (n === 2 && !c ? -bh / 2 - 10 : below), { alpha: 0.6 + 0.4 * f });
      });
      if (seen(7.95)) {
        var cx = X(7.95);
        g.beginPath();
        for (var z = 0; z < 4; z++) g.lineTo(cx + (z % 2 ? 3 : -1), ly[2] - bh / 2 - 3 + z * (bh + 6) / 3);
        g.strokeStyle = col('warn', A);
        g.lineWidth = 1.75;
        g.stroke();
        if (!c) L.text(s, 'cleared', cx + 6, ly[2] - bh / 2 - 9, { size: 10, weight: 600, align: 'left', color: 'warn', alpha: A * (0.55 + 0.45 * hold(t, 7.95, 9.0, 0.2)) });
      }

      LINKS.forEach(function (lk) {
        link(k, t, [X(lk[2]), ly[lk[0]]], [X(lk[3]), ly[lk[1]]], lk[2], lk[3], lk[4]);
      });
      cursor(k, ly[0] - (c ? 26 : 30), ly[2] + bh / 2 + 6, (1 - seg(t, T_END, T_END + 0.5)) * A, true);

      // the identity that changed in this beat (desktop chip row)
      if (!c) CHIPS.forEach(function (h) {
        var a = hold(t, h[0], h[1], 0.3);
        if (a > 0.01) L.chip(s, h[2], (x0 + x1) / 2, 20, { tone: h[3], emph: 1, alpha: a * A });
      });
    }
  });

  // =============================================== audio-incident
  // The opening incident, same operator words into two designs. Left: one
  // conversation id for requests, approvals and speech. Right: the
  // separated design. Lines: [start, end, text]; voice lines add the time
  // the words finish and whether playback is cut (only words said are shown).
  var SAID = [[0.2, 1.6, 'Why is oxygen falling in pond seven?'],
    [3.0, 4.2, 'Actually, check pond three instead.'],
    [7.95, 8.4, 'No, stop.']];
  var VOICE = [
    [[1.8, 2.4, 'Checking.', 2.3], [5.6, 8.15, 'Pond seven is low. I’ll restart', 7.7, true]],
    [[1.8, 2.4, 'Checking.', 2.3], [4.5, 5.3, 'Checking pond three.', 5.2], [7.1, 8.15, 'About pond three…', 7.8, true]]
  ];
  function reveal(str, a, b, t) {
    return str.slice(0, Math.round(str.length * seg(t, a, b)));
  }
  function speaker(g, x, y, on, cut, tone, a) {
    g.beginPath();
    g.moveTo(x - 6, y - 3); g.lineTo(x - 3, y - 3); g.lineTo(x + 1, y - 7);
    g.lineTo(x + 1, y + 7); g.lineTo(x - 3, y + 3); g.lineTo(x - 6, y + 3);
    g.closePath();
    g.fillStyle = col(tone, a);
    g.fill();
    g.beginPath();
    if (on) { g.arc(x + 2, y, 6, -0.7, 0.7); }
    else if (cut) { g.moveTo(x + 4, y - 3); g.lineTo(x + 10, y + 3); g.moveTo(x + 10, y - 3); g.lineTo(x + 4, y + 3); }
    g.strokeStyle = col(tone, a);
    g.lineWidth = 1.5;
    g.stroke();
  }
  // Aerator: a ring with three blades; angle comes from the spin profile.
  function aerator(g, x, y, ang, tone, a) {
    g.beginPath();
    g.arc(x, y, 10, 0, Math.PI * 2);
    g.strokeStyle = col(tone, a);
    g.lineWidth = 1.25;
    g.stroke();
    g.beginPath();
    for (var i = 0; i < 3; i++) {
      var q = ang + i * Math.PI * 2 / 3;
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(q) * 7, y + Math.sin(q) * 7);
    }
    g.lineWidth = 1.75;
    g.stroke();
  }
  var RESTART = 8.1; // after the full phrase (7.7), before playback stops (8.15)
  function spin(t) { // accelerates smoothly over 0.8 s
    var elapsed = Math.max(0, t - RESTART);
    if (elapsed < 0.8) return 3 * elapsed * elapsed / 0.8;
    return 2.4 + 6 * (elapsed - 0.8);
  }

  Motion.register('audio-incident', {
    duration: 15.5,
    poster: 12.4,
    beats: [
      [0, 'Same question, two designs'],
      [2.9, 'The correction'],
      [5.5, 'The old result returns'],
      [7.9, '“No, stop.”'],
      [10.2, 'What actually happened']
    ],

    layout: function (s) {
      var c = s.compact = s.w < 680, st = s.state, top = c ? 34 : 46, gap = c ? 10 : 12, m = c ? 8 : 12;
      var bot = s.h - (c ? 52 : 40);
      st.P = c
        ? [{ x: m, y: top, w: s.w - 2 * m, h: (bot - top - gap) / 2 },
          { x: m, y: top + (bot - top + gap) / 2, w: s.w - 2 * m, h: (bot - top - gap) / 2 }]
        : [{ x: m, y: top, w: (s.w - 2 * m - gap) / 2, h: bot - top },
          { x: (s.w + gap) / 2, y: top, w: (s.w - 2 * m - gap) / 2, h: bot - top }];
    },

    draw: function (s, t) {
      var g = s.g, c = s.compact, P = s.state.P;
      var A = 1 - E.inOutSine(seg(t, 14.8, 15.3));
      var end = hold(t, 10.2, 15, 0.4);

      // ---- the operator's words, shared by both designs
      // the latest line stays (dimmed) until the next one starts
      SAID.forEach(function (ln, n) {
        var next = SAID[n + 1] ? SAID[n + 1][0] : 99;
        var a = E.outCubic(seg(t, ln[0], ln[0] + 0.2)) * (1 - seg(t, next - 0.3, next)) * (1 - 0.4 * seg(t, ln[1] + 1, ln[1] + 1.5)) * A;
        if (a <= 0.01) return;
        var str = '“' + reveal(ln[2], ln[0], ln[1], t) + (t >= ln[1] ? '”' : '');
        if (c) L.text(s, str, s.w / 2 - L.measure(s, '“' + ln[2] + '”', { size: 12 }) / 2, 16, { size: 12, align: 'left', alpha: a });
        else L.text(s, str, 98, 22, { size: 13, align: 'left', alpha: a });
      });
      if (!c) L.text(s, 'operator', 16, 22, { key: true, align: 'left', alpha: A });

      [0, 1].forEach(function (i) {
        var p = P[i], sep = i === 1, tone = sep ? 'info' : 'bad';
        var px = p.x + 12, cx = p.x + (c ? 12 : 74), rows = (c ? [0.36, 0.6, 0.84] : [0.3, 0.52, 0.74]).map(function (f) { return p.y + p.h * f; });
        L.rr(g, p.x, p.y, p.w, p.h, 8);
        g.fillStyle = col(L.mix('bg', tone, 0.05 * end), A);
        g.fill();
        g.strokeStyle = col(L.mix('border', tone, 0.7 * end), A);
        g.lineWidth = 1 + 0.5 * end;
        g.stroke();
        L.text(s, sep ? (c ? 'separated' : 'separated · three clocks') : (c ? 'collapsed · one id' : 'collapsed · one conversation id'), px, p.y + (c ? 13 : 17),
          { key: true, align: 'left', color: end > 0.5 ? tone : 'muted', alpha: A });
        // phones drop the row labels; the speaker and aerator glyphs carry them
        if (!c) ['voice', 'record', 'effect'].forEach(function (n, r) {
          L.text(s, n, px, rows[r], { key: true, align: 'left', alpha: 0.8 * A });
        });

        // voice row: what the speaker is saying, and when it is cut
        var lines = VOICE[i], cur = null;
        lines.forEach(function (v) { if (t >= v[0]) cur = v; });
        var playing = cur && t < cur[1];
        speaker(g, cx + 6, rows[0], playing, cur && cur[4] && !playing, playing ? 'accent' : 'muted', A);
        if (cur) {
          var said = reveal(cur[2], cur[0], cur[3], t), w = L.measure(s, said, { size: c ? 11 : 12 });
          L.text(s, said, cx + 20, rows[0], { size: c ? 11 : 12, weight: 500, align: 'left', color: playing ? 'text' : 'text2', alpha: A });
          if (cur[4] && t >= cur[1]) {
            var zx = cx + 22 + w;
            g.beginPath();
            for (var z = 0; z < 4; z++) g.lineTo(zx + (z % 2 ? 3 : -1), rows[0] - 8 + z * 16 / 3);
            g.strokeStyle = col('warn', A);
            g.lineWidth = 1.75;
            g.stroke();
            if (!c || i === 1) L.text(s, 'sound stops', c ? zx + 8 : cx + 20, rows[0] + (c ? 0 : 16), { size: 10, weight: 600, align: 'left', color: 'warn', alpha: A * (0.5 + 0.5 * hold(t, 8.15, 9.6, 0.25)) });
          }
        }

        // record row
        if (!sep) {
          L.text(s, 'conversation c1', cx, rows[1], { mono: true, size: 10.5, weight: 500, align: 'left', color: 'text2', alpha: A });
          var why = hold(t, 3.2, 5.4, 0.25);
          if (why > 0.01) L.text(s, '· correction not tracked', cx + L.measure(s, 'conversation c1', { mono: true, size: 10.5 }) + 8, rows[1],
            { size: 10, weight: 500, align: 'left', color: 'warn', alpha: why * A });
          var old = hold(t, 5.5, 7.2, 0.25);
          if (old > 0.01) L.text(s, '· old pond 7 result spoken', cx + L.measure(s, 'conversation c1', { mono: true, size: 10.5 }) + 8, rows[1],
            { size: 10, weight: 500, align: 'left', color: 'bad', alpha: old * A });
        } else {
          var flip = E.outCubic(seg(t, 4.3, 4.75)), glow = hold(t, 4.3, 5.8, 0.25);
          var rid = t < 1.7 ? 'r7/—' : flip < 0.5 ? 'r7/v1' : 'r7/v2';
          L.text(s, 'request ' + rid, cx, rows[1], { mono: true, size: 10.5, weight: glow > 0.3 ? 600 : 500, align: 'left',
            color: glow > 0.3 ? 'warn' : 'text2', alpha: A });
          var rw = cx + L.measure(s, 'request r7/v2', { mono: true, size: 10.5 }) + 10;
          if (t >= 5.6) {
            var held = hold(t, 5.6, 7.3, 0.25);
            g.beginPath();
            g.arc(rw + 3, rows[1], 3.5, 0, Math.PI * 2);
            g.strokeStyle = col(held > 0.3 ? 'text2' : 'muted', A);
            g.lineWidth = 1.25;
            g.stroke();
            L.text(s, 'v1 result held', rw + 11, rows[1],
              { size: 10, weight: 500, align: 'left', color: held > 0.3 ? 'text' : 'text2', alpha: A * (0.6 + 0.4 * held) });
            if (!c) L.text(s, 'its proposed restart: not approved, not run', cx, rows[1] + 16,
              { size: 10, weight: 500, align: 'left', color: 'text2', alpha: A * (0.6 + 0.4 * held) });
          }
        }

        // effect row: the aerator, and what the dashboard later shows
        var ang = sep ? 0 : spin(t), run = !sep && t >= RESTART;
        aerator(g, cx + 10, rows[2], ang, run ? 'bad' : 'muted', A);
        var fx = cx + 28, show = seg(t, 10.2, 10.6);
        var state = sep ? (show > 0 ? 'unchanged · no action admitted' : 'aerator 2 · idle')
          : show > 0 ? 'dashboard: aerator 2 restarted' : run ? 'aerator 2 · restart sent' : 'aerator 2 · idle';
        L.text(s, state, fx, rows[2], { size: c ? 10.5 : 11, weight: show > 0 ? 600 : 500, align: 'left',
          color: show > 0 ? tone : run ? 'bad' : 'text2', alpha: A });
        if (!sep && !c) {
          var pa = hold(t, 7.6, 9.6, 0.25);
          if (pa > 0.01) L.text(s, 'its own phrase became the action', fx, rows[2] + 16, { size: 10, weight: 500, align: 'left', color: 'bad', alpha: pa * A });
        }
        // the verdict, once the dashboard is read
        var vd = hold(t, 10.8, 15, 0.4) * A;
        if (vd > 0.01) {
          var vs = sep ? 'speech ≠ effect' : 'the plausible lie';
          L.text(s, vs, c ? p.x + p.w - 12 : px, c ? p.y + 13 : p.y + p.h - 16, { key: true, align: c ? 'right' : 'left', color: tone, alpha: vd });
        }

        // causal tokens
        if (!sep) {
          link({ s: s, A: A }, t, [cx + 6, rows[1]], [cx + 6, rows[0]], 5.3, 5.6, 'bad');
          var rx = cx + 20 + L.measure(s, VOICE[0][1][2], { size: c ? 11 : 12 }) - 20;
          link({ s: s, A: A }, t, [rx, rows[0] + 8], [cx + 10, rows[2]], 7.7, RESTART, 'bad');
        } else {
          link({ s: s, A: A }, t, [cx + 6, rows[1]], [cx + 6, rows[0]], 6.8, 7.1, 'info');
        }
      });
    }
  });

  // =============================================== audio-cancel
  var MS0 = 80, MS1 = 220;
  // Scene seconds → milliseconds on the axis; slows down around the race.
  var KEYS = [[0, 80], [1.2, 100], [3.6, 180], [5.0, 198], [5.8, 200], [6.6, 205], [7.2, 214]];
  function msAt(t) {
    for (var i = 1; i < KEYS.length; i++) {
      if (t < KEYS[i][0]) return L.lerp(KEYS[i - 1][1], KEYS[i][1], (t - KEYS[i - 1][0]) / (KEYS[i][0] - KEYS[i - 1][0]));
    }
    return KEYS[KEYS.length - 1][1];
  }
  // A candidate reply; struck through as `p` goes 0 → 1.
  function strike(s, str, x, y, size, p, a) {
    var w = L.measure(s, str, { size: size });
    L.text(s, str, x, y, { size: size, align: 'left', color: p > 0.5 ? 'muted' : 'text', alpha: a });
    if (p > 0) line(s.g, x, y, x + w * E.outCubic(p), y, 'bad', a, 1.5);
    return w;
  }

  Motion.register('audio-cancel', {
    duration: 13.5,
    poster: 11.2,
    beats: [
      [0, 'Restart dispatched'],
      [3.3, 'Remote system commits'],
      [5.0, 'Cancel lands; sound stops'],
      [7.4, 'Silence is not cancellation'],
      [9.4, 'Say what the record shows']
    ],

    layout: function (s) {
      var c = s.compact = s.w < 680, st = s.state;
      st.x0 = c ? 10 : 124;
      st.x1 = c ? s.w - 10 : Math.round(s.w * 0.58);
      st.axis = c ? 24 : 34;
      var top = c ? 54 : 76, bot = c ? s.h - 104 : s.h - 96;
      st.ly = [0, 1, 2].map(function (i) { return top + (bot - top) * i / 2; });
      // the reply panel: right column on desktop, bottom band on phones
      st.panel = c ? { x: 10, y: bot + 20, w: s.w - 20 }
        : { x: st.x1 + 28, y: 52, w: s.w - st.x1 - 44, h: s.h - 106 };
    },

    draw: function (s, t) {
      var g = s.g, st = s.state, c = s.compact, ly = st.ly, x0 = st.x0, x1 = st.x1, bh = c ? 13 : 16;
      var A = 1 - E.inOutSine(seg(t, 12.8, 13.3)), now = msAt(t);
      function X(ms) { return x0 + (ms - MS0) / (MS1 - MS0) * (x1 - x0); }
      function seen(ms) { return ms <= now; }
      var k = { s: s, A: A, X: X, now: now, ly: ly, bh: bh };
      var bottom = ly[2] + bh;

      // ---- millisecond axis with the quoted instants
      g.beginPath();
      g.moveTo(x0, st.axis + 0.5);
      g.lineTo(x1, st.axis + 0.5);
      for (var m = MS0; m <= MS1; m += 20) {
        g.moveTo(Math.round(X(m)) + 0.5, st.axis - 3);
        g.lineTo(Math.round(X(m)) + 0.5, st.axis + 3);
      }
      g.strokeStyle = col('border', A);
      g.lineWidth = 1;
      g.stroke();
      [[100, 'accent'], [180, 'info'], [200, 'warn']].forEach(function (q) {
        if (!seen(q[0])) return;
        var qx = Math.round(X(q[0])) + 0.5;
        L.text(s, '.' + q[0], qx, st.axis - 11, { mono: true, size: 10, weight: 600, color: q[1], alpha: A });
        g.setLineDash([2, 3]);
        line(g, qx, st.axis + 4, qx, bottom, q[1], 0.22 * A);
        g.setLineDash([]);
      });
      if (!c) L.text(s, '10:00:00', x0 - 10, st.axis - 11, { mono: true, size: 10, weight: 500, color: 'muted', align: 'right', alpha: A });

      lanes(k, x0, x1);
      ['voice', 'executor', 'remote system'].forEach(function (n, i) {
        L.text(s, n, c ? x0 : 16, c ? ly[i] - 15 : ly[i], { key: true, align: 'left', alpha: A });
      });

      // voice: assistant speaking until .205; the user's "cancel" over it
      // (phones overlay the speech on the lane itself: the channel is full duplex)
      bar(k, 0, MS0, 205, { tone: 'accent', label: c ? '' : 'assistant speaking' });
      var amp = c ? 6 : 8, wy = c ? ly[0] : ly[0] + bh / 2 + 6 + amp;
      wave(k, 152, 198, wy, { amp: amp, step: 3, tone: 'warn', alpha: 0.75 });
      if (seen(160) && !c) L.text(s, '“cancel that”', X(175), wy + amp + 10, { size: 10, weight: 500, color: 'text2', alpha: A });
      if (seen(205)) {
        var sx = X(205), sy = ly[0] - bh / 2 - 10;
        L.glyph(s, 'cross', sx, sy, { r: 3.5, tone: 'warn', p: seg(t, 6.6, 6.9), alpha: A });
        L.text(s, c ? '.205' : 'sound stops .205', sx - 9, sy, { mono: true, size: 10, weight: 600, align: 'right', color: 'warn', alpha: A * (0.6 + 0.4 * hold(t, 6.6, 8.4, 0.25)) });
      }

      // executor: restart dispatched at .100, cancel request at .200
      if (seen(100)) bar(k, 1, 100, MS1, { tone: 'accent', emph: hold(t, 1.0, 3.4, 0.25), label: c ? 'restart' : 'restart dispatched' });
      if (seen(200)) {
        var cx = X(200);
        L.rr(g, cx - 5, ly[1] - 5, 10, 10, 2);
        g.fillStyle = col(L.mix('bg', 'warn', 0.25), A);
        g.fill();
        g.strokeStyle = col('warn', A);
        g.lineWidth = 1.25;
        g.stroke();
        L.text(s, c ? 'cancel .200' : 'cancel request', cx, c ? ly[1] - 15 : ly[1] + bh / 2 + 14,
          { size: 10, weight: 600, color: 'warn', alpha: A * (0.6 + 0.4 * hold(t, 5.8, 7.4, 0.25)) });
      }

      // remote: accepted (committed) at .180
      if (seen(180)) {
        bar(k, 2, 180, MS1, { tone: 'info', emph: Math.min(1, hold(t, 3.5, 5.0, 0.25) + hold(t, 7.4, 9.2, 0.3)) });
        L.glyph(s, 'tick', X(180) - 9, ly[2], { r: 4, p: seg(t, 3.6, 3.9), alpha: A });
        L.text(s, c ? 'committed' : 'accepted · committed', X(180) - 16, ly[2], { size: 10, weight: 600, align: 'right', color: 'info', alpha: A });
      }

      // the gap that decides the wording: commit (.180) precedes cancel (.200)
      var gap = hold(t, 7.4, 9.4, 0.3);
      if (gap > 0.01) {
        var gy = c ? ly[2] - bh / 2 - 5 : ly[2] + bh / 2 + 10;
        L.arrow(s, L.path([[X(180), gy], [X(200), gy]]), { tone: 'info', alpha: gap * A, headSize: 5, to: E.outCubic(seg(t, 7.4, 7.9)) });
        if (!c) L.text(s, 'commit came first', X(190), gy + 13, { key: true, color: 'info', alpha: gap * A });
      }

      link(k, t, [X(100), ly[1]], [X(180), ly[2]], 1.2, 3.6, 'accent');
      link(k, t, [X(198), wy], [X(200), ly[1]], 5.0, 5.8, 'warn');
      cursor(k, st.axis + 4, bottom, (1 - seg(t, 7.2, 7.7)) * A, false);

      // ---- what the voice may say
      var P = st.panel, show = seg(t, 7.3, 7.7) * A;
      if (show <= 0.01) return;
      var bad = seg(t, 8.2, 8.6), good = seg(t, 9.4, 9.8), tick = seg(t, 9.9, 10.2), undo = hold(t, 10.5, 12.6, 0.3);
      var sub = { size: 10, weight: 500, align: 'left', color: 'text2' };
      function note(str, x, y, a, tone) {
        sub.alpha = a;
        sub.color = tone || 'text2';
        L.text(s, str, x, y, sub);
      }
      if (!c) {
        var px = P.x + 14, r1 = P.y + 52, r2 = P.y + 106, r3 = P.y + P.h - 38;
        L.rr(g, P.x, P.y, P.w, P.h, 8);
        g.strokeStyle = col('border', show);
        g.lineWidth = 1;
        g.stroke();
        L.text(s, 'what the voice may say', px, P.y + 18, { key: true, align: 'left', alpha: show });
        strike(s, '“Cancelled.”', px, r1, 13, bad, show);
        if (bad > 0) {
          L.glyph(s, 'cross', P.x + P.w - 18, r1, { r: 4.5, p: bad, alpha: A });
          note('stopped sound ≠ cancelled effect', px, r1 + 17, bad * A);
        }
        if (good > 0) {
          L.text(s, '“It already completed.”', px, r2, { size: 13, align: 'left', alpha: good * A });
          L.glyph(s, 'tick', P.x + P.w - 18, r2, { r: 4.5, p: tick, alpha: A });
          note('matches the executor’s evidence', px, r2 + 17, tick * A);
        }
        if (undo > 0.01) {
          line(g, px, r3 - 18.5, P.x + P.w - 14, r3 - 18.5, 'border', undo * A);
          L.text(s, 'undo would be a new action', px, r3, { key: true, align: 'left', color: 'warn', alpha: undo * A });
          note('with its own authority and approval', px, r3 + 16, undo * A);
        }
      } else {
        // phones: one candidate at a time in a bottom band
        var y = P.y + 8, first = 1 - seg(t, 9.0, 9.4);
        if (first > 0.01) {
          var wc = strike(s, '“Cancelled.”', P.x + 4, y, 12, bad, show * first);
          if (bad > 0) {
            L.glyph(s, 'cross', P.x + wc + 16, y, { r: 4, p: bad, alpha: first * A });
            note('commit .180 came before cancel .200', P.x + 4, y + 17, bad * first * A);
          }
        }
        if (good > 0) {
          var wg = L.measure(s, '“It already completed.”', { size: 12 });
          L.text(s, '“It already completed.”', P.x + 4, y, { size: 12, align: 'left', alpha: good * A });
          L.glyph(s, 'tick', P.x + wg + 16, y, { r: 4, p: tick, alpha: A });
          note(undo > 0.3 ? 'undo = new action, own approval' : 'matches the executor’s evidence', P.x + 4, y + 17,
            tick * A, undo > 0.3 ? 'warn' : 'text2');
        }
      }
    }
  });
})();
