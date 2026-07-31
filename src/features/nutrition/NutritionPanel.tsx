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
  NUTRIENTS,
  NUTRIENT_FIELDS,
  NUTRIENT_LABEL,
  NUTRIENT_TOTAL,
  NUTRIENT_UNIT,
  useCreateMeal,
  useFoodSearch,
  useMealSlots,
  useNutritionDay,
  useNutritionPending,
  useRemoveMeal,
  type Bounds,
  type DaySlot,
  type Food,
  type Nutrient,
  type NutritionCriteria,
  type NutritionEntry,
  type NutritionTargets,
} from './hooks/useNutrition';

/**
 * O painel de nutrição dentro da aba Corpo.
 *
 * A ordem da tela segue a ordem do dia: primeiro **quanto falta** (o número que
 * decide a próxima refeição), depois **o que falta decidir** (propostas
 * pendentes), depois **registrar** (voz ou manual), e por último as refeições
 * do dia, cada uma contra a fatia que cabe a ela.
 *
 * As propostas vêm antes do botão de gravar de propósito: acumular fila é o
 * jeito de o módulo virar mentira, e o primeiro que se vê ao abrir tem de ser o
 * que está esperando por você.
 *
 * Configurar refeições e metas **não** está aqui: o celular registra, o web
 * configura. O que o app faz é mostrar o alvo já decidido.
 */

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
            {NUTRIENTS.map((nutrient) => (
              <Stat
                key={nutrient}
                nutrient={nutrient}
                consumed={totals[NUTRIENT_TOTAL[nutrient]]}
                bounds={boundsOf(targets, nutrient)}
              />
            ))}
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

      {day.data?.slots.map((slot) => (
        <SlotBlock
          key={slot.id}
          slot={slot}
          entries={day.data.entries.filter((entry) => entry.slotId === slot.id)}
          onRemove={(id) => void removeMeal.mutateAsync(id)}
        />
      ))}

      {/* Refeição cujo slot foi apagado depois: o nome congelado no registro é
          o que a mantém legível, e ela continua contando nos totais. */}
      {day.data?.entries
        .filter((entry) => !entry.slotId)
        .map((entry) => (
          <MealRow
            key={entry.id}
            entry={entry}
            onRemove={() => void removeMeal.mutateAsync(entry.id)}
          />
        ))}

      {day.data && day.data.entries.length === 0 ? (
        <Text variant="bodyMuted">Nada registrado hoje.</Text>
      ) : null}

      <AddMealModal visible={adding} onClose={() => setAdding(false)} />
    </Card>
  );
}

/**
 * Um nutriente do dia: o consumido em cima, o que FALTA embaixo.
 *
 * "Faltam 620" responde a pergunta que se faz olhando o celular antes de comer;
 * "1980 consumidas" só responde depois. Quando não há meta, o total sozinho é
 * tudo o que dá para dizer com honestidade.
 */
function Stat({
  nutrient,
  consumed,
  bounds,
}: {
  nutrient: Nutrient;
  consumed: number;
  bounds: Bounds;
}) {
  const unit = NUTRIENT_UNIT[nutrient];
  const reference = bounds.enabled ? (bounds.max ?? bounds.min) : null;
  const remaining = reference === null ? null : reference - consumed;

  return (
    <View style={styles.stat}>
      <Text variant="stat">
        {Math.round(consumed)}
        {unit ? ` ${unit}` : ''}
      </Text>
      <Text variant="label">{NUTRIENT_LABEL[nutrient]}</Text>
      {remaining !== null ? (
        <Text
          variant="label"
          color={remaining < 0 ? theme.colors.hp : theme.colors.textSubtle}
        >
          {remaining >= 0
            ? `faltam ${Math.round(remaining)}`
            : `+${Math.round(-remaining)}`}
        </Text>
      ) : null}
    </View>
  );
}

