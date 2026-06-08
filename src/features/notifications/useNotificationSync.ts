import { useEffect } from 'react';

import {
  useBodyAlertSettings,
  useBodyMeasurements,
  useBodyParts,
  useRecentWorkoutSets,
  useWorkoutSessions,
} from '@/features/body/hooks/useBody';
import { useHabits } from '@/features/habits/hooks/useHabits';
import type { BodyAlertSettings, BodyMeasurement, BodyPart, FitnessExercise, WorkoutSession } from '@/types/body';
import { ensureNotificationPermissions } from './permissions';
import { syncAppNotifications } from './scheduler';

// Re-agenda os lembretes sempre que os hábitos mudam (CRUD invalida -> refetch)
// e no foreground (refetch on focus). Pede permissão de forma lazy.
export function useNotificationSync() {
  const habits = useHabits();
  const sessions = useWorkoutSessions();
  const measurements = useBodyMeasurements();
  const bodyParts = useBodyParts();
  const recentSets = useRecentWorkoutSets();
  const settings = useBodyAlertSettings();

  useEffect(() => {
    const data = habits.data;
    if (!data || !sessions.data || !measurements.data || !bodyParts.data || !recentSets.data || !settings.data) return;
    const hasReminders = data.some(
      (h) => h.is_active && (h.reminder_times?.length ?? 0) > 0,
    );
    const completed = sessions.data.filter((session) => session.status === 'completed');
    const bodyAlerts = buildBodyNotificationAlerts(
      completed[0],
      measurements.data[0],
      bodyParts.data,
      recentSets.data,
      settings.data,
    );
    (async () => {
      if (hasReminders || bodyAlerts.length > 0) {
        const ok = await ensureNotificationPermissions();
        if (!ok) return;
      }
      await syncAppNotifications(data, bodyAlerts);
    })();
  }, [bodyParts.data, habits.data, measurements.data, recentSets.data, sessions.data, settings.data]);
}

function buildBodyNotificationAlerts(
  lastWorkout: WorkoutSession | undefined,
  latestMeasurement: BodyMeasurement | undefined,
  bodyParts: BodyPart[],
  sets: { created_at: string; exercise?: FitnessExercise | null }[],
  settings: BodyAlertSettings,
) {
  const alerts: string[] = [];
  if (lastWorkout && daysSince(lastWorkout.started_at) >= settings.workout_stale_days) {
      alerts.push(`Você está há ${daysSince(lastWorkout.started_at)} dias sem treinar.`);
  }
  if (latestMeasurement && daysSince(latestMeasurement.measured_on) >= settings.measurement_stale_days) {
      alerts.push(`Você está há ${daysSince(latestMeasurement.measured_on)} dias sem registrar medidas.`);
  }
  for (const part of bodyParts.slice(0, 4)) {
    const lastSet = sets.find((set) => set.exercise?.primary_body_part_id === part.id || set.exercise?.secondary_body_part_id === part.id);
    if (lastSet && daysSince(lastSet.created_at) >= settings.body_part_stale_days) {
      alerts.push(`${part.name} sem estímulo há ${daysSince(lastSet.created_at)} dias.`);
    }
  }
  return alerts;
}

function daysSince(date: string) {
  const start = new Date(date).getTime();
  return Math.max(0, Math.floor((Date.now() - start) / 86_400_000));
}
