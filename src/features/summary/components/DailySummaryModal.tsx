import { Modal, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { theme } from '@/theme/theme';
import type { DailySummary } from '@/types/rpc';

export function DailySummaryModal({
  summary,
  onDismiss,
}: {
  summary: DailySummary | null;
  onDismiss: () => void;
}) {
  const visible = !!summary && summary.events.length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <Card style={styles.card}>
          <Text variant="h2">Enquanto você esteve fora…</Text>
          <Text variant="bodyMuted" style={styles.sub}>
            Resumo do fechamento dos seus hábitos.
          </Text>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {summary?.events.map((e, i) => {
              const positiveOutcome = e.damage === 0;
              return (
                <View key={`${e.habitId}-${e.date}-${i}`} style={styles.eventRow}>
                  <View style={styles.eventInfo}>
                    <Text variant="bodyMedium" numberOfLines={1}>
                      {e.habitName}
                    </Text>
                    <Text variant="bodyMuted">{e.date}</Text>
                  </View>
                  <Text
                    variant="title"
                    color={positiveOutcome ? theme.colors.success : theme.colors.hp}
                  >
                    {positiveOutcome ? `+${e.xp} XP` : `-${e.damage} HP`}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          <Button label="Entendi" onPress={onDismiss} fullWidth />
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
  card: { gap: theme.spacing.sm, borderColor: theme.colors.primaryDim },
  sub: { marginBottom: theme.spacing.sm },
  list: { maxHeight: 320 },
  listContent: { gap: theme.spacing.sm },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  eventInfo: { flex: 1, gap: 2 },
});
