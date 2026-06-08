import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Database } from '@/types/db';

export type RewardInsert = Database['public']['Tables']['rewards']['Insert'];
export type RewardUpdate = Database['public']['Tables']['rewards']['Update'];

export function useCreateReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<RewardInsert, 'user_id'>) =>
      apiFetch('/store/rewards', { method: 'POST', body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.rewards }),
  });
}

export function useUpdateReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: RewardUpdate }) =>
      apiFetch(`/store/rewards/${id}`, { method: 'PATCH', body: patch }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.rewards }),
  });
}

export function useDeleteReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/store/rewards/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.rewards }),
  });
}
