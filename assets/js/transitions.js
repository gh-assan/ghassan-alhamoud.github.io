/**
 * transitions.js — Smooth page transitions with fade overlay
 * Intercepts internal links and fades between pages
 */

(function () {
  'use strict';

  // Skip if running on file:// protocol (local dev without server)
  if (window.location.protocol === 'file:' ||
      (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;

  var overlay = document.createElement('div');
  overlay.className = 'page-transition';
  overlay.setAttribute('aria-hidden', 'true');
  document.body.appendChild(overlay);

  var isTransitioning = false;

  function navigateTo(url) {
    if (isTransitioning) return;
    isTransitioning = true;

    overlay.classList.add('page-transition--active');

    setTimeout(function () {
      window.location.href = url;
    }, 350);
  }

  document.addEventListener('click', function (e) {
    // Never intercept modified clicks or non-primary buttons
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;

    var link = e.target.closest('a');
    if (!link) return;

    // Only internal navigation
    var href = link.getAttribute('href');
    if (!href) return;

    // Downloads keep native behavior
    if (link.hasAttribute('download')) return;

    // Skip external links
    if (href.startsWith('http') && !href.startsWith(window.location.origin)) return;

    // Skip anchors, mailto/tel, and any other special scheme
    if (href.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(href)) return;

    // Root-relative home anchors must keep native scrolling. Hash-only
    // navigation does not fire load, so a page overlay would never clear.
    var destination = new URL(href, window.location.href);
    if (destination.origin === window.location.origin &&
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search && destination.hash) return;

    // Skip target="_blank"
    if (link.getAttribute('target') === '_blank') return;

    e.preventDefault();
    navigateTo(href);
  });

  // Back/forward cache restores the outgoing overlay and JS state too.
  window.addEventListener('pageshow', function () {
    isTransitioning = false;
    overlay.classList.remove('page-transition--active');
  });

  // On page load, fade in
  window.addEventListener('load', function () {
    setTimeout(function () {
      overlay.classList.remove('page-transition--active');
    }, 50);
  });

})();
