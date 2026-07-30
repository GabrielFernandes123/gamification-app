import { AlertTriangle, Scale, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { theme } from '@/theme/theme';
import { formatErrorMessage } from '@/utils/errors';
import {
  MEAL_LABEL,
  useApproveProposal,
  useRejectProposal,
  type Meal,
  type PendingProposal,
  type ProposedItem,
} from './hooks/useNutrition';

/**
 * A revisão de uma proposta da IA.
 *
 * **Esta tela é o módulo.** Tudo antes dela é conveniência; é aqui que
 * estimativa vira dado. Por isso ela mostra o que a IA OUVIU (o transcript), o
 * que ela ESCOLHEU do catálogo (o nome da linha) e deixa corrigir a porção — os
 * três pontos onde ela pode ter errado.
 *
 * Item que a IA não achou na TACO aparece marcado e **não pode ser aprovado**:
 * gravar item sem macro contaria uma refeição como se ela não valesse nada.
 * A saída é removê-lo — nada obriga a aceitar a proposta inteira.
 */

const MEAL_OPTIONS = (Object.keys(MEAL_LABEL) as Meal[]).map((value) => ({
  value,
  label: MEAL_LABEL[value],
}));

export function ProposalCard({ proposal }: { proposal: PendingProposal }) {
  const toast = useToast();
  const approve = useApproveProposal();
  const reject = useRejectProposal();

  const [meal, setMeal] = useState<Meal>(proposal.payload.meal);
  const [items, setItems] = useState<ProposedItem[]>(proposal.payload.items ?? []);
  const [weight, setWeight] = useState<number | null>(proposal.payload.weightKg);

  const unmatched = items.filter((item) => !item.foodId).length;
  const totals = items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      protein: acc.protein + item.protein_g,
    }),
    { kcal: 0, protein: 0 },
  );

  function setQuantity(index: number, quantityG: number) {
    setItems((current) =>
      current.map((item, i) => {
        if (i !== index) return item;
        // Reescala os macros junto com a porção, para o total na tela bater com
        // o que o servidor vai calcular. O número que VALE ainda é o do
        // servidor: aqui é só pré-visualização.
        const factor = quantityG / item.quantityG;
        return {
          ...item,
          quantityG,
          kcal: round(item.kcal * factor),
          protein_g: round(item.protein_g * factor),
          carb_g: round(item.carb_g * factor),
          fat_g: round(item.fat_g * factor),
        };
      }),
    );
  }

  async function onApprove() {
    if (unmatched > 0) {
      toast.warning(
        'Tem item fora da tabela',
        'Remova os itens marcados antes de aprovar.',
      );
      return;
    }
    try {
      await approve.mutateAsync({
        id: proposal.id,
        meal,
        occurredOn: proposal.payload.occurredOn,
        items: items.map((item) => ({
          foodId: item.foodId as string,
          quantityG: item.quantityG,
        })),
        weightKg: weight ?? undefined,
      });
      toast.success('Refeição registrada');
    } catch (error) {
      toast.error('Não deu para aprovar', formatErrorMessage(error));
    }
  }

  return (
    <Card style={styles.card} accent={theme.colors.skill}>
      <View>
        <Text variant="label" color={theme.colors.skill}>
          Proposta da IA · aguardando você
        </Text>
        {proposal.transcript ? (
          <Text variant="bodyMuted" style={styles.transcript}>
            “{proposal.transcript}”
          </Text>
        ) : null}
      </View>

      <Segmented options={MEAL_OPTIONS} value={meal} onChange={setMeal} wrap />

      {items.map((item, index) => (
        <View
          key={`${item.name}-${index}`}
          style={[styles.item, !item.foodId && styles.itemBad]}
        >
          <View style={styles.itemHead}>
            {!item.foodId ? (
              <AlertTriangle color={theme.colors.hp} size={16} />
            ) : null}
            <Text variant="bodyMedium" style={styles.flex} numberOfLines={2}>
              {item.name}
            </Text>
            <Button
              label=""
              variant="ghost"
              size="sm"
              icon={<Trash2 color={theme.colors.hp} size={16} />}
              onPress={() =>
                setItems((current) => current.filter((_, i) => i !== index))
              }
            />
          </View>

          {/* O que a IA ouviu, quando não é o nome do catálogo: é como se
              percebe que ela entendeu "batata" onde você disse "batata doce". */}
          {item.heard && item.heard !== item.name ? (
            <Text variant="label" color={theme.colors.textSubtle} numberOfLines={1}>
              ouviu: {item.heard}
            </Text>
          ) : null}

          {item.foodId ? (
            <View style={styles.itemRow}>
              <NumberStepper
                value={Math.round(item.quantityG)}
                onChange={(value) => setQuantity(index, value)}
                min={1}
                max={5000}
                step={10}
                accessibilityLabel={`Gramas de ${item.name}`}
              />
              <Text variant="label" style={styles.flex}>
                g · {Math.round(item.kcal)} kcal · {Math.round(item.protein_g)} g prot
              </Text>
            </View>
          ) : (
            <Text variant="label" color={theme.colors.hp}>
              Fora da tabela TACO — remova para aprovar
            </Text>
          )}
        </View>
      ))}

      {weight != null ? (
        <View style={styles.weight}>
          <Scale color={theme.colors.primary} size={16} />
          <Text variant="bodyMedium" style={styles.flex}>
            Peso: {weight} kg
          </Text>
          <Button
            label="Descartar"
            variant="ghost"
            size="sm"
            onPress={() => setWeight(null)}
          />
        </View>
      ) : null}

      <Text variant="label">
        Total: {Math.round(totals.kcal)} kcal · {Math.round(totals.protein)} g de proteína
      </Text>

      <View style={styles.actions}>
        <Button
          label="Aprovar"
          variant="success"
          loading={approve.isPending}
          disabled={unmatched > 0 || (items.length === 0 && weight == null)}
          onPress={() => void onApprove()}
          style={styles.flex}
        />
        <Button
          label="Recusar"
          variant="outline"
          loading={reject.isPending}
          onPress={() => void reject.mutateAsync(proposal.id)}
        />
      </View>
      <Text variant="bodyMuted" style={styles.fine}>
        Recusar não grava nada.
      </Text>
    </Card>
  );
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.md },
  flex: { flex: 1, minWidth: 0 },
  transcript: { fontStyle: 'italic', marginTop: theme.spacing.xs },
  item: {
    gap: theme.spacing.xs,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    padding: theme.spacing.md,
  },
  itemBad: { borderColor: theme.colors.hp },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  weight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  actions: { flexDirection: 'row', gap: theme.spacing.sm },
  fine: { fontSize: theme.fontSizes.xs },
});
