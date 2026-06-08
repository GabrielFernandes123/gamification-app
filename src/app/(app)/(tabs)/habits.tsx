import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Flag, Hexagon, Plus, Repeat } from 'lucide-react-native';
import { memo, useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSegmented } from '@/components/ui/IconSegmented';
import { Text } from '@/components/ui/Text';
import { HabitRow } from '@/features/habits/components/HabitRow';
import { useHabits, type Habit } from '@/features/habits/hooks/useHabits';
import {
  habitProgress,
  periodDayProgress,
  usePeriodLogs,
  useTodayLogs,
} from '@/features/habits/hooks/useTodayLogs';
import { isDueToday } from '@/features/habits/meta';
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

  const data = (habits.data ?? []).slice().sort((a, b) => {
    const da = isDueToday(a, weekday) ? 0 : 1;
    const db = isDueToday(b, weekday) ? 0 : 1;
    return da - db;
  });

  const renderHabit = useCallback(
    ({ item }: { item: Habit }) => (
      <Row
        habit={item}
        progress={habitProgress(logs.data, item.id)}
        periodProgress={periodDayProgress(periodLogs.data, item, today)}
        weekday={weekday}
      />
    ),
    [logs.data, periodLogs.data, today, weekday],
  );

  const renderQuest = useCallback(({ item }: { item: SideQuest }) => <QuestRow quest={item} />, []);

  const loading = mode === 'habits' ? habits.isLoading : quests.isLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text variant="h1">Hábitos</Text>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
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
    backgroundColor: theme.colors.surface,
  },
  addBtn: {
    width: theme.sizes.touch,
    height: theme.sizes.touch,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selector: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: theme.spacing.lg, paddingTop: theme.spacing.sm, flexGrow: 1 },
  empty: { alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xxl * 2, paddingHorizontal: theme.spacing.xl },
  emptyText: { textAlign: 'center' },
});
