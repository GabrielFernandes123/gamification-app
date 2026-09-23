import { Angry, Eye, Frown, Laugh, Meh, Smile } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { theme } from '@/theme/theme';
import { formatErrorMessage } from '@/utils/errors';
import {
  useCloseDay,
  useDayClosePending,
  type DayClosePending,
  type HabitAnswer,
  type WorkoutAnswer,
} from './hooks/useDayClose';

const HUMOR = [
  { valor: 1, Icone: Angry },
  { valor: 2, Icone: Frown },
  { valor: 3, Icone: Meh },
  { valor: 4, Icone: Smile },
  { valor: 5, Icone: Laugh },
];

const ROTULO: Record<HabitAnswer, string> = {
  done: 'fiz',
  not_done: 'não fiz',
  avoided: 'evitei',
  relapsed: 'recaí',
};

function evidenciaTexto(e: { minutes: number; unlocks: number }) {
  const partes: string[] = [];
  if (e.minutes > 0) partes.push(`${e.minutes} min nas fontes ligadas`);
  if (e.unlocks > 0)
    partes.push(
      `${e.unlocks} ${e.unlocks === 1 ? 'desbloqueio' : 'desbloqueios'} de palavra ligada`,
    );
  return `O rastreador viu ${partes.join(' e ')}. Sem resposta, o dia fica neutro.`;
}

