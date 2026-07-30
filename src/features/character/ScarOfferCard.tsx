import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Skull } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';
import { theme } from '@/theme/theme';
import { formatErrorMessage } from '@/utils/errors';

/**
 * A escolha da cicatriz, na Início (doc 14 §5.4⑫).
 *
 * ── Por que isto fica no celular ────────────────────────────────────────
 * A morte acontece no fechamento diário ou num toque de "não fiz" — a qualquer
 * hora, em qualquer lugar. Deixar a escolha só no web significaria carregar uma
 * decisão pendente até a próxima vez que você abrisse o PC, e o momento em que
 * ela importa é logo depois de acontecer.
 *
 * ── O que o card precisa comunicar ──────────────────────────────────────
 * **Não é castigo, é desvio.** Cada opção perde uma coisa e ganha outra, e as
 * duas aparecem com o mesmo peso. O valor não está no modificador — está em de
 * que você abre mão.
 */

type ScarEffects = Record<string, number>;

type ScarOffer = {
  id: string;
  deathNumber: number;
  options: {
    key: string;
    label: string;
    description: string;
    effects: ScarEffects;
  }[];
};

const EFFECT_LABEL: Record<string, string> = {
  goldPct: 'ouro',
  xpHabitPct: 'XP de hábito',
  damageTakenPct: 'dano recebido',
  bossDamagePct: 'dano no boss',
};

/** `damageTakenPct` é invertido: MAIS dano recebido é pior. */
function isGood(key: string, value: number) {
  return key === 'damageTakenPct' ? value < 0 : value > 0;
}

export function ScarOfferCard() {
  const toast = useToast();
  const qc = useQueryClient();

  const scars = useQuery({
    queryKey: qk.scars,
    queryFn: () =>
      apiFetch<{ pendingOffers: ScarOffer[] }>('/build/scars'),
  });

  const choose = useMutation({
    mutationFn: (input: { offerId: string; scarKey: string }) =>
      apiFetch<{ scar: { label: string } }>(
        `/build/scars/${input.offerId}/choose`,
        { method: 'POST', body: { scarKey: input.scarKey } },
      ),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: qk.scars });
      void qc.invalidateQueries({ queryKey: qk.character });
      toast.success('Marca escolhida', `Você carrega: ${data.scar.label}`);
    },
    onError: (error) =>
      toast.error('Não deu para escolher', formatErrorMessage(error)),
  });

  const decline = useMutation({
    mutationFn: (offerId: string) =>
      apiFetch(`/build/scars/${offerId}/decline`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.scars }),
  });

  const offer = scars.data?.pendingOffers?.[0];
  if (!offer) return null;

  return (
    <Card style={styles.card} accent={theme.colors.hp}>
      <View style={styles.head}>
        <Skull color={theme.colors.hp} size={20} />
        <Text variant="title" style={styles.flex}>
          A marca da {offer.deathNumber}ª queda
        </Text>
      </View>
      <Text variant="bodyMuted">
        Escolha o que essa morte deixou. Não é castigo — é uma troca.
      </Text>

      {offer.options.map((option) => (
        <Pressable
          key={option.key}
          style={styles.option}
          disabled={choose.isPending}
          accessibilityRole="button"
          accessibilityLabel={option.label}
          onPress={() =>
            choose.mutate({ offerId: offer.id, scarKey: option.key })
          }
        >
          <Text variant="bodyMedium">{option.label}</Text>
          <Text variant="label" color={theme.colors.textSubtle}>
            {option.description}
          </Text>
          <View style={styles.effects}>
            {Object.entries(option.effects).map(([key, value]) => (
              <Text
                key={key}
                variant="label"
                color={isGood(key, value) ? theme.colors.success : theme.colors.hp}
              >
                {value > 0 ? '+' : ''}
                {Math.round(value * 100)}% {EFFECT_LABEL[key] ?? key}
              </Text>
            ))}
          </View>
        </Pressable>
      ))}

      <Button
        label="Nenhuma marca desta vez"
        variant="ghost"
        size="sm"
        loading={decline.isPending}
        onPress={() => decline.mutate(offer.id)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  flex: { flex: 1, minWidth: 0 },
  option: {
    gap: theme.spacing.xs,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    padding: theme.spacing.md,
  },
  effects: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
});
