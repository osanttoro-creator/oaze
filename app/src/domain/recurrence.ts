/* Detector puro de padrões recorrentes. Sugere; nunca grava nem altera o histórico. */
import type { Cents, ID, ISODate, Kind, Workspace } from './types';
import { normalizeMerchant } from './merchant';
import { addDaysISO, addMonths, clampDay, daysBetween, isoOf, ymOf, ymParts } from './dates';

const CYCLES = [
  { key: 'weekly', min: 6, max: 8, label: 'semanal' },
  { key: 'fortnightly', min: 13, max: 16, label: 'quinzenal' },
  { key: 'monthly', min: 27, max: 33, label: 'mensal' },
  { key: 'bimonthly', min: 55, max: 67, label: 'bimestral' },
  { key: 'quarterly', min: 82, max: 100, label: 'trimestral' },
  { key: 'annual', min: 350, max: 380, label: 'anual' },
] as const;

const MIN_OCCURRENCES = 3;
const MAX_AMOUNT_SPREAD = 0.35;

const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  return a.length ? (a[Math.floor(a.length / 2)] as number) : 0;
};

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export interface RecurrenceCandidate {
  id: string;
  name: string;
  kind: Kind;
  categoryId?: ID;
  accountId?: ID;
  cardId?: ID;
  periodicity: string;
  median: Cents;
  typicalDay: number;
  nextDate: ISODate;
  confidence: 'alta' | 'média';
  evidenceIds: ID[];
  reason: string;
}

export function detectRecurrences(w: Workspace): RecurrenceCandidate[] {
  const groups = new Map<string, { name: string; items: Workspace['transactions'] }>();
  for (const t of w.transactions) {
    const m = normalizeMerchant(t.description);
    // parcela não é assinatura; fatura/estorno não são padrão de gasto
    if (!m.useful || t.kind === 'transfer' || t.recurring || t.installment || !t.confirmed || /fatura|estorno|reembolso/i.test(t.description)) continue;
    const origin = t.cardId ?? t.accountId ?? '';
    const key = [m.key, t.kind, t.categoryId ?? '', origin].join('|');
    const g = groups.get(key) ?? { name: m.name ?? t.description, items: [] };
    g.items.push(t);
    groups.set(key, g);
  }
  const out: RecurrenceCandidate[] = [];
  for (const [base, g] of groups) {
    const items = [...g.items].sort((a, b) => a.date.localeCompare(b.date));
    if (items.length < MIN_OCCURRENCES) continue;
    const gaps = items.slice(1).map((t, i) => daysBetween((items[i] as (typeof items)[number]).date, t.date));
    const gap = median(gaps);
    const cycle = CYCLES.find((c) => gap >= c.min && gap <= c.max);
    if (!cycle || gaps.some((v) => Math.abs(v - gap) > Math.max(3, gap * 0.2))) continue;
    const values = items.map((t) => t.amount);
    const value = median(values);
    const spread = value ? (Math.max(...values) - Math.min(...values)) / value : 1;
    if (spread > MAX_AMOUNT_SPREAD && !(cycle.key === 'monthly' && items.length >= 4)) continue;
    const id = 'rec_' + hash(base + '|' + cycle.key);
    if (w.automation.recurrenceDecisions[id]) continue;
    const last = (items[items.length - 1] as (typeof items)[number]).date;
    const day = Number(last.slice(8, 10));
    let nextDate: ISODate;
    if (cycle.key === 'monthly') {
      const { y, m } = ymParts(addMonths(ymOf(last), 1));
      nextDate = isoOf(y, m, clampDay(y, m, day));
    } else nextDate = addDaysISO(last, gap);
    const first = items[0] as (typeof items)[number];
    out.push({
      id, name: g.name, kind: first.kind, categoryId: first.categoryId, accountId: first.accountId, cardId: first.cardId,
      periodicity: cycle.label, median: value, typicalDay: day, nextDate,
      confidence: items.length >= 4 && spread <= 0.15 ? 'alta' : 'média',
      evidenceIds: items.map((t) => t.id),
      reason: `${items.length} ocorrências, intervalo mediano de ${gap} dias.`,
    });
  }
  return out.sort((a, b) => b.evidenceIds.length - a.evidenceIds.length);
}
