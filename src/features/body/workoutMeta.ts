import { theme } from '@/theme/theme';
import type { WorkoutDraftSet, WorkoutSetType } from '@/types/body';

/**
 * `duration` existe porque `isometric` era o ÚNICO tipo cronometrado, então o
 * builder de cardio o escolhia sozinho e uma corrida aparecia como "Isometria"
 * (auditoria funcional de 2026-07-30 §7). Isometria voltou a significar isometria — prancha,
 * barra estática —, e o que é medido em tempo sem ser isometria tem caixa própria.
 */
export const SET_TYPE_META: Record<WorkoutSetType, { label: string; short: string; color: string; timeBased?: boolean }> = {
  warmup: { label: 'Aquecimento', short: 'Aq', color: theme.colors.xp },
  working: { label: 'Trabalho', short: 'W', color: theme.colors.primary },
  failure: { label: 'Até a falha', short: 'Falha', color: theme.colors.hp },
  dropset: { label: 'Drop-set', short: 'Drop', color: theme.colors.skill },
  isometric: { label: 'Isometria', short: 'Iso', color: theme.colors.success, timeBased: true },
  duration: { label: 'Tempo', short: 'Tempo', color: theme.colors.skill, timeBased: true },
};

export const SET_TYPE_OPTIONS: { value: WorkoutSetType; label: string }[] = (
  ['warmup', 'working', 'failure', 'dropset', 'isometric', 'duration'] as WorkoutSetType[]
).map((value) => ({ value, label: SET_TYPE_META[value].label }));

export const SUPERSET_GROUPS = ['A', 'B', 'C', 'D'];

export function newDraftSet(set_type: WorkoutSetType = 'working'): WorkoutDraftSet {
  // Série cronometrada não tem repetição, e no cardio também não tem carga: 20 kg
  // numa corrida seria um número inventado esperando virar estatística.
  const timeBased = SET_TYPE_META[set_type].timeBased === true;
  return {
    set_type,
    target_reps: timeBased ? null : 10,
    target_weight: set_type === 'warmup' || set_type === 'duration' ? null : 20,
    target_duration_seconds: timeBased ? (set_type === 'duration' ? 600 : 30) : null,
    drops: set_type === 'dropset' ? [{ reps: 8, weight: 20 }, { reps: 8, weight: 12 }] : null,
  };
}

/** Resumo curto de um conjunto de séries planejadas, ex.: "2 aq · 4×10 · 20kg". */
export function summarizeSets(sets: { set_type: WorkoutSetType; target_reps?: number | null; target_weight?: number | null; target_duration_seconds?: number | null }[]): string {
  if (sets.length === 0) return 'Sem séries';
  const warm = sets.filter((s) => s.set_type === 'warmup').length;
  const work = sets.filter((s) => s.set_type !== 'warmup');
  const parts: string[] = [];
  if (warm > 0) parts.push(`${warm} aquec.`);
  if (work.length > 0) {
    const first = work[0];
    // Qualquer série cronometrada se resume em segundos, não em repetições — e
    // desde que `duration` existe, `isometric` deixou de ser a única.
    const reps = SET_TYPE_META[first.set_type].timeBased
      ? `${first.target_duration_seconds ?? 0}s`
      : `${first.target_reps ?? '-'} reps`;
    const weight = first.target_weight ? ` · ${first.target_weight}kg` : '';
    parts.push(`${work.length} séries · ${reps}${weight}`);
  }
  return parts.join(' · ');
}
