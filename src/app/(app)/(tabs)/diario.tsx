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
  Frown,
  ImageIcon,
  Laugh,
  Lock,
  Meh,
  Mic,
  NotebookPen,
  Pause,
  Play,
  Smile,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import {
  uploadJournalMedia,
  JOURNAL_DAY_CUTOFF_FALLBACK,
  useClearTranscription,
  useCreateJournalEntry,
  useJournal,
  useJournalSettings,
  useRemoveJournalEntry,
  useTranscribeJournal,
  useUpdateJournalEntry,
  useUpdateJournalSettings,
  type JournalEntry,
} from '@/features/health/hooks/useJournal';
import { theme } from '@/theme/theme';

/**
 * Aba Diário (doc 14 §4.15) — O DIA COMO COMPILADO.
 *
 * O dia não é mais "uma caixa de texto": é a soma dos registros que você
 * sobe ao longo dele, cada um com a hora e o humor daquele momento. No topo,
 * o compositor (humor, foto, áudio, texto → "Registrar"); embaixo, a linha do
 * tempo do dia. O humor do dia é a MÉDIA dos registros — a mesma conta que o
 * fechamento grava.
 *
 * O fechamento do dia SELA o compilado: dia fechado (ou mais antigo que
 * ontem) é só leitura, aqui e na API. Enquanto o dia está aberto, cada
 * registro pode ser editado ou apagado.
 *
 * Duas regras herdadas do serviço continuam valendo:
 *  • **A mídia é a fonte da verdade.** A transcrição mora num bloco separado,
 *    marcado como gerado, e descartá-la não encosta na foto.
 *  • **A IA só roda a pedido** (ou com a transcrição automática ligada).
 */

const HISTORY_DAYS = 30;

const MOODS = [
  { value: 1, label: 'Péssimo', Icon: Angry, color: theme.colors.hp },
  { value: 2, label: 'Ruim', Icon: Frown, color: theme.colors.primary },
  { value: 3, label: 'Neutro', Icon: Meh, color: theme.colors.textMuted },
  { value: 4, label: 'Bom', Icon: Smile, color: theme.colors.skill },
  { value: 5, label: 'Ótimo', Icon: Laugh, color: theme.colors.success },
] as const;

type Day = {
  date: string;
  entries: JournalEntry[];
  locked: boolean;
  /** Média dos humores do dia (uma casa), ou null se ninguém disse. */
  moodAvg: number | null;
};

