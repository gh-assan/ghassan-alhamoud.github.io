/**
 * counters.js — Animated number counters that count up on scroll
 *
 * Fallback-first design: the HTML renders the FINAL values, so every
 * failure path (no JS, no IntersectionObserver, reduced motion,
 * backgrounded tab, animation interrupted) leaves correct numbers on
 * screen. The script only ever writes during an on-screen count-up
 * that is guaranteed to end at the same final values — it never
 * resets a rendered value to '0' outside an active animation frame.
 */

(function () {
  'use strict';

  var counters = document.querySelectorAll('.counter__number');
  if (!counters.length) return;

  var hasAnimated = false;
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function animateCounters() {
    if (hasAnimated) return;
    hasAnimated = true;

    // Reduced motion, backgrounded tab, or no rAF: keep the rendered
    // final values exactly as they are.
    if (reduceMotion || document.hidden || !window.requestAnimationFrame) {
      return;
    }

    counters.forEach(function (el) {
      var target = parseInt(el.getAttribute('data-target'), 10);
      var suffix = el.getAttribute('data-suffix') || '';
      if (isNaN(target)) return;

      var duration = 1600;
      var startTime = null;

      function frame(now) {
        if (startTime === null) startTime = now;
        var progress = Math.min((now - startTime) / duration, 1);
        // Ease-out cubic so the count decelerates into the final value.
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (progress < 1) {
          window.requestAnimationFrame(frame);
        } else {
          // Always land exactly on the rendered final value.
          el.textContent = target + suffix;
        }
      }

      window.requestAnimationFrame(frame);
    });
  }

  if (!('IntersectionObserver' in window)) {
    animateCounters();
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounters();
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
  );

  var section = document.getElementById('counters');
  if (section) {
    observer.observe(section);
  }

})();
