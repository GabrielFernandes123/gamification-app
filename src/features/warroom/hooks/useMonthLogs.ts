import { useQuery } from '@tanstack/react-query';

import type { HabitLog } from '@/features/habits/hooks/useTodayLogs';
import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import { monthRange } from '../month';

export function useMonthLogs(month: string) {
  const { start, end } = monthRange(month);
  return useQuery({
    queryKey: qk.monthLogs(month),
    queryFn: async (): Promise<HabitLog[]> => {
      return apiFetch<HabitLog[]>(`/habits/logs?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
    },
  });
}
