import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { RequirementProgress } from '@/features/objectives/hooks/useObjectives';

// GET /requirements/:ownerType/:ownerId/evaluate
// (gamificacao-api/src/requirements/requirements.service.ts → evaluateOwner)
export type RequirementOwnerType =
  | 'reward'
  | 'composite_goal'
  | 'temporary_challenge'
  | 'weekly_contract'
  | 'boss_objective';

export type RequirementsEvaluation = {
  ownerType: RequirementOwnerType;
  ownerId: string;
  passed: boolean;
  groups: Array<{
    id: string;
    mode: 'all' | 'any' | 'at_least';
    requiredCount: number;
    passedCount: number;
    passed: boolean;
    requirements: RequirementProgress[];
  }>;
};

export function useRequirementsEvaluation(
  ownerType: RequirementOwnerType,
  ownerId: string | null | undefined,
) {
  return useQuery({
    queryKey: qk.requirementsEvaluation(ownerType, ownerId ?? 'none'),
    enabled: !!ownerId,
    queryFn: () =>
      apiFetch<RequirementsEvaluation>(`/requirements/${ownerType}/${ownerId}/evaluate`),
  });
}
