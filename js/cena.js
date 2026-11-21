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
import { tocarVirada, alternarSom, somLigado } from './som-folha.js';

const cena = document.querySelector('.cena');
const sticky = document.getElementById('cenaSticky');
const canvas = document.getElementById('cenaCanvas');
const poster = document.getElementById('cenaPoster');
const ambiente = document.getElementById('cenaAmbiente');
const barra = document.getElementById('cenaBarra');
const caps = [...document.querySelectorAll('.cap')];
const passos = [...document.querySelectorAll('.passo')];
const marcas = [...document.querySelectorAll('.cena-etapas li')];
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglOk() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
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
  const forro = new THREE.MeshStandardMaterial({ color: 0xcdb08a, map: forroCor, roughness: 0.95 });
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

  // folhas
  const paginas = [];
  const matVerso = new THREE.MeshStandardMaterial({ color: 0xdcd7ce, map: papelCor, roughness: 0.95, side: THREE.BackSide });
  const pagW = W - 0.028, pagH = H - 0.03;
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
    }
  });

  // brilho quente que escapa do interior quando a capa se abre
  const brilho = new THREE.PointLight(0xffc98a, 0, 0.9, 1.6);
  brilho.position.set(0.02, 0.02, 0.09); pasta.add(brilho);
  const gc = document.createElement('canvas'); gc.width = gc.height = 128; const gg = gc.getContext('2d');
  const gr = gg.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,214,150,.9)'); gr.addColorStop(.4, 'rgba(255,190,110,.25)'); gr.addColorStop(1, 'rgba(255,190,110,0)');
  gg.fillStyle = gr; gg.fillRect(0, 0, 128, 128);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  halo.scale.set(0.55, 0.55, 1); halo.position.set(-0.02, 0.0, 0.03); pasta.add(halo);

  // sombra de contato sob a pasta (fases iniciais)
  const sc = document.createElement('canvas'); sc.width = sc.height = 128; const sg = sc.getContext('2d');
  const rg = sg.createRadialGradient(64, 64, 4, 64, 64, 62); rg.addColorStop(0, 'rgba(0,0,0,.75)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  sg.fillStyle = rg; sg.fillRect(0, 0, 128, 128);
  const sombraPasta = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.16), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  sombraPasta.rotation.x = -Math.PI / 2; sombraPasta.position.set(0, -0.235, 0);
  scene.add(sombraPasta);

  // ---------- poeira dourada em suspensão ----------
  const NP = mobile() ? 0 : 220;
  const pg = new THREE.BufferGeometry();
  const pp = new Float32Array(NP * 3), ps = new Float32Array(NP);
  for (let i = 0; i < NP; i++) { pp[i * 3] = (Math.random() - .5) * 1.6; pp[i * 3 + 1] = (Math.random() - .5) * 1.0; pp[i * 3 + 2] = (Math.random() - .5) * 1.0; ps[i] = Math.random(); }
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  pg.setAttribute('seed', new THREE.BufferAttribute(ps, 1));
  const poeira = NP === 0 ? null : new THREE.Points(pg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uA: { value: 1 }, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float seed; uniform float uT; uniform float uPx; varying float vA;
      void main(){ vec3 p=position; p.y+=mod(uT*0.012+seed*1.0,1.0)-0.5; p.x+=sin(uT*0.3+seed*20.)*0.02;
      vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=(1.5+seed*2.5)*uPx*(1.2/-mv.z); vA=0.25+0.5*seed; }`,
    fragmentShader: `uniform float uA; varying float vA; void main(){ float d=length(gl_PointCoord-.5); if(d>.5) discard;
      gl_FragColor=vec4(1.,.82,.5, (1.-d*2.)*vA*uA); }`,
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
      let y = 520; for (let i = 0; i < 11; i++) { linha(y, (c.width - M * 2) * (i % 5 === 4 ? .5 : .78 + ((i * 29) % 15) / 100)); y += 46; if (i === 5) y += 30; }
      linha(1110, 300, .3);
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
      traco([[M, 430], [M + 520, 430]], 0.05, 0.45, 4);
      traco(arco(Wc - M - 70, 300, 52, -Math.PI / 2, Math.PI * 1.5), 0.35, 0.8, 5);
      disco(Wc - M - 70, 300, 10, 0.85);
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
      let alvo = desejado[n];
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

  // ---------- botão de som ----------
  const botaoSom = document.getElementById('cenaSom');
  if (botaoSom) {
    const pintar = () => {
      const on = somLigado();
      botaoSom.setAttribute('aria-pressed', String(on));
      botaoSom.setAttribute('aria-label', on ? 'Desativar som das páginas' : 'Ativar som das páginas');
      botaoSom.classList.toggle('is-mudo', !on);
    };
    botaoSom.addEventListener('click', () => { alternarSom(); pintar(); });
    pintar();
  }

  // ---------- coreografia ----------
  // Posições de foco das folhas (relativas à pasta)
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / window.innerWidth - .5) * 2; mouse.ty = (e.clientY / window.innerHeight - .5) * 2;
  }, { passive: true });

  const camPos = new THREE.Vector3(), camAlvo = new THREE.Vector3();
  let tAnt = performance.now(), tempo = 0;
  let pSuave = 0;

  function layout() {
    const r = sticky.getBoundingClientRect();
    const w = r.width, h = r.height;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  layout();
  window.addEventListener('resize', layout);

  function progresso() {
    const r = cena.getBoundingClientRect();
    const total = cena.offsetHeight - sticky.offsetHeight;
    return clamp(-r.top / (total || 1));
  }

  // ---------- linha do tempo (0 → 1) ----------
  // capa 0–.06 · abre .06–.13 · páginas .13–.84 (cinco janelas) · fecha e pousa .84–.93 · contato .93–1
  // capa 0–.045 · gira .045–.09 · capa abre devagar .075–.17 · páginas .17–.86 · fecha e pousa .86–.945 · contato .93–1
  const J0 = 0.17, J1 = 0.86, JW = (J1 - J0) / NC;
  const janelas = conteudos.map((_, k) => [J0 + k * JW, J0 + (k + 1) * JW]);

  function aplicar(p) {
    const asp = camera.aspect, mob = asp < 0.8;
    const dist = Math.max(1.2, 0.40 / (2 * Math.tan(THREE.MathUtils.degToRad(15)) * asp));
    const dist0 = mob ? Math.max(dist, 1.9) : dist;

    const f1 = eio(seg(p, 0.045, 0.095));   // pasta gira de frente
    const fAbre = seg(p, 0.075, 0.17);      // capa abre em ritmo lento
    const abreSuave = fAbre * fAbre * (3 - 2 * fAbre);
    const fPag = seg(p, J0, J1);
    const f3a = eio(seg(p, 0.86, 0.89)); // folhas voltam
    const f3b = eio(seg(p, 0.88, 0.91)); // capa fecha
    const f3c = eio(seg(p, 0.89, 0.95));  // pousa na mesa
    const f4 = eio(seg(p, 0.972, 1.0));    // aproximação final
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
    const aberto = eio(seg(p, 0.075, 0.17)) * (1 - f3a);
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
        m.userData.uP.value = k < NC - 1 ? seg(p, a + JW * 0.02, b - JW * 0.58) : seg(p, a + JW * 0.10, J1 - 0.03);
      }
    });

    // --- câmera ---
    camPos.set(0, 0.02, lerp(dist0, dist, f1)); camAlvo.set(0, 0, 0);
    camPos.z -= f1 * 0.1 + Math.sin(fPag * Math.PI) * 0.02 - (mob ? 0 : eio(seg(p, 0.075, 0.17)) * (1 - f3a) * 0.08);
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
    const acende = eio(seg(p, 0.925, 0.95));
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
    const vFim = seg(p, 0.935, 0.955) * (1 - seg(p, 0.992, 1.0));
    caps[0].style.opacity = vCapa.toFixed(3); caps[0].style.setProperty('--v', vCapa.toFixed(3));
    caps[0].classList.toggle('is-on', vCapa > 0.5);
    caps[1].style.opacity = vFim.toFixed(3); caps[1].style.setProperty('--v', vFim.toFixed(3));
    caps[1].classList.toggle('is-on', vFim > 0.5);
    let ativa = 0;
    passos.forEach((el, k) => {
      const [a, b] = janelas[k];
      const entra = k === 0 ? seg(p, a - JW * 0.06, a + JW * 0.06) : seg(p, a - JW * 0.22, a - JW * 0.06);
      const saiT = k < NC - 1 ? seg(p, b - JW * 0.56, b - JW * 0.44) : seg(p, J1 - 0.012, J1 + 0.004);
      const v = entra * (1 - saiT);
      el.style.opacity = v.toFixed(3);
      el.style.setProperty('--v', v.toFixed(3));
      el.classList.toggle('is-on', v > 0.5);
      if (p >= a) ativa = k + 1;
    });
    if (p > 0.89) ativa = NC + 1;
    marcas.forEach((li, i) => li.classList.toggle('is-on', i === ativa));
    if (marcas[0]) marcas[0].parentElement.style.opacity = (seg(p, 0.04, 0.08) * (1 - seg(p, 0.92, 0.95))).toFixed(3);
    barra.style.transform = `scaleX(${p.toFixed(4)})`;
  }

  // ---------- laço ----------
  let visivel = true, primeiro = true;
  new IntersectionObserver(([e]) => { visivel = e.isIntersecting; }).observe(sticky);
  const forcado = new URLSearchParams(location.search).get('p');
  function laco(t) {
    requestAnimationFrame(laco);
    const dt = Math.min(0.05, (t - tAnt) / 1000); tAnt = t;
    if (!visivel && !primeiro) return;
    tempo += dt;
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    const alvo = window.__forceP !== undefined ? window.__forceP : (forcado !== null ? +forcado : progresso());
    pSuave += (alvo - pSuave) * (forcado !== null || window.__forceP !== undefined ? 1 : 0.13);
    aplicar(pSuave);
    renderer.render(scene, camera);
    if (primeiro) {
      primeiro = false;
      canvas.classList.add('is-pronto');
      setTimeout(() => poster.classList.add('is-oculto'), 700);
    }
  }
  requestAnimationFrame(laco);
  window.__cena = { modelosProntos };
}
