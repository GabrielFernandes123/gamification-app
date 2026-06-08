import { useRouter } from 'expo-router';
import { ChevronLeft, Plus } from 'lucide-react-native';
import { memo, useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { SideQuestRow } from '@/features/sidequests/components/SideQuestRow';
import { useSideQuests, type SideQuest } from '@/features/sidequests/hooks/useSideQuests';
import { theme } from '@/theme/theme';

const Row = memo(SideQuestRow);

export default function SideQuestsScreen() {
  const router = useRouter();
  const quests = useSideQuests();

  const renderItem = useCallback(({ item }: { item: SideQuest }) => <Row quest={item} />, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Voltar">
          <ChevronLeft color={theme.colors.text} size={26} />
        </Pressable>
        <Text variant="h1">Side Quests</Text>
        <Pressable
          onPress={() => router.push('/(app)/sidequests/new')}
          style={styles.addBtn}
          accessibilityLabel="Nova missão"
        >
          <Plus color={theme.colors.textInverse} size={22} />
        </Pressable>
      </View>

      {quests.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={quests.data ?? []}
          keyExtractor={(q) => q.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
          onRefresh={() => quests.refetch()}
          refreshing={quests.isFetching}
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
  },
  addBtn: {
    width: theme.sizes.touch,
    height: theme.sizes.touch,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: theme.spacing.lg, paddingTop: theme.spacing.sm, flexGrow: 1 },
  empty: { alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xxl * 2, paddingHorizontal: theme.spacing.xl },
  emptyText: { textAlign: 'center' },
});
