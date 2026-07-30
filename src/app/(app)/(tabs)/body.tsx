import { Activity, ChevronRight, Dumbbell, Image as ImageIcon, Play, Plus, Ruler, Search, Settings2, Timer, Trophy, Utensils, X, Zap } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { Card } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { ImageUploadPicker } from '@/components/ui/ImageUploadPicker';
import { Input } from '@/components/ui/Input';
import { NumericPickerField } from '@/components/ui/NumericPickerField';
import { Screen } from '@/components/ui/Screen';
import { IconSegmented } from '@/components/ui/IconSegmented';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import {
  useBodyAlertSettings,
  useBodyMeasurements,
  useCancelWorkoutSession,
  useBodyParts,
  useBodyGoals,
  useCompleteBodyGoal,
  useCreateBodyGoal,
  useCreateWorkoutSession,
  useDeleteBodyGoal,
  useEvaluateBodyGoals,
  useFitnessExercises,
  useRecentWorkoutSets,
  useUpdateBodyGoal,
  useUpsertBodyMeasurement,
  useWorkoutRecords,
  useWorkoutSessions,
  useWorkoutSets,
  useWorkoutTemplates,
} from '@/features/body/hooks/useBody';
import { MediaThumb } from '@/components/ui/MediaThumb';
import { NutritionPanel } from '@/features/nutrition/NutritionPanel';
import { useToday } from '@/hooks/useToday';
import { openWeb } from '@/lib/openWeb';
import { theme } from '@/theme/theme';
import type { BodyAlertSettings, BodyGoal, BodyGoalDifficulty, BodyGoalType, BodyMeasurement, BodyPart, FitnessExercise, WorkoutSession, WorkoutSet, WorkoutTemplate } from '@/types/body';
import { formatErrorMessage } from '@/utils/errors';

type Mode = 'summary' | 'workouts' | 'measurements' | 'nutrition' | 'goals';
type SelectOption = { value: string; label: string; color?: string; description?: string | null; mediaUrl?: string | null };

const MEASUREMENT_SCALE_WIDTH = 10;

type MeasurementKey =
  | 'weight_kg'
  | 'waist_cm'
  | 'hip_cm'
  | 'chest_cm'
  | 'right_arm_cm'
  | 'left_arm_cm'
  | 'right_thigh_cm'
  | 'left_thigh_cm';

type MeasurementDraft = Record<MeasurementKey, number | null>;

const MEASUREMENT_METRICS: {
  key: MeasurementKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  color: string;
}[] = [
  { key: 'weight_kg', label: 'Peso', unit: 'kg', min: 35, max: 220, step: 0.1, color: theme.colors.skill },
  { key: 'waist_cm', label: 'Abdômen', unit: 'cm', min: 40, max: 180, step: 0.5, color: theme.colors.success },
  { key: 'hip_cm', label: 'Quadril', unit: 'cm', min: 50, max: 180, step: 0.5, color: theme.colors.primary },
  { key: 'chest_cm', label: 'Peito', unit: 'cm', min: 50, max: 180, step: 0.5, color: theme.colors.xp },
  { key: 'right_arm_cm', label: 'Bra?o dir.', unit: 'cm', min: 15, max: 80, step: 0.5, color: theme.colors.hp },
  { key: 'left_arm_cm', label: 'Bra?o esq.', unit: 'cm', min: 15, max: 80, step: 0.5, color: theme.colors.hp },
  { key: 'right_thigh_cm', label: 'Perna dir.', unit: 'cm', min: 25, max: 110, step: 0.5, color: theme.colors.skill },
  { key: 'left_thigh_cm', label: 'Perna esq.', unit: 'cm', min: 25, max: 110, step: 0.5, color: theme.colors.skill },
];

const DEFAULT_TREND_METRICS: MeasurementKey[] = ['weight_kg', 'waist_cm', 'hip_cm'];

export default function BodyScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('summary');
  const [selectedPart, setSelectedPart] = useState<BodyPart | null>(null);

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <Text variant="h1">Corpo</Text>
          <Text variant="bodyMuted">Treinos, medidas e evolução corporal.</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => void openWeb('/body/exercises')}
            hitSlop={10}
            accessibilityLabel="Exercícios"
            style={styles.headerIconBtn}
          >
            <Dumbbell color={theme.colors.skill} size={22} />
          </Pressable>
          <Pressable
            onPress={() => void openWeb('/body/parts')}
            hitSlop={10}
            accessibilityLabel="Divisões"
            style={styles.headerIconBtn}
          >
            <Activity color={theme.colors.primary} size={22} />
          </Pressable>
          <Pressable
            onPress={() => void openWeb('/body/settings')}
            hitSlop={10}
            accessibilityLabel="Configurações de avisos"
            style={styles.headerIconBtn}
          >
            <Settings2 color={theme.colors.textMuted} size={22} />
          </Pressable>
        </View>
      </View>

      {!selectedPart ? (
        <IconSegmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'summary', label: 'Resumo', icon: Activity, color: theme.colors.primary },
            { value: 'workouts', label: 'Treinos', icon: Dumbbell, color: theme.colors.skill },
            { value: 'measurements', label: 'Medidas', icon: Ruler, color: theme.colors.success },
            { value: 'nutrition', label: 'Comida', icon: Utensils, color: theme.colors.poison },
            { value: 'goals', label: 'Metas', icon: Trophy, color: theme.colors.gold },
          ]}
        />
      ) : null}

      {selectedPart ? <BodyPartDetail part={selectedPart} onClose={() => setSelectedPart(null)} /> : null}
      {!selectedPart && mode === 'summary' ? <SummaryPanel onSelectPart={setSelectedPart} /> : null}
      {!selectedPart && mode === 'workouts' ? <WorkoutsPanel /> : null}
      {!selectedPart && mode === 'measurements' ? <MeasurementsPanel /> : null}
      {!selectedPart && mode === 'nutrition' ? <NutritionPanel /> : null}
      {!selectedPart && mode === 'goals' ? <GoalsPanel /> : null}
    </Screen>
  );
}

