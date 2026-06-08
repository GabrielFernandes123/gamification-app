import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { CharacterClass } from '../classes';

/** Escolhe/troca a classe (POST /build/class). 1ª vez grátis; respec custa Essência. */
export function useSelectClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ klass }: { klass: CharacterClass }) => {
      return apiFetch<{ class: CharacterClass; essenciaSpent: number }>(
        '/build/class',
        { method: 'POST', body: { class: klass } },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.character });
      qc.invalidateQueries({ queryKey: qk.attributes });
    },
  });
}
