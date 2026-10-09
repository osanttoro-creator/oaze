import type { ID, Workspace } from '../../domain/types';
import type { CollName, Envelope, MapName, Op, Stamp } from './types';

/*
  A fusão. Função pura, sem rede e sem relógio próprio — é o único jeito de
  testar "dois aparelhos editaram o mesmo mês" de forma determinística.

  Três regras, nesta ordem:

  1. **Entidades diferentes nunca conflitam.** Operação de `transaction#a` e de
     `goal#b` se aplicam as duas, independente de quem chegou primeiro.
  2. **Na mesma entidade, vence o carimbo mais novo** — e o perdedor é
     RELATADO, nunca engolido. O empate de instante é desempatado pelo id do
     aparelho, para o resultado ser o mesmo nos dois lados: convergência importa
     mais do que qual deles ganha.
  3. **Exclusão deixa marca.** Uma operação `put` mais velha que a exclusão é
     ignorada; é isso que impede um aparelho offline de ressuscitar o que o outro
     apagou.

  O envelope carrega `stamps`, um carimbo por entidade. Sem ele, a regra 2 só
  valeria DENTRO de um lote: uma operação velha presa na fila desde ontem
  sobrescreveria, sem avisar, a versão que o outro aparelho gravou hoje. Esse
  defeito existiu nesta função e foi o que `merge.test.ts` pegou.
*/

/** 90 dias: depois disso, a lápide já cumpriu o papel e só ocuparia espaço. */
export const TOMB_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const LISTS: Record<CollName, (s: Workspace) => { id: ID }[]> = {
  accounts: (s) => s.accounts,
  cards: (s) => s.cards,
  categories: (s) => s.categories,
  transactions: (s) => s.transactions,
  investments: (s) => s.investments,
  goals: (s) => s.goals,
  categoryRules: (s) => s.automation.categoryRules,
  cocoMemory: (s) => s.coco.memory,
};

const MAPS: Record<MapName, (s: Workspace) => Record<string, unknown>> = {
  invoices: (s) => s.invoices as unknown as Record<string, unknown>,
  budgets: (s) => s.budgets as unknown as Record<string, unknown>,
  recurrenceDecisions: (s) => s.automation.recurrenceDecisions as unknown as Record<string, unknown>,
};

export function newer(a: Stamp, b: Stamp): boolean {
  return a.at > b.at || (a.at === b.at && a.device > b.device);
}

/** Identidade do que a operação disputa. Duas operações com a mesma chave
    competem; com chaves diferentes, convivem. */
export function keyOf(op: Op): string {
  if (op.kind === 'put') return `${op.coll}:${op.entity.id}`;
  if (op.kind === 'del') return `${op.coll}:${op.id}`;
  if (op.kind === 'map') return `map:${op.map}:${op.key}`;
  if (op.kind === 'rename') return 'meta:name';
  return 'meta:space';
}

export interface MergeResult {
  envelope: Envelope;
  /** Operações que não puderam ser aplicadas — a interface AVISA, não engole. */
  dropped: { op: Op; why: string }[];
}

/**
 * Aplica uma lista de operações sobre o envelope do servidor e devolve um
 * envelope novo. Não altera o que recebeu, e o resultado não depende da ordem em
 * que as operações chegaram.
 */
