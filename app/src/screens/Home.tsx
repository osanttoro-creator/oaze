import { useState } from 'react';
import { useApp, useWorkspace, updateSettings } from '../state/store';
import { go, openCoco, openNovo } from '../state/route';
import { useDesktop } from '../state/session';
import { OazeIntelligence, type FieldState } from '../design-system';
import { useSyncStatus } from '../core/sync/engine';
import {
  accountBalance, categoryTotals, currentBalance, currentInvoiceRef, dueItems, investedTotal, invoice, monthTotals, monthWave, openInvoicesTotal, totalBalance,
} from '../domain/calc';
import { addDaysISO, addMonths, dayMonth, monthEnd, monthLabel, monthName, monthStart, parseISO, todayISO, todayYM } from '../domain/dates';
import { Icon } from '../ui/Icon';
import { TINTS } from '../ui/chart-colors';
import { CocoFace, Money } from '../ui/bits';
import { Wallet } from '../ui/Wallet';
import { walletItems } from '../ui/Cards';
import { Wave } from '../ui/Wave';
import { brl } from '../domain/money';
import { suggestions, countWord } from '../coco/engine';
import type { YM } from '../domain/types';
import type { EntryType } from '../state/actions';

function greeting(): string {
  const h = new Date().getHours();
  return h < 5 ? 'boa noite,' : h < 12 ? 'bom dia,' : h < 18 ? 'boa tarde,' : 'boa noite,';
}

export function MonthSwitch({ ym, onChange }: { ym: YM; onChange: (ym: YM) => void }) {
  return (
    <span className="month-switch">
      <button type="button" onClick={() => onChange(addMonths(ym, -1))} aria-label="Mês anterior"><Icon name="chevron-left" size={16} /></button>
      {monthLabel(ym)}
      <button type="button" onClick={() => onChange(addMonths(ym, 1))} aria-label="Próximo mês" disabled={ym >= addMonths(todayYM(), 6)}><Icon name="chevron-right" size={16} /></button>
    </span>
  );
}

export function EyeBell() {
  const hide = useApp((s) => s.settings.hideValues);
  const w = useWorkspace();
  const soon = dueItems(w, todayISO(), addDaysISO(todayISO(), 3)).length > 0;
  return (
    <>
      <button type="button" className="icon-btn" onClick={() => updateSettings({ hideValues: !hide })} aria-label={hide ? 'Mostrar valores' : 'Esconder valores'} aria-pressed={hide}>
        <Icon name={hide ? 'eye-off' : 'eye'} />
      </button>
      <button type="button" className="icon-btn" onClick={() => go('lembretes')} aria-label={soon ? 'Lembretes, há vencimentos próximos' : 'Lembretes'}>
        <Icon name="bell" />
        {soon && <span className="dot" />}
      </button>
    </>
  );
}

