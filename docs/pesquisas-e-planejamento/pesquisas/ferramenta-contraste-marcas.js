/* Calcula, para cada cor de marca verificada no simple-icons:
   - qual texto (branco ou preto) passa em cima dela  → o par cor/fundo
   - o contraste da cor crua contra o painel do OAZE
   - uma variante clareada até passar 3:1 no painel, para uso como aro/ponto

   WCAG 2.1: 4.5:1 para texto normal, 3:1 para texto grande e para
   limite de componente de interface. */
'use strict';

const PAINEL = '#132633';   // var(--panel) do v3
const PAGINA = '#0d1821';   // Night Ocean

const MARCAS = [
  ['Netflix', 'netflix', '#E50914', 'Streaming', 'assinatura'],
  ['Spotify', 'spotify', '#1ED760', 'Streaming', 'assinatura'],
  ['YouTube', 'youtube', '#FF0000', 'Streaming', 'assinatura'],
  ['HBO Max', 'hbomax', '#000000', 'Streaming', 'assinatura'],
  ['Max', 'max', '#525252', 'Streaming', 'assinatura'],
  ['Apple Music', 'applemusic', '#FA243C', 'Streaming', 'assinatura'],
  ['iFood', 'ifood', '#EA1D2C', 'Alimentação', null],
  ['Uber', 'uber', '#000000', 'Transporte', null],
  ['Shopee', 'shopee', '#EE4D2D', 'Compras', null],
  ['AliExpress', 'aliexpress', '#FF4747', 'Compras', null],
  ['Carrefour', 'carrefour', '#004E9F', 'Mercado', null],
  ['Nubank', 'nubank', '#820AD1', 'Banco', null],
  ['PicPay', 'picpay', '#21C25E', 'Banco', null],
  ['Mercado Pago', 'mercadopago', '#00B1EA', 'Banco', null],
  ['Vivo', 'vivo', '#415FFF', 'Telefonia', 'assinatura'],
  ['Telefônica', 'telefonica', '#0066FF', 'Telefonia', 'assinatura'],
  ['Shell', 'shell', '#FFD500', 'Combustível', null],
  ["McDonald's", 'mcdonalds', '#FBC817', 'Alimentação', null],
  ['Burger King', 'burgerking', '#D62300', 'Alimentação', null],
  ['Starbucks', 'starbucks', '#006241', 'Café', null],
  ['Google Play', 'googleplay', '#414141', 'Tecnologia', 'assinatura'],
  ['Notion', 'notion', '#000000', 'Tecnologia', 'assinatura'],
  ['Udemy', 'udemy', '#A435F0', 'Educação', null],
  ['Figma', 'figma', '#F24E1E', 'Tecnologia', 'assinatura'],
  ['Gemini', 'googlegemini', '#8E75B2', 'Tecnologia', 'assinatura'],
  ['Anthropic', 'anthropic', '#191919', 'Tecnologia', 'assinatura']
];

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hexOf = ([r, g, b]) => '#' + [r, g, b].map((v) =>
  Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0').toUpperCase()).join('');

function luminancia(hex) {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/* Clareia a cor em direção ao branco até alcançar o alvo de contraste
   contra o fundo. Mistura linear simples: mantém o matiz reconhecível,
   que é o ponto — a cor tem de continuar "parecendo" a marca. */
function clarearAte(hex, fundo, alvo) {
  const base = rgb(hex);
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const c = hexOf(base.map((v) => v + (255 - v) * t));
    if (contraste(c, fundo) >= alvo) return { cor: c, mistura: Math.round(t * 100) };
  }
  return { cor: '#FFFFFF', mistura: 100 };
}

const n = (x) => x.toFixed(2);
console.log('| Marca | Slug | Marca (hex) | Texto em cima | Contraste do texto | Cru no painel | Aro no painel (≥3:1) | Categoria | Recorrente |');
console.log('|---|---|---|---|---|---|---|---|---|');

for (const [nome, slug, hex, categoria, rec] of MARCAS) {
  const comBranco = contraste(hex, '#FFFFFF');
  const comPreto = contraste(hex, '#000000');
  const texto = comBranco >= comPreto ? '#FFFFFF' : '#000000';
  const contrasteTexto = Math.max(comBranco, comPreto);
  const cru = contraste(hex, PAINEL);
  const aro = cru >= 3 ? { cor: hex, mistura: 0 } : clarearAte(hex, PAINEL, 3);
  console.log(`| ${nome} | \`${slug}\` | \`${hex}\` | ${texto === '#FFFFFF' ? 'branco' : 'preto'} | ${n(contrasteTexto)}:1${contrasteTexto < 4.5 ? ' ⚠️' : ''} | ${n(cru)}:1${cru < 3 ? ' ❌' : ' ✅'} | \`${aro.cor}\`${aro.mistura ? ` (+${aro.mistura}% branco)` : ' (serve cru)'} | ${categoria} | ${rec || '—'} |`);
}

console.log('\nPainel ' + PAINEL + ' · Página ' + PAGINA);
console.log('Contraste painel × página: ' + n(contraste(PAINEL, PAGINA)) + ':1');
