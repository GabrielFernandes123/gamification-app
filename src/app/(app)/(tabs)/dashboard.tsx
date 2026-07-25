import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Coins,
  Dumbbell,
  Flame,
  Heart,
  Package,
  ScrollText,
  Settings,
  ShieldAlert,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Zap,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/bars/ProgressBar';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useBodyMeasurements, useWorkoutSessions } from '@/features/body/hooks/useBody';
import { useCharacter, useProfile } from '@/features/character/hooks/useCharacter';
import { useHabits } from '@/features/habits/hooks/useHabits';
import { habitProgress, useTodayLogs } from '@/features/habits/hooks/useTodayLogs';
import { isDueToday } from '@/features/habits/meta';
import {
  useObjectivesOverview,
  type ObjectiveOverviewItem,
} from '@/features/objectives/hooks/useObjectives';
import { ModuleLauncher } from '@/features/modules/ModuleLauncher';
import { useCurrentSeason } from '@/features/season/hooks/useCurrentSeason';
import { useSideQuests } from '@/features/sidequests/hooks/useSideQuests';
import { OnboardingModal } from '@/features/onboarding/OnboardingModal';
import { DailySummaryModal } from '@/features/summary/components/DailySummaryModal';
import { useDailySummary } from '@/features/summary/hooks/useDailySummary';
import { useTodayJourneyWidget } from '@/features/widgets/useTodayJourneyWidget';
import type { TodayJourneyWidgetProps } from '@/features/widgets/todayJourney';
import { useToday } from '@/hooks/useToday';
import { qk } from '@/lib/queryKeys';
import { theme } from '@/theme/theme';
import { initialsFromName, levelProgress } from '@/utils/leveling';

type MissionTone = 'ready' | 'danger' | 'active' | 'quiet';
type ActionTone = 'primary' | 'training' | 'quest' | 'store';