export function applyOps(base: Envelope, ops: readonly Op[]): MergeResult {
  const env: Envelope = structuredClone(base);
  env.stamps ??= {};
  env.tomb ??= {};
  const dropped: MergeResult['dropped'] = [];

  /* Uma disputa por chave: o vencedor é o carimbo mais novo do lote, e os
     demais saem relatados. Agrupar antes de aplicar é o que torna o resultado
     independente da ordem de chegada. */
  const groups = new Map<string, Op[]>();
  for (const op of ops) {
    const k = keyOf(op);
    const list = groups.get(k);
    if (list) list.push(op);
    else groups.set(k, [op]);
  }

  for (const [key, group] of groups) {
    let winner = group[0]!;
    for (const op of group) if (newer(op, winner)) winner = op;

    const whyLost =
      winner.kind === 'del'
        ? 'o item foi apagado em outro aparelho depois desta alteração'
        : 'uma versão mais nova deste item já estava aqui';
    for (const op of group) if (op !== winner) dropped.push({ op, why: whyLost });

    /* Contra o servidor: se o que está lá é mais novo, a nossa operação perde.

       A razão dita à pessoa distingue os dois casos, porque "alguém gravou
       depois" e "alguém apagou isto" pedem reações diferentes — no segundo, o
       lançamento que ela acabou de conferir sumiu da lista, e ela precisa saber
       por quê. */
    const theirs = env.stamps[key];
    if (theirs && newer(theirs, winner)) {
      const buriedFirst = env.tomb[key];
      dropped.push({
        op: winner,
        why:
          buriedFirst && buriedFirst >= winner.at
            ? 'o item foi apagado em outro aparelho depois desta alteração'
            : 'o outro aparelho gravou depois desta alteração',
      });
      continue;
    }

    if (winner.kind === 'space') {
      env.space = structuredClone(winner.entity);
      env.stamps[key] = { at: winner.at, device: winner.device };
      continue;
    }

    if (winner.kind === 'rename') {
      env.space.name = winner.name;
      env.stamps[key] = { at: winner.at, device: winner.device };
      continue;
    }

    if (winner.kind === 'map') {
      const map = MAPS[winner.map](env.space);
      if (winner.value === null) delete map[winner.key];
      else map[winner.key] = winner.value;
      env.stamps[key] = { at: winner.at, device: winner.device };
      continue;
    }

    const list = LISTS[winner.coll](env.space);

    if (winner.kind === 'del') {
      const at = list.findIndex((e) => e.id === winner.id);
      if (at >= 0) list.splice(at, 1);
      env.tomb[key] = winner.at;
      env.stamps[key] = { at: winner.at, device: winner.device };
      continue;
    }

    /* lápide de rodada anterior: o `stamps` já cobriria, mas a lápide sobrevive
       a uma limpeza de carimbos e é a última linha de defesa contra ressurreição */
    const buried = env.tomb[key];
    if (buried && buried >= winner.at) {
      dropped.push({ op: winner, why: 'o item foi apagado em outro aparelho depois desta alteração' });
      continue;
    }

    const at = list.findIndex((e) => e.id === winner.entity.id);
    const entity = structuredClone(winner.entity) as { id: ID };
    if (at >= 0) list[at] = entity;
    else list.push(entity);
    /* uma edição posterior à exclusão recria o item de propósito: apagar não é
       definitivo, e a lápide sai para não derrubar a próxima edição */
    delete env.tomb[key];
    env.stamps[key] = { at: winner.at, device: winner.device };
  }

  return { envelope: env, dropped };
}

/** Chaves que ainda significam algo: entidade viva, mapa com valor, ou lápide. */
function liveKeys(env: Envelope): Set<string> {
  const keys = new Set<string>(Object.keys(env.tomb ?? {}));
  for (const [coll, pick] of Object.entries(LISTS) as [CollName, (s: Workspace) => { id: ID }[]][]) {
    for (const e of pick(env.space)) keys.add(`${coll}:${e.id}`);
  }
  for (const [name, pick] of Object.entries(MAPS) as [MapName, (s: Workspace) => Record<string, unknown>][]) {
    for (const k of Object.keys(pick(env.space))) keys.add(`map:${name}:${k}`);
  }
  keys.add('meta:name');
  keys.add('meta:space');
  return keys;
}

/**
 * Lápides vencidas e carimbos órfãos saem. Chamado antes de cada subida — sem
 * isto, `stamps` cresceria para sempre e o envelope engordaria sozinho.
 */
export function prune(env: Envelope, now = Date.now()): Envelope {
  const tomb: Record<string, string> = {};
  for (const [k, at] of Object.entries(env.tomb ?? {})) {
    if (now - Date.parse(at) < TOMB_TTL_MS) tomb[k] = at;
  }
  const trimmed: Envelope = { ...env, tomb };
  const keep = liveKeys(trimmed);
  const stamps: Record<string, Stamp> = {};
  for (const [k, s] of Object.entries(env.stamps ?? {})) {
    if (keep.has(k)) stamps[k] = s;
  }
  return { ...trimmed, stamps };
}

/** Envelope inicial de um espaço que nunca subiu. */
export function wrap(space: Workspace): Envelope {
  return { format: 2, space, tomb: {}, stamps: {} };
}

/**
 * Primeira chegada numa conta que já tem dados: nem sobrescrever o remoto, nem
 * descartar o local. Isto transforma o espaço local inteiro em operações `put`,
 * que a fusão normal resolve item por item.
 */
export function adoptLocal(local: Workspace, stamp: Stamp, newOpId: () => string): Op[] {
  const ops: Op[] = [];
  const push = (coll: CollName, items: { id: ID }[]) => {
    for (const e of items) {
      ops.push({ ...stamp, opId: newOpId(), space: local.id, kind: 'put', coll, entity: e as never });
    }
  };
  push('accounts', local.accounts);
  push('cards', local.cards);
  push('categories', local.categories);
  push('transactions', local.transactions);
  push('investments', local.investments);
  push('goals', local.goals);
  push('categoryRules', local.automation.categoryRules);
  push('cocoMemory', local.coco.memory);
  for (const [key, value] of Object.entries(local.invoices)) {
    ops.push({ ...stamp, opId: newOpId(), space: local.id, kind: 'map', map: 'invoices', key, value });
  }
  for (const [key, value] of Object.entries(local.budgets)) {
    ops.push({ ...stamp, opId: newOpId(), space: local.id, kind: 'map', map: 'budgets', key, value });
  }
  for (const [key, value] of Object.entries(local.automation.recurrenceDecisions)) {
    ops.push({ ...stamp, opId: newOpId(), space: local.id, kind: 'map', map: 'recurrenceDecisions', key, value });
  }
  return ops;
}
