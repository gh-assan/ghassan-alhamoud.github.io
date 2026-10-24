/**
 * nav.js — Navigation & Mobile Menu
 * - Toggles mobile hamburger menu with scrim
 * - Closed menu stays out of the tab order and accessibility tree (inert)
 * - Escape closes the menu and restores focus to the toggle
 * - Closes menu on link click and scrim click
 * - Sets route activity without mapping home previews onto different pages
 * - Hides header on scroll down, shows on scroll up
 */

(function () {
  'use strict';

  var header = document.getElementById('header');
  var navToggle = document.getElementById('navToggle');
  var navMenu = document.getElementById('navMenu');
  var navLinks = document.querySelectorAll('.nav__link');

  if (!navToggle || !navMenu) return;

  navToggle.setAttribute('aria-controls', navMenu.id);
  var previousOverflow = '';
  var isolated = [];

  // Isolate siblings along the drawer's ancestor path, preserving prior inert state.
  function isolateBackground() {
    var branch = navMenu;
    while (branch !== document.body) {
      Array.prototype.forEach.call(branch.parentElement.children, function (sibling) {
        if (sibling === branch || sibling === navToggle || sibling === navMenu || sibling === scrim) return;
        isolated.push({ element: sibling, inert: sibling.hasAttribute('inert') });
        sibling.setAttribute('inert', '');
      });
      branch = branch.parentElement;
    }
  }

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
    if (!mobileQuery.matches || isOpen()) return;
    previousOverflow = document.body.style.overflow;
    header.classList.remove('header--hidden');
    navToggle.setAttribute('aria-expanded', 'true');
    navMenu.classList.add('nav__menu--open');
    scrim.classList.add('nav__scrim--visible');
    document.body.style.overflow = 'hidden';
    applyInertState();
    isolateBackground();
    var firstLink = navMenu.querySelector('a');
    if (firstLink) firstLink.focus();
  }

  function closeMenu(restoreFocus) {
    var wasOpen = isOpen();
    navToggle.setAttribute('aria-expanded', 'false');
    navMenu.classList.remove('nav__menu--open');
    scrim.classList.remove('nav__scrim--visible');
    if (wasOpen) document.body.style.overflow = previousOverflow;
    isolated.forEach(function (saved) {
      if (!saved.inert) saved.element.removeAttribute('inert');
    });
    isolated = [];
    applyInertState();
    if (restoreFocus && mobileQuery.matches) navToggle.focus();
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
    if (!isOpen()) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu(true);
    } else if (e.key === 'Tab') {
      var links = navMenu.querySelectorAll('a[href]');
      var last = links[links.length - 1] || navToggle;
      var active = document.activeElement;
      if (e.shiftKey && (active === navToggle || !header.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !header.contains(active))) {
        e.preventDefault();
        navToggle.focus();
      }
    }
  });

  function reconcileViewport() {
    if (!mobileQuery.matches && isOpen()) closeMenu(false);
    else applyInertState();
  }

  header.addEventListener('focusin', function () {
    header.classList.remove('header--hidden');
  });

  if (mobileQuery.addEventListener) {
    mobileQuery.addEventListener('change', reconcileViewport);
  } else if (mobileQuery.addListener) {
    mobileQuery.addListener(reconcileViewport);
  }
  applyInertState();

  // Global navigation describes destinations, not the home preview in view.
  var path = window.location.pathname;
  navLinks.forEach(function (link) {
    var href = link.getAttribute('href') || '';
    var current = href === '/#handbook'
      ? /^\/(?:iot-)?handbook\//.test(path)
      : href.charAt(0) === '/' && href.indexOf('#') === -1 && path.indexOf(href) === 0;
    link.classList.toggle('nav__link--active', current);
    if (current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  // --- Hide/show header on scroll ---
  var lastScrollY = window.scrollY;
  var ticking = false;

  function handleScroll() {
    var currentScrollY = window.scrollY;

    if (!isOpen() && !header.contains(document.activeElement) && currentScrollY > lastScrollY && currentScrollY > 100) {
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
