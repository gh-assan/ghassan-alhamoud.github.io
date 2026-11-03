(function () {
  'use strict';

  // Seconds each step stays up when it advances by itself.
  var DWELL = [7, 10, 8, 10, 10, 0];
  var root = document.getElementById('rule-story');
  if (!root) return;
  var steps = root.querySelectorAll('.rule-story__step');
  var controls = root.querySelector('.rule-story__controls');
  var dots = root.querySelector('.rule-story__dots');
  var count = root.querySelector('.rule-story__count');
  var back = root.querySelector('[data-rs="back"]');
  var next = root.querySelector('[data-rs="next"]');
  var toggle = root.querySelector('[data-rs="toggle"]');
  var list = root.querySelector('.rule-story__steps');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var current = 0;
  var playing = !reduced;
  var visible = false;
  var timer = 0;

  function show(i) {
    current = i;
    Array.prototype.forEach.call(steps, function (step, n) {
      step.classList.toggle('is-active', n === i);
      dots.children[n].classList.toggle('is-active', n === i);
      if (n === i) dots.children[n].setAttribute('aria-current', 'step');
      else dots.children[n].removeAttribute('aria-current');
    });
    count.textContent = 'Step ' + (i + 1) + ' of ' + steps.length;
    back.disabled = i === 0;
    next.textContent = i === steps.length - 1 ? 'Start again' : 'Next';
    schedule();
  }

  function setPlaying(on) {
    playing = on;
    toggle.textContent = on ? 'Pause' : 'Play';
    toggle.setAttribute('aria-pressed', on ? 'false' : 'true');
    // Announce step changes only when the reader moves them, not on the timer.
    list.setAttribute('aria-live', on ? 'off' : 'polite');
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    var dot = dots.children[current];
    Array.prototype.forEach.call(dots.children, function (d) { d.classList.remove('is-timed'); });
    if (!playing || !visible || document.hidden) return;
    if (current === steps.length - 1) { setPlaying(false); return; }
    // Restart the marker's fill so it shows how long this step has left.
    dot.style.setProperty('--rs-dwell', DWELL[current] + 's');
    void dot.offsetWidth;
    dot.classList.add('is-timed');
    timer = setTimeout(function () { show(current + 1); }, DWELL[current] * 1000);
  }

  function goTo(i) {
    setPlaying(false);
    show(i);
  }

  Array.prototype.forEach.call(steps, function (step, n) {
    var dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'rule-story__dot';
    dot.setAttribute('aria-label', 'Step ' + (n + 1) + ' of ' + steps.length);
    dot.addEventListener('click', function () { goTo(n); });
    dots.appendChild(dot);
  });
  back.addEventListener('click', function () { goTo(current - 1); });
  next.addEventListener('click', function () { goTo((current + 1) % steps.length); });
  toggle.addEventListener('click', function () {
    if (!playing && current === steps.length - 1) show(0);
    setPlaying(!playing);
  });
  document.addEventListener('visibilitychange', schedule);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      schedule();
    }, { threshold: 0.15 }).observe(root);
  } else {
    visible = true;
  }
  setPlaying(playing);
  show(0);
})();
