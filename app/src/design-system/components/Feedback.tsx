import type { ReactNode } from 'react';
import { OazeIntelligence } from '../intelligence/OazeIntelligence';

export interface BadgeProps {
  count?: number;
  label?: string;
  tone?: 'milk' | 'teal' | 'danger';
}

export function Badge({ count, label, tone = 'milk' }: BadgeProps) {
  const text = count != null ? (count > 99 ? '99+' : String(count)) : label;
  if (!text) return null;
  return (
    <span className={`ds-badge ds-badge-${tone}`}>
      {text}
      {count != null && label && <span className="ds-sr-only"> {label}</span>}
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="ds-tag">{children}</span>;
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'teal' }) {
  return <span className={tone === 'teal' ? 'ds-pill ds-pill-teal' : 'ds-pill'}>{children}</span>;
}

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  ring?: boolean;
}

export function Avatar({ name, src, size = 40, ring }: AvatarProps) {
  const initial = (name || '?').trim().charAt(0).toLowerCase();
  return (
    <span
      className={ring ? 'ds-avatar ds-avatar-ring' : 'ds-avatar'}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-hidden={src ? undefined : 'true'}
    >
      {src ? <img src={src} alt={name} /> : initial}
    </span>
  );
}

export interface LoadingProps {
  label?: string;
  size?: number;
  /** `block` ocupa a largura e centraliza; `inline` acompanha o texto. */
  layout?: 'block' | 'inline';
}

/**
 * Indicador de trabalho do sistema. É o campo de partículas, nunca um anel
 * girando: o OAZE não tem spinner, e essa é a decisão (D3). Quando o que falta
 * é conteúdo, e não trabalho, use `Skeleton`.
 */
export function Loading({ label = 'Carregando', size = 56, layout = 'block' }: LoadingProps) {
  return (
    <div className={layout === 'block' ? 'ds-loading' : 'ds-loading ds-loading-inline'} role="status">
      <OazeIntelligence state="processing" size={size} label={null} />
      <span className={layout === 'block' ? 'ds-muted ds-small' : 'ds-sr-only'}>{label}</span>
    </div>
  );
}

export interface StateProps {
  title: string;
  message?: ReactNode;
  action?: ReactNode;
  /** Ilustração. Fica a cargo de quem chama — é aqui que a Coco ainda cabe. */
  art?: ReactNode;
}

export function EmptyState({ title, message, action, art }: StateProps) {
  return (
    <div className="ds-state">
      {art}
      <h3 className="ds-h2">{title}</h3>
      {message && <p className="ds-muted">{message}</p>}
      {action}
    </div>
  );
}

/**
 * Estado de erro. Três coisas obrigatórias: o que falhou, se o dado está a
 * salvo, e o que fazer agora. "Algo deu errado" sozinho não é estado de erro.
 */
export function ErrorState({
  title,
  message,
  action,
  detail,
}: StateProps & { detail?: string | null }) {
  return (
    <div className="ds-state ds-state-error" role="alert">
      <OazeIntelligence state="error" size={64} label={null} />
      <h3 className="ds-h2">{title}</h3>
      {message && <p className="ds-muted">{message}</p>}
      {detail && <code className="ds-error-detail">{detail}</code>}
      {action}
    </div>
  );
}
