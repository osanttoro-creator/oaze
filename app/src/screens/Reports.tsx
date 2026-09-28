import { useState } from 'react';
import { useWorkspace } from '../state/store';
import { go } from '../state/route';
import { useDesktop } from '../state/session';
import { entries, methodLabel, monthlySeries, score, yearsWithData } from '../domain/calc';
import { todayYM } from '../domain/dates';
import { brl } from '../domain/money';
import type { Workspace } from '../domain/types';
import { Icon } from '../ui/Icon';
import { Money, ScreenHead } from '../ui/bits';

const M = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function csvFor(w: Workspace, year: number): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = entries(w, `${year}-01-01`, `${year}-12-31`).map((e) => [
    e.date, esc(e.description), e.kind === 'income' ? 'receita' : e.kind === 'expense' ? 'despesa' : 'transferência',
    esc(w.categories.find((c) => c.id === e.categoryId)?.name ?? ''), methodLabel(e.method), e.cardId ? 'crédito' : 'conta',
    (e.amount / 100).toFixed(2).replace('.', ','), e.confirmed ? 'confirmado' : 'previsto',
  ].join(';'));
  return ['data;descrição;tipo;categoria;forma;origem;valor;situação', ...rows].join('\r\n');
}

export function Reports() {
  const desktop = useDesktop();
  const w = useWorkspace();
  const years = yearsWithData(w);
  const [year, setYear] = useState(years[years.length - 1] ?? new Date().getFullYear());
  const series = monthlySeries(w, `${year}-01`, `${year}-12`);
  const prev = monthlySeries(w, `${year - 1}-01`, `${year - 1}-12`);
  const inc = series.reduce((s, x) => s + x.income, 0);
  const exp = series.reduce((s, x) => s + x.expense, 0);
  const prevExp = prev.reduce((s, x) => s + x.expense, 0);
  const max = Math.max(1, ...series.flatMap((s) => [s.income, s.expense]));
  const sc = score(w, todayYM());

  const download = () => {
    // BOM para o Excel abrir acentos certo
    const blob = new Blob(['﻿' + csvFor(w, year)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `oaze-${year}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <>
      <ScreenHead desktop={desktop} eyebrow="histórico" title="relatórios" onBack={() => go('mais')} right={
        <span className="month-switch">
          <button type="button" onClick={() => setYear(year - 1)} aria-label="Ano anterior"><Icon name="chevron-left" size={16} /></button>{year}
          <button type="button" onClick={() => setYear(year + 1)} disabled={year >= new Date().getFullYear()} aria-label="Próximo ano"><Icon name="chevron-right" size={16} /></button>
        </span>
      } />
      <div className="grid-3" style={{ marginBottom: 14 }}>
        <div className="kpi"><span className="eyebrow">entrou</span><Money className="mono in" value={inc} /></div>
        <div className="kpi"><span className="eyebrow">saiu</span><Money className="mono out" value={exp} /></div>
        <div className="kpi"><span className="eyebrow">guardou</span><span className="mono">{inc > 0 ? `${Math.round(((inc - exp) / inc) * 100)}%` : '—'}</span></div>
      </div>
      <section className="panel">
        <div className="panel-head"><h2 className="h2">mês a mês</h2><span className="small muted">{prevExp > 0 ? `${exp > prevExp ? '▲' : '▼'} ${brl(Math.abs(exp - prevExp))} de gasto vs ${year - 1}` : ''}</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 6, alignItems: 'end', height: 150 }} role="img" aria-label={`Receitas e despesas de ${year} por mês`}>
          {series.map((s, i) => (
            <div key={s.ym} style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: '100%' }} title={`${M[i]}: entrou ${brl(s.income)}, saiu ${brl(s.expense)}`}>
              <i style={{ flex: 1, height: `${(s.income / max) * 100}%`, background: 'var(--in)', borderRadius: '4px 4px 0 0', minHeight: s.income ? 2 : 0 }} />
              <i style={{ flex: 1, height: `${(s.expense / max) * 100}%`, background: 'var(--out)', borderRadius: '4px 4px 0 0', minHeight: s.expense ? 2 : 0 }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 6, marginTop: 8 }} className="mono small muted">{M.map((m) => <span key={m} style={{ textAlign: 'center', fontSize: 10 }}>{m}</span>)}</div>
        <div className="row small muted" style={{ marginTop: 12, gap: 16 }}><span className="in">■ receitas</span><span className="out">■ despesas</span></div>
      </section>
      <div className={desktop ? 'grid-2' : undefined} style={{ marginTop: 14, alignItems: 'start' }}>
        <section className="panel">
          <div className="panel-head"><h2 className="h2">oaze score</h2><span className="pill teal">{sc.total} · {sc.band.toLowerCase()}</span></div>
          {sc.parts.map((p) => (
            <div key={p.key} className="list-row" style={{ padding: '10px 2px' }}>
              <span className="list-icon" style={{ width: 34, height: 34, borderRadius: 10, color: p.ok ? 'var(--teal)' : 'var(--out)' }}><Icon name={p.ok ? 'circle-check' : 'circle'} size={18} /></span>
              <div className="grow"><div style={{ fontWeight: 600 }}>{p.name}</div><div className="small muted">{p.detail}</div></div>
              <span className="mono small">{p.points}/20</span>
            </div>
          ))}
        </section>
        <section className="panel" style={desktop ? { marginTop: 0 } : undefined}>
          <h2 className="h2">exportar</h2>
          <p className="small muted">Todos os lançamentos de {year} em CSV, com separador ponto e vírgula para abrir direto no Excel ou no Google Planilhas.</p>
          <button type="button" className="btn btn-ghost btn-block" onClick={download}><Icon name="download" size={18} />Baixar {year}.csv</button>
        </section>
      </div>
    </>
  );
}
