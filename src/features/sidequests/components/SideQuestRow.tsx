import { useRouter } from 'expo-router';
import { Check, Pencil } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useDifficulties } from '@/features/habits/hooks/useDifficulties';
import { DIFFICULTY_META } from '@/features/habits/meta';
import { theme } from '@/theme/theme';
import { ACHIEVEMENT_BY_KEY } from '@/features/achievements/catalog';
import { useToday } from '@/hooks/useToday';
import { useLevelUp } from '@/providers/LevelUpProvider';
import { formatDateOnly, isDateOnlyBefore } from '@/utils/date';
import type { SideQuest } from '../hooks/useSideQuests';
import { useCompleteSideQuest } from '../hooks/useSideQuests';

export function SideQuestRow({ quest }: { quest: SideQuest }) {
  const router = useRouter();
  const complete = useCompleteSideQuest();
  const { celebrate } = useLevelUp();
  const diffs = useDifficulties();
  const { today } = useToday();
  const diff = DIFFICULTY_META[quest.difficulty];
  const reward = diffs.data?.[quest.difficulty];

  const overdue = !quest.is_completed && isDateOnlyBefore(quest.due_date, today);

  function onComplete() {
    complete.mutate(quest.id, {
      onError: (e) => Alert.alert('Ops', e instanceof Error ? e.message : 'Erro'),
      onSuccess: (res) => {
        if (res.leveledUp) celebrate(res.newLevel);
        const keys = res.newAchievements ?? [];
        if (keys.length > 0) {
          const titles = keys.map((k) => ACHIEVEMENT_BY_KEY[k]?.title ?? k).join(', ');
          Alert.alert('🏆 Conquista desbloqueada!', titles);
        }
      },
    });
  }

  return (
    <Card accent={quest.is_completed ? theme.colors.success : overdue ? theme.colors.hp : diff.color}>
      <View style={styles.header}>
        <View style={styles.info}>
          <Text
            variant="title"
            numberOfLines={1}
            style={quest.is_completed ? styles.done : undefined}
          >
            {quest.name}
          </Text>
          {quest.description ? <Text variant="bodyMuted">{quest.description}</Text> : null}
          <View style={styles.metaRow}>
            <View style={styles.badge}>
              <Text variant="label" color={diff.color}>
                {diff.label}
              </Text>
            </View>
            {quest.due_date ? (
              <Text variant="bodyMuted" color={overdue ? theme.colors.hp : theme.colors.textMuted}>
                {overdue ? 'Atrasada · ' : ''}
                {formatDateOnly(quest.due_date)}
              </Text>
            ) : null}
          </View>
        </View>
        {!quest.is_completed && (
          <Pressable
            onPress={() => router.push({ pathname: '/(app)/sidequests/[id]', params: { id: quest.id } })}
            hitSlop={10}
            accessibilityLabel="Editar missão"
            style={styles.edit}
          >
            <Pencil color={theme.colors.textMuted} size={18} />
          </Pressable>
        )}
      </View>

      {quest.is_completed ? (
        <Text variant="bodyMedium" color={theme.colors.success} style={styles.reward}>
          +{quest.xp_gained ?? 0} XP · +{quest.gold_gained ?? 0} 🪙
        </Text>
      ) : (
        <Pressable
          onPress={onComplete}
          disabled={complete.isPending}
          style={[styles.complete, complete.isPending && styles.disabled]}
          accessibilityRole="button"
        >
          <Check color={theme.colors.textInverse} size={18} />
          <Text variant="title" color={theme.colors.textInverse} style={styles.completeLabel}>
            Concluir{reward ? ` (+${reward.xp} XP)` : ''}
          </Text>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' },
  info: { flex: 1, gap: 2 },
  done: { textDecorationLine: 'line-through', color: theme.colors.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: 4, flexWrap: 'wrap' },
  badge: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  edit: { padding: 4 },
  reward: { marginTop: theme.spacing.md },
  complete: {
    marginTop: theme.spacing.md,
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  completeLabel: { fontSize: theme.fontSizes.md },
  disabled: { opacity: 0.5 },
});
