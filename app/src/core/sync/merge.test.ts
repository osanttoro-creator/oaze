import { describe, expect, it } from 'vitest';
import type { Transaction, Workspace } from '../../domain/types';
import { adoptLocal, applyOps, newer, prune, TOMB_TTL_MS, wrap } from './merge';
import type { Op, Stamp } from './types';

/*
  O cenário que a sincronização existe para resolver: a pessoa abre o OAZE no
  celular e no computador, edita nos dois antes de a rede voltar, e nada do que
  ela digitou pode desaparecer sem aviso.
*/

function space(): Workspace {
  return {
    id: 'ws1',
    name: 'Pessoal',
    accounts: [],
    cards: [],
    categories: [],
    transactions: [],
    invoices: {},
    investments: [],
    goals: [],
    budgets: {},
    automation: { categoryRules: [], recurrenceDecisions: {} },
    coco: { memory: [] },
  };
}

function tx(id: string, description: string, amount = 1000): Transaction {
  return {
    id,
    kind: 'expense',
    description,
    amount,
    date: '2026-10-06',
    method: 'pix',
    confirmed: true,
    origin: 'manual',
    createdAt: '2026-10-06T10:00:00.000Z',
  };
}

const phone: Stamp = { at: '2026-10-06T12:00:00.000Z', device: 'android-1' };
const laptop: Stamp = { at: '2026-10-06T12:00:05.000Z', device: 'windows-2' };

function put(stamp: Stamp, t: Transaction, opId = `op-${t.id}-${stamp.device}`): Op {
  return { ...stamp, opId, space: 'ws1', kind: 'put', coll: 'transactions', entity: t as never };
}

describe('ordem dos carimbos', () => {
  it('desempata pelo aparelho quando o instante é o mesmo', () => {
    const a: Stamp = { at: '2026-10-06T12:00:00.000Z', device: 'a' };
    const b: Stamp = { at: '2026-10-06T12:00:00.000Z', device: 'b' };
    expect(newer(b, a)).toBe(true);
    expect(newer(a, b)).toBe(false);
  });
});

