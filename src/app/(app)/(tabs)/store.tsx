import { useRouter } from 'expo-router';
import { Backpack, Box, Clock3, Coins, Gift, Package, Pencil, Plus, Sparkles, Swords, Trash2, Wand2 } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconSegmented } from '@/components/ui/IconSegmented';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { useEquipmentCatalog, usePurchaseEquipment, usePurchaseEquipmentEssencia } from '@/features/build/hooks/useEquipment';
import { useCharacter } from '@/features/character/hooks/useCharacter';
import { useHabits } from '@/features/habits/hooks/useHabits';
import { EquipmentCatalogCard } from '@/features/store/components/EquipmentCatalogCard';
import { RewardCard } from '@/features/store/components/RewardCard';
import { SystemItemCard } from '@/features/store/components/SystemItemCard';
import {
  useCreateUserItem,
  useDeleteUserItem,
  useGrantUserItem,
  usePurchaseReward,
  usePurchaseSystemItem,
  usePurchaseSystemItemToInventory,
  useUpdateUserItem,
  useUseInventoryItem,
} from '@/features/store/hooks/usePurchases';
import {
  useInventory,
  useInventoryTransactions,
  useRewards,
  useSystemItems,
  useUserItems,
  type InventoryTransaction,
  type InventoryItem,
  type Reward,
  type SystemItem,
  type UserItem,
} from '@/features/store/hooks/useStore';
import { scheduleRewardCooldownNotification } from '@/features/store/notifications';
import { theme } from '@/theme/theme';
import type { EquipmentCatalogItem } from '@/types/build';

type StoreMode = 'inventory' | 'history' | 'magic' | 'equipment' | 'rewards' | 'custom';
type StreakTarget = { source: 'shop'; item: SystemItem } | { source: 'inventory'; item: InventoryItem };

