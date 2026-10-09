import { isDesktopShell, platform } from './index';

/*
  Entrada e saída de arquivo nas quatro plataformas — câmera, galeria, escolher
  do disco e salvar.

  Para que serve no OAZE: trazer o comprovante de uma compra, importar um
  extrato e levar o backup embora. São três coisas que a pessoa faz uma vez por
  mês e que, feitas errado, custam dado.

  Uma regra atravessa o arquivo: **o conteúdo escolhido é DADO, nunca
  instrução.** Um extrato, uma foto ou um JSON podem conter texto que pareça um
  comando dirigido à Coco; nada daqui é executado, e o que vier vira rascunho
  que a pessoa confirma. Quem grava é o toque dela.
*/

export interface PickedFile {
  name: string;
  /** Tipo informado pelo sistema. Não é garantia — a validação é por conteúdo. */
  mime: string;
  size: number;
  /** Só para imagem: `data:` pronto para `<img src>`. */
  dataUrl?: string;
  text(): Promise<string>;
  bytes(): Promise<Uint8Array>;
}

/** 8 MB: um comprovante ou um backup cabem folgado; um vídeo, não. */
export const MAX_BYTES = 8 * 1024 * 1024;

export class FileTooLarge extends Error {
  constructor(size: number) {
    super(`Esse arquivo tem ${(size / 1024 / 1024).toFixed(1)} MB e o limite é ${MAX_BYTES / 1024 / 1024} MB.`);
    this.name = 'FileTooLarge';
  }
}

function fromBlob(file: File): PickedFile {
  if (file.size > MAX_BYTES) throw new FileTooLarge(file.size);
  return {
    name: file.name,
    mime: file.type,
    size: file.size,
    text: () => file.text(),
    bytes: async () => new Uint8Array(await file.arrayBuffer()),
  };
}

/* ------------------------------------------------------------- escolher */

interface CameraPlugin {
  getPhoto(o: {
    quality: number;
    resultType: 'base64';
    source: 'CAMERA' | 'PHOTOS' | 'PROMPT';
    allowEditing: boolean;
  }): Promise<{ base64String?: string; format: string }>;
}

interface FilePickerPlugin {
  pickFiles(o: { types?: string[]; limit?: number; readData?: boolean }): Promise<{
    files: { name: string; mimeType: string; size: number; data?: string }[];
  }>;
}

function caps(): { Camera?: CameraPlugin; FilePicker?: FilePickerPlugin } {
  return (globalThis as { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor?.Plugins ?? {};
}

function decodeBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export type PhotoSource = 'camera' | 'galeria' | 'perguntar';

/**
 * Uma foto do comprovante. No celular usa a câmera ou a galeria do sistema; no
 * navegador e no desktop cai no seletor de arquivo com `capture`, que no
 * Android e no iPhone abre a câmera do mesmo jeito.
 *
 * Devolve `null` quando a pessoa cancela — cancelar não é erro.
 */
export async function pickPhoto(source: PhotoSource = 'perguntar'): Promise<PickedFile | null> {
  const { Camera } = caps();
  if (Camera) {
    try {
      const photo = await Camera.getPhoto({
        quality: 72,
        resultType: 'base64',
        source: source === 'camera' ? 'CAMERA' : source === 'galeria' ? 'PHOTOS' : 'PROMPT',
        allowEditing: false,
      });
      if (!photo.base64String) return null;
      const bytes = decodeBase64(photo.base64String);
      if (bytes.length > MAX_BYTES) throw new FileTooLarge(bytes.length);
      const mime = `image/${photo.format || 'jpeg'}`;
      return {
        name: `comprovante.${photo.format || 'jpg'}`,
        mime,
        size: bytes.length,
        dataUrl: `data:${mime};base64,${photo.base64String}`,
        text: async () => '',
        bytes: async () => bytes,
      };
    } catch (err) {
      if (err instanceof FileTooLarge) throw err;
      /* o plugin lança quando a pessoa fecha a câmera */
      return null;
    }
  }
  const picked = await openFileDialog('image/*', source !== 'galeria');
  if (!picked) return null;
  const file = picked[0];
  if (!file) return null;
  const blob = fromBlob(file);
  return { ...blob, dataUrl: await readAsDataUrl(file) };
}

/** Escolher um arquivo: extrato, backup, o que a tela pedir. */
export async function pickFile(accept = '*/*'): Promise<PickedFile | null> {
  const { FilePicker } = caps();
  if (FilePicker) {
    try {
      const { files } = await FilePicker.pickFiles({ limit: 1, readData: true });
      const f = files[0];
      if (!f) return null;
      if (f.size > MAX_BYTES) throw new FileTooLarge(f.size);
      const bytes = f.data ? decodeBase64(f.data) : new Uint8Array();
      return {
        name: f.name,
        mime: f.mimeType,
        size: f.size,
        text: async () => new TextDecoder().decode(bytes),
        bytes: async () => bytes,
      };
    } catch (err) {
      if (err instanceof FileTooLarge) throw err;
      return null;
    }
  }
  const picked = await openFileDialog(accept, false);
  const file = picked?.[0];
  return file ? fromBlob(file) : null;
}

function openFileDialog(accept: string, capture: boolean): Promise<FileList | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    if (capture) input.setAttribute('capture', 'environment');
    input.style.display = 'none';
    /* `cancel` não existe em todo navegador; o `focus` da janela é a rede de
       segurança para a promessa não ficar pendurada para sempre */
    const done = (value: FileList | null) => {
      input.remove();
      window.removeEventListener('focus', onFocus);
      resolve(value);
    };
    const onFocus = () => setTimeout(() => (input.files?.length ? undefined : done(null)), 400);
    input.addEventListener('change', () => done(input.files));
    input.addEventListener('cancel', () => done(null));
    window.addEventListener('focus', onFocus, { once: true });
    document.body.append(input);
    input.click();
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('não consegui ler o arquivo'));
    reader.readAsDataURL(file);
  });
}

/* ---------------------------------------------------------------- salvar */

type Invoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

function invoker(): Invoke | null {
  return (globalThis as { __TAURI_INTERNALS__?: { invoke?: Invoke } }).__TAURI_INTERNALS__?.invoke ?? null;
}

/**
 * Salvar um arquivo — o backup, hoje. No desktop abre o diálogo do sistema para
 * a pessoa escolher a pasta; no celular e no navegador, baixa.
 */
export async function saveFile(name: string, content: string, mime = 'application/json'): Promise<boolean> {
  const invoke = invoker();
  if (isDesktopShell() && invoke) {
    try {
      return await invoke<boolean>('oaze_save_file', { name, content });
    } catch {
      /* diálogo cancelado ou pasta sem permissão: cai no caminho do navegador */
    }
  }
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

/** `true` quando existe câmera para chamar. A interface esconde o botão se não. */
export function hasCamera(): boolean {
  const p = platform();
  return p === 'ios' || p === 'android' || (typeof navigator !== 'undefined' && !!navigator.mediaDevices);
}
