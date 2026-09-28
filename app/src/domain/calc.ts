/*
  Motor de cálculo — porte do calc.js do OAZE 1, agora em centavos inteiros.

  Convenções contábeis mantidas:
  · Lançamento fixo é um molde: gera uma ocorrência por mês, confirmada uma a uma.
  · Só ocorrência CONFIRMADA entra em total.
  · Fixo com data depois de hoje nasce previsto, mesmo que o molde esteja confirmado.
  · Compra no crédito conta como despesa na data da compra (competência).
    Pagar a fatura não é nova despesa: só tira dinheiro da conta.
  · Conta/cartão "fora dos totais" tem extrato e fatura, mas não entra em receita e despesa.
  · Dinheiro guardado em meta sai da conta, mas volta no patrimônio: reservar não empobrece.
*/
import type { Card, Cents, ID, ISODate, Investment, Transaction, Workspace, YM, Goal, Kind, Method } from './types';
import {
  addDaysISO, addMonths, clampDay, daysBetween, daysInMonth, isoOf, monthEnd, monthRange,
  monthStart, monthsBetween, parseISO, todayISO, todayYM, ymOf, ymParts, yearsBetween,
} from './dates';

const memo = new WeakMap<Workspace, Map<string, unknown>>();

/** O estado é imutável: outro objeto de espaço = outra memória. O dia entra na chave
    porque "confirmado" depende de hoje. */
function remember<T>(w: Workspace, key: string, fn: () => T): T {
  let m = memo.get(w);
  if (!m) {
    m = new Map();
    memo.set(w, m);
  }
  const k = todayISO() + '|' + key;
  if (m.has(k)) return m.get(k) as T;
  const v = fn();
  m.set(k, v);
  return v;
}

export interface Entry {
  key: string;
  txId: ID;
  tx: Transaction;
  ym: YM;
  date: ISODate;
  kind: Kind;
  amount: Cents;
  description: string;
  categoryId?: ID;
  accountId?: ID;
  toAccountId?: ID;
  cardId?: ID;
  method: Method;
  recurring: boolean;
  confirmed: boolean;
  counted: boolean;
}

function occurrenceDate(tx: Transaction, ym: YM): ISODate {
  const base = parseISO(tx.date);
  const { y, m } = ymParts(ym);
  return isoOf(y, m, clampDay(y, m, base.getDate()));
}

function counted(w: Workspace, tx: Transaction): boolean {
  if (tx.cardId) {
    const c = w.cards.find((x) => x.id === tx.cardId);
    return !c || c.counted !== false;
  }
  const id = tx.accountId ?? tx.toAccountId;
  if (!id) return true;
  const a = w.accounts.find((x) => x.id === id);
  return !a || a.counted !== false;
}

function makeEntry(w: Workspace, tx: Transaction, ym: YM, date: ISODate): Entry {
  const o = tx.recurring ? (tx.recurring.occ[ym] ?? {}) : null;
  const confirmed = o
    ? o.confirmed === undefined ? tx.confirmed && date <= todayISO() : o.confirmed
    : tx.confirmed;
  return {
    key: o ? `${tx.id}#${ym}` : tx.id,
    txId: tx.id,
    tx,
    ym,
    date,
    kind: tx.kind,
    amount: o && Number.isFinite(o.amount) ? (o.amount as Cents) : tx.amount,
    description: tx.description,
    categoryId: tx.categoryId,
    accountId: tx.accountId,
    toAccountId: tx.toAccountId,
    cardId: tx.cardId,
    method: tx.method,
    recurring: !!tx.recurring,
    confirmed,
    counted: counted(w, tx),
  };
}

export function earliestDate(w: Workspace): ISODate {
  return remember(w, 'ed', () => {
    let min: ISODate | null = null;
    const consider = (d?: ISODate) => {
      if (d && (!min || d < min)) min = d;
    };
    w.transactions.forEach((t) => consider(t.date));
    w.investments.forEach((i) => consider(i.date));
    w.accounts.forEach((a) => consider(a.openedAt));
    return min ?? monthStart(todayYM());
  });
}

