/*
  O campo de partículas do OAZE — a inteligência do sistema vista como
  composição abstrata, nunca como personagem (decisão D3, docs/11-ARQUITETURA.md).

  Este arquivo é só matemática: nenhuma referência a DOM, canvas ou React, para
  que o comportamento possa ser testado quadro a quadro sem navegador.

  Duas regras que definem o resultado:

  1. **Nenhuma órbita é perfeita.** O raio de cada partícula é a soma de dois
     senos de frequências incomensuráveis, com fase própria. Sem isso, trinta
     pontos em círculo com velocidade igual leem como um spinner de carregamento
     — exatamente o que não se quer.
  2. **Estado não corta, caminha.** Trocar de estado move o ALVO; a partícula vai
     até lá por mola amortecida. É isso que faz `processing → success` parecer
     uma expiração e não um corte de cena.
*/

export type FieldState = 'idle' | 'listening' | 'thinking' | 'processing' | 'success' | 'error';

export interface Particle {
  /* repouso: cada partícula tem o seu lugar no anel e o seu jeito de respirar */
  angle: number;
  radius: number;
  spin: number;
  w1: number;
  w2: number;
  p1: number;
  p2: number;
  size: number;
  /* posição viva, em coordenadas normalizadas de -1 a 1 */
  x: number;
  y: number;
  vx: number;
  vy: number;
  /* deslocamento que o estado `error` injeta e que decai sozinho */
  kx: number;
  ky: number;
  alpha: number;
}

export interface StateProfile {
  /** multiplicador do raio de repouso */
  spread: number;
  /** quanto o raio respira, de 0 a 1 */
  breath: number;
  /** multiplicador da velocidade angular */
  speed: number;
  /** rigidez da mola: alto converge rápido, baixo flutua */
  stiffness: number;
  /** amortecimento: 1 é crítico, menos que isso passa do ponto */
  damping: number;
  /** quantos lobos o anel forma — 1 é anel limpo, 3 agrupa */
  lobes: number;
  /** força do agrupamento em lobo */
  lobePull: number;
  /** brilho-alvo */
  alpha: number;
}

/*
  Os seis estados. Os números saíram de ajuste em tela, não de teoria: o que
  importa é a relação entre eles — `thinking` é mais rápido e mais apertado que
  `idle`, `processing` colapsa, `success` abre, `error` desorganiza.
*/
export const PROFILES: Record<FieldState, StateProfile> = {
  idle: { spread: 1, breath: 0.08, speed: 0.1, stiffness: 0.018, damping: 0.86, lobes: 1, lobePull: 0, alpha: 0.72 },
  listening: { spread: 1.06, breath: 0.14, speed: 0.16, stiffness: 0.03, damping: 0.84, lobes: 1, lobePull: 0.06, alpha: 0.86 },
  thinking: { spread: 0.9, breath: 0.2, speed: 0.44, stiffness: 0.05, damping: 0.8, lobes: 3, lobePull: 0.3, alpha: 0.95 },
  processing: { spread: 0.3, breath: 0.05, speed: 0.72, stiffness: 0.09, damping: 0.76, lobes: 1, lobePull: 0, alpha: 1 },
  success: { spread: 1.38, breath: 0.05, speed: 0.12, stiffness: 0.035, damping: 0.9, lobes: 1, lobePull: 0, alpha: 0.9 },
  error: { spread: 1.08, breath: 0.26, speed: 0.3, stiffness: 0.022, damping: 0.7, lobes: 1, lobePull: 0, alpha: 0.9 },
};

/** Estados que não se sustentam: voltam sozinhos para `idle`. */
export const TRANSIENT: Partial<Record<FieldState, number>> = { success: 1100, error: 900 };

/* Gerador determinístico: o mesmo campo renasce igual depois de um reload, e o
   teste pode afirmar posições. `Math.random()` tornaria tudo inverificável. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Quantidade por tamanho: um botão de 60 px não aguenta noventa pontos. */
export function countFor(px: number): number {
  return Math.max(18, Math.min(90, Math.round(px * 0.42)));
}

