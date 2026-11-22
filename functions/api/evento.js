// Recebe as estatísticas anônimas do site e as grava no banco de dados,
// acrescentando a cidade e o estado aproximados, estimados pela rede da Cloudflare.
// O endereço IP do visitante não é repassado nem guardado.
const RPC = 'https://nbhgumvxbjaosdupxzph.supabase.co/rest/v1/rpc/registrar_evento_site';
const CHAVE = 'sb_publishable_T2tLyvBffPszI9rSGF-FfA_kPJTzpGn'; // chave pública: só permite registrar eventos

export async function onRequestPost({ request, waitUntil }) {
  let d;
  try { d = JSON.parse(await request.text()); } catch { return new Response(null, { status: 400 }); }
  if (!d || typeof d.p_tipo !== 'string') return new Response(null, { status: 400 });
  const cf = request.cf || {};
  const pais = cf.country || null;
  const corpo = {
    p_tipo: d.p_tipo, p_pagina: d.p_pagina ?? null, p_detalhe: d.p_detalhe ?? null, p_origem: d.p_origem ?? null,
    p_dispositivo: d.p_dispositivo ?? null, p_visita: d.p_visita ?? null,
    p_cidade: cf.city || null,
    p_estado: pais === 'BR' ? (cf.regionCode || cf.region || null) : (cf.region || null),
    p_pais: pais,
    // coordenadas aproximadas da cidade (duas casas decimais, cerca de 1 km), nunca do aparelho
    p_lat: cf.latitude ? Math.round(parseFloat(cf.latitude) * 100) / 100 : null,
    p_lon: cf.longitude ? Math.round(parseFloat(cf.longitude) * 100) / 100 : null,
    p_operadora: cf.asOrganization || null,
    p_navegador: d.p_navegador ?? null, p_sistema: d.p_sistema ?? null, p_idioma: d.p_idioma ?? null,
    p_tela: d.p_tela ?? null, p_duracao: Number.isFinite(d.p_duracao) ? Math.round(d.p_duracao) : null,
  };
  waitUntil(fetch(RPC, {
    method: 'POST',
    headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  }).catch(() => {}));
  return new Response(null, { status: 204 });
}

export const onRequest = () => new Response(null, { status: 405 });
