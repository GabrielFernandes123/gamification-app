import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/Toast';
import { showBossProgressToast } from '@/features/season/bossFeedback';
import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type {
  BodyMeasurement,
  BodyAlertSettings,
  BodyPart,
  BodyGoal,
  BodyGoalDifficulty,
  BodyGoalType,
  CompletedBodyGoal,
  CompleteWorkoutResult,
  FitnessExercise,
  SetDrop,
  WorkoutPersonalRecord,
  WorkoutSetType,
  WorkoutDraftExercise,
  WorkoutSession,
  WorkoutSet,
  WorkoutTemplate,
} from '@/types/body';

export function useBodyParts() {
  return useQuery({
    queryKey: qk.bodyParts,
    queryFn: async (): Promise<BodyPart[]> => {
      return apiFetch<BodyPart[]>('/body-parts');
    },
  });
}

type BodyMediaPayload = {
  icon_name?: string | null;
  media_url?: string | null;
};

type BodyPartAttribute = { attribute_key?: BodyPart['attribute_key'] };

export function useCreateBodyPart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; color?: string | null } & BodyMediaPayload & BodyPartAttribute) => {
      return apiFetch<BodyPart>('/body-parts', { method: 'POST', body: payload });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.bodyParts }),
  });
}

export function useUpdateBodyPart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { name?: string; color?: string | null } & BodyMediaPayload & BodyPartAttribute }) => {
      return apiFetch<BodyPart>(`/body-parts/${id}`, { method: 'PATCH', body: patch });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.bodyParts }),
  });
}

export function useDeleteBodyPart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch<{ deleted: boolean }>(`/body-parts/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.bodyParts });
      qc.invalidateQueries({ queryKey: qk.fitnessExercises });
    },
  });
}

export function useFitnessExercises() {
  return useQuery({
    queryKey: qk.fitnessExercises,
    queryFn: async (): Promise<FitnessExercise[]> => {
      return apiFetch<FitnessExercise[]>('/fitness-exercises');
    },
  });
}

export function useCreateFitnessExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      primary_skill_id?: string | null;
      primary_body_part_id?: string | null;
      secondary_body_part_id?: string | null;
      media_url?: string | null;
      video_url?: string | null;
    }) => {
      return apiFetch<FitnessExercise>('/fitness-exercises', { method: 'POST', body: payload });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.fitnessExercises }),
  });
}

export function useUpdateFitnessExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: {
        name?: string;
        primary_skill_id?: string | null;
        primary_body_part_id?: string | null;
        secondary_body_part_id?: string | null;
        media_url?: string | null;
        video_url?: string | null;
      };
    }) => {
      return apiFetch<FitnessExercise>(`/fitness-exercises/${id}`, { method: 'PATCH', body: patch });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.fitnessExercises }),
  });
}

export function useWorkoutSessions() {
  return useQuery({
    queryKey: qk.workoutSessions,
    queryFn: async (): Promise<WorkoutSession[]> => {
      return apiFetch<WorkoutSession[]>('/workout-sessions');
    },
  });
}

export function useWorkoutSession(id: string | null | undefined) {
  return useQuery({
    queryKey: qk.workoutSession(id ?? 'none'),
    enabled: !!id,
    queryFn: async (): Promise<WorkoutSession | null> => {
      return apiFetch<WorkoutSession | null>(`/workout-sessions/${id}`);
    },
  });
}

export function useCompletedSessions() {
  return useQuery({
    queryKey: qk.completedSessions,
    queryFn: async (): Promise<WorkoutSession[]> => {
      return apiFetch<WorkoutSession[]>('/workout-sessions/completed');
    },
  });
}

export function useCreateWorkoutSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; notes?: string | null; template_id?: string | null } & BodyMediaPayload) => {
      return apiFetch<WorkoutSession>('/workout-sessions', { method: 'POST', body: payload });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.workoutSessions }),
  });
}

function sortTemplate(template: WorkoutTemplate): WorkoutTemplate {
  const exercises = [...(template.exercises ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((ex) => ({ ...ex, sets: [...(ex.sets ?? [])].sort((a, b) => a.sort_order - b.sort_order) }));
  return { ...template, exercises };
}

export function useWorkoutTemplates() {
  return useQuery({
    queryKey: qk.workoutTemplates,
    queryFn: async (): Promise<WorkoutTemplate[]> => {
      const data = await apiFetch<WorkoutTemplate[]>('/workout-templates');
      return (data ?? []).map(sortTemplate);
    },
  });
}

export function useAllWorkoutTemplates() {
  return useQuery({
    queryKey: qk.workoutTemplatesAll,
    queryFn: async (): Promise<WorkoutTemplate[]> => {
      const data = await apiFetch<WorkoutTemplate[]>('/workout-templates/all');
      return (data ?? []).map(sortTemplate);
    },
  });
}

export function useWorkoutTemplate(id: string | null | undefined) {
  return useQuery({
    queryKey: qk.workoutTemplate(id ?? 'none'),
    enabled: !!id,
    queryFn: async (): Promise<WorkoutTemplate | null> => {
      const data = await apiFetch<WorkoutTemplate | null>(`/workout-templates/${id}`);
      return data ? sortTemplate(data) : null;
    },
  });
}

function invalidateTemplates(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: qk.workoutTemplates });
  qc.invalidateQueries({ queryKey: qk.workoutTemplatesAll });
  qc.invalidateQueries({ queryKey: qk.workoutTemplateRoot });
}

/** Cria ou atualiza um treino completo: dados + itens (com superset/descansos) + séries planejadas. */
export function useSaveWorkoutTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id?: string | null;
      name: string;
      description?: string | null;
      media_url?: string | null;
      exercises: WorkoutDraftExercise[];
    }): Promise<string> => {
      return apiFetch<string>('/workout-templates', { method: 'PUT', body: payload });
    },
    onSuccess: () => invalidateTemplates(qc),
  });
}

/** Atualização parcial (arquivar/restaurar/renomear) sem mexer na estrutura. */
export function useUpdateWorkoutTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { name?: string; description?: string | null; media_url?: string | null; is_active?: boolean } }) => {
      return apiFetch<WorkoutTemplate>(`/workout-templates/${id}`, { method: 'PATCH', body: patch });
    },
    onSuccess: () => invalidateTemplates(qc),
  });
}

export function useDeleteWorkoutTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch<{ deleted: boolean }>(`/workout-templates/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => invalidateTemplates(qc),
  });
}

