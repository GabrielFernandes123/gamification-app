import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Clock, Dumbbell, Pencil, Play } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { MediaThumb } from '@/components/ui/MediaThumb';
import { MediaViewer } from '@/components/ui/MediaViewer';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useCompletedSessions, useCreateWorkoutSession, useUpdateWorkoutTemplate, useWorkoutTemplate } from '@/features/body/hooks/useBody';
import { SET_TYPE_META } from '@/features/body/workoutMeta';
import { theme } from '@/theme/theme';
import type { WorkoutTemplateExercise } from '@/types/body';
import { formatErrorMessage } from '@/utils/errors';

export default function WorkoutDetailsScreen() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { id } = useLocalSearchParams<{ id: string }>();
  const template = useWorkoutTemplate(id);
  const createSession = useCreateWorkoutSession();
  const updateTemplate = useUpdateWorkoutTemplate();
  const completed = useCompletedSessions();

  const t = template.data;
  const exercises = t?.exercises ?? [];
  const mySessions = (completed.data ?? []).filter((s) => s.template_id === id);
  const timesDone = mySessions.length;
  const lastDoneDays = mySessions[0] ? daysSince(mySessions[0].started_at) : null;
  const avgVolume = timesDone > 0 ? Math.round(mySessions.reduce((a, s) => a + Number(s.total_volume), 0) / timesDone) : 0;
  const muscles = uniqueMuscles(exercises);
  const totalSets = exercises.reduce((sum, ex) => sum + (ex.sets?.length ?? 0), 0);
  const estMinutes = estimateMinutes(exercises);

  async function startWorkout() {
    if (!t) return;
    try {
      const session = await createSession.mutateAsync({ name: t.name, template_id: t.id, media_url: t.media_url });
      toast.success('Treino iniciado', t.name);
      router.navigate({ pathname: '/(app)/body/workouts/[id]', params: { id: session.id } });
    } catch (e) {
      toast.error('Erro ao iniciar treino', formatErrorMessage(e));
    }
  }

  async function confirmArchive() {
    if (!t) return;
    const ok = await confirm({
      title: 'Arquivar treino',
      message: `Arquivar "${t.name}"?`,
      confirmLabel: 'Arquivar',
      destructive: true,
    });
    if (!ok) return;
    try {
      await updateTemplate.mutateAsync({ id: t.id, patch: { is_active: false } });
      toast.info('Treino arquivado', t.name);
      router.back();
    } catch (e) {
      toast.error('Erro ao arquivar', formatErrorMessage(e));
    }
  }

  if (template.isLoading) {
    return <Screen contentStyle={styles.center}><ActivityIndicator color={theme.colors.primary} /></Screen>;
  }
  if (!t) {
    return (
      <Screen scroll contentStyle={styles.content}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft color={theme.colors.text} size={18} />
          <Text variant="bodyMedium">Treinos</Text>
        </Pressable>
        <Card style={styles.panel}><Text variant="title">Treino não encontrado</Text></Card>
      </Screen>
    );
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.topRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft color={theme.colors.text} size={18} />
          <Text variant="bodyMedium">Treinos</Text>
        </Pressable>
        <Pressable style={styles.editBtn} onPress={() => router.push({ pathname: '/(app)/body/treinos/edit', params: { id: t.id } })}>
          <Pencil color={theme.colors.text} size={16} />
          <Text variant="bodyMedium">Editar</Text>
        </Pressable>
      </View>

      <Card style={styles.hero}>
        <MediaThumb uri={t.media_url} size={64} />
        <View style={styles.flex}>
          <Text variant="h2" numberOfLines={2}>{t.name}</Text>
          {muscles.length > 0 ? <Text variant="bodyMuted">{muscles.join(' · ')}</Text> : null}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}><Dumbbell color={theme.colors.textMuted} size={14} /><Text variant="bodyMuted">{exercises.length} exerc.</Text></View>
            <View style={styles.metaItem}><Text variant="bodyMuted">{totalSets} séries</Text></View>
            <View style={styles.metaItem}><Clock color={theme.colors.textMuted} size={14} /><Text variant="bodyMuted">~{estMinutes} min</Text></View>
          </View>
        </View>
      </Card>

      {t.description ? <Text variant="bodyMuted">{t.description}</Text> : null}

      {timesDone > 0 ? (
        <Card style={styles.statsRow}>
          <Stat label="Feito" value={`${timesDone}x`} />
          <Stat label="Último" value={lastDoneDays === 0 ? 'hoje' : `${lastDoneDays}d`} />
          <Stat label="Volume méd." value={`${avgVolume}kg`} />
        </Card>
      ) : null}

      {exercises.map((ex) => (
        <ExerciseBlock key={ex.id} ex={ex} />
      ))}

      {exercises.length === 0 ? (
        <Card style={styles.panel}><Text variant="bodyMuted">Este treino ainda não tem exercícios. Toque em Editar para montar.</Text></Card>
      ) : null}

      <Pressable style={[styles.startBtn, createSession.isPending && styles.disabled]} onPress={startWorkout} disabled={createSession.isPending}>
        {createSession.isPending ? <ActivityIndicator color={theme.colors.textInverse} /> : (
          <>
            <Play color={theme.colors.textInverse} size={18} />
            <Text variant="title" color={theme.colors.textInverse}>Iniciar treino</Text>
          </>
        )}
      </Pressable>
      <Pressable style={styles.archiveBtn} onPress={confirmArchive}>
        <Text variant="title" color={theme.colors.hp}>Arquivar treino</Text>
      </Pressable>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text variant="stat">{value}</Text>
      <Text variant="label">{label}</Text>
    </View>
  );
}

