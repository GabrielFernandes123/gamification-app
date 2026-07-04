import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Activity,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUp,
  Crown,
  Flag,
  Flame,
  Lock,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Wand2,
  X,
  Zap,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text as RNText,
  type TextProps,
  View,
} from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { ProgressBar } from '@/components/bars/ProgressBar';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { useToast } from '@/components/ui/Toast';
import { ATTRIBUTE_LABEL, ATTRIBUTES } from '@/features/character/attributes';
import { useModules } from '@/features/modules/useModules';
import {
  useApplyObjectiveSuggestion,
  useActivateWeeklyContract,
  useAddObjectiveRequirement,
  useClaimObjective,
  useCreateObjective,
  useCreateObjectiveSuggestion,
  useDeleteObjective,
  useDeleteObjectiveRequirement,
  useDismissObjectiveSuggestion,
  useObjectiveSuggestions,
  useObjectivesOverview,
  useUpdateObjective,
  type ObjectiveKind,
  type ObjectiveOverviewItem,
  type ObjectivePayload,
  type ObjectiveSuggestion,
  type ObjectivesOverview,
  type ObjectiveRequirementPayload,
  type RequirementSourceType,
} from '@/features/objectives/hooks/useObjectives';
import { useHabits, type Habit } from '@/features/habits/hooks/useHabits';
import { useInventory, useSystemItems, useUserItems, type InventoryItem, type SystemItem, type UserItem } from '@/features/store/hooks/useStore';
import { useAllocateAttributePoint } from '@/features/season/hooks/useAllocateAttributePoint';
import {
  useConfigureSeasonStory,
  useEndSeason,
  useGenerateNarrativeBeat,
  useSeasonSaga,
  useSeasonStory,
  useStartSeason,
  useUpgradeSeason,
} from '@/features/season/hooks/useSeasonStory';
import { qk } from '@/lib/queryKeys';
import type {
  ArcMonth,
  Boss,
  BossObjective,
  BossStatus,
  BossTier,
  EconomySourceType,
  NarrativeBeat,
  SagaBeat,
} from '@/types/season';

// Identidade própria da tela de História (arco narrativo imersivo). Foge do
// design system do app de propósito — paleta profunda + roxo/rosa + fontes gamer.
const H = {
  bg: '#0F0F23',
  surface: '#191936',
  surfaceAlt: '#23234A',
  border: 'rgba(167,139,250,0.16)',
  borderStrong: 'rgba(167,139,250,0.45)',
  primary: '#7C3AED',
  primaryBright: '#A78BFA',
  accent: '#F43F5E',
  text: '#E2E8F0',
  textDim: '#9AA3C0',
  success: '#34D399',
  gold: '#FACC15',
  hp: '#F43F5E',
};

const FONT = {
  display: 'RussoOne_400Regular',
  body: 'ChakraPetch_400Regular',
  bodyMed: 'ChakraPetch_500Medium',
  bodySemi: 'ChakraPetch_600SemiBold',
  bodyBold: 'ChakraPetch_700Bold',
};

const SOURCE_LABEL: Record<EconomySourceType, string> = {
  habit: 'Hábitos',
  workout: 'Treino',
  sidequest: 'Side quests',
  body_goal: 'Metas corporais',
  body_measurement: 'Medidas',
  boss: 'Boss',
};

const TIER_LABEL: Record<BossTier, string> = {
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};

const TIER_ROLE: Record<BossTier, string> = {
  mensal: 'Capítulo do mês',
  trimestral: 'Arco trimestral',
  semestral: 'Arco semestral',
  anual: 'Vilão do ano',
};

const TIER_ORDER: Record<BossTier, number> = {
  mensal: 1,
  trimestral: 2,
  semestral: 3,
  anual: 4,
};

const ALL_TIERS: BossTier[] = ['mensal', 'trimestral', 'semestral', 'anual'];

type JourneyAccordionKey =
  | 'lore'
  | 'timeline'
  | 'boss'
  | 'chapters'
  | 'bossObjectives'
  | 'lifeMissions'
  | 'recentDamage';

const ACCORDION_STORAGE_KEY = '@gamificacao/jornada/accordions/v1';

const DEFAULT_ACCORDIONS: Record<JourneyAccordionKey, boolean> = {
  lore: true,
  timeline: true,
  boss: true,
  chapters: true,
  bossObjectives: true,
  lifeMissions: true,
  recentDamage: false,
};

function parseAccordionState(raw: string | null) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next: Partial<Record<JourneyAccordionKey, boolean>> = {};
    (Object.keys(DEFAULT_ACCORDIONS) as JourneyAccordionKey[]).forEach((key) => {
      if (typeof parsed[key] === 'boolean') next[key] = parsed[key];
    });
    return next;
  } catch {
    return {};
  }
}

