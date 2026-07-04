import { Coins, Flame, Heart, Shield } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { theme } from '@/theme/theme';
import type { SystemItem, SystemItemType } from '../hooks/useStore';

const META: Record<SystemItemType, { color: string; icon: (c: string) => React.ReactNode }> = {
  heal: { color: theme.colors.success, icon: (c) => <Heart color={c} size={22} /> },
  damage_reduction: { color: theme.colors.skill, icon: (c) => <Shield color={c} size={22} /> },
  streak_recovery: { color: theme.colors.primary, icon: (c) => <Flame color={c} size={22} /> },
};

export function SystemItemCard({
  item,
  gold,
  onBuy,
}: {
  item: SystemItem;
  gold: number;
  onBuy: (item: SystemItem) => void;
}) {
  const meta = META[item.type];
  const canAfford = gold >= item.cost;
  return (
    <Card accent={meta.color}>
      <View style={styles.header}>
        {meta.icon(meta.color)}
        <View style={styles.info}>
          <Text variant="title" numberOfLines={1}>
            {item.name}
          </Text>
          <Text variant="bodyMuted">{item.description}</Text>
        </View>
      </View>
      <Pressable
        onPress={() => onBuy(item)}
        disabled={!canAfford}
        style={[styles.buy, !canAfford && styles.disabled]}
        accessibilityRole="button"
      >
        <Coins color={theme.colors.gold} size={16} />
        <Text variant="bodyMedium" color={canAfford ? theme.colors.text : theme.colors.textMuted}>
          {item.cost}
        </Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' },
  info: { flex: 1, gap: 2 },
  buy: {
    marginTop: theme.spacing.md,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    minHeight: 40,
  },
  disabled: { opacity: 0.45 },
});
