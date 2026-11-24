// ==========================================================
// Cena de abertura: pasta de couro com a marca, que se abre,
// revela as camadas do trabalho e pousa na mesa do escritório.
// Toda a narrativa é conduzida pela rolagem (0 → 1).
// Materiais: texturas fotográficas CC0 (ambientCG) e modelos
// escaneados CC0 (Poly Haven). Créditos em assets/CREDITOS.md
// ==========================================================
import * as THREE from 'three';
import { RoomEnvironment } from '../assets/vendor/three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from '../assets/vendor/three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from '../assets/vendor/three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from '../assets/vendor/three/addons/meshopt_decoder.module.js';
import { tocarVirada, tocarCapa, tocarFechamento, tocarAssinatura, alternarSom, somLigado, aoMudarSom } from './som-folha.js?v=20261122c';

const cena = document.querySelector('.cena');
const sticky = document.getElementById('cenaSticky');
const canvas = document.getElementById('cenaCanvas');
const poster = document.getElementById('cenaPoster');
const ambiente = document.getElementById('cenaAmbiente');
const barra = document.getElementById('cenaBarra');
const caps = [...document.querySelectorAll('.cap')];
const passos = [...document.querySelectorAll('.passo')];
const marcas = [...document.querySelectorAll('.cena-abas [data-etapa]')];
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglOk() {
  try {
    const c = document.createElement('canvas'); const g = c.getContext('webgl2') || c.getContext('webgl');
    if (g) g.getExtension('WEBGL_lose_context')?.loseContext(); // libera o contexto de teste
    return !!g;
  }
  catch { return false; }
}
if (reduce || !webglOk()) {
  document.documentElement.classList.add('cena-estatica');
} else {
  iniciar().catch((e) => { console.error(e); document.documentElement.classList.add('cena-estatica'); });
}

// ---------- utilidades ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const eio = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const eo = (t) => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

