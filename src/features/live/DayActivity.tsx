import { HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  padding,
  progressViewStyle,
  tint,
  truncationMode,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

/**
 * O que a atividade do dia desenha. Espelha `DayProps` em
 * `gamificacao-api/src/live/live.service.ts` — a API manda exatamente isto
 * dentro dos pushes de atualização, e o app manda o mesmo quando roda.
 */
export type DayActivityProps = {
  hp: number;
  maxHp: number;
  /** 0..1 dos hábitos do dia. */
  completion: number;
  pending: number;
  screenLabel: string;
  screenUsedMin: number;
  screenFreeMin: number;
  dayCloseLabel: string;
  dayCloseState: string;
  /** O que você escolheu mostrar (tela de Live Activity no app). */
  showHp: boolean;
  showScreen: boolean;
  showClose: boolean;
  updatedAt: number;
};

/**
 * O DIA EM ANDAMENTO, na tela de bloqueio e na Dynamic Island.
 *
 * É o widget em outra forma: o mesmo retrato da API, recortado para o que
 * cabe numa faixa — vida, a distração mais perto do limite e o fechamento do
 * dia. Cada bloco some quando você o desliga na configuração.
 *
 * Regras do 'widget': roda num runtime isolado — nada de constantes do módulo,
 * hooks ou imports além do SwiftUI; tudo é declarado aqui dentro.
 */
function EvolveDay(raw: Partial<DayActivityProps>, _environment: LiveActivityEnvironment) {
  'widget';

  const c = {
    text: '#F8FAFC',
    muted: '#A7B0C2',
    success: '#31D08A',
    warning: '#F6C453',
    danger: '#FF6B81',
    magic: '#A78BFA',
    blue: '#38BDF8',
  };
  const hp = raw.hp ?? 0;
  const maxHp = Math.max(1, raw.maxHp ?? 1);
  const used = raw.screenUsedMin ?? 0;
  const free = raw.screenFreeMin ?? 0;
  const showHp = raw.showHp !== false;
  const showScreen = raw.showScreen !== false && Boolean(raw.screenLabel);
  const showClose = raw.showClose !== false && Boolean(raw.dayCloseLabel);
  const pending = raw.pending ?? 0;
  const urgent = raw.dayCloseState === 'now' || raw.dayCloseState === 'late';

  const hpColor = hp <= maxHp * 0.3 ? c.danger : c.success;
  const screenColor = free > 0 && used >= free ? c.danger : free > 0 && used >= free * 0.8 ? c.warning : c.blue;
  const screenShort = free > 0 ? `${used}/${free}` : `${used}`;
  const ratio = Math.max(0, Math.min(1, hp / maxHp));

  const hpBlock = (
    <VStack alignment="leading" spacing={4}>
      <HStack spacing={5}>
        <Image systemName="heart.fill" size={13} color={hpColor} />
        <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(c.text), monospacedDigit()]}>
          {`${hp}/${maxHp}`}
        </Text>
      </HStack>
      <ProgressView value={ratio} modifiers={[progressViewStyle('linear'), tint(hpColor), frame({ width: 110 })]} />
    </VStack>
  );

  const screenBlock = (
    <HStack spacing={5}>
      <Image systemName="hourglass" size={12} color={screenColor} />
      <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(c.text), lineLimit(1), truncationMode('tail')]}>
        {raw.screenLabel ?? ''}
      </Text>
    </HStack>
  );

  const closeBlock = (
    <HStack spacing={5}>
      <Image systemName="moon.fill" size={12} color={urgent ? c.magic : c.muted} />
      <Text modifiers={[font({ size: 13, weight: urgent ? 'bold' : 'regular' }), foregroundStyle(urgent ? c.magic : c.muted), lineLimit(1)]}>
        {raw.dayCloseLabel ?? ''}
      </Text>
    </HStack>
  );

  const pendingText = (
    <Text modifiers={[font({ size: 12 }), foregroundStyle(c.muted), lineLimit(1)]}>
      {pending > 0 ? `${pending} hábito${pending === 1 ? '' : 's'} pendente${pending === 1 ? '' : 's'}` : 'Hábitos do dia em dia'}
    </Text>
  );

  return {
    banner: (
      <HStack spacing={12} modifiers={[padding({ all: 16 })]}>
        <VStack alignment="leading" spacing={6}>
          <Text modifiers={[font({ size: 10, weight: 'bold' }), foregroundStyle(c.magic)]}>EVOLVE · HOJE</Text>
          {showHp ? hpBlock : pendingText}
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={6}>
          {showScreen ? screenBlock : null}
          {showClose ? closeBlock : null}
          {!showScreen && !showClose ? pendingText : null}
        </VStack>
      </HStack>
    ),
    compactLeading: showHp ? (
      <HStack spacing={3}>
        <Image systemName="heart.fill" size={12} color={hpColor} />
        <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(c.text), monospacedDigit()]}>{`${hp}`}</Text>
      </HStack>
    ) : (
      <Image systemName="moon.fill" size={13} color={urgent ? c.magic : c.muted} />
    ),
    compactTrailing: urgent && showClose ? (
      <Image systemName="moon.fill" size={13} color={c.magic} />
    ) : showScreen ? (
      <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(screenColor), monospacedDigit()]}>{screenShort}</Text>
    ) : (
      <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(c.text), monospacedDigit()]}>{`${pending}`}</Text>
    ),
    minimal: (
      <Image systemName={urgent ? 'moon.fill' : 'heart.fill'} size={12} color={urgent ? c.magic : hpColor} />
    ),
    expandedLeading: showHp ? hpBlock : pendingText,
    expandedTrailing: showScreen ? screenBlock : <Text modifiers={[font({ size: 12 }), foregroundStyle(c.muted)]}>{`${pending} pendentes`}</Text>,
    expandedBottom: (
      <HStack spacing={8}>
        {showClose ? closeBlock : pendingText}
        <Spacer />
        {showClose ? pendingText : null}
      </HStack>
    ),
  };
}

export default createLiveActivity<DayActivityProps>('EvolveDay', EvolveDay);
