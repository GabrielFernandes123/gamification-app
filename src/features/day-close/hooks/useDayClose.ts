import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';

/** Espelha `gamificacao-api/src/day-close/day-close.service.ts`. */

export type HabitAnswer = 'done' | 'not_done' | 'avoided' | 'relapsed';

export type DayCloseStatus = {
  day: string;
  today: string;
  status: 'open' | 'closed_manual' | 'closed_deadline';
  closedAt: string | null;
  deadlineAt: string;
  deadlinePassed: boolean;
  settings: {
    deadline_hour: number;
    earliest_close_hour: number;
    reminder_time: string | null;
    event_driven: boolean;
  };
};

export type DayClosePendingHabit = {
  id: string;
  title: string;
  realName: string;
  type: 'positive' | 'negative';
  schedule: string;
  done: number;
  target: number;
  damageIfMissed: number;
  allowed: HabitAnswer[];
};

export type DayClosePending = DayCloseStatus & {
  canCloseNow: boolean;
  habits: DayClosePendingHabit[];
  screen: { minutes: number; overMinutes: number; goldCharged: number };
  challenges: { id: string; title: string; ends_on: string }[];
  danger: {
    total: number;
    hpAfter: number;
    lethal: boolean;
    hp: { current: number; max: number };
  } | null;
};

export const dayCloseOpenKey = ['dayCloseOpen'] as const;
export const dayClosePendingKey = (day?: string) =>
  ['dayClosePending', day ?? 'hoje'] as const;

/** Os dias ainda abertos — é o que faz a faixa da Início aparecer ou sumir. */
export function useDayCloseOpen() {
  return useQuery({
    queryKey: dayCloseOpenKey,
    staleTime: 30_000,
    queryFn: () => apiFetch<DayCloseStatus[]>('/day-close/open'),
  });
}

export function useDayClosePending(day?: string, enabled = true) {
  return useQuery({
    queryKey: dayClosePendingKey(day),
    enabled,
    queryFn: () =>
      apiFetch<DayClosePending>(`/day-close/pending${day ? `?day=${day}` : ''}`),
  });
}

/**
 * Fechar mexe em HP, XP, ouro, sequências e em tudo que a Início mostra.
 * Invalida o cache inteiro em vez de listar chaves: é uma ação rara e
 * deliberada, e esquecer uma chave aqui deixaria número velho na tela logo
 * depois do momento em que o usuário mais confere.
 */
export function useCloseDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      day?: string;
      habits?: Record<string, HabitAnswer>;
      mood?: number | null;
      note?: string | null;
    }) => apiFetch('/day-close', { method: 'POST', body }),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