function daysSince(date: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000));
}

function ExerciseBlock({ ex }: { ex: WorkoutTemplateExercise }) {
  const [mediaOpen, setMediaOpen] = useState(false);
  const sets = ex.sets ?? [];
  const warm = sets.filter((s) => s.set_type === 'warmup');
  const work = sets.filter((s) => s.set_type !== 'warmup');
  const rest = `Descanso: ${ex.rest_working_seconds}s entre séries · ${ex.rest_after_seconds}s após`;

  return (
    <Card style={styles.block}>
      <MediaViewer
        uri={mediaOpen ? ex.exercise?.media_url ?? null : null}
        title={ex.exercise?.name}
        onClose={() => setMediaOpen(false)}
      />
      <View style={styles.blockHead}>
        <MediaThumb
          uri={ex.exercise?.media_url}
          size={44}
          radius={theme.radius.sm}
          onPress={ex.exercise?.media_url ? () => setMediaOpen(true) : undefined}
        />
        <View style={styles.flex}>
          <View style={styles.nameRow}>
            <Text variant="title" numberOfLines={1} style={styles.flex}>{ex.exercise?.name ?? 'Exercício'}</Text>
            {ex.superset_group ? (
              <View style={[styles.supersetBadge, { borderColor: theme.colors.skill }]}>
                <Text variant="label" color={theme.colors.skill}>Superset {ex.superset_group}</Text>
              </View>
            ) : null}
          </View>
          {warm.length > 0 ? <Text variant="bodyMuted">{warm.length} séries de aquecimento{describeTargets(warm)}</Text> : null}
          {work.length > 0 ? <Text variant="bodyMedium">{work.length} séries{describeTargets(work)}</Text> : null}
          {sets.length === 0 ? <Text variant="bodyMuted">Sem séries</Text> : null}
        </View>
        <ChevronRight color={theme.colors.textMuted} size={18} />
      </View>
      <Text variant="bodyMuted">{rest}</Text>
    </Card>
  );
}

function describeTargets(sets: WorkoutTemplateExercise['sets']) {
  const first = (sets ?? [])[0];
  if (!first) return '';
  const meta = SET_TYPE_META[first.set_type];
  if (meta.timeBased) return ` • ${first.target_duration_seconds ?? 0}s${first.target_weight ? ` • ${first.target_weight}kg` : ''}`;
  if (first.set_type === 'dropset') return ' • drop-set';
  return ` • ${first.target_reps ?? '-'} reps${first.target_weight ? ` • ${first.target_weight}kg` : ''}`;
}

function uniqueMuscles(exercises: WorkoutTemplateExercise[]) {
  const set = new Set<string>();
  for (const ex of exercises) {
    const name = ex.exercise?.primaryBodyPart?.name;
    if (name) set.add(name);
  }
  return [...set];
}

function estimateMinutes(exercises: WorkoutTemplateExercise[]) {
  let seconds = 0;
  for (const ex of exercises) {
    for (const s of ex.sets ?? []) {
      seconds += 35; // execução média da série
      seconds += s.set_type === 'warmup' ? ex.rest_warmup_seconds : ex.rest_working_seconds;
    }
    seconds += ex.rest_after_seconds;
  }
  return Math.max(1, Math.round(seconds / 60));
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  panel: { gap: theme.spacing.md },
  flex: { flex: 1, minWidth: 0 },
  disabled: { opacity: 0.6 },
  topRow: {
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
  backButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  editBtn: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceSoft, paddingHorizontal: theme.spacing.md },
  hero: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg, backgroundColor: theme.colors.surfaceSoft },
  statsRow: { flexDirection: 'row', gap: theme.spacing.sm },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  metaRow: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.xs, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  block: { gap: theme.spacing.sm },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  supersetBadge: { borderWidth: 1, borderRadius: theme.radius.sm, paddingHorizontal: theme.spacing.sm, paddingVertical: 2 },
  startBtn: { minHeight: theme.sizes.touch, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.primaryBright, backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
  archiveBtn: { minHeight: theme.sizes.touch, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.hp, alignItems: 'center', justifyContent: 'center' },
});
