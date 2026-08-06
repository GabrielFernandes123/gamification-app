import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Database } from '@/types/db';

/**
 * A linha do registry MAIS o liga-desliga do usuário.
 *
 * `habilitado` não está no tipo gerado do banco porque não vem de
 * `module_registry` — é o `coalesce(user_modules.enabled, true)` que a rota
 * `/modules` costura por cima. Sem esta interseção o app não enxergava o campo
 * e mostrava, registrável, o módulo que o usuário tinha desligado no web: a
 * tela gravava e o servidor não pagava nada (o gate do grant), sem erro nenhum
 * na tela.
 */
export type ModuleRow = Database['public']['Tables']['module_registry']['Row'] & {
  /**
   * POR USUÁRIO — "está ligado para mim". Não confundir com `ativo`, que é
   * GLOBAL e quer dizer "aparece no lançador": Boss, Loja e Morte são
   * `ativo: false` e funcionam perfeitamente.
   */
  habilitado: boolean;
};

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

/** Só os módulos de atividade ativos E ligados (para filtros de histórico, p.ex.). */
export function activeActivityModules(modules: ModuleRow[] | undefined) {
  return (modules ?? []).filter((m) => m.ativo && m.habilitado && m.kind === 'atividade');
}

/**
 * Este conjunto de módulos está ligado? OU entre as chaves.
 *
 * A aba Corpo agrega treino, cardio, medidas e nutrição: desligar só Cardio não
 * pode levar a aba junto. Enquanto sobrar uma chave ligada, a tela existe.
 *
 * Default LIGADO enquanto a query não voltou: sumir uma aba no primeiro quadro
 * e trazê-la de volta meio segundo depois pisca feio, e o caso comum é tudo
 * ligado.
 */
export function useModulesEnabled(keys: string[]) {
  const modules = useModules();
  if (!modules.data) return true;
  // `Set<string>` explícito: `m.key` é o enum gerado do banco, que está atrás
  // do schema real (não tem journal, nutrition, plan, bucket, relationship nem
  // work). Comparar contra `string` cru é o certo aqui — a chave vem escrita à
  // mão na tela que pergunta, não do tipo gerado.
  const desligadas = new Set<string>(
    modules.data.filter((m) => !m.habilitado).map((m) => m.key),
  );
  return keys.length === 0 || keys.some((k) => !desligadas.has(k));
}
