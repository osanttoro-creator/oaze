/*
  Um `requestAnimationFrame` para todos os campos de partículas vivos na tela.

  Por que isso importa: o campo aparece no botão da inteligência, no cabeçalho do
  painel de conversa e em cada sugestão pendente. Com uma rAF por instância, seis
  campos custam seis laços e seis acordadas do compositor por quadro. Com um laço
  só, custam um. Em celular isso é bateria, não elegância.

  O laço para por completo — não "roda vazio" — quando não há inscrito, quando a
  aba está escondida e quando o aparelho avisa que está economizando energia.
*/

export type Tick = (t: number, dt: number) => void;

const subs = new Set<Tick>();
let raf = 0;
let last = 0;
/** 1/30 s: o teto evita o salto de posição quando a aba volta do segundo plano. */
const MAX_DT = 1 / 30;

function frame(now: number): void {
  const dt = last ? Math.min(MAX_DT, (now - last) / 1000) : 1 / 60;
  last = now;
  const t = now / 1000;
  subs.forEach((fn) => fn(t, dt));
  raf = subs.size ? requestAnimationFrame(frame) : 0;
}

function start(): void {
  if (raf || !subs.size || document.visibilityState === 'hidden') return;
  last = 0;
  raf = requestAnimationFrame(frame);
}

function stop(): void {
  if (!raf) return;
  cancelAnimationFrame(raf);
  raf = 0;
}

let installed = false;

function install(): void {
  if (installed) return;
  installed = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stop();
    else start();
  });
}

/** Devolve a função de saída. Sempre chamar na limpeza do efeito. */
export function subscribe(fn: Tick): () => void {
  install();
  subs.add(fn);
  start();
  return () => {
    subs.delete(fn);
    if (!subs.size) stop();
  };
}

/** Só para teste: quantos campos estão realmente animando agora. */
export function activeCount(): number {
  return subs.size;
}
