import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

/** Espelha `gamificacao-api/src/habits/habits.service.ts`. */

/**
 * O que o fechamento automático decidiu ONTEM e ainda dá para corrigir.
 *
 * Só entra o que o CRON fechou — ele se identifica sozinho porque roda no dia
 * seguinte, então `created_at` cai depois de `occurred_on`. O que você marcou
 * à mão foi decisão, não esquecimento, e não aparece aqui.
 */
export type YesterdayPending = {
  id: string;
  title: string;
  realName: string;
  type: 'positive' | 'negative';
  schedule: 'weekdays' | 'weekly_count' | 'monthly';
  logId: string;
  occurredOn: string;
  success: boolean;
  xp: number;
  gold: number;
  damage: number;
  streakBefore: number;
};

export const yesterdayKey = ['habitsYesterdayPending'] as const;

export function useYesterdayPending() {
  return useQuery({
    queryKey: yesterdayKey,
    queryFn: () => apiFetch<YesterdayPending[]>('/habits/yesterday-pending'),
  });
}

/**
 * "Eu recaí" de ontem passou a custar o MESMO que recair na hora — mesma função
 * de dano na API (PONTOS-SOLTOS §C.2). Por isso a correção agora devolve também
 * o porquê do número, como o `relapse()` sempre devolveu.
 */
export type CorrectYesterdayResult = {
  corrected: 'done' | 'relapse';
  damage?: number;
  xp?: number;
  daysBeyondCeiling?: number;
  cappedByPeriod?: boolean;
  cappedByDay?: boolean;
};

export function useCorrectYesterday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; outcome: 'done' | 'relapse' }) =>
      apiFetch<CorrectYesterdayResult>(`/habits/${input.id}/correct-yesterday`, {
        method: 'POST',
        body: { outcome: input.outcome },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: yesterdayKey });
      void queryClient.invalidateQueries({ queryKey: qk.habits });
      void queryClient.invalidateQueries({ queryKey: qk.character });
    },
  });
}
