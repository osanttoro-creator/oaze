/* Cálculos informativos. Fontes são consultadas pelo servidor, nunca pelo modelo. */
type Rate = { value: number; date: string; unit: string; source: string };
type Market = Record<string, Rate | null>;

const finite = (value: unknown, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

export async function consultarTaxas(args: any, baseUrl: string, anonKey: string, authorization: string) {
  const allowed = ['cdi', 'selic', 'ipca_12m', 'poupanca', 'dolar'];
  const indices = Array.isArray(args?.indices) ? [...new Set(args.indices)] : [];
  const tickers = Array.isArray(args?.tickers) ? [...new Set(args.tickers)] : [];
  if (indices.length > 5 || indices.some((x) => !allowed.includes(x)) || tickers.length > 10 ||
    tickers.some((x) => typeof x !== 'string' || !/^[A-Z0-9]{4,8}$/.test(x))) {
    return { erro: 'Parâmetros de consulta inválidos.' };
  }
  const request = async (body: unknown) => {
    const response = await fetch(`${baseUrl}/functions/v1/oaze-invest-data`, {
      method: 'POST', signal: AbortSignal.timeout(12000),
      headers: { authorization, apikey: anonKey, 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error('mercado_indisponivel');
    return response.json();
  };
  try {
    const [raw, rawQuotes] = await Promise.all([
      indices.length ? request({ action: 'indices' }) : Promise.resolve(null),
      tickers.length ? request({ action: 'quotes', symbols: tickers }) : Promise.resolve(null)
    ]);
    const fields: Record<string, [string, string]> = {
      cdi: ['cdiAnnual', '% ao ano'], selic: ['selicTarget', '% ao ano'],
      ipca_12m: ['ipca12m', '% em 12 meses'], poupanca: ['poupancaMensal', '% ao mês'],
      dolar: ['usdBrl', 'R$ por US$']
    };
    const rates: Market = {};
    for (const name of indices) {
      const [field, unit] = fields[name];
      const point = raw?.[field];
      rates[name] = finite(point?.value, -100, 100000) && /^\d{4}-\d{2}-\d{2}$/.test(point?.date)
        ? { value: point.value, date: point.date, unit, source: `Banco Central, SGS ${
            { cdi: 4389, selic: 432, ipca_12m: 13522, poupanca: 195, dolar: 1 }[name as keyof typeof fields]}` }
        : null;
    }
    const quotes = tickers.map((ticker) => {
      const q = rawQuotes?.quotes?.find((x: any) => x.symbol === ticker);
      return q && finite(q.price, 0, 1e9) ? {
        ticker, value: q.price, unit: 'BRL', date: q.marketTime,
        source: 'brapi'
      } : { ticker, indisponivel: true };
    });
    return { rates, quotes, fetchedAt: raw?.fetchedAt || rawQuotes?.fetchedAt || null };
  } catch {
    return { erro: 'Taxas e cotações indisponíveis agora. Não estime valores sem fonte.' };
  }
}

const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const irRate = (days: number) => days <= 180 ? 0.225 : days <= 360 ? 0.20 : days <= 720 ? 0.175 : 0.15;

export async function projetarRendimento(args: any, baseUrl: string, anonKey: string, authorization: string) {
  const { produto, indexador, taxa, valor_inicial, aporte_mensal, meses } = args || {};
  if (!['cdb', 'lci_lca', 'tesouro_selic', 'poupanca'].includes(produto) ||
    !['pos_cdi', 'prefixado', 'ipca_mais'].includes(indexador) ||
    !finite(taxa, -20, 300) || !finite(valor_inicial, 0, 1e9) ||
    !finite(aporte_mensal, 0, 1e8) || !Number.isInteger(meses) || meses < 1 || meses > 360 ||
    valor_inicial + aporte_mensal <= 0 ||
    (produto === 'poupanca' && (taxa !== 0 || indexador !== 'pos_cdi')) ||
    (produto === 'tesouro_selic' && (indexador !== 'pos_cdi' || taxa !== 100))) {
    return { erro: 'Parâmetros de projeção inválidos ou taxa contratual ausente.' };
  }
  const needed = produto === 'poupanca' ? 'poupanca' : produto === 'tesouro_selic' ? 'selic'
    : indexador === 'pos_cdi' ? 'cdi' : indexador === 'ipca_mais' ? 'ipca_12m' : null;
  const market: any = needed ? await consultarTaxas({ indices: [needed], tickers: [] }, baseUrl, anonKey, authorization) : null;
  const reference: Rate | null = needed ? market?.rates?.[needed] : null;
  if (needed && !reference) return { erro: 'Taxa de referência indisponível. Projeção não realizada.' };
  let annual: number;
  if (produto === 'poupanca') annual = Math.pow(1 + reference!.value / 100, 12) - 1;
  else if (produto === 'tesouro_selic') annual = reference!.value / 100;
  else if (indexador === 'prefixado') annual = taxa / 100;
  else if (indexador === 'ipca_mais') annual = (1 + reference!.value / 100) * (1 + taxa / 100) - 1;
  else annual = Math.pow(1 + (Math.pow(1 + reference!.value / 100, 1 / 252) - 1) * taxa / 100, 252) - 1;
  if (!Number.isFinite(annual) || annual <= -1 || annual > 4) return { erro: 'Taxa calculada fora do intervalo seguro.' };
  const monthly = Math.pow(1 + annual, 1 / 12) - 1;
  let invested = 0, gross = 0, incomeTax = 0;
  const exempt = produto === 'lci_lca' || produto === 'poupanca';
  // Cada aporte é um lote: inicial no início e mensal no início de cada mês.
  for (let i = -1; i < meses; i++) {
    const principal = i === -1 ? valor_inicial : aporte_mensal;
    if (!principal) continue;
    const heldMonths = i === -1 ? meses : meses - i;
    const days = Math.round(heldMonths * 365 / 12);
    const gain = principal * (Math.pow(1 + monthly, heldMonths) - 1);
    invested += principal;
    gross += gain;
    if (!exempt) incomeTax += Math.max(0, gain) * irRate(days);
  }
  return {
    produto, indexador, taxa_contrato: taxa,
    fonte_taxa: reference ?? { value: taxa, unit: '% ao ano', source: 'Taxa contratual informada pela pessoa', date: null },
    valor_aplicado: round(invested), rendimento_bruto: round(gross),
    ir_estimado: round(incomeTax), iof_estimado: 0,
    valor_bruto: round(invested + gross), valor_liquido_estimado: round(invested + gross - incomeTax),
    premissas: [
      'Taxa de referência mantida constante; projeção, não rendimento garantido.',
      'Aporte mensal no início de cada mês, inclusive o primeiro; IR calculado por lote.',
      'Todos os lotes ficam aplicados por pelo menos 30 dias; IOF não incide neste cenário.',
      ...(produto === 'tesouro_selic' ? ['Não inclui preço de compra, ágio, marcação a mercado nem taxa de custódia.'] : []),
      ...(produto === 'poupanca' ? ['Remuneração aproximada pela taxa mensal; a regra de aniversário da poupança pode mudar o valor real.'] : [])
    ]
  };
}
