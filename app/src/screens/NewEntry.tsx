import { useMemo, useState } from 'react';
import { useApp, useWorkspace } from '../state/store';
import { closeNovo, toast, useUI } from '../state/route';
import { addEntry, type EntryType } from '../state/actions';
import { suggestCategory } from '../domain/categorize';
import { num, parseBRL } from '../domain/money';
import { addDaysISO, todayISO } from '../domain/dates';
import type { ID, Method } from '../domain/types';
import { Icon } from '../ui/Icon';
import { CocoFace, Seg, Sheet, Toggle } from '../ui/bits';
import { CardThumb, walletItems } from '../ui/Cards';
import { METHOD_ICON } from './Transactions';

const PAY: Method[] = ['pix', 'cartao_fisico', 'cartao_virtual', 'dinheiro', 'boleto', 'debito_automatico', 'transferencia'];
const RECEIVE: Method[] = ['pix', 'transferencia', 'dinheiro', 'deposito', 'boleto'];
const LABEL: Record<Method, string> = {
  pix: 'Pix', cartao_fisico: 'Cartão físico', cartao_virtual: 'Cartão virtual', dinheiro: 'Dinheiro', boleto: 'Boleto',
  debito_automatico: 'Débito automático', transferencia: 'Transferência', deposito: 'Depósito', nao_informado: 'Não informado',
};
const TYPES: [EntryType, string][] = [['despesa', 'Despesa'], ['receita', 'Receita'], ['transf', 'Transferir'], ['aporte', 'Aporte']];

