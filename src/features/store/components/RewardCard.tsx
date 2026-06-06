import { useRouter } from 'expo-router';
import { Clock, Coins, Gift, Pencil } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { theme } from '@/theme/theme';
import type { Reward } from '../hooks/useStore';

export function RewardCard({
  reward,
  gold,
  onBuy,
}: {
  reward: Reward;
  gold: number;
  onBuy: (reward: Reward) => void;
}) {
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);
  const cooldownUntil = useMemo(() => getCooldownUntil(reward), [reward]);
  const remainingMs = cooldownUntil && now ? Math.max(0, cooldownUntil - now) : 0;
  const inCooldown = !!cooldownUntil && (!now || remainingMs > 0);
  const outOfStock = reward.has_stock && (reward.current_stock ?? 0) <= 0;
  const canAfford = gold >= reward.cost && !outOfStock && !inCooldown;

  useEffect(() => {
    if (!cooldownUntil) return;
    const tick = () => setNow(new Date().getTime());
    const firstTick = setTimeout(tick, 0);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(firstTick);
      clearInterval(timer);
    };
  }, [cooldownUntil]);

  return (
    <Card accent={theme.colors.gold}>
      <View style={styles.header}>
        <Gift color={theme.colors.gold} size={22} />
        <View style={styles.info}>
          <Text variant="title" numberOfLines={1}>
            {reward.name}
          </Text>
          {reward.description ? <Text variant="bodyMuted">{reward.description}</Text> : null}
          <View style={styles.metaRow}>
            {reward.has_stock && (
              <Text variant="bodyMuted">
                Estoque: {reward.current_stock ?? 0}/{reward.max_stock ?? 0}
              </Text>
            )}
            {reward.cooldown_minutes ? (
              <View style={[styles.cooldownPill, inCooldown && styles.cooldownPillActive]}>
                <Clock color={inCooldown ? theme.colors.primary : theme.colors.textMuted} size={14} />
                <Text variant="bodyMuted" color={inCooldown ? theme.colors.primary : theme.colors.textMuted}>
                  {inCooldown ? formatCountdown(remainingMs) : `${reward.cooldown_minutes}min`}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <Pressable
          onPress={() => router.push({ pathname: '/(app)/rewards/[id]', params: { id: reward.id } })}
          hitSlop={10}
          accessibilityLabel="Editar recompensa"
          style={styles.edit}
        >
          <Pencil color={theme.colors.textMuted} size={18} />
        </Pressable>
      </View>
      <Pressable
        onPress={() => onBuy(reward)}
        disabled={!canAfford}
        style={[styles.buy, !canAfford && styles.disabled]}
        accessibilityRole="button"
      >
        <Coins color={theme.colors.gold} size={16} />
        <Text variant="bodyMedium" color={canAfford ? theme.colors.text : theme.colors.textMuted}>
          {outOfStock ? 'Esgotado' : inCooldown ? `Disponível em ${formatCountdown(remainingMs)}` : reward.cost}
        </Text>
      </Pressable>
    </Card>
  );
}

function getCooldownUntil(reward: Reward) {
  if (!reward.cooldown_minutes || !reward.last_purchased_at) return null;
  return new Date(reward.last_purchased_at).getTime() + reward.cooldown_minutes * 60_000;
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' },
  info: { flex: 1, gap: 2 },
  metaRow: { flexDirection: 'row', gap: theme.spacing.md, flexWrap: 'wrap', marginTop: 2 },
  cooldownPill: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  cooldownPillActive: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primaryDim,
    paddingHorizontal: theme.spacing.sm,
  },
  edit: { padding: 4 },
  buy: {
    marginTop: theme.spacing.md,
    alignSelf: 'flex-end',
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
