import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { brl } from '../domain/money';
import type { Cents } from '../domain/types';
import { useApp } from '../state/store';
import { Icon } from './Icon';

/* =============================================================
   Peças pequenas que todas as telas usam.
   ============================================================= */

/**
 * Dinheiro na tela. Uma peça só, porque o "olho" de esconder valores
 * vale para a interface INTEIRA — se cada tela decidisse sozinha, um
 * número escaparia e a função deixaria de servir para o que existe.
 * Escondido vira borrão, não texto trocado: ninguém tenta decifrar e
 * a largura da linha não pula quando liga e desliga.
 */
export function Money({ value, signed, className = '' }: { value: Cents; signed?: boolean; className?: string }) {
  const hidden = useApp((s) => s.settings.hideValues);
  const text = (signed ? (value < 0 ? '− ' : '+ ') : '') + brl(Math.abs(value));
  if (!hidden) return <span className={className}>{text}</span>;
  return (
    <span className={className} style={{ filter: 'blur(7px)', userSelect: 'none' }} aria-label="valor escondido">
      {text}
    </span>
  );
}

/**
 * O cabeçalho de cada tela. No celular ele traz o voltar; no
 * computador não, porque a barra lateral já diz onde a pessoa está —
 * ali o voltar seria um botão para lugar nenhum.
 */
export function ScreenHead({ title, eyebrow, desktop, onBack, right }: {
  title: string;
  eyebrow?: string;
  desktop: boolean;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <header className={desktop ? 'd-head' : 'm-head'}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {!desktop && onBack && (
          <button type="button" className="icon-btn" onClick={onBack} aria-label="Voltar">
            <Icon name="chevron-left" />
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="title">{title}</h1>
        </div>
      </div>
      {right}
    </header>
  );
}

/**
 * Escolha entre poucas opções, todas visíveis. É um grupo de botões
 * com aria-pressed e não um <select>: com três rótulos curtos, o menu
 * esconderia as alternativas atrás de um toque a mais sem ganhar nada.
 */
export function Seg<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="seg" role="group" aria-label={label}>
        {options.map(([v, t]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>{t}</button>
        ))}
      </div>
    </div>
  );
}

/** Liga/desliga. O estado vai em aria-checked, não só na cor. */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" className="toggle" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />
  );
}

/** Esc fecha qualquer camada sobreposta — folha, modal ou painel. */
function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
}

/**
 * Folha que sobe da base no celular. No computador a mesma coisa vira
 * modal centralizado — quem decide é o `desktop`, e não duas
 * implementações paralelas que um dia divergem.
 */
export function Sheet({ label, desktop, onClose, children }: {
  label: string;
  desktop: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEscape(onClose);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className={desktop ? 'modal' : 'sheet'} role="dialog" aria-modal="true" aria-label={label}>
        {!desktop && <div className="sheet-grip" aria-hidden="true" />}
        <div className="sheet-body">{children}</div>
      </div>
    </>
  );
}

/** Painel lateral: é assim que a Coco aparece no computador. */
export function SidePanel({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  useEscape(onClose);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="side-panel" role="dialog" aria-modal="true" aria-label={label}>{children}</div>
    </>
  );
}

/** Lista vazia. A Coco aparece calma: vazio não é erro. */
export function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <img src="/coco/corpo-neutra_acolhedora.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" />
      <p>{text}</p>
    </div>
  );
}

/* ---------------- a Coco ----------------
   Ela vem pronta do kit V2.1 e nunca é redesenhada em código: são dez
   rostos e dez corpos, e improvisar anatomia quebra a personagem. Os
   nomes abaixo são exatamente os arquivos que existem em public/coco,
   então um humor inventado não compila. O alt fica vazio de propósito:
   nesses lugares ela acompanha um texto que já diz tudo. */

export type CocoMood =
  | 'aliviada' | 'animada' | 'calma' | 'curiosa' | 'feliz'
  | 'neutra_acolhedora' | 'pensando' | 'piscadinha' | 'preocupada' | 'surpresa';

export type CocoPose =
  | 'alerta_gentil' | 'aliviada' | 'analisando_grafico' | 'conferindo_recibo' | 'explicando'
  | 'feliz' | 'lendo_arquivo' | 'meta_comemorada' | 'neutra_acolhedora' | 'pensando';

export function CocoFace({ mood, size = 48 }: { mood: CocoMood; size?: number }) {
  return <img src={`/coco/rosto-${mood}.webp`} width={size} height={size} alt="" aria-hidden="true" loading="lazy" decoding="async" />;
}

export function CocoBody({ pose, width = 160 }: { pose: CocoPose; width?: number }) {
  return <img src={`/coco/corpo-${pose}.webp`} width={width} height={width} alt="" aria-hidden="true" loading="lazy" decoding="async" />;
}
