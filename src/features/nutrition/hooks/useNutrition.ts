import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

/** Espelha `gamificacao-api/src/nutrition/`. */

/** Os cinco nutrientes com meta, na ordem em que aparecem nas telas. */
export const NUTRIENTS = ['kcal', 'protein', 'carb', 'fat', 'fiber'] as const;

export type Nutrient = (typeof NUTRIENTS)[number];

export const NUTRIENT_LABEL: Record<Nutrient, string> = {
  kcal: 'kcal',
  protein: 'proteína',
  carb: 'carbo',
  fat: 'gordura',
  fiber: 'fibra',
};

/** A unidade — as calorias são as únicas que não são gramas. */
export const NUTRIENT_UNIT: Record<Nutrient, string> = {
  kcal: '',
  protein: 'g',
  carb: 'g',
  fat: 'g',
  fiber: 'g',
};

export const NUTRIENT_FIELDS: Record<
  Nutrient,
  {
    min: keyof NutritionTargets;
    max: keyof NutritionTargets;
    enabled: keyof NutritionTargets;
  }
> = {
  kcal: { min: 'kcal_min', max: 'kcal_max', enabled: 'kcal_enabled' },
  protein: { min: 'protein_min_g', max: 'protein_max_g', enabled: 'protein_enabled' },
  carb: { min: 'carb_min_g', max: 'carb_max_g', enabled: 'carb_enabled' },
  fat: { min: 'fat_min_g', max: 'fat_max_g', enabled: 'fat_enabled' },
  fiber: { min: 'fiber_min_g', max: 'fiber_max_g', enabled: 'fiber_enabled' },
};

export const NUTRIENT_TOTAL: Record<Nutrient, keyof Totals> = {
  kcal: 'kcal',
  protein: 'proteinG',
  carb: 'carbG',
  fat: 'fatG',
  fiber: 'fiberG',
};

export type Totals = {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  fiberG: number;
};

export type Bounds = { min: number | null; max: number | null; enabled: boolean };

export type MealSlot = {
  id: string;
  name: string;
  position: number;
  targetAt: string | null;
  sharePct: number;
  active: boolean;
};

/** Um slot com o alvo já derivado e o que foi consumido nele. */
export type DaySlot = MealSlot & {
  target: Record<Nutrient, Bounds>;
  consumed: Totals;
};

/** Porção doméstica: o rótulo e o peso que ele significa (fase 3). */
export type FoodPortion = {
  id: string;
  label: string;
  grams: number;
  isDefault: boolean;
};

export type Food = {
  id: string;
  name: string;
  category: string | null;
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  /** Fase 3: o alimento cadastrado por você, e as porções dele. */
  brand: string | null;
  isCustom: boolean;
  portions: FoodPortion[];
};

/**
 * Item como o app pede: gramas OU porção.
 *
 * Com `portionId`, as gramas saem da linha da porção no SERVIDOR — o app não
 * multiplica nada, pela mesma razão que não calcula macro.
 */
export type MealItemInput = {
  foodId: string;
  quantityG?: number;
  portionId?: string;
  portions?: number;
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
  fiberG: number | null;
};

export type NutritionEntry = {
  id: string;
  /** `null` quando o slot foi apagado depois — o nome sobrevive mesmo assim. */
  slotId: string | null;
  mealName: string;
  loggedAt: string;
  note: string | null;
  source: 'manual' | 'voice';
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  fiberG: number;
  items: NutritionItem[];
};

/**
 * As metas. Cada nutriente tem piso, teto e liga/desliga, e `null` em qualquer
 * dos lados significa "sem limite deste lado" — não "zero".
 */
export type NutritionTargets = {
  kcal_min: number | null;
  kcal_max: number | null;
  kcal_enabled: boolean;

  protein_min_g: number | null;
  protein_max_g: number | null;
  protein_enabled: boolean;

  carb_min_g: number | null;
  carb_max_g: number | null;
  carb_enabled: boolean;

  fat_min_g: number | null;
  fat_max_g: number | null;
  fat_enabled: boolean;

  fiber_min_g: number | null;
  fiber_max_g: number | null;
  fiber_enabled: boolean;

  meals_min: number;
  meals_enabled: boolean;
  difficulty: string;
};

/** `null` = critério desligado. Não é o mesmo que não cumprido. */
export type NutritionCriteria = Record<Nutrient | 'meals', boolean | null>;

export type NutritionDay = {
  day: string;
  entries: NutritionEntry[];
  slots: DaySlot[];
  unassigned: Totals;
  totals: Totals;
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
  fiber_g: number | null;
};

export type PendingProposal = {
  id: string;
  transcript: string | null;
  model: string | null;
  payload: {
    /** `null` quando a fala não disse a refeição e nenhum horário desempatou. */
    slotId: string | null;
    slotName: string | null;
    occurredOn: string;
    items: ProposedItem[];
    weightKg: number | null;
  };
  createdAt: string;
  expiresAt: string;
};

/** As refeições configuradas. O backend cria as padrão na primeira leitura. */
export function useMealSlots() {
  return useQuery({
    queryKey: qk.nutritionMealSlots,
    queryFn: () => apiFetch<MealSlot[]>('/nutrition/meal-slots'),
  });
}

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
      slotId: string;
      occurredOn?: string;
      note?: string;
      items: MealItemInput[];
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
      slotId?: string;
      occurredOn?: string;
      items: { foodId: string; quantityG: number }[];
      weightKg?: number;
    }) =>
      apiFetch(`/nutrition/pending/${input.id}/approve`, {
        method: 'POST',
        body: {
          slotId: input.slotId,
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
 * REFEIÇÕES RECENTES e REPETIR (fase 3).
 *
 * No celular isso vale mais que em qualquer outro lugar: o café da manhã de
 * sempre são os mesmos itens, e montá-lo do zero na cozinha, item por item, é o
 * que faz o registro ser abandonado. Cadastrar alimento continua só no web — o
 * app registra, o web configura (doc 08 §0).
 */
export type RecentMeal = {
  id: string;
  slotId: string | null;
  mealName: string;
  lastOn: string;
  kcal: number;
  timesLogged: number;
  items: { foodId: string | null; name: string; quantityG: number }[];
};

export function useRecentMeals() {
  return useQuery({
    queryKey: qk.nutritionRecent,
    queryFn: () => apiFetch<RecentMeal[]>('/nutrition/recent'),
  });
}

export function useRepeatMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; slotId?: string }) =>
      apiFetch<{ totals: { kcal: number } }>(
        `/nutrition/entries/${input.id}/repeat`,
        { method: 'POST', body: { slotId: input.slotId } },
      ),
    onSuccess: () => {
      invalidateNutrition(qc);
      void qc.invalidateQueries({ queryKey: qk.nutritionRecent });
    },
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
