import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Database } from '@/types/db';

export type SystemItem = Database['public']['Tables']['system_items']['Row'];
export type Reward = Database['public']['Tables']['rewards']['Row'];
export type ActiveBuff = Database['public']['Tables']['active_buffs']['Row'];
export type SystemItemType = Database['public']['Enums']['system_item_type'];

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
