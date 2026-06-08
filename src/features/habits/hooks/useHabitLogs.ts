import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { HabitLog } from './useTodayLogs';

export function useHabitLogs(habitId: string | undefined) {
  return useQuery({
    queryKey: qk.habitLogs(habitId ?? 'missing'),
    enabled: !!habitId,
    queryFn: async (): Promise<HabitLog[]> => {
      const id = habitId as string;
      return apiFetch<HabitLog[]>(`/habits/${id}/logs`);
    },
  });
}