/** Todas as ocorrências em [from, to], fixos expandidos, ordenadas por data. */
export function entries(w: Workspace, from: ISODate, to: ISODate): readonly Entry[] {
  return remember(w, `e|${from}|${to}`, () => {
    const out: Entry[] = [];
    const months = monthRange(ymOf(from), ymOf(to));
    for (const tx of w.transactions) {
      if (!tx.recurring) {
        if (tx.date >= from && tx.date <= to) out.push(makeEntry(w, tx, ymOf(tx.date), tx.date));
        continue;
      }
      const startYM = ymOf(tx.date);
      for (const ym of months) {
        if (monthsBetween(startYM, ym) < 0) continue;
        if (tx.recurring.endYM && monthsBetween(ym, tx.recurring.endYM) < 0) continue;
        if (tx.recurring.occ[ym]?.skipped) continue;
        const date = occurrenceDate(tx, ym);
        if (date >= from && date <= to) out.push(makeEntry(w, tx, ym, date));
      }
    }
    out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.description.localeCompare(b.description, 'pt-BR')));
    return out;
  });
}

export function entriesForMonth(w: Workspace, ym: YM): readonly Entry[] {
  return entries(w, monthStart(ym), monthEnd(ym));
}

export interface MonthTotals {
  income: Cents;
  expense: Cents;
  expenseDebit: Cents;
  expenseCredit: Cents;
  balance: Cents;
  plannedIncome: Cents;
  plannedExpense: Cents;
  plannedBalance: Cents;
  pendingIncome: Cents;
  pendingExpense: Cents;
  pendingCount: number;
  invoicesPaid: Cents;
  /** O que sobra no caixa: débito + faturas pagas, nunca a compra no crédito de novo. */
  cashBalance: Cents;
}

export function monthTotals(w: Workspace, ym: YM): MonthTotals {
  return remember(w, `mt|${ym}`, () => {
    const t: MonthTotals = {
      income: 0, expense: 0, expenseDebit: 0, expenseCredit: 0, balance: 0,
      plannedIncome: 0, plannedExpense: 0, plannedBalance: 0,
      pendingIncome: 0, pendingExpense: 0, pendingCount: 0,
      invoicesPaid: 0, cashBalance: 0,
    };
    for (const e of entriesForMonth(w, ym)) {
      if (e.kind === 'transfer' || !e.counted) continue;
      const isIn = e.kind === 'income';
      if (isIn) t.plannedIncome += e.amount;
      else t.plannedExpense += e.amount;
      if (e.confirmed) {
        if (isIn) t.income += e.amount;
        else {
          t.expense += e.amount;
          if (e.cardId) t.expenseCredit += e.amount;
          else t.expenseDebit += e.amount;
        }
      } else {
        t.pendingCount++;
        if (isIn) t.pendingIncome += e.amount;
        else t.pendingExpense += e.amount;
      }
    }
    t.balance = t.income - t.expense;
    t.plannedBalance = t.plannedIncome - t.plannedExpense;
    t.invoicesPaid = invoicePaymentsInMonth(w, ym);
    t.cashBalance = t.income - t.expenseDebit - t.invoicesPaid;
    return t;
  });
}

export function invoiceKey(cardId: ID, ref: YM): string {
  return `${cardId}|${ref}`;
}

export function invoicePaymentsInMonth(w: Workspace, ym: YM): Cents {
  const from = monthStart(ym);
  const to = monthEnd(ym);
  let total = 0;
  for (const [k, rec] of Object.entries(w.invoices)) {
    const card = w.cards.find((c) => c.id === k.split('|')[0]);
    if (card && card.counted === false) continue;
    for (const p of rec.payments) if (p.at >= from && p.at <= to) total += p.amount;
  }
  return total;
}

/* ------------------------------------------------------------ contas */

