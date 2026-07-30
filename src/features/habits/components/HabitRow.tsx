import { useRouter } from 'expo-router';
import { Ban, Check, Flame, Pencil, RotateCcw, ShieldCheck, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/bars/ProgressBar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { ACHIEVEMENT_BY_KEY } from '@/features/achievements/catalog';
import { useCharacter } from '@/features/character/hooks/useCharacter';
import { useDifficulties } from '../hooks/useDifficulties';
import { useLevelUp } from '@/providers/LevelUpProvider';
import { openWeb } from '@/lib/openWeb';
import { theme } from '@/theme/theme';
import { formatErrorMessage } from '@/utils/errors';
import type { Habit } from '../hooks/useHabits';
import { useHabitLogs } from '../hooks/useHabitLogs';
import type { HabitProgress, PeriodProgress } from '../hooks/useTodayLogs';
import type { HabitLog } from '../hooks/useTodayLogs';
import { useCompleteHabit, useRelapse, useSettleToday, useUndoLast } from '../hooks/useHabitMutations';
import { DIFFICULTY_META, dailyTarget, isDueToday, scheduleDescription } from '../meta';
import { DeathModal } from './DeathModal';
import { formatDateOnly } from '@/utils/date';

type Props = {
  habit: Habit;
  progress: HabitProgress;
  periodProgress?: PeriodProgress | null;
  weekday: number;
};

export function HabitRow({ habit, progress, periodProgress, weekday }: Props) {
  const router = useRouter();
  const complete = useCompleteHabit();
  const relapse = useRelapse();
  const settle = useSettleToday();
  const undo = useUndoLast();
  const { celebrate } = useLevelUp();
  const toast = useToast();
  const character = useCharacter();
  const difficulties = useDifficulties();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deathOpen, setDeathOpen] = useState(false);
  const history = useHabitLogs(historyOpen ? habit.id : undefined);

  const busy =
    complete.isPending || relapse.isPending || settle.isPending || undo.isPending;
  const due = isDueToday(habit, weekday);
  const settled = progress.settled; // dia já fechado (manual ou cron)
  // Progresso do dia é sempre contra a META DIÁRIA (modelo de dois níveis).
  const dTarget = dailyTarget(habit);
  const diff = DIFFICULTY_META[habit.difficulty];
  const isPositive = habit.type === 'positive';
  // Recompensa base vinda do servidor (GET /difficulties) — visível antes de agir.
  const reward = difficulties.data?.[habit.difficulty] ?? null;
  const rewardLabel = reward
    ? `${isPositive ? 'Vale' : 'Evitar rende'} +${reward.xp} XP · +${reward.gold} ouro`
    : null;

  const doneToday = isPositive ? progress.success : progress.fail;
  const ratio = dTarget > 0 ? Math.min(1, doneToday / dTarget) : 0;

  // Dia completo (positivo) — visual; NÃO bloqueia mais o botão (overshoot livre).
  const dayComplete = isPositive && progress.success >= dTarget;
  const negativeFailed = !isPositive && progress.fail >= dTarget;
  const settledSuccess = settled ? (isPositive ? dayComplete : progress.fail < dTarget) : false;
  const isExtraExecution = isPositive ? dayComplete : progress.fail > 0;
  const compactCompleted = due && (isPositive ? dayComplete : settled || negativeFailed);
  const compactSuccess = isPositive ? dayComplete : !negativeFailed && (settled ? settledSuccess : true);
  const extraLabel = 'Extra';
  const extraColor = isPositive ? theme.colors.success : theme.colors.hp;
  const ExtraIcon = isPositive ? Check : TriangleAlert;
  // Fechar o dia manualmente só faz sentido se ainda não decidido:
  // positivo ainda não completo / negativo ainda não estourou o limite.
  const canSettle = isPositive ? !dayComplete : progress.fail < dTarget;
  const accent = !due
    ? theme.colors.border
    : isPositive
      ? dayComplete
        ? theme.colors.success
        : theme.colors.primary
      : progress.fail > 0
        ? theme.colors.hp
        : theme.colors.success;

  function handleError(e: unknown) {
    toast.error('Não foi possível concluir', formatErrorMessage(e));
  }

  function onComplete() {
    complete.mutate(
      { habitId: habit.id },
      {
        onError: handleError,
        onSuccess: (res) => {
          if (res.leveledUp) celebrate(res.newLevel);
          if (res.xpGained > 0 || res.goldGained > 0) {
            // recompensa caiu: completou o dia ou foi overshoot (bônus extra)
            toast.success(
              res.dayComplete ? 'Dia completo!' : 'Bônus extra',
              `+${res.xpGained} XP · +${res.goldGained} ouro · sequência ${res.newStreak}`,
            );
          } else {
            // registrou execução, mas ainda não bateu a meta do dia (sem recompensa ainda)
            toast.info('Registrado', `${res.doneToday}/${res.dailyTarget} hoje`);
          }
          const keys = res.newAchievements ?? [];
          if (keys.length > 0) {
            const titles = keys.map((k) => ACHIEVEMENT_BY_KEY[k]?.title ?? k).join(', ');
            toast.success('Conquista desbloqueada', titles);
          }
        },
      },
    );
  }
  function onRelapse() {
    relapse.mutate(
      { habitId: habit.id },
      {
        onError: handleError,
        onSuccess: (res) => {
          if (res.died) {
            setDeathOpen(true);
          } else if (res.failed) {
            toast.warning('Limite atingido', `Você tomou ${res.damageTaken} de dano.`);
          } else {
            toast.warning('Recaída registrada', `${res.relapses}/${res.limit} hoje.`);
          }
        },
      },
    );
  }
  function onUndo() {
    undo.mutate(
      { habitId: habit.id },
      {
        onError: handleError,
        onSuccess: () => toast.info('Último registro desfeito'),
      },
    );
  }
  // Fechamento manual de hoje: "Não fiz" (positivo) / "Evitei" (negativo).
  function onSettle() {
    settle.mutate(
      { habitId: habit.id },
      {
        onError: handleError,
        onSuccess: (res) => {
          if (res.died) {
            setDeathOpen(true);
            return;
          }
          if (res.resisted) {
            toast.success('Dia evitado', `+${res.xp ?? 0} XP · +${res.gold ?? 0} ouro`);
          } else if ((res.damage ?? 0) > 0) {
            toast.warning('Dia fechado', `Você tomou ${res.damage} de dano.`);
          } else {
            toast.info('Dia fechado', 'Registrado como não feito.');
          }
        },
      },
    );
  }

  if (compactCompleted) {
    return (
      <>
        <Card
          accent={accent}
          style={[
            styles.compactCard,
            compactSuccess ? styles.closedSuccessCard : styles.closedFailCard,
          ]}
        >
          <View style={styles.compactRow}>
            <Pressable
              style={styles.compactMain}
              onPress={() => setHistoryOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Abrir histórico do hábito"
            >
              <View style={[styles.compactStatusDot, compactSuccess ? styles.compactStatusGood : styles.compactStatusBad]}>
                {compactSuccess ? (
                  <ShieldCheck color={theme.colors.success} size={16} />
                ) : (
                  <TriangleAlert color={theme.colors.hp} size={16} />
                )}
              </View>
              <View style={styles.titleCol}>
                <Text variant="title" numberOfLines={1}>
                  {habit.name}
                </Text>
                <Text variant="label" color={compactSuccess ? theme.colors.success : theme.colors.hp}>
                  {compactSuccess ? 'Resolvido hoje' : 'Limite atingido'}
                </Text>
              </View>
              <View style={styles.compactStreak}>
                <Flame color={theme.colors.primary} size={16} />
                <Text variant="title" color={theme.colors.primary}>
                  {habit.current_streak}
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={isPositive ? onComplete : onRelapse}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={extraLabel}
              style={[styles.compactExtraBtn, { borderColor: extraColor }, busy && styles.disabled]}
            >
              <ExtraIcon color={extraColor} size={17} />
            </Pressable>
            <Pressable
              onPress={() => void openWeb(`/habits?habit=${habit.id}`)}
              hitSlop={10}
              accessibilityLabel="Editar hábito"
              style={styles.edit}
            >
              <Pencil color={theme.colors.textMuted} size={18} />
            </Pressable>
          </View>
        </Card>
        <HabitHistoryModal
          visible={historyOpen}
          habit={habit}
          progress={progress}
          logs={history.data ?? []}
          loading={history.isFetching}
          onClose={() => setHistoryOpen(false)}
          onExtra={isPositive ? onComplete : onRelapse}
          extraLabel={extraLabel}
          extraColor={extraColor}
          ExtraIcon={ExtraIcon}
          extraDisabled={busy}
          onUndo={onUndo}
          undoDisabled={busy}
        />
        <DeathModal
          visible={deathOpen}
          mode={character.data?.death_mode}
          onClose={() => setDeathOpen(false)}
        />
      </>
    );
  }

  return (
    <>
    <Card
      accent={accent}
      style={[
        !due ? styles.dimmed : null,
        settled ? (settledSuccess ? styles.closedSuccessCard : styles.closedFailCard) : null,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <Text variant="title" numberOfLines={1}>
            {habit.name}
          </Text>
          <Text variant="bodyMuted">{scheduleDescription(habit)}</Text>
        </View>
        <View style={styles.badge}>
          <Text variant="label" color={diff.color}>
            {diff.label}
          </Text>
        </View>
        <Pressable
          onPress={() => void openWeb(`/habits?habit=${habit.id}`)}
          hitSlop={10}
          accessibilityLabel="Detalhes do hábito"
          style={styles.edit}
        >
          <Pencil color={theme.colors.textMuted} size={18} />
        </Pressable>
      </View>

      {/* skills */}
      {(habit.primarySkill || habit.secondarySkill) && (
        <View style={styles.skillsRow}>
          {habit.primarySkill && (
            <SkillTag name={habit.primarySkill.name} color={habit.primarySkill.color} />
          )}
          {habit.secondarySkill && (
            <SkillTag name={habit.secondarySkill.name} color={habit.secondarySkill.color} dim />
          )}
        </View>
      )}

      {/* progresso */}
      <View style={styles.progressBlock}>
        <View style={styles.progressLabelRow}>
          <Text variant="label" color={theme.colors.text}>
            {isPositive
              ? `${doneToday}/${dTarget} hoje`
              : `Recaídas: ${progress.fail}/${dTarget} hoje`}
          </Text>
          <View style={styles.streak}>
            <Flame color={theme.colors.primary} size={14} />
            <Text variant="bodyMuted">{habit.current_streak}</Text>
          </View>
        </View>
        <ProgressBar
          progress={ratio}
          color={isPositive ? theme.colors.success : theme.colors.hp}
        />
        {rewardLabel ? (
          <Text variant="label" color={theme.colors.xp}>
            {rewardLabel}
          </Text>
        ) : null}
      </View>

      {/* progresso de DIAS no período (só nos flexíveis) */}
      {periodProgress && (
        <View style={styles.periodBlock}>
          <Text variant="label" color={theme.colors.textMuted}>
            {`${periodProgress.done}/${periodProgress.target} dias · ${periodProgress.unit}`}
          </Text>
          <ProgressBar
            progress={
              periodProgress.target > 0
                ? Math.min(1, periodProgress.done / periodProgress.target)
                : 0
            }
            color={theme.colors.xp}
            height={4}
          />
        </View>
      )}

      {/* ações */}
      {!due ? (
        <Text variant="bodyMuted" style={styles.notToday}>
          Não é hoje
        </Text>
      ) : settled ? (
        <View style={styles.closedPanel}>
          <View style={[styles.closedStatus, settledSuccess ? styles.closedStatusGood : styles.closedStatusBad]}>
            {settledSuccess ? (
              <ShieldCheck color={theme.colors.success} size={17} />
            ) : (
              <TriangleAlert color={theme.colors.hp} size={17} />
            )}
            <View style={styles.settledText}>
              <Text variant="label" color={settledSuccess ? theme.colors.success : theme.colors.hp}>
                {settledSuccess ? 'Dia fechado com sucesso' : 'Dia fechado com falha'}
              </Text>
              <Text variant="bodyMuted">
                {isPositive ? `${progress.success}/${dTarget} execuções` : `${progress.fail}/${dTarget} recaídas`}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={onUndo}
            disabled={busy}
            style={styles.undoBtn}
            accessibilityLabel="Desfazer fechamento"
          >
            <RotateCcw color={theme.colors.textMuted} size={18} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.actions}>
          {isPositive ? (
            <ActionButton
              // overshoot livre: dia completo vira "Concluir +" (bônus), sem travar
              label={dayComplete ? 'Concluir +' : 'Concluir'}
              icon={<Check color={isExtraExecution ? theme.colors.success : theme.colors.textInverse} size={18} />}
              color={theme.colors.success}
              onPress={onComplete}
              disabled={busy}
              extra={isExtraExecution}
            />
          ) : (
            <ActionButton
              label="Recaí"
              icon={<TriangleAlert color={isExtraExecution ? theme.colors.hp : theme.colors.textInverse} size={18} />}
              color={theme.colors.hp}
              onPress={onRelapse}
              disabled={busy}
              extra={isExtraExecution}
            />
          )}
          {/* fechamento manual do dia: positivo "Não fiz", negativo "Evitei" */}
          {canSettle && (
            <OutlineAction
              label={isPositive ? 'Não fiz' : 'Evitei'}
              icon={
                isPositive ? (
                  <Ban color={theme.colors.hp} size={16} />
                ) : (
                  <ShieldCheck color={theme.colors.success} size={16} />
                )
              }
              color={isPositive ? theme.colors.hp : theme.colors.success}
              onPress={onSettle}
              disabled={busy}
            />
          )}
          {doneToday > 0 && (
            <Pressable
              onPress={onUndo}
              disabled={busy}
              style={styles.undoBtn}
              accessibilityLabel="Desfazer"
            >
              <RotateCcw color={theme.colors.textMuted} size={18} />
            </Pressable>
          )}
        </View>
      )}
    </Card>
    <DeathModal
      visible={deathOpen}
      mode={character.data?.death_mode}
      onClose={() => setDeathOpen(false)}
    />
    </>
  );
}

function SkillTag({ name, color, dim }: { name: string; color: string | null; dim?: boolean }) {
  const c = color ?? theme.colors.skill;
  return (
    <View style={[styles.skillTag, { borderColor: c, opacity: dim ? 0.7 : 1 }]}>
      <Text variant="label" color={c}>
        {name}
        {dim ? ' (50%)' : ''}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  color,
  onPress,
  disabled,
  extra,
}: {
  label: string;
  icon: React.ReactNode;
  color: string;
  onPress: () => void;
  disabled?: boolean;
  extra?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: color },
        extra ? styles.extraAction : null,
        extra ? { borderColor: color } : null,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {icon}
      <Text variant="title" color={extra ? color : theme.colors.textInverse} style={styles.actionLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

function OutlineAction({
  label,
  icon,
  color,
  onPress,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.outlineAction,
        { borderColor: color },
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {icon}
      <Text variant="label" color={color}>
        {label}
      </Text>
    </Pressable>
  );
}

function HabitHistoryModal({
  visible,
  habit,
  progress,
  logs,
  loading,
  onClose,
  onExtra,
  extraLabel,
  extraColor,
  ExtraIcon,
  extraDisabled,
  onUndo,
  undoDisabled,
}: {
  visible: boolean;
  habit: Habit;
  progress: HabitProgress;
  logs: HabitLog[];
  loading: boolean;
  onClose: () => void;
  onExtra: () => void;
  extraLabel: string;
  extraColor: string;
  ExtraIcon: typeof Check;
  extraDisabled: boolean;
  onUndo: () => void;
  undoDisabled: boolean;
}) {
  const recent = logs.slice(0, 20);
  const successCount = logs.filter((log) => log.success).length;
  const failCount = logs.filter((log) => !log.success).length;
  const totalXp = logs.reduce((sum, log) => sum + Number(log.xp_gained ?? 0), 0);
  const totalGold = logs.reduce((sum, log) => sum + Number(log.gold_gained ?? 0), 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Card accent={theme.colors.success} style={styles.historyModal}>
          <View style={styles.historyHeader}>
            <View style={styles.titleCol}>
              <Text variant="h2">{habit.name}</Text>
              <Text variant="bodyMuted">Histórico recente</Text>
            </View>
            <View style={styles.historyHeaderActions}>
              <Pressable
                onPress={onExtra}
                disabled={extraDisabled}
                accessibilityRole="button"
                accessibilityLabel={extraLabel}
                style={[styles.modalExtraBtn, { borderColor: extraColor }, extraDisabled && styles.disabled]}
              >
                <ExtraIcon color={extraColor} size={17} />
                <Text variant="label" color={extraColor}>{extraLabel}</Text>
              </Pressable>
              <Pressable
                onPress={onUndo}
                disabled={undoDisabled}
                accessibilityRole="button"
                accessibilityLabel="Voltar execução"
                style={[styles.modalUndoBtn, undoDisabled && styles.disabled]}
              >
                <RotateCcw color={theme.colors.textMuted} size={17} />
                <Text variant="label" color={theme.colors.textMuted}>Voltar</Text>
              </Pressable>
              <Pressable onPress={onClose} accessibilityLabel="Fechar" style={styles.modalClose}>
                <Text variant="title">×</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.historyStats}>
            <HistoryStat label="Streak" value={habit.current_streak} color={theme.colors.primary} />
            <HistoryStat label="Melhor" value={habit.best_streak} color={theme.colors.gold} />
            <HistoryStat label="Hoje" value={habit.type === 'positive' ? progress.success : progress.fail} color={theme.colors.success} />
          </View>
          <View style={styles.historyStats}>
            <HistoryStat label="Sucessos" value={successCount} color={theme.colors.success} />
            <HistoryStat label="Falhas" value={failCount} color={theme.colors.hp} />
            <HistoryStat label="Ganhos" value={`${totalXp}/${totalGold}`} color={theme.colors.xp} />
          </View>

          {loading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : recent.length === 0 ? (
            <Text variant="bodyMuted">Nenhum registro encontrado.</Text>
          ) : (
            <ScrollView style={styles.historyList} contentContainerStyle={styles.historyContent} showsVerticalScrollIndicator={false}>
              {recent.map((log) => (
                <View key={log.id} style={styles.historyRow}>
                  <View style={[styles.historyDot, { backgroundColor: log.success ? theme.colors.success : theme.colors.hp }]} />
                  <View style={styles.titleCol}>
                    <Text variant="bodyMedium">{formatDateOnly(log.occurred_on, { year: true })}</Text>
                    <Text variant="bodyMuted">
                      {log.is_auto ? 'Fechamento' : 'Manual'} · {log.success ? 'sucesso' : 'falha'}
                    </Text>
                  </View>
                  <Text variant="label" color={log.success ? theme.colors.success : theme.colors.hp}>
                    {log.success ? `+${log.xp_gained} XP` : `-${log.damage_taken} HP`}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </Card>
      </View>
    </Modal>
  );
}

function HistoryStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={styles.historyStat}>
      <Text variant="label">{label}</Text>
      <Text variant="title" color={color}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dimmed: { opacity: 0.55 },
  compactCard: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  compactMain: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  compactStatusDot: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactStatusGood: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success + '14',
  },
  compactStatusBad: {
    borderColor: theme.colors.hp,
    backgroundColor: theme.colors.hp + '14',
  },
  compactStreak: {
    minWidth: 54,
    minHeight: 36,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryDim,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
  },
  compactExtraBtn: {
    width: theme.sizes.touch,
    height: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closedSuccessCard: {
    backgroundColor: theme.colors.success + '12',
    borderColor: theme.colors.success,
  },
  closedFailCard: {
    backgroundColor: theme.colors.hp + '12',
    borderColor: theme.colors.hp,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  titleCol: { flex: 1, gap: 2 },
  badge: {
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  edit: {
    width: theme.sizes.touch,
    height: theme.sizes.touch,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillsRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md, flexWrap: 'wrap' },
  skillTag: {
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  progressBlock: { marginTop: theme.spacing.md, gap: theme.spacing.xs },
  periodBlock: { marginTop: theme.spacing.sm, gap: theme.spacing.xs },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  notToday: { marginTop: theme.spacing.md },
  actions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md, alignItems: 'center' },
  action: {
    flex: 1,
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  extraAction: {
    flex: 0,
    minWidth: 128,
    borderStyle: 'dashed',
    backgroundColor: theme.colors.surfaceSoft,
  },
  actionLabel: { fontSize: theme.fontSizes.md },
  outlineAction: {
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  closedPanel: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    alignItems: 'stretch',
  },
  closedStatus: {
    flex: 1,
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  closedStatusGood: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success + '14',
  },
  closedStatusBad: {
    borderColor: theme.colors.hp,
    backgroundColor: theme.colors.hp + '14',
  },
  settledText: { flex: 1 },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.45 },
  undoBtn: {
    minHeight: theme.sizes.touch,
    minWidth: theme.sizes.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  historyModal: {
    maxHeight: '84%',
    gap: theme.spacing.md,
  },
  historyHeader: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: theme.spacing.md,
  },
  historyHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  modalExtraBtn: {
    flex: 1,
    minWidth: 132,
    minHeight: 38,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  modalUndoBtn: {
    flex: 1,
    minWidth: 132,
    minHeight: 38,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  modalClose: {
    width: theme.sizes.touch,
    height: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyStats: { flexDirection: 'row', gap: theme.spacing.sm },
  historyStat: {
    flex: 1,
    minHeight: 58,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
    gap: 2,
  },
  historyList: { maxHeight: 340 },
  historyContent: { gap: theme.spacing.sm },
  historyRow: {
    minHeight: 58,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  historyDot: { width: 10, height: 10, borderRadius: 5 },
});