export default function DiarioScreen() {
  const settings = useJournalSettings();
  const updateSettings = useUpdateJournalSettings();
  const corte = settings.data?.dayCutoffHours ?? JOURNAL_DAY_CUTOFF_FALLBACK;
  // O DIA DO DIÁRIO vira às 4h, não à meia-noite: o registro das 00h30 sobre
  // o dia que acabou pertence a ele.
  const today = journalDay(0, corte);
  const start = journalDay(-HISTORY_DAYS, corte);
  const madrugada = new Date().getHours() < corte;

  const { data: entries, isLoading, refetch, isRefetching } = useJournal(start, today);

  const days = useMemo(() => groupByDay(entries ?? []), [entries]);
  const hoje = days.find((d) => d.date === today) ?? null;
  const outros = days.filter((d) => d.date !== today);
  // Hoje fechado (fechou à noite e ainda não virou): o compositor sai.
  const hojeSelado = Boolean(hoje?.locked);

  return (
    <Screen scroll keyboard refreshing={isRefetching} onRefresh={() => void refetch()} contentStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="label">Registro do dia</Text>
        <Text variant="display">Diário</Text>
      </View>

      {hojeSelado ? (
        <Card style={styles.card}>
          <View style={styles.row}>
            <Lock color={theme.colors.textMuted} size={18} />
            <Text variant="bodyMedium" style={styles.flex}>
              O dia de hoje já foi fechado.
            </Text>
          </View>
          <Text variant="bodyMuted">
            O diário dele está selado. Para acrescentar algo, reabra o dia no
            fechamento.
          </Text>
        </Card>
      ) : (
        <Composer
          today={today}
          corte={corte}
          madrugada={madrugada}
          autoTranscribe={settings.data?.autoTranscribe ?? false}
          autoDisabled={!settings.data || updateSettings.isPending}
          onAutoChange={(valor) => updateSettings.mutate({ autoTranscribe: valor })}
        />
      )}

      <DayHeader label="Hoje" day={hoje} />
      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : hoje ? (
        hoje.entries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} locked={hoje.locked} />
        ))
      ) : (
        <Text variant="bodyMuted">
          Nenhum registro hoje ainda. Suba quantos quiser ao longo do dia — o
          fechamento junta tudo.
        </Text>
      )}

      <View style={styles.pastHead}>
        <Text variant="label">Dias anteriores</Text>
      </View>
      {outros.length === 0 && !isLoading ? (
        <Card style={styles.empty}>
          <NotebookPen color={theme.colors.textSubtle} size={22} />
          <Text variant="bodyMuted">Nada registrado nos últimos {HISTORY_DAYS} dias.</Text>
        </Card>
      ) : (
        outros.map((day) =>
          day.locked ? (
            <PastDay key={day.date} day={day} />
          ) : (
            // Ontem ainda aberto (antes do fechamento): dá para mexer.
            <View key={day.date} style={styles.openDay}>
              <DayHeader label={`${formatShortDay(day.date)} · aberto até o fechamento`} day={day} />
              {day.entries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} locked={false} />
              ))}
            </View>
          ),
        )
      )}
    </Screen>
  );
}

/**
 * O COMPOSITOR — um registro novo. Humor, mídia e texto são todos opcionais,
 * mas pelo menos um tem de existir. A mídia sobe na hora em que é escolhida
 * (o caminho fica guardado aqui) e o registro nasce ao tocar em "Registrar".
 */
