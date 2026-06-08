import { useRouter } from 'expo-router';
import { ChevronLeft, TrendingUp } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { useHabits } from '@/features/habits/hooks/useHabits';
import { aggregateByDay, monthLabel, monthRange, monthSummary, type DayAgg } from '@/features/warroom/month';
import { useMonthLogs } from '@/features/warroom/hooks/useMonthLogs';
import { useToday } from '@/hooks/useToday';
import { theme } from '@/theme/theme';

type ViewMode = 'daily' | 'weekly' | 'habits';

export default function StatsScreen() {
  const router = useRouter();
  const { today } = useToday();
  const [mode, setMode] = useState<ViewMode>('daily');
  const month = today.slice(0, 7);
  const logs = useMonthLogs(month);
  const habits = useHabits();

  const stats = useMemo(() => {
    const byDay = aggregateByDay(logs.data);
    const range = monthRange(month);
    const summary = monthSummary(byDay, range.daysInMonth);
    const days = Array.from({ length: range.daysInMonth }, (_, i) => byDay[range.dayStr(i + 1)]).filter(Boolean);
    const bestDay = days.reduce<DayAgg | null>((best, day) => (!best || day.success > best.success ? day : best), null);
    const weekly = buildWeeks(month, byDay);
    const byHabit = buildHabitRows(logs.data ?? [], habits.data ?? []);

    return { byDay, range, summary, bestDay, weekly, byHabit };
  }, [habits.data, logs.data, month]);

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Voltar" style={styles.backBtn}>
          <ChevronLeft color={theme.colors.text} size={24} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text variant="h1">Estatísticas</Text>
          <Text variant="bodyMuted">{monthLabel(month)}</Text>
        </View>
      </View>

      <Card style={styles.hero}>
        <View style={styles.heroIcon}>
          <TrendingUp color={theme.colors.textInverse} size={22} />
        </View>
        <View style={styles.heroCopy}>
          <Text variant="label">Taxa do mês</Text>
          <Text variant="display">{stats.summary.checkinRate}%</Text>
          <Text variant="bodyMuted">
            {stats.summary.totalCheckins} check-ins em {stats.summary.daysWithCheckin} dias ativos.
          </Text>
        </View>
      </Card>

      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'daily', label: 'Diário' },
          { value: 'weekly', label: 'Semanal' },
          { value: 'habits', label: 'Hábitos' },
        ]}
      />

      {mode === 'daily' ? (
        <DailyPanel byDay={stats.byDay} daysInMonth={stats.range.daysInMonth} dayStr={stats.range.dayStr} bestDay={stats.bestDay} />
      ) : null}
      {mode === 'weekly' ? <WeeklyPanel weeks={stats.weekly} /> : null}
      {mode === 'habits' ? <HabitPanel rows={stats.byHabit} /> : null}
    </Screen>
  );
}