export function accountBalance(w: Workspace, accountId: ID, upto: ISODate = todayISO()): Cents {
  return remember(w, `ab|${accountId}|${upto}`, () => {
    const acc = w.accounts.find((a) => a.id === accountId);
    if (!acc) return 0;
    let bal = acc.openedAt <= upto ? acc.openingBalance : 0;
    for (const e of entries(w, earliestDate(w), upto)) {
      if (!e.confirmed) continue;
      if (e.kind === 'income' && e.accountId === accountId) bal += e.amount;
      else if (e.kind === 'expense' && !e.cardId && e.accountId === accountId) bal -= e.amount;
      else if (e.kind === 'transfer') {
        if (e.accountId === accountId) bal -= e.amount;
        if (e.toAccountId === accountId) bal += e.amount;
      }
    }
    for (const rec of Object.values(w.invoices)) {
      for (const p of rec.payments) if (p.accountId === accountId && p.at <= upto) bal -= p.amount;
    }
    for (const iv of w.investments) if (iv.accountId === accountId && iv.date <= upto) bal -= iv.amount;
    for (const g of w.goals) {
      for (const d of g.deposits) if (d.accountId === accountId && d.at <= upto) bal -= d.amount;
    }
    return bal;
  });
}

function countedAccounts(w: Workspace) {
  return w.accounts.filter((a) => !a.archived && a.counted !== false);
}

/** Saldo nas contas agora, só com o que já foi pago ou recebido. */
export function currentBalance(w: Workspace, at: ISODate = todayISO()): Cents {
  return countedAccounts(w).reduce((s, a) => s + accountBalance(w, a.id, at), 0);
}

export interface StatementRow {
  date: ISODate;
  description: string;
  detail: string;
  delta: Cents;
  balance: Cents;
}

export function accountStatement(w: Workspace, accountId: ID, from: ISODate, to: ISODate): StatementRow[] {
  const acc = w.accounts.find((a) => a.id === accountId);
  const rows: Omit<StatementRow, 'balance'>[] = [];
  if (acc && acc.openedAt >= from && acc.openedAt <= to && acc.openingBalance !== 0) {
    rows.push({ date: acc.openedAt, description: 'Saldo inicial da conta', detail: 'abertura', delta: acc.openingBalance });
  }
  const catName = (id?: ID) => w.categories.find((c) => c.id === id)?.name ?? 'Sem categoria';
  const accName = (id?: ID) => w.accounts.find((a) => a.id === id)?.name ?? 'outra conta';
  for (const e of entries(w, from, to)) {
    if (!e.confirmed) continue;
    if (e.kind === 'income' && e.accountId === accountId) rows.push({ date: e.date, description: e.description, detail: catName(e.categoryId), delta: e.amount });
    else if (e.kind === 'expense' && !e.cardId && e.accountId === accountId) rows.push({ date: e.date, description: e.description, detail: catName(e.categoryId), delta: -e.amount });
    else if (e.kind === 'transfer' && e.accountId === accountId) rows.push({ date: e.date, description: `${e.description} → ${accName(e.toAccountId)}`, detail: 'transferência', delta: -e.amount });
    else if (e.kind === 'transfer' && e.toAccountId === accountId) rows.push({ date: e.date, description: `${e.description} ← ${accName(e.accountId)}`, detail: 'transferência', delta: e.amount });
  }
  for (const [k, rec] of Object.entries(w.invoices)) {
    const card = w.cards.find((c) => c.id === k.split('|')[0]);
    for (const p of rec.payments) {
      if (p.accountId !== accountId || p.at < from || p.at > to) continue;
      rows.push({ date: p.at, description: `Pagamento fatura ${card?.name ?? 'cartão'}`, detail: 'fatura', delta: -p.amount });
    }
  }
  for (const iv of w.investments) {
    if (iv.accountId === accountId && iv.date >= from && iv.date <= to) rows.push({ date: iv.date, description: `Aporte: ${iv.name}`, detail: 'investimento', delta: -iv.amount });
  }
  for (const g of w.goals) {
    for (const d of g.deposits) {
      if (d.accountId === accountId && d.at >= from && d.at <= to) rows.push({ date: d.at, description: `Guardado em ${g.name}`, detail: 'meta', delta: -d.amount });
    }
  }
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let running = accountBalance(w, accountId, addDaysISO(from, -1));
  return rows.map((r) => {
    running += r.delta;
    return { ...r, balance: running };
  });
}

