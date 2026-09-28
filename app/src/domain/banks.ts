/* A cor do banco vive só no selo pequeno. O cartão em si fica na paleta OAZE,
   senão a carteira vira um mosaico de marcas alheias. */

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
