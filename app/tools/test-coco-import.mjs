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
assert.equal(ambiguous.checks.failed, 1, 'data posterior exige revisão antes de selecionar');
assert.equal(ambiguous.rows[0].dateConcern, true, 'data posterior ao período exige revisão');
assert.match(ambiguous.warnings.join(' '), /Confirme a data no banco/);

assert.throws(() => parsePdfItems(page([
  'Banco Central do Brasil · Registrato',
  'Relatório de contas e relacionamentos'
])), /Registrato/);

const transfer = parsePdfItems(page([
  '01/10/2026 SALDO DO DIA 100,00',
  '02/10/2026 APLICACAO COFRINHOS -50,00',
  '02/10/2026 SALDO DO DIA 50,00'
]));
assert.equal(transfer.rows[0].investmentTransfer, true, 'aplicação identificada');
assert.equal(transfer.rows[0].cents, -5000, 'aplicação sai da conta');

const retorno = parsePdfItems(page([
  '01/10/2026 SALDO DO DIA 50,00',
  '02/10/2026 RESGATE INVESTIMENTO 55,00',
  '02/10/2026 SALDO DO DIA 105,00'
]));
assert.equal(retorno.rows[0].investmentTransfer, true);
assert.equal(retorno.rows[0].cents, 5500, 'retorno entra na conta');

const cartao = parsePdfItems(page([
  '01/10/2026 SALDO DO DIA 100,00',
  '02/10/2026 PAGAMENTO FATURA CARTAO DE CREDITO -30,00',
  '02/10/2026 SALDO DO DIA 70,00'
]));
assert.equal(cartao.rows[0].creditCard, true, 'cartão de crédito é identificado para exclusão');

const { readFileSync } = await import('node:fs');
const source = readFileSync(new URL('../live-site/assets/app/app.js', import.meta.url), 'utf8');
const begin = source.indexOf('  function importCategorySuggestion');
const end = source.indexOf('  function openCoco()', begin);
assert.ok(begin >= 0 && end > begin, 'revisão do extrato presente');
const categories = [
  {id:'invest',name:'Investimentos',kind:'expense'},
  {id:'rend',name:'Rendimentos',kind:'income'},
  {id:'out-exp',name:'Outros',kind:'expense'},
  {id:'out-inc',name:'Outros',kind:'income'}
];
const review = new Function('state','profile','U','global','Store',
  source.slice(begin,end) + '; return {importCategorySuggestion,importEligible};')(
  {importAccountId:'acc',importEdits:{},importSelection:{},importRemoved:{}},
  () => ({categories,accounts:[],transactions:[]}),
  {norm: (value) => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()},
  {CocoImport:globalThis.CocoImport},{}
);
assert.equal(review.importCategorySuggestion(transfer.rows[0],'acc').id,'invest');
assert.equal(review.importCategorySuggestion(retorno.rows[0],'acc').id,'rend');
assert.equal(review.importEligible(transfer.rows[0],transfer),true);
assert.equal(review.importEligible(cartao.rows[0],cartao),false);

console.log('Leitura PDF: linhas coladas, saldo, datas e Registrato OK');
