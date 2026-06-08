import { useRouter } from 'expo-router';
import { Ban, Check, Flame, Pencil, RotateCcw, ShieldCheck, TriangleAlert } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/bars/ProgressBar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { ACHIEVEMENT_BY_KEY } from '@/features/achievements/catalog';
import { useLevelUp } from '@/providers/LevelUpProvider';
import { theme } from '@/theme/theme';
import { formatErrorMessage } from '@/utils/errors';
import type { Habit } from '../hooks/useHabits';
import type { HabitProgress, PeriodProgress } from '../hooks/useTodayLogs';
import { useCompleteHabit, useRelapse, useSettleToday, useUndoLast } from '../hooks/useHabitMutations';
import { DIFFICULTY_META, dailyTarget, isDueToday, scheduleDescription } from '../meta';

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

  const busy =
    complete.isPending || relapse.isPending || settle.isPending || undo.isPending;
  const due = isDueToday(habit, weekday);
  const settled = progress.settled; // dia já fechado (manual ou cron)
  // Progresso do dia é sempre contra a META DIÁRIA (modelo de dois níveis).
  const dTarget = dailyTarget(habit);
  const diff = DIFFICULTY_META[habit.difficulty];
  const isPositive = habit.type === 'positive';

  const doneToday = isPositive ? progress.success : progress.fail;
  const ratio = dTarget > 0 ? Math.min(1, doneToday / dTarget) : 0;

  // Dia completo (positivo) — visual; NÃO bloqueia mais o botão (overshoot livre).
  const dayComplete = isPositive && progress.success >= dTarget;
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
            Alert.alert('Você morreu', 'HP chegou a zero. O personagem foi resetado.');
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
            Alert.alert('Você morreu', 'HP chegou a zero. O personagem foi resetado.');
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

  return (
    <Card accent={accent} style={!due ? styles.dimmed : undefined}>
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
          onPress={() => router.push({ pathname: '/(app)/habits/[id]', params: { id: habit.id } })}
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
        <View style={styles.actions}>
          <Text variant="bodyMuted" style={styles.settledText}>
            Dia fechado
          </Text>
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
              icon={<Check color={theme.colors.textInverse} size={18} />}
              color={theme.colors.success}
              onPress={onComplete}
              disabled={busy}
            />
          ) : (
            <ActionButton
              label="Recaí"
              icon={<TriangleAlert color={theme.colors.textInverse} size={18} />}
              color={theme.colors.hp}
              onPress={onRelapse}
              disabled={busy}
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
        styles.action,
        { backgroundColor: color },
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {icon}
      <Text variant="title" color={theme.colors.textInverse} style={styles.actionLabel}>
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

const styles = StyleSheet.create({
  dimmed: { opacity: 0.55 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  titleCol: { flex: 1, gap: 2 },
  badge: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  edit: { padding: 4 },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  actionLabel: { fontSize: theme.fontSizes.md },
  outlineAction: {
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
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
  },
});
