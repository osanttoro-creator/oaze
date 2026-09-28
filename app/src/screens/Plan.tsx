import { useApp } from '../state/store';
import { go, toast } from '../state/route';
import { useDesktop } from '../state/session';
import { Icon } from '../ui/Icon';
import { ScreenHead } from '../ui/bits';

/* ---------------------------------------------------------------
   O PLANO GRÁTIS APARECE AQUI
   ---------------------------------------------------------------
   Esta tela mostrava só Mensal e Anual, sob o rótulo "um plano, tudo
   incluído". Quem entrasse pelo site — que promete "grátis, para
   sempre, sem cartão" — abria o app e não achava o plano em que
   acabara de entrar. Os limites do grátis são os mesmos anunciados
   lá; se um dia mudarem, mudam nos dois lugares ou o site vira
   propaganda enganosa.

   O que cada plano dá está escrito plano a plano, e não numa lista
   única repetida: uma lista igual nos três esconde exatamente a
   informação que a pessoa veio buscar, que é a diferença. */

const GRATIS = [
  '1 espaço financeiro, 2 contas e 3 cartões',
  'Até 100 movimentações por mês',
  '1 orçamento, 1 meta e 3 recorrências',
  'Histórico dos últimos 3 meses',
  '10 coconutz por mês',
];

const COMPLETO = [
  'Até 5 espaços financeiros e 50 contas',
  'Cartões e movimentações sem limite',
  'Histórico completo e comparação anual',
  'Coco completa: aprende com você, lança e planeja',
  '200 coconutz por mês',
  'Acesso antecipado e atendimento prioritário',
];

interface Plano {
  id: 'gratis' | 'mensal' | 'anual';
  name: string;
  tag: string;
  price: string;
  per: string;
  note: string;
  feats: string[];
  hi: boolean;
}

const PLANS: Plano[] = [
  { id: 'gratis', name: 'Grátis', tag: 'não expira', price: 'R$ 0', per: 'para sempre', note: 'sem cartão de crédito', feats: GRATIS, hi: false },
  { id: 'mensal', name: 'Mensal', tag: 'plano principal', price: 'R$ 29,90', per: 'por mês', note: 'cancele quando quiser', feats: COMPLETO, hi: true },
  { id: 'anual', name: 'Anual', tag: 'economia de R$ 108,90', price: 'R$ 249,90', per: 'por ano', note: 'equivale a R$ 20,83 por mês', feats: COMPLETO, hi: false },
];

export function Plan() {
  const desktop = useDesktop();
  /* plan null é o grátis: quem nunca assinou já está num plano, e não
     fora de todos. */
  const current = useApp((s) => s.plan) ?? 'gratis';
  return (
    <>
      <ScreenHead desktop={desktop} eyebrow="o grátis não expira" title="plano" onBack={() => go('mais')} />
      <div className={desktop ? 'grid-3' : 'stack'}>
        {PLANS.map((p) => {
          const atual = current === p.id;
          return (
            <article
              key={p.id}
              className="plan-card"
              style={{
                background: p.hi ? 'var(--teal)' : 'var(--surface)',
                color: p.hi ? 'var(--night)' : 'var(--text)',
                boxShadow: atual && !p.hi ? '0 0 0 2px var(--teal)' : undefined,
              }}
            >
              <div className="row between">
                <b style={{ fontSize: 20 }}>{p.name}</b>
                <span className="tag" style={{ background: p.hi ? 'rgba(13,24,33,.14)' : 'var(--surface-2)', color: 'inherit' }}>{p.tag}</span>
              </div>
              <div className="hero" style={{ margin: '18px 0 2px' }}>{p.price}</div>
              <div style={{ opacity: 0.8 }}>{p.per} · {p.note}</div>
              <div style={{ margin: '18px 0' }}>
                {p.feats.map((f) => <div key={f} className="feat"><Icon name="check" size={18} />{f}</div>)}
              </div>
              <button
                type="button"
                className="btn btn-block"
                disabled={atual}
                style={{
                  background: p.hi ? 'var(--night)' : atual ? 'var(--surface-2)' : 'var(--milk)',
                  color: p.hi ? 'var(--milk)' : atual ? 'var(--text-2)' : 'var(--night)',
                }}
                onClick={() => toast('A assinatura entra junto com a conta OAZE, na próxima etapa.')}
              >
                {atual ? 'Seu plano atual' : p.id === 'gratis' ? 'Voltar para o grátis' : `Assinar o ${p.name.toLowerCase()}`}
              </button>
            </article>
          );
        })}
      </div>
      <p className="small muted" style={{ textAlign: 'center', marginTop: 16 }}>
        Coconutz são os pedidos que você faz à Coco: um pedido, um coconut. Eles voltam na virada de cada mês.
      </p>
    </>
  );
}
