import { theme } from '@/theme/theme';
import { formatWeekdays } from '@/utils/weekday';
import type { Difficulty, Habit, ScheduleType } from './hooks/useHabits';

export const DIFFICULTY_ORDER: Difficulty[] = ['trivial', 'easy', 'medium', 'hard', 'epic'];

export const DIFFICULTY_META: Record<Difficulty, { label: string; color: string }> = {
  trivial: { label: 'Trivial', color: theme.colors.textMuted },
  easy: { label: 'Fácil', color: theme.colors.skill },
  medium: { label: 'Médio', color: theme.colors.xp },
  hard: { label: 'Difícil', color: theme.colors.primary },
  epic: { label: 'Épico', color: theme.colors.hp },
};

export const SCHEDULE_LABEL: Record<ScheduleType, string> = {
  weekdays: 'Dias da semana',
  weekly_count: 'Por semana',
  monthly: 'Por mês',
};

// Meta DIÁRIA: execuções/dia (positivo) ou limite/dia (negativo). Vale para
// todos os agendamentos no modelo de dois níveis.
export function dailyTarget(habit: Habit): number {
  return habit.executions_per_day ?? 1;
}

/**
 * POR QUE O DANO FOI ESSE — a contraparte do aviso que aparece antes do clique.
 *
 * O aviso prévio ("Margem esgotada — a próxima recaída custa +50%") é o que muda
 * comportamento; esta frase é o que ENSINA a regra. Sem ela o toast dizia só
 * "Você tomou 27 de dano", e um número sem causa parece arbitrário — meia volta
 * do laço (varredura de pontas soltas (2026-07-31) §C.3).
 *
 * Nunca recalcula nada: só nomeia o que o servidor já decidiu e devolveu. O
 * multiplicador do escalonamento de propósito NÃO é reproduzido aqui — quem
 * escala o dano é o `relapseDamage` na API, e um número derivado no cliente
 * divergiria dele no primeiro ajuste de balanceamento (doc 08 §0.2).
 */
export function damageExplanation(res: {
  damageTaken: number;
  daysBeyondCeiling?: number;
  cappedByPeriod?: boolean;
  cappedByDay?: boolean;
}): string {
  const base = `Você tomou ${res.damageTaken} de dano`;
  const dias = res.daysBeyondCeiling ?? 0;
  const causas: string[] = [];
  if (dias > 0) {
    causas.push(
      `escalado: ${dias === 1 ? '1 dia' : `${dias} dias`} além do teto do período`,
    );
  }
  // Os dois tetos podem incidir juntos; nomear os dois evita a pergunta "por que
  // tomei menos do que o aviso dizia?".
  if (res.cappedByPeriod) causas.push('o teto do período absorveu o resto');
  if (res.cappedByDay) causas.push('o teto do dia absorveu o resto');
  return causas.length > 0 ? `${base} — ${causas.join('; ')}.` : `${base}.`;
}

export function scheduleDescription(habit: Habit): string {
  const dt = dailyTarget(habit);
  // rótulo da meta diária: sempre no negativo (é o limite); no positivo só se > 1
  const daily =
    habit.type === 'negative' ? `limite ${dt}/dia` : dt > 1 ? `${dt}×/dia` : null;
  // O mesmo campo diz coisas OPOSTAS conforme o tipo (14 §5.3): no positivo é
  // meta de dias a cumprir; no negativo é teto de recaídas toleradas. Escrever
  // "4 dias/semana" num hábito de evitar sugeria três dias liberados.
  const negativoDePeriodo =
    habit.type === 'negative' && habit.schedule !== 'weekdays';
  const base =
    habit.schedule === 'weekdays'
      ? formatWeekdays(habit.weekdays)
      : habit.schedule === 'weekly_count'
        ? negativoDePeriodo
          ? `até ${habit.weekly_target ?? 0} recaídas/semana`
          : `${habit.weekly_target ?? 1} dias/semana`
        : negativoDePeriodo
          ? `até ${habit.monthly_target ?? 0} recaídas/mês`
          : `${habit.monthly_target ?? 1} dias/mês`;
  return daily ? `${base} · ${daily}` : base;
}

// Hábito "vale hoje"? (só weekdays tem dia específico; outros sempre)
export function isDueToday(habit: Habit, weekday: number): boolean {
  if (habit.schedule !== 'weekdays') return true;
  return (habit.weekdays ?? []).includes(weekday);
}
