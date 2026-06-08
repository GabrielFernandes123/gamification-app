import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Database } from '@/types/db';

export type Character = Database['public']['Tables']['characters']['Row'] & {
  /** Dias consecutivos com >=1 evento positivo no ledger (02 §6). */
  character_streak?: number;
};
export type Profile = Database['public']['Tables']['profiles']['Row'];

export function useCharacter() {
  return useQuery({
    queryKey: qk.character,
    queryFn: async (): Promise<Character> => {
      return apiFetch<Character>('/character');
    },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: qk.profile,
    queryFn: async (): Promise<Profile> => {
      return apiFetch<Profile>('/profile');
    },
  });
}
