import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { useEscape } from '../a11y';

export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  kbd?: string;
  tone?: 'normal' | 'danger';
  disabled?: boolean;
  onSelect: () => void;
}

interface ListProps {
  items: MenuItem[];
  onClose: () => void;
  labelledBy?: string;
  style?: React.CSSProperties;
}

function MenuList({ items, onClose, labelledBy, style }: ListProps) {
  const box = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = box.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')[active];
    el?.focus({ preventScroll: true });
  }, [active]);

  const enabled = items.filter((i) => !i.disabled);

  return (
    <div
      ref={box}
      className="ds-menu"
      role="menu"
      aria-labelledby={labelledBy}
      style={style}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActive((a) => (a + 1) % items.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActive((a) => (a - 1 + items.length) % items.length);
        } else if (e.key === 'Home') {
          setActive(0);
        } else if (e.key === 'End') {
          setActive(items.length - 1);
        } else if (e.key === 'Tab') {
          onClose();
        }
      }}
    >
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="menuitem"
          className={it.tone === 'danger' ? 'ds-menu-item ds-menu-danger' : 'ds-menu-item'}
          disabled={it.disabled}
          onClick={() => {
            it.onSelect();
            onClose();
          }}
        >
          {it.icon}
          <span className="ds-grow">{it.label}</span>
          {it.kbd && <span className="ds-kbd ds-kbd-dim">{it.kbd}</span>}
        </button>
      ))}
      {!enabled.length && <p className="ds-menu-empty">Nada disponível aqui.</p>}
    </div>
  );
}

export interface DropdownProps {
  label: string;
  items: MenuItem[];
  children?: ReactNode;
}

/** Menu que nasce de um botão. Setas percorrem, Esc fecha, Tab sai. */
export function Dropdown({ label, items, children }: DropdownProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  useEscape(() => setOpen(false), open);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!host.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  return (
    <div className="ds-dropdown" ref={host}>
      <button
        type="button"
        id={id}
        className="ds-chip"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {children ?? label}
      </button>
      {open && <MenuList items={items} onClose={() => setOpen(false)} labelledBy={id} />}
    </div>
  );
}

export interface ContextMenuProps {
  items: MenuItem[];
  children: ReactNode;
  /** Rótulo da região: lido quando o menu abre pelo teclado. */
  label: string;
}

/**
 * Menu de contexto. No desktop abre no botão direito; no toque, onde `:hover` e
 * botão direito não existem, abre com toque longo (550 ms) — e o movimento do
 * dedo cancela, senão rolar a lista abriria menu.
 */
export function ContextMenu({ items, children, label }: ContextMenuProps) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEscape(() => setAt(null), !!at);

  useEffect(() => {
    if (!at) return;
    const away = () => setAt(null);
    document.addEventListener('pointerdown', away);
    window.addEventListener('resize', away);
    return () => {
      document.removeEventListener('pointerdown', away);
      window.removeEventListener('resize', away);
    };
  }, [at]);

  const open = (x: number, y: number) => {
    /* mantém o menu dentro da janela: 220 px é a largura declarada em CSS */
    setAt({ x: Math.min(x, window.innerWidth - 232), y: Math.min(y, window.innerHeight - 8) });
  };

  return (
    <div
      className="ds-ctx-host"
      onContextMenu={(e: ReactMouseEvent) => {
        e.preventDefault();
        open(e.clientX, e.clientY);
      }}
      onPointerDown={(e) => {
        if (e.pointerType !== 'touch') return;
        const { clientX, clientY } = e;
        timer.current = setTimeout(() => open(clientX, clientY), 550);
      }}
      onPointerMove={() => clearTimeout(timer.current)}
      onPointerUp={() => clearTimeout(timer.current)}
      onPointerCancel={() => clearTimeout(timer.current)}
    >
      {children}
      {at && (
        <MenuList
          items={items}
          onClose={() => setAt(null)}
          labelledBy={undefined}
          style={{ position: 'fixed', left: at.x, top: at.y }}
        />
      )}
      <span className="ds-sr-only">{label}</span>
    </div>
  );
}

export interface TooltipProps {
  text: string;
  children: ReactNode;
}

/**
 * Dica. Aparece no hover e no foco — e nunca carrega informação que só exista
 * ali: em toque não há hover, e a dica simplesmente não acontece.
 */
export function Tooltip({ text, children }: TooltipProps) {
  const id = useId();
  return (
    <span className="ds-tip-host">
      <span aria-describedby={id}>{children}</span>
      <span role="tooltip" id={id} className="ds-tip">
        {text}
      </span>
    </span>
  );
}
