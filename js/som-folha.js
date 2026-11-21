// ==========================================================
// Som da folha de papel, sintetizado em tempo real (Web Audio).
// Nenhum arquivo de áudio é baixado: cada virada gera um som
// ligeiramente diferente, como acontece com papel de verdade.
// Os navegadores só liberam áudio depois de um clique, toque ou
// tecla do visitante; até lá as folhas viram em silêncio.
// ==========================================================
const CHAVE = 'rf-som-folha';
let ctx = null, saida = null, ruido = null;
let ligado = true;
try { ligado = localStorage.getItem(CHAVE) !== 'off'; } catch { /* sem armazenamento */ }

function preparar() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  // compressor suave para que nenhuma virada soe áspera
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -22; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.2;
  saida = ctx.createGain(); saida.gain.value = 0.55;
  saida.connect(comp).connect(ctx.destination);
  // ruído rosado (mais "macio" que o branco), 3 s, reaproveitado
  const n = Math.floor(ctx.sampleRate * 3);
  ruido = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = ruido.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
  }
  return ctx;
}

// libera o áudio no primeiro gesto do visitante
function desbloquear(ev) {
  if (!ligado) return;
  // o clique no próprio botão de som é tratado por alternarSom()
  if (ev && ev.target && ev.target.closest && ev.target.closest('#cenaSom')) return;
  const c = preparar();
  if (c && c.state === 'suspended') c.resume().then(avisar).catch(() => {});
}
['pointerdown', 'keydown', 'touchend'].forEach((ev) => window.addEventListener(ev, desbloquear, { passive: true }));

const rnd = (a, b) => a + Math.random() * (b - a);

// fonte de ruído com filtro e envelope próprios
function camada(t0, dur, { tipo = 'bandpass', freq, freq2, q = 0.8, envelope }) {
  const src = ctx.createBufferSource(); src.buffer = ruido;
  const f = ctx.createBiquadFilter(); f.type = tipo; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t0);
  if (freq2) f.frequency.exponentialRampToValueAtTime(freq2, t0 + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t0);
  envelope.forEach(([t, v]) => g.gain.linearRampToValueAtTime(v, t0 + t * dur));
  g.gain.linearRampToValueAtTime(0, t0 + dur);
  src.connect(f).connect(g).connect(saida);
  src.start(t0, rnd(0, Math.max(0, 2.9 - dur)), dur + 0.05);
}

// pequenos estalos do papel quando a folha se solta do maço
function estalos(t0, janela, qtd) {
  for (let i = 0; i < qtd; i++) {
    const t = t0 + Math.pow(Math.random(), 1.6) * janela, d = rnd(0.012, 0.035);
    camada(t, d, { tipo: 'bandpass', freq: rnd(2600, 5200), q: rnd(1.2, 3), envelope: [[0.15, rnd(0.25, 0.55)], [0.5, 0.12]] });
  }
}

/**
 * Toca a virada de uma folha.
 * @param {number} dur duração da virada, em segundos (o som acompanha o movimento)
 * @param {number} dir 1 = avança, -1 = volta
 */
export function tocarVirada(dur = 2, dir = 1) {
  if (!ligado || !ctx || ctx.state !== 'running') return;
  const t0 = ctx.currentTime + 0.01;
  const v = rnd(0.85, 1.15); // cada folha soa um pouco diferente
  // 1. o canto se solta do maço: atrito leve e estalos
  camada(t0, dur * 0.22, { tipo: 'bandpass', freq: 3200 * v, freq2: 2200 * v, q: 0.9, envelope: [[0.3, 0.16], [0.8, 0.1]] });
  estalos(t0, dur * 0.25, Math.round(rnd(4, 7)));
  // 2. a folha atravessa o ar: um sopro que cresce e some
  camada(t0 + dur * 0.12, dur * 0.62, { tipo: 'bandpass', freq: 900 * v, freq2: 1900 * v, q: 0.55, envelope: [[0.25, 0.1], [0.55, 0.42], [0.8, 0.18]] });
  camada(t0 + dur * 0.2, dur * 0.5, { tipo: 'highpass', freq: 4200, q: 0.4, envelope: [[0.4, 0.06], [0.7, 0.1]] });
  // 3. a folha pousa sobre as outras: um toque abafado
  const tp = t0 + dur * 0.8;
  camada(tp, 0.16, { tipo: 'lowpass', freq: 700, freq2: 260, q: 0.7, envelope: [[0.08, 0.9], [0.35, 0.25]] });
  camada(tp + 0.01, 0.12, { tipo: 'bandpass', freq: 1800, q: 1, envelope: [[0.1, 0.2], [0.5, 0.05]] });
  if (dir < 0) estalos(tp - 0.05, 0.12, 2);
}

