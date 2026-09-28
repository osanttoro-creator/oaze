import { useState } from 'react';
import { useWorkspace } from '../state/store';
import { go, toast } from '../state/route';
import { useDesktop } from '../state/session';
import { addGoal, depositToGoal, setBudget } from '../state/actions';
import { budgetUsage, goalStatus } from '../domain/calc';
import { addMonths, monthEnd, monthLabel, dayMonth, todayYM } from '../domain/dates';
import { brl, parseBRL } from '../domain/money';
import type { Goal, Workspace } from '../domain/types';
import { Icon } from '../ui/Icon';
import { CocoFace, Money, ScreenHead, Seg, Sheet } from '../ui/bits';

export function Goals() {
  const desktop = useDesktop();
  const w = useWorkspace();
  const [tab, setTab] = useState<'metas' | 'orc'>('metas');
  const [sheet, setSheet] = useState<'meta' | 'orc' | { deposit: Goal } | null>(null);

  const metas = (
    <section>
      {desktop && <h2 className="h2" style={{ margin: '0 0 12px' }}>metas</h2>}
      {w.goals.map((g) => {
        const s = goalStatus(g);
        return (
          <article key={g.id} className="panel" style={{ marginBottom: 14 }}>
            <div className="row between">
              <div className="row"><span className="list-icon"><Icon name={g.icon} /></span><b>{g.name}</b></div>
              <span className="mono small muted">até {monthLabel(g.deadline, true)}</span>
            </div>
            <div className="row between" style={{ margin: '14px 0 10px', alignItems: 'baseline' }}>
              <span className="mono" style={{ fontSize: 22 }}><Money value={s.saved} /></span>
              <span className="mono small muted">de <Money value={g.target} /> · {Math.round(s.pct)}%</span>
            </div>
            <div className="progress" aria-label={`${Math.round(s.pct)}% guardado; o ritmo ideal hoje é ${Math.round(s.idealPct)}%`}>
              <i style={{ width: `${Math.min(100, s.pct)}%`, background: s.onPace ? 'var(--teal)' : 'var(--out)' }} />
              <b style={{ left: `${Math.min(100, s.idealPct)}%` }} title="ritmo ideal" />
            </div>
            <div className="coco-note">
              <CocoFace mood={s.onPace ? 'feliz' : 'pensando'} size={34} />
              <span>{s.remaining <= 0 ? 'Meta completa. Que tal decidir o próximo passo?' : s.onPace ? `Você está no ritmo da meta. Faltam ${brl(s.remaining)}.` : `A meta ficou abaixo do ritmo planejado. Guardando ${brl(s.monthlyNeeded)} por mês, chega em ${monthLabel(g.deadline)}.`}</span>
            </div>
            <button type="button" className="btn btn-ghost btn-s" style={{ marginTop: 12 }} onClick={() => setSheet({ deposit: g })}><Icon name="plus" size={16} />Guardar</button>
          </article>
        );
      })}
      <button type="button" className="btn btn-line btn-block" onClick={() => setSheet('meta')}><Icon name="target" size={18} />Nova meta</button>
    </section>
  );

  const orcs = <Budgets w={w} desktop={desktop} onAdd={() => setSheet('orc')} />;

  return (
    <>
      <ScreenHead desktop={desktop} eyebrow="planejar" title="metas e orçamentos" onBack={() => go('mais')} />
      {desktop ? (
        <div className="grid-2" style={{ alignItems: 'start' }}>{metas}{orcs}</div>
      ) : (
        <>
          <Seg label="Ver" value={tab} options={[['metas', 'Metas'], ['orc', 'Orçamentos']]} onChange={setTab} />
          <div style={{ height: 16 }} />
          {tab === 'metas' ? metas : orcs}
        </>
      )}
      {sheet === 'meta' && <NewGoal desktop={desktop} onClose={() => setSheet(null)} />}
      {sheet === 'orc' && <NewBudget w={w} desktop={desktop} onClose={() => setSheet(null)} />}
      {sheet && typeof sheet === 'object' && <Deposit goal={sheet.deposit} w={w} desktop={desktop} onClose={() => setSheet(null)} />}
    </>
  );
}

