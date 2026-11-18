import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanRecords } from './record-review.ts';

const row = (changes = {}) => ({ data: '2026-11-17', descricao: 'Mercado', valor: 42.5,
  tipo: 'expense', forma_pagamento: 'card', categoria: 'Alimentação', parcela: null,
  conferir: false, ...changes });

test('dados ambíguos permanecem pendentes e não viram zero', () => {
  const result = cleanRecords({ itens: [row({ data: '2026-02-30', valor: null })], truncado: false });
  assert.equal(result.itens_propostos[0].data, null);
  assert.equal(result.itens_propostos[0].valor, null);
  assert.equal(result.itens_propostos[0].conferir, true);
  assert.equal(result.salvo, false);
});

test('remove linhas de saldo e marca movimentos repetidos', () => {
  const result = cleanRecords({ itens: [row({ descricao: 'Saldo do dia' }), row(), row()], truncado: false });
  assert.equal(result.quantidade, 2);
  assert.equal(result.possiveis_duplicados_no_arquivo, 1);
  assert.equal(result.itens_propostos[1].conferir, true);
});

test('oculta identificador longo e avisa sobre arquivo incompleto', () => {
  const result = cleanRecords({ itens: [row({ descricao: 'Cartão 1234567890123456' })], truncado: true });
  assert.doesNotMatch(result.itens_propostos[0].descricao, /1234567890123456/);
  assert.equal(result.possivelmente_incompleto, true);
});