/**
 * Capa de couro abrindo (dir 1) ou fechando sozinha de volta (dir -1):
 * o couro range de leve na dobradiça, a capa corta o ar e encosta.
 */
export function tocarCapa(dur = 3, dir = 1) {
  if (!ligado || !ctx || ctx.state !== 'running') return;
  const t0 = ctx.currentTime + 0.01, v = rnd(0.9, 1.1);
  // 1. a capa se solta do miolo: atrito grave do couro
  camada(t0, dur * 0.3, { tipo: 'bandpass', freq: 520 * v, freq2: 380 * v, q: 1.1, envelope: [[0.2, 0.22], [0.7, 0.12]] });
  estalos(t0 + dur * 0.04, dur * 0.22, 3);
  // 2. a dobradiça range na pausa a meio caminho
  camada(t0 + dur * 0.36, dur * 0.18, { tipo: 'bandpass', freq: 260 * v, freq2: 340 * v, q: 4, envelope: [[0.3, 0.16], [0.7, 0.1]] });
  // 3. o sopro largo da capa terminando de abrir
  camada(t0 + dur * 0.45, dur * 0.45, { tipo: 'bandpass', freq: 600 * v, freq2: 1300 * v, q: 0.5, envelope: [[0.3, 0.12], [0.65, 0.3], [0.9, 0.1]] });
  // 4. encosta: um baque grave e macio
  const tp = t0 + dur * (dir > 0 ? 0.9 : 0.86);
  camada(tp, 0.28, { tipo: 'lowpass', freq: 380, freq2: 120, q: 0.8, envelope: [[0.06, 1], [0.3, 0.3]] });
  camada(tp + 0.01, 0.14, { tipo: 'bandpass', freq: 1100, q: 1, envelope: [[0.1, 0.18], [0.5, 0.04]] });
}

/**
 * Fechamento (dir 1): as folhas voltam juntas num folhear rápido, a capa
 * fecha com um baque e o livro pousa na mesa. Ao reabrir (dir -1), o inverso.
 */
export function tocarFechamento(dur = 5, dir = 1) {
  if (!ligado || !ctx || ctx.state !== 'running') return;
  const t0 = ctx.currentTime + 0.01;
  if (dir > 0) {
    // folhear: várias folhas passando em sequência
    for (let i = 0; i < 6; i++) {
      const t = t0 + dur * (0.03 + i * 0.045) + rnd(-0.03, 0.03), d = dur * 0.09, v = rnd(0.85, 1.2);
      camada(t, d, { tipo: 'bandpass', freq: 1500 * v, freq2: 2600 * v, q: 0.7, envelope: [[0.3, 0.22], [0.7, 0.1]] });
      estalos(t, d * 0.6, 1);
    }
    setTimeout(() => tocarCapa(dur * 0.36, 1), dur * 260); // coincide com o fechar da capa
    setTimeout(() => { // pousa na mesa
      if (!ctx || ctx.state !== 'running') return;
      const tp = ctx.currentTime + 0.01;
      camada(tp, 0.34, { tipo: 'lowpass', freq: 300, freq2: 90, q: 0.7, envelope: [[0.05, 0.8], [0.35, 0.2]] });
      camada(tp, 0.2, { tipo: 'bandpass', freq: 700, q: 1.2, envelope: [[0.08, 0.2], [0.5, 0.05]] });
    }, dur * 960);
  } else {
    tocarCapa(dur * 0.4, -1);
  }
}

// "tocando" = a preferência está ligada E o navegador já liberou o áudio.
// Antes do primeiro gesto do visitante a preferência pode estar ligada sem
// que nenhum som saia; o botão deve mostrar "Ativar som" nesse caso.
export function somLigado() { return ligado && !!ctx && ctx.state === 'running'; }

const ouvintes = new Set();
export function aoMudarSom(fn) { ouvintes.add(fn); }
function avisar() { ouvintes.forEach((fn) => { try { fn(somLigado()); } catch { /* ignora */ } }); }

function gravar() { try { localStorage.setItem(CHAVE, ligado ? 'on' : 'off'); } catch { /* sem armazenamento */ } }

// Um único clique no botão: se não está tocando, liga e libera o áudio na
// hora (o clique é o gesto que o navegador exige); se está tocando, desliga.
export async function alternarSom() {
  if (somLigado()) {
    ligado = false; gravar();
    if (ctx) await ctx.suspend().catch(() => {});
  } else {
    ligado = true; gravar();
    const c = preparar();
    if (c && c.state !== 'running') await c.resume().catch(() => {});
  }
  avisar();
  return somLigado();
}
