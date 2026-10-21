import { useMemo, useState } from 'react';
import { useApp, useWorkspace } from '../state/store';
import { useDesktop } from '../state/session';
import { toast } from '../state/route';
import { deleteTransaction, setCategories, toggleConfirmed } from '../state/actions';
import { entriesForMonth, methodLabel, monthTotals, type Entry } from '../domain/calc';
import { dayMonth, monthName, parseISO, todayYM } from '../domain/dates';
import { stripAccents } from '../domain/merchant';
import type { Workspace, YM } from '../domain/types';
import { Icon } from '../ui/Icon';
import { METHOD_ICON } from '../ui/method-icons';
import { Empty, Money, ScreenHead, Sheet } from '../ui/bits';
import { CardThumb, walletItems, type WalletItem } from '../ui/Cards';
import { MonthSwitch } from './Home';

type Filter = 'todos' | 'pix' | 'cartoes' | 'debito' | 'credito';
const FILTERS: [Filter, string][] = [['todos', 'Todos'], ['pix', 'Pix'], ['cartoes', 'Cartões'], ['debito', 'Débito'], ['credito', 'Crédito']];

function pass(e: Entry, f: Filter): boolean {
  if (f === 'pix') return e.method === 'pix';
  if (f === 'cartoes') return e.method === 'cartao_fisico' || e.method === 'cartao_virtual';
  if (f === 'credito') return !!e.cardId;
  if (f === 'debito') return e.kind === 'expense' && !e.cardId;
  return true;
}

export function thumbFor(e: Pick<Entry, 'cardId' | 'accountId' | 'method'>, items: WalletItem[]) {
  const usesCard = e.cardId || ['cartao_fisico', 'cartao_virtual', 'debito_automatico'].includes(e.method);
  const item = usesCard ? items.find((i) => i.id === (e.cardId ?? e.accountId)) : undefined;
  if (item) return <CardThumb item={item} />;
  return <span className="tx-thumb method"><Icon name={METHOD_ICON[e.method]} size={20} /></span>;
}

function formaLabel(e: Entry): string {
  if (e.kind === 'transfer') return 'transferência';
  if (e.kind === 'income') return 'receita';
  return e.cardId ? 'crédito' : e.method === 'dinheiro' ? 'dinheiro' : 'débito';
}

export function TxRow({ e, w, items, onOpen }: { e: Entry; w: Workspace; items: WalletItem[]; onOpen?: (e: Entry) => void }) {
  const cat = w.categories.find((c) => c.id === e.categoryId)?.name ?? (e.kind === 'transfer' ? 'Transferência' : 'Sem categoria');
  const signed = e.kind === 'income' ? e.amount : -e.amount;
  return (
    <div className={e.confirmed ? 'tx' : 'tx pending'}>
      <button type="button" className="tx-check" role="checkbox" aria-checked={e.confirmed} aria-label={e.confirmed ? `Desconfirmar ${e.description}` : `Confirmar ${e.description}`} onClick={() => toggleConfirmed(e)}>
        {e.confirmed && <Icon name="check" size={14} stroke={3} />}
      </button>
      {thumbFor(e, items)}
      <button type="button" style={{ textAlign: 'left', minWidth: 0 }} onClick={() => onOpen?.(e)}>
        <div className="tx-title">{e.description}</div>
        <div className="tx-sub">{dayMonth(e.date)} · {cat} · {methodLabel(e.method)}</div>
      </button>
      <div className={`tx-amt ${e.kind === 'income' ? 'in' : e.kind === 'transfer' ? '' : 'out'}`}>
        <Money value={e.kind === 'transfer' ? e.amount : signed} signed={e.kind !== 'transfer'} />
        <small>{e.confirmed ? formaLabel(e) : 'previsto'}</small>
      </div>
    </div>
  );
}

