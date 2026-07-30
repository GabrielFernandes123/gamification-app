import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

/** Espelha `gamificacao-api/src/nutrition/`. */

export type Meal = 'cafe' | 'almoco' | 'jantar' | 'lanche' | 'ceia';

export type Food = {
  id: string;
  name: string;
  category: string | null;
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
};

export type NutritionItem = {
  id: string;
  entryId: string;
  foodId: string | null;
  name: string;
  quantityG: number;
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
};

export type NutritionEntry = {
  id: string;
  meal: Meal;
  loggedAt: string;
  note: string | null;
  source: 'manual' | 'voice';
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  items: NutritionItem[];
};

export type NutritionTargets = {
  protein_min_g: number;
  protein_enabled: boolean;
  kcal_max: number;
  kcal_max_enabled: boolean;
  meals_min: number;
  meals_enabled: boolean;
  difficulty: string;
};

/** `null` = critério desligado. Não é o mesmo que não cumprido. */
export type NutritionCriteria = {
  protein: boolean | null;
  kcal: boolean | null;
  meals: boolean | null;
};

export type NutritionDay = {
  day: string;
  entries: NutritionEntry[];
  totals: { kcal: number; proteinG: number; carbG: number; fatG: number };
  targets: NutritionTargets;
  criteria: NutritionCriteria;
};

/** Item proposto pela IA — `foodId: null` significa "não achei na TACO". */
export type ProposedItem = {
  foodId: string | null;
  name: string;
  heard?: string;
  quantityG: number;
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
};

export type PendingProposal = {
  id: string;
  transcript: string | null;
  model: string | null;
  payload: {
    meal: Meal;
    occurredOn: string;
    items: ProposedItem[];
    weightKg: number | null;
  };
  createdAt: string;
  expiresAt: string;
};

export const MEAL_LABEL: Record<Meal, string> = {
  cafe: 'Café',
  almoco: 'Almoço',
  jantar: 'Jantar',
  lanche: 'Lanche',
  ceia: 'Ceia',
};

export function useNutritionDay(date?: string) {
  return useQuery({
    queryKey: qk.nutritionDay(date ?? 'hoje'),
    queryFn: () =>
      apiFetch<NutritionDay>(
        date ? `/nutrition/day?date=${encodeURIComponent(date)}` : '/nutrition/day',
      ),
  });
}

/** Busca no catálogo TACO. Só dispara com 2+ letras — o backend recusa menos. */
export function useFoodSearch(query: string) {
  const term = query.trim();
  return useQuery({
    queryKey: qk.nutritionFoods(term),
    queryFn: () => apiFetch<Food[]>(`/nutrition/foods?q=${encodeURIComponent(term)}`),
    enabled: term.length >= 2,
  });
}

function invalidateNutrition(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['nutritionDay'] });
  void qc.invalidateQueries({ queryKey: qk.nutritionPending });
  // Registrar refeição paga XP/ouro — o HUD precisa saber.
  void qc.invalidateQueries({ queryKey: qk.character });
}

export function useCreateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      meal: Meal;
      occurredOn?: string;
      note?: string;
      items: { foodId: string; quantityG: number }[];
    }) => apiFetch('/nutrition/entries', { method: 'POST', body: input }),
    onSuccess: () => invalidateNutrition(qc),
  });
}

export function useRemoveMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/nutrition/entries/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateNutrition(qc),
  });
}

export function useNutritionPending() {
  return useQuery({
    queryKey: qk.nutritionPending,
    queryFn: () => apiFetch<PendingProposal[]>('/nutrition/pending'),
  });
}

/**
 * Manda o áudio e recebe uma PROPOSTA — nada é gravado ainda.
 *
 * O retorno vai direto para a tela de revisão. É a etapa que transforma
 * estimativa em dado, e ela é do usuário, não da IA.
 */
export function useVoiceMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { audioBase64: string; format: 'm4a' | 'mp3' | 'wav' }) =>
      apiFetch<PendingProposal & { unmatched: number }>('/nutrition/voice', {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.nutritionPending }),
  });
}

export function useApproveProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      meal?: Meal;
      occurredOn?: string;
      items: { foodId: string; quantityG: number }[];
      weightKg?: number;
    }) =>
      apiFetch(`/nutrition/pending/${input.id}/approve`, {
        method: 'POST',
        body: {
          meal: input.meal,
          occurredOn: input.occurredOn,
          items: input.items,
          weightKg: input.weightKg,
        },
      }),
    onSuccess: () => {
      invalidateNutrition(qc);
      // O peso aprovado vira medida corporal — a tela de Corpo precisa recarregar.
      void qc.invalidateQueries({ queryKey: qk.bodyMeasurements });
    },
  });
}

/** Recusar não grava nada. É o que torna a fila segura de usar. */
export function useRejectProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/nutrition/pending/${id}/reject`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.nutritionPending }),
  });
}

/**
 * Lê o arquivo local e devolve base64.
 *
 * Em pedaços de 8 KB: `String.fromCharCode(...bytes)` com um array de um mega
 * estoura a pilha de argumentos do JS, e a gravação de um minuto passa disso.
 */
export async function fileToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return globalThis.btoa(binary);
}
