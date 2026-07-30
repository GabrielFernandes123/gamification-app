import { Handshake, ShieldOff, Target } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { theme } from '@/theme/theme';
import { formatErrorMessage } from '@/utils/errors';
import { useEndTruce, usePlanToday, useSetPlan, useStartTruce } from './hooks/usePlan';

/**
 * Plano do dia e modo trégua, na Início (doc 14 §5.2⑦ e §5.3⑩).
 *
 * Os dois no mesmo cartão porque são a mesma pergunta por ângulos opostos:
 * **quanto você espera de si hoje** — e, quando a resposta é "hoje não dá",
 * a trégua é o botão honesto para isso, em vez de simplesmente falhar.
 *
 * ── O que a tela deixa claro, e por quê ─────────────────────────────────
 * "Errar não custa nada" está escrito na interface, não só no backend. Se a
 * pessoa suspeitar que a previsão vira cobrança, ela vai prever baixo para se
 * proteger — e o número deixa de medir qualquer coisa.
 */
export function PlanCard() {
  const toast = useToast();
  const today = usePlanToday();
  const setPlan = useSetPlan();
  const startTruce = useStartTruce();
  const endTruce = useEndTruce();

  const data = today.data;
  // Sugestão inicial: quantos hábitos valem hoje. É o palpite mais provável, e
  // deixa o cartão a um toque de distância de estar preenchido.
  const [draft, setDraft] = useState<number | null>(null);
  const value = draft ?? data?.plan?.plannedHabits ?? data?.due ?? 0;

  if (!data) return null;

  if (data.truce) {
    return (
      <Card style={styles.card} accent={theme.colors.skill}>
        <View style={styles.head}>
          <Handshake color={theme.colors.skill} size={20} />
          <Text variant="title" style={styles.flex}>
            Trégua ativa
          </Text>
        </View>
        <Text variant="bodyMuted">
          {data.truce.endsOn
            ? `Até ${formatDay(data.truce.endsOn)}. `
            : 'Sem data de fim. '}
          Hábito falho não tira HP e a sequência não zera.
        </Text>
        <Text variant="label" color={theme.colors.textSubtle}>
          A janela do boss continua correndo — você descansa da punição, não do tempo.
        </Text>
        <Button
          label="Encerrar trégua"
          variant="outline"
          size="sm"
          loading={endTruce.isPending}
          onPress={() => void endTruce.mutateAsync()}
        />
      </Card>
    );
  }

  const closed = Boolean(data.plan?.closedAt);

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Target color={theme.colors.primary} size={20} />
        <Text variant="title" style={styles.flex}>
          Plano do dia
        </Text>
        <Text variant="label">
          {data.completed} feito{data.completed === 1 ? '' : 's'}
        </Text>
      </View>

      <View style={styles.row}>
        <NumberStepper
          value={value}
          onChange={setDraft}
          min={0}
          max={30}
          accessibilityLabel="Quantos hábitos você faz hoje"
        />
        <Text variant="bodyMuted" style={styles.flex}>
          hábitos hoje{data.due > 0 ? ` · ${data.due} valem` : ''}
        </Text>
      </View>

      {!closed ? (
        <Button
          label={data.plan ? 'Atualizar previsão' : 'Declarar'}
          size="sm"
          loading={setPlan.isPending}
          onPress={() =>
            void setPlan
              .mutateAsync({ plannedHabits: value })
              .catch((error) =>
                toast.error('Não deu para salvar', formatErrorMessage(error)),
              )
          }
        />
      ) : null}

      <Text variant="bodyMuted" style={styles.fine}>
        Acertar rende bônus. Errar não custa nada — é calibração, não meta.
      </Text>

      <Button
        label="Hoje não dá: pedir trégua"
        variant="ghost"
        size="sm"
        icon={<ShieldOff color={theme.colors.textMuted} size={15} />}
        loading={startTruce.isPending}
        onPress={() =>
          void startTruce
            .mutateAsync({ endsOn: inDays(2) })
            .catch((error) =>
              toast.error('Não deu para abrir a trégua', formatErrorMessage(error)),
            )
        }
      />
    </Card>
  );
}

/**
 * Trégua padrão de dois dias.
 *
 * Curta de propósito: a saída fácil precisa ter fim marcado, senão vira
 * abandono com outro nome. Renovar é um toque; nunca acabar, não.
 */
function inDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatDay(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  flex: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  fine: { fontSize: theme.fontSizes.xs },
});
