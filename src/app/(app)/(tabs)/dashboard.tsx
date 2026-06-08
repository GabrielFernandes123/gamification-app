import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { BarChart3, CalendarDays, Dumbbell, Settings, Sparkles, Trophy } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type DimensionValue } from 'react-native';

import { ProgressBar } from '@/components/bars/ProgressBar';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useBodyMeasurements, useWorkoutSessions } from '@/features/body/hooks/useBody';
import { CharacterHud } from '@/features/character/components/CharacterHud';
import { DailyGoals } from '@/features/character/components/DailyGoals';
import { useHabits } from '@/features/habits/hooks/useHabits';
import { habitProgress, useTodayLogs } from '@/features/habits/hooks/useTodayLogs';
import { isDueToday } from '@/features/habits/meta';
import { useSideQuests } from '@/features/sidequests/hooks/useSideQuests';
import { DailySummaryModal } from '@/features/summary/components/DailySummaryModal';
import { useDailySummary } from '@/features/summary/hooks/useDailySummary';
import { ModuleLauncher } from '@/features/modules/ModuleLauncher';
import { useToday } from '@/hooks/useToday';
import { qk } from '@/lib/queryKeys';
import { theme } from '@/theme/theme';

export default function DashboardScreen() {
  const qc = useQueryClient();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { summary, dismiss } = useDailySummary();
  const { today, weekday } = useToday();
  const habits = useHabits();
  const logs = useTodayLogs(today);
  const sideQuests = useSideQuests();
  const workoutSessions = useWorkoutSessions();
  const measurements = useBodyMeasurements();

  const dashboard = useMemo(() => {
    const activeHabits = habits.data ?? [];
    const dueHabits = activeHabits.filter((h) => isDueToday(h, weekday));
    const completedToday = dueHabits.filter((h) => habitProgress(logs.data, h.id).success > 0).length;
    const failedToday = (logs.data ?? []).filter((l) => !l.success).length;
    const xpToday = (logs.data ?? []).reduce((sum, l) => sum + l.xp_gained, 0);
    const pendingQuests = (sideQuests.data ?? []).filter((q) => !q.is_completed).length;
    const topStreak = activeHabits.reduce((max, h) => Math.max(max, h.current_streak), 0);
    const completion = dueHabits.length > 0 ? completedToday / dueHabits.length : 0;

    return { dueCount: dueHabits.length, completedToday, failedToday, xpToday, pendingQuests, topStreak, completion };
  }, [habits.data, logs.data, sideQuests.data, weekday]);

  const body = useMemo(() => {
    const completed = (workoutSessions.data ?? []).filter((s) => s.status === 'completed');
    const lastWorkoutDays = completed[0] ? daysSince(completed[0].started_at) : null;
    const lastMeasurementDays = measurements.data?.[0] ? daysSince(measurements.data[0].measured_on) : null;
    const alerts = [
      lastWorkoutDays === null ? 'Nenhum treino registrado' : null,
      lastWorkoutDays !== null && lastWorkoutDays >= 5 ? `${lastWorkoutDays} dias sem treino` : null,
      lastMeasurementDays === null ? 'Nenhuma medição registrada' : null,
      lastMeasurementDays !== null && lastMeasurementDays >= 14 ? `${lastMeasurementDays} dias sem medidas` : null,
    ].filter(Boolean);
    return {
      weekWorkouts: completed.filter((s) => daysSince(s.started_at) <= 7).length,
      lastWorkoutDays,
      lastMeasurementDays,
      alerts,
    };
  }, [measurements.data, workoutSessions.data]);

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
    ]);
    setRefreshing(false);
  }

  return (
    <Screen scroll refreshing={refreshing} onRefresh={onRefresh} contentStyle={styles.content}>
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <Text variant="h1">Central</Text>
          <Text variant="bodyMuted" numberOfLines={1}>
            Resumo de hábitos, missões e evolução.
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push('/(app)/achievements')}
            hitSlop={10}
            accessibilityLabel="Conquistas"
            style={styles.iconBtn}
          >
            <Trophy color={theme.colors.gold} size={22} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(app)/settings')}
            hitSlop={10}
            accessibilityLabel="Configurações"
            style={styles.iconBtn}
          >
            <Settings color={theme.colors.textMuted} size={22} />
          </Pressable>
        </View>
      </View>

      <CharacterHud />
      <DailyGoals />

      <Card style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Sparkles color={theme.colors.textInverse} size={22} />
          </View>
          <View style={styles.heroCopy}>
            <Text variant="label">Hoje</Text>
            <Text variant="h2">{dashboard.completedToday}/{dashboard.dueCount} hábitos concluídos</Text>
          </View>
        </View>
        <ProgressBar progress={dashboard.completion} color={theme.colors.success} height={12} />
        <View style={styles.heroMetrics}>
          <MiniMetric label="XP ganho" value={dashboard.xpToday} color={theme.colors.xp} />
          <MiniMetric label="Falhas" value={dashboard.failedToday} color={theme.colors.hp} />
          <MiniMetric label="Sequência" value={dashboard.topStreak} color={theme.colors.primary} />
        </View>
      </Card>

      <ModuleLauncher />

      <View style={styles.quickGrid}>
        <Pressable onPress={() => router.push('/(app)/stats')} accessibilityRole="button" style={styles.quickCard}>
          <BarChart3 color={theme.colors.skill} size={22} />
          <Text variant="title">Estatísticas</Text>
          <Text variant="bodyMuted">Diário e semanal</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(app)/history')} accessibilityRole="button" style={styles.quickCard}>
          <CalendarDays color={theme.colors.success} size={22} />
          <Text variant="title">Histórico</Text>
          <Text variant="bodyMuted">Calendário e visão semanal</Text>
        </Pressable>
      </View>

      <Card style={styles.overviewCard}>
        <View style={styles.overviewHeader}>
          <Text variant="title">Carga atual</Text>
          <Text variant="bodyMuted">{dashboard.pendingQuests} side quests pendentes</Text>
        </View>
        <View style={styles.barChart}>
          <StatusBar label="Hábitos" value={dashboard.dueCount} max={Math.max(dashboard.dueCount, dashboard.pendingQuests, 1)} color={theme.colors.success} />
          <StatusBar label="Side quests" value={dashboard.pendingQuests} max={Math.max(dashboard.dueCount, dashboard.pendingQuests, 1)} color={theme.colors.skill} />
          <StatusBar label="Falhas" value={dashboard.failedToday} max={Math.max(dashboard.dueCount, dashboard.failedToday, 1)} color={theme.colors.hp} />
        </View>
      </Card>

      <Pressable onPress={() => router.push('/(app)/(tabs)/body')} accessibilityRole="button">
        <Card style={styles.bodyCard}>
          <View style={styles.bodyHeader}>
            <View style={styles.bodyIcon}>
              <Dumbbell color={theme.colors.textInverse} size={22} />
            </View>
            <View style={styles.heroCopy}>
              <Text variant="label">Corpo</Text>
              <Text variant="h2">{body.weekWorkouts} treinos na semana</Text>
            </View>
          </View>
          <View style={styles.heroMetrics}>
            <MiniMetric label="Último treino" value={body.lastWorkoutDays ?? 0} color={theme.colors.skill} />
            <MiniMetric label="Medidas" value={body.lastMeasurementDays ?? 0} color={theme.colors.success} />
            <MiniMetric label="Avisos" value={body.alerts.length} color={theme.colors.xp} />
          </View>
          {body.alerts.length > 0 ? (
            <Text variant="bodyMuted" numberOfLines={1}>{body.alerts[0]}</Text>
          ) : null}
        </Card>
      </Pressable>

      <DailySummaryModal summary={summary} onDismiss={dismiss} />
    </Screen>
  );
}

