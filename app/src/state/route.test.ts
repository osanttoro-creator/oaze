// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
  O botão voltar do Android.

  Cada caso recarrega o módulo porque a trilha é estado de módulo — e é esse
  estado que está sob teste. Compartilhá-la entre casos faria um teste passar
  por causa do anterior.
*/

async function fresh(hash = ''): Promise<typeof import('./route')> {
  vi.resetModules();
  location.hash = hash;
  return import('./route');
}

beforeEach(() => {
  location.hash = '';
});

describe('voltar do aparelho', () => {
  it('sai do app quando já está no início e nada está aberto', async () => {
    const r = await fresh();
    expect(r.backIntent()).toBe('exit');
  });

  it('recua uma tela por vez, na ordem em que a pessoa andou', async () => {
    const r = await fresh();
    r.go('carteira');
    r.go('metas');

    expect(r.backIntent()).toBe('consumed');
    expect(location.hash).toBe('#/carteira');

    expect(r.backIntent()).toBe('consumed');
    expect(location.hash).toBe('#/inicio');

    /* chegou à raiz: a próxima é sair, não ficar presa */
    expect(r.backIntent()).toBe('exit');
  });

  it('ir e vir entre duas telas não faz a trilha crescer sem fim', async () => {
    const r = await fresh();
    for (let i = 0; i < 30; i += 1) {
      r.go('carteira');
      r.go('inicio');
    }
    /* Voltar à tela anterior pela barra encurta a trilha em vez de empilhar
       mais um passo. Se empilhasse, seriam 60 voltas até sair; e quem está no
       início depois de ter voltado para lá não tem para onde recuar. */
    expect(r.backIntent()).toBe('exit');
  });

  it('fecha o lançamento aberto antes de mexer na navegação', async () => {
    const r = await fresh();
    r.go('carteira');
    r.openNovo('despesa');

    expect(r.backIntent()).toBe('consumed');
    expect(location.hash).toBe('#/carteira');
  });

  it('fecha a Coco antes de mexer na navegação', async () => {
    const r = await fresh();
    r.go('metas');
    r.openCoco();

    expect(r.backIntent()).toBe('consumed');
    expect(location.hash).toBe('#/metas');
  });

  it('devolve o cartão à carteira antes de sair da tela', async () => {
    const r = await fresh();
    r.go('carteira', 'cartao-1');

    expect(r.backIntent()).toBe('consumed');
    expect(location.hash).toBe('#/carteira');

    expect(r.backIntent()).toBe('consumed');
    expect(location.hash).toBe('#/inicio');
  });

  it('quem abriu por link numa tela interna volta ao início, e aí sai', async () => {
    const r = await fresh('#/agenda');

    expect(r.backIntent()).toBe('consumed');
    expect(location.hash).toBe('#/inicio');
    /* não pode voltar para a agenda: de lá a pessoa não veio, ela nasceu lá */
    expect(r.backIntent()).toBe('exit');
  });
});