function usePersistedAccordions() {
  const [open, setOpen] = useState(DEFAULT_ACCORDIONS);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(ACCORDION_STORAGE_KEY)
      .then((raw) => {
        if (!active) return;
        const stored = parseAccordionState(raw);
        setOpen((current) => ({ ...current, ...stored }));
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const toggle = useCallback((key: JourneyAccordionKey) => {
    setOpen((current) => {
      const next = { ...current, [key]: !current[key] };
      AsyncStorage.setItem(ACCORDION_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  return { open, toggle };
}

export default function HistoriaScreen() {
  const qc = useQueryClient();
  const [selectedTier, setSelectedTier] = useState<BossTier>('mensal');
  const story = useSeasonStory(selectedTier);
  const modules = useModules();
  const allocatePoint = useAllocateAttributePoint();
  const generateBeat = useGenerateNarrativeBeat();
  const objectivesOverview = useObjectivesOverview();
  const objectiveSuggestions = useObjectiveSuggestions();
  const claimObjective = useClaimObjective();
  const createObjective = useCreateObjective();
  const updateObjective = useUpdateObjective();
  const deleteObjective = useDeleteObjective();
  const activateContract = useActivateWeeklyContract();
  const addRequirement = useAddObjectiveRequirement();
  const deleteRequirement = useDeleteObjectiveRequirement();
  const createSuggestion = useCreateObjectiveSuggestion();
  const applySuggestion = useApplyObjectiveSuggestion();
  const dismissSuggestion = useDismissObjectiveSuggestion();
  const habits = useHabits();
  const systemItems = useSystemItems();
  const userItems = useUserItems();
  const inventory = useInventory();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [sagaOpen, setSagaOpen] = useState(false);
  const [missionModalOpen, setMissionModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<{ kind: ObjectiveKind; item: ObjectiveOverviewItem } | null>(null);
  const [selectedMission, setSelectedMission] = useState<{ kind: ObjectiveKind; item: ObjectiveOverviewItem } | null>(null);
  const accordions = usePersistedAccordions();

  const moduleLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const mod of modules.data ?? []) map.set(mod.key, mod.nome);
    return map;
  }, [modules.data]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: qk.seasonStory }),
      qc.invalidateQueries({ queryKey: qk.currentSeason }),
      qc.invalidateQueries({ queryKey: qk.modules }),
      qc.invalidateQueries({ queryKey: qk.character }),
      qc.invalidateQueries({ queryKey: qk.objectivesOverview }),
      qc.invalidateQueries({ queryKey: qk.objectiveSuggestions }),
    ]);
    setRefreshing(false);
  }

  function onGenerateBeat() {
    generateBeat.mutate(
      { layer: 4, tier: selectedTier },
      {
        onSuccess: (result) =>
          toast.success(
            result.usedFallback ? 'Beat criado sem IA' : 'Beat narrativo criado',
            result.beat.title ?? 'História atualizada',
          ),
        onError: (error) =>
          toast.error('Erro ao gerar narrativa', String((error as Error).message)),
      },
    );
  }

  if (story.isLoading) {
    return (
      <Screen contentStyle={StyleSheet.flatten([styles.page, styles.center])}>
        <ActivityIndicator color={H.primaryBright} />
        <T variant="bodyMuted">Carregando a aventura...</T>
      </Screen>
    );
  }

  if (story.error || !story.data) {
    return (
      <Screen contentStyle={StyleSheet.flatten([styles.page, styles.content])}>
        <T variant="display">História</T>
        <HCard accent={H.hp}>
          <Shield color={H.hp} size={28} />
          <T variant="title">Aventura indisponível</T>
          <T variant="bodyMuted">
            Não foi possível carregar a temporada atual. Puxe para atualizar e tente
            de novo.
          </T>
          <HButton label="Tentar de novo" onPress={onRefresh} />
        </HCard>
      </Screen>
    );
  }

  if (!story.data.active) {
    return (
      <SeasonSetup
        aiAvailable={story.data.aiAvailable}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
    );
  }

  const {
    boss,
    season: currentSeason,
    objectives,
    recentDamage,
    charges,
    pendingAttributePoints,
    narrativeBeats,
    aiAvailable,
  } = story.data;

  const linked = (story.data.linkedBosses ?? [boss]) as Boss[];
  const currentTopRank = Math.max(...linked.map((b) => TIER_ORDER[b.tier]));
  const upgradeTargets = ALL_TIERS.filter((t) => TIER_ORDER[t] > currentTopRank);

  const completedObjectives = objectives.filter((o) => o.completed).length;
  const arcMonths = story.data.arcMonths ?? [];
  const arcLore =
    currentSeason.arc_lore ??
    currentSeason.lore ??
    'A historia ainda esta tomando forma...';
  const weaknessLabel =
    (boss.weakness_module_key && moduleLabels.get(boss.weakness_module_key)) ||
    (boss.weakness_module_key
      ? SOURCE_LABEL[boss.weakness_module_key]
      : 'Não revelada');

  return (
    <Screen scroll refreshing={refreshing} onRefresh={onRefresh} contentStyle={styles.page}>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.flex}>
            <T variant="label" color={H.primaryBright}>
              Arco da temporada
            </T>
            <T variant="display" numberOfLines={2}>
              {currentSeason.name}
            </T>
          </View>
          <View style={styles.topActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir configuracoes da jornada"
              onPress={() => setSettingsOpen(true)}
              style={styles.iconButton}
            >
              <SlidersHorizontal color={H.text} size={19} />
            </Pressable>
            <StatusPill status={boss.status} />
          </View>
        </View>

        <Reveal>
          <AccordionSection
            title="A jornada ate aqui"
            hint="Lore"
            open={accordions.open.lore}
            onToggle={() => accordions.toggle('lore')}
            accent={H.primaryBright}
            summary={<T variant="bodyMuted" numberOfLines={2}>{arcLore}</T>}
            style={styles.loreCard}
          >
            <View style={styles.rowGap}>
              <View style={styles.loreIcon}>
                <BookOpen color={H.text} size={20} />
              </View>
              <T variant="label" color={H.primaryBright}>
                A jornada até aqui
              </T>
            </View>
            <T variant="lore">
              {currentSeason.arc_lore ??
                currentSeason.lore ??
                'A história ainda está tomando forma...'}
            </T>
          </AccordionSection>
        </Reveal>

        {arcMonths.length > 1 ? (
          <Reveal>
            <AccordionSection
              title="Linha de bosses"
              hint={`${arcMonths.length} meses`}
              open={accordions.open.timeline}
              onToggle={() => accordions.toggle('timeline')}
              summary={
                <SummaryStrip
                  items={[
                    { label: 'Selecionado', value: TIER_LABEL[selectedTier], color: TIER_VISUAL[selectedTier].color },
                    { label: 'Meses', value: String(arcMonths.length) },
                  ]}
                />
              }
            >
              <BossTimeline
                months={arcMonths}
                today={story.data.today}
                linked={linked}
                selected={selectedTier}
                onSelect={setSelectedTier}
              />
            </AccordionSection>
          </Reveal>
        ) : null}

        <Reveal>
          <AccordionSection
            title="Boss atual"
            hint={TIER_LABEL[boss.tier]}
            open={accordions.open.boss}
            onToggle={() => accordions.toggle('boss')}
            accent={TIER_VISUAL[boss.tier].color}
            summary={
              <SummaryStrip
                items={[
                  { label: 'HP', value: `${boss.current_hp}/${boss.max_hp}`, color: H.hp },
                  { label: 'Fraqueza', value: weaknessLabel },
                  { label: 'Cargas', value: String(charges), color: H.primaryBright },
                ]}
              />
            }
          >
            <BossHero boss={boss} weaknessLabel={weaknessLabel} charges={charges} />
          </AccordionSection>
        </Reveal>

        <JourneySettingsModal
          visible={settingsOpen}
          selectedTier={selectedTier}
          upgradeTargets={upgradeTargets}
          originalStart={boss.window_start}
          aiAvailable={aiAvailable}
          generatePending={generateBeat.isPending}
          onGenerateBeat={onGenerateBeat}
          onClose={() => setSettingsOpen(false)}
        />


        <AccordionSection
          title="Capitulos"
          hint={`${narrativeBeats.length} beats`}
          open={accordions.open.chapters}
          onToggle={() => accordions.toggle('chapters')}
          summary={
            <T variant="bodyMuted" numberOfLines={2}>
              {narrativeBeats[0]?.title ?? 'Nenhum capitulo escrito ainda'}
            </T>
          }
        >
          <ChapterTimeline beats={narrativeBeats.slice(0, 3)} />
          <HButton
            label="Ler a saga completa"
            variant="outline"
            icon={<BookOpen color={H.text} size={18} />}
            onPress={() => setSagaOpen(true)}
          />
        </AccordionSection>
        <SagaModal visible={sagaOpen} onClose={() => setSagaOpen(false)} />

        {pendingAttributePoints > 0 ? (
          <AllocatePanel
            pending={pendingAttributePoints}
            disabled={allocatePoint.isPending}
            onAllocate={(key, label) =>
              allocatePoint.mutate(key, {
                onSuccess: () => toast.success('Ponto alocado', `+1 ${label}`),
                onError: (error) =>
                  toast.error('Erro ao alocar', String((error as Error).message)),
              })
            }
          />
        ) : null}

        <AccordionSection
          title="Objetivos"
          hint={`${completedObjectives}/${objectives.length} concluidos`}
          open={accordions.open.bossObjectives}
          onToggle={() => accordions.toggle('bossObjectives')}
          summary={
            <SummaryStrip
              items={[
                { label: 'Concluidos', value: `${completedObjectives}/${objectives.length}`, color: H.success },
                { label: 'Dano', value: `${objectives.reduce((sum, item) => sum + (item.completed ? item.boss_damage : 0), 0)}` },
              ]}
            />
          }
        >
          <View style={styles.stack}>
            {objectives.length === 0 ? (
              <HCard>
                <T variant="bodyMuted">Nenhum objetivo gerado para este boss.</T>
              </HCard>
            ) : (
              objectives.map((o) => (
                <ObjectiveCard key={o.id} objective={o} moduleLabels={moduleLabels} />
              ))
            )}
          </View>
        </AccordionSection>
        <AccordionSection
          title="Missoes da vida"
          hint="Metas e contratos"
          open={accordions.open.lifeMissions}
          onToggle={() => accordions.toggle('lifeMissions')}
          summary={
            <LifeMissionsSummary
              overview={objectivesOverview.data}
              suggestions={objectiveSuggestions.data ?? []}
            />
          }
        >
          <ObjectiveEnginePanel
          overview={objectivesOverview.data}
          suggestions={objectiveSuggestions.data ?? []}
          loading={objectivesOverview.isLoading || objectiveSuggestions.isLoading}
          pending={
            claimObjective.isPending ||
            createObjective.isPending ||
            updateObjective.isPending ||
            deleteObjective.isPending ||
            activateContract.isPending ||
            createSuggestion.isPending ||
            applySuggestion.isPending ||
            dismissSuggestion.isPending
          }
          onNewObjective={() => {
            setEditingMission(null);
            setMissionModalOpen(true);
          }}
          onActivateContract={(item) =>
            activateContract.mutate(item.id, {
              onSuccess: () => toast.success('Contrato ativado', item.name),
              onError: (error) => toast.error('Erro ao ativar', String((error as Error).message)),
            })
          }
          onEditObjective={(kind, item) => {
            setEditingMission({ kind, item });
            setMissionModalOpen(true);
          }}
          onOpenDetails={(kind, item) => setSelectedMission({ kind, item })}
          onDeleteObjective={(kind, item) =>
            Alert.alert('Remover missão?', `Remover "${item.name}"?`, [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Remover',
                style: 'destructive',
                onPress: () =>
                  deleteObjective.mutate(
                    { kind, id: item.id },
                    {
                      onSuccess: () => toast.success('Missão removida', item.name),
                      onError: (error) => toast.error('Erro ao remover', String((error as Error).message)),
                    },
                  ),
              },
            ])
          }
          onClaim={(kind, item) =>
            claimObjective.mutate(
              { kind, id: item.id },
              {
                onSuccess: () => toast.success('Recompensa resgatada', item.name),
                onError: (error) => toast.error('Erro ao resgatar', String((error as Error).message)),
              },
            )
          }
          onCreateSuggestion={() =>
            createSuggestion.mutate(undefined, {
              onSuccess: (suggestion) => toast.success('Sugestão criada', suggestion.title),
              onError: (error) => toast.error('Erro ao sugerir', String((error as Error).message)),
            })
          }
          onApplySuggestion={(suggestion) =>
            applySuggestion.mutate(suggestion.id, {
              onSuccess: () => toast.success('Sugestão aplicada', suggestion.title),
              onError: (error) => toast.error('Erro ao aplicar', String((error as Error).message)),
            })
          }
          onDismissSuggestion={(suggestion) =>
            dismissSuggestion.mutate(suggestion.id, {
              onSuccess: () => toast.success('Sugestão descartada', suggestion.title),
              onError: (error) => toast.error('Erro ao descartar', String((error as Error).message)),
            })
          }
        />

        </AccordionSection>
        <AccordionSection
          title="Dano recente"
          hint="Ultimos golpes"
          open={accordions.open.recentDamage}
          onToggle={() => accordions.toggle('recentDamage')}
          summary={
            <SummaryStrip
              items={[
                { label: 'Eventos', value: String(recentDamage.length) },
                { label: 'Dano', value: String(recentDamage.slice(0, 8).reduce((sum, event) => sum + event.amount, 0)), color: H.hp },
              ]}
            />
          }
        >
          <HCard style={styles.stack}>
            {recentDamage.length === 0 ? (
              <T variant="bodyMuted">Complete atividades para atacar o boss.</T>
            ) : (
              recentDamage.slice(0, 8).map((event) => (
                <View key={event.id} style={styles.damageRow}>
                  <View style={styles.damageDot}>
                    <Activity color={H.text} size={15} />
                  </View>
                  <View style={styles.flex}>
                    <T variant="bodyMed">
                      {event.amount} dano
                      {event.was_critical ? ' critico' : ''}
                      {event.was_weakness ? ' na fraqueza' : ''}
                    </T>
                    <T variant="bodyMuted">
                      {event.source_type
                        ? moduleLabels.get(event.source_type) ??
                          SOURCE_LABEL[event.source_type]
                        : 'Evento'}{' '}
                      - {formatDateTime(event.occurred_at)}
                    </T>
                  </View>
                </View>
              ))
            )}
          </HCard>
        </AccordionSection>
        <ObjectiveFormModal
          visible={missionModalOpen}
          editing={editingMission}
          habits={habits.data ?? []}
          systemItems={systemItems.data ?? []}
          userItems={userItems.data ?? []}
          inventoryItems={inventory.data ?? []}
          loading={createObjective.isPending || updateObjective.isPending || addRequirement.isPending || deleteRequirement.isPending}
          onClose={() => {
            setEditingMission(null);
            setMissionModalOpen(false);
          }}
          onSubmit={(kind, payload) =>
            editingMission
              ? updateObjective.mutate(
                  { kind: editingMission.kind, id: editingMission.item.id, payload },
                  {
                    onSuccess: (objective) => {
                      setEditingMission(null);
                      setMissionModalOpen(false);
                      toast.success('Missão atualizada', objective.name);
                    },
                    onError: (error) => toast.error('Erro ao atualizar missão', String((error as Error).message)),
                  },
                )
              : createObjective.mutate(
                  { kind, payload },
                  {
                    onSuccess: (objective) => {
                      setMissionModalOpen(false);
                      toast.success('Missão criada', objective.name);
                    },
                    onError: (error) => toast.error('Erro ao criar missão', String((error as Error).message)),
                  },
                )
          }
          onAddRequirement={(groupId, payload) => {
            if (!editingMission) return;
            addRequirement.mutate(
              { kind: editingMission.kind, groupId, payload },
              {
                onSuccess: () => toast.success('Requisito adicionado', editingMission.item.name),
                onError: (error) => toast.error('Erro ao adicionar requisito', String((error as Error).message)),
              },
            );
          }}
          onDeleteRequirement={(requirementId) => {
            if (!editingMission) return;
            deleteRequirement.mutate(
              { kind: editingMission.kind, requirementId },
              {
                onSuccess: () => toast.success('Requisito removido', editingMission.item.name),
                onError: (error) => toast.error('Erro ao remover requisito', String((error as Error).message)),
              },
            );
          }}
        />

        <ObjectiveDetailModal
          mission={selectedMission}
          pending={deleteObjective.isPending || updateObjective.isPending || claimObjective.isPending || activateContract.isPending}
          onClose={() => setSelectedMission(null)}
          onEdit={(kind, item) => {
            setSelectedMission(null);
            setEditingMission({ kind, item });
            setMissionModalOpen(true);
          }}
          onDelete={(kind, item) =>
            Alert.alert('Remover missão?', `Remover "${item.name}"?`, [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Remover',
                style: 'destructive',
                onPress: () =>
                  deleteObjective.mutate(
                    { kind, id: item.id },
                    {
                      onSuccess: () => {
                        setSelectedMission(null);
                        toast.success('Missão removida', item.name);
                      },
                      onError: (error) => toast.error('Erro ao remover', String((error as Error).message)),
                    },
                  ),
              },
            ])
          }
          onClaim={(kind, item) =>
            claimObjective.mutate(
              { kind, id: item.id },
              {
                onSuccess: () => {
                  setSelectedMission(null);
                  toast.success('Recompensa resgatada', item.name);
                },
                onError: (error) => toast.error('Erro ao resgatar', String((error as Error).message)),
              },
            )
          }
          onActivate={(item) =>
            activateContract.mutate(item.id, {
              onSuccess: () => {
                setSelectedMission(null);
                toast.success('Contrato ativado', item.name);
              },
              onError: (error) => toast.error('Erro ao ativar', String((error as Error).message)),
            })
          }
        />
      </View>
    </Screen>
  );
}

