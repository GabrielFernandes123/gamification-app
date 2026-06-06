import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { theme } from '@/theme/theme';
import type { Reward } from '../hooks/useStore';
import { useCreateReward, useDeleteReward, useUpdateReward } from '../hooks/useRewardCrud';

export function RewardForm({ reward }: { reward?: Reward }) {
  const router = useRouter();
  const isEdit = !!reward;
  const createR = useCreateReward();
  const updateR = useUpdateReward();
  const deleteR = useDeleteReward();

  const r: Partial<Reward> = reward ?? {};
  const [name, setName] = useState(r.name ?? '');
  const [description, setDescription] = useState(r.description ?? '');
  const [cost, setCost] = useState<number>(r.cost ?? 50);
  const [repurchasable, setRepurchasable] = useState(r.is_repurchasable ?? true);
  const [hasStock, setHasStock] = useState(r.has_stock ?? false);
  const [maxStock, setMaxStock] = useState<number>(r.max_stock ?? 1);
  const [cooldown, setCooldown] = useState<number>(r.cooldown_minutes ?? 0);

  const saving = createR.isPending || updateR.isPending;

  async function onSave() {
    if (!name.trim()) {
      Alert.alert('Faltou algo', 'Dê um nome à recompensa.');
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      cost,
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

      <Field label="Custo (ouro)">
        <NumberStepper value={cost} onChange={setCost} min={1} max={999999} accessibilityLabel="Custo em ouro" />
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

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  field: { gap: theme.spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deleteBtn: { marginTop: theme.spacing.sm },
});
