import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

/** Espelha `gamificacao-api/src/plan/plan.service.ts`. */

export type DailyPlan = {
  id: string;
  planOn: string;
  plannedHabits: number;
  note: string | null;
  actualHabits: number | null;
  accuracy: string | null;
  closedAt: string | null;
};

export type Truce = {
  id: string;
  startedOn: string;
  endsOn: string | null;
  reason: string | null;
};

export type PlanToday = {
  day: string;
  plan: DailyPlan | null;
  /** Hábitos positivos já concluídos hoje. */
  completed: number;
  /** Quantos valem hoje — a sugestão ao lado do campo. */
  due: number;
  truce: Truce | null;
};

export function usePlanToday() {
  return useQuery({
    queryKey: qk.planToday,
    queryFn: () => apiFetch<PlanToday>('/plan/today'),
  });
}

export function useSetPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { plannedHabits: number; note?: string }) =>
      apiFetch<{ id: string; planOn: string }>('/plan', {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.planToday }),
  });
}

export function useStartTruce() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { endsOn?: string; reason?: string }) =>
      apiFetch<Truce>('/plan/truce', { method: 'POST', body: input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.planToday }),
  });
}

export function useEndTruce() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ ended: string }>('/plan/truce', { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.planToday }),
  });
}
