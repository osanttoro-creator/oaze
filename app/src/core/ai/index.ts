import type { Workspace, YM } from '../../domain/types';
import { monthTotals } from '../../domain/calc';
import { callFunction, hasAccountBackend } from '../api/client';

/*
  A inteligência com modelo, quando a pessoa pede.

  O desenho do OAZE 1 é mantido porque está certo, e é o único que serve às
  quatro lojas: quem fala com o provedor é a Edge Function `oaze-assistant`. A
  chave nunca chega ao cliente, a cota é aplicada no banco e o domínio do
  provedor **não** está na CSP — liberar lá seria deixar aberta uma porta que
  ninguém usa.

  O que sai do aparelho é só o agregado de `digest()`. Não saem: descrição de
  lançamento, nome de conta, nome de cartão, e-mail, identificador interno. A
  tela "O que é enviado" mostra exatamente o objeto antes da chamada — e é a
  mesma função que monta os dois, para não haver versão bonita na tela e outra
  no fio.
*/

export interface Digest {
  mes: YM;
  receitas: number;
  despesas: number;
  saldo: number;
  categorias: { nome: string; total: number }[];
  contas: number;
  cartoes: number;
  previstos: { dia: string; total: number }[];
}

/** O agregado que vai ao servidor. Sem texto livre do usuário. */
export function digest(space: Workspace, ym: YM): Digest {
  const totals = monthTotals(space, ym);
  const byCategory = new Map<string, number>();
  const upcoming = new Map<string, number>();

  for (const t of space.transactions) {
    if (!t.date.startsWith(ym)) continue;
    if (t.confirmed) {
      const cat = space.categories.find((c) => c.id === t.categoryId);
      /* nome de categoria é vocabulário do produto, não dado pessoal; descrição
         de lançamento é, e não entra */
      const key = cat?.name ?? 'Outros';
      byCategory.set(key, (byCategory.get(key) ?? 0) + t.amount);
    } else {
      upcoming.set(t.date, (upcoming.get(t.date) ?? 0) + t.amount);
    }
  }

  return {
    mes: ym,
    receitas: totals.income,
    despesas: totals.expense,
    saldo: totals.balance,
    categorias: [...byCategory.entries()]
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12),
    contas: space.accounts.filter((a) => !a.archived).length,
    cartoes: space.cards.filter((c) => !c.archived).length,
    previstos: [...upcoming.entries()]
      .map(([dia, total]) => ({ dia, total }))
      .sort((a, b) => a.dia.localeCompare(b.dia))
      .slice(0, 31),
  };
}

export interface Proposal {
  /** A Coco propõe; gravar exige toque. Nunca grava sozinha. */
  kind: 'lancamento' | 'categoria' | 'meta';
  summary: string;
  payload: Record<string, unknown>;
}

export interface AskResult {
  answer: string;
  proposals: Proposal[];
  /** Coconutz restantes no mês, para a tela mostrar ANTES de a pessoa digitar. */
  left: number;
}

export interface AskOptions {
  question: string;
  space: Workspace;
  ym: YM;
  /** Versão do consentimento aceita. Sem ela a chamada não sai. */
  consentVersion: number | null;
}

export function aiAvailable(): boolean {
  return hasAccountBackend();
}

/**
 * Uma pergunta. Erro do provedor **não** consome coconut — o servidor garante
 * isso, e é o motivo de a cota ser aplicada lá e não aqui.
 */
export async function ask({ question, space, ym, consentVersion }: AskOptions): Promise<AskResult> {
  const text = question.trim();
  if (!text) throw new Error('Escreva a sua pergunta.');
  if (text.length > 600) throw new Error('A pergunta ficou longa demais. Resuma em até 600 caracteres.');
  if (!consentVersion) throw new Error('Aceite o aviso de privacidade da Coco antes de enviar.');

  const reply = await callFunction<{ resposta?: string; propostas?: Proposal[]; restantes?: number }>(
    'oaze-assistant',
    { pergunta: text, resumo: digest(space, ym), consentimento: consentVersion },
    20_000,
  );

  return {
    answer: String(reply.resposta ?? '').slice(0, 4000),
    /* propostas vêm do servidor e são DADO, nunca instrução: viram rascunho na
       tela e só existem depois de a pessoa confirmar */
    proposals: Array.isArray(reply.propostas) ? reply.propostas.slice(0, 5) : [],
    left: Number(reply.restantes ?? 0),
  };
}