export function NewEntry({ desktop }: { desktop: boolean }) {
  const w = useWorkspace();
  const owner = useApp((s) => s.owner.name);
  const initial = useUI((u) => u.novo.type);
  const items = walletItems(w.accounts, w.cards, owner.toUpperCase());

  const [type, setType] = useState<EntryType>(initial);
  const [cents, setCents] = useState('');
  const [typed, setTyped] = useState('');
  const [desc, setDesc] = useState('');
  const [catId, setCatId] = useState<ID | undefined>(undefined);
  const [method, setMethod] = useState<Method>(initial === 'receita' ? 'pix' : w.cards.length ? 'cartao_virtual' : 'pix');
  const [source, setSource] = useState<ID | undefined>(undefined);
  const [toAcc, setToAcc] = useState<ID | undefined>(w.accounts[1]?.id);
  const [parc, setParc] = useState(1);
  const [paid, setPaid] = useState(true);
  const [fixed, setFixed] = useState(false);
  const [date, setDate] = useState(todayISO());

  const isR = type === 'receita';
  const amount = desktop ? parseBRL(typed) ?? 0 : Number(cents || '0');
  const cats = w.categories.filter((c) => c.kind === (isR ? 'income' : 'expense'));
  const isCardMethod = method === 'cartao_fisico' || method === 'cartao_virtual';

  const sources = useMemo(() => {
    if (type === 'transf' || type === 'aporte' || isR) return items.filter((i) => i.kind === 'debito');
    if (method === 'dinheiro') return [];
    if (isCardMethod) return [...items.filter((i) => i.kind === 'credito'), ...items.filter((i) => i.kind === 'debito')];
    return items.filter((i) => i.kind === 'debito');
  }, [type, isR, method, isCardMethod, items]);
  const src = sources.find((s) => s.id === source) ?? sources[0];
  const isCredit = type === 'despesa' && src?.kind === 'credito' && isCardMethod;

  const sug = useMemo(() => (type === 'despesa' || isR) && desc.trim().length > 2 ? suggestCategory(w, desc, isR ? 'income' : 'expense') : null, [w, desc, type, isR]);
  const sugCat = sug?.categoryId && sug.categoryId !== catId ? w.categories.find((c) => c.id === sug.categoryId) : undefined;

  const press = (k: string) => setCents((c) => (k === '⌫' ? c.slice(0, -1) : (c + k).replace(/^0+/, '').slice(0, 9)));

  const save = () => {
    if (!amount) return toast('Digite um valor para salvar.');
    if (type === 'transf' && (!src || !toAcc || src.id === toAcc)) return toast('Escolha duas contas diferentes.');
    const { undo } = addEntry({
      type, amount, description: desc.trim() || (type === 'despesa' ? cats.find((c) => c.id === catId)?.name ?? 'Despesa' : type === 'receita' ? 'Receita' : type === 'aporte' ? 'Aporte' : 'Transferência'),
      date, categoryId: type === 'despesa' || isR ? catId ?? sug?.categoryId ?? undefined : undefined,
      method: type === 'transf' || type === 'aporte' ? 'transferencia' : method,
      accountId: isCredit ? undefined : src?.id, toAccountId: type === 'transf' ? toAcc : undefined,
      cardId: isCredit ? src?.id : undefined, installments: isCredit ? parc : 1, paid, fixed: fixed && parc === 1,
    });
    closeNovo();
    toast('Pronto. Ficou organizado e você pode desfazer se precisar.', undo);
  };

  const pickType = (t: EntryType) => {
    setType(t);
    setCatId(undefined);
    setMethod(t === 'receita' ? 'pix' : w.cards.length ? 'cartao_virtual' : 'pix');
    setSource(undefined);
  };

  return (
    <Sheet onClose={closeNovo} desktop={desktop} label="Novo lançamento">
      <div className="row between" style={{ marginBottom: 14 }}>
        <h2 className="h2" style={{ fontSize: 22 }}>novo lançamento</h2>
        <button type="button" className="icon-btn" style={{ width: 40, height: 40 }} onClick={closeNovo} aria-label="Fechar"><Icon name="x" size={20} /></button>
      </div>
      <Seg label="Tipo" value={type} options={TYPES} onChange={pickType} />

      {desktop ? (
        <label className="field" style={{ margin: '18px 0 14px' }}>
          <span>valor</span>
          <input className="input mono" autoFocus inputMode="decimal" placeholder="0,00" value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} style={{ fontSize: 24, height: 60 }} />
        </label>
      ) : (
        <div className="amount" style={{ color: isR ? 'var(--in)' : 'var(--text)' }} aria-live="polite">R$ {num(amount)}</div>
      )}

      {type !== 'transf' && (
        <label className="field" style={{ marginBottom: 12 }}>
          <span>{type === 'aporte' ? 'onde vai investir' : 'descrição'}</span>
          <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={type === 'aporte' ? 'Tesouro Selic, CDB…' : isR ? 'Salário, freela…' : 'Mercado, Uber…'} maxLength={80} />
        </label>
      )}

      {sugCat && (
        <button type="button" className="coco-note" style={{ width: '100%', textAlign: 'left', marginTop: 0, marginBottom: 12 }} onClick={() => setCatId(sugCat.id)}>
          <CocoFace mood="curiosa" size={34} />
          <span className="grow">Parece ser <b>{sugCat.name}</b>. Confirmar?</span>
          <span className="pill teal">confirmar</span>
        </button>
      )}

      {(type === 'despesa' || isR) && (
        <>
          <div className="eyebrow" style={{ margin: '6px 0 10px' }}>categoria</div>
          <div className="chips" style={{ marginBottom: 16 }}>
            {cats.map((c) => <button key={c.id} type="button" className="chip teal" aria-pressed={(catId ?? sug?.categoryId) === c.id} onClick={() => setCatId(c.id)}>{c.name}</button>)}
          </div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>{isR ? 'como você recebeu' : 'como foi pago'}</div>
          <div className="chips" style={{ marginBottom: 16 }}>
            {(isR ? RECEIVE : PAY).map((m) => (
              <button key={m} type="button" className="chip" aria-pressed={method === m} onClick={() => { setMethod(m); setSource(undefined); }}>
                <Icon name={METHOD_ICON[m]} size={16} />{LABEL[m]}
              </button>
            ))}
          </div>
        </>
      )}

      {sources.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            {type === 'transf' ? 'de qual conta' : type === 'aporte' ? 'saiu de qual conta' : isCardMethod && !isR ? (method === 'cartao_virtual' ? 'qual cartão virtual' : 'qual cartão') : isR ? 'em qual conta' : 'de qual conta'}
          </div>
          <div className="chips" style={{ marginBottom: 16 }}>
            {sources.map((s) => (
              <button key={s.id} type="button" className="chip" style={{ height: 52, padding: '0 14px 0 8px', boxShadow: src?.id === s.id ? '0 0 0 2px var(--milk)' : undefined }} aria-pressed={src?.id === s.id} onClick={() => setSource(s.id)}>
                <CardThumb item={s} />
                <span>{s.name} <span className="mono small muted">{s.kind === 'credito' ? 'crédito' : 'débito'}</span></span>
              </button>
            ))}
          </div>
        </>
      )}

      {type === 'transf' && (
        <>
          <div className="eyebrow" style={{ marginBottom: 10 }}>para qual conta</div>
          <div className="chips" style={{ marginBottom: 16 }}>
            {items.filter((i) => i.kind === 'debito' && i.id !== src?.id).map((s) => (
              <button key={s.id} type="button" className="chip" aria-pressed={toAcc === s.id} onClick={() => setToAcc(s.id)}>{s.name}</button>
            ))}
          </div>
        </>
      )}

      {isCredit && (
        <>
          <div className="eyebrow" style={{ marginBottom: 10 }}>parcelas</div>
          <div className="chips" style={{ marginBottom: 16 }}>
            {[1, 2, 3, 6, 10].map((p) => <button key={p} type="button" className="chip" aria-pressed={parc === p} onClick={() => setParc(p)}>{p === 1 ? 'à vista' : `${p}x`}</button>)}
          </div>
          {parc > 1 && amount > 0 && <p className="small muted" style={{ margin: '-6px 0 14px' }}>{parc}x de R$ {num(Math.floor(amount / parc))} — uma em cada fatura.</p>}
        </>
      )}

      <div className="chips" style={{ marginBottom: 16 }}>
        {[[todayISO(), 'hoje'], [addDaysISO(todayISO(), -1), 'ontem']].map(([d, l]) => <button key={l} type="button" className="chip" aria-pressed={date === d} onClick={() => setDate(d as string)}>{l}</button>)}
        <input type="date" className="input" style={{ height: 36, width: 'auto', borderRadius: 18 }} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Outra data" />
      </div>

      <div className="list-row" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="grow">
          <div style={{ fontWeight: 600 }}>{isR ? 'Já recebi' : 'Já foi pago'}</div>
          <div className="small muted">{paid ? 'entra nos totais agora' : 'fica como previsto'}</div>
        </div>
        <Toggle on={paid} onChange={setPaid} label={isR ? 'Já recebi' : 'Já foi pago'} />
      </div>
      {parc === 1 && type !== 'aporte' && (
        <div className="list-row">
          <div className="grow">
            <div style={{ fontWeight: 600 }}>Repete todo mês</div>
            <div className="small muted">cada mês é confirmado na sua vez</div>
          </div>
          <Toggle on={fixed} onChange={setFixed} label="Repete todo mês" />
        </div>
      )}

      {!desktop && (
        <div className="keypad" style={{ margin: '16px 0' }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'].map((k) => (
            <button key={k} type="button" className={k === '⌫' ? 'bare' : undefined} onClick={() => press(k)} aria-label={k === '⌫' ? 'Apagar' : k}>
              {k === '⌫' ? <Icon name="delete" size={24} /> : k}
            </button>
          ))}
        </div>
      )}
      <button type="button" className="btn btn-milk btn-block" style={{ marginTop: desktop ? 18 : 0, height: 56 }} onClick={save}>Salvar</button>
    </Sheet>
  );
}
