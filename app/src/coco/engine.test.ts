import { beforeEach, describe, expect, it } from 'vitest';
import { setClock } from '../domain/dates';
import { demoWorkspace } from '../domain/seed';
import { reply, suggestions } from './engine';

beforeEach(() => setClock(() => new Date(2026, 8, 28, 10)));

describe('Coco on-device', () => {
  it('prepares an expense on the card usually used at that merchant, without saving it', () => {
    const w = demoWorkspace();
    const before = w.transactions.length;
    const r = reply(w, 'gastei 45 no ifood');
    expect(r.kind).toBe('draft');
    if (r.kind !== 'draft') return;
    expect(r.draft).toMatchObject({ amount: 4500, description: 'iFood', cardId: 'card_nubank', method: 'cartao_virtual' });
    expect(w.categories.find((c) => c.id === r.draft.categoryId)?.name).toBe('Alimentação');
    expect(w.transactions.length).toBe(before);
  });

  it('respects an explicit payment method over habit', () => {
    const r = reply(demoWorkspace(), 'paguei 1.234,56 no ifood no pix');
    expect(r.kind === 'draft' && r.draft).toMatchObject({ amount: 123456, method: 'pix' });
  });

  it('keeps "Agora" short and puts closing invoices first', () => {
    const list = suggestions(demoWorkspace(), {});
    expect(list.length).toBeLessThanOrEqual(4);
    expect(list[0]?.id.startsWith('fat:')).toBe(true);
  });

  it('answers month-end questions as an estimate', () => {
    expect(reply(demoWorkspace(), 'quanto sobra até o fim do mês?')).toMatchObject({ kind: 'text', tag: 'estimativa' });
  });
});
