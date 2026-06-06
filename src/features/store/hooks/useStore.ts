import { useQuery } from '@tanstack/react-query';

import { qk } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';
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
      const { data, error } = await supabase
        .from('system_items')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRewards() {
  return useQuery({
    queryKey: qk.rewards,
    queryFn: async (): Promise<Reward[]> => {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useActiveBuffs() {
  return useQuery({
    queryKey: qk.activeBuffs,
    queryFn: async (): Promise<ActiveBuff[]> => {
      const { data, error } = await supabase
        .from('active_buffs')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
