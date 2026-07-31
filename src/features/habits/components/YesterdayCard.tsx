import { RotateCcw } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { theme } from '@/theme/theme';
import { formatErrorMessage } from '@/utils/errors';
import { damageExplanation } from '../meta';
import { useCorrectYesterday, useYesterdayPending } from '../hooks/useYesterday';

/**
 * "Ontem fechou sozinho" — a janela de correção, na Início.
 *
 * ── O que resolve ────────────────────────────────────────────────────────
 * Você fez o hábito, esqueceu de marcar, e o fechamento automático te cobrou
 * dano e zerou a sequência. Isso não ensina disciplina: ensina que os números
 * não são confiáveis, e daí para frente o resto da gamificação perde efeito.
 *
 * ── Card, não modal ──────────────────────────────────────────────────────
 * Abrir o app e levar um pop-up bloqueante com a lista do que você falhou é um
 * ritual de punição logo cedo. O card fica ACIMA do plano do dia — fecha o
 * passado antes de abrir o presente — e some sozinho quando não há nada a
 * corrigir, que é a maioria dos dias.
 *
 * ── Os dois sentidos ─────────────────────────────────────────────────────
 * Também dá para registrar a recaída esquecida. Uma ferramenta que só apaga
 * consequência não é correção, é desfazer dano — e corrói justamente a
 * confiança que ela veio consertar.
 */
export function YesterdayCard() {
  const pending = useYesterdayPending();
  const correct = useCorrectYesterday();
  const toast = useToast();

  const items = pending.data ?? [];
  if (items.length === 0) return null;

  function fix(id: string, positivo: boolean) {
    correct.mutate(
      { id, outcome: positivo ? 'done' : 'relapse' },
      {
        onSuccess: (res) =>
          positivo
            ? toast.success(
                'Ontem corrigido',
                'Dano devolvido e sequência de volta',
              )
            : toast.warning(
                'Recaída registrada',
                // Antes dizia só "o dia de ontem foi ajustado", sem número: a
                // correção nem cobrava o mesmo que recair na hora. Agora cobra,
                // então tem de mostrar quanto — e por quê.
                res.damage
                  ? damageExplanation({ ...res, damageTaken: res.damage })
                  : 'O dia de ontem foi ajustado',
              ),
        onError: (error) =>
          toast.error('Não deu para corrigir', formatErrorMessage(error)),
      },
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <RotateCcw size={16} color={theme.colors.gold} />
        <View style={styles.headText}>
          <Text variant="title">Ontem fechou sozinho</Text>
          <Text variant="label" color={theme.colors.textMuted}>
            Nada foi marcado, então o sistema decidiu. Se esqueceu, conserte
            aqui — vale só hoje.
          </Text>
        </View>
      </View>

      {items.map((item) => {
        const positivo = item.type === 'positive';
        return (
          <View key={item.id} style={styles.row}>
            <View style={styles.rowMain}>
              <Text numberOfLines={1}>{item.title}</Text>
              <Text variant="label" color={theme.colors.textMuted}>
                {positivo ? 'fechou como não feito' : 'fechou como resistido'}
                {item.damage > 0 ? ` · −${item.damage} HP` : ''}
              </Text>
            </View>
            <Button
              size="sm"
              variant={positivo ? 'success' : 'outline'}
              label={positivo ? 'Eu fiz' : 'Eu recaí'}
              loading={correct.isPending}
              onPress={() => fix(item.id, positivo)}
            />
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderLeftColor: theme.colors.gold,
    borderLeftWidth: 3,
    gap: theme.spacing.md,
  },
  head: { flexDirection: 'row', gap: theme.spacing.sm },
  headText: { flex: 1, gap: 2 },
  row: {
    alignItems: 'center',
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  },
  rowMain: { flex: 1, gap: 1 },
});