function horas(minutos: number) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`;
}

/**
 * FECHAR O DIA, no celular.
 *
 * Aqui o fechamento importa mais que na web: é no celular que o dia acaba, e
 * era justamente "esqueci de abrir o app" que fazia o sistema decidir sozinho.
 *
 * Modal, e não tela de aba: é um ritual com começo e fim, feito uma vez por
 * dia, que termina num ato só. A correção de ontem continua sendo card
 * dispensável na Início — são coisas diferentes e não devem se parecer.
 */
export function DayCloseModal({
  visible,
  day,
  onClose,
}: {
  visible: boolean;
  day?: string;
  onClose: () => void;
}) {
  const pending = useDayClosePending(day, visible);
  const close = useCloseDay();
  const toast = useToast();
  const [respostas, setRespostas] = useState<Record<string, HabitAnswer>>({});
  const [quantas, setQuantas] = useState<Record<string, number>>({});
  const [nota, setNota] = useState('');
  // O campo livre é um rascunho por dia: trocar de dia o esvazia.
  const [rascunhoDe, setRascunhoDe] = useState<string | null>(null);
  const [treino, setTreino] = useState<WorkoutAnswer>({
    modality: 'forca',
    minutes: 40,
  });

  const dados = pending.data;
  const habitos = dados?.habits ?? [];

  // Ajuste durante a renderização, não em efeito: o efeito pintaria o campo
  // vazio antes do texto do diário.
  if (dados && rascunhoDe !== dados.day) {
    setRascunhoDe(dados.day);
    setNota('');
  }

  // Uma pergunta só para os dois registros: sem os minutos, o hábito fecharia
  // e o treino não existiria nem para a história nem para o chefe.
  const pedeTreino = habitos.some(
    (h) => h.fulfilledBy === 'workout' && respostas[h.id] === 'done',
  );

  function confirmar() {
    close.mutate(
      {
        day,
        habits: respostas,
        relapseCount: Object.fromEntries(
          Object.entries(respostas)
            .filter(([, resposta]) => resposta === 'relapsed')
            .map(([id]) => [id, quantas[id] ?? 1]),
        ),
        workout: pedeTreino ? treino : null,
        // Sem humor: o do dia é a média dos registros do diário.
        note: nota.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success(
            'Dia fechado',
            'O veredito já foi aplicado; a página do diário está sendo escrita',
          );
          setRespostas({});
          setQuantas({});
          setNota('');
          setRascunhoDe(null);
          onClose();
        },
        onError: (error) =>
          toast.error('Não deu para fechar', formatErrorMessage(error)),
      },
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Card style={styles.card}>
          <Text variant="h2">Fechar o dia</Text>
          <Text variant="bodyMuted" style={styles.sub}>
            O que você responder vale como se tivesse sido marcado na hora.
          </Text>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
          >
            {habitos.length > 0 ? (
              <>
                <Text variant="label">Faltou marcar</Text>
                {habitos.map((habito) => (
                  <View key={habito.id} style={styles.habito}>
                    <View style={styles.habitoTopo}>
                      <Text variant="bodyMedium" numberOfLines={1}>
                        {habito.title}
                      </Text>
                      {habito.damageIfMissed > 0 ? (
                        <Text variant="bodyMuted" color={theme.colors.hp}>
                          −{habito.damageIfMissed} HP
                        </Text>
                      ) : null}
                      {habito.relapses > 0 ? (
                        <Text variant="bodyMuted">
                          {habito.relapses} já marcada
                          {habito.relapses === 1 ? '' : 's'}
                        </Text>
                      ) : null}
                    </View>
                    {habito.evidence ? (
                      <View style={styles.evidencia}>
                        <Eye size={14} color={theme.colors.textMuted} />
                        <Text variant="bodyMuted" style={styles.evidenciaTexto}>
                          {evidenciaTexto(habito.evidence)}
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.respostas}>
                      {habito.allowed.map((resposta) => (
                        <Button
                          key={resposta}
                          label={
                            habito.relapses > 0 && resposta === 'relapsed'
                              ? 'recaí mais'
                              : ROTULO[resposta]
                          }
                          size="sm"
                          variant={
                            respostas[habito.id] === resposta
                              ? 'primary'
                              : 'outline'
                          }
                          onPress={() =>
                            setRespostas((atual) => ({
                              ...atual,
                              [habito.id]: resposta,
                            }))
                          }
                        />
                      ))}
                      {respostas[habito.id] === 'relapsed' ? (
                        <View style={styles.contador}>
                          <Button
                            label="−"
                            size="sm"
                            variant="ghost"
                            disabled={(quantas[habito.id] ?? 1) <= 1}
                            onPress={() =>
                              setQuantas((atual) => ({
                                ...atual,
                                [habito.id]: Math.max(1, (atual[habito.id] ?? 1) - 1),
                              }))
                            }
                          />
                          <Text variant="bodyMedium">×{quantas[habito.id] ?? 1}</Text>
                          <Button
                            label="+"
                            size="sm"
                            variant="ghost"
                            disabled={(quantas[habito.id] ?? 1) >= 10}
                            onPress={() =>
                              setQuantas((atual) => ({
                                ...atual,
                                [habito.id]: Math.min(10, (atual[habito.id] ?? 1) + 1),
                              }))
                            }
                          />
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <Text variant="bodyMuted">Nada ficou em aberto hoje.</Text>
            )}

            {pedeTreino ? (
              <>
                <Text variant="label" style={styles.secao}>
                  O treino de hoje
                </Text>
                <View style={styles.respostas}>
                  <Button
                    label="Força"
                    size="sm"
                    variant={treino.modality === 'forca' ? 'primary' : 'outline'}
                    onPress={() => setTreino({ ...treino, modality: 'forca' })}
                  />
                  <Button
                    label="Cardio"
                    size="sm"
                    variant={
                      treino.modality === 'cardio' ? 'primary' : 'outline'
                    }
                    onPress={() => setTreino({ ...treino, modality: 'cardio' })}
                  />
                </View>
                <Input
                  label="Minutos"
                  value={String(treino.minutes)}
                  onChangeText={(valor) =>
                    setTreino({ ...treino, minutes: Number(valor) || 0 })
                  }
                  keyboardType="number-pad"
                />
              </>
            ) : null}

            {dados ? (
              <>
                <Text variant="label" style={styles.secao}>
                  Já contabilizado
                </Text>
                <Text variant="bodyMuted">
                  {horas(dados.screen.minutes)} de tela
                  {dados.screen.overMinutes > 0
                    ? ` · ${horas(dados.screen.overMinutes)} além do limite`
                    : ''}
                  {dados.screen.goldCharged > 0
                    ? ` · −${dados.screen.goldCharged} de ouro`
                    : ''}
                </Text>
              </>
            ) : null}

            <Text variant="label" style={styles.secao}>
              O dia no diário
            </Text>
            <DiaryCompilation journal={dados?.journal ?? null} />
            <Input
              label="Algo mais sobre o dia? (opcional)"
              value={nota}
              onChangeText={setNota}
              placeholder="dia puxado, reunião até tarde"
              multiline
              maxLength={2000}
            />
            <Text variant="bodyMuted">
              Entra como mais um registro do diário, sem apagar os outros. Ao
              fechar, o diário do dia fica selado.
            </Text>

            {dados?.danger ? (
              <>
                <Text variant="label" style={styles.secao}>
                  O que vai acontecer
                </Text>
                <Text variant="bodyMuted">
                  {dados.danger.total > 0
                    ? `−${dados.danger.total} de vida — você fica com ${dados.danger.hpAfter} de ${dados.danger.hp.max}.`
                    : 'Nenhum dano previsto.'}
                </Text>
                {dados.danger.lethal ? (
                  <Text variant="bodyMedium" color={theme.colors.hp}>
                    Com esse golpe você morre. Beba uma poção antes de fechar.
                  </Text>
                ) : null}
              </>
            ) : null}
          </ScrollView>

          {dados && !dados.canCloseNow ? (
            <Text variant="bodyMuted" style={styles.aviso}>
              O dia só pode ser fechado a partir das{' '}
              {String(dados.settings.earliest_close_hour).padStart(2, '0')}h.
            </Text>
          ) : null}

          <View style={styles.acoes}>
            <Button label="Agora não" variant="ghost" onPress={onClose} />
            <Button
              label="Fechar o dia"
              loading={close.isPending}
              disabled={!dados?.canCloseNow}
              onPress={confirmar}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  card: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: '90%',
    gap: theme.spacing.xs,
  },
  sub: { marginBottom: theme.spacing.sm },
  scroll: { flexGrow: 0 },
  scrollContent: { gap: theme.spacing.sm, paddingBottom: theme.spacing.sm },
  secao: { marginTop: theme.spacing.sm },
  habito: {
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  habitoTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  respostas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  contador: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  evidencia: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  evidenciaTexto: { flex: 1 },
  diario: { gap: theme.spacing.xs },
  diarioMedia: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  diarioLinha: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceSoft,
  },
  diarioHora: { width: 42 },
  diarioTexto: { flex: 1, minWidth: 0 },
  aviso: { marginTop: theme.spacing.xs },
  acoes: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
});

/**
 * O DIÁRIO DO DIA, compilado — só leitura. Cada registro com a hora e o humor
 * daquele momento; em cima, o humor do dia (a média, que é o que o fechamento
 * grava).
 */
function DiaryCompilation({ journal }: { journal: DayClosePending['journal'] }) {
  const registros = journal?.entries ?? [];
  if (registros.length === 0) {
    return (
      <Text variant="bodyMuted">
        Nenhum registro no diário. O que você escrever abaixo vira o primeiro — e
        o dia fecha sem humor.
      </Text>
    );
  }
  const media = journal?.moodAvg ?? null;
  const comHumor = registros.filter((r) => r.mood !== null).length;
  const Media = media === null ? null : HUMOR[Math.round(media) - 1]?.Icone;
  return (
    <View style={styles.diario}>
      <View style={styles.diarioMedia}>
        {Media ? <Media size={18} color={theme.colors.primary} /> : null}
        <Text variant="bodyMedium">
          {media === null
            ? 'Sem humor registrado — o dia fecha sem humor.'
            : `Humor do dia: ${String(media).replace('.', ',')} de 5 (média de ${comHumor})`}
        </Text>
      </View>
      {registros.map((registro) => {
        const Icone = registro.mood ? HUMOR[registro.mood - 1]?.Icone : null;
        return (
          <View key={registro.id} style={styles.diarioLinha}>
            <Text variant="label" style={styles.diarioHora}>
              {registro.time}
            </Text>
            {Icone ? <Icone size={16} color={theme.colors.textMuted} /> : null}
            <Text variant="bodyMuted" style={styles.diarioTexto}>
              {registro.text ??
                (registro.hasAudio
                  ? 'áudio sem transcrição'
                  : registro.hasPhoto
                    ? 'foto sem transcrição'
                    : 'só o humor')}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
