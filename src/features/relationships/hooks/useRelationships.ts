import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

/** Espelha `gamificacao-api/src/relationships/`. */

export type Person = {
  id: string;
  name: string;
  relation: string | null;
  cadenceDays: number | null;
  stage: 'novo' | 'conhecido' | 'proximo';
  lastContactOn: string | null;
  daysSince: number | null;
  /** Positivo = atrasado. `null` = sem cadência definida. */
  overdueBy: number | null;
  contactCount: number;
};

/**
 * A lista vem do servidor ordenada por **quem está esfriando primeiro** — a
 * ordenação é a mecânica. Uma lista alfabética não lembra nada a ninguém.
 */
export function useRelationships() {
  return useQuery({
    queryKey: qk.relationships,
    queryFn: () => apiFetch<Person[]>('/relationships'),
  });
}

/**
 * Registrar contato — a ação de dois toques.
 *
 * Sem toast de XP de propósito (doc 14 §4.14): "liguei pra minha mãe e ganhei
 * 20 de XP" corrompe o motivo, e este é o único módulo onde a gamificação pode
 * piorar o que ela mede.
 */
export function useLogContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; kind?: string }) =>
      apiFetch<{ firstEver: boolean }>(`/relationships/${input.id}/contact`, {
        method: 'POST',
        body: { kind: input.kind ?? 'mensagem' },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.relationships });
      void qc.invalidateQueries({ queryKey: qk.character });
    },
  });
}
