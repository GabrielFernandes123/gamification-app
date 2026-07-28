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
import { ACHIEVEMENTS } from '@/features/achievements/catalog';
import { useHistory, type HistoryEvent } from '@/features/history/useHistory';
import { moduleIcon } from '@/features/modules/moduleIcon';
import { useModules, type ModuleRow } from '@/features/modules/useModules';
import { monthLabel, monthRange, shiftMonth } from '@/features/warroom/month';
import { useToday } from '@/hooks/useToday';
import { theme } from '@/theme/theme';

/** Catálogo de conquistas: o histórico recebe a CHAVE e traduz aqui. */
const ACHIEVEMENT_TITLES = new Map(ACHIEVEMENTS.map((a) => [a.key, a.title] as const));

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
              {groupEvents(day.events).slice(0, 3).map((g) => (
                <GroupRow key={g.key} group={g} registry={registry} />
              ))}
              {groupEvents(day.events).length > 3 ? (
                <Text variant="bodyMuted">+{groupEvents(day.events).length - 3} mais…</Text>
              ) : null}
            </View>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

function GroupRow({ group, registry }: { group: EventGroup; registry: Record<string, ModuleRow> }) {
  const event = group.head;
  const mod = registry[event.sourceType];
  const color =
    event.kind === 'heal'
      ? theme.colors.success
      : event.kind !== 'gain'
        ? theme.colors.hp
        : mod?.cor ?? theme.colors.skill;
  const many = group.events.length > 1;
  return (
    <View style={styles.eventRow}>
      <View style={[styles.eventIcon, { borderColor: color }]}>
        {createElement(moduleIcon(mod?.icone ?? ''), { color, size: 16 })}
      </View>
      <View style={styles.flex}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {eventTitle(event, mod?.nome)}{many ? ` (${group.events.length}×)` : ''}
        </Text>
        <Text variant="bodyMuted" numberOfLines={1}>{groupDetail(group)}</Text>
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
              groupEvents(events).map((g) => <GroupRow key={g.key} group={g} registry={registry} />)
            )}
          </ScrollView>
        </Card>
      </View>
    </Modal>
  );
}

/**
 * Consolida o que é a MESMA coisa repetida no dia (espelha o web).
 *
 * A cobrança de tempo de tela debita a diferença acumulada a cada
 * sincronização: a 10 ouro/hora isso é uma linha de "−1 ouro" a cada 6 minutos.
 * Somadas, escondem o que importa (multa, liberação paga, foco). O ledger
 * continua fino; quem agrupa é a leitura.
 */
type EventGroup = {
  key: string;
  head: HistoryEvent;
  events: HistoryEvent[];
  xp: number;
  gold: number;
  essencia: number;
  damage: number;
  billableSeconds: number;
};

function reasonKey(e: HistoryEvent): string {
  const meta = (e.meta ?? {}) as Record<string, unknown>;
  if (e.kind === 'damage' || e.kind === 'heal') return 'plain';
  if (e.sourceType === 'store') return 'purchase';
  if (e.sourceType === 'death') return 'death';
  if (e.sourceType !== 'tracking') return 'plain';
  if (meta.refund_of) return 'refund';
  if (meta.daily_bonus) return 'bonus';
  if (Array.isArray(meta.sabotage)) return 'fine';
  if (meta.unlock) return 'unlock';
  if (meta.focus_session) return 'focus';
  if (typeof meta.billable === 'number') return 'charge';
  return 'plain';
}

function groupEvents(events: HistoryEvent[]): EventGroup[] {
  const groups = new Map<string, EventGroup>();
  for (const e of events) {
    const reason = reasonKey(e);
    const key = [e.kind, e.sourceType, reason, e.label ?? e.sourceId ?? ''].join('|');
    const meta = (e.meta ?? {}) as Record<string, unknown>;
    const g = groups.get(key) ?? {
      key, head: e, events: [], xp: 0, gold: 0, essencia: 0, damage: 0, billableSeconds: 0,
    };
    g.events.push(e);
    g.xp += Number(e.xp ?? 0);
    g.gold += Number(e.gold ?? 0);
    g.essencia += Number(e.essencia ?? 0);
    g.damage += Number(meta.damage ?? 0);
    if (reason === 'charge') {
      g.billableSeconds = Math.max(g.billableSeconds, Number(meta.billable ?? 0));
    }
    groups.set(key, g);
  }
  return [...groups.values()];
}

