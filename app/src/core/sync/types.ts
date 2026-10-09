import type { ID, Workspace } from '../../domain/types';

/*
  O que a sincronização move.

  A fila NÃO guarda estados do espaço — guarda OPERAÇÕES por entidade. É essa
  escolha que faz dois aparelhos editarem o mesmo mês sem perder trabalho:
  revisão otimista sozinha é "o último que grava ganha", e o último apaga o
  primeiro inteiro. Com operações, o cliente reaplica o que fez sobre a versão
  nova do servidor e só há conflito de verdade quando a MESMA entidade foi
  mexida nos dois lados.
*/

/** Coleções do espaço com entidades identificadas por `id`. */
export type CollName =
  | 'accounts'
  | 'cards'
  | 'categories'
  | 'transactions'
  | 'investments'
  | 'goals'
  | 'categoryRules'
  | 'cocoMemory';

/** Mapas chave → valor dentro do espaço. */
export type MapName = 'invoices' | 'budgets' | 'recurrenceDecisions';

export interface Stamp {
  /** ISO do aparelho que originou. Relógio lógico junto com `device`. */
  at: string;
  /** Desempate quando dois aparelhos marcam o mesmo instante. */
  device: string;
}

export type Op = Stamp & { opId: string; space: ID } & (
    | { kind: 'put'; coll: CollName; entity: { id: ID } & Record<string, unknown> }
    | { kind: 'del'; coll: CollName; id: ID }
    | { kind: 'map'; map: MapName; key: string; value: unknown | null }
    | { kind: 'rename'; name: string }
    | { kind: 'space'; entity: Workspace }
  );

/**
 * O que vai e volta do servidor. `tomb` existe porque exclusão precisa deixar
 * marca: sem ela, um aparelho offline que ainda tem o lançamento o ressuscita na
 * próxima subida.
 */
export interface Envelope {
  format: 2;
  space: Workspace;
  /** `coll:id` → ISO da exclusão. Esquecido depois de 90 dias. */
  tomb: Record<string, string>;
  /**
   * Carimbo da última escrita aceita, por entidade. É o que faz "vence o mais
   * novo" valer entre rodadas de sincronização, e não só dentro de um lote: sem
   * ele, uma operação velha presa na fila sobrescreveria em silêncio a versão que
   * o outro aparelho gravou depois.
   */
  stamps: Record<string, Stamp>;
}

export interface RemoteSpace {
  id: ID;
  rev: number;
  envelope: Envelope;
  updatedAt: string;
}

export type SyncPhase = 'idle' | 'syncing' | 'offline' | 'error' | 'conflict-resolved';

export interface SyncStatus {
  phase: SyncPhase;
  /** Operações esperando subir. */
  pending: number;
  lastSyncAt: string | null;
  /** Mensagem para a tela quando algo foi descartado numa fusão. */
  notice: string | null;
  error: string | null;
}
