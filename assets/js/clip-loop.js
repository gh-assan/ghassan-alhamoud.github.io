(function () {
  'use strict';

  var reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var clips = [];

  function reduced() {
    return !!(reduceQuery && reduceQuery.matches);
  }

  function play(video) {
    var started = video.play();
    if (started && started.catch) started.catch(function () {});
  }

  function addPlayButton(clip) {
    if (clip.button) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'clip__play';
    button.setAttribute('aria-label', 'Play animation');
    button.addEventListener('click', function () {
      clip.userStarted = true;
      removePlayButton(clip);
      play(clip.video);
    });
    clip.frame.appendChild(button);
    clip.button = button;
  }

  function removePlayButton(clip) {
    if (!clip.button) return;
    clip.button.remove();
    clip.button = null;
  }

  function sync(clip) {
    if (reduced() && clip.userStarted) {
      if (!clip.visible || document.hidden) clip.video.pause();
      return;
    }
    if (reduced()) {
      clip.video.pause();
      if (clip.video.currentTime > 0) clip.video.currentTime = 0;
      addPlayButton(clip);
      return;
    }
    clip.userStarted = false;
    removePlayButton(clip);
    if (clip.visible && !document.hidden) play(clip.video);
    else clip.video.pause();
  }

  function init() {
    var frames = document.querySelectorAll('.clip__frame');
    Array.prototype.forEach.call(frames, function (frame) {
      var video = frame.querySelector('video');
      if (!video) return;
      clips.push({ frame: frame, video: video, visible: false, button: null, userStarted: false });
    });
    if (!clips.length) return;

    var observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            var clip = clips.filter(function (c) { return c.video === entry.target; })[0];
            if (!clip) return;
            clip.visible = entry.isIntersecting;
            sync(clip);
          });
        }, { threshold: 0.4 })
      : null;

    clips.forEach(function (clip) {
      if (observer) observer.observe(clip.video);
      else if (reduced()) sync(clip);
    });

    document.addEventListener('visibilitychange', function () { clips.forEach(sync); });
    if (reduceQuery && reduceQuery.addEventListener) {
      reduceQuery.addEventListener('change', function () { clips.forEach(sync); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
