import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

export type UnlockedMap = Record<string, string>;

export function useAchievements() {
  return useQuery({
    queryKey: qk.achievements,
    queryFn: async (): Promise<UnlockedMap> => {
      await apiFetch<string[]>('/achievements/evaluate', { method: 'POST' });
      const data = await apiFetch<{ achievement_key: string; unlocked_at: string }[]>('/achievements');
      const map: UnlockedMap = {};
      (data ?? []).forEach((r) => {
        map[r.achievement_key] = r.unlocked_at;
      });
      return map;
    },
  });
}
