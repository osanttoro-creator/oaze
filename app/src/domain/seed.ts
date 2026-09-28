import type { Category, Cents, ISODate, Method, Transaction, Workspace, ID } from './types';
import { addMonths, clampDay, isoOf, todayISO, todayYM, ymParts, addDaysISO } from './dates';
import { accountBalance, invoice } from './calc';
import { uid } from './ids';

const CATS: [string, Category['kind'], string][] = [
  ['Moradia', 'expense', 'house'],
  ['Alimentação', 'expense', 'utensils'],
  ['Transporte', 'expense', 'car'],
  ['Lazer', 'expense', 'gamepad-2'],
  ['Saúde', 'expense', 'heart-pulse'],
  ['Assinaturas', 'expense', 'repeat'],
  ['Compras', 'expense', 'shopping-bag'],
  ['Outros', 'expense', 'circle-ellipsis'],
  ['Salário', 'income', 'banknote'],
  ['Rendimentos', 'income', 'trending-up'],
  ['Outras receitas', 'income', 'circle-ellipsis'],
];

export function defaultCategories(): Category[] {
  return CATS.map(([name, kind, icon]) => ({ id: uid('cat'), name, kind, icon }));
}

export function emptyWorkspace(name = 'Pessoal'): Workspace {
  return {
    id: uid('ws'), name, accounts: [], cards: [], categories: defaultCategories(), transactions: [],
    invoices: {}, investments: [], goals: [], budgets: {},
    automation: { categoryRules: [], recurrenceDecisions: {} },
    coco: { memory: [] },
  };
}

/** Dia `d` do mês `ym + k`, preso ao tamanho do mês. */
function dayOf(k: number, d: number): ISODate {
  const { y, m } = ymParts(addMonths(todayYM(), k));
  return isoOf(y, m, clampDay(y, m, d));
}

/**
 * Espaço de exemplo com a Ana do mockup. Datas relativas a hoje, para a
 * demonstração nunca parecer abandonada. Marcado demo: nunca sincroniza.
 */
