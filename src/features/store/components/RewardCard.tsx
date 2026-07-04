import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { CheckCircle2, Clock, Coins, Gift, LockKeyhole, Pencil, Sparkles } from 'lucide-react-native';
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
  const requirements = reward.requirements;
  const requirementsPassed = requirements?.passed ?? true;
  const requirementItems = requirements?.groups?.flatMap((group) => group.requirements ?? []) ?? [];
  const canBuy = hasCurrency && requirementsPassed && !outOfStock && !inCooldown && !alreadyPurchased;

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
          {requirementItems.length > 0 ? (
            <View style={styles.requirementsBox}>
              <View style={styles.requirementsHead}>
                {requirementsPassed ? (
                  <CheckCircle2 color={theme.colors.success} size={15} />
                ) : (
                  <LockKeyhole color={theme.colors.gold} size={15} />
                )}
                <Text variant="label" color={requirementsPassed ? theme.colors.success : theme.colors.gold}>
                  {requirementsPassed ? 'Requisitos cumpridos' : 'Requisitos para liberar'}
                </Text>
              </View>
              {requirementItems.slice(0, 3).map((requirement) => (
                <View key={requirement.id} style={styles.requirementRow}>
                  <Text variant="bodyMuted" style={styles.requirementName}>
                    {rewardRequirementLabel(requirement.metric)}
                  </Text>
                  <Text variant="label" color={requirement.passed ? theme.colors.success : theme.colors.textMuted}>
                    {requirement.currentValue}/{requirement.targetValue}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
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
            requirementsPassed,
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
  requirementsPassed,
}: {
  alreadyPurchased: boolean;
  hasCurrency: boolean;
  inCooldown: boolean;
  outOfStock: boolean;
  remainingMs: number;
  cost: number;
  requirementsPassed: boolean;
}) {
  if (outOfStock) return 'Esgotado';
  if (alreadyPurchased) return 'Já resgatado';
  if (inCooldown) return `Disponível em ${formatCountdown(remainingMs)}`;
  if (!requirementsPassed) return 'Requisitos pendentes';
  if (!hasCurrency) return `Precisa de ${cost}`;
  return cost;
}

function rewardRequirementLabel(metric: string) {
  const labels: Record<string, string> = {
    habit_success_days: 'Dias de hábito',
    habit_executions: 'Execuções de hábito',
    habit_clean_days: 'Dias limpos',
    habit_failed_days: 'Dias com falha',
    workout_sessions: 'Treinos',
    body_measurement_count: 'Medidas corporais',
    xp_gained: 'XP ganho',
    gold_gained: 'Ouro ganho',
  };
  return labels[metric] ?? metric;
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
  requirementsBox: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    padding: theme.spacing.sm,
  },
  requirementsHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  requirementName: { flex: 1 },
  cooldownPill: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  cooldownPillActive: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryDim,
    paddingHorizontal: theme.spacing.sm,
  },
  edit: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
