// Estatísticas anônimas e sem cookies: contam visitas, quanto do livro foi visto
// e cliques de contato. Nenhum dado pessoal, endereço IP ou identificador
// persistente é gravado; o número da visita existe só enquanto a página está aberta.
(function () {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
  // aparelhos do próprio escritório (marcados ao entrar no painel) não contam como visitantes
  try { if (localStorage.getItem('rf-sem-estatistica') === '1') return; } catch (e) {}
  var visita = Math.random().toString(36).slice(2) + Date.now().toString(36);
  var w = window.innerWidth;
  var disp = w < 700 ? 'celular' : (w < 1100 ? 'tablet' : 'computador');
  var pagina = location.pathname.replace(/\/index\.html$/, '/') || '/';
  var origem = '';
  try { if (document.referrer) { var h = new URL(document.referrer).hostname.replace(/^www\./, ''); if (h !== location.hostname.replace(/^www\./, '')) origem = h; } } catch (e) {}
  var q = new URLSearchParams(location.search); if (q.get('utm_source')) origem = q.get('utm_source').slice(0, 60);

  // dados técnicos gerais do aparelho (nada que identifique a pessoa)
  var ua = navigator.userAgent || '';
  var navegador = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Instagram/.test(ua) ? 'Instagram (app)' : /FBAN|FBAV/.test(ua) ? 'Facebook (app)' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Outro';
  var sistema = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Outro';
  var extra = { p_navegador: navegador, p_sistema: sistema, p_idioma: (navigator.language || '').slice(0, 16), p_tela: screen.width + 'x' + screen.height };
  var inicio = Date.now();

  function enviar(tipo, detalhe, mais) {
    try {
      // passa pelo próprio site, que acrescenta cidade e estado aproximados (sem guardar o IP)
      fetch('/api/evento', {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(Object.assign({ p_tipo: tipo, p_pagina: pagina, p_detalhe: detalhe || null, p_origem: origem || null, p_dispositivo: disp, p_visita: visita }, tipo === 'visita' ? extra : {}, mais || {}))
      }).catch(function () {});
    } catch (e) {}
  }
  window.rfEvento = enviar;

  // tempo de permanência: enviado quando a pessoa sai ou troca de aba
  var saidaEnviada = 0;
  function saida() {
    var seg = Math.round((Date.now() - inicio) / 1000);
    if (seg < 2 || seg - saidaEnviada < 5) return;
    saidaEnviada = seg;
    var corpo = JSON.stringify({ p_tipo: 'saida', p_pagina: pagina, p_visita: visita, p_dispositivo: disp, p_duracao: seg });
    try { if (navigator.sendBeacon) navigator.sendBeacon('/api/evento', new Blob([corpo], { type: 'text/plain' })); else enviar('saida', null, { p_duracao: seg }); } catch (e) {}
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') saida(); });
  window.addEventListener('pagehide', saida);

  // seções lidas: cada seção conta uma vez por visita, quando metade dela aparece na tela
  if ('IntersectionObserver' in window) {
    var nomes = { sobre: 'Sobre', situacoes: 'Situações', areas: 'Áreas de atuação', ebooks: 'E-books', noticias: 'Notícias', diferenciais: 'Diferenciais', contato: 'Contato' };
    var vistas = {};
    var obs = new IntersectionObserver(function (itens) {
      itens.forEach(function (it) {
        var id = it.target.id;
        if (it.isIntersecting && !vistas[id]) { vistas[id] = 1; enviar('secao', nomes[id] || id); obs.unobserve(it.target); }
      });
    }, { threshold: 0.35 });
    Object.keys(nomes).forEach(function (id) { var el = document.getElementById(id); if (el) obs.observe(el); });
  }
  enviar(pagina.indexOf('ebooks') >= 0 ? 'ebooks_pagina' : 'visita');
  if (pagina.indexOf('ebooks') >= 0) enviar('visita');

  // quanto do livro de abertura foi percorrido
  var cena = document.querySelector('.cena');
  if (cena) {
    var feitos = {};
    window.addEventListener('livro:etapa', function (e) {
      var n = e.detail && e.detail.etapa;
      [[2, 'livro_25'], [4, 'livro_50'], [7, 'livro_fim']].forEach(function (m) { if (n >= m[0] && !feitos[m[1]]) { feitos[m[1]] = 1; enviar(m[1]); } });
    });
  }

  // cliques de contato, com a seção de onde partiram
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var href = a.getAttribute('href') || '';
    var sec = a.closest('section[id], header, footer'); var onde = sec ? (sec.id || sec.tagName.toLowerCase()) : '';
    if (href.indexOf('wa.me') >= 0) enviar('whatsapp', onde);
    else if (href.indexOf('instagram.com') >= 0) enviar('instagram', onde);
    else if (href.indexOf('tel:') === 0) enviar('telefone', onde);
    else if (href.indexOf('mailto:') === 0) enviar('email', onde);
  }, true);
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#situacoes [data-area]');
    if (b) enviar('situacao', b.textContent.trim().slice(0, 120));
  }, true);
})();
