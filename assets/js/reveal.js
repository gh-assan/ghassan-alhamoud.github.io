/**
 * reveal.js — Scroll-triggered reveal animations
 * Uses IntersectionObserver for performant scroll detection
 */

(function () {
  'use strict';

  var revealElements = document.querySelectorAll('.reveal');

  if (revealElements.length === 0) return;

  if (!('IntersectionObserver' in window)) {
    // Fallback: just show everything
    revealElements.forEach(function (el) {
      el.classList.add('reveal--visible');
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal--visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'
    }
  );

  revealElements.forEach(function (el) {
    observer.observe(el);
  });

})();