/* ------------------------------------------------------------ cartões */

export function invoiceDates(card: Pick<Card, 'closingDay' | 'dueDay'>, ref: YM): { openDate: ISODate; closeDate: ISODate; dueDate: ISODate } {
  const { y, m } = ymParts(ref);
  const dueOffset = card.dueDay > card.closingDay ? 0 : 1;
  const closeAbs = new Date(y, m - dueOffset, 1, 12);
  const cy = closeAbs.getFullYear();
  const cm = closeAbs.getMonth();
  const closeDate = isoOf(cy, cm, clampDay(cy, cm, card.closingDay));
  const prev = new Date(cy, cm - 1, 1, 12);
  const prevClose = isoOf(prev.getFullYear(), prev.getMonth(), clampDay(prev.getFullYear(), prev.getMonth(), card.closingDay));
  return { openDate: addDaysISO(prevClose, 1), closeDate, dueDate: isoOf(y, m, clampDay(y, m, card.dueDay)) };
}

/** Em qual fatura (mês de vencimento) uma compra cai. */
export function invoiceRefOfDate(card: Pick<Card, 'closingDay' | 'dueDay'>, date: ISODate): YM {
  const base = ymOf(date);
  for (let k = -1; k <= 3; k++) {
    const ref = addMonths(base, k);
    const d = invoiceDates(card, ref);
    if (date >= d.openDate && date <= d.closeDate) return ref;
  }
  return base;
}

export interface Invoice {
  card: Card;
  ref: YM;
  items: readonly Entry[];
  openDate: ISODate;
  closeDate: ISODate;
  dueDate: ISODate;
  total: Cents;
  planned: Cents;
  paidAmount: Cents;
  remaining: Cents;
  paid: boolean;
  partial: boolean;
  isOpen: boolean;
  isOverdue: boolean;
}

export function invoice(w: Workspace, cardId: ID, ref: YM): Invoice | null {
  return remember(w, `iv|${cardId}|${ref}`, () => {
    const card = w.cards.find((c) => c.id === cardId);
    if (!card) return null;
    const d = invoiceDates(card, ref);
    const items = entries(w, d.openDate, d.closeDate).filter((e) => e.kind === 'expense' && e.cardId === cardId);
    const total = items.filter((i) => i.confirmed).reduce((s, i) => s + i.amount, 0);
    const planned = items.reduce((s, i) => s + i.amount, 0);
    const rec = w.invoices[invoiceKey(cardId, ref)];
    const paidAmount = (rec?.payments ?? []).reduce((s, p) => s + p.amount, 0);
    const remaining = Math.max(0, planned - paidAmount);
    const paid = !!rec?.settled || (planned > 0 && paidAmount >= planned);
    const today = todayISO();
    return {
      card, ref, items, ...d, total, planned, paidAmount, remaining, paid,
      partial: !paid && paidAmount > 0,
      isOpen: today <= d.closeDate,
      isOverdue: !paid && today > d.dueDate && remaining > 0,
    };
  });
}

/** Limite comprometido: o que falta pagar nas faturas do período. */
export function cardUsed(w: Workspace, cardId: ID): Cents {
  return remember(w, `cu|${cardId}`, () => {
    let used = 0;
    const base = todayYM();
    for (let k = -6; k <= 12; k++) {
      const inv = invoice(w, cardId, addMonths(base, k));
      if (inv && !inv.paid) used += inv.remaining;
    }
    return used;
  });
}

