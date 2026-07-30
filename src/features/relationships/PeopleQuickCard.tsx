import { MessageCircle, Users } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { openWeb } from '@/lib/openWeb';
import { theme } from '@/theme/theme';
import { formatErrorMessage } from '@/utils/errors';
import { useLogContact, useRelationships } from './hooks/useRelationships';

/**
 * Quem está esfriando, na Início (doc 14 §4.14).
 *
 * ── Por que isto fica no celular ────────────────────────────────────────
 * Ligar para alguém é registro em movimento: acontece no carro, na fila, longe
 * do computador. Se registrar exigisse abrir o PC, viraria "depois eu anoto" —
 * e o módulo inteiro perderia o sentido, porque ele é 90% lembrete.
 *
 * ── ⚠️ A regra que governa este card ────────────────────────────────────
 * **Nada de pontos.** Nem no card, nem no toast. A tela fala em tempo e
 * pessoas — é a regra de subgamificação chegando até a mensagem de sucesso.
 *
 * Mostra no máximo 3: é um lembrete, não a lista. A lista mora no web.
 */
const MAX_SHOWN = 3;

export function PeopleQuickCard() {
  const toast = useToast();
  const people = useRelationships();
  const contact = useLogContact();

  const cooling = (people.data ?? [])
    .filter((person) => person.overdueBy !== null && person.overdueBy > 0)
    .slice(0, MAX_SHOWN);

  // Ninguém esfriando é o estado normal e não merece um card ocupando a tela.
  if (cooling.length === 0) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Users color={theme.colors.primary} size={18} />
        <Text variant="title" style={styles.flex}>
          Faz tempo
        </Text>
        <Pressable
          onPress={() => void openWeb('/relationships')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Ver todas as pessoas"
        >
          <Text variant="label" color={theme.colors.primary}>
            ver todas
          </Text>
        </Pressable>
      </View>

      {cooling.map((person) => (
        <View key={person.id} style={styles.row}>
          <View style={styles.flex}>
            <Text variant="bodyMedium" numberOfLines={1}>
              {person.name}
            </Text>
            <Text variant="label" color={theme.colors.textSubtle}>
              {person.daysSince === null
                ? 'nunca registrado'
                : `faz ${person.daysSince} dias`}
            </Text>
          </View>

          <Pressable
            style={styles.action}
            disabled={contact.isPending}
            accessibilityRole="button"
            accessibilityLabel={`Falei com ${person.name}`}
            onPress={() =>
              void contact
                .mutateAsync({ id: person.id })
                .catch((error) =>
                  toast.error('Não deu para registrar', formatErrorMessage(error)),
                )
            }
          >
            <MessageCircle color={theme.colors.success} size={18} />
            <Text variant="label" color={theme.colors.success}>
              falei
            </Text>
          </Pressable>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  flex: { flex: 1, minWidth: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
  action: {
    minHeight: theme.sizes.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
});
