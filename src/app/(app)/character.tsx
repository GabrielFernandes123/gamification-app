import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { ATTRIBUTE_LABEL, ATTRIBUTES } from '@/features/character/attributes';
import { CLASSES, RESPEC_ESSENCIA_COST } from '@/features/character/classes';
import { useCharacter } from '@/features/character/hooks/useCharacter';
import { useSelectClass } from '@/features/character/hooks/useClass';
import { useAttributes } from '@/features/build/hooks/useAttributes';
import {
  useEquipItem,
  useMyEquipment,
  useUnequipItem,
} from '@/features/build/hooks/useEquipment';
import { theme } from '@/theme/theme';
import type {
  AttributeBreakdown,
  EquipmentSlot,
  OwnedEquipment,
} from '@/types/build';

type Mode = 'atributos' | 'equipamento' | 'classe';

const SLOT_LABEL: Record<EquipmentSlot, string> = {
  arma: 'Arma',
  armadura: 'Armadura',
  acessorio: 'Acessório',
};
const SLOTS: EquipmentSlot[] = ['arma', 'armadura', 'acessorio'];

export default function CharacterScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('atributos');

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Voltar">
          <ChevronLeft color={theme.colors.text} size={26} />
        </Pressable>
        <Text variant="h1">Personagem</Text>
      </View>

      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'atributos', label: 'Atributos' },
          { value: 'equipamento', label: 'Equipamento' },
          { value: 'classe', label: 'Classe' },
        ]}
      />

      {mode === 'atributos' && <AttributesPanel />}
      {mode === 'equipamento' && <EquipmentPanel />}
      {mode === 'classe' && <ClassPanel />}
    </Screen>
  );
}

// ---------------------------------------------------------------- Atributos
function AttributesPanel() {
  const attributes = useAttributes();

  if (attributes.isLoading) return <Loading />;
  if (attributes.error || !attributes.data) {
    return <ErrorText msg="Não foi possível carregar os atributos." />;
  }

  return (
    <View style={styles.stack}>
      <Text variant="bodyMuted">
        Seus atributos vêm da vida real: o nível das skills e partes do corpo, mais
        equipamento, pontos de boss e o bônus de classe (03 §2).
      </Text>
      {attributes.data.attributes.map((attr) => (
        <AttributeCard key={attr.key} attr={attr} />
      ))}
    </View>
  );
}

function AttributeCard({ attr }: { attr: AttributeBreakdown }) {
  const meta = ATTRIBUTES.find((a) => a.key === attr.key);
  return (
    <Card style={styles.attrCard}>
      <View style={styles.attrHead}>
        <View style={{ flex: 1 }}>
          <Text variant="title">{ATTRIBUTE_LABEL[attr.key]}</Text>
          <Text variant="bodyMuted">{meta?.hint}</Text>
        </View>
        <Text variant="h1" color={theme.colors.primary}>
          {attr.total}
        </Text>
      </View>

      <View style={styles.attrLines}>
        {attr.skills.map((s) => (
          <SourceLine key={`sk-${s.name}`} label={`Skill · ${s.name}`} value={s.level} />
        ))}
        {attr.bodyParts.map((p) => (
          <SourceLine key={`bp-${p.name}`} label={`Corpo · ${p.name}`} value={p.level} />
        ))}
        {attr.equipment.map((e) => (
          <SourceLine
            key={`eq-${e.name}`}
            label={`Equip · ${e.name}`}
            value={e.bonus}
          />
        ))}
        {attr.points > 0 && <SourceLine label="Pontos de boss" value={attr.points} />}
        {attr.favored && (
          <SourceLine label={`Classe (+15%)`} value={attr.classBonus} />
        )}
        {attr.skills.length === 0 &&
          attr.bodyParts.length === 0 &&
          attr.equipment.length === 0 &&
          attr.points === 0 && (
            <Text variant="bodyMuted">Nada alimenta este atributo ainda.</Text>
          )}
      </View>
    </Card>
  );
}

function SourceLine({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.sourceLine}>
      <Text variant="bodyMuted">{label}</Text>
      <Text variant="bodyMedium" color={theme.colors.text}>
        +{value}
      </Text>
    </View>
  );
}

