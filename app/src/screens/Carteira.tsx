import { useState } from 'react';
import { useApp, useWorkspace } from '../state/store';
import { patchUI, toast, useUI } from '../state/route';
import { useDesktop } from '../state/session';
import { addAccount, addCard, payInvoice, setCardLimit } from '../state/actions';
import { accountBalance, accountStatement, cardUsed, currentBalance, currentInvoiceRef, invoice, methodLabel, openInvoicesTotal } from '../domain/calc';
import { addMonths, dayMonth, monthName, monthStart, todayISO, todayYM, ymOf } from '../domain/dates';
import { brl, parseBRL } from '../domain/money';
import { BANKS } from '../domain/banks';
import type { Card, Network, Workspace, YM } from '../domain/types';
import { Icon } from '../ui/Icon';
import { Money, ScreenHead, Seg, Sheet } from '../ui/bits';
import { BankTile, walletItems } from '../ui/Cards';
import { Wallet } from '../ui/Wallet';

export function Carteira() {
  const desktop = useDesktop();
  const w = useWorkspace();
  const owner = useApp((s) => s.owner.name);
  const picked = useUI((u) => u.walletPick);
  const [adding, setAdding] = useState(false);
  const items = walletItems(w.accounts, w.cards, owner.toUpperCase());
  const pick = (id: string | null) => patchUI({ walletPick: id });
  const openCards = w.cards.filter((c) => cardUsed(w, c.id) > 0).map((c) => c.name);
  const selCard = w.cards.find((c) => c.id === picked);
  const selAcc = w.accounts.find((a) => a.id === picked);

  const wallet = (
    <Wallet
      items={items}
      picked={picked}
      onPick={(id) => pick(picked === id ? null : id)}
      onPocket={() => pick(null)}
      eyebrow="saldo em contas"
      badge={<span className="mono small in">{items.length} {items.length === 1 ? 'cartão' : 'cartões'}</span>}
      value={<Money value={currentBalance(w)} />}
      sub={openCards.length ? <>Faturas abertas: <Money value={openInvoicesTotal(w)} /></> : 'Nenhuma fatura em aberto'}
      hint={picked ? 'toque no cartão para guardar' : 'toque num cartão para abrir'}
    />
  );

  const detail = selCard ? <InvoicePanel key={selCard.id} card={selCard} w={w} desktop={desktop} /> : selAcc ? <StatementPanel accountId={selAcc.id} w={w} /> : (
    <section className="panel">
      {items.length === 0 && <p className="muted">Adicione a primeira conta ou cartão para a carteira ganhar forma.</p>}
      {items.map((it) => {
        const card = w.cards.find((c) => c.id === it.id);
        const inv = card ? invoice(w, card.id, currentInvoiceRef(w, card)) : null;
        return (
          <button key={it.id} type="button" className="list-row" onClick={() => pick(it.id)}>
            <BankTile bank={it.bank} />
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{it.name} <span className="mono small muted">•• {it.last4}</span></div>
              <div className="small muted">{card && inv ? `crédito · vence ${dayMonth(inv.dueDate)}` : 'débito · saldo'}</div>
            </div>
            <Money className="mono" value={card ? inv?.remaining ?? 0 : accountBalance(w, it.id)} />
          </button>
        );
      })}
    </section>
  );

  return (
    <>
      <ScreenHead desktop={desktop} eyebrow="contas e cartões" title="carteira" right={<button type="button" className="btn btn-ghost btn-s" onClick={() => setAdding(true)}><Icon name="plus" size={18} />Adicionar</button>} />
      {desktop ? (
        <div className="home-grid">
          <div>{wallet}</div>
          <div>{detail}</div>
        </div>
      ) : (
        <>
          {wallet}
          {detail}
        </>
      )}
      {adding && <AddSheet desktop={desktop} onClose={() => setAdding(false)} owner={owner} />}
    </>
  );
}