// ---- visual por tier ----

const TIER_VISUAL: Record<
  BossTier,
  { color: string; Icon: typeof Swords; width: number }
> = {
  mensal: { color: H.hp, Icon: Swords, width: 132 },
  trimestral: { color: '#22D3EE', Icon: Shield, width: 154 },
  semestral: { color: H.gold, Icon: Flame, width: 172 },
  anual: { color: H.accent, Icon: Crown, width: 196 },
};

const MONTH_CARD_GAP = 12;

type MonthState = 'past' | 'current' | 'future';

// ---- boss hero (tematizado por tier) ----

function BossHero({
  boss,
  weaknessLabel,
  charges,
}: {
  boss: Boss;
  weaknessLabel: string;
  charges: number;
}) {
  const visual = TIER_VISUAL[boss.tier];
  const Icon = visual.Icon;
  const hpProgress = boss.max_hp > 0 ? boss.current_hp / boss.max_hp : 0;
  const damageDone = Math.max(0, boss.max_hp - boss.current_hp);

  return (
    <HCard accent={visual.color} style={styles.heroCard}>
      <View style={styles.rowGap}>
        <View style={[styles.heroIcon, { backgroundColor: visual.color }]}>
          <Icon color={H.text} size={28} />
        </View>
        <View style={styles.flex}>
          <T variant="label" color={visual.color}>
            {TIER_ROLE[boss.tier]}
          </T>
          <T variant="h1" numberOfLines={2}>
            {boss.name}
          </T>
          <T variant="bodyMuted">
            {formatDate(boss.window_start)} — {formatDate(boss.window_end)}
          </T>
        </View>
      </View>

      {boss.description ? (
        <T variant="quote" color={visual.color}>
          “{boss.description}”
        </T>
      ) : null}

      <View style={styles.hpBlock}>
        <View style={styles.spaceBetween}>
          <T variant="label">HP do boss</T>
          <T variant="stat" color={H.hp}>
            {boss.current_hp}/{boss.max_hp}
          </T>
        </View>
        <ProgressBar progress={hpProgress} color={H.hp} height={14} />
        <T variant="bodyMuted">{damageDone} de dano causado</T>
      </View>

      <View style={styles.metrics}>
        <MetricChip icon={<Zap color={H.gold} size={16} />} label="Fraqueza" value={weaknessLabel} />
        <MetricChip icon={<Flame color={H.accent} size={16} />} label="Ataque" value={`${boss.attack_boss} HP`} />
        <MetricChip icon={<Sparkles color={H.primaryBright} size={16} />} label="Cargas" value={String(charges)} />
      </View>
    </HCard>
  );
}

// ---- linha de bosses (unificada: meses + marcos de tier) ----

type TimelineItem =
  | { type: 'month'; index: number; month: ArcMonth; state: MonthState }
  | { type: 'tier'; tier: BossTier; boundary: number; state: MonthState; boss: Boss | null };

function buildTimelineItems(
  months: ArcMonth[],
  currentIndex: number,
  linkedByTier: Map<BossTier, Boss>,
): TimelineItem[] {
  const topSpan = months.length;
  const tierSpans: [BossTier, number][] = [
    ['trimestral', 3],
    ['semestral', 6],
    ['anual', 12],
  ];
  const tiers = tierSpans.filter(([, s]) => s <= topSpan && topSpan % s === 0);
  const items: TimelineItem[] = [];

  months.forEach((m, i) => {
    const state: MonthState =
      i < currentIndex ? 'past' : i === currentIndex ? 'current' : 'future';
    items.push({ type: 'month', index: i, month: m, state });

    const boundary = i + 1; // este mês fecha um período?
    for (const [tier, span] of tiers) {
      if (boundary % span !== 0) continue;
      const curBoundary = (Math.floor(currentIndex / span) + 1) * span;
      const tstate: MonthState =
        boundary < curBoundary ? 'past' : boundary === curBoundary ? 'current' : 'future';
      const boss = tstate === 'current' ? linkedByTier.get(tier) ?? null : null;
      items.push({ type: 'tier', tier, boundary, state: tstate, boss });
    }
  });

  return items;
}

function itemWidth(item: TimelineItem): number {
  return item.type === 'month'
    ? TIER_VISUAL.mensal.width
    : TIER_VISUAL[item.tier].width;
}

function BossTimeline({
  months,
  today,
  linked,
  selected,
  onSelect,
}: {
  months: ArcMonth[];
  today?: string;
  linked: Boss[];
  selected: BossTier;
  onSelect: (tier: BossTier) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);

  const currentIndex = useMemo(() => {
    if (!today) return 0;
    let idx = 0;
    months.forEach((m, i) => {
      if (m.unlockOn <= today) idx = i;
    });
    return idx;
  }, [months, today]);

  const linkedByTier = useMemo(
    () => new Map(linked.map((b) => [b.tier, b] as const)),
    [linked],
  );
  const items = useMemo(
    () => buildTimelineItems(months, currentIndex, linkedByTier),
    [months, currentIndex, linkedByTier],
  );

  // Centraliza no mês atual ao montar (scroll determinístico por largura conhecida).
  useEffect(() => {
    const target = items.findIndex((it) => it.type === 'month' && it.index === currentIndex);
    if (target <= 0 || !scrollRef.current) return;
    let x = 0;
    for (let i = 0; i < target; i++) x += itemWidth(items[i]) + MONTH_CARD_GAP;
    scrollRef.current.scrollTo({ x: Math.max(0, x - 24), animated: false });
  }, [items, currentIndex]);

  return (
    <View style={styles.journeyWrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.journeyList}
      >
        {items.map((it) =>
          it.type === 'month' ? (
            <MonthCard
              key={`m${it.index}`}
              month={it.month}
              state={it.state}
              selected={selected === 'mensal' && it.state === 'current'}
              onPress={() => it.month.boss && onSelect('mensal')}
            />
          ) : (
            <TierMilestoneCard
              key={`t${it.tier}${it.boundary}`}
              tier={it.tier}
              state={it.state}
              boss={it.boss}
              selected={selected === it.tier}
              onPress={() => it.boss && onSelect(it.tier)}
            />
          ),
        )}
      </ScrollView>
    </View>
  );
}

function MonthCard({
  month,
  state,
  selected,
  onPress,
}: {
  month: ArcMonth;
  state: MonthState;
  selected: boolean;
  onPress: () => void;
}) {
  const boss = month.boss;
  const isFuture = state === 'future';
  const accent =
    state === 'current' ? H.primaryBright : state === 'past' ? H.success : H.textDim;
  const name = isFuture || !boss ? '???' : boss.name;
  const icon = isFuture ? (
    <Lock color={accent} size={15} />
  ) : state === 'past' ? (
    <Check color={accent} size={15} />
  ) : (
    <Swords color={accent} size={15} />
  );
  const sub =
    state === 'current'
      ? 'Em andamento'
      : state === 'past'
        ? boss?.status === 'vencido'
          ? 'Vencido'
          : boss?.status === 'perdido'
            ? 'Perdido'
            : 'Concluído'
        : `Abre ${formatDate(month.unlockOn)}`;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!boss}
      onPress={onPress}
      style={[
        styles.monthCard,
        (state === 'current' || selected) && styles.monthCardCurrent,
        isFuture && styles.monthCardFuture,
      ]}
    >
      <View style={styles.spaceBetween}>
        <T variant="label" color={accent}>
          Mês {month.monthIndex + 1}
        </T>
        {icon}
      </View>
      <T variant="chapterTitle" numberOfLines={2} color={isFuture ? H.textDim : H.text}>
        {name}
      </T>
      <T variant="bodyMuted" numberOfLines={1}>
        {sub}
      </T>
    </Pressable>
  );
}

function TierMilestoneCard({
  tier,
  state,
  boss,
  selected,
  onPress,
}: {
  tier: BossTier;
  state: MonthState;
  boss: Boss | null;
  selected: boolean;
  onPress: () => void;
}) {
  const visual = TIER_VISUAL[tier];
  const Icon = visual.Icon;
  const isFuture = state === 'future';
  const name = boss ? boss.name : isFuture ? '???' : TIER_LABEL[tier];
  const sub =
    state === 'current' ? 'Em andamento' : state === 'past' ? 'Concluído' : 'A revelar';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!boss}
      onPress={onPress}
      style={[
        styles.tierCard,
        { width: visual.width, borderColor: visual.color },
        selected && { backgroundColor: H.surfaceAlt },
        isFuture && styles.monthCardFuture,
      ]}
    >
      <View style={styles.spaceBetween}>
        <View style={[styles.tierBadge, { backgroundColor: visual.color }]}>
          <Icon color={H.text} size={16} />
        </View>
        <T variant="label" color={visual.color}>
          {TIER_LABEL[tier]}
        </T>
      </View>
      <T variant="chapterTitle" numberOfLines={2} color={isFuture ? H.textDim : H.text}>
        {name}
      </T>
      <T variant="bodyMuted" numberOfLines={1}>
        {sub}
      </T>
    </Pressable>
  );
}

// ---- upgrade card ----

