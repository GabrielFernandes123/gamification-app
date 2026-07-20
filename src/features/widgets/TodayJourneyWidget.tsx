import { HStack, Image, ProgressView, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  background,
  clipShape,
  containerBackground,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  lineLimit,
  monospacedDigit,
  padding,
  progressViewStyle,
  tint,
  truncationMode,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { TodayJourneyWidgetProps } from './todayJourney';

function TodayJourneyWidget(
  rawProps: Partial<TodayJourneyWidgetProps> = {},
  environment: WidgetEnvironment,
) {
  'widget';

  const c = {
    bg: '#070B14',
    card: '#121A2B',
    cardStrong: '#1A253A',
    text: '#F8FAFC',
    muted: '#A7B0C2',
    subtle: '#64748B',
    success: '#31D08A',
    warning: '#F6C453',
    danger: '#FF6B81',
    magic: '#A78BFA',
    blue: '#38BDF8',
    orange: '#FB923C',
  };

  const props = {
    statusLabel: rawProps.statusLabel ?? 'Jornada',
    completion: rawProps.completion ?? 0,
    completedHabits: rawProps.completedHabits ?? 0,
    dueHabits: rawProps.dueHabits ?? 0,
    xpToday: rawProps.xpToday ?? 0,
    goldToday: rawProps.goldToday ?? 0,
    failedToday: rawProps.failedToday ?? 0,
    level: rawProps.level ?? 1,
    hp: rawProps.hp ?? 0,
    maxHp: rawProps.maxHp ?? 1,
    streak: rawProps.streak ?? 0,
    claimableObjectives: rawProps.claimableObjectives ?? 0,
    atRiskObjectives: rawProps.atRiskObjectives ?? 0,
    bossName: rawProps.bossName ?? null,
    bossHp: rawProps.bossHp ?? null,
    bossMaxHp: rawProps.bossMaxHp ?? null,
    actions: rawProps.actions ?? [],
  };

  const ratio = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
  };

  const pending = Math.max(0, props.dueHabits - props.completedHabits);
  const percent = Math.round(ratio(props.completion) * 100);
  const nextAction = props.actions.find((action) => action.id.startsWith('habit-'))?.label;
  const mainFocus =
    pending === 0 && props.dueHabits > 0
      ? 'Dia completo'
      : nextAction
        ? nextAction
        : pending > 0
          ? `${pending} ações pendentes`
          : 'Sem rotina hoje';
  const statusColor =
    props.atRiskObjectives > 0 || props.failedToday > 0
      ? c.danger
      : pending === 0 && props.dueHabits > 0
        ? c.success
        : c.orange;
  const statusIcon =
    props.atRiskObjectives > 0 || props.failedToday > 0
      ? 'exclamationmark.triangle.fill'
      : pending === 0 && props.dueHabits > 0
        ? 'checkmark.seal.fill'
        : 'flame.fill';
  const bossPercent =
    props.bossHp !== null && props.bossMaxHp !== null && props.bossMaxHp > 0
      ? Math.round(ratio(props.bossHp / props.bossMaxHp) * 100)
      : null;
  const formatAmount = (value: number) => {
    if (value >= 1000) return `${Math.floor(value / 100) / 10}k`;
    return `${value}`;
  };
  const objectiveStat =
    props.failedToday > 0
      ? {
          icon: 'exclamationmark.triangle.fill' as const,
          value: `${props.failedToday}`,
          label: 'Falhas',
          color: c.danger,
        }
      : props.atRiskObjectives > 0
        ? {
            icon: 'exclamationmark.triangle.fill' as const,
            value: `${props.atRiskObjectives}`,
            label: 'Em risco',
            color: c.danger,
          }
        : {
            icon: 'target' as const,
            value: `${props.claimableObjectives}`,
            label: 'Resgates',
            color: c.success,
          };

  const shell = (pad: number) => [
    containerBackground(c.bg, 'widget'),
    padding({ all: pad }),
    widgetURL('evolve:///(app)/(tabs)/dashboard'),
  ];
  const largeShell = [
    containerBackground(c.bg, 'widget'),
    padding({ top: 18, bottom: 18, leading: 24, trailing: 12 }),
    widgetURL('evolve:///(app)/(tabs)/dashboard'),
  ];

  const Stat = ({
    icon,
    value,
    label,
    color,
    width,
  }: {
    icon:
      | 'bolt.fill'
      | 'creditcard.fill'
      | 'exclamationmark.triangle.fill'
      | 'heart.fill'
      | 'flame.fill'
      | 'star.fill'
      | 'target';
    value: string;
    label: string;
    color: string;
    width: number;
  }) => (
    <HStack
      spacing={8}
      modifiers={[
        padding({ horizontal: 11, vertical: 8 }),
        frame({ width, height: 46, alignment: 'leading' }),
        background(c.card),
        cornerRadius(12),
      ]}>
      <Image systemName={icon} size={16} color={color} />
      <VStack alignment="leading" spacing={1} modifiers={[frame({ maxWidth: width - 44, alignment: 'leading' })]}>
        <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(c.text), monospacedDigit(), lineLimit(1), truncationMode('tail')]}>
          {value}
        </Text>
        <Text modifiers={[font({ size: 9, weight: 'semibold' }), foregroundStyle(c.subtle), lineLimit(1), truncationMode('tail')]}>
          {label}
        </Text>
      </VStack>
    </HStack>
  );

  const Header = ({ compact }: { compact?: boolean }) => (
    <HStack spacing={compact ? 10 : 8} modifiers={[frame({ height: compact ? 34 : 42, alignment: 'leading' })]}>
      <ZStack modifiers={[frame({ width: compact ? 28 : 34, height: compact ? 28 : 34 }), background('#1D273A'), clipShape('roundedRectangle', 10)]}>
        <Image systemName={statusIcon} size={compact ? 15 : 18} color={statusColor} />
      </ZStack>
      <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: compact ? 190 : 184, alignment: 'leading' })]}>
        <Text modifiers={[font({ size: 10, weight: 'bold' }), foregroundStyle(statusColor), lineLimit(1)]}>
          JORNADA DE HOJE
        </Text>
        <Text modifiers={[font({ size: compact ? 13 : 16, weight: 'bold' }), foregroundStyle(c.text), lineLimit(1), truncationMode('tail')]}>
          {mainFocus}
        </Text>
      </VStack>
      <Spacer />
      <Text
        modifiers={[
          font({ size: compact ? 17 : 19, weight: 'bold' }),
          foregroundStyle(c.blue),
          monospacedDigit(),
          lineLimit(1),
          frame({ width: compact ? 42 : 44, alignment: 'trailing' }),
          layoutPriority(1),
        ]}>
        {percent}%
      </Text>
    </HStack>
  );

  const Progress = () => (
    <VStack
      alignment="leading"
      spacing={8}
      modifiers={[
        padding({ horizontal: 14, vertical: 11 }),
        background(c.cardStrong),
        cornerRadius(14),
      ]}>
      <HStack spacing={6}>
        <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(c.text), lineLimit(1)]}>
          {props.completedHabits}/{props.dueHabits} ações
        </Text>
        <Spacer />
        <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(statusColor), monospacedDigit()]}>
          {pending} faltam
        </Text>
      </HStack>
      <ProgressView value={ratio(props.completion)} modifiers={[progressViewStyle('linear'), tint(statusColor)]} />
    </VStack>
  );

  if (environment.widgetFamily === 'accessoryInline') {
    return (
      <Text>
        Hoje {percent}% - {pending} pendentes
      </Text>
    );
  }

  if (environment.widgetFamily === 'accessoryCircular') {
    return (
      <VStack alignment="center" spacing={2} modifiers={shell(2)}>
        <Image systemName={statusIcon} size={16} color={statusColor} />
        <Text modifiers={[font({ size: 17, weight: 'bold' }), foregroundStyle(c.text), monospacedDigit()]}>
          {percent}%
        </Text>
        <Text modifiers={[font({ size: 8, weight: 'semibold' }), foregroundStyle(c.muted)]}>{pending}</Text>
      </VStack>
    );
  }

  if (environment.widgetFamily === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" spacing={4} modifiers={shell(2)}>
        <HStack spacing={5}>
          <Image systemName={statusIcon} size={12} color={statusColor} />
          <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(c.text), lineLimit(1)]}>
            Hoje {percent}%
          </Text>
        </HStack>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(c.muted), lineLimit(1)]}>{mainFocus}</Text>
      </VStack>
    );
  }

  if (environment.widgetFamily === 'systemSmall') {
    return (
      <VStack alignment="leading" spacing={9} modifiers={shell(10)}>
        <Header compact />
        <Progress />
        <HStack spacing={7}>
          <Stat icon="bolt.fill" value={formatAmount(props.xpToday)} label="XP" color={c.warning} width={64} />
          <Stat icon="flame.fill" value={`${props.streak}`} label="Seq." color={c.orange} width={64} />
        </HStack>
      </VStack>
    );
  }

  if (environment.widgetFamily === 'systemLarge') {
    return (
      <VStack alignment="leading" spacing={12} modifiers={largeShell}>
        <Header />
        <Progress />
        <HStack spacing={10}>
          <Stat icon="bolt.fill" value={formatAmount(props.xpToday)} label="XP hoje" color={c.warning} width={136} />
          <Stat icon="flame.fill" value={`${props.streak}`} label="Sequência" color={c.orange} width={136} />
        </HStack>
        <VStack
          alignment="leading"
          spacing={7}
          modifiers={[
            padding({ horizontal: 14, vertical: 12 }),
            frame({ width: 282, alignment: 'leading' }),
            background(c.card),
            cornerRadius(14),
          ]}>
          <Text modifiers={[font({ size: 10, weight: 'bold' }), foregroundStyle(c.muted), lineLimit(1)]}>
            PRÓXIMO FOCO
          </Text>
          <Text modifiers={[font({ size: 16, weight: 'bold' }), foregroundStyle(c.text), lineLimit(1), truncationMode('tail')]}>
            {mainFocus}
          </Text>
          <Text modifiers={[font({ size: 11 }), foregroundStyle(c.subtle), lineLimit(1)]}>
            {bossPercent !== null ? `Boss com ${bossPercent}% de HP` : `${props.atRiskObjectives} objetivos em risco`}
          </Text>
        </VStack>
        <HStack spacing={10}>
          <Stat icon="heart.fill" value={`${props.hp}/${props.maxHp}`} label="HP" color={c.danger} width={136} />
          <Stat
            icon={objectiveStat.icon}
            value={objectiveStat.value}
            label={objectiveStat.label}
            color={objectiveStat.color}
            width={136}
          />
        </HStack>
      </VStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={9} modifiers={shell(12)}>
      <Header compact />
      <Progress />
      <HStack spacing={8}>
        <Stat icon="bolt.fill" value={formatAmount(props.xpToday)} label="XP hoje" color={c.warning} width={96} />
        <Stat icon="creditcard.fill" value={formatAmount(props.goldToday)} label="Ouro" color={c.warning} width={96} />
        <Stat icon="flame.fill" value={`${props.streak}`} label="Seq." color={c.orange} width={96} />
      </HStack>
    </VStack>
  );
}

export default createWidget<TodayJourneyWidgetProps>('TodayJourneyWidget', TodayJourneyWidget);
