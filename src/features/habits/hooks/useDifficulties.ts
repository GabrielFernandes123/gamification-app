import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Database } from '@/types/db';

export type DifficultyRow = Database['public']['Tables']['difficulty_levels']['Row'];
export type DifficultyMap = Record<string, DifficultyRow>;

export function useDifficulties() {
  return useQuery({
    queryKey: qk.difficulties,
    staleTime: Infinity,
    queryFn: async (): Promise<DifficultyMap> => {
      const data = await apiFetch<DifficultyRow[]>('/difficulties');
      const map: DifficultyMap = {};
      (data ?? []).forEach((d) => {
        map[d.difficulty] = d;
      });
      return map;
    },
  });
}
