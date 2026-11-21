function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function cleanRecords(raw: any) {
  const rows = Array.isArray(raw?.itens) ? raw.itens.slice(0, 50) : [];
  const items = rows.map((row: any) => {
    const data = validDate(row?.data) ? row.data : null;
    const descricao = String(row?.descricao || '').replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\b(?:\d[ -]?){13,19}\b/g, '[número ocultado]')
      .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[documento ocultado]')
      .trim().slice(0, 100);
    const valor = typeof row?.valor === 'number' && Number.isFinite(row.valor) && row.valor > 0 && row.valor < 1e9
      ? Math.round(row.valor * 100) / 100 : null;
    const tipo = ['expense', 'income'].includes(row?.tipo) ? row.tipo : null;
    const forma = ['card', 'account'].includes(row?.forma_pagamento) ? row.forma_pagamento : null;
    const categoria = row?.categoria == null ? null : String(row.categoria).trim().slice(0, 40) || null;
    const parcela = row?.parcela == null ? null : String(row.parcela).trim().slice(0, 20) || null;
    return { data, descricao, valor, tipo, forma_pagamento: forma, categoria, parcela,
      conferir: row?.conferir === true || !data || !valor || !tipo || !forma || !descricao };
  }).filter((x: any) => x.descricao && !/^(saldo(?: do dia)?|total|pagamento da fatura)$/i.test(x.descricao));
  const seen = new Set<string>();
  let possiveisDuplicados = 0;
  for (const item of items) {
    const key = `${item.data}|${item.descricao.toLowerCase()}|${item.valor}`;
    if (seen.has(key)) { item.conferir = true; possiveisDuplicados++; }
    seen.add(key);
  }
  return { itens_propostos: items, quantidade: items.length,
    total_legivel: Math.round(items.reduce((sum: number, item: any) => sum + (item.valor || 0), 0) * 100) / 100,
    conferir: items.filter((item: any) => item.conferir).length, possiveis_duplicados_no_arquivo: possiveisDuplicados,
    possivelmente_incompleto: rows.length === 50 || raw?.truncado === true, salvo: false };
}
