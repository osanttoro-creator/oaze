import type { ReactNode } from 'react';
import { Badge } from './Feedback';

export interface NavEntry<T extends string> {
  id: T;
  label: string;
  icon: ReactNode;
  /** Rótulo curto para a barra inferior em tela de 320 px. */
  short?: string;
  badge?: number;
}

export interface NavigationBarProps<T extends string> {
  label: string;
  items: readonly NavEntry<T>[];
  current: T;
  onSelect: (id: T) => void;
  /** Ação central destacada — o "+" do lançamento. */
  center?: ReactNode;
  /** `true` acima de 600 px: cabe o rótulo inteiro. */
  roomy?: boolean;
}

/**
 * Barra inferior flutuante — a navegação do celular, onde o polegar alcança.
 *
 * As colunas seguem o TAMANHO DO CONTEÚDO, não frações iguais: com largura
 * forçada, "Lançamentos" não cabe em tela de 320 px, e cortar o rótulo é pior
 * do que uma coluna ligeiramente mais larga que a vizinha.
 */
export function NavigationBar<T extends string>({
  label,
  items,
  current,
  onSelect,
  center,
  roomy,
}: NavigationBarProps<T>) {
  return (
    <nav className="ds-island" aria-label={label} data-roomy={roomy ? 'true' : undefined}>
      {items.map((it, i) => (
        <span key={it.id} className="ds-island-cell">
          {center && i === Math.ceil(items.length / 2) && <span className="ds-island-center">{center}</span>}
          <button
            type="button"
            className="ds-island-item"
            aria-current={current === it.id ? 'page' : undefined}
            onClick={() => onSelect(it.id)}
          >
            <span className="ds-island-icon">
              {it.icon}
              {it.badge ? <Badge count={it.badge} label="pendências" tone="teal" /> : null}
            </span>
            <span className="ds-island-label">{roomy ? it.label : (it.short ?? it.label)}</span>
          </button>
        </span>
      ))}
    </nav>
  );
}

export interface SidebarProps<T extends string> {
  label: string;
  logo?: ReactNode;
  primary?: ReactNode;
  groups: readonly { title?: string; items: readonly NavEntry<T>[] }[];
  current: T;
  onSelect: (id: T) => void;
  foot?: ReactNode;
}

/** Barra lateral — a navegação do desktop. Uma coluna, sempre visível. */
export function Sidebar<T extends string>({
  label,
  logo,
  primary,
  groups,
  current,
  onSelect,
  foot,
}: SidebarProps<T>) {
  return (
    <nav className="ds-sidebar" aria-label={label}>
      {logo}
      {primary}
      {groups.map((g, gi) => (
        <div key={g.title ?? gi} className="ds-side-group">
          {g.title && <div className="ds-eyebrow ds-side-title">{g.title}</div>}
          {g.items.map((it) => (
            <button
              key={it.id}
              type="button"
              className="ds-side-item"
              aria-current={current === it.id ? 'page' : undefined}
              onClick={() => onSelect(it.id)}
            >
              {it.icon}
              <span className="ds-grow">{it.label}</span>
              {it.badge ? <Badge count={it.badge} label="pendências" tone="teal" /> : null}
            </button>
          ))}
        </div>
      ))}
      {foot && <div className="ds-side-foot">{foot}</div>}
    </nav>
  );
}

export interface TabsProps<T extends string> {
  label: string;
  tabs: readonly { id: T; label: string; badge?: number }[];
  current: T;
  onSelect: (id: T) => void;
}

/** Abas com semântica de verdade: setas percorrem, Home e End vão às pontas. */
export function Tabs<T extends string>({ label, tabs, current, onSelect }: TabsProps<T>) {
  const move = (delta: number) => {
    const i = tabs.findIndex((t) => t.id === current);
    const next = tabs[(i + delta + tabs.length) % tabs.length];
    if (next) onSelect(next.id);
  };
  const jump = (at: number) => {
    const target = tabs[at];
    if (target) onSelect(target.id);
  };
  return (
    <div className="ds-tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          id={`tab-${t.id}`}
          aria-selected={current === t.id}
          aria-controls={`panel-${t.id}`}
          tabIndex={current === t.id ? 0 : -1}
          onClick={() => onSelect(t.id)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') move(1);
            else if (e.key === 'ArrowLeft') move(-1);
            else if (e.key === 'Home') jump(0);
            else if (e.key === 'End') jump(tabs.length - 1);
          }}
        >
          {t.label}
          {t.badge ? <Badge count={t.badge} tone="teal" /> : null}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ id, current, children }: { id: string; current: string; children: ReactNode }) {
  if (id !== current) return null;
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} tabIndex={0}>
      {children}
    </div>
  );
}
