/* IoT figures follow the reading column; controls operate teaching models only. */
(function () {
  'use strict';
  if ('ResizeObserver' in window) {
    var pictures = new ResizeObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.querySelector('source').media = entry.contentRect.width < 680
          ? '(min-width: 0px)' : '(max-width: 0px)';
      });
    });
    document.querySelectorAll('.iot-diagram picture, .iot-scene picture').forEach(function (picture) {
      pictures.observe(picture);
    });
  }
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var select = document.getElementById('iot-flow-kind');
  if (select) select.addEventListener('change', function () {
    document.getElementById('iot-flow-scene').dataset.kind = select.value;
    if (window.Motion) window.Motion.seek('iot-study-flow', reduce.matches ? 16 : 0);
  });
  document.querySelectorAll('[data-iot-reset]').forEach(function (button) {
    button.addEventListener('click', function () {
      var name = button.dataset.iotReset;
      if (window.Motion) window.Motion.seek(name, reduce.matches ? (name === 'iot-study-flow' ? 16 : 10) : 0);
    });
  });
})();
