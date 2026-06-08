import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Database } from '@/types/db';

export type HabitRow = Database['public']['Tables']['habits']['Row'];
export type HabitType = Database['public']['Enums']['habit_type'];
export type Difficulty = Database['public']['Enums']['difficulty'];
export type ScheduleType = Database['public']['Enums']['schedule_type'];

export type SkillBrief = { id: string; name: string; color: string | null };
export type Habit = HabitRow & {
  primarySkill: SkillBrief | null;
  secondarySkill: SkillBrief | null;
};

export function useHabits() {
  return useQuery({
    queryKey: qk.habits,
    queryFn: async (): Promise<Habit[]> => {
      return apiFetch<Habit[]>('/habits');
    },
  });
}
