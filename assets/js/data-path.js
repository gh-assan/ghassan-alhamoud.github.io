(function () {
  'use strict';

  var root = document.getElementById('data-path');
  if (!root) return;

  var BEATS = [
    [0, 'Three drives pull a loaded belt.'],
    [4, 'Each drive’s sensor sends its readings to the edge device.'],
    [9, 'Streams Simulator shows every drive, live.'],
    [13, 'D\u20113 runs warmer than the others. An alert.'],
    [17.5, 'Agentic Stream builds a snapshot and asks Tamoz.'],
    [22, 'Tamoz decides: empty the belt, then stop D\u20113.'],
    [26.5, 'The policy passes it, and a person approves.'],
    [30.5, 'The command goes back down. D\u20113 stops, and the screen confirms.']
  ];
  var DUR = 42, END = 40, STOP = 36, EMPTY = 33.8, BELT_V = 105;
  // Packet streams: route, kind, first launch, period, packets per batch, speed, focus end, last launch.
  var STREAMS = [
    ['bt1', 'dot', 4.8, 1.6, 1, 150, 9, 38.4],
    ['bt2', 'dot', 5.6, 1.6, 1, 150, 9, 38.4],
    ['iol', 'dot', 4, 0.22, 1, 100, 9, STOP],
    ['eth', 'pkt', 5.4, 1.2, 3, 140, 9, 38.4],
    ['pw1', 'pkt', 9, 1.2, 3, 140, 13, 38.4],
    ['pw2', 'pkt', 17.5, 1.2, 3, 140, 22, 38.4],
    ['c1', 'cmd', 30.5, 0, 3, 140, DUR, 30.5],
    ['c2', 'cmd', 31.6, 0, 3, 140, DUR, 31.6],
    ['c3', 'cmd', 32.3, 0, 3, 140, DUR, 32.3],
    ['c4', 'cmd', 32.8, 0, 3, 160, DUR, 32.8],
    ['tick', 'tick', 37, 0, 1, 140, DUR, 37]
  ];
  var BLINKS = { master: ['bt1', 'bt2'], led: ['eth', 'c2'], plc: ['c3'] };
  var NS = 'http://www.w3.org/2000/svg';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var status = root.querySelector('.dp-status');
  var button = root.querySelector('.dp-btn');
  var range = root.querySelector('.dp-range');
  var t = DUR, last = 0, playing = false, visible = false, started = false, raf = 0;

  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function seg(a, b) { return clamp((t - a) / (b - a)); }
  function sine(x) { return (1 - Math.cos(Math.PI * x)) / 2; }
  function cubic(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function outCubic(x) { return 1 - Math.pow(1 - x, 3); }
  function hold(a, b, e) { return sine(seg(a, a + e)) * (1 - sine(seg(b - e, b))); }
  function op(el, v) { if (el) el.style.opacity = v.toFixed(3); }
  function all(scope, sel, fn) { Array.prototype.forEach.call(scope.querySelectorAll(sel), fn); }

  function route(el) {
    var p = el.getAttribute('points').trim().split(/\s+/).map(function (s) { return s.split(',').map(Number); });
    var lens = [], total = 0;
    for (var i = 1; i < p.length; i++) { var l = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); lens.push(l); total += l; }
    return { len: total, at: function (u) {
      var d = clamp(u) * total;
      for (var k = 0; k < lens.length; k++) {
        if (d <= lens[k] || k === lens.length - 1) {
          var f = lens[k] ? d / lens[k] : 0, a = p[k], b = p[k + 1];
          return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
        }
        d -= lens[k];
      }
    } };
  }

  function el(name, cls, parent) {
    var e = document.createElementNS(NS, name);
    if (cls) e.setAttribute('class', cls);
    parent.appendChild(e);
    return e;
  }

  var views = Array.prototype.map.call(root.querySelectorAll('.dp-svg'), function (svg) {
    var v = { svg: svg, routes: {}, pools: {} };
    all(svg, '.dp-route', function (r) { v.routes[r.getAttribute('data-r')] = route(r); });
    var layer = svg.querySelector('.dp-live-layer');
    STREAMS.forEach(function (s) {
      var r = v.routes[s[0]], dur = r.len / s[5];
      var n = s[3] ? s[4] * (Math.ceil(dur / s[3]) + 2) : s[4];
      var pool = [];
      for (var i = 0; i < n; i++) {
        var g;
        if (s[1] === 'tick') {
          g = el('g', 'dp-tk', layer);
          el('circle', '', g).setAttribute('r', 5);
          el('path', '', g).setAttribute('d', 'M-2.5 0 l1.8 1.8 l3.4 -3.6');
        } else if (s[1] === 'dot') {
          g = el('circle', 'dp-dot', layer);
          g.setAttribute('r', 2);
        } else {
          g = el('rect', s[1] === 'cmd' ? 'dp-pkt dp-pkt-c' : 'dp-pkt', layer);
          g.setAttribute('x', -4); g.setAttribute('y', -2.5); g.setAttribute('width', 8); g.setAttribute('height', 5); g.setAttribute('rx', 2);
        }
        g.style.opacity = 0;
        pool.push(g);
      }
      v.pools[s[0]] = { s: s, dur: dur, pool: pool };
    });
    v.q = function (sel) { return svg.querySelector(sel); };
    return v;
  });

  function arrivals(v, name) {
    var st = v.pools[name], s = st.s, k, x;
    if (t < s[2] + st.dur) return 0;
    if (!s[3]) { x = t - s[2] - st.dur; return x < 0.35 ? 1 - x / 0.35 : 0; }
    k = Math.floor((t - s[2] - st.dur) / s[3]);
    if (s[2] + k * s[3] > s[7]) return 0;
    x = t - (s[2] + k * s[3] + st.dur);
    return x < 0.35 ? 1 - x / 0.35 : 0;
  }

  function streams(v) {
    Object.keys(v.pools).forEach(function (name) {
      var st = v.pools[name], s = st.s, r = v.routes[name], used = 0;
      var emph = t < s[6] ? 1 : 0.45;
      var kmax = s[3] ? Math.floor((t - s[2]) / s[3]) : 0;
      var kmin = s[3] ? Math.max(0, Math.ceil((t - s[2] - st.dur) / s[3]) - 1) : 0;
      if (t < END) {
        for (var k = kmin; k <= kmax && t >= s[2]; k++) {
          for (var i = 0; i < s[4]; i++) {
            var launch = s[2] + k * s[3] + i * 0.15;
            if (launch > s[7] + 0.5) continue;
            var u = (t - launch) / st.dur;
            if (u < 0 || u > 1 || used >= st.pool.length) continue;
            var p = r.at(name === 'tick' || name === 'c4' ? cubic(u) : u), g = st.pool[used++];
            g.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')' + (s[1] === 'dot' || s[1] === 'tick' ? '' : ' rotate(' + (p.ang * 180 / Math.PI).toFixed(0) + ')'));
            op(g, emph * Math.min(1, u / 0.08, (1 - u) / 0.08));
          }
        }
      }
      for (; used < st.pool.length; used++) st.pool[used].style.opacity = 0;
    });
  }

  function drives(v) {
    var w = 216, emptied = Math.max(0, (t - EMPTY) * BELT_V);
    all(v.svg, '.dp-rotor', function (r, i) {
      var tt = Math.min(t, END), a = w * tt;
      if (i === 2 && tt > STOP) { var d = Math.min(tt - STOP, 0.6); a = w * STOP + w * (d - d * d / 1.2); }
      r.setAttribute('transform', 'rotate(' + (a % 360).toFixed(1) + ' ' + r.getAttribute('data-cx') + ' ' + r.getAttribute('data-cy') + ')');
    });
    var bed = v.q('.dp-bed'), x0 = Number(bed.getAttribute('data-x0')), x1 = Number(bed.getAttribute('x2'));
    bed.setAttribute('x1', Math.min(x1, x0 + emptied).toFixed(1));
    bed.style.strokeDashoffset = (-BELT_V * Math.min(t, END) + emptied).toFixed(1);
    op(bed, x0 + emptied < x1 ? 1 : 0);
    op(v.q('.dp-ol-w'), seg(13.6, 14) * (1 - seg(STOP, STOP + 0.4)));
    op(v.q('.dp-ol-ok'), seg(STOP, STOP + 0.4));
    op(v.q('.dp-puck-off'), seg(STOP, STOP + 0.4));
    all(v.svg, '.dp-bt', function (g, i) {
      var start = 4 + i * 0.8, x = (t - start) % 1.6, p = x / 0.8, s = 1, a;
      if (t >= END) { a = 0.3; } else if (t < start || t > 38.4 + i * 0.8) { a = t > start ? 0.3 * seg(38.4, 39.4) : 0; } else if (x > 0.8) { a = 0; } else {
        a = (1 - p) * (t < 9 ? 1 : 0.45); s = 0.55 + 0.6 * p;
      }
      g.setAttribute('transform', 'translate(' + g.getAttribute('data-cx') + ' ' + g.getAttribute('data-cy') + ') scale(' + s.toFixed(2) + ') translate(-' + g.getAttribute('data-cx') + ' -' + g.getAttribute('data-cy') + ')');
      op(g, a);
    });
    Object.keys(BLINKS).forEach(function (k) {
      var b = 0;
      BLINKS[k].forEach(function (n) { b = Math.max(b, arrivals(v, n)); });
      op(v.q(k === 'led' ? '.dp-led-on' : '[data-b="' + k + '"]'), b);
    });
    all(v.svg, '.dp-lane, .dp-field', function (l) { op(l, 0.4 + 0.6 * seg(4, 4.6)); });
    all(v.svg, '.dp-pill', function (p) {
      var at = Number(p.getAttribute('data-at'));
      op(p, t < at ? 0 : t < at + 2.3 ? seg(at, at + 0.3) : 1 - 0.25 * seg(at + 2.3, at + 2.7));
    });
  }

  function screen(v) {
    var wake = seg(9.4, 10), dim = hold(17.8, 30.9, 0.4);
    op(v.q('.dp-wait'), 1 - wake);
    op(v.q('.dp-screen'), (0.35 + 0.65 * wake) * (1 - 0.55 * dim));
    all(v.svg, '.dp-tr', function (l) {
      var s = seg(Number(l.getAttribute('data-from')), Number(l.getAttribute('data-to')));
      l.style.strokeDasharray = '1 1';
      l.style.strokeDashoffset = (1 - s).toFixed(3);
    });
    var bar = v.q('.dp-bar-w'), grow = seg(13, 14.2);
    bar.setAttribute('width', (Number(bar.getAttribute('data-w0')) + (Number(bar.getAttribute('data-w1')) - Number(bar.getAttribute('data-w0'))) * grow).toFixed(1));
    op(bar, seg(13, 13.4) * (1 - seg(38.1, 38.8)));
    op(v.q('.dp-bar-g'), seg(38.1, 38.8));
    var grey = Math.round(100 * seg(STOP + 1, STOP + 1.4));
    all(v.svg, '.dp-tr3', function (l) {
      l.style.stroke = 'color-mix(in srgb, var(--text-muted) ' + grey + '%, var(' + (l.classList.contains('dp-tr-w') ? '--warning' : '--text-secondary') + '))';
    });
    op(v.q('.dp-w3'), seg(14.2, 14.5));
    op(v.q('.dp-alert'), seg(14.5, 15));
    op(v.q('.dp-live'), t < 10 ? 0.6 : 0.55 + 0.45 * Math.abs(Math.cos(Math.PI * (Math.min(t, END) - 10))));
    op(v.q('.dp-cmdrow'), seg(31, 31.3));
    op(v.q('.dp-sent'), 1 - seg(38.1, 38.4));
    op(v.q('.dp-chk'), seg(38.1, 38.4));
  }

  function place(g, p, s) {
    g.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') scale(' + s.toFixed(3) + ')');
  }

  function brain(v) {
    var snap = v.q('.dp-snap'), fade = 1 - seg(19.6, 19.9);
    place(snap, { x: Number(snap.getAttribute('data-x')), y: Number(snap.getAttribute('data-y')) }, 1 - 0.4 * seg(19.6, 19.9));
    op(snap, seg(18, 18.3) * fade);
    all(snap, 'text', function (l) { var i = Number(l.getAttribute('data-i')); op(l, seg(18 + 0.25 * i, 18.3 + 0.25 * i)); });
    var mini = v.q('.dp-mini');
    place(mini, v.routes.snap.at(cubic(seg(19.9, 20.9))), 1);
    op(mini, seg(19.7, 19.9) * (1 - seg(20.8, 21)));

    var think = hold(20.9, 24.5, 0.35), oct = v.q('.dp-oct');
    var cx = Number(oct.getAttribute('data-cx')), cy = Number(oct.getAttribute('data-cy')), R = Number(oct.getAttribute('data-r')), RAY = Number(oct.getAttribute('data-ray'));
    var rot = 0.5 * Math.max(0, Math.min(t, END) - 9) + 0.9 * think + 2.2 * cubic(seg(20.9, 24.5));
    var V = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(function (q) {
      var x = q[0] * Math.cos(rot) - q[2] * Math.sin(rot), z = q[0] * Math.sin(rot) + q[2] * Math.cos(rot);
      return [cx + x * R, cy + (q[1] * Math.cos(0.35) - z * Math.sin(0.35)) * R * 1.2, (q[1] * Math.sin(0.35) + z * Math.cos(0.35)) * R];
    });
    var lines = oct.querySelectorAll('line'), n = 0, mix = t < 9 ? 0 : Math.round(55 + 45 * think);
    for (var i = 0; i < 6; i++) {
      for (var j = i + 1; j < 6; j++) {
        if (i >> 1 === j >> 1) continue;
        var l = lines[n++];
        l.setAttribute('x1', V[i][0].toFixed(1)); l.setAttribute('y1', V[i][1].toFixed(1));
        l.setAttribute('x2', V[j][0].toFixed(1)); l.setAttribute('y2', V[j][1].toFixed(1));
        l.setAttribute('opacity', clamp(0.75 - (V[i][2] + V[j][2]) / 2 / (R * 2.2)).toFixed(2));
      }
    }
    oct.style.stroke = 'color-mix(in srgb, var(--accent) ' + mix + '%, var(--text-muted))';
    var pulse = seg(20.9, 21.9), core = v.q('.dp-core');
    core.setAttribute('r', (3 + 2.2 * Math.pow(Math.sin(2 * Math.PI * pulse), 2)).toFixed(2));
    op(core, t < 9 ? 0.4 : 1);
    var fan = outCubic(seg(22, 22.6)), keep = seg(22.6, 23), drop = seg(24, 24.4);
    all(v.svg, '.dp-ray', function (g, k) {
      var ang = Math.PI + (k - 1) * 0.55, len = RAY * fan, a0 = R + 8;
      var a = fan <= 0 ? 0 : (k === 1 ? 1 : 1 - seg(23, 23.4)) * (1 - drop) * (k === 1 ? 1 : 1 - keep * 0.5);
      var ln = g.firstChild, dot = g.lastChild;
      ln.setAttribute('x1', (cx + Math.cos(ang) * a0).toFixed(1)); ln.setAttribute('y1', (cy + Math.sin(ang) * a0).toFixed(1));
      ln.setAttribute('x2', (cx + Math.cos(ang) * (a0 + len)).toFixed(1)); ln.setAttribute('y2', (cy + Math.sin(ang) * (a0 + len)).toFixed(1));
      dot.setAttribute('cx', (cx + Math.cos(ang) * (a0 + len)).toFixed(1)); dot.setAttribute('cy', (cy + Math.sin(ang) * (a0 + len)).toFixed(1));
      ln.style.strokeDasharray = k === 1 ? 'none' : '2 3';
      op(g, a);
    });

    var dec = v.q('.dp-dec'), p, sc = 1;
    if (t < 26.5) { p = v.routes.dec.at(outCubic(seg(23.6, 24.9))); }
    else if (t < 29.9) { p = v.routes.gate.at(0.5 * cubic(seg(26.5, 27)) + 0.5 * cubic(seg(27.7, 28.2))); sc = 1 - 0.45 * seg(26.5, 27); }
    else { p = v.routes.exit.at(cubic(seg(29.9, 30.4))); sc = 0.55 - 0.25 * seg(29.9, 30.4); }
    place(dec, p, sc);
    op(dec, seg(23.6, 23.8) * (1 - seg(30.2, 30.5)));
    var tick = v.q('.dp-tick'), ts = seg(27, 27.5);
    tick.style.strokeDasharray = '1 1';
    tick.style.strokeDashoffset = (1 - ts).toFixed(3);
    op(v.q('.dp-person-on'), seg(28.2, 28.5));
    op(v.q('.dp-ok'), seg(28.5, 28.8));
    if (v.svg.classList.contains('dp-narrow')) all(v.svg, '.dp-zl', function (l) { op(l, 1 - seg(23.7, 24) * (1 - seg(26.5, 26.9))); });
  }

  function seek(time) {
    t = time;
    views.forEach(function (v) { drives(v); streams(v); screen(v); brain(v); });
    var text = BEATS[0][1];
    BEATS.forEach(function (b) { if (t >= b[0]) text = b[1]; });
    if (status.textContent !== text) status.textContent = text;
    range.value = t;
  }

  function loop() {
    cancelAnimationFrame(raf);
    if (playing && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }

  function setPlaying(on) {
    playing = on;
    button.textContent = on ? 'Pause' : t >= DUR ? 'Replay' : 'Play';
    loop();
  }

  function frame(now) {
    var next = t + Math.min(now - last, 100) / 1000;
    last = now;
    seek(Math.min(next, DUR));
    if (next >= DUR) { setPlaying(false); return; }
    raf = requestAnimationFrame(frame);
  }

  range.max = DUR;
  button.addEventListener('click', function () {
    if (!playing && t >= DUR) seek(0);
    setPlaying(!playing);
  });
  range.addEventListener('input', function () {
    setPlaying(false);
    seek(Number(range.value));
    button.textContent = t >= DUR ? 'Replay' : 'Play';
  });
  document.addEventListener('visibilitychange', loop);
  root.seekStory = function (x) { seek(x); button.textContent = t >= DUR ? 'Replay' : 'Play'; };

  seek(reduced ? DUR : 0);
  setPlaying(false);
  if (reduced) return;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !started) { started = true; setPlaying(true); } else loop();
    }, { threshold: Math.min(0.5, 0.6 * window.innerHeight / root.offsetHeight) }).observe(root);
  } else {
    visible = true;
    started = true;
    setPlaying(true);
  }
})();
