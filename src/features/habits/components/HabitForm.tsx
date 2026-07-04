import { useRouter } from 'expo-router';
import { ChevronRight, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { NumericPickerField } from '@/components/ui/NumericPickerField';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useSkills } from '@/features/skills/hooks/useSkills';
import { theme } from '@/theme/theme';
import { formatErrorMessage } from '@/utils/errors';
import { ALL_WEEKDAYS, WEEKDAY_SHORT, WEEKDAYS_MON_FRI } from '@/utils/weekday';
import type { Difficulty, Habit, HabitType, ScheduleType } from '../hooks/useHabits';
import { useCreateHabit, useDeleteHabit, useUpdateHabit } from '../hooks/useHabitCrud';
import { DIFFICULTY_META, DIFFICULTY_ORDER } from '../meta';

type SelectOption = { value: string; label: string; color?: string; description?: string | null };

export function HabitForm({ habit }: { habit?: Habit }) {
  const router = useRouter();
  const isEdit = !!habit;
  const skills = useSkills();
  const createH = useCreateHabit();
  const updateH = useUpdateHabit();
  const deleteH = useDeleteHabit();
  const toast = useToast();

  const h: Partial<Habit> = habit ?? {};

  const [name, setName] = useState(h.name ?? '');
  const [description, setDescription] = useState(h.description ?? '');
  const [type, setType] = useState<HabitType>(h.type ?? 'positive');
  const [difficulty, setDifficulty] = useState<Difficulty>(h.difficulty ?? 'medium');
  const [schedule, setSchedule] = useState<ScheduleType>(h.schedule ?? 'weekdays');
  const [weekdays, setWeekdays] = useState<number[]>(h.weekdays ?? WEEKDAYS_MON_FRI);
  const [perDay, setPerDay] = useState<number>(h.executions_per_day ?? 1);
  const [weeklyTarget, setWeeklyTarget] = useState<number>(h.weekly_target ?? 3);
  const [monthlyTarget, setMonthlyTarget] = useState<number>(h.monthly_target ?? 10);
  const [primaryId, setPrimaryId] = useState<string>(h.primary_skill_id ?? '');
  const [secondaryId, setSecondaryId] = useState<string>(h.secondary_skill_id ?? '');
  const [times, setTimes] = useState<string[]>(h.reminder_times ?? []);
  const [isActive, setIsActive] = useState(h.is_active ?? true);

  const saving = createH.isPending || updateH.isPending;

  const skillOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'Nenhuma' },
      ...(skills.data ?? []).map((s) => ({ value: s.id, label: s.name, color: s.color ?? undefined })),
    ],
    [skills.data],
  );

  function toggleWeekday(d: number) {
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  function addTime(time: string) {
    if (!times.includes(time)) setTimes((prev) => [...prev, time].sort());
  }

  function buildPayload() {
    return {
      name: name.trim(),
      description: description.trim() || null,
      type,
      difficulty,
      schedule,
      weekdays: schedule === 'weekdays' ? weekdays : null,
      weekly_target: schedule === 'weekly_count' ? weeklyTarget : null,
      monthly_target: schedule === 'monthly' ? monthlyTarget : null,
      // meta DIÁRIA (execuções/dia no positivo, limite/dia no negativo) — vale
      // para todos os agendamentos no modelo de dois níveis.
      executions_per_day: perDay,
      reminder_times: times,
      primary_skill_id: primaryId || null,
      secondary_skill_id: secondaryId || null,
      is_active: isActive,
    };
  }

  function validate(): string | null {
    if (!name.trim()) return 'Dê um nome ao hábito.';
    if (schedule === 'weekdays' && weekdays.length === 0) return 'Escolha ao menos um dia da semana.';
    return null;
  }

  async function onSave() {
    const err = validate();
    if (err) {
      toast.warning('Faltou algo', err);
      return;
    }
    try {
      if (isEdit) {
        await updateH.mutateAsync({ id: habit!.id, patch: buildPayload() });
      } else {
        await createH.mutateAsync(buildPayload());
      }
      toast.success(isEdit ? 'Hábito atualizado' : 'Hábito criado');
      router.back();
    } catch (e) {
      toast.error('Erro ao salvar', formatErrorMessage(e));
    }
  }

  function onDelete() {
    Alert.alert('Excluir hábito', `Remover "${habit!.name}"? Isso apaga o histórico dele.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteH.mutateAsync(habit!.id);
            toast.success('Hábito excluído');
            router.back();
          } catch (e) {
            toast.error('Erro ao excluir', formatErrorMessage(e));
          }
        },
      },
    ]);
  }

  // Nível 1 — meta diária (vale para todos os agendamentos).
  const dailyLabel =
    type === 'positive'
      ? 'Execuções por dia (meta)'
      : 'Limite por dia (tolerância)';
  // Nível 2 — meta de período EM DIAS (só nos flexíveis).
  const periodLabel =
    type === 'positive'
      ? schedule === 'weekly_count'
        ? 'Dias por semana (meta)'
        : 'Dias por mês (meta)'
      : schedule === 'weekly_count'
        ? 'Dias a resistir por semana'
        : 'Dias a resistir por mês';

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.topBar}>
        <Text variant="h1">{isEdit ? 'Editar hábito' : 'Novo hábito'}</Text>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Fechar">
          <X color={theme.colors.textMuted} size={24} />
        </Pressable>
      </View>

      <Input label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Beber água" />
      <Input label="Descrição (opcional)" value={description} onChangeText={setDescription} placeholder="Detalhes..." />

      <Field label="Tipo">
        <Segmented<HabitType>
          options={[
            { value: 'positive', label: 'Positivo (fazer)', color: theme.colors.success },
            { value: 'negative', label: 'Negativo (evitar)', color: theme.colors.hp },
          ]}
          value={type}
          onChange={setType}
          wrap
        />
      </Field>

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

      <Field label="Agendamento">
        <Segmented<ScheduleType>
          options={[
            { value: 'weekdays', label: 'Dias da semana' },
            { value: 'weekly_count', label: 'Por semana' },
            { value: 'monthly', label: 'Por mês' },
          ]}
          value={schedule}
          onChange={setSchedule}
          wrap
        />
      </Field>

      {schedule === 'weekdays' && (
        <Field label="Dias">
          <View style={styles.weekRow}>
            {ALL_WEEKDAYS.map((d) => {
              const on = weekdays.includes(d);
              return (
                <Pressable key={d} onPress={() => toggleWeekday(d)} style={[styles.weekDay, on && styles.weekDayOn]}>
                  <Text variant="bodyMedium" color={on ? theme.colors.textInverse : theme.colors.textMuted}>
                    {WEEKDAY_SHORT[d]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>
      )}

      {/* Nível 1: meta/limite diário — todos os agendamentos */}
      <NumericPickerField label={dailyLabel} title={dailyLabel} value={perDay} onChange={(v) => setPerDay(v ?? 1)} min={1} max={50} />

      {/* Nível 2: meta de período em DIAS — só nos flexíveis */}
      {schedule === 'weekly_count' ? (
        <NumericPickerField label={periodLabel} title={periodLabel} value={weeklyTarget} onChange={(v) => setWeeklyTarget(v ?? 1)} min={1} max={7} />
      ) : null}
      {schedule === 'monthly' ? (
        <NumericPickerField label={periodLabel} title={periodLabel} value={monthlyTarget} onChange={(v) => setMonthlyTarget(v ?? 1)} min={1} max={31} />
      ) : null}

      <SelectionField label="Skill principal (100% XP)" title="Escolher skill principal" options={skillOptions} value={primaryId} onChange={setPrimaryId} />
      <SelectionField label="Skill secundária (50% XP)" title="Escolher skill secundária" options={skillOptions} value={secondaryId} onChange={setSecondaryId} />

      <Field label="Lembretes">
        <View style={styles.timesRow}>
          {times.map((t) => (
            <Pressable key={t} onPress={() => setTimes(times.filter((x) => x !== t))} style={styles.timeChip}>
              <Text variant="bodyMedium" color={theme.colors.text}>
                {t} x
              </Text>
            </Pressable>
          ))}
          {times.length === 0 && <Text variant="bodyMuted">Nenhum lembrete</Text>}
        </View>
        <TimePickerField onAdd={addTime} />
      </Field>

      {isEdit && (
        <View style={styles.activeRow}>
          <Text variant="title">Ativo</Text>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
          />
        </View>
      )}

      <Button label={isEdit ? 'Salvar' : 'Criar hábito'} onPress={onSave} loading={saving} fullWidth />
      {isEdit && <Button label="Excluir" variant="danger" onPress={onDelete} fullWidth style={styles.deleteBtn} />}
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
    return options.filter((option) => `${option.label} ${option.description ?? ''}`.toLowerCase().includes(normalizedQuery));
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

function TimePickerField({ onAdd }: { onAdd: (time: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);

  function confirm() {
    onAdd(`${pad(hour)}:${pad(minute)}`);
    setOpen(false);
  }

  return (
    <>
      <Pressable style={styles.selectionButton} onPress={() => setOpen(true)} accessibilityRole="button">
        <View style={styles.selectionGlyph}>
          <Text variant="bodyMedium">+</Text>
        </View>
        <View style={styles.flex}>
          <Text variant="bodyMedium">Adicionar horário</Text>
        </View>
        <ChevronRight color={theme.colors.textMuted} size={18} />
      </Pressable>
      <BottomModal title="Escolher horário" visible={open} onClose={() => setOpen(false)}>
        <View style={styles.timePicker}>
          <TimeWheel values={range(0, 23)} value={hour} onChange={setHour} />
          <Text variant="h1">:</Text>
          <TimeWheel values={range(0, 55, 5)} value={minute} onChange={setMinute} />
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.secondaryBtn} onPress={() => setOpen(false)}>
            <Text variant="title">Cancelar</Text>
          </Pressable>
          <Pressable style={styles.primaryBtn} onPress={confirm}>
            <Text variant="title" color={theme.colors.textInverse}>Adicionar</Text>
          </Pressable>
        </View>
      </BottomModal>
    </>
  );
}

function TimeWheel({ values, value, onChange }: { values: number[]; value: number; onChange: (value: number) => void }) {
  return (
    <ScrollView style={styles.wheel} contentContainerStyle={styles.wheelContent} showsVerticalScrollIndicator={false}>
      {values.map((item) => {
        const selected = item === value;
        return (
          <Pressable key={item} style={[styles.wheelItem, selected && styles.wheelItemOn]} onPress={() => onChange(item)}>
            <Text variant={selected ? 'h2' : 'bodyMuted'} color={selected ? theme.colors.primary : undefined}>
              {pad(item)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function BottomModal({ title, visible, onClose, children }: { title: string; visible: boolean; onClose: () => void; children: React.ReactNode }) {
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

function range(min: number, max: number, step = 1) {
  return Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, index) => min + index * step);
}

function pad(value: number) {
  return String(value).padStart(2, '0');
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
  weekRow: { flexDirection: 'row', gap: theme.spacing.xs, flexWrap: 'wrap' },
  weekDay: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primaryBright },
  timesRow: { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap', alignItems: 'center' },
  timeChip: {
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  activeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  timePicker: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  wheel: {
    flex: 1,
    height: 220,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
  },
  wheelContent: { paddingVertical: theme.spacing.md },
  wheelItem: { height: 44, alignItems: 'center', justifyContent: 'center' },
  wheelItemOn: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryDim,
  },
  actions: { flexDirection: 'row', gap: theme.spacing.sm },
  secondaryBtn: {
    flex: 1,
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    flex: 1,
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primaryBright,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
