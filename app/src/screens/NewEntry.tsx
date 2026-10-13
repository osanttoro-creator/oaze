import { useMemo, useState } from 'react';
import { useApp, useWorkspace } from '../state/store';
import { closeNovo, toast, useUI } from '../state/route';
import { addEntry, type EntryType } from '../state/actions';
import { suggestCategory } from '../domain/categorize';
import { brl, num, parseBRL } from '../domain/money';
import { compound } from '../domain/calc';
import { addDaysISO, todayISO } from '../domain/dates';
import type { ID, InvestmentType, Method } from '../domain/types';
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
/* O aporte guardava tipo 'tesouro' e 10% ao ano no escuro, sempre, para
   todo mundo. Era a tela mais crua do app: você lançava R$ 500 e não
   ficava sabendo em que, nem a quanto rende, nem quanto vira. Agora as
   três coisas são escolhidas e a conta aparece enquanto você mexe —
   que era o que o OAZE 1 fazia no formulário de investimento. */
const INVEST: [InvestmentType, string][] = [['tesouro', 'Tesouro'], ['cdb', 'CDB'], ['fii', 'FII'], ['acoes', 'Ações'], ['outros', 'Outros']];
/* Referências de setembro de 2026, só como ponto de partida: quem lança
   digita a taxa do papel que comprou. */
const TAXA_SUGERIDA: Record<InvestmentType, number> = { tesouro: 10.5, cdb: 11, fii: 8, acoes: 9, outros: 10 };
const PRAZOS: [number, string][] = [[12, '1 ano'], [24, '2 anos'], [60, '5 anos'], [120, '10 anos']];

const TYPES: [EntryType, string][] = [['despesa', 'Despesa'], ['receita', 'Receita'], ['transf', 'Transferir'], ['aporte', 'Aporte']];

export function NewEntry({ desktop }: { desktop: boolean }) {
  const w = useWorkspace();
  const owner = useApp((s) => s.owner.name);
  const initial = useUI((u) => u.novo);
  const items = walletItems(w.accounts, w.cards, owner.toUpperCase());

  const [type, setType] = useState<EntryType>(initial.type);
  const [cents, setCents] = useState('');
  const [typed, setTyped] = useState('');
  const [desc, setDesc] = useState('');
  const [catId, setCatId] = useState<ID | undefined>(undefined);
  const [method, setMethod] = useState<Method>(initial.type === 'receita' ? 'pix' : w.cards.length ? 'cartao_virtual' : 'pix');
  const [source, setSource] = useState<ID | undefined>(undefined);
  const [toAcc, setToAcc] = useState<ID | undefined>(w.accounts[1]?.id);
  const [parc, setParc] = useState(1);
  const [paid, setPaid] = useState(true);
  const [fixed, setFixed] = useState(false);
  const [date, setDate] = useState(initial.date ?? todayISO());
  const [invType, setInvType] = useState<InvestmentType>('tesouro');
  const [rate, setRate] = useState(TAXA_SUGERIDA.tesouro);
  const [prazo, setPrazo] = useState(24);
  const [mensal, setMensal] = useState(false);

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

  /* Aporte único: o valor rende sozinho. Repetindo todo mês: o
     primeiro já está na conta e os outros entram mês a mês. */
  const projecao = useMemo(
    () => (mensal ? compound(amount, rate, prazo, amount) : compound(0, rate, prazo, amount)),
    [mensal, amount, rate, prazo],
  );

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
      ...(type === 'aporte' ? { investmentType: invType, annualRate: rate } : {}),
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


      {type === 'aporte' && (
        <section className="aporte" aria-label="Rendimento do aporte">
          <div className="eyebrow" style={{ marginBottom: 10 }}>em que</div>
          <div className="chips" style={{ marginBottom: 16 }}>
            {INVEST.map(([k, rotulo]) => (
              <button key={k} type="button" className="chip teal" aria-pressed={invType === k}
                onClick={() => { setInvType(k); setRate(TAXA_SUGERIDA[k]); }}>{rotulo}</button>
            ))}
          </div>

          <label className="field" style={{ marginBottom: 16 }}>
            <span>rende quanto ao ano</span>
            <div className="row" style={{ gap: 10, alignItems: 'center' }}>
              <input className="input mono" style={{ width: 96 }} inputMode="decimal" value={String(rate).replace('.', ',')}
                onChange={(e) => { const v = parseFloat(e.target.value.replace(',', '.')); setRate(Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0); }}
                aria-label="Taxa ao ano, em porcento" />
              <span className="mono muted">% ao ano</span>
            </div>
          </label>

          <div className="eyebrow" style={{ marginBottom: 10 }}>daqui a</div>
          <div className="chips" style={{ marginBottom: 14 }}>
            {PRAZOS.map(([m, rotulo]) => (
              <button key={m} type="button" className="chip" aria-pressed={prazo === m} onClick={() => setPrazo(m)}>{rotulo}</button>
            ))}
          </div>

          <div className="list-row" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="grow">
              <div style={{ fontWeight: 600 }}>Repetir esse valor todo mês</div>
              <div className="small muted">só muda a conta abaixo; o lançamento continua sendo um só</div>
            </div>
            <Toggle on={mensal} onChange={setMensal} label="Repetir esse valor todo mês" />
          </div>

          {/* A conta só aparece quando há valor. Um "R$ 0,00 vira R$ 0,00"
              não informa nada e ainda ocupa a altura da folha. */}
          {amount > 0 ? (
            <div className="grid-2" style={{ marginTop: 14 }}>
              <div className="kpi">
                <span className="eyebrow">vira</span>
                <span className="mono">{brl(projecao.value)}</span>
              </div>
              <div className="kpi">
                <span className="eyebrow">de juros</span>
                <span className="mono in">{brl(projecao.interest)}</span>
              </div>
            </div>
          ) : (
            <p className="small muted" style={{ marginTop: 14 }}>Digite o valor para ver quanto rende.</p>
          )}
          <p className="small muted" style={{ marginTop: 10 }}>
            Estimativa com juros compostos e a taxa acima parada. A taxa real muda, e o OAZE não promete rendimento.
          </p>
        </section>
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
