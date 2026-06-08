import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Clock, Coins, Gift, Pencil, Sparkles } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { qk } from '@/lib/queryKeys';
import { theme } from '@/theme/theme';
import type { Reward } from '../hooks/useStore';

export function RewardCard({
  reward,
  gold,
  essencia,
  onBuy,
}: {
  reward: Reward;
  gold: number;
  essencia: number;
  onBuy: (reward: Reward) => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [now, setNow] = useState<number | null>(null);
  const cooldownUntil = useMemo(() => getCooldownUntil(reward), [reward]);
  const remainingMs = cooldownUntil ? Math.max(0, cooldownUntil - (now ?? cooldownUntil - (reward.cooldown_minutes ?? 0) * 60_000)) : 0;
  const inCooldown = !!cooldownUntil && (!now || remainingMs > 0);
  const effectiveStock = getEffectiveStock(reward, inCooldown);
  const outOfStock = reward.has_stock && effectiveStock <= 0;
  const alreadyPurchased = !reward.is_repurchasable && !!reward.last_purchased_at;
  const essenciaCost = reward.cost_essencia ?? null;
  const usesEssencia = essenciaCost != null;
  const hasCurrency = usesEssencia ? essencia >= essenciaCost : gold >= reward.cost;
  const canBuy = hasCurrency && !outOfStock && !inCooldown && !alreadyPurchased;

  useEffect(() => {
    if (!cooldownUntil) return;
    const tick = () => setNow(new Date().getTime());
    tick();
    const timer = setInterval(tick, 1000);
    const restockTimer = setTimeout(() => {
      tick();
      qc.setQueryData<Reward[]>(qk.rewards, (current) => current?.map((item) => {
        if (item.id !== reward.id || !item.has_stock || (item.current_stock ?? 0) > 0) return item;
        return { ...item, current_stock: item.max_stock ?? item.current_stock };
      }));
      void qc.invalidateQueries({ queryKey: qk.rewards });
    }, Math.max(0, cooldownUntil - new Date().getTime()) + 250);
    return () => {
      clearInterval(timer);
      clearTimeout(restockTimer);
    };
  }, [cooldownUntil, qc, reward.id]);

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
                Estoque: {effectiveStock}/{reward.max_stock ?? 0}
              </Text>
            )}
            {reward.cooldown_minutes ? (
              <View style={[styles.cooldownPill, inCooldown && styles.cooldownPillActive]}>
                <Clock color={inCooldown ? theme.colors.primary : theme.colors.textMuted} size={14} />
                <Text variant="bodyMuted" color={inCooldown ? theme.colors.primary : theme.colors.textMuted}>
                  {inCooldown ? `Volta em ${formatCountdown(remainingMs)}` : `Cooldown após uso: ${reward.cooldown_minutes}min`}
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
        disabled={!canBuy}
        style={[styles.buy, !canBuy && styles.disabled]}
        accessibilityRole="button"
      >
        {usesEssencia ? (
          <Sparkles color={theme.colors.essencia} size={16} />
        ) : (
          <Coins color={theme.colors.gold} size={16} />
        )}
        <Text variant="bodyMedium" color={canBuy ? theme.colors.text : theme.colors.textMuted}>
          {buyLabel({
            alreadyPurchased,
            hasCurrency,
            inCooldown,
            outOfStock,
            remainingMs,
            cost: usesEssencia ? essenciaCost : reward.cost,
          })}
        </Text>
      </Pressable>
    </Card>
  );
}

function getCooldownUntil(reward: Reward) {
  if (!reward.cooldown_minutes || !reward.last_purchased_at) return null;
  return new Date(reward.last_purchased_at).getTime() + reward.cooldown_minutes * 60_000;
}

function getEffectiveStock(reward: Reward, inCooldown: boolean) {
  if (!reward.has_stock) return Number.POSITIVE_INFINITY;
  const current = reward.current_stock ?? 0;
  if (current > 0) return current;
  if (reward.cooldown_minutes && reward.last_purchased_at && !inCooldown) {
    return reward.max_stock ?? 0;
  }
  return current;
}

function buyLabel({
  alreadyPurchased,
  hasCurrency,
  inCooldown,
  outOfStock,
  remainingMs,
  cost,
}: {
  alreadyPurchased: boolean;
  hasCurrency: boolean;
  inCooldown: boolean;
  outOfStock: boolean;
  remainingMs: number;
  cost: number;
}) {
  if (outOfStock) return 'Esgotado';
  if (alreadyPurchased) return 'Já resgatado';
  if (inCooldown) return `Disponível em ${formatCountdown(remainingMs)}`;
  if (!hasCurrency) return `Precisa de ${cost}`;
  return cost;
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
