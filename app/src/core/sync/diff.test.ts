import { describe, expect, it } from 'vitest';
import type { Workspace } from '../../domain/types';
import { applyOps, wrap } from './merge';
import { diffWorkspace } from './diff';

const empty = (): Workspace => ({
  id: 'pessoal', name: 'Pessoal', accounts: [], cards: [], categories: [],
  transactions: [], invoices: {}, investments: [], goals: [], budgets: {},
  automation: { categoryRules: [], recurrenceDecisions: {} }, coco: { memory: [] },
});

const stamp = { at: '2026-10-09T12:00:00.000Z', device: 'phone-1' };

function changes(before: Workspace | null, after: Workspace) {
  let id = 0;
  return diffWorkspace(before, after, stamp, () => `op-${++id}`);
}

describe('captura de edições locais', () => {
  it('cria o espaço completo na primeira alteração', () => {
    const space = empty();
    expect(changes(null, space)).toEqual([{
      ...stamp, opId: 'op-1', space: space.id, kind: 'space', entity: space,
    }]);
  });

  it('captura inclusão, edição, remoção e orçamento sem perder outras entidades', () => {
    const before = empty();
    before.transactions = [
      { id: 'old', kind: 'expense', description: 'Antigo', amount: 100, date: '2026-10-09', method: 'pix', confirmed: true, origin: 'manual', createdAt: stamp.at },
      { id: 'keep', kind: 'expense', description: 'Original', amount: 200, date: '2026-10-09', method: 'pix', confirmed: true, origin: 'manual', createdAt: stamp.at },
    ];
    const after = structuredClone(before);
    after.name = 'Família';
    after.transactions = [
      { ...before.transactions[1]!, description: 'Editado' },
      { ...before.transactions[0]!, id: 'new', description: 'Novo' },
    ];
    after.budgets.mercado = 30000;
    const ops = changes(before, after);
    expect(ops.map((op) => op.kind)).toEqual(['rename', 'del', 'put', 'put', 'map']);
    expect(applyOps(wrap(before), ops).envelope.space).toEqual(after);
  });

  it('não cria operações quando só outro estado do aplicativo muda', () => {
    const before = empty();
    expect(changes(before, structuredClone(before))).toEqual([]);
  });
});
