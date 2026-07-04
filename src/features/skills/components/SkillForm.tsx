import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { formatErrorMessage } from '@/utils/errors';
import { theme } from '@/theme/theme';
import type { AttributeKey } from '@/features/character/attributes';
import { AttributePicker } from '@/features/character/components/AttributePicker';
import type { Skill } from '../hooks/useSkills';
import { useCreateSkill, useDeleteSkill, useUpdateSkill } from '../hooks/useSkillCrud';

const SKILL_COLORS = [
  '#22D3EE',
  '#3B82F6',
  '#F97316',
  '#22C55E',
  '#F5B301',
  '#EF4444',
  '#A855F7',
  '#EC4899',
];

export function SkillForm({ skill }: { skill?: Skill }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const isEdit = !!skill;
  const createS = useCreateSkill();
  const updateS = useUpdateSkill();
  const deleteS = useDeleteSkill();

  const s: Partial<Skill> = skill ?? {};
  const [name, setName] = useState(s.name ?? '');
  const [description, setDescription] = useState(s.description ?? '');
  const [color, setColor] = useState(s.color ?? SKILL_COLORS[0]);
  const [attributeKey, setAttributeKey] = useState<AttributeKey | null>(
    s.attribute_key ?? null,
  );

  const saving = createS.isPending || updateS.isPending;

  async function onSave() {
    if (!name.trim()) {
      toast.warning('Faltou algo', 'Dê um nome à skill.');
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      color,
      attribute_key: attributeKey,
    };
    try {
      if (isEdit) await updateS.mutateAsync({ id: skill!.id, patch: payload });
      else await createS.mutateAsync(payload);
      router.back();
    } catch (e) {
      toast.error('Erro ao salvar', formatErrorMessage(e));
    }
  }

  async function onDelete() {
    const ok = await confirm({
      title: 'Excluir skill',
      message: `Remover "${skill!.name}"?`,
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteS.mutateAsync(skill!.id);
      toast.info('Skill removida', skill!.name);
      router.back();
    } catch (e) {
      toast.error('Erro ao excluir', formatErrorMessage(e));
    }
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.topBar}>
        <Text variant="h1">{isEdit ? 'Editar skill' : 'Nova skill'}</Text>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Fechar">
          <X color={theme.colors.textMuted} size={24} />
        </Pressable>
      </View>

      <Input label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Saúde" />
      <Input
        label="Descrição (opcional)"
        value={description}
        onChangeText={setDescription}
        placeholder="Detalhes…"
      />

      <View style={styles.field}>
        <Text variant="label">Cor</Text>
        <View style={styles.colors}>
          {SKILL_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.swatch,
                { backgroundColor: c },
                color === c ? styles.swatchOn : null,
              ]}
              accessibilityLabel={`Cor ${c}`}
            />
          ))}
        </View>
      </View>

      <AttributePicker value={attributeKey} onChange={setAttributeKey} />

      <Button label={isEdit ? 'Salvar' : 'Criar skill'} onPress={onSave} loading={saving} fullWidth />
      {isEdit && (
        <Button label="Excluir" variant="danger" onPress={onDelete} fullWidth style={styles.deleteBtn} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg },
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
  colors: { flexDirection: 'row', gap: theme.spacing.md, flexWrap: 'wrap' },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  swatchOn: { borderColor: theme.colors.text, transform: [{ scale: 1.08 }] },
  deleteBtn: { marginTop: theme.spacing.sm },
});
