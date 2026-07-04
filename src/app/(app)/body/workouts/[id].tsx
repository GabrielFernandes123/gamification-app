import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ChevronLeft, ChevronRight, Plus, SkipForward, Timer, Trophy, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { MediaThumb } from '@/components/ui/MediaThumb';
import { NumericPickerField } from '@/components/ui/NumericPickerField';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import {
  useAddWorkoutSet,
  useCancelWorkoutSession,
  useCompleteWorkoutSession,
  useDeleteWorkoutSet,
  useExerciseSets,
  useWorkoutSession,
  useWorkoutSessions,
  useWorkoutSets,
  useWorkoutTemplate,
} from '@/features/body/hooks/useBody';
import { SET_TYPE_META } from '@/features/body/workoutMeta';
import { theme } from '@/theme/theme';
import type { SetDrop, WorkoutSet, WorkoutSetType, WorkoutTemplateExercise, WorkoutTemplateSet } from '@/types/body';
import { formatErrorMessage } from '@/utils/errors';

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessions = useWorkoutSessions();
  const singleSession = useWorkoutSession(id);
  const session = (sessions.data ?? []).find((s) => s.id === id) ?? singleSession.data ?? undefined;
  const template = useWorkoutTemplate(session?.template_id ?? null);
  const sets = useWorkoutSets(id);
  const completeSession = useCompleteWorkoutSession();
  const cancelSession = useCancelWorkoutSession();

  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [rest, setRest] = useState(0);

  useEffect(() => {
    if (rest <= 0) return;
    const t = setInterval(() => setRest((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [rest]);

  const isActive = session?.status === 'active';
  const planItems = template.data?.exercises ?? [];
  const selectedItem = planItems.find((it) => it.exercise_id === selectedExerciseId) ?? null;

  async function finish() {
    if (!session) return;
    try {
      const result = await completeSession.mutateAsync(session.id);
      toast.success('Treino finalizado', `${result.durationMinutes} min · +${result.xpGained} XP · +${result.goldGained} ouro`);
      if ((result.newRecords ?? 0) > 0) toast.success('Novo PR', `${result.newRecords} recorde(s).`);
      router.navigate('/(app)/(tabs)/body');
    } catch (e) {
      toast.error('Erro ao finalizar', formatErrorMessage(e));
    }
  }

  function cancel() {
    if (!session) return;
    Alert.alert('Cancelar treino', 'As séries registradas serão descartadas. Tem certeza?', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Cancelar treino',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelSession.mutateAsync(session.id);
            toast.info('Treino cancelado');
            router.navigate('/(app)/(tabs)/body');
          } catch (e) {
            toast.error('Erro ao cancelar', formatErrorMessage(e));
          }
        },
      },
    ]);
  }

  if (!session && (sessions.isLoading || singleSession.isLoading)) {
    return <Screen contentStyle={styles.center}><ActivityIndicator color={theme.colors.primary} /></Screen>;
  }
  if (!session) {
    return (
      <Screen scroll contentStyle={styles.content}>
        <BackRow label="Treinos" onPress={() => router.back()} />
        <Card style={styles.panel}><Text variant="title">Treino não encontrado</Text></Card>
      </Screen>
    );
  }

  if (selectedItem) {
    const group = selectedItem.superset_group
      ? planItems.filter((it) => it.superset_group === selectedItem.superset_group)
      : [selectedItem];
    return (
      <ExerciseLogger
        item={selectedItem}
        group={group}
        sessionId={session.id}
        isActive={isActive}
        sessionSets={(sets.data ?? []).filter((s) => s.exercise_id === selectedItem.exercise_id)}
        allSessionSets={sets.data ?? []}
        rest={rest}
        onRest={setRest}
        onSwitch={setSelectedExerciseId}
        onBack={() => setSelectedExerciseId(null)}
      />
    );
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <BackRow label="Sair" onPress={() => router.navigate('/(app)/(tabs)/body')} />

      <Card style={styles.focusCard}>
        <Text variant="h2">{session.name}</Text>
        <View style={styles.metricStrip}>
          <Metric label="Tempo" value={`${minutesSince(session.started_at)} min`} />
          <Metric label="Séries" value={String(sets.data?.length ?? 0)} />
          <Metric label="Status" value={isActive ? 'Ativo' : 'OK'} />
        </View>
        {rest > 0 ? <RestBanner rest={rest} onSkip={() => setRest(0)} /> : null}
      </Card>

      {planItems.length === 0 ? (
        <Card style={styles.panel}><Text variant="bodyMuted">Este treino não tem exercícios no plano.</Text></Card>
      ) : (
        planItems.map((item) => {
          const done = (sets.data ?? []).filter((s) => s.exercise_id === item.exercise_id).length;
          const planned = item.sets?.length ?? 0;
          const complete = planned > 0 && done >= planned;
          return (
            <Pressable key={item.id} style={styles.exerciseRow} onPress={() => setSelectedExerciseId(item.exercise_id)}>
              <MediaThumb uri={item.exercise?.media_url} size={44} radius={theme.radius.sm} />
              <View style={styles.flex}>
                <View style={styles.nameRow}>
                  <Text variant="bodyMedium" numberOfLines={1} style={styles.flex}>{item.exercise?.name ?? 'Exercício'}</Text>
                  {item.superset_group ? <View style={styles.ssBadge}><Text variant="label" color={theme.colors.skill}>SS {item.superset_group}</Text></View> : null}
                </View>
                <Text variant="bodyMuted">{done}/{planned} séries</Text>
              </View>
              <View style={[styles.progressDot, complete && styles.progressDotOn]}>
                {complete ? <Check color={theme.colors.textInverse} size={14} /> : null}
              </View>
              <ChevronRight color={theme.colors.textMuted} size={18} />
            </Pressable>
          );
        })
      )}

      {isActive ? (
        <>
          <Pressable style={[styles.finishBtn, completeSession.isPending && styles.disabled]} onPress={finish} disabled={completeSession.isPending}>
            {completeSession.isPending ? <ActivityIndicator color={theme.colors.textInverse} /> : (
              <>
                <Trophy color={theme.colors.textInverse} size={18} />
                <Text variant="title" color={theme.colors.textInverse}>Finalizar treino</Text>
              </>
            )}
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={cancel}>
            <X color={theme.colors.hp} size={18} />
            <Text variant="title" color={theme.colors.hp}>Cancelar treino</Text>
          </Pressable>
        </>
      ) : null}
    </Screen>
  );
}

