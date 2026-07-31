import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Coins, Flame, Heart, Settings, ShieldAlert, Skull, Sparkles, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/bars/ProgressBar';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { ScarOfferCard } from '@/features/character/ScarOfferCard';
import { useCharacter, useProfile, type Character } from '@/features/character/hooks/useCharacter';
import { YesterdayCard } from '@/features/habits/components/YesterdayCard';
import { ModuleLauncher } from '@/features/modules/ModuleLauncher';
import { MealVoiceButton } from '@/features/nutrition/MealVoiceButton';
import { OnboardingModal } from '@/features/onboarding/OnboardingModal';
import { PlanCard } from '@/features/plan/PlanCard';
import { PeopleQuickCard } from '@/features/relationships/PeopleQuickCard';
import { DailySummaryModal } from '@/features/summary/components/DailySummaryModal';
import { useDailySummary } from '@/features/summary/hooks/useDailySummary';
import { openWeb } from '@/lib/openWeb';
import { qk } from '@/lib/queryKeys';
import { theme } from '@/theme/theme';
import { initialsFromName, levelProgress } from '@/utils/leveling';

/**
 * INÍCIO — o que está esperando uma decisão sua, e mais nada.
 *
 * Esta tela já foi um console: quadro de missões, radar da base, metas do dia,
 * atalhos de loja e a faixa do boss, tudo alimentado por nove queries a cada
 * abertura. Saiu (doc 08 §0): olhar números é coisa de tela grande, e o web e
 * os widgets do Electron ficam abertos o dia inteiro no PC.
 *
 * O que sobrou passa num teste só: **é uma decisão que só pode ser tomada
 * agora, longe do computador?**
 *
 * - `ScarOfferCard` — uma morte deixou uma escolha em aberto; vem primeiro
 *   porque é a única coisa da tela esperando resposta.
 * - `YesterdayCard` — o fechamento automático decidiu por você e às vezes
 *   decidiu errado (§0.3). Fecha o passado antes de abrir o dia.
 * - `PlanCard` — quantos hábitos você declara para hoje, ou a trégua.
 * - `PeopleQuickCard` — ligar para alguém acontece no carro, na fila.
 * - `MealVoiceButton` — a ação mais frequente do dia depois de marcar hábito.
 *
 * O HUD fica porque é a âncora: HP, XP e ouro são o retorno do que você
 * registrou, não estatística. O resto do personagem abre no web.
 */
export default function DashboardScreen() {
  const qc = useQueryClient();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { summary, dismiss } = useDailySummary();

  const character = useCharacter();
  const profile = useProfile();

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: qk.character }),
      qc.invalidateQueries({ queryKey: qk.profile }),
      qc.invalidateQueries({ queryKey: qk.today }),
    ]);
    setRefreshing(false);
  }

  const c = character.data;
  const level = c?.level ?? 1;
  const xp = levelProgress(c?.total_xp ?? 0, level);
  const maxHp = c?.max_hp ?? 1;
  const hpRatio = maxHp > 0 ? (c?.current_hp ?? 0) / maxHp : 0;
  const name = profile.data?.display_name ?? 'Aventureiro';
  const nemesisPenalty = c?.nemesis_penalty ?? 0;

  // Estado de carregamento: evita mostrar "Aventureiro, Nível 1, 0 ouro" falsos
  // enquanto as queries principais ainda não responderam.
  if (character.isLoading || profile.isLoading) {
    return (
      <Screen contentStyle={styles.centerState}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text variant="bodyMuted">Carregando sua jornada...</Text>
      </Screen>
    );
  }

  if (character.isError) {
    return (
      <Screen contentStyle={styles.centerState}>
        <Card accent={theme.colors.hp} style={styles.errorCard}>
          <ShieldAlert color={theme.colors.hp} size={28} />
          <Text variant="title">Não foi possível carregar o personagem</Text>
          <Text variant="bodyMuted">Verifique sua conexão e tente novamente.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => character.refetch()}
            style={styles.retryBtn}
          >
            <Text variant="title" color={theme.colors.textInverse}>
              Tentar novamente
            </Text>
          </Pressable>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll refreshing={refreshing} onRefresh={onRefresh} contentStyle={styles.page}>
      <View style={styles.topBar}>
        <View style={styles.topCopy}>
          <Text variant="label" color={theme.colors.primary}>
            Jornada de hoje
          </Text>
          <Text variant="h1" numberOfLines={1}>
            {name}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ajustes"
          onPress={() => router.push('/(app)/settings')}
          style={styles.iconBtn}
        >
          <Settings color={theme.colors.textMuted} size={20} />
        </Pressable>
      </View>

      <View style={styles.heroPanel}>
        <View style={styles.heroHeader}>
          <Pressable
            onPress={() => void openWeb('/character')}
            accessibilityRole="button"
            style={styles.characterBlock}
          >
            <View style={styles.avatarFrame}>
              <View style={styles.avatar}>
                <Text variant="h2" color={theme.colors.textInverse}>
                  {initialsFromName(name)}
                </Text>
              </View>
              <View style={styles.levelSeal}>
                <Text variant="label" color={theme.colors.textInverse}>
                  {level}
                </Text>
              </View>
            </View>
            <View style={styles.characterCopy}>
              <Text variant="label">Ficha ativa</Text>
              <Text variant="h2" numberOfLines={1}>
                Nível {level}
              </Text>
              <Text variant="bodyMuted" numberOfLines={1}>
                Abrir personagem no site
              </Text>
            </View>
          </Pressable>

          <Image
            source={require('../../../../assets/logo.png')}
            resizeMode="contain"
            style={styles.crest}
          />
        </View>

        <View style={styles.vitalGrid}>
          <VitalBar
            icon={<Heart color={theme.colors.hp} size={16} />}
            label="HP"
            value={`${c?.current_hp ?? 0}/${maxHp}`}
            progress={hpRatio}
            color={theme.colors.hp}
          />
          <VitalBar
            icon={<Zap color={theme.colors.xp} size={16} />}
            label="XP"
            value={`${xp.into}/${xp.span}`}
            progress={xp.ratio}
            color={theme.colors.xp}
          />
        </View>

        <View style={styles.resourceStrip}>
          <ResourcePill icon={<Coins color={theme.colors.gold} size={16} />} value={c?.gold ?? 0} label="Ouro" />
          <ResourcePill icon={<Sparkles color={theme.colors.essencia} size={16} />} value={c?.essencia ?? 0} label="Essência" />
          <ResourcePill icon={<Flame color={theme.colors.primary} size={16} />} value={c?.character_streak ?? 0} label="Sequência" />
        </View>

        {/* Nêmese solta (14 §5.2⑤): a penalidade só funciona se for legível —
            invisível, ela é apenas um número errado no fim do dia. */}
        {nemesisPenalty > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void openWeb('/history')}
            style={styles.nemesisBanner}
          >
            <Skull color={theme.colors.danger} size={15} />
            <Text variant="label" color={theme.colors.danger}>
              {nemesisLabel(c?.nemeses)} · ouro −{Math.round(nemesisPenalty * 100)}%
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* A ordem é a da urgência: decisão pendente, passado a fechar, dia a
          declarar, gente a chamar, comida a registrar. */}
      <ScarOfferCard />
      <YesterdayCard />
      <PlanCard />
      <PeopleQuickCard />
      <MealVoiceButton compact />

      {/* Atalhos dos módulos do registry (08 §6.1) — é o único caminho do app
          para tudo que vive no web. */}
      <ModuleLauncher />

      <DailySummaryModal summary={summary} onDismiss={dismiss} />
      <OnboardingModal />
    </Screen>
  );
}

