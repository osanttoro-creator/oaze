import { useEffect, useState } from 'react';
import { useApp } from '../state/store';
import { checkPin } from '../state/security';
import { unlock } from '../state/session';
import { biometrics, labelFor, platform } from '../platform';
import { MergeAnim } from '../ui/Merge';
import { PinPad } from '../ui/PinPad';
import { Icon } from '../ui/Icon';

export function Lock() {
  const bioOn = useApp((s) => s.settings.biometrics);
  const [bioReady, setBioReady] = useState(false);
  const [mode, setMode] = useState<'bio' | 'pin'>('pin');
  const [pin, setPinValue] = useState('');
  const [msg, setMsg] = useState('');
  const [shake, setShake] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [waitUntil, setWaitUntil] = useState(0);
  const [, tick] = useState(0);
  const label = labelFor(platform());

  useEffect(() => {
    if (!bioOn) return;
    void biometrics.info().then((i) => {
      setBioReady(i.available);
      if (i.available) setMode('bio');
    });
  }, [bioOn]);

  useEffect(() => {
    if (waitUntil <= Date.now()) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [waitUntil]);

  const bio = async () => {
    setScanning(true);
    const ok = await biometrics.verify('Abrir o OAZE');
    setScanning(false);
    if (ok) unlock();
    else setMode('pin');
  };

  const onDone = async (p: string) => {
    const r = await checkPin(p);
    if (r.ok) return unlock();
    setPinValue('');
    setShake(true);
    setTimeout(() => setShake(false), 420);
    if (r.waitMs > 0) {
      setWaitUntil(Date.now() + r.waitMs);
      setMsg('Muitas tentativas. Espere um pouco para tentar de novo.');
    } else setMsg(r.left <= 2 ? `PIN incorreto. Depois de mais ${r.left} ${r.left === 1 ? 'erro' : 'erros'}, o app espera antes da próxima tentativa.` : 'PIN incorreto.');
  };

  const waiting = waitUntil > Date.now();
  const secs = Math.ceil((waitUntil - Date.now()) / 1000);

  return (
    <div className="lock">
      <div style={{ width: 'min(380px, 100%)' }}>
        <MergeAnim scale={mode === 'pin' ? 0.72 : 1} />
        {mode === 'bio' ? (
          <>
            <h1 className="title" style={{ fontSize: 26, marginBottom: 26 }}>todos os seus cartões em um só lugar</h1>
            {scanning && <div className="scan"><Icon name="scan-face" size={46} /></div>}
            <button type="button" className="btn btn-milk btn-block" onClick={() => void bio()} disabled={scanning}>
              <Icon name="scan-face" size={20} />{scanning ? 'Reconhecendo…' : `Entrar com ${label}`}
            </button>
            <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => setMode('pin')}>Usar PIN</button>
          </>
        ) : (
          <>
            <h1 className="title" style={{ fontSize: 24, marginTop: -30 }}>digite seu pin</h1>
            <p className="muted small" role="alert" style={{ minHeight: 20, margin: '8px 0 0' }}>{waiting ? `Tente de novo em ${secs}s.` : msg}</p>
            <PinPad value={pin} onChange={setPinValue} onDone={(p) => void onDone(p)} onBio={bioReady ? () => void bio() : undefined} shake={shake} disabled={waiting} />
          </>
        )}
      </div>
    </div>
  );
}
