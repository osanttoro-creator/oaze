import { useApp, useWorkspace, updateSettings, type NotifPrivacy } from '../state/store';
import { go } from '../state/route';
import { useDesktop } from '../state/session';
import { toggleConfirmed } from '../state/actions';
import { dueItems, entriesForMonth } from '../domain/calc';
import { addDaysISO, dayMonth, daysInMonth, isoOf, parseISO, todayISO, todayYM, ymParts } from '../domain/dates';
import { brl } from '../domain/money';
import { platform } from '../platform';
import { Icon } from '../ui/Icon';
import { Money, ScreenHead, Seg, Toggle } from '../ui/bits';

export function Reminders() {
  const desktop = useDesktop();
  const w = useWorkspace();
  const settings = useApp((s) => s.settings);
  const today = todayISO();
  const list = dueItems(w, today, addDaysISO(today, 30));
  const hour = `${settings.reminderHour}h`;
  const first = list.find((d) => d.kind === 'invoice') ?? list[0];
  const preview: Record<NotifPrivacy, string> = first
    ? { sem: `${first.title} vence ${first.date === addDaysISO(today, 1) ? 'amanhã' : `em ${dayMonth(first.date)}`}`, valores: `${first.title} vence em ${dayMonth(first.date)} · ${brl(first.amount)}`, generico: 'Você tem um vencimento em breve no OAZE' }
    : { sem: 'Nada vencendo nos próximos dias', valores: 'Nada vencendo nos próximos dias', generico: 'Você tem um lembrete no OAZE' };
  const setRem = (k: keyof typeof settings.reminders, v: boolean) => updateSettings({ reminders: { ...settings.reminders, [k]: v } });

  const listPanel = (
    <section className="panel">
      <h2 className="h2" style={{ marginBottom: 6 }}>próximos 30 dias</h2>
      {list.length === 0 && <p className="muted small">Nada vencendo. Lançamentos previstos e faturas abertas aparecem aqui.</p>}
      {list.map((d) => (
        <div key={d.key} className="list-row">
          <span className="list-icon"><Icon name={d.kind === 'invoice' ? 'credit-card' : d.kind === 'income' ? 'arrow-down-left' : d.method === 'debito_automatico' ? 'refresh-cw' : 'calendar-clock'} /></span>
          <div className="grow">
            <div style={{ fontWeight: 600 }}>{d.title} <span className="mono small muted">{dayMonth(d.date)}</span></div>
            <div className="small muted">{d.kind === 'invoice' ? `avisos em ${dayMonth(addDaysISO(d.date, -3))} e ${dayMonth(d.date)}, às ${hour}` : `${d.detail} · no dia, às ${hour}`}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Money className={`mono ${d.kind === 'income' ? 'in' : ''}`} value={d.amount} />
            {d.txId && d.ym && <button type="button" className="link" style={{ display: 'block', fontSize: 13 }} onClick={() => toggleConfirmed({ txId: d.txId as string, ym: d.ym as string, recurring: !!w.transactions.find((t) => t.id === d.txId)?.recurring, confirmed: false })}>{d.kind === 'income' ? 'recebi' : 'paguei'}</button>}
            {d.kind === 'invoice' && <button type="button" className="link" style={{ display: 'block', fontSize: 13 }} onClick={() => go('carteira', d.cardId ?? null)}>ver fatura</button>}
          </div>
        </div>
      ))}
    </section>
  );

  const prefs = (
    <>
      <section className="panel">
        <h2 className="h2">como o aviso aparece</h2>
        <p className="small muted" style={{ margin: '4px 0 12px' }}>A notificação pode aparecer com o celular bloqueado. Escolha o quanto ela mostra.</p>
        <Seg label="Privacidade da notificação" value={settings.notifPrivacy} options={[['sem', 'Sem valor'], ['valores', 'Com valores'], ['generico', 'Genérico']]} onChange={(v) => updateSettings({ notifPrivacy: v })} />
        <div className="act" style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
          <img src="./brand/oaze-app-icon.svg" alt="" width={36} height={36} style={{ borderRadius: 9 }} />
          <div><div className="small muted">OAZE · agora</div><div style={{ fontWeight: 500 }}>{preview[settings.notifPrivacy]}</div></div>
        </div>
      </section>
      <section className="panel">
        {([['fatura', 'Fatura do cartão', '3 dias antes e no dia'], ['fixa', 'Despesa fixa não confirmada', 'no dia do vencimento'], ['rec', 'Recorrência do dia', 'assinaturas e repetições']] as const).map(([k, label, sub]) => (
          <div key={k} className="list-row">
            <div className="grow"><div style={{ fontWeight: 600 }}>{label}</div><div className="small muted">{sub}</div></div>
            <Toggle on={settings.reminders[k]} onChange={(v) => setRem(k, v)} label={label} />
          </div>
        ))}
        {platform() === 'web' && <p className="small muted" style={{ marginBottom: 0 }}>No navegador os avisos ficam só nesta tela. Nos apps de celular e desktop, saem pelo sistema.</p>}
      </section>
      <Calendar />
    </>
  );

  return (
    <>
      <ScreenHead desktop={desktop} eyebrow="o que vem aí" title="lembretes" onBack={() => go('mais')} />
      {desktop ? <div className="grid-2" style={{ alignItems: 'start' }}>{listPanel}<div>{prefs}</div></div> : <>{listPanel}{prefs}</>}
    </>
  );
}

/** A agenda do OAZE 1, reduzida ao que ajuda: em que dias o mês mexe no dinheiro. */
function Calendar() {
  const w = useWorkspace();
  const ym = todayYM();
  const { y, m } = ymParts(ym);
  const n = daysInMonth(y, m);
  const lead = new Date(y, m, 1).getDay();
  const byDay = new Map<number, { inn: boolean; out: boolean }>();
  for (const e of entriesForMonth(w, ym)) {
    if (e.kind === 'transfer') continue;
    const d = parseISO(e.date).getDate();
    const cur = byDay.get(d) ?? { inn: false, out: false };
    if (e.kind === 'income') cur.inn = true;
    else cur.out = true;
    byDay.set(d, cur);
  }
  const todayD = parseISO(todayISO()).getDate();
  return (
    <section className="panel">
      <h2 className="h2" style={{ marginBottom: 12 }}>calendário do mês</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, textAlign: 'center' }}>
        {['d', 's', 't', 'q', 'q', 's', 's'].map((d, i) => <span key={`w${i}`} className="eyebrow" style={{ fontSize: 10 }}>{d}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`l${i}`} />)}
        {Array.from({ length: n }, (_, i) => {
          const d = i + 1;
          const mark = byDay.get(d);
          return (
            <span key={d} aria-label={isoOf(y, m, d)} style={{ height: 38, borderRadius: 12, display: 'grid', placeItems: 'center', position: 'relative', background: d === todayD ? 'var(--milk)' : 'var(--fill)', color: d === todayD ? 'var(--night)' : undefined, fontSize: 13 }}>
              {d}
              {mark && <span style={{ position: 'absolute', bottom: 4, display: 'flex', gap: 3 }}>{mark.inn && <i style={{ width: 5, height: 5, borderRadius: 3, background: 'var(--in)' }} />}{mark.out && <i style={{ width: 5, height: 5, borderRadius: 3, background: 'var(--out)' }} />}</span>}
            </span>
          );
        })}
      </div>
    </section>
  );
}
