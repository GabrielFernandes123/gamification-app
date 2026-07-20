import { Image as ExpoImage } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { ChevronDown, ChevronLeft, ChevronRight, Dumbbell, Play, Trophy, Zap } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { useBodyParts, useExerciseSets, useFitnessExercises, useWorkoutRecords } from '@/features/body/hooks/useBody';
import { theme } from '@/theme/theme';
import type { BodyPart, FitnessExercise, WorkoutSet } from '@/types/body';

const ALL = 'all';
const NONE = 'none';

/** Lista de exercícios do usuário (somente leitura no app — criação/edição ficam no painel web). */
export function ExercisesManager() {
  const exercises = useFitnessExercises();
  const bodyParts = useBodyParts();

  const [partFilter, setPartFilter] = useState<string>(ALL);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = (exercises.data ?? []).find((e) => e.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (exercises.data ?? []).filter((exercise) => {
      const matchesQuery = !needle || exercise.name.toLowerCase().includes(needle);
      const matchesPart =
        partFilter === ALL ||
        (partFilter === NONE
          ? !exercise.primary_body_part_id && !exercise.secondary_body_part_id
          : exercise.primary_body_part_id === partFilter || exercise.secondary_body_part_id === partFilter);
      return matchesQuery && matchesPart;
    });
  }, [exercises.data, partFilter, query]);

  if (selected) {
    return <ExerciseDetail exercise={selected} onClose={() => setSelectedId(null)} />;
  }

  return (
    <View style={styles.stack}>
      <View>
        <Text variant="h1">Exercícios</Text>
        <Text variant="bodyMuted">Filtre por grupo muscular e veja histórico e recordes.</Text>
      </View>

      <Input value={query} onChangeText={setQuery} placeholder="Buscar exercício" autoCapitalize="none" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
        <FilterChip label="Todos" active={partFilter === ALL} onPress={() => setPartFilter(ALL)} />
        {(bodyParts.data ?? []).map((part) => (
          <FilterChip key={part.id} label={part.name} color={part.color ?? undefined} active={partFilter === part.id} onPress={() => setPartFilter(part.id)} />
        ))}
        <FilterChip label="Sem divisão" active={partFilter === NONE} onPress={() => setPartFilter(NONE)} />
      </ScrollView>

      <Card style={styles.panel}>
        <Text variant="title">{filtered.length} exercício{filtered.length === 1 ? '' : 's'}</Text>
        {(exercises.data ?? []).length === 0 ? (
          <Text variant="bodyMuted">Nenhum exercício ainda. Adicione pela Biblioteca no painel web.</Text>
        ) : filtered.length === 0 ? (
          <Text variant="bodyMuted">Nenhum exercício para este filtro.</Text>
        ) : (
          filtered.map((exercise) => (
            <Pressable key={exercise.id} style={styles.exerciseRow} onPress={() => setSelectedId(exercise.id)}>
              <View style={styles.exerciseGlyph}>
                {exercise.media_url ? (
                  <ExpoImage source={{ uri: exercise.media_url }} style={styles.glyphImage} contentFit="cover" />
                ) : (
                  <Dumbbell color={theme.colors.primary} size={18} />
                )}
              </View>
              <View style={styles.flex}>
                <Text variant="bodyMedium">{exercise.name}</Text>
                <Text variant="bodyMuted">{partLabel(exercise, bodyParts.data ?? [])}</Text>
              </View>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </Pressable>
          ))
        )}
      </Card>
    </View>
  );
}

function VolumeChart({ data }: { data: WorkoutGroup[] }) {
  const max = Math.max(1, ...data.map((d) => d.volume));
  const min = Math.min(...data.map((d) => d.volume));
  return (
    <View style={styles.chartBox}>
      <View style={styles.chartRow}>
        <Text variant="label" color={theme.colors.textMuted}>Volume por treino</Text>
        <Text variant="label" color={theme.colors.xp}>{Math.round(max)}kg</Text>
      </View>
      <View style={styles.chartBars}>
        {data.map((d, i) => (
          <View key={d.key} style={styles.chartCol}>
            <View style={[styles.chartBar, { height: 12 + (d.volume / max) * 60, backgroundColor: i === data.length - 1 ? theme.colors.primary : theme.colors.skill }]} />
          </View>
        ))}
      </View>
      <Text variant="label" color={theme.colors.textMuted}>Faixa: {Math.round(min)}–{Math.round(max)}kg · últimos {data.length} treinos</Text>
    </View>
  );
}

