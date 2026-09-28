/* O selo pequeno leva a cor crua da marca. O cartão leva a mesma marca domada:
   só o matiz sobrevive, em brandGradient(), lá no fim do arquivo. */

export interface BankPreset {
  key: string;
  name: string;
  initials: string;
  tile: string;
  ink: string;
}

export const BANKS: BankPreset[] = [
  { key: 'itau', name: 'Itaú', initials: 'it', tile: '#EC7000', ink: '#F0E5CF' },
  { key: 'nubank', name: 'Nubank', initials: 'nu', tile: '#820AD1', ink: '#F0E5CF' },
  { key: 'inter', name: 'Inter', initials: 'in', tile: '#FF7A00', ink: '#F0E5CF' },
  { key: 'bradesco', name: 'Bradesco', initials: 'bd', tile: '#CC092F', ink: '#F0E5CF' },
  { key: 'santander', name: 'Santander', initials: 'sa', tile: '#EC0000', ink: '#F0E5CF' },
  { key: 'bb', name: 'Banco do Brasil', initials: 'bb', tile: '#F8D117', ink: '#0D1821' },
  { key: 'caixa', name: 'Caixa', initials: 'cx', tile: '#005CA9', ink: '#F0E5CF' },
  { key: 'c6', name: 'C6 Bank', initials: 'c6', tile: '#242424', ink: '#F0E5CF' },
  { key: 'btg', name: 'BTG Pactual', initials: 'bt', tile: '#0B2B4C', ink: '#F0E5CF' },
  { key: 'picpay', name: 'PicPay', initials: 'pp', tile: '#11C76F', ink: '#0D1821' },
  { key: 'mercadopago', name: 'Mercado Pago', initials: 'mp', tile: '#00A6E0', ink: '#0D1821' },
  { key: 'xp', name: 'XP', initials: 'xp', tile: '#1B1B1B', ink: '#F0E5CF' },
  { key: 'sicredi', name: 'Sicredi', initials: 'si', tile: '#3FA535', ink: '#0D1821' },
  { key: 'outro', name: 'Outro banco', initials: '··', tile: '#355565', ink: '#F0E5CF' },
];

export function bankOf(key: string): BankPreset {
  return BANKS.find((b) => b.key === key) ?? (BANKS[BANKS.length - 1] as BankPreset);
}

/* ---------------------------------------------------------------
   A COR DA MARCA NO CARTÃO, DOMADA
   ---------------------------------------------------------------
   Antes o cartão sorteava um gradiente pelo id: dois Nubank saíam de
   cores diferentes e um Itaú podia sair verde. Na carteira de verdade
   a cor é o primeiro reconhecimento — você acha o cartão pela cor
   antes de ler o nome dele. O OAZE 1 já fazia isso; foi na passagem
   para cá que se perdeu.

   A marca entra, mas nunca crua: #820AD1 encostado em #EC7000 e
   #F8D117 é exatamente o mosaico de logotipos alheios que a carteira
   não pode virar. O que entra é só o MATIZ. Saturação e claridade são
   fixas, na mesma família dos pastéis que o app já usa nas categorias
   (#5FA99B, #8FB0C0, #A9CFC6): o roxo do Nubank vira lilás empoeirado,
   o laranja do Itaú vira pêssego. Reconhecíveis de relance, e nenhum
   deles gritando.

   A categoria mexe na profundidade, não no matiz: débito mais claro,
   crédito mais fundo. No mesmo banco, o crédito e o débito não se
   confundem.

   Pastel claro pede tinta escura. Quem decide é o contraste medido,
   não o olho — mesma conta que o OAZE 1 fazia. banks.test.ts reprova
   qualquer banco novo cuja tinta não chegue a 4,5:1 nas duas pontas
   do gradiente. */

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Matiz (0–360) e saturação (0–1) da cor crua da marca. */
export function hueSat(hex: string): [number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return [0, 0];
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  const l = (max + min) / 2;
  return [h * 60, d / (1 - Math.abs(2 * l - 1))];
}

export type Hsl = [number, number, number];

export function hsl(h: number, s: number, l: number): string {
  return `hsl(${h.toFixed(0)} ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%)`;
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, bb] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (bb + m) * 255];
}

function luminancia([r, g, b]: [number, number, number]): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contraste(a: [number, number, number], b: [number, number, number]): number {
  const x = luminancia(a);
  const y = luminancia(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export const MILK: [number, number, number] = [240, 229, 207];
export const NIGHT: [number, number, number] = [13, 24, 33];

/** As duas pontas do gradiente, em HSL, para poderem ser medidas. */
export function brandStops(bankKey: string, kind: 'debito' | 'credito'): [Hsl, Hsl] {
  const [h0, s0] = hueSat(bankOf(bankKey).tile);
  /* Marca acromática (C6, XP) não ganha matiz inventado: fica no azul
     mineral do OAZE, e quem separa as duas é o selo do banco. */
  const acromatica = s0 < 0.12;
  const h = acromatica ? 202 : h0;
  const s = acromatica ? 0.16 : 0.34;
  /* Débito é dinheiro que já é seu: mais claro. Crédito é conta em
     aberto: mais fundo. Os dois continuam pastéis. */
  const [alto, baixo] = kind === 'debito' ? [0.83, 0.72] : [0.72, 0.60];
  return [[h, s, alto], [h, s * 0.92, baixo]];
}

export function brandGradient(bankKey: string, kind: 'debito' | 'credito'): string {
  const [a, b] = brandStops(bankKey, kind);
  return `linear-gradient(135deg, ${hsl(...a)} 0%, ${hsl(...b)} 100%)`;
}

/**
 * A tinta do cartão. Mede as DUAS pontas do gradiente e fica com a cor
 * que sobrevive na pior delas — um pastel claro com texto creme é o
 * tipo de coisa que passa no print e some no sol.
 */
export function brandInk(bankKey: string, kind: 'debito' | 'credito'): string {
  const piorMilk = Math.min(...brandStops(bankKey, kind).map((p) => contraste(MILK, hslToRgb(...p))));
  const piorNight = Math.min(...brandStops(bankKey, kind).map((p) => contraste(NIGHT, hslToRgb(...p))));
  return piorNight >= piorMilk ? '#0D1821' : '#F0E5CF';
}

export const CARD_GRADIENTS = [
  'linear-gradient(135deg,#4A7484 0%,#1E3746 100%)',
  'linear-gradient(135deg,#338172 0%,#133A33 100%)',
  'linear-gradient(135deg,#5B6B74 0%,#1D272E 100%)',
  'linear-gradient(135deg,#3F6679 0%,#0F1D27 100%)',
  'linear-gradient(135deg,#566A5E 0%,#1B2722 100%)',
  'linear-gradient(135deg,#46607A 0%,#141F2E 100%)',
];

/** Gradiente estável por id: o mesmo cartão tem sempre a mesma cara. */
export function gradientFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CARD_GRADIENTS[h % CARD_GRADIENTS.length] as string;
}
