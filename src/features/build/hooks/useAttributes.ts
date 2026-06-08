import { useQuery } from '@tanstack/react-query';

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
