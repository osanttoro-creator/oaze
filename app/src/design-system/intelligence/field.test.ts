import { describe, expect, it } from 'vitest';
import { countFor, createParticles, kick, PROFILES, settle, step, TRANSIENT, type FieldState } from './field';

/*
  O campo é a representação da inteligência do OAZE, e o briefing é específico
  sobre como ele deve se comportar. Estes testes travam as propriedades que
  distinguem "composição de partículas" de "spinner de carregamento".
*/

const STATES: FieldState[] = ['idle', 'listening', 'thinking', 'processing', 'success', 'error'];

function run(state: FieldState, frames: number, seed = 1) {
  const ps = createParticles(40, seed);
  for (let i = 0; i < frames; i++) step(ps, state, i / 60, 1 / 60);
  return ps;
}

function radii(ps: ReturnType<typeof createParticles>): number[] {
  return ps.map((p) => Math.hypot(p.x, p.y));
}

describe('o campo é determinístico', () => {
  it('a mesma semente dá o mesmo campo — um reload não muda o desenho', () => {
    const a = run('idle', 30, 7);
    const b = run('idle', 30, 7);
    expect(a.map((p) => [p.x, p.y])).toEqual(b.map((p) => [p.x, p.y]));
  });

  it('sementes diferentes dão campos diferentes — dois campos na tela não respiram juntos', () => {
    const a = run('idle', 30, 1);
    const b = run('idle', 30, 2);
    expect(a[0]?.x).not.toBe(b[0]?.x);
  });
});

describe('nenhuma órbita é perfeita', () => {
  it('as partículas não compartilham raio nem velocidade angular', () => {
    const ps = createParticles(40, 3);
    expect(new Set(ps.map((p) => p.radius)).size).toBeGreaterThan(30);
    expect(new Set(ps.map((p) => p.spin)).size).toBeGreaterThan(30);
  });

  it('o raio de uma partícula varia ao longo do tempo, não fica travado num círculo', () => {
    const ps = createParticles(40, 4);
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      step(ps, 'idle', i / 60, 1 / 60);
      seen.add(Math.hypot(ps[0]!.x, ps[0]!.y).toFixed(3));
    }
    expect(seen.size).toBeGreaterThan(50);
  });
});

describe('os seis estados são distinguíveis', () => {
  it('processing recolhe para o centro e success abre, nos dois casos mais que idle', () => {
    const mean = (state: FieldState) => {
      const r = radii(run(state, 240));
      return r.reduce((a, b) => a + b, 0) / r.length;
    };
    const idle = mean('idle');
    expect(mean('processing')).toBeLessThan(idle * 0.6);
    expect(mean('success')).toBeGreaterThan(idle * 1.15);
  });

  it('thinking anda mais rápido que idle', () => {
    const travel = (state: FieldState) => {
      const ps = createParticles(40, 5);
      const start = { x: ps[0]!.x, y: ps[0]!.y };
      for (let i = 0; i < 90; i++) step(ps, state, i / 60, 1 / 60);
      return Math.hypot(ps[0]!.x - start.x, ps[0]!.y - start.y);
    };
    expect(travel('thinking')).toBeGreaterThan(travel('idle'));
  });

  it('listening reage à energia da entrada', () => {
    const spread = (level: number) => {
      const ps = createParticles(40, 6);
      for (let i = 0; i < 180; i++) step(ps, 'listening', i / 60, 1 / 60, { level });
      const r = radii(ps);
      return r.reduce((a, b) => a + b, 0) / r.length;
    };
    expect(spread(1)).toBeGreaterThan(spread(0));
  });

  it('error desorganiza e depois volta ao normal sozinho', () => {
    const ps = createParticles(40, 8);
    for (let i = 0; i < 60; i++) step(ps, 'idle', i / 60, 1 / 60);
    const before = radii(ps);
    kick(ps, 0.3, 9);
    step(ps, 'error', 1, 1 / 60);
    const during = radii(ps);
    expect(during.some((r, i) => Math.abs(r - before[i]!) > 0.05)).toBe(true);

    for (let i = 0; i < 120; i++) step(ps, 'error', i / 60, 1 / 60);
    expect(ps.every((p) => p.kx === 0 && p.ky === 0)).toBe(true);
  });

  it('success e error voltam para idle sozinhos; os outros se sustentam', () => {
    expect(TRANSIENT.success).toBeGreaterThan(0);
    expect(TRANSIENT.error).toBeGreaterThan(0);
    expect(TRANSIENT.idle).toBeUndefined();
    expect(TRANSIENT.thinking).toBeUndefined();
  });
});

describe('estabilidade', () => {
  it('nenhuma partícula escapa do quadro em nenhum estado, nem depois de muito tempo', () => {
    for (const state of STATES) {
      const ps = run(state, 1200);
      for (const p of ps) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Math.hypot(p.x, p.y)).toBeLessThan(2);
      }
    }
  });

  it('um quadro longo — a aba voltando do segundo plano — não explode o campo', () => {
    const ps = createParticles(40, 10);
    step(ps, 'thinking', 60, 1 / 30);
    expect(ps.every((p) => Math.hypot(p.x, p.y) < 2)).toBe(true);
  });
});

describe('acessibilidade e custo', () => {
  it('settle devolve um quadro parado, para quem pediu menos movimento', () => {
    const ps = createParticles(40, 11);
    for (let i = 0; i < 60; i++) step(ps, 'thinking', i / 60, 1 / 60);
    settle(ps, 'idle');
    expect(ps.every((p) => p.vx === 0 && p.vy === 0)).toBe(true);
    expect(ps.every((p) => p.alpha === PROFILES.idle.alpha)).toBe(true);
  });

  it('a quantidade de partículas acompanha o tamanho, com teto e piso', () => {
    expect(countFor(24)).toBe(18);
    expect(countFor(60)).toBeGreaterThan(18);
    expect(countFor(600)).toBe(90);
  });
});
