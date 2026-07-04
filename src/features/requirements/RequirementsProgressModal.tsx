import { CheckCircle2, Circle, X } from 'lucide-react-native';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/bars/ProgressBar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import type { RequirementProgress } from '@/features/objectives/hooks/useObjectives';
import { theme } from '@/theme/theme';
import {
  useRequirementsEvaluation,
  type RequirementOwnerType,
} from './useRequirementsEvaluation';

// Modal reutilizável: mostra o progresso real (atual/alvo) de cada requisito
// de um dono (recompensa, meta, contrato...), avaliado ao vivo pelo servidor.
type Props = {
  visible: boolean;
  ownerType: RequirementOwnerType;
  ownerId: string | null;
  title?: string;
  onClose: () => void;
};

const METRIC_LABEL: Record<string, string> = {
  habit_success_days: 'Dias de hábito cumpridos',
  habit_executions: 'Execuções de hábito',
  habit_clean_days: 'Dias limpos',
  habit_failed_days: 'Dias com falha',
  workout_sessions: 'Treinos concluídos',
  workout_volume: 'Volume de treino',
  body_measurement_count: 'Medidas corporais',
  sidequest_completed: 'Side quests concluídas',
  xp_gained: 'XP ganho',
  gold_gained: 'Ouro ganho',
};

const SCOPE_LABEL: Record<string, string> = {
  today: 'hoje',
  current_week: 'nesta semana',
  current_month: 'neste mês',
  lifetime: 'desde sempre',
  since_created: 'desde a criação',
  since_last_claim: 'desde o último resgate',
  custom: 'no período definido',
};

function metricLabel(metric: string) {
  return METRIC_LABEL[metric] ?? metric.replaceAll('_', ' ');
}

function groupLabel(mode: 'all' | 'any' | 'at_least', requiredCount: number, total: number) {
  if (mode === 'all') return `Cumprir todos (${total})`;
  if (mode === 'any') return 'Cumprir pelo menos 1';
  return `Cumprir pelo menos ${requiredCount}`;
}

export function RequirementsProgressModal({ visible, ownerType, ownerId, title, onClose }: Props) {
  const evaluation = useRequirementsEvaluation(ownerType, visible ? ownerId : null);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Card style={styles.card}>
          <View style={styles.header}>
            <View style={styles.flex}>
              <Text variant="h2">O que falta</Text>
              {title ? (
                <Text variant="bodyMuted" numberOfLines={1}>
                  {title}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fechar">
              <X color={theme.colors.textMuted} size={22} />
            </Pressable>
          </View>

          {evaluation.isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : evaluation.error ? (
            <Text variant="bodyMuted" color={theme.colors.hp}>
              Não foi possível avaliar os requisitos agora.
            </Text>
          ) : (evaluation.data?.groups ?? []).length === 0 ? (
            <Text variant="bodyMuted">Nenhum requisito configurado.</Text>
          ) : (
            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              {evaluation.data!.groups.map((group) => (
                <View key={group.id} style={styles.group}>
                  <View style={styles.groupHead}>
                    <Text variant="label" color={group.passed ? theme.colors.success : theme.colors.gold}>
                      {groupLabel(group.mode, group.requiredCount, group.requirements.length)}
                    </Text>
                    <Text variant="label" color={group.passed ? theme.colors.success : theme.colors.textMuted}>
                      {group.passedCount}/{group.requiredCount}
                    </Text>
                  </View>
                  {group.requirements.map((req) => (
                    <RequirementRow key={req.id} req={req} />
                  ))}
                </View>
              ))}
            </ScrollView>
          )}

          {evaluation.data ? (
            <View style={[styles.footer, { borderColor: evaluation.data.passed ? theme.colors.success : theme.colors.border }]}>
              <Text
                variant="bodyMedium"
                color={evaluation.data.passed ? theme.colors.success : theme.colors.textMuted}
              >
                {evaluation.data.passed
                  ? 'Tudo cumprido — liberado!'
                  : 'Continue avançando para liberar.'}
              </Text>
            </View>
          ) : null}
        </Card>
      </View>
    </Modal>
  );
}

function RequirementRow({ req }: { req: RequirementProgress }) {
  const target = Math.max(0, req.targetValue);
  // Para "lte" (não passar de X) barra cheia = ainda dentro do limite.
  const progress =
    req.operator === 'lte'
      ? req.passed
        ? 1
        : target > 0
          ? Math.min(1, target / Math.max(1, req.currentValue))
          : 0
      : target > 0
        ? Math.min(1, req.currentValue / target)
        : req.passed
          ? 1
          : 0;
  const scope = SCOPE_LABEL[req.periodScope] ?? null;

  return (
    <View style={styles.reqRow}>
      {req.passed ? (
        <CheckCircle2 color={theme.colors.success} size={18} />
      ) : (
        <Circle color={theme.colors.textMuted} size={18} />
      )}
      <View style={styles.flex}>
        <View style={styles.reqTop}>
          <Text variant="bodyMedium" style={styles.flex} numberOfLines={1}>
            {metricLabel(req.metric)}
          </Text>
          <Text variant="bodyMedium" color={req.passed ? theme.colors.success : theme.colors.text}>
            {req.currentValue}/{operatorPrefix(req.operator)}
            {req.targetValue}
          </Text>
        </View>
        <ProgressBar
          progress={progress}
          color={req.passed ? theme.colors.success : theme.colors.gold}
          height={6}
        />
        {scope ? <Text variant="label">Conta {scope}</Text> : null}
      </View>
    </View>
  );
}

function operatorPrefix(operator: RequirementProgress['operator']) {
  if (operator === 'lte') return 'máx ';
  if (operator === 'eq') return '= ';
  return '';
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: { maxHeight: '80%', gap: theme.spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  flex: { flex: 1, minWidth: 0 },
  loading: { paddingVertical: theme.spacing.xl, alignItems: 'center' },
  list: { gap: theme.spacing.lg },
  group: { gap: theme.spacing.md },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  reqRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
  reqTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: 4,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: theme.spacing.md,
  },
});
