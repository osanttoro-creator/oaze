import { useApp } from '../state/store';
import { go, toast } from '../state/route';
import { useDesktop } from '../state/session';
import { Icon } from '../ui/Icon';
import { ScreenHead } from '../ui/bits';

// Valores do mockup; o cofre ainda marca preços como pendentes de confirmação.
const FEATS = [
  'Até 5 espaços financeiros e 50 contas',
  'Cartões e movimentações sem limite',
  'Histórico completo e comparação anual',
  'Coco completa: aprende com você, lança e planeja',
  '200 pedidos à Coco por mês',
  'Acesso antecipado e atendimento prioritário',
];

const PLANS = [
  { id: 'mensal' as const, name: 'Mensal', tag: 'plano principal', price: 'R$ 29,90', per: 'por mês', note: 'cobrança mensal, cancele quando quiser', hi: true },
  { id: 'anual' as const, name: 'Anual', tag: 'economia de R$ 108,90', price: 'R$ 249,90', per: 'por ano', note: 'equivale a R$ 20,83 por mês', hi: false },
];

export function Plan() {
  const desktop = useDesktop();
  const current = useApp((s) => s.plan);
  return (
    <>
      <ScreenHead desktop={desktop} eyebrow="um plano, tudo incluído" title="plano" onBack={() => go('mais')} />
      <div className={desktop ? 'grid-2' : 'stack'}>
        {PLANS.map((p) => (
          <article key={p.id} className="plan-card" style={{ background: p.hi ? 'var(--teal)' : 'var(--surface)', color: p.hi ? 'var(--night)' : 'var(--text)', boxShadow: current === p.id && !p.hi ? '0 0 0 2px var(--teal)' : undefined }}>
            <div className="row between">
              <b style={{ fontSize: 20 }}>{p.name}</b>
              <span className="tag" style={{ background: p.hi ? 'rgba(13,24,33,.14)' : 'var(--surface-2)', color: 'inherit' }}>{p.tag}</span>
            </div>
            <div className="hero" style={{ margin: '18px 0 2px' }}>{p.price}</div>
            <div style={{ opacity: 0.8 }}>{p.per} · {p.note}</div>
            <div style={{ margin: '18px 0' }}>
              {FEATS.map((f) => <div key={f} className="feat"><Icon name="check" size={18} />{f}</div>)}
            </div>
            <button type="button" className="btn btn-block" style={{ background: p.hi ? 'var(--night)' : current === p.id ? 'var(--surface-2)' : 'var(--milk)', color: p.hi ? 'var(--milk)' : current === p.id ? 'var(--text-2)' : 'var(--night)' }} onClick={() => toast('A assinatura entra junto com a conta OAZE, na próxima etapa.')}>
              {current === p.id ? 'Seu plano atual' : `Assinar o ${p.name.toLowerCase()}`}
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
