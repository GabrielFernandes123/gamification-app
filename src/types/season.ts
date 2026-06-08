export type BossTier = 'mensal' | 'trimestral' | 'semestral' | 'anual';
export type BossStatus = 'ativo' | 'vencido' | 'perdido' | 'encerrado';
export type SeasonStatus = 'ativa' | 'concluida' | 'encerrada';
export type EconomySourceType =
  | 'habit'
  | 'workout'
  | 'sidequest'
  | 'body_goal'
  | 'body_measurement'
  | 'boss';

export type Season = {
  id: string;
  user_id: string;
  name: string;
  lore: string | null;
  arc_lore: string | null;
  theme_seed: string | null;
  preset: string;
  starts_on: string;
  ends_on: string;
  status: SeasonStatus;
};

export type Boss = {
  id: string;
  user_id: string;
  season_id: string;
  tier: BossTier;
  parent_boss_id: string | null;
  name: string;
  theme: string;
  description: string | null;
  weakness_module_key: EconomySourceType | null;
  weakness_bonus: number;
  attack_boss: number;
  max_hp: number;
  current_hp: number;
  window_start: string;
  window_end: string;
  status: BossStatus;
  rewards_claimed: boolean;
};

export type BossObjective = {
  id: string;
  boss_id: string;
  phase_id: string | null;
  source_type: EconomySourceType;
  title: string;
  spec: Record<string, unknown>;
  target: number;
  progress: number;
  completed: boolean;
  boss_damage: number;
  completed_at: string | null;
};

export type BossDamageEvent = {
  id: string;
  user_id: string;
  boss_id: string;
  phase_id: string | null;
  economy_event_id: string | null;
  amount: number;
  source_type: EconomySourceType | null;
  was_weakness: boolean;
  was_critical: boolean;
  occurred_at: string;
};

/** Um mês do arco (Fase 5): vem das fases do boss-topo. `boss` é o miniboss
 * mensal daquele período se já existir (passado/atual); null = futuro ("???"). */
export type ArcMonth = {
  monthIndex: number;
  unlockOn: string;
  phaseStatus: 'ativa' | 'bloqueada' | 'vencida' | string;
  boss: Boss | null;
};

export type CurrentSeasonSnapshot = {
  season: Season;
  boss: Boss;
  objectives: BossObjective[];
  recentDamage: BossDamageEvent[];
  charges: number;
  pendingAttributePoints: number;
  linkedBosses?: Boss[];
  arcMonths?: ArcMonth[];
  today?: string;
};

export type NarrativeBeat = {
  id: string;
  user_id: string;
  season_id: string;
  boss_id: string | null;
  kind: 'capitulo' | 'marco' | 'enrave' | 'narracao' | string;
  title: string | null;
  content: string;
  layer: number;
  meta: Record<string, unknown>;
  created_at: string;
};

/** Beat na visão de saga completa: traz o tier e o nome do boss de origem. */
export type SagaBeat = NarrativeBeat & {
  tier: BossTier | null;
  boss_name: string | null;
};

export type SagaResponse = { arcLore: string | null; beats: SagaBeat[] };

export type SeasonStorySettings = {
  id: string;
  user_id: string;
  season_id: string;
  theme_seed: string | null;
  preset: string;
  starts_on: string | null;
  ends_on: string | null;
  ai_enabled: boolean;
};

export type ActiveSeasonStory = CurrentSeasonSnapshot & {
  active: true;
  narrativeBeats: NarrativeBeat[];
  storySettings: SeasonStorySettings;
  aiAvailable: boolean;
};

/** Sem temporada ativa: o app mostra a tela de configuração/início. */
export type InactiveSeasonStory = {
  active: false;
  aiAvailable: boolean;
};

export type SeasonStoryResponse = ActiveSeasonStory | InactiveSeasonStory;

export type ConfigureSeasonStoryInput = {
  themeSeed?: string | null;
  preset?: BossTier;
  startsOn?: string | null;
  endsOn?: string | null;
  aiEnabled?: boolean;
};

export type StartSeasonInput = {
  themeSeed?: string | null;
  preset?: BossTier;
  aiEnabled?: boolean;
};
