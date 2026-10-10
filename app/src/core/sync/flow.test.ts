import { describe, expect, it } from 'vitest';
import type { ID, Transaction, Workspace } from '../../domain/types';
import { monthTotals } from '../../domain/calc';
import { applyOps, prune, wrap } from './merge';
import type { Envelope, Op, Stamp } from './types';

/*
  O fluxo principal do briefing, de ponta a ponta:

      entrar → início → navegar → salvar → sincronizar → abrir em outro aparelho

  O "servidor" aqui é uma implementação em memória da RPC `oaze2_save_space`,
  escrita para se comportar **exatamente** como o SQL de
  `20261010010249_oaze2_multiplatform_sync.sql`: compara a revisão, incrementa quando
  bate e devolve a versão do servidor quando não bate.

  Testar contra um dublê e não contra o Supabase é escolha, não atalho: o que
  precisa estar certo é o PROTOCOLO — quem ganha, o que se funde, o que é
  relatado. Se o dublê divergir do SQL, o teste mente; por isso ele é curto o
  bastante para ser conferido linha a linha contra a migração.
*/

interface Row {
  rev: number;
  payload: Envelope;
}

class FakeServer {
  private rows = new Map<ID, Row>();

  /** Espelho de `public.oaze2_save_space(p_id, p_expected_rev, p_payload)`. */
  save(id: ID, expectedRev: number, payload: Envelope): { ok: boolean; rev: number; payload: Envelope | null } {
    const row = this.rows.get(id);
    if (!row) {
      if (expectedRev !== 0) return { ok: false, rev: 0, payload: null };
      this.rows.set(id, { rev: 1, payload: structuredClone(payload) });
      return { ok: true, rev: 1, payload };
    }
    if (row.rev !== expectedRev) return { ok: false, rev: row.rev, payload: structuredClone(row.payload) };
    row.rev += 1;
    row.payload = structuredClone(payload);
    return { ok: true, rev: row.rev, payload };
  }

  /** Espelho do `select` de `pull()`. */
  read(id: ID): Row | null {
    const row = this.rows.get(id);
    return row ? structuredClone(row) : null;
  }
}

/**
 * Um aparelho: tem o espaço em mãos, uma fila de operações e a revisão que
 * acredita ser a do servidor. É o mesmo ciclo de `engine.push()`, escrito aqui
 * em pequeno para o teste poder parar no meio.
 */
class Device {
  space: Workspace;
  private queue: Op[] = [];
  private rev = 0;
  private seq = 0;
  readonly avisos: string[] = [];

  constructor(
    readonly name: string,
    private readonly server: FakeServer,
    space: Workspace,
    private clock: { now: string },
  ) {
    this.space = structuredClone(space);
  }

  private stamp(): Stamp {
    return { at: this.clock.now, device: this.name };
  }

  /** Grava local e enfileira — exatamente o que a interface faz. */
  lancar(tx: Transaction): void {
    const at = this.space.transactions.findIndex((t) => t.id === tx.id);
    if (at >= 0) this.space.transactions[at] = tx;
    else this.space.transactions.push(tx);
    this.queue.push({
      ...this.stamp(),
      opId: `${this.name}-${this.seq++}`,
      space: this.space.id,
      kind: 'put',
      coll: 'transactions',
      entity: tx as never,
    });
  }

  apagar(id: ID): void {
    this.space.transactions = this.space.transactions.filter((t) => t.id !== id);
    this.queue.push({
      ...this.stamp(),
      opId: `${this.name}-${this.seq++}`,
      space: this.space.id,
      kind: 'del',
      coll: 'transactions',
      id,
    });
  }

  get pendentes(): number {
    return this.queue.length;
  }