function InvoicePanel({ card, w, desktop }: { card: Card; w: Workspace; desktop: boolean }) {
  const [ref, setRef] = useState<YM>(() => currentInvoiceRef(w, card));
  const [sheet, setSheet] = useState<'parcial' | 'limite' | null>(null);
  const inv = invoice(w, card.id, ref);
  if (!inv) return null;
  const used = cardUsed(w, card.id);
  const payFrom = card.accountId ?? w.accounts[0]?.id;
  const closeMonth = monthName(ymOf(inv.closeDate));

  const payAll = () => {
    if (inv.remaining <= 0) return toast('Esta fatura já está paga.');
    const undo = payInvoice(card.id, ref, inv.remaining, payFrom);
    toast(`Fatura de ${closeMonth} paga: ${brl(inv.remaining)}.`, undo);
  };

  return (
    <>
      <div className="grid-3" style={{ marginBottom: 14 }}>
        <button type="button" className="btn btn-milk" style={{ height: 76, borderRadius: 24, flexDirection: 'column', gap: 6 }} onClick={payAll}><Icon name="receipt" />Pagar fatura</button>
        <button type="button" className="btn btn-ghost" style={{ height: 76, borderRadius: 24, flexDirection: 'column', gap: 6 }} onClick={() => setSheet('parcial')}><Icon name="split" />Parcial</button>
        <button type="button" className="btn btn-ghost" style={{ height: 76, borderRadius: 24, flexDirection: 'column', gap: 6 }} onClick={() => setSheet('limite')}><Icon name="sliders-horizontal" />Limite</button>
      </div>
      <section className="panel">
        <div className="row between">
          <h2 className="h2" style={{ fontSize: 22 }}>fatura de {closeMonth}</h2>
          <span className="month-switch">
            <button type="button" onClick={() => setRef(addMonths(ref, -1))} aria-label="Fatura anterior"><Icon name="chevron-left" size={16} /></button>
            <button type="button" onClick={() => setRef(addMonths(ref, 1))} aria-label="Próxima fatura"><Icon name="chevron-right" size={16} /></button>
          </span>
        </div>
        <div className="mono muted" style={{ margin: '6px 0 10px' }}>fecha {dayMonth(inv.closeDate)} · vence {dayMonth(inv.dueDate)}</div>
        <div className="hero"><Money value={inv.paid ? inv.planned : inv.remaining} /></div>
        <div className="row small" style={{ gap: 8, margin: '8px 0 16px' }}>
          {inv.paid ? <span className="pill teal">paga</span> : inv.partial ? <span className="pill">parcial · pago <Money value={inv.paidAmount} /></span> : inv.isOverdue ? <span className="pill" style={{ color: 'var(--milk)' }}>vencida</span> : inv.isOpen ? <span className="pill">aberta</span> : <span className="pill">fechada</span>}
        </div>
        <div className="row between small muted" style={{ marginBottom: 6 }}>
          <span>limite usado</span>
          <span className="mono"><Money value={used} /> de <Money value={card.limit} /></span>
        </div>
        <div className="progress" style={{ marginBottom: 16 }}><i style={{ width: `${Math.min(100, (used / Math.max(1, card.limit)) * 100)}%` }} /></div>
        {inv.items.length === 0 && <p className="muted small">Nenhuma compra nesta fatura.</p>}
        {[...inv.items].reverse().map((e) => (
          <div key={e.key} className="list-row" style={{ padding: '10px 2px' }}>
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{e.description}</div>
              <div className="eyebrow" style={{ fontSize: 10.5, marginTop: 4 }}>{dayMonth(e.date)} · {methodLabel(e.method)}{e.confirmed ? '' : ' · previsto'}</div>
            </div>
            <Money className="mono" value={e.amount} />
          </div>
        ))}
      </section>
      {sheet === 'parcial' && <AmountSheet desktop={desktop} title="pagamento parcial" hint={`Faltam ${brl(inv.remaining)} desta fatura.`} cta="Pagar" onClose={() => setSheet(null)} onSave={(v) => {
        const undo = payInvoice(card.id, ref, Math.min(v, inv.remaining), payFrom);
        toast(`Paguei ${brl(Math.min(v, inv.remaining))} da fatura.`, undo);
      }} />}
      {sheet === 'limite' && <AmountSheet desktop={desktop} title="ajustar limite" hint={`Hoje o limite é ${brl(card.limit)}.`} cta="Salvar limite" initial={card.limit} onClose={() => setSheet(null)} onSave={(v) => { setCardLimit(card.id, v); toast('Limite atualizado.'); }} />}
    </>
  );
}

function StatementPanel({ accountId, w }: { accountId: string; w: Workspace }) {
  const rows = accountStatement(w, accountId, monthStart(addMonths(todayYM(), -1)), todayISO()).reverse();
  return (
    <section className="panel">
      <span className="eyebrow">saldo</span>
      <div className="hero" style={{ margin: '8px 0 18px' }}><Money value={accountBalance(w, accountId)} /></div>
      <h2 className="h2" style={{ marginBottom: 6 }}>extrato</h2>
      {rows.length === 0 && <p className="muted small">Sem movimentos nos últimos dois meses.</p>}
      {rows.map((r, i) => (
        <div key={i} className="list-row" style={{ padding: '10px 2px' }}>
          <div className="grow">
            <div style={{ fontWeight: 600 }}>{r.description}</div>
            <div className="eyebrow" style={{ fontSize: 10.5, marginTop: 4 }}>{dayMonth(r.date)} · {r.detail}</div>
          </div>
          <Money className={`mono ${r.delta > 0 ? 'in' : 'out'}`} value={r.delta} signed />
        </div>
      ))}
    </section>
  );
}

