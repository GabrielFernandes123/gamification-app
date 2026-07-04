import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Flame, Pencil, Trophy, Zap } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type DimensionValue } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { HabitForm } from '@/features/habits/components/HabitForm';
import { useHabitLogs } from '@/features/habits/hooks/useHabitLogs';
import { useHabits } from '@/features/habits/hooks/useHabits';
import { DIFFICULTY_META, periodTarget, scheduleDescription } from '@/features/habits/meta';
import type { HabitLog } from '@/features/habits/hooks/useTodayLogs';
import { theme } from '@/theme/theme';

export default function HabitDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [editing, setEditing] = useState(false);
  const habits = useHabits();
  const logs = useHabitLogs(id);
  const habit = habits.data?.find((h) => h.id === id);

  const stats = useMemo(() => buildStats(logs.data ?? []), [logs.data]);

  if (habits.isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!habit) {
    return (
      <Screen>
        <Text variant="title">Hábito não encontrado</Text>
      </Screen>
    );
  }

  if (editing) return <HabitForm habit={habit} />;

  const diff = DIFFICULTY_META[habit.difficulty];
  const target = periodTarget(habit);

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Voltar" style={styles.iconBtn}>
          <ChevronLeft color={theme.colors.text} size={24} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text variant="h1" numberOfLines={1}>{habit.name}</Text>
          <Text variant="bodyMuted" numberOfLines={1}>{scheduleDescription(habit)}</Text>
        </View>
        <Pressable onPress={() => setEditing(true)} hitSlop={10} accessibilityLabel="Editar hábito" style={styles.iconBtn}>
          <Pencil color={theme.colors.skill} size={21} />
        </Pressable>
      </View>

      <Card style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={[styles.typeBadge, { backgroundColor: habit.type === 'positive' ? theme.colors.success : theme.colors.hp }]}>
            <Text variant="label" color={theme.colors.textInverse}>
              {habit.type === 'positive' ? 'Fazer' : 'Evitar'}
            </Text>
          </View>
          <View style={[styles.diffBadge, { borderColor: diff.color }]}>
            <Text variant="label" color={diff.color}>{diff.label}</Text>
          </View>
        </View>
        {habit.description ? <Text variant="bodyMuted">{habit.description}</Text> : null}
        <View style={styles.heroStats}>
          <HeroStat icon={<Flame color={theme.colors.primary} size={18} />} label="Sequência" value={habit.current_streak} />
          <HeroStat icon={<Trophy color={theme.colors.gold} size={18} />} label="Melhor" value={habit.best_streak} />
          <HeroStat icon={<Zap color={theme.colors.xp} size={18} />} label="Meta" value={target} />
        </View>
      </Card>

      <View style={styles.grid}>
        <MetricCard label="Sucessos" value={stats.success} color={theme.colors.success} />
        <MetricCard label="Falhas" value={stats.fail} color={theme.colors.hp} />
        <MetricCard label="XP total" value={stats.xp} color={theme.colors.xp} />
        <MetricCard label="Dano total" value={stats.damage} color={theme.colors.hp} />
      </View>

      <Card style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text variant="title">Últimos 30 registros</Text>
          <Text variant="bodyMuted">{Math.round(stats.successRate)}% sucesso</Text>
        </View>
        <View style={styles.chart}>
          {stats.chart.map((item) => (
            <View key={item.key} style={styles.chartCol}>
              <View style={[styles.chartBar, { height: item.height, backgroundColor: item.color }]} />
              <Text variant="label">{item.day}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text variant="title">Histórico recente</Text>
          {logs.isFetching ? <ActivityIndicator color={theme.colors.primary} /> : null}
        </View>
        {stats.recent.length === 0 ? (
          <Text variant="bodyMuted">Nenhum registro ainda.</Text>
        ) : (
          <View style={styles.timeline}>
            {stats.recent.map((log) => (
              <View key={log.id} style={styles.timelineRow}>
                <View style={[styles.timelineDot, { backgroundColor: log.success ? theme.colors.success : theme.colors.hp }]} />
                <View style={styles.timelineCopy}>
                  <Text variant="bodyMedium">{formatDate(log.occurred_on)}</Text>
                  <Text variant="bodyMuted">{log.is_auto ? 'Fechamento automático' : 'Registro manual'}</Text>
                </View>
                <Text variant="title" color={log.damage_taken > 0 ? theme.colors.hp : theme.colors.success}>
                  {log.damage_taken > 0 ? `-${log.damage_taken} HP` : `+${log.xp_gained} XP`}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {(habit.primarySkill || habit.secondarySkill) ? (
        <Card style={styles.panel}>
          <Text variant="title">Skills vinculadas</Text>
          <View style={styles.skills}>
            {habit.primarySkill ? <SkillPill name={habit.primarySkill.name} color={habit.primarySkill.color ?? theme.colors.skill} label="100%" /> : null}
            {habit.secondarySkill ? <SkillPill name={habit.secondarySkill.name} color={habit.secondarySkill.color ?? theme.colors.skillAlt} label="50%" /> : null}
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

function HeroStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <View style={styles.heroStat}>
      {icon}
      <Text variant="stat">{value}</Text>
      <Text variant="label">{label}</Text>
    </View>
  );
}

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card style={styles.metric}>
      <Text variant="stat" color={color}>{value}</Text>
      <Text variant="label">{label}</Text>
    </Card>
  );
}

function SkillPill({ name, color, label }: { name: string; color: string; label: string }) {
  return (
    <View style={[styles.skillPill, { borderColor: color }]}>
      <Text variant="bodyMedium" color={color}>{name}</Text>
      <Text variant="label" color={color}>{label}</Text>
    </View>
  );
}

function buildStats(logs: HabitLog[]) {
  const success = logs.filter((l) => l.success).length;
  const fail = logs.filter((l) => !l.success).length;
  const xp = logs.reduce((sum, l) => sum + l.xp_gained, 0);
  const damage = logs.reduce((sum, l) => sum + l.damage_taken, 0);
  const total = success + fail;
  const successRate = total > 0 ? (success / total) * 100 : 0;
  const recent = logs.slice(0, 8);
  const chartLogs = logs.slice(0, 30).reverse();
  const max = Math.max(1, ...chartLogs.map((l) => l.xp_gained + l.damage_taken));
  const chart = chartLogs.map((log) => ({
    key: log.id,
    day: String(Number(log.occurred_on.slice(8))),
    color: log.damage_taken > 0 || !log.success ? theme.colors.hp : theme.colors.success,
    height: (12 + Math.round(((log.xp_gained + log.damage_taken) / max) * 46)) as DimensionValue,
  }));
  return { success, fail, xp, damage, total, successRate, recent, chart };
}

function formatDate(date: string) {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: theme.colors.bg, justifyContent: 'center' },
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceSoft,
  },
  hero: { gap: theme.spacing.lg, backgroundColor: theme.colors.surfaceSoft },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  typeBadge: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  diffBadge: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  heroStats: { flexDirection: 'row', gap: theme.spacing.md },
  heroStat: { flex: 1, gap: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  metric: { flexBasis: '47%', flexGrow: 1, gap: theme.spacing.xs },
  panel: { gap: theme.spacing.md },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  chart: { minHeight: 86, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  chartCol: { flex: 1, alignItems: 'center', gap: 4 },
  chartBar: { width: '100%', minHeight: 10, borderRadius: theme.radius.sm },
  timeline: { gap: theme.spacing.md },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineCopy: { flex: 1, gap: 2 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  skillPill: {
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: 2,
  },
});
