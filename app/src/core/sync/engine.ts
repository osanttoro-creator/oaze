import { useEffect, useState } from 'react';
import type { ID, Workspace } from '../../domain/types';
import { uid } from '../../domain/ids';
import { platform } from '../../platform';
import { api } from '../api/client';
import { authState } from '../auth';
import { store } from '../storage';
import { applyOps, prune, wrap } from './merge';
import { ack, enqueue, load as loadQueue, onQueueChange, pendingCount, pendingFor } from './queue';
import type { Envelope, Op, RemoteSpace, Stamp, SyncStatus } from './types';

/*
  O motor de sincronização.

  Ciclo de uma subida:

      pega as operações pendentes do espaço
        → lê a revisão que tem em mão
        → chama `oaze2_save_space(id, rev_esperada, envelope)`
        → se a revisão bateu: pronto, confirma as operações
        → se não bateu: o servidor devolve a versão NOVA, as operações são
          REAPLICADAS sobre ela, e sobe de novo com a revisão nova

  O segundo caminho é o que faz dois aparelhos no mesmo mês conviverem. Tentar
  três vezes e parar: se a revisão muda três vezes seguidas durante a subida, o
  outro lado está escrevendo sem parar e insistir só queima bateria.
*/

const REV_KEY = 'oaze.sync.rev.v1';
const DEVICE_KEY = 'oaze.device.v1';
const MAX_ATTEMPTS = 3;

let revisions: Record<ID, number> = {};
let device = '';
let status: SyncStatus = { phase: 'idle', pending: 0, lastSyncAt: null, notice: null, error: null };

const listeners = new Set<() => void>();

function patch(next: Partial<SyncStatus>): void {
  status = { ...status, ...next, pending: pendingCount() };
  listeners.forEach((l) => l());
}

export function syncStatus(): SyncStatus {
  return status;
}

export function useSyncStatus(): SyncStatus {
  const [snap, setSnap] = useState(status);
  useEffect(() => {
    const l = () => setSnap(syncStatus());
    listeners.add(l);
    const off = onQueueChange(l);
    return () => {
      listeners.delete(l);
      off();
    };
  }, []);
  return snap;
}

/** Identidade do aparelho: desempata carimbos e alimenta "sair dos outros". */
export async function deviceId(): Promise<string> {
  if (device) return device;
  device = (await store().get(DEVICE_KEY)) ?? '';
  if (!device) {
    device = `${platform()}-${uid('dev')}`;
    await store().set(DEVICE_KEY, device);
  }
  return device;
}

export function stamp(): Stamp {
  return { at: new Date().toISOString(), device };
}

export function record(op: Omit<Op, 'opId' | 'at' | 'device'>): void {
  enqueue({ ...stamp(), opId: uid('op'), ...op } as Op);
}

async function loadRevisions(): Promise<void> {
  const raw = await store().get(REV_KEY);
  if (!raw) return;
  try {
    revisions = JSON.parse(raw) as Record<ID, number>;
  } catch {
    revisions = {};
  }
}

async function saveRevisions(): Promise<void> {
  await store().set(REV_KEY, JSON.stringify(revisions));
}

/* ------------------------------------------------------------------ leitura */

export async function pull(): Promise<RemoteSpace[]> {
  const c = await api();
  if (!c || authState().status !== 'signed-in') return [];
  const { data, error } = await c
    .from('oaze2_spaces')
    .select('id,rev,payload,updated_at')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { id: ID; rev: number; payload: Envelope; updated_at: string }[];
  for (const row of rows) revisions[row.id] = row.rev;
  await saveRevisions();
  return rows.map((r) => ({ id: r.id, rev: r.rev, envelope: r.payload, updatedAt: r.updated_at }));
}

/* ------------------------------------------------------------------ escrita */

interface SaveReply {
  ok: boolean;
  rev: number;
  /** Nulo quando o espaço não existe mais na conta. */
  payload: Envelope | null;
}

async function save(id: ID, expected: number, envelope: Envelope): Promise<SaveReply> {
  const c = await api();
  if (!c) throw new Error('Sem conexão com a conta.');
  const { data, error } = await c.rpc('oaze2_save_space', {
    p_id: id,
    p_expected_rev: expected,
    p_payload: envelope,
  });
  if (error) throw new Error(error.message);
  return data as SaveReply;
}

/**
 * Sobe o que está pendente para um espaço. Devolve o envelope que ficou valendo
 * — a camada de cima troca o espaço local por ele quando houve fusão.
 */
