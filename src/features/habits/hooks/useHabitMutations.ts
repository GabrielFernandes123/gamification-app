import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/Toast';
import { showBossProgressToast } from '@/features/season/bossFeedback';
import { useToday } from '@/hooks/useToday';
import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type {
  CompleteHabitResult,
  RelapseResult,
  SettleTodayResult,
  UndoResult,
} from '@/types/rpc';
import type { HabitLog } from './useTodayLogs';

function syntheticLog(habitId: string, today: string, success: boolean, salt: number): HabitLog {
  return {
    id: `optimistic-${habitId}-${salt}-${Date.now()}`,
    habit_id: habitId,
    user_id: 'optimistic',
    occurred_on: today,
    logged_at: new Date().toISOString(),
    success,
    is_auto: false,
    xp_gained: 0,
    gold_gained: 0,
    damage_taken: 0,
    streak_at_log: 0,
    created_at: new Date().toISOString(),
  };
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>, today: string) {
  qc.invalidateQueries({ queryKey: qk.todayLogs(today) });
  qc.invalidateQueries({ queryKey: qk.periodLogs(today) });
  qc.invalidateQueries({ queryKey: qk.character });
  qc.invalidateQueries({ queryKey: qk.habits });
  qc.invalidateQueries({ queryKey: qk.achievements });
  qc.invalidateQueries({ queryKey: qk.habitLogsRoot });
  qc.invalidateQueries({ queryKey: qk.currentSeason });
}

export function useCompleteHabit() {
  const qc = useQueryClient();
  const toast = useToast();
  const { today } = useToday();
  return useMutation({
    mutationFn: async ({ habitId, count = 1 }: { habitId: string; count?: number }) => {
      return apiFetch<CompleteHabitResult>(`/habits/${habitId}/complete`, {
        method: 'POST',
        body: { count },
      });
    },
    onMutate: async ({ habitId, count = 1 }) => {
      const key = qk.todayLogs(today);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<HabitLog[]>(key);
      const added = Array.from({ length: count }, (_, i) => syntheticLog(habitId, today, true, i));
      qc.setQueryData<HabitLog[]>(key, [...(prev ?? []), ...added]);
      return { prev, key };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(ctx.key, ctx.prev);
    },
    onSuccess: (data) => showBossProgressToast(toast, data.bossProgress),
    onSettled: () => invalidateAll(qc, today),
  });
}

export function useRelapse() {
  const qc = useQueryClient();
  const { today } = useToday();
  return useMutation({
    mutationFn: async ({ habitId }: { habitId: string }) => {
      return apiFetch<RelapseResult>(`/habits/${habitId}/relapse`, { method: 'POST' });
    },
    onMutate: async ({ habitId }) => {
      const key = qk.todayLogs(today);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<HabitLog[]>(key);
      qc.setQueryData<HabitLog[]>(key, [...(prev ?? []), syntheticLog(habitId, today, false, 0)]);
      return { prev, key };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: () => invalidateAll(qc, today),
  });
}

export function useSettleToday() {
  const qc = useQueryClient();
  const { today } = useToday();
  return useMutation({
    mutationFn: async ({ habitId }: { habitId: string }) =>
      apiFetch<SettleTodayResult>(`/habits/${habitId}/settle-today`, {
        method: 'POST',
      }),
    onSettled: () => invalidateAll(qc, today),
  });
}

export function useUndoLast() {
  const qc = useQueryClient();
  const { today } = useToday();
  return useMutation({
    mutationFn: async ({ habitId }: { habitId: string }) => {
      return apiFetch<UndoResult>(`/habits/${habitId}/undo`, { method: 'POST' });
    },
    onMutate: async ({ habitId }) => {
      const key = qk.todayLogs(today);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<HabitLog[]>(key);
      const mine = (prev ?? []).filter((l) => l.habit_id === habitId);
      const last = mine[mine.length - 1];
      if (last) {
        qc.setQueryData<HabitLog[]>(
          key,
          (prev ?? []).filter((l) => l.id !== last.id),
        );
      }
      return { prev, key };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: () => invalidateAll(qc, today),
  });
}
