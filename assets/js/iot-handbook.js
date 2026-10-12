/* Responsive static alternatives and controls for illustrative teaching models. */
(function () {
  'use strict';
  var pictures = Array.from(document.querySelectorAll('.iot-diagram picture, .iot-scene picture'));
  var owners = new Map();
  pictures.forEach(function (picture) {
    owners.set(picture, picture.closest('.iot-scene') || picture);
    picture.dataset.original = picture.querySelector('img').getAttribute('src');
  });
  function updatePictures() {
    var dark = document.documentElement.dataset.theme === 'dark';
    pictures.forEach(function (picture) {
      var original = picture.dataset.original;
      var compact = original.replace('.svg', '-compact.svg');
      var suffix = dark ? '-dark.svg' : '.svg';
      picture.querySelector('img').src = original.replace('.svg', suffix);
      var source = picture.querySelector('source');
      source.srcset = compact.replace('.svg', suffix);
      source.media = owners.get(picture).getBoundingClientRect().width < 680 ? '(min-width: 0px)' : '(max-width: 0px)';
    });
  }
  updatePictures();
  if ('ResizeObserver' in window) {
    var resize = new ResizeObserver(updatePictures);
    pictures.forEach(function (picture) { resize.observe(owners.get(picture)); });
  }
  new MutationObserver(updatePictures).observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function reset(name) {
    if (!window.Motion) return;
    Motion.seek(name, 0);
    if (reduce.matches) Motion.seek(name, name === 'iot-study-flow' ? IoTStudy.poster(document.getElementById('iot-flow-kind').value) : 10);
  }
  var select = document.getElementById('iot-flow-kind');
  if (select) select.addEventListener('change', function () {
    document.getElementById('iot-flow-scene').dataset.kind = select.value;
    reset('iot-study-flow');
  });
  document.querySelectorAll('[data-iot-reset]').forEach(function (button) {
    button.addEventListener('click', function () { reset(button.dataset.iotReset); });
  });
})();