// -------------------------------------------------------------- Equipamento
function EquipmentPanel() {
  const owned = useMyEquipment();
  const character = useCharacter();
  const equip = useEquipItem();
  const unequip = useUnequipItem();

  if (owned.isLoading) return <Loading />;
  if (owned.error || !owned.data) {
    return <ErrorText msg="Não foi possível carregar o equipamento." />;
  }

  const level = character.data?.level ?? 1;
  const items = owned.data;
  const equippedBySlot = new Map<EquipmentSlot, OwnedEquipment>();
  for (const it of items) {
    if (it.is_equipped) equippedBySlot.set(it.slot, it);
  }

  const onEquip = (it: OwnedEquipment) => {
    if (level < it.required_level) {
      Alert.alert('Nível insuficiente', `Requer nível ${it.required_level}.`);
      return;
    }
    equip.mutate(
      { equipmentId: it.id },
      { onError: (e) => Alert.alert('Erro', String((e as Error).message)) },
    );
  };

  return (
    <View style={styles.stack}>
      {SLOTS.map((slot) => {
        const eq = equippedBySlot.get(slot);
        return (
          <Card key={slot} style={styles.slotCard}>
            <View style={styles.attrHead}>
              <Text variant="label" color={theme.colors.textMuted}>
                {SLOT_LABEL[slot]}
              </Text>
              {eq ? (
                <Button
                  label="Desequipar"
                  size="sm"
                  variant="outline"
                  onPress={() => unequip.mutate({ equipmentId: eq.id })}
                />
              ) : null}
            </View>
            {eq ? (
              <View>
                <Text variant="title">{eq.name}</Text>
                <Text variant="bodyMuted">{bonusText(eq)}</Text>
              </View>
            ) : (
              <Text variant="bodyMuted">Slot vazio</Text>
            )}
          </Card>
        );
      })}

      <Text variant="title" style={{ marginTop: theme.spacing.md }}>
        Inventário
      </Text>
      {items.filter((it) => !it.is_equipped).length === 0 ? (
        <Text variant="bodyMuted">
          Nenhum item guardado. Compre equipamento na Loja.
        </Text>
      ) : (
        items
          .filter((it) => !it.is_equipped)
          .map((it) => {
            const locked = level < it.required_level;
            return (
              <Card key={it.id} style={styles.invCard}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium">{it.name}</Text>
                  <Text variant="bodyMuted">
                    {SLOT_LABEL[it.slot]} · {bonusText(it)}
                  </Text>
                  {locked && (
                    <Text variant="label" color={theme.colors.hp}>
                      Requer nível {it.required_level}
                    </Text>
                  )}
                </View>
                <Button
                  label="Equipar"
                  size="sm"
                  variant={locked ? 'ghost' : 'primary'}
                  disabled={locked}
                  onPress={() => onEquip(it)}
                />
              </Card>
            );
          })
      )}
    </View>
  );
}

function bonusText(eq: OwnedEquipment): string {
  const parts = Object.entries(eq.attribute_bonuses ?? {})
    .filter(([, v]) => v)
    .map(([k, v]) => `+${v} ${ATTRIBUTE_LABEL[k as keyof typeof ATTRIBUTE_LABEL]}`);
  return parts.length ? parts.join(' · ') : 'Sem bônus';
}

// ------------------------------------------------------------------- Classe
function ClassPanel() {
  const character = useCharacter();
  const select = useSelectClass();
  const current = character.data?.class ?? null;
  const essencia = character.data?.essencia ?? 0;

  const onSelect = (klass: (typeof CLASSES)[number]['key']) => {
    if (klass === current) return;
    const isRespec = current !== null;
    if (isRespec && essencia < RESPEC_ESSENCIA_COST) {
      Alert.alert(
        'Essência insuficiente',
        `Trocar de classe custa ${RESPEC_ESSENCIA_COST} de Essência.`,
      );
      return;
    }
    const apply = () =>
      select.mutate(
        { klass },
        { onError: (e) => Alert.alert('Erro', String((e as Error).message)) },
      );
    if (isRespec) {
      Alert.alert(
        'Trocar de classe?',
        `Isso custa ${RESPEC_ESSENCIA_COST} de Essência.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Trocar', onPress: apply },
        ],
      );
    } else {
      apply();
    }
  };

  return (
    <View style={styles.stack}>
      <Text variant="bodyMuted">
        A classe dá +15% no atributo favorito. A 1ª escolha é grátis; trocar depois
        custa {RESPEC_ESSENCIA_COST} de Essência.
      </Text>
      {CLASSES.map((cls) => {
        const active = cls.key === current;
        return (
          <Pressable key={cls.key} onPress={() => onSelect(cls.key)}>
            <Card style={[styles.classCard, active ? styles.classOn : null]}>
              <View style={{ flex: 1 }}>
                <Text variant="title">{cls.label}</Text>
                <Text variant="bodyMuted">{cls.hint}</Text>
                <Text variant="label" color={theme.colors.primary}>
                  +15% {ATTRIBUTE_LABEL[cls.favorite]}
                </Text>
              </View>
              {active && (
                <Text variant="label" color={theme.colors.success}>
                  Atual
                </Text>
              )}
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}

// -------------------------------------------------------------------- Utils
function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}

function ErrorText({ msg }: { msg: string }) {
  return (
    <Text color={theme.colors.hp} style={{ marginTop: theme.spacing.lg }}>
      {msg}
    </Text>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  stack: { gap: theme.spacing.md },
  center: { paddingVertical: theme.spacing.xxl, alignItems: 'center' },
  attrCard: { gap: theme.spacing.md },
  attrHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  attrLines: { gap: theme.spacing.xs },
  sourceLine: { flexDirection: 'row', justifyContent: 'space-between' },
  slotCard: { gap: theme.spacing.sm },
  invCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  classCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  classOn: { borderColor: theme.colors.primary, borderWidth: 1 },
});
