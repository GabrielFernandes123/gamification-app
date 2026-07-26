import { Image as ExpoImage } from 'expo-image';
import { Activity, ChevronLeft, Dumbbell, Plus, Trophy, X, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/bars/ProgressBar';
import { Card } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { ImageUploadPicker } from '@/components/ui/ImageUploadPicker';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useBodyParts, useCreateBodyPart, useDeleteBodyPart, useFitnessExercises, useRecentWorkoutSets, useUpdateBodyPart } from '@/features/body/hooks/useBody';
import type { AttributeKey } from '@/features/character/attributes';
import { AttributePicker } from '@/features/character/components/AttributePicker';
import { theme } from '@/theme/theme';
import type { BodyPart } from '@/types/body';
import { formatErrorMessage } from '@/utils/errors';
import { levelProgress } from '@/utils/leveling';

const PART_COLORS = ['#22D3EE', '#3B82F6', '#F97316', '#22C55E', '#F5B301', '#EF4444', '#A855F7', '#EC4899'];

/** Gestor de divisões corporais in-screen (lista + modal CRUD + detalhe). Painel do Corpo (08 §6.3). */
export function PartsManager() {
  const toast = useToast();
  const confirm = useConfirm();
  const parts = useBodyParts();
  const createPart = useCreateBodyPart();
  const updatePart = useUpdateBodyPart();
  const deletePart = useDeleteBodyPart();

  const [selected, setSelected] = useState<BodyPart | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BodyPart | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PART_COLORS[0]);
  const [mediaUrl, setMediaUrl] = useState('');
  const [attributeKey, setAttributeKey] = useState<AttributeKey | null>(null);
  const [error, setError] = useState('');

  const saving = createPart.isPending || updatePart.isPending;

  function openCreate() {
    setEditing(null);
    setName('');
    setColor(PART_COLORS[(parts.data ?? []).length % PART_COLORS.length]);
    setMediaUrl('');
    setAttributeKey(null);
    setError('');
    setModalOpen(true);
  }

  function openEdit(part: BodyPart) {
    setEditing(part);
    setName(part.name);
    setColor(part.color ?? PART_COLORS[0]);
    setMediaUrl(part.media_url ?? '');
    setAttributeKey(part.attribute_key ?? null);
    setError('');
    setModalOpen(true);
  }

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return setError('Informe o nome da divisão.');
    setError('');
    const payload = { name: trimmed, color, media_url: mediaUrl.trim() || null, attribute_key: attributeKey };
    try {
      if (editing) {
        await updatePart.mutateAsync({ id: editing.id, patch: payload });
        toast.success('Divisão atualizada', trimmed);
      } else {
        await createPart.mutateAsync(payload);
        toast.success('Divisão criada', trimmed);
      }
      setModalOpen(false);
    } catch (e) {
      setError(formatErrorMessage(e));
    }
  }

  async function confirmDelete() {
    if (!editing) return;
    const part = editing;
    const ok = await confirm({
      title: 'Excluir divisão',
      message: `Remover "${part.name}"? Os exercícios ligados a ela ficam sem divisão.`,
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deletePart.mutateAsync(part.id);
      setModalOpen(false);
      toast.info('Divisão excluída', part.name);
    } catch (e) {
      setError(formatErrorMessage(e));
    }
  }

  if (selected) {
    return <PartDetail part={selected} onClose={() => setSelected(null)} onEdit={() => openEdit(selected)} />;
  }

  return (
    <View style={styles.stack}>
      <View style={styles.titleRow}>
        <View style={styles.flex}>
          <Text variant="h1">Divisões</Text>
          <Text variant="bodyMuted">Grupos musculares que evoluem com seus treinos.</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={openCreate} accessibilityLabel="Nova divisão">
          <Plus color={theme.colors.textInverse} size={22} />
        </Pressable>
      </View>

      {parts.isLoading ? <ActivityIndicator color={theme.colors.primary} /> : null}

      {!parts.isLoading && (parts.data ?? []).length === 0 ? (
        <Card style={styles.empty}>
          <Text variant="title" color={theme.colors.textMuted}>Nenhuma divisão ainda</Text>
          <Text variant="bodyMuted" style={styles.emptyText}>Crie grupos como Peito, Costas e Perna para organizar seus exercícios.</Text>
        </Card>
      ) : null}

      {(parts.data ?? []).map((part) => (
        <PartCard key={part.id} part={part} onPress={() => setSelected(part)} onEdit={() => openEdit(part)} />
      ))}

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Card style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text variant="h2">{editing ? 'Editar divisão' : 'Nova divisão'}</Text>
              <Pressable onPress={() => setModalOpen(false)} hitSlop={10} accessibilityLabel="Fechar">
                <X color={theme.colors.textMuted} size={22} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Input label="Nome" value={name} onChangeText={setName} placeholder="Peito, Costas, Perna..." />
              <View style={styles.field}>
                <Text variant="label">Cor</Text>
                <View style={styles.colors}>
                  {PART_COLORS.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setColor(c)}
                      style={[styles.swatch, { backgroundColor: c }, color === c ? styles.swatchOn : null]}
                      accessibilityLabel={`Cor ${c}`}
                    />
                  ))}
                </View>
              </View>
              <AttributePicker value={attributeKey} onChange={setAttributeKey} />
              <ImageUploadPicker value={mediaUrl} onChange={setMediaUrl} pathPrefix="parts" />
              {error ? <Text variant="bodyMuted" color={theme.colors.hp}>{error}</Text> : null}
              <Pressable style={[styles.primaryBtn, saving && styles.btnDisabled]} onPress={submit} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={theme.colors.textInverse} />
                ) : (
                  <Text variant="title" color={theme.colors.textInverse}>{editing ? 'Salvar' : 'Criar divisão'}</Text>
                )}
              </Pressable>
              {editing ? (
                <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
                  <Text variant="title" color={theme.colors.hp}>Excluir</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </Card>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function PartCard({ part, onPress, onEdit }: { part: BodyPart; onPress: () => void; onEdit: () => void }) {
  const color = part.color ?? theme.colors.skill;
  const level = part.level ?? 1;
  const progress = levelProgress(part.xp, level);
  return (
    <Pressable onPress={onPress} onLongPress={onEdit}>
      <Card accent={color}>
        <View style={styles.cardHeader}>
          <View style={[styles.glyph, { borderColor: color }]}>
            {/* Upload do usuário manda; o emblema de IA só preenche o vazio. */}
            {part.media_url ?? part.image_url ? (
              <ExpoImage
                source={{ uri: part.media_url ?? part.image_url ?? '' }}
                style={styles.glyphImage}
                contentFit="cover"
              />
            ) : (
              <Activity color={color} size={24} />
            )}
          </View>
          <View style={styles.flex}>
            <Text variant="title" numberOfLines={1}>{part.name}</Text>
            <Text variant="bodyMuted">Nível {level}</Text>
          </View>
          <Text variant="stat" color={color}>{part.xp}</Text>
        </View>
        <View style={styles.bar}>
          <ProgressBar progress={progress.ratio} color={color} />
        </View>
      </Card>
    </Pressable>
  );
}

function PartDetail({ part, onClose, onEdit }: { part: BodyPart; onClose: () => void; onEdit: () => void }) {
  const exercises = useFitnessExercises();
  const sets = useRecentWorkoutSets();
  const relatedExercises = (exercises.data ?? []).filter((exercise) => exercise.primary_body_part_id === part.id || exercise.secondary_body_part_id === part.id);
  const relatedSets = (sets.data ?? []).filter((set) => set.exercise?.primary_body_part_id === part.id || set.exercise?.secondary_body_part_id === part.id);
  const volume = relatedSets.reduce((sum, set) => sum + Number(set.weight) * Number(set.reps), 0);

  return (
    <View style={styles.stack}>
      <View style={styles.detailHeader}>
        <Pressable style={styles.backButton} onPress={onClose}>
          <ChevronLeft color={theme.colors.text} size={18} />
          <Text variant="bodyMedium">Divisões</Text>
        </Pressable>
        <Pressable style={styles.editBtn} onPress={onEdit} accessibilityLabel="Editar divisão">
          <Text variant="bodyMedium">Editar</Text>
        </Pressable>
      </View>
      <Card style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: part.color ?? theme.colors.skill }]}>
          <Zap color={theme.colors.textInverse} size={24} />
        </View>
        <View style={styles.heroCopy}>
          <Text variant="label">Divisão corporal</Text>
          <Text variant="h2">{part.name}</Text>
          <Text variant="bodyMuted">Nível {part.level ?? 1} · {part.xp} XP</Text>
        </View>
      </Card>
      <View style={styles.grid}>
        <MiniCard icon={<Dumbbell color={theme.colors.skill} size={20} />} label="Exercícios" value={String(relatedExercises.length)} />
        <MiniCard icon={<Trophy color={theme.colors.xp} size={20} />} label="Volume" value={`${Math.round(volume)}kg`} />
      </View>
      <Card style={styles.panel}>
        <Text variant="title">Exercícios relacionados</Text>
        {relatedExercises.map((exercise) => (
          <Text key={exercise.id} variant="bodyMuted">{exercise.name}</Text>
        ))}
        {relatedExercises.length === 0 ? <Text variant="bodyMuted">Nenhum exercício vinculado.</Text> : null}
      </Card>
      <Card style={styles.panel}>
        <Text variant="title">Últimos estímulos</Text>
        {relatedSets.slice(0, 10).map((set) => (
          <View key={set.id} style={styles.historyRow}>
            <Text variant="bodyMuted">{formatDateTime(set.created_at)}</Text>
            <Text variant="bodyMedium">{set.exercise?.name ?? 'Exercício'}</Text>
            <Text variant="bodyMuted">{set.weight}kg x {set.reps}</Text>
          </View>
        ))}
        {relatedSets.length === 0 ? <Text variant="bodyMuted">Nenhum estímulo recente.</Text> : null}
      </Card>
    </View>
  );
}

function MiniCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card style={styles.miniCard}>
      {icon}
      <Text variant="stat">{value}</Text>
      <Text variant="label">{label}</Text>
    </Card>
  );
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

const styles = StyleSheet.create({
  stack: { gap: theme.spacing.lg },
  panel: { gap: theme.spacing.md },
  flex: { flex: 1, minWidth: 0 },
  field: { gap: theme.spacing.sm },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  addBtn: { width: theme.sizes.touch, height: theme.sizes.touch, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.primaryBright, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  empty: { gap: theme.spacing.sm, alignItems: 'center', paddingVertical: theme.spacing.xl },
  emptyText: { textAlign: 'center' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  glyph: { width: 44, height: 44, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glyphImage: { width: '100%', height: '100%' },
  bar: { marginTop: theme.spacing.md },
  colors: { flexDirection: 'row', gap: theme.spacing.md, flexWrap: 'wrap' },
  swatch: { width: 40, height: 40, borderRadius: theme.radius.md, borderWidth: 2, borderColor: theme.colors.border },
  swatchOn: { borderColor: theme.colors.text, transform: [{ scale: 1.08 }] },
  primaryBtn: { minHeight: theme.sizes.touch, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.primaryBright, backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg },
  btnDisabled: { opacity: 0.6 },
  deleteBtn: { minHeight: theme.sizes.touch, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.hp, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.sm },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: theme.spacing.sm, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft, paddingHorizontal: theme.spacing.md },
  editBtn: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceSoft, paddingHorizontal: theme.spacing.md },
  hero: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg, backgroundColor: theme.colors.surfaceSoft },
  heroIcon: { width: 52, height: 52, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, gap: theme.spacing.xs },
  grid: { flexDirection: 'row', gap: theme.spacing.md },
  miniCard: { flex: 1, gap: theme.spacing.xs },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  modalBackdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end', padding: theme.spacing.lg },
  modalCard: { maxHeight: '88%', gap: theme.spacing.md, borderColor: theme.colors.primaryDim },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  modalContent: { gap: theme.spacing.md, paddingBottom: theme.spacing.md },
});
