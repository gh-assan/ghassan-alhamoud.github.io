/**
 * cal-widget.js — Cal.com booking widget
 *
 * Dynamically loads the Cal.com embed script and initialises
 * the click-to-open widget for any element with [data-cal-link].
 *
 * Include via: <script src="/assets/js/cal-widget.js" defer></script>
 *
 * HTML usage:
 *   <a href="https://calendly.com/..." data-cal-link="ghassan-alhamoud/30min"
 *      data-cal-namespace="30min"
 *      class="btn btn--primary">Book a Call</a>
 */
(function () {
  'use strict';

  var CAL_SCRIPT_URL = 'https://app.cal.eu/embed/embed.js';
  var NAMESPACE = '30min';
  var CAL_LINK = 'ghassan-alhamoud/30min';
  var isReady = false;
  /**
   * Attach click handlers to all [data-cal-link] elements.
   */
  function bindLinks() {
    isReady = true;
    var links = document.querySelectorAll('[data-cal-link]');
    links.forEach(function (link) {
      link.removeEventListener('click', onClickCalLink);
      link.addEventListener('click', onClickCalLink);
    });
  }
  /**
   * Click handler — opens Cal.com modal.
   * Retries up to 15 times (500ms apart) if the embed script hasn't loaded yet.
   */
  function onClickCalLink(e) {
    e.preventDefault();
    var el = this;
    var ns = el.getAttribute('data-cal-namespace') || NAMESPACE;
    var link = el.getAttribute('data-cal-link') || CAL_LINK;

    // If Cal isn't ready yet, retry with backoff
    if (!isReady || typeof Cal === 'undefined' || !Cal.ns || !Cal.ns[ns]) {
      if (!el._calRetries) el._calRetries = 0;
      if (el._calRetries < 15) {
        el._calRetries++;
        setTimeout(function () {
          onClickCalLink.call(el, e);
        }, 500);
        return;
      }
      // Fallback after max retries
      var href = el.getAttribute('href');
      if (href && href !== '#') {
        window.open(href, '_blank');
      }
      return;
    }

    // Open Cal.com modal
    try {
      Cal.ns[ns](link, {});
    } catch (err) {
      console.warn('Cal.com error:', err);
      var href = el.getAttribute('href');
      if (href && href !== '#') {
        window.open(href, '_blank');
      }
    }
  }

  /**
   * Initialise on DOM ready: inject the Cal.com embed script IIFE,
   * queue the namespace init + UI config, then bind links after
   * letting the embed script load.
   */
  function onReady() {
    // Inject the Cal.com embed script IIFE (idempotent)
    (function (C, A, L) {
      var p = function (a, ar) { a.q.push(ar); };
      var d = C.document;
      C.Cal = C.Cal || function () {
        var cal = C.Cal;
        var ar = arguments;
        if (!cal.loaded) {
          cal.ns = {};
          cal.q = cal.q || [];
          d.head.appendChild(d.createElement("script")).src = A;
          cal.loaded = true;
        }
        if (ar[0] === L) {
          var api = function () { p(api, arguments); };
          var namespace = ar[1];
          api.q = api.q || [];
          if (typeof namespace === "string") {
            cal.ns[namespace] = cal.ns[namespace] || api;
            p(cal.ns[namespace], ar);
            p(cal, ["initNamespace", namespace]);
          } else p(cal, ar);
          return;
        }
        p(cal, ar);
      };
    })(window, CAL_SCRIPT_URL, "init");

    // Queue the init + ui calls (the embed script processes these once loaded)
    Cal("init", NAMESPACE, { origin: "https://app.cal.eu" });
    Cal.ns[NAMESPACE]("ui", {
      hideEventTypeDetails: false,
      layout: "week_view"
    });

    // Wait for the embed script to load, then bind links
    // The script is ~200KB, so give it 3 seconds
    setTimeout(bindLinks, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

  window.CalWidget = {
    init: onReady,
    bind: bindLinks
  };

})();

