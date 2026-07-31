// Tipos de retorno das funções RPC (jsonb) do backend.
// Espelham as funções públicas em supabase/migrations/*.

export type BossProgressResult = {
  damage?: number;
  objectiveDamage?: number;
  totalDamage?: number;
  bossCurrentHp?: number;
  bossMaxHp?: number;
  defeated?: boolean;
};

export type CompleteHabitResult = {
  logged: number;
  xpGained: number;
  goldGained: number;
  dayComplete: boolean; // a meta DIÁRIA foi batida
  newStreak: number; // sequência do hábito
  characterStreak?: number;
  leveledUp: boolean;
  newLevel: number;
  doneToday: number; // execuções de sucesso hoje
  dailyTarget: number; // meta diária
  newAchievements?: string[];
  bossProgress?: BossProgressResult;
};

export type RelapseResult = {
  relapses: number; // recaídas HOJE
  limit: number; // limite diário
  failed: boolean; // atingiu/passou o limite e tomou dano
  damageTaken: number;
  died: boolean;
  /**
   * Por que o dano foi o que foi. A API já devolvia os três; nenhum cliente lia,
   * então o aviso ANTES do clique ("a próxima recaída custa +50%") não tinha
   * contraparte DEPOIS — e um número sem explicação parece arbitrário.
   *
   * `daysBeyondCeiling` > 0: passou do teto de recaídas do período, dano escalado.
   * `cappedByPeriod`: o teto do período absorveu parte (um hábito sozinho não te
   * mata numa semana). `cappedByDay`: o teto diário somado absorveu parte.
   */
  daysBeyondCeiling?: number;
  cappedByPeriod?: boolean;
  cappedByDay?: boolean;
};

export type UndoResult = {
  undone: boolean;
  restoredStreak: number;
};

// Fechamento manual de HOJE ("Não fiz" / "Evitei").
export type SettleTodayResult = {
  settled?: boolean;
  alreadySettled?: boolean;
  kind?: 'positive' | 'negative';
  xp?: number;
  gold?: number;
  damage?: number;
  resisted?: boolean;
  died?: boolean;
  done?: number;
  target?: number;
};

export type SideQuestResult = {
  xpGained: number;
  goldGained: number;
  leveledUp: boolean;
  newLevel: number;
  newAchievements?: string[];
  bossProgress?: BossProgressResult;
};

export type DailySummaryEvent = {
  habitId: string;
  habitName: string;
  type: 'positive' | 'negative';
  date: string; // 'YYYY-MM-DD'
  success: boolean;
  xp: number;
  gold: number;
  damage: number;
};

export type DailySummary = {
  since: string;
  events: DailySummaryEvent[];
};
