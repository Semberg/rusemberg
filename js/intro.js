// Introdução: poeira dourada subindo devagar ao fundo (leve, também no celular).
(function () {
  var c = document.getElementById('introPoeira');
  if (!c || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var g = c.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0, pts = [], vis = true;
  function medir() {
    var r = c.getBoundingClientRect(); W = r.width; H = r.height;
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = W < 760 ? 55 : 110;
    pts = [];
    for (var i = 0; i < n; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, r: 0.8 + Math.random() * 2.1, v: 6 + Math.random() * 16, f: Math.random() * 6.28, a: 0.3 + Math.random() * 0.55 });
  }
  medir(); window.addEventListener('resize', medir);
  new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }).observe(c);
  var t0 = performance.now();
  function quadro(t) {
    requestAnimationFrame(quadro);
    if (!vis) { t0 = t; return; }
    var dt = Math.min(0.05, (t - t0) / 1000); t0 = t;
    g.clearRect(0, 0, W, H);
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      p.y -= p.v * dt; p.f += dt * 0.6;
      if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; }
      var x = p.x + Math.sin(p.f) * 6;
      g.beginPath(); g.arc(x, p.y, p.r, 0, 6.2832);
      g.fillStyle = 'rgba(184,140,43,' + p.a.toFixed(2) + ')'; g.fill();
    }
  }
  requestAnimationFrame(quadro);
})();
