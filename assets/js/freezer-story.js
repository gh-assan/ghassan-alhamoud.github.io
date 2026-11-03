(function () {
  'use strict';

  var root = document.getElementById('freezer-story');
  if (!root) return;

  // Seconds. Each card stays long enough to read at about three words a second, and
  // cards stay up, so nothing has to be caught in passing.
  var BEATS = [
    { at: 0, text: 'A quiet night. No model is running.' },
    { at: 4, text: 'Freezer 4 starts warming. The alarm has not fired.' },
    { at: 11, text: 'Other cases follow. Tamoz starts working out why.' },
    { at: 14, text: 'It says what it saw.' },
    { at: 20.5, text: 'It says what it thinks, and what it does not know.' },
    { at: 27, text: 'It proposes what to do.' },
    { at: 32, text: 'Your team decides. Nothing changes on the equipment.' }
  ];
  var CARDS = { saw: 14, thinks: 20.5, proposes: 27, team: 32 };
  var DUR = 42;
  var WARM_FROM = 4;
  var WARM_TO = 11;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clock = root.querySelector('.fs-clock');
  var status = root.querySelector('.fs-status');
  var main = root.querySelector('.fs-main');
  var others = root.querySelectorAll('.fs-other');
  var dot = root.querySelector('.fs-dot');
  var late = root.querySelectorAll('.fs-late');
  var button = root.querySelector('.fs-btn');
  var range = root.querySelector('.fs-range');
  var length = main.getTotalLength();
  var t = 0;
  var last = 0;
  var playing = false;
  var visible = false;
  var started = false;
  var raf = 0;

  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

  function minutes(time) {
    if (time < WARM_FROM) return 90 + 30 * time / WARM_FROM;
    return 120 + 40 * clamp((time - WARM_FROM) / (WARM_TO - WARM_FROM));
  }

  // Share of the drawn line at this moment: 01:30 to 02:40 maps onto the whole path.
  function drawn(time) { return (minutes(time) - 90) / 70; }

  function seek(time) {
    t = time;
    var m = Math.round(minutes(time));
    clock.textContent = '0' + Math.floor(m / 60) + ':' + ('0' + (m % 60)).slice(-2);
    var share = drawn(time);
    main.style.strokeDasharray = length + ' ' + length;
    main.style.strokeDashoffset = length * (1 - share);
    var point = main.getPointAtLength(length * share);
    dot.setAttribute('cx', point.x);
    dot.setAttribute('cy', point.y);
    var follow = clamp((minutes(time) - 130) / 30);
    Array.prototype.forEach.call(others, function (line) {
      var l = line.getTotalLength();
      line.style.strokeDasharray = l + ' ' + l;
      line.style.strokeDashoffset = l * (1 - follow);
      line.style.opacity = follow > 0 ? 1 : 0;
    });
    Array.prototype.forEach.call(late, function (el) {
      el.style.opacity = clamp((time - Number(el.dataset.at)) / 0.6);
    });
    Object.keys(CARDS).forEach(function (name) {
      var card = root.querySelector('[data-card="' + name + '"]');
      var o = clamp((time - CARDS[name]) / 0.6);
      // Empty cards stay faintly visible, so the reader can see what is coming.
      card.style.opacity = 0.45 + 0.55 * o;
      var body = card.querySelector('span');
      body.style.opacity = o;
      body.style.transform = 'translateY(' + (1 - o) * 6 + 'px)';
    });
    var text = BEATS[0].text;
    BEATS.forEach(function (beat) { if (time >= beat.at) text = beat.text; });
    if (status.textContent !== text) status.textContent = text;
    range.value = time;
  }

  function setPlaying(on) {
    playing = on;
    button.textContent = on ? 'Pause' : t >= DUR ? 'Replay' : 'Play';
    cancelAnimationFrame(raf);
    if (on) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  function frame(now) {
    if (!playing) return;
    if (visible && !document.hidden) {
      var next = t + Math.min(now - last, 100) / 1000;
      seek(Math.min(next, DUR));
      if (next >= DUR) { setPlaying(false); return; }
    }
    last = now;
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

  root.seekStory = seek;
  if (reduced) {
    seek(DUR);
    setPlaying(false);
    return;
  }
  seek(0);
  setPlaying(false);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !started) { started = true; setPlaying(true); }
    }, { threshold: 0.5 }).observe(root);
  } else {
    visible = true;
    started = true;
    setPlaying(true);
  }
})();