function UpgradeCard({
  targets,
  originalStart,
}: {
  targets: BossTier[];
  originalStart: string;
}) {
  const upgrade = useUpgradeSeason();
  const toast = useToast();

  function onUpgrade(toTier: BossTier) {
    Alert.alert(
      `Promover para ${TIER_LABEL[toTier]}`,
      `Isso adiciona os bosses dos tiers superiores ao seu arco (ancorados no início da aventura, ${formatDate(
        originalStart,
      )}) e estende a história. Você não perde nada do que já conquistou. A IA vai reescrever a identidade da cadeia. Confirmar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Promover',
          onPress: () =>
            upgrade.mutate(toTier, {
              onSuccess: () =>
                toast.success(
                  'Aventura promovida',
                  `O arco agora vai até ${TIER_LABEL[toTier]}.`,
                ),
              onError: (error) =>
                toast.error('Erro ao promover', String((error as Error).message)),
            }),
        },
      ],
    );
  }

  return (
    <HCard accent={H.gold} style={styles.upgradeCard}>
      <View style={styles.rowGap}>
        <ChevronsUp color={H.gold} size={20} />
        <View style={styles.flex}>
          <T variant="title">Promover aventura</T>
          <T variant="bodyMuted">
            Quer mais tempo? Suba de tier — não dá pra esticar o mesmo, mas você pode
            transformar este arco em algo maior.
          </T>
        </View>
      </View>
      <View style={styles.upgradeRow}>
        {targets.map((tier) => (
          <Pressable
            key={tier}
            accessibilityRole="button"
            disabled={upgrade.isPending}
            onPress={() => onUpgrade(tier)}
            style={[styles.upgradeChip, upgrade.isPending && styles.disabled]}
          >
            <T variant="bodySemi" color={H.gold}>
              {TIER_LABEL[tier]}
            </T>
          </Pressable>
        ))}
      </View>
    </HCard>
  );
}

// ---- saga completa (todos os bosses) ----

function SagaModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const saga = useSeasonSaga(visible);
  const beats = saga.data?.beats ?? [];
  const arcLore = saga.data?.arcLore ?? null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.sagaScreen}>
        <View style={styles.sagaHeader}>
          <View style={styles.flex}>
            <T variant="label" color={H.primaryBright}>
              A saga completa
            </T>
            <T variant="display">Sua história</T>
          </View>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.sagaClose}>
            <X color={H.text} size={22} />
          </Pressable>
        </View>

        {saga.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={H.primaryBright} />
            <T variant="bodyMuted">Reunindo os capítulos...</T>
          </View>
        ) : beats.length === 0 ? (
          <View style={styles.center}>
            <T variant="bodyMuted">A saga ainda não tem capítulos.</T>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.sagaList}
            showsVerticalScrollIndicator={false}
          >
            {arcLore ? (
              <HCard accent={H.primaryBright} style={styles.sagaPrologue}>
                <T variant="label" color={H.primaryBright}>
                  Prólogo · o fio do arco
                </T>
                <T variant="lore">{arcLore}</T>
              </HCard>
            ) : null}
            {beats.map((beat, i) => (
              <SagaBeatCard key={beat.id} beat={beat} last={i === beats.length - 1} />
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function SagaBeatCard({ beat, last }: { beat: SagaBeat; last: boolean }) {
  const tier = beat.tier;
  const color = tier ? TIER_VISUAL[tier].color : H.primaryBright;
  const origin = [
    tier ? TIER_LABEL[tier] : beat.kind,
    beat.boss_name,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.chapterRow}>
      <View style={styles.chapterGutter}>
        <View style={[styles.chapterDot, { backgroundColor: color, borderColor: color }]} />
        {!last ? <View style={styles.chapterLine} /> : null}
      </View>
      <HCard style={styles.chapterCard}>
        <View style={styles.spaceBetween}>
          <T variant="label" color={color} numberOfLines={1} style={styles.flex}>
            {origin}
          </T>
          <T variant="bodyMuted">{formatDateTime(beat.created_at)}</T>
        </View>
        <T variant="chapterTitle">{beat.title ?? 'Capítulo'}</T>
        <T variant="body">{beat.content}</T>
      </HCard>
    </View>
  );
}

// ---- timeline ----

function ChapterTimeline({ beats }: { beats: NarrativeBeat[] }) {
  if (beats.length === 0) {
    return (
      <HCard>
        <T variant="bodyMuted">
          A primeira página ainda não foi escrita. Aja nos seus módulos para começar.
        </T>
      </HCard>
    );
  }
  return (
    <View>
      {beats.map((beat, i) => (
        <ChapterCard key={beat.id} beat={beat} index={i} last={i === beats.length - 1} />
      ))}
    </View>
  );
}

function ChapterCard({
  beat,
  index,
  last,
}: {
  beat: NarrativeBeat;
  index: number;
  last: boolean;
}) {
  const dotColor =
    beat.kind === 'enrave' ? H.accent : beat.kind === 'marco' ? H.success : H.primaryBright;
  return (
    <Reveal delay={index * 45}>
      <View style={styles.chapterRow}>
        <View style={styles.chapterGutter}>
          <View style={[styles.chapterDot, { backgroundColor: dotColor, borderColor: dotColor }]} />
          {!last ? <View style={styles.chapterLine} /> : null}
        </View>
        <HCard style={styles.chapterCard}>
          <View style={styles.spaceBetween}>
            <T variant="label" color={dotColor}>
              {beat.kind}
            </T>
            <T variant="bodyMuted">{formatDateTime(beat.created_at)}</T>
          </View>
          <T variant="chapterTitle">{beat.title ?? 'Novo capítulo'}</T>
          <T variant="body">{beat.content}</T>
        </HCard>
      </View>
    </Reveal>
  );
}

// ---- objectives / allocate ----

type ObjectiveEntry = {
  kind: ObjectiveKind;
  label: string;
  item: ObjectiveOverviewItem;
  color: string;
};

function ObjectiveEnginePanel({
  overview,
  suggestions,
  loading,
  pending,
  onNewObjective,
  onClaim,
  onActivateContract,
  onEditObjective,
  onOpenDetails,
  onDeleteObjective,
  onCreateSuggestion,
  onApplySuggestion,
  onDismissSuggestion,
}: {
  overview?: ObjectivesOverview;
  suggestions: ObjectiveSuggestion[];
  loading: boolean;
  pending: boolean;
  onNewObjective: () => void;
  onClaim: (kind: ObjectiveKind, item: ObjectiveOverviewItem) => void;
  onActivateContract: (item: ObjectiveOverviewItem) => void;
  onEditObjective: (kind: ObjectiveKind, item: ObjectiveOverviewItem) => void;
  onOpenDetails: (kind: ObjectiveKind, item: ObjectiveOverviewItem) => void;
  onDeleteObjective: (kind: ObjectiveKind, item: ObjectiveOverviewItem) => void;
  onCreateSuggestion: () => void;
  onApplySuggestion: (suggestion: ObjectiveSuggestion) => void;
  onDismissSuggestion: (suggestion: ObjectiveSuggestion) => void;
}) {
  const entries = useMemo<ObjectiveEntry[]>(() => {
    if (!overview) return [];
    return [
      ...overview.compositeGoals.map((item) => ({
        kind: 'compositeGoal' as const,
        label: 'Meta fixa',
        item,
        color: H.primaryBright,
      })),
      ...overview.activeChallenges.map((item) => ({
        kind: 'temporaryChallenge' as const,
        label: 'Desafio',
        item,
        color: H.accent,
      })),
      ...overview.activeContracts.map((item) => ({
        kind: 'weeklyContract' as const,
        label: 'Contrato',
        item,
        color: H.gold,
      })),
    ];
  }, [overview]);
  const pendingSuggestions = suggestions.filter((s) => s.status === 'pending').slice(0, 2);
  return (
    <>
      <HCard accent={H.gold} style={styles.objectiveEngineCard}>
        <View style={styles.spaceBetween}>
          <View style={styles.rowGap}>
            <Flag color={H.gold} size={18} />
            <T variant="title">Metas, desafios e contratos</T>
          </View>
          {loading ? (
            <ActivityIndicator color={H.gold} />
          ) : (
            <HButton label="Nova missão" onPress={onNewObjective} />
          )}
        </View>

        {entries.length === 0 ? (
          <T variant="bodyMuted">Nenhuma missão ativa encontrada.</T>
        ) : (
          entries.slice(0, 6).map((entry) => (
            <JourneyObjectiveRow
              key={`${entry.kind}-${entry.item.id}`}
              entry={entry}
              pending={pending}
              onClaim={() => onClaim(entry.kind, entry.item)}
              onActivate={() => onActivateContract(entry.item)}
              onEdit={() => onEditObjective(entry.kind, entry.item)}
              onDetails={() => onOpenDetails(entry.kind, entry.item)}
              onDelete={() => onDeleteObjective(entry.kind, entry.item)}
            />
          ))
        )}

        <View style={styles.suggestionHeader}>
          <View style={styles.flex}>
            <T variant="label" color={H.primaryBright}>
              Sugestões
            </T>
            <T variant="bodyMuted">A API cruza hábitos, falhas e padrões para propor novas missões.</T>
          </View>
          <HButton
            label={pending ? 'Gerando...' : 'Sugerir'}
            icon={<Sparkles color={H.text} size={16} />}
            onPress={onCreateSuggestion}
            loading={pending}
          />
        </View>

        {pendingSuggestions.length === 0 ? (
          <T variant="bodyMuted">Sem sugestões pendentes no momento.</T>
        ) : (
          pendingSuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              pending={pending}
              onApply={() => onApplySuggestion(suggestion)}
              onDismiss={() => onDismissSuggestion(suggestion)}
            />
          ))
        )}
      </HCard>
    </>
  );
}

function JourneyObjectiveRow({
  entry,
  pending,
  onClaim,
  onActivate,
  onEdit,
  onDetails,
  onDelete,
}: {
  entry: ObjectiveEntry;
  pending: boolean;
  onClaim: () => void;
  onActivate: () => void;
  onEdit: () => void;
  onDetails: () => void;
  onDelete: () => void;
}) {
  const { progress, label } = objectiveProgress(entry.item);
  const claimed = Boolean(entry.item.claim?.claimed);
  const canClaim = Boolean(entry.item.progress?.passed && !claimed);

  if (claimed) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onDetails}
        style={styles.claimedMissionRow}
      >
        <View style={styles.claimedMissionIcon}>
          <Check color={H.success} size={16} />
        </View>
        <View style={styles.flex}>
          <T variant="bodyMed" numberOfLines={1}>
            {entry.item.name}
          </T>
          <T variant="bodyMuted" numberOfLines={1}>
            {entry.label} - {objectiveRewardLabel(entry.item)}
          </T>
        </View>
        <View style={styles.claimedMissionBadge}>
          <T variant="label" color={H.success}>
            Resgatada
          </T>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.missionRow}>
      <Pressable onPress={onDetails} accessibilityRole="button" style={styles.missionPressArea}>
        <View style={styles.spaceBetween}>
          <View style={styles.flex}>
            <T variant="bodyMed">{entry.item.name}</T>
            <T variant="bodyMuted">{entry.item.description ?? entry.label}</T>
          </View>
          <View style={[styles.missionBadge, { borderColor: entry.color }]}>
            <T variant="label" color={entry.color}>
              {entry.label}
            </T>
          </View>
        </View>
        <ProgressBar progress={progress} color={entry.color} height={8} />
      </Pressable>
      <View style={styles.objectiveFooter}>
        <T variant="bodyMuted" style={styles.flex}>{label}</T>
        {entry.kind === 'weeklyContract' && entry.item.status === 'draft' ? (
          <HButton label="Ativar" onPress={onActivate} loading={pending} />
        ) : claimed ? (
          <View style={[styles.statusPill, { borderColor: H.success }]}>
            <T variant="label" color={H.success}>Resgatado</T>
          </View>
        ) : canClaim ? (
          <HButton label="Resgatar" onPress={onClaim} loading={pending} />
        ) : (
          <View style={[styles.statusPill, { borderColor: H.border }]}>
            <T variant="label">Em progresso</T>
          </View>
        )}
      </View>
      {entry.item.progress?.groups?.flatMap((group) => group.requirements ?? []).map((requirement) => (
        <View key={requirement.id} style={styles.requirementLine}>
          <T variant="bodyMuted" style={styles.flex}>
            {requirementLabel(requirement.metric)} · {periodLabel(requirement.periodScope)}
          </T>
          <T variant="label" color={requirement.passed ? H.success : H.textDim}>
            {requirement.currentValue}/{requirement.targetValue}
          </T>
        </View>
      ))}
    </View>
  );
}

function SuggestionCard({
  suggestion,
  pending,
  onApply,
  onDismiss,
}: {
  suggestion: ObjectiveSuggestion;
  pending: boolean;
  onApply: () => void;
  onDismiss: () => void;
}) {
  return (
    <View style={styles.suggestionCard}>
      <View style={styles.rowGap}>
        <Sparkles color={H.primaryBright} size={17} />
        <T variant="bodyMed" style={styles.flex}>
          {suggestion.title}
        </T>
      </View>
      <T variant="bodyMuted">{suggestion.summary}</T>
      {suggestion.aiSummary ? <T variant="lore">{suggestion.aiSummary}</T> : null}
      <View style={styles.compactActions}>
        <HButton label="Aplicar" onPress={onApply} loading={pending} />
        <HButton label="Descartar" variant="outline" onPress={onDismiss} loading={pending} />
      </View>
    </View>
  );
}

function objectiveProgress(item: ObjectiveOverviewItem) {
  const groups = item.progress?.groups ?? [];
  const total = groups.reduce((sum, group) => sum + group.requiredCount, 0);
  const done = groups.reduce((sum, group) => sum + Math.min(group.passedCount, group.requiredCount), 0);
  if (total > 0) {
    return { progress: Math.min(1, done / total), label: `${done}/${total} requisitos` };
  }
  return {
    progress: item.progress?.passed ? 1 : 0,
    label: item.progress?.passed ? 'Completa' : 'Aguardando progresso',
  };
}

type MissionMetric = 'habit_success_days' | 'habit_executions' | 'workout_sessions' | 'body_measurement_count' | 'xp_gained' | 'gold_gained';

function ObjectiveFormModal({
  visible,
  editing,
  habits,
  systemItems,
  userItems,
  inventoryItems,
  loading,
  onClose,
  onSubmit,
  onAddRequirement,
  onDeleteRequirement,
}: {
  visible: boolean;
  editing: { kind: ObjectiveKind; item: ObjectiveOverviewItem } | null;
  habits: Habit[];
  systemItems: SystemItem[];
  userItems: UserItem[];
  inventoryItems: InventoryItem[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (kind: ObjectiveKind, payload: ObjectivePayload) => void;
  onAddRequirement: (groupId: string, payload: ObjectiveRequirementPayload) => void;
  onDeleteRequirement: (requirementId: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [kind, setKind] = useState<ObjectiveKind>('compositeGoal');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState('3');
  const [metric, setMetric] = useState<MissionMetric>('habit_success_days');
  const [habitId, setHabitId] = useState<string>('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'manual'>('weekly');
  const [rewardKind, setRewardKind] = useState<'none' | 'system' | 'custom'>('none');
  const [rewardId, setRewardId] = useState('');
  const [rewardQuantity, setRewardQuantity] = useState('1');
  const [stakeKind, setStakeKind] = useState<'none' | 'system' | 'custom'>('none');
  const [stakeId, setStakeId] = useState('');
  const [stakeQuantity, setStakeQuantity] = useState('1');
  const [draftRequirements, setDraftRequirements] = useState<ObjectiveRequirementPayload[]>([]);

  useEffect(() => {
    if (!visible) return;
    if (!editing) {
      setKind('compositeGoal');
      setName('');
      setDescription('');
      setTarget('3');
      setMetric('habit_success_days');
      setHabitId('');
      setStartDate(today);
      setEndDate(today);
      setFrequency('weekly');
      setRewardKind('none');
      setRewardId('');
      setRewardQuantity('1');
      setStakeKind('none');
      setStakeId('');
      setStakeQuantity('1');
      setDraftRequirements([]);
      return;
    }
    const item = editing.item;
    setKind(editing.kind);
    setName(item.name);
    setDescription(item.description ?? '');
    setStartDate(item.starts_on ?? item.week_start ?? today);
    setEndDate(item.ends_on ?? item.week_end ?? today);
    setFrequency((item.frequency as typeof frequency) ?? 'weekly');
    setRewardKind(item.reward_item_kind ?? 'none');
    setRewardId(item.reward_system_item_id ?? item.reward_user_item_id ?? '');
    setRewardQuantity(String(item.reward_quantity ?? 1));
    setStakeKind(item.stake_item_kind ?? 'none');
    setStakeId(item.stake_system_item_id ?? item.stake_user_item_id ?? '');
    setStakeQuantity(String(item.stake_quantity ?? 1));
    setDraftRequirements([]);
  }, [editing, today, visible]);

  const sourceType: RequirementSourceType =
    metric === 'workout_sessions'
      ? 'workout'
      : metric === 'body_measurement_count'
        ? 'body_measurement'
        : metric === 'xp_gained' || metric === 'gold_gained'
          ? 'economy_event'
          : 'habit';
  const availableRewards = rewardKind === 'system' ? systemItems : rewardKind === 'custom' ? userItems : [];
  const availableStakeItems = inventoryItems.filter((item) => stakeKind !== 'none' && item.itemKind === stakeKind);
  const existingRequirements =
    editing?.item.progress?.groups?.flatMap((group) =>
      (group.requirements ?? []).map((requirement) => ({ ...requirement, groupId: group.id })),
    ) ?? [];
  const targetGroupId = editing?.item.progress?.groups?.[0]?.id ?? null;

  function buildRequirement(): ObjectiveRequirementPayload {
    return {
      source_type: sourceType,
      metric,
      operator: 'gte',
      target_value: Math.max(1, Number(target) || 1),
      reference_id: sourceType === 'habit' ? habitId || null : null,
      period_scope: kind === 'compositeGoal' ? frequencyToScope(frequency) : 'since_created',
    };
  }

  function addDraftRequirement() {
    const requirement = buildRequirement();
    if (editing && targetGroupId) {
      onAddRequirement(targetGroupId, requirement);
      return;
    }
    setDraftRequirements((current) => [...current, requirement]);
  }

  function submit() {
    const cleanName = name.trim();
    if (!cleanName) {
      Alert.alert('Informe o nome', 'A missão precisa de um nome.');
      return;
    }
    const payload: ObjectivePayload = {
      name: cleanName,
      description: description.trim() || null,
      reward_item_kind: rewardKind === 'none' ? null : rewardKind,
      reward_system_item_id: rewardKind === 'system' ? rewardId || null : null,
      reward_user_item_id: rewardKind === 'custom' ? rewardId || null : null,
      reward_quantity: rewardKind === 'none' ? 0 : Math.max(1, Number(rewardQuantity) || 1),
    };
    if (!editing) {
      payload.requirements = draftRequirements.length > 0 ? draftRequirements : [buildRequirement()];
    }
    if (kind === 'compositeGoal') {
      payload.frequency = frequency;
      payload.repeatable = frequency !== 'manual';
    } else if (kind === 'temporaryChallenge') {
      payload.starts_on = startDate;
      payload.ends_on = endDate;
      payload.repeatable = false;
    } else {
      payload.week_start = startDate;
      payload.week_end = endDate;
      payload.status = 'draft';
      payload.stake_item_kind = stakeKind === 'none' ? null : stakeKind;
      payload.stake_system_item_id = stakeKind === 'system' ? stakeId || null : null;
      payload.stake_user_item_id = stakeKind === 'custom' ? stakeId || null : null;
      payload.stake_quantity = stakeKind === 'none' ? 0 : Math.max(1, Number(stakeQuantity) || 1);
    }
    onSubmit(kind, payload);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <HCard accent={H.primaryBright} style={styles.objectiveModal}>
          <View style={styles.spaceBetween}>
            <T variant="title">{editing ? 'Editar missão' : 'Nova missão'}</T>
            <Pressable onPress={onClose} accessibilityLabel="Fechar">
              <X color={H.text} size={22} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.objectiveModalScroll}
            contentContainerStyle={styles.objectiveModalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          <Segmented
            value={kind}
            onChange={(value) => setKind(value as ObjectiveKind)}
            wrap
            options={[
              { value: 'compositeGoal', label: 'Meta' },
              { value: 'temporaryChallenge', label: 'Desafio' },
              { value: 'weeklyContract', label: 'Contrato' },
            ]}
          />
          <Input label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Ritual de energia" />
          <Input label="Descrição" value={description} onChangeText={setDescription} placeholder="Contexto da missão" multiline />
          {kind === 'compositeGoal' ? (
            <Segmented
              value={frequency}
              onChange={(value) => setFrequency(value as typeof frequency)}
              wrap
              options={[
                { value: 'daily', label: 'Diária' },
                { value: 'weekly', label: 'Semanal' },
                { value: 'monthly', label: 'Mensal' },
                { value: 'manual', label: 'Manual' },
              ]}
            />
          ) : (
            <View style={styles.formRow}>
              <View style={styles.flex}>
                <DatePickerField
                  label={kind === 'weeklyContract' ? 'Início da semana' : 'Início'}
                  value={startDate}
                  onChange={setStartDate}
                  minYear={2020}
                  maxYear={new Date().getFullYear() + 10}
                />
              </View>
              <View style={styles.flex}>
                <DatePickerField
                  label="Fim"
                  value={endDate}
                  onChange={setEndDate}
                  minYear={2020}
                  maxYear={new Date().getFullYear() + 10}
                />
              </View>
            </View>
          )}
          {!editing ? (
            <>
              <Segmented
                value={metric}
                onChange={(value) => setMetric(value as MissionMetric)}
                wrap
                options={[
                  { value: 'habit_success_days', label: 'Dias de hábito' },
                  { value: 'habit_executions', label: 'Execuções' },
                  { value: 'workout_sessions', label: 'Treinos' },
                  { value: 'body_measurement_count', label: 'Medidas' },
                  { value: 'xp_gained', label: 'XP' },
                  { value: 'gold_gained', label: 'Ouro' },
                ]}
              />
              {sourceType === 'habit' ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  <Pressable style={[styles.choiceChip, !habitId && styles.choiceChipActive]} onPress={() => setHabitId('')}>
                    <T variant="label">Todos</T>
                  </Pressable>
                  {habits.map((habit) => (
                    <Pressable
                      key={habit.id}
                      style={[styles.choiceChip, habitId === habit.id && styles.choiceChipActive]}
                      onPress={() => setHabitId(habit.id)}
                    >
                      <T variant="label">{habit.name}</T>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
              <Input label="Meta numérica" value={target} onChangeText={setTarget} keyboardType="number-pad" />
              <HButton label="Adicionar requisito" variant="outline" onPress={addDraftRequirement} loading={loading} />
              {draftRequirements.length > 0 ? (
                <View style={styles.stack}>
                  {draftRequirements.map((requirement, index) => (
                    <View key={`${requirement.metric}-${index}`} style={styles.requirementEditorRow}>
                      <View style={styles.flex}>
                        <T variant="bodyMed">{requirementLabel(requirement.metric)}</T>
                        <T variant="bodyMuted">
                          {periodLabel(requirement.period_scope)} · alvo {requirement.target_value}
                        </T>
                      </View>
                      <HButton
                        label="Remover"
                        variant="danger"
                        onPress={() => setDraftRequirements((current) => current.filter((_, i) => i !== index))}
                        loading={loading}
                      />
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <>
              <View style={styles.stack}>
                {existingRequirements.length === 0 ? (
                  <T variant="bodyMuted">Nenhum requisito encontrado para esta missão.</T>
                ) : (
                  existingRequirements.map((requirement) => (
                    <View key={requirement.id} style={styles.requirementEditorRow}>
                      <View style={styles.flex}>
                        <T variant="bodyMed">{requirementLabel(requirement.metric)}</T>
                        <T variant="bodyMuted">
                          {periodLabel(requirement.periodScope)} · {requirement.currentValue}/{requirement.targetValue}
                        </T>
                      </View>
                      <HButton
                        label="Remover"
                        variant="danger"
                        onPress={() => onDeleteRequirement(requirement.id)}
                        loading={loading}
                      />
                    </View>
                  ))
                )}
              </View>
              <Segmented
                value={metric}
                onChange={(value) => setMetric(value as MissionMetric)}
                wrap
                options={[
                  { value: 'habit_success_days', label: 'Dias de hábito' },
                  { value: 'habit_executions', label: 'Execuções' },
                  { value: 'workout_sessions', label: 'Treinos' },
                  { value: 'body_measurement_count', label: 'Medidas' },
                  { value: 'xp_gained', label: 'XP' },
                  { value: 'gold_gained', label: 'Ouro' },
                ]}
              />
              {sourceType === 'habit' ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  <Pressable style={[styles.choiceChip, !habitId && styles.choiceChipActive]} onPress={() => setHabitId('')}>
                    <T variant="label">Todos</T>
                  </Pressable>
                  {habits.map((habit) => (
                    <Pressable
                      key={habit.id}
                      style={[styles.choiceChip, habitId === habit.id && styles.choiceChipActive]}
                      onPress={() => setHabitId(habit.id)}
                    >
                      <T variant="label">{habit.name}</T>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
              <Input label="Nova meta numérica" value={target} onChangeText={setTarget} keyboardType="number-pad" />
              <HButton label="Adicionar requisito" variant="outline" onPress={addDraftRequirement} loading={loading || !targetGroupId} />
            </>
          )}
          <Segmented
            value={rewardKind}
            onChange={(value) => {
              setRewardKind(value as typeof rewardKind);
              setRewardId('');
            }}
            wrap
            options={[
              { value: 'none', label: 'Sem item' },
              { value: 'system', label: 'Sistema' },
              { value: 'custom', label: 'Próprio' },
            ]}
          />
          {rewardKind !== 'none' ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {availableRewards.map((item) => (
                  <Pressable
                    key={item.id}
                    style={[styles.choiceChip, rewardId === item.id && styles.choiceChipActive]}
                    onPress={() => setRewardId(item.id)}
                  >
                    <T variant="label">{item.name}</T>
                  </Pressable>
                ))}
              </ScrollView>
              <Input label="Quantidade da recompensa" value={rewardQuantity} onChangeText={setRewardQuantity} keyboardType="number-pad" />
            </>
          ) : null}
          {kind === 'weeklyContract' ? (
            <>
              <T variant="label" color={H.gold}>
                Stake do contrato
              </T>
              <Segmented
                value={stakeKind}
                onChange={(value) => {
                  setStakeKind(value as typeof stakeKind);
                  setStakeId('');
                }}
                wrap
                options={[
                  { value: 'none', label: 'Sem stake' },
                  { value: 'system', label: 'Sistema' },
                  { value: 'custom', label: 'Próprio' },
                ]}
              />
              {stakeKind !== 'none' ? (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                    {availableStakeItems.map((item) => (
                      <Pressable
                        key={item.id}
                        style={[styles.choiceChip, stakeId === item.itemId && styles.choiceChipActive]}
                        onPress={() => setStakeId(item.itemId)}
                      >
                        <T variant="label">
                          {item.name} x{item.quantity}
                        </T>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Input label="Quantidade em stake" value={stakeQuantity} onChangeText={setStakeQuantity} keyboardType="number-pad" />
                </>
              ) : null}
            </>
          ) : null}
          </ScrollView>
          <View style={styles.objectiveModalFooter}>
            <HButton label="Cancelar" variant="outline" onPress={onClose} loading={loading} />
            <HButton label={editing ? 'Salvar missão' : 'Criar missão'} onPress={submit} loading={loading} />
          </View>
        </HCard>
      </View>
    </Modal>
  );
}

function ObjectiveDetailModal({
  mission,
  pending,
  onClose,
  onEdit,
  onDelete,
  onClaim,
  onActivate,
}: {
  mission: { kind: ObjectiveKind; item: ObjectiveOverviewItem } | null;
  pending: boolean;
  onClose: () => void;
  onEdit: (kind: ObjectiveKind, item: ObjectiveOverviewItem) => void;
  onDelete: (kind: ObjectiveKind, item: ObjectiveOverviewItem) => void;
  onClaim: (kind: ObjectiveKind, item: ObjectiveOverviewItem) => void;
  onActivate: (item: ObjectiveOverviewItem) => void;
}) {
  const item = mission?.item;
  const requirements = item?.progress?.groups?.flatMap((group) => group.requirements ?? []) ?? [];
  const claimed = Boolean(item?.claim?.claimed);
  const canClaim = Boolean(item?.progress?.passed && !claimed);
  return (
    <Modal visible={!!mission} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <HCard accent={H.gold} style={styles.objectiveModal}>
          <View style={styles.spaceBetween}>
            <View style={styles.flex}>
              <T variant="title">{item?.name ?? 'Missão'}</T>
              <T variant="bodyMuted">{mission ? objectiveKindLabel(mission.kind) : ''}</T>
            </View>
            <Pressable onPress={onClose} accessibilityLabel="Fechar">
              <X color={H.text} size={22} />
            </Pressable>
          </View>
          {item?.description ? <T variant="bodyMuted">{item.description}</T> : null}
          <View style={styles.detailGrid}>
            <DetailCell label="Status" value={item?.status ?? item?.claim?.periodKey ?? 'ativo'} />
            <DetailCell label="Período" value={objectivePeriodLabel(item)} />
            <DetailCell label="Recompensa" value={objectiveRewardLabel(item)} />
            <DetailCell label="Stake" value={objectiveStakeLabel(item)} />
          </View>
          <T variant="label" color={H.primaryBright}>
            Requisitos
          </T>
          {requirements.length === 0 ? (
            <T variant="bodyMuted">Nenhum requisito cadastrado.</T>
          ) : (
            requirements.map((requirement) => (
              <View key={requirement.id} style={styles.requirementEditorRow}>
                <View style={styles.flex}>
                  <T variant="bodyMed">{requirementLabel(requirement.metric)}</T>
                  <T variant="bodyMuted">
                    {periodLabel(requirement.periodScope)} · {requirement.currentValue}/{requirement.targetValue}
                  </T>
                </View>
                <T variant="label" color={requirement.passed ? H.success : H.textDim}>
                  {requirement.passed ? 'OK' : 'Pendente'}
                </T>
              </View>
            ))
          )}
          {mission && item ? (
            <View style={styles.detailActions}>
              {mission.kind === 'weeklyContract' && item.status === 'draft' ? (
                <HButton label="Ativar" onPress={() => onActivate(item)} loading={pending} />
              ) : canClaim ? (
                <HButton label="Resgatar" onPress={() => onClaim(mission.kind, item)} loading={pending} />
              ) : null}
              <HButton label="Editar" variant="outline" onPress={() => onEdit(mission.kind, item)} loading={pending} />
              <HButton label="Remover" variant="danger" onPress={() => onDelete(mission.kind, item)} loading={pending} />
            </View>
          ) : null}
          <HButton label="Fechar" variant="outline" onPress={onClose} />
        </HCard>
      </View>
    </Modal>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailCell}>
      <T variant="label">{label}</T>
      <T variant="bodyMed">{value}</T>
    </View>
  );
}

function frequencyToScope(frequency: 'daily' | 'weekly' | 'monthly' | 'manual') {
  if (frequency === 'daily') return 'today';
  if (frequency === 'weekly') return 'current_week';
  if (frequency === 'monthly') return 'current_month';
  return 'since_created';
}

function objectiveKindLabel(kind: ObjectiveKind) {
  if (kind === 'compositeGoal') return 'Meta fixa';
  if (kind === 'temporaryChallenge') return 'Desafio temporário';
  return 'Contrato semanal';
}

function objectivePeriodLabel(item?: ObjectiveOverviewItem) {
  if (!item) return '-';
  if (item.starts_on || item.ends_on) return `${item.starts_on ?? '?'} até ${item.ends_on ?? '?'}`;
  if (item.week_start || item.week_end) return `${item.week_start ?? '?'} até ${item.week_end ?? '?'}`;
  return item.frequency ?? 'manual';
}

function objectiveRewardLabel(item?: ObjectiveOverviewItem) {
  if (!item?.reward_item_kind || !item.reward_quantity) return 'Sem item';
  return `${item.reward_item_kind === 'system' ? 'Sistema' : 'Próprio'} x${item.reward_quantity}`;
}

function objectiveStakeLabel(item?: ObjectiveOverviewItem) {
  if (!item?.stake_item_kind || !item.stake_quantity) return 'Sem stake';
  return `${item.stake_item_kind === 'system' ? 'Sistema' : 'Próprio'} x${item.stake_quantity}`;
}

function requirementLabel(metric: string) {
  const labels: Record<string, string> = {
    habit_success_days: 'Dias de hábito',
    habit_executions: 'Execuções de hábito',
    habit_clean_days: 'Dias limpos',
    habit_failed_days: 'Falhas',
    workout_sessions: 'Treinos',
    body_measurement_count: 'Medidas registradas',
    body_measurement_value: 'Valor corporal',
    xp_gained: 'XP ganho',
    gold_gained: 'Ouro ganho',
  };
  return labels[metric] ?? metric;
}

function periodLabel(scope: string) {
  const labels: Record<string, string> = {
    today: 'hoje',
    current_week: 'semana atual',
    current_month: 'mês atual',
    lifetime: 'total',
    since_created: 'desde o início',
    since_last_claim: 'desde o último resgate',
    custom: 'período customizado',
  };
  return labels[scope] ?? scope;
}

function ObjectiveCard({
  objective,
  moduleLabels,
}: {
  objective: BossObjective;
  moduleLabels: Map<string, string>;
}) {
  const progress = objective.target > 0 ? objective.progress / objective.target : 0;
  const sourceLabel =
    moduleLabels.get(objective.source_type) ?? SOURCE_LABEL[objective.source_type];
  const color = objective.completed ? H.success : H.primaryBright;
  return (
    <HCard accent={color} style={styles.objectiveCard}>
      <View style={styles.spaceBetween}>
        <View style={styles.flex}>
          <T variant="bodyMed">{objective.title}</T>
          <T variant="bodyMuted">{sourceLabel}</T>
        </View>
        <T variant="label" color={color}>
          {objective.completed ? 'Completo' : `+${objective.boss_damage} dano`}
        </T>
      </View>
      <ProgressBar progress={progress} color={color} height={10} />
      <T variant="bodyMuted">
        {Math.min(objective.progress, objective.target)}/{objective.target}
      </T>
    </HCard>
  );
}

function AllocatePanel({
  pending,
  disabled,
  onAllocate,
}: {
  pending: number;
  disabled: boolean;
  onAllocate: (key: (typeof ATTRIBUTES)[number]['key'], label: string) => void;
}) {
  return (
    <HCard accent={H.success} style={styles.allocateCard}>
      <T variant="title">Ponto de atributo pendente</T>
      <T variant="bodyMuted">
        Aloque {pending} ponto{pending === 1 ? '' : 's'} permanente
        {pending === 1 ? '' : 's'} ganho{pending === 1 ? '' : 's'} de boss.
      </T>
      <View style={styles.grid}>
        {ATTRIBUTES.map((attribute) => (
          <Pressable
            key={attribute.key}
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => onAllocate(attribute.key, ATTRIBUTE_LABEL[attribute.key])}
            style={[styles.gridButton, disabled && styles.disabled]}
          >
            <T variant="bodyMed">{attribute.label}</T>
            <T variant="label">{attribute.hint}</T>
          </Pressable>
        ))}
      </View>
    </HCard>
  );
}

// ---- config (encerrar / semente) ----

function StoryConfigCard({ selectedTier }: { selectedTier: BossTier }) {
  const configureStory = useConfigureSeasonStory();
  const endSeason = useEndSeason();
  const toast = useToast();
  const [themeSeed, setThemeSeed] = useState('');

  function onEndSeason() {
    Alert.alert(
      'Encerrar temporada',
      'Isso abandona a aventura atual e toda a cadeia de bosses, sem recompensa. A Essência, pontos de atributo e equipamentos já ganhos permanecem. Depois você poderá iniciar uma nova. Confirmar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Encerrar',
          style: 'destructive',
          onPress: () =>
            endSeason.mutate(undefined, {
              onSuccess: () =>
                toast.success('Temporada encerrada', 'Inicie uma nova quando quiser.'),
              onError: (error) =>
                toast.error('Erro ao encerrar', String((error as Error).message)),
            }),
        },
      ],
    );
  }

  function onSave() {
    configureStory.mutate(
      { themeSeed: themeSeed.trim() || null, preset: selectedTier },
      {
        onSuccess: () =>
          toast.success('Temporada atualizada', 'A semente narrativa foi salva.'),
        onError: (error) =>
          toast.error('Erro ao salvar', String((error as Error).message)),
      },
    );
  }

  return (
    <HCard style={styles.configCard}>
      <View style={styles.rowGap}>
        <SlidersHorizontal color={H.primaryBright} size={20} />
        <T variant="title" style={styles.flex}>
          Ajustes
        </T>
      </View>
      <Input
        label="Semente narrativa"
        value={themeSeed}
        onChangeText={setThemeSeed}
        placeholder="Ex.: campanha sombria sobre disciplina e recuperação"
        multiline
        style={styles.seedInput}
      />
      <HButton
        label="Salvar narrativa"
        variant="outline"
        onPress={onSave}
        loading={configureStory.isPending}
      />
      <HButton
        label="Encerrar temporada"
        variant="danger"
        icon={<Flag color={H.text} size={18} />}
        onPress={onEndSeason}
        loading={endSeason.isPending}
      />
    </HCard>
  );
}

// ---- setup (sem temporada ativa) ----

function SeasonSetup({
  aiAvailable,
  onRefresh,
  refreshing,
}: {
  aiAvailable: boolean;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const startSeason = useStartSeason();
  const toast = useToast();
  const [themeSeed, setThemeSeed] = useState('');
  const [preset, setPreset] = useState<BossTier>('mensal');
  const [aiEnabled, setAiEnabled] = useState(aiAvailable);

  function onStart() {
    startSeason.mutate(
      { themeSeed: themeSeed.trim() || null, preset, aiEnabled },
      {
        onSuccess: () =>
          toast.success(
            'Temporada iniciada',
            aiEnabled ? 'A IA está montando a abertura do arco.' : 'Boa sorte!',
          ),
        onError: (error) =>
          toast.error('Erro ao iniciar', String((error as Error).message)),
      },
    );
  }

  return (
    <Screen scroll refreshing={refreshing} onRefresh={onRefresh} contentStyle={styles.page}>
      <View style={styles.content}>
        <T variant="label" color={H.primaryBright}>
          Nova aventura
        </T>
        <T variant="display">Comece sua história</T>

        <Reveal>
          <HCard accent={H.primaryBright} style={styles.loreCard}>
            <View style={styles.rowGap}>
              <View style={styles.loreIcon}>
                <Sparkles color={H.text} size={20} />
              </View>
              <T variant="title" style={styles.flex}>
                Escolha o tamanho do arco
              </T>
            </View>
            <T variant="lore">
              O preset define o teto da sua aventura. Mensal cria só o boss do mês;
              tiers maiores aninham a cadeia até o vilão final. Depois você pode
              promover para um tier maior — mas nunca esticar o mesmo.
            </T>
          </HCard>
        </Reveal>

        <HCard style={styles.configCard}>
          <Input
            label="Semente narrativa"
            value={themeSeed}
            onChangeText={setThemeSeed}
            placeholder="Ex.: campanha sombria sobre disciplina e recuperação"
            multiline
            style={styles.seedInput}
          />

          <T variant="label">Tamanho do arco</T>
          <Segmented
            value={preset}
            onChange={(v) => setPreset(v as BossTier)}
            wrap
            options={[
              { value: 'mensal', label: 'Mensal' },
              { value: 'trimestral', label: 'Trim.' },
              { value: 'semestral', label: 'Sem.' },
              { value: 'anual', label: 'Anual' },
            ]}
          />

          <View style={styles.spaceBetween}>
            <View style={styles.flex}>
              <T variant="bodyMed">Usar IA na narrativa</T>
              <T variant="bodyMuted">
                {aiAvailable
                  ? 'Com IA desligada, usa fallback local.'
                  : 'OpenRouter não configurado: usa fallback local.'}
              </T>
            </View>
            <Switch
              value={aiEnabled}
              onValueChange={setAiEnabled}
              disabled={!aiAvailable}
              trackColor={{ true: H.primary, false: H.border }}
            />
          </View>

          <HButton
            label={startSeason.isPending ? 'Iniciando...' : 'Iniciar temporada'}
            icon={<Sparkles color={H.text} size={18} />}
            onPress={onStart}
            loading={startSeason.isPending}
          />
        </HCard>
      </View>
    </Screen>
  );
}

// ---- primitivos locais ----

type TVariant =
  | 'display'
  | 'h1'
  | 'title'
  | 'chapterTitle'
  | 'body'
  | 'bodyMed'
  | 'bodySemi'
  | 'bodyMuted'
  | 'lore'
  | 'quote'
  | 'label'
  | 'stat';

function T({
  variant = 'body',
  color,
  style,
  ...rest
}: TextProps & { variant?: TVariant; color?: string }) {
  return <RNText style={[tStyles[variant], color ? { color } : null, style]} {...rest} />;
}

function HCard({
  children,
  style,
  accent,
}: {
  children: ReactNode;
  style?: object;
  accent?: string;
}) {
  return (
    <View style={[styles.card, accent ? { borderColor: H.borderStrong } : null, style]}>
      {accent ? <View style={[styles.cardAccent, { backgroundColor: accent }]} /> : null}
      {children}
    </View>
  );
}

function HButton({
  label,
  onPress,
  icon,
  loading,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  loading?: boolean;
  variant?: 'primary' | 'outline' | 'danger';
  onDeleteObjective?: (kind: ObjectiveKind, item: ObjectiveOverviewItem) => void;
}) {
  const bg =
    variant === 'primary' ? H.primary : variant === 'danger' ? 'transparent' : 'transparent';
  const borderColor = variant === 'danger' ? H.hp : variant === 'outline' ? H.borderStrong : H.primary;
  const fg = variant === 'danger' ? H.hp : H.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor },
        pressed && styles.pressed,
        loading && styles.disabled,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon}
      <T variant="bodySemi" color={fg}>
        {label}
      </T>
    </Pressable>
  );
}

function AccordionSection({
  title,
  hint,
  open,
  onToggle,
  summary,
  children,
  accent,
  style,
}: {
  title: string;
  hint?: string;
  open: boolean;
  onToggle: () => void;
  summary?: ReactNode;
  children: ReactNode;
  accent?: string;
  style?: object;
}) {
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <View style={[styles.accordionShell, accent ? { borderColor: H.borderStrong } : null, style]}>
      {accent ? <View style={[styles.cardAccent, { backgroundColor: accent }]} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${open ? 'Fechar' : 'Abrir'} ${title}`}
        onPress={onToggle}
        style={styles.accordionHeader}
      >
        <View style={styles.flex}>
          <T variant="title">{title}</T>
          {hint ? <T variant="bodyMuted">{hint}</T> : null}
        </View>
        <View style={styles.accordionIcon}>
          <Chevron color={H.text} size={19} />
        </View>
      </Pressable>
      {open ? <View style={styles.accordionBody}>{children}</View> : summary ? <View style={styles.accordionSummary}>{summary}</View> : null}
    </View>
  );
}

