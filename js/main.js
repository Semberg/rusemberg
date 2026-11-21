// ==========================================================
// Rusemberg Fernandes · Advogado
// ==========================================================

document.getElementById('year').textContent = new Date().getFullYear();
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Header: estado conforme a seção ---------- */
const header = document.getElementById('siteHeader');
const cena = document.querySelector('.cena');
function atualizaHeader() { /* cabeçalho estável: nenhuma mudança de estado na rolagem */ }

/* ---------- Menu móvel ---------- */
const navToggle = document.getElementById('navToggle');
navToggle.addEventListener('click', () => {
  const open = header.classList.toggle('nav-open');
  navToggle.classList.toggle('open', open);
  navToggle.setAttribute('aria-expanded', String(open));
});
header.addEventListener('click', (e) => {
  if (e.target.closest('.main-nav a, .header-actions a')) {
    header.classList.remove('nav-open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  }
});

/* ---------- Links para etapas dentro da abertura ---------- */
const alvosCena = { '#apresentacao': 0.2, '#areas-livro': 0.6, '#formacao': 0.7, '#topo': 0 };
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || !(a.getAttribute('href') in alvosCena) || !cena) return;
  const estatica = document.documentElement.classList.contains('cena-estatica');
  if (estatica && a.getAttribute('href') !== '#topo') return;
  e.preventDefault();
  const total = cena.offsetHeight - window.innerHeight;
  window.scrollTo({ top: cena.offsetTop + total * alvosCena[a.getAttribute('href')], behavior: reduceMotion ? 'auto' : 'smooth' });
});

/* ---------- Links para seções depois da abertura ----------
   A abertura ocupa uma rolagem muito longa. Com rolagem suave, ir do topo
   até "Sobre" atravessaria o livro inteiro (as folhas passando em alta
   velocidade) e quem olha no meio do caminho vê outra parte da página.
   Quando o trajeto cruza a abertura, o salto é direto ao destino. */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || !cena || e.defaultPrevented) return;
  const id = a.getAttribute('href');
  if (id.length < 2 || id in alvosCena) return;
  let alvo; try { alvo = document.querySelector(id); } catch { return; }
  if (!alvo || cena.contains(alvo)) return;
  const destino = alvo.getBoundingClientRect().top + window.scrollY;
  const iniCena = cena.offsetTop, fimCena = iniCena + cena.offsetHeight;
  const de = Math.min(window.scrollY, destino), ate = Math.max(window.scrollY, destino);
  if (de >= fimCena - window.innerHeight || ate <= iniCena) return; // não cruza a abertura
  e.preventDefault();
  window.scrollTo({ top: destino, behavior: 'instant' });
  if (history.pushState) history.pushState(null, '', id); else location.hash = id;
});

/* ---------- Manifesto: as palavras acendem com a rolagem ---------- */
const manifesto = document.getElementById('manifesto');
let palavras = [];
if (manifesto) {
  manifesto.innerHTML = manifesto.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
  palavras = [...manifesto.querySelectorAll('.w')];
  // destaca, em dourado, os valores ao final da declaração
  palavras.forEach((w) => { if (/^(ética|transparência|excelência|técnica\.?)[,.]?$/i.test(w.textContent)) w.classList.add('dest'); });
}
const palcoManif = document.getElementById('manifestoPalco');
function atualizaManifesto() {
  if (!palavras.length || reduceMotion) return;
  const r = manifesto.getBoundingClientRect(); const vh = window.innerHeight;
  // começa quando o texto entra pela parte de baixo e termina com ele no meio da tela,
  // para que a declaração inteira esteja acesa enquanto ainda está sendo lida
  const t = Math.min(1, Math.max(0, (vh * 0.92 - r.top) / (r.height * 0.6 + vh * 0.3)));
  const N = palavras.length, suave = 3.2; // cada palavra acende ao longo de ~3 palavras
  palavras.forEach((w, i) => {
    const k = Math.min(1, Math.max(0, t * (N + suave) - i) / suave);
    w.style.setProperty('--k', k.toFixed(3));
    w.classList.toggle('on', k > 0.98);
  });
  if (palcoManif) {
    palcoManif.style.setProperty('--t', t.toFixed(3));
    palcoManif.classList.toggle('is-ativo', t > 0.01);
    palcoManif.classList.toggle('is-completo', t > 0.995);
  }
}

