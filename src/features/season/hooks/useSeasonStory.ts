import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type {
  BossTier,
  ConfigureSeasonStoryInput,
  NarrativeBeat,
  SagaResponse,
  Season,
  SeasonStoryResponse,
  SeasonStorySettings,
  StartSeasonInput,
} from '@/types/season';

type GenerateNarrativeResult = {
  beat: NarrativeBeat;
  usedFallback: boolean;
};

type ConfigureSeasonStoryResult = {
  season: Season;
  storySettings: SeasonStorySettings;
};

export function useSeasonStory(tier = 'mensal') {
  return useQuery({
    queryKey: [...qk.seasonStory, tier],
    queryFn: () => apiFetch<SeasonStoryResponse>(`/seasons/story?tier=${tier}`),
  });
}

export function useSeasonSaga(enabled: boolean) {
  return useQuery({
    queryKey: qk.seasonSaga,
    queryFn: () => apiFetch<SagaResponse>('/seasons/saga'),
    enabled,
  });
}

export function useStartSeason() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: StartSeasonInput) =>
      apiFetch<SeasonStoryResponse>('/seasons/start', {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.seasonStory });
      qc.invalidateQueries({ queryKey: qk.currentSeason });
    },
  });
}

export function useEndSeason() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<{ ended: number }>('/seasons/end', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.seasonStory });
      qc.invalidateQueries({ queryKey: qk.currentSeason });
    },
  });
}

export function useUpgradeSeason() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (toTier: BossTier) =>
      apiFetch<SeasonStoryResponse>('/seasons/upgrade', {
        method: 'POST',
        body: { toTier },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.seasonStory });
      qc.invalidateQueries({ queryKey: qk.currentSeason });
    },
  });
}

export function useGenerateNarrativeBeat() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ layer = 4, tier = 'mensal' }: { layer?: 1 | 2 | 3 | 4; tier?: BossTier } = {}) =>
      apiFetch<GenerateNarrativeResult>('/seasons/story/generate', {
        method: 'POST',
        body: { layer, tier },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.seasonStory });
      qc.invalidateQueries({ queryKey: qk.currentSeason });
    },
  });
}

export function useConfigureSeasonStory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: ConfigureSeasonStoryInput) =>
      apiFetch<ConfigureSeasonStoryResult>('/seasons/configure', {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.seasonStory });
      qc.invalidateQueries({ queryKey: qk.currentSeason });
    },
  });
}
