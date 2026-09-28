import { useEffect, useRef, useState, type ReactNode } from 'react';
import { getState, initialState, setState, updateSettings, useApp, type LockAfter } from '../state/store';
import { clearState, exportBackup, parseBackup } from '../state/persist';
import { checkPin, isValidPin, setPin } from '../state/security';
import { lockNow, useDesktop } from '../state/session';
import { go, openCoco, toast } from '../state/route';
import { biometrics, labelFor, platform } from '../platform';
import { emptyWorkspace } from '../domain/seed';
import { migrateV1 } from '../domain/migrate-v1';
import { Icon } from '../ui/Icon';
import { ScreenHead, Seg, Sheet, Toggle } from '../ui/bits';
import { PinPad } from '../ui/PinPad';

const MAX_SPACES = 5;

export function Settings() {
  const desktop = useDesktop();
  const s = useApp((x) => x);
  const [bio, setBio] = useState({ available: false, label: labelFor(platform()) });
  const [sheet, setSheet] = useState<'pin' | 'wipe' | 'space' | null>(null);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { void biometrics.info().then(setBio); }, []);

  const backup = () => {
    const blob = new Blob([exportBackup(getState())], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `oaze-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const restore = async (f: File) => {
    const text = await f.text();
    try {
      const data = parseBackup(text);
      setState((cur) => ({ ...cur, ...data, security: cur.security }));
      toast('Backup restaurado. Seu PIN continua o mesmo.');
      return;
    } catch {
      /* talvez seja um backup do OAZE 1 */
    }
    let parsed: unknown = null;
    try { parsed = JSON.parse(text); } catch { /* não é JSON */ }
    const old = migrateV1(parsed);
    if (!old) return toast('Não consegui ler este arquivo. Seus dados anteriores continuam preservados.');
    const room = MAX_SPACES - getState().workspaces.length;
    if (room <= 0) return toast(`Já há ${MAX_SPACES} espaços. Apague um antes de trazer o backup do OAZE 1.`);
    // soma aos espaços atuais em vez de substituir: nada do que já está aqui se perde
    const add = old.workspaces.slice(0, room);
    setState((cur) => ({ ...cur, workspaces: [...cur.workspaces, ...add], activeId: add[0]?.id ?? cur.activeId }));
    toast(`Trouxe ${add.length} espaço(s) do OAZE 1, com ${old.report.transactions} lançamentos.`);
  };

  const section = (title: string, children: ReactNode) => (
    <section className="panel">
      <h2 className="h2" style={{ marginBottom: 6 }}>{title}</h2>
      {children}
    </section>
  );
  const row = (label: string, sub: string, right: ReactNode, onClick?: () => void, key?: string) => {
    const body = (
      <>
        <div className="grow"><div style={{ fontWeight: 600 }}>{label}</div><div className="small muted">{sub}</div></div>
        {right}
      </>
    );
    // linha que age é botão: teclado e leitor de tela precisam alcançar
    return onClick
      ? <button key={key} type="button" className="list-row" onClick={onClick}>{body}</button>
      : <div key={key} className="list-row">{body}</div>;
  };

  const security = section('segurança', (
    <>
      {row('PIN de 6 números', s.security.pin ? 'ativo · abre o app neste aparelho' : 'desligado — qualquer pessoa com o aparelho vê seus dados', <button type="button" className="btn btn-ghost btn-s" onClick={() => setSheet('pin')}>{s.security.pin ? 'Trocar' : 'Criar'}</button>)}
      {row(bio.label, bio.available ? 'entra sem digitar o PIN' : platform() === 'web' ? 'disponível nos apps de celular e desktop' : 'não configurada neste aparelho',
        <Toggle on={s.settings.biometrics && bio.available} onChange={async (v) => { if (!v) return updateSettings({ biometrics: false }); if (await biometrics.verify('Ativar biometria no OAZE')) updateSettings({ biometrics: true }); }} label={bio.label} />)}
      <div style={{ padding: '14px 0 6px' }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Pedir desbloqueio de novo depois de</div>
        <div className="small muted" style={{ marginBottom: 10 }}>tempo com o app em segundo plano</div>
        <Seg label="Tempo de bloqueio" value={String(s.settings.lockAfterMin) as `${LockAfter}`} options={[['0', 'agora'], ['1', '1 min'], ['5', '5 min'], ['15', '15 min']]} onChange={(v) => updateSettings({ lockAfterMin: Number(v) as LockAfter })} />
      </div>
      {s.security.pin && row('Bloquear agora', 'fecha o app até o próximo PIN', <Icon name="lock" />, lockNow)}
      {row('Sair dos outros aparelhos', 'entra junto com a conta OAZE e a sincronização', <Icon name="log-out" />, () => toast('Disponível quando a conta OAZE estiver ativa.'))}
    </>
  ));

  const coco = section('coco', (
    <>
      {row('Aprender com meus lançamentos', s.settings.coco.learning ? 'correções viram regras que você pode ver e apagar' : 'pausado', <Toggle on={s.settings.coco.learning} onChange={(v) => updateSettings({ coco: { ...s.settings.coco, learning: v } })} label="Aprender com meus lançamentos" />)}
      {row('Memória da Coco', 'o que ela aprendeu, item por item', <Icon name="chevron-right" />, () => openCoco('memoria'))}
      {row('Dados enviados', 'nenhum: nesta versão a Coco roda no aparelho', <Icon name="brain" />)}
    </>
  ));

  const spaces = section('espaços financeiros', (
    <>
      {s.workspaces.map((w) => row(w.name, w.demo ? 'exemplo · nunca sincroniza' : `${w.accounts.length} contas · ${w.cards.length} cartões`,
        w.id === s.activeId ? <span className="pill teal">ativo</span> : <button type="button" className="btn btn-ghost btn-s" onClick={() => { setState((x) => ({ ...x, activeId: w.id })); go('inicio'); }}>Abrir</button>, undefined, w.id))}
      {s.workspaces.length < MAX_SPACES && <button type="button" className="btn btn-line btn-block" style={{ marginTop: 12 }} onClick={() => setSheet('space')}><Icon name="plus" size={18} />Novo espaço</button>}
    </>
  ));

  const data = section('conta e dados', (
    <>
      {row('Nome', s.owner.name || 'sem nome', <input className="input" style={{ width: 160, height: 40 }} value={s.owner.name} onChange={(e) => setState((x) => ({ ...x, owner: { name: e.target.value.slice(0, 40) } }))} aria-label="Seu nome" />)}
      {row('Notificações', 'o que avisar e quanto mostrar', <Icon name="chevron-right" />, () => go('lembretes'))}
      {row('Plano', s.plan ? `OAZE ${s.plan}` : 'sem plano ativo', <Icon name="chevron-right" />, () => go('plano'))}
      {row('Fazer backup', 'arquivo JSON com todos os espaços, sem o PIN', <Icon name="download" />, backup)}
      {row('Restaurar backup', 'do OAZE 2 substitui; do OAZE 1 soma aos espaços', <Icon name="upload" />, () => file.current?.click())}
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void restore(f); e.target.value = ''; }} />
      {row('Apagar tudo deste aparelho', 'não dá para desfazer sem backup', <Icon name="trash" />, () => setSheet('wipe'))}
      <p className="small muted" style={{ marginBottom: 0 }}>OAZE 2.0 prévia · dados guardados só neste aparelho.</p>
    </>
  ));

  return (
    <>
      <ScreenHead desktop={desktop} eyebrow="segurança e dados" title="configurações" onBack={() => go('mais')} />
      {desktop ? <div className="grid-2" style={{ alignItems: 'start' }}><div>{security}{coco}</div><div>{spaces}{data}</div></div> : <>{security}{coco}{spaces}{data}</>}
      {sheet === 'pin' && <PinSheet desktop={desktop} hasPin={!!s.security.pin} onClose={() => setSheet(null)} />}
      {sheet === 'space' && <SpaceSheet desktop={desktop} onClose={() => setSheet(null)} />}
      {sheet === 'wipe' && (
        <Sheet onClose={() => setSheet(null)} desktop={desktop} label="Apagar tudo">
          <div className="stack">
            <h2 className="h2" style={{ fontSize: 22 }}>apagar tudo deste aparelho?</h2>
            <p className="muted" style={{ margin: 0 }}>Contas, lançamentos, metas, memória da Coco e o PIN saem deste aparelho. Faça um backup antes, se quiser guardar.</p>
            <button type="button" className="btn btn-ghost btn-block" onClick={backup}><Icon name="download" size={18} />Fazer backup primeiro</button>
            <button type="button" className="btn btn-milk btn-block" onClick={() => { clearState(); setState(() => initialState()); setSheet(null); }}>Apagar tudo</button>
          </div>
        </Sheet>
      )}
    </>
  );
}

function PinSheet({ desktop, hasPin, onClose }: { desktop: boolean; hasPin: boolean; onClose: () => void }) {
  const [step, setStep] = useState<'atual' | 'novo' | 'repetir'>(hasPin ? 'atual' : 'novo');
  const [v, setV] = useState('');
  const [first, setFirst] = useState('');
  const [msg, setMsg] = useState('');
  const done = async (p: string) => {
    setV('');
    if (step === 'atual') {
      const r = await checkPin(p);
      if (!r.ok) return setMsg(r.waitMs ? 'Muitas tentativas. Espere um pouco.' : 'PIN incorreto.');
      setMsg('');
      return setStep('novo');
    }
    if (step === 'novo') {
      if (!isValidPin(p)) return setMsg('Evite sequências e números repetidos.');
      setFirst(p);
      setMsg('');
      return setStep('repetir');
    }
    if (p !== first) {
      setStep('novo');
      return setMsg('Os dois PINs não bateram. Vamos de novo.');
    }
    await setPin(p);
    toast('PIN salvo.');
    onClose();
  };
  return (
    <Sheet onClose={onClose} desktop={desktop} label="PIN">
      <div style={{ textAlign: 'center' }}>
        <h2 className="h2" style={{ fontSize: 22 }}>{step === 'atual' ? 'pin atual' : step === 'novo' ? 'novo pin' : 'digite de novo'}</h2>
        <p className="small muted" role="alert" style={{ minHeight: 20 }}>{msg}</p>
        <div style={{ width: 'min(300px, 100%)', margin: '0 auto' }}><PinPad value={v} onChange={setV} onDone={(p) => void done(p)} /></div>
      </div>
    </Sheet>
  );
}

function SpaceSheet({ desktop, onClose }: { desktop: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  return (
    <Sheet onClose={onClose} desktop={desktop} label="Novo espaço">
      <form className="stack" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; const w = emptyWorkspace(name.trim()); setState((s) => ({ ...s, workspaces: [...s.workspaces, w], activeId: w.id })); toast(`Espaço ${name.trim()} criado.`); go('carteira'); onClose(); }}>
        <h2 className="h2" style={{ fontSize: 22 }}>novo espaço financeiro</h2>
        <p className="muted" style={{ margin: 0 }}>Para separar a casa, a empresa ou um projeto. Cada espaço tem contas, cartões e metas próprios.</p>
        <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Casa, MEI, viagem…" maxLength={30} />
        <button type="submit" className="btn btn-milk btn-block" disabled={!name.trim()}>Criar</button>
      </form>
    </Sheet>
  );
}
