import { describe, expect, it } from 'vitest';
import { scrub } from './index';

/*
  A regra do relatório de erro é uma só: nada financeiro sai do aparelho. Estes
  testes são o guarda dela — a mensagem de erro é o lugar mais fácil do mundo para
  vazar um saldo sem perceber.
*/

describe('limpeza do relatório de erro', () => {
  it('apaga e-mail', () => {
    expect(scrub('falhou para ana.souza+oaze@gmail.com')).toBe('falhou para «e-mail»');
  });

  it('apaga CPF, com e sem pontuação', () => {
    expect(scrub('cpf 123.456.789-09 inválido')).toBe('cpf «documento» inválido');
    expect(scrub('cpf 12345678909 inválido')).toBe('cpf «documento» inválido');
  });

  it('apaga valor em reais', () => {
    expect(scrub('saldo R$ 12.430,55 negativo')).toBe('saldo «valor» negativo');
  });

  it('apaga sequência longa de dígitos, como número de cartão', () => {
    expect(scrub('cartao 4111111111111111 recusado')).toBe('cartao «número» recusado');
  });

  it('não mexe no que é técnico', () => {
    expect(scrub('TypeError: cannot read property of undefined at calc.ts:42')).toContain('calc.ts:42');
  });

  it('corta mensagem muito longa, para o relatório não virar o vazamento', () => {
    expect(scrub('x'.repeat(5000)).length).toBe(600);
  });
});