/** A primeira fatura com algo a pagar; se nenhuma tem, a que ainda recebe compras. */
export function currentInvoiceRef(w: Workspace, card: Card, baseYM: YM = todayYM()): YM {
  let open: YM | null = null;
  for (let k = 0; k <= 3; k++) {
    const ref = addMonths(baseYM, k);
    const inv = invoice(w, card.id, ref);
    if (!inv) continue;
    if (!inv.paid && inv.planned > 0) return ref;
    if (!open && inv.isOpen) open = ref;
  }
  return open ?? baseYM;
}

export function openInvoicesTotal(w: Workspace): Cents {
  return w.cards.filter((c) => !c.archived && c.counted !== false).reduce((s, c) => s + cardUsed(w, c.id), 0);
}

/* ------------------------------------------------------------ investimentos */

export function investmentValueAt(inv: Investment, at: ISODate = todayISO()): Cents {
  if (inv.date > at) return 0;
  if (inv.currentValue != null && at >= todayISO()) return inv.currentValue;
  const years = Math.max(0, yearsBetween(inv.date, at));
  return Math.round(inv.amount * Math.pow(1 + inv.annualRate / 100, years));
}

export function investedTotal(w: Workspace, at: ISODate = todayISO()): Cents {
  return w.investments.reduce((s, iv) => s + investmentValueAt(iv, at), 0);
}

export function contributedTotal(w: Workspace, at: ISODate = todayISO()): Cents {
  return w.investments.reduce((s, iv) => s + (iv.date <= at ? iv.amount : 0), 0);
}

export function investmentSeries(w: Workspace, from: YM, to: YM) {
  return monthRange(from, to).map((ym) => ({ ym, value: investedTotal(w, monthEnd(ym)), contributed: contributedTotal(w, monthEnd(ym)) }));
}

export function yearRateToMonth(annualPct: number): number {
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
}

/** Aporte mensal fixo com juros compostos. Devolve o valor final e o total aportado. */
export function compound(monthly: Cents, annualPct: number, months: number, initial: Cents = 0) {
  const i = yearRateToMonth(annualPct);
  let value = initial;
  for (let m = 0; m < months; m++) value = value * (1 + i) + monthly;
  const invested = initial + monthly * months;
  return { value: Math.round(value), invested, interest: Math.round(value) - invested };
}

/* ------------------------------------------------------------ categorias */

export interface CategoryTotal {
  id: ID | '__none__';
  name: string;
  icon: string;
  total: Cents;
  count: number;
  pct: number;
}

export function categoryTotals(w: Workspace, kind: 'income' | 'expense', from: ISODate, to: ISODate): CategoryTotal[] {
  return remember(w, `ct|${kind}|${from}|${to}`, () => {
    const map = new Map<string, { total: number; count: number }>();
    for (const e of entries(w, from, to)) {
      if (e.kind !== kind || !e.confirmed || !e.counted) continue;
      const id = e.categoryId ?? '__none__';
      const row = map.get(id) ?? { total: 0, count: 0 };
      row.total += e.amount;
      row.count++;
      map.set(id, row);
    }
    const grand = [...map.values()].reduce((s, r) => s + r.total, 0);
    return [...map.entries()]
      .map(([id, r]) => {
        const cat = w.categories.find((c) => c.id === id);
        return { id, name: cat?.name ?? 'Sem categoria', icon: cat?.icon ?? 'circle-ellipsis', total: r.total, count: r.count, pct: grand > 0 ? (r.total / grand) * 100 : 0 };
      })
      .sort((a, b) => b.total - a.total);
  });
}

/* ------------------------------------------------------------ o mês */

export interface Projection {
  base: Cents;
  toReceive: Cents;
  toPay: Cents;
  invoices: Cents;
  balance: Cents;
}

