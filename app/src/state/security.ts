import { getState, setState, type PinRecord } from './store';

const ITERATIONS = 210_000;
const MAX_FREE_TRIES = 5;

function b64(bytes: ArrayBuffer | Uint8Array): string {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  u.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

function unb64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function derive(pin: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return b64(bits);
}

function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isValidPin(pin: string): boolean {
  // sequências e repetições óbvias são as primeiras que alguém tenta
  if (!/^\d{6}$/.test(pin)) return false;
  if (/^(\d)\1{5}$/.test(pin)) return false;
  return !['123456', '654321', '012345', '543210', '123123'].includes(pin);
}

export async function createPin(pin: string): Promise<PinRecord> {
  const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
  return { hash: await derive(pin, salt, ITERATIONS), salt: b64(salt), iterations: ITERATIONS };
}

export async function setPin(pin: string): Promise<void> {
  const rec = await createPin(pin);
  setState((s) => ({ ...s, security: { pin: rec, failed: 0, lockedUntil: null } }));
}

/** Espera crescente depois de cinco erros: 30 s, 1 min, 2 min… até 15 min. */
export function lockoutMs(failed: number): number {
  if (failed < MAX_FREE_TRIES) return 0;
  return Math.min(15 * 60_000, 30_000 * 2 ** (failed - MAX_FREE_TRIES));
}

export type PinResult = { ok: true } | { ok: false; waitMs: number; left: number };

export async function checkPin(pin: string, now = Date.now()): Promise<PinResult> {
  const { security } = getState();
  if (!security.pin) return { ok: true };
  if (security.lockedUntil && now < security.lockedUntil) return { ok: false, waitMs: security.lockedUntil - now, left: 0 };
  const hash = await derive(pin, unb64(security.pin.salt), security.pin.iterations);
  if (sameString(hash, security.pin.hash)) {
    setState((s) => ({ ...s, security: { ...s.security, failed: 0, lockedUntil: null } }));
    return { ok: true };
  }
  const failed = security.failed + 1;
  const wait = lockoutMs(failed);
  setState((s) => ({ ...s, security: { ...s.security, failed, lockedUntil: wait ? now + wait : null } }));
  return { ok: false, waitMs: wait, left: Math.max(0, MAX_FREE_TRIES - failed) };
}