function SummaryStrip({
  items,
}: {
  items: Array<{ label: string; value: string | number; color?: string }>;
}) {
  return (
    <View style={styles.summaryStrip}>
      {items.map((item) => (
        <View key={item.label} style={styles.summaryPill}>
          <T variant="label">{item.label}</T>
          <T variant="bodyMed" color={item.color ?? H.text} numberOfLines={1}>
            {item.value}
          </T>
        </View>
      ))}
    </View>
  );
}

function LifeMissionsSummary({
  overview,
  suggestions,
}: {
  overview?: ObjectivesOverview;
  suggestions: ObjectiveSuggestion[];
}) {
  const entries = [
    ...(overview?.compositeGoals ?? []),
    ...(overview?.activeChallenges ?? []),
    ...(overview?.activeContracts ?? []),
  ];
  const claimed = entries.filter((item) => item.claim?.claimed).length;
  const claimable = entries.filter((item) => item.progress?.passed && !item.claim?.claimed).length;
  const pendingSuggestions = suggestions.filter((suggestion) => suggestion.status === 'pending').length;

  return (
    <SummaryStrip
      items={[
        { label: 'Ativas', value: entries.length },
        { label: 'Resgates', value: claimable, color: claimable > 0 ? H.gold : H.text },
        { label: 'Resgatadas', value: claimed, color: H.success },
        { label: 'Sugestoes', value: pendingSuggestions },
      ]}
    />
  );
}

