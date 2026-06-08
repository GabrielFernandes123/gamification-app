import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/Toast';
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
      apiFetch('/sidequests', { method: 'POST', body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sideQuests }),
  });
}

export function useUpdateSideQuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: SideQuestUpdate }) =>
      apiFetch(`/sidequests/${id}`, { method: 'PATCH', body: patch }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sideQuests }),
  });
}

export function useDeleteSideQuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/sidequests/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sideQuests }),
  });
}

export function useCompleteSideQuest() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiFetch<SideQuestResult>(`/sidequests/${id}/complete`, { method: 'POST' });
    },
    onSuccess: (data) => {
      showBossProgressToast(toast, data.bossProgress);
      qc.invalidateQueries({ queryKey: qk.sideQuests });
      qc.invalidateQueries({ queryKey: qk.character });
      qc.invalidateQueries({ queryKey: qk.achievements });
      qc.invalidateQueries({ queryKey: qk.habitLogsRoot });
      qc.invalidateQueries({ queryKey: qk.currentSeason });
    },
  });
}
