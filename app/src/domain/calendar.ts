import { dueItems, entries, monthTotals } from './calc';
import { addDaysISO, addMonths, monthEnd, monthStart, parseISO, ymOf, ymParts } from './dates';
import type { Cents, ID, ISODate, Workspace, YM } from './types';

export interface CalendarEvent {
  key: string;
  date: ISODate;
  title: string;
  amount: Cents;
  kind: 'income' | 'expense' | 'invoice';
  confirmed: boolean;
  counted: boolean;
  txId?: ID;
  cardId?: ID;
  detail: string;
}

/** One source of events for month and week. Invoices are due dates, not a second expense. */
export function calendarEvents(w: Workspace, from: ISODate, to: ISODate): CalendarEvent[] {
  const rows: CalendarEvent[] = entries(w, from, to)
    .filter((e) => e.kind !== 'transfer')
    .map((e) => ({
      key: e.key, date: e.date, title: e.description, amount: e.amount,
      kind: e.kind === 'income' ? 'income' as const : 'expense' as const,
      confirmed: e.confirmed, counted: e.counted, txId: e.txId,
      detail: w.categories.find((c) => c.id === e.categoryId)?.name ?? 'Lançamento',
    }));
  for (const due of dueItems(w, from, to)) {
    if (due.kind !== 'invoice') continue;
    rows.push({
      key: due.key, date: due.date, title: due.title, amount: due.amount,
      kind: 'invoice', confirmed: false, counted: false, cardId: due.cardId, detail: 'Vencimento da fatura',
    });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'pt-BR'));
}

export function eventsForMonth(w: Workspace, ym: YM): CalendarEvent[] {
  return calendarEvents(w, monthStart(ym), monthEnd(ym));
}

export function weekDays(date: ISODate): [ISODate, ISODate, ISODate, ISODate, ISODate, ISODate, ISODate] {
  const mondayOffset = (parseISO(date).getDay() + 6) % 7;
  const monday = addDaysISO(date, -mondayOffset);
  return [monday, ...([1, 2, 3, 4, 5, 6].map((i) => addDaysISO(monday, i)) as [ISODate, ISODate, ISODate, ISODate, ISODate, ISODate])];
}

export interface CalendarMonth {
  ym: YM;
  income: Cents;
  expense: Cents;
  pending: number;
}

export function calendarYear(w: Workspace, year: number): CalendarMonth[] {
  const january = `${year}-01`;
  return Array.from({ length: 12 }, (_, i) => {
    const ym = addMonths(january, i);
    const total = monthTotals(w, ym);
    return {
      ym, income: total.income, expense: total.expense, pending: total.pendingCount,
    };
  });
}

export function gridOffset(ym: YM): number {
  const { y, m } = ymParts(ym);
  return (new Date(y, m, 1, 12).getDay() + 6) % 7;
}

export function confirmedTotals(events: readonly CalendarEvent[]): { income: Cents; expense: Cents; pending: number } {
  return events.reduce((acc, event) => {
    if (event.kind === 'invoice' || !event.counted) return acc;
    if (!event.confirmed) acc.pending++;
    else if (event.kind === 'income') acc.income += event.amount;
    else acc.expense += event.amount;
    return acc;
  }, { income: 0, expense: 0, pending: 0 });
}

/** Keeps the chosen day valid when moving from a long month to February. */
export function moveSelectedMonth(date: ISODate, delta: number): ISODate {
  const target = addMonths(ymOf(date), delta);
  const day = Math.min(Number(date.slice(8)), Number(monthEnd(target).slice(8)));
  return `${target}-${String(day).padStart(2, '0')}`;
}

