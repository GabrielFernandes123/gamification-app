import { useRouter } from 'expo-router';
import { Coins, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useCharacter } from '@/features/character/hooks/useCharacter';
import { useHabits } from '@/features/habits/hooks/useHabits';
import { RewardCard } from '@/features/store/components/RewardCard';
import { SystemItemCard } from '@/features/store/components/SystemItemCard';
import { usePurchaseReward, usePurchaseSystemItem } from '@/features/store/hooks/usePurchases';
import { useRewards, useSystemItems, type Reward, type SystemItem } from '@/features/store/hooks/useStore';
import { scheduleRewardCooldownNotification } from '@/features/store/notifications';
import { theme } from '@/theme/theme';

export default function StoreScreen() {
  const router = useRouter();
  const character = useCharacter();
  const items = useSystemItems();
  const rewards = useRewards();
  const habits = useHabits();
  const buyItem = usePurchaseSystemItem();
  const buyReward = usePurchaseReward();

  const gold = character.data?.gold ?? 0;
  const [streakItem, setStreakItem] = useState<SystemItem | null>(null);

  function handleBuyItem(item: SystemItem) {
    if (item.type === 'streak_recovery') {
      setStreakItem(item);
      return;
    }
    buyItem.mutate(
      { itemId: item.id },
      {
        onSuccess: (res) => Alert.alert('Comprado!', res.message),
        onError: (e) => Alert.alert('Ops', e instanceof Error ? e.message : 'Erro'),
      },
    );
  }

  function buyStreakFor(habitId: string) {
    if (!streakItem) return;
    buyItem.mutate(
      { itemId: streakItem.id, habitId },
      {
        onSuccess: (res) => {
          setStreakItem(null);
          Alert.alert('Comprado!', res.message);
        },
        onError: (e) => {
          setStreakItem(null);
          Alert.alert('Ops', e instanceof Error ? e.message : 'Erro');
        },
      },
    );
  }

  function handleBuyReward(reward: Reward) {
    Alert.alert('Resgatar?', `Gastar ${reward.cost} de ouro em "${reward.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Resgatar',
        onPress: () =>
          buyReward.mutate(
            { rewardId: reward.id },
            {
              onSuccess: () => {
                void scheduleRewardCooldownNotification(reward);
                Alert.alert('Resgatado!', 'Aproveite 🎉');
              },
              onError: (e) => Alert.alert('Ops', e instanceof Error ? e.message : 'Erro'),
            },
          ),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text variant="h1">Loja</Text>
        <View style={styles.goldPill}>
          <Coins color={theme.colors.gold} size={18} />
          <Text variant="bodyMedium" color={theme.colors.gold}>
            {gold}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="h2">Itens Mágicos</Text>
        {(items.data ?? []).map((item) => (
          <SystemItemCard key={item.id} item={item} gold={gold} onBuy={handleBuyItem} />
        ))}

        <View style={styles.sectionHeader}>
          <Text variant="h2">Recompensas Pessoais</Text>
          <Pressable
            onPress={() => router.push('/(app)/rewards/new')}
            style={styles.addBtn}
            accessibilityLabel="Nova recompensa"
          >
            <Plus color={theme.colors.textInverse} size={20} />
          </Pressable>
        </View>
        {(rewards.data ?? []).length === 0 ? (
          <Text variant="bodyMuted">
            Crie recompensas pra você (ex.: assistir um filme) e gaste seu ouro nelas.
          </Text>
        ) : (
          (rewards.data ?? []).map((reward) => (
            <RewardCard key={reward.id} reward={reward} gold={gold} onBuy={handleBuyReward} />
          ))
        )}
      </ScrollView>

      {/* Seletor de hábito para o Amuleto de Streak */}
      <Modal visible={!!streakItem} transparent animationType="fade" onRequestClose={() => setStreakItem(null)}>
        <View style={styles.backdrop}>
          <Card style={styles.pickerCard}>
            <Text variant="h2">Restaurar streak de qual hábito?</Text>
            <ScrollView style={styles.pickerList} contentContainerStyle={styles.pickerContent}>
              {(habits.data ?? []).map((h) => (
                <Pressable key={h.id} onPress={() => buyStreakFor(h.id)} style={styles.pickerRow}>
                  <Text variant="bodyMedium">{h.name}</Text>
                  <Text variant="bodyMuted">streak {h.current_streak} · melhor {h.best_streak}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Button label="Cancelar" variant="outline" onPress={() => setStreakItem(null)} fullWidth />
          </Card>
        </View>
      </Modal>
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
  goldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  content: { padding: theme.spacing.lg, paddingTop: theme.spacing.sm, gap: theme.spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: theme.spacing.lg },
  pickerCard: { gap: theme.spacing.md },
  pickerList: { maxHeight: 320 },
  pickerContent: { gap: theme.spacing.sm },
  pickerRow: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: 2,
  },
});
