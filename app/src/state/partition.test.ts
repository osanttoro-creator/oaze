import { beforeEach, describe, expect, it } from 'vitest';
import { register, type SecureStore } from '../core/storage';
import { switchAccountPartition } from './partition';
import { readPersisted, selectPersistedOwner } from './persist';
import { freezeStateWrites, getState, initialState, replaceState, setState } from './store';

let files: Map<string, string>;

beforeEach(() => {
  files = new Map();
  const fake: SecureStore = {
    kind: 'keystore',
    get: async (key) => files.get(key) ?? null,
    set: async (key, value) => { files.set(key, value); },
    remove: async (key) => { files.delete(key); },
  };
  register(fake);
  selectPersistedOwner(null);
  freezeStateWrites(false);
  replaceState(initialState());
});

describe('dados locais isolados por conta', () => {
  it('preserva dados sem conta e separa A de B ao entrar e sair', async () => {
    setState((s) => ({ ...s, owner: { name: 'Local' } }));
    await switchAccountPartition('user-a');
    expect(getState().owner.name).toBe('');

    setState((s) => ({ ...s, owner: { name: 'Conta A' } }));
    await switchAccountPartition('user-b');
    expect(getState().owner.name).toBe('');
    expect(files.get('oaze.v2.user.user-a')).toContain('Conta A');

    setState((s) => ({ ...s, owner: { name: 'Conta B' } }));
    await switchAccountPartition('user-a');
    expect(getState().owner.name).toBe('Conta A');
    await switchAccountPartition(null);
    expect(getState().owner.name).toBe('Local');
    expect((await readPersisted())?.owner.name).toBe('Local');
    expect(files.get('oaze.v2.user.user-b')).toContain('Conta B');
  });

  it('esconde o estado anterior antes da leitura assíncrona e ignora edição durante a troca', async () => {
    setState((s) => ({ ...s, owner: { name: 'Privado' } }));
    const change = switchAccountPartition('user-a');
    expect(getState().owner.name).toBe('');
    setState((s) => ({ ...s, owner: { name: 'Vazou' } }));
    expect(getState().owner.name).toBe('');
    await change;
    expect(files.get('oaze.v2')).toContain('Privado');
    expect(files.get('oaze.v2.user.user-a')).toBeUndefined();
  });
});
