import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/Toast';
import { showBossProgressToast } from '@/features/season/bossFeedback';
import { useToday } from '@/hooks/useToday';
import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { UnlockedMap } from '@/features/achievements/useAchievements';
import type { Character } from '@/features/character/hooks/useCharacter';
import type {
  CompleteHabitResult,
  RelapseResult,
  SettleTodayResult,
  UndoResult,
} from '@/types/rpc';
import type { Habit } from './useHabits';
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

function invalidateHabitActivity(qc: ReturnType<typeof useQueryClient>, today: string) {
  qc.invalidateQueries({ queryKey: qk.habits });
  qc.invalidateQueries({ queryKey: qk.todayLogs(today) });
  qc.invalidateQueries({ queryKey: qk.periodLogs(today) });
  qc.invalidateQueries({ queryKey: qk.habitLogsRoot });
  qc.invalidateQueries({ queryKey: qk.currentSeason, refetchType: 'inactive' });
  qc.invalidateQueries({ queryKey: qk.notificationSnapshot });
}

function patchCharacter(
  qc: ReturnType<typeof useQueryClient>,
  patch: (current: Character) => Character,
) {
  qc.setQueryData<Character>(qk.character, (current) => (current ? patch(current) : current));
}

function addCharacterReward(qc: ReturnType<typeof useQueryClient>, data: CompleteHabitResult | SettleTodayResult) {
  const xp = 'xpGained' in data ? data.xpGained : data.xp ?? 0;
  const gold = 'goldGained' in data ? data.goldGained : data.gold ?? 0;
  if (xp === 0 && gold === 0) return;

  patchCharacter(qc, (current) => ({
    ...current,
    total_xp: Math.max(0, Number(current.total_xp) + xp),
    gold: Math.max(0, Number(current.gold) + gold),
    ...('newLevel' in data && data.leveledUp ? { level: data.newLevel } : null),
    ...('characterStreak' in data && data.characterStreak !== undefined
      ? { character_streak: data.characterStreak }
      : null),
  }));
}

function addAchievements(qc: ReturnType<typeof useQueryClient>, keys: string[] | undefined) {
  if (!keys?.length) return;
  const unlockedAt = new Date().toISOString();
  qc.setQueryData<UnlockedMap>(qk.achievements, (current) => {
    const next = { ...(current ?? {}) };
    for (const key of keys) next[key] = next[key] ?? unlockedAt;
    return next;
  });
}

function patchHabitStreak(qc: ReturnType<typeof useQueryClient>, habitId: string, streak: number) {
  qc.setQueryData<Habit[]>(qk.habits, (current) =>
    current?.map((habit) =>
      habit.id === habitId ? { ...habit, current_streak: streak } : habit,
    ),
  );
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
    onSuccess: (data, variables) => {
      showBossProgressToast(toast, data.bossProgress);
      addCharacterReward(qc, data);
      addAchievements(qc, data.newAchievements);
      patchHabitStreak(qc, variables.habitId, data.newStreak);
    },
    onSettled: () => invalidateHabitActivity(qc, today),
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
    onSuccess: (data) => {
      if (data.damageTaken > 0) {
        patchCharacter(qc, (current) => ({
          ...current,
          current_hp: Math.max(0, Number(current.current_hp) - data.damageTaken),
        }));
      }
      if (data.died) qc.invalidateQueries({ queryKey: qk.character });
    },
    onSettled: () => invalidateHabitActivity(qc, today),
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
    onSuccess: (data, variables) => {
      if (data.alreadySettled) return;

      qc.setQueryData<HabitLog[]>(qk.todayLogs(today), (current) => [
        ...(current ?? []),
        {
          ...syntheticLog(variables.habitId, today, data.resisted ?? false, 0),
          is_auto: true,
          xp_gained: data.xp ?? 0,
          gold_gained: data.gold ?? 0,
          damage_taken: data.damage ?? 0,
        },
      ]);
      addCharacterReward(qc, data);
      if ((data.damage ?? 0) > 0) {
        patchCharacter(qc, (current) => ({
          ...current,
          current_hp: Math.max(0, Number(current.current_hp) - Number(data.damage ?? 0)),
        }));
      }
      if (data.died) qc.invalidateQueries({ queryKey: qk.character });
    },
    onSettled: () => invalidateHabitActivity(qc, today),
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
      if (last) {
        patchCharacter(qc, (current) => ({
          ...current,
          total_xp: Math.max(0, Number(current.total_xp) - Number(last.xp_gained ?? 0)),
          gold: Math.max(0, Number(current.gold) - Number(last.gold_gained ?? 0)),
          current_hp: Math.min(
            Number(current.max_hp),
            Number(current.current_hp) + Number(last.damage_taken ?? 0),
          ),
        }));
      }
      return { prev, key, removedLog: last };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(ctx.key, ctx.prev);
      if (ctx?.removedLog) qc.invalidateQueries({ queryKey: qk.character });
    },
    onSuccess: (data, variables) => {
      patchHabitStreak(qc, variables.habitId, data.restoredStreak);
    },
    onSettled: () => invalidateHabitActivity(qc, today),
  });
}