export function Transactions() {
  const desktop = useDesktop();
  const w = useWorkspace();
  const owner = useApp((s) => s.owner.name);
  const [ym, setYm] = useState<YM>(todayYM());
  const [filter, setFilter] = useState<Filter>('todos');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Entry | null>(null);
  const items = walletItems(w.accounts, w.cards, owner.toUpperCase());
  const t = monthTotals(w, ym);

  const groups = useMemo(() => {
    const needle = stripAccents(q).toLowerCase().trim();
    const list = [...entriesForMonth(w, ym)]
      .filter((e) => pass(e, filter))
      .filter((e) => !needle || stripAccents(e.description).toLowerCase().includes(needle))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const map = new Map<string, Entry[]>();
    for (const e of list) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    return [...map.entries()];
  }, [w, ym, filter, q]);

  return (
    <>
      <ScreenHead desktop={desktop} eyebrow="o mês, item por item" title="lançamentos" right={<MonthSwitch ym={ym} onChange={setYm} />} />
      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="kpi"><span className="eyebrow">entrou</span><span className="mono in">▲ <Money value={t.income} /></span></div>
        <div className="kpi"><span className="eyebrow">saiu</span><span className="mono out">▼ <Money value={t.expense} /></span></div>
      </div>
      <div className="row" style={{ marginBottom: 12, flexWrap: desktop ? 'nowrap' : 'wrap' }}>
        <div className="chips scroll grow" role="group" aria-label="Filtrar por forma de pagamento" style={desktop ? { margin: 0, padding: 0 } : undefined}>
          {FILTERS.map(([id, label]) => <button key={id} type="button" className="chip" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
        </div>
        <input className="input" style={{ height: 40, maxWidth: desktop ? 260 : undefined, borderRadius: 20 }} placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar lançamento" />
      </div>
      {groups.length === 0 && <Empty text={`Nada por aqui em ${monthName(ym)}.`} />}
      {groups.map(([date, list]) => (
        <section key={date}>
          <div className="eyebrow day-label">{dayMonth(date)} · {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][parseISO(date).getDay()]}</div>
          {list.map((e) => <TxRow key={e.key} e={e} w={w} items={items} onOpen={setOpen} />)}
        </section>
      ))}
      <p className="small muted" style={{ textAlign: 'center', margin: '22px 0 0' }}>Só o que está confirmado entra nos totais.</p>
      {open && <TxDetail e={open} w={w} desktop={desktop} onClose={() => setOpen(null)} />}
    </>
  );
}

function TxDetail({ e, w, desktop, onClose }: { e: Entry; w: Workspace; desktop: boolean; onClose: () => void }) {
  const cats = w.categories.filter((c) => c.kind === (e.kind === 'income' ? 'income' : 'expense'));
  const [cat, setCat] = useState(e.categoryId);
  const del = (all: boolean) => {
    const undo = deleteTransaction(e.txId, all);
    onClose();
    toast(all ? 'Parcelas excluídas.' : 'Lançamento excluído.', undo);
  };
  return (
    <Sheet onClose={onClose} desktop={desktop} label="Detalhe do lançamento">
      <div className="eyebrow">{dayMonth(e.date)} · {methodLabel(e.method)}{e.recurring ? ' · fixo' : ''}</div>
      <h2 className="h2" style={{ margin: '8px 0 4px', fontSize: 24, textTransform: 'none' }}>{e.description}</h2>
      <div className="hero" style={{ margin: '10px 0 18px' }}><Money value={e.amount} /></div>
      {e.kind !== 'transfer' && (
        <>
          <div className="eyebrow" style={{ marginBottom: 10 }}>categoria</div>
          <div className="chips" style={{ marginBottom: 18 }}>
            {cats.map((c) => (
              <button key={c.id} type="button" className="chip teal" aria-pressed={cat === c.id} onClick={() => {
                setCat(c.id);
                const undo = setCategories([{ txId: e.txId, categoryId: c.id }]);
                toast(`Pronto. ${c.name} — e aprendi para as próximas.`, undo);
              }}>{c.name}</button>
            ))}
          </div>
        </>
      )}
      <div className="stack">
        <button type="button" className="btn btn-ghost btn-block" onClick={() => { toggleConfirmed(e); onClose(); }}>
          {e.confirmed ? 'Marcar como previsto' : e.kind === 'income' ? 'Já recebi' : 'Já foi pago'}
        </button>
        {!e.recurring && <button type="button" className="btn btn-line btn-block" onClick={() => del(false)}><Icon name="trash" size={18} />Excluir</button>}
        {e.tx.installment && <button type="button" className="btn btn-line btn-block" onClick={() => del(true)}>Excluir as {e.tx.installment.total} parcelas</button>}
      </div>
    </Sheet>
  );
}
