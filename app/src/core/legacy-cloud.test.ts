import { describe, expect, it } from 'vitest';
import { migrateLegacyCloudProfiles } from './legacy-cloud';

describe('prévia da conta OAZE anterior', () => {
  it('converte o mapa de perfis do banco sem alterá-lo', () => {
    const profiles = {
      pessoal: {
        id: 'pessoal', name: 'Pessoal', accounts: [], cards: [], categories: [],
        transactions: [{ id: 't1', kind: 'expense', description: 'Mercado', amount: 12.5, date: '2026-10-09', meio: 'pix' }],
        investments: [], goals: [], invoices: {}, budgets: {},
      },
    };
    const before = structuredClone(profiles);
    const converted = migrateLegacyCloudProfiles(profiles, 'Ana');
    expect(converted?.report.transactions).toBe(1);
    expect(converted?.workspaces[0]?.transactions[0]).toMatchObject({ amount: 1250, method: 'pix' });
    expect(profiles).toEqual(before);
  });

  it('recusa documento fora do formato esperado', () => {
    expect(migrateLegacyCloudProfiles([], 'Ana')).toBeNull();
    expect(migrateLegacyCloudProfiles(null, 'Ana')).toBeNull();
  });
});
