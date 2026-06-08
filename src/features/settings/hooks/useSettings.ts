import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Habit } from '@/features/habits/hooks/useHabits';
import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: { display_name?: string | null; timezone?: string }) =>
      apiFetch('/profile', { method: 'PATCH', body: patch }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.profile }),
  });
}

export function useUpdateGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: {
      daily_xp_goal?: number;
      daily_gold_goal?: number;
      death_mode?: string;
    }) => apiFetch('/character/goals', { method: 'PATCH', body: patch }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.character }),
  });
}

export function useInactiveHabits() {
  return useQuery({
    queryKey: qk.inactiveHabits,
    queryFn: () => apiFetch<Habit[]>('/habits/inactive'),
  });
}

export function useReactivateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/habits/${id}`, { method: 'PATCH', body: { is_active: true } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.habits });
      qc.invalidateQueries({ queryKey: qk.inactiveHabits });
    },
  });
}
