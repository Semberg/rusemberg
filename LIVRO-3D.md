# Livro 3D da abertura — arquivo para projeto futuro

Versão guardada em 24/11/2026, retirada do site principal a pedido do titular.
Este ramo (`livro-3d`, marco `livro-3d-v1`) contém o site completo com o livro funcionando.

## Onde está
- `js/cena.js` — cena Three.js (pasta/livro, selo, fita, folhas, poeira, câmera, rolagem)
- `js/som-folha.js` — sons de virada, capa e fechamento
- `css/style.css` — blocos "CENA DE ABERTURA", "CENA CLARA" e abas/botões da cena
- `index.html` — seção `.cena` (capa, páginas em HTML, cartão final, abas)
- `assets/3d/` — texturas (couro, papel, forro, madeira), `emblema_mascara.png`,
  `selo_relevo.png` (selo circular para o relevo), modelos `livros.glb` e `caneta.glb`
- `assets/img/cena-poster*.webp` — imagens estáticas (versão sem WebGL)

## Parâmetros principais
**Visual (identidade do escritório)**
- Fundo da cena: off-white #FAF8F3 → bege #ECE6DA; vinheta bege
- Couro da capa: cor 0x46484d sobre textura de couro, sheen 0.6, clearcoat 0.12
- Rubrica dourada: 0xd7b25e, metalness 1, roughness 0.26, faixa de reflexo animada
- Guarda interna: 0xe6ddcc sobre textura de papel
- Selo: cera ouro 0xd9a93c (metalness 0.9, roughness 0.3, clearcoat 0.45),
  raio 0.021, altura 0.0042, contorno irregular (senóides 5/11/19),
  selo circular da marca em relevo (bumpScale 3.2, emissive 0x4a3208 × 0.55),
  posição y = -0.057 na borda direita
- Fita: 0x8f6f28, metalness 0.55, sheen 0.6, largura 0.0062, passa por capa, borda e verso
- Poeira: 240 pontos no computador, 90 no celular, cor (0.72, 0.55, 0.17),
  mistura normal, tamanho 2.2–5.4 px

**Geometria**
- Pasta W 0.27 × H 0.35 × T 0.007; dobradiça da capa em z 0.022
- Miolo: W − 0.02 × H − 0.014; folhas articuladas em x = −W/2 + 0.014
- Capa abre até 180°; folhas viradas pousam sobre ela (z = 0.022 + T/2 + 0.0009 + k·0.0011)
  com curva de calha (GUT 0.011) até a costura

**Tempo e rolagem**
- Linha do tempo: A0 0.075 / A1 0.17 (abertura), J0 0.17 / J1 0.78 (folhas),
  C0 0.79 / C1 0.915 (fechamento); DUR_ABRE 3.6 s (3.1 celular), DUR_VIRADA 2.3 s (1.9)
- Etapas: capa, apresentação, análise, estratégia, orientação, áreas, formação, contato
- `livroOcupado()` retém a rolagem até capa/folhas/fechamento chegarem à etapa
  (foi esse comportamento que tornou o livro cansativo; num projeto futuro,
  preferir rolagem livre com folhas aceleradas e botão de pular)

## Como reaproveitar
`git checkout livro-3d` e copiar os arquivos acima. Para ver funcionando localmente:
`python3 -m http.server` na raiz e abrir `http://localhost:8000/`.
