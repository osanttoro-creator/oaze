/*
  Coco no aparelho. Nada aqui chama modelo de IA: são regras explicáveis sobre os
  dados do espaço. A conversa com modelo (Edge Function oaze-assistant) entra por
  cima desta camada quando houver conta e consentimento — ver docs/05-backend.md.

  Política (nota "Coco como agente financeira multimodal"):
  ler e sugerir sem pedir; preparar rascunho; gravar só com confirmação; tudo desfazível.
*/
import type { Cents, ID, Method, Workspace } from '../domain/types';
import {
  categoryTotals, currentBalance, currentInvoiceRef, goalStatus, invoice, monthProjection,
  monthTotals, budgetUsage,
} from '../domain/calc';
import { suggestCategory } from '../domain/categorize';
import { detectRecurrences } from '../domain/recurrence';
import { normalizeMerchant, stripAccents } from '../domain/merchant';
import { brl } from '../domain/money';
import { addDaysISO, addMonths, daysBetween, dayMonth, monthEnd, monthName, monthStart, todayISO, todayYM } from '../domain/dates';
import type { IconName } from '../ui/icons.generated';

export type SuggestionAction =
  | { type: 'categorize'; changes: { txId: ID; categoryId: ID }[] }
  | { type: 'recurrence'; candidateId: string; method: Method }
  | { type: 'remind-invoice'; cardId: ID }
  | { type: 'goal-deposit'; goalId: ID; amount: Cents }
  | { type: 'open'; screen: 'carteira' | 'metas' | 'categorias' | 'lancamentos'; pick?: ID };

export interface Suggestion {
  id: string;
  icon: IconName;
  tag: string;
  text: string;
  primary: { label: string; action: SuggestionAction };
  secondary: { label: string; action: SuggestionAction | { type: 'dismiss' } };
  doneText: string;
}

