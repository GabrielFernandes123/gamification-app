import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { CurrentSeasonSnapshot } from '@/types/season';

export function useCurrentSeason(tier = 'mensal') {
  return useQuery({
    queryKey: [...qk.currentSeason, tier],
    queryFn: () => apiFetch<CurrentSeasonSnapshot>(`/seasons/current?tier=${tier}`),
  });
}