export default function DashboardScreen() {
  const qc = useQueryClient();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { summary, dismiss } = useDailySummary();
  const { today, weekday } = useToday();

  const character = useCharacter();
  const profile = useProfile();
  const habits = useHabits();
  const logs = useTodayLogs(today);
  const sideQuests = useSideQuests();
  const workoutSessions = useWorkoutSessions();
  const measurements = useBodyMeasurements();
  const season = useCurrentSeason('mensal');
  const objectives = useObjectivesOverview();

  const daily = useMemo(() => {
    const allHabits = habits.data ?? [];
    const dueHabits = allHabits.filter((h) => isDueToday(h, weekday));
    const completedHabits = dueHabits.filter(
      (h) => habitProgress(logs.data, h.id).success > 0,
    );
    const failedToday = (logs.data ?? []).filter((l) => !l.success).length;
    const xpToday = (logs.data ?? []).reduce((sum, l) => sum + l.xp_gained, 0);
    const goldToday = (logs.data ?? []).reduce((sum, l) => sum + l.gold_gained, 0);
    const topStreak = allHabits.reduce((max, h) => Math.max(max, h.current_streak), 0);
    const nextHabits = dueHabits
      .filter((h) => habitProgress(logs.data, h.id).success === 0)
      .slice(0, 3);
    return {
      dueHabits,
      completedHabits,
      failedToday,
      xpToday,
      goldToday,
      topStreak,
      nextHabits,
      completion: dueHabits.length > 0 ? completedHabits.length / dueHabits.length : 0,
    };
  }, [habits.data, logs.data, weekday]);

  const body = useMemo(() => {
    const completed = (workoutSessions.data ?? []).filter((s) => s.status === 'completed');
    const lastWorkoutDays = completed[0] ? daysSince(completed[0].started_at) : null;
    const lastMeasurementDays = measurements.data?.[0]
      ? daysSince(measurements.data[0].measured_on)
      : null;
    return {
      weekWorkouts: completed.filter((s) => daysSince(s.started_at) <= 7).length,
      lastWorkoutDays,
      lastMeasurementDays,
    };
  }, [measurements.data, workoutSessions.data]);

  const missions = useMemo(() => {
    const overview = objectives.data;
    if (!overview) return [];
    const rows: Array<{ item: ObjectiveOverviewItem; tone: MissionTone; label: string }> = [];
    rows.push(
      ...overview.claimable.slice(0, 2).map((item) => ({
        item,
        tone: 'ready' as const,
        label: 'Recompensa pronta',
      })),
    );
    rows.push(
      ...overview.atRisk.slice(0, 2).map((item) => ({
        item,
        tone: 'danger' as const,
        label: 'Em risco',
      })),
    );
    rows.push(
      ...overview.activeContracts.slice(0, 2).map((item) => ({
        item,
        tone: 'active' as const,
        label: 'Contrato ativo',
      })),
    );
    rows.push(
      ...overview.activeChallenges.slice(0, 2).map((item) => ({
        item,
        tone: 'active' as const,
        label: 'Desafio ativo',
      })),
    );
    rows.push(
      ...overview.compositeGoals.slice(0, 2).map((item) => ({
        item,
        tone: 'quiet' as const,
        label: 'Meta composta',
      })),
    );
    return dedupeMissions(rows).slice(0, 4);
  }, [objectives.data]);

  const journeyStatus = useMemo(() => {
    const claimable = objectives.data?.claimable.length ?? 0;
    const atRisk = objectives.data?.atRisk.length ?? 0;
    if (claimable > 0) {
      return {
        label: 'Recompensa disponível',
        text: `${claimable} objetivo${claimable === 1 ? '' : 's'} aguardando resgate`,
        color: theme.colors.gold,
        icon: <Trophy color={theme.colors.gold} size={16} />,
      };
    }
    if (atRisk > 0) {
      return {
        label: 'Zona de risco',
        text: `${atRisk} compromisso${atRisk === 1 ? '' : 's'} pedindo atenção`,
        color: theme.colors.hp,
        icon: <ShieldAlert color={theme.colors.hp} size={16} />,
      };
    }
    if (daily.completion >= 1 && daily.dueHabits.length > 0) {
      return {
        label: 'Dia dominado',
        text: 'Todas as ações principais foram concluídas',
        color: theme.colors.success,
        icon: <CheckCircle2 color={theme.colors.success} size={16} />,
      };
    }
    return {
      label: 'Em progresso',
      text: 'Complete a próxima ação para avançar a jornada',
      color: theme.colors.primary,
      icon: <Flame color={theme.colors.primary} size={16} />,
    };
  }, [daily.completion, daily.dueHabits.length, objectives.data]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: qk.character }),
      qc.invalidateQueries({ queryKey: qk.profile }),
      qc.invalidateQueries({ queryKey: qk.habits }),
      qc.invalidateQueries({ queryKey: qk.todayLogs(today) }),
      qc.invalidateQueries({ queryKey: qk.sideQuests }),
      qc.invalidateQueries({ queryKey: qk.workoutSessions }),
      qc.invalidateQueries({ queryKey: qk.bodyMeasurements }),
      qc.invalidateQueries({ queryKey: qk.objectivesOverview }),
      qc.invalidateQueries({ queryKey: [...qk.currentSeason, 'mensal'] }),
    ]);
    setRefreshing(false);
  }

  const c = character.data;
  const level = c?.level ?? 1;
  const xp = levelProgress(c?.total_xp ?? 0, level);
  const maxHp = c?.max_hp ?? 1;
  const hpRatio = maxHp > 0 ? (c?.current_hp ?? 0) / maxHp : 0;
  const name = profile.data?.display_name ?? 'Aventureiro';
  const boss = season.data?.boss;
  const bossRatio = boss && boss.max_hp > 0 ? boss.current_hp / boss.max_hp : 0;
  const widgetSnapshot = useMemo<TodayJourneyWidgetProps>(() => {
    const actions: TodayJourneyWidgetProps['actions'] = [];
    for (const habit of daily.nextHabits.slice(0, 3)) {
      actions.push({
        id: `habit-${habit.id}`,
        label: habit.name,
        detail: 'Próximo foco',
        tone: 'warning',
      });
    }

    const claimable = objectives.data?.claimable.length ?? 0;
    const atRisk = objectives.data?.atRisk.length ?? 0;

    if (claimable > 0) {
      actions.push({
        id: 'claimable-objectives',
        label: `${claimable} recompensa${claimable === 1 ? '' : 's'}`,
        detail: 'Resgate disponível',
        tone: 'success',
      });
    }

    if (atRisk > 0) {
      actions.push({
        id: 'at-risk-objectives',
        label: `${atRisk} compromisso${atRisk === 1 ? '' : 's'} em risco`,
        detail: 'Prioridade alta',
        tone: 'danger',
      });
    }

    if (body.lastWorkoutDays !== null && body.lastWorkoutDays >= 3) {
      actions.push({
        id: 'workout-stale',
        label: 'Treino atrasado',
        detail: `${body.lastWorkoutDays}d sem treino`,
        tone: 'magic',
      });
    }

    if (actions.length === 0 && daily.dueHabits.length > 0) {
      actions.push({
        id: 'clean-day',
        label: 'Dia dominado',
        detail: 'Todas as ações principais foram feitas',
        tone: 'success',
      });
    }

    return {
      statusLabel: journeyStatus.label,
      statusDetail: journeyStatus.text,
      completion: daily.completion,
      completedHabits: daily.completedHabits.length,
      dueHabits: daily.dueHabits.length,
      xpToday: daily.xpToday,
      goldToday: daily.goldToday,
      failedToday: daily.failedToday,
      level,
      hp: c?.current_hp ?? 0,
      maxHp,
      xpIntoLevel: xp.into,
      xpLevelSpan: xp.span,
      streak: c?.character_streak ?? daily.topStreak,
      gold: c?.gold ?? 0,
      essence: c?.essencia ?? 0,
      claimableObjectives: claimable,
      atRiskObjectives: atRisk,
      bossName: boss?.name ?? '',
      bossHp: boss?.current_hp ?? 0,
      bossMaxHp: boss?.max_hp ?? 0,
      actions: actions.slice(0, 5),
      updatedAt: new Date().toISOString(),
    };
  }, [
    body.lastWorkoutDays,
    boss?.current_hp,
    boss?.max_hp,
    boss?.name,
    c?.character_streak,
    c?.current_hp,
    c?.essencia,
    c?.gold,
    daily.completedHabits.length,
    daily.completion,
    daily.dueHabits.length,
    daily.failedToday,
    daily.goldToday,
    daily.nextHabits,
    daily.topStreak,
    daily.xpToday,
    journeyStatus.label,
    journeyStatus.text,
    level,
    maxHp,
    objectives.data?.atRisk.length,
    objectives.data?.claimable.length,
    xp.into,
    xp.span,
  ]);

  const widgetReady =
    !character.isLoading &&
    !profile.isLoading &&
    !habits.isLoading &&
    !logs.isLoading &&
    !objectives.isLoading;
  useTodayJourneyWidget(widgetReady ? widgetSnapshot : null);

  // Estado de carregamento: evita mostrar "Aventureiro, Nível 1, 0 ouro" falsos
  // enquanto as queries principais ainda não responderam.
  if (character.isLoading || profile.isLoading) {
    return (
      <Screen contentStyle={styles.centerState}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text variant="bodyMuted">Carregando sua jornada...</Text>
      </Screen>
    );
  }

  if (character.isError) {
    return (
      <Screen contentStyle={styles.centerState}>
        <Card accent={theme.colors.hp} style={styles.errorCard}>
          <ShieldAlert color={theme.colors.hp} size={28} />
          <Text variant="title">Não foi possível carregar o personagem</Text>
          <Text variant="bodyMuted">
            Verifique sua conexão e tente novamente.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => character.refetch()}
            style={styles.retryBtn}
          >
            <Text variant="title" color={theme.colors.textInverse}>
              Tentar novamente
            </Text>
          </Pressable>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll refreshing={refreshing} onRefresh={onRefresh} contentStyle={styles.page}>
      <View style={styles.topBar}>
        <View style={styles.topCopy}>
          <Text variant="label" color={theme.colors.primary}>
            Jornada de hoje
          </Text>
          <Text variant="h1" numberOfLines={1}>
            {name}
          </Text>
        </View>
        <View style={styles.topActions}>
          <IconButton
            icon={<Trophy color={theme.colors.gold} size={20} />}
            label="Conquistas"
            onPress={() => router.push('/(app)/achievements')}
          />
          <IconButton
            icon={<Settings color={theme.colors.textMuted} size={20} />}
            label="Configurações"
            onPress={() => router.push('/(app)/settings')}
          />
        </View>
      </View>

      <View style={[styles.statusBanner, { borderColor: withAlpha(journeyStatus.color, 0.38) }]}>
        <View style={[styles.statusRune, { backgroundColor: withAlpha(journeyStatus.color, 0.18) }]}>
          {journeyStatus.icon}
        </View>
        <View style={styles.flex}>
          <Text variant="label" color={journeyStatus.color}>
            {journeyStatus.label}
          </Text>
          <Text variant="bodyMedium" numberOfLines={1}>
            {journeyStatus.text}
          </Text>
        </View>
      </View>

      <View style={styles.heroPanel}>
        <View style={styles.heroHeader}>
          <Pressable
            onPress={() => router.push('/(app)/character')}
            accessibilityRole="button"
            style={styles.characterBlock}
          >
            <View style={styles.avatarFrame}>
              <View style={styles.avatar}>
                <Text variant="h2" color={theme.colors.textInverse}>
                  {initialsFromName(name)}
                </Text>
              </View>
              <View style={styles.levelSeal}>
                <Text variant="label" color={theme.colors.textInverse}>
                  {level}
                </Text>
              </View>
            </View>
            <View style={styles.characterCopy}>
              <Text variant="label">Ficha ativa</Text>
              <Text variant="h2" numberOfLines={1}>
                Nível {level}
              </Text>
              <Text variant="bodyMuted" numberOfLines={1}>
                {daily.completedHabits.length}/{daily.dueHabits.length} ações do dia
              </Text>
            </View>
          </Pressable>

          <Image
            source={require('../../../../assets/logo.png')}
            resizeMode="contain"
            style={styles.crest}
          />
        </View>

        <View style={styles.vitalGrid}>
          <VitalBar
            icon={<Heart color={theme.colors.hp} size={16} />}
            label="HP"
            value={`${c?.current_hp ?? 0}/${maxHp}`}
            progress={hpRatio}
            color={theme.colors.hp}
          />
          <VitalBar
            icon={<Zap color={theme.colors.xp} size={16} />}
            label="XP"
            value={`${xp.into}/${xp.span}`}
            progress={xp.ratio}
            color={theme.colors.xp}
          />
        </View>

        <View style={styles.resourceStrip}>
          <ResourcePill icon={<Coins color={theme.colors.gold} size={16} />} value={c?.gold ?? 0} label="Ouro" />
          <ResourcePill icon={<Sparkles color={theme.colors.essencia} size={16} />} value={c?.essencia ?? 0} label="Essência" />
          <ResourcePill icon={<Flame color={theme.colors.primary} size={16} />} value={c?.character_streak ?? daily.topStreak} label="Sequência" />
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/(app)/(tabs)/historia')}
        accessibilityRole="button"
        style={styles.bossPanel}
      >
        <View style={styles.bossTop}>
          <View style={styles.bossIcon}>
            <Swords color={theme.colors.textInverse} size={22} />
          </View>
          <View style={styles.flex}>
            <Text variant="label" color={theme.colors.essencia}>
              Ameaça atual
            </Text>
            <Text variant="title" numberOfLines={1}>
              {boss?.name ?? 'Nenhuma temporada ativa'}
            </Text>
          </View>
          <ArrowRight color={theme.colors.textMuted} size={20} />
        </View>
        {boss ? (
          <>
            <ProgressBar progress={bossRatio} color={theme.colors.hp} trackColor={theme.colors.bg} height={10} />
            <View style={styles.bossMeta}>
              <Text variant="bodyMuted">
                HP {boss.current_hp}/{boss.max_hp}
              </Text>
              <Text variant="bodyMuted">{season.data?.objectives.length ?? 0} objetivos</Text>
            </View>
          </>
        ) : (
          <Text variant="bodyMuted">
            Inicie uma história para transformar sua rotina em batalha.
          </Text>
        )}
      </Pressable>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionCopy}>
          <Text variant="h2">Quadro de missões</Text>
          <Text variant="bodyMuted" numberOfLines={2}>
            Metas, desafios e contratos em andamento.
          </Text>
        </View>
        <View style={styles.countBadge}>
          <Trophy color={theme.colors.gold} size={14} />
          <Text variant="label" color={theme.colors.text} numberOfLines={1}>
            {objectives.data?.claimable.length ?? 0} resgate
          </Text>
        </View>
      </View>

      <View style={styles.missionBoard}>
        {missions.length === 0 ? (
          <View style={styles.emptyMission}>
            <ScrollText color={theme.colors.textMuted} size={22} />
            <View style={styles.flex}>
              <Text variant="title">Nenhuma missão ativa</Text>
              <Text variant="bodyMuted">
                Crie metas compostas, desafios ou contratos para preencher este quadro.
              </Text>
            </View>
          </View>
        ) : (
          missions.map((mission) => (
            <MissionRow
              key={`${mission.label}-${mission.item.id}`}
              item={mission.item}
              label={mission.label}
              tone={mission.tone}
            />
          ))
        )}
      </View>

      <View style={styles.dailyPanel}>
        <View style={styles.dailyHeader}>
          <View>
            <Text variant="label" color={theme.colors.success}>
              Progresso do dia
            </Text>
            <Text variant="h2">
              {daily.completedHabits.length}/{daily.dueHabits.length} hábitos
            </Text>
          </View>
          <View style={styles.dailyPercent}>
            <Text variant="stat" color={theme.colors.success}>
              {Math.round(daily.completion * 100)}%
            </Text>
          </View>
        </View>
        <ProgressBar progress={daily.completion} color={theme.colors.success} trackColor={theme.colors.bg} height={14} />
        <View style={styles.rewardRow}>
          <RewardChip icon={<Zap color={theme.colors.xp} size={15} />} label={`${daily.xpToday} XP`} />
          <RewardChip icon={<Coins color={theme.colors.gold} size={15} />} label={`${daily.goldToday} ouro`} />
          <RewardChip icon={<ShieldAlert color={theme.colors.hp} size={15} />} label={`${daily.failedToday} falhas`} />
        </View>
        <View style={styles.goalGrid}>
          <DailyGoalBar
            icon={<Zap color={theme.colors.xp} size={15} />}
            label="Meta XP"
            value={daily.xpToday}
            goal={c?.daily_xp_goal ?? 0}
            color={theme.colors.xp}
          />
          <DailyGoalBar
            icon={<Coins color={theme.colors.gold} size={15} />}
            label="Meta ouro"
            value={daily.goldToday}
            goal={c?.daily_gold_goal ?? 0}
            color={theme.colors.gold}
          />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionCopy}>
          <Text variant="h2">Próximos comandos</Text>
          <Text variant="bodyMuted" numberOfLines={2}>
            Ações rápidas para manter a campanha andando.
          </Text>
        </View>
      </View>

      <View style={styles.actionGrid}>
        <ActionTile
          icon={<Target color={theme.colors.success} size={21} />}
          label="Próxima ação"
          value={daily.nextHabits[0]?.name ?? 'Tudo em dia'}
          meta={daily.nextHabits.length > 0 ? `${daily.nextHabits.length} pendente` : 'rota limpa'}
          tone="primary"
          onPress={() => router.push('/(app)/(tabs)/habits')}
        />
        <ActionTile
          icon={<Dumbbell color={theme.colors.skill} size={21} />}
          label="Treino"
          value={`${body.weekWorkouts} na semana`}
          meta={
            body.lastWorkoutDays === null
              ? 'sem registro'
              : body.lastWorkoutDays === 0
                ? 'feito hoje'
                : `${body.lastWorkoutDays}d sem treino`
          }
          tone="training"
          onPress={() => router.push('/(app)/(tabs)/body')}
        />
        <ActionTile
          icon={<ScrollText color={theme.colors.essencia} size={21} />}
          label="Missões"
          value={`${(sideQuests.data ?? []).filter((q) => !q.is_completed).length} pendentes`}
          meta={`${objectives.data?.counts.activeChallenges ?? 0} desafios`}
          tone="quest"
          onPress={() => router.push('/(app)/sidequests')}
        />
        <ActionTile
          icon={<Package color={theme.colors.gold} size={21} />}
          label="Loja"
          value="Itens e recompensas"
          meta={`${c?.gold ?? 0} ouro`}
          tone="store"
          onPress={() => router.push('/(app)/(tabs)/store')}
        />
      </View>

      <View style={styles.statusDeck}>
        <View style={styles.statusDeckHeader}>
          <Text variant="label" color={theme.colors.textMuted}>
            Radar da base
          </Text>
          <View style={styles.statusSignal}>
            <Sparkles color={theme.colors.essencia} size={14} />
            <Text variant="label" color={theme.colors.essencia}>
              ativo
            </Text>
          </View>
        </View>
        <StatusLine
          icon={<CalendarDays color={theme.colors.textMuted} size={17} />}
          label="Medidas corporais"
          value={
            body.lastMeasurementDays === null
              ? 'sem registro'
              : `${body.lastMeasurementDays}d atrás`
          }
          detail={body.lastMeasurementDays !== null && body.lastMeasurementDays <= 7 ? 'atualizado' : 'registrar medida'}
          color={body.lastMeasurementDays !== null && body.lastMeasurementDays <= 7 ? theme.colors.success : theme.colors.gold}
          onPress={() => router.push('/(app)/(tabs)/body')}
        />
        <StatusLine
          icon={<CheckCircle2 color={theme.colors.success} size={17} />}
          label="Hábitos pendentes"
          value={String(Math.max(0, daily.dueHabits.length - daily.completedHabits.length))}
          detail={daily.nextHabits[0]?.name ?? 'sem pendências'}
          color={daily.nextHabits.length > 0 ? theme.colors.hp : theme.colors.success}
          onPress={() => router.push('/(app)/(tabs)/habits')}
        />
      </View>

      {/* Atalhos dos módulos do registry (08 §6.1) — é o único caminho do app
          para telas sem aba própria, como Tempo de tela. */}
      <ModuleLauncher />

      <DailySummaryModal summary={summary} onDismiss={dismiss} />
      <OnboardingModal />
    </Screen>
  );
}

