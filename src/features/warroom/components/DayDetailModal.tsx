import { Modal, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import type { HabitLog } from '@/features/habits/hooks/useTodayLogs';
import { theme } from '@/theme/theme';

type Props = {
  date: string | null;
  logs: HabitLog[];
  habitNames: Record<string, string>;
  onClose: () => void;
};

export function DayDetailModal({ date, logs, habitNames, onClose }: Props) {
  const dayLogs = date ? logs.filter((l) => l.occurred_on === date) : [];

  return (
    <Modal visible={!!date} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Card style={styles.card}>
          <Text variant="h2">{date}</Text>
          {dayLogs.length === 0 ? (
            <Text variant="bodyMuted" style={styles.empty}>
              Nenhum registro neste dia.
            </Text>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {dayLogs.map((l) => {
                return (
                  <View key={l.id} style={styles.row}>
                    <View style={styles.info}>
                      <Text variant="bodyMedium" numberOfLines={1}>
                        {habitNames[l.habit_id] ?? 'Hábito'}
                      </Text>
                      <Text variant="bodyMuted">
                        {l.is_auto ? 'automático' : 'manual'} · {l.success ? 'sucesso' : 'falha'}
                      </Text>
                    </View>
                    <Text
                      variant="title"
                      color={l.damage_taken > 0 ? theme.colors.hp : theme.colors.success}
                    >
                      {l.damage_taken > 0 ? `-${l.damage_taken} HP` : `+${l.xp_gained} XP`}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
          <Button label="Fechar" onPress={onClose} fullWidth />
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: { gap: theme.spacing.md },
  empty: { paddingVertical: theme.spacing.md },
  list: { maxHeight: 320 },
  listContent: { gap: theme.spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  info: { flex: 1, gap: 2 },
});