function DailyPanel({
  byDay,
  daysInMonth,
  dayStr,
  bestDay,
}: {
  byDay: Record<string, DayAgg>;
  daysInMonth: number;
  dayStr: (day: number) => string;
  bestDay: DayAgg | null;
}) {
  const max = Math.max(1, ...Object.values(byDay).map((d) => d.success + d.fail));
  return (
    <Card style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text variant="title">Histórico diário</Text>
        <Text variant="bodyMuted">{bestDay ? `Melhor dia: ${Number(bestDay.date.slice(8))}` : 'Sem dados ainda'}</Text>
      </View>
      <View style={styles.dayGrid}>
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const agg = byDay[dayStr(day)];
          const total = agg ? agg.success + agg.fail : 0;
          const height = 12 + Math.round((total / max) * 44);
          const color = agg?.fail ? theme.colors.hp : agg?.success ? theme.colors.success : theme.colors.border;
          return (
            <View key={day} style={styles.dayColumn}>
              <View style={[styles.dayBar, { height, backgroundColor: color }]} />
              <Text variant="label">{day}</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function WeeklyPanel({ weeks }: { weeks: WeekAgg[] }) {
  const max = Math.max(1, ...weeks.map((w) => w.success + w.fail));
  return (
    <View style={styles.stack}>
      {weeks.map((week) => (
        <Card key={week.label} style={styles.weekCard}>
          <View style={styles.weekHeader}>
            <Text variant="title">{week.label}</Text>
            <Text variant="bodyMuted">{week.success} ok / {week.fail} falhas</Text>
          </View>
          <View style={styles.weekTrack}>
            <View style={[styles.weekFill, { width: `${Math.max(4, Math.round(((week.success + week.fail) / max) * 100))}%` }]} />
          </View>
          <View style={styles.weekStats}>
            <Text variant="bodyMuted">XP {week.xp}</Text>
            <Text variant="bodyMuted">Ouro {week.gold}</Text>
            <Text variant="bodyMuted">Dano {week.damage}</Text>
          </View>
        </Card>
      ))}
    </View>
  );
}

function HabitPanel({ rows }: { rows: HabitAgg[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <Text variant="title" color={theme.colors.textMuted}>Sem check-ins neste mês</Text>
      </Card>
    );
  }

  const max = Math.max(1, ...rows.map((r) => r.success + r.fail));
  return (
    <View style={styles.stack}>
      {rows.map((row) => (
        <Card key={row.id} style={styles.habitCard}>
          <View style={styles.weekHeader}>
            <Text variant="title">{row.name}</Text>
            <Text variant="bodyMuted">{row.success}/{row.success + row.fail}</Text>
          </View>
          <View style={styles.splitTrack}>
            <View style={[styles.goodFill, { flex: row.success }]} />
            <View style={[styles.badFill, { flex: row.fail }]} />
            {row.success + row.fail < max ? <View style={{ flex: max - row.success - row.fail }} /> : null}
          </View>
        </Card>
      ))}
    </View>
  );
}

type WeekAgg = { label: string; success: number; fail: number; xp: number; gold: number; damage: number };
type HabitAgg = { id: string; name: string; success: number; fail: number };

function buildWeeks(month: string, byDay: Record<string, DayAgg>): WeekAgg[] {
  const { daysInMonth, dayStr } = monthRange(month);
  const weeks: WeekAgg[] = [];
  for (let start = 1; start <= daysInMonth; start += 7) {
    const end = Math.min(start + 6, daysInMonth);
    const week = { label: `${start}-${end}`, success: 0, fail: 0, xp: 0, gold: 0, damage: 0 };
    for (let day = start; day <= end; day += 1) {
      const agg = byDay[dayStr(day)];
      if (!agg) continue;
      week.success += agg.success;
      week.fail += agg.fail;
      week.xp += agg.xp;
      week.gold += agg.gold;
      week.damage += agg.damage;
    }
    weeks.push(week);
  }
  return weeks;
}

function buildHabitRows(logs: { habit_id: string; success: boolean }[], habits: { id: string; name: string }[]): HabitAgg[] {
  const names = Object.fromEntries(habits.map((h) => [h.id, h.name]));
  const rows = new Map<string, HabitAgg>();
  for (const log of logs) {
    const row = rows.get(log.habit_id) ?? { id: log.habit_id, name: names[log.habit_id] ?? 'Hábito removido', success: 0, fail: 0 };
    if (log.success) row.success += 1;
    else row.fail += 1;
    rows.set(log.habit_id, row);
  }
  return Array.from(rows.values()).sort((a, b) => b.success + b.fail - (a.success + a.fail));
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  backBtn: {
    width: theme.sizes.touch,
    height: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  hero: { flexDirection: 'row', gap: theme.spacing.lg, alignItems: 'center', backgroundColor: theme.colors.surfaceAlt },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1, gap: theme.spacing.xs },
  panel: { gap: theme.spacing.lg },
  panelHeader: { gap: theme.spacing.xs },
  dayGrid: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, minHeight: 88 },
  dayColumn: { flex: 1, alignItems: 'center', gap: 4 },
  dayBar: { width: '100%', minHeight: 8, borderRadius: theme.radius.sm },
  stack: { gap: theme.spacing.md },
  weekCard: { gap: theme.spacing.md },
  habitCard: { gap: theme.spacing.md },
  weekHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  weekTrack: {
    height: 12,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.bg,
    overflow: 'hidden',
  },
  weekFill: { height: '100%', borderRadius: theme.radius.pill, backgroundColor: theme.colors.skill },
  weekStats: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md },
  splitTrack: {
    height: 12,
    flexDirection: 'row',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.bg,
    overflow: 'hidden',
  },
  goodFill: { backgroundColor: theme.colors.success },
  badFill: { backgroundColor: theme.colors.hp },
});
