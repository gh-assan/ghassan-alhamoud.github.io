/**
 * article-toc.js — "On this page" panel behaviour
 *
 * Progressive enhancement for the static <nav class="article-toc"> markup:
 *  1. Scroll-spy  → IntersectionObserver marks the current section's link
 *                   with .article-toc__link--active.
 *  2. Small viewports (< 900px) → the panel is collapsed behind a toggle
 *                   button so it does not eat the first mobile screen.
 *  3. Anchor clicks respect prefers-reduced-motion (no smooth scrolling).
 *
 * No-JS and no-IntersectionObserver browsers keep the fully expanded,
 * perfectly usable static list.
 */

(function () {
  'use strict';

  var toc = document.querySelector('.article-toc');
  if (!toc) return;

  var links = toc.querySelectorAll('a[href^="#"]');
  if (links.length === 0) return;

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----- 3. Anchor clicks: honour reduced-motion for smooth scrolling ----- */
  function onLinkClick(event) {
    var hash = event.currentTarget.getAttribute('href');
    if (!hash || hash.charAt(0) !== '#') return;
    var target = document.getElementById(hash.slice(1));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start'
    });
    // Keep the URL in sync for shareability without a page jump.
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', hash);
    }
    // Collapse the panel again after navigating on small screens.
    if (toc.classList.contains('article-toc--collapsed')) {
      setExpanded(false);
    }
  }

  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', onLinkClick);
  }

  /* ----- 2. Collapse below 900px ---------------------------------------- */
  var toggle = null;

  function setExpanded(expanded) {
    if (!toggle) return;
    toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    if (expanded) {
      toc.classList.add('article-toc--open');
    } else {
      toc.classList.remove('article-toc--open');
    }
  }

  function applyCollapse() {
    var narrow = (window.innerWidth ||
      document.documentElement.clientWidth) < 900;

    if (narrow && !toc.classList.contains('article-toc--collapsed')) {
      toc.classList.add('article-toc--collapsed');
      if (!toggle) {
        toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'article-toc__toggle';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = 'On this page';
        toggle.addEventListener('click', function () {
          setExpanded(toggle.getAttribute('aria-expanded') !== 'true');
        });
        toc.insertBefore(toggle, toc.firstChild);
      }
      setExpanded(false);
    } else if (!narrow && toc.classList.contains('article-toc--collapsed')) {
      toc.classList.remove('article-toc--collapsed');
      toc.classList.remove('article-toc--open');
      if (toggle && toggle.parentNode) {
        toggle.parentNode.removeChild(toggle);
      }
      toggle = null;
    }
  }

  applyCollapse();

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyCollapse, 150);
  });

  /* ----- 1. Scroll-spy --------------------------------------------------- */
  if (!('IntersectionObserver' in window)) return;

  // Map section id → link element, in document order.
  var sections = [];
  var linkBySection = [];
  for (var j = 0; j < links.length; j++) {
    var id = links[j].getAttribute('href').slice(1);
    var section = document.getElementById(id);
    if (section) {
      sections.push(section);
      linkBySection.push(links[j]);
    }
  }
  if (sections.length === 0) return;

  var activeLink = null;

  function setActive(link) {
    if (link === activeLink) return;
    if (activeLink) {
      activeLink.classList.remove('article-toc__link--active');
    }
    if (link) {
      link.classList.add('article-toc__link--active');
    }
    activeLink = link;
  }

  // Pick the last section whose top is above the reading line; fall back
  // to the first section when the reader is above all of them.
  function updateActive() {
    var readingLine = (window.innerHeight ||
      document.documentElement.clientHeight) * 0.3;
    var candidate = null;
    for (var k = 0; k < sections.length; k++) {
      if (sections[k].getBoundingClientRect().top <= readingLine) {
        candidate = linkBySection[k];
      } else {
        break;
      }
    }
    if (!candidate) candidate = linkBySection[0];
    setActive(candidate);
  }

  // The observer only flags that layout changed; the actual pick is a
  // deterministic scan, which avoids interleaving/ordering edge cases.
  var scheduled = false;
  var observer = new IntersectionObserver(function () {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function () {
      scheduled = false;
      updateActive();
    }, 60);
  }, {
    rootMargin: '0px 0px -60% 0px',
    threshold: 0
  });

  for (var m = 0; m < sections.length; m++) {
    observer.observe(sections[m]);
  }

  window.addEventListener('scroll', function () {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function () {
      scheduled = false;
      updateActive();
    }, 60);
  }, { passive: true });

  updateActive();

})();
