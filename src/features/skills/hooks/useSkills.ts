import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Database } from '@/types/db';

export type Skill = Database['public']['Tables']['skills']['Row'];

export function useSkills() {
  return useQuery({
    queryKey: qk.skills,
    queryFn: () => apiFetch<Skill[]>('/skills'),
  });
}
