import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Character } from '@/features/character/hooks/useCharacter';
import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { InventoryItem, Reward, SystemItem, UserItem } from './useStore';

export function usePurchaseSystemItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, habitId }: { itemId: string; habitId?: string }) => {
      return apiFetch<{ message: string; goldSpent: number }>(`/store/system-items/${itemId}/purchase`, {
        method: 'POST',
        body: { habitId },
      });
    },
    onSuccess: (data, variables) => {
      const item = qc
        .getQueryData<SystemItem[]>(qk.systemItems)
        ?.find((systemItem) => systemItem.id === variables.itemId);

      qc.setQueryData<Character>(qk.character, (current) => {
        if (!current) return current;
        const next = {
          ...current,
          gold: Math.max(0, Number(current.gold) - data.goldSpent),
        };
        if (item?.type === 'heal') {
          next.current_hp = Math.min(
            Number(current.max_hp),
            Number(current.current_hp) + Number(item.effect_value ?? 0),
          );
        }
        return next;
      });

      if (item?.type === 'streak_recovery' && variables.habitId) {
        qc.invalidateQueries({ queryKey: qk.habits });
      }
      if (item?.type === 'damage_reduction') {
        qc.invalidateQueries({ queryKey: qk.activeBuffs });
      }
      qc.invalidateQueries({ queryKey: qk.purchases, refetchType: 'inactive' });
    },
  });
}

export function usePurchaseSystemItemToInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      return apiFetch<{ message: string; goldSpent: number; itemId: string }>(
        `/store/system-items/${itemId}/purchase-to-inventory`,
        { method: 'POST' },
      );
    },
    onSuccess: (data) => {
      qc.setQueryData<Character>(qk.character, (current) =>
        current
          ? {
              ...current,
              gold: Math.max(0, Number(current.gold) - data.goldSpent),
            }
          : current,
      );
      qc.invalidateQueries({ queryKey: qk.inventory });
      qc.invalidateQueries({ queryKey: qk.inventoryTransactions });
      qc.invalidateQueries({ queryKey: qk.purchases, refetchType: 'inactive' });
    },
  });
}

export function useUseInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      item,
      habitId,
    }: {
      item: InventoryItem;
      habitId?: string;
    }) =>
      apiFetch<{ message: string; itemId: string; itemKind: 'system' | 'custom'; quantityUsed: number }>(
        `/store/inventory/${item.itemId}/use`,
        {
          method: 'POST',
          body: { habitId, itemKind: item.itemKind },
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.inventory });
      qc.invalidateQueries({ queryKey: qk.inventoryTransactions });
      qc.invalidateQueries({ queryKey: qk.character });
      qc.invalidateQueries({ queryKey: qk.activeBuffs });
      qc.invalidateQueries({ queryKey: qk.habits });
    },
  });
}

export function useCreateUserItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      description?: string | null;
      category?: string | null;
      icon?: string | null;
      rarity?: string | null;
      is_consumable?: boolean;
    }) => apiFetch<UserItem>('/store/user-items', { method: 'POST', body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.userItems }),
  });
}

export function useUpdateUserItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      payload,
    }: {
      itemId: string;
      payload: Partial<{
        name: string;
        description: string | null;
        category: string | null;
        icon: string | null;
        rarity: string | null;
        is_consumable: boolean;
        is_active: boolean;
      }>;
    }) => apiFetch<UserItem>(`/store/user-items/${itemId}`, { method: 'PATCH', body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.userItems });
      qc.invalidateQueries({ queryKey: qk.inventory });
    },
  });
}

export function useDeleteUserItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiFetch<{ deleted: boolean }>(`/store/user-items/${itemId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.userItems });
      qc.invalidateQueries({ queryKey: qk.inventory });
    },
  });
}

export function useGrantUserItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      apiFetch<{ itemId: string; itemKind: 'custom'; quantity: number; quantityAdded: number }>(
        `/store/user-items/${itemId}/grant`,
        {
          method: 'POST',
          body: { quantity },
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.inventory });
      qc.invalidateQueries({ queryKey: qk.inventoryTransactions });
      qc.invalidateQueries({ queryKey: qk.userItems });
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
    onSuccess: (result, variables) => {
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
      qc.setQueryData<Character>(qk.character, (current) =>
        current
          ? {
              ...current,
              gold: Math.max(0, Number(current.gold) - result.goldSpent),
              essencia: Math.max(0, Number(current.essencia ?? 0) - result.essenciaSpent),
            }
          : current,
      );
      qc.invalidateQueries({ queryKey: qk.rewards, refetchType: 'inactive' });
      qc.invalidateQueries({ queryKey: qk.purchases, refetchType: 'inactive' });
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
