import { useState } from 'react';
import { useWorkspace } from '../state/store';
import { go, openCoco, openNovo } from '../state/route';
import { useDesktop } from '../state/session';
import { compound, contributedTotal, investedTotal, investmentSeries, investmentValueAt } from '../domain/calc';
import { addMonths, monthLabel, todayYM } from '../domain/dates';
import { brl } from '../domain/money';
import type { InvestmentType } from '../domain/types';
import { Icon } from '../ui/Icon';
import { CocoFace, Money, ScreenHead } from '../ui/bits';
import { TINTS } from './Home';

const TYPE: Record<InvestmentType, string> = { tesouro: 'Tesouro Direto', cdb: 'CDB', fii: 'Fundo imobiliário', acoes: 'Ações', outros: 'Outros' };

export function Investments() {
  const desktop = useDesktop();
  const w = useWorkspace();
  const [monthly, setMonthly] = useState(50000);
  const [rate, setRate] = useState(10);
  const [months, setMonths] = useState(24);
  const total = investedTotal(w);
  const put = contributedTotal(w);
  const series = investmentSeries(w, addMonths(todayYM(), -11), todayYM());
  const max = Math.max(1, ...series.map((s) => s.value));
  const path = 'M' + series.map((s, i) => `${((i / 11) * 320).toFixed(1)} ${(88 - (s.value / max) * 78).toFixed(1)}`).join(' L');
  const byType = new Map<string, number>();
  for (const iv of w.investments) byType.set(iv.type, (byType.get(iv.type) ?? 0) + investmentValueAt(iv));
  const types = [...byType.entries()].sort((a, b) => b[1] - a[1]);
  const sim = compound(monthly, rate, months);

  const left = (
    <>
      <section className="panel">
        <span className="eyebrow">patrimônio investido</span>
        <div className="hero" style={{ margin: '8px 0 6px' }}><Money value={total} /></div>
        <div className="small muted">aportado <Money value={put} /> · rendeu <Money value={total - put} /></div>
        <svg viewBox="0 0 320 92" style={{ width: '100%', height: 120, marginTop: 14 }} role="img" aria-label="Evolução do patrimônio investido em 12 meses">
          <defs><linearGradient id="inv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5FA99B" stopOpacity=".3" /><stop offset="1" stopColor="#5FA99B" stopOpacity="0" /></linearGradient></defs>
          <path d={`${path} L320 92 L0 92 Z`} fill="url(#inv)" />
          <path d={path} fill="none" stroke="#5FA99B" strokeWidth="2.5" />
        </svg>
        <div className="row between mono small muted"><span>{monthLabel(addMonths(todayYM(), -11))}</span><span>{monthLabel(todayYM())}</span></div>
      </section>
      <section className="panel">
        <h2 className="h2" style={{ marginBottom: 10 }}>por tipo</h2>
        {types.length === 0 && <p className="muted small">Nenhum aporte ainda.</p>}
        {types.map(([t, v], i) => (
          <div key={t} className="cat-row">
            <span className="cat-icon" style={{ background: TINTS[i] }}><Icon name="trending-up" size={18} /></span>
            <span className="name">{TYPE[t as InvestmentType]}</span>
            <span className="val"><Money value={v} /> · {Math.round((v / Math.max(1, total)) * 100)}%</span>
            <span className="bar"><i style={{ width: `${(v / Math.max(1, total)) * 100}%`, background: TINTS[i] }} /></span>
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 14 }} onClick={() => openNovo('aporte')}><Icon name="sprout" size={18} />Registrar aporte</button>
      </section>
    </>
  );

  const simPanel = (
    <section className="panel">
      <h2 className="h2">simulador</h2>
      <p className="small muted" style={{ margin: '4px 0 16px' }}>Juros compostos com aporte fixo. É uma estimativa: a taxa real muda.</p>
      <label className="field" style={{ marginBottom: 14 }}><span>aporte mensal · {brl(monthly)}</span><input type="range" min={5000} max={500000} step={5000} value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} /></label>
      <label className="field" style={{ marginBottom: 14 }}><span>taxa ao ano · {rate}%</span><input type="range" min={1} max={20} step={0.5} value={rate} onChange={(e) => setRate(Number(e.target.value))} /></label>
      <label className="field" style={{ marginBottom: 18 }}><span>prazo · {months} meses</span><input type="range" min={6} max={120} step={6} value={months} onChange={(e) => setMonths(Number(e.target.value))} /></label>
      <div className="grid-2">
        <div className="kpi"><span className="eyebrow">no fim</span><span className="mono">{brl(sim.value)}</span></div>
        <div className="kpi"><span className="eyebrow">de juros</span><span className="mono in">{brl(sim.interest)}</span></div>
      </div>
      <button type="button" className="coco-note" style={{ width: '100%', textAlign: 'left' }} onClick={() => openCoco('conversa')}>
        <CocoFace mood="animada" size={34} />
        <span>Quer que eu monte um plano de aportes com esse valor? Posso encaixar depois do salário.</span>
      </button>
    </section>
  );

  return (
    <>
      <ScreenHead desktop={desktop} eyebrow="patrimônio" title="investimentos" onBack={() => go('mais')} />
      {desktop ? <div className="grid-2" style={{ alignItems: 'start' }}><div>{left}</div>{simPanel}</div> : <>{left}<div style={{ height: 14 }} />{simPanel}</>}
    </>
  );
}
