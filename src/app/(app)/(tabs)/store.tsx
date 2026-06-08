import { useRouter } from 'expo-router';
import { Coins, Gift, Plus, Sparkles, Swords } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconSegmented } from '@/components/ui/IconSegmented';
import { Text } from '@/components/ui/Text';
import { useEquipmentCatalog, usePurchaseEquipment, usePurchaseEquipmentEssencia } from '@/features/build/hooks/useEquipment';
import { useCharacter } from '@/features/character/hooks/useCharacter';
import { useHabits } from '@/features/habits/hooks/useHabits';
import { EquipmentCatalogCard } from '@/features/store/components/EquipmentCatalogCard';
import { RewardCard } from '@/features/store/components/RewardCard';
import { SystemItemCard } from '@/features/store/components/SystemItemCard';
import { usePurchaseReward, usePurchaseSystemItem } from '@/features/store/hooks/usePurchases';
import { useRewards, useSystemItems, type Reward, type SystemItem } from '@/features/store/hooks/useStore';
import { scheduleRewardCooldownNotification } from '@/features/store/notifications';
import { theme } from '@/theme/theme';
import type { EquipmentCatalogItem } from '@/types/build';

type StoreMode = 'magic' | 'equipment' | 'rewards';

export default function StoreScreen() {
  const router = useRouter();
  const character = useCharacter();
  const items = useSystemItems();
  const rewards = useRewards();
  const habits = useHabits();
  const equipment = useEquipmentCatalog();
  const buyItem = usePurchaseSystemItem();
  const buyReward = usePurchaseReward();
  const buyEquipment = usePurchaseEquipment();
  const buyEquipmentEssencia = usePurchaseEquipmentEssencia();

  const gold = character.data?.gold ?? 0;
  const essencia = character.data?.essencia ?? 0;
  const level = character.data?.level ?? 1;
  const [streakItem, setStreakItem] = useState<SystemItem | null>(null);
  const [mode, setMode] = useState<StoreMode>('magic');

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

  function handleBuyEquipment(item: EquipmentCatalogItem) {
    Alert.alert('Comprar?', `Gastar ${item.cost_gold} de ouro em "${item.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Comprar',
        onPress: () =>
          buyEquipment.mutate(
            { catalogId: item.id },
            {
              onSuccess: () => Alert.alert('Comprado!', 'Item adicionado ao inventário.'),
              onError: (e) => Alert.alert('Ops', e instanceof Error ? e.message : 'Erro'),
            },
          ),
      },
    ]);
  }

  function handleBuyEquipmentEssencia(item: EquipmentCatalogItem) {
    Alert.alert('Comprar?', `Gastar ${item.cost_essencia} de Essência em "${item.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Comprar',
        onPress: () =>
          buyEquipmentEssencia.mutate(
            { catalogId: item.id },
            {
              onSuccess: () => Alert.alert('Comprado!', 'Item adicionado ao inventário.'),
              onError: (e) => Alert.alert('Ops', e instanceof Error ? e.message : 'Erro'),
            },
          ),
      },
    ]);
  }

  function handleBuyReward(reward: Reward) {
    const essenciaCost = reward.cost_essencia ?? null;
    const priceLabel = essenciaCost == null ? `${reward.cost} de ouro` : `${essenciaCost} de Essência`;
    Alert.alert('Resgatar?', `Gastar ${priceLabel} em "${reward.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Resgatar',
        onPress: () =>
          buyReward.mutate(
            { rewardId: reward.id },
            {
              onSuccess: () => {
                void scheduleRewardCooldownNotification(reward);
                Alert.alert('Resgatado!', 'Aproveite!');
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
        <View style={styles.wallet}>
          <View style={styles.currencyPill}>
            <Coins color={theme.colors.gold} size={18} />
            <Text variant="bodyMedium" color={theme.colors.gold}>
              {gold}
            </Text>
          </View>
          <View style={styles.currencyPill}>
            <Sparkles color={theme.colors.essencia} size={18} />
            <Text variant="bodyMedium" color={theme.colors.essencia}>
              {essencia}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <IconSegmented<StoreMode>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'magic', label: 'Mágicos', icon: Sparkles, color: theme.colors.skill },
            { value: 'equipment', label: 'Equip.', icon: Swords, color: theme.colors.primary },
            { value: 'rewards', label: 'Recomp.', icon: Gift, color: theme.colors.gold },
          ]}
        />

        {mode === 'magic' ? (
          <>
            <Text variant="h2">Itens Mágicos</Text>
            {(items.data ?? []).map((item) => (
              <SystemItemCard key={item.id} item={item} gold={gold} onBuy={handleBuyItem} />
            ))}
          </>
        ) : null}

        {mode === 'equipment' ? (
          <>
            <Text variant="h2">Equipamentos</Text>
            {(equipment.data ?? []).length === 0 ? (
              <Text variant="bodyMuted">Nenhum equipamento à venda no momento.</Text>
            ) : (
              (equipment.data ?? []).map((item) => (
                <EquipmentCatalogCard
                  key={item.id}
                  item={item}
                  gold={gold}
                  essencia={essencia}
                  level={level}
                  onBuyGold={handleBuyEquipment}
                  onBuyEssencia={handleBuyEquipmentEssencia}
                />
              ))
            )}
          </>
        ) : null}

        {mode === 'rewards' ? (
          <>
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
              <Text variant="bodyMuted">Crie recompensas para você e gaste seu ouro nelas.</Text>
            ) : (
              (rewards.data ?? []).map((reward) => (
                <RewardCard key={reward.id} reward={reward} gold={gold} essencia={essencia} onBuy={handleBuyReward} />
              ))
            )}
          </>
        ) : null}
      </ScrollView>

      <Modal visible={!!streakItem} transparent animationType="fade" onRequestClose={() => setStreakItem(null)}>
        <View style={styles.backdrop}>
          <Card style={styles.pickerCard}>
            <Text variant="h2">Restaurar streak de qual hábito?</Text>
            <ScrollView style={styles.pickerList} contentContainerStyle={styles.pickerContent}>
              {(habits.data ?? []).map((h) => (
                <Pressable
                  key={h.id}
                  onPress={() => buyStreakFor(h.id)}
                  style={[styles.pickerRow, buyItem.isPending && styles.rowDisabled]}
                  disabled={buyItem.isPending}
                >
                  <Text variant="bodyMedium">{h.name}</Text>
                  <Text variant="bodyMuted">streak {h.current_streak} · melhor {h.best_streak}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {buyItem.isPending ? <ActivityIndicator color={theme.colors.primary} /> : null}
            <Button label="Cancelar" variant="outline" onPress={() => setStreakItem(null)} fullWidth disabled={buyItem.isPending} />
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
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  currencyPill: {
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
  rowDisabled: { opacity: 0.6 },
});
