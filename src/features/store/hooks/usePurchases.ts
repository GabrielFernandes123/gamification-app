import { useMutation, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';
import type { Reward } from './useStore';

export function usePurchaseSystemItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, habitId }: { itemId: string; habitId?: string }) => {
      const { data, error } = await supabase.rpc('purchase_system_item', {
        p_item_id: itemId,
        p_habit_id: habitId ?? undefined,
      });
      if (error) throw error;
      return data as unknown as { message: string; goldSpent: number };
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
    mutationFn: async ({ rewardId }: { rewardId: string }) => {
      return purchaseRewardWithRestock(rewardId);
    },
    onSuccess: (_result, variables) => {
      qc.setQueryData<Reward[]>(qk.rewards, (current) => current?.map((reward) => {
        if (reward.id !== variables.rewardId) return reward;
        const stock = effectiveStock(reward);
        return {
          ...reward,
          last_purchased_at: new Date().toISOString(),
          current_stock: reward.has_stock ? Math.max(0, stock - 1) : reward.current_stock,
        };
      }));
      qc.invalidateQueries({ queryKey: qk.character });
      qc.invalidateQueries({ queryKey: qk.rewards });
      qc.invalidateQueries({ queryKey: qk.purchases });
    },
  });
}

async function purchaseRewardWithRestock(rewardId: string) {
  const first = await supabase.rpc('purchase_reward', { p_reward_id: rewardId });
  if (!first.error) return first.data as unknown as { goldSpent: number };

  if (!isOutOfStockError(first.error)) throw first.error;

  const reward = await loadReward(rewardId);
  if (!reward || effectiveStock(reward) <= 0) throw first.error;

  const { error: updateError } = await supabase
    .from('rewards')
    .update({ current_stock: reward.max_stock ?? 0 })
    .eq('id', rewardId);
  if (updateError) throw first.error;

  const retry = await supabase.rpc('purchase_reward', { p_reward_id: rewardId });
  if (retry.error) throw retry.error;
  return retry.data as unknown as { goldSpent: number };
}

async function loadReward(rewardId: string) {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('id', rewardId)
    .maybeSingle();
  if (error) return null;
  return data as Reward | null;
}

function isOutOfStockError(error: { message?: string }) {
  return (error.message ?? '').toLowerCase().includes('fora de estoque');
}

function effectiveStock(reward: Reward) {
  if (!reward.has_stock) return Number.POSITIVE_INFINITY;
  const current = reward.current_stock ?? 0;
  if (current > 0) return current;
  if (!reward.cooldown_minutes || !reward.last_purchased_at) return current;
  const availableAt = new Date(reward.last_purchased_at).getTime() + reward.cooldown_minutes * 60_000;
  return availableAt <= new Date().getTime() ? (reward.max_stock ?? 0) : current;
}
