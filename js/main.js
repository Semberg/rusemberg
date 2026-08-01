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

/* ---------- Reveal on scroll ---------- */
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
