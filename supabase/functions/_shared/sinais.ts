/* sinais.ts — impressões para o teste grátis (01/11/2026). Tudo vira SHA-256 com sal do servidor. */

const sal = () => Deno.env.get('OAZE_SINAIS_SAL') || Deno.env.get('SUPABASE_URL') || 'oaze';

export async function hashSinal(tipo: string, valor: string | null | undefined): Promise<string | null> {
  const v = typeof valor === 'string' ? valor.trim() : '';
  if (!v) return null;
  const bytes = new TextEncoder().encode(sal() + '|' + tipo + '|' + v);
  const h = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function ipDoPedido(req: Request): string | null {
  const bruto = req.headers.get('cf-connecting-ip')
    || (req.headers.get('x-forwarded-for') || '').split(',')[0]
    || req.headers.get('x-real-ip') || '';
  const ip = bruto.trim();
  if (!ip) return null;
  if (ip.includes(':')) return ip.split(':').slice(0, 4).join(':') + '::/64';
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) ? ip : null;
}

export function emailCanonico(email: string): string {
  const [usuario, dominio] = email.trim().toLowerCase().split('@');
  if (!usuario || !dominio) return email.trim().toLowerCase();
  let u = usuario.split('+')[0];
  let d = dominio;
  if (d === 'googlemail.com') d = 'gmail.com';
  if (d === 'gmail.com') u = u.replace(/\./g, '');
  return u + '@' + d;
}

export function lerDispositivo(v: unknown): { aparelho: string | null; tracos: string | null } {
  if (typeof v !== 'string') return { aparelho: null, tracos: null };
  const m = /^([a-f0-9]{16,64})\.([a-f0-9]{16,64})$/.exec(v.trim().toLowerCase());
  return m ? { aparelho: m[1], tracos: m[2] } : { aparelho: null, tracos: null };
}

export const DIAS_TESTE = 30;