async function iniciar() {
  const mobile = () => window.innerWidth < 760;

  // ---------- renderizador ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile(), alpha: true, powerPreference: 'high-performance' });
  // se a placa de vídeo perder o contexto, mostra a versão estática em vez de uma tela parada
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); document.documentElement.classList.add('cena-estatica'); window.scrollTo(0, 0); }, { once: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile() ? 1.4 : 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 20);

  // ---------- luzes ----------
  const key = new THREE.SpotLight(0xfff1d6, 26, 6, Math.PI / 7, 0.55, 1.6);
  key.position.set(-0.9, 1.4, 1.5);
  key.castShadow = true;
  key.shadow.mapSize.set(mobile() ? 768 : 2048, mobile() ? 768 : 2048);
  key.shadow.bias = -0.0004;
  key.shadow.radius = 6;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xc9d6ff, 1.1);
  rim.position.set(1.4, 0.6, -1.2);
  scene.add(rim);
  const warm = new THREE.PointLight(0xffc27a, 0, 3, 1.5);
  warm.position.set(0.45, 0.55, 0.25);
  scene.add(warm);
  scene.add(new THREE.HemisphereLight(0xe8e2d6, 0x1a1715, 0.25));

  // ---------- texturas ----------
  const tl = new THREE.TextureLoader();
  const tex = (url, srgb = false, rep = 1) => new Promise((res) => tl.load(url, (t) => {
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    res(t);
  }, undefined, () => res(null)));

  const fontes = Promise.all([
    new FontFace('CormorantCena', 'url(assets/fonts/cormorant-garamond-latin-500-normal.woff2)').load(),
    new FontFace('BarlowCena', 'url(assets/fonts/barlow-latin-500-normal.woff2)').load(),
  ]).then((fs) => fs.forEach((f) => document.fonts.add(f))).catch(() => {});

  const [couroCor, couroNor, couroRug, papelCor, papelNor, forroCor, madeiraCor, madeiraNor, madeiraRug, emblema] = await Promise.all([
    tex('assets/3d/couro_cor.jpg', true, 1.6), tex('assets/3d/couro_normal.jpg', false, 1.6), tex('assets/3d/couro_rug.jpg', false, 1.6),
    tex('assets/3d/papel_cor.jpg', true), tex('assets/3d/papel_normal.jpg', false, 1.2),
    tex('assets/3d/forro_cor.jpg', true, 1.4),
    tex('assets/3d/madeira_cor.jpg', true, 2.2), tex('assets/3d/madeira_normal.jpg', false, 2.2), tex('assets/3d/madeira_rug.jpg', false, 2.2),
    tex('assets/3d/emblema_mascara.png'),
  ]);
  if (emblema) { emblema.wrapS = emblema.wrapT = THREE.ClampToEdgeWrapping; emblema.repeat.set(1, 1); }
  await fontes;

  // ---------- materiais ----------
  const couro = new THREE.MeshPhysicalMaterial({
    color: 0x46484d, map: couroCor, normalMap: couroNor, normalScale: new THREE.Vector2(1.5, 1.5),
    roughnessMap: couroRug, roughness: 0.78, sheen: 0.6, sheenRoughness: 0.55, sheenColor: new THREE.Color(0x8d8a86),
    clearcoat: 0.12, clearcoatRoughness: 0.6,
  });
  const ouro = new THREE.MeshPhysicalMaterial({
    color: 0xd7b25e, metalness: 1, roughness: 0.26, alphaMap: emblema, transparent: true, alphaTest: 0.35,
    envMapIntensity: 1.4,
  });
  const uReflexo = { value: -1 };
  ouro.onBeforeCompile = (sh) => {
    sh.uniforms.uReflexo = uReflexo;
    sh.fragmentShader = 'uniform float uReflexo;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
       float faixa = smoothstep(0.14, 0.0, abs((vAlphaMapUv.x + (1.0 - vAlphaMapUv.y)) * 0.5 - uReflexo));
       totalEmissiveRadiance += vec3(1.0, 0.84, 0.52) * faixa * 1.6;`);
  };
  const forro = new THREE.MeshStandardMaterial({ color: 0xcfc6b4, map: forroCor, roughness: 0.95 }); // forro em bege, mais discreto
  const costura = new THREE.MeshStandardMaterial({ color: 0xb7934a, roughness: 0.5, metalness: 0.3 });

  // ---------- a pasta ----------
  const W = 0.27, H = 0.35, T = 0.007;
  const pasta = new THREE.Group();
  scene.add(pasta);

  const fundo = new THREE.Mesh(new RoundedBoxGeometry(W, H, T, 4, 0.004), couro);
  fundo.castShadow = fundo.receiveShadow = true;
  pasta.add(fundo);
  const forroFundo = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.018, H - 0.018), forro);
  forroFundo.position.z = T / 2 + 0.0004; forroFundo.receiveShadow = true;
  pasta.add(forroFundo);

  const lombada = new THREE.Mesh(new RoundedBoxGeometry(0.014, H, 0.03, 4, 0.006), couro);
  lombada.position.set(-W / 2 + 0.002, 0, 0.011); lombada.castShadow = true;
  pasta.add(lombada);

  // foto do advogado, presa com um clipe na página de apresentação
  const fotoAdv = await new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = 'assets/img/rusemberg-retrato-sm.webp'; });
  // rubrica (o emblema) convertida em máscara dourada para ser "escrita" na página
  const rubrica = (() => {
    if (!emblema || !emblema.image) return null;
    const n = 320, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d');
    g.drawImage(emblema.image, 0, 0, n, n);
    const d = g.getImageData(0, 0, n, n), a = d.data;
    for (let i = 0; i < a.length; i += 4) { const l = a[i + 1]; a[i] = 184; a[i + 1] = 145; a[i + 2] = 63; a[i + 3] = l; }
    g.putImageData(d, 0, 0); return c;
  })();
  const ASS = { x: 600, y: 975, w: 190, h: 190 }; // posição da rubrica na folha (pixels da textura)

  // folhas
  const paginas = [];
  const matVerso = new THREE.MeshStandardMaterial({ color: 0xdcd7ce, map: papelCor, roughness: 0.95, side: THREE.BackSide });
  const pagW = W - 0.028, pagH = H - 0.03;
  const HcPag = Math.round(1024 * pagH / pagW);
  const conteudos = ['apresentacao', 'analise', 'estrategia', 'orientacao', 'areas', 'formacao'];
  const NC = conteudos.length;
  const NFOLHAS = NC + 2;
  const SX = 44, SY = 10; // malha fina para a folha dobrar e torcer de verdade
  for (let i = 0; i < NFOLHAS; i++) {
    const especial = i >= NFOLHAS - NC; // as de cima carregam conteúdo
    const idx = especial ? NFOLHAS - 1 - i : -1; // 0 = topo
    const map = especial ? desenharFolha(conteudos[idx], papelCor) : papelCor;
    const mat = new THREE.MeshStandardMaterial({ color: 0xe2ded6, map, normalMap: papelNor, normalScale: new THREE.Vector2(0.35, 0.35), roughness: 0.92, side: THREE.FrontSide });
    const geo = new THREE.PlaneGeometry(pagW, pagH, SX, SY);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true; m.receiveShadow = true;
    const verso = new THREE.Mesh(geo, matVerso); verso.receiveShadow = true; m.add(verso);
    m.userData.base = geo.attributes.position.array.slice();
    m.userData.z = T / 2 + 0.0012 + i * 0.0011;
    m.userData.idx = idx;
    // pivô na lombada: a folha vira como num livro
    const piv = new THREE.Group();
    piv.position.set(-pagW / 2 + 0.006, -0.002, m.userData.z);
    m.position.x = pagW / 2;
    piv.add(m); pasta.add(piv);
    m.userData.piv = piv;
    if (especial) {
      const tinta = desenharTinta(conteudos[idx]);
      if (tinta) {
        const mt = new THREE.MeshBasicMaterial({ map: tinta.cor, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, color: 0xd9d2c4 });
        const uP = { value: 0 };
        mt.onBeforeCompile = (sh) => {
          sh.uniforms.uP = uP; sh.uniforms.uOrdem = { value: tinta.ordem };
          sh.fragmentShader = 'uniform float uP; uniform sampler2D uOrdem;\n' + sh.fragmentShader.replace('#include <map_fragment>',
            `#include <map_fragment>
             float ordemV = texture2D(uOrdem, vMapUv).r;
             diffuseColor.a *= smoothstep(ordemV - 0.004, ordemV + 0.004, uP * 1.004);`);
        };
        const ov = new THREE.Mesh(geo, mt); ov.renderOrder = 2; m.add(ov);
        m.userData.uP = uP;
      }
    }
    paginas.push(m);
  }
  const folhasConteudo = conteudos.map((_, k) => paginas.find((m) => m.userData.idx === k));

  // capa (gira na dobradiça)
  const dobradica = new THREE.Group();
  dobradica.position.set(-W / 2 + 0.004, 0, 0.022);
  pasta.add(dobradica);
  const capa = new THREE.Mesh(new RoundedBoxGeometry(W, H, T, 4, 0.004), couro);
  capa.position.x = W / 2 - 0.004; capa.castShadow = capa.receiveShadow = true;
  dobradica.add(capa);
  const forroCapa = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.018, H - 0.018), forro);
  forroCapa.rotation.y = Math.PI; forroCapa.position.set(W / 2 - 0.004, 0, -T / 2 - 0.0004);
  dobradica.add(forroCapa);
  const emb = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), ouro);
  emb.position.set(W / 2 - 0.004, 0.035, T / 2 + 0.0006);
  dobradica.add(emb);
  // filete dourado em baixo-relevo
  const filete = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.0016), costura);
  filete.position.set(W / 2 - 0.004, -0.075, T / 2 + 0.0006);
  dobradica.add(filete);
  const assin = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.02), new THREE.MeshPhysicalMaterial({
    color: 0xd7b25e, metalness: 1, roughness: 0.3, transparent: true, alphaTest: 0.3,
    alphaMap: textoTex('RUSEMBERG FERNANDES', 'ADVOGADO'),
  }));
  assin.position.set(W / 2 - 0.004, -0.1, T / 2 + 0.0006);
  dobradica.add(assin);

  // ---------- selo de cera sobre a borda da capa: rompe-se ao abrir ----------
  // selo de cera em ouro, com o selo circular da marca prensado no topo,
  // sobre uma fita que envolve o livro: a fita e o selo mantêm o livro fechado
  const relevo = await tex('assets/3d/selo_relevo.png');
  if (relevo) { relevo.wrapS = relevo.wrapT = THREE.ClampToEdgeWrapping; relevo.repeat.set(1, 1); }
  const selo = new THREE.Group();
  const cera = new THREE.MeshPhysicalMaterial({ color: 0xd9a93c, metalness: 0.9, roughness: 0.3, clearcoat: 0.45, clearcoatRoughness: 0.25, envMapIntensity: 1.5, transparent: true });
  const ouroSelo = cera.clone(); // topo prensado: relevo da marca e um leve brilho nos traços em alto-relevo
  ouroSelo.bumpMap = relevo; ouroSelo.bumpScale = 3.2; ouroSelo.emissiveMap = relevo; ouroSelo.emissive = new THREE.Color(0x4a3208); ouroSelo.emissiveIntensity = 0.55;
  const RS = 0.021, HS = 0.0042, YS = -0.057;
  // contorno irregular, como cera derramada e prensada
  const raio = (a) => RS * (1 + 0.045 * Math.sin(5 * a + 1.3) + 0.03 * Math.sin(11 * a + 0.4) + 0.018 * Math.sin(19 * a + 2.1));
  const corpoCera = (a0, ang) => {
    const sh = new THREE.Shape(), N = Math.round(64 * ang / (2 * Math.PI));
    for (let i = 0; i <= N; i++) { const a = a0 + ang * i / N, r = raio(a); const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) sh.lineTo(x, y); else sh.moveTo(x, y); }
    if (ang < 6) sh.lineTo(0, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: HS * 0.4, bevelEnabled: true, bevelThickness: HS * 0.3, bevelSize: RS * 0.09, bevelSegments: 5, curveSegments: 8 });
    g.translate(0, 0, -HS * 0.2); return g;
  };
  const RT = RS * 0.8; // área prensada pelo sinete
  const topo = (t0, ang) => new THREE.CircleGeometry(RT, 64, t0, ang);
  // selo inteiro (antes de romper)
  const inteiro = new THREE.Group();
  { const c = new THREE.Mesh(corpoCera(0, Math.PI * 2), cera); c.castShadow = true; inteiro.add(c);
    const tp = new THREE.Mesh(topo(0, Math.PI * 2), ouroSelo); tp.position.z = HS / 2 + 0.00012; inteiro.add(tp);
    const anel = new THREE.Mesh(new THREE.TorusGeometry(RT * 1.02, 0.0006, 10, 72), cera); anel.position.z = HS / 2 + 0.0001; inteiro.add(anel); }
  selo.add(inteiro);
  // metades (aparecem quando o selo racha)
  const metades = [0, 1].map((lado) => {
    const g = new THREE.Group(); g.visible = false;
    const a0 = lado ? Math.PI / 2 : -Math.PI / 2;
    const c = new THREE.Mesh(corpoCera(a0, Math.PI), cera); c.castShadow = true; g.add(c);
    const tp = new THREE.Mesh(topo(a0, Math.PI), ouroSelo); tp.position.z = HS / 2 + 0.00012; g.add(tp);
    const anel = new THREE.Mesh(new THREE.TorusGeometry(RT * 1.02, 0.0006, 10, 36, Math.PI), cera);
    anel.rotation.z = a0; anel.position.z = HS / 2 + 0.0001; g.add(anel);
    selo.add(g); return g;
  });
  selo.position.set(W / 2 - 0.006, YS, 0.022 + T / 2 + HS / 2 + 0.0004);
  pasta.add(selo);
  // fita acetinada que passa pela capa, contorna a borda e segue pelo verso
  const fitaMat = new THREE.MeshPhysicalMaterial({ color: 0x8f6f28, metalness: 0.55, roughness: 0.38, sheen: 0.6, sheenColor: new THREE.Color(0xd9b866), sheenRoughness: 0.35, transparent: true, side: THREE.DoubleSide });
  const LF = 0.0062;
  const fitaFrente = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.003, LF), fitaMat);
  fitaFrente.position.set(W / 2 - 0.004, YS, T / 2 + 0.0004); dobradica.add(fitaFrente);
  const fitaBorda = new THREE.Mesh(new THREE.PlaneGeometry(0.022 + T + 0.002, LF), fitaMat);
  fitaBorda.rotation.y = Math.PI / 2; fitaBorda.position.set(W / 2 + 0.0006, YS, 0.011); pasta.add(fitaBorda);
  const fitaVerso = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.003, LF), fitaMat);
  fitaVerso.rotation.y = Math.PI; fitaVerso.position.set(0, YS, -T / 2 - 0.0004); pasta.add(fitaVerso);
  const fitas = [fitaFrente, fitaBorda, fitaVerso];

  // ---------- a mesa (capítulo 3) ----------
  const mesaAlpha = mascaraRadial();
  const mesa = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshStandardMaterial({
    map: madeiraCor, normalMap: madeiraNor, roughnessMap: madeiraRug, roughness: 0.7, color: 0x9a8a7c,
    alphaMap: mesaAlpha, transparent: true, depthWrite: false,
  }));
  mesa.rotation.x = -Math.PI / 2;
  mesa.position.set(0, -0.2, 0);
  mesa.receiveShadow = true;
  scene.add(mesa);
  const sombraMesa = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.ShadowMaterial({ opacity: 0.45 }));
  sombraMesa.rotation.x = -Math.PI / 2; sombraMesa.position.set(0, -0.1995, 0); sombraMesa.receiveShadow = true;
  scene.add(sombraMesa);

  const canetaPag = { grupo: new THREE.Group(), pronta: false, comprimento: 0.2 };
  canetaPag.grupo.visible = false;
  const acessorios = new THREE.Group();
  scene.add(acessorios);
  const gl = new GLTFLoader(); gl.setMeshoptDecoder(MeshoptDecoder);
  const carregarModelo = (url) => new Promise((res) => gl.load(url, (g) => res(g.scene), undefined, () => res(null)));
  // modelos só depois da primeira imagem, para a abertura aparecer rápido
  const modelosProntos = new Promise((r) => setTimeout(r, 400)).then(() => Promise.all([
    carregarModelo('assets/3d/livros.glb'), carregarModelo('assets/3d/caneta.glb'),
  ])).then(([livros, caneta]) => {
    if (livros) {
      livros.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
      const box = new THREE.Box3().setFromObject(livros); const s = 0.27 / (box.max.y - box.min.y);
      livros.scale.setScalar(s);
      const b2 = new THREE.Box3().setFromObject(livros);
      livros.position.set(-0.40 - (b2.min.x + b2.max.x) / 2, -0.2 - b2.min.y, -0.42 - (b2.min.z + b2.max.z) / 2);
      livros.rotation.y = 0.42;
      acessorios.add(livros);
    }
    if (caneta) {
      caneta.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
      const box = new THREE.Box3().setFromObject(caneta); const s = 0.2 / (box.max.x - box.min.x);
      caneta.scale.setScalar(s);
      const b2 = new THREE.Box3().setFromObject(caneta);
      const g = new THREE.Group(); caneta.position.set(-(b2.min.x + b2.max.x) / 2, -(b2.min.y + b2.max.y) / 2, -(b2.min.z + b2.max.z) / 2);
      g.add(caneta); g.rotation.set(-Math.PI / 2, 0, 0.95); g.position.set(0.25, -0.19, 0.04);
      acessorios.add(g);
      // segunda caneta, apoiada na folha de apresentação para escrever a rubrica
      const c2 = caneta.clone(true);
      c2.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.castShadow = true; } });
      const b3 = new THREE.Box3().setFromObject(c2);
      canetaPag.comprimento = b3.max.x - b3.min.x;
      // a ponta fica na origem do grupo; o corpo sobe inclinado para fora da folha
      const inner = new THREE.Group(); inner.add(c2); inner.scale.setScalar(0.72);
      const PONTA = window.__pontaCaneta ?? 1; // lado do eixo x onde está a ponta
      c2.position.x += -PONTA * canetaPag.comprimento / 2 + c2.position.x * 0; // desloca a ponta para a origem
      const eixo = new THREE.Vector3(-PONTA, 0, 0), dirCorpo = new THREE.Vector3(0.55, 0.5, 0.67).normalize();
      inner.quaternion.setFromUnitVectors(eixo, dirCorpo);
      canetaPag.grupo.add(inner); canetaPag.pronta = true;
    }
  });

  // brilho quente que escapa do interior quando a capa se abre
  const brilho = new THREE.PointLight(0xffc98a, 0, 0.9, 1.6);
  brilho.position.set(0.02, 0.02, 0.014); pasta.add(brilho); // dentro do livro: ilumina as folhas, não a capa por fora
  const gc = document.createElement('canvas'); gc.width = gc.height = 128; const gg = gc.getContext('2d');
  const gr = gg.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,214,150,.9)'); gr.addColorStop(.4, 'rgba(255,190,110,.25)'); gr.addColorStop(1, 'rgba(255,190,110,0)');
  gg.fillStyle = gr; gg.fillRect(0, 0, 128, 128);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  // fica entre as folhas e a capa: com a capa fechada, o brilho não atravessa o couro
  halo.scale.set(0.55, 0.55, 1); halo.position.set(-0.02, 0.0, 0.016); pasta.add(halo);

  // sombra de contato sob a pasta (fases iniciais)
  const sc = document.createElement('canvas'); sc.width = sc.height = 128; const sg = sc.getContext('2d');
  const rg = sg.createRadialGradient(64, 64, 4, 64, 64, 62); rg.addColorStop(0, 'rgba(40,32,20,.42)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  sg.fillStyle = rg; sg.fillRect(0, 0, 128, 128);
  const sombraPasta = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.16), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  sombraPasta.rotation.x = -Math.PI / 2; sombraPasta.position.set(0, -0.235, 0);
  scene.add(sombraPasta);

  // ---------- poeira dourada em suspensão ----------
  const NP = mobile() ? 90 : 240;
  const pg = new THREE.BufferGeometry();
  const pp = new Float32Array(NP * 3), ps = new Float32Array(NP);
  for (let i = 0; i < NP; i++) { pp[i * 3] = (Math.random() - .5) * 1.6; pp[i * 3 + 1] = (Math.random() - .5) * 1.0; pp[i * 3 + 2] = (Math.random() - .5) * 1.0; ps[i] = Math.random(); }
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  pg.setAttribute('seed', new THREE.BufferAttribute(ps, 1));
  const poeira = NP === 0 ? null : new THREE.Points(pg, new THREE.ShaderMaterial({
    // fundo claro: mistura normal (a soma de luz sumiria no branco) e dourado mais profundo
    transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    uniforms: { uT: { value: 0 }, uA: { value: 1 }, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float seed; uniform float uT; uniform float uPx; varying float vA;
      void main(){ vec3 p=position; p.y+=mod(uT*0.012+seed*1.0,1.0)-0.5; p.x+=sin(uT*0.3+seed*20.)*0.02;
      vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=(2.2+seed*3.2)*uPx*(1.2/-mv.z); vA=0.42+0.58*seed; }`,
    fragmentShader: `uniform float uA; varying float vA; void main(){ float d=length(gl_PointCoord-.5); if(d>.5) discard;
      gl_FragColor=vec4(.72,.55,.17, (1.-d*2.)*vA*uA); }`,
  }));
  if (NP) scene.add(poeira);

  // ---------- desenho das folhas (sem dados reais: só estrutura gráfica) ----------
  function desenharFolha(tipo, base) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * pagH / pagW);
    const g = c.getContext('2d');
    if (base && base.image) { g.drawImage(base.image, 0, 0, c.width, c.height); } else { g.fillStyle = '#f6f3ec'; g.fillRect(0, 0, c.width, c.height); }
    g.fillStyle = 'rgba(255,253,248,.55)'; g.fillRect(0, 0, c.width, c.height);
    const ink = 'rgba(34,36,40,'; const goldC = '#b8913f';
    const M = 92;
    // timbre
    g.fillStyle = ink + '.85)'; g.font = '500 22px BarlowCena, sans-serif'; g.letterSpacing = '6px';
    g.fillText('RUSEMBERG FERNANDES', M, 96);
    g.fillStyle = goldC; g.fillText('ADVOGADO', M, 128);
    g.fillStyle = goldC; g.fillRect(M, 152, c.width - M * 2, 2);
    g.letterSpacing = '0px';
    const titulo = { apresentacao: 'Apresentação', analise: 'Análise', estrategia: 'Estratégia', orientacao: 'Orientação', areas: 'Áreas de atuação', formacao: 'Formação' }[tipo] || '';
    g.fillStyle = ink + '.92)'; g.font = '500 92px CormorantCena, serif'; g.fillText(titulo, M, 262);
    const linha = (y, w, a = .16) => { g.fillStyle = ink + a + ')'; g.fillRect(M, y, w, 9); };
    if (tipo === 'analise') {
      let y = 330;
      for (let i = 0; i < 15; i++) {
        const w = (c.width - M * 2) * (i % 4 === 3 ? .55 : .82 + ((i * 37) % 17) / 100);
        linha(y, Math.min(w, c.width - M * 2));
        y += 44;
        if (i === 6) y += 26;
      }
      linha(1080, 260, .3); linha(1110, 180, .18);
    } else if (tipo === 'estrategia') {
      const nos = [[200, 430], [430, 430], [660, 330], [660, 540], [880, 330], [880, 540], [520, 760], [800, 760]];
      g.strokeStyle = ink + '.35)'; g.lineWidth = 4;
      const lig = [[0, 1], [1, 2], [1, 3], [2, 4], [3, 5], [1, 6], [6, 7]];
      lig.forEach(([a, b]) => { g.beginPath(); g.moveTo(...nos[a]); g.bezierCurveTo(nos[a][0] + 80, nos[a][1], nos[b][0] - 80, nos[b][1], ...nos[b]); g.stroke(); });
      nos.forEach(([x, y], i) => {
        g.beginPath(); g.arc(x, y, i === 4 ? 26 : 18, 0, Math.PI * 2);
        g.fillStyle = '#fbf8f1'; g.fill(); g.lineWidth = 4; g.strokeStyle = ink + '.45)'; g.stroke();
      });
      let y = 900; for (let i = 0; i < 5; i++) { linha(y, (c.width - M * 2) * (.6 + (i % 3) * .12)); y += 44; }
    } else if (tipo === 'apresentacao') {
      g.strokeStyle = 'rgba(184,145,63,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(c.width - M - 70, 300, 52, 0, Math.PI * 2); g.stroke();
      g.fillStyle = ink + '.88)'; g.font = '500 58px CormorantCena, serif'; g.fillText('Rusemberg Tavares Fernandes', M, 360);
      g.fillStyle = goldC; g.font = '500 24px BarlowCena, sans-serif'; g.letterSpacing = '5px'; g.fillText('ADVOGADO · OAB/PB 30.070', M, 404); g.letterSpacing = '0px';
      // texto à esquerda da foto, depois em largura total
      let y = 510; for (let i = 0; i < 7; i++) { linha(y, 470 * (i % 4 === 3 ? .6 : .86 + ((i * 29) % 13) / 100)); y += 46; }
      y = 880; for (let i = 0; i < 2; i++) { linha(y, (c.width - M * 2) * (i ? .55 : .9)); y += 46; }
      // foto impressa, levemente inclinada, presa por um clipe
      if (fotoAdv) {
        const fw = 290, fh = 370, cx = 790, cy = 655;
        g.save(); g.translate(cx, cy); g.rotate(0.045);
        g.shadowColor = 'rgba(0,0,0,.28)'; g.shadowBlur = 26; g.shadowOffsetY = 10;
        g.fillStyle = '#fbfaf6'; g.fillRect(-fw / 2, -fh / 2, fw, fh);
        g.shadowColor = 'transparent';
        const b = 14, iw = fw - b * 2, ih = fh - b * 2 - 34;
        const sr = Math.max(iw / fotoAdv.width, ih / fotoAdv.height), sw = iw / sr, sh = ih / sr;
        g.drawImage(fotoAdv, (fotoAdv.width - sw) / 2, 0, sw, sh, -fw / 2 + b, -fh / 2 + b, iw, ih);
        g.fillStyle = 'rgba(34,36,40,.55)'; g.font = 'italic 500 20px CormorantCena, serif'; g.textAlign = 'center';
        g.fillText('Rusemberg Tavares Fernandes', 0, fh / 2 - 18); g.textAlign = 'left';
        // clipe metálico
        const clipe = (dx) => { g.beginPath(); g.moveTo(dx, -fh / 2 + 58); g.lineTo(dx, -fh / 2 - 16); g.arc(dx + 13, -fh / 2 - 16, 13, Math.PI, 0); g.lineTo(dx + 26, -fh / 2 + 44); g.arc(dx + 17, -fh / 2 + 44, 9, 0, Math.PI); g.lineTo(dx + 8, -fh / 2 - 6); };
        g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
        g.strokeStyle = 'rgba(0,0,0,.25)'; g.save(); g.translate(3, 3); clipe(-60); g.stroke(); g.restore();
        const gr = g.createLinearGradient(-60, -fh / 2 - 30, -34, -fh / 2 + 60); gr.addColorStop(0, '#f3f3f1'); gr.addColorStop(.5, '#8d9196'); gr.addColorStop(1, '#d9dadc');
        g.strokeStyle = gr; clipe(-60); g.stroke();
        g.restore();
      }
      // linha de assinatura sob a rubrica
      g.fillStyle = ink + '.35)'; g.fillRect(ASS.x - 30, ASS.y + ASS.h + 4, ASS.w + 120, 2);
      g.fillStyle = ink + '.55)'; g.font = '500 19px BarlowCena, sans-serif'; g.letterSpacing = '4px'; g.fillText('RUSEMBERG FERNANDES', ASS.x - 30, ASS.y + ASS.h + 36); g.letterSpacing = '0px';
    } else if (tipo === 'areas') {
      let y = 330;
      for (let i = 0; i < 6; i++) {
        g.strokeStyle = goldC; g.lineWidth = 3; g.strokeRect(M, y - 24, 40, 40);
        g.fillStyle = goldC; g.font = '500 24px BarlowCena, sans-serif'; g.fillText(String(i + 1).padStart(2, '0'), M + 6, y + 4);
        g.fillStyle = ink + '.24)'; g.fillRect(M + 64, y - 16, (c.width - M * 2 - 64) * (.42 + (i % 3) * .07), 12);
        g.fillStyle = ink + '.1)'; g.fillRect(M + 64, y + 12, (c.width - M * 2 - 64) * .72, 8);
        y += 116;
      }
    } else if (tipo === 'formacao') {
      let y = 340;
      for (let i = 0; i < 6; i++) {
        g.fillStyle = ink + '.3)'; g.beginPath(); g.arc(M + 14, y - 4, 10, 0, Math.PI * 2); g.fill();
        g.fillStyle = ink + '.22)'; g.fillRect(M + 46, y - 12, (c.width - M * 2 - 46) * (.72 + (i % 3) * .08), 11);
        g.fillStyle = ink + '.1)'; g.fillRect(M + 46, y + 16, (c.width - M * 2 - 46) * .42, 8);
        y += 100;
      }
    } else if (tipo === 'orientacao') {
      let y = 340;
      for (let i = 0; i < 5; i++) {
        g.strokeStyle = ink + '.5)'; g.lineWidth = 4; g.strokeRect(M, y - 22, 34, 34);
        g.fillStyle = ink + '.16)'; g.fillRect(M + 70, y - 14, (c.width - M * 2 - 70) * (.7 + (i % 2) * .2), 9);
        g.fillStyle = ink + '.1)'; g.fillRect(M + 70, y + 18, (c.width - M * 2 - 70) * .45, 9);
        y += 108;
      }
      g.strokeStyle = ink + '.4)'; g.lineWidth = 3; g.beginPath(); g.moveTo(M, 1120); g.lineTo(M + 380, 1120); g.stroke();
      g.fillStyle = ink + '.55)'; g.font = '500 20px BarlowCena, sans-serif'; g.fillText('OAB/PB 30.070', M, 1156);
    }
    // rodapé
    g.fillStyle = goldC; g.fillRect(M, c.height - 92, c.width - M * 2, 1.5);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }
  // Cada elemento é desenhado duas vezes: em cor (o que aparece) e em tons de cinza
  // que indicam o instante, de 0 a 1, em que aquele ponto surge durante a leitura.
  function desenharTinta(tipo) {
    const Wc = 1024, Hc = Math.round(1024 * pagH / pagW), M = 92, gold = '#b8913f';
    const cc = document.createElement('canvas'); cc.width = Wc; cc.height = Hc; const g = cc.getContext('2d');
    const co = document.createElement('canvas'); co.width = Wc; co.height = Hc; const o = co.getContext('2d');
    o.fillStyle = '#fff'; o.fillRect(0, 0, Wc, Hc); // fundo: nunca aparece
    const cinza = (t) => { const v = Math.round(clamp(t) * 250); return `rgb(${v},${v},${v})`; };
    const traco = (pts, t0, t1, w, cor = gold) => {
      g.strokeStyle = cor; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(...pts[0]); pts.slice(1).forEach((q) => g.lineTo(...q)); g.stroke();
      o.lineCap = 'round'; o.lineWidth = w + 6;
      for (let i = 1; i < pts.length; i++) { o.strokeStyle = cinza(t0 + (t1 - t0) * (i / pts.length)); o.beginPath(); o.moveTo(...pts[i - 1]); o.lineTo(...pts[i]); o.stroke(); }
    };
    const varredura = (x, y, w, h, t0, t1, cor) => {
      g.fillStyle = cor; g.fillRect(x, y, w, h);
      const n = 40; for (let i = 0; i < n; i++) { o.fillStyle = cinza(t0 + (t1 - t0) * (i / n)); o.fillRect(x + (w * i) / n, y - 3, w / n + 1, h + 6); }
    };
    const disco = (x, y, r, t, cor = gold) => { g.fillStyle = cor; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); o.fillStyle = cinza(t); o.beginPath(); o.arc(x, y, r + 3, 0, Math.PI * 2); o.fill(); };
    const curva = (a, b, n = 24) => { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t;
      const c1 = [a[0] + 80, a[1]], c2 = [b[0] - 80, b[1]];
      pts.push([u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b[0], u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b[1]]); } return pts; };
    const arco = (x, y, r, a0, a1, n = 48) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [x + Math.cos(a) * r, y + Math.sin(a) * r]; });

    if (tipo === 'apresentacao') {
      traco([[M, 430], [M + 520, 430]], 0.02, 0.3, 4);
      if (rubrica) {
        g.drawImage(rubrica, ASS.x, ASS.y, ASS.w, ASS.h);
        // ordem de surgimento: da esquerda para a direita, como a mão escrevendo
        const t = document.createElement('canvas'); t.width = ASS.w; t.height = ASS.h; const tg = t.getContext('2d');
        const gr = tg.createLinearGradient(0, 0, ASS.w, 0); gr.addColorStop(0, cinza(0.4)); gr.addColorStop(1, cinza(0.95));
        tg.fillStyle = gr; tg.fillRect(0, 0, ASS.w, ASS.h);
        tg.globalCompositeOperation = 'destination-in'; tg.drawImage(rubrica, 0, 0, ASS.w, ASS.h);
        o.drawImage(t, ASS.x, ASS.y);
      }
    } else if (tipo === 'analise') {
      // marca-texto passando pelos trechos importantes, linha a linha
      const ys = [330 + 3 * 44, 330 + 4 * 44, 330 + 9 * 44 + 26];
      ys.forEach((y, i) => varredura(M - 6, y - 8, (Wc - M * 2) * (i === 2 ? .62 : .8), 24, 0.05 + i * 0.22, 0.22 + i * 0.22, 'rgba(214,178,94,.55)'));
      traco([[Wc - M + 30, 452], [Wc - M + 44, 452], [Wc - M + 44, 540], [Wc - M + 30, 540]], 0.7, 0.85, 4);
      traco(arco(Wc - M + 62, 496, 12, 0, Math.PI * 2, 20), 0.85, 0.95, 4);
    } else if (tipo === 'estrategia') {
      const nos = [[200, 430], [430, 430], [660, 330], [660, 540], [880, 330], [880, 540], [520, 760], [800, 760]];
      disco(...nos[0], 18, 0.02);
      traco(curva(nos[0], nos[1]), 0.04, 0.3, 7); disco(...nos[1], 18, 0.3);
      traco(curva(nos[1], nos[2]), 0.32, 0.58, 7); disco(...nos[2], 18, 0.58);
      traco(curva(nos[2], nos[4]), 0.6, 0.86, 7); disco(...nos[4], 26, 0.88);
      traco(arco(...nos[4], 38, 0, Math.PI * 2, 32), 0.9, 1.0, 3);
    } else if (tipo === 'orientacao') {
      let y = 340;
      for (let i = 0; i < 3; i++) { traco([[M + 6, y - 6], [M + 16, y + 6], [M + 40, y - 30]], 0.1 + i * 0.28, 0.24 + i * 0.28, 7); y += 108; }
      traco([[M, 1120], [M + 380, 1120]], 0.92, 1.0, 3);
    } else if (tipo === 'areas') {
      let y = 330;
      for (let i = 0; i < 6; i++) { varredura(M + 64, y + 30, (Wc - M * 2 - 64) * .55, 4, 0.04 + i * 0.15, 0.16 + i * 0.15, gold); y += 116; }
    } else if (tipo === 'formacao') {
      let y = 340;
      for (let i = 0; i < 4; i++) { disco(M + 14, y - 4, 10, 0.08 + i * 0.14); y += 100; }
      // o selo é "carimbado" no fim da leitura
      const sx = Wc - M - 90, sy = 1040;
      traco(arco(sx, sy, 70, -Math.PI / 2, Math.PI * 1.5, 64), 0.66, 0.9, 6);
      traco(arco(sx, sy, 56, Math.PI / 2, Math.PI * 2.5, 48), 0.78, 0.96, 2.5);
      traco([[sx - 26, sy + 2], [sx - 6, sy + 22], [sx + 30, sy - 22]], 0.9, 1.0, 7);
    } else return null;
    const cor = new THREE.CanvasTexture(cc); cor.colorSpace = THREE.SRGBColorSpace; cor.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const ordem = new THREE.CanvasTexture(co); ordem.minFilter = THREE.LinearFilter; ordem.generateMipmaps = false;
    return { cor, ordem };
  }

  function textoTex(l1, l2) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 128); g.fillStyle = '#fff'; g.textAlign = 'center';
    g.font = '500 54px BarlowCena, sans-serif'; g.letterSpacing = '14px'; g.fillText(l1, 512, 62);
    g.font = '500 30px BarlowCena, sans-serif'; g.letterSpacing = '12px'; g.fillText(l2, 512, 112);
    return new THREE.CanvasTexture(c);
  }
  function mascaraRadial() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const r = g.createRadialGradient(128, 150, 20, 128, 128, 128); r.addColorStop(0, '#fff'); r.addColorStop(.55, '#fff'); r.addColorStop(1, '#000');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
  }

  // ---------- curvatura das folhas ----------
  // A folha é tratada como papel inextensível: cada linha da malha é "desenrolada"
  // a partir da lombada com um ângulo que cresce para a borda livre, de modo que o
  // comprimento se mantém e a folha se curva em vez de esticar.
  // dobra: ângulo acumulado na borda (rad; + = borda adiantada no sentido do giro)
  // torcao: quanto o canto inferior se adianta em relação ao superior
  function curvar(m, dobra, torcao = 0) {
    const ud = m.userData;
    if (Math.abs((ud.dobra ?? 0) - dobra) < 1e-4 && Math.abs((ud.torcao ?? 0) - torcao) < 1e-4) return;
    ud.dobra = dobra; ud.torcao = torcao;
    const a = m.geometry.attributes.position, arr = a.array;
    const ds = pagW / SX;
    for (let iy = 0; iy <= SY; iy++) {
      const v = iy / SY; // 0 = borda de cima, 1 = de baixo
      const A = dobra * (1 + torcao * (v - 0.5));
      let x = -pagW / 2, z = 0;
      const i0 = iy * (SX + 1);
      arr[i0 * 3] = x; arr[i0 * 3 + 2] = 0;
      for (let ix = 1; ix <= SX; ix++) {
        const um = (ix - 0.5) / SX;
        const phi = A * Math.pow(um, 1.7);
        x += ds * Math.cos(phi); z += ds * Math.sin(phi);
        const i = i0 + ix;
        arr[i * 3] = x; arr[i * 3 + 2] = z;
      }
    }
    a.needsUpdate = true; m.geometry.computeVertexNormals();
  }

  // ---------- virada das folhas com tempo próprio ----------
  // A rolagem só decide QUAL folha deve estar virada; o movimento em si tem
  // duração fixa, para que a folha vire devagar mesmo que o visitante role
  // rápido ou arraste a barra de rolagem.
  const DUR_VIRADA = mobile() ? 1.9 : 2.3; // segundos por folha
  const viradas = paginas.map(() => ({ v: 0, de: 0, para: 0, t0: 0, dur: 1, dir: 1 }));
  const ordemViraveis = paginas.map((m, i) => i).filter((i) => { const k = paginas[i].userData.idx; return k >= 0 && k < NC - 1; })
    .sort((i, j) => paginas[i].userData.idx - paginas[j].userData.idx);
  const opTexto = conteudos.map(() => 0); let tTextos = 0;
  const easeVirada = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t); // sai do repouso e pousa sem tranco
  function atualizarViradas(p) {
    const ordem = paginas.map((m, i) => i).filter((i) => { const k = paginas[i].userData.idx; return k >= 0 && k < NC - 1; })
      .sort((i, j) => paginas[i].userData.idx - paginas[j].userData.idx);
    // limiar: a meio caminho entre a saída do texto atual e a entrada do próximo
    const desejado = ordem.map((i) => (p >= janelas[paginas[i].userData.idx][1] - JW * 0.4 ? 1 : 0));
    // se o visitante saltou várias páginas de uma vez (barra arrastada), o maço
    // acelera um pouco para não ficar muito atrás do texto, sem perder a suavidade
    const atraso = ordem.filter((i, n) => Math.abs(desejado[n] - viradas[i].v) > 0.5).length;
    const ritmo = atraso > 1 ? Math.max(0.55, 1 / (1 + 0.22 * (atraso - 1))) : 1;
    const folga = atraso > 1 ? 0.3 : 0.42;
    ordem.forEach((i, n) => {
      const st = viradas[i];
      if (arrasto.ativo && arrasto.i === i) { st.v = st.de = st.para = arrasto.v; st.dir = arrasto.dir; return; }
      let alvo = desejado[n];
      // nenhuma folha começa a virar antes de a capa estar aberta (evita a folha atravessar a capa
      // quando o visitante salta etapas pela aba ou rola muito rápido)
      if (alvo === 1 && st.para === 0 && abertura.v < 0.97) alvo = 0;
      // folhas viram uma de cada vez, como num maço de papel
      if (alvo === 1 && n > 0 && viradas[ordem[n - 1]].v < folga) alvo = st.para;
      if (alvo === 0 && n < ordem.length - 1 && viradas[ordem[n + 1]].v > 1 - folga) alvo = st.para;
      if (alvo !== st.para) {
        st.de = st.v; st.para = alvo; st.t0 = tempo; st.dir = alvo > st.v ? 1 : -1;
        st.dur = Math.max(0.6, DUR_VIRADA * ritmo * Math.abs(alvo - st.v));
        if (Math.abs(alvo - st.v) > 0.3) tocarVirada(st.dur, st.dir);
      }
      const t = clamp((tempo - st.t0) / st.dur);
      st.v = lerp(st.de, st.para, easeVirada(t));
    });
  }

  // ---------- abertura e fechamento do livro, conduzidos pela rolagem ----------
  // A capa e o fechamento seguem a barra de rolagem quadro a quadro (param
  // quando ela para e voltam quando ela volta), mas com velocidade máxima:
  // mesmo numa rolagem rápida, nunca andam mais depressa que o ritmo das folhas.
  const DUR_ABRE = mobile() ? 3.1 : 3.6;     // tempo mínimo da abertura completa
  const DUR_FECHA = mobile() ? 2.8 : 3.2;    // tempo mínimo do fechamento completo
  const A0 = 0.075, A1 = 0.17, C0 = 0.79, C1 = 0.915;
  const abertura = { v: 0 }, fechamento = { v: 0 };
  let gestoIniciado = false, tGesto = 0;
  function seguir(st, alvo, durTotal, dt, aoCruzar) {
    const antes = st.v, passo = dt / durTotal;
    st.v += Math.max(-passo, Math.min(passo, alvo - st.v));
    if (antes < 0.04 && st.v >= 0.04) aoCruzar(durTotal, 1);
    if (antes > 0.96 && st.v <= 0.96) aoCruzar(durTotal, -1);
  }
  function atualizarGestos(p, forcado) {
    const dt = Math.min(0.1, Math.max(0, tempo - tGesto)); tGesto = tempo;
    const alvoA = seg(p, A0, A1), alvoF = seg(p, C0, C1);
    if (forcado || !gestoIniciado) { // testes, ?p= e carregamento no meio do livro: posição exata, sem som
      abertura.v = alvoA; fechamento.v = alvoF; gestoIniciado = true; return;
    }
    // o livro só fecha depois de aberto, e só reabre depois de levantado da mesa
    seguir(abertura, fechamento.v > 0.001 ? Math.max(alvoA, abertura.v) : alvoA, DUR_ABRE, dt, (d, dir) => tocarCapa(d, dir));
    seguir(fechamento, abertura.v > 0.98 ? alvoF : 0, DUR_FECHA, dt, (d, dir) => tocarFechamento(d, dir));
  }

  // ---------- botão de som ----------
  const botaoSom = document.getElementById('cenaSom');
  if (botaoSom) {
    const pintar = () => {
      const on = somLigado();
      botaoSom.setAttribute('aria-pressed', String(on));
      botaoSom.setAttribute('aria-label', on ? 'Desativar som das páginas' : 'Ativar som das páginas');
      botaoSom.title = on ? 'Desativar som' : 'Ativar som';
      const rot = botaoSom.querySelector('span'); if (rot) rot.textContent = on ? 'Som ligado' : 'Ativar som';
      botaoSom.classList.toggle('is-mudo', !on);
    };
    botaoSom.addEventListener('click', () => { alternarSom(); pintar(); });
    aoMudarSom(pintar);
    pintar();
  }

  // ---------- coreografia ----------
  // Posições de foco das folhas (relativas à pasta)
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / window.innerWidth - .5) * 2; mouse.ty = (e.clientY / window.innerHeight - .5) * 2;
  }, { passive: true });

  const forcado = new URLSearchParams(location.search).get('p');
  const camPos = new THREE.Vector3(), camAlvo = new THREE.Vector3();
  let tAnt = performance.now(), tempo = 0;
  let pSuave = 0, dtQuadro = 0.016;

  function layout() {
    const r = sticky.getBoundingClientRect();
    const w = r.width, h = r.height;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  layout();
  window.addEventListener('resize', layout);

  function progresso() { return P_ETAPAS[etapa]; }

  // ---------- linha do tempo (0 → 1) ----------
  // capa 0–.06 · abre .06–.13 · páginas .13–.84 (cinco janelas) · fecha e pousa .84–.93 · contato .93–1
  // capa 0–.045 · gira .045–.09 · capa abre devagar .075–.17 · páginas .17–.86 · fecha e pousa .86–.945 · contato .93–1
  const J0 = 0.17, J1 = 0.78, JW = (J1 - J0) / NC;
  const janelas = conteudos.map((_, k) => [J0 + k * JW, J0 + (k + 1) * JW]);

  // ==========================================================
  // Livro paginado: uma rolada, uma página
  // ==========================================================
  // Cada gesto (roda do mouse, toque deslizando, seta do teclado, aba ou
  // arrasto da folha) avança ou volta exatamente uma etapa. As etapas são
  // pontos fixos da linha do tempo; as viradas continuam com tempo próprio.
  const P_ETAPAS = [0, ...conteudos.map((_, k) => (k < NC - 1 ? J0 + (k + 0.5) * JW : J1 - 0.012)), 0.975];
  const ULTIMA = P_ETAPAS.length - 1;
  let etapa = 0, mudouEm = -1e9, chegouTopoEm = 0, gestoInicio = 0, ultimoGesto = 0;
  const naCena = () => { if (document.documentElement.classList.contains('cena-estatica')) return false; const r = cena.getBoundingClientRect(); return Math.abs(r.top) < 6; };
  const avisar = () => { sticky.dataset.etapa = etapa; window.dispatchEvent(new CustomEvent('livro:etapa', { detail: { etapa, ultima: ULTIMA } })); };
  sticky.dataset.etapa = 0;
  function irPara(n, { manual = true } = {}) {
    n = clamp(Math.round(n), 0, ULTIMA);
    if (manual) pararFolhear();
    if (n === etapa) return;
    etapa = n; mudouEm = performance.now(); avisar();
    if (etapa === ULTIMA) { try { localStorage.setItem('rf-livro-visto', '1'); } catch { /* sem armazenamento */ } }
  }
  window.__livro = { irPara: (n) => { irPara(n); }, etapa: () => etapa, ULTIMA };
  window.addEventListener('scroll', () => { if (window.scrollY <= 4 && !chegouTopoEm) chegouTopoEm = performance.now(); if (window.scrollY > 4) chegouTopoEm = 0; sticky.classList.toggle('is-fora', window.scrollY > 4); }, { passive: true });
  chegouTopoEm = window.scrollY <= 4 ? 1 : 0;

  // roda do mouse e trackpad: um gesto contínuo (inclusive a inércia) conta uma vez só
  window.addEventListener('wheel', (e) => {
    // usa a hora do próprio evento: num quadro lento vários eventos chegam juntos
    const agora = e.timeStamp || performance.now();
    if (agora - ultimoGesto > 170) gestoInicio = agora;
    ultimoGesto = agora;
    if (!naCena() || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    const prox = e.deltaY > 0;
    if ((prox && etapa === ULTIMA) || (!prox && etapa === 0)) return; // segue a página normalmente
    e.preventDefault();
    if (Math.abs(e.deltaY) < 2) return;
    const gestoNovo = gestoInicio > mudouEm && gestoInicio >= chegouTopoEm;
    if ((gestoNovo && agora - mudouEm > 450) || agora - mudouEm > 1500) { irPara(etapa + (prox ? 1 : -1)); gestoInicio = 0; }
  }, { passive: false });

  // toque: deslizar na vertical vira a página; na horizontal, arrasta a folha
  let tY = null, tX = null, tDir = null;
  sticky.addEventListener('touchstart', (e) => { tY = e.touches[0].clientY; tX = e.touches[0].clientX; tDir = null; }, { passive: true });
  sticky.addEventListener('touchmove', (e) => {
    if (tY === null) return;
    const dy = e.touches[0].clientY - tY, dx = e.touches[0].clientX - tX;
    if (!tDir && Math.hypot(dx, dy) > 8) tDir = Math.abs(dy) > Math.abs(dx) ? 'v' : 'h';
    if (tDir !== 'v' || !naCena()) return;
    const prox = dy < 0;
    if ((prox && etapa === ULTIMA) || (!prox && etapa === 0)) return;
    if (e.cancelable) e.preventDefault();
  }, { passive: false });
  sticky.addEventListener('touchend', (e) => {
    if (tDir === 'v' && naCena() && tY !== null) {
      const dy = e.changedTouches[0].clientY - tY;
      if (Math.abs(dy) > 36) { const prox = dy < 0; if (!(prox && etapa === ULTIMA) && !(!prox && etapa === 0)) irPara(etapa + (prox ? 1 : -1)); }
    }
    tY = null;
  }, { passive: true });

  // teclado: setas, espaço e Page Up/Down viram; Esc pula para o conteúdo
  const pular = () => { pararFolhear(); const alvo = document.getElementById('sobre'); if (alvo) window.scrollTo({ top: alvo.getBoundingClientRect().top + window.scrollY, behavior: 'instant' }); };
  window.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const el = e.target;
    if (el && el.closest && el.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (e.key === 'Escape' && naCena()) { pular(); return; }
    if (!naCena()) return;
    if (e.key === ' ' && el && el.closest && el.closest('button, a')) return;
    const prox = ['ArrowDown', 'PageDown', ' ', 'ArrowRight'].includes(e.key), ant = ['ArrowUp', 'PageUp', 'ArrowLeft'].includes(e.key);
    if (prox && etapa < ULTIMA) { e.preventDefault(); if (performance.now() - mudouEm > 350) irPara(etapa + 1); }
    else if (ant && etapa > 0) { e.preventDefault(); if (performance.now() - mudouEm > 350) irPara(etapa - 1); }
  });

  // abas do índice
  marcas.forEach((b) => b.addEventListener('click', () => { if (window.scrollY > 4) window.scrollTo({ top: 0, behavior: 'instant' }); irPara(+b.dataset.etapa); }));

  // folhear sozinho: o livro avança com uma pausa proporcional ao texto da página
  const botaoFolhear = document.getElementById('cenaFolhear');
  let folheando = false, proximaEm = 0;
  function pausaDaEtapa(n) {
    if (n === 0) return 2.6;
    const el = passos[n - 1]; const palavras = el ? el.textContent.trim().split(/\s+/).length : 40;
    return clamp(palavras / 3.3, 5, 14) + (n === 1 ? 4 : 0) + 2.3; // +4 s para a rubrica, +2,3 s da virada
  }
  function pararFolhear() { if (!folheando) return; folheando = false; botaoFolhear?.setAttribute('aria-pressed', 'false'); }
  botaoFolhear?.addEventListener('click', () => {
    folheando = !folheando; botaoFolhear.setAttribute('aria-pressed', String(folheando));
    if (folheando) { if (etapa === ULTIMA) irPara(0, { manual: false }); proximaEm = tempo + (etapa === 0 ? 0.4 : pausaDaEtapa(etapa)); }
  });
  ['pointerdown', 'touchstart'].forEach((ev) => window.addEventListener(ev, (e) => { if (folheando && !(e.target.closest && e.target.closest('#cenaFolhear'))) pararFolhear(); }, { passive: true }));
  window.addEventListener('wheel', () => { if (folheando) pararFolhear(); }, { passive: true });

  // quem já viu o livro recebe um atalho para o conteúdo
  const retorno = document.getElementById('cenaRetorno');
  let visto = false; try { visto = localStorage.getItem('rf-livro-visto') === '1'; } catch { /* sem armazenamento */ }
  if (retorno && visto && window.scrollY < 10) {
    retorno.hidden = false;
    document.getElementById('cenaPular')?.addEventListener('click', (e) => { e.preventDefault(); retorno.hidden = true; irPara(ULTIMA); pular(); });
    document.getElementById('cenaRetornoFechar')?.addEventListener('click', () => { retorno.hidden = true; });
    setTimeout(() => { retorno.hidden = true; }, 20000);
  }

  // arrastar a folha pelo canto (mouse ou dedo)
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const arrasto = { ativo: false, i: -1, dir: 1, x0: 0, v: 0, largura: 300 };
  let hoverCanto = 0, hoverAlvo = 0, alvoHover = -1;
  function folhaAtual(dir) { // dir 1: a próxima a virar; -1: a última virada
    const n = etapa - 1; // índice da página de conteúdo aberta
    if (etapa < 1 || etapa > NC) return -1;
    if (dir > 0) return n < NC - 1 ? ordemViraveis[n] : -1;
    return n > 0 ? ordemViraveis[n - 1] : -1;
  }
  function tocaFolha(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ptr.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    for (const dir of [1, -1]) {
      const i = folhaAtual(dir); if (i < 0) continue;
      const hit = ray.intersectObject(paginas[i], false)[0];
      if (hit && hit.uv && hit.uv.x > 0.55) return { i, dir };
    }
    return null;
  }
  canvas.addEventListener('pointermove', (e) => {
    if (arrasto.ativo) {
      const dx = e.clientX - arrasto.x0;
      arrasto.v = arrasto.dir > 0 ? clamp(-dx / arrasto.largura) : clamp(1 - dx / arrasto.largura);
      return;
    }
    if (e.pointerType !== 'mouse') return;
    const t = abertura.v > 0.98 && fechamento.v < 0.01 ? tocaFolha(e.clientX, e.clientY) : null;
    hoverAlvo = t && t.dir > 0 ? 1 : 0; alvoHover = t && t.dir > 0 ? t.i : -1;
    canvas.classList.toggle('is-arrastavel', !!t);
  });
  canvas.addEventListener('pointerleave', () => { hoverAlvo = 0; });
  canvas.addEventListener('pointerdown', (e) => {
    if (abertura.v < 0.98 || fechamento.v > 0.01) return;
    const t = tocaFolha(e.clientX, e.clientY); if (!t) return;
    const st = viradas[t.i]; if (Math.abs(st.v - st.para) > 0.02) return; // espera a virada em curso terminar
    pararFolhear();
    Object.assign(arrasto, { ativo: true, i: t.i, dir: t.dir, x0: e.clientX, v: st.v, largura: Math.max(160, canvas.getBoundingClientRect().width * (mob0() ? 0.7 : 0.32)) });
    canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-arrastando');
  });
  const soltar = () => {
    if (!arrasto.ativo) return;
    const st = viradas[arrasto.i]; arrasto.ativo = false; canvas.classList.remove('is-arrastando');
    st.de = st.v; st.t0 = tempo; st.para = st.v; // a partir daqui, o tempo próprio assume
    const vai = arrasto.dir > 0 ? arrasto.v > 0.35 : arrasto.v < 0.65;
    if (vai) irPara(etapa + arrasto.dir);
  };
  canvas.addEventListener('pointerup', soltar); canvas.addEventListener('pointercancel', soltar);
  const mob0 = () => camera.aspect < 0.8;

  // tinta das páginas: escreve-se em tempo próprio enquanto a página está aberta
  const tinta = conteudos.map(() => 0);
  const DUR_TINTA = conteudos.map((c) => (c === 'apresentacao' ? 6.5 : 3.2));
  let somAssinatura = false;
  if (folhasConteudo[0]) folhasConteudo[0].add(canetaPag.grupo);

  function aplicar(p) {
    const asp = camera.aspect, mob = asp < 0.8;
    const dist = Math.max(1.2, 0.40 / (2 * Math.tan(THREE.MathUtils.degToRad(15)) * asp));
    const dist0 = mob ? Math.max(dist, 1.9) : dist;

    const f1 = eio(seg(p, 0.045, 0.095));   // pasta gira de frente
    atualizarGestos(p, forcado !== null || window.__forceP !== undefined);
    const fAbre = abertura.v;               // capa abre em tempo próprio
    const fF = fechamento.v;
    // a capa só começa a se erguer depois que o selo se rompe
    const fCapa = seg(fAbre, 0.22, 1);
    const abreSuave = fCapa * fCapa * (3 - 2 * fCapa);
    const fPag = seg(p, J0, J1);
    const f3a = eio(seg(fF, 0.0, 0.34));  // folhas voltam juntas
    const f3b = eio(seg(fF, 0.26, 0.62)); // capa fecha
    const f3c = eio(seg(fF, 0.5, 1.0));   // pousa na mesa
    const f4 = eio(seg(p, 0.955, 1.0));    // aproximação final
    const fBranco = seg(p, 0.988, 1.0);

    // no celular o objeto sobe para dar espaço ao painel de texto
    const subirMob = mob ? eio(seg(p, 0.12, 0.19)) * (1 - f3c) : 0;
    const yMob = mob ? lerp(-0.015, 0, f1) : 0;

    // --- pasta ---
    const idle = Math.sin(tempo * 0.45) * (1 - f1) * 0.18;
    let rot = [0.16 + mouse.y * 0.08 * (1 - f3c), -0.55 + idle + mouse.x * 0.18 * (1 - f3c), 0.05];
    rot = mix3(rot, [0.02 + mouse.y * 0.04, 0.06 + mouse.x * 0.08, 0], f1);
    let pos = [0, yMob + Math.sin(tempo * 0.8) * 0.006 * (1 - f3c), 0];
    pos = mix3(pos, [mob ? 0.06 : 0.07, yMob, -0.02], f1);
    // aberta como um livro: no computador a lombada fica à esquerda dos textos; no celular, a página atual centralizada
    const aberto = eio(fAbre) * (1 - f3a);
    pos = mix3(pos, [mob ? -0.004 : -0.015, yMob, -0.02], aberto);
    rot = mix3(rot, [0.03 + mouse.y * 0.03, (mob ? 0.0 : 0.1) + mouse.x * 0.05, 0], aberto);
    rot = mix3(rot, [-Math.PI / 2, 0, 0.18], f3c);
    pos = mix3(pos, [0, -0.2 + T / 2 + 0.0005, 0], f3c);
    pasta.rotation.set(...rot); pasta.position.set(...pos);
    // a capa se ergue, faz uma breve pausa a meio caminho e termina de abrir
    const curvaCapa = abreSuave < .5 ? eio(abreSuave * 2) * .45 : .45 + eio((abreSuave - .5) * 2) * .55;
    dobradica.rotation.y = -curvaCapa * (1 - f3b) * 2.75;

    // --- folhas: cada página permanece para leitura e depois vira pela lombada ---
    atualizarViradas(p);
    const forcadoQ = forcado !== null || window.__forceP !== undefined;
    hoverCanto += (hoverAlvo - hoverCanto) * Math.min(1, dtQuadro * 7);
    paginas.forEach((m, i) => {
      const k = m.userData.idx; const piv = m.userData.piv;
      const viraveis = k >= 0 && k < NC - 1;
      const st = viradas[i];
      let vira = viraveis ? st.v : 0;
      vira *= 1 - f3a; // no fechamento, as folhas voltam antes de a capa fechar
      piv.rotation.y = -vira * (2.64 - Math.max(k, 0) * 0.014);
      // progresso no sentido do movimento: no início o canto se solta e lidera;
      // perto do fim a borda livre fica para trás e a folha "plana" até pousar
      const tm = st.dir > 0 ? vira : 1 - vira;
      const giroLivre = 1 - Math.min(1, f3a * 4); // no fechamento vale só a flexão de retorno
      const dobraGiro = viraveis ? Math.sin(Math.PI * tm) * (1.2 * (1 - tm) - 0.36) * 1.25 * st.dir * giroLivre : 0;
      const torcao = viraveis ? Math.sin(Math.PI * tm) * 0.9 * giroLivre : 0;
      const dobraFecha = viraveis ? -Math.sin(f3a * Math.PI) * 0.35 : 0;
      curvar(m, dobraGiro + dobraFecha, torcao);
      if (m.userData.uP) {
        const [a, b] = janelas[k];
        m.userData.uP.value = forcadoQ ? (k < NC - 1 ? seg(p, a + JW * 0.02, b - JW * 0.58) : seg(p, a + JW * 0.10, J1 - 0.03)) : tinta[k];
      }
      // leve ondulação do canto quando o mouse passa por cima
      if (i === alvoHover && st.v < 0.01 && hoverCanto > 0.001) { piv.rotation.y -= hoverCanto * 0.05; curvar(m, -hoverCanto * 0.5, hoverCanto * 0.35); }
    });

    // --- câmera ---
    camPos.set(0, 0.02, lerp(dist0, dist, f1)); camAlvo.set(0, 0, 0);
    camPos.z -= f1 * 0.1 + Math.sin(fPag * Math.PI) * 0.02 - (mob ? 0 : eio(fAbre) * (1 - f3a) * 0.08);
    camAlvo.y -= subirMob * 0.15; camPos.y -= subirMob * 0.15; camPos.z += subirMob * 0.38;
    camPos.lerp(new THREE.Vector3(mob ? 0.04 : 0.2, 0.46, mob ? dist * 0.78 : dist * 0.86 + 0.12), f3c);
    camAlvo.lerp(new THREE.Vector3(-0.1, mob ? -0.2 : -0.17, -0.1), f3c);
    camPos.lerp(new THREE.Vector3(0.02, 0.22, 0.42), f4 * 0.6);
    camAlvo.lerp(new THREE.Vector3(0.02, -0.2, 0.02), f4 * 0.4);
    if (!mob) { camPos.x += mouse.x * 0.02; camPos.y -= mouse.y * 0.015; }
    camera.position.copy(camPos); camera.lookAt(camAlvo);

    // --- luz e ambiente ---
    key.target.position.copy(pasta.position);
    key.position.set(-0.9 + Math.sin(tempo * 0.35) * 0.45 * (1 - f3c), 1.4, 1.5);
    key.intensity = lerp(26, 18, f3c);
    const acende = eio(seg(fF, 0.75, 1.0));
    warm.intensity = 3.2 * acende + Math.sin(acende * Math.PI) * 0.8;
    const pico = Math.sin(abreSuave * Math.PI);
    brilho.intensity = (pico * 1.8 + abreSuave * 0.25) * (1 - f3b);
    halo.material.opacity = pico * 0.55 * (1 - f3b);
    halo.position.x = -0.02 - abreSuave * 0.06;
    uReflexo.value = p < 0.05 ? ((tempo * 0.14) % 1.6) - 0.3 : -0.3 + seg(p, 0.05, 0.12) * 1.6;
    rim.intensity = lerp(1.1, 0.5, f3c);
    sombraPasta.position.x = pasta.position.x; sombraPasta.position.y = pasta.position.y - 0.235;
    sombraPasta.material.opacity = (1 - f1 * 0.6) * (1 - f3c) * 0.85;
    mesa.material.opacity = f3c; sombraMesa.material.opacity = 0.45 * f3c;
    acessorios.visible = f3c > 0.01;
    acessorios.position.y = lerp(-0.05, 0, f3c);
    const fa = clamp((f3c - 0.45) * 2.2);
    acessorios.traverse((o) => { if (o.isMesh) { o.material.transparent = fa < 1; o.material.opacity = fa; } });
    if (poeira) { poeira.material.uniforms.uT.value = tempo; poeira.material.uniforms.uA.value = 1 - f4 * 0.6; }
    ambiente.style.opacity = (f3c * (1 - f4 * 0.3)).toFixed(3);
    ambiente.style.filter = `blur(7px) brightness(${(0.48 + acende * 0.24).toFixed(3)}) saturate(${(0.85 + acende * 0.15).toFixed(3)})`;
    ambiente.style.transform = `scale(${(1.12 - f3c * 0.06 + f4 * 0.04).toFixed(3)})`;
    sticky.style.setProperty('--saida', fBranco.toFixed(3));

    // --- textos (HTML): entram, ficam totalmente visíveis e saem ---
    const vCapa = 1 - seg(p, 0.03, 0.06);
    const vFim = seg(p, 0.92, 0.945) * seg(fechamento.v, 0.8, 0.99) * (1 - seg(p, 0.992, 1.0));
    caps[0].style.opacity = vCapa.toFixed(3); caps[0].style.setProperty('--v', vCapa.toFixed(3));
    caps[0].classList.toggle('is-on', vCapa > 0.5);
    caps[1].style.opacity = vFim.toFixed(3); caps[1].style.setProperty('--v', vFim.toFixed(3));
    caps[1].classList.toggle('is-on', vFim > 0.5);
    // Os textos acompanham a página que está realmente aberta diante do
    // visitante: nunca avançam mais rápido do que as folhas viram, então
    // nenhuma etapa é pulada, nem descendo nem subindo.
    let atual = -1;
    if (abertura.v > 0.62 && fechamento.v < 0.04) {
      atual = 0;
      ordemViraveis.forEach((i) => { if (viradas[i].v > 0.5) atual++; });
      atual = Math.min(atual, NC - 1);
    }
    const passoDt = Math.min(0.1, Math.max(0, tempo - tTextos)); tTextos = tempo;
    if (atual >= 0 && !forcadoQ) {
      const antes = tinta[atual];
      tinta[atual] = Math.min(1, tinta[atual] + passoDt / DUR_TINTA[atual]);
      if (atual === 0 && antes < 0.4 && tinta[0] >= 0.4 && !somAssinatura) { somAssinatura = true; tocarAssinatura(DUR_TINTA[0] * 0.55); }
    }
    if (forcadoQ && atual >= 0) tinta[atual] = folhasConteudo[atual].userData.uP ? folhasConteudo[atual].userData.uP.value : 1;
    // caneta que escreve a rubrica na página de apresentação
    {
      const t0 = tinta[0], fl = folhasConteudo[0] ? viradas[paginas.indexOf(folhasConteudo[0])].v : 1;
      const mostra = canetaPag.pronta && atual === 0 && fl < 0.01 && t0 > 0.34 && t0 < 0.995;
      canetaPag.grupo.visible = mostra;
      if (mostra) {
        const u = clamp((t0 - 0.4) / 0.55);
        const cx = ASS.x + ASS.w * (0.04 + u * 0.92);
        const cy = ASS.y + ASS.h * (0.52 - 0.22 * Math.sin(u * Math.PI * 5.5) * Math.sin(u * Math.PI));
        const levanta = 1 - seg(t0, 0.34, 0.4) * (1 - seg(t0, 0.95, 0.995));
        canetaPag.grupo.position.set((cx / 1024 - 0.5) * pagW, (0.5 - cy / HcPag) * pagH, 0.0012 + levanta * 0.035);
      }
    }
    const forcadoT = forcado !== null || window.__forceP !== undefined;
    passos.forEach((el, k) => {
      const alvoV = k === atual ? 1 : 0;
      // a saída é mais rápida que a entrada, para os dois textos não se sobreporem
      const taxa = alvoV > opTexto[k] ? 2.4 : 4.2;
      opTexto[k] = forcadoT ? alvoV : opTexto[k] + (alvoV - opTexto[k]) * Math.min(1, passoDt * taxa);
      const v = alvoV ? opTexto[k] * Math.pow(1 - Math.max(0, ...opTexto.map((o, j) => (j !== k ? o : 0))), 3) : opTexto[k];
      el.style.opacity = v.toFixed(3);
      el.style.setProperty('--v', v.toFixed(3));
      el.classList.toggle('is-on', v > 0.5);
    });
    let ativa = atual + 1;
    if (fechamento.v > 0.04) ativa = NC + 1;
    marcas.forEach((li, i) => li.classList.toggle('is-on', i === ativa));
    if (marcas[0]) marcas[0].parentElement.style.opacity = seg(p, 0.04, 0.08).toFixed(3);
    // selo de cera: parte-se ao meio quando a capa começa a se erguer
    {
      // 1) racha ao meio, as metades se afastam um pouco; 2) caem e somem; 3) a capa abre
      const sq = seg(abertura.v, 0, 0.22);
      const racha = eio(seg(sq, 0, 0.4)), cai = seg(sq, 0.4, 1);
      selo.visible = sq < 0.999;
      inteiro.visible = racha < 0.01;
      metades.forEach((g, lado) => {
        g.visible = racha >= 0.01;
        const sd = lado ? -1 : 1;
        g.position.set(sd * (racha * 0.0035 + cai * 0.006), -cai * cai * 0.1, racha * 0.002);
        g.rotation.set(0, sd * racha * 0.22, -sd * cai * 0.35);
      });
      cera.opacity = 1 - seg(cai, 0.35, 1); ouroSelo.opacity = cera.opacity;
      fitaMat.opacity = 1 - seg(sq, 0.15, 0.7); fitas.forEach((f) => { f.visible = fitaMat.opacity > 0.01; });
    }
    barra.style.transform = `scaleX(${p.toFixed(4)})`;
  }

  // ---------- qualidade adaptativa: aparelhos lentos recebem uma cena mais leve ----------
  let amostras = 0, somaDt = 0, qualidadeDefinida = false;
  function medirQualidade(dt) {
    if (qualidadeDefinida || !visivel || dt <= 0) return;
    if (tempo < 1.2) return; // ignora o arranque
    amostras++; somaDt += dt;
    if (somaDt < 3.5) return;
    qualidadeDefinida = true;
    const fps = amostras / somaDt;
    if (fps < 35 && !window.__dtMax) {
      renderer.setPixelRatio(1);
      renderer.shadowMap.enabled = false;
      scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });
      if (poeira) poeira.visible = false;
      layout();
      document.documentElement.classList.add('cena-leve');
    }
  }

  // ---------- laço ----------
  let visivel = true, primeiro = true;
  new IntersectionObserver(([e]) => { visivel = e.isIntersecting; }).observe(sticky);
  function laco(t) {
    requestAnimationFrame(laco);
    const dt = Math.min(window.__dtMax || 0.05, (t - tAnt) / 1000); tAnt = t;
    if (!visivel && !primeiro) return;
    tempo += dt;
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    const alvo = window.__forceP !== undefined ? window.__forceP : (forcado !== null ? +forcado : progresso());
    dtQuadro = dt;
    if (forcado !== null || window.__forceP !== undefined) pSuave = alvo;
    else { const d = alvo - pSuave; pSuave += Math.sign(d) * Math.min(Math.abs(d), Math.max(0.05, Math.abs(d) * 2.4) * dt); }
    if (folheando && tempo >= proximaEm) {
      if (etapa < ULTIMA) { irPara(etapa + 1, { manual: false }); proximaEm = tempo + pausaDaEtapa(etapa); }
      if (etapa >= ULTIMA) pararFolhear();
    }
    medirQualidade(dt);
    aplicar(pSuave);
    renderer.render(scene, camera);
    if (primeiro) {
      primeiro = false;
      canvas.classList.add('is-pronto');
      setTimeout(() => poster.classList.add('is-oculto'), 700);
    }
  }
  requestAnimationFrame(laco);
  window.__cena = { modelosProntos, irPara, etapa: () => etapa };
}
