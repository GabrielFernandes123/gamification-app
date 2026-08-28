import { Check, HeartPulse } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useCardioSessions, useQuickWorkout } from '@/features/body/hooks/useBody';
import { useToday } from '@/hooks/useToday';
import { theme } from '@/theme/theme';
import type { CardioSession } from '@/types/body';
import { formatErrorMessage } from '@/utils/errors';

/**
 * CARDIO — a aba de quem só quer dizer o que fez.
 *
 * O caminho antigo do cardio era o mesmo do peso: montar um modelo, iniciar a
 * sessão, cronometrar bloco a bloco. Para uma corrida isso é cerimônia — a
 * informação toda cabe em "o quê, quanto tempo, quanto longe". E, sem esse
 * atalho, corrida virava treino não registrado, que não rende XP nem fere boss.
 *
 * A recompensa aqui é IGUAL à do cardio cronometrado, de propósito: a fórmula
 * do cardio é minutos × intensidade, e minutos e FC é exatamente o que este
 * formulário informa. Não há nada medido a mais para cobrar.
 */

/** Atalhos, não cadastro: o campo aceita qualquer texto e vira um exercício. */
const PRESETS = ['Corrida', 'Caminhada', 'Bicicleta', 'Esteira', 'Natação', 'Remo', 'Elíptico', 'Escada'];

const MINUTE_PRESETS = [15, 20, 30, 40, 45, 60];

/**
 * N dias antes de uma data ISO. Parte do `today` do perfil (fuso do usuário),
 * nunca do relógio do aparelho: quem viaja registraria no dia errado, e a data
 * é o que decide qual boss leva o dano.
 */
