/**
 * nav.js — Navigation & Mobile Menu
 * - Toggles mobile hamburger menu with scrim
 * - Closed menu stays out of the tab order and accessibility tree (inert)
 * - Escape closes the menu and restores focus to the toggle
 * - Closes menu on link click and scrim click
 * - Sets active link based on scroll position (scroll spy)
 * - Hides header on scroll down, shows on scroll up
 */

(function () {
  'use strict';

  var header = document.getElementById('header');
  var navToggle = document.getElementById('navToggle');
  var navMenu = document.getElementById('navMenu');
  var navLinks = document.querySelectorAll('.nav__link');

  if (!navToggle || !navMenu) return;

  var mobileQuery = window.matchMedia('(max-width: 999px)');

  // --- Scrim (created here so page markup stays untouched) ---
  var scrim = document.createElement('div');
  scrim.className = 'nav__scrim';
  scrim.setAttribute('aria-hidden', 'true');
  document.body.appendChild(scrim);

  function isOpen() {
    return navToggle.getAttribute('aria-expanded') === 'true';
  }

  function applyInertState() {
    // Below the desktop breakpoint the menu is off-canvas when closed;
    // keep it unreachable for keyboard and assistive technology.
    if (mobileQuery.matches && !isOpen()) {
      navMenu.setAttribute('inert', '');
    } else {
      navMenu.removeAttribute('inert');
    }
  }

  function openMenu() {
    navToggle.setAttribute('aria-expanded', 'true');
    navMenu.classList.add('nav__menu--open');
    scrim.classList.add('nav__scrim--visible');
    document.body.style.overflow = 'hidden';
    applyInertState();
    var firstLink = navMenu.querySelector('a');
    if (firstLink) firstLink.focus();
  }

  function closeMenu(restoreFocus) {
    navToggle.setAttribute('aria-expanded', 'false');
    navMenu.classList.remove('nav__menu--open');
    scrim.classList.remove('nav__scrim--visible');
    document.body.style.overflow = '';
    applyInertState();
    if (restoreFocus) navToggle.focus();
  }

  navToggle.addEventListener('click', function () {
    if (isOpen()) closeMenu(true);
    else openMenu();
  });

  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      closeMenu(false);
    });
  });

  scrim.addEventListener('click', function () {
    closeMenu(true);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) {
      closeMenu(true);
    }
  });

  if (mobileQuery.addEventListener) {
    mobileQuery.addEventListener('change', applyInertState);
  } else if (mobileQuery.addListener) {
    mobileQuery.addListener(applyInertState);
  }
  applyInertState();

  // --- Scroll Spy (homepage sections → route nav links) ---
  // Homepage nav links point at routes, not in-page anchors, so map each
  // homepage section id to the href of the nav link it should activate.
  var SECTION_TO_LINK = {
    'systems': '/projects/',
    'field-notes': '/articles/',
    'handbook': '/handbook/',
    'about': '#about'
  };

  var sections = document.querySelectorAll('section[id]');
  if (sections.length > 0 && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;

          // Explicit mapping first; fall back to in-page anchor match so
          // non-homepage sections keep working if a link targets them.
          var href = SECTION_TO_LINK[entry.target.id] ||
            ('#' + entry.target.id);

          var matched = false;
          navLinks.forEach(function (link) {
            if (link.getAttribute('href') === href) matched = true;
          });
          // No nav link for this section: leave the current active
          // (route-based) state untouched.
          if (!matched) return;

          navLinks.forEach(function (link) {
            link.classList.toggle(
              'nav__link--active',
              link.getAttribute('href') === href
            );
          });
        });
      },
      { rootMargin: '-50% 0px -50% 0px' }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  // --- Hide/show header on scroll ---
  var lastScrollY = window.scrollY;
  var ticking = false;

  function handleScroll() {
    var currentScrollY = window.scrollY;

    if (currentScrollY > lastScrollY && currentScrollY > 100) {
      header.classList.add('header--hidden');
    } else {
      header.classList.remove('header--hidden');
    }

    lastScrollY = currentScrollY;
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(handleScroll);
      ticking = true;
    }
  }, { passive: true });

})();
