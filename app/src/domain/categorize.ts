/* Categorização determinística e explicável: regra sua > histórico > palavra conhecida > não chutar. */
import type { ID, Kind, Workspace } from './types';
import { normalizeMerchant, stripAccents } from './merchant';

export const LIMITS = { minHistory: 3, high: 0.8, medium: 0.65 };

const CURATED: { re: RegExp; names: string[] }[] = [
  { re: /\b(supermercado|mercado|hortifruti|padaria|restaurante|ifood|lanche|feira|acougue)\b/, names: ['Alimentação'] },
  { re: /\b(uber|99|taxi|combustivel|gasolina|posto|metro|onibus|estacionamento)\b/, names: ['Transporte'] },
  { re: /\b(netflix|spotify|streaming|assinatura|internet|academia)\b/, names: ['Assinaturas'] },
  { re: /\b(aluguel|condominio|energia|luz|agua|gas|iptu)\b/, names: ['Moradia'] },
  { re: /\b(farmacia|drogaria|hospital|clinica|medico|dentista|exame)\b/, names: ['Saúde'] },
  { re: /\b(cinema|show|teatro|bar|viagem|passagem)\b/, names: ['Lazer'] },
  { re: /\b(salario|pro labore|folha)\b/, names: ['Salário'] },
  { re: /\b(freela|rendimento|dividendo|juros)\b/, names: ['Rendimentos'] },
];

export type Confidence = 'high' | 'medium' | 'low';

export interface Suggestion {
  categoryId: ID | null;
  confidence: Confidence;
  source: 'rule' | 'history' | 'curated' | 'none';
  merchantKey: string | null;
  evidence: string;
}

const norm = (s: string) => stripAccents(s).toLowerCase().trim();

export function suggestCategory(w: Workspace, description: string, kind: Kind, excludeId?: ID): Suggestion {
  const m = normalizeMerchant(description);
  if (!m.useful || kind === 'transfer') return { categoryId: null, confidence: 'low', source: 'none', merchantKey: null, evidence: 'Descrição sem nome útil.' };

  const rule = w.automation.categoryRules.find((r) => r.kind === kind && r.merchantKey === m.key);
  if (rule) return { categoryId: rule.categoryId, confidence: 'high', source: 'rule', merchantKey: m.key, evidence: 'Regra confirmada por você para este estabelecimento.' };

  const history = w.transactions.filter((t) => t.id !== excludeId && t.kind === kind && t.categoryId && !t.installment && normalizeMerchant(t.description).key === m.key);
  if (history.length) {
    const count = new Map<ID, number>();
    for (const t of history) count.set(t.categoryId as ID, (count.get(t.categoryId as ID) ?? 0) + 1);
    const [best, n] = [...count.entries()].sort((a, b) => b[1] - a[1])[0] as [ID, number];
    const rate = n / history.length;
    if (history.length >= LIMITS.minHistory && rate >= LIMITS.high) return { categoryId: best, confidence: 'high', source: 'history', merchantKey: m.key, evidence: `Mesmo estabelecimento em ${history.length} lançamentos; ${n} usaram esta categoria.` };
    if (history.length >= 2 && rate >= LIMITS.medium) return { categoryId: best, confidence: 'medium', source: 'history', merchantKey: m.key, evidence: `${n} de ${history.length} lançamentos parecidos usaram esta categoria.` };
  }

  const curated = CURATED.find((r) => r.re.test(m.normalized));
  const cat = curated && w.categories.find((c) => c.kind === kind && curated.names.map(norm).includes(norm(c.name)));
  if (cat) return { categoryId: cat.id, confidence: 'medium', source: 'curated', merchantKey: m.key, evidence: 'Palavra conhecida na descrição.' };
  return { categoryId: null, confidence: 'low', source: 'none', merchantKey: m.key, evidence: 'Ainda não há histórico consistente.' };
}
