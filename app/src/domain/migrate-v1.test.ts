import { beforeEach, describe, expect, it } from 'vitest';
import { setClock } from './dates';
import { migrateV1, unwrapV1 } from './migrate-v1';
import { accountBalance, invoice, monthTotals, reservedFromAccounts, goalStatus } from './calc';

beforeEach(() => setClock(() => new Date(2026, 8, 27, 10)));

// Recorte de um estado real do OAZE 1: valores em reais, fatura no formato antigo e no novo,
// meta com `saved` maior que a soma dos depósitos, conta em dólar fora dos totais.
const v1 = {
  version: 1,
  ownerName: 'Ana',
  activeProfileId: 'prf_pessoal',
  profiles: [
    {
      id: 'prf_pessoal', name: 'Pessoal',
      accounts: [
        { id: 'itau', name: 'Itaú', bank: 'Itaú', last4: '0917', openingBalance: 1000.5, openedAt: '2026-01-01' },
        { id: 'wise', name: 'Wise', bank: 'Wise', openingBalance: 100, openedAt: '2026-01-01', moeda: 'USD', cotacao: 5, considerado: false },
      ],
      cards: [{ id: 'nu', name: 'Nubank', bank: 'nubank', last4: '4821', limit: 5000, closingDay: 28, dueDay: 5, accountId: 'itau' }],
      categories: [
        { id: 'food', name: 'Alimentação', kind: 'expense' },
        { id: 'home', name: 'Moradia', kind: 'expense' },
        { id: 'sal', name: 'Salário', kind: 'income' },
      ],
      transactions: [
        { id: 't1', kind: 'income', description: 'Salário', amount: 5000, date: '2026-09-05', accountId: 'itau', method: 'account', categoryId: 'sal', confirmed: true },
        { id: 't2', kind: 'expense', description: 'Aluguel', amount: 1500, date: '2026-06-05', accountId: 'itau', method: 'account', categoryId: 'home', confirmed: true, recurring: true, occ: { '2026-07': { amount: 1600 }, '2026-08': { confirmed: false } } },
        { id: 't3', kind: 'expense', description: 'Mercado', amount: 300.1, date: '2026-09-10', cardId: 'nu', method: 'card', categoryId: 'food', confirmed: true },
        { id: 't4', kind: 'expense', description: 'TV 1/3', amount: 700, date: '2026-09-12', cardId: 'nu', method: 'card', installment: { total: 3, index: 1, groupId: null } },
      ],
      invoices: {
        'nu|2026-09': { paid: true, paidAt: '2026-09-05', amount: 200, accountId: 'itau' },
        'nu|2026-10': { pagamentos: [{ at: '2026-09-20', amount: 100, accountId: 'itau' }], adiantamentos: { t3: { at: '2026-09-21', amount: 50, accountId: 'itau' } }, quitada: false },
      },
      budgets: { food: 800, home: 0 },
      goals: [{ id: 'g1', name: 'Viagem', target: 6000, saved: 1000, deadline: '2027-07-31', createdAt: '2026-01-10', deposits: [{ at: '2026-03-01', amount: 300, accountId: 'itau' }] }],
      investments: [{ id: 'i1', name: 'Tesouro Selic 2029', type: 'Renda fixa', amount: 2000, date: '2026-02-10', rate: 10.5, currentValue: null }],
      automation: { categoryRules: [{ id: 'r1', merchantKey: 'mercado', kind: 'expense', categoryId: 'food', active: true }], recurrenceDecisions: { rec_x: { status: 'blocked' } } },
    },
    { id: 'prf_pj', name: 'PJ / Autônomo', accounts: [], cards: [], transactions: [] },
  ],
};

describe('migração do OAZE 1', () => {
  it('reconhece o estado cru e o backup exportado, e recusa o resto', () => {
    expect(unwrapV1(v1)).not.toBeNull();
    expect(unwrapV1({ app: 'minhas-financas', version: 1, data: v1 })).not.toBeNull();
    expect(unwrapV1({ app: 'oaze', format: 2 })).toBeNull();
    expect(migrateV1('texto qualquer')).toBeNull();
  });

  it('converte para centavos sem perder nada e deixa de fora o espaço vazio', () => {
    const r = migrateV1(v1)!;
    expect(r.owner).toBe('Ana');
    expect(r.workspaces).toHaveLength(1);
    const w = r.workspaces[0]!;
    expect(r.activeId).toBe(w.id);
    expect(w.accounts.find((a) => a.id === 'itau')).toMatchObject({ openingBalance: 100050, bank: 'itau', debitCard: { last4: '0917' } });
    expect(w.accounts.find((a) => a.id === 'wise')).toMatchObject({ openingBalance: 50000, counted: false });
    expect(w.transactions.find((t) => t.id === 't3')).toMatchObject({ amount: 30010, cardId: 'nu', method: 'nao_informado', origin: 'importado' });
    expect(w.transactions.find((t) => t.id === 't4')?.installment?.groupId).toBeTruthy();
    expect(w.budgets).toEqual({ food: 80000 });
    expect(w.investments[0]).toMatchObject({ type: 'tesouro', amount: 200000, annualRate: 10.5 });
    expect(w.automation.recurrenceDecisions).toEqual({ rec_x: 'dismissed' });
    expect(r.report).toMatchObject({ accounts: 2, cards: 1, transactions: 4, invoices: 2, goals: 1, foreignConverted: 1 });
  });

  it('mantém as regras do calc: ocorrência editada, prevista e fatura com adiantamento', () => {
    const w = migrateV1(v1)!.workspaces[0]!;
    expect(monthTotals(w, '2026-07').expense).toBe(160000);
    expect(monthTotals(w, '2026-08')).toMatchObject({ expense: 0, pendingExpense: 150000 });
    expect(invoice(w, 'nu', '2026-10')?.paidAmount).toBe(15000);
    expect(invoice(w, 'nu', '2026-09')?.paid).toBe(true);
  });

  it('meta: saved é o total, e só o depósito com conta sai da conta', () => {
    const w = migrateV1(v1)!.workspaces[0]!;
    const g = w.goals[0]!;
    expect(goalStatus(g).saved).toBe(100000);
    expect(g.deadline).toBe('2027-07');
    expect(reservedFromAccounts(w)).toBe(30000);
    // 1.000,50 + 5.000 salário − aluguel (jun 1.500, jul 1.600, set 1.500) − faturas 350 − meta 300
    expect(accountBalance(w, 'itau')).toBe(75050);
  });
});
