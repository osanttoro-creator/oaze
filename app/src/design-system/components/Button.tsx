import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { OazeIntelligence } from '../intelligence/OazeIntelligence';

export type ButtonTone = 'milk' | 'teal' | 'ghost' | 'line' | 'danger';
export type ButtonSize = 'm' | 's';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  tone?: ButtonTone;
  size?: ButtonSize;
  block?: boolean;
  /** Mostra o campo de partículas no lugar do conteúdo e desabilita o botão. */
  busy?: boolean;
  /** Ícone antes do rótulo. Ícone sozinho pede `aria-label`. */
  icon?: ReactNode;
  /** Atalho mostrado à direita, no desktop. */
  kbd?: string;
  className?: string;
}

/**
 * O único botão do produto. Sem variante nova sem token novo: altura, raio e
 * cor saem de `tokens.css`, nunca do arquivo que usa o botão.
 */
export function Button({
  tone = 'ghost',
  size = 'm',
  block,
  busy,
  icon,
  kbd,
  children,
  disabled,
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  const cls = ['ds-btn', `ds-btn-${tone}`, size === 's' && 'ds-btn-s', block && 'ds-btn-block', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={cls} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
      {busy ? (
        <OazeIntelligence state="processing" size={size === 's' ? 20 : 24} label="processando" />
      ) : (
        <>
          {icon}
          {children}
          {kbd && <span className="ds-kbd">{kbd}</span>}
        </>
      )}
    </button>
  );
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  /** Obrigatório: um ícone sem nome é invisível para leitor de tela. */
  label: string;
  size?: number;
  dot?: boolean;
  className?: string;
}

export function IconButton({ label, size = 48, dot, children, type = 'button', className, ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      className={className ? `ds-icon-btn ${className}` : 'ds-icon-btn'}
      style={{ width: size, height: size }}
      aria-label={label}
      {...rest}
    >
      {children}
      {dot && <i className="ds-icon-dot" aria-hidden="true" />}
    </button>
  );
}