/** Uma refeição configurada, com o alvo dela e o que já entrou. */
function SlotBlock({
  slot,
  entries,
  onRemove,
}: {
  slot: DaySlot;
  entries: NutritionEntry[];
  onRemove: (id: string) => void;
}) {
  const kcal = slot.target.kcal;
  const reference = kcal.max ?? kcal.min;

  return (
    <View style={styles.slot}>
      <View style={styles.entryHead}>
        <Text variant="bodyMedium" style={styles.flex}>
          {slot.name}
          {slot.targetAt ? ` · ${slot.targetAt.slice(0, 5)}` : ''}
        </Text>
        <Text variant="label">
          {Math.round(slot.consumed.kcal)}
          {reference ? ` / ${Math.round(reference)}` : ''} kcal
        </Text>
      </View>

      {entries.length ? (
        entries.map((entry) => (
          <MealRow key={entry.id} entry={entry} onRemove={() => onRemove(entry.id)} />
        ))
      ) : (
        <Text variant="bodyMuted">Nada aqui ainda.</Text>
      )}
    </View>
  );
}

function MealRow({
  entry,
  onRemove,
}: {
  entry: NutritionEntry;
  onRemove: () => void;
}) {
  return (
    <View style={styles.entry}>
      <View style={styles.entryHead}>
        <Text variant="bodyMedium" style={styles.flex}>
          {entry.mealName} · {Math.round(entry.kcal)} kcal
        </Text>
        <Text variant="label">{Math.round(entry.proteinG)} g prot</Text>
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Remover ${entry.mealName}`}
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
  );
}

function boundsOf(targets: NutritionTargets, nutrient: Nutrient): Bounds {
  const fields = NUTRIENT_FIELDS[nutrient];
  return {
    min: targets[fields.min] as number | null,
    max: targets[fields.max] as number | null,
    enabled: targets[fields.enabled] as boolean,
  };
}

/** A faixa em texto — as quatro formas são leituras diferentes. */
function formatBounds(bounds: Bounds, unit: string): string {
  const suffix = unit ? ` ${unit}` : '';
  if (bounds.min !== null && bounds.max !== null)
    return `${Math.round(bounds.min)}–${Math.round(bounds.max)}${suffix}`;
  if (bounds.min !== null) return `≥ ${Math.round(bounds.min)}${suffix}`;
  if (bounds.max !== null) return `≤ ${Math.round(bounds.max)}${suffix}`;
  return 'sem meta';
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
  targets: NutritionTargets;
  meals: number;
}) {
  const rows: { key: string; label: string; met: boolean }[] = [];

  for (const nutrient of NUTRIENTS) {
    const met = criteria[nutrient];
    if (met === null) continue;
    rows.push({
      key: nutrient,
      label: `${NUTRIENT_LABEL[nutrient]} ${formatBounds(boundsOf(targets, nutrient), NUTRIENT_UNIT[nutrient])}`,
      met,
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
  const slots = useMealSlots();
  const [slotId, setSlotId] = useState('');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<{ food: Food; quantityG: number }[]>([]);
  const search = useFoodSearch(query);

  const options = (slots.data ?? []).map((slot) => ({
    value: slot.id,
    label: slot.name,
  }));
  // Sem escolha ainda, vale a primeira refeição configurada — mas a escolha do
  // usuário sempre ganha.
  const value = slotId || options[0]?.value || '';

  function close() {
    setQuery('');
    setPicked([]);
    onClose();
  }

  async function save() {
    try {
      await create.mutateAsync({
        slotId: value,
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

          <Segmented options={options} value={value} onChange={setSlotId} wrap />

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
            disabled={picked.length === 0 || !value}
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

  // Cinco nutrientes não cabem numa linha só em tela de celular — quebram.
  totals: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  stat: {
    flexGrow: 1,
    flexBasis: '30%',
    alignItems: 'center',
    gap: 2,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    paddingVertical: theme.spacing.sm,
  },

  slot: {
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
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
