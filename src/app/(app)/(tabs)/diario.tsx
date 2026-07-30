import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import {
  Angry,
  Camera,
  CornerDownLeft,
  Frown,
  ImageIcon,
  Laugh,
  Meh,
  Mic,
  NotebookPen,
  Pause,
  Play,
  Smile,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import {
  uploadJournalMedia,
  useClearTranscription,
  useJournal,
  useSaveJournal,
  useTranscribeJournal,
  type JournalEntry,
} from '@/features/health/hooks/useJournal';
import { theme } from '@/theme/theme';

/**
 * Aba Diário (doc 14 §4.15).
 *
 * O caderno de papel continua sendo o caderno. Esta tela existe para trazer o
 * que está nele para dentro do sistema **sem redigitar** — por isso a hierarquia
 * é: humor (um toque) › mídia (foto/áudio) › texto › leitura da IA, nessa ordem
 * de esforço crescente. Registrar o dia tem de caber em cinco segundos.
 *
 * Duas regras da tela, herdadas do serviço:
 *
 *  • **A mídia é a fonte da verdade.** A transcrição mora num bloco separado,
 *    visivelmente marcado como gerado, e descartá-la não encosta na foto.
 *  • **A IA só roda a pedido.** Não há transcrição automática ao salvar —
 *    mandar o diário para um modelo é escolha explícita, toda vez.
 *
 * Consulta e leitura do histórico ficam no web; aqui só o dia de hoje é
 * editável, e os dias anteriores aparecem como lembrete visual.
 */

const HISTORY_DAYS = 30;

const MOODS = [
  { value: 1, label: 'Péssimo', Icon: Angry, color: theme.colors.hp },
  { value: 2, label: 'Ruim', Icon: Frown, color: theme.colors.primary },
  { value: 3, label: 'Neutro', Icon: Meh, color: theme.colors.textMuted },
  { value: 4, label: 'Bom', Icon: Smile, color: theme.colors.skill },
  { value: 5, label: 'Ótimo', Icon: Laugh, color: theme.colors.success },
] as const;

export default function DiarioScreen() {
  const toast = useToast();
  const today = localISODate(0);
  const start = localISODate(-HISTORY_DAYS);

  const { data: entries, isLoading, refetch, isRefetching } = useJournal(start, today);
  const save = useSaveJournal();
  const transcribe = useTranscribeJournal();
  const clearTranscription = useClearTranscription();

  const entry = entries?.find((item) => item.occurredOn === today) ?? null;
  const past = entries?.filter((item) => item.occurredOn !== today) ?? [];

  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<'photo' | 'audio' | null>(null);
  // Só sincroniza o rascunho com o servidor quando a entrada MUDA de verdade.
  // Sem isso, cada refetch enquanto você digita apagaria o que está na tela.
  const syncedFor = useRef<string | null>(null);
  useEffect(() => {
    const key = entry?.id ?? 'novo';
    if (syncedFor.current === key) return;
    syncedFor.current = key;
    setDraft(entry?.text ?? '');
  }, [entry?.id, entry?.text]);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  async function persist(patch: Parameters<typeof save.mutateAsync>[0]) {
    try {
      await save.mutateAsync({ occurredOn: today, ...patch });
    } catch (error) {
      toast.error('Não deu para salvar', message(error));
    }
  }

  async function pickPhoto(from: 'camera' | 'library') {
    const permission =
      from === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Permissão negada', 'Libere o acesso nas configurações do iPhone.');
      return;
    }

    // Qualidade alta de propósito: é uma página manuscrita, e a IA vai ter de
    // ler a letra depois. Comprimir demais aqui vira [ilegível] lá na frente.
    const options = { quality: 0.9, base64: true, allowsEditing: false } as const;
    const result =
      from === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync({ ...options, mediaTypes: ['images'] });

    const asset = result.assets?.[0];
    if (result.canceled || !asset?.uri) return;

    setBusy('photo');
    try {
      const contentType = asset.mimeType ?? 'image/jpeg';
      const path = await uploadJournalMedia(
        'photo',
        { uri: asset.uri, base64: asset.base64 },
        extensionOf(asset.uri, contentType),
        contentType,
      );
      await persist({ photoPath: path });
    } catch (error) {
      toast.error('Falha ao enviar a foto', message(error));
    } finally {
      setBusy(null);
    }
  }

  async function startRecording() {
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
      toast.error('Não deu para gravar', message(error));
    }
  }

  async function stopRecording() {
    setBusy('audio');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      // Devolver a sessão de áudio ao normal, senão o playback sai baixo e
      // pelo alto-falante do ouvido no iOS.
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (!uri) throw new Error('A gravação não gerou arquivo.');
      const path = await uploadJournalMedia('audio', { uri }, 'm4a', 'audio/m4a');
      await persist({ audioPath: path });
    } catch (error) {
      toast.error('Falha ao enviar o áudio', message(error));
    } finally {
      setBusy(null);
    }
  }

  async function runTranscription() {
    if (!entry) return;
    try {
      await transcribe.mutateAsync(entry.id);
    } catch (error) {
      toast.error('A IA não leu esta mídia', message(error));
    }
  }

  const hasMedia = Boolean(entry?.photoUrl || entry?.audioUrl);
  const dirty = draft.trim() !== (entry?.text ?? '').trim();

  return (
    <Screen scroll keyboard refreshing={isRefetching} onRefresh={() => void refetch()} contentStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="label">Registro do dia</Text>
        <Text variant="display">Diário</Text>
      </View>

      <Card style={styles.card}>
        <Text variant="label">{formatFullDay(today)}</Text>

        {/* 1. Humor — um toque, salva na hora. É o registro mínimo do dia. */}
        <View style={styles.moodRow}>
          {MOODS.map(({ value, label, Icon, color }) => {
            const selected = entry?.mood === value;
            return (
              <Pressable
                key={value}
                onPress={() => void persist({ mood: value })}
                accessibilityRole="button"
                accessibilityLabel={`Humor: ${label}`}
                accessibilityState={{ selected }}
                style={[styles.mood, selected && { borderColor: color, backgroundColor: theme.colors.surfaceSoft }]}
              >
                <Icon color={selected ? color : theme.colors.textSubtle} size={24} />
                <Text variant="label" color={selected ? color : theme.colors.textSubtle} numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 2. Mídia — o jeito rápido de registrar o que já está no papel. */}
        <View style={styles.mediaRow}>
          <MediaButton
            icon={<Camera color={theme.colors.primary} size={20} />}
            label="Fotografar"
            loading={busy === 'photo'}
            onPress={() => void pickPhoto('camera')}
          />
          <MediaButton
            icon={<ImageIcon color={theme.colors.primary} size={20} />}
            label="Galeria"
            loading={false}
            onPress={() => void pickPhoto('library')}
          />
          <MediaButton
            icon={
              recorderState.isRecording ? (
                <Square color={theme.colors.hp} size={18} fill={theme.colors.hp} />
              ) : (
                <Mic color={theme.colors.primary} size={20} />
              )
            }
            label={recorderState.isRecording ? formatDuration(recorderState.durationMillis) : 'Gravar'}
            active={recorderState.isRecording}
            loading={busy === 'audio'}
            onPress={() => void (recorderState.isRecording ? stopRecording() : startRecording())}
          />
        </View>

        {entry?.photoUrl ? (
          <ExpoImage source={{ uri: entry.photoUrl }} style={styles.photo} contentFit="cover" transition={150} />
        ) : null}

        {entry?.audioUrl ? <AudioRow uri={entry.audioUrl} /> : null}

        {/* 3. Texto — o que você quiser acrescentar por conta própria. */}
        <Input
          label="Suas palavras"
          value={draft}
          onChangeText={setDraft}
          placeholder="O que ficou do dia..."
          multiline
          textAlignVertical="top"
          style={styles.textArea}
        />
        {dirty ? (
          <Button
            label="Salvar texto"
            icon={<CornerDownLeft color={theme.colors.textInverse} size={16} />}
            loading={save.isPending}
            onPress={() => void persist({ text: draft.trim() || null })}
          />
        ) : null}
      </Card>

      {/* 4. A IA, por último e só se houver mídia: é a etapa opcional. */}
      {hasMedia && entry ? (
        <Card style={styles.aiCard}>
          <View style={styles.aiHead}>
            <Sparkles color={theme.colors.skill} size={18} />
            <Text variant="title" style={styles.flex}>
              Leitura da IA
            </Text>
          </View>

          {entry.transcription ? (
            <>
              <View style={styles.aiBadge}>
                <Text variant="label" color={theme.colors.skill}>
                  Gerado por IA{entry.transcriptionModel ? ` · ${entry.transcriptionModel}` : ''}
                </Text>
              </View>
              <Text variant="body">{entry.transcription}</Text>
              <View style={styles.aiActions}>
                <Button
                  label="Usar como meu texto"
                  variant="outline"
                  size="sm"
                  onPress={() => setDraft(entry.transcription ?? '')}
                />
                <Button
                  label="Descartar leitura"
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 color={theme.colors.hp} size={15} />}
                  loading={clearTranscription.isPending}
                  onPress={() => void clearTranscription.mutateAsync(entry.id)}
                />
              </View>
              <Text variant="bodyMuted" style={styles.fine}>
                Descartar apaga só a leitura. A foto e o áudio do dia continuam aqui.
              </Text>
            </>
          ) : (
            <>
              <Text variant="bodyMuted">
                {entry.audioUrl
                  ? 'A IA transcreve o áudio literalmente, sem resumir.'
                  : 'A IA lê a página fotografada e transcreve o que está escrito.'}
              </Text>
              <Button
                label="Transcrever"
                variant="outline"
                loading={transcribe.isPending}
                onPress={() => void runTranscription()}
              />
            </>
          )}
        </Card>
      ) : null}

      <View style={styles.pastHead}>
        <Text variant="label">Dias anteriores</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : past.length === 0 ? (
        <Card style={styles.empty}>
          <NotebookPen color={theme.colors.textSubtle} size={22} />
          <Text variant="bodyMuted">Nada registrado nos últimos {HISTORY_DAYS} dias.</Text>
        </Card>
      ) : (
        past.map((item) => <PastRow key={item.id} entry={item} />)
      )}
    </Screen>
  );
}

