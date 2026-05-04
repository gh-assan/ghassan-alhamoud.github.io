/**
 * carousel.js — Testimonial carousel with slide, dots, and auto-advance
 */

(function () {
  'use strict';

  var track = document.getElementById('carouselTrack');
  var prevBtn = document.getElementById('carouselPrev');
  var nextBtn = document.getElementById('carouselNext');
  var dots = document.querySelectorAll('#carouselDots .carousel__dot');

  if (!track || !prevBtn || !nextBtn || !dots.length) return;

  var slides = track.querySelectorAll('.carousel__slide');
  if (!slides.length) return;

  var index = 0;
  var total = slides.length;
  var autoInterval = null;

  function goTo(i) {
    if (i < 0) i = total - 1;
    if (i >= total) i = 0;
    index = i;

    track.style.transform = 'translateX(' + (-index * 100) + '%)';

    dots.forEach(function (dot, idx) {
      dot.classList.toggle('carousel__dot--active', idx === index);
    });
  }

  function next() { goTo(index + 1); }
  function prev() { goTo(index - 1); }

  function startAuto() {
    stopAuto();
    autoInterval = setInterval(next, 5000);
  }

  function stopAuto() {
    if (autoInterval) {
      clearInterval(autoInterval);
      autoInterval = null;
    }
  }

  // Event listeners
  nextBtn.addEventListener('click', function () { next(); startAuto(); });
  prevBtn.addEventListener('click', function () { prev(); startAuto(); });

  dots.forEach(function (dot, i) {
    dot.addEventListener('click', function () { goTo(i); startAuto(); });
  });

  // Pause on hover
  var carousel = document.getElementById('carousel');
  if (carousel) {
    carousel.addEventListener('mouseenter', stopAuto);
    carousel.addEventListener('mouseleave', startAuto);
  }

  // Touch support
  var startX = 0;
  var isDragging = false;

  track.addEventListener('touchstart', function (e) {
    startX = e.touches[0].clientX;
    isDragging = true;
  }, { passive: true });

  track.addEventListener('touchend', function (e) {
    if (!isDragging) return;
    var endX = e.changedTouches[0].clientX;
    var diff = startX - endX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
      startAuto();
    }
    isDragging = false;
  }, { passive: true });

  // Keyboard support
  carousel.setAttribute('tabindex', '0');
  carousel.setAttribute('role', 'region');
  carousel.setAttribute('aria-label', 'Testimonials');

  carousel.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { prev(); startAuto(); e.preventDefault(); }
    if (e.key === 'ArrowRight') { next(); startAuto(); e.preventDefault(); }
  });

  // Initialize
  goTo(0);
  startAuto();

})();
