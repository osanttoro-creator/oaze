import assert from 'node:assert/strict';
import '../live-site/assets/app/coco-import.js';

const { parsePdfItems } = globalThis.CocoImport;
const page = (lines) => [lines.map((str, index) => ({
  str, transform: [1, 0, 0, 1, 40, 1000 - index * 10]
}))];

const normal = parsePdfItems(page([
  'período de visualização: 01/10/2026 até 02/10/2026',
  '01/10/2026 SALDO DO DIA 100,00',
  '02/10/2026 COMPRA MERCADO -20,0002/10/2026 PIX RECEBIDO 5,00',
  '02/10/2026 SALDO DO DIA 85,00'
]));
assert.equal(normal.rows.length, 2, 'duas linhas coladas precisam virar dois movimentos');
assert.equal(normal.rows[0].cents, -2000);
assert.equal(normal.rows[1].cents, 500);
assert.deepEqual(normal.checks, { passed: 1, failed: 0 });

const ambiguous = parsePdfItems(page([
  'período de visualização: 01/10/2026 até 02/10/2026',
  '01/10/2026 SALDO DO DIA 100,00',
  '03/10/2026 PIX RECEBIDO 10,00',
  '02/10/2026 SALDO DO DIA 110,00'
]));
assert.equal(ambiguous.checks.failed, 1, 'saldo inconsistente bloqueia importação em lote');
assert.equal(ambiguous.rows[0].dateConcern, true, 'data posterior ao período exige revisão');
assert.match(ambiguous.warnings.join(' '), /Confirme a data no banco/);

assert.throws(() => parsePdfItems(page([
  'Banco Central do Brasil · Registrato',
  'Relatório de contas e relacionamentos'
])), /Registrato/);

console.log('Leitura PDF: linhas coladas, saldo, datas e Registrato OK');
