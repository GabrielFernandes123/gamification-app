import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Coins, Flag, Hexagon, Plus, Repeat, Zap } from 'lucide-react-native';
import { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSegmented } from '@/components/ui/IconSegmented';
import { Text } from '@/components/ui/Text';
import { HabitRow } from '@/features/habits/components/HabitRow';
import { useDifficulties } from '@/features/habits/hooks/useDifficulties';
import { useHabits, type Habit } from '@/features/habits/hooks/useHabits';
import {
  habitProgress,
  periodDayProgress,
  usePeriodLogs,
  useTodayLogs,
} from '@/features/habits/hooks/useTodayLogs';
import { dailyTarget, isDueToday } from '@/features/habits/meta';
import { SideQuestRow } from '@/features/sidequests/components/SideQuestRow';
import { useSideQuests, type SideQuest } from '@/features/sidequests/hooks/useSideQuests';
import { useToday } from '@/hooks/useToday';
import { qk } from '@/lib/queryKeys';
import { theme } from '@/theme/theme';

type Mode = 'habits' | 'sidequests';

const Row = memo(HabitRow);
const QuestRow = memo(SideQuestRow);

export default function HabitsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { today, weekday } = useToday();
  const [mode, setMode] = useState<Mode>('habits');
  const habits = useHabits();
  const difficulties = useDifficulties();
  const logs = useTodayLogs(today);
  const periodLogs = usePeriodLogs(today);
  const quests = useSideQuests();

  const refreshing =
    mode === 'habits'
      ? habits.isFetching || logs.isFetching || periodLogs.isFetching
      : quests.isFetching;
  const onRefresh = useCallback(() => {
    if (mode === 'habits') {
      qc.invalidateQueries({ queryKey: qk.habits });
      qc.invalidateQueries({ queryKey: qk.todayLogs(today) });
      qc.invalidateQueries({ queryKey: qk.periodLogs(today) });
    } else {
      void quests.refetch();
    }
  }, [mode, qc, today, quests]);

  const progressByHabit = useMemo(() => {
    const map = new Map<string, ReturnType<typeof habitProgress>>();
    for (const habit of habits.data ?? []) map.set(habit.id, habitProgress(logs.data, habit.id));
    return map;
  }, [habits.data, logs.data]);
  const data = useMemo(
    () =>
      (habits.data ?? []).slice().sort((a, b) => {
        const pa = habitSortPriority(a, progressByHabit.get(a.id), weekday);
        const pb = habitSortPriority(b, progressByHabit.get(b.id), weekday);
        if (pa !== pb) return pa - pb;
        return a.name.localeCompare(b.name, 'pt-BR');
      }),
    [habits.data, progressByHabit, weekday],
  );
  const periodProgressByHabit = useMemo(() => {
    const map = new Map<string, ReturnType<typeof periodDayProgress>>();
    for (const habit of habits.data ?? []) {
      map.set(habit.id, periodDayProgress(periodLogs.data, habit, today));
    }
    return map;
  }, [habits.data, periodLogs.data, today]);

  const dailyPotential = useMemo(() => {
    const dueHabits = (habits.data ?? []).filter((habit) => isDueToday(habit, weekday));
    return dueHabits.reduce(
      (sum, habit) => {
        // Economia vem do servidor (GET /difficulties) — nada hardcoded.
        const reward = difficulties.data?.[habit.difficulty] ?? { xp: 0, gold: 0 };
        return {
          xp: sum.xp + reward.xp,
          gold: sum.gold + reward.gold,
        };
      },
      { xp: 0, gold: 0 },
    );
  }, [difficulties.data, habits.data, weekday]);

  const renderHabit = useCallback(
    ({ item }: { item: Habit }) => (
      <Row
        habit={item}
        progress={progressByHabit.get(item.id) ?? habitProgress(undefined, item.id)}
        periodProgress={periodProgressByHabit.get(item.id)}
        weekday={weekday}
      />
    ),
    [periodProgressByHabit, progressByHabit, weekday],
  );

  const renderQuest = useCallback(({ item }: { item: SideQuest }) => <QuestRow quest={item} />, []);

  const loading = mode === 'habits' ? habits.isLoading : quests.isLoading;
  const activeError = mode === 'habits' ? habits.isError : quests.isError;
  const retry = mode === 'habits' ? habits.refetch : quests.refetch;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text variant="h1" numberOfLines={1}>
            Hábitos
          </Text>
          {mode === 'habits' ? (
            <View
              style={styles.headerStats}
              accessibilityLabel={`Potencial do dia: ${dailyPotential.xp} XP e ${dailyPotential.gold} ouro`}
            >
              <HeaderMetric
                icon={<Zap color={theme.colors.xp} size={14} />}
                label="XP"
                value={dailyPotential.xp}
                color={theme.colors.xp}
              />
              <HeaderMetric
                icon={<Coins color={theme.colors.gold} size={14} />}
                label="Ouro"
                value={dailyPotential.gold}
                color={theme.colors.gold}
              />
            </View>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push('/(app)/skills')}
            hitSlop={10}
            accessibilityLabel="Skills"
            style={styles.iconBtn}
          >
            <Hexagon color={theme.colors.skill} size={22} />
          </Pressable>
          <Pressable
            onPress={() =>
              router.push(mode === 'habits' ? '/(app)/habits/new' : '/(app)/sidequests/new')
            }
            style={styles.addBtn}
            accessibilityLabel={mode === 'habits' ? 'Novo hábito' : 'Nova missão'}
          >
            <Plus color={theme.colors.textInverse} size={22} />
          </Pressable>
        </View>
      </View>

      <View style={styles.selector}>
        <IconSegmented<Mode>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'habits', label: 'Hábitos', icon: Repeat, color: theme.colors.primary },
            { value: 'sidequests', label: 'Missões', icon: Flag, color: theme.colors.essencia },
          ]}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : activeError ? (
        // Erro de carregamento: distinto do estado vazio, com ação de retry.
        <View style={styles.center}>
          <View style={styles.errorBox}>
            <Text variant="title" color={theme.colors.hp}>
              {mode === 'habits' ? 'Erro ao carregar hábitos' : 'Erro ao carregar missões'}
            </Text>
            <Text variant="bodyMuted" style={styles.emptyText}>
              Não foi possível buscar seus dados. Verifique a conexão.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void retry()}
              style={styles.retryBtn}
            >
              <Text variant="title" color={theme.colors.textInverse}>
                Tentar novamente
              </Text>
            </Pressable>
          </View>
        </View>
      ) : mode === 'habits' ? (
        <FlatList
          data={data}
          keyExtractor={(h) => h.id}
          renderItem={renderHabit}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text variant="title" color={theme.colors.textMuted}>
                Nenhum hábito ainda
              </Text>
              <Text variant="bodyMuted" style={styles.emptyText}>
                Toque em + para criar seu primeiro hábito e começar a ganhar XP.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={quests.data ?? []}
          keyExtractor={(q) => q.id}
          renderItem={renderQuest}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text variant="title" color={theme.colors.textMuted}>
                Nenhuma missão
              </Text>
              <Text variant="bodyMuted" style={styles.emptyText}>
                Crie missões pontuais (ex.: organizar o armário) e ganhe XP ao concluir.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function HeaderMetric({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.headerMetric}>
      {icon}
      <Text variant="bodyMedium" color={color} style={styles.headerMetricText}>
        {value} {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.sm,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flexShrink: 1,
  },
  headerMetric: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  headerMetricText: {
    fontSize: theme.fontSizes.xs,
    lineHeight: 16,
    includeFontPadding: false,
  },
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
    backgroundColor: theme.colors.surfaceAlt,
  },
  addBtn: {
    width: theme.sizes.touch,
    height: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primaryBright,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selector: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorBox: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    margin: theme.spacing.lg,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.hp,
    backgroundColor: theme.colors.surface,
  },
  retryBtn: {
    alignSelf: 'stretch',
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primaryBright,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
  },
  list: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    // Folga para a tab bar flutuante.
    paddingBottom: theme.sizes.tabBarClearance,
    flexGrow: 1,
  },
  empty: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xxl * 2,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  emptyText: { textAlign: 'center' },
});

function habitSortPriority(
  habit: Habit,
  progress: ReturnType<typeof habitProgress> | undefined,
  weekday: number,
) {
  if (!isDueToday(habit, weekday)) return 4;
  const current = progress ?? habitProgress(undefined, habit.id);
  const target = dailyTarget(habit);
  if (current.settled) return 3;
  if (habit.type === 'positive') {
    if (current.success >= target) return 2;
    if (current.success > 0) return 1;
    return 0;
  }
  if (current.fail >= target) return 2;
  if (current.fail > 0) return 1;
  return 0;
}
