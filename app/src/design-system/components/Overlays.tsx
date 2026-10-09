import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useEscape, useFocusTrap, useScrollLock } from '../a11y';
import { IconButton } from './Button';

interface Base {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Rodapé fixo, fora da área de rolagem. */
  footer?: ReactNode;
  /**
   * Esconde o cabeçalho da camada quando o conteúdo já traz o próprio título.
   * O `title` continua valendo como `aria-label` — a camada nunca fica sem nome
   * para quem usa leitor de tela, que é o ponto do cabeçalho.
   */
  hideHeader?: boolean;
}

function Scrim({ onClose }: { onClose: () => void }) {
  return <div className="ds-scrim" onClick={onClose} aria-hidden="true" />;
}

/**
 * Folha inferior — a camada do celular. Arrasta para baixo para fechar, com o
 * dedo 1:1 e um limiar que considera a VELOCIDADE: um empurrão curto e rápido
 * fecha, um arraste longo e lento volta. Só distância erraria o gesto comum.
 */
export function BottomSheet({ open, onClose, title, children, footer, hideHeader }: Base) {
  const trap = useFocusTrap<HTMLDivElement>(open);
  const drag = useRef<{ y0: number; t0: number; id: number } | null>(null);
  const [dy, setDy] = useState(0);
  useEscape(onClose, open);
  useScrollLock(open);
  if (!open) return null;

  const down = (e: ReactPointerEvent) => {
    drag.current = { y0: e.clientY, t0: performance.now(), id: e.pointerId };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const move = (e: ReactPointerEvent) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    setDy(Math.max(0, e.clientY - drag.current.y0));
  };
  const up = (e: ReactPointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId) return;
    const dist = e.clientY - d.y0;
    const speed = dist / Math.max(1, performance.now() - d.t0); // px por ms
    setDy(0);
    if (dist > 120 || speed > 0.6) onClose();
  };

  return (
    <>
      <Scrim onClose={onClose} />
      <div
        ref={trap}
        className="ds-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={dy ? { transform: `translateY(${dy}px)`, transition: 'none' } : undefined}
      >
        <div className="ds-sheet-grab" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <span className="ds-sheet-grip" aria-hidden="true" />
        </div>
        {!hideHeader && (
          <header className="ds-overlay-head">
            <h2 className="ds-h2">{title}</h2>
            <IconButton label="Fechar" size={40} onClick={onClose}>
              ✕
            </IconButton>
          </header>
        )}
        <div className="ds-overlay-body">{children}</div>
        {footer && <footer className="ds-overlay-foot">{footer}</footer>}
      </div>
    </>
  );
}

/** Janela centrada — a camada do desktop. */
export function Modal({ open, onClose, title, children, footer, hideHeader }: Base) {
  const trap = useFocusTrap<HTMLDivElement>(open);
  useEscape(onClose, open);
  useScrollLock(open);
  if (!open) return null;
  return (
    <>
      <Scrim onClose={onClose} />
      <div ref={trap} className="ds-modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        {!hideHeader && (
          <header className="ds-overlay-head">
            <h2 className="ds-h2">{title}</h2>
            <IconButton label="Fechar" size={40} onClick={onClose}>
              ✕
            </IconButton>
          </header>
        )}
        <div className="ds-overlay-body">{children}</div>
        {footer && <footer className="ds-overlay-foot">{footer}</footer>}
      </div>
    </>
  );
}

/** Painel lateral — contexto que acompanha a tela, sem tirar o foco dela. */
export function SidePanel({
  open,
  onClose,
  title,
  children,
  footer,
  hideHeader,
  modal = true,
}: Base & { modal?: boolean }) {
  const trap = useFocusTrap<HTMLDivElement>(open && modal);
  useEscape(onClose, open);
  if (!open) return null;
  return (
    <>
      {modal && <Scrim onClose={onClose} />}
      <aside
        ref={trap}
        className="ds-side-panel"
        role={modal ? 'dialog' : 'complementary'}
        aria-modal={modal || undefined}
        aria-label={title}
        tabIndex={-1}
      >
        {!hideHeader && (
          <header className="ds-overlay-head">
            <h2 className="ds-h2">{title}</h2>
            <IconButton label="Fechar" size={40} onClick={onClose}>
              ✕
            </IconButton>
          </header>
        )}
        <div className="ds-overlay-body">{children}</div>
        {footer && <footer className="ds-overlay-foot">{footer}</footer>}
      </aside>
    </>
  );
}

export interface DialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'normal' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Diálogo de decisão. Pergunta uma coisa e tem duas saídas. Usado para tudo que
 * não se desfaz — e o que se desfaz usa toast com "Desfazer", não diálogo.
 */
export function Dialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'normal',
  onConfirm,
  onCancel,
}: DialogProps) {
  const trap = useFocusTrap<HTMLDivElement>(open);
  useEscape(onCancel, open);
  useEffect(() => {
    if (open) document.documentElement.classList.add('ds-has-dialog');
    return () => document.documentElement.classList.remove('ds-has-dialog');
  }, [open]);
  if (!open) return null;
  return (
    <>
      <Scrim onClose={onCancel} />
      <div ref={trap} className="ds-modal ds-dialog" role="alertdialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <h2 className="ds-h2">{title}</h2>
        <p className="ds-dialog-msg">{message}</p>
        <div className="ds-dialog-actions">
          <button type="button" className="ds-btn ds-btn-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={tone === 'danger' ? 'ds-btn ds-btn-danger' : 'ds-btn ds-btn-milk'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * A mesma camada, escolhida pela plataforma: folha no celular, janela no
 * desktop. É o que permite a tela chamar `<Layer>` e não saber onde roda.
 */
export function Layer({ desktop, ...props }: Base & { desktop: boolean }) {
  return desktop ? <Modal {...props} /> : <BottomSheet {...props} />;
}
