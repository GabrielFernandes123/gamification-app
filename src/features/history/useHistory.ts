import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';

export type HistoryEvent = {
  /** gain = ledger · fail = hábito falhado · damage = HP perdido · heal = HP recuperado */
  kind: 'gain' | 'fail' | 'damage' | 'heal';
  id: string;
  sourceType: string;
  sourceId: string | null;
  xp: number;
  gold: number;
  essencia: number;
  occurredOn: string;
  meta: Record<string, unknown> | null;
  label: string | null;
};

/** Histórico unificado lido do ledger (economy_events) + falhas de hábito. */
export function useHistory(start: string, end: string) {
  return useQuery({
    queryKey: ['history', start, end] as const,
    queryFn: async (): Promise<HistoryEvent[]> => {
      return apiFetch<HistoryEvent[]>(
        `/history?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      );
    },
  });
}