/** "E se tudo o que está lançado acontecer?" — compra no crédito sai pela fatura, uma vez. */
export function monthProjection(w: Workspace, ym: YM): Projection {
  return remember(w, `proj|${ym}`, () => {
    const ids = new Set(countedAccounts(w).map((a) => a.id));
    let toReceive = 0;
    let toPay = 0;
    let invoices = 0;
    for (const e of entriesForMonth(w, ym)) {
      if (e.confirmed) continue;
      if (e.kind === 'income' && e.accountId && ids.has(e.accountId)) toReceive += e.amount;
      else if (e.kind === 'expense' && !e.cardId && e.accountId && ids.has(e.accountId)) toPay += e.amount;
      else if (e.kind === 'transfer') {
        const fromIn = !!e.accountId && ids.has(e.accountId);
        const toIn = !!e.toAccountId && ids.has(e.toAccountId);
        if (fromIn && !toIn) toPay += e.amount;
        if (!fromIn && toIn) toReceive += e.amount;
      }
    }
    for (const c of w.cards) {
      if (c.counted === false || c.archived) continue;
      for (let k = -1; k <= 2; k++) {
        const inv = invoice(w, c.id, addMonths(ym, k));
        if (!inv || inv.paid || inv.remaining <= 0) continue;
        if (ymOf(inv.dueDate) === ym) invoices += inv.remaining;
      }
    }
    const base = currentBalance(w, monthEnd(ym));
    return { base, toReceive, toPay, invoices, balance: base + toReceive - toPay - invoices };
  });
}

export interface WavePoint {
  day: number;
  actual: Cents;
  planned: Cents;
}

/** A onda da marca: resultado acumulado do mês, dia a dia (confirmado e previsto). */
export function monthWave(w: Workspace, ym: YM): WavePoint[] {
  return remember(w, `wave|${ym}`, () => {
    const { y, m } = ymParts(ym);
    const n = daysInMonth(y, m);
    const byDay = Array.from({ length: n + 1 }, () => ({ a: 0, p: 0 }));
    for (const e of entriesForMonth(w, ym)) {
      if (e.kind === 'transfer' || !e.counted) continue;
      const d = parseISO(e.date).getDate();
      const v = e.kind === 'income' ? e.amount : -e.amount;
      const slot = byDay[d];
      if (!slot) continue;
      slot.p += v;
      if (e.confirmed) slot.a += v;
    }
    let a = 0;
    let p = 0;
    const out: WavePoint[] = [];
    for (let d = 1; d <= n; d++) {
      a += byDay[d]?.a ?? 0;
      p += byDay[d]?.p ?? 0;
      out.push({ day: d, actual: a, planned: p });
    }
    return out;
  });
}

export interface DueItem {
  key: string;
  date: ISODate;
  title: string;
  detail: string;
  amount: Cents;
  kind: 'expense' | 'income' | 'invoice';
  txId?: ID;
  ym?: YM;
  cardId?: ID;
  method?: Method;
}

const METHOD_LABEL: Record<Method, string> = {
  pix: 'pix', cartao_fisico: 'cartão físico', cartao_virtual: 'cartão virtual', dinheiro: 'dinheiro',
  boleto: 'boleto', debito_automatico: 'débito automático', transferencia: 'transferência', deposito: 'depósito',
  nao_informado: 'forma não informada',
};

export function methodLabel(m: Method): string {
  return METHOD_LABEL[m];
}

/** Vencimentos: o que ainda não foi confirmado e as faturas com saldo, em [from, to]. */
export function dueItems(w: Workspace, from: ISODate, to: ISODate): DueItem[] {
  return remember(w, `due|${from}|${to}`, () => {
    const out: DueItem[] = [];
    for (const e of entries(w, from, to)) {
      if (e.confirmed || e.kind === 'transfer' || e.cardId) continue;
      out.push({ key: e.key, date: e.date, title: e.description, detail: methodLabel(e.method), amount: e.amount, kind: e.kind === 'income' ? 'income' : 'expense', txId: e.txId, ym: e.ym, method: e.method });
    }
    for (const c of w.cards) {
      if (c.archived) continue;
      for (let k = -1; k <= 3; k++) {
        const inv = invoice(w, c.id, addMonths(ymOf(from), k));
        if (!inv || inv.paid || inv.remaining <= 0) continue;
        if (inv.dueDate < from || inv.dueDate > to) continue;
        const [, cm, cd] = inv.closeDate.split('-');
        out.push({ key: `inv|${c.id}|${inv.ref}`, date: inv.dueDate, title: `Fatura ${c.name}`, detail: `fecha ${cd}/${monthShort(Number(cm))}`, amount: inv.remaining, kind: 'invoice', cardId: c.id, ym: inv.ref });
      }
    }
    return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : b.amount - a.amount));
  });
}

