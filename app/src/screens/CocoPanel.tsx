import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp, useWorkspace, updateSettings, getState } from '../state/store';
import { closeCoco, go, patchUI, toast, useUI } from '../state/route';
import { acceptRecurrence, addEntry, decideCoco, depositToGoal, dismissRecurrence, forgetMemory, rememberFact, setCategories, type Undo, gastarCoconut, saldoCoconutz } from '../state/actions';
import { reply, sourceLabel, suggestions, countWord, type Draft, type Suggestion, type SuggestionAction } from '../coco/engine';
import { detectRecurrences } from '../domain/recurrence';
import { brl } from '../domain/money';
import { dayMonth } from '../domain/dates';
import type { Workspace } from '../domain/types';
import { Icon } from '../ui/Icon';
import { CocoFace, SidePanel, Sheet, Toggle } from '../ui/bits';

interface Msg {
  id: number;
  from: 'coco' | 'me';
  text: string;
  tag?: string;
  draft?: Draft;
  fact?: string;
  undo?: Undo;
  settled?: boolean;
}

// a conversa sobrevive a fechar e abrir o painel, mas não a recarregar o app
let history: Msg[] = [{ id: 0, from: 'coco', text: 'Pode me pedir para lançar, analisar ou planejar. Por exemplo: “gastei 45 no iFood”.', tag: 'assistente' }];
let seq = 1;

const SUGGESTED = ['Gastei 45 no iFood', 'Quanto sobra até o fim do mês?', 'Monte um plano para a viagem'];

export function CocoPanel({ desktop }: { desktop: boolean }) {
  const w = useWorkspace();
  const tab = useUI((u) => u.coco.tab);
  const learning = useApp((s) => s.settings.coco.learning);
  const patterns = w.automation.categoryRules.length + w.coco.memory.length;
  const setTab = (t: typeof tab) => patchUI({ coco: { open: true, tab: t } });

  const body = (
    <>
      <div className="coco-head">
        <CocoFace mood="feliz" size={56} />
        <div className="grow">
          <div className="h2" style={{ fontSize: 22 }}>coco</div>
          <div className="coco-status"><i style={{ background: learning ? 'var(--teal)' : 'var(--text-2)' }} />{learning ? `aprendendo com você · ${patterns} ${patterns === 1 ? 'padrão' : 'padrões'}` : 'aprendizado pausado'}</div>
        </div>
        <button type="button" className="icon-btn" style={{ width: 40, height: 40 }} onClick={closeCoco} aria-label="Fechar a Coco"><Icon name="x" size={20} /></button>
      </div>
      <div style={{ padding: '0 20px 12px' }}>
        <div className="seg" role="tablist">
          {(['agora', 'conversa', 'memoria'] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} aria-pressed={tab === t} onClick={() => setTab(t)}>
              {t === 'agora' ? 'Agora' : t === 'conversa' ? 'Conversa' : 'Memória'}
            </button>
          ))}
        </div>
      </div>
      {tab === 'agora' && <Agora w={w} />}
      {tab === 'conversa' && <Conversa w={w} />}
      {tab === 'memoria' && <Memoria w={w} />}
    </>
  );

  if (desktop) return <SidePanel onClose={closeCoco} label="Coco">{body}</SidePanel>;
  return (
    <Sheet onClose={closeCoco} desktop={false} label="Coco">
      <div style={{ margin: '-16px -20px -24px', display: 'flex', flexDirection: 'column', minHeight: '78vh' }}>{body}</div>
    </Sheet>
  );
}

/* ------------------------------------------------------------ agora */

const doneLog = new Map<string, { text: string; undo: Undo }>();

