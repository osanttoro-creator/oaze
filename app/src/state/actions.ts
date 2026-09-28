import type { Account, Card, Cents, ID, ISODate, Method, Transaction, Workspace, YM } from '../domain/types';
import { uid } from '../domain/ids';
import { splitInstallments } from '../domain/money';
import { addMonths, clampDay, isoOf, todayISO, ymOf, ymParts } from '../domain/dates';
import { invoiceKey } from '../domain/calc';
import { normalizeMerchant } from '../domain/merchant';
import type { Entry } from '../domain/calc';
import type { RecurrenceCandidate } from '../domain/recurrence';
import { getState, mutateWorkspace, setState } from './store';

/** Toda ação desfazível devolve a própria volta. */
export type Undo = () => void;

export type EntryType = 'despesa' | 'receita' | 'transf' | 'aporte';

export interface NewEntry {
  type: EntryType;
  amount: Cents;
  description: string;
  date: ISODate;
  categoryId?: ID;
  method: Method;
  accountId?: ID;
  toAccountId?: ID;
  cardId?: ID;
  installments: number;
  paid: boolean;
  fixed: boolean;
  origin?: Transaction['origin'];
}

export function addEntry(e: NewEntry): { ids: ID[]; undo: Undo } {
  const ids: ID[] = [];
  const now = new Date().toISOString();
  mutateWorkspace((w) => {
    if (e.type === 'aporte') {
      const id = uid('inv');
      w.investments.push({ id, name: e.description || 'Aporte', type: 'tesouro', amount: e.amount, date: e.date, annualRate: 10, accountId: e.accountId });
      ids.push(id);
      return;
    }
    const kind = e.type === 'receita' ? 'income' : e.type === 'transf' ? 'transfer' : 'expense';
    const base: Omit<Transaction, 'id' | 'amount' | 'date' | 'description'> = {
      kind, categoryId: kind === 'transfer' ? undefined : e.categoryId, method: e.method,
      accountId: e.cardId ? undefined : e.accountId, toAccountId: kind === 'transfer' ? e.toAccountId : undefined,
      cardId: kind === 'expense' ? e.cardId : undefined, confirmed: e.paid, origin: e.origin ?? 'manual', createdAt: now,
    };
    if (kind === 'expense' && e.cardId && e.installments > 1) {
      const group = uid('grp');
      const day = Number(e.date.slice(8, 10));
      splitInstallments(e.amount, e.installments).forEach((amount, i) => {
        const { y, m } = ymParts(addMonths(ymOf(e.date), i));
        const id = uid('tx');
        w.transactions.push({ ...base, id, amount, date: isoOf(y, m, clampDay(y, m, day)), description: `${e.description} ${i + 1}/${e.installments}`, installment: { index: i + 1, total: e.installments, groupId: group } });
        ids.push(id);
      });
      return;
    }
    const id = uid('tx');
    w.transactions.push({ ...base, id, amount: e.amount, date: e.date, description: e.description, recurring: e.fixed ? { occ: {} } : undefined });
    ids.push(id);
  });
  return { ids, undo: () => removeItems(ids) };
}

export function removeItems(ids: ID[]): void {
  const set = new Set(ids);
  mutateWorkspace((w) => {
    w.transactions = w.transactions.filter((t) => !set.has(t.id));
    w.investments = w.investments.filter((i) => !set.has(i.id));
  });
}

/** Confirma ou desconfirma. Fixo confirma só a ocorrência daquele mês. */
export function toggleConfirmed(entry: Pick<Entry, 'txId' | 'ym' | 'recurring' | 'confirmed'>): void {
  mutateWorkspace((w) => {
    const t = w.transactions.find((x) => x.id === entry.txId);
    if (!t) return;
    if (entry.recurring && t.recurring) t.recurring.occ[entry.ym] = { ...t.recurring.occ[entry.ym], confirmed: !entry.confirmed };
    else t.confirmed = !t.confirmed;
  });
}

export function deleteTransaction(id: ID, wholeGroup = false): Undo {
  let removed: Transaction[] = [];
  mutateWorkspace((w) => {
    const t = w.transactions.find((x) => x.id === id);
    const group = wholeGroup && t?.installment ? t.installment.groupId : null;
    removed = w.transactions.filter((x) => x.id === id || (group && x.installment?.groupId === group));
    w.transactions = w.transactions.filter((x) => !removed.includes(x));
  });
  return () => mutateWorkspace((w) => void w.transactions.push(...removed));
}

export function payInvoice(cardId: ID, ref: YM, amount: Cents, accountId: ID | undefined, at: ISODate = todayISO()): Undo {
  const id = uid('pay');
  mutateWorkspace((w) => {
    const k = invoiceKey(cardId, ref);
    const rec = w.invoices[k] ?? { payments: [] };
    rec.payments.push({ id, at, amount, accountId });
    w.invoices[k] = rec;
  });
  return () =>
    mutateWorkspace((w) => {
      const rec = w.invoices[invoiceKey(cardId, ref)];
      if (rec) rec.payments = rec.payments.filter((p) => p.id !== id);
    });
}