/* ---------- Paralaxe das fotos ---------- */
const selo = document.querySelector('.sobre-selo');
const difFoto = document.getElementById('difFoto');
const whats = document.getElementById('whatsFloat');
function atualizaParalaxe() {
  if (reduceMotion) return;
  const vh = window.innerHeight;
  if (selo) {
    const r = selo.getBoundingClientRect();
    const k = Math.max(-1, Math.min(1, (r.top - vh / 2) / vh));
    const amp = window.innerWidth < 900 ? 12 : 30;
    selo.style.transform = `translateY(${(k * amp).toFixed(1)}px) rotate(${(k * -40).toFixed(1)}deg)`;
  }
  if (difFoto) {
    const r = difFoto.parentElement.parentElement.getBoundingClientRect();
    if (r.bottom > 0 && r.top < vh) {
      const k = (r.top + r.height / 2 - vh / 2) / vh;
      difFoto.style.transform = `translate3d(0, ${(k * -12).toFixed(2)}%, 0) scale(1.05)`;
    }
  }
}

let ticking = false;
function aoRolar() {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    atualizaHeader(); atualizaManifesto(); atualizaParalaxe();
    if (whats && cena) { const mostrar = cena.getBoundingClientRect().bottom < window.innerHeight * 1.02; whats.style.opacity = mostrar ? '1' : '0'; whats.style.pointerEvents = mostrar ? 'auto' : 'none'; }
  });
}
window.addEventListener('scroll', aoRolar, { passive: true });
window.addEventListener('resize', aoRolar);
aoRolar();

/* ---------- Entradas na rolagem ---------- */
document.querySelectorAll('.diff-grid, .sobre-values').forEach((g) => [...g.children].forEach((el, i) => el.style.setProperty('--d', `${i * .12}s`)));
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add('in-view'); io.unobserve(entry.target); }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
document.querySelectorAll('.reveal, .revela-img').forEach((el) => io.observe(el));

