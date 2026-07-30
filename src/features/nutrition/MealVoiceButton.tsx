import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Mic, Square } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { theme } from '@/theme/theme';
import { formatErrorMessage } from '@/utils/errors';
import { fileToBase64, useVoiceMeal } from './hooks/useNutrition';

/**
 * Gravar a refeição por voz.
 *
 * O que este botão faz e o que ele **não** faz: ele cria uma PROPOSTA. Nenhuma
 * refeição é gravada até você conferir e aprovar. É o passo que existe porque
 * "um prato de arroz" não é uma grandeza — a IA vai chutar a porção, e o chute
 * precisa passar por alguém antes de virar linha no histórico.
 */
export function MealVoiceButton({
  compact = false,
  onProposed,
}: {
  compact?: boolean;
  onProposed?: () => void;
}) {
  const toast = useToast();
  const voice = useVoiceMeal();
  const [sending, setSending] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);

  async function start() {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      toast.error('Sem microfone', 'Libere o acesso nas configurações do iPhone.');
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (error) {
      toast.error('Não deu para gravar', formatErrorMessage(error));
    }
  }

  async function stopAndSend() {
    setSending(true);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (!uri) throw new Error('A gravação não gerou arquivo.');

      const audioBase64 = await fileToBase64(uri);
      const proposal = await voice.mutateAsync({ audioBase64, format: 'm4a' });

      toast.success(
        'Proposta pronta',
        proposal.unmatched > 0
          ? `${proposal.unmatched} item(ns) fora da tabela. Confira antes de aprovar.`
          : 'Confira os itens e aprove.',
      );
      onProposed?.();
    } catch (error) {
      toast.error('Falha ao processar o áudio', formatErrorMessage(error));
    } finally {
      setSending(false);
    }
  }

  const busy = sending || voice.isPending;
  const recording = state.isRecording;

  return (
    <Pressable
      onPress={() => void (recording ? stopAndSend() : start())}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={recording ? 'Parar e enviar' : 'Registrar refeição por voz'}
      style={[
        styles.button,
        compact && styles.compact,
        recording && styles.recording,
        busy && styles.busy,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={theme.colors.primary} size="small" />
      ) : recording ? (
        <Square color={theme.colors.hp} size={18} fill={theme.colors.hp} />
      ) : (
        <Mic color={theme.colors.primary} size={20} />
      )}
      <View style={styles.copy}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {busy
            ? 'Ouvindo o que você disse...'
            : recording
              ? `Parar e enviar · ${formatDuration(state.durationMillis)}`
              : 'Registrar refeição por voz'}
        </Text>
        {!compact && !busy && !recording ? (
          <Text variant="bodyMuted" style={styles.hint}>
            Diga o que comeu. Nada é gravado até você aprovar.
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function formatDuration(millis: number) {
  const total = Math.round(millis / 1000);
  return `${Math.floor(total / 60)}:${`${total % 60}`.padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  button: {
    minHeight: theme.sizes.touch + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  compact: { minHeight: theme.sizes.touch },
  recording: { borderColor: theme.colors.hp, backgroundColor: theme.colors.primaryDim },
  busy: { opacity: 0.7 },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  hint: { fontSize: theme.fontSizes.xs },
});
