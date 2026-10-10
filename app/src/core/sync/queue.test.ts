import { beforeEach, describe, expect, it, vi } from 'vitest';
import { register, resetForTest, type SecureStore } from '../storage';
import { ack, enqueue, flushToDisk, load, pending, pendingCount, pendingFor, resetQueueForTest, selectQueueOwner } from './queue';
import type { Op } from './types';

/*
  A fila é o que garante a promessa "o app continua útil quando a conexão cai".
  O que ela não pode fazer, nunca: perder um lançamento, ou subir o mesmo duas
  vezes.
*/

function memoryStore(): SecureStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    kind: 'browser',
    data,
    async get(k) {
      return data.get(k) ?? null;
    },
    async set(k, v) {
      data.set(k, v);
    },
    async remove(k) {
      data.delete(k);
    },
  };
}

function op(id: string, space = 'ws1'): Op {
  return {
    opId: id,
    at: '2026-10-06T12:00:00.000Z',
    device: 'test',
    space,
    kind: 'del',
    coll: 'transactions',
    id: `t-${id}`,
  };
}

let store: ReturnType<typeof memoryStore>;

beforeEach(() => {
  resetQueueForTest();
  resetForTest();
  store = memoryStore();
  register(store);
});

describe('fila offline', () => {
  it('guarda o que entrou, na ordem', async () => {
    await load();
    enqueue(op('a'), op('b'));
    expect(pending().map((o) => o.opId)).toEqual(['a', 'b']);
    expect(pendingCount()).toBe(2);
  });

  it('não duplica a mesma operação — subir de novo é seguro', async () => {
    await load();
    enqueue(op('a'));
    enqueue(op('a'));
    expect(pendingCount()).toBe(1);
  });

  it('separa por espaço de trabalho', async () => {
    await load();
    enqueue(op('a', 'ws1'), op('b', 'ws2'));
    expect(pendingFor('ws2').map((o) => o.opId)).toEqual(['b']);
  });

  it('confirmar remove só o que o servidor aceitou', async () => {
    await load();
    enqueue(op('a'), op('b'), op('c'));
    ack(['a', 'c']);
    expect(pending().map((o) => o.opId)).toEqual(['b']);
  });

  it('o que entrou depois de a subida começar não é confirmado por engano', async () => {
    await load();
    enqueue(op('a'));
    const subindo = pending().map((o) => o.opId);
    enqueue(op('b'));
    ack(subindo);
    expect(pending().map((o) => o.opId)).toEqual(['b']);
  });

  it('sobrevive a fechar o app: grava e relê do cofre', async () => {
    await load();
    enqueue(op('a'), op('b'));
    await flushToDisk();

    resetQueueForTest();
    await load();
    expect(pending().map((o) => o.opId)).toEqual(['a', 'b']);
  });

  it('mantém pendências da conta A fora da conta B e recupera A depois', async () => {
    await selectQueueOwner('user-a');
    enqueue(op('da-a'));
    await selectQueueOwner('user-b');
    expect(pendingCount()).toBe(0);
    enqueue(op('da-b'));
    await selectQueueOwner('user-a');
    expect(pending().map((item) => item.opId)).toEqual(['da-a']);
    expect(store.data.has('oaze.sync.queue.v2.user.user-b')).toBe(true);
  });

  it('fila ilegível no disco começa vazia em vez de travar o arranque', async () => {
    store.data.set('oaze.sync.queue.v1', '{isso não é json');
    await load();
    expect(pendingCount()).toBe(0);
  });

  it('avisa quem escuta a cada mudança', async () => {
    await load();
    const seen = vi.fn();
    const { onQueueChange } = await import('./queue');
    const off = onQueueChange(seen);
    enqueue(op('a'));
    ack(['a']);
    off();
    enqueue(op('b'));
    expect(seen).toHaveBeenCalledTimes(2);
  });
});
