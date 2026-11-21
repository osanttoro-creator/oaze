import { lazy, Suspense, useMemo, useState } from 'react';
import {
  atLeast,
  contextPanelFor,
  NavigationBar,
  OazeIntelligence,
  shellFor,
  Sidebar,
  Toast,
  useBreakpoint,
  type FieldState,
  type NavEntry,
} from '../design-system';
import { Avatar } from '../design-system/components/Feedback';
import { countWord, suggestions } from '../coco/engine';
import { go, MORE_SCREENS, openCoco, openNovo, patchUI, useUI, type Screen } from '../state/route';
import { lockNow } from '../state/session';
import { useApp, useWorkspace } from '../state/store';
import { useSyncStatus } from '../core/sync/engine';
import { Icon } from '../ui/Icon';
import { MAIN, MORE_ITEMS, type NavDef } from '../ui/nav';
import { NewEntry } from '../screens/NewEntry';
import { CocoPanel } from '../screens/CocoPanel';
import { ScreenHost } from './screens';
import { describe, useShortcuts, type Shortcut } from './shortcuts';
import './shell.css';

/*
  A casca. Uma árvore, duas navegações, quatro faixas de largura.

  O que mudou em relação à versão anterior (P11 e P13 da auditoria):

  - a largura vira FAIXA nomeada (`phone` · `tablet` · `desktop` · `wide`), e a
    faixa escolhe a casca — ilha inferior até 1024 px, barra lateral acima;
  - em `wide` o painel de contexto fica aberto, porque sobra coluna; em
    `desktop` ele abre sob demanda;
  - o botão da inteligência é o campo de partículas (decisão D3), não um rosto:
    rosto não tem como mostrar "pensando" e "processando" como estados distintos;
  - a paleta de comandos entra por import dinâmico, então não pesa no celular.
*/

const CommandPalette = lazy(() => import('./CommandPalette').then((m) => ({ default: m.CommandPalette })));

/** Pendências da Coco: o número que aparece no campo e na navegação. */
function usePending(): number {
  const w = useWorkspace();
  const decided = useApp((s) => s.cocoDecisions);
  return useMemo(() => suggestions(w, decided).filter((s) => !decided[s.id]).length, [w, decided]);
}

/** O estado do campo de partículas sai do que o sistema está fazendo de fato. */
function useFieldState(pending: number): FieldState {
  const sync = useSyncStatus();
  if (sync.phase === 'error') return 'error';
  if (sync.phase === 'syncing') return 'processing';
  if (pending > 0) return 'thinking';
  return 'idle';
}

export function Shell() {
  const bp = useBreakpoint();
  const desktop = atLeast(bp, 'desktop');
  const screen = useUI((u) => u.screen);
  const novoOpen = useUI((u) => u.novo.open);
  const cocoOpen = useUI((u) => u.coco.open);
  const toast = useUI((u) => u.toast);
  const pending = usePending();
  const field = useFieldState(pending);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const commands = useMemo(() => {
    const nav = [...MAIN, ...MORE_ITEMS];
    return [
      ...nav.map(({ id, label }) => ({ id: `ir-${id}`, group: 'Ir para', label, run: () => go(id) })),
      { id: 'novo-despesa', group: 'Criar', label: 'Nova despesa', kbd: 'D', run: () => openNovo('despesa') },
      { id: 'novo-receita', group: 'Criar', label: 'Nova receita', kbd: 'R', run: () => openNovo('receita') },
      { id: 'novo', group: 'Criar', label: 'Novo lançamento', kbd: 'N', run: () => openNovo() },
      { id: 'coco', group: 'OAZE', label: 'Falar com a Coco', kbd: 'J', run: () => openCoco('conversa') },
      { id: 'travar', group: 'Conta', label: 'Bloquear agora', run: lockNow },
    ];
  }, []);

  const shortcuts: Shortcut[] = useMemo(
    () => [
      { key: 'k', mod: true, description: 'Paleta de comandos', run: () => setPaletteOpen((o) => !o) },
      { key: 'n', description: 'Novo lançamento', run: () => openNovo() },
      { key: 'd', description: 'Nova despesa', run: () => openNovo('despesa') },
      { key: 'r', description: 'Nova receita', run: () => openNovo('receita') },
      { key: 'j', description: 'Falar com a Coco', run: () => openCoco('conversa') },
    ],
    [],
  );
  useShortcuts(shortcuts, !novoOpen);

  const overlays = (
    <>
      {novoOpen && <NewEntry desktop={desktop} />}
      {cocoOpen && <CocoPanel desktop={desktop} />}
      {toast && (
        <Toast
          text={toast.text}
          undo={toast.undo ? () => {
            toast.undo?.();
            patchUI({ toast: null });
          } : null}
        />
      )}
      {paletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette open onClose={() => setPaletteOpen(false)} commands={commands} />
        </Suspense>
      )}
    </>
  );

  const body = <ScreenHost screen={screen} />;

  if (shellFor(bp) === 'sidebar') {
    return (
      <DesktopShell screen={screen} pending={pending} field={field} cocoOpen={cocoOpen} wide={bp === 'wide'}>
        {body}
        {overlays}
      </DesktopShell>
    );
  }
  return (
    <IslandShell screen={screen} pending={pending} field={field} cocoOpen={cocoOpen} hideChrome={novoOpen} roomy={bp === 'tablet'}>
      {body}
      {overlays}
    </IslandShell>
  );
}

