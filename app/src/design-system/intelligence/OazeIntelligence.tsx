import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../breakpoints';
import { PARTICLE_COLORS } from '../tokens';
import { countFor, createParticles, kick, settle, step, TRANSIENT, type FieldState } from './field';
import { subscribe } from './scheduler';
import './intelligence.css';

export type { FieldState };

export interface OazeIntelligenceProps {
  state?: FieldState;
  /** Lado do quadrado em CSS px. */
  size?: number;
  /** 0 a 1 — energia da entrada; só `listening` usa. */
  level?: number;
  /** Semente: dois campos na mesma tela não devem respirar em uníssono. */
  seed?: number;
  /** Lido por leitor de tela; `null` quando outro elemento já descreve o estado. */
  label?: string | null;
  className?: string;
}

const SPOKEN: Record<FieldState, string> = {
  idle: 'inteligência em repouso',
  listening: 'ouvindo',
  thinking: 'pensando',
  processing: 'processando',
  success: 'pronto',
  error: 'algo falhou',
};

/**
 * O campo de partículas do OAZE. Abstrato de propósito: é o sistema pensando,
 * não um personagem (decisão D3). Substitui o indicador-mascote em todo lugar
 * onde a interface precisa dizer "estou trabalhando".
 *
 * Custo: um `<canvas>`, nenhum laço próprio (usa o agendador compartilhado) e
 * zero trabalho quando o campo sai da tela ou a aba fica escondida.
 */
export function OazeIntelligence({
  state = 'idle',
  size = 72,
  level = 0,
  seed = 20261006,
  label,
  className,
}: OazeIntelligenceProps) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  /* refs porque o laço de animação não deve remontar a cada quadro nem a cada
     caractere digitado no campo de texto */
  const live = useRef({ state, level, revertAt: 0 });
  const kickRef = useRef<(() => void) | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const prev = live.current.state;
    live.current.state = state;
    const hold = TRANSIENT[state];
    live.current.revertAt = hold ? performance.now() + hold : 0;
    if (state === 'error' && prev !== 'error') kickRef.current?.();
  }, [state]);

  useEffect(() => {
    live.current.level = level;
  }, [level]);

  useEffect(() => {
    const el = canvas.current;
    const box = host.current;
    if (!el || !box) return;

    /* teto de 2 em telas de densidade 3: o terceiro pixel não se vê e custa
       45 % mais área para pintar */
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = Math.round(size * dpr);
    el.height = Math.round(size * dpr);
    const ctx = el.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const particles = createParticles(countFor(size), seed);
    kickRef.current = () => kick(particles, 0.24, seed + 1);

    const theme = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    const colorFor = (s: FieldState) => {
      const c = PARTICLE_COLORS[theme()];
      if (s === 'error') return c.danger;
      if (s === 'success') return c.core;
      return c.core;
    };

    const half = size / 2;
    /* raio útil: deixa margem para o halo não ser cortado na borda */
    const span = half * 0.78;
    const dot = Math.max(0.9, size * 0.021);

    const draw = () => {
      const s = live.current.state;
      const base = colorFor(s);
      const halo = PARTICLE_COLORS[theme()].halo;
      ctx.clearRect(0, 0, size, size);
      ctx.globalCompositeOperation = 'lighter';
      for (const q of particles) {
        const x = half + q.x * span;
        const y = half + q.y * span;
        const r = dot * q.size;
        /* o halo é o que dá a sensação de luz, e sai em dois passos: núcleo
           opaco pequeno, auréola grande e fraca */
        ctx.globalAlpha = q.alpha * 0.16;
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y, r * 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = q.alpha;
        ctx.fillStyle = base;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    if (reduced) {
      /* quem pediu menos movimento recebe o campo em repouso, não um retângulo
         vazio: a informação "existe inteligência aqui" continua na tela */
      settle(particles, live.current.state);
      draw();
      return () => {
        kickRef.current = null;
      };
    }

    let leave: (() => void) | null = null;
    const tick = (t: number, dt: number) => {
      const now = performance.now();
      if (live.current.revertAt && now >= live.current.revertAt) {
        live.current.state = 'idle';
        live.current.revertAt = 0;
      }
      step(particles, live.current.state, t, dt, { level: live.current.level });
      draw();
    };

    /* fora da tela, nada anima — rolar uma lista com dez campos não deve
       custar dez simulações */
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting && !leave) leave = subscribe(tick);
        else if (!entry.isIntersecting && leave) {
          leave();
          leave = null;
        }
      },
      { threshold: 0.01 },
    );
    io.observe(box);

    return () => {
      io.disconnect();
      leave?.();
      kickRef.current = null;
    };
  }, [size, seed, reduced]);

  return (
    <div
      ref={host}
      className={className ? `oz-field ${className}` : 'oz-field'}
      style={{ width: size, height: size }}
      data-state={state}
      role={label === null ? 'presentation' : 'img'}
      aria-label={label === null ? undefined : (label ?? SPOKEN[state])}
    >
      <canvas ref={canvas} style={{ width: size, height: size }} aria-hidden="true" />
    </div>
  );
}
