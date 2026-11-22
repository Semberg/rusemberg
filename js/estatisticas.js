// Estatísticas anônimas e sem cookies: contam visitas, quanto do livro foi visto
// e cliques de contato. Nenhum dado pessoal, endereço IP ou identificador
// persistente é gravado; o número da visita existe só enquanto a página está aberta.
(function () {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
  var URL_RPC = 'https://nbhgumvxbjaosdupxzph.supabase.co/rest/v1/rpc/registrar_evento_site';
  var CHAVE = 'sb_publishable_T2tLyvBffPszI9rSGF-FfA_kPJTzpGn';
  var visita = Math.random().toString(36).slice(2) + Date.now().toString(36);
  var w = window.innerWidth;
  var disp = w < 700 ? 'celular' : (w < 1100 ? 'tablet' : 'computador');
  var pagina = location.pathname.replace(/\/index\.html$/, '/') || '/';
  var origem = '';
  try { if (document.referrer) { var h = new URL(document.referrer).hostname.replace(/^www\./, ''); if (h !== location.hostname.replace(/^www\./, '')) origem = h; } } catch (e) {}
  var q = new URLSearchParams(location.search); if (q.get('utm_source')) origem = q.get('utm_source').slice(0, 60);

  function enviar(tipo, detalhe) {
    try {
      fetch(URL_RPC, {
        method: 'POST', keepalive: true,
        headers: { apikey: CHAVE, Authorization: 'Bearer ' + CHAVE, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_tipo: tipo, p_pagina: pagina, p_detalhe: detalhe || null, p_origem: origem || null, p_dispositivo: disp, p_visita: visita })
      }).catch(function () {});
    } catch (e) {}
  }
  window.rfEvento = enviar;
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
    else if (href.indexOf('tel:') === 0) enviar('telefone', onde);
    else if (href.indexOf('mailto:') === 0) enviar('email', onde);
  }, true);
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#situacoes [data-area]');
    if (b) enviar('situacao', b.textContent.trim().slice(0, 120));
  }, true);
})();