describe('fusão por entidade', () => {
  it('aplica duas edições de entidades diferentes, sem perder nenhuma', () => {
    const base = wrap(space());
    const { envelope, dropped } = applyOps(base, [put(phone, tx('t1', 'Mercado')), put(laptop, tx('t2', 'Farmácia'))]);
    expect(envelope.space.transactions.map((t) => t.id).sort()).toEqual(['t1', 't2']);
    expect(dropped).toHaveLength(0);
  });

  it('na mesma entidade, a edição mais nova vence e a velha é relatada', () => {
    const base = wrap(space());
    const { envelope, dropped } = applyOps(base, [
      put(laptop, tx('t1', 'Mercado do mês', 9900), 'op-novo'),
      put(phone, tx('t1', 'Mercado', 1000), 'op-velho'),
    ]);
    expect(envelope.space.transactions).toHaveLength(1);
    expect(envelope.space.transactions[0]?.description).toBe('Mercado do mês');
    expect(dropped).toHaveLength(1);
    expect(dropped[0]?.op.opId).toBe('op-velho');
  });

  it('não ressuscita o que outro aparelho apagou depois', () => {
    const base = applyOps(wrap(space()), [put(phone, tx('t1', 'Mercado'))]).envelope;
    const del: Op = { ...laptop, opId: 'op-del', space: 'ws1', kind: 'del', coll: 'transactions', id: 't1' };
    const stale = put({ at: '2026-10-06T12:00:02.000Z', device: 'android-1' }, tx('t1', 'Mercado editado'), 'op-stale');

    const { envelope, dropped } = applyOps(base, [del, stale]);
    expect(envelope.space.transactions).toHaveLength(0);
    expect(envelope.tomb['transactions:t1']).toBe(laptop.at);
    expect(dropped.map((d) => d.op.opId)).toContain('op-stale');
  });

  it('uma operação velha presa na fila não sobrescreve o que o servidor gravou depois', () => {
    /* O defeito que este teste pegou na primeira versão da fusão: sem carimbo por
       entidade no envelope, a operação de ontem passava por cima da de hoje. */
    const remote = applyOps(wrap(space()), [put(laptop, tx('t1', 'Aluguel 2.200', 220000))]).envelope;
    const stale = put({ at: '2026-10-05T08:00:00.000Z', device: 'android-1' }, tx('t1', 'Aluguel', 200000), 'op-ontem');
    const { envelope, dropped } = applyOps(remote, [stale]);
    expect(envelope.space.transactions[0]?.amount).toBe(220000);
    expect(dropped).toHaveLength(1);
    expect(dropped[0]?.why).toContain('gravou depois');
  });

  it('uma edição posterior à exclusão recria o item — apagar não é definitivo', () => {
    const base = applyOps(wrap(space()), [
      put(phone, tx('t1', 'Mercado')),
      { ...phone, opId: 'd', space: 'ws1', kind: 'del', coll: 'transactions', id: 't1' },
    ]).envelope;
    const later = put({ at: '2026-10-07T09:00:00.000Z', device: 'ios-3' }, tx('t1', 'Mercado de novo'), 'op-later');
    const { envelope, dropped } = applyOps(base, [later]);
    expect(envelope.space.transactions).toHaveLength(1);
    expect(dropped).toHaveLength(0);
  });

  it('mapas também se fundem por chave', () => {
    const base = wrap(space());
    const ops: Op[] = [
      { ...phone, opId: 'm1', space: 'ws1', kind: 'map', map: 'budgets', key: 'cat-a', value: 50000 },
      { ...laptop, opId: 'm2', space: 'ws1', kind: 'map', map: 'budgets', key: 'cat-b', value: 20000 },
      { ...laptop, opId: 'm3', space: 'ws1', kind: 'map', map: 'budgets', key: 'cat-a', value: 60000 },
    ];
    const { envelope } = applyOps(base, ops);
    expect(envelope.space.budgets).toEqual({ 'cat-a': 60000, 'cat-b': 20000 });
  });

  it('valor nulo num mapa apaga a chave', () => {
    const base = applyOps(wrap(space()), [
      { ...phone, opId: 'm1', space: 'ws1', kind: 'map', map: 'budgets', key: 'cat-a', value: 50000 },
    ]).envelope;
    const { envelope } = applyOps(base, [
      { ...laptop, opId: 'm2', space: 'ws1', kind: 'map', map: 'budgets', key: 'cat-a', value: null },
    ]);
    expect(envelope.space.budgets).toEqual({});
  });

  it('não altera o envelope que recebeu', () => {
    const base = wrap(space());
    applyOps(base, [put(phone, tx('t1', 'Mercado'))]);
    expect(base.space.transactions).toHaveLength(0);
  });

  it('o resultado é o mesmo qualquer que seja a ordem de chegada', () => {
    const a = put(phone, tx('t1', 'Primeiro'), 'a');
    const b = put(laptop, tx('t1', 'Segundo'), 'b');
    const um = applyOps(wrap(space()), [a, b]).envelope;
    const outro = applyOps(wrap(space()), [b, a]).envelope;
    expect(um.space.transactions).toEqual(outro.space.transactions);
  });
});

describe('lápides', () => {
  it('esquece exclusões com mais de 90 dias e mantém as recentes', () => {
    const now = Date.parse('2026-10-06T00:00:00.000Z');
    const env = {
      ...wrap(space()),
      tomb: {
        'transactions:velho': new Date(now - TOMB_TTL_MS - 1000).toISOString(),
        'transactions:novo': new Date(now - 1000).toISOString(),
      },
    };
    expect(Object.keys(prune(env, now).tomb)).toEqual(['transactions:novo']);
  });
});

describe('primeira chegada numa conta que já tem dados', () => {
  it('transforma o espaço local em operações, uma por entidade', () => {
    const local = space();
    local.transactions = [tx('t1', 'Mercado'), tx('t2', 'Farmácia')];
    local.budgets = { 'cat-a': 1000 };
    let n = 0;
    const ops = adoptLocal(local, phone, () => `op-${n++}`);
    expect(ops.filter((o) => o.kind === 'put')).toHaveLength(2);
    expect(ops.filter((o) => o.kind === 'map')).toHaveLength(1);
  });

  it('fundido sobre um remoto que já tem outro lançamento, nada é perdido', () => {
    const remote = applyOps(wrap(space()), [put(laptop, tx('r1', 'Aluguel'))]).envelope;
    const local = space();
    local.transactions = [tx('t1', 'Mercado')];
    let n = 0;
    const { envelope } = applyOps(remote, adoptLocal(local, phone, () => `op-${n++}`));
    expect(envelope.space.transactions.map((t) => t.id).sort()).toEqual(['r1', 't1']);
  });
});
