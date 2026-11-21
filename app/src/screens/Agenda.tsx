import { useMemo, useState } from 'react';
import { useWorkspace } from '../state/store';
import { go, openNovo } from '../state/route';
import { useDesktop } from '../state/session';
import { calendarEvents, calendarYear, confirmedTotals, eventsForMonth, gridOffset, moveSelectedMonth, weekDays, type CalendarEvent } from '../domain/calendar';
import { addDaysISO, daysInMonth, dayMonth, isoOf, monthLabel, todayISO, ymOf, ymParts } from '../domain/dates';
import type { ISODate } from '../domain/types';
import { Icon } from '../ui/Icon';
import { Money, ScreenHead, Seg } from '../ui/bits';
import './agenda.css';

type View = 'year' | 'month' | 'week';
const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function EventRows({ events }: { events: readonly CalendarEvent[] }) {
  if (!events.length) return <p className="muted small">Nada registrado neste dia.</p>;
  return <div className="agenda-events">{events.map((event) => (
    <div className="agenda-event" key={event.key}>
      <span className={`agenda-mark ${event.kind}`} aria-hidden="true" />
      <div className="grow">
        <strong>{event.title}</strong>
        <span className="small muted">{event.detail} · {event.kind === 'invoice' ? 'fatura a vencer' : event.confirmed ? 'confirmado' : 'previsto'}</span>
      </div>
      <div className="agenda-event-amount">
        <Money value={event.amount} className="mono" />
        {event.cardId && <button type="button" className="link" onClick={() => go('carteira', event.cardId ?? null)}>ver fatura</button>}
      </div>
    </div>
  ))}</div>;
}

