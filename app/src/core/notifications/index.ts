import type { Workspace } from '../../domain/types';
import { notifications, type ScheduledNotification } from '../../platform/native';
import type { NotifPrivacy, Settings } from '../../state/store';

/*
  Lembretes — P4 da auditoria: a tela existia e nada era agendado.

  Duas decisões de produto embutidas aqui:

  1. **A privacidade do aviso é escolha da pessoa.** O padrão é `sem`: nenhum
     valor na tela de bloqueio. Quem quiser pode subir para `generico` ("uma
     fatura fecha amanhã") ou `valores` ("fatura do Nubank: R$ 1.240,00"). O
     aviso aparece na tela de bloqueio de qualquer aparelho, inclusive na mão de
     outra pessoa — e o padrão tem de proteger quem não mexeu em nada.

  2. **Permissão só com contexto.** `ensurePermission` é chamada quando a pessoa
     LIGA um lembrete, nunca no primeiro arranque. Pedir antes de explicar é
     como se perde a permissão para sempre.
*/

const HORIZON_DAYS = 30;

/** Ids determinísticos: reagendar substitui, não acumula. */
function idFor(tag: string, iso: string): number {
  let h = 0;
  for (const ch of `${tag}:${iso}`) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h) % 2_000_000;
}

function money(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/*
  Os três níveis, nos mesmos nomes que a tela Lembretes mostra:

  - `generico` — nem o nome: "Você tem um vencimento em breve no OAZE";
  - `sem`      — nome e data, **sem valor** (é o padrão);
  - `valores`  — nome, data e valor.

  O padrão é `sem` porque o aviso aparece na tela de bloqueio, às vezes na mão de
  outra pessoa, e quem não mexeu em nada precisa estar protegido.
*/
function phrase(
  privacy: NotifPrivacy,
  text: { generic: string; named: string; detailed: string },
): { title: string; body: string } {
  if (privacy === 'generico') return { title: 'OAZE', body: text.generic };
  if (privacy === 'valores') return { title: 'OAZE', body: text.detailed };
  return { title: 'OAZE', body: text.named };
}

function at(date: Date, hour: number): Date {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/**
 * Monta a agenda dos próximos 30 dias a partir do espaço. Função pura — recebe
 * `now` para o teste poder congelar o tempo.
 */
export function planReminders(space: Workspace, settings: Settings, now = new Date()): ScheduledNotification[] {
  const out: ScheduledNotification[] = [];
  const { reminders, reminderHour, notifPrivacy } = settings;
  const limit = new Date(now);
  limit.setDate(limit.getDate() + HORIZON_DAYS);

  if (reminders.fatura) {
    for (const card of space.cards) {
      if (card.archived) continue;
      /* um dia antes do vencimento: no dia já é tarde para providenciar dinheiro */
      for (let m = 0; m < 2; m++) {
        const due = new Date(now.getFullYear(), now.getMonth() + m, card.dueDay);
        const warn = at(new Date(due.getTime() - 86_400_000), reminderHour);
        if (warn <= now || warn > limit) continue;
        const total = space.transactions
          .filter((t) => t.cardId === card.id && t.confirmed)
          .reduce((sum, t) => sum + t.amount, 0);
        const text = phrase(notifPrivacy, {
          generic: 'Você tem um vencimento em breve no OAZE.',
          named: `A fatura do ${card.name} vence amanhã.`,
          detailed: `Fatura do ${card.name} vence amanhã: ${money(total)}.`,
        });
        out.push({ id: idFor(`fatura:${card.id}`, warn.toISOString()), ...text, schedule: { at: warn, allowWhileIdle: true } });
      }
    }
  }

  if (reminders.fixa) {
    const fixed = space.transactions.filter((t) => t.recurring);
    for (const t of fixed) {
      for (let m = 0; m < 2; m++) {
        const day = Number(t.date.slice(8, 10));
        const when = at(new Date(now.getFullYear(), now.getMonth() + m, day), reminderHour);
        if (when <= now || when > limit) continue;
        const text = phrase(notifPrivacy, {
          generic: 'Você tem um lembrete no OAZE.',
          named: `${t.description} é hoje.`,
          detailed: `${t.description} hoje: ${money(t.amount)}.`,
        });
        out.push({ id: idFor(`fixa:${t.id}`, when.toISOString()), ...text, schedule: { at: when } });
      }
    }
  }

  /* teto: um app que agenda centenas de avisos é desinstalado */
  return out.sort((a, b) => a.schedule.at.getTime() - b.schedule.at.getTime()).slice(0, 48);
}

export async function ensurePermission(): Promise<boolean> {
  const n = notifications();
  if (!n.available) return false;
  if (await n.granted()) return true;
  return n.request();
}

/** Reagenda tudo. Chamado quando o espaço muda ou as preferências mudam. */
export async function reschedule(space: Workspace, settings: Settings): Promise<void> {
  const n = notifications();
  if (!n.available) return;
  const anyOn = settings.reminders.fatura || settings.reminders.fixa || settings.reminders.rec;
  if (!anyOn || !(await n.granted())) {
    await n.cancelAll();
    return;
  }
  await n.schedule(planReminders(space, settings));
}
