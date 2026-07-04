import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { AttributeTotals } from '@/types/build';

/** Totais dos 4 atributos com breakdown por fonte (GET /build/attributes). */
export function useAttributes() {
  return useQuery({
    queryKey: qk.attributes,
    queryFn: async (): Promise<AttributeTotals> => {
      return apiFetch<AttributeTotals>('/build/attributes');
    },
  });
}

/** Custo em Essência do respec de pontos (boss-engine RESPEC_POINTS_ESSENCIA_COST). */
export const RESPEC_POINTS_ESSENCIA_COST = 50;

export type RespecAttributePointsResult = {
  essenciaSpent: number;
  pending: number;
};

/**
 * POST /build/attribute-points/respec — zera os pontos de boss alocados
 * (custa Essência) e devolve tudo como pontos pendentes para realocar.
 */
export function useRespecAttributePoints() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<RespecAttributePointsResult>('/build/attribute-points/respec', {
        method: 'POST',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.attributes });
      qc.invalidateQueries({ queryKey: qk.character });
      qc.invalidateQueries({ queryKey: qk.currentSeason });
      qc.invalidateQueries({ queryKey: qk.seasonStory });
    },
  });
}
