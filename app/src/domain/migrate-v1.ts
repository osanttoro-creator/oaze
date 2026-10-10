/*
  OAZE 1 → OAZE 2. Lê o estado do localStorage['financas.v1'] ou o backup
  exportado ({ app: 'minhas-financas', version: 1, data }). Nunca apaga o antigo:
  quem migra pode voltar ao OAZE 1 com tudo como estava.

  Diferenças que a conversão resolve:
  · valores em reais (float) viram centavos inteiros;
  · o OAZE 1 não guardava forma de pagamento nem bandeira: vira "não informado";
  · conta e cartão em outra moeda viram real pela cotação salva (o v2 ainda
    não tem moeda estrangeira) — o relatório conta quantos;
  · meta: `saved` já é o total (cada depósito somava nele). Os depósitos
    viram depósitos, e o que sobra de `saved` entra como "saldo anterior".
*/
import type {
  Account, Card, Category, Goal, GoalDeposit, Investment, InvestmentType, InvoiceRecord, Method,
  Occurrence, RecurrenceDecision, Transaction, Workspace,
} from './types';
import { BANKS } from './banks';
import { defaultCategories } from './seed';
import { stripAccents } from './merchant';
import { addMonths, isValidISO, todayISO, todayYM, ymOf } from './dates';
import { uid } from './ids';

// dado de fora: cada campo é validado na conversão
type Raw = Record<string, any>;

export interface MigrationReport {
  spaces: number;
  accounts: number;
  cards: number;
  transactions: number;
  invoices: number;
  investments: number;
  goals: number;
  foreignConverted: number;
  notes: string[];
}

export interface MigrationResult {
  owner: string;
  workspaces: Workspace[];
  activeId: string | null;
  report: MigrationReport;
}

const cents = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' && v.trim() ? v.trim() : fallback);
const iso = (v: unknown, fallback = todayISO()): string => (typeof v === 'string' && isValidISO(v) ? v : fallback);
const norm = (s: string) => stripAccents(s).toLowerCase().trim();

/** Aceita o estado cru ou o backup do OAZE 1. Devolve null se não for do OAZE 1. */
export function unwrapV1(input: unknown): Raw | null {
  if (!input || typeof input !== 'object') return null;
  const o = input as Raw;
  const state = o.app === 'minhas-financas' && o.data ? o.data : o;
  return Array.isArray(state?.profiles) && Number(state.version) === 1 ? state : null;
}

function bankKey(v: unknown): string {
  const s = norm(str(v));
  if (!s) return 'outro';
  const hit = BANKS.find((b) => b.key === s || norm(b.name) === s || s.includes(norm(b.name)) || norm(b.name).includes(s));
  return hit?.key ?? 'outro';
}

const CAT_ICONS: [RegExp, string][] = [
  [/morad|casa|aluguel/, 'house'], [/aliment|mercado|comida|restaurante/, 'utensils'], [/transport|carro|uber|combust/, 'car'],
  [/lazer|divers|viage/, 'gamepad-2'], [/saude|farm|medic/, 'heart-pulse'], [/assinat|stream/, 'repeat'],
  [/compra|roupa|shopping/, 'shopping-bag'], [/salari|pro labore/, 'banknote'], [/rendiment|invest|juros|freela/, 'trending-up'],
  [/educa|curso|escola/, 'sprout'], [/pet|animal/, 'heart-pulse'],
];
function iconFor(name: string): string {
  const n = norm(name);
  return CAT_ICONS.find(([re]) => re.test(n))?.[1] ?? 'circle-ellipsis';
}

function investmentType(v: unknown, name: string): InvestmentType {
  const s = norm(`${str(v)} ${name}`);
  if (/tesouro|selic|ipca/.test(s)) return 'tesouro';
  if (/cdb|lci|lca|renda fixa|poupanca/.test(s)) return 'cdb';
  if (/fii|imobili/.test(s)) return 'fii';
  if (/acao|acoes|bolsa|etf|br[a-z]{2}\d/.test(s)) return 'acoes';
  return 'outros';
}

function toBRL(value: number, moeda: unknown, cotacao: unknown): { value: number; foreign: boolean } {
  const m = str(moeda, 'BRL');
  const c = Number(cotacao);
  if (m !== 'BRL' && c > 0) return { value: Math.round(value * c), foreign: true };
  return { value, foreign: m !== 'BRL' };
}