function isoMinusDays(today: string, days: number) {
  const date = new Date(`${today}T12:00:00`);
  date.setDate(date.getDate() - days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const WHEN_OPTIONS = [
  { value: '0', label: 'Hoje' },
  { value: '1', label: 'Ontem' },
  { value: '2', label: 'Anteontem' },
];

function formatDistance(meters?: number | null) {
  if (!meters) return null;
  return meters >= 1000 ? `${(meters / 1000).toFixed(2).replace('.', ',')} km` : `${Math.round(meters)} m`;
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function CardioPanel() {
  const toast = useToast();
  const { today } = useToday();
  const sessions = useCardioSessions();
  const quick = useQuickWorkout();

  const [activity, setActivity] = useState(PRESETS[0]);
  const [minutes, setMinutes] = useState('30');
  const [distanceKm, setDistanceKm] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [daysAgo, setDaysAgo] = useState('0');

  const list = useMemo(() => sessions.data ?? [], [sessions.data]);
  // Semana contada a partir de HOJE (o dia do perfil), não do relógio: hora
  // lida durante o render é resultado instável.
  const week = useMemo(() => {
    const limit = new Date(`${today}T00:00:00`).getTime() - 6 * 86400000;
    const recent = list.filter((s) => new Date(s.started_at).getTime() >= limit);
    return {
      count: recent.length,
      minutes: recent.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0),
    };
  }, [list, today]);

  async function submit() {
    const parsedMinutes = Math.round(Number(minutes));
    if (!Number.isFinite(parsedMinutes) || parsedMinutes < 5) {
      toast.error('Minutos inválidos', 'Registre pelo menos 5 minutos.');
      return;
    }
    // Distância vai em METROS: quilômetro é unidade de tela, a série guarda metros.
    const km = Number(distanceKm.replace(',', '.'));
    const hr = Math.round(Number(heartRate));
    try {
      const result = await quick.mutateAsync({
        modality: 'cardio',
        minutes: parsedMinutes,
        date: isoMinusDays(today, Number(daysAgo)),
        activity: activity.trim() || 'Cardio',
        distanceMeters: Number.isFinite(km) && km > 0 ? Math.round(km * 1000) : undefined,
        avgHeartRate: Number.isFinite(hr) && hr >= 30 ? hr : undefined,
      });
      setDistanceKm('');
      setHeartRate('');
      toast.success('Cardio registrado', `+${result.xpGained} XP · +${result.goldGained} ouro`);
    } catch (e) {
      toast.error('Erro ao registrar cardio', formatErrorMessage(e));
    }
  }

  return (
    <View style={styles.stack}>
      <Card style={styles.focusCard}>
        <View style={styles.headerRow}>
          <View style={styles.flex}>
            <Text variant="title">Registrar cardio</Text>
            <Text variant="bodyMuted">
              {week.count} na semana · {week.minutes} min
            </Text>
          </View>
          <HeartPulse color={theme.colors.hp} size={22} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {PRESETS.map((preset) => {
            const selected = activity === preset;
            return (
              <Pressable
                key={preset}
                onPress={() => setActivity(preset)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.chip, selected && styles.chipActive]}
              >
                <Text variant="bodyMedium" color={selected ? theme.colors.textInverse : theme.colors.textMuted}>
                  {preset}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Input label="Atividade" value={activity} onChangeText={setActivity} maxLength={80} />

        <View style={styles.chipRow}>
          {MINUTE_PRESETS.map((value) => {
            const selected = minutes === String(value);
            return (
              <Pressable
                key={value}
                onPress={() => setMinutes(String(value))}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.chip, selected && styles.chipActive]}
              >
                <Text variant="bodyMedium" color={selected ? theme.colors.textInverse : theme.colors.textMuted}>
                  {value} min
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.row}>
          <View style={styles.flex}>
            <Input label="Minutos" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" />
          </View>
          <View style={styles.flex}>
            <Input label="Distância (km)" value={distanceKm} onChangeText={setDistanceKm} keyboardType="decimal-pad" placeholder="opcional" />
          </View>
        </View>

        <Input
          label="FC média (bpm)"
          value={heartRate}
          onChangeText={setHeartRate}
          keyboardType="number-pad"
          placeholder="opcional — compara com a sua média"
        />

        <View style={styles.stackXs}>
          <Text variant="label">Quando</Text>
          <Segmented options={WHEN_OPTIONS} value={daysAgo} onChange={setDaysAgo} />
        </View>

        <Pressable
          style={[styles.primaryBtn, quick.isPending && styles.btnDisabled]}
          onPress={() => void submit()}
          disabled={quick.isPending}
          accessibilityRole="button"
        >
          {quick.isPending ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <>
              <Check color={theme.colors.textInverse} size={18} />
              <Text variant="title" color={theme.colors.textInverse}>
                Registrar cardio
              </Text>
            </>
          )}
        </Pressable>
      </Card>

      <Card style={styles.panel}>
        <Text variant="title">Histórico</Text>
        {sessions.isLoading ? <ActivityIndicator color={theme.colors.primary} /> : null}
        {list.slice(0, 12).map((session) => (
          <CardioRow key={session.id} session={session} />
        ))}
        {!sessions.isLoading && list.length === 0 ? (
          <Text variant="bodyMuted">Nada ainda. Registre acima — conta XP, ouro e dano no boss como qualquer treino.</Text>
        ) : null}
      </Card>
    </View>
  );
}

function CardioRow({ session }: { session: CardioSession }) {
  const distance = formatDistance(session.set_meters);
  const minutes = session.duration_minutes ?? Math.round((session.set_seconds ?? 0) / 60);
  const details = [
    `${minutes} min`,
    distance,
    session.avg_heart_rate ? `${session.avg_heart_rate} bpm` : null,
    session.status === 'active' ? 'em andamento' : null,
  ].filter(Boolean);

  return (
    <View style={styles.historyRow}>
      <View style={styles.flex}>
        <Text variant="bodyMedium">{session.name}</Text>
        <Text variant="bodyMuted">
          {formatDay(session.started_at)} · {details.join(' · ')}
        </Text>
      </View>
      {session.xp_gained ? <Text variant="label">+{session.xp_gained} XP</Text> : null}
    </View>
  );
}

/**
 * Registro rápido de MUSCULAÇÃO, para o treino que já aconteceu — sem celular
 * na mão, sem série a série. Fica dentro da aba Treinos porque é a mesma
 * pergunta do botão ao lado, só com outra evidência.
 *
 * Aqui a recompensa NÃO é igual à do treino detalhado: sem volume, ela sai de
 * tempo × esforço e cai cerca de uma faixa de dificuldade abaixo. O texto no
 * rodapé existe para isso não ser surpresa.
 */
export function QuickStrengthCard() {
  const toast = useToast();
  const { today } = useToday();
  const quick = useQuickWorkout();
  const [minutes, setMinutes] = useState('60');
  const [effort, setEffort] = useState<'leve' | 'normal' | 'puxado'>('normal');
  const [daysAgo, setDaysAgo] = useState('0');

  async function submit() {
    const parsedMinutes = Math.round(Number(minutes));
    if (!Number.isFinite(parsedMinutes) || parsedMinutes < 5) {
      toast.error('Minutos inválidos', 'Registre pelo menos 5 minutos.');
      return;
    }
    try {
      const result = await quick.mutateAsync({
        modality: 'forca',
        minutes: parsedMinutes,
        effort,
        date: isoMinusDays(today, Number(daysAgo)),
      });
      toast.success('Treino registrado', `+${result.xpGained} XP · +${result.goldGained} ouro`);
    } catch (e) {
      toast.error('Erro ao registrar treino', formatErrorMessage(e));
    }
  }

  return (
    <Card style={styles.panel}>
      <Text variant="title">Treinei sem registrar</Text>
      <Text variant="bodyMuted">
        Sem série a série: conta pelo tempo e pelo esforço. Rende um pouco menos que o treino detalhado,
        e fere o boss igual.
      </Text>

      <View style={styles.row}>
        <View style={styles.flex}>
          <Input label="Minutos" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" />
        </View>
        <View style={styles.flexTwo}>
          <View style={styles.stackXs}>
            <Text variant="label">Esforço</Text>
            <Segmented
              options={[
                { value: 'leve', label: 'Leve' },
                { value: 'normal', label: 'Normal' },
                { value: 'puxado', label: 'Puxado' },
              ]}
              value={effort}
              onChange={setEffort}
            />
          </View>
        </View>
      </View>

      <View style={styles.stackXs}>
        <Text variant="label">Quando</Text>
        <Segmented options={WHEN_OPTIONS} value={daysAgo} onChange={setDaysAgo} />
      </View>

      <Pressable
        style={[styles.outlineBtn, quick.isPending && styles.btnDisabled]}
        onPress={() => void submit()}
        disabled={quick.isPending}
        accessibilityRole="button"
      >
        {quick.isPending ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <Text variant="title">Registrar treino feito</Text>
        )}
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: { gap: theme.spacing.lg },
  stackXs: { gap: theme.spacing.xs },
  panel: { gap: theme.spacing.md },
  flex: { flex: 1, minWidth: 0 },
  flexTwo: { flex: 2, minWidth: 0 },
  row: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-end' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  focusCard: {
    gap: theme.spacing.md,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceSoft,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, paddingRight: theme.spacing.sm },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipActive: {
    borderColor: theme.colors.transparent,
    backgroundColor: theme.colors.primary,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.sizes.touch,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  btnDisabled: { opacity: 0.6 },
});