export function createParticles(count: number, seed = 20261006): Particle[] {
  const rnd = mulberry32(seed);
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    /* o ângulo é distribuído com um empurrão aleatório: espaçamento exato é o
       que faz um anel parecer mostrador de relógio */
    const angle = (i / count) * Math.PI * 2 + (rnd() - 0.5) * 0.5;
    const radius = 0.58 + rnd() * 0.34;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    out.push({
      angle,
      radius,
      spin: 1 + (rnd() - 0.5) * 0.7,
      w1: 0.6 + rnd() * 0.9,
      w2: 1.7 + rnd() * 1.3,
      p1: rnd() * Math.PI * 2,
      p2: rnd() * Math.PI * 2,
      size: 0.4 + rnd() * 0.75,
      x,
      y,
      vx: 0,
      vy: 0,
      kx: 0,
      ky: 0,
      alpha: 0.5 + rnd() * 0.5,
    });
  }
  return out;
}

export interface FieldInput {
  /** 0 a 1 — energia da entrada do usuário; só `listening` usa. */
  level?: number;
}

/**
 * Um quadro. `dt` em segundos, limitado por quem chama para o campo não
 * explodir quando a aba volta do segundo plano depois de um minuto parada.
 */
export function step(
  particles: Particle[],
  state: FieldState,
  t: number,
  dt: number,
  input: FieldInput = {},
): void {
  const p = PROFILES[state];
  const level = Math.max(0, Math.min(1, input.level ?? 0));
  const spread = state === 'listening' ? p.spread + level * 0.22 : p.spread;
  const breath = state === 'listening' ? p.breath + level * 0.1 : p.breath;

  for (const q of particles) {
    const a = q.angle + t * p.speed * q.spin;

    /* dois senos incomensuráveis: o raio nunca repete o mesmo ciclo */
    const wobble = 1 + breath * (Math.sin(t * q.w1 + q.p1) * 0.62 + Math.sin(t * q.w2 + q.p2) * 0.38);
    let r = q.radius * spread * wobble;

    /* lobos: `thinking` recolhe as partículas em grupos que giram juntos */
    if (p.lobePull > 0) r *= 1 - p.lobePull * (1 - Math.abs(Math.cos((a * p.lobes) / 2)));

    const tx = Math.cos(a) * r;
    const ty = Math.sin(a) * r;

    /* mola amortecida em direção ao alvo — o que faz o estado "caminhar" */
    q.vx = (q.vx + (tx - q.x) * p.stiffness) * p.damping;
    q.vy = (q.vy + (ty - q.y) * p.stiffness) * p.damping;
    q.x += q.vx * dt * 60;
    q.y += q.vy * dt * 60;

    /* ruptura do estado de erro: entra de uma vez e decai em ~0,4 s */
    if (q.kx || q.ky) {
      q.x += q.kx;
      q.y += q.ky;
      const decay = Math.pow(0.0001, dt);
      q.kx *= decay;
      q.ky *= decay;
      if (Math.abs(q.kx) < 1e-4) q.kx = 0;
      if (Math.abs(q.ky) < 1e-4) q.ky = 0;
    }

    /* o brilho também caminha, senão a troca de estado pisca */
    q.alpha += (p.alpha - q.alpha) * Math.min(1, dt * 6);
  }
}

/**
 * A desorganização do estado `error`: um empurrão por partícula, aplicado uma
 * vez na entrada do estado. Sem isto, `error` seria só um `idle` mais nervoso.
 */
export function kick(particles: Particle[], strength = 0.22, seed = 7): void {
  const rnd = mulberry32(seed);
  for (const q of particles) {
    const a = rnd() * Math.PI * 2;
    const m = strength * (0.4 + rnd() * 0.6);
    q.kx = Math.cos(a) * m;
    q.ky = Math.sin(a) * m;
  }
}

/** Posição de repouso exata — usada para desenhar o quadro único de reduced-motion. */
export function settle(particles: Particle[], state: FieldState): void {
  const p = PROFILES[state];
  for (const q of particles) {
    q.x = Math.cos(q.angle) * q.radius * p.spread;
    q.y = Math.sin(q.angle) * q.radius * p.spread;
    q.vx = 0;
    q.vy = 0;
    q.kx = 0;
    q.ky = 0;
    q.alpha = p.alpha;
  }
}
