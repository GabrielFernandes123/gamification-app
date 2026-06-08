import {
  Coins,
  Crown,
  Flame,
  ListChecks,
  Sparkles,
  Sprout,
  Star,
  Sword,
  Swords,
  Target,
  Trophy,
  Wand2,
  type LucideIcon,
} from 'lucide-react-native';

import { theme } from '@/theme/theme';

export type Achievement = {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
};

// Mantém as chaves em sincronia com AchievementsService na API.
export const ACHIEVEMENTS: Achievement[] = [
  { key: 'FIRST_HABIT', title: 'Primeiro passo', description: 'Conclua seu primeiro hábito', icon: Sprout, color: theme.colors.success },
  { key: 'HABITS_10', title: 'Pegando ritmo', description: 'Conclua 10 hábitos', icon: ListChecks, color: theme.colors.success },
  { key: 'HABITS_100', title: 'Centenário', description: 'Conclua 100 hábitos', icon: Trophy, color: theme.colors.gold },
  { key: 'STREAK_7', title: 'Uma semana de fôlego', description: 'Streak de 7 dias', icon: Flame, color: theme.colors.primary },
  { key: 'STREAK_30', title: 'Mês de aço', description: 'Streak de 30 dias', icon: Flame, color: theme.colors.primary },
  { key: 'STREAK_100', title: 'Lendário', description: 'Streak de 100 dias', icon: Crown, color: theme.colors.gold },
  { key: 'LEVEL_5', title: 'Aprendiz', description: 'Alcance o nível 5', icon: Star, color: theme.colors.skill },
  { key: 'LEVEL_10', title: 'Veterano', description: 'Alcance o nível 10', icon: Star, color: theme.colors.skill },
  { key: 'LEVEL_25', title: 'Mestre', description: 'Alcance o nível 25', icon: Crown, color: theme.colors.gold },
  { key: 'FIRST_SKILL', title: 'Aprendendo a aprender', description: 'Crie sua primeira skill', icon: Sparkles, color: theme.colors.skill },
  { key: 'SKILLS_5', title: 'Repertório amplo', description: 'Crie 5 skills', icon: Wand2, color: theme.colors.skill },
  { key: 'SKILL_LEVEL_10', title: 'Especialista', description: 'Suba qualquer skill ao nível 10', icon: Target, color: theme.colors.skillAlt },
  { key: 'GOLD_1000', title: 'Bolso cheio', description: 'Acumule 1.000 de ouro ganho', icon: Coins, color: theme.colors.gold },
  { key: 'FIRST_SIDEQUEST', title: 'Primeira missão', description: 'Conclua sua primeira side quest', icon: Sword, color: theme.colors.skill },
  { key: 'SIDEQUESTS_10', title: 'Caçador de missões', description: 'Conclua 10 side quests', icon: Swords, color: theme.colors.primary },
  { key: 'RARE_BOSS_SLAYER', title: 'Queda do guardião', description: 'Derrote seu primeiro boss. Recompensa: ouro e Essência', icon: Trophy, color: theme.colors.gold },
  { key: 'RARE_LONG_TIER', title: 'Arco longo', description: 'Derrote um boss trimestral, semestral ou anual', icon: Crown, color: theme.colors.gold },
  { key: 'RARE_EQUIPMENT_10', title: 'Arsenal real', description: 'Colete 10 equipamentos. Recompensa: ponto de atributo', icon: Sword, color: theme.colors.skillAlt },
  { key: 'RARE_GOLD_SINK_5000', title: 'Economia girando', description: 'Gaste 5.000 de ouro em ralos de economia', icon: Coins, color: theme.colors.gold },
  { key: 'RARE_ESSENCE_10', title: 'Núcleo desperto', description: 'Acumule 10 de Essência. Recompensa: Essência e atributo', icon: Sparkles, color: theme.colors.skill },
  { key: 'RARE_DEATHLESS_LEVEL_25', title: 'Run intacta', description: 'Alcance nível 25 sem morrer', icon: Crown, color: theme.colors.success },
];

export const ACHIEVEMENT_BY_KEY: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.key, a]),
);
