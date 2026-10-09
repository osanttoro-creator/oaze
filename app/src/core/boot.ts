import { installTheme } from '../design-system/theme';
import { demoWorkspace } from '../domain/seed';
import { installPrivacyCurtain } from '../platform';
import { installNative } from '../platform/native';
import { installAutoLock, unlock } from '../state/session';
import { flushSave, getState, hydrate, setState, type AppState } from '../state/store';
import { readPersisted } from '../state/persist';
import { startAuth } from './auth';
import { hasAccountBackend, hasSyncBackend } from './api/client';
import { boot as bootStorage, bootFailure } from './storage';
import { adoptEnvelope, localSpaces, startCapture } from './sync/bridge';
import { start as startSync, wire } from './sync/engine';
import { flushToDisk, load as loadQueue } from './sync/queue';
import { installErrorReporting } from './telemetry';

/*
  A ordem do arranque não é arbitrária — cada passo depende do anterior:

  1. **cofre** — precisa estar aberto antes de qualquer leitura, senão o app lê
     `localStorage` e grava no cofre, e os dois divergem;
  2. **estado** — hidrata a loja com o que estava guardado;
  3. **tema, cortina, trava** — coisas de tela, baratas, antes do primeiro quadro;
  4. **plataforma** — biometria e notificação, sob demanda, sem travar o resto;
  5. **conta** — lê a sessão existente;
  6. **sincronização** — só depois de haver estado e sessão para sincronizar.

  Nada aqui é bloqueante por vaidade: os passos 4 a 6 rodam soltos, e a tela já
  aparece. Um app de finanças tem de abrir mesmo sem rede.
*/

export interface BootResult {
  /** `null` quando o cofre certo para esta plataforma abriu. */
  storageProblem: Error | null;
}

export async function boot(): Promise<BootResult> {
  installErrorReporting();

  await bootStorage();
  hydrate(await readPersisted());

  installTheme();
  installPrivacyCurtain();
  installAutoLock();

  /* grava o que está em memória antes de o sistema encerrar o app */
  window.addEventListener('pagehide', () => {
    flushSave();
    void flushToDisk();
  });

  seedDemoIfAsked();

  /* o resto em paralelo: nenhuma destas peças é pré-requisito da primeira tela */
  void installNative();
  if (hasAccountBackend()) {
    void startAuth().then(async () => {
      if (hasSyncBackend()) {
        wire(localSpaces, adoptEnvelope);
        await loadQueue();
        startCapture();
        return startSync();
      }
    });
  }

  return { storageProblem: bootFailure() };
}

/** "Experimentar" no site abre o exemplo — só em aparelho sem nenhum dado. */
function seedDemoIfAsked(): void {
  if (!new URLSearchParams(location.search).has('demo')) return;
  if (getState().workspaces.length) return;
  const w = demoWorkspace();
  setState((s: AppState) => ({ ...s, owner: { name: 'Ana Souza' }, plan: 'mensal', workspaces: [w], activeId: w.id }));
  unlock();
}
