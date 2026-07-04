import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

export type ObjectiveProgress = {
  passed: boolean;
  groups?: Array<{
    id: string;
    passed: boolean;
    passedCount: number;
    requiredCount: number;
    requirements?: RequirementProgress[];
  }>;
};

export type RequirementProgress = {
  id: string;
  metric: string;
  sourceType: string;
  referenceId: string | null;
  operator: 'gte' | 'lte' | 'eq';
  targetValue: number;
  currentValue: number;
  passed: boolean;
  periodScope: RequirementPeriodScope;
};

export type ObjectiveClaimState = {
  periodKey: string;
  claimed: boolean;
  claimId: string | null;
  claimedAt: string | null;
};

export type ObjectiveOverviewItem = {
  id: string;
  name: string;
  description?: string | null;
  status?: string;
  frequency?: string;
  starts_on?: string;
  ends_on?: string;
  week_start?: string;
  week_end?: string;
  progress?: ObjectiveProgress;
  claim?: ObjectiveClaimState;
  reward_item_kind?: 'system' | 'custom' | null;
  reward_system_item_id?: string | null;
  reward_user_item_id?: string | null;
  reward_quantity?: number | null;
  stake_item_kind?: 'system' | 'custom' | null;
  stake_system_item_id?: string | null;
  stake_user_item_id?: string | null;
  stake_quantity?: number | null;
  repeatable?: boolean;
  metadata?: Record<string, unknown>;
};

export type ObjectivesOverview = {
  today: string;
  compositeGoals: ObjectiveOverviewItem[];
  activeChallenges: ObjectiveOverviewItem[];
  activeContracts: ObjectiveOverviewItem[];
  claimable: ObjectiveOverviewItem[];
  atRisk: ObjectiveOverviewItem[];
  counts: {
    compositeGoals: number;
    activeChallenges: number;
    activeContracts: number;
  };
};

export type ObjectiveKind = 'compositeGoal' | 'temporaryChallenge' | 'weeklyContract';
export type RequirementPeriodScope =
  | 'today'
  | 'current_week'
  | 'current_month'
  | 'lifetime'
  | 'since_created'
  | 'since_last_claim'
  | 'custom';

export type RequirementSourceType =
  | 'habit'
  | 'workout'
  | 'body_measurement'
  | 'body_goal'
  | 'sidequest'
  | 'economy_event';

export type ObjectiveRequirementPayload = {
  source_type: RequirementSourceType;
  metric: string;
  operator: 'gte' | 'lte' | 'eq';
  target_value: number;
  reference_id?: string | null;
  reference_kind?: string | null;
  period_scope: RequirementPeriodScope;
  custom_start?: string | null;
  custom_end?: string | null;
  params?: Record<string, unknown>;
  sort_order?: number;
};

export type RequirementGroup = {
  id: string;
  mode: 'all' | 'any' | 'at_least';
  required_count?: number | null;
  requirements: ObjectiveRequirementPayload[];
};

export type ObjectivePayload = {
  name: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
  reward_item_kind?: 'system' | 'custom' | null;
  reward_system_item_id?: string | null;
  reward_user_item_id?: string | null;
  reward_quantity?: number | null;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'manual';
  starts_on?: string | null;
  ends_on?: string | null;
  week_start?: string | null;
  week_end?: string | null;
  status?: 'draft' | 'active' | 'completed' | 'failed' | 'cancelled';
  repeatable?: boolean;
  stake_item_kind?: 'system' | 'custom' | null;
  stake_system_item_id?: string | null;
  stake_user_item_id?: string | null;
  stake_quantity?: number | null;
  requirements?: ObjectiveRequirementPayload[];
};

export type ObjectiveSuggestion = {
  id: string;
  suggestionType: string;
  status: string;
  diagnosis: string | null;
  title: string;
  summary: string;
  suggestedObjective: Record<string, unknown>;
  suggestedRequirements: Record<string, unknown>[];
  analytics: Record<string, unknown>;
  aiSummary: string | null;
  aiModel: string | null;
  createdAt: string;
  decidedAt: string | null;
};

const OBJECTIVE_PATH: Record<ObjectiveKind, string> = {
  compositeGoal: 'composite-goals',
  temporaryChallenge: 'temporary-challenges',
  weeklyContract: 'weekly-contracts',
};

export function useObjectivesOverview() {
  return useQuery({
    queryKey: qk.objectivesOverview,
    queryFn: async (): Promise<ObjectivesOverview> => {
      return apiFetch<ObjectivesOverview>('/objectives/overview');
    },
  });
}

