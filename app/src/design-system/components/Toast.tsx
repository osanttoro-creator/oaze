import type { ReactNode } from 'react';

export interface ToastProps {
  text: ReactNode;
  /** Quando existe, o aviso é a confirmação de uma ação desfazível. */
  undo?: (() => void) | null;
  undoLabel?: string;
  onDismiss?: () => void;
  tone?: 'normal' | 'danger';
}

/**
 * Aviso curto, com desfazer quando a ação admite volta.
 *
 * Toast com "Desfazer" existe justamente para NÃO precisar de diálogo de
 * confirmação em toda ação reversível: confirmar antes custa um toque sempre,
 * desfazer depois custa um toque só quando a pessoa errou.
 *
 * `role="status"` e não `alert`: o aviso é informação, não interrupção — alert
 * corta a leitura em andamento do leitor de tela.
 */
export function Toast({ text, undo, undoLabel = 'Desfazer', onDismiss, tone = 'normal' }: ToastProps) {
  return (
    <div className={tone === 'danger' ? 'ds-toast ds-toast-danger' : 'ds-toast'} role="status" aria-live="polite">
      <span className="ds-grow">{text}</span>
      {undo && (
        <button type="button" className="ds-toast-action" onClick={undo}>
          {undoLabel}
        </button>
      )}
      {onDismiss && (
        <button type="button" className="ds-toast-close" onClick={onDismiss} aria-label="Fechar aviso">
          ✕
        </button>
      )}
    </div>
  );
}
