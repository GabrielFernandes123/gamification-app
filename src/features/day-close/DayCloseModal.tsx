import { Angry, Frown, Laugh, Meh, Smile } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
  const [humor, setHumor] = useState<number | null>(null);
  const [nota, setNota] = useState('');
  const [treino, setTreino] = useState<WorkoutAnswer>({
    modality: 'forca',
    minutes: 40,
  });

  const dados = pending.data;
  const habitos = dados?.habits ?? [];

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
        workout: pedeTreino ? treino : null,
        mood: humor,
        note: nota.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success('Dia fechado', 'O que você respondeu já foi aplicado');
          setRespostas({});
          setHumor(null);
          setNota('');
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
                    </View>
                    <View style={styles.respostas}>
                      {habito.allowed.map((resposta) => (
                        <Button
                          key={resposta}
                          label={ROTULO[resposta]}
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
              Como foi o dia?
            </Text>
            <View style={styles.humor}>
              {HUMOR.map(({ valor, Icone }) => (
                <Pressable
                  key={valor}
                  onPress={() => setHumor(humor === valor ? null : valor)}
                  style={[styles.humorBotao, humor === valor && styles.humorOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: humor === valor }}
                >
                  <Icone
                    size={22}
                    color={
                      humor === valor
                        ? theme.colors.primary
                        : theme.colors.textMuted
                    }
                  />
                </Pressable>
              ))}
            </View>
            <Input
              label="Uma linha sobre o dia (opcional)"
              value={nota}
              onChangeText={setNota}
              placeholder="dia puxado, reunião até tarde"
              multiline
              maxLength={2000}
            />

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
  respostas: { flexDirection: 'row', gap: theme.spacing.xs },
  humor: { flexDirection: 'row', gap: theme.spacing.xs },
  humorBotao: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  humorOn: { borderColor: theme.colors.primary },
  aviso: { marginTop: theme.spacing.xs },
  acoes: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
});