  /** Sobe o que está pendente; reaplica sobre a versão do servidor se preciso. */
  sincronizar(): void {
    if (!this.queue.length) {
      this.baixar();
      return;
    }
    let base: Envelope = this.rev ? (this.server.read(this.space.id)?.payload ?? wrap(this.space)) : wrap(this.space);
    let rev = this.rev;

    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const { envelope, dropped } = applyOps(base, this.queue);
      const reply = this.server.save(this.space.id, rev, prune(envelope));
      if (reply.ok) {
        this.rev = reply.rev;
        this.queue = [];
        this.space = structuredClone(envelope.space);
        for (const d of dropped) this.avisos.push(d.why);
        return;
      }
      base = reply.payload ?? wrap(this.space);
      rev = reply.payload ? reply.rev : 0;
    }
    throw new Error('não convergiu em três tentativas');
  }

  /** Abrir o app noutro aparelho: baixa e adota. */
  baixar(): void {
    const row = this.server.read(this.space.id);
    if (!row) return;
    this.rev = row.rev;
    this.space = structuredClone(row.payload.space);
  }
}

function espacoVazio(): Workspace {
  return {
    id: 'ws1',
    name: 'Pessoal',
    accounts: [],
    cards: [],
    categories: [{ id: 'cat-mercado', name: 'Alimentação', kind: 'expense', icon: 'utensils' }],
    transactions: [],
    invoices: {},
    investments: [],
    goals: [],
    budgets: {},
    automation: { categoryRules: [], recurrenceDecisions: {} },
    coco: { memory: [] },
  };
}

function despesa(id: string, description: string, amount: number, date = '2026-10-06'): Transaction {
  return {
    id,
    kind: 'expense',
    description,
    amount,
    date,
    method: 'pix',
    categoryId: 'cat-mercado',
    confirmed: true,
    origin: 'manual',
    createdAt: `${date}T10:00:00.000Z`,
  };
}

describe('fluxo principal: salvar aqui, abrir lá', () => {
  it('um lançamento no celular aparece no computador', () => {
    const server = new FakeServer();
    const clock = { now: '2026-10-06T12:00:00.000Z' };
    const celular = new Device('celular', server, espacoVazio(), clock);
    const computador = new Device('computador', server, espacoVazio(), clock);

    celular.lancar(despesa('t1', 'Mercado', 12500));
    expect(celular.pendentes).toBe(1);
    celular.sincronizar();
    expect(celular.pendentes).toBe(0);

    /* o computador abre o app pela primeira vez nesta conta */
    computador.baixar();
    expect(computador.space.transactions).toHaveLength(1);
    expect(computador.space.transactions[0]?.description).toBe('Mercado');
  });

  it('o total do mês bate nos dois aparelhos — é o número que a pessoa olha', () => {
    const server = new FakeServer();
    const clock = { now: '2026-10-06T12:00:00.000Z' };
    const celular = new Device('celular', server, espacoVazio(), clock);
    const computador = new Device('computador', server, espacoVazio(), clock);

    celular.lancar(despesa('t1', 'Mercado', 12500));
    celular.lancar(despesa('t2', 'Farmácia', 4300));
    celular.sincronizar();
    computador.baixar();

    const aqui = monthTotals(celular.space, '2026-10');
    const la = monthTotals(computador.space, '2026-10');
    expect(la.expense).toBe(16800);
    expect(la.expense).toBe(aqui.expense);
  });
});

