// ==========================================================
// Rusemberg Fernandes — Advogado
// ==========================================================

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- Header scroll state ---------- */
const header = document.getElementById('siteHeader');
const onScroll = () => {
  header.classList.toggle('scrolled', window.scrollY > 30);
};
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

/* ---------- Mobile nav ---------- */
const navToggle = document.getElementById('navToggle');
navToggle.addEventListener('click', () => {
  const open = header.classList.toggle('nav-open');
  navToggle.classList.toggle('open', open);
  navToggle.setAttribute('aria-expanded', String(open));
});
document.getElementById('mainNav').addEventListener('click', (e) => {
  if (e.target.tagName === 'A') {
    header.classList.remove('nav-open');
    navToggle.classList.remove('open');
  }
});

/* ---------- Abertura em vídeo ---------- */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const heroVideo = document.getElementById('heroVideo');
const heroMedia = document.getElementById('heroMedia');
const saveData = navigator.connection && navigator.connection.saveData;

function startHeroVideo() {
  if (!heroVideo || reduceMotion.matches || saveData) return;
  const mobile = window.matchMedia('(max-width: 760px)').matches;
  heroVideo.src = mobile ? heroVideo.dataset.srcMobile : heroVideo.dataset.srcDesktop;
  heroVideo.muted = true;
  heroVideo.addEventListener('playing', () => heroVideo.classList.add('is-playing'), { once: true });
  // se o vídeo falhar, a imagem alternativa continua visível
  heroVideo.addEventListener('error', () => heroVideo.remove(), { once: true });
  const p = heroVideo.play();
  if (p && p.catch) p.catch(() => {});
}
if (document.readyState === 'complete') startHeroVideo();
else window.addEventListener('load', startHeroVideo, { once: true });

// pausa o vídeo fora da tela para poupar bateria
if (heroVideo && 'IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => {
    if (!heroVideo.src) return;
    if (e.isIntersecting) heroVideo.play().catch(() => {});
    else heroVideo.pause();
  }).observe(heroVideo);
}

/* ---------- Paralaxe discreta ---------- */
const parallaxEls = [
  { el: heroMedia, k: .25, hero: true },
  { el: document.querySelector('.sobre-badge'), k: -.06 },
];
let ticking = false;
function updateParallax() {
  ticking = false;
  const vh = window.innerHeight;
  parallaxEls.forEach(({ el, k, hero }) => {
    if (!el) return;
    const r = (hero ? el.parentElement : el).getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    const y = hero ? -r.top * k : (r.top + r.height / 2 - vh / 2) * k;
    el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
  });
}
if (!reduceMotion.matches) {
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(updateParallax); }
  }, { passive: true });
  updateParallax();
}

/* ---------- Reveal on scroll ---------- */
// entrada em sequência dos itens de cada grade
document.querySelectorAll('.cards-grid, .diff-grid').forEach((grid) => {
  [...grid.children].forEach((el, i) => el.style.setProperty('--d', `${(i % 3) * .12}s`));
});
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
revealEls.forEach((el) => io.observe(el));

/* ---------- Notícias jurídicas (feed diário) ---------- */
const NEWS_API = 'https://rusemberg-news.digitec.workers.dev/';
const newsGrid = document.getElementById('newsGrid');
const newsSource = document.getElementById('newsSource');

const SOURCE_LABELS = {
  'https://res.stj.jus.br/hrestp-c-portalp/RSS.xml': { name: 'STJ', url: 'https://www.stj.jus.br' },
  'https://www.conjur.com.br/rss.xml': { name: 'Consultor Jurídico (Conjur)', url: 'https://www.conjur.com.br' },
};

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return (tmp.textContent || tmp.innerText || '').trim();
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
    data.items.slice(0, 6).forEach((item) => {
      const card = document.createElement('article');
      card.className = 'news-card';
      const summary = truncate(stripHtml(item.description || item.content || ''), 130);
      card.innerHTML = `
        <span class="news-date">${formatDate(item.pubDate)}</span>
        <h3>${item.title}</h3>
        <p>${summary}</p>
        <a class="news-link" href="${item.link}" target="_blank" rel="noopener">Ler notícia</a>
      `;
      newsGrid.appendChild(card);
    });

    const src = SOURCE_LABELS[data.source] || SOURCE_LABELS['https://www.conjur.com.br/rss.xml'];
    newsSource.innerHTML = `Fonte: <a href="${src.url}" target="_blank" rel="noopener">${src.name}</a>`;
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