export function useObjectives(kind: ObjectiveKind) {
  return useQuery({
    queryKey: ['objectives', kind] as const,
    queryFn: async (): Promise<ObjectiveOverviewItem[]> => {
      return apiFetch<ObjectiveOverviewItem[]>(`/objectives/${OBJECTIVE_PATH[kind]}`);
    },
  });
}

export function useObjectiveSuggestions() {
  return useQuery({
    queryKey: qk.objectiveSuggestions,
    queryFn: async (): Promise<ObjectiveSuggestion[]> => {
      return apiFetch<ObjectiveSuggestion[]>('/objectives/suggestions');
    },
  });
}

export function useCreateObjectiveSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<ObjectiveSuggestion> => {
      return apiFetch<ObjectiveSuggestion>('/objectives/suggestions', {
        method: 'POST',
        body: { useAi: true },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.objectiveSuggestions });
    },
  });
}

export function useApplyObjectiveSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/objectives/suggestions/${id}/apply`, { method: 'POST' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.objectiveSuggestions });
      qc.invalidateQueries({ queryKey: qk.objectivesOverview });
      qc.invalidateQueries({ queryKey: qk.inventory });
    },
  });
}

export function useDismissObjectiveSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/objectives/suggestions/${id}/dismiss`, { method: 'POST' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.objectiveSuggestions });
    },
  });
}

export function useClaimObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kind, id }: { kind: ObjectiveKind; id: string }) => {
      return apiFetch(`/objectives/${OBJECTIVE_PATH[kind]}/${id}/claim`, { method: 'POST' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.objectivesOverview });
      qc.invalidateQueries({ queryKey: qk.inventory });
      qc.invalidateQueries({ queryKey: qk.character });
    },
  });
}

function invalidateObjectives(qc: ReturnType<typeof useQueryClient>, kind?: ObjectiveKind) {
  qc.invalidateQueries({ queryKey: qk.objectivesOverview });
  qc.invalidateQueries({ queryKey: qk.objectiveSuggestions });
  qc.invalidateQueries({ queryKey: qk.inventory });
  if (kind) qc.invalidateQueries({ queryKey: ['objectives', kind] as const });
}

export function useCreateObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kind, payload }: { kind: ObjectiveKind; payload: ObjectivePayload }) => {
      return apiFetch<ObjectiveOverviewItem>(`/objectives/${OBJECTIVE_PATH[kind]}`, {
        method: 'POST',
        body: payload,
      });
    },
    onSuccess: (_data, variables) => invalidateObjectives(qc, variables.kind),
  });
}

export function useUpdateObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      kind,
      id,
      payload,
    }: {
      kind: ObjectiveKind;
      id: string;
      payload: Partial<ObjectivePayload>;
    }) => {
      return apiFetch<ObjectiveOverviewItem>(`/objectives/${OBJECTIVE_PATH[kind]}/${id}`, {
        method: 'PATCH',
        body: payload,
      });
    },
    onSuccess: (_data, variables) => invalidateObjectives(qc, variables.kind),
  });
}

export function useDeleteObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kind, id }: { kind: ObjectiveKind; id: string }) => {
      return apiFetch<{ deleted: boolean }>(`/objectives/${OBJECTIVE_PATH[kind]}/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (_data, variables) => invalidateObjectives(qc, variables.kind),
  });
}

export function useActivateWeeklyContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiFetch<ObjectiveOverviewItem>(`/objectives/weekly-contracts/${id}/activate`, {
        method: 'POST',
      });
    },
    onSuccess: () => invalidateObjectives(qc, 'weeklyContract'),
  });
}

export function useAddObjectiveRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      kind,
      groupId,
      payload,
    }: {
      kind: ObjectiveKind;
      groupId: string;
      payload: ObjectiveRequirementPayload;
    }) => {
      return apiFetch(`/requirements/groups/${groupId}/items`, {
        method: 'POST',
        body: payload,
      });
    },
    onSuccess: (_data, variables) => invalidateObjectives(qc, variables.kind),
  });
}

export function useDeleteObjectiveRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kind, requirementId }: { kind: ObjectiveKind; requirementId: string }) => {
      return apiFetch<{ deleted: boolean }>(`/requirements/items/${requirementId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (_data, variables) => invalidateObjectives(qc, variables.kind),
  });
}
