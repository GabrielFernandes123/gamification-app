import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Database } from '@/types/db';

export type Character = Database['public']['Tables']['characters']['Row'] & {
  /** Dias consecutivos com >=1 evento positivo no ledger (02 §6). */
  character_streak?: number;
  /** Avatar gerado por IA; só muda por regeneração manual. */
  image_url?: string | null;
  /** Fração de ouro perdida enquanto há nêmese solta (14 §5.2⑤); 0 sem nêmese. */
  nemesis_penalty?: number;
  /** Quem está cobrando — para nomear a dívida em vez de só mostrar o número. */
  nemeses?: { id: string; name: string; epithet: string | null }[];
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