function convertProfile(p: Raw, owner: string, report: MigrationReport): Workspace {
  const rawCats: Raw[] = Array.isArray(p.categories) ? p.categories : [];
  const categories: Category[] = rawCats.length
    ? rawCats.map((c) => ({ id: str(c.id, uid('cat')), name: str(c.name, 'Categoria'), kind: c.kind === 'income' ? 'income' : 'expense', icon: iconFor(str(c.name)) }))
    : defaultCategories();

  const accounts: Account[] = (Array.isArray(p.accounts) ? p.accounts : []).map((a: Raw) => {
    const conv = toBRL(cents(a.openingBalance), a.moeda, a.cotacao);
    if (conv.foreign) report.foreignConverted++;
    const last4 = str(String(a.last4 ?? '')).replace(/\D/g, '').slice(-4);
    return {
      id: str(a.id, uid('acc')), name: str(a.name, 'Conta'), bank: bankKey(a.bank || a.name),
      debitCard: last4 ? { last4, network: '', validThru: '' } : undefined,
      openingBalance: conv.value, openedAt: iso(a.openedAt), archived: !!a.archived, counted: a.considerado !== false,
    };
  });

  const cards: Card[] = (Array.isArray(p.cards) ? p.cards : []).map((c: Raw) => {
    const conv = toBRL(cents(c.limit), c.moeda, c.cotacao);
    if (conv.foreign) report.foreignConverted++;
    return {
      id: str(c.id, uid('card')), name: str(c.name, 'Cartão'), bank: bankKey(c.bank || c.name),
      last4: str(String(c.last4 ?? '')).replace(/\D/g, '').slice(-4) || '····', network: '', validThru: '', holder: owner.toUpperCase(),
      limit: conv.value, closingDay: Math.min(31, Math.max(1, Number(c.closingDay) || 1)), dueDay: Math.min(31, Math.max(1, Number(c.dueDay) || 10)),
      accountId: str(c.accountId) || undefined, counted: c.considerado !== false,
    };
  });
  const cardIds = new Set(cards.map((c) => c.id));

  const transactions: Transaction[] = (Array.isArray(p.transactions) ? p.transactions : []).map((t: Raw) => {
    const kind: Transaction['kind'] = ['income', 'expense', 'transfer'].includes(t.kind) ? t.kind : 'expense';
    const cardId = kind === 'expense' && t.cardId && cardIds.has(t.cardId) ? String(t.cardId) : undefined;
    const occ: Record<string, Occurrence> = {};
    if (t.recurring && t.occ && typeof t.occ === 'object') {
      for (const [ym, o] of Object.entries(t.occ as Record<string, Raw>)) {
        if (!/^\d{4}-\d{2}$/.test(ym) || !o || typeof o !== 'object') continue;
        occ[ym] = {
          ...(o.confirmed !== undefined ? { confirmed: !!o.confirmed } : {}),
          ...(o.skipped ? { skipped: true } : {}),
          ...(Number.isFinite(Number(o.amount)) && o.amount !== null && o.amount !== '' ? { amount: Math.abs(cents(o.amount)) } : {}),
        };
      }
    }
    const inst = t.installment && Number(t.installment.total) > 1
      ? { index: Number(t.installment.index) || 1, total: Number(t.installment.total), groupId: str(t.installment.groupId) || uid('grp') }
      : undefined;
    const oldMethod = str(t.meio);
    const supported: Method[] = ['pix', 'cartao_fisico', 'cartao_virtual', 'dinheiro', 'boleto', 'debito_automatico', 'transferencia', 'deposito'];
    const method: Method = supported.includes(oldMethod as Method) ? oldMethod as Method : 'nao_informado';
    return {
      id: str(t.id, uid('tx')), kind, description: str(t.description, '(sem descrição)'), amount: Math.abs(cents(t.amount)), date: iso(t.date),
      categoryId: str(t.categoryId) || undefined, method,
      accountId: cardId ? undefined : str(t.accountId) || undefined, toAccountId: kind === 'transfer' ? str(t.toAccountId) || undefined : undefined,
      cardId, confirmed: t.confirmed !== false,
      recurring: t.recurring ? { endYM: /^\d{4}-\d{2}$/.test(str(t.recurEnd)) ? str(t.recurEnd) : undefined, occ } : undefined,
      installment: inst, origin: 'importado', createdAt: str(t.createdAt, new Date().toISOString()),
    };
  });

  const invoices: Record<string, InvoiceRecord> = {};
  for (const [k, r] of Object.entries((p.invoices && typeof p.invoices === 'object' ? p.invoices : {}) as Record<string, Raw>)) {
    if (!r || typeof r !== 'object' || !/\|\d{4}-\d{2}$/.test(k)) continue;
    const payments: InvoiceRecord['payments'] = [];
    const add = (m: Raw | undefined) => {
      const amount = cents(m?.amount);
      if (amount > 0) payments.push({ id: uid('pay'), at: iso(m?.at ?? m?.paidAt), amount, accountId: str(m?.accountId) || undefined });
    };
    (Array.isArray(r.pagamentos) ? r.pagamentos : []).forEach(add);
    // adiantamento pagava uma compra específica; no v2 conta como pagamento da fatura, com o mesmo efeito no saldo
    Object.values((r.adiantamentos && typeof r.adiantamentos === 'object' ? r.adiantamentos : {}) as Record<string, Raw>).forEach(add);
    if (!payments.length && r.paid) add({ at: r.paidAt, amount: r.amount, accountId: r.accountId });
    const settled = r.quitada !== undefined ? !!r.quitada : !!r.paid;
    if (payments.length || settled) invoices[k] = { payments, settled: settled || undefined };
  }

  const investments: Investment[] = (Array.isArray(p.investments) ? p.investments : []).map((i: Raw) => {
    const name = str(i.name, 'Investimento');
    return {
      id: str(i.id, uid('inv')), name, type: investmentType(i.type, name), amount: cents(i.amount), date: iso(i.date),
      annualRate: Number(i.rate) || 0, currentValue: i.currentValue === '' || i.currentValue == null ? undefined : cents(i.currentValue),
      accountId: str(i.accountId) || undefined,
    };
  });

  const goals: Goal[] = (Array.isArray(p.goals) ? p.goals : []).map((g: Raw) => {
    const createdAt = iso(g.createdAt);
    const deposits: GoalDeposit[] = (Array.isArray(g.deposits) ? g.deposits : [])
      .map((d: Raw) => ({ id: uid('dep'), at: iso(d?.at, createdAt), amount: cents(d?.amount), accountId: str(d?.accountId) || undefined }))
      .filter((d: GoalDeposit) => d.amount !== 0);
    const fromDeposits = deposits.reduce((s, d) => s + d.amount, 0);
    const saved = cents(g.saved);
    if (saved > fromDeposits) deposits.unshift({ id: uid('dep'), at: createdAt, amount: saved - fromDeposits });
    const deadline = iso(g.deadline, '') ? ymOf(g.deadline) : addMonths(todayYM(), 12);
    return { id: str(g.id, uid('goal')), name: str(g.name, 'Meta').slice(0, 60), target: cents(g.target), startedAt: createdAt, deadline, icon: str(g.icon, 'target'), deposits };
  });

  const budgets: Record<string, number> = {};
  for (const [k, v] of Object.entries((p.budgets && typeof p.budgets === 'object' ? p.budgets : {}) as Record<string, unknown>)) {
    const c = cents(v);
    if (c > 0) budgets[k] = c;
  }

  const auto = (p.automation && typeof p.automation === 'object' ? p.automation : {}) as Raw;
  const decisions: Record<string, RecurrenceDecision> = {};
  for (const [k, v] of Object.entries((auto.recurrenceDecisions && typeof auto.recurrenceDecisions === 'object' ? auto.recurrenceDecisions : {}) as Record<string, Raw>)) {
    const status = typeof v === 'string' ? v : v?.status;
    if (status === 'accepted') decisions[k] = 'accepted';
    else if (status === 'dismissed' || status === 'blocked') decisions[k] = 'dismissed';
  }

  report.accounts += accounts.length;
  report.cards += cards.length;
  report.transactions += transactions.length;
  report.invoices += Object.keys(invoices).length;
  report.investments += investments.length;
  report.goals += goals.length;

  return {
    id: str(p.id, uid('ws')), name: str(p.name, 'Pessoal'), accounts, cards, categories, transactions, invoices, investments, goals, budgets,
    automation: {
      categoryRules: (Array.isArray(auto.categoryRules) ? auto.categoryRules : [])
        .filter((r: Raw) => r && r.merchantKey && r.categoryId && r.active !== false)
        .map((r: Raw) => ({ id: str(r.id, uid('rule')), merchantKey: String(r.merchantKey), kind: r.kind === 'income' ? 'income' : 'expense', categoryId: String(r.categoryId), confirmedAt: str(r.confirmedAt, new Date().toISOString()) })),
      recurrenceDecisions: decisions,
    },
    coco: { memory: [] },
  };
}

