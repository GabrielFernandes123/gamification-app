import { useRouter } from 'expo-router';
import { ChevronRight, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import { useHabits, type Habit } from '@/features/habits/hooks/useHabits';
import { theme } from '@/theme/theme';
import type { Reward } from '../hooks/useStore';
import { useCreateReward, useDeleteReward, useUpdateReward } from '../hooks/useRewardCrud';

type RewardRequirement = {
  id: string;
  metric: string;
  source_type: string;
  reference_id: string | null;
  target_value: number;
  period_scope: string;
};

type RewardRequirementGroup = {
  id: string;
  requirements: RewardRequirement[];
};

type RewardRequirementMetric = 'habit_success_days' | 'habit_executions' | 'gold_gained' | 'workout_sessions';

export function RewardForm({ reward }: { reward?: Reward }) {
  const router = useRouter();
  const isEdit = !!reward;
  const createR = useCreateReward();
  const updateR = useUpdateReward();
  const deleteR = useDeleteReward();
  const qc = useQueryClient();
  const habits = useHabits();

  const r: Partial<Reward> = reward ?? {};
  const [name, setName] = useState(r.name ?? '');
  const [description, setDescription] = useState(r.description ?? '');
  const [cost, setCost] = useState<number>(r.cost ?? 50);
  const [useEssencia, setUseEssencia] = useState((r.cost_essencia ?? null) != null);
  const [costEssencia, setCostEssencia] = useState<number>(r.cost_essencia ?? 1);
  const [repurchasable, setRepurchasable] = useState(r.is_repurchasable ?? true);
  const [hasStock, setHasStock] = useState(r.has_stock ?? false);
  const [maxStock, setMaxStock] = useState<number>(r.max_stock ?? 1);
  const [cooldown, setCooldown] = useState<number>(r.cooldown_minutes ?? 0);
  const [reqMetric, setReqMetric] = useState<RewardRequirementMetric>('habit_executions');
  const [reqHabitId, setReqHabitId] = useState('');
  const [reqTarget, setReqTarget] = useState(3);

  const saving = createR.isPending || updateR.isPending;
  const rewardRequirements = useQuery({
    queryKey: ['rewardRequirements', reward?.id],
    enabled: isEdit,
    queryFn: async (): Promise<RewardRequirementGroup[]> =>
      apiFetch<RewardRequirementGroup[]>(`/requirements/reward/${reward!.id}`),
  });
  const addRequirement = useMutation({
    mutationFn: async () => {
      if (!reward) throw new Error('Salve a recompensa antes de adicionar requisitos.');
      const groups = rewardRequirements.data ?? [];
      const group =
        groups[0] ??
        (await apiFetch<{ id: string }>(`/requirements/reward/${reward.id}/group`, {
          method: 'POST',
          body: { mode: 'all' },
        }));
      const sourceType = reqMetric === 'gold_gained' ? 'economy_event' : reqMetric === 'workout_sessions' ? 'workout' : 'habit';
      return apiFetch(`/requirements/groups/${group.id}/items`, {
        method: 'POST',
        body: {
          source_type: sourceType,
          metric: reqMetric,
          operator: 'gte',
          target_value: reqTarget,
          reference_id: sourceType === 'habit' ? reqHabitId || null : null,
          period_scope: 'lifetime',
        },
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['rewardRequirements', reward?.id] });
      await qc.invalidateQueries({ queryKey: qk.rewards });
    },
  });
  const removeRequirement = useMutation({
    mutationFn: async (requirementId: string) =>
      apiFetch(`/requirements/items/${requirementId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['rewardRequirements', reward?.id] });
      await qc.invalidateQueries({ queryKey: qk.rewards });
    },
  });

  async function onSave() {
    if (!name.trim()) {
      Alert.alert('Faltou algo', 'Dê um nome à recompensa.');
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      cost: useEssencia ? 0 : cost,
      cost_essencia: useEssencia ? costEssencia : null,
      is_repurchasable: repurchasable,
      has_stock: hasStock,
      max_stock: hasStock ? maxStock : null,
      current_stock: hasStock ? (isEdit ? (r.current_stock ?? maxStock) : maxStock) : null,
      cooldown_minutes: cooldown > 0 ? cooldown : null,
    };
    try {
      if (isEdit) await updateR.mutateAsync({ id: reward!.id, patch: payload });
      else await createR.mutateAsync(payload);
      router.back();
    } catch (e) {
      Alert.alert('Erro ao salvar', e instanceof Error ? e.message : 'Tente novamente.');
    }
  }

  function onDelete() {
    Alert.alert('Excluir recompensa', `Remover "${reward!.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteR.mutateAsync(reward!.id);
            router.back();
          } catch (e) {
            Alert.alert('Erro', e instanceof Error ? e.message : 'Tente novamente.');
          }
        },
      },
    ]);
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.topBar}>
        <Text variant="h1">{isEdit ? 'Editar recompensa' : 'Nova recompensa'}</Text>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Fechar">
          <X color={theme.colors.textMuted} size={24} />
        </Pressable>
      </View>

      <Input label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Assistir um filme" />
      <Input
        label="Descrição (opcional)"
        value={description}
        onChangeText={setDescription}
        placeholder="Detalhes…"
      />

      <Row label="Cobrar Essência">
        <Switch
          value={useEssencia}
          onValueChange={setUseEssencia}
          trackColor={{ true: theme.colors.essencia, false: theme.colors.border }}
        />
      </Row>

      <Field label={useEssencia ? 'Custo (Essência)' : 'Custo (ouro)'}>
        <NumberStepper
          value={useEssencia ? costEssencia : cost}
          onChange={useEssencia ? setCostEssencia : setCost}
          min={1}
          max={999999}
          accessibilityLabel={useEssencia ? 'Custo em Essência' : 'Custo em ouro'}
        />
      </Field>

      <Row label="Recomprável">
        <Switch
          value={repurchasable}
          onValueChange={setRepurchasable}
          trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
        />
      </Row>

      <Row label="Tem estoque">
        <Switch
          value={hasStock}
          onValueChange={setHasStock}
          trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
        />
      </Row>
      {hasStock && (
        <Field label="Estoque máximo">
          <NumberStepper value={maxStock} onChange={setMaxStock} min={1} max={999999} accessibilityLabel="Estoque máximo" />
        </Field>
      )}

      <Field label="Cooldown (minutos, 0 = sem)">
        <NumberStepper value={cooldown} onChange={setCooldown} min={0} max={10080} accessibilityLabel="Cooldown em minutos" />
      </Field>

      {isEdit ? (
        <View style={styles.requirementsPanel}>
          <View style={styles.requirementsHead}>
            <View style={styles.flex}>
              <Text variant="title">Requisitos combinados</Text>
              <Text variant="bodyMuted">Exija ouro mais execuções, treinos ou ouro ganho antes do resgate.</Text>
            </View>
          </View>
          <Segmented<RewardRequirementMetric>
            value={reqMetric}
            onChange={setReqMetric}
            wrap
            options={[
              { value: 'habit_executions', label: 'Execuções' },
              { value: 'habit_success_days', label: 'Dias de hábito' },
              { value: 'workout_sessions', label: 'Treinos' },
              { value: 'gold_gained', label: 'Ouro ganho' },
            ]}
          />
          {reqMetric === 'habit_executions' || reqMetric === 'habit_success_days' ? (
            <HabitSelectionField
              habits={habits.data ?? []}
              value={reqHabitId}
              onChange={setReqHabitId}
            />
          ) : null}
          <Field label="Alvo do requisito">
            <NumberStepper value={reqTarget} onChange={setReqTarget} min={1} max={999999} accessibilityLabel="Alvo do requisito" />
          </Field>
          <Button label="Adicionar requisito" variant="outline" onPress={() => addRequirement.mutate()} loading={addRequirement.isPending} fullWidth />
          {(rewardRequirements.data ?? []).flatMap((group) => group.requirements ?? []).length === 0 ? (
            <Text variant="bodyMuted">Sem requisitos extras. A recompensa usa apenas o custo.</Text>
          ) : (
            (rewardRequirements.data ?? []).flatMap((group) => group.requirements ?? []).map((requirement) => (
              <View key={requirement.id} style={styles.requirementRow}>
                <View style={styles.flex}>
                  <Text variant="bodyMedium">{requirementMetricLabel(requirement.metric)}</Text>
                  <Text variant="bodyMuted">Alvo {requirement.target_value} · {requirement.period_scope}</Text>
                </View>
                <Button label="Remover" variant="danger" size="sm" onPress={() => removeRequirement.mutate(requirement.id)} loading={removeRequirement.isPending} />
              </View>
            ))
          )}
        </View>
      ) : (
        <View style={styles.requirementsPanel}>
          <Text variant="title">Requisitos combinados</Text>
          <Text variant="bodyMuted">Crie a recompensa primeiro. Depois edite para adicionar requisitos como execuções de hábito ou treinos.</Text>
        </View>
      )}

      <Button label={isEdit ? 'Salvar' : 'Criar'} onPress={onSave} loading={saving} fullWidth />
      {isEdit && (
        <Button label="Excluir" variant="danger" onPress={onDelete} fullWidth style={styles.deleteBtn} />
      )}
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      {children}
    </View>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text variant="title">{label}</Text>
      {children}
    </View>
  );
}

