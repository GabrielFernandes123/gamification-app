import type { Database } from './db';
import type { BossProgressResult } from './rpc';

type Tables = Database['public']['Tables'];

export type BodyPart = Tables['body_parts']['Row'];

export type FitnessExercise = Tables['fitness_exercises']['Row'] & {
  // Colunas novas (catálogo de exercícios) ainda fora dos tipos gerados do Supabase.
  equipment?: string | null;
  instructions?: string | null;
  catalog_id?: string | null;
  primaryBodyPart?: BodyPart | null;
  secondaryBodyPart?: BodyPart | null;
};

export type WorkoutSession = Tables['workout_sessions']['Row'] & {
  template_id?: string | null;
};

export type WorkoutSetType = Database['public']['Enums']['workout_set_type'];

/** Uma "queda" de drop-set (peso vai baixando sem descanso). */
export type SetDrop = { reps?: number | null; weight?: number | null };

export type WorkoutTemplateSet = Omit<Tables['workout_template_sets']['Row'], 'drops'> & {
  drops?: SetDrop[] | null;
};

export type WorkoutTemplateExercise = Tables['workout_template_exercises']['Row'] & {
  exercise?: FitnessExercise | null;
  sets?: WorkoutTemplateSet[];
};

export type WorkoutTemplate = Tables['workout_templates']['Row'] & {
  exercises?: WorkoutTemplateExercise[];
};

/** Estrutura usada pelo builder de treino (criação/edição). */
export type WorkoutDraftSet = {
  set_type: WorkoutSetType;
  target_reps: number | null;
  target_weight: number | null;
  target_duration_seconds: number | null;
  drops: SetDrop[] | null;
};

export type WorkoutDraftExercise = {
  exercise_id: string;
  superset_group: string | null;
  rest_warmup_seconds: number;
  rest_working_seconds: number;
  rest_after_seconds: number;
  notes: string | null;
  sets: WorkoutDraftSet[];
};

export type BodyAlertSettings = Tables['body_alert_settings']['Row'];

export type WorkoutSet = Omit<Tables['workout_sets']['Row'], 'drops'> & {
  drops?: SetDrop[] | null;
  exercise?: FitnessExercise | null;
  session?: { id: string; name: string; started_at: string; status: string } | null;
};

export type BodyMeasurement = Tables['body_measurements']['Row'];

export type CompleteWorkoutResult = {
  durationMinutes: number;
  totalSets: number;
  totalVolume: number;
  xpGained: number;
  goldGained: number;
  leveledUp?: boolean;
  newLevel?: number;
  newAchievements?: string[];
  newRecords?: number;
  completedGoals?: CompletedBodyGoal[];
  bossProgress?: BossProgressResult;
};

export type WorkoutPersonalRecord = Omit<Tables['workout_personal_records']['Row'], 'record_type' | 'set_id'> & {
  set_id: string | null;
  record_type: 'weight' | 'reps' | 'volume' | 'session_volume';
  exercise?: FitnessExercise | null;
};

export type BodyGoalType = Database['public']['Enums']['body_goal_type'];
export type BodyGoalStatus = Database['public']['Enums']['body_goal_status'];
export type BodyGoalDifficulty = Database['public']['Enums']['difficulty'];

export type BodyGoal = Tables['body_goals']['Row'] & {
  exercise?: FitnessExercise | null;
  bodyPart?: BodyPart | null;
};

export type CompletedBodyGoal = {
  completed: boolean;
  title: string;
  xpGained: number;
  goldGained: number;
  leveledUp?: boolean;
  newLevel?: number;
  newAchievements?: string[];
  bossProgress?: BossProgressResult;
};