export async function push(space: Workspace): Promise<{ envelope: Envelope; merged: boolean } | null> {
  const ops = pendingFor(space.id);
  if (!ops.length) return null;

  /* Base: a última versão conhecida do servidor, ou o espaço local embrulhado
     quando é a primeira subida. */
  let base: Envelope = wrap(space);
  let rev = revisions[space.id] ?? 0;
  let merged = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { envelope, dropped } = applyOps(base, ops);
    const reply = await save(space.id, rev, prune(envelope));

    if (reply.ok) {
      revisions[space.id] = reply.rev;
      await saveRevisions();
      ack(ops.map((o) => o.opId));
      patch({
        phase: merged ? 'conflict-resolved' : 'idle',
        lastSyncAt: new Date().toISOString(),
        error: null,
        notice: dropped.length
          ? `${dropped.length} ${dropped.length === 1 ? 'alteração' : 'alterações'} não entraram: ${dropped[0]?.why ?? 'conflito com outro aparelho'}.`
          : null,
      });
      /* `ok: true` sempre devolve payload; o `??` é só para o tipo, já que a
         mesma resposta serve ao caminho de conflito, onde ele pode ser nulo. */
      return { envelope: reply.payload ?? envelope, merged };
    }

    /* Revisão não bateu. Dois casos:
       - o servidor tem versão mais nova → reaplica as operações sobre ela;
       - o servidor não tem o espaço (payload nulo) → este aparelho carregava uma
         revisão de um espaço que foi apagado na conta; recomeça do zero em vez
         de insistir com um número que não existe mais. */
    merged = true;
    base = reply.payload ?? wrap(space);
    rev = reply.payload ? reply.rev : 0;
  }

  patch({ phase: 'error', error: 'Outro aparelho está gravando agora. Tentaremos de novo em instantes.' });
  return null;
}

/* ------------------------------------------------------------------ ciclo */

let timer: ReturnType<typeof setTimeout> | undefined;
let running = false;

export type Provider = () => Workspace[];
export type Adopter = (envelope: Envelope) => void;

let provide: Provider = () => [];
let adopt: Adopter = () => {};

export function wire(provider: Provider, adopter: Adopter): void {
  provide = provider;
  adopt = adopter;
}

/** Uma rodada. Seguro chamar a qualquer momento: nunca roda duas em paralelo. */
export async function sync(): Promise<void> {
  if (running) return;
  if (!navigator.onLine) {
    patch({ phase: 'offline' });
    return;
  }
  if (authState().status !== 'signed-in') {
    patch({ phase: 'idle', error: null });
    return;
  }
  running = true;
  patch({ phase: 'syncing', error: null });
  try {
    /* espaço de exemplo nunca sobe: é dado ilustrativo e misturaria com real */
    for (const space of provide().filter((s) => !s.demo)) {
      const out = await push(space);
      if (out?.merged) adopt(out.envelope);
    }
    const remote = await pull();
    for (const r of remote) adopt(r.envelope);
    if (status.phase === 'syncing') patch({ phase: 'idle', lastSyncAt: new Date().toISOString() });
  } catch (err) {
    patch({ phase: 'error', error: err instanceof Error ? err.message : 'A sincronização falhou.' });
  } finally {
    running = false;
  }
}

/**
 * Liga o ciclo: sincroniza ao voltar a rede, ao voltar o foco e a cada 90 s
 * quando há pendência. Não é um `setInterval` fixo — um app parado não deve
 * acordar o rádio a cada minuto.
 */
export async function start(): Promise<() => void> {
  await deviceId();
  await loadRevisions();
  await loadQueue();
  patch({});

  const kick = () => void sync();
  window.addEventListener('online', kick);
  window.addEventListener('focus', kick);
  const onVis = () => {
    if (document.visibilityState === 'visible') kick();
  };
  document.addEventListener('visibilitychange', onVis);
  const offline = () => patch({ phase: 'offline' });
  window.addEventListener('offline', offline);

  const beat = () => {
    timer = setTimeout(() => {
      if (pendingCount()) void sync();
      beat();
    }, 90_000);
  };
  beat();
  kick();

  return () => {
    clearTimeout(timer);
    window.removeEventListener('online', kick);
    window.removeEventListener('focus', kick);
    window.removeEventListener('offline', offline);
    document.removeEventListener('visibilitychange', onVis);
  };
}

/** Só para teste. */
export function resetEngineForTest(): void {
  revisions = {};
  device = 'test-device';
  running = false;
  clearTimeout(timer);
  status = { phase: 'idle', pending: 0, lastSyncAt: null, notice: null, error: null };
}