function JourneySettingsModal({
  visible,
  selectedTier,
  upgradeTargets,
  originalStart,
  aiAvailable,
  generatePending,
  onGenerateBeat,
  onClose,
}: {
  visible: boolean;
  selectedTier: BossTier;
  upgradeTargets: BossTier[];
  originalStart: string;
  aiAvailable: boolean;
  generatePending: boolean;
  onGenerateBeat: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.settingsModal}>
          <View style={styles.spaceBetween}>
            <View style={styles.flex}>
              <T variant="label" color={H.primaryBright}>
                Configuracoes
              </T>
              <T variant="title">Jornada</T>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.iconButton}>
              <X color={H.text} size={20} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.settingsScroll}
            contentContainerStyle={styles.settingsContent}
            showsVerticalScrollIndicator={false}
          >
            {upgradeTargets.length > 0 ? (
              <UpgradeCard targets={upgradeTargets} originalStart={originalStart} />
            ) : null}
            <NarrativeCard
              aiAvailable={aiAvailable}
              generatePending={generatePending}
              onGenerateBeat={onGenerateBeat}
            />
            <StoryConfigCard selectedTier={selectedTier} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function NarrativeCard({
  aiAvailable,
  generatePending,
  onGenerateBeat,
}: {
  aiAvailable: boolean;
  generatePending: boolean;
  onGenerateBeat: () => void;
}) {
  return (
    <HCard style={styles.narrateCard}>
      <View style={styles.rowGap}>
        <Wand2 color={H.primaryBright} size={18} />
        <T variant="title" style={styles.flex}>
          Narrativa
        </T>
      </View>
      <T variant="bodyMuted">
        {aiAvailable
          ? 'A IA escreve sua historia com base no que voce faz. O generico so aparece se a IA falhar.'
          : 'OpenRouter nao configurado: a narracao usa fallback local.'}
      </T>
      <HButton
        label={generatePending ? 'Gerando...' : 'Narrar agora'}
        icon={<Wand2 color={H.text} size={18} />}
        onPress={onGenerateBeat}
        loading={generatePending}
      />
    </HCard>
  );
}