export function useWorkoutSets(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: qk.workoutSets(sessionId ?? 'none'),
    enabled: !!sessionId,
    queryFn: async (): Promise<WorkoutSet[]> => {
      return apiFetch<WorkoutSet[]>(`/workout-sets?session=${sessionId}`);
    },
  });
}

export function useExerciseSets(exerciseId: string | null | undefined) {
  return useQuery({
    queryKey: qk.exerciseSets(exerciseId ?? 'none'),
    enabled: !!exerciseId,
    queryFn: async (): Promise<WorkoutSet[]> => {
      return apiFetch<WorkoutSet[]>(`/workout-sets/by-exercise/${exerciseId}`);
    },
  });
}

export function useRecentWorkoutSets() {
  return useQuery({
    queryKey: ['recentWorkoutSets'] as const,
    queryFn: async (): Promise<WorkoutSet[]> => {
      return apiFetch<WorkoutSet[]>('/workout-sets/recent');
    },
  });
}

export function useWorkoutRecords() {
  return useQuery({
    queryKey: qk.workoutRecords,
    queryFn: async (): Promise<WorkoutPersonalRecord[]> => {
      return apiFetch<WorkoutPersonalRecord[]>('/workout-records');
    },
  });
}

export function useAddWorkoutSet(sessionId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      exercise_id: string;
      weight: number;
      reps: number;
      set_type?: WorkoutSetType;
      is_warmup?: boolean;
      is_skipped?: boolean;
      duration_seconds?: number | null;
      drops?: SetDrop[] | null;
      rest_seconds?: number | null;
      rpe?: number | null;
      notes?: string | null;
    }) => {
      const key = qk.workoutSets(sessionId ?? 'none');
      const previous = qc.getQueryData<WorkoutSet[]>(key) ?? [];
      const set_number = previous.length + 1;
      const is_warmup = payload.is_warmup ?? payload.set_type === 'warmup';
      return apiFetch<WorkoutSet>('/workout-sets', {
        method: 'POST',
        body: { ...payload, is_warmup, session_id: sessionId, set_number },
      });
    },
    onSuccess: () => {
      if (sessionId) qc.invalidateQueries({ queryKey: qk.workoutSets(sessionId) });
    },
  });
}

export function useUpdateWorkoutSet(sessionId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { weight?: number; reps?: number; is_warmup?: boolean; rest_seconds?: number | null; rpe?: number | null; notes?: string | null } }) => {
      return apiFetch<WorkoutSet>(`/workout-sets/${id}`, { method: 'PATCH', body: patch });
    },
    onSuccess: () => {
      if (sessionId) qc.invalidateQueries({ queryKey: qk.workoutSets(sessionId) });
    },
  });
}

