export type TodayJourneyAction = {
  id: string;
  label: string;
  detail: string;
  tone: 'success' | 'warning' | 'danger' | 'magic';
};

export type TodayJourneyWidgetProps = {
  statusLabel: string;
  statusDetail: string;
  completion: number;
  completedHabits: number;
  dueHabits: number;
  xpToday: number;
  goldToday: number;
  failedToday: number;
  level: number;
  hp: number;
  maxHp: number;
  xpIntoLevel: number;
  xpLevelSpan: number;
  streak: number;
  gold: number;
  essence: number;
  claimableObjectives: number;
  atRiskObjectives: number;
  // Sentinelas em vez de null: o encoder nativo do widget rejeita null onde
  // espera String/Double, e a falha aparece como "Exception in HostFunction".
  // Sem boss ativo: nome vazio e HP zerado.
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  actions: TodayJourneyAction[];
  updatedAt: string;
};

export const EMPTY_TODAY_JOURNEY_WIDGET: TodayJourneyWidgetProps = {
  statusLabel: 'Aguardando jornada',
  statusDetail: 'Abra o Evolve para sincronizar o dia.',
  completion: 0,
  completedHabits: 0,
  dueHabits: 0,
  xpToday: 0,
  goldToday: 0,
  failedToday: 0,
  level: 1,
  hp: 0,
  maxHp: 1,
  xpIntoLevel: 0,
  xpLevelSpan: 100,
  streak: 0,
  gold: 0,
  essence: 0,
  claimableObjectives: 0,
  atRiskObjectives: 0,
  bossName: '',
  bossHp: 0,
  bossMaxHp: 0,
  actions: [],
  updatedAt: new Date(0).toISOString(),
};

export function clampRatio(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
