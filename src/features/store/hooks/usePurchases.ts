import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Reward } from './useStore';

export function usePurchaseSystemItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, habitId }: { itemId: string; habitId?: string }) => {
      return apiFetch<{ message: string; goldSpent: number }>(`/store/system-items/${itemId}/purchase`, {
        method: 'POST',
        body: { habitId },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.character });
      qc.invalidateQueries({ queryKey: qk.activeBuffs });
      qc.invalidateQueries({ queryKey: qk.habits });
      qc.invalidateQueries({ queryKey: qk.purchases });
    },
  });
}

export function usePurchaseReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rewardId }: { rewardId: string }) =>
      apiFetch<{ goldSpent: number; essenciaSpent: number }>(`/store/rewards/${rewardId}/purchase`, {
        method: 'POST',
      }),
    onSuccess: (_result, variables) => {
      qc.setQueryData<Reward[]>(qk.rewards, (current) =>
        current?.map((reward) => {
          if (reward.id !== variables.rewardId) return reward;
          const stock = effectiveStock(reward);
          return {
            ...reward,
            last_purchased_at: new Date().toISOString(),
            current_stock: reward.has_stock ? Math.max(0, stock - 1) : reward.current_stock,
          };
        }),
      );
      qc.invalidateQueries({ queryKey: qk.character });
      qc.invalidateQueries({ queryKey: qk.rewards });
      qc.invalidateQueries({ queryKey: qk.purchases });
    },
  });
}

// O restock (cooldown -> volta ao estoque máximo) é regra de servidor: roda no
// cron horário e de forma lazy no próprio endpoint de compra (store.service). O
// cliente só dispara a compra — sem fallback de escrita direta no banco.

function effectiveStock(reward: Reward) {
  if (!reward.has_stock) return Number.POSITIVE_INFINITY;
  const current = reward.current_stock ?? 0;
  if (current > 0) return current;
  if (!reward.cooldown_minutes || !reward.last_purchased_at) return current;
  const availableAt = new Date(reward.last_purchased_at).getTime() + reward.cooldown_minutes * 60_000;
  return availableAt <= new Date().getTime() ? (reward.max_stock ?? 0) : current;
}
