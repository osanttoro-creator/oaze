import { describe, expect, it, beforeEach } from 'vitest';
import { setClock, addMonths, monthRange, isoOf } from './dates';
import { brl, parseBRL, splitInstallments } from './money';
import {
  accountBalance, compound, currentBalance, goalStatus, invoice, invoiceDates, invoiceRefOfDate,
  monthProjection, monthTotals, dueItems, monthWave,
} from './calc';
import { emptyWorkspace, demoWorkspace } from './seed';
import { suggestCategory } from './categorize';
import { detectRecurrences } from './recurrence';
import { normalizeMerchant } from './merchant';
import type { Transaction, Workspace } from './types';

const TODAY = new Date(2026, 8, 27, 10); // 27/09/2026

function tx(p: Partial<Transaction> & Pick<Transaction, 'description' | 'amount' | 'date'>): Transaction {
  return { id: Math.random().toString(36).slice(2), kind: 'expense', method: 'pix', confirmed: true, origin: 'manual', createdAt: '', ...p };
}

function ws(): Workspace {
  const w = emptyWorkspace();
  w.accounts.push({ id: 'a1', name: 'Conta', bank: 'itau', openingBalance: 100000, openedAt: '2026-01-01' });
  w.cards.push({ id: 'c1', name: 'Nubank', bank: 'nubank', last4: '4821', network: 'Mastercard', validThru: '06/31', holder: 'X', limit: 500000, closingDay: 28, dueDay: 5, accountId: 'a1' });
  return w;
}

beforeEach(() => setClock(() => TODAY));

describe('money', () => {
  it('parses Brazilian formats into cents', () => {
    expect(parseBRL('45')).toBe(4500);
    expect(parseBRL('45,9')).toBe(4590);
    expect(parseBRL('1.234,56')).toBe(123456);
    expect(parseBRL('R$ 1.234')).toBe(123400);
    expect(parseBRL('')).toBeNull();
  });
  it('installments always add up to the total', () => {
    const parts = splitInstallments(10000, 3);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10000);
    expect(parts).toEqual([3334, 3333, 3333]);
  });
  it('formats without non-breaking spaces', () => {
    expect(brl(123456)).toBe('R$ 1.234,56');
  });
});

