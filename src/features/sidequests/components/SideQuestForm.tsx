import { useRouter } from 'expo-router';
import { ChevronRight, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import type { Difficulty } from '@/features/habits/hooks/useHabits';
import { DIFFICULTY_META, DIFFICULTY_ORDER } from '@/features/habits/meta';
import { useSkills } from '@/features/skills/hooks/useSkills';
import { theme } from '@/theme/theme';
import type { SideQuest } from '../hooks/useSideQuests';
import {
  useCreateSideQuest,
  useDeleteSideQuest,
  useUpdateSideQuest,
} from '../hooks/useSideQuests';

type SelectOption = { value: string; label: string; color?: string; description?: string | null };

export function SideQuestForm({ quest }: { quest?: SideQuest }) {
  const router = useRouter();
  const isEdit = !!quest;
  const skills = useSkills();
  const createQ = useCreateSideQuest();
  const updateQ = useUpdateSideQuest();
  const deleteQ = useDeleteSideQuest();

  const q: Partial<SideQuest> = quest ?? {};
  const [name, setName] = useState(q.name ?? '');
  const [description, setDescription] = useState(q.description ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>(q.difficulty ?? 'medium');
  const [dueDate, setDueDate] = useState(q.due_date ? q.due_date.slice(0, 10) : '');
  const [primaryId, setPrimaryId] = useState<string>(q.primary_skill_id ?? '');
  const [secondaryId, setSecondaryId] = useState<string>(q.secondary_skill_id ?? '');

  const saving = createQ.isPending || updateQ.isPending;
  const skillOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'Nenhuma' },
      ...(skills.data ?? []).map((s) => ({ value: s.id, label: s.name, color: s.color ?? undefined })),
    ],
    [skills.data],
  );

  async function onSave() {
    if (!name.trim()) {
      Alert.alert('Faltou algo', 'Dê um nome à missão.');
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      difficulty,
      due_date: dueDate ? dueDate : null,
      primary_skill_id: primaryId || null,
      secondary_skill_id: secondaryId || null,
    };

    try {
      if (isEdit) await updateQ.mutateAsync({ id: quest!.id, patch: payload });
      else await createQ.mutateAsync(payload);
      router.back();
    } catch (e) {
      Alert.alert('Erro ao salvar', e instanceof Error ? e.message : 'Tente novamente.');
    }
  }

  function onDelete() {
    Alert.alert('Excluir missão', `Remover "${quest!.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteQ.mutateAsync(quest!.id);
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
        <Text variant="h1">{isEdit ? 'Editar missão' : 'Nova missão'}</Text>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Fechar">
          <X color={theme.colors.textMuted} size={24} />
        </Pressable>
      </View>

      <Input label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Limpar a garagem" />
      <Input
        label="Descrição (opcional)"
        value={description}
        onChangeText={setDescription}
        placeholder="Detalhes..."
      />

      <Field label="Dificuldade">
        <Segmented<Difficulty>
          options={DIFFICULTY_ORDER.map((d) => ({
            value: d,
            label: DIFFICULTY_META[d].label,
            color: DIFFICULTY_META[d].color,
          }))}
          value={difficulty}
          onChange={setDifficulty}
          wrap
        />
      </Field>

      <DatePickerField
        label="Prazo (opcional)"
        value={dueDate}
        onChange={setDueDate}
        placeholder="Selecionar prazo"
      />

      <SelectionField
        label="Skill principal (100% XP)"
        title="Escolher skill principal"
        options={skillOptions}
        value={primaryId}
        onChange={setPrimaryId}
      />
      <SelectionField
        label="Skill secundária (50% XP)"
        title="Escolher skill secundária"
        options={skillOptions}
        value={secondaryId}
        onChange={setSecondaryId}
      />

      <Button label={isEdit ? 'Salvar' : 'Criar missão'} onPress={onSave} loading={saving} fullWidth />
      {isEdit && (
        <Button label="Excluir" variant="danger" onPress={onDelete} fullWidth style={styles.deleteBtn} />
      )}
    </Screen>
  );
}

function SelectionField({
  label,
  title,
  options,
  value,
  onChange,
}: {
  label: string;
  title: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = useMemo(() => options.find((option) => option.value === value), [options, value]);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return options.filter((option) =>
      `${option.label} ${option.description ?? ''}`.toLowerCase().includes(normalizedQuery),
    );
  }, [options, query]);

  function choose(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    setQuery('');
  }

  return (
    <Field label={label}>
      <Pressable style={styles.selectionButton} onPress={() => setOpen(true)} accessibilityRole="button">
        <View style={[styles.selectionGlyph, selected?.color ? { backgroundColor: selected.color } : null]}>
          <Search color={selected?.color ? theme.colors.textInverse : theme.colors.textMuted} size={18} />
        </View>
        <View style={styles.flex}>
          <Text variant="bodyMedium">{selected?.label ?? 'Selecionar'}</Text>
        </View>
        <ChevronRight color={theme.colors.textMuted} size={18} />
      </Pressable>

      <BottomModal title={title} visible={open} onClose={() => setOpen(false)}>
        <Input value={query} onChangeText={setQuery} placeholder="Buscar" autoCapitalize="none" />
        <View style={styles.selectionList}>
          {filtered.length === 0 ? <Text variant="bodyMuted">Nenhuma skill encontrada.</Text> : null}
          {filtered.map((option) => {
            const isSelected = option.value === value;
            return (
              <Pressable
                key={option.value || 'empty-option'}
                style={[styles.selectionRow, isSelected && styles.optionRowSelected]}
                onPress={() => choose(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <View style={[styles.selectionGlyph, option.color ? { backgroundColor: option.color } : null]} />
                <View style={styles.flex}>
                  <Text variant="bodyMedium">{option.label}</Text>
                </View>
                {isSelected ? <View style={styles.radioDotInner} /> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomModal>
    </Field>
  );
}

function BottomModal({
  title,
  visible,
  onClose,
  children,
}: {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Card style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text variant="h2">{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fechar">
              <X color={theme.colors.textMuted} size={22} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Card>
      </KeyboardAvoidingView>
    </Modal>
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
  flex: { flex: 1, minWidth: 0 },
  field: { gap: theme.spacing.sm },
  deleteBtn: { marginTop: theme.spacing.sm },
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
    paddingVertical: theme.spacing.sm,
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
  selectionList: { gap: theme.spacing.sm, paddingBottom: theme.spacing.md },
  selectionRow: {
    minHeight: 58,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  optionRowSelected: { backgroundColor: theme.colors.primaryDim },
  radioDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary },
  modalBackdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end', padding: theme.spacing.lg },
  modalCard: { maxHeight: '88%', gap: theme.spacing.md, borderColor: theme.colors.primaryDim },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  modalContent: { gap: theme.spacing.md, paddingBottom: theme.spacing.md },
});
