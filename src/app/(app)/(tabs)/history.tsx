import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  Activity,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  HeartPulse,
  ListFilter,
  Ruler,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { useHabits } from '@/features/habits/hooks/useHabits';
import type { HabitLog } from '@/features/habits/hooks/useTodayLogs';
import { useMonthLogs } from '@/features/warroom/hooks/useMonthLogs';
import { aggregateByDay, monthLabel, monthRange, monthSummary, shiftMonth, type DayAgg } from '@/features/warroom/month';
import { useToday } from '@/hooks/useToday';
import { supabase } from '@/lib/supabase';
import { theme } from '@/theme/theme';
import type { BodyMeasurement, WorkoutSession } from '@/types/body';

type HistoryFilter = 'all' | 'habits' | 'workouts' | 'body';
type HistoryView = 'timeline' | 'calendar';

type WorkoutDay = {
  count: number;
  sets: number;
  volume: number;
  minutes: number;
  xp: number;
  gold: number;
  sessions: WorkoutSession[];
};

type MeasurementDay = {
  count: number;
  latest?: BodyMeasurement;
  measurements: BodyMeasurement[];
};

type UnifiedDay = {
  date: string;
  habit?: DayAgg;
  workout?: WorkoutDay;
  measurement?: MeasurementDay;
};

const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function HistoryScreen() {
  const router = useRouter();
  const { today } = useToday();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [view, setView] = useState<HistoryView>('timeline');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const logs = useMonthLogs(month);
  const workouts = useMonthWorkoutSessions(month);
  const measurements = useMonthBodyMeasurements(month);
  const habits = useHabits();

  const habitNames = useMemo(() => {
    const map: Record<string, string> = {};
    (habits.data ?? []).forEach((habit) => {
      map[habit.id] = habit.name;
    });
    return map;
  }, [habits.data]);

  const habitByDay = useMemo(() => aggregateByDay(logs.data), [logs.data]);
  const workoutByDay = useMemo(() => aggregateWorkoutsByDay(workouts.data), [workouts.data]);
  const measurementByDay = useMemo(() => aggregateMeasurementsByDay(measurements.data), [measurements.data]);
  const days = useMemo(
    () => buildUnifiedDays(month, habitByDay, workoutByDay, measurementByDay, filter),
    [filter, habitByDay, measurementByDay, month, workoutByDay],
  );
  const calendarDays = useMemo(
    () => buildCalendarDays(month, habitByDay, workoutByDay, measurementByDay, filter),
    [filter, habitByDay, measurementByDay, month, workoutByDay],
  );
  const selected = selectedDay ? days.find((day) => day.date === selectedDay) ?? buildSingleDay(selectedDay, habitByDay, workoutByDay, measurementByDay) : null;
  const summary = buildSummary(month, habitByDay, workoutByDay, measurementByDay);
  const loading = logs.isLoading || workouts.isLoading || measurements.isLoading || habits.isLoading;

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text variant="h1">Historico</Text>
          <Text variant="bodyMuted" numberOfLines={1}>
            Habitos, treinos e corpo em uma linha do tempo.
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(app)/stats')}
          accessibilityLabel="Abrir estatisticas"
          style={styles.statsBtn}
        >
          <BarChart3 color={theme.colors.skill} size={22} />
        </Pressable>
      </View>

      <View style={styles.monthCard}>
        <Pressable onPress={() => setMonth((value) => shiftMonth(value, -1))} hitSlop={10} style={styles.navBtn}>
          <ChevronLeft color={theme.colors.text} size={22} />
        </Pressable>
        <View style={styles.monthTitle}>
          <Text variant="label">Periodo</Text>
          <Text variant="h2">{monthLabel(month)}</Text>
        </View>
        <Pressable onPress={() => setMonth((value) => shiftMonth(value, 1))} hitSlop={10} style={styles.navBtn}>
          <ChevronRight color={theme.colors.text} size={22} />
        </Pressable>
      </View>

      <View style={styles.controls}>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'timeline', label: 'Linha' },
            { value: 'calendar', label: 'Calendario' },
          ]}
        />
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Tudo' },
            { value: 'habits', label: 'Habitos' },
            { value: 'workouts', label: 'Treinos' },
            { value: 'body', label: 'Corpo' },
          ]}
          wrap
        />
      </View>

      <SummaryRail summary={summary} />

      {loading ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text variant="bodyMuted">Carregando historico...</Text>
        </Card>
      ) : null}

      {view === 'calendar' ? (
        <ActivityCalendar month={month} today={today} days={calendarDays} onSelectDay={setSelectedDay} />
      ) : (
        <Timeline days={days} logs={logs.data ?? []} habitNames={habitNames} onSelectDay={setSelectedDay} />
      )}

      <Legend />

      <DayModal
        day={selected}
        logs={logs.data ?? []}
        habitNames={habitNames}
        onClose={() => setSelectedDay(null)}
      />
    </Screen>
  );
}

