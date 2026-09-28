import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useApp, useWorkspace } from './state/store';
import { go, openCoco, openNovo, useUI, MORE_SCREENS, patchUI, type Screen } from './state/route';
import { lockNow, useDesktop } from './state/session';
import { suggestions, countWord } from './coco/engine';
import { Icon, type IconName } from './ui/Icon';
import { CocoFace } from './ui/bits';
import { Home } from './screens/Home';
import { Transactions } from './screens/Transactions';
import { Carteira } from './screens/Carteira';
import { More } from './screens/More';
import { Investments } from './screens/Investments';
import { Categories } from './screens/Categories';
import { Goals } from './screens/Goals';
import { Reminders } from './screens/Reminders';
import { Reports } from './screens/Reports';
import { Settings } from './screens/Settings';
import { Plan } from './screens/Plan';
import { NewEntry } from './screens/NewEntry';
import { CocoPanel } from './screens/CocoPanel';

const SCREENS: Record<Screen, () => ReactNode> = {
  inicio: () => <Home />,
  lancamentos: () => <Transactions />,
  carteira: () => <Carteira />,
  mais: () => <More />,
  investimentos: () => <Investments />,
  categorias: () => <Categories />,
  metas: () => <Goals />,
  lembretes: () => <Reminders />,
  relatorios: () => <Reports />,
  configuracoes: () => <Settings />,
  plano: () => <Plan />,
};

const MAIN: [Screen, string, IconName][] = [
  ['inicio', 'Início', 'house'],
  ['lancamentos', 'Lançamentos', 'arrow-left-right'],
  ['carteira', 'Carteira', 'wallet'],
];

export const MORE_ITEMS: [Screen, string, IconName][] = [
  ['investimentos', 'Investimentos', 'trending-up'],
  ['categorias', 'Categorias', 'shapes'],
  ['metas', 'Metas e orçamentos', 'target'],
  ['lembretes', 'Lembretes', 'bell'],
  ['relatorios', 'Relatórios', 'chart-column'],
  ['configuracoes', 'Configurações', 'settings'],
  ['plano', 'Plano', 'sprout'],
];

function usePending(): number {
  const w = useWorkspace();
  const decided = useApp((s) => s.cocoDecisions);
  return useMemo(() => suggestions(w, decided).filter((s) => !decided[s.id]).length, [w, decided]);
}

export function Shell() {
  const desktop = useDesktop();
  const screen = useUI((u) => u.screen);
  const novoOpen = useUI((u) => u.novo.open);
  const cocoOpen = useUI((u) => u.coco.open);
  const toast = useUI((u) => u.toast);
  const pending = usePending();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.key === 'n' || e.key === 'N') && !novoOpen) {
        e.preventDefault();
        openNovo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [novoOpen]);

  const body = (SCREENS[screen] ?? SCREENS.inicio)();
  const overlays = (
    <>
      {novoOpen && <NewEntry desktop={desktop} />}
      {cocoOpen && <CocoPanel desktop={desktop} />}
      {toast && (
        <div className="toast" role="status">
          <span>{toast.text}</span>
          {toast.undo && (
            <button type="button" onClick={() => { toast.undo?.(); patchUI({ toast: null }); }}>
              Desfazer
            </button>
          )}
        </div>
      )}
    </>
  );

  if (desktop) return <DesktopShell screen={screen} pending={pending} cocoOpen={cocoOpen}>{body}{overlays}</DesktopShell>;
  return <MobileShell screen={screen} pending={pending} hideChrome={novoOpen} cocoOpen={cocoOpen}>{body}{overlays}</MobileShell>;
}

