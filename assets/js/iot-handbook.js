/* Diagram composition follows the reading column, not the viewport. */
(function () {
  'use strict';
  if ('ResizeObserver' in window) {
    var pictures = new ResizeObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.querySelector('source').media = entry.contentRect.width < 680 ? '(min-width: 0px)' : '(max-width: 0px)';
      });
    });
    document.querySelectorAll('.iot-diagram picture').forEach(function (picture) { pictures.observe(picture); });
  }
  var select = document.getElementById('iot-scenario');
  if (select) select.addEventListener('change', function () {
    document.getElementById('evidence-scene').dataset.scenario = select.value;
    if (window.Motion) window.Motion.seek('iot-evidence', matchMedia('(prefers-reduced-motion: reduce)').matches ? 14 : 0);
  });
})();
