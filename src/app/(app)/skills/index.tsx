import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { memo, useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { SkillRow } from '@/features/skills/components/SkillRow';
import { useSkills, type Skill } from '@/features/skills/hooks/useSkills';
import { theme } from '@/theme/theme';

const Row = memo(SkillRow);

export default function SkillsScreen() {
  const router = useRouter();
  const skills = useSkills();

  const renderItem = useCallback(({ item }: { item: Skill }) => <Row skill={item} />, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text variant="h1">Skills</Text>
        <Pressable
          onPress={() => router.push('/(app)/skills/new')}
          style={styles.addBtn}
          accessibilityLabel="Nova skill"
        >
          <Plus color={theme.colors.textInverse} size={22} />
        </Pressable>
      </View>

      {skills.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={skills.data ?? []}
          keyExtractor={(s) => s.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
          onRefresh={() => skills.refetch()}
          refreshing={skills.isFetching}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text variant="title" color={theme.colors.textMuted}>
                Nenhuma skill ainda
              </Text>
              <Text variant="bodyMuted" style={styles.emptyText}>
                Crie skills temáticas (Saúde, Foco…) e vincule seus hábitos a elas.
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
