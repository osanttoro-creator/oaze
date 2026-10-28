/** @vitest-environment jsdom */
import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type ReportUI = {
  period(kind: string, month: string, year: number): { from: string; to: string; title: string };
  aggregate(profile: { categories: Array<{ id: string; name: string }> }, range: { from: string; to: string }): {
    income: number; expense: number; categories: Array<{ name: string; value: number }>;
    monthly: Array<{ label: string; income: number; expense: number }>;
  };
};

let report: ReportUI;
beforeAll(() => {
  const source = readFileSync(resolve(process.cwd(), 'live-site/assets/app/estado-oaze.js'), 'utf8');
  new Function('window', 'document', source)(window, document);
  report = (window as unknown as Window & { OazeEstadoUI: ReportUI }).OazeEstadoUI;
});

describe('Estado do OAZE', () => {
  it('delimita fevereiro bissexto e valida o ano', () => {
    expect(report.period('month', '2024-02', 2024)).toMatchObject({ from: '2024-02-01', to: '2024-02-29' });
    expect(report.period('year', '', 2026)).toMatchObject({ from: '2026-01-01', to: '2026-12-31' });
    expect(() => report.period('month', '2026-13', 2026)).toThrow();
  });

  it('soma somente ocorrências confirmadas do período, sem duplicar transferências', () => {
    const selected = { from: '2026-10-01', to: '2026-10-31' };
    const data = [
      { kind: 'income', amount: 1000.1, date: '2026-10-01', confirmed: true },
      { kind: 'expense', amount: 200.2, date: '2026-10-02', confirmed: true, categoryId: 'food' },
      { kind: 'expense', amount: 9, date: '2026-10-03', confirmed: false, categoryId: 'food' },
      { kind: 'expense', amount: 50, date: '2026-10-04', confirmed: true, contaNosTotais: false },
      { kind: 'transfer', amount: 300, date: '2026-10-05', confirmed: true },
    ];
    (window as unknown as Window & { Calc: { entries: (...args: unknown[]) => typeof data } }).Calc = {
      entries: (from, to) => { expect([from, to]).toEqual([selected.from, selected.to]); return data; },
    };
    const result = report.aggregate({ categories: [{ id: 'food', name: 'Alimentação' }] }, selected);
    expect(result.income).toBe(1000.1);
    expect(result.expense).toBe(200.2);
    expect(result.categories).toEqual([{ name: 'Alimentação', value: 200.2 }]);
    expect(result.monthly).toHaveLength(1);
  });
});
