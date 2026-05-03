/**
 * counters.js — Animated number counters that count up on scroll
 */

(function () {
  'use strict';

  var counters = document.querySelectorAll('.counter__number');
  if (!counters.length) return;

  var hasAnimated = false;

  function animateCounters() {
    if (hasAnimated) return;

    counters.forEach(function (el) {
      var target = parseInt(el.getAttribute('data-target'), 10);
      var suffix = el.getAttribute('data-suffix') || '';
      var duration = 2000;
      var steps = 60;
      var increment = target / steps;
      var current = 0;
      var stepTime = duration / steps;

      el.textContent = '0' + suffix;

      function tick() {
        current += increment;
        if (current >= target) {
          el.textContent = target + suffix;
          return;
        }
        el.textContent = Math.floor(current) + suffix;
        setTimeout(tick, stepTime);
      }

      tick();
    });

    hasAnimated = true;
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
