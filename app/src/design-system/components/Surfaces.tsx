import type { HTMLAttributes, ReactNode } from 'react';

/*
  Três níveis de material, três funções. A regra que sustenta a hierarquia:
  onde há número, o material é quase sólido. O vidro de verdade fica só na
  camada que flutua — navegação e ações. Valor financeiro ilegível não tem
  estética que compense.
*/
export type Material = 'content' | 'support' | 'control';

/*
  `title` aqui é o cabeçalho do cartão, que aceita nó — não o atributo HTML, que
  só aceita texto e vira tooltip. Dois significados no mesmo nome é o tipo de
  ambiguidade que termina em bug de acessibilidade, então o atributo sai.
*/
export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  material?: Material;
  /** Cabeçalho com título e ação à direita. */
  title?: ReactNode;
  action?: ReactNode;
  padded?: boolean;
}

export function Card({ material = 'content', title, action, padded = true, children, className, ...rest }: CardProps) {
  const cls = ['ds-card', `ds-mat-${material}`, !padded && 'ds-card-flush', className].filter(Boolean).join(' ');
  return (
    <section className={cls} {...rest}>
      {(title || action) && (
        <header className="ds-card-head">
          {typeof title === 'string' ? <h2 className="ds-h2">{title}</h2> : title}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export interface KpiProps {
  label: string;
  value: ReactNode;
  /** Variação: vem com seta e sinal, nunca só cor. */
  delta?: { value: ReactNode; direction: 'up' | 'down' | 'flat' } | null;
  foot?: ReactNode;
}

const ARROW = { up: '▲', down: '▼', flat: '→' } as const;

export function Kpi({ label, value, delta, foot }: KpiProps) {
  return (
    <div className="ds-kpi">
      <span className="ds-eyebrow">{label}</span>
      <strong className="ds-kpi-value ds-mono">{value}</strong>
      {delta && (
        <span className={`ds-kpi-delta ds-dir-${delta.direction}`}>
          <span aria-hidden="true">{ARROW[delta.direction]}</span> {delta.value}
        </span>
      )}
      {foot && <small className="ds-muted">{foot}</small>}
    </div>
  );
}

export interface SkeletonProps {
  /** Linhas de texto, ou um bloco. */
  lines?: number;
  height?: number;
  radius?: string;
}

/**
 * Esqueleto de carregamento. Não é "a inteligência pensando" — é conteúdo que
 * ainda não chegou. Os dois estados são diferentes e a interface não deve
 * confundi-los: para trabalho do sistema existe o campo de partículas.
 */
export function Skeleton({ lines, height = 14, radius = 'var(--r-s)' }: SkeletonProps) {
  if (!lines) return <div className="ds-skeleton" style={{ height, borderRadius: radius }} aria-hidden="true" />;
  return (
    <div className="ds-skeleton-stack" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="ds-skeleton"
          style={{ height, borderRadius: radius, width: i === lines - 1 ? '62%' : '100%' }}
        />
      ))}
    </div>
  );
}

export function Divider() {
  return <hr className="ds-divider" />;
}