export function setCardLimit(cardId: ID, limit: Cents): void {
  mutateWorkspace((w) => {
    const c = w.cards.find((x) => x.id === cardId);
    if (c) c.limit = limit;
  });
}

export function addAccount(a: Omit<Account, 'id'>): ID {
  const id = uid('acc');
  mutateWorkspace((w) => void w.accounts.push({ ...a, id, tint: a.tint ?? w.accounts.length + w.cards.length }));
  return id;
}

export function addCard(c: Omit<Card, 'id'>): ID {
  const id = uid('card');
  mutateWorkspace((w) => void w.cards.push({ ...c, id, tint: c.tint ?? w.accounts.length + w.cards.length }));
  return id;
}

/** Categoriza e, se o aprendizado estiver ligado, grava a regra do estabelecimento. */
export function setCategories(changes: { txId: ID; categoryId: ID }[], learn = getState().settings.coco.learning): Undo {
  const before = new Map<ID, ID | undefined>();
  const rulesBefore: Workspace['automation']['categoryRules'] = [];
  mutateWorkspace((w) => {
    rulesBefore.push(...w.automation.categoryRules);
    for (const { txId, categoryId } of changes) {
      const t = w.transactions.find((x) => x.id === txId);
      if (!t) continue;
      before.set(txId, t.categoryId);
      t.categoryId = categoryId;
      const key = normalizeMerchant(t.description).key;
      if (!learn || !key || t.kind === 'transfer') continue;
      const rule = w.automation.categoryRules.find((r) => r.merchantKey === key && r.kind === t.kind);
      if (rule) rule.categoryId = categoryId;
      else w.automation.categoryRules.push({ id: uid('rule'), merchantKey: key, kind: t.kind, categoryId, confirmedAt: new Date().toISOString() });
    }
  });
  return () =>
    mutateWorkspace((w) => {
      for (const [id, cat] of before) {
        const t = w.transactions.find((x) => x.id === id);
        if (t) t.categoryId = cat;
      }
      w.automation.categoryRules = rulesBefore;
    });
}

/** Transforma um padrão em fixo a partir da próxima ocorrência — nunca reescreve o passado. */
export function acceptRecurrence(c: RecurrenceCandidate, method: Method): Undo {
  const id = uid('tx');
  mutateWorkspace((w) => {
    w.transactions.push({
      id, kind: c.kind, description: c.name, amount: c.median, date: c.nextDate, categoryId: c.categoryId, method,
      accountId: c.cardId ? undefined : c.accountId, cardId: c.cardId, confirmed: true, recurring: { occ: {} }, origin: 'coco', createdAt: new Date().toISOString(),
    });
    w.automation.recurrenceDecisions[c.id] = 'accepted';
  });
  return () =>
    mutateWorkspace((w) => {
      w.transactions = w.transactions.filter((t) => t.id !== id);
      delete w.automation.recurrenceDecisions[c.id];
    });
}

export function dismissRecurrence(candidateId: string): void {
  mutateWorkspace((w) => void (w.automation.recurrenceDecisions[candidateId] = 'dismissed'));
}

export function depositToGoal(goalId: ID, amount: Cents, accountId?: ID): Undo {
  const id = uid('dep');
  mutateWorkspace((w) => {
    const g = w.goals.find((x) => x.id === goalId);
    if (g) g.deposits.push({ id, at: todayISO(), amount, accountId });
  });
  return () =>
    mutateWorkspace((w) => {
      const g = w.goals.find((x) => x.id === goalId);
      if (g) g.deposits = g.deposits.filter((d) => d.id !== id);
    });
}

export function setBudget(categoryId: ID, limit: Cents): void {
  mutateWorkspace((w) => {
    if (limit > 0) w.budgets[categoryId] = limit;
    else delete w.budgets[categoryId];
  });
}

export function addGoal(name: string, target: Cents, deadline: YM, icon = 'target'): void {
  mutateWorkspace((w) => void w.goals.push({ id: uid('goal'), name, target, deadline, icon, startedAt: todayISO(), deposits: [] }));
}

export function rememberFact(title: string, detail: string): Undo {
  const id = uid('mem');
  mutateWorkspace((w) => void w.coco.memory.unshift({ id, title, detail, source: 'voce-disse', createdAt: new Date().toISOString() }));
  return () => forgetMemory(id);
}

export function forgetMemory(id: ID): void {
  mutateWorkspace((w) => {
    w.coco.memory = w.coco.memory.filter((m) => m.id !== id);
    w.automation.categoryRules = w.automation.categoryRules.filter((r) => r.id !== id);
  });
}

export function decideCoco(id: string, decision: 'done' | 'dismissed' | null): void {
  setState((s) => {
    const next = { ...s.cocoDecisions };
    if (decision) next[id] = decision;
    else delete next[id];
    return { ...s, cocoDecisions: next };
  });
}