function monthShort(m1: number): string {
  return ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][m1 - 1] ?? '';
}

/* ------------------------------------------------------------ orçamento e metas */

export interface BudgetUsage {
  categoryId: ID;
  name: string;
  icon: string;
  used: Cents;
  limit: Cents;
  over: boolean;
}

export function budgetUsage(w: Workspace, ym: YM): BudgetUsage[] {
  const totals = categoryTotals(w, 'expense', monthStart(ym), monthEnd(ym));
  return Object.entries(w.budgets)
    .filter(([, limit]) => limit > 0)
    .map(([categoryId, limit]) => {
      const cat = w.categories.find((c) => c.id === categoryId);
      const used = totals.find((t) => t.id === categoryId)?.total ?? 0;
      return { categoryId, name: cat?.name ?? 'Sem categoria', icon: cat?.icon ?? 'circle-ellipsis', used, limit, over: used > limit };
    })
    .sort((a, b) => b.used / b.limit - a.used / a.limit);
}

export interface GoalStatus {
  saved: Cents;
  remaining: Cents;
  pct: number;
  idealPct: number;
  onPace: boolean;
  monthsLeft: number;
  monthlyNeeded: Cents;
}

export function goalStatus(g: Goal, today: ISODate = todayISO()): GoalStatus {
  const saved = g.deposits.reduce((s, d) => s + d.amount, 0);
  const remaining = Math.max(0, g.target - saved);
  const end = monthEnd(g.deadline);
  const span = Math.max(1, daysBetween(g.startedAt, end));
  const elapsed = Math.min(span, Math.max(0, daysBetween(g.startedAt, today)));
  const pct = g.target > 0 ? (saved / g.target) * 100 : 0;
  const idealPct = (elapsed / span) * 100;
  const monthsLeft = Math.max(1, monthsBetween(ymOf(today), g.deadline) + 1);
  return { saved, remaining, pct, idealPct, onPace: pct + 0.5 >= idealPct, monthsLeft, monthlyNeeded: Math.ceil(remaining / monthsLeft) };
}

/* ------------------------------------------------------------ patrimônio e score */

export function reservedFromAccounts(w: Workspace, at: ISODate = todayISO()): Cents {
  return w.goals.reduce((s, g) => s + g.deposits.filter((d) => d.accountId && d.at <= at).reduce((x, d) => x + d.amount, 0), 0);
}

/** Contas + investido + reservado em metas − faturas ainda não pagas. */
export function netWorth(w: Workspace, at: ISODate = todayISO()): Cents {
  return currentBalance(w, at) + investedTotal(w, at) + reservedFromAccounts(w, at) - openInvoicesTotal(w);
}

/** O número de destaque da carteira: contas + investido. */
export function totalBalance(w: Workspace, at: ISODate = todayISO()): Cents {
  return currentBalance(w, at) + investedTotal(w, at);
}

export function savingsRate(w: Workspace, ym: YM): number | null {
  const t = monthTotals(w, ym);
  return t.income > 0 ? ((t.income - t.expense) / t.income) * 100 : null;
}

export function monthlySeries(w: Workspace, from: YM, to: YM) {
  return monthRange(from, to).map((ym) => {
    const t = monthTotals(w, ym);
    return { ym, income: t.income, expense: t.expense, balance: t.balance, expenseCredit: t.expenseCredit, expenseDebit: t.expenseDebit };
  });
}

export interface ScorePart {
  key: string;
  name: string;
  points: number;
  detail: string;
  ok: boolean;
}

