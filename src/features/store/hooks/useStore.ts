import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Database } from '@/types/db';
import type { ObjectiveProgress } from '@/features/objectives/hooks/useObjectives';

export type SystemItem = Database['public']['Tables']['system_items']['Row'];
export type Reward = Database['public']['Tables']['rewards']['Row'] & {
  requirements?: ObjectiveProgress;
};
export type ActiveBuff = Database['public']['Tables']['active_buffs']['Row'];
export type SystemItemType = Database['public']['Enums']['system_item_type'];

export type InventoryItem = {
  id: string;
  itemKind: 'system' | 'custom';
  itemId: string;
  systemItemId: string | null;
  userItemId: string | null;
  quantity: number;
  expiresAt: string | null;
  sourceType: string | null;
  sourceId: string | null;
  name: string;
  description: string | null;
  type: SystemItemType | 'custom';
  effectValue: number;
  category: string | null;
  icon: string | null;
  rarity: string | null;
  isConsumable: boolean;
};

export type UserItem = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  rarity: string | null;
  isConsumable: boolean;
  isActive: boolean;
  metadata: Record<string, unknown>;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type InventoryTransaction = {
  id: string;
  itemKind: 'system' | 'custom';
  itemId: string;
  systemItemId: string | null;
  userItemId: string | null;
  name: string;
  quantityDelta: number;
  reason: string;
  sourceType: string | null;
  sourceId: string | null;
  createdAt: string;
};

export function useSystemItems() {
  return useQuery({
    queryKey: qk.systemItems,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SystemItem[]> => {
      return apiFetch<SystemItem[]>('/store/system-items');
    },
  });
}

export function useRewards() {
  return useQuery({
    queryKey: qk.rewards,
    queryFn: async (): Promise<Reward[]> => {
      return apiFetch<Reward[]>('/store/rewards');
    },
  });
}

export function useActiveBuffs() {
  return useQuery({
    queryKey: qk.activeBuffs,
    queryFn: async (): Promise<ActiveBuff[]> => {
      return apiFetch<ActiveBuff[]>('/store/active-buffs');
    },
  });
}

export function useInventory() {
  return useQuery({
    queryKey: qk.inventory,
    queryFn: async (): Promise<InventoryItem[]> => {
      return apiFetch<InventoryItem[]>('/store/inventory');
    },
  });
}

export function useInventoryTransactions() {
  return useQuery({
    queryKey: qk.inventoryTransactions,
    queryFn: async (): Promise<InventoryTransaction[]> => {
      return apiFetch<InventoryTransaction[]>('/store/inventory/transactions');
    },
  });
}

export function useUserItems() {
  return useQuery({
    queryKey: qk.userItems,
    queryFn: async (): Promise<UserItem[]> => {
      return apiFetch<UserItem[]>('/store/user-items');
    },
  });
}