function Composer({
  today,
  corte,
  madrugada,
  autoTranscribe,
  autoDisabled,
  onAutoChange,
}: {
  today: string;
  corte: number;
  madrugada: boolean;
  autoTranscribe: boolean;
  autoDisabled: boolean;
  onAutoChange: (value: boolean) => void;
}) {
  const toast = useToast();
  const create = useCreateJournalEntry();
  const [mood, setMood] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<{ path: string; uri: string } | null>(null);
  const [audio, setAudio] = useState<{ path: string; millis: number } | null>(null);
  const [busy, setBusy] = useState<'photo' | 'audio' | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const vazio = mood === null && !text.trim() && !photo && !audio;

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
      setPhoto({ path, uri: asset.uri });
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
    const millis = recorderState.durationMillis;
    try {
      await recorder.stop();
      const uri = recorder.uri;
      // Devolver a sessão de áudio ao normal, senão o playback sai baixo e
      // pelo alto-falante do ouvido no iOS.
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (!uri) throw new Error('A gravação não gerou arquivo.');
      const path = await uploadJournalMedia('audio', { uri }, 'm4a', 'audio/m4a');
      setAudio({ path, millis });
    } catch (error) {
      toast.error('Falha ao enviar o áudio', message(error));
    } finally {
      setBusy(null);
    }
  }

  async function registrar() {
    try {
      // Sem data: a API aplica a virada das 4h, a mesma régua desta tela.
      await create.mutateAsync({
        mood,
        text: text.trim() || null,
        photoPath: photo?.path ?? null,
        audioPath: audio?.path ?? null,
      });
      setMood(null);
      setText('');
      setPhoto(null);
      setAudio(null);
      toast.success('Registrado', 'Entrou no diário de hoje.');
    } catch (error) {
      toast.error('Não deu para registrar', message(error));
    }
  }

  return (
    <Card style={styles.card}>
      <Text variant="label">{formatFullDay(today)} · novo registro</Text>
      {madrugada ? (
        <Text variant="bodyMuted">Até as {corte}h, o que você registra vale para o dia que acabou.</Text>
      ) : null}

      {/* 1. Humor deste momento — o do dia é a média dos registros. */}
      <View style={styles.moodRow}>
        {MOODS.map(({ value, label, Icon, color }) => {
          const selected = mood === value;
          return (
            <Pressable
              key={value}
              onPress={() => setMood(selected ? null : value)}
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

      {/* 2. Mídia — o jeito rápido de trazer o que já está no papel. */}
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

      {photo ? (
        <View>
          <ExpoImage source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" transition={150} />
          <Pressable
            onPress={() => setPhoto(null)}
            style={styles.detach}
            accessibilityRole="button"
            accessibilityLabel="Tirar a foto do registro"
          >
            <X color={theme.colors.text} size={16} />
          </Pressable>
        </View>
      ) : null}
      {audio ? (
        <View style={styles.attached}>
          <Mic color={theme.colors.primary} size={16} />
          <Text variant="bodyMedium" style={styles.flex}>
            Gravação anexada · {formatDuration(audio.millis)}
          </Text>
          <Pressable
            onPress={() => setAudio(null)}
            accessibilityRole="button"
            accessibilityLabel="Tirar a gravação do registro"
          >
            <X color={theme.colors.textMuted} size={16} />
          </Pressable>
        </View>
      ) : null}

      {/* 3. Texto — o que você quiser dizer deste momento. */}
      <Input
        label="Suas palavras"
        value={text}
        onChangeText={setText}
        placeholder="O que está acontecendo agora..."
        multiline
        textAlignVertical="top"
        style={styles.textArea}
      />

      <Button
        label="Registrar"
        icon={<NotebookPen color={theme.colors.textInverse} size={16} />}
        loading={create.isPending}
        disabled={vazio || busy !== null || recorderState.isRecording}
        onPress={() => void registrar()}
      />

      <View style={styles.autoRow}>
        <View style={styles.flex}>
          <Text variant="bodyMedium">Transcrever automaticamente</Text>
          <Text variant="bodyMuted">
            Foto e áudio vão sozinhos para a IA. O resultado fica separado do seu texto.
          </Text>
        </View>
        <Switch
          value={autoTranscribe}
          disabled={autoDisabled}
          onValueChange={onAutoChange}
          trackColor={{ true: theme.colors.primary, false: theme.colors.surfaceSoft }}
        />
      </View>
    </Card>
  );
}

function DayHeader({ label, day }: { label: string; day: Day | null }) {
  const media = day?.moodAvg ?? null;
  const Icone = media === null ? null : MOODS[Math.round(media) - 1];
  return (
    <View style={styles.dayHead}>
      <Text variant="label" style={styles.flex}>
        {label}
        {day ? ` · ${day.entries.length} ${day.entries.length === 1 ? 'registro' : 'registros'}` : ''}
      </Text>
      {Icone && media !== null ? (
        <View style={styles.row}>
          <Icone.Icon color={Icone.color} size={16} />
          <Text variant="label" color={Icone.color}>
            {String(media).replace('.', ',')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * UM REGISTRO. Aberto: humor, texto e apagar editáveis. Selado: só leitura.
 * A transcrição por IA continua disponível mesmo selado — ela é leitura da
 * mídia, não escrita sua.
 */
function EntryCard({ entry, locked }: { entry: JournalEntry; locked: boolean }) {
  const toast = useToast();
  const confirm = useConfirm();
  const update = useUpdateJournalEntry();
  const remove = useRemoveJournalEntry();
  const transcribe = useTranscribeJournal();
  const clearTranscription = useClearTranscription();
  const [draft, setDraft] = useState<string | null>(null);

  const mood = MOODS.find((item) => item.value === entry.mood);
  const texto = draft ?? entry.text ?? '';
  const dirty = draft !== null && draft.trim() !== (entry.text ?? '').trim();
  const hasMedia = Boolean(entry.photoUrl || entry.audioUrl);

  async function salvar(patch: { mood?: number | null; text?: string | null }) {
    try {
      await update.mutateAsync({ id: entry.id, patch });
      setDraft(null);
    } catch (error) {
      toast.error('Não deu para salvar', message(error));
    }
  }

  async function apagar() {
    const ok = await confirm({
      title: 'Apagar este registro?',
      message: 'A foto e o áudio dele vão junto. Isso não pode ser desfeito.',
      confirmLabel: 'Apagar',
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(entry.id);
    } catch (error) {
      toast.error('Não deu para apagar', message(error));
    }
  }

  return (
    <Card style={styles.entry} accent={mood?.color}>
      <View style={styles.row}>
        <Text variant="bodyMedium">{formatTime(entry.occurredAt)}</Text>
        {mood ? <mood.Icon color={mood.color} size={16} /> : null}
        {mood ? (
          <Text variant="label" color={mood.color}>
            {mood.label}
          </Text>
        ) : null}
        <View style={styles.flex} />
        {locked ? (
          <Lock color={theme.colors.textSubtle} size={14} />
        ) : (
          <Pressable
            onPress={() => void apagar()}
            accessibilityRole="button"
            accessibilityLabel="Apagar registro"
            hitSlop={8}
          >
            <Trash2 color={theme.colors.textSubtle} size={16} />
          </Pressable>
        )}
      </View>

      {locked ? null : (
        <View style={styles.moodRowSmall}>
          {MOODS.map(({ value, label, Icon, color }) => {
            const selected = entry.mood === value;
            return (
              <Pressable
                key={value}
                onPress={() => void salvar({ mood: selected ? null : value })}
                accessibilityRole="button"
                accessibilityLabel={`Humor: ${label}`}
                accessibilityState={{ selected }}
                style={[styles.moodSmall, selected && { borderColor: color }]}
              >
                <Icon color={selected ? color : theme.colors.textSubtle} size={16} />
              </Pressable>
            );
          })}
        </View>
      )}

      {entry.photoUrl ? (
        <ExpoImage source={{ uri: entry.photoUrl }} style={styles.photo} contentFit="cover" transition={150} />
      ) : null}
      {entry.audioUrl ? <AudioRow uri={entry.audioUrl} /> : null}

      {locked ? (
        entry.text ? <Text variant="body">{entry.text}</Text> : null
      ) : (
        <>
          <Input
            label="Suas palavras"
            value={texto}
            onChangeText={setDraft}
            placeholder="O que ficou deste momento..."
            multiline
            textAlignVertical="top"
            style={styles.textAreaSmall}
          />
          {dirty ? (
            <View style={styles.actions}>
              <Button
                label="Salvar"
                size="sm"
                loading={update.isPending}
                onPress={() => void salvar({ text: texto.trim() || null })}
              />
              <Button label="Desfazer" size="sm" variant="ghost" onPress={() => setDraft(null)} />
            </View>
          ) : null}
        </>
      )}

      {hasMedia ? (
        <View style={styles.ai}>
          <View style={styles.row}>
            <Sparkles color={theme.colors.skill} size={16} />
            <Text variant="bodyMedium">Leitura da IA</Text>
          </View>
          {entry.transcription ? (
            <>
              <Text variant="label" color={theme.colors.skill}>
                Gerado por IA{entry.transcriptionModel ? ` · ${entry.transcriptionModel}` : ''}
              </Text>
              <Text variant="body">{entry.transcription}</Text>
              <View style={styles.actions}>
                {locked ? null : (
                  <Button
                    label="Usar como meu texto"
                    variant="outline"
                    size="sm"
                    onPress={() => setDraft(entry.transcription ?? '')}
                  />
                )}
                <Button
                  label="Descartar leitura"
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 color={theme.colors.hp} size={15} />}
                  loading={clearTranscription.isPending}
                  onPress={() => void clearTranscription.mutateAsync(entry.id)}
                />
              </View>
            </>
          ) : (
            <Button
              label="Transcrever"
              variant="outline"
              size="sm"
              loading={transcribe.isPending}
              onPress={() =>
                void transcribe
                  .mutateAsync(entry.id)
                  .catch((error: unknown) => toast.error('A IA não leu esta mídia', message(error)))
              }
            />
          )}
        </View>
      ) : null}
    </Card>
  );
}

/** Dia selado: a linha do tempo resumida, só leitura. */
function PastDay({ day }: { day: Day }) {
  const media = day.moodAvg;
  const Icone = media === null ? null : MOODS[Math.round(media) - 1];
  return (
    <Card style={styles.pastRow} accent={Icone?.color}>
      <View style={styles.row}>
        {Icone ? <Icone.Icon color={Icone.color} size={18} /> : <Meh color={theme.colors.textSubtle} size={18} />}
        <Text variant="bodyMedium" style={styles.flex}>
          {formatShortDay(day.date)}
        </Text>
        <Text variant="label">
          {day.entries.length} {day.entries.length === 1 ? 'registro' : 'registros'}
          {media !== null ? ` · humor ${String(media).replace('.', ',')}` : ''}
        </Text>
      </View>
      {day.entries.map((entry) => {
        const preview = entry.text?.trim() || entry.transcription?.trim() || null;
        return (
          <View key={entry.id} style={styles.pastLine}>
            <Text variant="label" style={styles.pastTime}>
              {formatTime(entry.occurredAt)}
            </Text>
            <Text variant="bodyMuted" numberOfLines={2} style={styles.flex}>
              {preview ?? (entry.audioUrl ? 'áudio' : entry.photoUrl ? 'foto' : 'só o humor')}
            </Text>
          </View>
        );
      })}
    </Card>
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

/** Toca a gravação. URL assinada e de validade curta — some ao recarregar. */
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
        Gravação
      </Text>
      <Text variant="label">{formatDuration((status.duration || 0) * 1000)}</Text>
    </Pressable>
  );
}

/** Agrupa por dia (mais novo primeiro) e ordena os registros pela hora. */
function groupByDay(entries: JournalEntry[]): Day[] {
  const map = new Map<string, Day>();
  for (const entry of entries) {
    let day = map.get(entry.occurredOn);
    if (!day) {
      day = { date: entry.occurredOn, entries: [], locked: Boolean(entry.locked), moodAvg: null };
      map.set(entry.occurredOn, day);
    }
    day.entries.push(entry);
  }
  for (const day of map.values()) {
    day.entries.sort((a, b) => (a.occurredAt ?? '').localeCompare(b.occurredAt ?? ''));
    const humores = day.entries.map((e) => e.mood).filter((m): m is number => m != null);
    if (humores.length) {
      day.moodAvg = Math.round((humores.reduce((a, b) => a + b, 0) / humores.length) * 10) / 10;
    }
  }
  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * O dia do diário, deslocado `offsetDays`: a data local com a virada em
 * `cutoffHours` (a mesma regra do servidor — ver JOURNAL_DAY_CUTOFF_HOURS).
 */
function journalDay(offsetDays: number, cutoffHours: number) {
  const date = new Date(Date.now() - cutoffHours * 3_600_000);
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

function formatTime(iso: string | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  card: { gap: theme.spacing.lg },

  autoRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },

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
  moodRowSmall: { flexDirection: 'row', gap: theme.spacing.xs },
  moodSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
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
  detach: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
  attached: {
    minHeight: theme.sizes.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
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
  textArea: { minHeight: 100, paddingTop: theme.spacing.md },
  textAreaSmall: { minHeight: 70, paddingTop: theme.spacing.sm },

  dayHead: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.sm },
  openDay: { gap: theme.spacing.md },
  entry: { gap: theme.spacing.md, padding: theme.spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  ai: {
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },

  pastHead: { marginTop: theme.spacing.sm },
  pastRow: { gap: theme.spacing.xs, padding: theme.spacing.md },
  pastLine: { flexDirection: 'row', gap: theme.spacing.sm },
  pastTime: { width: 44 },
  empty: { alignItems: 'center', gap: theme.spacing.sm },
});