function MediaButton({
  icon,
  label,
  onPress,
  loading,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  loading: boolean;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.mediaBtn, active && styles.mediaBtnActive]}
    >
      {loading ? <ActivityIndicator color={theme.colors.primary} size="small" /> : icon}
      <Text variant="label" color={active ? theme.colors.hp : theme.colors.text} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Toca a gravação do dia. URL assinada e de validade curta — some ao recarregar. */
function AudioRow({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  return (
    <Pressable
      style={styles.audioRow}
      accessibilityRole="button"
      accessibilityLabel={status.playing ? 'Pausar gravação' : 'Ouvir gravação'}
      onPress={() => {
        if (status.playing) return player.pause();
        if (status.didJustFinish || status.currentTime >= status.duration) player.seekTo(0);
        player.play();
      }}
    >
      {status.playing ? (
        <Pause color={theme.colors.primary} size={18} />
      ) : (
        <Play color={theme.colors.primary} size={18} />
      )}
      <Text variant="bodyMedium" style={styles.flex}>
        Gravação do dia
      </Text>
      <Text variant="label">{formatDuration((status.duration || 0) * 1000)}</Text>
    </Pressable>
  );
}

function PastRow({ entry }: { entry: JournalEntry }) {
  const mood = MOODS.find((item) => item.value === entry.mood);
  const preview = entry.text?.trim() || entry.transcription?.trim() || null;

  return (
    <Card style={styles.pastRow} accent={mood?.color}>
      <View style={styles.pastHeadRow}>
        {mood ? <mood.Icon color={mood.color} size={18} /> : <Meh color={theme.colors.textSubtle} size={18} />}
        <Text variant="bodyMedium" style={styles.flex}>
          {formatShortDay(entry.occurredOn)}
        </Text>
        {entry.photoUrl ? <ImageIcon color={theme.colors.textSubtle} size={15} /> : null}
        {entry.audioUrl ? <Mic color={theme.colors.textSubtle} size={15} /> : null}
      </View>
      {preview ? (
        <Text variant="bodyMuted" numberOfLines={2}>
          {preview}
        </Text>
      ) : null}
    </Card>
  );
}

/** Data local em `YYYY-MM-DD` — a mesma que a tela mostra, sem passar por UTC. */
function localISODate(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatFullDay(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

function formatShortDay(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

function formatDuration(millis: number) {
  const total = Math.round(millis / 1000);
  return `${Math.floor(total / 60)}:${`${total % 60}`.padStart(2, '0')}`;
}

function extensionOf(uri: string, mimeType: string) {
  const fromUri = uri.split('?')[0]?.split('.').pop()?.toLowerCase();
  if (fromUri && fromUri.length <= 5) return fromUri;
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('heic')) return 'heic';
  return 'jpg';
}

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Tente de novo.';
}

const styles = StyleSheet.create({
  content: { paddingBottom: theme.sizes.tabBarClearance, gap: theme.spacing.md },
  header: { gap: theme.spacing.xs },
  flex: { flex: 1, minWidth: 0 },
  card: { gap: theme.spacing.lg },

  moodRow: { flexDirection: 'row', gap: theme.spacing.xs },
  mood: {
    flex: 1,
    minHeight: theme.sizes.touch + 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: 2,
  },

  mediaRow: { flexDirection: 'row', gap: theme.spacing.sm },
  mediaBtn: {
    flex: 1,
    minHeight: theme.sizes.touch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: theme.spacing.sm,
  },
  mediaBtnActive: { borderColor: theme.colors.hp, backgroundColor: theme.colors.primaryDim },

  photo: {
    width: '100%',
    height: 220,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  audioRow: {
    minHeight: theme.sizes.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: theme.spacing.md,
  },
  textArea: { minHeight: 120, paddingTop: theme.spacing.md },

  aiCard: { gap: theme.spacing.md, borderColor: theme.colors.skill },
  aiHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  aiBadge: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.skill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
  },
  aiActions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  fine: { fontSize: theme.fontSizes.xs },

  pastHead: { marginTop: theme.spacing.sm },
  pastRow: { gap: theme.spacing.xs, padding: theme.spacing.md },
  pastHeadRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  empty: { alignItems: 'center', gap: theme.spacing.sm },
});
