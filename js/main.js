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

/* ---------- Hero animado pela rolagem ---------- */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = (t) => 1 - Math.pow(1 - t, 3);
const easeIO = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const scrolly = document.querySelector('.scrolly');
const layerScale = document.getElementById('layerScale');
const layerPaper = document.getElementById('layerPaper');
const layerRings = document.getElementById('layerRings');
const layerBadge = document.getElementById('layerBadge');
const layerSign = document.getElementById('layerSign');
const beam = document.getElementById('beam');
const panL = document.getElementById('panL');
const panR = document.getElementById('panR');
const scaleDraws = layerScale.querySelectorAll('.draw');
const paperLines = layerPaper.querySelectorAll('.line');
const rings = layerRings.querySelectorAll('.ring');
const steps = document.querySelectorAll('.step');
const bigNums = document.querySelectorAll('.big-num');
const stepDots = document.querySelectorAll('#scrollyDots button');
const scrollCue = document.getElementById('scrollCue');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const sparks = [...document.querySelectorAll('#burst i')].map((el, i) => {
  const ang = (i / 28) * Math.PI * 2 + (i % 3) * .37;
  return { el, ang, near: 150 + (i * 37) % 60, far: 190 + (i * 53) % 170, size: .5 + ((i * 7) % 10) / 10, phase: i * 1.7 };
});

let activeStep = -1;
function setStep(i) {
  if (i === activeStep) return;
  activeStep = i;
  steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
  bigNums.forEach((n, k) => n.classList.toggle('is-active', k === i));
  stepDots.forEach((d, k) => d.classList.toggle('is-active', k === i));
}

const t0 = performance.now();
function render(p, t) {
  // Etapa 1 (0 a .25): a balança se desenha ao abrir a página e se equilibra com a rolagem
  const intro = seg(t - t0, 200, 2200);
  const s1 = Math.max(intro, seg(p, 0, .2));
  scaleDraws.forEach((el, i) => {
    const local = seg(s1, i * .06, .45 + i * .06);
    el.style.strokeDashoffset = 1 - ease(local);
  });
  const tilt = -13 * (1 - easeIO(seg(p, .08, .24)));
  const rad = tilt * Math.PI / 180;
  beam.setAttribute('transform', `rotate(${tilt} 200 110)`);
  const dx = 118 * (Math.cos(rad) - 1), dy = 118 * Math.sin(rad);
  panL.setAttribute('transform', `translate(${-dx} ${-dy})`);
  panR.setAttribute('transform', `translate(${dx} ${dy})`);
  const out1 = easeIO(seg(p, .25, .34));
  layerScale.style.opacity = 1 - out1;
  layerScale.style.transform = `translateY(${-60 * out1}px) scale(${1 - .15 * out1})`;

  // Etapa 2 (.28 a .55): o documento sobe, se escreve e recebe a assinatura
  const in2 = easeIO(seg(p, .28, .38));
  const out2 = easeIO(seg(p, .56, .66));
  layerPaper.style.opacity = in2 * (1 - out2);
  layerPaper.style.transform = `translateY(${80 * (1 - in2) + 50 * out2}px) rotate(${-4 * (1 - in2) + 3 * out2}deg) scale(${1 - .12 * out2})`;
  paperLines.forEach((el, i) => {
    el.style.strokeDashoffset = 1 - ease(seg(p, .36 + i * .018, .42 + i * .018));
  });
  const sign = easeIO(seg(p, .44, .54));
  layerSign.style.clipPath = `inset(0 ${100 - sign * 100}% 0 0)`;
  layerSign.style.opacity = sign > 0 ? 1 : 0;

  // Etapa 3 (.6 a .8): o selo se fecha em volta da assinatura
  rings.forEach((el, i) => {
    el.style.strokeDashoffset = 1 - easeIO(seg(p, .6 + i * .03, .72 + i * .03));
  });
  const badge = easeIO(seg(p, .68, .8));
  layerRings.style.opacity = 1 - seg(p, .78, .82);
  layerBadge.style.opacity = badge;
  layerBadge.style.transform = `rotate(${-50 * (1 - badge)}deg) scale(${.94 + .06 * badge})`;

  // Etapa 4 (.8 a 1): as partículas se espalham e o selo respira
  const s4 = ease(seg(p, .8, .95));
  const breathe = 1 + .04 * s4;
  layerSign.style.transform = `scale(${breathe})`;
  layerBadge.style.transform += ` scale(${breathe})`;
  const box = layerSign.getBoundingClientRect().width / 400 || 1;
  sparks.forEach((sp) => {
    const wob = Math.sin(t / 900 + sp.phase) * 6;
    const spread = window.innerWidth < 900 ? .45 : 1;
    const r = (sp.near + wob + (sp.far - sp.near + 40) * s4 * spread - 60 * (1 - s1)) * box;
    const x = Math.cos(sp.ang + s4 * .4) * r;
    const y = Math.sin(sp.ang + s4 * .4) * r * .9;
    const vis = clamp(s1 * 1.2) * (.35 + .65 * s4);
    sp.el.style.transform = `translate(${x}px, ${y}px) scale(${sp.size * (1 + s4)})`;
    sp.el.style.opacity = vis * (1 - .4 * seg(p, .97, 1));
  });

  setStep(p < .27 ? 0 : p < .57 ? 1 : p < .8 ? 2 : 3);
  scrollCue.style.opacity = 1 - seg(p, .02, .08);
}

function progress() {
  const r = scrolly.getBoundingClientRect();
  const total = scrolly.offsetHeight - window.innerHeight;
  return clamp(-r.top / (total || 1));
}

if (reduceMotion) {
  render(1, t0 + 5000);
  setStep(0);
} else {
  const loop = (t) => { render(progress(), t); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}

stepDots.forEach((d, k) => d.addEventListener('click', () => {
  const total = scrolly.offsetHeight - window.innerHeight;
  const target = [0.12, 0.47, 0.76, 0.95][k];
  window.scrollTo({ top: scrolly.offsetTop + total * target, behavior: 'smooth' });
}));

/* ---------- Paralaxe dos numerais das seções ---------- */
const ghosts = document.querySelectorAll('.ghost-num');
function parallax() {
  const vh = window.innerHeight;
  ghosts.forEach((g) => {
    const r = g.parentElement.getBoundingClientRect();
    const k = (r.top + r.height / 2 - vh / 2) / vh;
    g.style.transform = `translateY(${k * 60}px)`;
  });
}
if (!reduceMotion) {
  window.addEventListener('scroll', parallax, { passive: true });
  parallax();
}

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
