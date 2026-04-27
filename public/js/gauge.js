// Canvas2D 180° gauge renderer for Orbital
// Draws a semicircular gauge with score, state zones, and idle breathing
(function() {
  var DEPLETED_COLOR = '#E5484D';
  var ELEVATED_COLOR = '#F5B547';
  var RESOURCED_COLOR = '#5DD9D4';

  function scoreToColor(score) {
    if (score < 40) return DEPLETED_COLOR;
    if (score < 70) return ELEVATED_COLOR;
    return RESOURCED_COLOR;
  }

  function drawGauge(canvas, score) {
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var cx = W / 2, cy = H * 0.85;
    var r = Math.min(W, H * 1.7) * 0.42;
    var strokeW = 24;

    ctx.clearRect(0, 0, W, H);

    // Track background zones
    var zones = [
      { start: Math.PI, end: Math.PI + Math.PI * 0.4, color: 'rgba(229,72,77,0.15)' },
      { start: Math.PI + Math.PI * 0.4, end: Math.PI + Math.PI * 0.7, color: 'rgba(245,181,71,0.15)' },
      { start: Math.PI + Math.PI * 0.7, end: Math.PI * 2, color: 'rgba(93,217,212,0.15)' },
    ];
    zones.forEach(function(z) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, z.start, z.end);
      ctx.strokeStyle = z.color;
      ctx.lineWidth = strokeW;
      ctx.lineCap = 'round';
      ctx.stroke();
    });

    // Active arc
    var progress = Math.max(0, Math.min(1, score / 100));
    var endAngle = Math.PI + progress * Math.PI;
    var grad = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
    grad.addColorStop(0, DEPLETED_COLOR);
    grad.addColorStop(0.4, ELEVATED_COLOR);
    grad.addColorStop(1, RESOURCED_COLOR);
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, endAngle);
    ctx.strokeStyle = grad;
    ctx.lineWidth = strokeW;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Tick marks at 40 and 70
    [40, 70].forEach(function(tick) {
      var a = Math.PI + (tick / 100) * Math.PI;
      var x1 = cx + (r - strokeW) * Math.cos(a);
      var y1 = cy + (r - strokeW) * Math.sin(a);
      var x2 = cx + (r + strokeW * 0.4) * Math.cos(a);
      var y2 = cy + (r + strokeW * 0.4) * Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Score disc
    var discR = r * 0.45;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, discR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fill();
    ctx.restore();

    // Score number
    ctx.fillStyle = scoreToColor(score);
    ctx.font = '700 ' + Math.floor(r * 0.38) + 'px "DM Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(score), cx, cy);

    // State label
    var label = score < 40 ? 'DEPLETED' : score < 70 ? 'ELEVATED' : 'RESOURCED';
    ctx.fillStyle = scoreToColor(score);
    ctx.font = '400 11px "Space Mono", monospace';
    ctx.fillText(label, cx, cy + r * 0.28);
  }

  // Idle breathing for hero gauge
  var heroCanvas = document.getElementById('hero-gauge');
  if (heroCanvas) {
    var t = 0;
    var baseScore = 66;
    function breathe() {
      t += 0.02;
      var score = baseScore + Math.sin(t) * 1.5;
      drawGauge(heroCanvas, score);
      requestAnimationFrame(breathe);
    }
    breathe();
  }

  // Scroll-driven gauge for system status section
  var statusSection = document.getElementById('system-status');
  var statusCanvas = document.getElementById('status-gauge');
  var voices = {
    depleted: document.getElementById('voice-depleted'),
    elevated: document.getElementById('voice-elevated'),
    resourced: document.getElementById('voice-resourced'),
  };

  if (statusSection && statusCanvas) {
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      function updateScrollGauge() {
        var rect = statusSection.getBoundingClientRect();
        var sectionH = statusSection.offsetHeight;
        var scrolled = -rect.top;
        var progress = Math.max(0, Math.min(1, scrolled / (sectionH - window.innerHeight)));
        var score = 5 + progress * 95;
        drawGauge(statusCanvas, score);

        // Voice swap
        if (voices.depleted && voices.elevated && voices.resourced) {
          voices.depleted.style.opacity = score < 40 ? '1' : '0';
          voices.elevated.style.opacity = (score >= 40 && score < 70) ? '1' : '0';
          voices.resourced.style.opacity = score >= 70 ? '1' : '0';
        }
      }
      window.addEventListener('scroll', updateScrollGauge, { passive: true });
      updateScrollGauge();
    } else {
      drawGauge(statusCanvas, 80);
    }
  }

  // Expose for external use
  window.OrbitalGauge = { draw: drawGauge };
})();