export function migrateV1(input: unknown): MigrationResult | null {
  const state = unwrapV1(input);
  if (!state) return null;
  const owner = str(state.ownerName);
  const report: MigrationReport = { spaces: 0, accounts: 0, cards: 0, transactions: 0, invoices: 0, investments: 0, goals: 0, foreignConverted: 0, notes: [] };
  const profiles: Raw[] = state.profiles.filter((p: unknown) => p && typeof p === 'object');
  // espaço criado pelo OAZE 1 e nunca usado não vale a pena trazer
  const used = profiles.filter((p) => (p.accounts?.length ?? 0) + (p.cards?.length ?? 0) + (p.transactions?.length ?? 0) + (p.goals?.length ?? 0) + (p.investments?.length ?? 0) > 0);
  const chosen = used.length ? used : profiles.slice(0, 1);
  const workspaces = chosen.slice(0, 5).map((p) => convertProfile(p, owner, report));
  report.spaces = workspaces.length;
  if (chosen.length > 5) report.notes.push(`${chosen.length - 5} espaço(s) além do limite de 5 ficaram no OAZE 1.`);
  if (report.foreignConverted) report.notes.push(`${report.foreignConverted} conta(s) ou cartão(ões) em outra moeda foram convertidos para real pela cotação salva.`);
  if (report.transactions) report.notes.push('A forma de pagamento dos lançamentos antigos aparece como "não informada": o OAZE 1 não guardava esse dado.');
  const active = workspaces.find((w) => w.id === state.activeProfileId) ?? workspaces[0] ?? null;
  return { owner, workspaces, activeId: active?.id ?? null, report };
}

export function readLocalV1(): unknown {
  try {
    const raw = localStorage.getItem('financas.v1');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