function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.iconBtn}>
      {icon}
    </Pressable>
  );
}

function VitalBar({
  icon,
  label,
  value,
  progress,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  progress: number;
  color: string;
}) {
  return (
    <View style={styles.vital}>
      <View style={styles.vitalTop}>
        <View style={styles.inline}>
          {icon}
          <Text variant="label" color={theme.colors.text}>
            {label}
          </Text>
        </View>
        <Text variant="bodyMuted">{value}</Text>
      </View>
      <ProgressBar progress={progress} color={color} trackColor={theme.colors.bg} height={9} />
    </View>
  );
}

function ResourcePill({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.resourcePill}>
      {icon}
      <View style={styles.flex}>
        <Text variant="title" numberOfLines={1}>
          {value}
        </Text>
        <Text variant="label" numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function MissionRow({
  item,
  label,
  tone,
}: {
  item: ObjectiveOverviewItem;
  label: string;
  tone: MissionTone;
}) {
  const color = toneColor(tone);
  const passed = item.progress?.passed ?? false;
  return (
    <View style={styles.missionRow}>
      <View style={[styles.missionMark, { backgroundColor: color }]} />
      <View style={styles.flex}>
        <Text variant="label" color={color}>
          {label}
        </Text>
        <Text variant="bodyMedium" numberOfLines={1}>
          {item.name}
        </Text>
      </View>
      <View style={[styles.statePill, { borderColor: color }]}>
        <Text variant="label" color={color}>
              {item.claim?.claimed ? 'feito' : passed ? 'pronto' : 'andamento'}
        </Text>
      </View>
    </View>
  );
}

function RewardChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.rewardChip}>
      {icon}
      <Text variant="label" color={theme.colors.text}>
        {label}
      </Text>
    </View>
  );
}