/** Título da linha: o que aconteceu, não o módulo de onde veio. */
function eventTitle(e: HistoryEvent, moduleName?: string): string {
  if (e.sourceType === 'achievement' && e.label) {
    return ACHIEVEMENT_TITLES.get(e.label) ?? e.label;
  }
  switch (reasonKey(e)) {
    case 'fine': return 'Multa de proteção';
    case 'focus': return 'Sessão de foco';
    case 'refund': return 'Estorno';
    case 'unlock': return e.label ? `${e.label} · liberação` : 'Liberação de bloqueio';
    case 'bonus': return e.label ? `${e.label} · bônus` : 'Bônus de franquia';
    default:
      if (e.kind === 'heal') return e.label ?? 'Cura';
      return e.label ?? moduleName ?? (e.kind === 'damage' ? 'Boss' : e.sourceType);
  }
}

function groupDetail(g: EventGroup): string {
  if (g.events.length === 1) return eventDetail(g.head);
  const parts: string[] = [];
  if (g.xp) parts.push(`${g.xp > 0 ? '+' : '−'}${Math.abs(g.xp)} XP`);
  if (g.gold) parts.push(`${g.gold > 0 ? '+' : '−'}${Math.abs(g.gold)} ouro`);
  if (g.essencia) parts.push(`${g.essencia > 0 ? '+' : '−'}${Math.abs(g.essencia)} essência`);
  if (g.damage) parts.push(`${g.head.kind === 'heal' ? '+' : '−'}${g.damage} HP`);
  // a cobrança é ESTADO acumulado: o total do dia é o último `billable`
  if (g.billableSeconds > 0) parts.push(`${duration(g.billableSeconds)} acima da franquia`);
  parts.push(`${g.events.length}×`);
  return parts.join(' · ');
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
    if (e.kind === 'damage' || e.kind === 'heal') continue; // não são falhas suas
    if (e.kind === 'fail') fails += 1;
    else {
      xp += Number(e.xp ?? 0);
      gold += Number(e.gold ?? 0);
    }
  }
  return { activeDays, xp, gold, fails };
}

/** "1h 12min" — duração curta, para caber na linha do evento. */
function duration(seconds: number): string {
  const total = Math.round(seconds / 60);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes}min`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}min`;
}

/**
 * O MOTIVO do evento, lido do `meta` do ledger (espelha o web).
 *
 * Ouro de tempo de tela entra e sai por quatro caminhos diferentes (excesso,
 * bônus de franquia, desbloqueio pago, foco) e ainda tem a multa de proteção.
 * Sem isto a linha dizia só "−1 ouro" e não havia como saber de onde veio.
 */
function eventReason(e: HistoryEvent): string | null {
  const meta = (e.meta ?? {}) as Record<string, unknown>;

  if (e.sourceType === 'store') {
    return meta.purchase === 'equipment'
      ? 'equipamento comprado'
      : meta.purchase === 'system_item'
        ? 'item da loja'
        : 'recompensa resgatada';
  }
  if (e.sourceType === 'death') {
    if (meta.reset) return 'recomeço manual do personagem';
    return `morte${meta.by ? ` — ${String(meta.by)}` : ''}`;
  }
  if (e.sourceType === 'build') {
    return meta.respec === 'class' ? 'troca de classe' : 'redistribuição de pontos';
  }
  if (e.sourceType !== 'tracking') return null;

  if (meta.refund_of) {
    return typeof meta.reason === 'string' ? meta.reason : 'estorno';
  }

  if (meta.daily_bonus) {
    const used = typeof meta.seconds === 'number' ? duration(meta.seconds) : null;
    return used ? `bônus por fechar na franquia (${used})` : 'bônus por fechar na franquia';
  }
  if (Array.isArray(meta.sabotage)) {
    const REASONS: Record<string, string> = {
      sem_heartbeat: 'aparelho sem dar sinal',
      autorizacao_revogada: 'autorização de tempo de tela desligada',
      shield_desarmado: 'bloqueio desarmado',
      safari_desligado: 'filtro do Safari desligado',
    };
    return `multa de proteção — ${meta.sabotage.map((k) => REASONS[String(k)] ?? String(k)).join(', ')}`;
  }
  if (meta.unlock) {
    const minutes = typeof meta.minutes === 'number' ? ` por ${meta.minutes}min` : '';
    return `liberou o bloqueio${minutes}`;
  }
  if (meta.focus_session) {
    if (meta.completed_by_time) return 'sessão de foco liquidada no teto';
    if (meta.bypass) return 'desistiu da sessão de foco antes da meta';
    return meta.reached_goal ? 'sessão de foco concluída' : 'sessão de foco encerrada';
  }
  if (typeof meta.billable === 'number') return `${duration(meta.billable)} acima da franquia`;
  return null;
}

