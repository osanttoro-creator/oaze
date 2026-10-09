import { describe, expect, it } from 'vitest';
import type { Card, Workspace } from '../../domain/types';
import type { Settings } from '../../state/store';
import { planReminders } from './index';

/*
  Lembrete é a função que mais pode errar contra o usuário: ele aparece na tela de
  bloqueio, às vezes na mão de outra pessoa. O teste trava os três níveis de
  privacidade e o horizonte.
*/

function space(cards: Card[] = []): Workspace {
  return {
    id: 'ws1',
    name: 'Pessoal',
    accounts: [],
    cards,
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

function card(id: string, name: string, dueDay: number): Card {
  return {
    id,
    name,
    bank: 'Nubank',
    last4: '1234',
    network: 'Visa',
    validThru: '12/30',
    holder: 'ANA SOUZA',
    limit: 500000,
    closingDay: 10,
    dueDay,
  };
}

function settings(patch: Partial<Settings> = {}): Settings {
  return {
    hideValues: false,
    lockAfterMin: 5,
    biometrics: false,
    notifPrivacy: 'sem',
    reminders: { fatura: true, fixa: false, rec: false },
    reminderHour: 9,
    coco: { consentVersion: 1, consentAt: null, learning: true },
    ...patch,
  };
}

const now = new Date('2026-10-06T08:00:00.000Z');

describe('privacidade do aviso', () => {
  const w = space([card('c1', 'Nubank', 20)]);

  it('o padrão não mostra valor, mas mostra do que se trata', () => {
    const [first] = planReminders(w, settings(), now);
    expect(first?.body).toContain('Nubank');
    expect(first?.body).not.toMatch(/R\$/);
  });

  it('"genérico" não mostra nem o nome do cartão', () => {
    const [first] = planReminders(w, settings({ notifPrivacy: 'generico' }), now);
    expect(first?.body).not.toContain('Nubank');
  });

  it('"com valores" é o único que mostra dinheiro', () => {
    const w2 = space([card('c1', 'Nubank', 20)]);
    w2.transactions = [
      {
        id: 't1',
        kind: 'expense',
        description: 'Compra',
        amount: 124000,
        date: '2026-10-02',
        method: 'cartao_fisico',
        cardId: 'c1',
        confirmed: true,
        origin: 'manual',
        createdAt: '2026-10-02T10:00:00.000Z',
      },
    ];
    const [first] = planReminders(w2, settings({ notifPrivacy: 'valores' }), now);
    expect(first?.body).toMatch(/R\$\s?1\.240,00/);
  });
});

describe('horizonte e quantidade', () => {
  it('avisa um dia antes do vencimento, não no dia', () => {
    const [first] = planReminders(space([card('c1', 'Nubank', 20)]), settings(), now);
    expect(first?.schedule.at.toISOString().slice(0, 10)).toBe('2026-10-19');
  });

  it('nada agendado no passado', () => {
    const items = planReminders(space([card('c1', 'Nubank', 2)]), settings(), now);
    expect(items.every((i) => i.schedule.at > now)).toBe(true);
  });

  it('nada além de 30 dias', () => {
    const limit = new Date(now);
    limit.setDate(limit.getDate() + 30);
    const items = planReminders(space([card('c1', 'Nubank', 20), card('c2', 'Inter', 5)]), settings(), now);
    expect(items.every((i) => i.schedule.at <= limit)).toBe(true);
  });

  it('nenhum lembrete quando a pessoa desligou tudo', () => {
    const off = settings({ reminders: { fatura: false, fixa: false, rec: false } });
    expect(planReminders(space([card('c1', 'Nubank', 20)]), off, now)).toHaveLength(0);
  });

  it('cartão arquivado não gera aviso', () => {
    const c = { ...card('c1', 'Nubank', 20), archived: true };
    expect(planReminders(space([c]), settings(), now)).toHaveLength(0);
  });

  it('o mesmo plano gera os mesmos ids — reagendar substitui, não acumula', () => {
    const w = space([card('c1', 'Nubank', 20)]);
    const a = planReminders(w, settings(), now).map((i) => i.id);
    const b = planReminders(w, settings(), now).map((i) => i.id);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
  });

  it('teto de 48 avisos, mesmo com muitos cartões', () => {
    const many = Array.from({ length: 40 }, (_, i) => card(`c${i}`, `Banco ${i}`, 20));
    expect(planReminders(space(many), settings(), now).length).toBeLessThanOrEqual(48);
  });
});
