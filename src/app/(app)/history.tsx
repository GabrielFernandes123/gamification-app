import { useRouter } from 'expo-router';
import {
  Activity,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Coins,
  Flame,
  X,
  Zap,
} from 'lucide-react-native';
import { createElement, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { useHistory, type HistoryEvent } from '@/features/history/useHistory';
import { moduleIcon } from '@/features/modules/moduleIcon';
import { useModules, type ModuleRow } from '@/features/modules/useModules';
import { monthLabel, monthRange, shiftMonth } from '@/features/warroom/month';
import { useToday } from '@/hooks/useToday';
import { theme } from '@/theme/theme';

type HistoryView = 'timeline' | 'calendar';
const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function HistoryScreen() {
  const router = useRouter();
  const { today } = useToday();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [filter, setFilter] = useState<string>('all');
  const [view, setView] = useState<HistoryView>('timeline');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { start, end } = monthRange(month);
  const history = useHistory(start, end);
  const modules = useModules();

  const registry = useMemo(() => {
    const map: Record<string, ModuleRow> = {};
    for (const m of modules.data ?? []) map[m.key] = m;
    return map;
  }, [modules.data]);

  const filters = useMemo(() => {
    const active = (modules.data ?? []).filter((m) => m.ativo);
    return [{ value: 'all', label: 'Tudo' }, ...active.map((m) => ({ value: m.key, label: m.nome }))];
  }, [modules.data]);

  const events = useMemo(() => {
    const all = history.data ?? [];
    return filter === 'all' ? all : all.filter((e) => e.sourceType === filter);
  }, [history.data, filter]);

  const days = useMemo(() => groupByDay(events), [events]);
  const byDate = useMemo(() => Object.fromEntries(days.map((d) => [d.date, d.events])), [days]);
  const summary = useMemo(() => buildSummary(events), [events]);
  const selectedEvents = selectedDay ? byDate[selectedDay] ?? [] : [];
  const loading = history.isLoading || modules.isLoading;

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text variant="h1">Histórico</Text>
          <Text variant="bodyMuted" numberOfLines={1}>
            Tudo que você registrou, lido do ledger.
          </Text>
        </View>
        <Pressable onPress={() => router.push('/(app)/stats')} accessibilityLabel="Abrir estatísticas" style={styles.statsBtn}>
          <BarChart3 color={theme.colors.skill} size={22} />
        </Pressable>
      </View>

      <View style={styles.monthCard}>
        <Pressable onPress={() => setMonth((v) => shiftMonth(v, -1))} hitSlop={10} style={styles.navBtn}>
          <ChevronLeft color={theme.colors.text} size={22} />
        </Pressable>
        <View style={styles.monthTitle}>
          <Text variant="label">Período</Text>
          <Text variant="h2">{monthLabel(month)}</Text>
        </View>
        <Pressable onPress={() => setMonth((v) => shiftMonth(v, 1))} hitSlop={10} style={styles.navBtn}>
          <ChevronRight color={theme.colors.text} size={22} />
        </Pressable>
      </View>

      <View style={styles.controls}>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'timeline', label: 'Linha' },
            { value: 'calendar', label: 'Calendário' },
          ]}
        />
        <Segmented value={filter} onChange={setFilter} options={filters} wrap />
      </View>

      <View style={styles.summaryGrid}>
        <SummaryTile icon={<Activity color={theme.colors.success} size={18} />} label="Dias ativos" value={summary.activeDays} />
        <SummaryTile icon={<Zap color={theme.colors.xp} size={18} />} label="XP no mês" value={summary.xp} />
        <SummaryTile icon={<Coins color={theme.colors.gold} size={18} />} label="Ouro no mês" value={summary.gold} />
        <SummaryTile icon={<Flame color={theme.colors.hp} size={18} />} label="Falhas" value={summary.fails} />
      </View>

      {loading ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text variant="bodyMuted">Carregando histórico…</Text>
        </Card>
      ) : view === 'calendar' ? (
        <ActivityCalendar month={month} today={today} byDate={byDate} registry={registry} onSelectDay={setSelectedDay} />
      ) : (
        <Timeline days={days} registry={registry} onSelectDay={setSelectedDay} />
      )}

      <DayModal date={selectedDay} events={selectedEvents} registry={registry} onClose={() => setSelectedDay(null)} />
    </Screen>
  );
}

function SummaryTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card style={styles.summaryTile}>
      {icon}
      <Text variant="stat">{value}</Text>
      <Text variant="label">{label}</Text>
    </Card>
  );
}

function Timeline({
  days,
  registry,
  onSelectDay,
}: {
  days: DayGroup[];
  registry: Record<string, ModuleRow>;
  onSelectDay: (date: string) => void;
}) {
  if (days.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <Text variant="title" color={theme.colors.textMuted}>Sem registros neste período</Text>
        <Text variant="bodyMuted">Hábitos, treinos, missões, metas e medidas aparecem aqui.</Text>
      </Card>
    );
  }
  return (
    <View style={styles.timeline}>
      {days.map((day) => (
        <Pressable key={day.date} onPress={() => onSelectDay(day.date)} accessibilityRole="button">
          <Card style={styles.dayCard} accent={dayAccent(day.events, registry)}>
            <View style={styles.dayHeader}>
              <View>
                <Text variant="title">{formatDayLabel(day.date)}</Text>
                <Text variant="bodyMuted">{formatDateLong(day.date)}</Text>
              </View>
              <View style={styles.eventCount}>
                <Text variant="label" color={theme.colors.text}>{day.events.length}</Text>
              </View>
            </View>
            <View style={styles.previewStack}>
              {day.events.slice(0, 3).map((e) => (
                <EventRow key={e.id} event={e} registry={registry} />
              ))}
              {day.events.length > 3 ? (
                <Text variant="bodyMuted">+{day.events.length - 3} mais…</Text>
              ) : null}
            </View>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

function EventRow({ event, registry }: { event: HistoryEvent; registry: Record<string, ModuleRow> }) {
  const mod = registry[event.sourceType];
  const color = event.kind === 'fail' ? theme.colors.hp : mod?.cor ?? theme.colors.skill;
  return (
    <View style={styles.eventRow}>
      <View style={[styles.eventIcon, { borderColor: color }]}>
        {createElement(moduleIcon(mod?.icone ?? ''), { color, size: 16 })}
      </View>
      <View style={styles.flex}>
        <Text variant="bodyMedium" numberOfLines={1}>{event.label ?? mod?.nome ?? event.sourceType}</Text>
        <Text variant="bodyMuted" numberOfLines={1}>{eventDetail(event)}</Text>
      </View>
    </View>
  );
}

function ActivityCalendar({
  month,
  today,
  byDate,
  registry,
  onSelectDay,
}: {
  month: string;
  today: string;
  byDate: Record<string, HistoryEvent[]>;
  registry: Record<string, ModuleRow>;
  onSelectDay: (date: string) => void;
}) {
  const { daysInMonth, firstWeekday, dayStr } = monthRange(month);
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  return (
    <Card style={styles.calendarCard}>
      <View style={styles.sectionHeader}>
        <CalendarDays color={theme.colors.textMuted} size={20} />
        <View style={styles.flex}>
          <Text variant="title">Mapa do mês</Text>
          <Text variant="bodyMuted">Cada ponto é um módulo com registro no dia.</Text>
        </View>
      </View>
      <View style={styles.weekRow}>
        {WEEK.map((w, i) => (
          <View key={`${w}-${i}`} style={styles.calendarCell}>
            <Text variant="label">{w}</Text>
          </View>
        ))}
      </View>
      <View style={styles.calendarGrid}>
        {cells.map((day, i) => {
          if (day === null) return <View key={`b-${i}`} style={styles.calendarCell} />;
          const date = dayStr(day);
          const dayEvents = byDate[date] ?? [];
          const isToday = date === today;
          return (
            <Pressable key={date} style={styles.calendarCell} onPress={() => onSelectDay(date)} accessibilityLabel={`Dia ${day}`}>
              <View style={[styles.dayBubble, dayEvents.length > 0 && styles.activeBubble, isToday && styles.todayBubble]}>
                <Text variant="bodyMedium" color={isToday ? theme.colors.primary : theme.colors.text}>{day}</Text>
                <View style={styles.dotRow}>
                  {dayColors(dayEvents, registry).map((c, idx) => (
                    <View key={idx} style={[styles.dot, { backgroundColor: c }]} />
                  ))}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

function DayModal({
  date,
  events,
  registry,
  onClose,
}: {
  date: string | null;
  events: HistoryEvent[];
  registry: Record<string, ModuleRow>;
  onClose: () => void;
}) {
  return (
    <Modal visible={!!date} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Card style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.flex}>
              <Text variant="h2">{date ? formatDayLabel(date) : 'Dia'}</Text>
              {date ? <Text variant="bodyMuted">{formatDateLong(date)}</Text> : null}
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fechar">
              <X color={theme.colors.textMuted} size={22} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {events.length === 0 ? (
              <Text variant="bodyMuted">Nenhum registro neste dia.</Text>
            ) : (
              events.map((e) => <EventRow key={e.id} event={e} registry={registry} />)
            )}
          </ScrollView>
        </Card>
      </View>
    </Modal>
  );
}

// ---- dados ----

type DayGroup = { date: string; events: HistoryEvent[] };

function groupByDay(events: HistoryEvent[]): DayGroup[] {
  const map = new Map<string, HistoryEvent[]>();
  for (const e of events) {
    const arr = map.get(e.occurredOn) ?? [];
    arr.push(e);
    map.set(e.occurredOn, arr);
  }
  return [...map.entries()]
    .map(([date, list]) => ({ date, events: list }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function buildSummary(events: HistoryEvent[]) {
  const activeDays = new Set(events.map((e) => e.occurredOn)).size;
  let xp = 0;
  let gold = 0;
  let fails = 0;
  for (const e of events) {
    if (e.kind === 'fail') fails += 1;
    else {
      xp += Number(e.xp ?? 0);
      gold += Number(e.gold ?? 0);
    }
  }
  return { activeDays, xp, gold, fails };
}

function eventDetail(e: HistoryEvent): string {
  if (e.kind === 'fail') {
    const dmg = Number((e.meta as { damage?: number } | null)?.damage ?? 0);
    return dmg > 0 ? `${dmg} de dano` : 'Recaída registrada';
  }
  const parts: string[] = [];
  if (e.xp) parts.push(`+${e.xp} XP`);
  if (e.gold) parts.push(`+${e.gold} ouro`);
  if (e.essencia) parts.push(`+${e.essencia} essência`);
  return parts.join(' · ') || 'Sem recompensa';
}

function dayColors(events: HistoryEvent[], registry: Record<string, ModuleRow>): string[] {
  const colors: string[] = [];
  const seen = new Set<string>();
  let hasFail = false;
  for (const e of events) {
    if (e.kind === 'fail') {
      hasFail = true;
      continue;
    }
    if (seen.has(e.sourceType)) continue;
    seen.add(e.sourceType);
    colors.push(registry[e.sourceType]?.cor ?? theme.colors.skill);
  }
  if (hasFail) colors.push(theme.colors.hp);
  return colors.slice(0, 4);
}

function dayAccent(events: HistoryEvent[], registry: Record<string, ModuleRow>): string {
  if (events.some((e) => e.kind === 'fail')) return theme.colors.hp;
  const first = events.find((e) => e.kind === 'gain');
  return (first && registry[first.sourceType]?.cor) || theme.colors.success;
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
  dot: { width: 7, height: 7, borderRadius: 4 },
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
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  eventIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: { gap: theme.spacing.xs },
  backdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: theme.spacing.lg },
  modalCard: { maxHeight: '82%', gap: theme.spacing.md },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.spacing.md },
  modalContent: { gap: theme.spacing.md, paddingBottom: theme.spacing.md },
});
