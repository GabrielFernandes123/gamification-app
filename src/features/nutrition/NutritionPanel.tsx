import { Check, Plus, Search, Trash2, Utensils, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { theme } from '@/theme/theme';
import { formatErrorMessage } from '@/utils/errors';
import { MealVoiceButton } from './MealVoiceButton';
import { ProposalCard } from './ProposalCard';
import {
  MEAL_LABEL,
  useCreateMeal,
  useFoodSearch,
  useNutritionDay,
  useNutritionPending,
  useRemoveMeal,
  type Food,
  type Meal,
  type NutritionCriteria,
} from './hooks/useNutrition';

/**
 * O painel de nutrição dentro da aba Corpo.
 *
 * A ordem da tela segue a ordem do dia: primeiro **como está** (totais e
 * critérios), depois **o que falta decidir** (propostas pendentes), depois
 * **registrar** (voz ou manual), e por último o que já foi registrado.
 *
 * As propostas vêm antes do botão de gravar de propósito: acumular fila é o
 * jeito de o módulo virar mentira, e o primeiro que se vê ao abrir tem de ser o
 * que está esperando por você.
 */

const MEAL_OPTIONS = (Object.keys(MEAL_LABEL) as Meal[]).map((value) => ({
  value,
  label: MEAL_LABEL[value],
}));

export function NutritionPanel() {
  const day = useNutritionDay();
  const pending = useNutritionPending();
  const removeMeal = useRemoveMeal();
  const [adding, setAdding] = useState(false);

  const totals = day.data?.totals;
  const targets = day.data?.targets;

  return (
    <Card style={styles.panel}>
      <View style={styles.head}>
        <Utensils color={theme.colors.success} size={20} />
        <Text variant="title" style={styles.flex}>
          Nutrição
        </Text>
        {day.isLoading ? <ActivityIndicator color={theme.colors.primary} size="small" /> : null}
      </View>

      {day.data && totals && targets ? (
        <>
          <View style={styles.totals}>
            <Stat label="kcal" value={Math.round(totals.kcal)} />
            <Stat label="proteína" value={`${Math.round(totals.proteinG)} g`} />
            <Stat label="carbo" value={`${Math.round(totals.carbG)} g`} />
            <Stat label="gordura" value={`${Math.round(totals.fatG)} g`} />
          </View>
          <Criteria
            criteria={day.data.criteria}
            targets={targets}
            meals={day.data.entries.length}
          />
        </>
      ) : null}

      {pending.data?.map((proposal) => (
        <ProposalCard key={proposal.id} proposal={proposal} />
      ))}

      <MealVoiceButton onProposed={() => void pending.refetch()} />

      <Button
        label="Adicionar manualmente"
        variant="outline"
        icon={<Plus color={theme.colors.text} size={16} />}
        onPress={() => setAdding(true)}
      />

      {day.data?.entries.length ? (
        day.data.entries.map((entry) => (
          <View key={entry.id} style={styles.entry}>
            <View style={styles.entryHead}>
              <Text variant="bodyMedium" style={styles.flex}>
                {MEAL_LABEL[entry.meal]} · {Math.round(entry.kcal)} kcal
              </Text>
              <Text variant="label">{Math.round(entry.proteinG)} g prot</Text>
              <Pressable
                onPress={() => void removeMeal.mutateAsync(entry.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remover ${MEAL_LABEL[entry.meal]}`}
                style={styles.remove}
              >
                <Trash2 color={theme.colors.hp} size={16} />
              </Pressable>
            </View>
            <Text variant="bodyMuted" numberOfLines={2}>
              {entry.items
                .map((item) => `${item.name} (${Math.round(item.quantityG)} g)`)
                .join(' · ')}
            </Text>
          </View>
        ))
      ) : (
        <Text variant="bodyMuted">Nada registrado hoje.</Text>
      )}

      <AddMealModal visible={adding} onClose={() => setAdding(false)} />
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.stat}>
      <Text variant="stat">{value}</Text>
      <Text variant="label">{label}</Text>
    </View>
  );
}

/**
 * Os critérios do dia. Critério desligado simplesmente não aparece — mostrá-lo
 * cinza sugeriria que está pendente, quando na verdade ele saiu da conta.
 */
function Criteria({
  criteria,
  targets,
  meals,
}: {
  criteria: NutritionCriteria;
  targets: { protein_min_g: number; kcal_max: number; meals_min: number };
  meals: number;
}) {
  const rows: { key: string; label: string; met: boolean }[] = [];
  if (criteria.protein !== null) {
    rows.push({
      key: 'protein',
      label: `Proteína ≥ ${targets.protein_min_g} g`,
      met: criteria.protein,
    });
  }
  if (criteria.kcal !== null) {
    rows.push({
      key: 'kcal',
      label: `Calorias ≤ ${targets.kcal_max}`,
      met: criteria.kcal,
    });
  }
  if (criteria.meals !== null) {
    rows.push({
      key: 'meals',
      label: `${meals}/${targets.meals_min} refeições`,
      met: criteria.meals,
    });
  }
  if (!rows.length) return null;

  return (
    <View style={styles.criteria}>
      {rows.map((row) => (
        <View key={row.key} style={styles.criterion}>
          {row.met ? (
            <Check color={theme.colors.success} size={14} />
          ) : (
            <X color={theme.colors.textSubtle} size={14} />
          )}
          <Text
            variant="label"
            color={row.met ? theme.colors.success : theme.colors.textSubtle}
          >
            {row.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Registro manual: busca no catálogo, escolhe a porção, soma na refeição. */
function AddMealModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const toast = useToast();
  const create = useCreateMeal();
  const [meal, setMeal] = useState<Meal>('almoco');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<{ food: Food; quantityG: number }[]>([]);
  const search = useFoodSearch(query);

  function close() {
    setQuery('');
    setPicked([]);
    onClose();
  }

  async function save() {
    try {
      await create.mutateAsync({
        meal,
        items: picked.map((item) => ({
          foodId: item.food.id,
          quantityG: item.quantityG,
        })),
      });
      toast.success('Refeição registrada');
      close();
    } catch (error) {
      toast.error('Não deu para registrar', formatErrorMessage(error));
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close} transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modal}>
          <View style={styles.head}>
            <Text variant="title" style={styles.flex}>
              Nova refeição
            </Text>
            <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fechar">
              <X color={theme.colors.textMuted} size={22} />
            </Pressable>
          </View>

          <Segmented options={MEAL_OPTIONS} value={meal} onChange={setMeal} wrap />

          <Input
            label="Buscar na tabela TACO"
            value={query}
            onChangeText={setQuery}
            placeholder="frango, arroz, banana..."
            autoCorrect={false}
          />

          <View style={styles.results}>
            {search.isFetching ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              search.data?.slice(0, 8).map((food) => (
                <Pressable
                  key={food.id}
                  style={styles.result}
                  accessibilityRole="button"
                  onPress={() => {
                    setPicked((current) => [...current, { food, quantityG: 100 }]);
                    setQuery('');
                  }}
                >
                  <Search color={theme.colors.textSubtle} size={14} />
                  <Text variant="body" style={styles.flex} numberOfLines={1}>
                    {food.name}
                  </Text>
                  <Text variant="label">{Math.round(food.kcal)} kcal/100g</Text>
                </Pressable>
              ))
            )}
          </View>

          {picked.map((item, index) => (
            <View key={`${item.food.id}-${index}`} style={styles.pickedRow}>
              <Text variant="bodyMedium" style={styles.flex} numberOfLines={1}>
                {item.food.name}
              </Text>
              <NumberStepper
                value={item.quantityG}
                onChange={(value) =>
                  setPicked((current) =>
                    current.map((entry, i) =>
                      i === index ? { ...entry, quantityG: value } : entry,
                    ),
                  )
                }
                min={1}
                max={5000}
                step={10}
                accessibilityLabel={`Gramas de ${item.food.name}`}
              />
              <Pressable
                onPress={() => setPicked((current) => current.filter((_, i) => i !== index))}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remover ${item.food.name}`}
              >
                <Trash2 color={theme.colors.hp} size={16} />
              </Pressable>
            </View>
          ))}

          <Button
            label="Registrar"
            loading={create.isPending}
            disabled={picked.length === 0}
            onPress={() => void save()}
            fullWidth
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: { gap: theme.spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  flex: { flex: 1, minWidth: 0 },

  totals: { flexDirection: 'row', gap: theme.spacing.sm },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    paddingVertical: theme.spacing.sm,
  },

  criteria: { gap: theme.spacing.xs },
  criterion: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },

  entry: {
    gap: theme.spacing.xs,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  entryHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  remove: { minHeight: 32, justifyContent: 'center' },

  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.overlay,
  },
  modal: {
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    maxHeight: '88%',
  },
  results: { gap: theme.spacing.xs },
  result: {
    minHeight: theme.sizes.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: theme.spacing.md,
  },
  pickedRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
});