function HabitSelectionField({
  habits,
  value,
  onChange,
}: {
  habits: Habit[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = habits.find((habit) => habit.id === value);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return habits;
    return habits.filter((habit) => habit.name.toLowerCase().includes(normalized));
  }, [habits, query]);

  function choose(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    setQuery('');
  }

  return (
    <Field label="Hábito">
      <Pressable style={styles.selectionButton} onPress={() => setOpen(true)} accessibilityRole="button">
        <View style={styles.selectionGlyph}>
          <Search color={theme.colors.textMuted} size={18} />
        </View>
        <View style={styles.flex}>
          <Text variant="bodyMedium">{selected?.name ?? 'Qualquer hábito'}</Text>
        </View>
        <ChevronRight color={theme.colors.textMuted} size={18} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Card style={styles.selectionModal}>
            <View style={styles.modalHeader}>
              <Text variant="h2">Selecionar hábito</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityLabel="Fechar">
                <X color={theme.colors.textMuted} size={22} />
              </Pressable>
            </View>
            <Input value={query} onChangeText={setQuery} placeholder="Buscar hábito" autoCapitalize="none" />
            <ScrollView contentContainerStyle={styles.selectionList} keyboardShouldPersistTaps="handled">
              <HabitOption label="Qualquer hábito" selected={!value} onPress={() => choose('')} />
              {filtered.map((habit) => (
                <HabitOption
                  key={habit.id}
                  label={habit.name}
                  selected={value === habit.id}
                  onPress={() => choose(habit.id)}
                />
              ))}
            </ScrollView>
          </Card>
        </View>
      </Modal>
    </Field>
  );
}

function HabitOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.selectionRow, selected && styles.selectionRowOn]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={[styles.radio, selected && styles.radioOn]} />
      <View style={styles.flex}>
        <Text variant="bodyMedium">{label}</Text>
      </View>
    </Pressable>
  );
}

function requirementMetricLabel(metric: string) {
  const labels: Record<string, string> = {
    habit_executions: 'Execuções de hábito',
    habit_success_days: 'Dias de hábito',
    workout_sessions: 'Treinos concluídos',
    gold_gained: 'Ouro ganho',
  };
  return labels[metric] ?? metric;
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  field: { gap: theme.spacing.sm },
  flex: { flex: 1, minWidth: 0 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    padding: theme.spacing.md,
  },
  requirementsPanel: {
    gap: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  requirementsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  selectionButton: {
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  selectionGlyph: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.overlay,
    padding: theme.spacing.lg,
  },
  selectionModal: {
    maxHeight: '82%',
    gap: theme.spacing.md,
    borderColor: theme.colors.primaryDim,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  selectionList: { gap: theme.spacing.sm, paddingBottom: theme.spacing.md },
  selectionRow: {
    minHeight: 56,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  selectionRowOn: {
    borderColor: theme.colors.primaryBright,
    backgroundColor: theme.colors.primaryDim,
  },
  radio: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  radioOn: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  habitPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  choiceChip: {
    minHeight: 36,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  choiceChipOn: { borderColor: theme.colors.primaryBright, backgroundColor: theme.colors.primaryDim },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    padding: theme.spacing.md,
  },
  deleteBtn: { marginTop: theme.spacing.sm },
});
