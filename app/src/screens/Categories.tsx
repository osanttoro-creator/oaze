import { useState } from 'react';
import { useWorkspace } from '../state/store';
import { go } from '../state/route';
import { useDesktop } from '../state/session';
import { categoryTotals } from '../domain/calc';
import { addMonths, monthEnd, monthName, monthStart, todayYM } from '../domain/dates';
import { brl } from '../domain/money';
import type { YM } from '../domain/types';
import { Icon } from '../ui/Icon';
import { CocoFace, Money, ScreenHead, Seg } from '../ui/bits';
import { MonthSwitch, TINTS } from './Home';

export function Categories() {
  const desktop = useDesktop();
  const w = useWorkspace();
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [ym, setYm] = useState<YM>(todayYM());
  const rows = categoryTotals(w, kind, monthStart(ym), monthEnd(ym));
  const prev = categoryTotals(w, kind, monthStart(addMonths(ym, -1)), monthEnd(addMonths(ym, -1)));
  const sum = rows.reduce((s, r) => s + r.total, 0);
  let acc = 0;
  const conic = rows.length
    ? `conic-gradient(${rows.map((r, i) => { const a = acc; acc += (r.total / sum) * 100; return `${TINTS[i % TINTS.length]} ${a}% ${Math.max(a, acc - 0.6)}%, #13232F ${Math.max(a, acc - 0.6)}% ${acc}%`; }).join(',')})`
    : 'var(--fill)';
  const first = rows[0];

  return (
    <>
      <ScreenHead desktop={desktop} eyebrow="para onde foi" title="categorias" onBack={() => go('mais')} right={<MonthSwitch ym={ym} onChange={setYm} />} />
      <Seg label="Tipo" value={kind} options={[['expense', 'Despesas'], ['income', 'Receitas']]} onChange={setKind} />
      <div className={desktop ? 'grid-2' : undefined} style={{ marginTop: 16, alignItems: 'start' }}>
        <section className="panel">
          <div className="donut" style={{ background: conic }} role="img" aria-label={`Total de ${kind === 'expense' ? 'despesas' : 'receitas'}: ${brl(sum)}`}>
            <div className="donut-center"><div><div className="eyebrow">{kind === 'expense' ? 'saiu' : 'entrou'}</div><div className="mono" style={{ fontSize: 20, marginTop: 6 }}><Money value={sum} /></div></div></div>
          </div>
          {first && (
            <div className="coco-note">
              <CocoFace mood="curiosa" size={34} />
              <span>{first.name} é {Math.round(first.pct)}% do que {kind === 'expense' ? 'saiu' : 'entrou'} em {monthName(ym)}.{rows[1] ? ` ${rows[1].name} vem em seguida.` : ''}</span>
            </div>
          )}
        </section>
        <section className="panel" style={desktop ? { marginTop: 0 } : undefined}>
          {rows.length === 0 && <p className="muted small">Nada confirmado em {monthName(ym)}.</p>}
          {rows.map((r, i) => {
            const before = prev.find((p) => p.id === r.id)?.total ?? 0;
            const diff = r.total - before;
            return (
              <div key={r.id} className="cat-row">
                <span className="cat-icon" style={{ background: TINTS[i % TINTS.length] }}><Icon name={r.icon} size={18} /></span>
                <span className="name">{r.name} <span className="mono small muted">{Math.round(r.pct)}%</span></span>
                <Money className="val" value={r.total} />
                <span className="small muted" style={{ gridColumn: '2 / 4' }}>
                  {before === 0 ? 'novo neste mês' : diff === 0 ? 'igual ao mês passado' : `${diff > 0 ? '▲' : '▼'} ${brl(Math.abs(diff))} vs ${monthName(addMonths(ym, -1)).slice(0, 3)}`}
                </span>
              </div>
            );
          })}
        </section>
      </div>
    </>
  );
}