function Budgets({ w, desktop, onAdd }: { w: Workspace; desktop: boolean; onAdd: () => void }) {
  const list = budgetUsage(w, todayYM());
  return (
    <section>
      {desktop && <h2 className="h2" style={{ margin: '0 0 12px' }}>orçamentos de {monthLabel(todayYM()).split(' ')[0]}</h2>}
      <div className="panel">
        {list.length === 0 && <p className="muted small">Defina um limite por categoria e eu aviso antes de passar.</p>}
        {list.map((b) => (
          <div key={b.categoryId} style={{ padding: '10px 0' }}>
            <div className="row between"><b>{b.name}</b><span className="mono small"><Money value={b.used} /> <span className="muted">/ <Money value={b.limit} /></span></span></div>
            <div className="progress" style={{ margin: '8px 0 6px' }}><i style={{ width: `${Math.min(100, (b.used / b.limit) * 100)}%`, background: b.over ? 'var(--milk)' : 'var(--teal)' }} /></div>
            <div className="small muted">{b.over ? `Passou ${brl(b.used - b.limit)} do planejado. Posso mostrar o que mudou.` : `Restam ${brl(b.limit - b.used)} até ${dayMonth(monthEnd(todayYM()))}.`}</div>
          </div>
        ))}
        <button type="button" className="btn btn-line btn-block" style={{ marginTop: 12 }} onClick={onAdd}><Icon name="sliders-horizontal" size={18} />Definir orçamento</button>
      </div>
    </section>
  );
}

function NewGoal({ desktop, onClose }: { desktop: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [months, setMonths] = useState(12);
  const cents = parseBRL(target) ?? 0;
  return (
    <Sheet onClose={onClose} desktop={desktop} label="Nova meta">
      <form className="stack" onSubmit={(e) => { e.preventDefault(); if (!name.trim() || cents <= 0) return; addGoal(name.trim(), cents, addMonths(todayYM(), months - 1)); toast('Meta criada.'); onClose(); }}>
        <h2 className="h2" style={{ fontSize: 22 }}>nova meta</h2>
        <label className="field"><span>para quê</span><input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Viagem, reserva, notebook…" maxLength={40} /></label>
        <label className="field"><span>quanto</span><input className="input mono" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0,00" /></label>
        <label className="field"><span>em {months} meses · {brl(Math.ceil(cents / months))} por mês</span><input type="range" min={1} max={60} value={months} onChange={(e) => setMonths(Number(e.target.value))} /></label>
        <button type="submit" className="btn btn-milk btn-block" disabled={!name.trim() || cents <= 0}>Criar meta</button>
      </form>
    </Sheet>
  );
}

function NewBudget({ w, desktop, onClose }: { w: Workspace; desktop: boolean; onClose: () => void }) {
  const cats = w.categories.filter((c) => c.kind === 'expense');
  const [cat, setCat] = useState(cats[0]?.id ?? '');
  const [limit, setLimit] = useState('');
  const cents = parseBRL(limit) ?? 0;
  return (
    <Sheet onClose={onClose} desktop={desktop} label="Definir orçamento">
      <form className="stack" onSubmit={(e) => { e.preventDefault(); setBudget(cat, cents); toast(cents > 0 ? 'Orçamento salvo.' : 'Orçamento removido.'); onClose(); }}>
        <h2 className="h2" style={{ fontSize: 22 }}>orçamento mensal</h2>
        <div className="chips">{cats.map((c) => <button key={c.id} type="button" className="chip teal" aria-pressed={cat === c.id} onClick={() => { setCat(c.id); setLimit(w.budgets[c.id] ? String(w.budgets[c.id]! / 100).replace('.', ',') : ''); }}>{c.name}</button>)}</div>
        <label className="field"><span>limite por mês (vazio remove)</span><input className="input mono" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0,00" /></label>
        <button type="submit" className="btn btn-milk btn-block">Salvar</button>
      </form>
    </Sheet>
  );
}

function Deposit({ goal, w, desktop, onClose }: { goal: Goal; w: Workspace; desktop: boolean; onClose: () => void }) {
  const [v, setV] = useState('');
  const [acc, setAcc] = useState<string>('');
  const cents = parseBRL(v) ?? 0;
  return (
    <Sheet onClose={onClose} desktop={desktop} label="Guardar na meta">
      <form className="stack" onSubmit={(e) => { e.preventDefault(); if (cents <= 0) return; const undo = depositToGoal(goal.id, cents, acc || undefined); toast(`Guardei ${brl(cents)} em ${goal.name}.`, undo); onClose(); }}>
        <h2 className="h2" style={{ fontSize: 22 }}>guardar em {goal.name.toLowerCase()}</h2>
        <input className="input mono" autoFocus inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} placeholder="0,00" style={{ fontSize: 22, height: 58 }} />
        <div className="eyebrow">saiu de qual conta</div>
        <div className="chips">
          <button type="button" className="chip" aria-pressed={acc === ''} onClick={() => setAcc('')}>Só marcar</button>
          {w.accounts.map((a) => <button key={a.id} type="button" className="chip" aria-pressed={acc === a.id} onClick={() => setAcc(a.id)}>{a.name}</button>)}
        </div>
        <p className="small muted" style={{ margin: 0 }}>Guardar não é despesa: o dinheiro só muda de lugar e continua no seu patrimônio.</p>
        <button type="submit" className="btn btn-milk btn-block" disabled={cents <= 0}>Guardar</button>
      </form>
    </Sheet>
  );
}
