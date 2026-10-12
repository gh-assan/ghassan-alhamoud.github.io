/* Illustrative IoT mechanisms; no hardware connection or measured timings. */
(function (root) {
  'use strict';
  function flowAt(t, kind) {
    return {measured: t >= 1.8, received: t >= 4.1,
      requested: kind === 'actuating' && t >= 6.6,
      applied: kind === 'actuating' && t >= 9.1,
      observed: kind === 'actuating' && t >= 11.4};
  }
  function freshnessAt(t) {
    var age = Math.min(10, Math.max(0, t));
    return {age: age, received: age >= 9, evaluated: age >= 10, usable: age <= 5};
  }
  function poster(kind) { return kind === 'sensing' ? 5.6 : 12.4; }
  root.IoTStudy = {flowAt: flowAt, freshnessAt: freshnessAt, poster: poster};
  if (!root.Motion) return;
  var Motion = root.Motion, L = Motion.lib, E = L.E;

  function text(s, str, x, y, width, o) {
    o = Object.assign({size: 12, align: 'left', weight: 500, color: 'text2'}, o);
    var lines = [], line = '';
    str.split(' ').forEach(function (word) {
      var next = line ? line + ' ' + word : word;
      if (line && L.measure(s, next, o) > width) { lines.push(line); line = word; }
      else line = next;
    });
    if (line) lines.push(line);
    lines.forEach(function (ln, i) { L.text(s, ln, x, y + i * (o.size + 6), o); });
  }
  function heading(s, title, subtitle) {
    text(s, title, 22, 28, s.w - 44, {key: true, size: 10, color: 'text2'});
    text(s, subtitle, 22, 54, s.w - 44, {size: 15, weight: 600, color: 'text'});
  }
  function frameAlpha(s, t, duration) {
    if (s.paused) return 1;
    return E.inOutCubic(L.seg(t, 0, 0.3)) * (1 - E.inOutCubic(L.seg(t, duration - 0.3, duration)));
  }
  function route(s, points, name, x, y, active, tone) {
    var p = L.path(points), g = s.g;
    p.trace(g, 0, 1);
    g.strokeStyle = L.col(active ? tone : 'muted', active ? 1 : 0.45);
    g.lineWidth = active ? 1.75 : 1;
    g.stroke();
    var end = p.at(1), a = end.a;
    g.beginPath(); g.moveTo(end.x, end.y);
    g.lineTo(end.x - 6 * Math.cos(a - 0.45), end.y - 6 * Math.sin(a - 0.45));
    g.moveTo(end.x, end.y);
    g.lineTo(end.x - 6 * Math.cos(a + 0.45), end.y - 6 * Math.sin(a + 0.45));
    g.stroke();
    L.text(s, name, x, y, {size: 11, color: active ? tone : 'text2', weight: 500});
    return p;
  }
  function travel(s, path, t, start, end, tone) {
    if (t < start || t > end) return;
    var u = E.inOutCubic(L.seg(t, start, end));
    var a = L.hold(t, start, end, 0.18);
    L.trail(s, path.at, u, {tone: tone, r: 3, alpha: a, len: 0.12});
  }
  function node(s, x, y, w, title, detail, emph, tone) {
    L.node(s, {x: x, y: y, w: w, h: 70, title: title, size: 13,
      tone: tone || 'accent', emph: emph});
    // Shared node primitive supplies geometry; detail gets a separate line.
    L.text(s, detail, x, y + 20, {size: 11, weight: 500, color: 'text2'});
  }
  function configureFlow(s) {
    var sensing = s.fig.dataset.kind === 'sensing';
    s.def.duration = sensing ? 7 : 14;
    s.def.poster = poster(sensing ? 'sensing' : 'actuating');
    s.def.beats = sensing ? [[0, 'Observe'], [2.4, 'Transmit'], [4.1, 'Monitoring'], [5.6, 'Rest']]
      : [[0, 'Observe'], [2.4, 'Transmit'], [5, 'Request and effect'], [9.7, 'Relevant feedback'], [12.4, 'Rest']];
  }
  function drawFlow(s, t) {
    configureFlow(s);
    var sensing = s.fig.dataset.kind === 'sensing', kind = sensing ? 'sensing' : 'actuating';
    var v = flowAt(t, kind), compact = s.w < 680, g = s.g;
    g.save(); g.globalAlpha = frameAlpha(s, t, s.def.duration);
    heading(s, 'Illustrative · ' + (sensing ? 'sensing only' : 'optional actuation'),
      sensing ? 'An observation becomes information' : 'Information, action, then new evidence');
    var w = compact ? s.w - 44 : (s.w - 140) / 3;
    var x = compact ? [s.w / 2, s.w / 2, s.w / 2] : [22 + w / 2, s.w / 2, s.w - 22 - w / 2];
    var y = compact ? [112, 244, 376] : [145, 145, 145];
    var measure = t < 2.2 || (!sensing && t >= 9.7 && t < 10.5);
    var transmit = t >= 2.4 && t < 4.5 || (!sensing && t >= 10.5 && t < 11.8);
    var command = !sensing && t >= 5 && t < 7.1;
    var effect = !sensing && t >= 7.5 && t < 9.7;
    // One focal receiver at a time; completed steps return to quiet scaffolding.
    node(s, x[0], y[0], w, 'Physical condition', v.applied ? 'Condition may change' : 'Quantity of interest', effect ? L.hold(t, 9.1, 9.7, 0.18) : 0, 'warn');
    node(s, x[1], y[1], w, 'Device', v.applied ? 'Operation applied' : v.measured ? 'Observation acquired' : 'Ready to measure', Math.max(L.hold(t,1.8,2.2,0.15), sensing ? 0 : L.hold(t,6.6,7.1,0.18), sensing ? 0 : L.hold(t,10.5,10.9,0.15)));
    node(s, x[2], y[2], w, 'Application', v.observed ? 'New evidence received' : v.received ? 'Telemetry received' : 'Waiting for telemetry', Math.max(L.hold(t,4.1,4.7,0.18), sensing ? 0 : L.hold(t,11.4,12.2,0.2)));
    var f1, f2, r1, r2;
    if (compact) {
      var left = 52, right = s.w - 52;
      f1 = route(s, [[left, 149], [left, 207]], 'Measure', left + 36, 179, measure, 'accent');
      f2 = route(s, [[left, 281], [left, 339]], 'Telemetry', left + 36, 311, transmit, 'accent');
      if (!sensing) {
        r1 = route(s, [[right, 339], [right, 281]], 'Command', right - 37, 311, command, 'accent');
        r2 = route(s, [[right, 207], [right, 149]], 'Actuate', right - 37, 179, effect, 'warn');
      }
    } else {
      f1 = route(s, [[x[0] + w/2 + 2, 129], [x[1] - w/2 - 2, 129]], 'Measure', (x[0]+x[1])/2, 105, measure, 'accent');
      f2 = route(s, [[x[1] + w/2 + 2, 129], [x[2] - w/2 - 2, 129]], 'Telemetry', (x[1]+x[2])/2, 105, transmit, 'accent');
      if (!sensing) {
        r1 = route(s, [[x[2] - w/2 - 2, 161], [x[1] + w/2 + 2, 161]], 'Command', (x[1]+x[2])/2, 200, command, 'accent');
        r2 = route(s, [[x[1] - w/2 - 2, 161], [x[0] + w/2 + 2, 161]], 'Actuate', (x[0]+x[1])/2, 200, effect, 'warn');
      }
    }
    travel(s, f1, t, 1, 1.65, 'accent');
    travel(s, f2, t, 3.3, 3.95, 'accent');
    if (!sensing) {
      travel(s, r1, t, 5.8, 6.45, 'accent'); travel(s, r2, t, 8.3, 8.95, 'warn');
      travel(s, f1, t, 9.7, 10.35, 'info'); travel(s, f2, t, 10.6, 11.25, 'info');
    }
    var status = sensing ? (v.received ? 'Monitoring: no actuator is required.' : 'Acquire an observation, then communicate it.')
      : v.observed ? 'Feedback: a relevant new observation informs the next decision.'
      : effect || v.applied ? 'Actuation changes the world; an outcome still needs observation.'
      : command || v.requested ? 'A command requests an operation. Receipt is not an effect.'
      : 'Measurement and telemetry carry information outward.';
    var yy = compact ? 445 : 249;
    text(s, status, 22, yy, s.w - 44, {size: 12, color: v.observed ? 'info' : 'text'});
    text(s, sensing ? 'The flow ends when information reaches the application.' : 'Return paths are optional. Feedback follows a fresh sensing path.',
      22, yy + (compact ? 54 : 42), s.w - 44, {size: 11});
    g.restore();
  }
  function drawFreshness(s, t) {
    var v = freshnessAt(t), g = s.g, compact = s.w < 680;
    g.save(); g.globalAlpha = frameAlpha(s, t, 14);
    heading(s, 'Illustrative · synchronized clocks', 'Delivery does not reset age');
    var left = 28, right = s.w - 28, width = right - left, axisY = 219;
    L.node(s, {x: s.w/2, y: 112, w: s.w-44, h: 62, title: 'Measurement anchor · 12:00:00', size: 13});
    L.text(s, 'Observation age', 28, 165, {align:'left',size:11,color:'text2',weight:500});
    L.text(s, v.age.toFixed(1) + ' s', right, 164, {align:'right',size:23,color:v.usable?'accent':'warn'});
    // An explicit scale and threshold make age visible independently of color.
    g.beginPath(); g.moveTo(left,axisY);g.lineTo(right,axisY);g.strokeStyle=L.col('border');g.lineWidth=3;g.stroke();
    g.beginPath();g.moveTo(left,axisY);g.lineTo(left+width*v.age/10,axisY);g.strokeStyle=L.col(v.usable?'accent':'warn');g.lineWidth=3;g.stroke();
    [0,5,9,10].forEach(function(n){var xx=left+width*n/10;g.beginPath();g.moveTo(xx,axisY-7);g.lineTo(xx,axisY+7);g.strokeStyle=L.col(n===5?'warn':'border');g.lineWidth=1;g.stroke();});
    L.text(s, '0', left, 242, {size:11,color:'text2'});
    L.text(s, '5 s limit', left+width*.5, 191, {size:11,color:'warn'});
    L.text(s, '10 s', right, 242, {size:11,color:'text2',align:'right'});
    L.token(s, left+width*v.age/10, axisY, {tone:v.usable?'accent':'warn',r:4,alpha:frameAlpha(s,t,14)});
    g.globalAlpha = frameAlpha(s, t, 14);
    var at = compact ? 281 : 285;
    text(s, v.received ? '12:00:09 · Received at age 9 s' : 'In transit · the observation keeps aging',22,at,s.w-44,{size:12});
    text(s, v.evaluated ? '12:00:10 · Evaluated: too old for this use' : v.usable ? 'Within the assumed five-second limit' : 'Beyond the assumed five-second limit',
      22,at+38,s.w-44,{size:12,color:v.usable?'text':'warn'});
    text(s,'Assumed limit; not a universal IoT rule.',22,at+86,s.w-44,{size:11});
    g.restore();
  }
  function startPaused(s) {
    if (s.name === 'iot-study-flow') {
      configureFlow(s);
      if (root.matchMedia('(prefers-reduced-motion: reduce)').matches) s.clock = s.def.poster;
    }
    s.paused=true;s.btn.setAttribute('aria-pressed','true');
    s.btn.setAttribute('aria-label','Play animation');s.btn.classList.add('scene__toggle--paused');
  }
  Motion.register('iot-study-flow', {setup:startPaused,duration:14,poster:12.4,
    beats:[[0,'Observe'],[2.4,'Transmit'],[5,'Request and effect'],[9.7,'Relevant feedback'],[12.4,'Rest']],draw:drawFlow});
  Motion.register('iot-study-freshness', {setup:startPaused,duration:14,poster:10,
    beats:[[0,'Measured'],[5.1,'Age limit passed'],[9,'Received'],[10,'Evaluated'],[12.4,'Rest']],draw:drawFreshness});
})(typeof window === 'undefined' ? globalThis : window);
