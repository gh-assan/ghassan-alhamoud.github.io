/**
 * nav.js — Navigation & Mobile Menu
 * - Toggles mobile hamburger menu
 * - Closes menu on link click
 * - Closes menu on outside click
 * - Sets active link based on scroll position (scroll spy)
 * - Hides header on scroll down, shows on scroll up
 */

(function () {
  'use strict';

  const header = document.getElementById('header');
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav__link');

  if (!navToggle || !navMenu) return;

  // --- Toggle mobile menu ---
  navToggle.addEventListener('click', function () {
    const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!isOpen));
    navMenu.classList.toggle('nav__menu--open');
    document.body.style.overflow = isOpen ? '' : 'hidden';
  });

  // --- Close menu on link click ---
  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      navToggle.setAttribute('aria-expanded', 'false');
      navMenu.classList.remove('nav__menu--open');
      document.body.style.overflow = '';
    });
  });

  // --- Close menu on click outside ---
  document.addEventListener('click', function (e) {
    if (navMenu.classList.contains('nav__menu--open')) {
      if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
        navToggle.setAttribute('aria-expanded', 'false');
        navMenu.classList.remove('nav__menu--open');
        document.body.style.overflow = '';
      }
    }
  });

  // --- Close menu on Escape key ---
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && navMenu.classList.contains('nav__menu--open')) {
      navToggle.setAttribute('aria-expanded', 'false');
      navMenu.classList.remove('nav__menu--open');
      document.body.style.overflow = '';
    }
  });

  // --- Scroll Spy (only on homepage with sections) ---
  const sections = document.querySelectorAll('section[id]');
  if (sections.length > 0) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            navLinks.forEach(function (link) {
              link.classList.remove('nav__link--active');
              if (link.getAttribute('href') === '#' + entry.target.id) {
                link.classList.add('nav__link--active');
              }
            });
          }
        });
      },
      { rootMargin: '-50% 0px -50% 0px' }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  // --- Hide/show header on scroll ---
  let lastScrollY = window.scrollY;
  let ticking = false;

  function handleScroll() {
    const currentScrollY = window.scrollY;

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