export function Agenda() {
  const desktop = useDesktop();
  const w = useWorkspace();
  const [view, setView] = useState<View>('month');
  const [selected, setSelected] = useState<ISODate>(todayISO);
  const ym = ymOf(selected);
  const { y, m } = ymParts(ym);
  const monthEvents = useMemo(() => eventsForMonth(w, ym), [w, ym]);
  const grouped = useMemo(() => {
    const map = new Map<ISODate, CalendarEvent[]>();
    for (const event of monthEvents) map.set(event.date, [...(map.get(event.date) ?? []), event]);
    return map;
  }, [monthEvents]);
  const week = useMemo(() => weekDays(selected), [selected]);
  const weekEvents = useMemo(() => calendarEvents(w, week[0], week[6]), [w, week]);
  const year = useMemo(() => calendarYear(w, y), [w, y]);
  const yearScale = Math.max(1, ...year.map((item) => Math.max(item.income, item.expense)));
  const visible = view === 'week' ? weekEvents : monthEvents;
  const totals = confirmedTotals(visible);
  const move = (delta: number) => setSelected((current) => view === 'week' ? addDaysISO(current, delta * 7) : moveSelectedMonth(current, delta * (view === 'year' ? 12 : 1)));
  const onView = (next: View) => setView(next);
  const recurrent = w.transactions.filter((t) => t.recurring && (!t.recurring.endYM || t.recurring.endYM >= ym))
    .sort((a, b) => a.description.localeCompare(b.description, 'pt-BR'));

  return <>
    <ScreenHead desktop={desktop} eyebrow="o que vem aí" title="agenda" onBack={() => go('mais')} />
    <div className="agenda-top">
      <div>
        <span className="eyebrow">agenda financeira</span>
        <h2 className="h2">{view === 'year' ? y : monthLabel(ym)}</h2>
      </div>
      <div className="agenda-nav" aria-label={view === 'week' ? 'Navegar semanas' : view === 'year' ? 'Navegar anos' : 'Navegar meses'}>
        <button type="button" onClick={() => move(-1)} aria-label={view === 'week' ? 'Semana anterior' : view === 'year' ? 'Ano anterior' : 'Mês anterior'}><Icon name="chevron-left" size={18} /></button>
        <button type="button" onClick={() => setSelected(todayISO())}>Hoje</button>
        <button type="button" onClick={() => move(1)} aria-label={view === 'week' ? 'Próxima semana' : view === 'year' ? 'Próximo ano' : 'Próximo mês'}><Icon name="chevron-right" size={18} /></button>
      </div>
    </div>
    <Seg label="Alcance do calendário" value={view} options={[["year", "Ano"], ["month", "Mês"], ["week", "Semana"]]} onChange={onView} />

    {view !== 'year' && <section className="agenda-summary panel" aria-label="Resumo do período">
      <div><span className="small muted">Recebido</span><strong className="in"><Money value={totals.income} /></strong></div>
      <div><span className="small muted">Pago</span><strong><Money value={totals.expense} /></strong></div>
      <div><span className="small muted">Pendente</span><strong>{totals.pending} {totals.pending === 1 ? 'lançamento' : 'lançamentos'}</strong></div>
    </section>}

    {view === 'year' && <section className="panel" aria-label={`Meses de ${y}`}>
      <div className="agenda-year">{year.map((row) => {
        return <button type="button" key={row.ym} className="agenda-year-row" onClick={() => { setSelected(`${row.ym}-01`); setView('month'); }} aria-label={`Abrir ${monthLabel(row.ym)}`}>
          <span className="mono">{monthLabel(row.ym, true)}</span>
          <span className="agenda-bars" aria-hidden="true"><i className="income" style={{ width: `${row.income / yearScale * 100}%` }} /><i className="expense" style={{ width: `${row.expense / yearScale * 100}%` }} /></span>
          <span className="agenda-year-values"><Money value={row.income - row.expense} className="mono" /><small className="muted">{row.pending ? `${row.pending} pendente${row.pending > 1 ? 's' : ''}` : 'sem pendências'}</small></span>
        </button>;
      })}</div>
    </section>}

    {view === 'month' && <div className="agenda-month-layout">
      <section className="panel agenda-grid-panel" aria-label={`Dias de ${monthLabel(ym)}`}>
        <div className="agenda-grid">
          {WEEKDAYS.map((day) => <span className="eyebrow" key={day}>{day}</span>)}
          {Array.from({ length: gridOffset(ym) }, (_, i) => <span aria-hidden="true" key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth(y, m) }, (_, i) => {
            const date = isoOf(y, m, i + 1);
            const rows = grouped.get(date) ?? [];
            return <button type="button" key={date} className="agenda-day" aria-pressed={selected === date} aria-label={`${i + 1} de ${monthLabel(ym)}, ${rows.length} ${rows.length === 1 ? 'evento' : 'eventos'}`} onClick={() => setSelected(date)}>
              <span>{i + 1}</span>
              <span className="agenda-day-marks" aria-hidden="true">{rows.slice(0, 3).map((event) => <i key={event.key} className={event.kind} />)}</span>
            </button>;
          })}
        </div>
      </section>
      <section className="panel agenda-detail" aria-label={`Eventos de ${dayMonth(selected)}`}>
        <span className="eyebrow">dia {selected.slice(8)}</span><h2 className="h2">{dayMonth(selected)}</h2>
        <EventRows events={grouped.get(selected) ?? []} />
        <button type="button" className="btn btn-ghost" onClick={() => openNovo('despesa', selected)}>+ lançamento neste dia</button>
      </section>
    </div>}

    {view === 'week' && <section className="panel" aria-label={`Semana de ${dayMonth(week[0])} a ${dayMonth(week[6])}`}>
      <h2 className="h2">{dayMonth(week[0])} a {dayMonth(week[6])}</h2>
      <div className="agenda-week">{week.map((date, i) => <section className="agenda-week-day" key={date}>
        <header><span className="eyebrow">{WEEKDAYS[i]}</span><strong>{dayMonth(date)}</strong></header>
        <EventRows events={weekEvents.filter((event) => event.date === date)} />
        <button type="button" className="link" onClick={() => openNovo('despesa', date)}>+ lançar</button>
      </section>)}</div>
    </section>}

    <section className="panel agenda-recurring">
      <div className="panel-head"><div><span className="eyebrow">o que se repete</span><h2 className="h2">recorrências</h2></div><button type="button" className="link" onClick={() => openNovo()}>+ criar</button></div>
      {recurrent.length ? recurrent.map((tx) => <div className="list-row" key={tx.id}><div className="grow"><strong>{tx.description}</strong><div className="small muted">Todo dia {tx.date.slice(8)}{tx.recurring?.endYM ? ` · até ${monthLabel(tx.recurring.endYM)}` : ''}</div></div><Money value={tx.amount} className="mono" /></div>) : <p className="small muted">Nenhuma recorrência. Crie um lançamento e marque “Repetir mensalmente”.</p>}
    </section>
  </>;
}