export function Home() {
  const desktop = useDesktop();
  const w = useWorkspace();
  const owner = useApp((s) => s.owner.name);
  const decided = useApp((s) => s.cocoDecisions);
  const sync = useSyncStatus();
  const [ym, setYm] = useState<YM>(todayYM());
  const [picked, setPicked] = useState<string | null>(null);
  const [cardsOpen, setCardsOpen] = useState(true);

  const accounts = currentBalance(w);
  const invested = investedTotal(w);
  const total = totalBalance(w);
  const lastMonthEnd = monthEnd(addMonths(todayYM(), -1));
  const before = totalBalance(w, lastMonthEnd);
  const change = before > 0 ? ((total - before) / before) * 100 : null;
  const items = walletItems(w.accounts, w.cards, owner.toUpperCase());
  const selected = items.find((item) => item.id === picked);
  const selectedCard = selected?.kind === 'credito' ? w.cards.find((card) => card.id === selected.id) : null;
  const selectedInvoice = selectedCard ? invoice(w, selectedCard.id, currentInvoiceRef(w, selectedCard)) : null;
  const walletValue = selected?.kind === 'debito' ? accountBalance(w, selected.id) : selectedCard ? selectedInvoice?.remaining ?? 0 : total;

  const t = monthTotals(w, ym);
  const isNow = ym === todayYM();
  const today = isNow ? parseISO(todayISO()).getDate() : ym < todayYM() ? null : 0;
  const cats = categoryTotals(w, 'expense', monthStart(ym), monthEnd(ym)).slice(0, 5);
  const top = cats[0]?.total ?? 1;
  const dueEnd = monthEnd(todayYM()) > addDaysISO(todayISO(), 10) ? monthEnd(todayYM()) : addDaysISO(todayISO(), 10);
  const due = dueItems(w, todayISO(), dueEnd).slice(0, 4);
  const pending = suggestions(w, decided).filter((s) => !decided[s.id]).length;
  const intelligenceState: FieldState = sync.phase === 'error' ? 'error' : sync.phase === 'syncing' ? 'processing' : pending ? 'thinking' : 'idle';

  const quick: [EntryType, string, Parameters<typeof Icon>[0]['name']][] = [
    ['despesa', 'Despesa', 'arrow-up-right'], ['receita', 'Receita', 'arrow-down-left'], ['transf', 'Transferir', 'arrow-left-right'], ['aporte', 'Aporte', 'sprout'],
  ];

  const wallet = (
    <Wallet
      items={items}
      picked={selected?.id ?? null}
      open={cardsOpen}
      onPick={(id) => setPicked(picked === id ? null : id)}
      onPocket={() => {
        setPicked(null);
        setCardsOpen((open) => !open);
      }}
      eyebrow={selected ? selected.kind === 'credito' ? 'fatura do cartão' : 'saldo da conta' : 'saldo total'}
      badge={!selected && change != null && <span className={`mono small ${change >= 0 ? 'in' : 'out'}`}>{change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1).replace('.', ',')}% vs {monthLabel(addMonths(todayYM(), -1)).slice(0, 3)}</span>}
      value={<Money value={walletValue} />}
      sub={selected ? <>{selected.name} · {selected.kind === 'credito' ? 'crédito' : 'débito'}</> : <><Money value={accounts} /> em contas · <Money value={invested} /> investidos</>}
      hint={!cardsOpen ? 'toque para mostrar os cartões' : selected ? 'toque no cartão para guardar' : items.length ? 'toque num cartão para abrir' : 'adicione uma conta na carteira'}
    />
  );

  const quickRow = (
    <div className="quick">
      {quick.map(([type, label, icon]) => (
        <button key={type} type="button" onClick={() => openNovo(type)}>
          <Icon name={icon} size={24} />
          {label}
        </button>
      ))}
    </div>
  );

  const cocoCta = (
    <button type="button" className="coco-cta" onClick={() => openCoco('agora')} aria-label={desktop ? undefined : `Abrir a Coco, ${pending ? `${countWord(pending)} ${pending === 1 ? 'pendência' : 'pendências'}` : 'sem pendências'}`}>
      {desktop ? <CocoFace mood="feliz" size={64} /> : <OazeIntelligence state={intelligenceState} size={64} label={null} className="home-intelligence" />}
      <span className="grow">{pending ? `${countWord(pending).replace(/^./, (c) => c.toUpperCase())} ${pending === 1 ? 'coisa' : 'coisas'} para ver` : 'Tudo em dia com a Coco'}</span>
      <Icon name="chevron-right" />
    </button>
  );

  const monthPanel = (
    <section className="panel" style={{ overflow: 'hidden' }}>
      <div className="row between">
        <span className="eyebrow">sobra de {monthName(ym)}</span>
        {!desktop && <MonthSwitch ym={ym} onChange={setYm} />}
      </div>
      <div className="row between" style={{ alignItems: 'flex-end', marginTop: 10 }}>
        <div className="hero-l"><Money value={t.balance} /></div>
        {desktop && (
          <div className="inout">
            <div><div className="eyebrow" style={{ fontSize: 10 }}>entrou</div><Money className="mono in" value={t.income} signed={false} /></div>
            <div><div className="eyebrow" style={{ fontSize: 10 }}>saiu</div><Money className="mono out" value={t.expense} /></div>
          </div>
        )}
      </div>
      {!desktop && (
        <div className="row small muted" style={{ marginTop: 8, gap: 16 }}>
          <span className="in">▲ <Money value={t.income} /></span>
          <span className="out">▼ <Money value={t.expense} /></span>
          {t.pendingCount > 0 && <span>{t.pendingCount} previsto{t.pendingCount > 1 ? 's' : ''}</span>}
        </div>
      )}
      <Wave points={monthWave(w, ym)} today={today || null} label={`Resultado de ${monthName(ym)}: entrou ${brl(t.income)}, saiu ${brl(t.expense)}`} />
    </section>
  );

  const catPanel = (
    <section className="panel">
      <div className="panel-head">
        <h2 className="h2">onde foi o mês</h2>
        <button type="button" className="link" onClick={() => go('categorias')}>ver tudo</button>
      </div>
      {cats.length === 0 && <p className="muted small">Nenhuma despesa confirmada em {monthName(ym)}.</p>}
      {cats.map((c, i) => (
        <div className="cat-row" key={c.id}>
          <span className="cat-icon" style={{ background: TINTS[i % TINTS.length] }}><Icon name={c.icon} size={20} /></span>
          <span className="name">{c.name}</span>
          <Money className="val" value={c.total} />
          <span className="bar"><i style={{ width: `${(c.total / top) * 100}%`, background: TINTS[i % TINTS.length] }} /></span>
        </div>
      ))}
    </section>
  );

  const duePanel = (
    <section className="panel">
      <div className="panel-head">
        <h2 className="h2">até o fim do mês</h2>
        <button type="button" className="link" onClick={() => go('lembretes')}>lembretes</button>
      </div>
      {due.length === 0 && <p className="muted small">Nada vencendo nos próximos dias.</p>}
      <div className="timeline">
        {due.map((d) => (
          <div className="tl-item" key={d.key}>
            <span className="tl-dot" style={{ borderColor: d.kind === 'income' ? 'var(--in)' : 'var(--teal)' }} />
            <span className="when">{dayMonth(d.date)} · {d.detail}</span>
            <Money className={`amt ${d.kind === 'income' ? 'in' : ''}`} value={d.kind === 'income' ? d.amount : -d.amount} signed />
            <span className="what">{d.title}</span>
          </div>
        ))}
      </div>
    </section>
  );

  if (desktop) {
    return (
      <>
        <header className="d-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>visão geral</div>
            <h1 className="title">início</h1>
          </div>
          <div className="row">
            <span className="pill" style={{ height: 40, borderRadius: 20, padding: '0 8px' }}><MonthSwitch ym={ym} onChange={setYm} /></span>
            <EyeBell />
          </div>
        </header>
        <div className="home-grid">
          <div>
            {wallet}
            {quickRow}
            {cocoCta}
          </div>
          <div>
            {monthPanel}
            <div className="grid-2" style={{ marginTop: 14 }}>
              {catPanel}
              {duePanel}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="m-head">
        <div className="row">
          <span className="avatar">{(owner || 'o').charAt(0).toLowerCase()}</span>
          <div className="greet">
            <small>{greeting()}</small>
            <strong>{owner || 'você'}</strong>
          </div>
        </div>
        <div className="row" style={{ gap: 10 }}><EyeBell /></div>
      </header>
      {wallet}
      {quickRow}
      {cocoCta}
      {monthPanel}
      {catPanel}
      {duePanel}
      {openInvoicesTotal(w) > 0 && <p className="small muted" style={{ textAlign: 'center', marginTop: 18 }}>Faturas abertas somam <Money value={openInvoicesTotal(w)} />.</p>}
    </>
  );
}
