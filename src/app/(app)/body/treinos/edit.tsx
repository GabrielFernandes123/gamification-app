import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, GripVertical, Plus, Trash2, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ImageUploadPicker } from '@/components/ui/ImageUploadPicker';
import { Input } from '@/components/ui/Input';
import { MediaThumb } from '@/components/ui/MediaThumb';
import { NumericPickerField } from '@/components/ui/NumericPickerField';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useFitnessExercises, useSaveWorkoutTemplate, useWorkoutTemplate } from '@/features/body/hooks/useBody';
import { newDraftSet, SET_TYPE_META, SET_TYPE_OPTIONS, SUPERSET_GROUPS } from '@/features/body/workoutMeta';
import { theme } from '@/theme/theme';
import type { FitnessExercise, SetDrop, WorkoutDraftSet, WorkoutSetType, WorkoutTemplate } from '@/types/body';
import { formatErrorMessage } from '@/utils/errors';

type EditorExercise = {
  key: string;
  exercise_id: string;
  superset_group: string | null;
  rest_warmup_seconds: number;
  rest_working_seconds: number;
  rest_after_seconds: number;
  notes: string | null;
  sets: WorkoutDraftSet[];
};

let keyCounter = 0;
const nextKey = () => `e${keyCounter++}`;

export default function WorkoutEditScreen() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;
  const existing = useWorkoutTemplate(id);
  const exercises = useFitnessExercises();
  const save = useSaveWorkoutTemplate();

  const [name, setName] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<EditorExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit || seeded || !existing.data) return;
    const t = existing.data;
    setName(t.name);
    setMediaUrl(t.media_url ?? '');
    setDescription(t.description ?? '');
    setItems(draftFromTemplate(t));
    setSeeded(true);
  }, [isEdit, seeded, existing.data]);

  const exerciseById = useMemo(() => {
    const map = new Map<string, FitnessExercise>();
    for (const e of exercises.data ?? []) map.set(e.id, e);
    return map;
  }, [exercises.data]);

  function addExercise(exercise: FitnessExercise) {
    setItems((prev) => [
      ...prev,
      {
        key: nextKey(),
        exercise_id: exercise.id,
        superset_group: null,
        rest_warmup_seconds: 30,
        rest_working_seconds: 60,
        rest_after_seconds: 120,
        notes: null,
        sets: [newDraftSet('working')],
      },
    ]);
    setPickerOpen(false);
  }

  function patchItem(key: string, patch: Partial<EditorExercise>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }
  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }
  function moveItem(key: string, dir: -1 | 1) {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.key === key);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[to]] = [copy[to], copy[idx]];
      return copy;
    });
  }

  async function onSave() {
    const trimmed = name.trim();
    if (!trimmed) return setError('Dê um nome ao treino.');
    if (items.length === 0) return setError('Adicione pelo menos um exercício.');
    setError('');
    try {
      const newId = await save.mutateAsync({
        id: id ?? null,
        name: trimmed,
        description: description.trim() || null,
        media_url: mediaUrl.trim() || null,
        exercises: items.map((it) => ({
          exercise_id: it.exercise_id,
          superset_group: it.superset_group,
          rest_warmup_seconds: it.rest_warmup_seconds,
          rest_working_seconds: it.rest_working_seconds,
          rest_after_seconds: it.rest_after_seconds,
          notes: it.notes,
          sets: it.sets,
        })),
      });
      toast.success(isEdit ? 'Treino atualizado' : 'Treino criado', trimmed);
      if (isEdit) router.back();
      else router.replace({ pathname: '/(app)/body/treinos/[id]', params: { id: newId } });
    } catch (e) {
      setError(formatErrorMessage(e));
    }
  }

  if (isEdit && existing.isLoading) {
    return (
      <Screen contentStyle={styles.center}><ActivityIndicator color={theme.colors.primary} /></Screen>
    );
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft color={theme.colors.text} size={18} />
        <Text variant="bodyMedium">Treinos</Text>
      </Pressable>

      <Text variant="h1">{isEdit ? 'Editar treino' : 'Novo treino'}</Text>

      <Card style={styles.panel}>
        <Input label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Costas" />
        <Input label="Observações" value={description} onChangeText={setDescription} placeholder="Opcional" />
        <ImageUploadPicker value={mediaUrl} onChange={setMediaUrl} pathPrefix="treinos" />
      </Card>

      {items.map((item, index) => (
        <ExerciseEditor
          key={item.key}
          item={item}
          index={index}
          total={items.length}
          exercise={exerciseById.get(item.exercise_id) ?? null}
          onPatch={(patch) => patchItem(item.key, patch)}
          onRemove={() => removeItem(item.key)}
          onMove={(dir) => moveItem(item.key, dir)}
        />
      ))}

      <Pressable style={styles.addExerciseBtn} onPress={() => setPickerOpen(true)}>
        <Plus color={theme.colors.primary} size={18} />
        <Text variant="title" color={theme.colors.primary}>Adicionar exercício</Text>
      </Pressable>

      {error ? <Text variant="bodyMuted" color={theme.colors.hp}>{error}</Text> : null}

      <Pressable style={[styles.saveBtn, save.isPending && styles.disabled]} onPress={onSave} disabled={save.isPending}>
        {save.isPending ? (
          <ActivityIndicator color={theme.colors.textInverse} />
        ) : (
          <Text variant="title" color={theme.colors.textInverse}>{isEdit ? 'Salvar treino' : 'Criar treino'}</Text>
        )}
      </Pressable>

      <ExercisePickerModal
        visible={pickerOpen}
        exercises={exercises.data ?? []}
        onClose={() => setPickerOpen(false)}
        onPick={addExercise}
      />
    </Screen>
  );
}