/** O golpe do boss contado como frase: por que veio e quanto doeu. */
function damageDetail(e: HistoryEvent): string {
  const meta = (e.meta ?? {}) as Record<string, unknown>;
  const damage = Number((meta as { damage?: number }).damage ?? 0);
  const parts: string[] = [meta.dodged ? 'você desviou' : `−${damage} HP`];

  if (meta.reason === 'milestone') {
    const miss = typeof meta.missRatio === 'number' ? Math.round(meta.missRatio * 100) : null;
    parts.push(miss === null ? 'marco do período' : `fechou o mês com ${miss}% do marco por cumprir`);
  } else {
    const xp = typeof meta.xpToday === 'number' ? meta.xpToday : null;
    const goal = typeof meta.dailyGoal === 'number' ? meta.dailyGoal : null;
    if (xp !== null && goal !== null && xp < goal) parts.push(`meta do dia: ${xp}/${goal} XP`);
    const feed = typeof meta.feedSeconds === 'number' ? meta.feedSeconds : 0;
    if (feed >= 300) parts.push(`${Math.floor(feed / 60)}min de tela além do limite`);
  }
  return parts.join(' · ');
}

function eventDetail(e: HistoryEvent): string {
  if (e.kind === 'heal') {
    const healed = Number(((e.meta ?? {}) as { damage?: number }).damage ?? 0);
    return `+${healed} HP recuperados`;
  }
  if (e.kind === 'damage') return damageDetail(e);
  if (e.kind === 'fail') {
    const dmg = Number((e.meta as { damage?: number } | null)?.damage ?? 0);
    return dmg > 0 ? `${dmg} de dano` : 'Recaída registrada';
  }
  const parts: string[] = [];
  if (e.xp) parts.push(`${e.xp > 0 ? '+' : ''}${e.xp} XP`);
  // ouro NEGATIVO é a regra no tempo de tela: o sinal precisa vir do valor
  if (e.gold) parts.push(`${e.gold > 0 ? '+' : '−'}${Math.abs(Number(e.gold))} ouro`);
  if (e.essencia) parts.push(`+${e.essencia} essência`);
  const reason = eventReason(e);
  if (reason) parts.push(reason);
  return parts.join(' · ') || 'Sem recompensa';
}

function dayColors(events: HistoryEvent[], registry: Record<string, ModuleRow>): string[] {
  const colors: string[] = [];
  const seen = new Set<string>();
  let hasFail = false;
  for (const e of events) {
    if (e.kind === 'heal') continue;
    if (e.kind !== 'gain') {
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
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
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
    backgroundColor: theme.colors.surfaceSoft,
  },
  monthCard: {
    minHeight: 74,
    borderRadius: theme.radius.md,
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
    backgroundColor: theme.colors.surfaceSoft,
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
  activeBubble: { backgroundColor: theme.colors.surfaceSoft, borderColor: theme.colors.border },
  todayBubble: { borderColor: theme.colors.primaryBright, backgroundColor: theme.colors.primaryDim },
  dotRow: { minHeight: 8, flexDirection: 'row', gap: 3, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  timeline: { gap: theme.spacing.md },
  dayCard: { gap: theme.spacing.md },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md },
  eventCount: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
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
  modalCard: { maxHeight: '82%', gap: theme.spacing.md, borderColor: theme.colors.primaryDim },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.spacing.md },
  modalContent: { gap: theme.spacing.md, paddingBottom: theme.spacing.md },
});