export function demoWorkspace(): Workspace {
  const w = emptyWorkspace('Exemplo · Ana');
  w.demo = true;
  const cat = (n: string) => (w.categories.find((c) => c.name === n) as Category).id;
  const today = todayISO();
  const past = (days: number) => addDaysISO(today, -days);

  const itau = { id: 'acc_itau', name: 'Itaú', bank: 'itau', tint: 0, debitCard: { last4: '0917', network: 'Visa' as const, validThru: '09/29' }, openingBalance: 0, openedAt: dayOf(-6, 1) };
  const nuConta = { id: 'acc_nubank', name: 'Nubank', bank: 'nubank', tint: 1, debitCard: { last4: '2204', network: 'Mastercard' as const, validThru: '03/30' }, openingBalance: 0, openedAt: dayOf(-6, 1) };
  w.accounts.push(itau, nuConta);
  w.cards.push(
    { id: 'card_inter', name: 'Inter', bank: 'inter', tint: 2, last4: '1130', network: 'Mastercard', validThru: '11/28', holder: 'ANA SOUZA', limit: 350000, closingDay: 2, dueDay: 10, accountId: itau.id },
    { id: 'card_nubank', name: 'Nubank', bank: 'nubank', tint: 3, last4: '4821', network: 'Mastercard', validThru: '06/31', holder: 'ANA SOUZA', limit: 600000, closingDay: 28, dueDay: 5, accountId: itau.id },
  );

  const tx = (p: Partial<Transaction> & { description: string; amount: Cents; date: ISODate; method: Method; kind?: Transaction['kind'] }): Transaction => ({
    id: uid('tx'), kind: 'expense', confirmed: p.date <= today, origin: 'manual', createdAt: new Date().toISOString(), ...p,
  });
  const T = w.transactions;

  // fixos
  T.push(tx({ kind: 'income', description: 'Salário', amount: 650000, date: dayOf(-5, 25), method: 'transferencia', accountId: itau.id, categoryId: cat('Salário'), confirmed: true, recurring: { occ: {} } }));
  T.push(tx({ description: 'Aluguel', amount: 185000, date: dayOf(-5, 5), method: 'pix', accountId: itau.id, categoryId: cat('Moradia'), confirmed: true, recurring: { occ: {} } }));
  T.push(tx({ description: 'Internet', amount: 11990, date: dayOf(-5, 30), method: 'debito_automatico', accountId: itau.id, categoryId: cat('Assinaturas'), confirmed: true, recurring: { occ: {} } }));
  T.push(tx({ description: 'Spotify', amount: 2190, date: dayOf(-5, 14), method: 'cartao_virtual', cardId: 'card_nubank', categoryId: cat('Assinaturas'), confirmed: true, recurring: { occ: {} } }));

  // academia: cobrada todo mês, mas ainda não marcada como fixa — a Coco percebe o padrão
  for (let k = -3; k <= 0; k++) {
    const d = dayOf(k, 5);
    if (d <= today) T.push(tx({ description: 'Academia Corpo Livre', amount: 30000, date: d, method: 'cartao_virtual', cardId: 'card_inter', categoryId: cat('Assinaturas') }));
  }

  // histórico dos meses anteriores: dá base para categorias aprendidas e comparação
  const history: [string, number, string, Method, ID | undefined, ID | undefined][] = [
    ['Mercado Pão de Açúcar', 31240, 'Alimentação', 'cartao_fisico', 'card_nubank', undefined],
    ['Uber', 2790, 'Transporte', 'cartao_virtual', 'card_nubank', undefined],
    ['Restaurante Coco Bambu', 13800, 'Alimentação', 'cartao_fisico', 'card_inter', undefined],
    ['Posto Shell', 18000, 'Transporte', 'cartao_fisico', 'card_inter', undefined],
    ['Farmácia Pague Menos', 5890, 'Saúde', 'cartao_fisico', undefined, itau.id],
    ['iFood', 6450, 'Alimentação', 'cartao_virtual', 'card_nubank', undefined],
    ['Cinema', 5600, 'Lazer', 'cartao_virtual', 'card_inter', undefined],
  ];
  for (let k = -3; k <= -1; k++) {
    history.forEach(([description, amount, c, method, cardId, accountId], i) => {
      const jitter = 1 + ((i * 7 + k * 3) % 9) / 100;
      T.push(tx({ description, amount: Math.round(amount * jitter), date: dayOf(k, 3 + i * 4), method, cardId, accountId, categoryId: cat(c) }));
    });
    T.push(tx({ kind: 'income', description: 'Pix recebido', amount: 18000 + k * -1500, date: dayOf(k, 9), method: 'pix', accountId: nuConta.id, categoryId: cat('Outras receitas') }));
  }

  // mês atual (o mockup)
  T.push(tx({ description: 'Mercado Pão de Açúcar', amount: 28640, date: past(1), method: 'cartao_fisico', cardId: 'card_nubank', categoryId: cat('Alimentação') }));
  T.push(tx({ description: 'Uber *trip', amount: 3890, date: past(3), method: 'cartao_virtual', cardId: 'card_nubank' }));
  T.push(tx({ kind: 'income', description: 'Freela identidade visual', amount: 135000, date: past(4), method: 'pix', accountId: nuConta.id, categoryId: cat('Rendimentos') }));
  T.push(tx({ description: 'Farmácia Pague Menos', amount: 7420, date: past(5), method: 'cartao_fisico', accountId: itau.id }));
  T.push(tx({ description: 'Cinema', amount: 6200, date: past(6), method: 'cartao_virtual', cardId: 'card_inter', categoryId: cat('Lazer') }));
  T.push(tx({ description: 'Feira', amount: 4800, date: past(7), method: 'dinheiro', categoryId: cat('Alimentação') }));
  T.push(tx({ description: 'Livraria Cultura', amount: 12990, date: past(9), method: 'cartao_fisico', cardId: 'card_inter', categoryId: cat('Compras') }));
  T.push(tx({ description: 'Restaurante Coco Bambu', amount: 14810, date: past(13), method: 'cartao_fisico', cardId: 'card_inter' }));
  T.push(tx({ description: 'Supermercado Extra', amount: 124450, date: past(18), method: 'cartao_fisico', cardId: 'card_nubank', categoryId: cat('Alimentação') }));
  T.push(tx({ kind: 'income', description: 'Pix recebido', amount: 18000, date: past(19), method: 'pix', accountId: nuConta.id, categoryId: cat('Outras receitas') }));
  T.push(tx({ description: 'Uber', amount: 2650, date: past(11), method: 'cartao_virtual', cardId: 'card_nubank' }));

  // passagem parcelada em 4x, a 2ª cai neste mês
  const group = uid('grp');
  for (let i = 0; i < 4; i++) {
    T.push(tx({ description: `Passagem aérea ${i + 1}/4`, amount: 41250, date: dayOf(i - 1, 12), method: 'cartao_virtual', cardId: 'card_nubank', categoryId: cat('Lazer'), installment: { index: i + 1, total: 4, groupId: group } }));
  }

  // faturas antigas pagas pela conta Itaú no vencimento
  for (let k = -3; k <= 0; k++) {
    for (const card of w.cards) {
      const ref = addMonths(todayYM(), k);
      const due = dayOf(k, card.dueDay);
      if (due >= today) continue;
      w.invoices[`${card.id}|${ref}`] = { payments: [{ id: uid('pay'), at: due, amount: 0, accountId: itau.id }], settled: true };
    }
  }

  // investimentos: aportes mensais, o último saiu da conta Nubank
  for (let k = -11; k <= 0; k++) {
    const d = dayOf(k, 10);
    if (d > today) continue;
    w.investments.push({ id: uid('inv'), name: 'Tesouro Selic 2029', type: 'tesouro', amount: 25000, date: d, annualRate: 10.4, accountId: k === 0 ? nuConta.id : undefined });
  }
  w.investments.push({ id: uid('inv'), name: 'CDB 110% do CDI', type: 'cdb', amount: 190000, date: dayOf(-8, 2), annualRate: 11.4 });
  w.investments.push({ id: uid('inv'), name: 'Fundo imobiliário HGLG11', type: 'fii', amount: 100000, date: dayOf(-4, 15), annualRate: 0, currentValue: 100000 });

  // metas: começaram em meses diferentes, cada uma num ritmo
  const goal = (name: string, target: number, saved: number, startK: number, deadlineK: number, icon: string) => {
    const deposits = [];
    const n = Math.max(1, -startK);
    for (let i = 0; i < n; i++) deposits.push({ id: uid('dep'), at: dayOf(startK + i, 26), amount: Math.round(saved / n) });
    w.goals.push({ id: uid('goal'), name, target, startedAt: dayOf(startK, 1), deadline: addMonths(todayYM(), deadlineK), icon, deposits });
  };
  goal('Reserva de emergência', 1500000, 900000, -10, 15, 'piggy-bank');
  goal('Viagem para a Chapada', 600000, 210000, -8, 10, 'sprout');
  goal('Notebook novo', 450000, 180000, -4, 6, 'target');

  w.budgets[cat('Alimentação')] = 100000;
  w.budgets[cat('Transporte')] = 60000;
  w.budgets[cat('Lazer')] = 80000;
  w.budgets[cat('Assinaturas')] = 50000;

  w.automation.categoryRules.push({ id: uid('rule'), merchantKey: 'mercado-pao-de', kind: 'expense', categoryId: cat('Alimentação'), confirmedAt: dayOf(-2, 3) });
  w.coco.memory.push(
    { id: uid('mem'), title: 'Salário cai no dia 25', detail: 'uso para prever a sobra do mês', source: 'padrao', createdAt: dayOf(-3, 25) },
    { id: uid('mem'), title: 'Lembretes às 9h', detail: 'é quando você mais abre o app', source: 'padrao', createdAt: dayOf(-2, 1) },
    { id: uid('mem'), title: 'A viagem é prioridade', detail: 'você me disse, e uso para ordenar sugestões de metas', source: 'voce-disse', createdAt: dayOf(-1, 12) },
  );

  fillInvoicePayments(w);
  calibrate(w, itau.id, 840215);
  calibrate(w, nuConta.id, 377820);
  return w;
}

/** Pagamentos das faturas antigas = o que a fatura realmente somou. */
function fillInvoicePayments(w: Workspace) {
  for (const [key, rec] of Object.entries(w.invoices)) {
    const [cardId, ref] = key.split('|') as [ID, string];
    const total = invoiceTotalFor(w, cardId, ref);
    const pay = rec.payments[0];
    if (pay) pay.amount = total;
    if (total === 0) delete w.invoices[key];
  }
}

function invoiceTotalFor(w: Workspace, cardId: ID, ref: string): Cents {
  return invoice({ ...w }, cardId, ref)?.planned ?? 0;
}

/** Ajusta o saldo inicial para a conta terminar hoje no valor do mockup. */
function calibrate(w: Workspace, accountId: ID, target: Cents) {
  const acc = w.accounts.find((a) => a.id === accountId);
  if (!acc) return;
  const now = accountBalance({ ...w }, accountId, todayISO());
  acc.openingBalance += target - now;
}
