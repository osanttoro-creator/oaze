import type { ISODate, YM } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Relógio injetável: os testes e o modo demonstração fixam "hoje". */
let clock: () => Date = () => new Date();
export function setClock(fn: () => Date): void {
  clock = fn;
}

export function todayISO(): ISODate {
  const d = clock();
  return isoOf(d.getFullYear(), d.getMonth(), d.getDate());
}

export function todayYM(): YM {
  return todayISO().slice(0, 7);
}

/** month é 0-based, como em Date. */
export function isoOf(y: number, month0: number, day: number): ISODate {
  const d = new Date(y, month0, day, 12);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12);
}

export function ymOf(iso: ISODate): YM {
  return iso.slice(0, 7);
}

export function ymParts(ym: YM): { y: number; m: number } {
  const [y, m] = ym.split('-').map(Number);
  return { y: y ?? 1970, m: (m ?? 1) - 1 };
}

export function daysInMonth(y: number, month0: number): number {
  return new Date(y, month0 + 1, 0).getDate();
}

export function clampDay(y: number, month0: number, day: number): number {
  return Math.min(Math.max(1, day), daysInMonth(y, month0));
}

export function addMonths(ym: YM, k: number): YM {
  const { y, m } = ymParts(ym);
  const d = new Date(y, m + k, 1, 12);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function monthsBetween(a: YM, b: YM): number {
  const pa = ymParts(a);
  const pb = ymParts(b);
  return (pb.y - pa.y) * 12 + (pb.m - pa.m);
}

export function monthRange(from: YM, to: YM): YM[] {
  const out: YM[] = [];
  for (let ym = from; monthsBetween(ym, to) >= 0; ym = addMonths(ym, 1)) out.push(ym);
  return out;
}

export function monthStart(ym: YM): ISODate {
  return `${ym}-01`;
}

export function monthEnd(ym: YM): ISODate {
  const { y, m } = ymParts(ym);
  return isoOf(y, m, daysInMonth(y, m));
}

export function addDaysISO(iso: ISODate, days: number): ISODate {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return isoOf(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000);
}

export function yearsBetween(a: ISODate, b: ISODate): number {
  return daysBetween(a, b) / 365.25;
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** "set 2026" ou, curto, "set/26". */
export function monthLabel(ym: YM, short = false): string {
  const { y, m } = ymParts(ym);
  return short ? `${MESES[m]}/${String(y).slice(2)}` : `${MESES[m]} ${y}`;
}

export function monthName(ym: YM): string {
  return MESES_LONGOS[ymParts(ym).m] ?? '';
}

/** "26 set" */
export function dayMonth(iso: ISODate): string {
  const d = parseISO(iso);
  return `${pad(d.getDate())} ${MESES[d.getMonth()]}`;
}

export function isValidISO(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseISO(s).getTime());
}
