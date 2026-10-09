// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { activeCount, subscribe } from './scheduler';

/*
  O custo de energia do campo de partículas.

  FPS num aparelho de verdade não dá para medir daqui — e o briefing pede 60 fps
  no celular, o que fica como meta aberta em `docs/11-ARQUITETURA.md` (D8). O que
  dá para garantir, e é o que realmente derruba bateria, está aqui: **um laço
  só** para todos os campos, e **nenhum laço** quando não há campo ou quando a
  aba está escondida.
*/

let rafs = 0;
let pendentes = new Map<number, FrameRequestCallback>();
let proximo = 1;
let visibilidade: DocumentVisibilityState = 'visible';

function avancar(ms = 16): void {
  const fila = [...pendentes.entries()];
  pendentes = new Map();
  for (const [, cb] of fila) cb(performance.now() + ms);
}

beforeEach(() => {
  rafs = 0;
  proximo = 1;
  pendentes = new Map();
  visibilidade = 'visible';
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafs++;
    const id = proximo++;
    pendentes.set(id, cb);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    pendentes.delete(id);
  });
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibilidade,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('um laço para todos', () => {
  it('três campos na tela custam um requestAnimationFrame por quadro, não três', () => {
    const a = vi.fn();
    const b = vi.fn();
    const c = vi.fn();
    const saidas = [subscribe(a), subscribe(b), subscribe(c)];

    expect(activeCount()).toBe(3);
    /* a inscrição agenda o primeiro quadro uma vez só */
    expect(rafs).toBe(1);

    avancar();
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
    expect(c).toHaveBeenCalledOnce();
    /* um quadro gasto, um próximo agendado: ainda um por quadro */
    expect(rafs).toBe(2);

    saidas.forEach((sair) => sair());
  });

  it('todos recebem o mesmo tempo e o mesmo passo — campos não dessincronizam', () => {
    const vistos: [number, number][] = [];
    const sairA = subscribe((t, dt) => vistos.push([t, dt]));
    const sairB = subscribe((t, dt) => vistos.push([t, dt]));
    avancar();
    expect(vistos).toHaveLength(2);
    expect(vistos[0]).toEqual(vistos[1]);
    sairA();
    sairB();
  });
});

describe('nada roda à toa', () => {
  it('sem inscrito, o laço para', () => {
    const sair = subscribe(() => {});
    avancar();
    const antes = rafs;
    sair();
    expect(activeCount()).toBe(0);
    avancar();
    /* nenhum quadro novo foi agendado depois da saída */
    expect(rafs).toBe(antes);
  });

  it('o último a sair desliga, mesmo com vários campos', () => {
    const saidas = [subscribe(() => {}), subscribe(() => {}), subscribe(() => {})];
    avancar();
    saidas[0]!();
    saidas[1]!();
    expect(activeCount()).toBe(1);
    const antes = rafs;
    avancar();
    expect(rafs).toBeGreaterThan(antes);

    saidas[2]!();
    const depois = rafs;
    avancar();
    expect(rafs).toBe(depois);
  });

  it('aba escondida não agenda quadro', () => {
    visibilidade = 'hidden';
    const sair = subscribe(() => {});
    /* inscrever com a aba escondida não acorda o compositor */
    expect(rafs).toBe(0);
    sair();
  });

  it('voltar para a aba retoma a animação', () => {
    visibilidade = 'hidden';
    const tick = vi.fn();
    const sair = subscribe(tick);
    expect(rafs).toBe(0);

    visibilidade = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(rafs).toBe(1);
    avancar();
    expect(tick).toHaveBeenCalled();
    sair();
  });

  it('sair da aba interrompe o laço em andamento', () => {
    const sair = subscribe(() => {});
    avancar();
    visibilidade = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    const antes = rafs;
    avancar();
    expect(rafs).toBe(antes);
    sair();
  });
});

describe('estabilidade do passo', () => {
  it('o passo tem teto: voltar do segundo plano não dá um salto na simulação', () => {
    const passos: number[] = [];
    const sair = subscribe((_t, dt) => passos.push(dt));
    avancar();
    /* um quadro de um minuto inteiro: o teto é 1/30 s */
    avancar(60_000);
    expect(Math.max(...passos)).toBeLessThanOrEqual(1 / 30 + 1e-9);
    sair();
  });
});
