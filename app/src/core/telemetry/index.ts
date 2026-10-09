/*
  Relatório de erro — P16 da auditoria.

  Uma regra acima de qualquer outra: **nada financeiro sai daqui.** Nem valor,
  nem descrição de lançamento, nem nome de conta, nem e-mail. O que sobe é a
  mensagem do erro, a pilha, a tela em que aconteceu e a plataforma. Um painel
  financeiro que vaza saldo no relatório de erro é pior do que um sem relatório.

  O destino é uma Edge Function (`oaze-erro`), não um provedor terceiro: ligar
  Sentry aqui enviaria a URL inteira — que carrega o hash da rota — e a pilha,
  que carrega nomes de função, para um domínio fora da CSP e fora do acordo de
  tratamento de dados do produto.
*/

import { platform } from '../../platform';

export interface ErrorReport {
  message: string;
  stack: string | null;
  screen: string;
  platform: string;
  env: string;
  at: string;
}

type Sink = (report: ErrorReport) => void;

/* Fila curta em memória: se o erro foi a própria rede, insistir piora. */
const buffer: ErrorReport[] = [];
const MAX = 20;
let sink: Sink | null = null;
let installed = false;

/** Dígito e letra fora do padrão de rota somem: hash de rota não é dado, mas
    não custa nada garantir que nada mais viaje com ela. */
function currentScreen(): string {
  const raw = location.hash.replace(/^#\/?/, '');
  return /^[a-z-]{0,24}$/.test(raw) ? raw || 'inicio' : 'desconhecida';
}

/** Remove o que parece dinheiro, e-mail ou documento de dentro da mensagem. */
export function scrub(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '«e-mail»')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '«documento»')
    .replace(/\bR\$\s?[\d.,]+/g, '«valor»')
    .replace(/\b\d{13,19}\b/g, '«número»')
    .slice(0, 600);
}

function report(message: string, stack?: string | null): void {
  const item: ErrorReport = {
    message: scrub(message),
    stack: stack ? scrub(stack) : null,
    screen: currentScreen(),
    platform: platform(),
    env: import.meta.env.VITE_OAZE_ENV ?? 'development',
    at: new Date().toISOString(),
  };
  if (sink) sink(item);
  else {
    buffer.push(item);
    if (buffer.length > MAX) buffer.shift();
  }
}

export function installErrorReporting(): void {
  if (installed) return;
  installed = true;
  window.addEventListener('error', (e) => report(e.message, e.error?.stack));
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { message?: string; stack?: string } | string;
    report(typeof r === 'string' ? r : (r?.message ?? 'promessa rejeitada'), typeof r === 'string' ? null : r?.stack);
  });
}

/**
 * Liga o destino. Fica desligado por padrão: enviar erro é tratamento de dado e
 * precisa de consentimento, mesmo sendo dado técnico.
 */
export function connectSink(fn: Sink): void {
  sink = fn;
  while (buffer.length) {
    const item = buffer.shift();
    if (item) fn(item);
  }
}

export function pendingReports(): readonly ErrorReport[] {
  return buffer;
}

/** Erro conhecido, reportado de propósito por quem o tratou. */
export function reportHandled(err: unknown, context: string): void {
  const e = err instanceof Error ? err : new Error(String(err));
  report(`${context}: ${e.message}`, e.stack ?? null);
}
