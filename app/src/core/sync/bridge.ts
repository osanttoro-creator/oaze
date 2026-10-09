import type { Workspace } from '../../domain/types';
import { getState, setState, subscribeChanges } from '../../state/store';
import { authState } from '../auth';
import { uid } from '../../domain/ids';
import { diffWorkspace } from './diff';
import { stamp } from './engine';
import { enqueue } from './queue';
import type { Envelope } from './types';

/*
  A ponte entre a loja de estado e o motor de sincronização.

  Ela existe para o motor não importar `state/` e o `state/` não importar o motor
  — a regra de dependência de `docs/11-ARQUITETURA.md` só sobrevive se alguém
  fizer a costura, e esse alguém é este arquivo.
*/

export function localSpaces(): Workspace[] {
  return getState().workspaces;
}

/** Registra só o que mudou localmente enquanto a pessoa está autenticada. */
export function startCapture(): () => void {
  return subscribeChanges((before, after) => {
    if (authState().status !== 'signed-in') return;
    const old = new Map(before.workspaces.map((space) => [space.id, space]));
    for (const space of after.workspaces) {
      if (space.demo) continue;
      const previous = old.get(space.id) ?? null;
      if (previous === space) continue;
      enqueue(...diffWorkspace(previous, space, stamp(), () => uid('op')));
    }
  });
}

/**
 * Troca um espaço local pela versão que o servidor passou a ter.
 *
 * Quando o espaço ainda não existe aqui, ele é ADICIONADO: é o caso de abrir a
 * conta num aparelho novo. E se não havia espaço ativo, o que chegou passa a
 * ser o ativo — sem isso, o aparelho novo mostraria tela vazia com os dados já
 * baixados, que é o P4 do `o-que-falta.md` do OAZE 1 acontecendo de novo.
 */
export function adoptEnvelope(envelope: Envelope): void {
  const incoming = envelope.space;
  setState((s) => {
    const at = s.workspaces.findIndex((w) => w.id === incoming.id);
    const workspaces =
      at >= 0
        ? s.workspaces.map((w, i) => (i === at ? incoming : w))
        : [...s.workspaces, incoming];
    const activeStillThere = workspaces.some((w) => w.id === s.activeId);
    return { ...s, workspaces, activeId: activeStillThere ? s.activeId : incoming.id };
  }, 'remote');
}
