import { useMutation, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/lib/queryKeys';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/db';

export type RewardInsert = Database['public']['Tables']['rewards']['Insert'];
export type RewardUpdate = Database['public']['Tables']['rewards']['Update'];

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (!uid) throw new Error('Não autenticado');
  return uid;
}

export function useCreateReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<RewardInsert, 'user_id'>) => {
      const user_id = await currentUserId();
      const { data, error } = await supabase
        .from('rewards')
        .insert({ ...payload, user_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.rewards }),
  });
}

export function useUpdateReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: RewardUpdate }) => {
      const { data, error } = await supabase
        .from('rewards')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.rewards }),
  });
}

export function useDeleteReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rewards').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.rewards }),
  });
}