function ExerciseEditor({
  item,
  index,
  total,
  exercise,
  onPatch,
  onRemove,
  onMove,
}: {
  item: EditorExercise;
  index: number;
  total: number;
  exercise: FitnessExercise | null;
  onPatch: (patch: Partial<EditorExercise>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [typePickerFor, setTypePickerFor] = useState<number | null>(null);

  function patchSet(i: number, patch: Partial<WorkoutDraftSet>) {
    onPatch({ sets: item.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  }
  function addSet() {
    const lastType = item.sets[item.sets.length - 1]?.set_type ?? 'working';
    onPatch({ sets: [...item.sets, newDraftSet(lastType === 'warmup' ? 'working' : lastType)] });
  }
  function addWarmup() {
    onPatch({ sets: [newDraftSet('warmup'), ...item.sets] });
  }
  function removeSet(i: number) {
    onPatch({ sets: item.sets.filter((_, j) => j !== i) });
  }
  function changeType(i: number, type: WorkoutSetType) {
    patchSet(i, newDraftSet(type));
    setTypePickerFor(null);
  }

  const groupColor = item.superset_group ? theme.colors.skill : theme.colors.border;

  return (
    <Card style={[styles.exerciseCard, { borderLeftColor: groupColor, borderLeftWidth: 3 }]}>
      <View style={styles.exerciseHead}>
        <MediaThumb uri={exercise?.media_url} size={40} />
        <View style={styles.flex}>
          <Text variant="title" numberOfLines={1}>{exercise?.name ?? 'Exercício'}</Text>
          <Text variant="bodyMuted">{item.sets.length} série{item.sets.length === 1 ? '' : 's'}</Text>
        </View>
        <Pressable onPress={() => onMove(-1)} disabled={index === 0} hitSlop={6} style={index === 0 && styles.disabled}>
          <GripVertical color={theme.colors.textMuted} size={18} />
        </Pressable>
        <Pressable onPress={onRemove} hitSlop={6}>
          <Trash2 color={theme.colors.hp} size={18} />
        </Pressable>
      </View>

      <View style={styles.supersetRow}>
        <Text variant="label">Superset</Text>
        <View style={styles.chips}>
          <GroupChip label="—" active={!item.superset_group} onPress={() => onPatch({ superset_group: null })} />
          {SUPERSET_GROUPS.map((g) => (
            <GroupChip key={g} label={g} active={item.superset_group === g} onPress={() => onPatch({ superset_group: g })} />
          ))}
        </View>
      </View>

      <View style={styles.setHeaderRow}>
        <Text variant="label" style={styles.flex}>Séries</Text>
        <Pressable onPress={addWarmup}><Text variant="label" color={SET_TYPE_META.warmup.color}>+ aquecimento</Text></Pressable>
      </View>

      {item.sets.map((set, i) => {
        const meta = SET_TYPE_META[set.set_type];
        return (
          <View key={i} style={styles.setRow}>
            <Pressable style={[styles.typeChip, { borderColor: meta.color }]} onPress={() => setTypePickerFor(i)}>
              <Text variant="label" color={meta.color}>{meta.short}</Text>
            </Pressable>
            {set.set_type === 'dropset' ? (
              <View style={styles.flex}>
                <DropsEditor drops={set.drops ?? []} onChange={(drops) => patchSet(i, { drops })} />
              </View>
            ) : meta.timeBased ? (
              <View style={styles.setInputs}>
                <View style={styles.flex}>
                  <NumericPickerField label="Tempo" title="Tempo (seg)" value={set.target_duration_seconds} onChange={(v) => patchSet(i, { target_duration_seconds: v })} min={0} max={600} step={5} unit="s" />
                </View>
                <View style={styles.flex}>
                  <NumericPickerField label="Carga" title="Carga (kg)" value={set.target_weight} onChange={(v) => patchSet(i, { target_weight: v })} min={0} max={500} step={0.5} unit="kg" />
                </View>
              </View>
            ) : (
              <View style={styles.setInputs}>
                <View style={styles.flex}>
                  <NumericPickerField label="Reps" title="Repetições" value={set.target_reps} onChange={(v) => patchSet(i, { target_reps: v })} min={0} max={100} step={1} />
                </View>
                <View style={styles.flex}>
                  <NumericPickerField label="Carga" title="Carga (kg)" value={set.target_weight} onChange={(v) => patchSet(i, { target_weight: v })} min={0} max={500} step={0.5} unit="kg" />
                </View>
              </View>
            )}
            <Pressable onPress={() => removeSet(i)} hitSlop={6} style={styles.setRemove}>
              <X color={theme.colors.textMuted} size={16} />
            </Pressable>
          </View>
        );
      })}

      <Pressable style={styles.addSetBtn} onPress={addSet}>
        <Plus color={theme.colors.text} size={16} />
        <Text variant="bodyMedium">Adicionar série</Text>
      </Pressable>

      <View style={styles.restRow}>
        <View style={styles.flex}>
          <NumericPickerField label="Desc. aquec." title="Descanso aquecimento" value={item.rest_warmup_seconds} onChange={(v) => onPatch({ rest_warmup_seconds: v ?? 0 })} min={0} max={600} step={5} unit="s" />
        </View>
        <View style={styles.flex}>
          <NumericPickerField label="Desc. série" title="Descanso entre séries" value={item.rest_working_seconds} onChange={(v) => onPatch({ rest_working_seconds: v ?? 0 })} min={0} max={600} step={5} unit="s" />
        </View>
        <View style={styles.flex}>
          <NumericPickerField label="Desc. após" title="Descanso após exercício" value={item.rest_after_seconds} onChange={(v) => onPatch({ rest_after_seconds: v ?? 0 })} min={0} max={600} step={5} unit="s" />
        </View>
      </View>

      <SetTypePickerModal
        visible={typePickerFor !== null}
        current={typePickerFor !== null ? item.sets[typePickerFor]?.set_type : undefined}
        onClose={() => setTypePickerFor(null)}
        onPick={(type) => typePickerFor !== null && changeType(typePickerFor, type)}
      />
      <View />
      <Text variant="bodyMuted">{index + 1} de {total}</Text>
    </Card>
  );
}

function DropsEditor({ drops, onChange }: { drops: SetDrop[]; onChange: (drops: SetDrop[]) => void }) {
  function patch(i: number, p: Partial<SetDrop>) {
    onChange(drops.map((d, j) => (j === i ? { ...d, ...p } : d)));
  }
  return (
    <View style={styles.dropsBox}>
      <Text variant="label">Quedas (drop-set)</Text>
      {drops.map((d, i) => (
        <View key={i} style={styles.dropRow}>
          <Text variant="bodyMuted">{i + 1}.</Text>
          <View style={styles.flex}>
            <NumericPickerField title="Reps" value={d.reps ?? null} onChange={(v) => patch(i, { reps: v })} min={0} max={100} step={1} placeholder="reps" />
          </View>
          <View style={styles.flex}>
            <NumericPickerField title="Carga" value={d.weight ?? null} onChange={(v) => patch(i, { weight: v })} min={0} max={500} step={0.5} unit="kg" placeholder="kg" />
          </View>
          <Pressable onPress={() => onChange(drops.filter((_, j) => j !== i))} hitSlop={6}>
            <X color={theme.colors.textMuted} size={16} />
          </Pressable>
        </View>
      ))}
      <Pressable style={styles.addDropBtn} onPress={() => onChange([...drops, { reps: 8, weight: 10 }])}>
        <Plus color={theme.colors.text} size={14} />
        <Text variant="label">Adicionar queda</Text>
      </Pressable>
    </View>
  );
}

function GroupChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const tint = active ? theme.colors.skill : theme.colors.textMuted;
  return (
    <Pressable style={[styles.groupChip, { borderColor: active ? theme.colors.skill : theme.colors.border }, active && { backgroundColor: theme.colors.skill + '22' }]} onPress={onPress}>
      <Text variant="label" color={tint}>{label}</Text>
    </Pressable>
  );
}

function SetTypePickerModal({ visible, current, onClose, onPick }: { visible: boolean; current?: WorkoutSetType; onClose: () => void; onPick: (type: WorkoutSetType) => void }) {
  return (
    <ModalShell title="Tipo de série" visible={visible} onClose={onClose}>
      {SET_TYPE_OPTIONS.map((opt) => {
        const meta = SET_TYPE_META[opt.value];
        const selected = current === opt.value;
        return (
          <Pressable key={opt.value} style={[styles.optionRow, selected && styles.optionRowSel]} onPress={() => onPick(opt.value)}>
            <View style={[styles.typeDot, { backgroundColor: meta.color }]} />
            <Text variant="bodyMedium" style={styles.flex}>{opt.label}</Text>
            {selected ? <View style={styles.radioDot} /> : null}
          </Pressable>
        );
      })}
    </ModalShell>
  );
}

function ExercisePickerModal({ visible, exercises, onClose, onPick }: { visible: boolean; exercises: FitnessExercise[]; onClose: () => void; onPick: (e: FitnessExercise) => void }) {
  const [query, setQuery] = useState('');
  const filtered = exercises.filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <ModalShell title="Escolher exercício" visible={visible} onClose={onClose}>
      <Input value={query} onChangeText={setQuery} placeholder="Buscar" autoCapitalize="none" />
      {filtered.length === 0 ? <Text variant="bodyMuted">Nenhum exercício. Crie na tela de Exercícios.</Text> : null}
      {filtered.map((e) => (
        <Pressable key={e.id} style={styles.optionRow} onPress={() => onPick(e)}>
          <MediaThumb uri={e.media_url} size={36} radius={theme.radius.sm} />
          <View style={styles.flex}>
            <Text variant="bodyMedium">{e.name}</Text>
            <Text variant="bodyMuted">{e.primaryBodyPart?.name ?? 'Sem divisão'}</Text>
          </View>
        </Pressable>
      ))}
    </ModalShell>
  );
}

function ModalShell({ title, visible, onClose, children }: { title: string; visible: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Card style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text variant="h2">{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fechar"><X color={theme.colors.textMuted} size={22} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Card>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function draftFromTemplate(t: WorkoutTemplate): EditorExercise[] {
  return (t.exercises ?? []).map((ex) => ({
    key: nextKey(),
    exercise_id: ex.exercise_id,
    superset_group: ex.superset_group,
    rest_warmup_seconds: ex.rest_warmup_seconds,
    rest_working_seconds: ex.rest_working_seconds,
    rest_after_seconds: ex.rest_after_seconds,
    notes: ex.notes,
    sets: (ex.sets ?? []).map((s) => ({
      set_type: s.set_type,
      target_reps: s.target_reps,
      target_weight: s.target_weight,
      target_duration_seconds: s.target_duration_seconds,
      drops: (s.drops as SetDrop[] | null) ?? null,
    })),
  }));
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  panel: { gap: theme.spacing.md },
  flex: { flex: 1, minWidth: 0 },
  disabled: { opacity: 0.4 },
  backButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: theme.spacing.sm },
  exerciseCard: { gap: theme.spacing.md },
  exerciseHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  supersetRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  chips: { flexDirection: 'row', gap: theme.spacing.xs, flex: 1, flexWrap: 'wrap' },
  groupChip: { minWidth: 36, height: 32, borderRadius: theme.radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.sm },
  setHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm },
  setInputs: { flexDirection: 'row', gap: theme.spacing.sm, flex: 1 },
  typeChip: { minWidth: 44, height: 38, borderRadius: theme.radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  setRemove: { paddingBottom: theme.spacing.sm },
  addSetBtn: { minHeight: 40, borderRadius: theme.radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
  restRow: { flexDirection: 'row', gap: theme.spacing.sm },
  dropsBox: { gap: theme.spacing.xs, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceAlt, padding: theme.spacing.sm },
  dropRow: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.xs },
  addDropBtn: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, alignSelf: 'flex-start' },
  addExerciseBtn: { minHeight: theme.sizes.touch, borderRadius: theme.radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
  saveBtn: { minHeight: theme.sizes.touch, borderRadius: theme.radius.md, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end', padding: theme.spacing.lg },
  modalCard: { maxHeight: '85%', gap: theme.spacing.md },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  modalContent: { gap: theme.spacing.sm, paddingBottom: theme.spacing.md },
  optionRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceAlt, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  optionRowSel: { borderWidth: 1, borderColor: theme.colors.primary },
  typeDot: { width: 12, height: 12, borderRadius: 6 },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary },
});