/* ---------- Títulos: as palavras sobem de dentro de uma máscara ---------- */
function dividirPalavras(el) {
  let i = 0;
  const visitar = (no) => {
    [...no.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((parte) => {
          if (!parte) return;
          if (/^\s+$/.test(parte)) { frag.appendChild(document.createTextNode(' ')); return; }
          const pal = document.createElement('span'); pal.className = 'pal';
          const dentro = document.createElement('span'); dentro.textContent = parte; dentro.style.setProperty('--i', i++);
          pal.appendChild(dentro); frag.appendChild(pal);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') visitar(n);
    });
  };
  visitar(el);
}
if (!reduceMotion) {
  document.querySelectorAll('.section-head h2, .sobre-content h2, .contato h2').forEach((h) => {
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    dividirPalavras(h); h.classList.add('h-anim'); io.observe(h);
  });
  // listas entram item a item
  document.querySelectorAll('.areas-lista, .contato-list, .publico-card ul, .sobre-bio').forEach((lista) => {
    lista.classList.add('escalonada');
    [...lista.children].forEach((el, i) => el.style.setProperty('--i', i));
    io.observe(lista);
  });
}

/* ---------- Áreas de atuação ---------- */
const areas = [...document.querySelectorAll('.area')];
const palcoImgs = [...document.querySelectorAll('#areasPalco img')];
const palcoNum = document.getElementById('palcoNum');
let areaAtiva = 0;
function ativarArea(i, alternar = false) {
  const mobile = window.innerWidth < 900;
  if (mobile && alternar && i === areaAtiva && areas[i].classList.contains('is-on')) {
    areas[i].classList.remove('is-on'); areas[i].querySelector('.area-btn').setAttribute('aria-expanded', 'false'); return;
  }
  const anterior = areaAtiva; areaAtiva = i;
  areas.forEach((a, k) => { a.classList.toggle('is-on', k === i); a.querySelector('.area-btn').setAttribute('aria-expanded', String(k === i)); });
  if (anterior !== i) {
    palcoImgs.forEach((im, k) => { im.classList.toggle('is-sai', k === anterior); im.classList.toggle('is-on', k === i); });
  }
  if (palcoNum) palcoNum.textContent = String(i + 1).padStart(2, '0');
}
areas.forEach((a, i) => {
  const btn = a.querySelector('.area-btn');
  btn.addEventListener('click', () => ativarArea(i, true));
  a.addEventListener('mouseenter', () => { if (window.matchMedia('(hover: hover)').matches && window.innerWidth >= 900) ativarArea(i); });
  btn.addEventListener('focus', () => { if (window.innerWidth >= 900) ativarArea(i); });
});
// o palco acompanha o cursor com leve inclinação
const palco = document.getElementById('areasPalco');
if (palco && !reduceMotion) {
  palco.addEventListener('pointermove', (e) => {
    const r = palco.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    const im = palco.querySelector('img.is-on');
    if (im) im.style.transform = `scale(1.06) translate(${(-x * 14).toFixed(1)}px, ${(-y * 14).toFixed(1)}px)`;
  });
  palco.addEventListener('pointerleave', () => { const im = palco.querySelector('img.is-on'); if (im) im.style.transform = ''; });
}

/* ---------- Notícias jurídicas (feed diário) ---------- */
const NEWS_API = 'https://rusemberg-news.digitec.workers.dev/';
const newsGrid = document.getElementById('newsGrid');
const newsSource = document.getElementById('newsSource');

const SOURCE_LABELS = {
  'https://res.stj.jus.br/hrestp-c-portalp/RSS.xml': { name: 'do STJ', full: 'Superior Tribunal de Justiça (STJ)', url: 'https://www.stj.jus.br' },
  'https://www.conjur.com.br/rss.xml': { name: 'do Conjur', full: 'Consultor Jurídico (Conjur)', url: 'https://www.conjur.com.br' },
};

function formatDate(iso) {
  try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return ''; }
}
function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return (tmp.textContent || tmp.innerText || '').trim();
}
function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function truncate(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

async function loadNews() {
  try {
    const res = await fetch(NEWS_API);
    if (!res.ok) throw new Error('Falha na resposta do feed');
    const data = await res.json();
    if (data.status !== 'ok' || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('Feed vazio ou indisponível');
    }
    newsGrid.innerHTML = '';
    let fonte = SOURCE_LABELS[data.source];
    if (!fonte) { try { const u = new URL(data.source); fonte = { name: u.hostname.replace(/^www\./, ''), url: u.origin }; } catch { fonte = { name: 'da fonte', url: '#' }; } }
    data.items.slice(0, 5).forEach((item, i) => {
      const card = document.createElement('article');
      card.className = 'news-card reveal' + (i === 0 ? ' is-destaque' : '');
      card.style.setProperty('--d', `${i * .08}s`);
      // muitas fontes repetem o título no resumo; nesse caso o resumo é omitido
      const norm = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
      let summary = stripHtml(item.description || item.content || '');
      if (!summary || norm(summary) === norm(item.title || '') || norm(summary).startsWith(norm(item.title || '')) && summary.length < (item.title || '').length + 40) summary = '';
      summary = summary ? truncate(summary, i === 0 ? 220 : 120) : '';
      const link = /^https?:\/\//.test(item.link || '') ? item.link : '#';
      card.innerHTML = `
        <span class="news-date">${formatDate(item.pubDate)}</span>
        <h3>${escapeHtml(item.title)}</h3>
        ${summary ? `<p>${escapeHtml(summary)}</p>` : ''}
        <a class="news-link" href="${escapeHtml(link)}" target="_blank" rel="noopener">Ler no site ${escapeHtml(fonte.name)}</a>
      `;
      newsGrid.appendChild(card);
      io.observe(card);
    });
    newsSource.innerHTML = `Fonte: <a href="${escapeHtml(fonte.url)}" target="_blank" rel="noopener">${escapeHtml(fonte.full || fonte.name)}</a>`;
  } catch (err) {
    console.error('Falha ao carregar notícias:', err);
    newsGrid.innerHTML = `
      <div class="news-error">
        Não foi possível carregar as notícias no momento.
        <br>Acompanhe as últimas publicações diretamente em
        <a href="https://www.stj.jus.br" target="_blank" rel="noopener">stj.jus.br</a>
        ou <a href="https://www.conjur.com.br" target="_blank" rel="noopener">conjur.com.br</a>.
      </div>
    `;
    newsSource.innerHTML = '';
  }
}
loadNews();
