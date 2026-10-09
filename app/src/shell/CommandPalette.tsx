import { useEffect, useMemo, useRef, useState } from 'react';
import { useEscape, useFocusTrap } from '../design-system/a11y';

/*
  Paleta de comandos — a navegação de teclado do desktop (requisito 5 do
  briefing). `Ctrl/Cmd+K` abre, digitar filtra, setas percorrem, Enter executa.

  Não existe no celular: lá a navegação é o polegar na ilha inferior, e um campo
  de busca que abre teclado por cima da tela não ajuda ninguém. Quem monta a
  paleta é a casca de desktop, então ela simplesmente não entra no caminho do
  celular — nem no bundle dele, porque o import é dinâmico.
*/

export interface Command {
  id: string;
  label: string;
  /** Agrupamento mostrado à esquerda: "Ir para", "Criar", "Conta"… */
  group: string;
  kbd?: string;
  keywords?: string;
  run: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}

/** Casa por subsequência, não por prefixo: "lanc" acha "Novo lançamento". */
function matches(c: Command, q: string): boolean {
  if (!q) return true;
  const hay = `${c.group} ${c.label} ${c.keywords ?? ''}`.toLowerCase();
  let i = 0;
  for (const ch of q.toLowerCase()) {
    i = hay.indexOf(ch, i);
    if (i < 0) return false;
    i++;
  }
  return true;
}

export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const trap = useFocusTrap<HTMLDivElement>(open);
  const input = useRef<HTMLInputElement>(null);
  useEscape(onClose, open);

  const found = useMemo(() => commands.filter((c) => matches(c, q)), [commands, q]);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      input.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  if (!open) return null;

  const run = (c: Command | undefined) => {
    if (!c) return;
    onClose();
    c.run();
  };

  return (
    <>
      <div className="ds-scrim" onClick={onClose} aria-hidden="true" />
      <div ref={trap} className="oz-palette" role="dialog" aria-modal="true" aria-label="Paleta de comandos" tabIndex={-1}>
        <input
          ref={input}
          className="oz-palette-input"
          type="text"
          value={q}
          placeholder="Buscar comando…"
          aria-label="Buscar comando"
          aria-controls="oz-palette-list"
          aria-activedescendant={found[active] ? `oz-cmd-${found[active].id}` : undefined}
          role="combobox"
          aria-expanded="true"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => (found.length ? (a + 1) % found.length : 0));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => (found.length ? (a - 1 + found.length) % found.length : 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              run(found[active]);
            }
          }}
        />
        <ul className="oz-palette-list" id="oz-palette-list" role="listbox" aria-label="Comandos">
          {found.map((c, i) => (
            <li key={c.id} role="option" id={`oz-cmd-${c.id}`} aria-selected={i === active}>
              <button
                type="button"
                className={i === active ? 'oz-palette-item is-active' : 'oz-palette-item'}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(c)}
              >
                <span className="ds-eyebrow">{c.group}</span>
                <span className="ds-grow">{c.label}</span>
                {c.kbd && <span className="ds-kbd ds-kbd-dim">{c.kbd}</span>}
              </button>
            </li>
          ))}
          {!found.length && <li className="oz-palette-empty">Nenhum comando com esse nome.</li>}
        </ul>
      </div>
    </>
  );
}
