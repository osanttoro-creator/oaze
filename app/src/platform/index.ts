/*
  Uma interface, quatro lojas. O núcleo nunca pergunta "sou iOS?" fora daqui.
  Web: navegador comum. Capacitor: iOS e Android. Tauri: Windows e macOS.
  As implementações nativas entram em native/ quando os plugins forem instalados
  (docs/02-TRD.md, seção "Por loja").
*/

export type PlatformKind = 'ios' | 'android' | 'windows' | 'macos' | 'web';

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

export function platform(): PlatformKind {
  const cap = (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;
  if (cap?.isNativePlatform?.()) return cap.getPlatform?.() === 'ios' ? 'ios' : 'android';
  if ('__TAURI_INTERNALS__' in globalThis) return /Mac/i.test(navigator.userAgent) ? 'macos' : 'windows';
  return 'web';
}

export const isDesktopShell = () => ['windows', 'macos'].includes(platform());

export interface BiometricInfo {
  available: boolean;
  label: string;
}

export interface Biometrics {
  info(): Promise<BiometricInfo>;
  /** true só quando o sistema confirmou a pessoa. Cancelar é false, nunca erro. */
  verify(reason: string): Promise<boolean>;
}

const unavailable: Biometrics = {
  info: async () => ({ available: false, label: labelFor(platform()) }),
  verify: async () => false,
};

let impl: Biometrics = unavailable;

export function registerBiometrics(b: Biometrics): void {
  impl = b;
}

export const biometrics: Biometrics = {
  info: () => impl.info(),
  verify: (reason) => impl.verify(reason),
};

export function labelFor(p: PlatformKind): string {
  return p === 'ios' ? 'Face ID' : p === 'macos' ? 'Touch ID' : p === 'windows' ? 'Windows Hello' : 'biometria';
}

/**
 * Esconde valores quando o app sai de foco — é a imagem que o sistema guarda
 * no seletor de apps. No nativo, a flag de tela segura faz o resto.
 */
export function installPrivacyCurtain(): () => void {
  const onVis = () => document.documentElement.classList.toggle('curtain', document.visibilityState === 'hidden');
  const onBlur = () => document.documentElement.classList.add('curtain');
  const onFocus = () => document.documentElement.classList.remove('curtain');
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('blur', onBlur);
  window.addEventListener('focus', onFocus);
  return () => {
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('focus', onFocus);
  };
}
