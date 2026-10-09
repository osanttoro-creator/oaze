import type { ReactNode } from 'react';
import { EmptyState, Layer, Segmented, SidePanel as DsSidePanel } from '../design-system';
import { brl } from '../domain/money';
import type { Cents } from '../domain/types';
import { useApp } from '../state/store';
import { Icon } from './Icon';

/* =============================================================
   Peças pequenas que todas as telas usam.

   `Seg`, `Toggle`, `Sheet`, `SidePanel` e `Empty` viviam aqui como
   implementações próprias — e o design system passou a ter as mesmas
   peças, melhores. Duas implementações do mesmo componente divergem
   no primeiro ajuste, então estas aqui viraram ADAPTADORES: mantêm a
   assinatura que as catorze telas já usam e delegam o comportamento.

   O que as telas ganharam sem mudar uma linha: foco preso e devolvido
   nas camadas, rolagem do fundo travada, arrastar para fechar no
   celular, e setas de teclado no controle segmentado.
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
          <button type="button" className="ds-icon-btn" style={{ width: 44, height: 44 }} onClick={onBack} aria-label="Voltar">
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
 * Escolha entre poucas opções, todas visíveis. Delega ao `Segmented` do
 * design system, que é um `radiogroup` de verdade: as setas percorrem e só a
 * opção ativa entra na ordem do Tab.
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
      <Segmented
        label={label}
        value={value}
        onChange={onChange}
        options={options.map(([v, t]) => ({ value: v, label: t }))}
      />
    </div>
  );
}

/**
 * Liga/desliga. O estado vai em aria-checked, não só na cor.
 *
 * Aqui é só a chave, com a aparência do design system: o `Toggle` de lá monta a
 * linha inteira (rótulo + dica + chave), e as telas que usam isto já têm a
 * própria linha. Reaproveitar a linha de lá significaria desmontar a daqui.
 */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      className="ds-toggle"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
    />
  );
}

/**
 * Folha que sobe da base no celular; no computador, janela centralizada. Quem
 * decide é o `desktop`, e não duas implementações paralelas que um dia divergem.
 *
 * `hideHeader` porque cada tela já escreve o próprio título dentro do corpo —
 * o `label` segue valendo como nome da camada para o leitor de tela.
 */
export function Sheet({ label, desktop, onClose, children }: {
  label: string;
  desktop: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Layer desktop={desktop} open onClose={onClose} title={label} hideHeader>
      {children}
    </Layer>
  );
}

/** Painel lateral: é assim que a Coco aparece no computador. */
export function SidePanel({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  return (
    <DsSidePanel open onClose={onClose} title={label} hideHeader>
      {children}
    </DsSidePanel>
  );
}

/** Lista vazia. A Coco aparece calma: vazio não é erro. */
export function Empty({ text }: { text: string }) {
  return <EmptyState title={text} art={<CocoBody pose="neutra_acolhedora" width={140} />} />;
}

/* ---------------- a Coco ----------------
   Ela vem pronta do kit V2.1 e nunca é redesenhada em código: são dez
   rostos e dez corpos, e improvisar anatomia quebra a personagem. Os
   nomes abaixo são exatamente os arquivos que existem em public/coco,
   então um humor inventado não compila. O alt fica vazio de propósito:
   nesses lugares ela acompanha um texto que já diz tudo.

   A Coco é personagem de MARCA — acolhe em boas-vindas e em tela vazia.
   Quem mostra "estou pensando" é o campo de partículas do design system
   (decisão D3 em docs/11-ARQUITETURA.md). */

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
