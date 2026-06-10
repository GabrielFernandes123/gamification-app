import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

export type UnlockedMap = Record<string, string>;

export function useAchievements() {
  return useQuery({
    queryKey: qk.achievements,
    queryFn: async (): Promise<UnlockedMap> => {
      const data = await apiFetch<{ achievement_key: string; unlocked_at: string }[]>('/achievements');
      const map: UnlockedMap = {};
      (data ?? []).forEach((r) => {
        map[r.achievement_key] = r.unlocked_at;
      });
      return map;
    },
  });
}

export function useEvaluateAchievements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<string[]>('/achievements/evaluate', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.achievements }),
  });
}