function AmountSheet({ desktop, title, hint, cta, initial, onClose, onSave }: { desktop: boolean; title: string; hint: string; cta: string; initial?: number; onClose: () => void; onSave: (v: number) => void }) {
  const [v, setV] = useState(initial ? (initial / 100).toFixed(2).replace('.', ',') : '');
  const cents = parseBRL(v) ?? 0;
  return (
    <Sheet onClose={onClose} desktop={desktop} label={title}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); if (cents > 0) { onSave(cents); onClose(); } }}>
        <h2 className="h2" style={{ fontSize: 22 }}>{title}</h2>
        <p className="muted" style={{ margin: 0 }}>{hint}</p>
        <input className="input mono" autoFocus inputMode="decimal" placeholder="0,00" value={v} onChange={(e) => setV(e.target.value)} style={{ fontSize: 22, height: 58 }} />
        <button type="submit" className="btn btn-milk btn-block" disabled={cents <= 0}>{cta}</button>
      </form>
    </Sheet>
  );
}

function AddSheet({ desktop, onClose, owner }: { desktop: boolean; onClose: () => void; owner: string }) {
  const [kind, setKind] = useState<'conta' | 'cartao'>('conta');
  const [bank, setBank] = useState('nubank');
  const [name, setName] = useState('');
  const [last4, setLast4] = useState('');
  const [value, setValue] = useState('');
  const [closing, setClosing] = useState('28');
  const [due, setDue] = useState('5');
  const [network, setNetwork] = useState<Network>('Mastercard');

  const save = () => {
    const preset = BANKS.find((b) => b.key === bank);
    const n = name.trim() || preset?.name || 'Conta';
    const l4 = last4.replace(/\D/g, '').slice(-4).padStart(4, '0');
    if (kind === 'conta') {
      addAccount({ name: n, bank, openingBalance: parseBRL(value) ?? 0, openedAt: todayISO(), debitCard: last4 ? { last4: l4, network, validThru: '' } : undefined });
    } else {
      const c = Math.min(31, Math.max(1, Number(closing) || 1));
      const d = Math.min(31, Math.max(1, Number(due) || 1));
      addCard({ name: n, bank, last4: l4, network, validThru: '', holder: owner.toUpperCase(), limit: parseBRL(value) ?? 0, closingDay: c, dueDay: d });
    }
    toast(kind === 'conta' ? 'Conta adicionada à carteira.' : 'Cartão adicionado à carteira.');
    onClose();
  };

  return (
    <Sheet onClose={onClose} desktop={desktop} label="Adicionar à carteira">
      <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <h2 className="h2" style={{ fontSize: 22 }}>adicionar</h2>
        <Seg label="Tipo" value={kind} options={[['conta', 'Conta'], ['cartao', 'Cartão de crédito']]} onChange={setKind} />
        <label className="field"><span>banco</span>
          <select className="input" value={bank} onChange={(e) => setBank(e.target.value)}>{BANKS.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}</select>
        </label>
        <label className="field"><span>apelido (opcional)</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} /></label>
        <div className="grid-2">
          <label className="field"><span>{kind === 'conta' ? 'final do cartão de débito' : 'final do cartão'}</span><input className="input mono" inputMode="numeric" maxLength={4} value={last4} onChange={(e) => setLast4(e.target.value)} /></label>
          <label className="field"><span>bandeira</span>
            <select className="input" value={network} onChange={(e) => setNetwork(e.target.value as Network)}>{(['Mastercard', 'Visa', 'Elo', 'Amex', 'Hipercard'] as Network[]).map((x) => <option key={x}>{x}</option>)}</select>
          </label>
        </div>
        <label className="field"><span>{kind === 'conta' ? 'saldo de hoje' : 'limite'}</span><input className="input mono" inputMode="decimal" placeholder="0,00" value={value} onChange={(e) => setValue(e.target.value)} /></label>
        {kind === 'cartao' && (
          <div className="grid-2">
            <label className="field"><span>fecha dia</span><input className="input mono" inputMode="numeric" value={closing} onChange={(e) => setClosing(e.target.value)} /></label>
            <label className="field"><span>vence dia</span><input className="input mono" inputMode="numeric" value={due} onChange={(e) => setDue(e.target.value)} /></label>
          </div>
        )}
        <p className="small muted" style={{ margin: 0 }}>O OAZE nunca pede número completo, CVV ou senha do cartão.</p>
        <button type="submit" className="btn btn-milk btn-block">Adicionar</button>
      </form>
    </Sheet>
  );
}
