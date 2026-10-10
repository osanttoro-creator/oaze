import { useEffect, useState } from 'react';
import { setState } from '../state/store';
import { isValidPin, setPin } from '../state/security';
import { unlock } from '../state/session';
import { demoWorkspace, emptyWorkspace } from '../domain/seed';
import { BANKS } from '../domain/banks';
import { parseBRL } from '../domain/money';
import { todayISO } from '../domain/dates';
import { uid } from '../domain/ids';
import type { Workspace } from '../domain/types';
import { migrateV1, readLocalV1, type MigrationResult } from '../domain/migrate-v1';
import { MergeAnim } from '../ui/Merge';
import { PinPad } from '../ui/PinPad';
import { CocoBody } from '../ui/bits';
import { hasAccountBackend } from '../core/api/client';
import { useAuth } from '../core/auth';
import { previewLegacyCloud } from '../core/legacy-cloud';
import { Account } from './Account';
import { readPersistedFor } from '../state/persist';
import type { AppState } from '../state/store';

type Step = 'intro' | 'entrar' | 'nome' | 'conta' | 'pin' | 'pin2';

/*
  Primeiro acesso. O exemplo vive num espaço separado e marcado: o OAZE 1
  aprendeu que dado de exemplo dentro da conta real contamina o histórico.
*/
export function Welcome() {
  const auth = useAuth();
  const [step, setStep] = useState<Step>('intro');
  const [name, setName] = useState('');
  const [bank, setBank] = useState('nubank');
  const [balance, setBalance] = useState('');
  const [ws, setWs] = useState<Workspace | null>(null);
  const [pin, setPinValue] = useState('');
  const [first, setFirst] = useState('');
  const [error, setError] = useState('');
  // No mesmo navegador do site antigo, os dados locais podem ser importados.
  const [v1] = useState(() => migrateV1(readLocalV1()));
  const [imported, setImported] = useState<MigrationResult | null>(null);
  const [cloud, setCloud] = useState<MigrationResult | null>(null);
  const [localAccountData, setLocalAccountData] = useState<AppState | null>(null);
  const [importedLocal, setImportedLocal] = useState<AppState | null>(null);
  const [cloudError, setCloudError] = useState('');
  const [checkingCloud, setCheckingCloud] = useState(false);

  useEffect(() => {
    if (auth.status !== 'signed-in') {
      setCloud(null);
      return;
    }
    let active = true;
    setStep((current) => current === 'entrar' ? 'intro' : current);
    setCloudError('');
    setCheckingCloud(true);
    void readPersistedFor(null).then((saved) => {
      if (active && saved?.workspaces.some((space) => !space.demo)) setLocalAccountData(saved);
    });
    void previewLegacyCloud().then((found) => {
      if (active) setCloud(found);
    }).catch(() => {
      if (active) setCloudError('Não consegui consultar seus dados antigos agora. Eles continuam preservados no site.');
    }).finally(() => {
      if (active) setCheckingCloud(false);
    });
    return () => { active = false; };
  }, [auth.status, auth.user?.id]);

  const finish = async (withPin: string | null, space: Workspace | null, owner: string) => {
    if (withPin) await setPin(withPin);
    if (importedLocal) {
      const workspaces = structuredClone(importedLocal.workspaces.filter((w) => !w.demo));
      const activeId = workspaces.some((w) => w.id === importedLocal.activeId) ? importedLocal.activeId : workspaces[0]?.id ?? null;
      setState((s) => ({ ...s, owner: importedLocal.owner, workspaces, activeId }));
    } else if (imported) {
      setState((s) => ({ ...s, owner: { name: imported.owner || owner }, workspaces: imported.workspaces, activeId: imported.activeId }));
    } else if (space) {
      setState((s) => ({ ...s, owner: { name: owner }, workspaces: [...s.workspaces, space], activeId: space.id, plan: space.demo ? 'mensal' : s.plan }));
    }
    unlock();
  };

  const startImport = (source: MigrationResult) => {
    setImportedLocal(null);
    setImported(source);
    setName(source.owner);
    setStep('pin');
  };

  const startImportLocal = () => {
    if (!localAccountData) return;
    setImported(null);
    setImportedLocal(localAccountData);
    setName(localAccountData.owner.name);
    setStep('pin');
  };

  const startDemo = () => {
    setName('Ana Souza');
    setWs(demoWorkspace());
    setStep('pin');
  };

  const createSpace = (withAccount: boolean) => {
    const w = emptyWorkspace('Pessoal');
    const cents = parseBRL(balance) ?? 0;
    if (withAccount) {
      const preset = BANKS.find((b) => b.key === bank);
      w.accounts.push({ id: uid('acc'), name: preset?.name ?? 'Conta', bank, tint: 0, openingBalance: cents, openedAt: todayISO() });
    }
    setWs(w);
    setStep('pin');
  };

  const onPin = (p: string) => {
    if (step === 'pin') {
      if (!isValidPin(p)) {
        setError('Evite sequências e números repetidos. Tente outro.');
        setPinValue('');
        return;
      }
      setError('');
      setFirst(p);
      setPinValue('');
      setStep('pin2');
      return;
    }
    if (p !== first) {
      setError('Os dois PINs não bateram. Vamos de novo.');
      setPinValue('');
      setFirst('');
      setStep('pin');
      return;
    }
    if (ws || imported || importedLocal) void finish(p, ws, name.trim());
  };

  return (
    <div className="lock" style={{ overflowY: 'auto', justifyContent: step === 'intro' ? 'center' : 'flex-start' }}>
      <div style={{ width: 'min(420px, 100%)', margin: '0 auto' }}>
        {step === 'intro' && (
          <>
            <MergeAnim />
            <h1 className="title" style={{ fontSize: 30, marginBottom: 10 }}>todos os seus cartões em um só lugar</h1>
            <p className="muted" style={{ margin: '0 0 28px' }}>Contas, cartões, faturas e metas numa visão só. A Coco percebe os padrões e deixa tudo pronto para você confirmar.</p>
            <div className="stack">
              {checkingCloud && <p className="small muted">Procurando seus dados da conta OAZE…</p>}
              {cloudError && <p className="small muted" role="alert">{cloudError}</p>}
              {cloud && (
                <>
                  <button type="button" className="btn btn-milk btn-block" onClick={() => startImport(cloud)}>Trazer dados da minha conta OAZE</button>
                  <p className="small muted" style={{ margin: '-4px 0 6px' }}>
                    Encontrei {cloud.report.spaces} espaço(s) e {cloud.report.transactions} lançamento(s). Revise antes de confirmar; o site antigo permanece intacto.
                  </p>
                </>
              )}
              {auth.status === 'signed-in' && localAccountData && (
                <>
                  <button type="button" className="btn btn-ghost btn-block" onClick={startImportLocal}>Trazer dados locais para esta conta</button>
                  <p className="small muted" style={{ margin: '-4px 0 6px' }}>
                    {localAccountData.workspaces.filter((space) => !space.demo).length} espaço(s) deste aparelho. Uma cópia continua disponível ao sair da conta.
                  </p>
                </>
              )}
              {v1 && (
                <>
                  <button type="button" className="btn btn-milk btn-block" onClick={() => startImport(v1)}>Trazer dados deste navegador</button>
                  <p className="small muted" style={{ margin: '-4px 0 6px' }}>
                    Encontrei {v1.report.transactions} {v1.report.transactions === 1 ? 'lançamento' : 'lançamentos'}, {v1.report.accounts + v1.report.cards} {v1.report.accounts + v1.report.cards === 1 ? 'conta ou cartão' : 'contas e cartões'} e {v1.report.goals} {v1.report.goals === 1 ? 'meta' : 'metas'} neste navegador. Os dados antigos continuam onde estão.
                  </p>
                </>
              )}
              <button type="button" className={v1 ? 'btn btn-ghost btn-block' : 'btn btn-milk btn-block'} onClick={() => setStep('nome')}>{v1 ? 'Começar do zero' : 'Começar'}</button>
              {hasAccountBackend() && auth.status !== 'signed-in' && (
                <button type="button" className="btn btn-ghost btn-block" onClick={() => setStep('entrar')}>Já tenho conta OAZE</button>
              )}
              <button type="button" className="btn btn-ghost btn-block" onClick={startDemo}>Ver com dados de exemplo</button>
            </div>
            <p className="small muted" style={{ marginTop: 18 }}>Nesta versão, seus dados ficam só neste aparelho.</p>
          </>
        )}

        {step === 'entrar' && (
          <div style={{ marginTop: 40 }}>
            <Account />
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setStep('intro')}>Voltar</button>
          </div>
        )}

        {step === 'nome' && (
          <form className="stack" style={{ textAlign: 'left', marginTop: 40 }} onSubmit={(e) => { e.preventDefault(); if (name.trim()) setStep('conta'); }}>
            <CocoBody pose="feliz" width={170} />
            <h1 className="title">como quer ser chamado?</h1>
            <label className="field">
              <span>seu nome</span>
              <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name" />
            </label>
            <button type="submit" className="btn btn-milk btn-block" disabled={!name.trim()}>Continuar</button>
          </form>
        )}

        {step === 'conta' && (
          <form className="stack" style={{ textAlign: 'left', marginTop: 40 }} onSubmit={(e) => { e.preventDefault(); createSpace(true); }}>
            <h1 className="title">onde está seu dinheiro?</h1>
            <p className="muted" style={{ margin: 0 }}>Comece pela conta que você mais usa. Cartões e outras contas entram depois, pela carteira.</p>
            <label className="field">
              <span>banco</span>
              <select className="input" value={bank} onChange={(e) => setBank(e.target.value)}>
                {BANKS.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>saldo de hoje</span>
              <input className="input mono" inputMode="decimal" placeholder="0,00" value={balance} onChange={(e) => setBalance(e.target.value)} />
            </label>
            <button type="submit" className="btn btn-milk btn-block">Continuar</button>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => createSpace(false)}>Pular por enquanto</button>
          </form>
        )}

        {(step === 'pin' || step === 'pin2') && (
          <div style={{ marginTop: 40 }}>
            <h1 className="title">{step === 'pin' ? 'crie um pin de 6 números' : 'digite de novo'}</h1>
            <p className="muted" style={{ margin: '10px 0 0' }}>Ele abre o OAZE neste aparelho. A biometria entra depois, nas configurações.</p>
            {imported && step === 'pin' && imported.report.notes.length > 0 && (
              <ul className="small muted" style={{ textAlign: 'left', margin: '14px 0 0', paddingLeft: 18 }}>
                {imported.report.notes.map((n) => <li key={n}>{n}</li>)}
              </ul>
            )}
            {error &&<p role="alert" style={{ color: 'var(--milk)', marginTop: 12 }}>{error}</p>}
            <PinPad value={pin} onChange={setPinValue} onDone={onPin} />
            {ws?.demo && step === 'pin' && (
              <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 20 }} onClick={() => void finish(null, ws, name)}>
                Pular — é só o exemplo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
