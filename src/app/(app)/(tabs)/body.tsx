import { ChevronRight, Dumbbell, ExternalLink, Play, Plus, Ruler, Utensils, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { Card } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Screen } from '@/components/ui/Screen';
import { IconSegmented } from '@/components/ui/IconSegmented';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import {
  useBodyMeasurements,
  useCancelWorkoutSession,
  useCreateWorkoutSession,
  useEvaluateBodyGoals,
  useUpsertBodyMeasurement,
  useWorkoutSessions,
  useWorkoutSets,
  useWorkoutTemplates,
} from '@/features/body/hooks/useBody';
import { MediaThumb } from '@/components/ui/MediaThumb';
import { NutritionPanel } from '@/features/nutrition/NutritionPanel';
import { useToday } from '@/hooks/useToday';
import { openWeb } from '@/lib/openWeb';
import { theme } from '@/theme/theme';
import type { BodyMeasurement, WorkoutSession, WorkoutSet, WorkoutTemplate } from '@/types/body';
import { formatErrorMessage } from '@/utils/errors';

type Mode = 'workouts' | 'measurements' | 'nutrition';

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

/**
 * Corpo — as três coisas que se fazem longe do PC: treinar, medir e comer.
 *
 * Saíram daqui (doc 08 §0) o **Resumo** (estatística de semana e PRs), as
 * **Metas** (um builder de tipo/métrica/direção — configuração pura), o
 * **gráfico de evolução** e a **ficha da divisão corporal**. Todos existem no
 * web, com tela maior e sem manutenção dupla.
 *
 * O que ficou é o que exige estar de pé na academia ou na frente da balança.
 */
export default function BodyScreen() {
  const [mode, setMode] = useState<Mode>('workouts');

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <Text variant="h1">Corpo</Text>
          <Text variant="bodyMuted">Treinar, medir e comer.</Text>
        </View>
        {/* Um caminho só para o resto (doc 08 §6.3): exercícios, divisões,
            metas, gráficos e avisos vivem no web, atrás deste único botão. */}
        <Pressable
          onPress={() => void openWeb('/body')}
          hitSlop={10}
          accessibilityLabel="Abrir Corpo no site"
          style={styles.headerIconBtn}
        >
          <ExternalLink color={theme.colors.textMuted} size={22} />
        </Pressable>
      </View>

      <IconSegmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'workouts', label: 'Treinos', icon: Dumbbell, color: theme.colors.skill },
          { value: 'measurements', label: 'Medidas', icon: Ruler, color: theme.colors.success },
          { value: 'nutrition', label: 'Comida', icon: Utensils, color: theme.colors.poison },
        ]}
      />

      {mode === 'workouts' ? <WorkoutsPanel /> : null}
      {mode === 'measurements' ? <MeasurementsPanel /> : null}
      {mode === 'nutrition' ? <NutritionPanel /> : null}
    </Screen>
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
  const [measurementModalOpen, setMeasurementModalOpen] = useState(false);
  const [measurementError, setMeasurementError] = useState('');
  const saving = upsert.isPending || evaluateGoals.isPending;
  const activeConfig = MEASUREMENT_METRICS.find((metric) => metric.key === activeMetric) ?? MEASUREMENT_METRICS[0];

  function updateMetric(key: MeasurementKey, value: number) {
    setDraft((current) => ({ ...current, [key]: value }));
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

      {/* Últimos registros, não gráfico: o que se precisa aqui é a prova de que
          o registro entrou (e quando foi o anterior). A evolução ao longo do
          tempo é leitura de tela grande — vive em /stats. */}
      <Card style={styles.panel}>
        <Text variant="title">Últimos registros</Text>
        {(measurements.data ?? []).length === 0 ? (
          <Text variant="bodyMuted">Nenhuma medição registrada.</Text>
        ) : (
          (measurements.data ?? []).slice(0, 3).map((item) => <MeasurementRow key={item.id} item={item} />)
        )}
        <Text
          variant="label"
          color={theme.colors.primary}
          onPress={() => void openWeb('/stats')}
        >
          Ver evolução no site
        </Text>
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
  flex: { flex: 1, minWidth: 0 },
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
});