function MetricChip({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <View style={styles.metric}>
      {icon}
      <T variant="label">{label}</T>
      <T variant="bodyMed" numberOfLines={2} style={styles.metricValue}>
        {value}
      </T>
    </View>
  );
}

function StatusPill({ status }: { status: BossStatus }) {
  const color =
    status === 'vencido' ? H.success : status === 'perdido' ? H.hp : H.primaryBright;
  const label =
    status === 'vencido'
      ? 'Vencido'
      : status === 'perdido'
        ? 'Perdido'
        : status === 'encerrado'
          ? 'Encerrado'
          : 'Ativo';
  return (
    <View style={[styles.statusPill, { borderColor: color }]}>
      <T variant="label" color={color}>
        {label}
      </T>
    </View>
  );
}

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduced = useReducedMotion();
  if (reduced) return <View>{children}</View>;
  return <Animated.View entering={FadeInDown.duration(320).delay(delay)}>{children}</Animated.View>;
}

// ---- helpers ----

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(
    new Date(value),
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

const tStyles = StyleSheet.create({
  display: { fontFamily: FONT.display, fontSize: 30, color: H.text, letterSpacing: 0.5 },
  h1: { fontFamily: FONT.display, fontSize: 22, color: H.text },
  title: { fontFamily: FONT.bodyBold, fontSize: 18, color: H.text },
  chapterTitle: { fontFamily: FONT.display, fontSize: 16, color: H.text, letterSpacing: 0.3 },
  body: { fontFamily: FONT.body, fontSize: 15, color: H.text, lineHeight: 22 },
  bodyMed: { fontFamily: FONT.bodyMed, fontSize: 15, color: H.text },
  bodySemi: { fontFamily: FONT.bodySemi, fontSize: 15, color: H.text },
  bodyMuted: { fontFamily: FONT.body, fontSize: 13, color: H.textDim, lineHeight: 19 },
  lore: { fontFamily: FONT.body, fontSize: 15, color: H.text, lineHeight: 24, fontStyle: 'italic' },
  quote: { fontFamily: FONT.body, fontSize: 14, color: H.primaryBright, lineHeight: 21, fontStyle: 'italic' },
  label: {
    fontFamily: FONT.bodySemi,
    fontSize: 11,
    color: H.textDim,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  stat: { fontFamily: FONT.display, fontSize: 18, color: H.text },
});

const styles = StyleSheet.create({
  page: { backgroundColor: H.bg },
  content: { gap: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stack: { gap: 12 },

  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: H.border,
    backgroundColor: H.surface,
    padding: 18,
    gap: 12,
  },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },

  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: H.border,
    backgroundColor: H.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionShell: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: H.border,
    backgroundColor: H.surface,
  },
  accordionHeader: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  accordionIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: H.border,
    backgroundColor: H.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionBody: { padding: 14, paddingTop: 0, gap: 12 },
  accordionSummary: {
    borderTopWidth: 1,
    borderTopColor: H.border,
    paddingHorizontal: 18,
    paddingBottom: 16,
    paddingTop: 12,
  },
  summaryStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryPill: {
    flexGrow: 1,
    minWidth: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: H.border,
    backgroundColor: H.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },

  loreCard: { backgroundColor: H.surfaceAlt },
  loreIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: H.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroCard: { backgroundColor: H.surfaceAlt },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: H.hp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hpBlock: { gap: 8 },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: {
    flex: 1,
    minHeight: 92,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: H.border,
    backgroundColor: H.surface,
    padding: 12,
    gap: 6,
  },
  metricValue: { fontSize: 13, lineHeight: 17 },

  journeyWrap: { gap: 12 },
  journeyList: { gap: MONTH_CARD_GAP, paddingVertical: 2, alignItems: 'stretch' },
  monthCard: {
    width: 132,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: H.border,
    backgroundColor: H.surface,
    padding: 14,
    gap: 8,
    minHeight: 108,
    justifyContent: 'space-between',
  },
  monthCardCurrent: { borderColor: H.primaryBright, backgroundColor: H.surfaceAlt },
  monthCardFuture: { borderStyle: 'dashed', opacity: 0.7 },
  tierCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    backgroundColor: H.surface,
    padding: 16,
    gap: 10,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  tierBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  upgradeCard: { backgroundColor: H.surface },
  upgradeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  upgradeChip: {
    flexGrow: 1,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: H.gold,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  narrateCard: { backgroundColor: H.surface },

  sagaScreen: { flex: 1, backgroundColor: H.bg, paddingTop: 54, paddingHorizontal: 20 },
  sagaHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  sagaClose: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: H.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sagaList: { paddingBottom: 40 },
  sagaPrologue: { backgroundColor: H.surfaceAlt, marginBottom: 16 },

  chapterRow: { flexDirection: 'row', gap: 12 },
  chapterGutter: { width: 16, alignItems: 'center' },
  chapterDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, marginTop: 18 },
  chapterLine: { width: 2, flex: 1, backgroundColor: H.border, marginTop: 4 },
  chapterCard: { flex: 1, marginBottom: 12 },

  objectiveCard: { gap: 8 },
  objectiveEngineCard: { gap: 12, backgroundColor: H.surface },
  missionRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: H.border,
    backgroundColor: H.surfaceAlt,
    padding: 10,
    gap: 8,
  },
  missionPressArea: { gap: 9 },
  claimedMissionRow: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: H.success,
    backgroundColor: H.success + '12',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  claimedMissionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: H.success,
    backgroundColor: H.success + '16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimedMissionBadge: {
    flexShrink: 0,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: H.success,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  objectiveFooter: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: H.border,
    paddingTop: 8,
  },
  missionBadge: {
    flexShrink: 0,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
  },
  suggestionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: H.border,
    backgroundColor: H.surface,
    padding: 12,
    gap: 9,
  },
  compactActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  requirementLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: H.border,
    paddingTop: 8,
  },
  requirementEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: H.border,
    backgroundColor: H.surfaceAlt,
    padding: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: 18,
  },
  settingsModal: {
    maxHeight: '88%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: H.borderStrong,
    backgroundColor: H.bg,
    padding: 16,
    gap: 14,
  },
  settingsScroll: { maxHeight: '92%' },
  settingsContent: { gap: 12, paddingBottom: 4 },
  objectiveModal: { maxHeight: '92%', gap: 12 },
  objectiveModalScroll: { maxHeight: '86%' },
  objectiveModalContent: { gap: 12, paddingBottom: 8 },
  objectiveModalFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: H.border,
    paddingTop: 12,
  },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailCell: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: H.border,
    backgroundColor: H.surfaceAlt,
    padding: 10,
    gap: 4,
  },
  formRow: { flexDirection: 'row', gap: 10 },
  chipRow: { gap: 8, paddingVertical: 2 },
  choiceChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: H.border,
    backgroundColor: H.surface,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  choiceChipActive: { borderColor: H.primaryBright, backgroundColor: H.surfaceAlt },

  allocateCard: {},
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridButton: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: H.border,
    backgroundColor: H.surfaceAlt,
    padding: 12,
    gap: 2,
  },

  configCard: {},
  seedInput: { minHeight: 78, textAlignVertical: 'top', paddingTop: 12 },

  damageRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  damageDot: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: H.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },

  statusPill: {
    flexShrink: 0,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
});
