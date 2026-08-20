/**
 * article-filter.js — Live filter for the Field Notes archive
 *
 * Progressive enhancement:
 *  - With JS disabled the input is inert and every static card stays
 *    visible; nothing is hidden by default.
 *  - Typing filters the .article-card elements by title, excerpt, and
 *    tag text (case-insensitive substring). Non-matches get
 *    el.style.display = 'none'; matches are restored.
 *  - articles.js re-renders #articlesPageList from articles.json after
 *    fetch, which drops the static featured card and any active filter.
 *    A MutationObserver re-applies both after such a swap.
 */

(function () {
  'use strict';

  var input = document.getElementById('archiveFilterInput');
  var list = document.getElementById('articlesPageList');

  if (!input || !list) return;

  // Derive the featured card from the static HTML instead of hardcoding it,
  // so a rebuild featuring a newer note cannot drift out of sync.
  var featuredEl = list.querySelector('.article-card--featured');
  var FEATURED_HREF = featuredEl ? featuredEl.getAttribute('href') : null;

  function cards() {
    return list.querySelectorAll('.article-card');
  }

  function cardText(card) {
    return (card.textContent || '').toLowerCase();
  }

  function applyFilter() {
    var query = input.value.toLowerCase().replace(/^\s+|\s+$/g, '');
    var all = cards();
    for (var i = 0; i < all.length; i++) {
      var card = all[i];
      var match = query === '' || cardText(card).indexOf(query) !== -1;
      card.style.display = match ? '' : 'none';
    }
  }

  function markFeatured() {
    if (!FEATURED_HREF) return;
    var all = cards();
    for (var i = 0; i < all.length; i++) {
      if (all[i].getAttribute('href') === FEATURED_HREF) {
        all[i].classList.add('article-card--featured');
      }
    }
  }

  input.addEventListener('input', applyFilter);

  // articles.js swaps the list contents once fresh data arrives; re-apply
  // the featured treatment and the current query afterwards.
  if ('MutationObserver' in window) {
    var observer = new MutationObserver(function () {
      markFeatured();
      applyFilter();
    });
    observer.observe(list, { childList: true });
  }

})();
