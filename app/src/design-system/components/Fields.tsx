import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface Wrap {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: (id: string, described: string | undefined) => ReactNode;
}

/**
 * Rótulo, dica e erro em volta de qualquer controle. O erro é texto, nunca só
 * borda vermelha: quem não distingue a cor precisa ler o que está errado.
 */
function FieldShell({ label, hint, error, children }: Wrap) {
  const id = useId();
  const hintId = hint ? `${id}-h` : undefined;
  const errId = error ? `${id}-e` : undefined;
  const described = [hintId, errId].filter(Boolean).join(' ') || undefined;
  return (
    <div className="ds-field" data-invalid={error ? 'true' : undefined}>
      <label htmlFor={id}>{label}</label>
      {children(id, described)}
      {hint && !error && (
        <small id={hintId} className="ds-field-hint">
          {hint}
        </small>
      )}
      {error && (
        <small id={errId} className="ds-field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'id'> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
}

export function Input({ label, hint, error, ...rest }: InputProps) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {(id, described) => (
        <input id={id} className="ds-input" aria-describedby={described} aria-invalid={error ? true : undefined} {...rest} />
      )}
    </FieldShell>
  );
}

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className' | 'id'> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
}

export function Textarea({ label, hint, error, rows = 4, ...rest }: TextareaProps) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {(id, described) => (
        <textarea id={id} className="ds-input ds-textarea" rows={rows} aria-describedby={described} {...rest} />
      )}
    </FieldShell>
  );
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'id'> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
}

export function Select({ label, hint, error, children, ...rest }: SelectProps) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {(id, described) => (
        <select id={id} className="ds-input ds-select" aria-describedby={described} {...rest}>
          {children}
        </select>
      )}
    </FieldShell>
  );
}

export interface SearchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'type'> {
  label: string;
  onClear?: () => void;
}

/** Campo de busca: `type=search`, rótulo invisível e limpar com Esc. */
export function Search({ label, onClear, value, onKeyDown, ...rest }: SearchProps) {
  const id = useId();
  return (
    <div className="ds-search" role="search">
      <label htmlFor={id} className="ds-sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        className="ds-input"
        placeholder={label}
        value={value}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && onClear) {
            e.stopPropagation();
            onClear();
          }
          onKeyDown?.(e);
        }}
        {...rest}
      />
    </div>
  );
}

export interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  hint?: ReactNode;
  disabled?: boolean;
}

export function Toggle({ label, checked, onChange, hint, disabled }: ToggleProps) {
  return (
    <div className="ds-toggle-row">
      <span className="ds-grow">
        <span className="ds-toggle-label">{label}</span>
        {hint && <small className="ds-field-hint">{hint}</small>}
      </span>
      <button
        type="button"
        role="switch"
        className="ds-toggle"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}

export interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}

/** Controle segmentado. Setas percorrem, como um grupo de rádio de verdade. */
export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="ds-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          tabIndex={value === o.value ? 0 : -1}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => {
            const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
            if (!delta) return;
            e.preventDefault();
            const i = options.findIndex((x) => x.value === value);
            const next = options[(i + delta + options.length) % options.length];
            if (next) onChange(next.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
