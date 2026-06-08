import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { EquipmentCatalogItem, OwnedEquipment } from '@/types/build';

/** Itens possuídos pelo personagem (GET /build/equipment). */
export function useMyEquipment() {
  return useQuery({
    queryKey: qk.myEquipment,
    queryFn: async (): Promise<OwnedEquipment[]> => {
      return apiFetch<OwnedEquipment[]>('/build/equipment');
    },
  });
}

/** Catálogo comprável da loja (GET /store/equipment). */
export function useEquipmentCatalog() {
  return useQuery({
    queryKey: qk.equipmentCatalog,
    queryFn: async (): Promise<EquipmentCatalogItem[]> => {
      console.log('[equip] GET /store/equipment — iniciando fetch');
      try {
        const data = await apiFetch<EquipmentCatalogItem[]>('/store/equipment');
        console.log(
          '[equip] resposta OK — itens:',
          Array.isArray(data) ? data.length : typeof data,
          Array.isArray(data) ? data.map((d) => d.name) : data,
        );
        return data;
      } catch (err) {
        console.log('[equip] ERRO no fetch:', err instanceof Error ? err.message : err);
        throw err;
      }
    },
  });
}

function useBuildInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.character });
    qc.invalidateQueries({ queryKey: qk.attributes });
    qc.invalidateQueries({ queryKey: qk.myEquipment });
  };
}

export function usePurchaseEquipment() {
  const invalidate = useBuildInvalidate();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ catalogId }: { catalogId: string }) => {
      return apiFetch<{ equipmentId: string; goldSpent: number }>(
        `/store/equipment/${catalogId}/purchase`,
        { method: 'POST' },
      );
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: qk.purchases });
    },
  });
}

export function usePurchaseEquipmentEssencia() {
  const invalidate = useBuildInvalidate();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ catalogId }: { catalogId: string }) => {
      return apiFetch<{ equipmentId: string; essenciaSpent: number }>(
        `/store/equipment/${catalogId}/purchase-essencia`,
        { method: 'POST' },
      );
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: qk.purchases });
    },
  });
}

export function useEquipItem() {
  const invalidate = useBuildInvalidate();
  return useMutation({
    mutationFn: async ({ equipmentId }: { equipmentId: string }) => {
      return apiFetch<{ equipped: string; slot: string }>(
        `/build/equipment/${equipmentId}/equip`,
        { method: 'POST' },
      );
    },
    onSuccess: invalidate,
  });
}

export function useUnequipItem() {
  const invalidate = useBuildInvalidate();
  return useMutation({
    mutationFn: async ({ equipmentId }: { equipmentId: string }) => {
      return apiFetch<{ unequipped: string }>(
        `/build/equipment/${equipmentId}/unequip`,
        { method: 'POST' },
      );
    },
    onSuccess: invalidate,
  });
}
