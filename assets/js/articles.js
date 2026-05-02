/**
 * articles.js — Fetch articles.json and render article cards
 * 
 * Used on:
 * - Homepage: renders latest 5 articles in #articleList
 * - Articles listing page: renders all articles in #articlesPageList
 * - Article sidebar: renders latest 5 in .article-sidebar__list
 */

(function () {
  'use strict';

  var ARTICLES_URL = '/articles/articles.json';

  function formatDate(dateStr) {
    var d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function createArticleCard(article) {
    var card = document.createElement('a');
    card.className = 'article-card';
    card.href = '/articles/' + article.slug + '.html';

    var tagsHtml = '';
    if (article.tags && article.tags.length > 0) {
      tagsHtml = '<div class="article-card__tags">' +
        article.tags.map(function (t) {
          return '<span class="article-card__tag">' + t + '</span>';
        }).join('') +
        '</div>';
    }

    card.innerHTML =
      '<div class="article-card__meta">' +
        '<span class="article-card__date">' + formatDate(article.date) + '</span>' +
        '<span class="article-card__dot"></span>' +
        '<span class="article-card__reading-time">' + article.readingTime + '</span>' +
      '</div>' +
      '<div class="article-card__title">' + article.title + '</div>' +
      '<div class="article-card__excerpt">' + article.excerpt + '</div>' +
      tagsHtml;

    return card;
  }

  function createSidebarItem(article) {
    var item = document.createElement('a');
    item.className = 'article-sidebar__item';
    item.href = '/articles/' + article.slug + '.html';
    item.textContent = article.title;
    return item;
  }

  function init() {
    fetch(ARTICLES_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to fetch articles');
        return res.json();
      })
      .then(function (articles) {
        // Sort by date descending
        articles.sort(function (a, b) {
          return new Date(b.date) - new Date(a.date);
        });

        // --- Homepage: latest 5 ---
        var articleList = document.getElementById('articleList');
        if (articleList) {
          articleList.innerHTML = '';
          articles.slice(0, 5).forEach(function (article) {
            articleList.appendChild(createArticleCard(article));
          });
        }

        // --- Articles listing page: all ---
        var articlesPageList = document.getElementById('articlesPageList');
        if (articlesPageList) {
          articlesPageList.innerHTML = '';
          articles.forEach(function (article) {
            articlesPageList.appendChild(createArticleCard(article));
          });
        }

        // --- Article sidebar: latest 5 ---
        var sidebarList = document.getElementById('articleSidebarList');
        if (sidebarList) {
          sidebarList.innerHTML = '';
          articles.slice(0, 5).forEach(function (article) {
            sidebarList.appendChild(createSidebarItem(article));
          });

          // Highlight current article in sidebar
          var currentPath = window.location.pathname;
          var currentItems = sidebarList.querySelectorAll('.article-sidebar__item');
          currentItems.forEach(function (item) {
            if (item.getAttribute('href') === currentPath) {
              item.classList.add('article-sidebar__item--active');
            }
          });
        }
      })
      .catch(function (err) {
        console.error('Articles.js: Could not load articles', err);
        var containers = [
          document.getElementById('articleList'),
          document.getElementById('articlesPageList'),
          document.getElementById('articleSidebarList')
        ];
        containers.forEach(function (el) {
          if (el) {
            el.innerHTML = '<p class="articles-preview__loading">Could not load articles.</p>';
          }
        });
      });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
