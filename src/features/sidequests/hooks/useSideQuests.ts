import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/Toast';
import type { UnlockedMap } from '@/features/achievements/useAchievements';
import type { Character } from '@/features/character/hooks/useCharacter';
import { showBossProgressToast } from '@/features/season/bossFeedback';
import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Database } from '@/types/db';
import type { SideQuestResult } from '@/types/rpc';

export type SideQuest = Database['public']['Tables']['side_quests']['Row'];
export type SideQuestInsert = Database['public']['Tables']['side_quests']['Insert'];
export type SideQuestUpdate = Database['public']['Tables']['side_quests']['Update'];

export function useSideQuests() {
  return useQuery({
    queryKey: qk.sideQuests,
    queryFn: () => apiFetch<SideQuest[]>('/sidequests'),
  });
}

export function useCreateSideQuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<SideQuestInsert, 'user_id'>) =>
      apiFetch<SideQuest>('/sidequests', { method: 'POST', body: payload }),
    onSuccess: (created) => {
      qc.setQueryData<SideQuest[]>(qk.sideQuests, (current) => [
        created,
        ...(current ?? []),
      ]);
      qc.invalidateQueries({ queryKey: qk.sideQuests, refetchType: 'inactive' });
    },
  });
}

export function useUpdateSideQuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: SideQuestUpdate }) =>
      apiFetch<SideQuest>(`/sidequests/${id}`, { method: 'PATCH', body: patch }),
    onSuccess: (updated) => {
      qc.setQueryData<SideQuest[]>(qk.sideQuests, (current) =>
        current?.map((quest) => (quest.id === updated.id ? updated : quest)),
      );
      qc.invalidateQueries({ queryKey: qk.sideQuests, refetchType: 'inactive' });
    },
  });
}

export function useDeleteSideQuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/sidequests/${id}`, { method: 'DELETE' }),
    onSuccess: (_result, id) => {
      qc.setQueryData<SideQuest[]>(qk.sideQuests, (current) =>
        current?.filter((quest) => quest.id !== id),
      );
      qc.invalidateQueries({ queryKey: qk.sideQuests, refetchType: 'inactive' });
    },
  });
}

export function useCompleteSideQuest() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiFetch<SideQuestResult>(`/sidequests/${id}/complete`, { method: 'POST' });
    },
    onSuccess: (data, id) => {
      showBossProgressToast(toast, data.bossProgress);
      qc.setQueryData<SideQuest[]>(qk.sideQuests, (current) =>
        current?.map((quest) =>
          quest.id === id
            ? {
                ...quest,
                is_completed: true,
                completed_at: new Date().toISOString(),
                xp_gained: data.xpGained,
                gold_gained: data.goldGained,
              }
            : quest,
        ),
      );
      qc.setQueryData<Character>(qk.character, (current) =>
        current
          ? {
              ...current,
              total_xp: Math.max(0, Number(current.total_xp) + data.xpGained),
              gold: Math.max(0, Number(current.gold) + data.goldGained),
              ...(data.leveledUp ? { level: data.newLevel } : null),
            }
          : current,
      );
      addAchievements(qc, data.newAchievements);
      qc.invalidateQueries({ queryKey: qk.habitLogsRoot, refetchType: 'inactive' });
      qc.invalidateQueries({ queryKey: qk.currentSeason, refetchType: 'inactive' });
    },
  });
}

function addAchievements(qc: ReturnType<typeof useQueryClient>, keys: string[] | undefined) {
  if (!keys?.length) return;
  const unlockedAt = new Date().toISOString();
  qc.setQueryData<UnlockedMap>(qk.achievements, (current) => {
    const next = { ...(current ?? {}) };
    for (const key of keys) next[key] = next[key] ?? unlockedAt;
    return next;
  });
}
