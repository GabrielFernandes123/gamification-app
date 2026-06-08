import { Coins, Shield, Sparkles, Sword } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { ATTRIBUTE_LABEL } from '@/features/character/attributes';
import { theme } from '@/theme/theme';
import type { EquipmentCatalogItem, EquipmentSlot } from '@/types/build';

const SLOT_META: Record<EquipmentSlot, { label: string; icon: (c: string) => React.ReactNode }> = {
  arma: { label: 'Arma', icon: (c) => <Sword color={c} size={22} /> },
  armadura: { label: 'Armadura', icon: (c) => <Shield color={c} size={22} /> },
  acessorio: { label: 'Acessório', icon: (c) => <Sparkles color={c} size={22} /> },
};

function bonusText(item: EquipmentCatalogItem): string {
  const parts = Object.entries(item.attribute_bonuses ?? {})
    .filter(([, v]) => v)
    .map(([k, v]) => `+${v} ${ATTRIBUTE_LABEL[k as keyof typeof ATTRIBUTE_LABEL]}`);
  return parts.length ? parts.join(' · ') : 'Sem bônus';
}

export function EquipmentCatalogCard({
  item,
  gold,
  essencia,
  level,
  onBuyGold,
  onBuyEssencia,
}: {
  item: EquipmentCatalogItem;
  gold: number;
  essencia: number;
  level: number;
  onBuyGold: (item: EquipmentCatalogItem) => void;
  onBuyEssencia: (item: EquipmentCatalogItem) => void;
}) {
  const meta = SLOT_META[item.slot];
  const goldCost = item.cost_gold;
  const essenciaCost = item.cost_essencia;
  const canAffordGold = goldCost != null && gold >= goldCost;
  const canAffordEssencia = essenciaCost != null && essencia >= essenciaCost;
  const locked = level < item.required_level;
  return (
    <Card accent={theme.colors.primary}>
      <View style={styles.header}>
        {meta.icon(theme.colors.primary)}
        <View style={styles.info}>
          <Text variant="title" numberOfLines={1}>
            {item.name}
          </Text>
          <Text variant="bodyMuted">
            {meta.label} · {bonusText(item)}
          </Text>
          <Text
            variant="label"
            color={locked ? theme.colors.hp : theme.colors.textMuted}
          >
            Requer nível {item.required_level}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        {goldCost != null ? (
          <Pressable
            onPress={() => onBuyGold(item)}
            disabled={!canAffordGold}
            style={[styles.buy, !canAffordGold && styles.disabled]}
            accessibilityRole="button"
          >
            <Coins color={theme.colors.gold} size={16} />
            <Text variant="bodyMedium" color={canAffordGold ? theme.colors.text : theme.colors.textMuted}>
              {goldCost}
            </Text>
          </Pressable>
        ) : null}
        {essenciaCost != null ? (
          <Pressable
            onPress={() => onBuyEssencia(item)}
            disabled={!canAffordEssencia}
            style={[styles.buy, !canAffordEssencia && styles.disabled]}
            accessibilityRole="button"
          >
            <Sparkles color={theme.colors.essencia} size={16} />
            <Text variant="bodyMedium" color={canAffordEssencia ? theme.colors.text : theme.colors.textMuted}>
              {essenciaCost}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' },
  info: { flex: 1, gap: 2 },
  actions: {
    marginTop: theme.spacing.md,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  buy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    minHeight: 40,
  },
  disabled: { opacity: 0.45 },
});
