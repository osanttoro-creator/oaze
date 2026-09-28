import type { Cents } from './types';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const NUM = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "R$ 1.234,56" com espaço normal (o NBSP do Intl quebra alinhamento em fonte mono). */
export function brl(c: Cents): string {
  return BRL.format(Math.abs(c) / 100).replace(/ /g, ' ');
}

export function brlSigned(c: Cents): string {
  return (c > 0 ? '+ ' : c < 0 ? '− ' : '') + brl(c);
}

export function num(c: Cents): string {
  return NUM.format(c / 100);
}

/** Converte reais (possivelmente float) em centavos, sem erro de ponto flutuante acumulado. */
export function toCents(reais: number): Cents {
  return Math.round(reais * 100);
}

/** Aceita "45", "45,9", "1.234,56", "1234.56". Devolve null quando não há número. */
export function parseBRL(input: string): Cents | null {
  const s = input.trim().replace(/[R$\s]/g, '');
  if (!s) return null;
  let norm: string;
  if (s.includes(',')) norm = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) norm = s.replace(/\./g, '');
  else norm = s;
  const v = Number(norm);
  return Number.isFinite(v) ? toCents(v) : null;
}

/** Divide um total em n parcelas que somam exatamente o total; o resto vai para a primeira. */
export function splitInstallments(total: Cents, n: number): Cents[] {
  const base = Math.floor(total / n);
  const rest = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i === 0 ? rest : 0));
}

export function pct(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0;
}