export default function StoreScreen() {
  const router = useRouter();
  const character = useCharacter();
  const items = useSystemItems();
  const rewards = useRewards();
  const habits = useHabits();
  const equipment = useEquipmentCatalog();
  const inventory = useInventory();
  const transactions = useInventoryTransactions();
  const userItems = useUserItems();
  const buyItem = usePurchaseSystemItem();
  const buyItemToInventory = usePurchaseSystemItemToInventory();
  const useInventoryItem = useUseInventoryItem();
  const buyReward = usePurchaseReward();
  const buyEquipment = usePurchaseEquipment();
  const buyEquipmentEssencia = usePurchaseEquipmentEssencia();
  const createUserItem = useCreateUserItem();
  const updateUserItem = useUpdateUserItem();
  const deleteUserItem = useDeleteUserItem();
  const grantUserItem = useGrantUserItem();

  const gold = character.data?.gold ?? 0;
  const essencia = character.data?.essencia ?? 0;
  const level = character.data?.level ?? 1;
  const [streakTarget, setStreakTarget] = useState<StreakTarget | null>(null);
  const [mode, setMode] = useState<StoreMode>('inventory');
  const [customModal, setCustomModal] = useState(false);
  const [editingItem, setEditingItem] = useState<UserItem | null>(null);
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [customIcon, setCustomIcon] = useState('');
  const [customConsumable, setCustomConsumable] = useState(true);

  const inventoryCount = (inventory.data ?? []).reduce((sum, item) => sum + item.quantity, 0);
  const streakPending = buyItem.isPending || useInventoryItem.isPending;

  function handleBuyItem(item: SystemItem) {
    Alert.alert('Item mágico', `O que deseja fazer com "${item.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Guardar',
        onPress: () =>
          buyItemToInventory.mutate(
            { itemId: item.id },
            {
              onSuccess: (res) => Alert.alert('Guardado!', res.message),
              onError: (e) => Alert.alert('Ops', e instanceof Error ? e.message : 'Erro'),
            },
          ),
      },
      {
        text: 'Usar agora',
        onPress: () => {
          if (item.type === 'streak_recovery') {
            setStreakTarget({ source: 'shop', item });
            return;
          }
          buyItem.mutate(
            { itemId: item.id },
            {
              onSuccess: (res) => Alert.alert('Comprado!', res.message),
              onError: (e) => Alert.alert('Ops', e instanceof Error ? e.message : 'Erro'),
            },
          );
        },
      },
    ]);
  }

  function handleUseInventoryItem(item: InventoryItem) {
    if (!item.isConsumable) return;
    if (item.type === 'streak_recovery') {
      setStreakTarget({ source: 'inventory', item });
      return;
    }
    useInventoryItem.mutate(
      { item },
      {
        onSuccess: (res) => Alert.alert('Item usado', res.message),
        onError: (e) => Alert.alert('Ops', e instanceof Error ? e.message : 'Erro'),
      },
    );
  }

  function useStreakFor(habitId: string) {
    if (!streakTarget) return;
    if (streakTarget.source === 'shop') {
      buyItem.mutate(
        { itemId: streakTarget.item.id, habitId },
        {
          onSuccess: (res) => {
            setStreakTarget(null);
            Alert.alert('Comprado!', res.message);
          },
          onError: (e) => {
            setStreakTarget(null);
            Alert.alert('Ops', e instanceof Error ? e.message : 'Erro');
          },
        },
      );
      return;
    }
    useInventoryItem.mutate(
      { item: streakTarget.item, habitId },
      {
        onSuccess: (res) => {
          setStreakTarget(null);
          Alert.alert('Item usado', res.message);
        },
        onError: (e) => {
          setStreakTarget(null);
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

  function openCreateCustomItem() {
    setEditingItem(null);
    setCustomName('');
    setCustomDescription('');
    setCustomCategory('');
    setCustomIcon('');
    setCustomConsumable(true);
    setCustomModal(true);
  }

  function openEditCustomItem(item: UserItem) {
    setEditingItem(item);
    setCustomName(item.name);
    setCustomDescription(item.description ?? '');
    setCustomCategory(item.category ?? '');
    setCustomIcon(item.icon ?? '');
    setCustomConsumable(item.isConsumable);
    setCustomModal(true);
  }

  function handleSaveCustomItem() {
    const name = customName.trim();
    if (!name) {
      Alert.alert('Informe o nome', 'O item precisa ter um nome.');
      return;
    }
    const payload = {
      name,
      description: customDescription.trim() || null,
      category: customCategory.trim() || null,
      icon: customIcon.trim() || null,
      rarity: 'custom',
      is_consumable: customConsumable,
    };
    if (editingItem) {
      updateUserItem.mutate(
        { itemId: editingItem.id, payload },
        {
          onSuccess: () => {
            setEditingItem(null);
            setCustomModal(false);
            Alert.alert('Item atualizado', 'Sua bolsa foi atualizada.');
          },
          onError: (e) => Alert.alert('Ops', e instanceof Error ? e.message : 'Erro'),
        },
      );
      return;
    }
    createUserItem.mutate(
      payload,
      {
        onSuccess: () => {
          setCustomName('');
          setCustomDescription('');
          setCustomCategory('');
          setCustomIcon('');
          setCustomConsumable(true);
          setEditingItem(null);
          setCustomModal(false);
          Alert.alert('Item criado', 'Agora você pode adicionar unidades à bolsa.');
        },
        onError: (e) => Alert.alert('Ops', e instanceof Error ? e.message : 'Erro'),
      },
    );
  }

  function handleGrantUserItem(item: UserItem) {
    grantUserItem.mutate(
      { itemId: item.id, quantity: 1 },
      {
        onSuccess: () => Alert.alert('Adicionado', `${item.name} entrou na sua bolsa.`),
        onError: (e) => Alert.alert('Ops', e instanceof Error ? e.message : 'Erro'),
      },
    );
  }

  function handleDeleteUserItem(item: UserItem) {
    Alert.alert('Remover item?', `Remover "${item.name}" da sua lista de itens próprios?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () =>
          deleteUserItem.mutate(item.id, {
            onSuccess: () => Alert.alert('Removido', 'O item foi desativado.'),
            onError: (e) => Alert.alert('Ops', e instanceof Error ? e.message : 'Erro'),
          }),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text variant="h1">Bolsa</Text>
          <Text variant="bodyMuted">{inventoryCount} item(ns) guardado(s)</Text>
        </View>
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
            { value: 'inventory', label: 'Bolsa', icon: Backpack, color: theme.colors.primary },
            { value: 'magic', label: 'Loja', icon: Wand2, color: theme.colors.skill },
            { value: 'rewards', label: 'Recomp.', icon: Gift, color: theme.colors.gold },
            { value: 'custom', label: 'Criar', icon: Box, color: theme.colors.success },
            { value: 'equipment', label: 'Equip.', icon: Swords, color: theme.colors.primary },
            { value: 'history', label: 'Hist.', icon: Clock3, color: theme.colors.gold },
          ]}
        />

        {mode === 'inventory' ? (
          <Section title="Inventário" hint="Itens prontos para usar">
            {inventory.isLoading ? <ActivityIndicator color={theme.colors.primary} /> : null}
            {(inventory.data ?? []).length === 0 ? (
              <EmptyState title="Bolsa vazia" description="Compre itens, conclua metas ou adicione itens próprios." />
            ) : (
              (inventory.data ?? []).map((item) => (
                <InventoryCard
                  key={`${item.itemKind}-${item.itemId}`}
                  item={item}
                  onUse={handleUseInventoryItem}
                  loading={useInventoryItem.isPending}
                />
              ))
            )}
          </Section>
        ) : null}

        {mode === 'history' ? (
          <Section title="Histórico" hint="Entradas e saídas da bolsa">
            {transactions.isLoading ? <ActivityIndicator color={theme.colors.primary} /> : null}
            {(transactions.data ?? []).length === 0 ? (
              <EmptyState title="Sem movimentações" description="Itens usados, comprados e recebidos aparecerão aqui." />
            ) : (
              (transactions.data ?? []).map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))
            )}
          </Section>
        ) : null}

        {mode === 'magic' ? (
          <Section title="Itens mágicos" hint="Use agora ou guarde na bolsa">
            {(items.data ?? []).map((item) => (
              <SystemItemCard key={item.id} item={item} gold={gold} onBuy={handleBuyItem} />
            ))}
          </Section>
        ) : null}

        {mode === 'equipment' ? (
          <Section title="Equipamentos" hint={`Nível ${level}`}>
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
          </Section>
        ) : null}

        {mode === 'rewards' ? (
          <Section
            title="Recompensas pessoais"
            hint="Trocas fora do app"
            action={
              <Pressable
                onPress={() => router.push('/(app)/rewards/new')}
                style={styles.addBtn}
                accessibilityLabel="Nova recompensa"
              >
                <Plus color={theme.colors.textInverse} size={20} />
              </Pressable>
            }
          >
            {(rewards.data ?? []).length === 0 ? (
              <Text variant="bodyMuted">Crie recompensas para você e gaste seu ouro nelas.</Text>
            ) : (
              (rewards.data ?? []).map((reward) => (
                <RewardCard key={reward.id} reward={reward} gold={gold} essencia={essencia} onBuy={handleBuyReward} />
              ))
            )}
          </Section>
        ) : null}

        {mode === 'custom' ? (
          <Section
            title="Itens personalizados"
            hint="Crie itens manuais para adicionar na Bolsa"
            action={
              <Pressable onPress={openCreateCustomItem} style={styles.addBtn} accessibilityLabel="Novo item">
                <Plus color={theme.colors.textInverse} size={20} />
              </Pressable>
            }
          >
            {(userItems.data ?? []).length === 0 ? (
              <EmptyState title="Nenhum item personalizado" description="Crie pocoes, tickets ou objetos pessoais e adicione unidades na Bolsa quando quiser." />
            ) : (
              (userItems.data ?? []).map((item) => (
                <UserItemCard
                  key={item.id}
                  item={item}
                  onGrant={handleGrantUserItem}
                  onEdit={openEditCustomItem}
                  onDelete={handleDeleteUserItem}
                  loading={grantUserItem.isPending}
                />
              ))
            )}
          </Section>
        ) : null}
      </ScrollView>

      <Modal visible={!!streakTarget} transparent animationType="fade" onRequestClose={() => setStreakTarget(null)}>
        <View style={styles.backdrop}>
          <Card style={styles.pickerCard}>
            <Text variant="h2">Restaurar sequência de qual hábito?</Text>
            <ScrollView style={styles.pickerList} contentContainerStyle={styles.pickerContent}>
              {(habits.data ?? []).map((h) => (
                <Pressable
                  key={h.id}
                  onPress={() => useStreakFor(h.id)}
                  style={[styles.pickerRow, streakPending && styles.rowDisabled]}
                  disabled={streakPending}
                >
                  <Text variant="bodyMedium">{h.name}</Text>
                  <Text variant="bodyMuted">
                    sequência {h.current_streak} · melhor {h.best_streak}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {streakPending ? <ActivityIndicator color={theme.colors.primary} /> : null}
            <Button label="Cancelar" variant="outline" onPress={() => setStreakTarget(null)} fullWidth disabled={streakPending} />
          </Card>
        </View>
      </Modal>

      <Modal visible={customModal} transparent animationType="slide" onRequestClose={() => setCustomModal(false)}>
        <View style={styles.backdrop}>
          <Card style={styles.customCard}>
            <Text variant="h2">{editingItem ? 'Editar item personalizado' : 'Novo item personalizado'}</Text>
            <Input label="Nome" value={customName} onChangeText={setCustomName} placeholder="Ex.: Poção de foco" />
            <Input
              label="Descrição"
              value={customDescription}
              onChangeText={setCustomDescription}
              placeholder="Quando e por que usar"
              multiline
            />
            <View style={styles.formRow}>
              <View style={styles.formFlex}>
                <Input label="Categoria" value={customCategory} onChangeText={setCustomCategory} placeholder="poção, ticket..." />
              </View>
              <View style={styles.formFlex}>
                <Input label="Ícone" value={customIcon} onChangeText={setCustomIcon} placeholder="emoji ou código" />
              </View>
            </View>
            <View style={styles.switchRow}>
              <View style={styles.flex}>
                <Text variant="bodyMedium">Consumível</Text>
                <Text variant="bodyMuted">Ao usar, uma unidade sai da bolsa.</Text>
              </View>
              <Switch value={customConsumable} onValueChange={setCustomConsumable} />
            </View>
            <View style={styles.modalActions}>
              <Button label="Cancelar" variant="outline" onPress={() => setCustomModal(false)} disabled={createUserItem.isPending || updateUserItem.isPending} />
              <Button label={editingItem ? 'Salvar' : 'Criar'} onPress={handleSaveCustomItem} loading={createUserItem.isPending || updateUserItem.isPending} />
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.flex}>
          <Text variant="h2">{title}</Text>
          {hint ? <Text variant="bodyMuted">{hint}</Text> : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card style={styles.emptyCard}>
      <Package color={theme.colors.textMuted} size={26} />
      <Text variant="title">{title}</Text>
      <Text variant="bodyMuted">{description}</Text>
    </Card>
  );
}

function InventoryCard({
  item,
  onUse,
  loading,
}: {
  item: InventoryItem;
  onUse: (item: InventoryItem) => void;
  loading: boolean;
}) {
  const accent = item.itemKind === 'custom' ? theme.colors.success : theme.colors.primary;
  return (
    <Card accent={accent} style={styles.itemCard}>
      <View style={styles.itemTop}>
        <View style={[styles.itemIcon, { borderColor: accent }]}>
          <Text variant="title">{item.icon || (item.itemKind === 'custom' ? '◆' : '✦')}</Text>
        </View>
        <View style={styles.flex}>
          <Text variant="title" numberOfLines={1}>
            {item.name}
          </Text>
          {item.description ? <Text variant="bodyMuted">{item.description}</Text> : null}
        </View>
        <View style={styles.qtyPill}>
          <Text variant="label">x{item.quantity}</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <Text variant="label" color={accent}>
          {item.itemKind === 'custom' ? 'Próprio' : 'Sistema'}
        </Text>
        {item.category ? <Text variant="bodyMuted">{item.category}</Text> : null}
        {item.rarity ? <Text variant="bodyMuted">{item.rarity}</Text> : null}
      </View>
      <Button
        label={item.isConsumable ? 'Usar' : 'Guardado'}
        size="sm"
        variant={item.isConsumable ? 'primary' : 'outline'}
        disabled={!item.isConsumable || loading}
        loading={loading}
        onPress={() => onUse(item)}
      />
    </Card>
  );
}

function UserItemCard({
  item,
  onGrant,
  onEdit,
  onDelete,
  loading,
}: {
  item: UserItem;
  onGrant: (item: UserItem) => void;
  onEdit: (item: UserItem) => void;
  onDelete: (item: UserItem) => void;
  loading: boolean;
}) {
  return (
    <Card accent={theme.colors.success} style={styles.itemCard}>
      <View style={styles.cardActions}>
        <Pressable style={styles.iconAction} onPress={() => onEdit(item)} accessibilityLabel="Editar item">
          <Pencil color={theme.colors.text} size={18} />
        </Pressable>
        <Pressable style={styles.iconAction} onPress={() => onDelete(item)} accessibilityLabel="Remover item">
          <Trash2 color={theme.colors.hp} size={18} />
        </Pressable>
      </View>
      <View style={styles.itemTop}>
        <View style={[styles.itemIcon, { borderColor: theme.colors.success }]}>
          <Text variant="title">{item.icon || '◆'}</Text>
        </View>
        <View style={styles.flex}>
          <Text variant="title" numberOfLines={1}>
            {item.name}
          </Text>
          {item.description ? <Text variant="bodyMuted">{item.description}</Text> : null}
          <Text variant="bodyMuted">{item.isConsumable ? 'Consumível' : 'Colecionável'}</Text>
        </View>
      </View>
      <Button label="Adicionar à bolsa" size="sm" onPress={() => onGrant(item)} loading={loading} />
    </Card>
  );
}

function TransactionRow({ transaction }: { transaction: InventoryTransaction }) {
  const positive = transaction.quantityDelta > 0;
  const color = positive ? theme.colors.success : theme.colors.hp;
  return (
    <Card style={styles.transactionCard}>
      <View style={styles.itemTop}>
        <View style={[styles.itemIcon, { borderColor: color }]}>
          <Text variant="title" color={color}>
            {positive ? '+' : '-'}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text variant="title" numberOfLines={1}>
            {transaction.name}
          </Text>
          <Text variant="bodyMuted">
            {reasonLabel(transaction.reason)} · {formatDateTime(transaction.createdAt)}
          </Text>
        </View>
        <Text variant="bodyMedium" color={color}>
          {positive ? '+' : ''}
          {transaction.quantityDelta}
        </Text>
      </View>
    </Card>
  );
}

function reasonLabel(reason: string) {
  const labels: Record<string, string> = {
    use_inventory_item: 'Uso',
    purchase_system_item: 'Compra',
    objective_claim: 'Missão',
    manual_user_item_grant: 'Manual',
    weekly_contract_stake: 'Contrato',
  };
  return labels[reason] ?? reason;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.md,
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
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  content: { padding: theme.spacing.lg, paddingTop: theme.spacing.sm, paddingBottom: 120, gap: theme.spacing.md },
  section: { gap: theme.spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primaryBright,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCard: { gap: theme.spacing.md },
  transactionCard: { gap: theme.spacing.sm },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyPill: {
    minWidth: 42,
    alignItems: 'center',
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, alignItems: 'center' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  iconAction: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: { alignItems: 'flex-start', gap: theme.spacing.sm },
  backdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: theme.spacing.lg },
  pickerCard: { gap: theme.spacing.md },
  pickerList: { maxHeight: 320 },
  pickerContent: { gap: theme.spacing.sm },
  pickerRow: {
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: 2,
  },
  rowDisabled: { opacity: 0.6 },
  customCard: { gap: theme.spacing.md },
  formRow: { flexDirection: 'row', gap: theme.spacing.md },
  formFlex: { flex: 1 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing.sm },
  flex: { flex: 1 },
});
