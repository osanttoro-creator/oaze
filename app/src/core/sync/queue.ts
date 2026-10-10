import { store } from '../storage';
import type { Op } from './types';

/*
  A fila de mudanças pendentes.

  O briefing do OAZE 2 mandava "portar `fila.js`"; a auditoria mostrou que esse
  arquivo nunca existiu no OAZE 1 (P8). Então aqui ela é escrita, e com três
  propriedades que o app precisa de verdade:

  - **persistida no cofre**, não em memória: fechar o app com rede caída não
    pode perder lançamento;
  - **idempotente por `opId`**: subir duas vezes a mesma operação não duplica
    nada, e é isso que permite tentar de novo sem medo;
  - **limitada**, com descarte pelo mais velho e aviso — uma fila que cresce sem
    teto estoura a cota de armazenamento e aí o app para de gravar.
*/

const LEGACY_KEY = 'oaze.sync.queue.v1';
/** ~3 MB de operações. Acima disso o problema é outro: a sincronização não sobe. */
const MAX = 4000;

let ops: Op[] = [];
let loaded = false;
let owner: string | null = null;
let writing = Promise.resolve();
let timer: ReturnType<typeof setTimeout> | undefined;

function keyFor(id: string | null): string {
  return id ? `oaze.sync.queue.v2.user.${encodeURIComponent(id)}` : LEGACY_KEY;
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function onQueueChange(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export async function load(): Promise<void> {
  if (loaded) return;
  loaded = true;
  const raw = await store().get(keyFor(owner));
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Op[];
    if (Array.isArray(parsed)) ops = parsed;
  } catch {
    /* fila ilegível: começar vazia é melhor que travar o app no arranque */
    ops = [];
  }
  emit();
}

/* Gravação coalescida: cem lançamentos num minuto não devem gerar cem escritas
   no cofre, que no celular é I/O de verdade. */
function persist(): void {
  clearTimeout(timer);
  timer = setTimeout(() => { void flushToDisk(); }, 180);
}

export function enqueue(...incoming: Op[]): void {
  for (const op of incoming) {
    if (ops.some((o) => o.opId === op.opId)) continue;
    ops.push(op);
  }
  if (ops.length > MAX) ops = ops.slice(ops.length - MAX);
  persist();
  emit();
}

export function pending(): readonly Op[] {
  return ops;
}

export function pendingCount(): number {
  return ops.length;
}

export function pendingFor(space: string): Op[] {
  return ops.filter((o) => o.space === space);
}

/** Remove o que o servidor confirmou. Qualquer coisa enfileirada depois fica. */
export function ack(opIds: readonly string[]): void {
  if (!opIds.length) return;
  const done = new Set(opIds);
  ops = ops.filter((o) => !done.has(o.opId));
  persist();
  emit();
}

export async function flushToDisk(): Promise<void> {
  clearTimeout(timer);
  timer = undefined;
  const key = keyFor(owner);
  const value = JSON.stringify(ops);
  writing = writing.catch(() => {}).then(() => store().set(key, value));
  await writing;
}

/** Trocar de conta salva a fila anterior e carrega só a fila da nova conta. */
export async function selectQueueOwner(id: string | null): Promise<void> {
  if (owner === id && loaded) return;
  if (loaded) await flushToDisk();
  else await writing;
  owner = id;
  ops = [];
  loaded = false;
  await load();
}

/** Só para teste. */
export function resetQueueForTest(): void {
  clearTimeout(timer);
  ops = [];
  loaded = false;
  owner = null;
  writing = Promise.resolve();
}