interface CascaProps {
  screen: Screen;
  pending: number;
  field: FieldState;
  cocoOpen: boolean;
  children: React.ReactNode;
}

function IslandShell({
  screen,
  pending,
  field,
  cocoOpen,
  hideChrome,
  roomy,
  children,
}: CascaProps & { hideChrome: boolean; roomy: boolean }) {
  const isOn = (id: Screen) => id === screen || (id === 'mais' && MORE_SCREENS.includes(screen));
  const current = MAIN.find((n) => isOn(n.id))?.id ?? 'inicio';
  const items: NavEntry<Screen>[] = MAIN.map((n) => ({ id: n.id, label: n.label, short: n.short, icon: <Icon name={n.icon} size={24} /> }));

  return (
    <div className="oz-app">
      <div className="oz-m-shell">
        <main className="oz-m-scroll" data-scroll>
          {children}
        </main>
        {!hideChrome && (
          <>
            {!cocoOpen && screen !== 'inicio' && (
              <button
                type="button"
                className="oz-field-fab oz-trigger"
                onClick={() => openCoco('agora')}
                aria-label={pending ? `Abrir a Coco, ${countWord(pending)} ${pending === 1 ? 'pendência' : 'pendências'}` : 'Abrir a Coco'}
              >
                <OazeIntelligence state={field} size={62} label={null} />
                {pending > 0 && <span className="ds-badge ds-badge-milk oz-field-count">{pending}</span>}
              </button>
            )}
            <NavigationBar
              label="Navegação principal"
              items={items}
              current={current}
              onSelect={go}
              roomy={roomy}
              center={
                <button type="button" className="oz-island-plus" onClick={() => openNovo()} aria-label="Novo lançamento">
                  <Icon name="plus" size={34} />
                </button>
              }
            />
          </>
        )}
      </div>
    </div>
  );
}

function DesktopShell({ screen, pending, field, cocoOpen, wide, children }: CascaProps & { wide: boolean }) {
  const owner = useApp((s) => s.owner.name);
  const plan = useApp((s) => s.plan);
  const hasPin = useApp((s) => !!s.security.pin);
  const sync = useSyncStatus();

  const entry = (n: NavDef): NavEntry<Screen> => ({ id: n.id, label: n.label, icon: <Icon name={n.icon} size={20} /> });

  return (
    <div className="oz-app">
      <div className={wide ? 'oz-d-shell is-wide' : 'oz-d-shell'}>
        <Sidebar
          label="Navegação principal"
          current={screen}
          onSelect={go}
          logo={<img className="oz-logo" src="./brand/oaze-logo-mono-milk.svg" alt="OAZE" />}
          primary={
            <button type="button" className="ds-btn ds-btn-milk oz-side-new" onClick={() => openNovo()}>
              <span className="ds-row">
                <Icon name="plus" size={20} />
                Novo lançamento
              </span>
              <span className="ds-kbd">N</span>
            </button>
          }
          groups={[
            { items: MAIN.filter((n) => n.id !== 'mais').map(entry) },
            { title: 'Mais', items: MORE_ITEMS.map(entry) },
          ]}
          foot={
            <div className="oz-side-user">
              <Avatar name={owner || 'você'} size={40} />
              <div className="ds-grow">
                <div className="oz-side-name">{owner || 'você'}</div>
                <div className="ds-small ds-muted">{plan ? `OAZE ${plan}` : 'plano grátis'}</div>
              </div>
              {hasPin && (
                <button type="button" className="ds-icon-btn" style={{ width: 38, height: 38 }} onClick={lockNow} aria-label="Bloquear agora">
                  <Icon name="lock" size={18} />
                </button>
              )}
            </div>
          }
        />
        <main className="oz-d-main" data-scroll>
          <div className="oz-d-page">{children}</div>
          {!cocoOpen && (
            <button type="button" className="oz-field-pill" onClick={() => openCoco('agora')}>
              <OazeIntelligence state={field} size={52} label={null} />
              <span>
                {pending
                  ? `${countWord(pending).replace(/^./, (c) => c.toUpperCase())} ${pending === 1 ? 'coisa' : 'coisas'} para ver`
                  : 'Falar com a Coco'}
              </span>
              <span className="ds-kbd ds-kbd-dim">{describe({ key: 'k', mod: true, description: '', run: () => {} })}</span>
            </button>
          )}
        </main>
        {contextPanelFor(wide ? 'wide' : 'desktop') === 'fixed' && (
          <aside className="oz-context" aria-label="Contexto">
            <div className="ds-eyebrow">Sincronização</div>
            <p className="ds-small ds-muted">{syncPhrase(sync.phase, sync.pending)}</p>
            {sync.notice && <p className="ds-small">{sync.notice}</p>}
          </aside>
        )}
      </div>
    </div>
  );
}

function syncPhrase(phase: ReturnType<typeof useSyncStatus>['phase'], pending: number): string {
  if (phase === 'offline') return pending ? `Sem rede. ${pending} ${pending === 1 ? 'mudança espera' : 'mudanças esperam'}.` : 'Sem rede agora.';
  if (phase === 'syncing') return 'Subindo o que mudou…';
  if (phase === 'error') return 'A última tentativa falhou. Seus dados estão salvos aqui.';
  if (phase === 'conflict-resolved') return 'Juntamos o que você mudou com o outro aparelho.';
  return pending ? `${pending} ${pending === 1 ? 'mudança para subir' : 'mudanças para subir'}.` : 'Tudo sincronizado.';
}
