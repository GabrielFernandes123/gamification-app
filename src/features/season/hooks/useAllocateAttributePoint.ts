import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { AttributeKey } from '@/features/character/attributes';
import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

type AllocateResult = {
  attributeKey: AttributeKey;
  allocated: number;
  pending: number;
};

export function useAllocateAttributePoint() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (attributeKey: AttributeKey): Promise<AllocateResult> =>
      apiFetch<AllocateResult>('/build/attribute-points/allocate', {
        method: 'POST',
        body: { attributeKey, points: 1 },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.currentSeason });
      qc.invalidateQueries({ queryKey: qk.attributes });
      qc.invalidateQueries({ queryKey: qk.character });
    },
  });
}
