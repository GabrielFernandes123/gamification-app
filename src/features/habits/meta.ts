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

// Meta "de manchete" mostrada na ficha: dias no período (flexível) ou meta
// diária (dias fixos).
export function periodTarget(habit: Habit): number {
  if (habit.schedule === 'weekly_count') return habit.weekly_target ?? 1;
  if (habit.schedule === 'monthly') return habit.monthly_target ?? 1;
  return dailyTarget(habit);
}

export function scheduleDescription(habit: Habit): string {
  const dt = dailyTarget(habit);
  // rótulo da meta diária: sempre no negativo (é o limite); no positivo só se > 1
  const daily =
    habit.type === 'negative' ? `limite ${dt}/dia` : dt > 1 ? `${dt}×/dia` : null;
  const base =
    habit.schedule === 'weekdays'
      ? formatWeekdays(habit.weekdays)
      : habit.schedule === 'weekly_count'
        ? `${habit.weekly_target ?? 1} dias/semana`
        : `${habit.monthly_target ?? 1} dias/mês`;
  return daily ? `${base} · ${daily}` : base;
}

// Hábito "vale hoje"? (só weekdays tem dia específico; outros sempre)
export function isDueToday(habit: Habit, weekday: number): boolean {
  if (habit.schedule !== 'weekdays') return true;
  return (habit.weekdays ?? []).includes(weekday);
}