export function useDeleteWorkoutSet(sessionId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch<{ deleted: boolean }>(`/workout-sets/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      if (sessionId) qc.invalidateQueries({ queryKey: qk.workoutSets(sessionId) });
    },
  });
}

export function useCompleteWorkoutSession() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      return apiFetch<CompleteWorkoutResult>(`/workout-sessions/${sessionId}/complete`, { method: 'POST' });
    },
    onSuccess: (data) => {
      showBossProgressToast(toast, data.bossProgress);
      qc.invalidateQueries({ queryKey: qk.workoutSessions });
      qc.invalidateQueries({ queryKey: qk.completedSessions });
      qc.invalidateQueries({ queryKey: qk.bodyParts });
      qc.invalidateQueries({ queryKey: qk.bodyGoals });
      qc.invalidateQueries({ queryKey: qk.workoutRecords });
      qc.invalidateQueries({ queryKey: qk.skills });
      qc.invalidateQueries({ queryKey: qk.character });
      qc.invalidateQueries({ queryKey: qk.habitLogsRoot });
      qc.invalidateQueries({ queryKey: qk.currentSeason });
    },
  });
}

export function useCancelWorkoutSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      return apiFetch<WorkoutSession>(`/workout-sessions/${sessionId}/cancel`, { method: 'POST' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.workoutSessions }),
  });
}

export function useBodyMeasurements() {
  return useQuery({
    queryKey: qk.bodyMeasurements,
    queryFn: async (): Promise<BodyMeasurement[]> => {
      return apiFetch<BodyMeasurement[]>('/body-measurements');
    },
  });
}

export function useUpsertBodyMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    // Passa pela API: a 1a medida do dia concede XP trivial (_grant) e
    // reavalia as metas corporais (04 §4.4).
    mutationFn: async (payload: Partial<BodyMeasurement> & { measured_on: string } & BodyMediaPayload) => {
      return apiFetch<BodyMeasurement>('/body-measurements', {
        method: 'POST',
        body: payload,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.bodyMeasurements });
      qc.invalidateQueries({ queryKey: qk.bodyGoals });
      qc.invalidateQueries({ queryKey: qk.bodyParts });
      qc.invalidateQueries({ queryKey: qk.character });
      qc.invalidateQueries({ queryKey: qk.currentSeason });
    },
  });
}

export function useBodyGoals() {
  return useQuery({
    queryKey: qk.bodyGoals,
    queryFn: async (): Promise<BodyGoal[]> => {
      return apiFetch<BodyGoal[]>('/body-goals');
    },
  });
}

export function useCreateBodyGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      type: BodyGoalType;
      title: string;
      target_metric?: string | null;
      target_direction?: 'increase' | 'decrease';
      target_value?: number | null;
      target_reps?: number | null;
      exercise_id?: string | null;
      body_part_id?: string | null;
      deadline?: string | null;
      difficulty?: BodyGoalDifficulty;
      is_manual?: boolean;
    } & BodyMediaPayload) => {
      return apiFetch<BodyGoal>('/body-goals', { method: 'POST', body: { difficulty: 'medium', ...payload } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.bodyGoals }),
  });
}

export function useUpdateBodyGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: {
        type?: BodyGoalType;
        title?: string;
        target_metric?: string | null;
        target_direction?: 'increase' | 'decrease';
        target_value?: number | null;
        target_reps?: number | null;
        exercise_id?: string | null;
        body_part_id?: string | null;
        deadline?: string | null;
        difficulty?: BodyGoalDifficulty;
        is_manual?: boolean;
      } & BodyMediaPayload;
    }) => {
      return apiFetch<BodyGoal>(`/body-goals/${id}`, { method: 'PATCH', body: patch });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.bodyGoals }),
  });
}

export function useDeleteBodyGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch<{ deleted: boolean }>(`/body-goals/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.bodyGoals }),
  });
}

export function useEvaluateBodyGoals() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async () => {
      return apiFetch<CompletedBodyGoal[]>('/body-goals/evaluate', { method: 'POST' });
    },
    onSuccess: (data) => {
      for (const completed of data) {
        showBossProgressToast(toast, completed.bossProgress);
      }
      qc.invalidateQueries({ queryKey: qk.bodyGoals });
      qc.invalidateQueries({ queryKey: qk.bodyParts });
      qc.invalidateQueries({ queryKey: qk.character });
      qc.invalidateQueries({ queryKey: qk.currentSeason });
    },
  });
}

export function useCompleteBodyGoal() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async (goalId: string) => {
      return apiFetch<CompletedBodyGoal>(`/body-goals/${goalId}/complete`, { method: 'POST' });
    },
    onSuccess: (data) => {
      showBossProgressToast(toast, data.bossProgress);
      qc.invalidateQueries({ queryKey: qk.bodyGoals });
      qc.invalidateQueries({ queryKey: qk.bodyParts });
      qc.invalidateQueries({ queryKey: qk.character });
      qc.invalidateQueries({ queryKey: qk.habitLogsRoot });
      qc.invalidateQueries({ queryKey: qk.currentSeason });
    },
  });
}

export function useBodyAlertSettings() {
  return useQuery({
    queryKey: qk.bodyAlertSettings,
    queryFn: async (): Promise<BodyAlertSettings> => {
      const data = await apiFetch<BodyAlertSettings | null>('/body-alert-settings');
      return data ?? { workout_stale_days: 5, measurement_stale_days: 14, body_part_stale_days: 10, updated_at: new Date().toISOString() } as BodyAlertSettings;
    },
  });
}

export function useUpsertBodyAlertSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Pick<BodyAlertSettings, 'workout_stale_days' | 'measurement_stale_days' | 'body_part_stale_days'>) => {
      return apiFetch<BodyAlertSettings>('/body-alert-settings', { method: 'PUT', body: payload });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.bodyAlertSettings }),
  });
}
