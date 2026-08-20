/**
 * reveal.js — Scroll-triggered reveal animations
 *
 * Failsafe-first design:
 *  1. Reduced motion  → everything visible immediately, no transition.
 *  2. On load         → anything already in (or above) the viewport is
 *                       revealed synchronously via getBoundingClientRect,
 *                       before/independent of the observer.
 *  3. Timed failsafe  → a setTimeout force-reveals everything after
 *                       ~1200ms in case the observer never fires.
 *  4. Observer        → IntersectionObserver handles below-fold elements;
 *                       no-IO browsers fall back to "show everything".
 *
 * The CSS gating (html.js .reveal) stays the no-JS fallback; this script
 * only guarantees the hidden state never outlives these failsafes.
 */

(function () {
  'use strict';

  var revealElements = document.querySelectorAll('.reveal');

  if (revealElements.length === 0) return;

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function reveal(el) {
    el.classList.add('reveal--visible');
  }

  // 1. Reduced motion: reveal everything now; CSS kills the transition.
  if (reduceMotion) {
    revealElements.forEach(reveal);
    return;
  }

  // 2. Immediate pass: reveal anything in (or above) the viewport so a
  //    direct/slow load never shows blank above-fold content.
  var viewportH = window.innerHeight || document.documentElement.clientHeight;
  revealElements.forEach(function (el) {
    if (el.getBoundingClientRect().top < viewportH) {
      reveal(el);
    }
  });

  // 3. Timed failsafe: in-viewport content never stays hidden longer than
  //    ~1.2s, even if the observer never fires. Below-fold elements keep
  //    their scroll-reveal behavior.
  setTimeout(function () {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    revealElements.forEach(function (el) {
      if (el.getBoundingClientRect().top < vh) {
        reveal(el);
      }
    });
  }, 1200);

  // 4. Below-fold elements: IntersectionObserver; no-IO → show everything.
  if (!('IntersectionObserver' in window)) {
    revealElements.forEach(reveal);
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          reveal(entry.target);
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
    if (!el.classList.contains('reveal--visible')) {
      // JS has taken over: clear the CSS reveal-safety backstop so the
      // normal hidden state + entrance transition keep working past 2.5s.
      // The timed failsafe above still covers an observer that never fires.
      el.style.animation = 'none';
      observer.observe(el);
    }
  });

})();
