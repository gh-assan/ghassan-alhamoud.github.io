/**
 * transitions.js — Smooth page transitions with fade overlay
 * Intercepts internal links and fades between pages
 */

(function () {
  'use strict';

  // Skip if running on file:// protocol (local dev without server)
  if (window.location.protocol === 'file:') return;

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
    var link = e.target.closest('a');
    if (!link) return;

    // Only internal navigation
    var href = link.getAttribute('href');
    if (!href) return;

    // Skip external links
    if (href.startsWith('http') && !href.startsWith(window.location.origin)) return;

    // Skip anchors and mailto
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    // Skip target="_blank"
    if (link.getAttribute('target') === '_blank') return;

    e.preventDefault();
    navigateTo(href);
  });

  // On page load, fade in
  window.addEventListener('load', function () {
    setTimeout(function () {
      overlay.classList.remove('page-transition--active');
    }, 50);
  });

})();
