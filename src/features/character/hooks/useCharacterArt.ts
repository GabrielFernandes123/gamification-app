import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

/**
 * Avatar do personagem: regeneração SEMPRE manual (decisão de design) — o
 * retrato nunca muda sozinho ao subir de nível ou trocar equipamento.
 *
 * Diferente do resto da arte (assíncrona, via cron), a chamada é síncrona de
 * propósito: você está olhando a tela esperando o retrato novo.
 */
export function useRegenerateCharacterArt() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ imageUrl: string | null }> => {
      return apiFetch<{ imageUrl: string | null }>('/art/character/regenerate', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.character });
    },
  });
}
