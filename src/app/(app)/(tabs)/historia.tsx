import { useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  BookOpen,
  Check,
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
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { useToast } from '@/components/ui/Toast';
import { ATTRIBUTE_LABEL, ATTRIBUTES } from '@/features/character/attributes';
import { useModules } from '@/features/modules/useModules';
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

export default function HistoriaScreen() {
  const qc = useQueryClient();
  const [selectedTier, setSelectedTier] = useState<BossTier>('mensal');
  const story = useSeasonStory(selectedTier);
  const modules = useModules();
  const allocatePoint = useAllocateAttributePoint();
  const generateBeat = useGenerateNarrativeBeat();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [sagaOpen, setSagaOpen] = useState(false);

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
          <StatusPill status={boss.status} />
        </View>

        <Reveal>
          <HCard accent={H.primaryBright} style={styles.loreCard}>
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
          </HCard>
        </Reveal>

        {(story.data.arcMonths?.length ?? 0) > 1 ? (
          <BossTimeline
            months={story.data.arcMonths ?? []}
            today={story.data.today}
            linked={linked}
            selected={selectedTier}
            onSelect={setSelectedTier}
          />
        ) : null}

        <Reveal>
          <BossHero boss={boss} weaknessLabel={weaknessLabel} charges={charges} />
        </Reveal>

        {upgradeTargets.length > 0 ? (
          <UpgradeCard targets={upgradeTargets} originalStart={boss.window_start} />
        ) : null}

        <HCard style={styles.narrateCard}>
          <View style={styles.rowGap}>
            <Wand2 color={H.primaryBright} size={18} />
            <T variant="title" style={styles.flex}>
              Narrativa
            </T>
          </View>
          <T variant="bodyMuted">
            {aiAvailable
              ? 'A IA escreve sua história com base no que você faz. O genérico só aparece se a IA falhar.'
              : 'OpenRouter não configurado: a narração usa fallback local.'}
          </T>
          <HButton
            label={generateBeat.isPending ? 'Gerando...' : 'Narrar agora'}
            icon={<Wand2 color={H.text} size={18} />}
            onPress={onGenerateBeat}
            loading={generateBeat.isPending}
          />
        </HCard>

        <SectionTitle title="Capítulos" hint={`${narrativeBeats.length} beats`} />
        <ChapterTimeline beats={narrativeBeats.slice(0, 12)} />
        <HButton
          label="Ler a saga completa"
          variant="outline"
          icon={<BookOpen color={H.text} size={18} />}
          onPress={() => setSagaOpen(true)}
        />

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

        <SectionTitle
          title="Objetivos"
          hint={`${completedObjectives}/${objectives.length} concluídos`}
        />
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

        <SectionTitle title="Dano recente" hint="Últimos golpes" />
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
                    {event.was_critical ? ' crítico' : ''}
                    {event.was_weakness ? ' na fraqueza' : ''}
                  </T>
                  <T variant="bodyMuted">
                    {event.source_type
                      ? moduleLabels.get(event.source_type) ??
                        SOURCE_LABEL[event.source_type]
                      : 'Evento'}{' '}
                    · {formatDateTime(event.occurred_at)}
                  </T>
                </View>
              </View>
            ))
          )}
        </HCard>

        <StoryConfigCard selectedTier={selectedTier} />
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
    <Reveal>
      <View style={styles.journeyWrap}>
        <View style={styles.spaceBetween}>
          <T variant="title">Linha de bosses</T>
          <T variant="bodyMuted">{months.length} meses</T>
        </View>
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
    </Reveal>
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

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.spaceBetween}>
      <T variant="title">{title}</T>
      {hint ? <T variant="bodyMuted">{hint}</T> : null}
    </View>
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
