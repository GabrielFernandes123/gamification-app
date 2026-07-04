import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

// Contratos espelhados de gamificacao-api/src/habits/habit-suggestions.service.ts
// (analytics, listLevels, listSuggestions, suggest, apply, dismiss).

export type HabitSuggestionAction = {
  action:
    | 'keep'
    | 'increase_period_target'
    | 'decrease_period_target'
    | 'increase_daily_target'
    | 'decrease_daily_target'
    | 'increase_difficulty'
    | 'decrease_difficulty'
    | 'switch_to_weekly_flexible';
  label: string;
  confidence: number;
  reasonCode: string;
  reason: string;
  patch: Record<string, unknown>;
};

export type HabitDiagnosis =
  | 'insufficient_data'
  | 'too_easy'
  | 'too_hard'
  | 'well_calibrated'
  | 'stable_maintenance'
  | 'inconsistent';

export type HabitMetrics = {
  level: {
    id: string;
    number: number;
    effectiveFrom: string;
    effectiveTo: string | null;
    daysObserved: number;
    periodsCompleted: number;
  };
  habit: {
    type: 'positive' | 'negative';
    difficulty: string;
    schedule: string;
    executionsPerDay: number;
    weeklyTarget: number | null;
    monthlyTarget: number | null;
  };
  totals: {
    evaluatedDays: number;
    successfulDays: number;
    failedDays: number;
    activeDays: number;
    partialDays: number;
    extraDays: number;
    extraExecutions: number;
    extraRelapses: number;
    damageTaken: number;
    xpGained: number;
    goldGained: number;
  };
  rates: {
    successRate: number;
    failureRate: number;
    activeRate: number;
    extraDayRate: number;
    extraExecutionRate: number;
  };
  periods: Array<{
    start: string;
    end: string;
    target: number;
    achieved: number;
    hit: boolean;
    extraDays: number;
  }>;
};

export type HabitAnalytics = {
  metrics: HabitMetrics;
  diagnosis: HabitDiagnosis;
  deterministicSummary: string;
  candidates: HabitSuggestionAction[];
};

export type HabitLevel = {
  id: string;
  levelNumber: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  type: 'positive' | 'negative';
  difficulty: string;
  schedule: string;
  executionsPerDay: number;
  weekdays: number[] | null;
  weeklyTarget: number | null;
  monthlyTarget: number | null;
  primarySkillId: string | null;
  secondarySkillId: string | null;
  changeReason: string | null;
  createdAt: string;
};

export type HabitSuggestion = {
  id: string;
  status: 'pending' | 'applied' | 'dismissed' | string;
  diagnosis: HabitDiagnosis | null;
  primaryAction: HabitSuggestionAction;
  alternatives: HabitSuggestionAction[];
  deterministicSummary: string | null;
  aiSummary: string | null;
  aiModel: string | null;
  createdAt: string;
  decidedAt: string | null;
};

export type GeneratedHabitSuggestion = {
  id: string;
  createdAt: string;
  diagnosis: HabitDiagnosis;
  primaryAction: HabitSuggestionAction;
  alternatives: HabitSuggestionAction[];
  summary: string;
  aiUsed: boolean;
  aiModel?: string | null;
};

export function useHabitAnalytics(habitId: string | undefined) {
  return useQuery({
    queryKey: qk.habitAnalytics(habitId ?? 'none'),
    enabled: !!habitId,
    queryFn: () => apiFetch<HabitAnalytics>(`/habits/${habitId}/analytics`),
  });
}

export function useHabitLevels(habitId: string | undefined) {
  return useQuery({
    queryKey: qk.habitLevels(habitId ?? 'none'),
    enabled: !!habitId,
    queryFn: () => apiFetch<HabitLevel[]>(`/habits/${habitId}/levels`),
  });
}

export function useHabitSuggestions(habitId: string | undefined) {
  return useQuery({
    queryKey: qk.habitSuggestions(habitId ?? 'none'),
    enabled: !!habitId,
    queryFn: () => apiFetch<HabitSuggestion[]>(`/habits/${habitId}/suggestions`),
  });
}

export function useGenerateHabitSuggestion(habitId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<GeneratedHabitSuggestion>(`/habits/${habitId}/suggestions`, {
        method: 'POST',
        body: { useAi: true },
      }),
    onSuccess: () => {
      if (!habitId) return;
      qc.invalidateQueries({ queryKey: qk.habitSuggestions(habitId) });
      qc.invalidateQueries({ queryKey: qk.habitAnalytics(habitId) });
    },
  });
}

export function useApplyHabitSuggestion(habitId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (suggestionId: string) =>
      apiFetch<{ applied: boolean }>(`/habits/${habitId}/suggestions/${suggestionId}/apply`, {
        method: 'POST',
      }),
    onSuccess: () => {
      if (!habitId) return;
      qc.invalidateQueries({ queryKey: qk.habitSuggestions(habitId) });
      qc.invalidateQueries({ queryKey: qk.habitLevels(habitId) });
      qc.invalidateQueries({ queryKey: qk.habitAnalytics(habitId) });
      qc.invalidateQueries({ queryKey: qk.habits });
    },
  });
}

export function useDismissHabitSuggestion(habitId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (suggestionId: string) =>
      apiFetch<{ dismissed: boolean }>(`/habits/${habitId}/suggestions/${suggestionId}/dismiss`, {
        method: 'POST',
      }),
    onSuccess: () => {
      if (!habitId) return;
      qc.invalidateQueries({ queryKey: qk.habitSuggestions(habitId) });
    },
  });
}
