/**
 * research.js — progressive enhancement for /research/ pages.
 *
 *  1. Reading-progress bar (transform only; reduced-motion safe).
 *  2. Scroll-spy for the "On this page" rail.
 *  3. Copy buttons on code blocks.
 *  4. Hover tooltips for chart marks (data-tip). The "View data" table is the
 *     accessible, keyboard-reachable equivalent, so tooltips are hover-only.
 *  5. Glossary filter; FAQ "expand all"; print button.
 *
 * Every page is fully usable without this file.
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1. Progress ---------------------------------------------------------- */
  var bar = document.querySelector('.rs-progress__bar');
  var article = document.querySelector('.rs-article');
  if (bar && article) {
    var ticking = false;
    var update = function () {
      var rect = article.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      var p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* 2. Scroll-spy -------------------------------------------------------- */
  var tocLinks = document.querySelectorAll('.rs-toc__list a[href^="#"]');
  if (tocLinks.length) {
    var byId = {};
    var targets = [];
    tocLinks.forEach(function (a) {
      var id = decodeURIComponent(a.getAttribute('href').slice(1));
      var el = document.getElementById(id);
      if (el) { byId[id] = a; targets.push(el); }
    });
    /* The active entry is the last heading above the 35vh reading line. Rects
       are read only inside a rAF tick, so at most one layout pass per frame. */
    var lastActive = null;
    var setActive = function () {
      var current = null;
      for (var i = 0; i < targets.length; i++) {
        if (targets[i].getBoundingClientRect().top < window.innerHeight * 0.35) current = targets[i].id;
      }
      /* At the very bottom of the page the final sections can sit entirely
         below the reading line; pin the last entry so it still activates. */
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 4) {
        current = targets.length ? targets[targets.length - 1].id : current;
      }
      if (current === lastActive) return;
      lastActive = current;
      tocLinks.forEach(function (a) { a.classList.remove('is-active'); });
      if (current && byId[current]) byId[current].classList.add('is-active');
    };
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(function () { ticking = false; setActive(); }); }
    }, { passive: true });
    window.addEventListener('resize', setActive, { passive: true });
    setActive();
  }

  /* 3. Copy buttons ------------------------------------------------------ */
  if (navigator.clipboard) {
    document.querySelectorAll('.rs-code').forEach(function (block) {
      var code = block.querySelector('pre code');
      if (!code) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rs-copy';
      btn.textContent = 'Copy';
      btn.setAttribute('aria-label', 'Copy code to clipboard');
      btn.addEventListener('click', function () {
        navigator.clipboard.writeText(code.innerText).then(function () {
          btn.textContent = 'Copied';
          setTimeout(function () { btn.textContent = 'Copy'; }, 1600);
        });
      });
      var head = block.querySelector('.rs-code__head');
      (head || block).appendChild(btn);
    });
  }

  /* 4. Chart tooltips ---------------------------------------------------- */
  var tip = null;
  var showTip = function (e) {
    var t = e.target.getAttribute && e.target.getAttribute('data-tip');
    if (!t) return;
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'rs-tip';
      tip.setAttribute('role', 'presentation');
      document.body.appendChild(tip);
    }
    tip.textContent = t;
    tip.hidden = false;
    moveTip(e);
  };
  var moveTip = function (e) {
    if (!tip || tip.hidden) return;
    var x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    tip.style.left = x + 'px';
    tip.style.top = (e.clientY - tip.offsetHeight - 12) + 'px';
  };
  var hideTip = function (e) {
    if (tip && e.target.getAttribute && e.target.getAttribute('data-tip')) tip.hidden = true;
  };
  document.querySelectorAll('.rs-chart svg').forEach(function (svg) {
    svg.addEventListener('mouseover', showTip);
    svg.addEventListener('mousemove', moveTip);
    svg.addEventListener('mouseout', hideTip);
  });

  /* 5a. Glossary filter -------------------------------------------------- */
  var filter = document.querySelector('[data-gloss-filter]');
  if (filter) {
    var entries = document.querySelectorAll('.rs-gloss__entry');
    var letters = document.querySelectorAll('.rs-gloss__letter');
    var empty = document.querySelector('.rs-gloss__empty');
    filter.addEventListener('input', function () {
      var q = filter.value.trim().toLowerCase();
      var shown = 0;
      entries.forEach(function (el) {
        var hit = !q || el.getAttribute('data-term').indexOf(q) !== -1 ||
          el.textContent.toLowerCase().indexOf(q) !== -1;
        el.hidden = !hit;
        if (hit) shown++;
      });
      letters.forEach(function (h) { h.hidden = !!q; });
      if (empty) empty.hidden = shown !== 0;
    });
  }

  /* 5b. FAQ expand all --------------------------------------------------- */
  var expand = document.querySelector('[data-expand-all]');
  if (expand) {
    expand.addEventListener('click', function () {
      var items = document.querySelectorAll('.rs-faq__item');
      var anyClosed = Array.prototype.some.call(items, function (d) { return !d.open; });
      items.forEach(function (d) { d.open = anyClosed; });
      expand.textContent = anyClosed ? 'Collapse all answers' : 'Expand all answers';
    });
  }
  if (location.hash) {
    var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target && target.tagName === 'DETAILS') target.open = true;
  }

  /* 5c. Self-scoring diagnostic ------------------------------------------ */
  document.querySelectorAll('.rs-diag').forEach(function (diag) {
    var levels, actions;
    try {
      levels = JSON.parse(diag.getAttribute('data-levels'));
      actions = JSON.parse(diag.getAttribute('data-actions'));
    } catch (e) { return; }
    var form = diag.querySelector('.rs-diag__form');
    var result = diag.querySelector('.rs-diag__result');
    var key = 'rs-diag:' + location.pathname;
    /* The form is a scoring surface, not a submission: without JS there is no
       handler, so a stray Enter would reload the page. */
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });

    var levelFor = function (score, gated) {
      var lvl = levels[0];
      levels.forEach(function (l) { if (score >= l.min) lvl = l; });
      if (gated && levels.indexOf(lvl) > 1) lvl = levels[1];
      return lvl;
    };

    var escapeHtml = function (s) {
      return String(s).replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    };

    var render = function () {
      var areas = [];
      var answered = 0;
      var total = 0;
      var saved = {};
      diag.querySelectorAll('.rs-diag__area').forEach(function (area) {
        var score = 0;
        var gated = false;
        var groups = {};
        area.querySelectorAll('input[type=radio]').forEach(function (r) {
          groups[r.name] = groups[r.name] || null;
          if (r.checked) groups[r.name] = r;
        });
        Object.keys(groups).forEach(function (name) {
          total++;
          var r = groups[name];
          if (!r) {
            var gateInput = area.querySelector('input[name="' + name + '"][data-gate]');
            if (gateInput) gated = true;
            return;
          }
          answered++;
          saved[name] = r.value;
          score += Number(r.value);
          if (r.hasAttribute('data-gate') && r.value === '0') gated = true;
        });
        var lvl = levelFor(score, gated);
        var out = area.querySelector('.rs-diag__score');
        if (out) out.textContent = score + '/10 · ' + lvl.name.split(' ')[0] + (gated ? ' (capped)' : '');
        areas.push({ id: area.getAttribute('data-area'), title: area.getAttribute('data-title'),
          score: score, level: lvl, gated: gated });
      });
      try { localStorage.setItem(key, JSON.stringify(saved)); } catch (e) {}
      if (!answered) return;

      var lowest = areas[0];
      var minLevelIdx = levels.length;
      areas.forEach(function (a) {
        if (a.score < lowest.score) lowest = a;
        minLevelIdx = Math.min(minLevelIdx, levels.indexOf(a.level));
      });
      var overall = levels[minLevelIdx];
      var action = actions[lowest.id];
      var rows = areas.map(function (a) {
        var isLow = a === lowest ? ' is-lowest' : '';
        return '<li class="rs-diag__row' + isLow + '"><span class="rs-diag__row-name">' + a.id + ' ' +
          escapeHtml(a.title) + '</span><span class="rs-diag__bar"><span style="width:' + (a.score * 10) +
          '%"></span></span><span class="rs-diag__row-score">' + a.score + '/10 · ' +
          escapeHtml(a.level.name.split(' ')[0]) + (a.gated ? ' ⚑' : '') + '</span></li>';
      }).join('');
      result.innerHTML =
        '<p class="rs-diag__result-title">Your result</p>' +
        '<p class="rs-diag__overall"><span class="rs-diag__overall-level">' + escapeHtml(overall.name) + '</span> ' +
        escapeHtml(overall.text) + '</p>' +
        '<ul class="rs-diag__rows">' + rows + '</ul>' +
        '<div class="rs-diag__action"><p class="rs-diag__action-label">Your one next action · lowest area: ' +
        lowest.id + ' ' + escapeHtml(lowest.title) + '</p><p>' + escapeHtml(action.text) +
        ' <a href="' + escapeHtml(action.href) + '">Go →</a></p></div>' +
        (answered < total ? '<p class="rs-diag__partial">' + (total - answered) +
          ' items unanswered count as 0.</p>' : '') +
        '<p><button type="button" class="rs-textbtn" data-diag-reset>Clear my answers</button></p>';
      var reset = result.querySelector('[data-diag-reset]');
      if (reset) reset.addEventListener('click', function () {
        form.reset();
        try { localStorage.removeItem(key); } catch (e) {}
        diag.querySelectorAll('.rs-diag__score').forEach(function (o) { o.textContent = ''; });
        result.innerHTML = '<p class="rs-diag__result-title">Your result</p><p class="rs-diag__empty">' +
          'Score the items above to see your level and your one next action.</p>';
      });
    };

    try {
      var prev = JSON.parse(localStorage.getItem(key) || '{}');
      Object.keys(prev).forEach(function (name) {
        var r = form.querySelector('input[name="' + name + '"][value="' + prev[name] + '"]');
        if (r) r.checked = true;
      });
    } catch (e) {}
    form.addEventListener('change', render);
    render();
  });

  /* 5d. Print ------------------------------------------------------------ */
  document.querySelectorAll('[data-print]').forEach(function (b) {
    b.addEventListener('click', function () { window.print(); });
  });

  if (reduceMotion) document.documentElement.classList.add('rs-reduced-motion');
})();