function useMonthWorkoutSessions(month: string) {
  const { start, end } = monthRange(month);
  return useQuery({
    queryKey: ['historyWorkoutSessions', month] as const,
    queryFn: async (): Promise<WorkoutSession[]> => {
      const { data, error } = await (supabase as any)
        .from('workout_sessions')
        .select('*')
        .gte('started_at', `${start}T00:00:00`)
        .lte('started_at', `${end}T23:59:59.999`)
        .order('started_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useMonthBodyMeasurements(month: string) {
  const { start, end } = monthRange(month);
  return useQuery({
    queryKey: ['historyBodyMeasurements', month] as const,
    queryFn: async (): Promise<BodyMeasurement[]> => {
      const { data, error } = await (supabase as any)
        .from('body_measurements')
        .select('*')
        .gte('measured_on', start)
        .lte('measured_on', end)
        .order('measured_on', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function SummaryRail({
  summary,
}: {
  summary: {
    activeDays: number;
    checkins: number;
    workouts: number;
    volume: number;
    measurements: number;
    xp: number;
  };
}) {
  return (
    <View style={styles.summaryGrid}>
      <SummaryTile icon={<Activity color={theme.colors.success} size={18} />} label="Dias ativos" value={summary.activeDays} />
      <SummaryTile icon={<ListFilter color={theme.colors.skill} size={18} />} label="Check-ins" value={summary.checkins} />
      <SummaryTile icon={<Dumbbell color={theme.colors.primary} size={18} />} label="Treinos" value={summary.workouts} />
      <SummaryTile icon={<Ruler color={theme.colors.xp} size={18} />} label="Medidas" value={summary.measurements} />
    </View>
  );
}

function SummaryTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card style={styles.summaryTile}>
      {icon}
      <Text variant="stat">{value}</Text>
      <Text variant="label">{label}</Text>
    </Card>
  );
}

function ActivityCalendar({
  month,
  today,
  days,
  onSelectDay,
}: {
  month: string;
  today: string;
  days: UnifiedDay[];
  onSelectDay: (date: string) => void;
}) {
  const { daysInMonth, firstWeekday, dayStr } = monthRange(month);
  const byDate = Object.fromEntries(days.map((day) => [day.date, day]));
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <Card style={styles.calendarCard}>
      <View style={styles.sectionHeader}>
        <CalendarDays color={theme.colors.textMuted} size={20} />
        <View style={styles.flex}>
          <Text variant="title">Mapa do mes</Text>
          <Text variant="bodyMuted">Cada ponto indica atividade registrada no dia.</Text>
        </View>
      </View>
      <View style={styles.weekRow}>
        {WEEK.map((weekday, index) => (
          <View key={`${weekday}-${index}`} style={styles.calendarCell}>
            <Text variant="label">{weekday}</Text>
          </View>
        ))}
      </View>
      <View style={styles.calendarGrid}>
        {cells.map((day, index) => {
          if (day === null) return <View key={`blank-${index}`} style={styles.calendarCell} />;
          const date = dayStr(day);
          const item = byDate[date];
          const hasEvents = !!item && countEvents(item) > 0;
          const isToday = date === today;
          return (
            <Pressable key={date} style={styles.calendarCell} onPress={() => onSelectDay(date)} accessibilityLabel={`Dia ${day}`}>
              <View style={[styles.dayBubble, hasEvents && styles.activeBubble, isToday && styles.todayBubble]}>
                <Text variant="bodyMedium" color={isToday ? theme.colors.primary : theme.colors.text}>{day}</Text>
                <EventDots day={hasEvents ? item : undefined} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

function Timeline({
  days,
  logs,
  habitNames,
  onSelectDay,
}: {
  days: UnifiedDay[];
  logs: HabitLog[];
  habitNames: Record<string, string>;
  onSelectDay: (date: string) => void;
}) {
  if (days.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <Text variant="title" color={theme.colors.textMuted}>Sem registros neste periodo</Text>
        <Text variant="bodyMuted">Quando houver check-ins, treinos ou medidas, eles entram aqui.</Text>
      </Card>
    );
  }

  return (
    <View style={styles.timeline}>
      {days.map((day) => (
        <Pressable key={day.date} onPress={() => onSelectDay(day.date)} accessibilityRole="button">
          <Card style={styles.dayCard} accent={dayAccent(day)}>
            <View style={styles.dayHeader}>
              <View>
                <Text variant="title">{formatDayLabel(day.date)}</Text>
                <Text variant="bodyMuted">{formatDateLong(day.date)}</Text>
              </View>
              <View style={styles.eventCount}>
                <Text variant="label" color={theme.colors.text}>{countEvents(day)}</Text>
              </View>
            </View>
            <DayPreview day={day} logs={logs} habitNames={habitNames} />
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

function DayPreview({ day, logs, habitNames }: { day: UnifiedDay; logs: HabitLog[]; habitNames: Record<string, string> }) {
  const dayLogs = logs.filter((log) => log.occurred_on === day.date).slice(0, 2);
  return (
    <View style={styles.previewStack}>
      {day.habit ? (
        <PreviewRow
          color={day.habit.fail > 0 ? theme.colors.hp : theme.colors.success}
          title={`${day.habit.success} check-ins${day.habit.fail ? `, ${day.habit.fail} falhas` : ''}`}
          detail={dayLogs.map((log) => habitNames[log.habit_id] ?? 'Habito').join(', ') || `${day.habit.xp} XP`}
        />
      ) : null}
      {day.workout ? (
        <PreviewRow
          color={theme.colors.primary}
          title={`${day.workout.count} treino${day.workout.count > 1 ? 's' : ''}`}
          detail={`${day.workout.sets} series · ${Math.round(day.workout.volume)}kg · ${day.workout.minutes} min`}
        />
      ) : null}
      {day.measurement ? (
        <PreviewRow
          color={theme.colors.xp}
          title="Medidas corporais"
          detail={measurementLabel(day.measurement.latest)}
        />
      ) : null}
    </View>
  );
}

function PreviewRow({ color, title, detail }: { color: string; title: string; detail: string }) {
  return (
    <View style={styles.previewRow}>
      <View style={[styles.previewDot, { backgroundColor: color }]} />
      <View style={styles.flex}>
        <Text variant="bodyMedium">{title}</Text>
        <Text variant="bodyMuted" numberOfLines={1}>{detail}</Text>
      </View>
    </View>
  );
}

function DayModal({
  day,
  logs,
  habitNames,
  onClose,
}: {
  day: UnifiedDay | null;
  logs: HabitLog[];
  habitNames: Record<string, string>;
  onClose: () => void;
}) {
  const dayLogs = day ? logs.filter((log) => log.occurred_on === day.date) : [];
  return (
    <Modal visible={!!day} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Card style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.flex}>
              <Text variant="h2">{day ? formatDayLabel(day.date) : 'Dia'}</Text>
              {day ? <Text variant="bodyMuted">{formatDateLong(day.date)}</Text> : null}
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fechar">
              <X color={theme.colors.textMuted} size={22} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {day?.habit ? (
              <DetailSection icon={<Activity color={theme.colors.success} size={18} />} title="Habitos">
                {dayLogs.map((log) => (
                  <DetailRow
                    key={log.id}
                    title={habitNames[log.habit_id] ?? 'Habito'}
                    detail={log.success ? `+${log.xp_gained} XP · +${log.gold_gained} ouro` : `${log.damage_taken} dano`}
                    tone={log.success ? theme.colors.success : theme.colors.hp}
                  />
                ))}
              </DetailSection>
            ) : null}
            {day?.workout ? (
              <DetailSection icon={<Dumbbell color={theme.colors.primary} size={18} />} title="Treinos">
                {day.workout.sessions.map((session) => (
                  <DetailRow
                    key={session.id}
                    title={session.name}
                    detail={`${session.duration_minutes ?? '-'} min · ${session.total_sets} series · ${Math.round(Number(session.total_volume))}kg`}
                    tone={theme.colors.primary}
                  />
                ))}
              </DetailSection>
            ) : null}
            {day?.measurement ? (
              <DetailSection icon={<HeartPulse color={theme.colors.xp} size={18} />} title="Corpo">
                {day.measurement.measurements.map((item) => (
                  <DetailRow
                    key={item.id}
                    title="Medidas registradas"
                    detail={measurementLabel(item)}
                    tone={theme.colors.xp}
                  />
                ))}
              </DetailSection>
            ) : null}
            {day && countEvents(day) === 0 ? <Text variant="bodyMuted">Nenhum registro neste dia.</Text> : null}
          </ScrollView>
        </Card>
      </View>
    </Modal>
  );
}

function DetailSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.detailSection}>
      <View style={styles.sectionHeader}>
        {icon}
        <Text variant="title">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function DetailRow({ title, detail, tone }: { title: string; detail: string; tone: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={[styles.previewDot, { backgroundColor: tone }]} />
      <View style={styles.flex}>
        <Text variant="bodyMedium">{title}</Text>
        <Text variant="bodyMuted">{detail}</Text>
      </View>
    </View>
  );
}

function EventDots({ day }: { day?: UnifiedDay }) {
  return (
    <View style={styles.dotRow}>
      {day?.habit ? <View style={[styles.dot, { backgroundColor: day.habit.fail > 0 ? theme.colors.hp : theme.colors.success }]} /> : null}
      {day?.workout ? <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} /> : null}
      {day?.measurement ? <View style={[styles.dot, { backgroundColor: theme.colors.xp }]} /> : null}
    </View>
  );
}

function Legend() {
  return (
    <View style={styles.legend}>
      <LegendItem color={theme.colors.success} label="Habitos" />
      <LegendItem color={theme.colors.primary} label="Treinos" />
      <LegendItem color={theme.colors.xp} label="Corpo" />
      <LegendItem color={theme.colors.hp} label="Falha" />
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text variant="bodyMuted">{label}</Text>
    </View>
  );
}

function aggregateWorkoutsByDay(sessions: WorkoutSession[] | undefined): Record<string, WorkoutDay> {
  const map: Record<string, WorkoutDay> = {};
  for (const session of sessions ?? []) {
    if (session.status !== 'completed') continue;
    const date = session.started_at.slice(0, 10);
    const day = (map[date] ??= { count: 0, sets: 0, volume: 0, minutes: 0, xp: 0, gold: 0, sessions: [] });
    day.count += 1;
    day.sets += Number(session.total_sets ?? 0);
    day.volume += Number(session.total_volume ?? 0);
    day.minutes += Number(session.duration_minutes ?? 0);
    day.xp += Number(session.xp_gained ?? 0);
    day.gold += Number(session.gold_gained ?? 0);
    day.sessions.push(session);
  }
  return map;
}

function aggregateMeasurementsByDay(measurements: BodyMeasurement[] | undefined): Record<string, MeasurementDay> {
  const map: Record<string, MeasurementDay> = {};
  for (const measurement of measurements ?? []) {
    const day = (map[measurement.measured_on] ??= { count: 0, measurements: [] });
    day.count += 1;
    day.measurements.push(measurement);
    day.latest ??= measurement;
  }
  return map;
}

function buildUnifiedDays(
  month: string,
  habits: Record<string, DayAgg>,
  workouts: Record<string, WorkoutDay>,
  measurements: Record<string, MeasurementDay>,
  filter: HistoryFilter,
) {
  const { daysInMonth, dayStr } = monthRange(month);
  const days: UnifiedDay[] = [];
  for (let day = daysInMonth; day >= 1; day -= 1) {
    const date = dayStr(day);
    const item = buildSingleDay(date, habits, workouts, measurements);
    if (countEvents(item) === 0) continue;
    if (filter === 'habits' && !item.habit) continue;
    if (filter === 'workouts' && !item.workout) continue;
    if (filter === 'body' && !item.measurement) continue;
    days.push(item);
  }
  return days;
}

function buildCalendarDays(
  month: string,
  habits: Record<string, DayAgg>,
  workouts: Record<string, WorkoutDay>,
  measurements: Record<string, MeasurementDay>,
  filter: HistoryFilter,
) {
  const { daysInMonth, dayStr } = monthRange(month);
  const days: UnifiedDay[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const source = buildSingleDay(dayStr(day), habits, workouts, measurements);
    days.push(applyFilter(source, filter));
  }
  return days;
}

function applyFilter(day: UnifiedDay, filter: HistoryFilter): UnifiedDay {
  if (filter === 'habits') return { date: day.date, habit: day.habit };
  if (filter === 'workouts') return { date: day.date, workout: day.workout };
  if (filter === 'body') return { date: day.date, measurement: day.measurement };
  return day;
}

function buildSingleDay(
  date: string,
  habits: Record<string, DayAgg>,
  workouts: Record<string, WorkoutDay>,
  measurements: Record<string, MeasurementDay>,
): UnifiedDay {
  return { date, habit: habits[date], workout: workouts[date], measurement: measurements[date] };
}

function buildSummary(
  month: string,
  habits: Record<string, DayAgg>,
  workouts: Record<string, WorkoutDay>,
  measurements: Record<string, MeasurementDay>,
) {
  const { daysInMonth } = monthRange(month);
  const habitSummary = monthSummary(habits, daysInMonth);
  const activeDates = new Set([
    ...Object.keys(habits),
    ...Object.keys(workouts),
    ...Object.keys(measurements),
  ]);
  const workoutDays = Object.values(workouts);
  const measurementDays = Object.values(measurements);
  return {
    activeDays: activeDates.size,
    checkins: habitSummary.totalCheckins,
    workouts: workoutDays.reduce((sum, day) => sum + day.count, 0),
    volume: workoutDays.reduce((sum, day) => sum + day.volume, 0),
    measurements: measurementDays.reduce((sum, day) => sum + day.count, 0),
    xp: Object.values(habits).reduce((sum, day) => sum + day.xp, 0) + workoutDays.reduce((sum, day) => sum + day.xp, 0),
  };
}

function countEvents(day: UnifiedDay) {
  return (day.habit ? day.habit.success + day.habit.fail : 0)
    + (day.workout ? day.workout.count : 0)
    + (day.measurement ? day.measurement.count : 0);
}

function dayAccent(day: UnifiedDay) {
  if (day.habit?.fail) return theme.colors.hp;
  if (day.workout) return theme.colors.primary;
  if (day.measurement) return theme.colors.xp;
  return theme.colors.success;
}

function measurementLabel(measurement?: BodyMeasurement) {
  if (!measurement) return 'Medidas registradas';
  const parts = [
    measurement.weight_kg ? `${measurement.weight_kg}kg` : null,
    measurement.waist_cm ? `cintura ${measurement.waist_cm}cm` : null,
    measurement.chest_cm ? `peito ${measurement.chest_cm}cm` : null,
    measurement.right_arm_cm ? `braco ${measurement.right_arm_cm}cm` : null,
  ].filter(Boolean);
  return parts.join(' · ') || 'Medidas registradas';
}

function formatDayLabel(date: string) {
  return `Dia ${Number(date.slice(8, 10))}`;
}

function formatDateLong(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  flex: { flex: 1, minWidth: 0 },
  header: {
    marginBottom: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  statsBtn: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  monthCard: {
    minHeight: 74,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  monthTitle: { alignItems: 'center', flex: 1 },
  navBtn: {
    width: theme.sizes.touch,
    height: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
  controls: { gap: theme.spacing.sm },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  summaryTile: { flexBasis: '47%', flexGrow: 1, gap: theme.spacing.xs },
  loadingCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  calendarCard: { gap: theme.spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  weekRow: { flexDirection: 'row' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  dayBubble: {
    width: 40,
    minHeight: 46,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: theme.colors.transparent,
  },
  activeBubble: { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
  todayBubble: { borderColor: theme.colors.primary },
  dotRow: { minHeight: 8, flexDirection: 'row', gap: 3, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  timeline: { gap: theme.spacing.md },
  dayCard: { gap: theme.spacing.md },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md },
  eventCount: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  previewStack: { gap: theme.spacing.sm },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  previewDot: { width: 9, height: 9, borderRadius: 5 },
  emptyCard: { gap: theme.spacing.xs },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  backdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: theme.spacing.lg },
  modalCard: { maxHeight: '82%', gap: theme.spacing.md },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.spacing.md },
  modalContent: { gap: theme.spacing.lg, paddingBottom: theme.spacing.md },
  detailSection: { gap: theme.spacing.sm },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
});
