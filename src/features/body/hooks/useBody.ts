import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/Toast';
import type { UnlockedMap } from '@/features/achievements/useAchievements';
import type { Character } from '@/features/character/hooks/useCharacter';
import { averageHeartRate } from '@/features/health/ios/healthkit';
import { showBossProgressToast } from '@/features/season/bossFeedback';
import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type {
  BodyMeasurement,
  CompletedBodyGoal,
  CompleteWorkoutResult,
  SetDrop,
  WorkoutSetType,
  WorkoutSession,
  WorkoutSet,
  WorkoutTemplate,
} from '@/types/body';

type BodyMeasurementResult = BodyMeasurement & {
  xpGained?: number;
  goldGained?: number;
  leveledUp?: boolean;
  newAchievements?: string[];
  completedGoals?: CompletedBodyGoal[];
  isNew?: boolean;
};

function addCharacterReward(
  qc: ReturnType<typeof useQueryClient>,
  data: { xpGained?: number; goldGained?: number; leveledUp?: boolean; newLevel?: number },
) {
  const xp = data.xpGained ?? 0;
  const gold = data.goldGained ?? 0;
  if (xp === 0 && gold === 0) return;
  qc.setQueryData<Character>(qk.character, (current) =>
    current
      ? {
          ...current,
          total_xp: Math.max(0, Number(current.total_xp) + xp),
          gold: Math.max(0, Number(current.gold) + gold),
          ...(data.leveledUp && data.newLevel ? { level: data.newLevel } : null),
        }
      : current,
  );
}

function addAchievements(qc: ReturnType<typeof useQueryClient>, keys: string[] | undefined) {
  if (!keys?.length) return;
  const unlockedAt = new Date().toISOString();
  qc.setQueryData<UnlockedMap>(qk.achievements, (current) => {
    const next = { ...(current ?? {}) };
    for (const key of keys) next[key] = next[key] ?? unlockedAt;
    return next;
  });
}

type BodyMediaPayload = {
  icon_name?: string | null;
  media_url?: string | null;
};

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

/**
 * FC média da sessão, lida do HealthKit para o intervalo em que ela correu.
 *
 * Só faz sentido no cardio — no treino de peso o backend ignora a FC — então
 * nem chega a consultar nas sessões de força. Retorna `null` em qualquer
 * tropeço: build sem HealthKit, permissão negada, sessão sem hora de início.
 */
async function sessionHeartRate(
  qc: ReturnType<typeof useQueryClient>,
  sessionId: string,
): Promise<number | null> {
  const sessions = qc.getQueryData<WorkoutSession[]>(qk.workoutSessions);
  const session = sessions?.find((item) => item.id === sessionId);
  if (!session || session.modality !== 'cardio' || !session.started_at) {
    return null;
  }
  return averageHeartRate(session.started_at, new Date().toISOString());
}

export function useCompleteWorkoutSession() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      // Cardio (14 §4.5): a FC média do intervalo modula a dificuldade em ±20%.
      // É a primeira consumidora do `averageHeartRate` que entrou com o
      // HealthKit. Best-effort de propósito — sem FC (ou sem HealthKit) o
      // backend conta só a duração, e finalizar o treino nunca pode falhar por
      // causa de um dado opcional.
      const avgHeartRate = await sessionHeartRate(qc, sessionId);
      return apiFetch<CompleteWorkoutResult>(`/workout-sessions/${sessionId}/complete`, {
        method: 'POST',
        body: avgHeartRate ? { avgHeartRate } : {},
      });
    },
    onSuccess: (data, sessionId) => {
      showBossProgressToast(toast, data.bossProgress);
      const endedAt = new Date().toISOString();
      qc.setQueryData<WorkoutSession[]>(qk.workoutSessions, (current) =>
        current?.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                status: 'completed',
                ended_at: endedAt,
                duration_minutes: data.durationMinutes,
                total_sets: data.totalSets,
                total_volume: data.totalVolume,
                xp_gained: data.xpGained,
                gold_gained: data.goldGained,
              }
            : session,
        ),
      );
      qc.setQueryData<WorkoutSession[]>(qk.completedSessions, (current) => {
        const source = qc.getQueryData<WorkoutSession[]>(qk.workoutSessions)?.find((session) => session.id === sessionId);
        if (!source || current?.some((session) => session.id === sessionId)) return current;
        return [{ ...source, status: 'completed', ended_at: endedAt }, ...(current ?? [])];
      });
      addCharacterReward(qc, data);
      addAchievements(qc, data.newAchievements);
      for (const completed of data.completedGoals ?? []) addAchievements(qc, completed.newAchievements);
      qc.invalidateQueries({ queryKey: qk.bodyParts, refetchType: 'inactive' });
      qc.invalidateQueries({ queryKey: qk.bodyGoals });
      qc.invalidateQueries({ queryKey: qk.workoutRecords, refetchType: 'inactive' });
      qc.invalidateQueries({ queryKey: qk.skills, refetchType: 'inactive' });
      qc.invalidateQueries({ queryKey: qk.habitLogsRoot, refetchType: 'inactive' });
      qc.invalidateQueries({ queryKey: qk.currentSeason, refetchType: 'inactive' });
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
      return apiFetch<BodyMeasurementResult>('/body-measurements', {
        method: 'POST',
        body: payload,
      });
    },
    onSuccess: (data) => {
      qc.setQueryData<BodyMeasurement[]>(qk.bodyMeasurements, (current) => {
        const existing = current ?? [];
        const measurement = data as BodyMeasurement;
        const next = existing.some((item) => item.id === measurement.id)
          ? existing.map((item) => (item.id === measurement.id ? measurement : item))
          : [measurement, ...existing];
        return next.sort((a, b) => String(b.measured_on).localeCompare(String(a.measured_on)));
      });
      addCharacterReward(qc, data);
      addAchievements(qc, data.newAchievements);
      for (const completed of data.completedGoals ?? []) addAchievements(qc, completed.newAchievements);
      qc.invalidateQueries({ queryKey: qk.bodyGoals });
      qc.invalidateQueries({ queryKey: qk.bodyParts, refetchType: 'inactive' });
      qc.invalidateQueries({ queryKey: qk.currentSeason, refetchType: 'inactive' });
    },
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
        addCharacterReward(qc, completed);
        addAchievements(qc, completed.newAchievements);
      }
      qc.invalidateQueries({ queryKey: qk.bodyGoals });
      qc.invalidateQueries({ queryKey: qk.bodyParts, refetchType: 'inactive' });
      qc.invalidateQueries({ queryKey: qk.currentSeason, refetchType: 'inactive' });
    },
  });
}
