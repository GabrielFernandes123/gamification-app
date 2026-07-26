import { useRouter } from 'expo-router';
import { ChevronLeft, RotateCcw } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ArtImage } from '@/components/ui/ArtImage';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { ATTRIBUTE_LABEL, ATTRIBUTES } from '@/features/character/attributes';
import { CLASSES, RESPEC_ESSENCIA_COST } from '@/features/character/classes';
import { useCharacter } from '@/features/character/hooks/useCharacter';
import { useRegenerateCharacterArt } from '@/features/character/hooks/useCharacterArt';
import { useSelectClass } from '@/features/character/hooks/useClass';
import {
  RESPEC_POINTS_ESSENCIA_COST,
  useAttributes,
  useRespecAttributePoints,
} from '@/features/build/hooks/useAttributes';
import { formatErrorMessage } from '@/utils/errors';
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

      <AvatarCard />

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

// ------------------------------------------------------------------ Avatar
/**
 * Retrato do personagem. Só troca quando VOCÊ pede: a arte reflete classe,
 * nível e equipamento equipado, mas regenerar automaticamente a cada mudança
 * geraria imagem sem você querer (e custa dinheiro por chamada).
 */
function AvatarCard() {
  const character = useCharacter();
  const regenerate = useRegenerateCharacterArt();
  const toast = useToast();
  const avatar = character.data?.image_url ?? null;
  const level = character.data?.level ?? 1;

  const onRegenerate = () => {
    regenerate.mutate(undefined, {
      onSuccess: () => toast.success('Novo retrato gerado'),
      onError: (e) => toast.error('Não foi possível gerar', formatErrorMessage(e)),
    });
  };

  return (
    <Card style={styles.avatarCard}>
      <ArtImage uri={avatar} ratio={3 / 4} style={styles.avatarArt} />
      <View style={styles.avatarCopy}>
        <Text variant="label" color={theme.colors.textMuted}>
          Retrato
        </Text>
        <Text variant="h1">Nível {level}</Text>
        <Text variant="bodyMuted">
          {avatar
            ? 'Gerado a partir da sua classe, nível e equipamento equipado.'
            : 'Ainda sem retrato. Gere um a partir da sua build atual.'}
        </Text>
        <Button
          label={
            regenerate.isPending
              ? 'Gerando...'
              : avatar
                ? 'Reimaginar retrato'
                : 'Gerar retrato'
          }
          size="sm"
          variant="outline"
          disabled={regenerate.isPending}
          onPress={onRegenerate}
        />
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------- Atributos
function AttributesPanel() {
  const attributes = useAttributes();
  const character = useCharacter();
  const respec = useRespecAttributePoints();
  const confirm = useConfirm();
  const toast = useToast();

  if (attributes.isLoading) return <Loading />;
  if (attributes.error || !attributes.data) {
    return <ErrorText msg="Não foi possível carregar os atributos." />;
  }

  const allocatedPoints = attributes.data.attributes.reduce((sum, attr) => sum + attr.points, 0);
  const essencia = character.data?.essencia ?? 0;

  async function onRespec() {
    if (essencia < RESPEC_POINTS_ESSENCIA_COST) {
      toast.warning(
        'Essência insuficiente',
        `Redistribuir pontos custa ${RESPEC_POINTS_ESSENCIA_COST} de Essência (você tem ${essencia}).`,
      );
      return;
    }
    const ok = await confirm({
      title: 'Redistribuir pontos?',
      message: `Isso zera os ${allocatedPoints} ponto(s) de boss alocados e custa ${RESPEC_POINTS_ESSENCIA_COST} de Essência. Os pontos voltam como pendentes para realocar na Jornada.`,
      confirmLabel: 'Redistribuir',
      destructive: true,
    });
    if (!ok) return;
    respec.mutate(undefined, {
      onSuccess: (result) =>
        toast.success(
          'Pontos redistribuídos',
          `${result.pending} ponto(s) pendente(s) · -${result.essenciaSpent} Essência`,
        ),
      onError: (e) => toast.error('Erro ao redistribuir', formatErrorMessage(e)),
    });
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
      {allocatedPoints > 0 ? (
        <Card style={styles.respecCard}>
          <View style={{ flex: 1 }}>
            <Text variant="title">Pontos de boss</Text>
            <Text variant="bodyMuted">
              {allocatedPoints} ponto(s) alocado(s). Redistribuir custa {RESPEC_POINTS_ESSENCIA_COST} de
              Essência.
            </Text>
          </View>
          <Button
            label="Redistribuir pontos"
            variant="danger"
            size="sm"
            icon={<RotateCcw color={theme.colors.textInverse} size={15} />}
            loading={respec.isPending}
            onPress={onRespec}
          />
        </Card>
      ) : null}
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
  const toast = useToast();

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
      toast.warning('Nível insuficiente', `Requer nível ${it.required_level}.`);
      return;
    }
    equip.mutate(
      { equipmentId: it.id },
      {
        onSuccess: () => toast.success('Item equipado', it.name),
        onError: (e) => toast.error('Erro ao equipar', formatErrorMessage(e)),
      },
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
              <View style={styles.equipRow}>
                {/* Emblema do equipamento (IA); drop de boss não tem. */}
                {eq.imageUrl ? <ArtImage uri={eq.imageUrl} style={styles.equipArt} /> : null}
                <View style={styles.flex}>
                  <Text variant="title">{eq.name}</Text>
                  <Text variant="bodyMuted">{bonusText(eq)}</Text>
                </View>
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
                {it.imageUrl ? <ArtImage uri={it.imageUrl} style={styles.equipArt} /> : null}
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
  const confirm = useConfirm();
  const toast = useToast();
  const current = character.data?.class ?? null;
  const essencia = character.data?.essencia ?? 0;

  const onSelect = async (klass: (typeof CLASSES)[number]['key']) => {
    if (klass === current) return;
    const isRespec = current !== null;
    if (isRespec && essencia < RESPEC_ESSENCIA_COST) {
      toast.warning(
        'Essência insuficiente',
        `Trocar de classe custa ${RESPEC_ESSENCIA_COST} de Essência.`,
      );
      return;
    }
    if (isRespec) {
      const ok = await confirm({
        title: 'Trocar de classe?',
        message: `Isso custa ${RESPEC_ESSENCIA_COST} de Essência.`,
        confirmLabel: 'Trocar',
      });
      if (!ok) return;
    }
    select.mutate(
      { klass },
      {
        onSuccess: () => toast.success('Classe selecionada'),
        onError: (e) => toast.error('Erro ao trocar de classe', formatErrorMessage(e)),
      },
    );
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
  // Retrato à esquerda (carta 3:4) e a identidade + ação à direita.
  avatarCard: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.lg },
  avatarArt: { width: '38%' },
  avatarCopy: { flex: 1, minWidth: 0, gap: theme.spacing.xs },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  stack: { gap: theme.spacing.md },
  center: { paddingVertical: theme.spacing.xxl, alignItems: 'center' },
  attrCard: { gap: theme.spacing.md },
  attrHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  attrLines: { gap: theme.spacing.xs },
  sourceLine: { flexDirection: 'row', justifyContent: 'space-between' },
  slotCard: { gap: theme.spacing.sm },
  equipRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  equipArt: { width: 44 },
  flex: { flex: 1 },
  invCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  classCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  classOn: { borderColor: theme.colors.primaryBright, borderWidth: 1, backgroundColor: theme.colors.primaryDim },
  respecCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderColor: theme.colors.hp,
  },
});
