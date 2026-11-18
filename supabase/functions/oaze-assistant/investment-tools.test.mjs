import test from 'node:test';
import assert from 'node:assert/strict';
import { consultarTaxas, projetarRendimento } from './investment-tools.ts';

const originalFetch = globalThis.fetch;
const market = {
  cdiAnnual: { date: '2026-11-16', value: 13.65 },
  selicTarget: { date: '2026-11-16', value: 13.75 },
  ipca12m: { date: '2026-10-01', value: 4.63 },
  poupancaMensal: { date: '2026-11-01', value: 0.67 },
  usdBrl: { date: '2026-11-16', value: 5.1 }
};
globalThis.fetch = async (_url, options) => {
  const body = JSON.parse(options.body);
  return new Response(JSON.stringify(body.action === 'indices' ? market : { quotes: [] }), { status: 200 });
};

const params = ['https://example.supabase.co', 'anon', 'Bearer session'];
test('consulta usa data, unidade e fonte de cada série', async () => {
  const result = await consultarTaxas({ indices: ['cdi', 'ipca_12m', 'poupanca'], tickers: [] }, ...params);
  assert.equal(result.rates.cdi.value, 13.65);
  assert.equal(result.rates.cdi.date, '2026-11-16');
  assert.equal(result.rates.ipca_12m.source, 'Banco Central, SGS 13522');
  assert.equal(result.rates.poupanca.unit, '% ao mês');
});

test('aportes mensais entram no capital e IR incide só no ganho', async () => {
  const result = await projetarRendimento({ produto: 'cdb', indexador: 'pos_cdi', taxa: 100,
    valor_inicial: 1000, aporte_mensal: 100, meses: 12 }, ...params);
  assert.equal(result.valor_aplicado, 2200);
  assert.ok(result.rendimento_bruto > 0);
  assert.ok(result.ir_estimado > 0 && result.ir_estimado < result.rendimento_bruto);
  assert.equal(result.valor_liquido_estimado, result.valor_bruto - result.ir_estimado);
});

test('poupança fica sem IR na estimativa de pessoa física', async () => {
  const result = await projetarRendimento({ produto: 'poupanca', indexador: 'pos_cdi', taxa: 0,
    valor_inicial: 1000, aporte_mensal: 0, meses: 12 }, ...params);
  assert.equal(result.ir_estimado, 0);
  assert.equal(result.iof_estimado, 0);
});

test('sem taxa publicada não inventa projeção', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ cdiAnnual: null }), { status: 200 });
  try {
    const result = await projetarRendimento({ produto: 'cdb', indexador: 'pos_cdi', taxa: 110,
      valor_inicial: 1000, aporte_mensal: 0, meses: 12 }, ...params);
    assert.match(result.erro, /indisponível/);
  } finally { globalThis.fetch = originalFetch; }
});