function VitalBar({
  icon,
  label,
  value,
  progress,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  progress: number;
  color: string;
}) {
  return (
    <View style={styles.vital}>
      <View style={styles.vitalTop}>
        <View style={styles.inline}>
          {icon}
          <Text variant="label" color={theme.colors.text}>
            {label}
          </Text>
        </View>
        <Text variant="bodyMuted">{value}</Text>
      </View>
      <ProgressBar progress={progress} color={color} trackColor={theme.colors.bg} height={9} />
    </View>
  );
}

/** Nomeia a dívida em vez de só mostrar o percentual. */
function nemesisLabel(nemeses: Character['nemeses']): string {
  const first = nemeses?.[0];
  if (!first) return 'Nêmese solta';
  return first.epithet ? `${first.name}, ${first.epithet}` : first.name;
}

function ResourcePill({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.resourcePill}>
      {icon}
      <View style={styles.flex}>
        <Text variant="title" numberOfLines={1}>
          {value}
        </Text>
        <Text variant="label" numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function withAlpha(hex: string, alpha: number) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const value = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${clean}${value}`;
}

const styles = StyleSheet.create({
  page: {
    gap: theme.spacing.lg,
    // Folga para a tab bar flutuante — conteúdo não fica escondido atrás dela.
    paddingBottom: theme.sizes.tabBarClearance,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  errorCard: { alignSelf: 'stretch', alignItems: 'flex-start', gap: theme.spacing.sm },
  retryBtn: {
    alignSelf: 'stretch',
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primaryBright,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  flex: { flex: 1, minWidth: 0 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  topCopy: { flex: 1, minWidth: 0 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(248,250,252,0.12)',
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPanel: {
    gap: theme.spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.34)',
    backgroundColor: '#111827',
    padding: theme.spacing.lg,
    overflow: 'hidden',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  characterBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatarFrame: {
    width: 74,
    height: 74,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.7)',
    backgroundColor: theme.colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelSeal: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#111827',
  },
  characterCopy: { flex: 1, minWidth: 0, gap: 2 },
  crest: {
    width: 62,
    height: 62,
    opacity: 0.9,
  },
  vitalGrid: {
    gap: theme.spacing.md,
  },
  vital: {
    gap: theme.spacing.xs,
  },
  vitalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  resourceStrip: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  nemesisBanner: {
    alignItems: 'center',
    backgroundColor: withAlpha(theme.colors.danger, 0.12),
    borderColor: withAlpha(theme.colors.danger, 0.4),
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  resourcePill: {
    flex: 1,
    minHeight: 58,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(248,250,252,0.1)',
    backgroundColor: 'rgba(2,6,23,0.42)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
});
