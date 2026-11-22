// Biblioteca de e-books: estante, filtro por tema e download com cadastro
import { EBOOKS } from './ebooks-dados.js?v=20261122c';

const SUPABASE_URL = 'https://nbhgumvxbjaosdupxzph.supabase.co';
const SUPABASE_CHAVE = 'sb_publishable_T2tLyvBffPszI9rSGF-FfA_kPJTzpGn'; // chave pública: só permite chamar a função de registro
const reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- menu do celular ---------- */
const header = document.getElementById('siteHeader');
const toggle = document.getElementById('navToggle');
toggle?.addEventListener('click', () => {
  const aberto = header.classList.toggle('nav-open');
  toggle.classList.toggle('open', aberto); toggle.setAttribute('aria-expanded', String(aberto));
});

/* ---------- estante ---------- */
const estante = document.getElementById('ebEstante');
const filtros = document.getElementById('ebFiltros');
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function livroHTML(e, i) {
  // a espessura acompanha o número de páginas, sempre com aparência de livro encorpado
  const esp = Math.round(26 + Math.min(e.paginas, 14) * 1.6);
  return `
  <article class="eb-item" data-grupo="${esc(e.grupo)}" style="--i:${i}">
    <button type="button" class="eb-livro" data-id="${esc(e.id)}" style="--cor:${e.cor};--esp:${esp}px" aria-label="Baixar o e-book ${esc(e.nome)}">
      <span class="eb-3d">
        <span class="eb-capa"><img src="${esc(e.capa)}" alt="" loading="lazy" width="420" height="594"></span>
        <span class="eb-lombada"><i>${esc(e.nome)}</i></span>
        <span class="eb-folhas"></span>
        <span class="eb-verso"></span>
      </span>
      <span class="eb-sombra" aria-hidden="true"></span>
    </button>
    <p class="eb-grupo">${esc(e.grupo)} · ${e.paginas} páginas</p>
    <h3 class="eb-nome">${esc(e.nome)}</h3>
    ${e.descricao ? `<p class="eb-desc">${esc(e.descricao)}</p>` : ''}
    <button type="button" class="eb-baixar" data-id="${esc(e.id)}">Download <span aria-hidden="true">↓</span></button>
  </article>`;
}
estante.innerHTML = EBOOKS.map(livroHTML).join('');

const grupos = ['Todos', ...new Set(EBOOKS.map((e) => e.grupo))];
filtros.innerHTML = grupos.map((g, i) => `<button type="button" class="${i ? '' : 'is-on'}" data-grupo="${esc(g)}">${esc(g)}${i ? ` <small>${EBOOKS.filter((e) => e.grupo === g).length}</small>` : ''}</button>`).join('');
filtros.addEventListener('click', (ev) => {
  const b = ev.target.closest('button'); if (!b) return;
  filtros.querySelectorAll('button').forEach((x) => x.classList.toggle('is-on', x === b));
  const g = b.dataset.grupo; let n = 0;
  estante.querySelectorAll('.eb-item').forEach((it) => {
    const mostra = g === 'Todos' || it.dataset.grupo === g;
    it.hidden = !mostra; if (mostra) { it.style.setProperty('--i', n++); it.classList.remove('is-entrou'); void it.offsetWidth; it.classList.add('is-entrou'); }
  });
});

// entrada dos livros na estante conforme a rolagem
const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-entrou'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -40px 0px' });
estante.querySelectorAll('.eb-item').forEach((it) => io.observe(it));

// inclinação do livro ao passar o mouse
if (!reduz && window.matchMedia('(hover: hover)').matches) {
  estante.addEventListener('pointermove', (ev) => {
    const l = ev.target.closest('.eb-livro'); if (!l) return;
    const r = l.getBoundingClientRect();
    l.style.setProperty('--rx', `${(((ev.clientY - r.top) / r.height) - .5) * -8}deg`);
    l.style.setProperty('--ry', `${18 + (((ev.clientX - r.left) / r.width) - .5) * 16}deg`);
  });
  estante.addEventListener('pointerout', (ev) => { const l = ev.target.closest('.eb-livro'); if (l && !l.contains(ev.relatedTarget)) { l.style.removeProperty('--rx'); l.style.removeProperty('--ry'); } });
}