/** OAZE Score 0–100: cinco perguntas verificáveis nos próprios lançamentos, 20 pontos cada. */
export function score(w: Workspace, ym: YM): { total: number; band: string; parts: ScorePart[] } {
  const band01 = (v: number, min: number, max: number) => Math.max(0, Math.min(1, (v - min) / (max - min)));
  const fmtPct = (v: number) => `${Math.round(v)}%`;
  const parts: ScorePart[] = [];

  const rates = [0, 1, 2].map((i) => savingsRate(w, addMonths(ym, -i))).filter((x): x is number => x != null);
  const avg = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
  parts.push({ key: 'poupanca', name: 'Sobra no fim do mês', points: avg == null ? 0 : Math.round(band01(avg, -10, 25) * 20), detail: avg == null ? 'Sem receita registrada nos últimos 3 meses' : `Você guarda ${fmtPct(avg)} do que recebe`, ok: avg != null && avg >= 10 });

  const income = monthTotals(w, ym).income;
  const open = openInvoicesTotal(w);
  const weight = income > 0 ? (open / income) * 100 : open > 0 ? 100 : 0;
  parts.push({ key: 'credito', name: 'Crédito sob controle', points: Math.round(band01(-weight, -80, -10) * 20), detail: open <= 0 ? 'Nenhuma fatura em aberto' : `Faturas em aberto somam ${fmtPct(weight)} da sua receita`, ok: weight <= 30 });

  const avgSpend = [0, 1, 2].map((i) => monthTotals(w, addMonths(ym, -i)).expense).reduce((a, b) => a + b, 0) / 3;
  const available = currentBalance(w, monthEnd(ym)) - open;
  const months = avgSpend > 0 ? available / avgSpend : available > 0 ? 6 : 0;
  parts.push({ key: 'reserva', name: 'Reserva de emergência', points: Math.round(band01(months, 0, 6) * 20), detail: avgSpend <= 0 ? 'Sem gastos para comparar' : `Cobre ${Math.max(0, months).toFixed(1).replace('.', ',')} meses do seu gasto`, ok: months >= 3 });

  const now = netWorth(w, monthEnd(ym));
  const before = netWorth(w, monthEnd(addMonths(ym, -6)));
  const grew = before !== 0 ? ((now - before) / Math.abs(before)) * 100 : now > 0 ? 100 : 0;
  parts.push({ key: 'patrimonio', name: 'Patrimônio crescendo', points: Math.round(band01(grew, -10, 20) * 20), detail: `${grew >= 0 ? 'Subiu' : 'Caiu'} ${fmtPct(Math.abs(grew))} em 6 meses`, ok: grew > 0 });

  const today = todayISO();
  let late = 0;
  for (const c of w.cards) {
    const inv = invoice(w, c.id, currentInvoiceRef(w, c, ym));
    if (inv && !inv.paid && inv.remaining > 0 && inv.dueDate < today) late++;
  }
  const negative = w.accounts.filter((a) => accountBalance(w, a.id, monthEnd(ym)) < 0).length;
  const problems = late + negative;
  parts.push({ key: 'dia', name: 'Contas em dia', points: problems === 0 ? 20 : Math.max(0, 20 - problems * 10), detail: problems === 0 ? 'Nada vencido e nenhuma conta negativa' : `${late ? `${late} fatura(s) vencida(s). ` : ''}${negative ? `${negative} conta(s) negativa(s).` : ''}`.trim(), ok: problems === 0 });

  const total = parts.reduce((a, b) => a + b.points, 0);
  const band = total >= 80 ? 'Excelente' : total >= 60 ? 'Saudável' : total >= 40 ? 'Atenção' : 'Frágil';
  return { total, band, parts };
}

export function yearsWithData(w: Workspace): number[] {
  const set = new Set<number>([Number(todayISO().slice(0, 4))]);
  for (const t of w.transactions) set.add(Number(t.date.slice(0, 4)));
  for (const i of w.investments) set.add(Number(i.date.slice(0, 4)));
  return [...set].sort((a, b) => a - b);
}
