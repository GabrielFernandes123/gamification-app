import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Database } from '@/types/db';

export type HabitInsert = Database['public']['Tables']['habits']['Insert'];
export type HabitUpdate = Database['public']['Tables']['habits']['Update'];

export function useCreateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<HabitInsert, 'user_id'>) =>
      apiFetch('/habits', { method: 'POST', body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.habits });
      qc.invalidateQueries({ queryKey: qk.notificationSnapshot });
    },
  });
}

export function useUpdateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: HabitUpdate }) =>
      apiFetch(`/habits/${id}`, { method: 'PATCH', body: patch }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.habits });
      qc.invalidateQueries({ queryKey: qk.notificationSnapshot });
    },
  });
}

export function useDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/habits/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.habits });
      qc.invalidateQueries({ queryKey: qk.notificationSnapshot });
    },
  });
}
