import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { BossTier } from '@/types/season';

// POST /seasons/boss/spend-charges (boss-engine spendCharges): gasta cargas
// acumuladas contra a fase ativa de um boss de tier superior (nunca o mensal).
export type SpendChargesResult = {
  tier: BossTier;
  chargesSpent: number;
  chargesLeft: number;
  damage: number;
  bossCurrentHp: number;
  defeated: boolean;
};

export function useSpendBossCharges() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { tier: Exclude<BossTier, 'mensal'>; amount?: number }) =>
      apiFetch<SpendChargesResult>('/seasons/boss/spend-charges', {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.seasonStory });
      qc.invalidateQueries({ queryKey: qk.currentSeason });
      qc.invalidateQueries({ queryKey: qk.seasonSaga });
    },
  });
}
