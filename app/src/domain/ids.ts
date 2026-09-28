export function uid(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return prefix + '_' + Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 14);
}