const MAX_NOW = 4;
const NUMS = ['nenhuma', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis'];
export const countWord = (n: number) => NUMS[n] ?? String(n);

export function suggestions(w: Workspace, decided: Record<string, string>): Suggestion[] {
  const out: Suggestion[] = [];
  const today = todayISO();

  // 1 · sem categoria, mas com histórico claro
  const changes: { txId: ID; categoryId: ID }[] = [];
  for (const t of w.transactions) {
    if (t.categoryId || t.kind === 'transfer' || t.date < addDaysISO(today, -90)) continue;
    const s = suggestCategory(w, t.description, t.kind, t.id);
    if (s.categoryId && s.confidence !== 'low') changes.push({ txId: t.id, categoryId: s.categoryId });
  }
  if (changes.length) {
    out.push({
      id: `cat:${changes.map((c) => c.txId).sort().join(',')}`,
      icon: 'wand-sparkles', tag: 'pelo seu histórico',
      text: `${cap(countWord(changes.length))} ${changes.length === 1 ? 'lançamento está' : 'lançamentos estão'} sem categoria. Pelo que você costuma fazer, já sei onde colocar.`,
      primary: { label: 'Categorizar', action: { type: 'categorize', changes } },
      secondary: { label: 'Revisar', action: { type: 'open', screen: 'lancamentos' } },
      doneText: `Categorizei ${changes.length === 1 ? 'o lançamento' : `os ${changes.length} lançamentos`}.`,
    });
  }

  // 2 · padrão que se repete
  for (const r of detectRecurrences(w).slice(0, 2)) {
    const last = w.transactions.find((t) => t.id === r.evidenceIds[r.evidenceIds.length - 1]);
    out.push({
      id: `rec:${r.id}`, icon: 'repeat', tag: `padrão visto ${r.evidenceIds.length} vezes`,
      text: `Vi ${r.evidenceIds.length} cobranças parecidas de ${r.name} perto do dia ${r.typicalDay}. Quer transformar isso em recorrência?`,
      primary: { label: 'Criar recorrência', action: { type: 'recurrence', candidateId: r.id, method: last?.method ?? 'pix' } },
      secondary: { label: 'Agora não', action: { type: 'dismiss' } },
      doneText: `Recorrência criada para todo dia ${r.typicalDay}.`,
    });
  }

  // 3 · fatura fechando
  for (const c of w.cards) {
    if (c.archived) continue;
    const inv = invoice(w, c.id, currentInvoiceRef(w, c));
    if (!inv || inv.paid || inv.remaining <= 0) continue;
    const days = daysBetween(today, inv.closeDate);
    if (days < 0 || days > 5) continue;
    const after = currentBalance(w) - inv.remaining;
    out.push({
      id: `fat:${c.id}:${inv.ref}`, icon: 'calendar-clock', tag: 'previsão',
      text: `A fatura do ${c.name} fecha ${days === 0 ? 'hoje' : days === 1 ? 'amanhã' : `em ${days} dias`}, com ${brl(inv.remaining)} para ${dayMonth(inv.dueDate)}. Pagando tudo, ficam ${brl(after)} nas contas, se nada mais mudar.`,
      primary: { label: 'Lembrar 3 dias antes', action: { type: 'remind-invoice', cardId: c.id } },
      secondary: { label: 'Ver fatura', action: { type: 'open', screen: 'carteira', pick: c.id } },
      doneText: `Vou lembrar em ${dayMonth(addDaysISO(inv.dueDate, -3))}, às 9h.`,
    });
  }

  // 4 · meta fora do ritmo
  for (const g of w.goals) {
    const s = goalStatus(g);
    if (s.onPace || s.remaining <= 0) continue;
    const behind = Math.max(0, Math.round(((s.idealPct - s.pct) / 100) * g.target));
    const amount = Math.max(1000, Math.round(Math.min(behind, s.monthlyNeeded) / 1000) * 1000);
    out.push({
      id: `meta:${g.id}:${todayYM()}`, icon: 'target', tag: 'sugestão',
      text: `Separar ${brl(amount)} para ${g.name.toLowerCase()} agora deixa a meta mais perto do ritmo planejado.`,
      primary: { label: `Separar ${brl(amount).replace(',00', '')}`, action: { type: 'goal-deposit', goalId: g.id, amount } },
      secondary: { label: 'Recalcular', action: { type: 'open', screen: 'metas' } },
      doneText: `Separei ${brl(amount)} para ${g.name.toLowerCase()}.`,
    });
    break;
  }

  // 5 · orçamento estourado
  const over = budgetUsage(w, todayYM()).find((b) => b.over);
  if (over) {
    out.push({
      id: `orc:${over.categoryId}:${todayYM()}`, icon: 'sliders-horizontal', tag: 'orçamento',
      text: `${over.name} passou ${brl(over.used - over.limit)} do planejado. Posso mostrar o que puxou o total.`,
      primary: { label: 'Ver o que mudou', action: { type: 'open', screen: 'categorias' } },
      secondary: { label: 'Agora não', action: { type: 'dismiss' } },
      doneText: 'Abri as categorias do mês.',
    });
  }

  // poucos itens, por urgência e impacto: a Coco não é um feed
  const rank: Record<string, number> = { fat: 0, cat: 1, rec: 2, meta: 3, orc: 4 };
  return out
    .filter((s) => !decided[s.id] || decided[s.id] === 'done')
    .sort((a, b) => (rank[a.id.split(':')[0] as string] ?? 9) - (rank[b.id.split(':')[0] as string] ?? 9))
    .slice(0, MAX_NOW);
}

/* ------------------------------------------------------------ conversa */

export interface Draft {
  type: 'despesa' | 'receita';
  amount: Cents;
  description: string;
  categoryId?: ID;
  method: Method;
  accountId?: ID;
  cardId?: ID;
  date: string;
}

export type Reply =
  | { kind: 'text'; text: string; tag: 'estimativa' | 'resposta' | 'aprendendo' }
  | { kind: 'draft'; text: string; draft: Draft; tag: 'ação preparada' }
  | { kind: 'remember'; text: string; fact: string; tag: 'aprendendo' };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function findSource(w: Workspace, t: string, expense: boolean): Pick<Draft, 'method' | 'accountId' | 'cardId'> {
  const credit = /credito|cartao/.test(t) && !/debito/.test(t);
  const byName = (name: string) => t.includes(stripAccents(name).toLowerCase());
  if (/\bpix\b/.test(t)) return { method: 'pix', accountId: w.accounts.find((a) => byName(a.name))?.id ?? w.accounts[0]?.id };
  if (/dinheiro|especie/.test(t)) return { method: 'dinheiro' };
  const card = w.cards.find((c) => byName(c.name));
  if (expense && (credit || card) && (card ?? w.cards[0])) return { method: 'cartao_virtual', cardId: (card ?? w.cards[0])!.id };
  const acc = w.accounts.find((a) => byName(a.name)) ?? w.accounts[0];
  return { method: expense ? 'cartao_fisico' : 'pix', accountId: acc?.id };
}

export function sourceLabel(w: Workspace, d: Pick<Draft, 'method' | 'accountId' | 'cardId'>): string {
  if (d.cardId) {
    const c = w.cards.find((x) => x.id === d.cardId);
    return c ? `no cartão ${c.name} •• ${c.last4} (crédito)` : 'no crédito';
  }
  if (d.method === 'dinheiro') return 'em dinheiro';
  const a = w.accounts.find((x) => x.id === d.accountId);
  return a ? `${d.method === 'pix' ? 'no Pix' : 'no débito'} pela conta ${a.name}` : '';
}

export function reply(w: Workspace, input: string): Reply {
  const t = stripAccents(input).toLowerCase();
  const num = t.match(/(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/);
  const value = num ? Math.round(Number((num[1] as string).replace(/\.(?=\d{3})/g, '').replace(',', '.')) * 100) : 0;
  const ym = todayYM();

  const spent = /\b(gastei|paguei|comprei)\b/.test(t);
  const got = /\b(recebi|ganhei|caiu)\b/.test(t);
  if ((spent || got) && value > 0) {
    const where = t.match(/\b(?:no|na|em|com|do|da)\s+([a-z0-9 ]{2,40}?)(?:\s+(?:no|na|pelo|pela|com|via|hoje|ontem)\b|$)/);
    const rawName = where ? (where[1] as string).trim() : spent ? 'Despesa' : 'Receita';
    const merchant = normalizeMerchant(rawName);
    const description = merchant.name ?? cap(rawName);
    const kind = spent ? 'expense' : 'income';
    const cat = suggestCategory(w, description, kind);
    // sem dizer como pagou, vale o jeito de sempre naquele estabelecimento
    const saysHow = /\b(pix|credito|debito|cartao|dinheiro|especie)\b/.test(t) || [...w.cards, ...w.accounts].some((c) => t.includes(stripAccents(c.name).toLowerCase()));
    const usual = !saysHow && merchant.key
      ? [...w.transactions].reverse().find((x) => x.kind === kind && normalizeMerchant(x.description).key === merchant.key)
      : undefined;
    const src = usual ? { method: usual.method, accountId: usual.accountId, cardId: usual.cardId } : findSource(w, t, spent);
    const date = /\bontem\b/.test(t) ? addDaysISO(todayISO(), -1) : todayISO();
    const draft: Draft = { type: spent ? 'despesa' : 'receita', amount: value, description, categoryId: cat.categoryId ?? undefined, method: src.method, accountId: src.accountId, cardId: src.cardId, date };
    const catName = w.categories.find((c) => c.id === cat.categoryId)?.name;
    return {
      kind: 'draft', tag: 'ação preparada', draft,
      text: `Preparei ${brl(value)} ${spent ? 'de despesa' : 'de receita'}${catName ? ` em ${catName}` : ''}, ${sourceLabel(w, src)}. Confere e eu lanço.`,
    };
  }

  if (/sobra|sobrar|fim do mes/.test(t)) {
    const p = monthProjection(w, ym);
    const pend = p.toPay + p.invoices;
    return { kind: 'text', tag: 'estimativa', text: `Até ${dayMonth(monthEnd(ym))}, a previsão é terminar com ${brl(p.balance)} nas contas. Isso já desconta ${brl(pend)} que ainda vão sair${p.toReceive ? ` e soma ${brl(p.toReceive)} a receber` : ''}.` };
  }

  if (/saldo|quanto tenho/.test(t)) {
    return { kind: 'text', tag: 'resposta', text: `Hoje há ${brl(currentBalance(w))} nas contas que entram nos totais.` };
  }

  if (/fatura/.test(t)) {
    const lines = w.cards.filter((c) => !c.archived).map((c) => {
      const inv = invoice(w, c.id, currentInvoiceRef(w, c));
      return inv ? `${c.name}: ${brl(inv.remaining)}, vence ${dayMonth(inv.dueDate)}` : '';
    }).filter(Boolean);
    return { kind: 'text', tag: 'resposta', text: lines.length ? `Faturas abertas — ${lines.join('; ')}.` : 'Nenhum cartão cadastrado ainda.' };
  }

  const catAsk = t.match(/(?:gastei|gasto|gastos)\s+(?:com|em)\s+([a-z ]+)/);
  if (catAsk) {
    const name = (catAsk[1] as string).trim();
    const cat = w.categories.find((c) => stripAccents(c.name).toLowerCase().startsWith(name.slice(0, 5)));
    if (cat) {
      const now = categoryTotals(w, 'expense', monthStart(ym), monthEnd(ym)).find((r) => r.id === cat.id)?.total ?? 0;
      const prev = categoryTotals(w, 'expense', monthStart(addMonths(ym, -1)), monthEnd(addMonths(ym, -1))).find((r) => r.id === cat.id)?.total ?? 0;
      const diff = now - prev;
      return { kind: 'text', tag: 'resposta', text: `${cat.name} somou ${brl(now)} em ${monthName(ym)}, ${diff === 0 ? 'igual ao mês passado' : `${brl(diff)} ${diff > 0 ? 'a mais' : 'a menos'} que no mês passado`}.` };
    }
  }

  if (/meta|viagem|plano|juntar|guardar/.test(t)) {
    const g = w.goals.find((x) => t.includes(stripAccents(x.name).toLowerCase().split(' ').pop() ?? '')) ?? w.goals[0];
    if (g) {
      const s = goalStatus(g);
      return { kind: 'text', tag: 'estimativa', text: `Faltam ${brl(s.remaining)} para ${g.name.toLowerCase()}. Em ${s.monthsLeft} ${s.monthsLeft === 1 ? 'mês' : 'meses'}, dá ${brl(s.monthlyNeeded)} por mês. Posso sugerir o aporte todo mês depois do salário.` };
    }
  }

  if (/\b(lembra|lembre|prioridade|sempre|prefiro)\b/.test(t)) {
    return { kind: 'remember', tag: 'aprendendo', fact: cap(input.trim()).slice(0, 80), text: 'Quer que eu guarde isso como uma preferência sua? Fica na Memória, e você pode esquecer quando quiser.' };
  }

  const m = monthTotals(w, ym);
  return { kind: 'text', tag: 'aprendendo', text: `Ainda não sei fazer isso aqui no aparelho. Posso lançar ("gastei 45 no iFood"), dizer quanto sobra, ver faturas ou gastos por categoria. Em ${monthName(ym)}, até agora entraram ${brl(m.income)} e saíram ${brl(m.expense)}.` };
}