function Agora({ w }: { w: Workspace }) {
  const decided = useApp((s) => s.cocoDecisions);
  const [, force] = useState(0);
  const list = useMemo(() => suggestions(w, decided), [w, decided]);
  const open = list.filter((s) => !decided[s.id] && !doneLog.has(s.id));
  const done = [...doneLog.entries()];

  const run = (s: Suggestion, a: SuggestionAction | { type: 'dismiss' }) => {
    let undo: Undo | null = null;
    switch (a.type) {
      case 'categorize':
        undo = setCategories(a.changes);
        break;
      case 'recurrence': {
        const c = detectRecurrences(w).find((r) => r.id === a.candidateId);
        if (c) undo = acceptRecurrence(c, a.method);
        break;
      }
      case 'remind-invoice': {
        const prev = getState().settings.reminders;
        updateSettings({ reminders: { ...prev, fatura: true } });
        decideCoco(s.id, 'done');
        undo = () => { updateSettings({ reminders: prev }); decideCoco(s.id, null); };
        break;
      }
      case 'goal-deposit':
        undo = depositToGoal(a.goalId, a.amount);
        break;
      case 'open':
        closeCoco();
        go(a.screen, a.pick ?? null);
        return;
      case 'dismiss':
        if (s.id.startsWith('rec:')) dismissRecurrence(s.id.slice(4));
        decideCoco(s.id, 'dismissed');
        toast('Tudo bem. Não vou sugerir isso de novo.', () => decideCoco(s.id, null));
        return;
    }
    if (undo) {
      const u = undo;
      doneLog.set(s.id, { text: s.doneText, undo: () => { u(); doneLog.delete(s.id); force((n) => n + 1); } });
      force((n) => n + 1);
    }
  };

  return (
    <div className="sheet-body" style={{ paddingTop: 4 }}>
      <h3 className="h2" style={{ margin: '4px 0 14px' }}>{open.length ? `${countWord(open.length)} ${open.length === 1 ? 'coisa esperando' : 'coisas esperando'} por você.` : 'tudo em dia por aqui.'}</h3>
      {open.length === 0 && done.length === 0 && (
        <div className="empty"><CocoFace mood="calma" size={110} /><p>Quando eu notar um padrão, uma fatura fechando ou uma meta fora do ritmo, aparece aqui.</p></div>
      )}
      {open.map((s) => (
        <article key={s.id} className="act">
          <div className="act-tag"><Icon name={s.icon} size={18} /><span className="pill">{s.tag}</span></div>
          <p>{s.text}</p>
          <div className="row">
            <button type="button" className="btn btn-milk btn-s" onClick={() => run(s, s.primary.action)}>{s.primary.label}</button>
            <button type="button" className="btn btn-ghost btn-s" onClick={() => run(s, s.secondary.action)}>{s.secondary.label}</button>
          </div>
        </article>
      ))}
      {done.map(([id, d]) => (
        <article key={id} className="act done">
          <div className="act-tag"><Icon name="circle-check" size={18} /><span className="pill teal">feito</span></div>
          <p>{d.text}</p>
          <button type="button" className="btn btn-ghost btn-s" onClick={d.undo}>Desfazer</button>
        </article>
      ))}
      <p className="small muted" style={{ marginTop: 18 }}>Toda ação da Coco pode ser desfeita. Toda previsão é uma estimativa.</p>
    </div>
  );
}

/* ------------------------------------------------------------ conversa */