function FilterChip({ label, color, active, onPress }: { label: string; color?: string; active: boolean; onPress: () => void }) {
  const tint = color ?? theme.colors.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, { borderColor: active ? tint : theme.colors.border }, active ? { backgroundColor: tint + '22' } : null]}
    >
      <Text variant="bodyMedium" color={active ? tint : theme.colors.textMuted}>{label}</Text>
    </Pressable>
  );
}

function ExerciseDetail({ exercise, onClose }: { exercise: FitnessExercise; onClose: () => void }) {
  const sets = useExerciseSets(exercise.id);
  const records = useWorkoutRecords();
  const mine = sets.data ?? [];
  const myRecords = (records.data ?? []).filter((record) => record.exercise_id === exercise.id);
  const bestWeight = Math.max(0, ...mine.map((set) => Number(set.weight)));
  const bestReps = Math.max(0, ...mine.map((set) => Number(set.reps)));
  const bestVolume = Math.max(0, ...mine.map((set) => Number(set.weight) * Number(set.reps)));
  const videoId = exercise.video_url ? youtubeId(exercise.video_url) : null;

  function openVideo() {
    if (exercise.video_url) WebBrowser.openBrowserAsync(exercise.video_url);
  }

  return (
    <View style={styles.stack}>
      <View style={styles.detailHeader}>
        <Pressable style={styles.backButton} onPress={onClose}>
          <ChevronLeft color={theme.colors.text} size={18} />
          <Text variant="bodyMedium">Exercícios</Text>
        </Pressable>
      </View>
      <Card style={styles.hero}>
        <View style={styles.heroIcon}>
          {exercise.media_url ? (
            <ExpoImage source={{ uri: exercise.media_url }} style={styles.glyphImage} contentFit="cover" />
          ) : (
            <Dumbbell color={theme.colors.textInverse} size={24} />
          )}
        </View>
        <View style={styles.heroCopy}>
          <Text variant="label">Exercício</Text>
          <Text variant="h2">{exercise.name}</Text>
          <Text variant="bodyMuted">
            {[exercise.primaryBodyPart?.name ?? 'Sem divisão principal', exercise.equipment].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </Card>
      {exercise.instructions ? (
        <Card style={styles.panel}>
          <Text variant="title">Como executar</Text>
          <Text variant="bodyMuted">{exercise.instructions}</Text>
        </Card>
      ) : null}
      {exercise.video_url ? (
        <Card style={styles.videoCard}>
          <Text variant="title">Tutorial</Text>
          <Pressable style={styles.videoThumbWrap} onPress={openVideo} accessibilityRole="button">
            {videoId ? (
              <ExpoImage source={{ uri: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` }} style={styles.videoThumb} contentFit="cover" />
            ) : (
              <View style={[styles.videoThumb, styles.videoThumbFallback]} />
            )}
            <View style={styles.videoPlayBadge}>
              <Play color={theme.colors.textInverse} size={26} />
            </View>
          </Pressable>
          <Pressable style={styles.videoBtn} onPress={openVideo}>
            <Play color={theme.colors.textInverse} size={18} />
            <Text variant="title" color={theme.colors.textInverse}>Assistir vídeo</Text>
          </Pressable>
        </Card>
      ) : null}
      <View style={styles.grid}>
        <MiniCard icon={<Trophy color={theme.colors.xp} size={20} />} label="Carga" value={`${bestWeight}kg`} />
        <MiniCard icon={<Zap color={theme.colors.success} size={20} />} label="Reps" value={String(bestReps)} />
      </View>
      <ExerciseHistory sets={mine} loading={sets.isLoading} />
      <Card style={styles.panel}>
        <Text variant="title">PRs</Text>
        <Text variant="bodyMuted">Melhor volume por série: {Math.round(bestVolume)}kg</Text>
        {myRecords.slice(0, 6).map((record) => (
          <View key={record.id} style={styles.historyRow}>
            <Text variant="bodyMuted">{recordLabel(record.record_type)}</Text>
            <Text variant="title" color={theme.colors.xp}>{record.value}</Text>
          </View>
        ))}
      </Card>
    </View>
  );
}

type WorkoutGroup = { key: string; date: string; sets: WorkoutSet[]; volume: number };

function ExerciseHistory({ sets, loading }: { sets: WorkoutSet[]; loading: boolean }) {
  const [visible, setVisible] = useState(5);
  const [expanded, setExpanded] = useState<string | null>(null);
  const workouts = useMemo(() => groupBySession(sets), [sets]);
  const shown = workouts.slice(0, visible);
  const chart = workouts.slice(0, 12).reverse();

  return (
    <Card style={styles.panel}>
      <Text variant="title">Histórico de treinos</Text>
      {chart.length >= 2 ? <VolumeChart data={chart} /> : null}
      {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {!loading && workouts.length === 0 ? <Text variant="bodyMuted">Nenhuma série registrada.</Text> : null}
      {shown.map((workout) => {
        const open = expanded === workout.key;
        return (
          <View key={workout.key} style={styles.workoutBlock}>
            <Pressable style={styles.workoutRow} onPress={() => setExpanded(open ? null : workout.key)} accessibilityRole="button">
              <View style={styles.flex}>
                <Text variant="bodyMedium">{formatWorkoutDate(workout.date)}</Text>
                <Text variant="bodyMuted">{workout.sets.length} série{workout.sets.length === 1 ? '' : 's'} · {summarizeWeights(workout.sets)}</Text>
              </View>
              <Text variant="bodyMuted">{Math.round(workout.volume)}kg</Text>
              <View style={open ? styles.chevronOpen : undefined}>
                {open ? <ChevronDown color={theme.colors.textMuted} size={18} /> : <ChevronRight color={theme.colors.textMuted} size={18} />}
              </View>
            </Pressable>
            {open ? (
              <View style={styles.setDetailBox}>
                {workout.sets.map((set, index) => (
                  <View key={set.id} style={[styles.setLine, index === workout.sets.length - 1 && styles.setLineLast]}>
                    <View style={[styles.setNumBadge, set.is_warmup && styles.setNumBadgeWarm]}>
                      <Text variant="label" color={theme.colors.textInverse}>{set.set_number}</Text>
                    </View>
                    <View style={styles.setCol}>
                      <Text variant="bodyMedium">{Number(set.weight)}</Text>
                      <Text variant="label"> kg</Text>
                    </View>
                    <View style={styles.setCol}>
                      <Text variant="bodyMedium">{set.reps}</Text>
                      <Text variant="label"> reps</Text>
                    </View>
                    <View style={styles.setTags}>
                      {set.is_warmup ? (
                        <View style={[styles.setTag, styles.setTagWarm]}>
                          <Text variant="label" color={theme.colors.xp}>aquecimento</Text>
                        </View>
                      ) : null}
                      {set.rpe ? (
                        <View style={[styles.setTag, styles.setTagRpe]}>
                          <Text variant="label" color={theme.colors.skill}>RPE {set.rpe}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
      {visible < workouts.length ? (
        <Pressable style={styles.seeMoreBtn} onPress={() => setVisible((value) => value + 5)}>
          <Text variant="bodyMedium">Ver mais ({workouts.length - visible})</Text>
        </Pressable>
      ) : null}
    </Card>
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

function partLabel(exercise: FitnessExercise, parts: BodyPart[]) {
  const primary = exercise.primaryBodyPart?.name ?? parts.find((p) => p.id === exercise.primary_body_part_id)?.name;
  const secondary = exercise.secondaryBodyPart?.name ?? parts.find((p) => p.id === exercise.secondary_body_part_id)?.name;
  if (!primary && !secondary) return 'Sem divisão';
  return [primary, secondary].filter(Boolean).join(' · ');
}

function recordLabel(type: string) {
  if (type === 'weight') return 'Maior carga';
  if (type === 'reps') return 'Mais repetições';
  if (type === 'session_volume') return 'Maior volume no treino';
  return 'Maior volume';
}

function groupBySession(sets: WorkoutSet[]): WorkoutGroup[] {
  const map = new Map<string, WorkoutGroup>();
  for (const set of sets) {
    const key = set.session_id ?? set.id;
    let group = map.get(key);
    if (!group) {
      group = { key, date: set.session?.started_at ?? set.created_at, sets: [], volume: 0 };
      map.set(key, group);
    }
    group.sets.push(set);
    group.volume += Number(set.weight) * Number(set.reps);
  }
  const groups = [...map.values()];
  for (const group of groups) group.sets.sort((a, b) => a.set_number - b.set_number);
  groups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return groups;
}

function summarizeWeights(sets: WorkoutSet[]) {
  const weights = [...new Set(sets.map((set) => Number(set.weight)))].sort((a, b) => a - b);
  if (weights.length === 0) return '-';
  return `${weights.join('/')}kg`;
}

function formatWorkoutDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function youtubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([\w-]{11})/,
    /[?&]v=([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const re of patterns) {
    const match = url.match(re);
    if (match) return match[1];
  }
  return null;
}

const styles = StyleSheet.create({
  stack: { gap: theme.spacing.lg },
  panel: { gap: theme.spacing.md },
  flex: { flex: 1, minWidth: 0 },
  backButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: theme.spacing.md,
  },
  chipScroll: { flexGrow: 0, flexShrink: 0 },
  chipRow: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' },
  chip: { height: 40, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft, paddingHorizontal: theme.spacing.md, alignItems: 'center', justifyContent: 'center' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  videoCard: { gap: theme.spacing.md },
  videoThumbWrap: { borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden', aspectRatio: 16 / 9, backgroundColor: theme.colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  videoThumb: { width: '100%', height: '100%' },
  videoThumbFallback: { backgroundColor: theme.colors.surfaceAlt },
  videoPlayBadge: { position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.hp, alignItems: 'center', justifyContent: 'center' },
  videoBtn: { minHeight: theme.sizes.touch, borderRadius: theme.radius.md, backgroundColor: theme.colors.hp, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg },
  exerciseRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft, padding: theme.spacing.md },
  exerciseGlyph: { width: 36, height: 36, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glyphImage: { width: '100%', height: '100%' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg, backgroundColor: theme.colors.surfaceSoft },
  heroIcon: { width: 52, height: 52, borderRadius: theme.radius.md, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroCopy: { flex: 1, gap: theme.spacing.xs },
  grid: { flexDirection: 'row', gap: theme.spacing.md },
  miniCard: { flex: 1, gap: theme.spacing.xs },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  chartBox: { gap: theme.spacing.xs, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft, padding: theme.spacing.md },
  chartRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, minHeight: 76 },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  chartBar: { width: '100%', minHeight: 8, borderRadius: theme.radius.sm },
  workoutBlock: { borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft, overflow: 'hidden' },
  workoutRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  chevronOpen: { opacity: 0.9 },
  setDetailBox: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.sm, paddingTop: theme.spacing.xs, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface },
  setLine: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  setNumBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  setLineLast: { borderBottomWidth: 0 },
  setCol: { flex: 1, flexDirection: 'row', alignItems: 'baseline' },
  setTags: { flex: 1.4, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: theme.spacing.xs },
  setNumBadgeWarm: { backgroundColor: theme.colors.xp },
  setTag: { borderRadius: theme.radius.sm, borderWidth: 1, paddingHorizontal: theme.spacing.sm, paddingVertical: 2 },
  setTagWarm: { borderColor: theme.colors.xp + '55', backgroundColor: theme.colors.xp + '18' },
  setTagRpe: { borderColor: theme.colors.skill + '55', backgroundColor: theme.colors.skill + '18' },
  seeMoreBtn: { minHeight: 40, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
});