function DailyGoalBar({
  icon,
  label,
  value,
  goal,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  goal: number;
  color: string;
}) {
  const progress = goal > 0 ? Math.min(1, value / goal) : 0;
  return (
    <View style={styles.goalCard}>
      <View style={styles.goalTop}>
        <View style={styles.inline}>
          {icon}
          <Text variant="label" color={color}>
            {label}
          </Text>
        </View>
        <Text variant="bodyMuted">
          {value}/{goal}
        </Text>
      </View>
      <ProgressBar progress={progress} color={color} trackColor={theme.colors.bg} height={7} />
    </View>
  );
}

function ActionTile({
  icon,
  label,
  value,
  meta,
  tone,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  meta: string;
  tone: ActionTone;
  onPress: () => void;
}) {
  const color = actionToneColor(tone);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionTile,
        {
          borderColor: withAlpha(color, tone === 'primary' ? 0.58 : 0.34),
          backgroundColor: withAlpha(color, tone === 'primary' ? 0.16 : 0.08),
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <View style={styles.actionTop}>
        <View style={[styles.actionIcon, { backgroundColor: withAlpha(color, 0.18) }]}>{icon}</View>
        <ArrowRight color={color} size={18} />
      </View>
      <View style={styles.actionCopy}>
        <Text variant="label" color={color}>
          {label}
        </Text>
        <Text variant="bodyMedium" numberOfLines={2}>
          {value}
        </Text>
      </View>
      <View style={[styles.actionMeta, { borderColor: withAlpha(color, 0.28) }]}>
        <Text variant="label" color={theme.colors.text}>
          {meta}
        </Text>
      </View>
    </Pressable>
  );
}

