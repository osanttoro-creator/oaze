import { useCallback, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { MAX_BYTES, FileTooLarge, type PickedFile } from '../platform/files';
import './dropzone.css';

/*
  Arrastar e soltar — a forma do desktop de trazer um arquivo (requisito 5 e 13
  do briefing).

  Três cuidados que fazem diferença entre "funciona" e "funciona de verdade":

  1. **O contador de entrada e saída.** `dragleave` dispara ao passar por cima de
     qualquer filho, e sem contar as entradas o realce pisca a cada movimento do
     mouse. Um contador resolve; uma flag booleana não.
  2. **O que foi solto é DADO.** Nome e tipo vêm de fora e nunca são renderizados
     como HTML nem executados; o nome é aparado e o conteúdo é validado por quem
     recebe.
  3. **Teclado tem o mesmo caminho.** A área é um botão: Enter e Espaço abrem o
     seletor de arquivo. Arrastar não é alcançável por teclado, então uma zona
     que SÓ aceita arrasto exclui quem não usa mouse.
*/

export interface DropZoneProps {
  label: string;
  hint?: ReactNode;
  /** MIME aceitos; vazio aceita tudo. Comparado por prefixo (`image/`). */
  accept?: string[];
  onFile: (file: PickedFile) => void;
  onError?: (message: string) => void;
  /** Abre o seletor quando a pessoa clica ou aperta Enter. */
  onBrowse?: () => void;
  children?: ReactNode;
}

function aceita(mime: string, accept: readonly string[]): boolean {
  if (!accept.length) return true;
  return accept.some((a) => (a.endsWith('/*') ? mime.startsWith(a.slice(0, -1)) : mime === a));
}

export function DropZone({ label, hint, accept = [], onFile, onError, onBrowse, children }: DropZoneProps) {
  const [over, setOver] = useState(false);
  const profundidade = useRef(0);

  const receber = useCallback(
    (file: File) => {
      if (!aceita(file.type, accept)) {
        onError?.(`"${file.name.slice(0, 40)}" não é um tipo que esta área aceita.`);
        return;
      }
      if (file.size > MAX_BYTES) {
        onError?.(new FileTooLarge(file.size).message);
        return;
      }
      onFile({
        name: file.name.slice(0, 120),
        mime: file.type,
        size: file.size,
        text: () => file.text(),
        bytes: async () => new Uint8Array(await file.arrayBuffer()),
      });
    },
    [accept, onFile, onError],
  );

  const onDragEnter = (e: DragEvent) => {
    e.preventDefault();
    profundidade.current += 1;
    setOver(true);
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    profundidade.current -= 1;
    if (profundidade.current <= 0) {
      profundidade.current = 0;
      setOver(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    profundidade.current = 0;
    setOver(false);
    const files = e.dataTransfer?.files;
    if (!files?.length) return;
    if (files.length > 1) onError?.('Solte um arquivo por vez.');
    const first = files[0];
    if (first) receber(first);
  };

  return (
    <button
      type="button"
      className={over ? 'oz-drop is-over' : 'oz-drop'}
      aria-label={label}
      onClick={onBrowse}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children ?? (
        <>
          <span className="oz-drop-title">{label}</span>
          {hint && <span className="ds-small ds-muted">{hint}</span>}
        </>
      )}
    </button>
  );
}