describe('dates', () => {
  it('walks months across the year boundary', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(monthRange('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
    expect(isoOf(2026, 1, 31)).toBe('2026-03-03');
  });
});

describe('monthly totals', () => {
  it('a future occurrence of a confirmed recurring item stays pending', () => {
    const w = ws();
    w.transactions.push(tx({ description: 'Internet', amount: 11990, date: '2026-06-30', accountId: 'a1', recurring: { occ: {} } }));
    const t = monthTotals(w, '2026-09');
    expect(t.expense).toBe(0);
    expect(t.pendingExpense).toBe(11990);
    expect(monthTotals(w, '2026-08').expense).toBe(11990);
  });

  it('credit purchases count once: on purchase date, not again when the invoice is paid', () => {
    const w = ws();
    w.transactions.push(tx({ description: 'Mercado', amount: 30000, date: '2026-08-10', method: 'cartao_fisico', cardId: 'c1' }));
    w.invoices['c1|2026-09'] = { payments: [{ id: 'p', at: '2026-09-05', amount: 30000, accountId: 'a1' }] };
    expect(monthTotals(w, '2026-08').expense).toBe(30000);
    expect(monthTotals(w, '2026-08').expenseCredit).toBe(30000);
    expect(monthTotals(w, '2026-09').expense).toBe(0);
    expect(monthTotals(w, '2026-09').invoicesPaid).toBe(30000);
    expect(accountBalance(w, 'a1', '2026-09-27')).toBe(70000);
  });

  it('accounts marked outside the totals keep their balance but leave the month', () => {
    const w = ws();
    w.accounts.push({ id: 'emp', name: 'Empresa', bank: 'inter', openingBalance: 0, openedAt: '2026-01-01', counted: false });
    w.transactions.push(tx({ kind: 'income', description: 'Cliente', amount: 500000, date: '2026-09-10', accountId: 'emp' }));
    expect(monthTotals(w, '2026-09').income).toBe(0);
    expect(accountBalance(w, 'emp')).toBe(500000);
    expect(currentBalance(w)).toBe(100000);
  });

  it('transfers move money without being income or expense', () => {
    const w = ws();
    w.accounts.push({ id: 'a2', name: 'Poupança', bank: 'caixa', openingBalance: 0, openedAt: '2026-01-01' });
    w.transactions.push(tx({ kind: 'transfer', description: 'Reserva', amount: 20000, date: '2026-09-01', accountId: 'a1', toAccountId: 'a2', method: 'transferencia' }));
    expect(monthTotals(w, '2026-09').expense).toBe(0);
    expect(accountBalance(w, 'a1')).toBe(80000);
    expect(accountBalance(w, 'a2')).toBe(20000);
  });
});

describe('invoices', () => {
  it('closing on the 28th, due on the 5th: the October invoice closes in September', () => {
    expect(invoiceDates({ closingDay: 28, dueDay: 5 }, '2026-10')).toEqual({ openDate: '2026-08-29', closeDate: '2026-09-28', dueDate: '2026-10-05' });
    expect(invoiceRefOfDate({ closingDay: 28, dueDay: 5 }, '2026-09-28')).toBe('2026-10');
    expect(invoiceRefOfDate({ closingDay: 28, dueDay: 5 }, '2026-09-29')).toBe('2026-11');
  });
  it('closing on the 2nd, due on the 10th: same month', () => {
    expect(invoiceDates({ closingDay: 2, dueDay: 10 }, '2026-10')).toEqual({ openDate: '2026-09-03', closeDate: '2026-10-02', dueDate: '2026-10-10' });
  });
  it('partial payment leaves the rest open', () => {
    const w = ws();
    w.transactions.push(tx({ description: 'TV', amount: 200000, date: '2026-09-10', cardId: 'c1', method: 'cartao_fisico' }));
    w.invoices['c1|2026-10'] = { payments: [{ id: 'p', at: '2026-09-20', amount: 50000, accountId: 'a1' }] };
    const inv = invoice(w, 'c1', '2026-10');
    expect(inv?.remaining).toBe(150000);
    expect(inv?.partial).toBe(true);
    expect(inv?.paid).toBe(false);
  });
});

describe('projection and due items', () => {
  it('projects the month with pending bills and the invoice due this month', () => {
    const w = ws();
    w.transactions.push(tx({ description: 'Internet', amount: 10000, date: '2026-09-30', accountId: 'a1', confirmed: false }));
    const p = monthProjection(w, '2026-09');
    expect(p.toPay).toBe(10000);
    expect(p.balance).toBe(90000);
    expect(dueItems(w, '2026-09-27', '2026-10-10').map((d) => d.title)).toEqual(['Internet']);
  });
  it('wave accumulates day by day', () => {
    const w = ws();
    w.transactions.push(tx({ kind: 'income', description: 'Salário', amount: 500000, date: '2026-09-05', accountId: 'a1' }));
    w.transactions.push(tx({ description: 'Aluguel', amount: 200000, date: '2026-09-10', accountId: 'a1' }));
    const wave = monthWave(w, '2026-09');
    expect(wave).toHaveLength(30);
    expect(wave[4]?.actual).toBe(500000);
    expect(wave[29]?.actual).toBe(300000);
  });
});

describe('goals and simulator', () => {
  it('compares saved progress with the ideal pace', () => {
    const g = { id: 'g', name: 'Viagem', target: 600000, startedAt: '2026-01-01', deadline: '2026-12', icon: 'sprout', deposits: [{ id: 'd', at: '2026-05-01', amount: 150000 }] };
    const s = goalStatus(g);
    expect(Math.round(s.pct)).toBe(25);
    expect(s.onPace).toBe(false);
    expect(s.monthsLeft).toBe(4);
    expect(s.monthlyNeeded).toBe(112500);
  });
  it('compound interest with a zero rate is just the sum', () => {
    expect(compound(50000, 0, 24)).toEqual({ value: 1200000, invested: 1200000, interest: 0 });
    expect(compound(50000, 10, 24).value).toBeGreaterThan(1200000);
  });
});

describe('automations', () => {
  it('normalizes bank noise out of merchant names', () => {
    expect(normalizeMerchant('PIX COMPRA UBER *TRIP 12/09').key).toBe('uber');
    expect(normalizeMerchant('pagamento').useful).toBe(false);
  });
  it('categorizes by confirmed rule, then history, then known words', () => {
    const w = ws();
    const food = w.categories.find((c) => c.name === 'Alimentação')!.id;
    const health = w.categories.find((c) => c.name === 'Saúde')!.id;
    expect(suggestCategory(w, 'iFood *pedido', 'expense')).toMatchObject({ categoryId: food, source: 'curated' });
    for (let i = 0; i < 3; i++) w.transactions.push(tx({ description: 'Drogasil Centro', amount: 1000, date: `2026-0${6 + i}-02`, categoryId: health }));
    expect(suggestCategory(w, 'DROGASIL CENTRO', 'expense')).toMatchObject({ categoryId: health, source: 'history', confidence: 'high' });
    w.automation.categoryRules.push({ id: 'r', merchantKey: 'drogasil-centro', kind: 'expense', categoryId: food, confirmedAt: '' });
    expect(suggestCategory(w, 'drogasil centro', 'expense')).toMatchObject({ categoryId: food, source: 'rule' });
  });
  it('detects a monthly charge but never an installment plan', () => {
    const w = ws();
    for (let k = 0; k < 3; k++) {
      w.transactions.push(tx({ description: 'Academia', amount: 30000, date: `2026-0${7 + k}-05`, cardId: 'c1' }));
      w.transactions.push(tx({ description: `TV ${k + 1}/3`, amount: 50000, date: `2026-0${7 + k}-12`, cardId: 'c1', installment: { index: k + 1, total: 3, groupId: 'g' } }));
    }
    const found = detectRecurrences(w);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ name: 'Academia', periodicity: 'mensal', typicalDay: 5, nextDate: '2026-10-05' });
  });
});

describe('demo workspace', () => {
  it('lands on the mockup balances and has something for Coco to find', () => {
    const w = demoWorkspace();
    expect(accountBalance(w, 'acc_itau')).toBe(840215);
    expect(accountBalance(w, 'acc_nubank')).toBe(377820);
    expect(detectRecurrences(w).some((r) => r.name.startsWith('Academia'))).toBe(true);
    expect(w.transactions.some((t) => !t.categoryId && t.kind === 'expense')).toBe(true);
    const t = monthTotals(w, '2026-09');
    expect(Number.isInteger(t.income) && Number.isInteger(t.expense)).toBe(true);
  });
});