function StatusLine({
  icon,
  label,
  value,
  detail,
  color,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.statusLine, { opacity: pressed ? 0.82 : 1 }]}
    >
      <View style={[styles.statusIconBox, { backgroundColor: withAlpha(color, 0.14) }]}>{icon}</View>
      <View style={styles.flex}>
        <Text variant="label" color={color}>
          {label}
        </Text>
        <Text variant="bodyMedium" numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <View style={styles.statusValue}>
        <Text variant="title" color={theme.colors.text}>
          {value}
        </Text>
        <ArrowRight color={theme.colors.textMuted} size={16} />
      </View>
    </Pressable>
  );
}

function toneColor(tone: MissionTone) {
  if (tone === 'ready') return theme.colors.gold;
  if (tone === 'danger') return theme.colors.hp;
  if (tone === 'active') return theme.colors.essencia;
  return theme.colors.skill;
}

function actionToneColor(tone: ActionTone) {
  if (tone === 'primary') return theme.colors.success;
  if (tone === 'training') return theme.colors.skill;
  if (tone === 'quest') return theme.colors.essencia;
  return theme.colors.gold;
}

function withAlpha(hex: string, alpha: number) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const value = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${clean}${value}`;
}

function dedupeMissions(
  rows: Array<{ item: ObjectiveOverviewItem; tone: MissionTone; label: string }>,
) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.item.id)) return false;
    seen.add(row.item.id);
    return true;
  });
}

function daysSince(date: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000));
}

const styles = StyleSheet.create({
  page: {
    gap: theme.spacing.lg,
    // Folga para a tab bar flutuante — conteúdo não fica escondido atrás dela.
    paddingBottom: theme.sizes.tabBarClearance,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  errorCard: { alignSelf: 'stretch', alignItems: 'flex-start', gap: theme.spacing.sm },
  retryBtn: {
    alignSelf: 'stretch',
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primaryBright,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  flex: { flex: 1, minWidth: 0 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  topCopy: { flex: 1, minWidth: 0 },
  topActions: { flexDirection: 'row', gap: theme.spacing.xs },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(248,250,252,0.12)',
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBanner: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: 'rgba(15,23,42,0.78)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  statusRune: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPanel: {
    gap: theme.spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.34)',
    backgroundColor: '#111827',
    padding: theme.spacing.lg,
    overflow: 'hidden',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  characterBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatarFrame: {
    width: 74,
    height: 74,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.7)',
    backgroundColor: theme.colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelSeal: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#111827',
  },
  characterCopy: { flex: 1, minWidth: 0, gap: 2 },
  crest: {
    width: 62,
    height: 62,
    opacity: 0.9,
  },
  vitalGrid: {
    gap: theme.spacing.md,
  },
  vital: {
    gap: theme.spacing.xs,
  },
  vitalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  resourceStrip: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  resourcePill: {
    flex: 1,
    minHeight: 58,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(248,250,252,0.1)',
    backgroundColor: 'rgba(2,6,23,0.42)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  bossPanel: {
    gap: theme.spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.32)',
    backgroundColor: '#15152B',
    padding: theme.spacing.lg,
  },
  bossTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  bossIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.essencia,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bossMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  sectionCopy: { flex: 1, minWidth: 0 },
  countBadge: {
    flexShrink: 0,
    maxWidth: 124,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.35)',
    backgroundColor: 'rgba(250,204,21,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  missionBoard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  emptyMission: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  missionRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51,65,85,0.72)',
  },
  missionMark: {
    width: 4,
    height: 42,
    borderRadius: 2,
  },
  statePill: {
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
  },
  dailyPanel: {
    gap: theme.spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    backgroundColor: '#071A13',
    padding: theme.spacing.lg,
  },
  dailyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  dailyPercent: {
    width: 66,
    height: 66,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,197,94,0.1)',
  },
  rewardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  rewardChip: {
    minHeight: 32,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: 'rgba(248,250,252,0.08)',
    paddingHorizontal: theme.spacing.sm,
  },
  goalGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  goalCard: {
    flex: 1,
    minWidth: 0,
    gap: theme.spacing.xs,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(248,250,252,0.1)',
    backgroundColor: 'rgba(248,250,252,0.06)',
    padding: theme.spacing.sm,
  },
  goalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  actionTile: {
    width: '48.6%',
    minHeight: 142,
    borderRadius: 14,
    borderWidth: 1,
    padding: theme.spacing.md,
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    overflow: 'hidden',
  },
  actionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: {
    gap: 4,
    minHeight: 42,
  },
  actionMeta: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    minHeight: 28,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    backgroundColor: 'rgba(2,6,23,0.2)',
  },
  statusDeck: {
    gap: theme.spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
    backgroundColor: 'rgba(2,6,23,0.48)',
    padding: theme.spacing.md,
  },
  statusDeckHeader: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  statusSignal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.28)',
    backgroundColor: 'rgba(167,139,250,0.1)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
  },
  statusLine: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.72)',
    backgroundColor: 'rgba(15,23,42,0.82)',
    paddingHorizontal: theme.spacing.md,
  },
  statusIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flexShrink: 0,
  },
});
