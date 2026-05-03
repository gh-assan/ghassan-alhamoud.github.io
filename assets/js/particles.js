/**
 * particles.js — Animated nodes/connections background for hero
 * Draws a dynamic node graph with pulsing connections
 */

(function () {
  'use strict';

  var canvas = document.createElement('canvas');
  canvas.className = 'hero__particles';
  canvas.setAttribute('aria-hidden', 'true');

  var hero = document.querySelector('.hero');
  if (!hero) return;

  hero.appendChild(canvas);
  canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:1;width:100%;height:100%;';

  var ctx = canvas.getContext('2d');
  var w, h;
  var nodes = [];
  var connections = [];
  var NODE_COUNT = 16;
  var CONNECTION_DIST = 120;
  var isRunning = true;

  function resize() {
    var rect = hero.getBoundingClientRect();
    w = canvas.width = rect.width * window.devicePixelRatio;
    h = canvas.height = rect.height * window.devicePixelRatio;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    canvas.width = rect.width;
    canvas.height = rect.height;
  }

  function initNodes() {
    nodes = [];
    for (var i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 1.5,
        pulse: Math.random() * Math.PI * 2
      });
    }
  }

  function draw() {
    if (!isRunning) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var time = Date.now() * 0.001;

    // Update and draw nodes
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      n.x += n.vx;
      n.y += n.vy;
      n.pulse += 0.02;

      if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
      if (n.y < 0 || n.y > canvas.height) n.vy *= -1;

      var alpha = 0.3 + Math.sin(n.pulse) * 0.15;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(228, 0, 111, ' + alpha + ')';
      ctx.fill();

      // Small glow
      var grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 4);
      grad.addColorStop(0, 'rgba(228, 0, 111, 0.08)');
      grad.addColorStop(1, 'rgba(228, 0, 111, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw connections
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var dx = nodes[i].x - nodes[j].x;
        var dy = nodes[i].y - nodes[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONNECTION_DIST) {
          var alpha = (1 - dist / CONNECTION_DIST) * 0.15;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = 'rgba(228, 0, 111, ' + alpha + ')';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  resize();
  initNodes();
  draw();

  window.addEventListener('resize', function () {
    resize();
    initNodes();
  });

  // Cleanup
  return function () {
    isRunning = false;
  };

})();