function SummaryPanel({ onSelectPart }: { onSelectPart: (part: BodyPart) => void }) {
  const sessions = useWorkoutSessions();
  const measurements = useBodyMeasurements();
  const bodyParts = useBodyParts();
  const settings = useBodyAlertSettings();
  const recentSets = useRecentWorkoutSets();
  const records = useWorkoutRecords();

  const completed = useMemo(() => (sessions.data ?? []).filter((s) => s.status === 'completed'), [sessions.data]);
  const weekSessions = useMemo(() => completed.filter((s) => daysSince(s.started_at) <= 7), [completed]);
  const volume = useMemo(() => weekSessions.reduce((sum, s) => sum + Number(s.total_volume ?? 0), 0), [weekSessions]);
  const lastWorkout = completed[0];
  const latestMeasurement = measurements.data?.[0];
  const alerts = useMemo(
    () => buildBodyAlerts(lastWorkout, latestMeasurement, bodyParts.data ?? [], recentSets.data ?? [], settings.data),
    [bodyParts.data, lastWorkout, latestMeasurement, recentSets.data, settings.data],
  );

  return (
    <View style={styles.stack}>
      <Card style={styles.hero}>
        <View style={styles.heroIcon}>
          <Dumbbell color={theme.colors.textInverse} size={24} />
        </View>
        <View style={styles.heroCopy}>
          <Text variant="label">Semana</Text>
          <Text variant="h2">{weekSessions.length} treinos</Text>
          <Text variant="bodyMuted">{Math.round(volume)} kg de volume registrado.</Text>
        </View>
      </Card>

      <View style={styles.grid}>
        <MiniCard icon={<Timer color={theme.colors.skill} size={20} />} label="Último treino" value={lastWorkout ? `${daysSince(lastWorkout.started_at)}d` : '-'} />
        <MiniCard icon={<Ruler color={theme.colors.success} size={20} />} label="Medidas" value={latestMeasurement ? `${daysSince(latestMeasurement.measured_on)}d` : '-'} />
      </View>

      <Card style={styles.panel}>
        <Text variant="title">Avisos</Text>
        {alerts.length === 0 ? (
          <Text variant="bodyMuted">Tudo em dia por aqui.</Text>
        ) : (
          <View style={styles.stackSm}>
            {alerts.slice(0, 4).map((alert) => (
              <View key={alert} style={styles.notice}>
                <Zap color={theme.colors.xp} size={16} />
                <Text variant="bodyMuted" style={styles.noticeText}>{alert}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>


      <Card style={styles.panel}>
        <Text variant="title">PRs recentes</Text>
        {(records.data ?? []).length === 0 ? (
          <Text variant="bodyMuted">Nenhum recorde pessoal ainda.</Text>
        ) : (
          (records.data ?? []).slice(0, 4).map((record) => (
            <View key={record.id} style={styles.historyRow}>
              <View style={styles.flex}>
                <Text variant="bodyMedium">{record.exercise?.name ?? 'Exercício'}</Text>
                <Text variant="bodyMuted">{recordLabel(record.record_type)}</Text>
              </View>
              <Text variant="title" color={theme.colors.xp}>{record.value}</Text>
            </View>
          ))
        )}
      </Card>
    </View>
  );
}

function WorkoutsPanel() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const sessions = useWorkoutSessions();
  const templates = useWorkoutTemplates();
  const createSession = useCreateWorkoutSession();
  const cancelSession = useCancelWorkoutSession();

  const activeSession = (sessions.data ?? []).find((s) => s.status === 'active') ?? null;
  const activeSets = useWorkoutSets(activeSession?.id);

  const [startPickerOpen, setStartPickerOpen] = useState(false);

  const lastDoneByTemplate = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sessions.data ?? []) {
      if (s.status !== 'completed' || !s.template_id) continue;
      const prev = map.get(s.template_id);
      if (!prev || new Date(s.started_at) > new Date(prev)) map.set(s.template_id, s.started_at);
    }
    return map;
  }, [sessions.data]);

  async function startTemplate(template: WorkoutTemplate) {
    try {
      const session = await createSession.mutateAsync({ name: template.name, template_id: template.id, media_url: template.media_url });
      setStartPickerOpen(false);
      toast.success('Treino iniciado', template.name);
      router.navigate({ pathname: '/(app)/body/workouts/[id]', params: { id: session.id } });
    } catch (e) {
      toast.error('Erro ao iniciar treino', formatErrorMessage(e));
    }
  }

  async function cancelActiveSession() {
    if (!activeSession) return;
    const ok = await confirm({
      title: 'Cancelar treino',
      message:
        'O treino e as séries registradas serão descartados e não contam XP nem volume. Tem certeza?',
      confirmLabel: 'Cancelar treino',
      cancelLabel: 'Voltar',
      destructive: true,
    });
    if (!ok) return;
    try {
      await cancelSession.mutateAsync(activeSession.id);
      toast.info('Treino cancelado', activeSession.name);
    } catch (e) {
      toast.error('Erro ao cancelar treino', formatErrorMessage(e));
    }
  }

  function openCreate() {
    setStartPickerOpen(false);
    void openWeb('/body/treinos/edit');
  }

  const completedSessions = useMemo(
    () => (sessions.data ?? []).filter((s) => s.status === 'completed').slice(0, 5),
    [sessions.data],
  );
  const totalSets = activeSets.data?.length ?? 0;
  const sessionVolume = useMemo(
    () => (activeSets.data ?? []).reduce((sum, set) => sum + Number(set.weight) * Number(set.reps), 0),
    [activeSets.data],
  );
  const list = templates.data ?? [];
  const activeSetGroups = useMemo(() => groupSetsByExercise(activeSets.data ?? []), [activeSets.data]);

  return (
    <View style={styles.stack}>
      <Card style={styles.focusCard}>
        <Text variant="title">{activeSession ? activeSession.name : 'Iniciar treino'}</Text>
        {activeSession ? (
          <>
            <View style={styles.metricStrip}>
              <MetricItem label="Tempo" value={`${minutesSince(activeSession.started_at)} min`} />
              <MetricItem label="Séries" value={String(totalSets)} />
              <MetricItem label="Volume" value={`${Math.round(sessionVolume)}kg`} />
            </View>
            <View style={styles.stackSm}>
              {activeSetGroups.map((group) => (
                <View key={group.name} style={styles.setGroup}>
                  <Text variant="bodyMedium">{group.name}</Text>
                  {group.sets.map((set) => (
                    <View key={set.id} style={styles.setRow}>
                      <Text variant="bodyMuted" style={styles.flex}>
                        {set.set_number}. {set.weight}kg x {set.reps}
                        {set.is_warmup ? ' · aquecimento' : ''}
                        {set.rpe ? ` · RPE ${set.rpe}` : ''}
                        {set.rest_seconds ? ` · ${set.rest_seconds}s` : ''}
                      </Text>
                      <Pressable onPress={() => router.navigate({ pathname: '/(app)/body/workouts/[id]', params: { id: activeSession.id } })}><Text variant="label">Abrir</Text></Pressable>
                    </View>
                  ))}
                </View>
              ))}
            </View>
            <Pressable style={styles.primaryBtn} onPress={() => router.navigate({ pathname: '/(app)/body/workouts/[id]', params: { id: activeSession.id } })}>
              <ChevronRight color={theme.colors.textInverse} size={18} />
              <Text variant="title" color={theme.colors.textInverse}>Abrir treino</Text>
            </Pressable>
            <Pressable style={[styles.cancelBtn, cancelSession.isPending && styles.btnDisabled]} onPress={cancelActiveSession} disabled={cancelSession.isPending}>
              {cancelSession.isPending ? (
                <ActivityIndicator color={theme.colors.hp} />
              ) : (
                <>
                  <X color={theme.colors.hp} size={18} />
                  <Text variant="title" color={theme.colors.hp}>Cancelar treino</Text>
                </>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text variant="bodyMuted">Escolha um dos seus treinos para começar agora.</Text>
            <Pressable style={[styles.primaryBtn, list.length === 0 && styles.btnDisabled]} onPress={() => setStartPickerOpen(true)} disabled={list.length === 0}>
              <Play color={theme.colors.textInverse} size={18} />
              <Text variant="title" color={theme.colors.textInverse}>Iniciar treino</Text>
            </Pressable>
          </>
        )}
      </Card>

      <Card style={styles.panel}>
        <View style={styles.sectionHeader}>
          <View style={styles.flex}>
            <Text variant="title">Treinos</Text>
            <Text variant="bodyMuted">Toque para ver detalhes e editar.</Text>
          </View>
          <Pressable style={styles.squareBtn} onPress={openCreate} accessibilityLabel="Novo treino">
            <Plus color={theme.colors.textInverse} size={20} />
          </Pressable>
        </View>
        {templates.isLoading ? <ActivityIndicator color={theme.colors.primary} /> : null}
        {!templates.isLoading && list.length === 0 ? (
          <Text variant="bodyMuted">Nenhum treino criado ainda. Toque no botão + para montar o primeiro.</Text>
        ) : null}
        {list.map((template) => (
          <TreinoCard
            key={template.id}
            template={template}
            daysAgo={daysAgoOrNull(lastDoneByTemplate.get(template.id))}
            onPress={() => setStartPickerOpen(true)}
          />
        ))}
        {list.length > 0 ? (
          <Pressable style={styles.outlineBtn} onPress={() => void openWeb('/body/templates')}>
            <Text variant="title">Ver todos (incl. arquivados)</Text>
          </Pressable>
        ) : null}
      </Card>

      <Card style={styles.panel}>
        <SectionHeader title="Histórico recente" />
        {sessions.isLoading ? <ActivityIndicator color={theme.colors.primary} /> : null}
        {completedSessions.map((session) => (
          <WorkoutRow key={session.id} session={session} />
        ))}
        {!sessions.isLoading && completedSessions.length === 0 ? <Text variant="bodyMuted">Nenhum treino finalizado ainda.</Text> : null}
        <Pressable style={styles.outlineBtn} onPress={() => void openWeb('/history')}>
          <Text variant="title">Ver histórico completo</Text>
        </Pressable>
      </Card>

      <BodyModal title="Selecionar treino" visible={startPickerOpen} onClose={() => setStartPickerOpen(false)}>
        <View style={styles.stackSm}>
          {list.map((template) => (
            <Pressable
              key={template.id}
              style={[styles.startPickRow, createSession.isPending && styles.btnDisabled]}
              onPress={() => startTemplate(template)}
              disabled={createSession.isPending}
              accessibilityRole="button"
            >
              <MediaThumb uri={template.media_url} size={40} radius={theme.radius.sm} />
              <View style={styles.flex}>
                <Text variant="bodyMedium">{template.name}</Text>
                <Text variant="bodyMuted">{template.exercises?.length ?? 0} exercícios</Text>
              </View>
              <View style={styles.startCircle}>
                <Play color={theme.colors.textInverse} size={16} />
              </View>
            </Pressable>
          ))}
        </View>
      </BodyModal>
    </View>
  );
}

const TreinoCard = memo(function TreinoCard({ template, daysAgo, onPress }: { template: WorkoutTemplate; daysAgo: number | null; onPress: () => void }) {
  const muscles = useMemo(
    () => [...new Set((template.exercises ?? []).map((ex) => ex.exercise?.primaryBodyPart?.name).filter(Boolean) as string[])],
    [template.exercises],
  );
  return (
    <Pressable style={styles.treinoCard} onPress={onPress} accessibilityRole="button">
      <MediaThumb uri={template.media_url} size={48} />
      <View style={styles.flex}>
        <Text variant="bodyMedium" numberOfLines={1}>{template.name}</Text>
        <Text variant="bodyMuted" numberOfLines={1}>
          {(template.exercises?.length ?? 0)} exercícios{muscles.length > 0 ? ` · ${muscles.slice(0, 3).join(', ')}` : ''}
        </Text>
      </View>
      {daysAgo !== null ? <Text variant="label" color={theme.colors.textMuted}>{daysAgo}d</Text> : null}
      <ChevronRight color={theme.colors.textMuted} size={18} />
    </Pressable>
  );
});

function daysAgoOrNull(date: string | undefined) {
  if (!date) return null;
  return daysSince(date);
}

function MeasurementsPanel() {
  const { today } = useToday();
  const toast = useToast();
  const measurements = useBodyMeasurements();
  const upsert = useUpsertBodyMeasurement();
  const evaluateGoals = useEvaluateBodyGoals();
  const latest = measurements.data?.[0];
  const [activeMetric, setActiveMetric] = useState<MeasurementKey>('weight_kg');
  const [draft, setDraft] = useState<MeasurementDraft>(() => measurementDraftFromLatest(latest));
  const [trendMetrics, setTrendMetrics] = useState<MeasurementKey[]>(DEFAULT_TREND_METRICS);
  const [measurementModalOpen, setMeasurementModalOpen] = useState(false);
  const [measurementError, setMeasurementError] = useState('');
  const saving = upsert.isPending || evaluateGoals.isPending;
  const activeConfig = MEASUREMENT_METRICS.find((metric) => metric.key === activeMetric) ?? MEASUREMENT_METRICS[0];

  function updateMetric(key: MeasurementKey, value: number) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleTrendMetric(key: MeasurementKey) {
    setTrendMetrics((current) => (
      current.includes(key)
        ? current.filter((metric) => metric !== key)
        : [...current, key]
    ));
  }

  async function save() {
    setMeasurementError('');
    try {
      await upsert.mutateAsync({
        measured_on: today,
        weight_kg: draft.weight_kg,
        waist_cm: draft.waist_cm,
        hip_cm: draft.hip_cm,
        chest_cm: draft.chest_cm,
        right_arm_cm: draft.right_arm_cm,
        left_arm_cm: draft.left_arm_cm,
        right_thigh_cm: draft.right_thigh_cm,
        left_thigh_cm: draft.left_thigh_cm,
        icon_name: null,
        media_url: null,
      });
      const goals = await evaluateGoals.mutateAsync();
      setMeasurementModalOpen(false);
      toast.success('Medidas registradas', today);
      for (const goal of goals ?? []) {
        if (goal.completed) toast.success('Meta concluida', String(goal.title) + ' +' + String(goal.xpGained) + ' XP');
      }
    } catch (e) {
      setMeasurementError(formatErrorMessage(e));
    }
  }

  return (
    <View style={styles.stack}>
      <Card style={styles.panel}>
        <SectionHeader title="Medidas" subtitle="Registre novas medidas em uma tela focada." />
        <Pressable
          style={styles.successBtn}
          onPress={() => {
            setDraft(measurementDraftFromLatest(latest));
            setMeasurementError('');
            setMeasurementModalOpen(true);
          }}
        >
          <Ruler color={theme.colors.textInverse} size={18} />
          <Text variant="title" color={theme.colors.textInverse}>Registrar medidas</Text>
        </Pressable>
      </Card>

      <Card style={styles.panel}>
        <Text variant="title">Evolução</Text>
        <View style={styles.measurementChipGrid}>
          {MEASUREMENT_METRICS.map((metric) => {
            const selected = trendMetrics.includes(metric.key);
            return (
              <Pressable
                key={metric.key}
                style={[styles.measurementChip, selected && { borderColor: metric.color, backgroundColor: theme.colors.surfaceSoft }]}
                onPress={() => toggleTrendMetric(metric.key)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
              >
                <View style={[styles.measurementChipDot, { backgroundColor: metric.color }]} />
                <Text variant="label" color={selected ? theme.colors.text : theme.colors.textMuted}>{metric.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <MultiMeasurementTrend data={measurements.data ?? []} metrics={trendMetrics} />
        <Text variant="title">Histórico</Text>
        {(measurements.data ?? []).length === 0 ? (
          <Text variant="bodyMuted">Nenhuma medição registrada.</Text>
        ) : (
          (measurements.data ?? []).slice(0, 8).map((item) => <MeasurementRow key={item.id} item={item} />)
        )}
      </Card>

      <BodyModal title="Registrar medidas" visible={measurementModalOpen} onClose={() => setMeasurementModalOpen(false)}>
        <View style={styles.measurementFocusCard}>
          <View style={styles.flex}>
            <Text variant="label" color={activeConfig.color}>Editando agora</Text>
            <Text variant="h2">{activeConfig.label}</Text>
            <Text variant="bodyMuted">{formatDate(today)}</Text>
          </View>
          <View style={[styles.measurementFocusValue, { borderColor: activeConfig.color }]}>
            <Text variant="stat" color={activeConfig.color}>
              {formatMeasurementValue(draft[activeMetric] ?? defaultMeasurementValue(activeConfig))}
            </Text>
            <Text variant="label">{activeConfig.unit}</Text>
          </View>
        </View>
        <View style={styles.measurementSummaryGrid}>
          {MEASUREMENT_METRICS.map((metric) => (
            <Pressable
              key={metric.key}
              style={[
                styles.measurementSummaryItem,
                activeMetric === metric.key && { borderColor: metric.color, backgroundColor: theme.colors.surfaceSoft },
              ]}
              onPress={() => setActiveMetric(metric.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: activeMetric === metric.key }}
            >
              <Text variant="label" color={activeMetric === metric.key ? metric.color : theme.colors.textMuted}>
                {metric.label}
              </Text>
              <Text variant="bodyMedium">
                {formatMeasurementValue(draft[metric.key] ?? defaultMeasurementValue(metric))}{metric.unit}
              </Text>
            </Pressable>
          ))}
        </View>
        <MeasurementRuler
          key={activeMetric}
          config={activeConfig}
          value={draft[activeMetric] ?? defaultMeasurementValue(activeConfig)}
          onChange={(value) => updateMetric(activeMetric, value)}
        />
        {measurementError ? <Text variant="bodyMuted" color={theme.colors.hp}>{measurementError}</Text> : null}
        <Pressable style={[styles.successBtn, saving && styles.btnDisabled]} onPress={save} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <>
              <Ruler color={theme.colors.textInverse} size={18} />
              <Text variant="title" color={theme.colors.textInverse}>Salvar medidas</Text>
            </>
          )}
        </Pressable>
      </BodyModal>
    </View>
  );
}

function GoalsPanel() {
  const toast = useToast();
  const goals = useBodyGoals();
  const exercises = useFitnessExercises();
  const bodyParts = useBodyParts();
  const createGoal = useCreateBodyGoal();
  const updateGoal = useUpdateBodyGoal();
  const deleteGoal = useDeleteBodyGoal();
  const completeGoal = useCompleteBodyGoal();

  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [type, setType] = useState<BodyGoalType>('frequency');
  const [title, setTitle] = useState('');
  const [goalMediaUrl, setGoalMediaUrl] = useState('');
  const [metric, setMetric] = useState('workouts_per_week');
  const [direction, setDirection] = useState<'increase' | 'decrease'>('increase');
  const [targetValue, setTargetValue] = useState('');
  const [targetReps, setTargetReps] = useState('');
  const [exerciseId, setExerciseId] = useState('');
  const [bodyPartId, setBodyPartId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [difficulty, setDifficulty] = useState<BodyGoalDifficulty>('medium');
  const [manual, setManual] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);

  function resetForm() {
    setEditingGoalId(null);
    setFormError('');
    setType('frequency');
    setTitle('');
    setGoalMediaUrl('');
    setMetric('workouts_per_week');
    setDirection('increase');
    setTargetValue('');
    setTargetReps('');
    setExerciseId('');
    setBodyPartId('');
    setDeadline('');
    setDifficulty('medium');
    setManual(false);
  }

  function openCreate() {
    resetForm();
    setGoalModalOpen(true);
  }

  const openEditor = useCallback((goal: BodyGoal) => {
    setEditingGoalId(goal.id);
    setType(goal.type);
    setTitle(goal.title);
    setGoalMediaUrl(goal.media_url ?? '');
    setMetric(goal.target_metric ?? (goal.type === 'frequency' ? 'workouts_per_week' : goal.type === 'performance' ? 'weight' : 'weight_kg'));
    setDirection(goal.target_direction === 'decrease' ? 'decrease' : 'increase');
    setTargetValue(numberToDraft(goal.target_value ?? null));
    setTargetReps(numberToDraft(goal.target_reps ?? null));
    setExerciseId(goal.exercise_id ?? '');
    setBodyPartId(goal.body_part_id ?? '');
    setDeadline(goal.deadline ?? '');
    setDifficulty(goal.difficulty);
    setManual(goal.is_manual);
    setGoalModalOpen(true);
  }, []);

  function closeModal() {
    setGoalModalOpen(false);
    resetForm();
  }

  async function saveGoal() {
    const name = title.trim() || defaultGoalTitle(type, metric, targetValue);
    const value = parseOptional(targetValue);
    if (!name) return setFormError('Informe um título para a meta.');
    if (!value && !manual) return setFormError('Informe o valor alvo da meta ou marque conclusão manual.');
    setFormError('');
    const payload = {
      type,
      title: name,
      target_metric: metric,
      target_direction: direction,
      target_value: value,
      target_reps: targetReps ? Number(targetReps) : null,
      exercise_id: type === 'performance' ? exerciseId || null : null,
      body_part_id: bodyPartId || null,
      deadline: deadline.trim() || null,
      difficulty,
      is_manual: manual,
      media_url: goalMediaUrl.trim() || null,
    };
    try {
      if (editingGoalId) {
        await updateGoal.mutateAsync({ id: editingGoalId, patch: payload });
        toast.success('Meta atualizada', name);
      } else {
        await createGoal.mutateAsync(payload);
        toast.success('Meta criada', name);
      }
      closeModal();
    } catch (e) {
      setFormError(formatErrorMessage(e));
    }
  }

  async function removeGoal() {
    if (!editingGoalId) return;
    setFormError('');
    try {
      await deleteGoal.mutateAsync(editingGoalId);
      closeModal();
      toast.info('Meta excluída');
    } catch (e) {
      setFormError(formatErrorMessage(e));
    }
  }

  const finishManual = useCallback(async (goal: BodyGoal) => {
    try {
      const result = await completeGoal.mutateAsync(goal.id);
      if (result.completed) toast.success('Meta concluída', `${result.title} · +${result.xpGained} XP`);
    } catch (e) {
      toast.error('Erro ao concluir meta', formatErrorMessage(e));
    }
  }, [completeGoal, toast]);

  const saving = createGoal.isPending || updateGoal.isPending;
  const deleting = deleteGoal.isPending;
  const activeGoals = useMemo(() => (goals.data ?? []).filter((g) => g.status === 'active'), [goals.data]);
  const completedGoals = useMemo(
    () => (goals.data ?? []).filter((g) => g.status === 'completed').slice(0, 5),
    [goals.data],
  );
  const exerciseOptions = [{ value: '', label: 'Qualquer' }, ...(exercises.data ?? []).map((e) => ({
    value: e.id,
    label: e.name,
    description: e.primaryBodyPart?.name ?? 'Sem divisão',
    mediaUrl: e.media_url,
  }))];
  const bodyPartOptions = [{ value: '', label: 'Nenhuma' }, ...(bodyParts.data ?? []).map((p) => ({ value: p.id, label: p.name, color: p.color ?? undefined, mediaUrl: p.media_url }))];

  return (
    <View style={styles.stack}>
      <Card style={styles.panel}>
        <SectionHeader title="Metas" subtitle="Crie metas em uma tela dedicada." />
        <Pressable style={styles.primaryBtn} onPress={openCreate}>
          <Plus color={theme.colors.textInverse} size={18} />
          <Text variant="title" color={theme.colors.textInverse}>Nova meta</Text>
        </Pressable>
      </Card>

      <Card style={styles.panel}>
        <Text variant="title">Metas ativas</Text>
        {activeGoals.length === 0 ? (
          <Text variant="bodyMuted">Nenhuma meta ativa.</Text>
        ) : (
          activeGoals.map((goal) => <GoalRow key={goal.id} goal={goal} onManualComplete={finishManual} onPress={openEditor} />)
        )}
      </Card>

      <Card style={styles.panel}>
        <Text variant="title">Concluídas recentes</Text>
        {completedGoals.length === 0 ? (
          <Text variant="bodyMuted">Nenhuma meta concluída ainda.</Text>
        ) : (
          completedGoals.map((goal) => <GoalRow key={goal.id} goal={goal} onPress={openEditor} />)
        )}
      </Card>

      <BodyModal title={editingGoalId ? 'Editar meta' : 'Nova meta'} visible={goalModalOpen} onClose={closeModal}>
        <Segmented
          value={type}
          onChange={(v) => {
            setType(v);
            setMetric(v === 'frequency' ? 'workouts_per_week' : v === 'performance' ? 'weight' : 'weight_kg');
            setDirection(v === 'measurement' ? 'decrease' : 'increase');
          }}
          options={[
            { value: 'frequency', label: 'Frequência' },
            { value: 'performance', label: 'Performance' },
            { value: 'measurement', label: 'Medidas' },
          ]}
          wrap
        />
        <Input label="Título" value={title} onChangeText={setTitle} placeholder="Ex.: Treinar 4x na semana" />
        <View style={styles.row}>
          <View style={styles.flex}>
            <ImageUploadPicker value={goalMediaUrl} onChange={setGoalMediaUrl} />
          </View>
        </View>
        {type === 'frequency' ? (
          <NumericPickerField
            label="Alvo"
            title="Treinos por semana"
            value={parseOptional(targetValue)}
            onChange={(value) => setTargetValue(numberToDraft(value))}
            min={1}
            max={14}
            unit="treinos"
          />
        ) : null}
        {type === 'performance' ? (
          <>
            <SelectionField label="Exercício" title="Escolher exercício" options={exerciseOptions} value={exerciseId} onChange={setExerciseId} />
            <Field label="Métrica">
              <Segmented
                value={metric}
                onChange={(v) => {
                  setMetric(v);
                  setDirection(['weight_kg', 'waist_cm'].includes(v) ? 'decrease' : 'increase');
                }}
                options={[
                  { value: 'weight', label: 'Carga' },
                  { value: 'reps', label: 'Reps' },
                  { value: 'volume', label: 'Volume' },
                ]}
                wrap
              />
            </Field>
            <View style={styles.row}>
              <View style={styles.flex}>
                <NumericPickerField
                  label="Alvo"
                  title={`Alvo de ${metricLabel(metric)}`}
                  value={parseOptional(targetValue)}
                  onChange={(value) => setTargetValue(numberToDraft(value))}
                  {...goalTargetPickerConfig(metric)}
                />
              </View>
              <View style={styles.flex}>
                <NumericPickerField
                  label="Reps min."
                  title="Repeticoes minimas"
                  value={parseOptional(targetReps)}
                  onChange={(value) => setTargetReps(numberToDraft(value))}
                  min={1}
                  max={100}
                  unit="reps"
                />
              </View>
            </View>
          </>
        ) : null}
        {type === 'measurement' ? (
          <>
            <Field label="Métrica">
              <Segmented
                value={metric}
                onChange={setMetric}
                options={[
                  { value: 'weight_kg', label: 'Peso' },
                  { value: 'waist_cm', label: 'Abdômen' },
                  { value: 'hip_cm', label: 'Quadril' },
                  { value: 'chest_cm', label: 'Peito' },
                  { value: 'right_arm_cm', label: 'Bra?o dir.' },
                  { value: 'left_arm_cm', label: 'Bra?o esq.' },
                  { value: 'right_thigh_cm', label: 'Perna dir.' },
                  { value: 'left_thigh_cm', label: 'Perna esq.' },
                ]}
                wrap
              />
            </Field>
            <Field label="Direção">
              <Segmented
                value={direction}
                onChange={setDirection}
                options={[
                  { value: 'decrease', label: 'Diminuir' },
                  { value: 'increase', label: 'Aumentar' },
                ]}
                wrap
              />
            </Field>
            <Field label="Valor alvo">
              <MeasurementRuler
                key={metric}
                config={measurementConfigFor(metric)}
                value={parseOptional(targetValue) ?? defaultMeasurementValue(measurementConfigFor(metric))}
                onChange={(value) => setTargetValue(numberToDraft(value))}
              />
            </Field>
          </>
        ) : null}
        <SelectionField label="Divisão relacionada" title="Escolher divisão" options={bodyPartOptions} value={bodyPartId} onChange={setBodyPartId} />
        <DatePickerField label="Prazo" value={deadline} onChange={setDeadline} />
        <Field label="Dificuldade">
          <Segmented
            value={difficulty}
            onChange={setDifficulty}
            options={[
              { value: 'trivial', label: 'Trivial' },
              { value: 'easy', label: 'Fácil' },
              { value: 'medium', label: 'Média' },
              { value: 'hard', label: 'Difícil' },
              { value: 'epic', label: 'Épica' },
            ]}
            wrap
          />
        </Field>
        <Pressable style={[styles.toggleRow, manual && styles.toggleRowOn]} onPress={() => setManual((v) => !v)}>
          <Text variant="bodyMedium">Conclusão manual</Text>
          <Text variant="bodyMuted">{manual ? 'Sim' : 'Não'}</Text>
        </Pressable>
        {formError ? <Text variant="bodyMuted" color={theme.colors.hp}>{formError}</Text> : null}
        <Pressable style={[styles.primaryBtn, (saving || deleting) && styles.btnDisabled]} onPress={saveGoal} disabled={saving || deleting}>
          {saving ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <>
              <Plus color={theme.colors.textInverse} size={18} />
              <Text variant="title" color={theme.colors.textInverse}>{editingGoalId ? 'Salvar meta' : 'Criar meta'}</Text>
            </>
          )}
        </Pressable>
        {editingGoalId ? (
          <Pressable style={[styles.deleteBtn, (saving || deleting) && styles.btnDisabled]} onPress={removeGoal} disabled={saving || deleting}>
            {deleting ? (
              <ActivityIndicator color={theme.colors.hp} />
            ) : (
              <Text variant="title" color={theme.colors.hp}>Excluir meta</Text>
            )}
          </Pressable>
        ) : null}
      </BodyModal>
    </View>
  );
}

const GoalRow = memo(function GoalRow({ goal, onManualComplete, onPress }: { goal: BodyGoal; onManualComplete?: (goal: BodyGoal) => void; onPress?: (goal: BodyGoal) => void }) {
  const detail = (
    <View style={styles.flex}>
      <Text variant="bodyMedium">{goal.title}</Text>
      <Text variant="bodyMuted">
        {goalTypeLabel(goal.type)} · {goal.target_value ?? 'manual'} {goal.target_metric ? metricLabel(goal.target_metric) : ''}
        {goal.type === 'measurement' ? ` · ${goal.target_direction === 'decrease' ? 'diminuir' : 'aumentar'}` : ''}
        {goal.deadline ? ` · até ${formatDate(goal.deadline)}` : ''}
      </Text>
    </View>
  );
  const trailing = goal.status === 'active' && goal.is_manual && onManualComplete ? (
    <Pressable style={styles.smallOutlineBtn} onPress={() => onManualComplete(goal)}>
      <Text variant="label" color={theme.colors.success}>Concluir</Text>
    </Pressable>
  ) : (
    <Text variant="label" color={goal.status === 'completed' ? theme.colors.success : theme.colors.textMuted}>
      {goal.status === 'completed' ? 'Concluída' : difficultyLabel(goal.difficulty)}
    </Text>
  );

  if (onPress) {
    return (
      <Pressable style={styles.goalRow} onPress={() => onPress(goal)} accessibilityRole="button">
        {detail}
        {trailing}
        <ChevronRight color={theme.colors.textMuted} size={18} />
      </Pressable>
    );
  }
  return (
    <View style={styles.goalRow}>
      {detail}
      {trailing}
    </View>
  );
});

function BodyPartDetail({ part, onClose }: { part: BodyPart; onClose: () => void }) {
  const exercises = useFitnessExercises();
  const sets = useRecentWorkoutSets();
  const relatedExercises = useMemo(
    () => (exercises.data ?? []).filter((exercise) => exercise.primary_body_part_id === part.id || exercise.secondary_body_part_id === part.id),
    [exercises.data, part.id],
  );
  const relatedSets = useMemo(
    () => (sets.data ?? []).filter((set) => set.exercise?.primary_body_part_id === part.id || set.exercise?.secondary_body_part_id === part.id),
    [part.id, sets.data],
  );
  const volume = useMemo(
    () => relatedSets.reduce((sum, set) => sum + Number(set.weight) * Number(set.reps), 0),
    [relatedSets],
  );

  return (
    <View style={styles.stack}>
      <Pressable style={styles.outlineBtn} onPress={onClose}>
        <Text variant="title">Voltar</Text>
      </Pressable>
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
      </Card>
    </View>
  );
}

function MeasurementRuler({
  config,
  value,
  onChange,
}: {
  config: (typeof MEASUREMENT_METRICS)[number];
  value: number;
  onChange: (value: number) => void;
}) {
  const ref = useRef<FlatList<number>>(null);
  const lastIndexRef = useRef(-1);
  const { width } = useWindowDimensions();
  const sidePadding = Math.max(24, Math.floor(width / 2) - 34);
  const steps = Math.round((config.max - config.min) / config.step);
  const ticks = useMemo(() => Array.from({ length: steps + 1 }, (_, index) => index), [steps]);
  const valueIndex = Math.max(0, Math.min(steps, Math.round((value - config.min) / config.step)));
  const majorInterval = Math.max(1, Math.round((config.unit === 'kg' ? 1 : 5) / config.step));
  const halfInterval = Math.max(1, Math.round((config.unit === 'kg' ? 0.5 : 2.5) / config.step));
  const labelInterval = Math.max(1, Math.round((config.unit === 'kg' ? 1 : 10) / config.step));

  useEffect(() => {
    lastIndexRef.current = valueIndex;
    requestAnimationFrame(() => ref.current?.scrollToOffset({ offset: valueIndex * MEASUREMENT_SCALE_WIDTH, animated: false }));
  }, [config.key, valueIndex]);

  function commitOffset(offsetX: number) {
    const index = Math.max(0, Math.min(steps, Math.round(offsetX / MEASUREMENT_SCALE_WIDTH)));
    if (index === lastIndexRef.current) return;
    lastIndexRef.current = index;
    onChange(Number((config.min + index * config.step).toFixed(1)));
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    commitOffset(event.nativeEvent.contentOffset.x);
  }

  return (
    <View style={styles.rulerBox}>
      <View style={styles.rulerValueRow}>
        <Text variant="h1">{formatMeasurementValue(value)}</Text>
        <Text variant="title">{config.unit}</Text>
      </View>
      <View style={styles.rulerWrap}>
        <FlatList
          ref={ref}
          data={ticks}
          horizontal
          keyExtractor={(index) => `${config.key}-${index}`}
          renderItem={({ item: index }) => {
            const tick = Number((config.min + index * config.step).toFixed(1));
            const isMajor = index % majorInterval === 0;
            const isHalf = index % halfInterval === 0;
            const isLabel = index % labelInterval === 0;
            return (
              <View style={styles.rulerTickSlot}>
                <View style={[styles.rulerTick, isHalf && styles.rulerTickHalf, isMajor && styles.rulerTickMajor]} />
                {isLabel ? <Text variant="label" style={styles.rulerTickLabel}>{formatMeasurementValue(tick)}</Text> : null}
              </View>
            );
          }}
          showsHorizontalScrollIndicator={false}
          snapToInterval={MEASUREMENT_SCALE_WIDTH}
          decelerationRate="fast"
          scrollEventThrottle={16}
          initialNumToRender={60}
          maxToRenderPerBatch={80}
          windowSize={9}
          removeClippedSubviews
          getItemLayout={(_, index) => ({
            length: MEASUREMENT_SCALE_WIDTH,
            offset: MEASUREMENT_SCALE_WIDTH * index,
            index,
          })}
          contentContainerStyle={{ paddingHorizontal: sidePadding }}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleScroll}
          onScrollEndDrag={handleScroll}
        />
        <View style={[styles.rulerPointer, { backgroundColor: config.color }]} pointerEvents="none" />
      </View>
    </View>
  );
}

function MultiMeasurementTrend({ data, metrics }: { data: BodyMeasurement[]; metrics: MeasurementKey[] }) {
  const ordered = data.slice(0, 8).reverse();
  const width = 320;
  const height = 190;
  const paddingX = 24;
  const paddingTop = 18;
  const paddingBottom = 34;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingTop - paddingBottom;
  const configs = metrics.map((metric) => measurementConfigFor(metric));
  const series = configs
    .map((config) => {
      const points = ordered
        .map((item, index) => ({ index, value: measurementNumberValue(item[config.key], NaN), date: item.measured_on }))
        .filter((point) => isFinite(point.value) && point.value > 0);
      const values = points.map((point) => point.value);
      const min = values.length > 0 ? Math.min(...values) : 0;
      const max = values.length > 0 ? Math.max(...values) : 0;
      const span = max - min;
      return { config, points, min, max, span };
    })
    .filter((item) => item.points.length >= 2);

  if (metrics.length === 0) {
    return (
      <View style={styles.trendEmptyBox}>
        <Text variant="bodyMuted">Selecione uma medida para ver a evolução.</Text>
      </View>
    );
  }

  if (series.length === 0) {
    return (
      <View style={styles.trendEmptyBox}>
        <Text variant="bodyMuted">Registre pelo menos duas medições para gerar o gráfico.</Text>
      </View>
    );
  }

  const maxIndex = Math.max(1, ordered.length - 1);
  const xFor = (index: number) => paddingX + (index / maxIndex) * plotWidth;
  const yFor = (value: number, min: number, span: number) => (
    span === 0 ? paddingTop + plotHeight / 2 : paddingTop + plotHeight - ((value - min) / span) * plotHeight
  );

  return (
    <View style={styles.multiTrendBox}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {[0, 1, 2].map((line) => {
          const y = paddingTop + (plotHeight / 2) * line;
          return <Line key={line} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke={theme.colors.border} strokeWidth={1} />;
        })}
        {series.map(({ config, points, min, span }) => (
          <Polyline
            key={config.key}
            points={points.map((point) => `${xFor(point.index)},${yFor(point.value, min, span)}`).join(' ')}
            fill="none"
            stroke={config.color}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {series.map(({ config, points, min, span }) => (
          points.map((point) => (
            <Circle
              key={`${config.key}-${point.index}`}
              cx={xFor(point.index)}
              cy={yFor(point.value, min, span)}
              r={3.5}
              fill={config.color}
              stroke={theme.colors.surface}
              strokeWidth={1.5}
            />
          ))
        ))}
        {ordered[0] ? (
          <SvgText x={paddingX} y={height - 10} fill={theme.colors.textMuted} fontSize={10}>{formatDate(ordered[0].measured_on)}</SvgText>
        ) : null}
        {ordered[ordered.length - 1] ? (
          <SvgText x={width - paddingX} y={height - 10} fill={theme.colors.textMuted} fontSize={10} textAnchor="end">
            {formatDate(ordered[ordered.length - 1].measured_on)}
          </SvgText>
        ) : null}
      </Svg>
      <View style={styles.trendLegend}>
        {series.map(({ config, points }) => {
          const first = points[0]?.value ?? 0;
          const last = points[points.length - 1]?.value ?? 0;
          const delta = Number((last - first).toFixed(1));
          return (
            <View key={config.key} style={styles.trendLegendItem}>
              <View style={[styles.measurementChipDot, { backgroundColor: config.color }]} />
              <Text variant="label" style={styles.flex}>
                {config.label}: {formatMeasurementValue(first)}{config.unit} - {formatMeasurementValue(last)}{config.unit}
              </Text>
              <Text variant="label" color={delta >= 0 ? theme.colors.success : theme.colors.hp}>
                {delta > 0 ? '+' : ''}{formatMeasurementValue(delta)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function BodyModal({
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

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.flex}>
        <Text variant="title">{title}</Text>
        {subtitle ? <Text variant="bodyMuted">{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricItem}>
      <Text variant="stat">{value}</Text>
      <Text variant="label">{label}</Text>
    </View>
  );
}

function SelectionField({
  label,
  title,
  options,
  value,
  onChange,
  emptyLabel = 'Nenhuma opção disponível.',
}: {
  label: string;
  title: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = useMemo(() => options.find((option) => option.value === value), [options, value]);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return options.filter((option) => {
      const needle = `${option.label} ${option.description ?? ''}`.toLowerCase();
      return needle.includes(normalizedQuery);
    });
  }, [options, query]);

  function choose(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    setQuery('');
  }

  return (
    <Field label={label}>
      <Pressable style={styles.selectionButton} onPress={() => setOpen(true)} accessibilityRole="button">
        <View style={selected?.mediaUrl ? styles.selectionGlyphMedia : [styles.selectionGlyph, selected?.color ? { backgroundColor: selected.color } : null]}>
          {selected?.mediaUrl ? <ImageIcon color={theme.colors.primary} size={18} /> : <Search color={theme.colors.textMuted} size={18} />}
        </View>
        <View style={styles.flex}>
          <Text variant="bodyMedium">{selected?.label ?? 'Selecionar'}</Text>
          {selected?.description ? <Text variant="bodyMuted">{selected.description}</Text> : null}
        </View>
        <ChevronRight color={theme.colors.textMuted} size={18} />
      </Pressable>
      {open ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Card style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text variant="h2">{title}</Text>
                <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityLabel="Fechar">
                  <X color={theme.colors.textMuted} size={22} />
                </Pressable>
              </View>
              <Input value={query} onChangeText={setQuery} placeholder="Buscar" autoCapitalize="none" />
              <ScrollView contentContainerStyle={styles.selectionList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {filtered.length === 0 ? <Text variant="bodyMuted">{emptyLabel}</Text> : null}
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
                      <View style={option.mediaUrl ? styles.selectionGlyphMedia : [styles.selectionGlyph, option.color ? { backgroundColor: option.color } : null]}>
                        {option.mediaUrl ? <ImageIcon color={theme.colors.primary} size={18} /> : null}
                      </View>
                      <View style={styles.flex}>
                        <Text variant="bodyMedium">{option.label}</Text>
                        {option.description ? <Text variant="bodyMuted">{option.description}</Text> : null}
                      </View>
                      {isSelected ? <View style={styles.radioDotInner} /> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Card>
          </KeyboardAvoidingView>
        </Modal>
      ) : null}
    </Field>
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

function WorkoutRow({ session }: { session: WorkoutSession }) {
  return (
    <View style={styles.historyRow}>
      <View style={styles.flex}>
        <Text variant="bodyMedium">{session.name}</Text>
        <Text variant="bodyMuted">{formatDateTime(session.started_at)}</Text>
      </View>
      <Text variant="bodyMuted">{session.duration_minutes ?? '-'} min</Text>
      <Text variant="bodyMuted">{Math.round(Number(session.total_volume))}kg</Text>
    </View>
  );
}

function MeasurementRow({ item }: { item: BodyMeasurement }) {
  return (
    <View style={styles.historyRow}>
      <View style={styles.flex}>
        <Text variant="bodyMedium">{formatDate(item.measured_on)}</Text>
        <Text variant="bodyMuted">Abdômen {item.waist_cm ?? '-'} cm · Quadril {item.hip_cm ?? '-'} cm</Text>
        <Text variant="bodyMuted">Braços {item.right_arm_cm ?? '-'}/{item.left_arm_cm ?? '-'} cm · Pernas {item.right_thigh_cm ?? '-'}/{item.left_thigh_cm ?? '-'} cm</Text>
      </View>
      <Text variant="bodyMuted">{item.weight_kg ?? '-'} kg</Text>
    </View>
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

function buildBodyAlerts(
  lastWorkout: WorkoutSession | undefined,
  latestMeasurement: BodyMeasurement | undefined,
  bodyParts: BodyPart[],
  sets: { created_at: string; exercise?: FitnessExercise | null }[],
  settings?: BodyAlertSettings,
) {
  const workoutLimit = settings?.workout_stale_days ?? 5;
  const measurementLimit = settings?.measurement_stale_days ?? 14;
  const partLimit = settings?.body_part_stale_days ?? 10;
  const alerts: string[] = [];
  if (!lastWorkout) alerts.push('Nenhum treino registrado ainda.');
  else if (daysSince(lastWorkout.started_at) >= workoutLimit) alerts.push(`Você está há ${daysSince(lastWorkout.started_at)} dias sem treinar.`);
  if (!latestMeasurement) alerts.push('Nenhuma medição corporal registrada.');
  else if (daysSince(latestMeasurement.measured_on) >= measurementLimit) alerts.push(`Você está há ${daysSince(latestMeasurement.measured_on)} dias sem registrar medidas.`);

  for (const part of bodyParts.slice(0, 8)) {
    const lastSet = sets.find((set) => set.exercise?.primary_body_part_id === part.id || set.exercise?.secondary_body_part_id === part.id);
    if (lastSet && daysSince(lastSet.created_at) >= partLimit) alerts.push(`${part.name} sem estímulo há ${daysSince(lastSet.created_at)} dias.`);
  }
  return alerts;
}

function parseOptional(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function numberToDraft(value: number | null) {
  return value === null ? '' : String(value);
}

function goalTargetPickerConfig(metric: string) {
  if (metric === 'weight') return { min: 0, max: 500, step: 2.5, unit: 'kg' };
  if (metric === 'reps') return { min: 1, max: 100, step: 1, unit: 'reps' };
  if (metric === 'volume') return { min: 0, max: 20000, step: 50, unit: 'kg' };
  const measurement = MEASUREMENT_METRICS.find((item) => item.key === metric);
  if (measurement) return { min: measurement.min, max: measurement.max, step: measurement.step, unit: measurement.unit };
  return { min: 0, max: 100, step: 1 };
}

function measurementDraftFromLatest(latest?: BodyMeasurement): MeasurementDraft {
  const draft = {} as MeasurementDraft;
  for (const metric of MEASUREMENT_METRICS) {
    draft[metric.key] = measurementNumberValue(latest?.[metric.key], defaultMeasurementValue(metric));
  }
  return draft;
}

function defaultMeasurementValue(metric: (typeof MEASUREMENT_METRICS)[number]) {
  return Number(((metric.min + metric.max) / 2).toFixed(1));
}

function measurementNumberValue(value: unknown, fallback: number) {
  if (typeof value === 'number' && isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    if (isFinite(parsed)) return parsed;
  }
  return fallback;
}

function formatMeasurementValue(value: unknown) {
  const numeric = measurementNumberValue(value, 0);
  return Math.round(numeric) === numeric ? String(numeric) : numeric.toFixed(1).replace('.', ',');
}

function defaultGoalTitle(type: BodyGoalType, metric: string, value: string) {
  if (type === 'frequency') return `Treinar ${value || '?'}x na semana`;
  if (type === 'performance') return `Atingir ${value || '?'} em ${metricLabel(metric)}`;
  return `Chegar em ${value || '?'} em ${metricLabel(metric)}`;
}

function goalTypeLabel(type: BodyGoalType) {
  if (type === 'frequency') return 'Frequência';
  if (type === 'performance') return 'Performance';
  return 'Medida';
}

function difficultyLabel(difficulty: BodyGoalDifficulty) {
  const labels: Record<BodyGoalDifficulty, string> = {
    trivial: 'Trivial',
    easy: 'Fácil',
    medium: 'Média',
    hard: 'Difícil',
    epic: 'Épica',
  };
  return labels[difficulty] ?? difficulty;
}

function measurementConfigFor(metric: string) {
  return MEASUREMENT_METRICS.find((item) => item.key === metric) ?? MEASUREMENT_METRICS[0];
}

function metricLabel(metric: string) {
  const labels: Record<string, string> = {
    workouts_per_week: 'treinos/semana',
    weight: 'carga',
    reps: 'reps',
    volume: 'volume',
    weight_kg: 'peso',
    waist_cm: 'abdomen',
    hip_cm: 'quadril',
    chest_cm: 'peito',
    right_arm_cm: 'braco direito',
    left_arm_cm: 'braco esquerdo',
    right_thigh_cm: 'perna direita',
    left_thigh_cm: 'perna esquerda',
  };
  return labels[metric] ?? metric;
}

function recordLabel(type: string) {
  if (type === 'weight') return 'Maior carga';
  if (type === 'reps') return 'Mais repetições';
  if (type === 'session_volume') return 'Maior volume no treino';
  return 'Maior volume';
}

function groupSetsByExercise(sets: WorkoutSet[]) {
  const groups: { name: string; sets: WorkoutSet[] }[] = [];
  for (const set of sets) {
    const name = set.exercise?.name ?? 'Exercício';
    let group = groups.find((item) => item.name === name);
    if (!group) {
      group = { name, sets: [] };
      groups.push(group);
    }
    group.sets.push(set);
  }
  return groups;
}

function daysSince(date: string) {
  const start = new Date(date).getTime();
  return Math.max(0, Math.floor((Date.now() - start) / 86_400_000));
}

function minutesSince(date: string) {
  const start = new Date(date).getTime();
  return Math.max(0, Math.floor((Date.now() - start) / 60_000));
}

function formatDate(date: string) {
  const [y, m, d] = date.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg, paddingBottom: theme.sizes.tabBarClearance },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  titleCopy: { flex: 1, minWidth: 0 },
  headerActions: { flexDirection: 'row', gap: theme.spacing.xs, alignItems: 'center', flexShrink: 0 },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: { gap: theme.spacing.lg },
  stackSm: { gap: theme.spacing.sm },
  panel: { gap: theme.spacing.md },
  hidden: { display: 'none' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
    padding: theme.spacing.lg,
  },
  modalCard: {
    maxHeight: '88%',
    gap: theme.spacing.md,
    borderColor: theme.colors.primaryDim,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  modalContent: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  focusCard: {
    gap: theme.spacing.md,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceSoft,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  hero: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg, backgroundColor: theme.colors.surfaceSoft },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primaryBright,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1, gap: theme.spacing.xs },
  grid: { flexDirection: 'row', gap: theme.spacing.md },
  miniCard: { flex: 1, gap: theme.spacing.xs },
  metricStrip: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    padding: theme.spacing.sm,
  },
  metricItem: {
    flex: 1,
    minHeight: 58,
    borderRadius: theme.radius.sm,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  notice: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  noticeText: { flex: 1 },
  row: { flexDirection: 'row', gap: theme.spacing.md },
  flex: { flex: 1, minWidth: 0 },
  inlineForm: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-end' },
  actionRow: { flexDirection: 'row', gap: theme.spacing.sm },
  squareBtn: {
    width: theme.sizes.touch,
    height: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primaryBright,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  successBtn: {
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  field: { gap: theme.spacing.sm },
  secondaryAction: {
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
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
  selectionList: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
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
  selectionGlyphMedia: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionList: {
    gap: theme.spacing.xs,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    padding: theme.spacing.xs,
  },
  optionRow: {
    minHeight: 42,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  optionRowSelected: { backgroundColor: theme.colors.primaryDim },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDotSelected: { borderColor: theme.colors.primary },
  radioDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  templateCard: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    overflow: 'hidden',
  },
  templateMain: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  templateActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  iconAction: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startPickRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    padding: theme.spacing.md,
  },
  treinoCard: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceSoft,
    padding: theme.spacing.md,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  setGroup: {
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  timerPill: {
    minHeight: 42,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryDim,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  checklistBox: {
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    padding: theme.spacing.md,
  },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  checkDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  checkDotOn: { borderColor: theme.colors.success, backgroundColor: theme.colors.success },
  templateItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    padding: theme.spacing.md,
  },
  outlineBtn: {
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  rulerBox: {
    gap: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    paddingVertical: theme.spacing.lg,
    overflow: 'hidden',
  },
  rulerValueRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  rulerWrap: {
    height: 76,
    justifyContent: 'center',
  },
  rulerTickSlot: {
    width: MEASUREMENT_SCALE_WIDTH,
    height: 58,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  rulerTick: {
    width: 1,
    height: 12,
    backgroundColor: theme.colors.textMuted,
    opacity: 0.7,
  },
  rulerTickHalf: {
    height: 18,
    opacity: 0.85,
  },
  rulerTickMajor: {
    height: 26,
    backgroundColor: theme.colors.text,
    opacity: 1,
  },
  rulerTickLabel: {
    position: 'absolute',
    top: 32,
    width: 42,
    textAlign: 'center',
  },
  rulerPointer: {
    position: 'absolute',
    alignSelf: 'center',
    width: 3,
    height: 36,
    borderRadius: 2,
  },
  measurementSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  measurementFocusCard: {
    minHeight: 86,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  measurementFocusValue: {
    minWidth: 86,
    minHeight: 62,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bgElevated,
  },
  measurementSummaryItem: {
    width: '48%',
    minHeight: 58,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  measurementChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  measurementChip: {
    minHeight: 34,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  measurementChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  multiTrendBox: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    overflow: 'hidden',
  },
  trendEmptyBox: {
    minHeight: 110,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  trendLegend: {
    gap: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: theme.spacing.sm,
  },
  trendLegendItem: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  trendBox: { gap: theme.spacing.sm },
  trendBars: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.xs, minHeight: 64 },
  trendCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  trendBar: { width: '100%', minHeight: 8, borderRadius: theme.radius.sm },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  smallOutlineBtn: {
    minHeight: 34,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  deleteBtn: {
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.hp,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  cancelBtn: {
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.hp,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  btnDisabled: { opacity: 0.6 },
  toggleRow: {
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleRowOn: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryDim },
});
