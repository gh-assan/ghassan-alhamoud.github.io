/* IOT-001 chapter scenes; reuse the personal website's shared Motion runtime.
 * iot-evidence:  one LED bench, three cases. The command record never changes;
 *                the wire, the light and the observer decide the verdict.
 * iot-fan:       the recorded fan incident in four stages. Software reports
 *                stay the same while the jumpers and the shaft change.
 * iot-tests:     which diagnostic could tell the candidate causes apart.
 * All timings are teaching beats, not measured hardware times.
 */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : this;

  // ------------------------------------------------------------ models
  // Pure state functions, exported for causal tests before any drawing.
  function benchAt(t, scenario) {
    var wired = scenario !== 'wiring';
    var lit = t >= 7.2 && wired;
    var observed = scenario === 'blind' ? 'blind' : wired ? 'lit' : 'dark';
    return {
      command: t >= 2,
      pin: t >= 4,
      current: t >= 6 && wired,
      lit: lit,
      light: t >= 8.6 && lit,
      reachesSensor: t >= 8.6 && lit && scenario !== 'blind',
      observation: t >= 10.4 ? observed : 'pending',
      verdict: t < 12 ? 'pending' : scenario === 'blind' ? 'effect_unknown' :
        wired ? 'effect_consistent' : 'effect_contradicted'
    };
  }

  // Recorded stages (round-008). Rotation is operator-observed.
  var FAN_STAGES = [
    { key: 'Stage 1 of 4 · Governed commands ×6 · 8–9 Sep', driver: 'Firmware drives',
      jumpers: 'wrong', leads: 'driver', software: 'executed · energized: true', spins: false,
      saw: 'no rotation, no sound',
      say: 'Every record said the outputs were driven. The fan did not move.' },
    { key: 'Stage 2 of 4 · Raw full-power sketch · 9 Sep', driver: 'Raw sketch drives',
      jumpers: 'wrong', leads: 'driver', software: 'forward-full pwm=255', spins: false,
      saw: 'no twitch, no hum',
      say: 'The bypass skipped governance but kept the same pin map. Same failure.' },
    { key: 'Stage 3 of 4 · Motor touched to its supply · 9 Sep', driver: 'Not involved',
      jumpers: 'wrong', leads: 'supply', software: 'no software involved', spins: true,
      saw: 'rotation',
      say: 'Motor and supply work. The fault is somewhere in the driver stage.' },
    { key: 'Stage 4 of 4 · Jumpers moved to D6 / D7 · 9 Sep', driver: 'Firmware drives',
      jumpers: 'moving', leads: 'driver', software: 'executed · energized: true', spins: true,
      saw: 'rotation, seen and heard',
      say: 'Same software record as stage 1. Only the wiring and the shaft changed.' }
  ];
  var FAN_STAGE = 8;
  function fanAt(t) {
    var i = Math.min(Math.floor(t / FAN_STAGE), FAN_STAGES.length - 1);
    var st = FAN_STAGES[i], u = t - i * FAN_STAGE;
    var move = st.jumpers === 'moving' ? clamp01((u - 0.6) / 1.4) : 0;
    var firmware = st.leads === 'driver';
    var drive = firmware && u >= 2.2;
    var inputsDriven = drive && u >= 3.6 && move >= 1;
    return {
      stage: i, u: u, def: st, move: move,
      pinsDriven: drive,
      enDriven: drive && u >= 3.6,
      inputsDriven: inputsDriven,
      leadsOnSupply: st.leads === 'supply' && u >= 1.2,
      spinning: st.spins && (st.leads === 'supply' ? u >= 2.6 : inputsDriven && u >= 4.2),
      software: (firmware ? u >= 4.6 : u >= 2.0) ? st.software : null,
      saw: u >= 5.4 ? st.saw : null,
      hindsight: i < 2 && u >= 6.2,
      say: u >= 5.8 ? st.say : null
    };
  }

  // Each cell: what the test would show if that cause were the only fault.
  var CAUSES = ['Firmware / governance path', 'Startup torque', 'Motor or leads',
    'Motor supply (VCC2)', 'Common ground', 'Inputs not on D6 / D7'];
  var TESTS = [
    { name: ['Raw sketch,', 'full power'], ran: true, pred: ['spins', 'spins', 'still', 'still', 'still', 'still'],
      obs: 'still', say: 'Four causes all predicted “still”. The bypass could only rule out two.' },
    { name: ['Meter across', 'motor'], ran: false, pred: [null, null, '~supply V', '~0 V', '~0 V', '~0 V'],
      obs: 'not run', say: 'Proposed, not run. About 0 V would rule out the motor; supply, ground and wiring look alike.' },
    { name: ['Motor on', 'supply'], ran: true, pred: [null, null, 'still', 'spins', 'spins', 'spins'],
      obs: 'spins', say: 'The motor spins on its own supply. Motor and leads are fine.' },
    { name: ['Jumpers vs', 'pin map'], ran: true, pred: [null, null, null, 'match', 'match', 'mismatch'],
      obs: 'mismatch', confirm: 5, say: 'Inputs are on D4 / D3, not D6 / D7. A wiring fault is confirmed; others could still coexist.' },
    { name: ['Rewire,', 'then run'], ran: true, pred: [null, null, null, 'still', 'still', 'spins'],
      obs: 'spins', say: 'Rewiring alone fixed it, so supply and ground were not also at fault.' }
  ];
  var TEST_START = 2, TEST_SPAN = 6.4;
  function testsAt(t) {
    var alive = CAUSES.map(function () { return true; }), confirmed = -1, out = [];
    for (var j = 0; j < TESTS.length; j++) {
      var u = t - (TEST_START + j * TEST_SPAN), T = TESTS[j];
      var col = { shown: u >= 0, preds: [], observed: u >= 2.8 ? T.obs : null, judged: u >= 3.4,
        say: u >= 3.4 ? T.say : null, removed: [] };
      for (var i = 0; i < CAUSES.length; i++) {
        var shownPred = alive[i] && T.pred[i] && u >= 0.8 + 0.3 * i;
        col.preds.push(shownPred ? T.pred[i] : null);
      }
      // Finding one fault does not exclude others, so a confirming test removes nothing.
      if (col.judged && T.ran && T.confirm === undefined) {
        for (i = 0; i < CAUSES.length; i++) {
          if (alive[i] && T.pred[i] && T.pred[i] !== T.obs) { alive[i] = false; col.removed.push(i); }
        }
      }
      if (col.judged && T.confirm !== undefined) {
        confirmed = T.confirm;
      }
      out.push(col);
    }
    var active = Math.max(-1, Math.min(TESTS.length - 1, Math.floor((t - TEST_START) / TEST_SPAN)));
    return { cols: out, alive: alive, confirmed: confirmed, active: active };
  }

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  root.IoTVisual = { benchAt: benchAt, fanAt: fanAt, testsAt: testsAt, stateAt: benchAt,
    FAN_STAGES: FAN_STAGES, TESTS: TESTS, CAUSES: CAUSES };

  if (!root.Motion || !root.Motion.lib || !root.Motion.lib.node) return;
  var Motion = root.Motion, L = Motion.lib, E = L.E, seg = L.seg, col = L.col;

  // ------------------------------------------------------------ framing
  // Each scene is drawn in a fixed design box, scaled to the stage. Desktop
  // boxes only scale up (labels never shrink); compact boxes are designed for
  // 300 px and stay within 2 % of it on the narrowest supported column.
  var RAIL = 48;
  function framed(s, box, draw) {
    var k = Math.min(s.w / box[0], (s.h - RAIL) / box[1]);
    // Compact designs keep 6 px side margins, so the narrowest column (294 px)
    // can draw them at full size rather than shrinking labels below 10 px.
    if (k < 1 && s.w >= box[0] - 10 && s.h - RAIL >= box[1]) k = 1;
    var v = Object.create(s);
    v.w = box[0]; v.h = box[1]; v.k = k;
    s.g.save();
    s.g.translate((s.w - box[0] * k) / 2, 8);
    s.g.scale(k, k);
    try { draw(v); } finally { s.g.restore(); }
  }
  function isCompact(s) { return s.w < 680; }
  function line(v, pts, tone, a, w, dash) {
    var g = v.g;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.strokeStyle = col(tone, a === undefined ? 1 : a);
    g.lineWidth = w || 1.25;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    if (dash) g.setLineDash(dash);
    g.stroke();
    g.setLineDash([]);
  }
  function box(v, x, y, w, h, o) {
    o = o || {};
    L.rr(v.g, x, y, w, h, o.r || 7);
    v.g.fillStyle = col(o.fill ? L.mix('bg', o.fill, o.tint || 0.1) : 'bg', o.alpha === undefined ? 1 : o.alpha);
    v.g.fill();
    v.g.strokeStyle = col(o.edge || 'border', o.alpha === undefined ? 1 : o.alpha);
    v.g.lineWidth = o.width || 1.25;
    if (o.dash) v.g.setLineDash(o.dash);
    v.g.stroke();
    v.g.setLineDash([]);
  }
  // Wrap text to a width; returns the number of lines drawn.
  function wrap(v, str, x, y, maxW, o) {
    o = o || {};
    var words = String(str).split(' '), lines = [], cur = '';
    words.forEach(function (w) {
      var next = cur ? cur + ' ' + w : w;
      if (cur && L.measure(v, next, o) > maxW) { lines.push(cur); cur = w; } else cur = next;
    });
    if (cur) lines.push(cur);
    var lh = o.lh || (o.size || 12) * 1.4;
    lines.forEach(function (ln, i) { L.text(v, ln, x, y + i * lh, o); });
    return lines.length;
  }
  function fade(t, a, d) { return E.outCubic(seg(t, a, a + (d || 0.4))); }
  function travel(v, p, t, a, b, tone, r) {
    var u = seg(t, a, b);
    if (u <= 0 || u >= 1) return;
    L.trail(v, function (x) { return p.at(E.inOutCubic(x)); }, u, { tone: tone, len: 0.2, r: r || 3.4 });
  }
  function resistor(v, x0, x1, y, a) {
    var pts = [[x0, y]], n = 6, w = (x1 - x0 - 12) / n;
    pts.push([x0 + 6, y]);
    for (var i = 0; i < n; i++) pts.push([x0 + 6 + w * (i + 0.5), y + (i % 2 ? 5 : -5)]);
    pts.push([x1 - 6, y], [x1, y]);
    line(v, pts, 'text2', a, 1.25);
  }
  function ground(v, x, y, a) {
    line(v, [[x, y], [x, y + 8]], 'text2', a);
    line(v, [[x - 8, y + 8], [x + 8, y + 8]], 'text2', a);
    line(v, [[x - 5, y + 12], [x + 5, y + 12]], 'text2', a);
    line(v, [[x - 2, y + 16], [x + 2, y + 16]], 'text2', a);
  }
  function led(v, x, y, glow, a) {
    if (glow > 0.01) L.token(v, x, y, { tone: 'warn', r: 7 * glow + 1, halo: 5, alpha: glow });
    v.g.beginPath();
    v.g.arc(x, y, 9, 0, Math.PI * 2);
    v.g.fillStyle = col(L.mix('bg', 'warn', 0.75 * glow), a);
    v.g.fill();
    v.g.strokeStyle = col(L.mix('border', 'warn', glow), a);
    v.g.lineWidth = 1.5;
    v.g.stroke();
  }
  function pin(v, x, y, label, driven, a, w) {
    w = w || 30;
    L.rr(v.g, x - w / 2, y - 9, w, 18, 4);
    v.g.fillStyle = col(driven ? L.mix('bg', 'accent', 0.9) : 'bg', a);
    v.g.fill();
    v.g.strokeStyle = col(driven ? 'accent' : 'border', a);
    v.g.lineWidth = 1.25;
    v.g.stroke();
    L.text(v, label, x, y + 0.5, { size: 10, weight: 700, color: driven ? 'bg' : 'text2', alpha: a });
  }

  // =============================================== scene 1: the LED bench
  var BENCH_BEATS = [[0, 'Ready'], [2, 'Command issued'], [4, 'Pin driven'], [6, 'Current'],
    [8.6, 'Light'], [10.4, 'Observation'], [12, 'Compare']];
  var BENCH_SAY = {
    ready: 'The reading has crossed the threshold. The controller is about to act.',
    command: 'The controller records its command: LED on.',
    pin: 'D9 goes HIGH. Readback confirms the pin level, and nothing more.',
    current: { baseline: 'Current flows from D9 through the resistor and LED.',
      blind: 'Current flows from D9 through the resistor and LED.',
      wiring: 'The LED’s jumper is on D10. D9 is HIGH but drives nothing.' },
    light: { baseline: 'Light reaches the sensor.', blind: 'The LED is lit, but a cap blocks the sensor.',
      wiring: 'No light. The sensor sees only the room.' },
    obs: { baseline: 'The sensor reports light.', blind: 'The sensor reads darker than “LED off”: it is blind.',
      wiring: 'The sensor reports dark: the same as LED off.' },
    verdict: { baseline: 'Command and observation agree: effect consistent.',
      blind: 'Lit or not, this observer cannot tell us: effect unknown.',
      wiring: 'Command says on; observation says dark: effect contradicted.' }
  };
  function benchSay(t, sc) {
    if (t < 2) return BENCH_SAY.ready;
    if (t < 4) return BENCH_SAY.command;
    if (t < 6) return BENCH_SAY.pin;
    if (t < 8.6) return BENCH_SAY.current[sc];
    if (t < 10.4) return BENCH_SAY.light[sc];
    if (t < 12) return BENCH_SAY.obs[sc];
    return BENCH_SAY.verdict[sc];
  }
  var VERDICT = {
    pending: ['No verdict yet', 'needs an observation', 'muted'],
    effect_consistent: ['Consistent', 'on = lit', 'info'],
    effect_contradicted: ['Contradicted', 'on ≠ dark', 'warn'],
    effect_unknown: ['Unknown', 'observer blind', 'muted']
  };

  function benchGeometry(compact) {
    if (compact) return {
      box: [300, 470], headline: [150, 12, 'Same command. Different outcomes.'],
      keySoft: [8, 32], keyBench: [62, 196], boundary: 182,
      cards: { cmd: [74, 68], rb: [74, 124], obs: [226, 68], ver: [226, 124] }, cw: 136, ch: 46,
      header: [14, 252, 150, 28], pins: { D9: [50, 266], D10: [92, 266], GND: [134, 266] }, megaLabel: [168, 266, 'left'],
      res: [96, 136, 318], led: [162, 318], ledGnd: [190, 318], sensor: [252, 318, 84, 40],
      cmdPath: [[50, 192], [50, 255]], rbPath: null, obsPath: [[252, 297], [252, 192]],
      say: [8, 386, 284], crossCmd: [58, 214, 'left'], crossObs: [244, 210, 'right'], note: [104, 236]
    };
    return {
      box: [680, 370], headline: [340, 12, 'The command record is the same in all three cases. The bench is not.'],
      keySoft: [12, 34], keyBench: [12, 182], boundary: 166,
      cards: { cmd: [110, 82], rb: [262, 82], obs: [470, 82], ver: [610, 82] }, cw: 130, ch: 52,
      header: [74, 232, 156, 30], pins: { D9: [110, 247], D10: [152, 247], GND: [194, 247] },
      res: [250, 300, 300], led: [334, 300], ledGnd: [364, 300], sensor: [470, 300, 108, 44],
      cmdPath: [[110, 108], [110, 236]], rbPath: [[122, 236], [122, 200], [262, 200], [262, 110]],
      obsPath: [[470, 277], [470, 110]], megaLabel: [66, 247, 'right'],
      say: [12, 348, 656], crossCmd: [102, 150, 'right'], crossObs: [482, 150, 'left'], note: [240, 247]
    };
  }

  Motion.register('iot-evidence', {
    duration: 18,
    poster: 14,
    beats: BENCH_BEATS,
    setup: function (s) { if (s.btn.parentNode) s.btn.click(); },
    layout: function (s) { s.state.geo = benchGeometry(isCompact(s)); },
    draw: function (s, t) {
      var G = s.state.geo, sc = s.fig.dataset.scenario || 'wiring', st = benchAt(t, sc);
      framed(s, G.box, function (v) {
        var compact = G.box[0] < 400;
        L.text(v, G.headline[2], G.headline[0], G.headline[1], { size: compact ? 13 : 14 });
        L.text(v, 'Software records', G.keySoft[0], G.keySoft[1], { key: true, align: 'left' });
        L.text(v, 'Bench · illustrative', G.keyBench[0], G.keyBench[1], { key: true, align: 'left', color: 'info' });
        line(v, [[4, G.boundary], [G.box[0] - 4, G.boundary]], 'border', 1, 1, [5, 5]);

        // Records. Command and readback are identical in every case.
        var C = G.cards, cw = G.cw, ch = G.ch;
        var v0 = VERDICT[st.verdict];
        var cards = [
          [C.cmd, 'Command', st.command ? 'commanded: 1' : 'not issued', 'accent', st.command, t >= 2 && t < 4],
          [C.rb, 'Pin readback', st.pin ? 'D9: 1' : '—', 'accent', st.pin, t >= 4 && t < 6],
          [C.obs, 'Observation', st.observation === 'pending' ? 'waiting' : st.observation === 'blind' ? 'sensor covered' : 'light: ' + st.observation,
            st.observation === 'dark' ? 'warn' : 'info', st.observation !== 'pending', t >= 10.4 && t < 12],
          [C.ver, v0[0], v0[1], v0[2], st.verdict !== 'pending', t >= 12]
        ];
        cards.forEach(function (c) {
          L.node(v, { x: c[0][0], y: c[0][1], w: cw, h: ch, title: c[1], sub: c[2], size: 13,
            tone: c[3], emph: c[5] ? 0.9 : c[4] ? 0.35 : 0, tint: c[4] ? 0.45 : 0, alpha: c[4] || c[5] ? 1 : 0.75 });
        });
        if (!compact) {
          var cmpA = 1, p = L.path([[C.obs[0] + cw / 2, C.obs[1]], [C.ver[0] - cw / 2 - 3, C.ver[1]]]);
          L.arrow(v, p, { tone: 'info', alpha: cmpA });
        }

        // Bench: header strip, pins, jumper, resistor, LED, sensor.
        var H = G.header, P = G.pins;
        box(v, H[0], H[1], H[2], H[3], { r: 5, fill: 'text2', tint: 0.06 });
        L.text(v, compact ? 'Mega' : 'Mega header', G.megaLabel[0], G.megaLabel[1], { size: 10, align: G.megaLabel[2], color: 'muted' });
        pin(v, P.D9[0], P.D9[1], 'D9', st.pin, 1);
        pin(v, P.D10[0], P.D10[1], 'D10', false, 1);
        pin(v, P.GND[0], P.GND[1], 'GND', false, 1);

        var from = sc === 'wiring' ? P.D10 : P.D9;
        var R = G.res, LED = G.led;
        var jumper = L.path(L.bez([from[0], from[1] + 9], [from[0], R[2]], [from[0] + 30, R[2]], [R[0], R[2]], 18));
        L.arrow(v, jumper, { tone: sc === 'wiring' && t >= 6 ? 'warn' : 'text2', head: false, width: 1.75 });
        resistor(v, R[0], R[1], R[2], 1);
        L.text(v, '330 Ω', (R[0] + R[1]) / 2, R[2] + 16, { size: 10, color: 'muted' });
        line(v, [[R[1], R[2]], [LED[0] - 9, LED[1]]], 'text2');
        line(v, [[LED[0] + 9, LED[1]], [G.ledGnd[0], LED[1]]], 'text2');
        ground(v, G.ledGnd[0], LED[1], 1);
        var glow = st.lit ? E.outCubic(seg(t, 7.2, 7.8)) : 0;
        led(v, LED[0], LED[1], glow, 1);
        L.text(v, 'LED', LED[0], LED[1] + 20, { size: 10, color: 'muted' });
        travel(v, jumper, t, 6.1, 7.1, 'accent');
        if (sc === 'wiring' && t >= 6.2) {
          L.chip(v, 'D9 drives nothing', G.note[0], G.note[1], { tone: 'warn', emph: 1, align: 'left' });
        }

        var S = G.sensor, sx = S[0] - S[2] / 2;
        var capped = sc === 'blind' && t >= 6;  // the cap hides the sensor's own label
        L.node(v, { x: S[0], y: S[1], w: S[2], h: S[3], title: capped ? '' : 'Light sensor', sub: capped ? '' : 'on A0', size: 11,
          tone: 'info', emph: t >= 10.4 && t < 12 ? 0.9 : 0, tint: st.observation !== 'pending' ? 0.4 : 0 });
        if (st.light) {
          [-8, 0, 8].forEach(function (dy, i) {
            var end = sc === 'blind' ? sx - 6 : sx - 2;
            var ray = L.path([[LED[0] + 13, LED[1] + dy * 0.4], [end, S[1] + dy]]);
            L.arrow(v, ray, { tone: 'warn', alpha: 0.7, dash: [3, 4], head: false });
            travel(v, ray, t, 8.6 + i * 0.12, 9.6 + i * 0.12, 'warn', 2.6);
          });
        }
        if (sc === 'blind' && t >= 6) {
          var ca = fade(t, 6, 0.6);
          box(v, sx - 4, S[1] - S[3] / 2 - 4, S[2] + 8, S[3] + 8, { fill: 'text', tint: 0.85, edge: 'text', alpha: ca });
          L.text(v, 'Cap', S[0], S[1], { size: 12, color: 'bg', alpha: ca });
        }

        // Boundary crossings.
        var cmdP = L.path(G.cmdPath);
        L.arrow(v, cmdP, { tone: 'accent', alpha: st.command ? 1 : 0.35, width: 1.5 });
        travel(v, cmdP, t, 2.4, 3.8, 'accent');
        if (G.rbPath) {
          var rbP = L.path(G.rbPath);
          L.arrow(v, rbP, { tone: 'accent', alpha: st.pin ? 0.8 : 0.3, dash: [4, 4] });
          travel(v, rbP, t, 4.4, 5.6, 'accent', 3);
        }
        var obsP = L.path(G.obsPath);
        L.arrow(v, obsP, { tone: 'info', alpha: st.observation !== 'pending' ? 1 : 0.35, width: 1.5 });
        travel(v, obsP, t, 10.4, 11.6, 'info');
        L.text(v, 'Actuation', G.crossCmd[0], G.crossCmd[1], { size: 10, weight: 700, color: 'accent', align: G.crossCmd[2] });
        L.text(v, 'Observation', G.crossObs[0], G.crossObs[1], { size: 10, weight: 700, color: 'info', align: G.crossObs[2] });

        var say = benchSay(t, sc), sa = 1;
        wrap(v, say, G.say[0], G.say[1], G.say[2], { size: compact ? 12 : 13, align: 'left', color: 'text', alpha: sa });
        if (compact) wrap(v, 'Readback and the command record are identical in all three cases.', G.say[0], G.say[1] + 50, G.say[2],
          { size: 11, align: 'left', color: 'muted', weight: 500 });
      });
    }
  });

  // ============================================ scene 2: the fan incident
  function fanGeometry(compact) {
    if (compact) return {
      box: [300, 520], key: [8, 14], lanes: { soft: 50, saw: 96 }, laneLabelX: 8, chipX: 8, chipDy: 18,
      panel: [8, 186, 104, 118], rows: { D5: 230, D6: 260, D7: 290 },
      headerX: 140, pinY: { D3: 170, D4: 200, D5: 230, D6: 260, D7: 290 }, megaY: 312, noteY: 148,
      chip: [190, 180, 70, 130], inY: { A1: 208, EN: 238, A2: 268 },
      fan: [235, 382, 30], supply: [80, 382, 100, 30],
      leads: [[[130, 374], [205, 374]], [[130, 390], [205, 390]]],
      outs: [[[205, 310], [226, 353]], [[245, 310], [244, 353]]], say: [8, 440, 284]
    };
    return {
      box: [680, 370], key: [12, 14], lanes: { soft: 44, saw: 72 }, laneLabelX: 12, chipX: 170, chipDy: 0,
      panel: [24, 144, 132, 136], rows: { D5: 196, D6: 226, D7: 256 },
      headerX: 222, pinY: { D3: 136, D4: 166, D5: 196, D6: 226, D7: 256 }, megaY: 114, noteY: 96,
      chip: [370, 150, 90, 126], inY: { A1: 176, EN: 211, A2: 246 },
      fan: [590, 212, 40], supply: [590, 316, 118, 30],
      leads: [[[580, 301], [580, 252]], [[600, 301], [600, 252]]],
      outs: [[[460, 198], [520, 198], [554, 206]], [[460, 226], [520, 226], [554, 220]]], say: [12, 344, 656]
    };
  }
  function blades(v, x, y, r, angle, tone, a) {
    var g = v.g;
    g.save();
    g.translate(x, y);
    g.rotate(angle);
    for (var i = 0; i < 3; i++) {
      g.rotate(Math.PI * 2 / 3);
      g.beginPath();
      g.ellipse(0, -r * 0.48, r * 0.17, r * 0.42, 0, 0, Math.PI * 2);
      g.fillStyle = col(L.mix('bg', tone, 0.35), a);
      g.fill();
      g.strokeStyle = col(tone, a);
      g.lineWidth = 1.25;
      g.stroke();
    }
    g.restore();
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.strokeStyle = col('border', a);
    g.lineWidth = 1.25;
    g.stroke();
    g.beginPath();
    g.arc(x, y, 4, 0, Math.PI * 2);
    g.fillStyle = col(tone, a);
    g.fill();
  }

  Motion.register('iot-fan', {
    duration: FAN_STAGE * FAN_STAGES.length + 2,
    poster: FAN_STAGE * 3 + 7.5,
    beats: FAN_STAGES.map(function (st, i) { return [i * FAN_STAGE, ['Governed', 'Bypass', 'Isolate', 'Rewire'][i]]; }),
    setup: function (s) { if (s.btn.parentNode) s.btn.click(); s.state.angle = 0; s.state.lastT = 0; },
    layout: function (s) { s.state.geo = fanGeometry(isCompact(s)); },
    draw: function (s, t) {
      var G = s.state.geo, st = fanAt(t), d = st.def, u = st.u;
      // Rotation is integrated from story time so seeking gives a stable frame.
      var spinStart = d.leads === 'supply' ? 2.6 : 4.2;
      var angle = st.spinning ? (u - spinStart) * 7 : 0.35;
      framed(s, G.box, function (v) {
        var compact = G.box[0] < 400, a0 = fade(u, 0, 0.5);
        L.text(v, compact ? d.key.replace(' · ', '\n').split('\n')[0] : d.key, G.key[0], G.key[1],
          { key: true, align: 'left', color: 'accent', alpha: a0 });
        if (compact) L.text(v, d.key.split(' · ').slice(1).join(' · '), G.key[0], G.key[1] + 16,
          { size: 11, align: 'left', color: 'text2', alpha: a0 });

        // Two lanes: what the software said, what the operator saw.
        var ly = G.lanes, lx = G.laneLabelX;
        L.text(v, 'Software reported', lx, ly.soft + (compact ? 0 : 0), { key: true, align: 'left' });
        L.text(v, 'Operator saw', lx, ly.saw, { key: true, align: 'left', color: 'info' });
        if (st.software) L.chip(v, st.software, G.chipX, ly.soft + G.chipDy, { code: true, align: 'left', tone: st.def.leads === 'supply' ? 'muted' : 'accent',
          emph: fade(u, st.def.leads === 'supply' ? 2 : 4.6) });
        if (st.saw) L.chip(v, st.saw, G.chipX, ly.saw + G.chipDy, { code: true, align: 'left', tone: st.def.spins ? 'info' : 'warn', emph: fade(u, 5.4) });

        // Firmware panel: the pin map is the program's claim about the wiring.
        var P = G.panel, firmware = d.leads === 'driver', pa = firmware ? 1 : 0.35;
        var shared = st.stage === 1 && u >= 4.6;
        box(v, P[0], P[1], P[2], P[3], { fill: shared ? 'warn' : 'accent', tint: shared ? 0.12 : 0.05,
          edge: shared ? 'warn' : 'border', alpha: pa });
        L.text(v, compact ? d.driver.replace(' drives', '') : d.driver, P[0] + 8, P[1] + 15, { key: true, align: 'left', color: shared ? 'warn' : 'accent', alpha: pa });
        if (st.stage === 1) L.text(v, 'governance bypassed', P[0] + 8, P[1] + 31, { size: 10, align: 'left', color: 'muted' });
        if (shared) L.chip(v, 'same pin map', P[0] + P[2] / 2, P[1] + P[3] + 14, { tone: 'warn', emph: 1 });
        var rows = [['D5', 'EN', G.rows.D5], ['D6', '1A', G.rows.D6], ['D7', '2A', G.rows.D7]];
        rows.forEach(function (r) {
          L.text(v, r[0] + ' → ' + r[1], P[0] + 10, r[2], { size: 11, mono: true, weight: 500, align: 'left', alpha: pa });
          var ar = L.path([[P[0] + P[2], r[2]], [G.headerX - 17, r[2]]]);
          L.arrow(v, ar, { tone: 'accent', alpha: st.pinsDriven ? 1 : 0.25 * pa, width: st.pinsDriven ? 1.5 : 1.25 });
          if (firmware) travel(v, ar, u, 1.2 + (r[2] - G.rows.D5) / 120, 2.2 + (r[2] - G.rows.D5) / 120, 'accent', 3);
        });

        // Mega header pins.
        L.text(v, 'Mega', G.headerX, G.megaY, { size: 10, color: 'muted' });
        Object.keys(G.pinY).forEach(function (k) {
          var driven = st.pinsDriven && (k === 'D5' || k === 'D6' || k === 'D7');
          pin(v, G.headerX, G.pinY[k], k, driven, 1);
        });

        // L293D driver.
        var C = G.chip, cx = C[0], cr = C[0] + C[2];
        var outsLive = d.leads === 'driver';
        box(v, C[0], C[1], C[2], C[3], { fill: 'text2', tint: 0.06, alpha: outsLive ? 1 : 0.5 });
        L.text(v, 'L293D', cx + C[2] / 2, C[1] + 13, { key: true, alpha: outsLive ? 1 : 0.5 });
        var ins = [['1A', G.inY.A1, st.inputsDriven, 'H'], ['EN', G.inY.EN, st.enDriven, 'H'], ['2A', G.inY.A2, st.inputsDriven, 'L']];
        ins.forEach(function (r) {
          L.text(v, r[0], cx + 8, r[1], { size: 10, weight: 700, align: 'left', color: 'text2' });
          var known = r[2] || (firmware && st.pinsDriven && u >= 3.6);
          if (known && firmware) L.text(v, r[2] ? r[3] : '?', cx + 36, r[1], { size: 11, weight: 700,
            color: r[2] ? 'accent' : 'warn' });
        });

        // Jumpers: EN is always right; 1A/2A sit on D4/D3 until stage 4.
        function jumper(fromY, toY, tone, a, live) {
          var x0 = G.headerX + 15, x1 = cx;
          var p = L.path(L.bez([x0, fromY], [x0 + (x1 - x0) * 0.5, fromY], [x0 + (x1 - x0) * 0.5, toY], [x1, toY], 16));
          L.arrow(v, p, { tone: tone, alpha: a, width: 1.75, head: false });
          if (live) travel(v, p, u, 2.4, 3.6, 'accent', 3);
          return p;
        }
        var m = E.inOutCubic(st.move);
        var wrongA1 = G.pinY.D4, rightA1 = G.pinY.D6, wrongA2 = G.pinY.D3, rightA2 = G.pinY.D7;
        var fix = st.stage === 3;
        var a1 = fix ? L.lerp(wrongA1, rightA1, m) : wrongA1, a2 = fix ? L.lerp(wrongA2, rightA2, m) : wrongA2;
        var jt = st.hindsight ? 'warn' : fix && m >= 1 ? 'accent' : 'text2';
        jumper(G.pinY.D5, G.inY.EN, 'text2', 1, firmware);
        jumper(a1, G.inY.A1, jt, 1, st.inputsDriven || (fix && m >= 1 && firmware));
        jumper(a2, G.inY.A2, jt, 1, false);
        if (st.hindsight) L.chip(v, compact ? 'hindsight: D4 / D3' : 'in hindsight: inputs on D4 / D3',
          (G.headerX + cx) / 2, G.noteY, { tone: 'warn', emph: fade(u, 6.2) });
        if (fix && st.move > 0 && u < 4.2) L.chip(v, 'moving to D6 / D7', (G.headerX + cx) / 2, G.noteY,
          { tone: 'accent', emph: 1 });

        // Motor leads: from the driver outputs, or lifted onto the supply.
        var F = G.fan, S = G.supply;
        G.outs.forEach(function (o) { line(v, o, st.inputsDriven ? 'accent' : 'text2', outsLive ? 1 : 0.25, 1.5); });
        box(v, S[0] - S[2] / 2, S[1] - S[3] / 2, S[2], S[3], { fill: 'info', tint: st.leadsOnSupply ? 0.15 : 0.04,
          edge: st.leadsOnSupply ? 'info' : 'border' });
        L.text(v, 'Motor supply', S[0], S[1] + 0.5, { size: 11, color: 'text2' });
        if (st.leadsOnSupply) {
          var la = fade(u, 1.2, 0.6);
          G.leads.forEach(function (ld) { line(v, ld, 'info', la, 1.75); });
        }
        blades(v, F[0], F[1], F[2], angle, st.spinning ? 'info' : 'muted', 1);
        L.text(v, 'Fan', F[0] + F[2] + 8, F[1] - F[2] + 6, { size: 10, align: 'left', color: 'muted' });

        if (st.say) wrap(v, st.say, G.say[0], G.say[1], G.say[2], { size: compact ? 12 : 13, align: 'left', alpha: fade(u, 5.8) });
        if (!compact) L.text(v, 'Recorded incident · rotation operator-observed · stages compressed', G.box[0] - 12, G.box[1] - 4,
          { size: 10, align: 'right', color: 'muted', weight: 500 });
      });
    }
  });

  // ======================================= scene 3: which test separates?
  function testsGeometry(compact) {
    if (compact) return { box: [300, 520] };
    return { box: [680, 370], labelX: 12, colX: [258, 342, 426, 510, 594], colW: 80, headY: 46, rowY0: 104, rowDy: 31,
      obsY: 300, say: [12, 336, 656] };
  }
  function predTone(p, T, judged) {
    if (!judged || !T.ran) return 'muted';
    if (p === T.obs) return 'info';
    return T.confirm === undefined ? 'warn' : 'muted';
  }

  Motion.register('iot-tests', {
    duration: TEST_START + TEST_SPAN * TESTS.length + 1.6,
    poster: TEST_START + TEST_SPAN * TESTS.length + 1,
    beats: [[0, 'Six suspects']].concat(TESTS.map(function (T, j) {
      return [TEST_START + j * TEST_SPAN, T.name.join(' ').replace(', ', ' ')];
    })),
    setup: function (s) { if (s.btn.parentNode) s.btn.click(); },
    layout: function (s) { s.state.geo = testsGeometry(isCompact(s)); },
    draw: function (s, t) {
      var G = s.state.geo, st = testsAt(t);
      framed(s, G.box, function (v) {
        if (G.box[0] < 400) return drawTestsCompact(v, t, st);
        L.text(v, 'Reasoning model · built from the recorded report', 12, 14, { key: true, align: 'left' });
        L.text(v, 'If this were the only fault, the test would show…', G.box[0] - 12, 14, { size: 11, color: 'text2', weight: 500, align: 'right' });
        L.text(v, 'Candidate cause', G.labelX, G.headY + 4, { key: true, align: 'left' });
        TESTS.forEach(function (T, j) {
          var c = st.cols[j], x = G.colX[j], on = st.active === j;
          if (!c.shown) return;
          var a = fade(t, TEST_START + j * TEST_SPAN, 0.5);
          if (on) box(v, x - G.colW / 2, G.headY - 22, G.colW, G.obsY - G.headY + 38,
            { fill: 'accent', tint: 0.05, edge: 'accent', alpha: 0.6 * a, dash: T.ran ? null : [4, 4] });
          L.text(v, T.name[0], x, G.headY - 8, { size: 11, alpha: a });
          L.text(v, T.name[1], x, G.headY + 6, { size: 11, alpha: a });
          L.text(v, T.ran ? 'ran · 9 Sep' : 'proposed · not run', x, G.headY + 22,
            { size: 10, weight: 500, color: T.ran ? 'muted' : 'warn', alpha: a });
          c.preds.forEach(function (p, i) {
            if (!p) return;
            var y = G.rowY0 + i * G.rowDy;
            L.chip(v, p, x, y, { code: true, tone: predTone(p, T, c.judged), emph: c.judged && T.ran ? 1 : 0.3 });
          });
          if (c.observed) L.chip(v, c.observed, x, G.obsY, { code: true, tone: T.ran ? 'accent' : 'muted', emph: T.ran ? 1 : 0.4 });
        });
        CAUSES.forEach(function (name, i) {
          var y = G.rowY0 + i * G.rowDy, dead = !st.alive[i], conf = st.confirmed === i;
          var lastRemoved = -1;
          st.cols.forEach(function (c, j) { if (c.removed.indexOf(i) >= 0) lastRemoved = j; });
          var da = lastRemoved >= 0 ? seg(t, TEST_START + lastRemoved * TEST_SPAN + 3.4, TEST_START + lastRemoved * TEST_SPAN + 4) : 0;
          L.text(v, name, G.labelX, y, { size: 12, align: 'left', alpha: 1 - 0.6 * da,
            color: conf ? 'accent' : 'text' });
          if (dead) {
            var w = L.measure(v, name, { size: 12 });
            line(v, [[G.labelX, y + 0.5], [G.labelX + w * da, y + 0.5]], 'warn', 0.9, 1.5);
          }
          if (conf) L.glyph(v, 'tick', G.labelX + L.measure(v, name, { size: 12 }) + 14, y,
            { tone: 'accent', p: seg(t, TEST_START + 3 * TEST_SPAN + 3.4, TEST_START + 3 * TEST_SPAN + 4) });
        });
        L.text(v, 'Observed', G.labelX, G.obsY, { key: true, align: 'left', color: 'accent' });
        line(v, [[G.labelX, G.obsY - 18], [G.box[0] - 12, G.obsY - 18]], 'border', 1, 1);
        var cur = st.active >= 0 ? st.cols[st.active] : null;
        var say = cur && cur.say ? cur.say : st.active < 0 ? 'Six candidate causes for a fan that never moved. Each test can only remove the causes that predict a different result.' : null;
        if (say) wrap(v, say, G.say[0], G.say[1], G.say[2], { size: 13, align: 'left' });
      });
    }
  });

  function drawTestsCompact(v, t, st) {
    var j = Math.max(0, st.active), T = TESTS[j], c = st.cols[j];
    L.text(v, 'Reasoning model', 8, 12, { key: true, align: 'left' });
    if (st.active < 0) {
      wrap(v, 'Six candidate causes for a fan that never moved. Each test can only remove the causes that predict a different result.', 8, 40, 284, { size: 13, align: 'left' });
    } else {
      var a = fade(t, TEST_START + j * TEST_SPAN, 0.5);
      L.text(v, 'Test ' + (j + 1) + ' of ' + TESTS.length + ': ' + T.name.join(' '), 8, 40, { size: 14, align: 'left', alpha: a });
      L.text(v, T.ran ? 'ran · 9 Sep' : 'proposed · not run', 8, 60, { size: 11, align: 'left', color: T.ran ? 'muted' : 'warn', alpha: a });
    }
    L.text(v, 'If this were the only fault…', 8, 92, { size: 11, align: 'left', color: 'text2', weight: 500 });
    CAUSES.forEach(function (name, i) {
      var y = 124 + i * 40, dead = !st.alive[i], conf = st.confirmed === i;
      box(v, 6, y - 16, 288, 32, { fill: conf ? 'accent' : 'text2', tint: conf ? 0.1 : 0.03, alpha: dead ? 0.45 : 1 });
      wrap(v, name, 14, y, 190, { size: 12, align: 'left', alpha: dead ? 0.45 : 1, color: conf ? 'accent' : 'text' });
      if (dead) line(v, [[14, y + 0.5], [14 + Math.min(170, L.measure(v, name, { size: 12 })), y + 0.5]], 'warn', 0.9, 1.5);
      var p = st.active >= 0 ? c.preds[i] : null;
      if (p) L.chip(v, p, 288, y, { code: true, align: 'right', tone: predTone(p, T, c.judged), emph: c.judged && T.ran ? 1 : 0.3 });
      else if (dead) L.text(v, 'ruled out', 286, y, { size: 10, align: 'right', color: 'muted' });
      if (conf) L.glyph(v, 'tick', 24 + L.measure(v, name, { size: 12 }), y, { tone: 'accent' });
    });
    L.text(v, 'Observed', 8, 374, { key: true, align: 'left', color: 'accent' });
    if (st.active >= 0 && c.observed) L.chip(v, c.observed, 288, 374, { code: true, align: 'right', tone: T.ran ? 'accent' : 'muted', emph: T.ran ? 1 : 0.4 });
    if (st.active >= 0 && c.say) wrap(v, c.say, 8, 410, 284, { size: 12, align: 'left' });
  }
})();
