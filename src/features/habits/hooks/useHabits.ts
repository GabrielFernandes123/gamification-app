import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import type { Database } from '@/types/db';

export type HabitRow = Database['public']['Tables']['habits']['Row'];
export type HabitType = Database['public']['Enums']['habit_type'];
export type Difficulty = Database['public']['Enums']['difficulty'];
export type ScheduleType = Database['public']['Enums']['schedule_type'];

export type SkillBrief = { id: string; name: string; color: string | null };

/**
 * Margem do período em hábito NEGATIVO com agenda de período (02 §5.19).
 *
 * Vem CALCULADA do servidor — a mesma contagem que escala o dano da próxima
 * recaída e decide o bônus do fechamento. O cliente não recalcula: duas
 * implementações da mesma regra divergem e o número na tela vira mentira
 * (doc 08 §0.2). `null` em positivo e em negativo de dias fixos.
 */
export type PeriodMargin = {
  ceiling: number;
  /** Dias do período que já estouraram o limite diário. */
  spent: number;
  /** Quanto de margem sobra. Em 0, a próxima recaída custa mais. */
  left: number;
  /** Dias que ainda restam no período, incluindo hoje. */
  daysLeft: number;
  /** Dias que JÁ passaram do teto. 0 = ainda dentro da margem. */
  daysBeyond: number;
  /**
   * Quanto a PRÓXIMA recaída vai custar, como multiplicador do dano.
   *
   * Vem do servidor, e não é calculado aqui, porque a fórmula tem um dono só
   * (`reward.ts periodOvershootDamage`) — espelhá-la no cliente garantiria que
   * os dois divergissem no primeiro ajuste de balanceamento.
   */
  nextMultiplier: number;
  start: string;
  end: string;
};

export type Habit = HabitRow & {
  primarySkill: SkillBrief | null;
  secondarySkill: SkillBrief | null;
  periodMargin: PeriodMargin | null;
  /**
   * Sequência de PERÍODOS dentro do teto — só negativo com agenda de período.
   * Convive com `current_streak`, que segue contando DIAS: uma responde "como
   * foi hoje", a outra "como tem sido" (02 §5.19). Declarada aqui porque
   * `types/db.ts` é gerado e ainda não conhece a coluna.
   */
  period_streak?: number;
  best_period_streak?: number;
};

export function useHabits() {
  return useQuery({
    queryKey: qk.habits,
    queryFn: async (): Promise<Habit[]> => {
      return apiFetch<Habit[]>('/habits');
    },
  });
}
