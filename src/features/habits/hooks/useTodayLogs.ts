import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Database } from '@/types/db';
import type { Habit } from './useHabits';

export type HabitLog = Database['public']['Tables']['habit_logs']['Row'];

export function useTodayLogs(today: string) {
  return useQuery({
    queryKey: qk.todayLogs(today),
    queryFn: async (): Promise<HabitLog[]> => {
      return apiFetch<HabitLog[]>(`/habits/logs?date=${encodeURIComponent(today)}`);
    },
  });
}

const DAY_MS = 86_400_000;
const isoOf = (d: Date) => d.toISOString().slice(0, 10);

/** Início da janela a buscar: o mais antigo entre o domingo da semana e o dia 1
 *  do mês — cobre os dois tipos de período flexível num único fetch. */
function periodFetchStart(today: string): string {
  const d = new Date(`${today}T00:00:00Z`);
  const weekStart = new Date(d.getTime() - d.getUTCDay() * DAY_MS);
  const monthStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  return isoOf(weekStart < monthStart ? weekStart : monthStart);
}

/** Logs do período corrente (semana + mês) p/ calcular o progresso de DIAS. */
export function usePeriodLogs(today: string) {
  const start = periodFetchStart(today);
  return useQuery({
    queryKey: qk.periodLogs(today),
    queryFn: async (): Promise<HabitLog[]> =>
      apiFetch<HabitLog[]>(
        `/habits/logs?start=${encodeURIComponent(start)}&end=${encodeURIComponent(today)}`,
      ),
  });
}

export type HabitProgress = {
  success: number;
  fail: number;
  total: number;
  settled: boolean; // dia já fechado (existe log automático hoje)
};

export function habitProgress(logs: HabitLog[] | undefined, habitId: string): HabitProgress {
  const mine = (logs ?? []).filter((l) => l.habit_id === habitId);
  // contagem do dia considera só registros MANUAIS; o auto é o fechamento.
  const manual = mine.filter((l) => !l.is_auto);
  return {
    success: manual.filter((l) => l.success).length,
    fail: manual.filter((l) => !l.success).length,
    total: manual.length,
    settled: mine.some((l) => l.is_auto),
  };
}

export type PeriodProgress = { done: number; target: number; unit: 'semana' | 'mês' };

/** Dias COMPLETOS (positivo) ou RESISTIDOS (negativo) no período corrente, vs a
 *  meta de dias. `null` para hábitos de dias fixos (sem meta de período). */
export function periodDayProgress(
  logs: HabitLog[] | undefined,
  habit: Habit,
  today: string,
): PeriodProgress | null {
  if (habit.schedule === 'weekdays') return null;
  const d = new Date(`${today}T00:00:00Z`);
  const weekly = habit.schedule === 'weekly_count';
  const start = weekly
    ? new Date(d.getTime() - d.getUTCDay() * DAY_MS)
    : new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const target = (weekly ? habit.weekly_target : habit.monthly_target) ?? 1;
  const dailyT = habit.executions_per_day ?? 1;
  const startIso = isoOf(start);

  // contagem de sucesso/recaída por dia, só deste hábito, dentro da janela
  const succ: Record<string, number> = {};
  const fail: Record<string, number> = {};
  for (const l of logs ?? []) {
    if (l.habit_id !== habit.id) continue;
    if (l.occurred_on < startIso || l.occurred_on > today) continue;
    const bucket = l.success ? succ : fail;
    bucket[l.occurred_on] = (bucket[l.occurred_on] ?? 0) + 1;
  }

  let done = 0;
  if (habit.type === 'positive') {
    // dias com execuções de sucesso >= meta diária
    for (const day in succ) if (succ[day] >= dailyT) done++;
  } else {
    // dias resistidos = dias do período (inclui dias sem registro) com recaídas < limite
    for (let t = start.getTime(); t <= d.getTime(); t += DAY_MS) {
      if ((fail[isoOf(new Date(t))] ?? 0) < dailyT) done++;
    }
  }
  return { done, target, unit: weekly ? 'semana' : 'mês' };
}