function MobileShell({ screen, pending, hideChrome, cocoOpen, children }: { screen: Screen; pending: number; hideChrome: boolean; cocoOpen: boolean; children: ReactNode }) {
  const [tipSeen, setTipSeen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTipSeen(true), 7000);
    return () => clearTimeout(t);
  }, []);
  const isOn = (id: Screen) => id === screen || (id === 'mais' && MORE_SCREENS.includes(screen));
  const nav = (id: Screen, label: string, icon: IconName) => (
    <button key={id} type="button" className="island-item" aria-current={isOn(id) ? 'page' : undefined} onClick={() => go(id)}>
      <Icon name={icon} size={24} />
      {label}
    </button>
  );
  const open = () => {
    setTipSeen(true);
    openCoco('agora');
  };
  return (
    <div className="app">
      <div className="m-shell">
        <main className="m-scroll" data-scroll>{children}</main>
        {!hideChrome && (
          <>
            {!cocoOpen && screen === 'inicio' && !tipSeen && pending > 0 && (
              <button type="button" className="coco-tip" onClick={open}>
                Tenho {countWord(pending)} {pending === 1 ? 'coisa' : 'coisas'} para você ver. Quer abrir?
              </button>
            )}
            {!cocoOpen && (
              <button type="button" className="coco-fab" onClick={open} aria-label={`Abrir a Coco${pending ? `, ${pending} pendências` : ''}`}>
                <CocoFace mood={pending ? 'feliz' : 'calma'} size={60} />
                {pending > 0 && <span className="badge">{pending}</span>}
              </button>
            )}
            <nav className="island" aria-label="Navegação principal">
              {nav('inicio', 'Início', 'house')}
              {nav('lancamentos', 'Lançamentos', 'arrow-left-right')}
              <button type="button" className="island-plus" onClick={() => openNovo()} aria-label="Novo lançamento">
                <Icon name="plus" size={34} />
              </button>
              {nav('carteira', 'Carteira', 'wallet')}
              {nav('mais', 'Mais', 'layout-grid')}
            </nav>
          </>
        )}
      </div>
    </div>
  );
}

function DesktopShell({ screen, pending, cocoOpen, children }: { screen: Screen; pending: number; cocoOpen: boolean; children: ReactNode }) {
  const owner = useApp((s) => s.owner.name);
  const plan = useApp((s) => s.plan);
  const hasPin = useApp((s) => !!s.security.pin);
  const item = ([id, label, icon]: [Screen, string, IconName]) => (
    <button key={id} type="button" className="side-item" aria-current={screen === id ? 'page' : undefined} onClick={() => go(id)}>
      <Icon name={icon} size={20} />
      {label}
    </button>
  );
  return (
    <div className="app">
      <div className="d-shell">
        <nav className="sidebar" aria-label="Navegação principal">
          <img className="logo" src="./brand/oaze-logo-mono-milk.svg" alt="OAZE" style={{ width: 'auto' }} />
          <button type="button" className="btn btn-milk side-new" onClick={() => openNovo()}>
            <span className="row" style={{ gap: 8 }}><Icon name="plus" size={20} />Novo lançamento</span>
            <span className="kbd">N</span>
          </button>
          {MAIN.map(item)}
          <div className="eyebrow side-label">Mais</div>
          {MORE_ITEMS.map(item)}
          <div className="side-user">
            <span className="avatar s">{(owner || 'o').charAt(0).toLowerCase()}</span>
            <div className="grow">
              <div style={{ fontWeight: 600, textTransform: 'lowercase' }}>{owner || 'você'}</div>
              <div className="small muted">{plan ? `OAZE ${plan}` : 'sem plano ativo'}</div>
            </div>
            {hasPin && (
              <button type="button" className="icon-btn" style={{ width: 38, height: 38 }} onClick={lockNow} aria-label="Bloquear agora">
                <Icon name="lock" size={18} />
              </button>
            )}
          </div>
        </nav>
        <main className="d-main" data-scroll>
          <div className="d-page">{children}</div>
          {!cocoOpen && (
            <button type="button" className="coco-pill" onClick={() => openCoco('agora')}>
              <CocoFace mood={pending ? 'feliz' : 'calma'} size={58} />
              {pending ? `${countWord(pending).replace(/^./, (c) => c.toUpperCase())} ${pending === 1 ? 'coisa' : 'coisas'} para ver` : 'Falar com a Coco'}
            </button>
          )}
        </main>
      </div>
    </div>
  );
}