/* ---------- janela de download ---------- */
const modal = document.getElementById('ebModal');
const form = document.getElementById('ebForm');
const ok = document.getElementById('ebOk');
const erro = document.getElementById('ebErro');
const enviar = document.getElementById('ebEnviar');
const campoEmail = document.getElementById('ebEmail');
const campoNome = document.getElementById('ebNome');
let atual = null, ultimoFoco = null;

const salvo = (() => { try { return JSON.parse(localStorage.getItem('rf-ebooks') || '{}'); } catch { return {}; } })();

function abrir(id) {
  atual = EBOOKS.find((e) => e.id === id); if (!atual) return;
  ultimoFoco = document.activeElement;
  document.getElementById('ebModalTit').textContent = atual.nome;
  document.getElementById('ebModalLivro').innerHTML = `<img src="${esc(atual.capa)}" alt="">`;
  form.hidden = false; ok.hidden = true; erro.hidden = true;
  if (salvo.email) campoEmail.value = salvo.email;
  if (salvo.nome) campoNome.value = salvo.nome;
  if (salvo.perfil) { const r = form.querySelector(`input[name="perfil"][value="${salvo.perfil}"]`); if (r) r.checked = true; }
  modal.hidden = false; document.body.classList.add('eb-travado');
  requestAnimationFrame(() => modal.classList.add('is-aberto'));
  setTimeout(() => (campoEmail.value ? enviar : campoEmail).focus(), 60);
}
function fechar() {
  modal.classList.remove('is-aberto'); document.body.classList.remove('eb-travado');
  setTimeout(() => { modal.hidden = true; ultimoFoco?.focus?.(); }, reduz ? 0 : 280);
}
estante.addEventListener('click', (ev) => { const b = ev.target.closest('[data-id]'); if (b) abrir(b.dataset.id); });
modal.addEventListener('click', (ev) => { if (ev.target.closest('[data-fechar]')) fechar(); });
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !modal.hidden) fechar(); });
// vindo da página inicial com um livro escolhido
const pedido = new URLSearchParams(location.search).get('livro');
if (pedido && EBOOKS.some((e) => e.id === pedido)) setTimeout(() => abrir(pedido), 350);

function baixar(e) {
  const a = document.createElement('a');
  a.href = e.arquivo; a.download = e.arquivo.split('/').pop();
  document.body.appendChild(a); a.click(); a.remove();
  document.getElementById('ebLinkDireto').href = e.arquivo;
}

async function registrar(dados) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/registrar_download_ebook`, {
    method: 'POST',
    headers: { apikey: SUPABASE_CHAVE, Authorization: `Bearer ${SUPABASE_CHAVE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const email = campoEmail.value.trim();
  const perfil = form.querySelector('input[name="perfil"]:checked')?.value;
  const consent = document.getElementById('ebConsent').checked;
  let msg = '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) msg = 'Informe um e-mail válido.';
  else if (!perfil) msg = 'Indique quem está baixando o material.';
  else if (!consent) msg = 'Para baixar, é preciso autorizar o uso do e-mail conforme o texto acima.';
  if (msg) { erro.textContent = msg; erro.hidden = false; return; }
  erro.hidden = true; enviar.disabled = true; enviar.textContent = 'Preparando o download…';
  const dados = {
    p_email: email, p_perfil: perfil, p_ebook: atual.nome, p_consentimento: true,
    p_consentimento_texto: document.getElementById('ebConsentTexto').textContent.trim(),
    p_nome: campoNome.value.trim() || null, p_pagina: location.href.slice(0, 300), p_user_agent: navigator.userAgent.slice(0, 300),
  };
  try { await registrar(dados); }
  catch {
    // se a conexão falhar, tenta mais uma vez; o download não fica bloqueado
    try { await new Promise((r) => setTimeout(r, 800)); await registrar(dados); } catch { /* segue para o download */ }
  }
  try { localStorage.setItem('rf-ebooks', JSON.stringify({ email, nome: campoNome.value.trim(), perfil })); } catch { /* sem armazenamento */ }
  Object.assign(salvo, { email, nome: campoNome.value.trim(), perfil });
  baixar(atual);
  window.rfEvento?.('ebook_download', atual.nome);
  enviar.disabled = false; enviar.textContent = 'Baixar e-book';
  form.hidden = true; ok.hidden = false;
});
