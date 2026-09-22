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
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

/** Espelha `FocusProps` em `gamificacao-api/src/live/live.service.ts`. */
export type FocusActivityProps = {
  sessionId: string;
  /** Epoch em ms. */
  startsAt: number;
  endsAt: number;
  /** O conjunto bloqueado (ex.: "Foco"). */
  label: string;
  abandonCost: number;
};

/**
 * A SESSÃO DE FOCO, contando na tela de bloqueio e na Dynamic Island.
 *
 * O relógio é desenhado pelo próprio iOS (`timerInterval`): ele conta sozinho,
 * sem nenhuma atualização — nem do app, nem da API. É por isso que o foco
 * funciona mesmo sem a chave da Apple no servidor, desde que comece com o app
 * aberto.
 */
function EvolveFocus(raw: Partial<FocusActivityProps>, _environment: LiveActivityEnvironment) {
  'widget';

  const c = { text: '#F8FAFC', muted: '#A7B0C2', magic: '#A78BFA' };
  const inicio = new Date(raw.startsAt ?? Date.now());
  const fim = new Date(raw.endsAt ?? Date.now());
  const janela = { lower: inicio, upper: fim };

  const relogio = (size: number) => (
    <Text
      timerInterval={janela}
      countsDown
      modifiers={[font({ size, weight: 'bold' }), foregroundStyle(c.text), monospacedDigit()]}
    />
  );

  return {
    banner: (
      <HStack spacing={12} modifiers={[padding({ all: 16 })]}>
        <Image systemName="brain.head.profile" size={22} color={c.magic} />
        <VStack alignment="leading" spacing={4}>
          <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle(c.magic), lineLimit(1)]}>
            {`FOCO · ${(raw.label ?? 'Foco').toUpperCase()}`}
          </Text>
          {relogio(26)}
          <ProgressView
            timerInterval={janela}
            modifiers={[progressViewStyle('linear'), tint(c.magic), frame({ width: 180 })]}
          />
        </VStack>
        <Spacer />
        <Text modifiers={[font({ size: 11 }), foregroundStyle(c.muted), lineLimit(2), frame({ width: 70 })]}>
          {(raw.abandonCost ?? 0) > 0 ? `Sair custa ${raw.abandonCost}` : ''}
        </Text>
      </HStack>
    ),
    compactLeading: <Image systemName="brain.head.profile" size={13} color={c.magic} />,
    compactTrailing: (
      <Text
        timerInterval={janela}
        countsDown
        modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(c.text), monospacedDigit(), frame({ width: 52 })]}
      />
    ),
    minimal: <Image systemName="brain.head.profile" size={12} color={c.magic} />,
    expandedLeading: <Image systemName="brain.head.profile" size={20} color={c.magic} />,
    expandedTrailing: relogio(20),
    expandedBottom: (
      <ProgressView timerInterval={janela} modifiers={[progressViewStyle('linear'), tint(c.magic)]} />
    ),
  };
}

export default createLiveActivity<FocusActivityProps>('EvolveFocus', EvolveFocus);
