import { describe, expect, it } from 'vitest';
import { calendarEvents, calendarYear, confirmedTotals, moveSelectedMonth, weekDays } from './calendar';
import { emptyWorkspace } from './seed';

describe('agenda financeira', () => {
  it('a semana atravessa o ano e mantém segunda como primeiro dia', () => {
    expect(weekDays('2027-01-01')).toEqual([
      '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31',
      '2027-01-01', '2027-01-02', '2027-01-03',
    ]);
  });

  it('ao passar para fevereiro, prende o dia ao último dia válido', () => {
    expect(moveSelectedMonth('2027-01-31', 1)).toBe('2027-02-28');
    expect(moveSelectedMonth('2028-01-31', 1)).toBe('2028-02-29');
  });

  it('a agenda mostra previstos, mas soma apenas lançamentos confirmados', () => {
    const w = emptyWorkspace();
    w.transactions.push(
      { id: 'salario', kind: 'income', description: 'Salário', amount: 100000, date: '2026-10-05', method: 'pix', confirmed: true, origin: 'manual', createdAt: '' },
      { id: 'aluguel', kind: 'expense', description: 'Aluguel', amount: 40000, date: '2026-10-10', method: 'pix', confirmed: false, origin: 'manual', createdAt: '' },
      { id: 'transfer', kind: 'transfer', description: 'Reserva', amount: 10000, date: '2026-10-11', method: 'transferencia', confirmed: true, origin: 'manual', createdAt: '' },
    );
    const events = calendarEvents(w, '2026-10-01', '2026-10-31');
    expect(events.map((e) => e.title)).toEqual(['Salário', 'Aluguel']);
    expect(confirmedTotals(events)).toEqual({ income: 100000, expense: 0, pending: 1 });
    const october = calendarYear(w, 2026)[9];
    expect(october).toMatchObject({ income: 100000, expense: 0, pending: 1 });
  });
});
