import { useSyncExternalStore } from 'react';
import { freezeStateWrites, getState, replaceState } from './store';
import { lockNow } from './session';
import {
  flushPersistedWrites,
  persistedOwner,
  readPersisted,
  savePersistedFor,
  selectPersistedOwner,
} from './persist';

let desired: string | null = null;
let switching: Promise<void> | null = null;
let failure: Error | null = null;
const listeners = new Set<() => void>();

export function usePartitionFailure(): Error | null {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => failure,
  );
}

/**
 * A conta autenticada só vê seu próprio estado local. O espaço sem conta fica
 * guardado para quando a pessoa sair, sem ser enviado automaticamente à nuvem.
 */
export function switchAccountPartition(userId: string | null, holdWrites = false): Promise<void> {
  desired = userId;
  if (switching) return switching;
  if (persistedOwner() === desired) return Promise.resolve();

  const previousOwner = persistedOwner();
  const previousState = getState();
  failure = null;
  listeners.forEach((listener) => listener());
  lockNow();
  freezeStateWrites(true);
  replaceState(null);

  switching = (async () => {
    await savePersistedFor(previousOwner, previousState);
    await flushPersistedWrites();
    while (persistedOwner() !== desired) {
      const nextOwner = desired;
      selectPersistedOwner(nextOwner);
      const nextState = await readPersisted();
      if (nextOwner === desired) replaceState(nextState);
    }
    if (!holdWrites) freezeStateWrites(false);
  })().catch((error: unknown) => {
    failure = error instanceof Error ? error : new Error('Não consegui abrir os dados desta conta.');
    listeners.forEach((listener) => listener());
    throw failure;
  }).finally(() => {
    switching = null;
  });
  return switching;
}

export async function accountPartitionReady(): Promise<void> {
  while (switching) await switching;
}
