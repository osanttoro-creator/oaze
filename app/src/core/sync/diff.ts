import type { Workspace } from '../../domain/types';
import type { CollName, MapName, Op, Stamp } from './types';

type Change = Op;

/** Converte uma edição do espaço em operações por entidade. */
export function diffWorkspace(
  before: Workspace | null,
  after: Workspace,
  stamp: Stamp,
  nextId: () => string,
): Change[] {
  const changes: Change[] = [];
  const base = () => ({ ...stamp, opId: nextId(), space: after.id });

  if (!before) {
    return [{ ...base(), kind: 'space', entity: after }];
  }

  if (before.name !== after.name) {
    changes.push({ ...base(), kind: 'rename', name: after.name });
  }

  const collection = (name: CollName, oldItems: { id: string }[], newItems: { id: string }[]) => {
    const oldById = new Map(oldItems.map((item) => [item.id, item]));
    const newById = new Map(newItems.map((item) => [item.id, item]));
    for (const item of oldItems) {
      if (!newById.has(item.id)) changes.push({ ...base(), kind: 'del', coll: name, id: item.id });
    }
    for (const item of newItems) {
      if (JSON.stringify(oldById.get(item.id)) !== JSON.stringify(item)) {
        changes.push({ ...base(), kind: 'put', coll: name, entity: item as { id: string } & Record<string, unknown> });
      }
    }
  };

  collection('accounts', before.accounts, after.accounts);
  collection('cards', before.cards, after.cards);
  collection('categories', before.categories, after.categories);
  collection('transactions', before.transactions, after.transactions);
  collection('investments', before.investments, after.investments);
  collection('goals', before.goals, after.goals);
  collection('categoryRules', before.automation.categoryRules, after.automation.categoryRules);
  collection('cocoMemory', before.coco.memory, after.coco.memory);

  const map = (name: MapName, oldValues: Record<string, unknown>, newValues: Record<string, unknown>) => {
    for (const key of new Set([...Object.keys(oldValues), ...Object.keys(newValues)])) {
      const value = Object.hasOwn(newValues, key) ? newValues[key] : null;
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(value)) {
        changes.push({ ...base(), kind: 'map', map: name, key, value });
      }
    }
  };

  map('invoices', before.invoices, after.invoices);
  map('budgets', before.budgets, after.budgets);
  map('recurrenceDecisions', before.automation.recurrenceDecisions, after.automation.recurrenceDecisions);
  return changes;
}