function Conversa({ w }: { w: Workspace }) {
  const [msgs, setMsgs] = useState<Msg[]>(history);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [saldo, setSaldo] = useState(saldoCoconutz);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { history = msgs; end.current?.scrollIntoView({ block: 'end' }); }, [msgs, typing]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || typing) return;
    /* Cobra ANTES de mandar. Se o mês acabou, o pedido não sai e o
       coconut não é queimado à toa. */
    if (!gastarCoconut()) {
      toast('Seus coconutz do mês acabaram. Eles voltam na virada do mês.');
      return;
    }
    setSaldo(saldoCoconutz());
    setMsgs((m) => [...m, { id: seq++, from: 'me', text: t }]);
    setDraft('');
    setTyping(true);
    setTimeout(() => {
      const r = reply(getWorkspaceNow() ?? w, t);
      setTyping(false);
      setMsgs((m) => [...m, { id: seq++, from: 'coco', text: r.text, tag: r.tag, draft: r.kind === 'draft' ? r.draft : undefined, fact: r.kind === 'remember' ? r.fact : undefined }]);
    }, 650);
  };

  const settle = (id: number, patch: Partial<Msg>) => setMsgs((m) => m.map((x) => (x.id === id ? { ...x, ...patch, settled: true } : x)));

  const launch = (m: Msg) => {
    const d = m.draft as Draft;
    const { ids, undo } = addEntry({ type: d.type, amount: d.amount, description: d.description, date: d.date, categoryId: d.categoryId, method: d.method, accountId: d.accountId, cardId: d.cardId, installments: 1, paid: true, fixed: false, origin: 'coco' });
    const learn = d.categoryId && ids[0] ? setCategories([{ txId: ids[0], categoryId: d.categoryId }]) : null;
    const cat = w.categories.find((c) => c.id === d.categoryId)?.name;
    settle(m.id, { tag: 'ação feita' });
    setMsgs((x) => [...x, { id: seq++, from: 'coco', tag: 'ação feita · desfazer', text: `Lancei ${brl(d.amount)}${cat ? ` em ${cat}` : ''}, ${sourceLabel(w, d)}.${cat ? ` Guardei que ${d.description} costuma ser ${cat}.` : ''}`, undo: () => { learn?.(); undo(); } }]);
  };

  return (
    <>
      <div className="sheet-body" style={{ paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {msgs.map((m) => (
          <div key={m.id}>
            <div className={m.from === 'coco' ? 'msg coco' : 'msg me'}>{m.text}</div>
            {m.draft && !m.settled && (
              <div className="act" style={{ marginTop: 8, maxWidth: '92%' }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>{m.draft.type} · {dayMonth(m.draft.date)}</div>
                <div className="row between"><b>{m.draft.description}</b><span className="mono">{brl(m.draft.amount)}</span></div>
                <div className="small muted" style={{ margin: '4px 0 12px' }}>{w.categories.find((c) => c.id === m.draft?.categoryId)?.name ?? 'Sem categoria'} · {sourceLabel(w, m.draft)}</div>
                <div className="row">
                  <button type="button" className="btn btn-milk btn-s" onClick={() => launch(m)}>Lançar</button>
                  <button type="button" className="btn btn-ghost btn-s" onClick={() => settle(m.id, { tag: 'descartado' })}>Descartar</button>
                </div>
              </div>
            )}
            {m.fact && !m.settled && (
              <div className="row" style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-milk btn-s" onClick={() => { rememberFact(m.fact as string, 'você me disse'); settle(m.id, {}); toast('Guardei na Memória.'); }}>Guardar</button>
                <button type="button" className="btn btn-ghost btn-s" onClick={() => settle(m.id, {})}>Não precisa</button>
              </div>
            )}
            {m.from === 'coco' && m.tag && (
              <div className="msg-meta">
                <span>{m.tag}</span>
                {m.undo && !m.settled && <button type="button" className="link" style={{ fontSize: 11 }} onClick={() => { m.undo?.(); settle(m.id, { tag: 'desfeito' }); }}>desfazer</button>}
                {m.id !== 0 && <button type="button" style={{ font: 'inherit', color: 'inherit' }} onClick={() => toast('Obrigado. Esta resposta foi marcada para revisão.')}>denunciar</button>}
              </div>
            )}
          </div>
        ))}
        {typing && <div className="msg coco typing" aria-label="Coco está pensando"><i /><i /><i /></div>}
        {msgs.length <= 2 && (
          <div className="chips" style={{ marginTop: 6 }}>
            {SUGGESTED.map((s) => <button key={s} type="button" className="chip" onClick={() => send(s)}>{s}</button>)}
          </div>
        )}
        <div ref={end} />
      </div>
      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
        <button type="button" className="icon-btn" onClick={() => toast('A conversa por voz entra na próxima versão.')} aria-label="Falar"><Icon name="mic" /></button>
        <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Peça para lançar ou planejar" aria-label="Mensagem para a Coco" />
        <button type="submit" className="icon-btn" style={{ background: 'var(--teal)', color: 'var(--night)' }} aria-label="Enviar" disabled={!draft.trim()}><Icon name="send" size={20} /></button>
      </form>
      <p className="small muted" style={{ textAlign: 'center', margin: '0 0 10px' }}>
        <span className="mono">{saldo.restam}</span> de {saldo.total} coconutz neste mês · nesta versão a Coco responde no aparelho: nada sai daqui.
      </p>
    </>
  );
}

function getWorkspaceNow(): Workspace | null {
  const s = getState();
  return s.workspaces.find((x) => x.id === s.activeId) ?? null;
}

/* ------------------------------------------------------------ memória */

function Memoria({ w }: { w: Workspace }) {
  const learning = useApp((s) => s.settings.coco.learning);
  const catName = (id: string) => w.categories.find((c) => c.id === id)?.name ?? 'uma categoria';
  const items = [
    ...w.coco.memory.map((m) => ({ id: m.id, title: m.title, detail: m.detail })),
    ...w.automation.categoryRules.map((r) => ({ id: r.id, title: r.merchantKey.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()), detail: `vira ${catName(r.categoryId)} · regra confirmada por você` })),
  ];
  return (
    <div className="sheet-body" style={{ paddingTop: 4 }}>
      <div className="list-row" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="grow">
          <div style={{ fontWeight: 600 }}>Aprender com meus lançamentos</div>
          <div className="small muted">{learning ? 'cada categoria que você corrige vira regra' : 'pausado: nada novo é guardado'}</div>
        </div>
        <Toggle on={learning} onChange={(v) => updateSettings({ coco: { ...getState().settings.coco, learning: v } })} label="Aprender com meus lançamentos" />
      </div>
      <h3 className="h2" style={{ margin: '18px 0 8px' }}>o que aprendi sobre você</h3>
      {items.length === 0 && <p className="muted small">Ainda nada. Conforme você confirma categorias e me conta preferências, aparece aqui.</p>}
      {items.map((m) => (
        <div key={m.id} className="list-row">
          <div className="grow">
            <div style={{ fontWeight: 600 }}>{m.title}</div>
            <div className="small muted">{m.detail}</div>
          </div>
          <button type="button" className="btn btn-ghost btn-s" onClick={() => { forgetMemory(m.id); toast('Esqueci.'); }}>Esquecer</button>
        </div>
      ))}
    </div>
  );
}
