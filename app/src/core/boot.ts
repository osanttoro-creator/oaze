import { installTheme } from '../design-system/theme';
import { demoWorkspace } from '../domain/seed';
import { installPrivacyCurtain } from '../platform';
import { installHardwareBack, installNative } from '../platform/native';
import { backIntent } from '../state/route';
import { installAutoLock, unlock } from '../state/session';
import { flushSave, freezeStateWrites, getState, hydrate, setState, type AppState } from '../state/store';
import { persistedOwner, readPersisted } from '../state/persist';
import { authState, onAuthChange, startAuth } from './auth';
import { accountPartitionReady, switchAccountPartition } from '../state/partition';
import { hasAccountBackend, hasSyncBackend } from './api/client';
import { boot as bootStorage, bootFailure } from './storage';
import { adoptEnvelope, localSpaces, startCapture } from './sync/bridge';
import { deviceId, selectRevisionOwner, start as startSync, suspendSync, waitSyncIdle, wire } from './sync/engine';
import { flushToDisk, selectQueueOwner } from './sync/queue';
import { installErrorReporting, reportHandled } from './telemetry';

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
  /* O arranque é o único lugar que pode costurar as duas pontas: a plataforma
     sabe como sair do app e não conhece a tela; a rota sabe o que está na tela
     e não sabe em qual loja o app está. */
  void installHardwareBack(backIntent);
  if (hasAccountBackend()) {
    let syncOwner: string | null = null;
    let stopSync: () => void = () => {};
    let stopCapture: (() => void) | null = null;
    let transition = Promise.resolve();
    if (hasSyncBackend()) wire(localSpaces, adoptEnvelope);

    onAuthChange(() => {
      const userId = authState().user?.id ?? null;
      if (persistedOwner() === userId && syncOwner === userId) return;
      suspendSync();
      const partition = switchAccountPartition(userId, hasSyncBackend());
      transition = transition.then(async () => {
        stopSync();
        await waitSyncIdle();
        await partition;
        if ((authState().user?.id ?? null) !== userId || !hasSyncBackend()) return;
        await selectQueueOwner(userId);
        await selectRevisionOwner(userId);
        await deviceId();
        if (userId) {
          stopCapture ??= startCapture();
          freezeStateWrites(false);
          stopSync = await startSync();
        } else freezeStateWrites(false);
        syncOwner = userId;
      }).catch((error) => reportHandled(error, 'troca de conta'));
    });
    void startAuth().then(accountPartitionReady).catch((error) => reportHandled(error, 'início da conta'));
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
