import { useApp, useWorkspace } from '../state/store';
import { go } from '../state/route';
import { useDesktop } from '../state/session';
import { dueItems, investedTotal } from '../domain/calc';
import { addDaysISO, todayISO } from '../domain/dates';
import { brl } from '../domain/money';
import { Icon } from '../ui/Icon';
import { ScreenHead } from '../ui/bits';
import { MORE_ITEMS } from '../ui/nav';

export function More() {
  const desktop = useDesktop();
  const w = useWorkspace();
  const plan = useApp((s) => s.plan);
  const used = new Set(w.transactions.map((t) => t.categoryId).filter(Boolean)).size;
  const due = dueItems(w, todayISO(), addDaysISO(todayISO(), 30)).length;
  const sub: Record<string, string> = {
    investimentos: brl(investedTotal(w)),
    categorias: `${used} em uso`,
    metas: `${w.goals.length} ${w.goals.length === 1 ? 'meta ativa' : 'metas ativas'}`,
    agenda: 'calendário e recorrências',
    lembretes: `${due} nos próximos 30 dias`,
    relatorios: 'ano a ano, exportar',
    configuracoes: 'segurança, dados',
    plano: plan ? `OAZE ${plan}` : 'conhecer o plano',
  };
  return (
    <>
      <ScreenHead desktop={desktop} title="mais" />
      <section className="panel">
        {MORE_ITEMS.map(({ id, label, icon }) => (
          <button key={id} type="button" className="list-row" onClick={() => go(id)}>
            <span className="list-icon"><Icon name={icon} /></span>
            <span className="grow">
              <span style={{ fontWeight: 600, display: 'block' }}>{label}</span>
              <span className="small muted">{sub[id]}</span>
            </span>
            <Icon name="chevron-right" size={18} />
          </button>
        ))}
      </section>
    </>
  );
}
