import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Database } from '@/types/db';

export type ModuleRow = Database['public']['Tables']['module_registry']['Row'];

/**
 * Catálogo de módulos vindo do `module_registry` (08 §6.1). A navegação e os
 * filtros de histórico enumeram isto — nada hardcoded.
 */
export function useModules() {
  return useQuery({
    queryKey: qk.modules,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ModuleRow[]> => {
      return apiFetch<ModuleRow[]>('/modules');
    },
  });
}

/** Só os módulos de atividade ativos (para filtros de histórico, p.ex.). */
export function activeActivityModules(modules: ModuleRow[] | undefined) {
  return (modules ?? []).filter((m) => m.ativo && m.kind === 'atividade');
}
