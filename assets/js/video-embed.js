(function () {
  'use strict';

  var HOST = 'https://www.youtube-nocookie.com/embed/';

  function load(box) {
    var frame = box.querySelector('.video-embed__frame');
    var button = box.querySelector('.video-embed__play');
    var id = box.getAttribute('data-video-id');
    if (!frame || !button || !id) return;
    var iframe = document.createElement('iframe');
    iframe.src = HOST + encodeURIComponent(id) + '?autoplay=1&rel=0';
    iframe.title = button.getAttribute('data-title') || 'Video';
    iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    frame.replaceChild(iframe, button);
    iframe.focus();
  }

  function init() {
    var boxes = document.querySelectorAll('.video-embed[data-video-id]');
    Array.prototype.forEach.call(boxes, function (box) {
      var button = box.querySelector('.video-embed__play');
      if (button) button.addEventListener('click', function () { load(box); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
