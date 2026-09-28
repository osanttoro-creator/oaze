/* Normalização conservadora de estabelecimento. Funções puras. */

const GENERIC = new Set(['', 'compra', 'pagamento', 'pix', 'debito', 'credito', 'transferencia', 'outros']);
const CURATED: { test: RegExp; key: string; name: string }[] = [
  { test: /\bnetflix\b/, key: 'netflix', name: 'Netflix' },
  { test: /\bspotify\b/, key: 'spotify', name: 'Spotify' },
  { test: /\bamazon(?: prime)?\b/, key: 'amazon', name: 'Amazon' },
  { test: /\buber\b/, key: 'uber', name: 'Uber' },
  { test: /\b99\s?(?:pop|app)?\b/, key: '99', name: '99' },
  { test: /\bifood\b/, key: 'ifood', name: 'iFood' },
];

export function stripAccents(v: string): string {
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function cleanDescription(desc: string): string {
  return stripAccents(desc)
    .toLowerCase()
    .replace(/\b(?:pix|compra|debito|credito|pagamento|transferencia|ted|doc)\b[\s:*-]*/g, ' ')
    .replace(/\b(?:nsu|id|aut|cod(?:igo)?)\s*[:#-]?\s*[a-z0-9-]{5,}\b/g, ' ')
    .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, ' ')
    .replace(/\b(?:cartao|final)\s*\*{0,4}\d{2,4}\b/g, ' ')
    .replace(/\b\d{6,}\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface Merchant {
  normalized: string;
  key: string | null;
  name: string | null;
  useful: boolean;
}

export function normalizeMerchant(desc: string): Merchant {
  const clean = cleanDescription(desc);
  if (!clean || GENERIC.has(clean) || /^\d+$/.test(clean) || clean.length < 2) return { normalized: clean, key: null, name: null, useful: false };
  const curated = CURATED.find((c) => c.test.test(clean));
  if (curated) return { normalized: clean, key: curated.key, name: curated.name, useful: true };
  const tokens = clean.split(' ').filter((t) => t.length > 1 && !GENERIC.has(t));
  if (!tokens.length) return { normalized: clean, key: null, name: null, useful: false };
  // No máximo três palavras: sem similaridade frouxa, que juntaria lojas diferentes.
  const key = tokens.slice(0, 3).join('-');
  return {
    normalized: clean,
    key,
    name: tokens.slice(0, 3).map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(' '),
    useful: key.length >= 3,
  };
}
