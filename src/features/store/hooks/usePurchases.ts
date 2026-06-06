import { useMutation, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';

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
      const { data, error } = await supabase.rpc('purchase_reward', { p_reward_id: rewardId });
      if (error) throw error;
      return data as unknown as { goldSpent: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.character });
      qc.invalidateQueries({ queryKey: qk.rewards });
      qc.invalidateQueries({ queryKey: qk.purchases });
    },
  });
}