function ExerciseLogger({
  item,
  group,
  sessionId,
  isActive,
  sessionSets,
  allSessionSets,
  rest,
  onRest,
  onSwitch,
  onBack,
}: {
  item: WorkoutTemplateExercise;
  group: WorkoutTemplateExercise[];
  sessionId: string;
  isActive: boolean;
  sessionSets: WorkoutSet[];
  allSessionSets: WorkoutSet[];
  rest: number;
  onRest: (seconds: number) => void;
  onSwitch: (exerciseId: string) => void;
  onBack: () => void;
}) {
  const toast = useToast();
  const addSet = useAddWorkoutSet(sessionId);
  const deleteSet = useDeleteWorkoutSet(sessionId);
  const history = useExerciseSets(item.exercise_id);
  const [logging, setLogging] = useState<{ planned: WorkoutTemplateSet; position: number } | null>(null);

  const planned = item.sets ?? [];
  const done = [...sessionSets].sort((a, b) => a.set_number - b.set_number);
  const isSuperset = group.length > 1;

  // Histórico: últimas 3 sessões (≠ atual) com os sets deste exercício, indexados por posição.
  const last3 = useMemo(() => buildHistory(history.data ?? [], sessionId), [history.data, sessionId]);

  function restForPosition(position: number, type: WorkoutSetType) {
    const isLast = position === planned.length - 1;
    if (type === 'warmup') return item.rest_warmup_seconds;
    return isLast ? item.rest_after_seconds : item.rest_working_seconds;
  }

  // Em superset, alterna p/ o próximo exercício do grupo com séries restantes.
  // Sem rest dentro da rodada; aplica descanso quando "dá a volta" (fim da rodada).
  function advanceAfter(baseRest: number) {
    if (isSuperset) {
      const ids = group.map((g) => g.exercise_id);
      const curIdx = ids.indexOf(item.exercise_id);
      const doneFor = (exId: string) =>
        allSessionSets.filter((s) => s.exercise_id === exId).length + (exId === item.exercise_id ? 1 : 0);
      for (let step = 1; step <= group.length; step++) {
        const idx = (curIdx + step) % group.length;
        const g = group[idx];
        if (doneFor(g.exercise_id) < (g.sets?.length ?? 0)) {
          if (idx <= curIdx && baseRest > 0) onRest(item.rest_working_seconds);
          onSwitch(g.exercise_id);
          return;
        }
      }
      if (baseRest > 0) onRest(item.rest_after_seconds);
      return;
    }
    if (baseRest > 0) onRest(baseRest);
  }

  async function logSet(pset: WorkoutTemplateSet, position: number, value: LoggedValue) {
    try {
      await addSet.mutateAsync({
        exercise_id: item.exercise_id,
        set_type: pset.set_type,
        is_warmup: pset.set_type === 'warmup',
        weight: value.weight ?? 0,
        reps: value.reps ?? 0,
        duration_seconds: value.duration_seconds ?? null,
        drops: value.drops ?? null,
      });
      setLogging(null);
      advanceAfter(restForPosition(position, pset.set_type));
    } catch (e) {
      toast.error('Erro ao registrar série', formatErrorMessage(e));
    }
  }

  async function skipSet(pset: WorkoutTemplateSet) {
    try {
      await addSet.mutateAsync({
        exercise_id: item.exercise_id,
        set_type: pset.set_type,
        is_warmup: pset.set_type === 'warmup',
        is_skipped: true,
        weight: 0,
        reps: 0,
        duration_seconds: null,
        drops: null,
      });
      advanceAfter(0);
    } catch (e) {
      toast.error('Erro ao pular série', formatErrorMessage(e));
    }
  }

  async function removeLast() {
    const last = done[done.length - 1];
    if (!last) return;
    try {
      await deleteSet.mutateAsync(last.id);
    } catch (e) {
      toast.error('Erro ao remover', formatErrorMessage(e));
    }
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <BackRow label={item.exercise?.name ?? 'Exercício'} onPress={onBack} />

      <Card style={styles.heroRow}>
        <MediaThumb uri={item.exercise?.media_url} size={56} />
        <View style={styles.flex}>
          <Text variant="h2" numberOfLines={2}>{item.exercise?.name ?? 'Exercício'}</Text>
          <Text variant="bodyMuted">{item.exercise?.primaryBodyPart?.name ?? 'Sem divisão'}</Text>
        </View>
      </Card>

      {rest > 0 ? <RestBanner rest={rest} onSkip={() => onRest(0)} /> : null}

      <View style={styles.timeline}>
        {planned.map((p, position) => {
          const meta = SET_TYPE_META[p.set_type];
          const logged = done[position] ?? null;
          const hist = last3.map((sess) => ({ date: sess.date, set: sess.byPosition[position] ?? null }));
          return (
            <View key={p.id} style={styles.setBlock}>
              <View style={[styles.setBadge, { backgroundColor: meta.color }]}>
                <Text variant="label" color={theme.colors.textInverse}>{p.set_type === 'warmup' ? '▲' : String(countWorkingUpTo(planned, position))}</Text>
              </View>
              <View style={styles.flex}>
                <View style={styles.setTopRow}>
                  <Text variant="bodyMedium">{targetLabel(p)}</Text>
                  {logged && logged.is_skipped ? (
                    <Text variant="label" color={theme.colors.textMuted}>Pulado</Text>
                  ) : logged ? (
                    <View style={styles.loggedPill}>
                      <Check color={theme.colors.success} size={14} />
                      <Text variant="label" color={theme.colors.success}>{loggedLabel(logged)}</Text>
                    </View>
                  ) : isActive ? (
                    <View style={styles.registerRow}>
                      <Pressable style={styles.skipBtn} onPress={() => skipSet(p)} hitSlop={4}>
                        <Text variant="label" color={theme.colors.textMuted}>Pular</Text>
                      </Pressable>
                      <Pressable style={styles.registerBtn} onPress={() => setLogging({ planned: p, position })}>
                        <Text variant="label" color={theme.colors.primary}>Registrar</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
                {hist.some((h) => h.set) ? (
                  <View style={styles.histBox}>
                    {hist.map((h, i) => (
                      <Text key={i} variant="label" color={theme.colors.textMuted}>
                        {h.date} · {h.set ? loggedLabel(h.set) : 'Pulado'}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
        {planned.length === 0 ? <Text variant="bodyMuted">Sem séries planejadas para este exercício.</Text> : null}
      </View>

      {isActive ? (
        <View style={styles.row}>
          <Pressable style={[styles.secondaryBtn, styles.flex]} onPress={removeLast} disabled={done.length === 0}>
            <Text variant="bodyMedium" color={done.length === 0 ? theme.colors.textMuted : theme.colors.text}>Desfazer última</Text>
          </Pressable>
          <Pressable style={[styles.secondaryBtn, styles.flex]} onPress={onBack}>
            <SkipForward color={theme.colors.text} size={16} />
            <Text variant="bodyMedium">Próximo exercício</Text>
          </Pressable>
        </View>
      ) : null}

      {logging ? (
        <LogSetModal
          planned={logging.planned}
          previous={last3[0]?.byPosition[logging.position] ?? null}
          onClose={() => setLogging(null)}
          onConfirm={(value) => logSet(logging.planned, logging.position, value)}
          saving={addSet.isPending}
        />
      ) : null}
    </Screen>
  );
}

type LoggedValue = { reps: number | null; weight: number | null; duration_seconds: number | null; drops: SetDrop[] | null };

function LogSetModal({
  planned,
  previous,
  onClose,
  onConfirm,
  saving,
}: {
  planned: WorkoutTemplateSet;
  previous: WorkoutSet | null;
  onClose: () => void;
  onConfirm: (value: LoggedValue) => void;
  saving: boolean;
}) {
  const meta = SET_TYPE_META[planned.set_type];
  const [reps, setReps] = useState<number | null>(previous?.reps ?? planned.target_reps ?? 10);
  const [weight, setWeight] = useState<number | null>(previous?.weight ?? planned.target_weight ?? 20);
  const [duration, setDuration] = useState<number | null>(previous?.duration_seconds ?? planned.target_duration_seconds ?? 30);
  const [drops, setDrops] = useState<SetDrop[]>(
    (previous?.drops as SetDrop[] | null) ?? (planned.drops as SetDrop[] | null) ?? [{ reps: 8, weight: 20 }, { reps: 8, weight: 12 }],
  );

  function confirm() {
    if (planned.set_type === 'dropset') {
      const first = drops[0] ?? { reps: 0, weight: 0 };
      onConfirm({ reps: first.reps ?? 0, weight: first.weight ?? 0, duration_seconds: null, drops });
    } else if (meta.timeBased) {
      onConfirm({ reps: 0, weight, duration_seconds: duration, drops: null });
    } else {
      onConfirm({ reps, weight, duration_seconds: null, drops: null });
    }
  }

  return (
    <ModalShell title={`Registrar · ${meta.label}`} onClose={onClose}>
      {planned.set_type === 'dropset' ? (
        <View style={styles.stackSm}>
          {drops.map((d, i) => (
            <View key={i} style={styles.dropRow}>
              <Text variant="bodyMuted">{i + 1}.</Text>
              <View style={styles.flex}><NumericPickerField title="Reps" value={d.reps ?? null} onChange={(v) => setDrops(drops.map((x, j) => (j === i ? { ...x, reps: v } : x)))} min={0} max={100} step={1} placeholder="reps" /></View>
              <View style={styles.flex}><NumericPickerField title="Carga" value={d.weight ?? null} onChange={(v) => setDrops(drops.map((x, j) => (j === i ? { ...x, weight: v } : x)))} min={0} max={500} step={0.5} unit="kg" placeholder="kg" /></View>
              <Pressable onPress={() => setDrops(drops.filter((_, j) => j !== i))} hitSlop={6}><X color={theme.colors.textMuted} size={16} /></Pressable>
            </View>
          ))}
          <Pressable style={styles.addDrop} onPress={() => setDrops([...drops, { reps: 8, weight: 8 }])}>
            <Plus color={theme.colors.text} size={14} /><Text variant="label">Adicionar queda</Text>
          </Pressable>
        </View>
      ) : meta.timeBased ? (
        <View style={styles.row}>
          <View style={styles.flex}><NumericPickerField label="Tempo" title="Tempo (seg)" value={duration} onChange={setDuration} min={0} max={600} step={5} unit="s" /></View>
          <View style={styles.flex}><NumericPickerField label="Carga" title="Carga (kg)" value={weight} onChange={setWeight} min={0} max={500} step={0.5} unit="kg" /></View>
        </View>
      ) : (
        <View style={styles.row}>
          <View style={styles.flex}><NumericPickerField label="Reps" title="Repetições" value={reps} onChange={setReps} min={0} max={100} step={1} /></View>
          <View style={styles.flex}><NumericPickerField label="Carga" title="Carga (kg)" value={weight} onChange={setWeight} min={0} max={500} step={0.5} unit="kg" /></View>
        </View>
      )}
      <Pressable style={[styles.primaryBtn, saving && styles.disabled]} onPress={confirm} disabled={saving}>
        {saving ? <ActivityIndicator color={theme.colors.textInverse} /> : (
          <>
            <Check color={theme.colors.textInverse} size={18} />
            <Text variant="title" color={theme.colors.textInverse}>Registrar série</Text>
          </>
        )}
      </Pressable>
    </ModalShell>
  );
}

function RestBanner({ rest, onSkip }: { rest: number; onSkip: () => void }) {
  return (
    <View style={styles.restBanner}>
      <Timer color={theme.colors.primary} size={18} />
      <Text variant="bodyMedium" style={styles.flex}>Descanso · {formatSeconds(rest)}</Text>
      <Pressable onPress={onSkip} hitSlop={8}><Text variant="label" color={theme.colors.primary}>Pular</Text></Pressable>
    </View>
  );
}

function BackRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.backRow} onPress={onPress}>
      <ChevronLeft color={theme.colors.text} size={18} />
      <Text variant="bodyMedium" numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricItem}>
      <Text variant="stat">{value}</Text>
      <Text variant="label">{label}</Text>
    </View>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Card style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text variant="h2">{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}><X color={theme.colors.textMuted} size={22} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Card>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type HistorySession = { date: string; byPosition: Record<number, WorkoutSet> };

function buildHistory(sets: WorkoutSet[], currentSessionId: string): HistorySession[] {
  const bySession = new Map<string, { date: string; sets: WorkoutSet[] }>();
  for (const s of sets) {
    const sid = s.session_id;
    if (sid === currentSessionId) continue;
    if (s.session && s.session.status !== 'completed') continue;
    let g = bySession.get(sid);
    if (!g) {
      g = { date: s.session?.started_at ?? s.created_at, sets: [] };
      bySession.set(sid, g);
    }
    g.sets.push(s);
  }
  const sessionsArr = [...bySession.values()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
  return sessionsArr.map((sess) => {
    const ordered = [...sess.sets].sort((a, b) => a.set_number - b.set_number);
    const byPosition: Record<number, WorkoutSet> = {};
    ordered.forEach((s, i) => { byPosition[i] = s; });
    return { date: formatShortDate(sess.date), byPosition };
  });
}

function countWorkingUpTo(planned: WorkoutTemplateSet[], position: number) {
  let n = 0;
  for (let i = 0; i <= position; i++) if (planned[i].set_type !== 'warmup') n++;
  return n;
}

function targetLabel(s: WorkoutTemplateSet) {
  const meta = SET_TYPE_META[s.set_type];
  if (s.set_type === 'dropset') return 'Drop-set';
  if (meta.timeBased) return `${s.target_duration_seconds ?? 0}s${s.target_weight ? ` × ${s.target_weight}kg` : ''}`;
  return `${s.target_reps ?? '-'} × ${s.target_weight ?? 0}kg`;
}

function loggedLabel(s: WorkoutSet) {
  if (s.is_skipped) return 'Pulado';
  if ((s.set_type as WorkoutSetType) === 'dropset' && Array.isArray(s.drops)) {
    return (s.drops as SetDrop[]).map((d) => `${d.reps ?? 0}×${d.weight ?? 0}`).join(' / ');
  }
  if (s.duration_seconds) return `${s.duration_seconds}s × ${Number(s.weight)}kg`;
  return `${s.reps} × ${Number(s.weight)}kg`;
}

function minutesSince(date: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60_000));
}
function formatSeconds(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  panel: { gap: theme.spacing.md },
  flex: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  stackSm: { gap: theme.spacing.sm },
  disabled: { opacity: 0.5 },
  backRow: {
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
  focusCard: { gap: theme.spacing.md, borderColor: theme.colors.primaryBright, backgroundColor: theme.colors.surfaceSoft },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, backgroundColor: theme.colors.surfaceSoft },
  metricStrip: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    padding: theme.spacing.sm,
  },
  metricItem: { flex: 1, minHeight: 56, borderRadius: theme.radius.sm, justifyContent: 'center', paddingHorizontal: theme.spacing.sm },
  exerciseRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    padding: theme.spacing.md,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  ssBadge: { borderWidth: 1, borderColor: theme.colors.skill, borderRadius: theme.radius.sm, paddingHorizontal: theme.spacing.xs, paddingVertical: 1 },
  progressDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  progressDotOn: { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
  timeline: { gap: theme.spacing.md },
  setBlock: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' },
  setBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  setTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  loggedPill: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  registerRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  skipBtn: { minHeight: 32, paddingHorizontal: theme.spacing.sm, justifyContent: 'center' },
  registerBtn: { minHeight: 32, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.primary, paddingHorizontal: theme.spacing.md, justifyContent: 'center' },
  histBox: { marginTop: theme.spacing.xs, gap: 1 },
  finishBtn: { minHeight: theme.sizes.touch, borderRadius: theme.radius.md, backgroundColor: theme.colors.success, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
  cancelBtn: { minHeight: theme.sizes.touch, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.hp, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
  secondaryBtn: { minHeight: theme.sizes.touch, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
  primaryBtn: { minHeight: theme.sizes.touch, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.primaryBright, backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
  restBanner: { minHeight: 44, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryDim, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md },
  dropRow: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.xs },
  addDrop: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, alignSelf: 'flex-start' },
  backdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end', padding: theme.spacing.lg },
  modalCard: { maxHeight: '85%', gap: theme.spacing.md, borderColor: theme.colors.primaryDim },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  modalContent: { gap: theme.spacing.md, paddingBottom: theme.spacing.md },
});