describe('os dois offline, editando o mesmo mês', () => {
  it('nada se perde quando cada um lança uma coisa diferente', () => {
    const server = new FakeServer();
    const clock = { now: '2026-10-06T12:00:00.000Z' };
    const celular = new Device('celular', server, espacoVazio(), clock);
    const computador = new Device('computador', server, espacoVazio(), clock);

    /* os dois trabalham sem rede */
    celular.lancar(despesa('t1', 'Mercado', 12500));
    computador.lancar(despesa('t2', 'Farmácia', 4300));

    /* a rede volta; o celular sobe primeiro */
    celular.sincronizar();
    computador.sincronizar();

    expect(computador.space.transactions.map((t) => t.id).sort()).toEqual(['t1', 't2']);
    celular.baixar();
    expect(celular.space.transactions).toHaveLength(2);
    expect(monthTotals(celular.space, '2026-10').expense).toBe(16800);
  });

  it('editando o MESMO lançamento, vence o mais novo e o outro é avisado', () => {
    const server = new FakeServer();
    const clock = { now: '2026-10-06T12:00:00.000Z' };
    const celular = new Device('celular', server, espacoVazio(), clock);
    celular.lancar(despesa('t1', 'Mercado', 12500));
    celular.sincronizar();

    const computador = new Device('computador', server, espacoVazio(), clock);
    computador.baixar();

    /* o computador corrige às 12h05 e sobe */
    clock.now = '2026-10-06T12:05:00.000Z';
    computador.lancar(despesa('t1', 'Mercado do mês', 22000));
    computador.sincronizar();

    /* o celular tinha uma correção mais velha, de 12h02, presa na fila */
    clock.now = '2026-10-06T12:02:00.000Z';
    celular.lancar(despesa('t1', 'Mercado', 13000));
    celular.sincronizar();

    expect(celular.space.transactions[0]?.amount).toBe(22000);
    expect(celular.avisos.join(' ')).toMatch(/gravou depois/);
  });

  it('o que um apagou não volta pelo outro', () => {
    const server = new FakeServer();
    const clock = { now: '2026-10-06T12:00:00.000Z' };
    const celular = new Device('celular', server, espacoVazio(), clock);
    celular.lancar(despesa('t1', 'Mercado', 12500));
    celular.sincronizar();

    const computador = new Device('computador', server, espacoVazio(), clock);
    computador.baixar();

    clock.now = '2026-10-06T12:10:00.000Z';
    computador.apagar('t1');
    computador.sincronizar();

    /* o celular ainda tinha o item e tenta reconfirmá-lo, mas com carimbo velho */
    clock.now = '2026-10-06T12:03:00.000Z';
    celular.lancar(despesa('t1', 'Mercado', 12500));
    celular.sincronizar();

    expect(celular.space.transactions).toHaveLength(0);
    expect(celular.avisos.join(' ')).toMatch(/apagado em outro aparelho/);
  });

  it('três rodadas seguidas convergem para o mesmo estado nos dois lados', () => {
    const server = new FakeServer();
    const clock = { now: '2026-10-06T12:00:00.000Z' };
    const a = new Device('a-celular', server, espacoVazio(), clock);
    const b = new Device('b-computador', server, espacoVazio(), clock);

    for (let i = 0; i < 3; i++) {
      clock.now = `2026-10-06T12:0${i}:00.000Z`;
      a.lancar(despesa(`a${i}`, `A ${i}`, 1000 + i));
      b.lancar(despesa(`b${i}`, `B ${i}`, 2000 + i));
      a.sincronizar();
      b.sincronizar();
      a.baixar();
    }

    expect(a.space.transactions).toHaveLength(6);
    expect(a.space.transactions.map((t) => t.id).sort()).toEqual(b.space.transactions.map((t) => t.id).sort());
  });
});

describe('contrato com o SQL', () => {
  it('revisão que não bate não sobrescreve — devolve a versão do servidor', () => {
    const server = new FakeServer();
    const env = wrap(espacoVazio());
    expect(server.save('ws1', 0, env).ok).toBe(true);
    const segunda = server.save('ws1', 0, env);
    expect(segunda.ok).toBe(false);
    expect(segunda.rev).toBe(1);
    expect(segunda.payload).not.toBeNull();
  });

  it('revisão não-zero para espaço inexistente devolve payload nulo', () => {
    const reply = new FakeServer().save('ws-fantasma', 7, wrap(espacoVazio()));
    expect(reply).toEqual({ ok: false, rev: 0, payload: null });
  });
});