function MiniMetric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.miniMetric}>
      <Text variant="stat" color={color}>{value}</Text>
      <Text variant="label">{label}</Text>
    </View>
  );
}

function StatusBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const width: DimensionValue = `${Math.max(5, Math.round((value / max) * 100))}%`;
  return (
    <View style={styles.statusRow}>
      <View style={styles.statusLabel}>
        <Text variant="bodyMedium">{label}</Text>
        <Text variant="bodyMuted">{value}</Text>
      </View>
      <View style={styles.statusTrack}>
        <View style={[styles.statusFill, { width, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg },
  titleRow: {
    marginBottom: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  titleCopy: { flex: 1, minWidth: 0 },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    alignItems: 'center',
    flexShrink: 0,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  heroCard: { gap: theme.spacing.lg, backgroundColor: theme.colors.surfaceAlt },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1, gap: 2 },
  heroMetrics: { flexDirection: 'row', gap: theme.spacing.md },
  miniMetric: { flex: 1, gap: 2 },
  quickGrid: { flexDirection: 'row', gap: theme.spacing.md },
  quickCard: {
    flex: 1,
    minHeight: 112,
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  overviewCard: { gap: theme.spacing.md },
  bodyCard: { gap: theme.spacing.lg },
  bodyHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  bodyIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.skill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewHeader: { gap: theme.spacing.xs },
  barChart: { gap: theme.spacing.md },
  statusRow: { gap: theme.spacing.xs },
  statusLabel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusTrack: {
    height: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.bg,
    overflow: 'hidden',
  },
  statusFill: { height: '100%', borderRadius: theme.radius.pill },
});

function daysSince(date: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000));
}
