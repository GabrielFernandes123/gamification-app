import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronLeft, Radio } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/api';
import { theme } from '@/theme/theme';
import { formatErrorMessage } from '@/utils/errors';

import {
  endDayActivityNow,
  startDayActivityNow,
  syncLiveActivities,
  updateLiveSettings,
  type LiveSettings,
  type LiveState,
} from './liveActivities';
import type { DayActivityProps } from './DayActivity';

const liveStateKey = ['liveState'] as const;

/**
 * CONFIGURAR AS LIVE ACTIVITIES — o dia e o foco na tela de bloqueio.
 *
 * Mora no app, e não no site, porque é do aparelho: é aqui que o iOS pede a
 * permissão, que o token de "começar sozinha" nasce e que dá para testar
 * olhando a própria tela de bloqueio.
 *
 * Cada mudança salva na hora e reconcilia a atividade: desligar o dia tira a
 * atividade da tela; religar dentro da janela a traz de volta.
 */
export default function LiveSettingsScreen() {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const state = useQuery({
    queryKey: liveStateKey,
    queryFn: () => apiFetch<LiveState>('/live/state'),
  });
  const salvar = useMutation({
    mutationFn: (patch: Partial<LiveSettings>) => updateLiveSettings(patch),
    onSuccess: async (next) => {
      qc.setQueryData(liveStateKey, next);
      await syncLiveActivities();
    },
    onError: (error) => toast.error('Não deu para salvar', formatErrorMessage(error)),
  });
  const [ocupado, setOcupado] = useState(false);

  const s = state.data?.settings;
  const set = (patch: Partial<LiveSettings>) => salvar.mutate(patch);

  async function mostrarAgora() {
    setOcupado(true);
    try {
      // "Mostrar agora" vale mesmo fora da janela — é o jeito de testar.
      const dados = await apiFetch<LiveState>('/live/state');
      let props: DayActivityProps;
      if (dados.day) {
        props = dados.day;
      } else {
        // Fora da janela a API não manda o dia: monta do retrato do widget.
        const { timeline } = await apiFetch<{
          timeline: { props: Record<string, number | string> }[];
        }>('/today/widget');
        const p = timeline[0].props;
        props = {
          hp: Number(p.hp),
          maxHp: Number(p.maxHp),
          completion: Number(p.completion),
          pending: Math.max(0, Number(p.dueHabits) - Number(p.completedHabits)),
          screenLabel: String(p.screenLabel ?? ''),
          screenUsedMin: Number(p.screenUsedMin ?? 0),
          screenFreeMin: Number(p.screenFreeMin ?? 0),
          dayCloseLabel: String(p.dayCloseLabel ?? ''),
          dayCloseState: String(p.dayCloseState ?? 'none'),
          showHp: s?.show_hp ?? true,
          showScreen: s?.show_screen ?? true,
          showClose: s?.show_close ?? true,
          updatedAt: Date.now(),
        };
      }
      await startDayActivityNow(props);
      toast.success('Na tela de bloqueio', 'Bloqueie o celular para ver.');
    } catch (error) {
      toast.error(
        'O iOS não deixou',
        `Confira em Ajustes do iPhone › Evolve › Atividades ao Vivo. ${formatErrorMessage(error)}`,
      );
    } finally {
      setOcupado(false);
    }
  }

  async function tirar() {
    setOcupado(true);
    try {
      await endDayActivityNow();
      toast.success('Tirada da tela');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button">
        <ChevronLeft color={theme.colors.text} size={20} />
        <Text variant="bodyMedium">Ajustes</Text>
      </Pressable>

      <View style={styles.header}>
        <Radio color={theme.colors.essencia} size={22} />
        <Text variant="h1">Live Activity</Text>
      </View>
      <Text variant="bodyMuted">
        O seu dia e as sessões de foco na tela de bloqueio e na Dynamic Island.
      </Text>

      {state.data ? <StatusCard state={state.data} /> : null}

      {s ? (
        <>
          <Card style={styles.card}>
            <Row
              title="Dia em andamento"
              detail="Vida, a distração mais perto do limite e o fechamento do dia."
              value={s.day_enabled}
              onChange={(v) => set({ day_enabled: v })}
            />

            {s.day_enabled ? (
              <>
                <View style={styles.field}>
                  <Text variant="label">Começa às</Text>
                  <NumberStepper
                    value={s.day_start_hour}
                    min={0}
                    max={23}
                    onChange={(v) => set({ day_start_hour: v })}
                  />
                </View>

                <View style={styles.field}>
                  <Text variant="label">Termina</Text>
                  <Segmented
                    options={[
                      { value: 'close', label: 'Ao fechar o dia' },
                      { value: 'hour', label: 'Numa hora fixa' },
                    ]}
                    value={s.day_end_mode}
                    onChange={(v) => set({ day_end_mode: v })}
                  />
                </View>

                {s.day_end_mode === 'hour' ? (
                  <View style={styles.field}>
                    <Text variant="label">Termina às</Text>
                    <NumberStepper
                      value={s.day_end_hour}
                      min={0}
                      max={23}
                      onChange={(v) => set({ day_end_hour: v })}
                    />
                  </View>
                ) : null}

                <Text variant="label" style={styles.section}>
                  Mostrar
                </Text>
                <Row title="Vida (HP)" value={s.show_hp} onChange={(v) => set({ show_hp: v })} />
                <Row
                  title="Tempo de tela"
                  detail="A distração mais perto da franquia."
                  value={s.show_screen}
                  onChange={(v) => set({ show_screen: v })}
                />
                <Row
                  title="Fechamento do dia"
                  value={s.show_close}
                  onChange={(v) => set({ show_close: v })}
                />

                <View style={styles.actions}>
                  <Button label="Mostrar agora" size="sm" loading={ocupado} onPress={() => void mostrarAgora()} />
                  <Button label="Tirar da tela" size="sm" variant="outline" onPress={() => void tirar()} />
                </View>
                <Text variant="bodyMuted">
                  Fora do horário que você marcou, a atividade mostrada agora sai
                  na próxima vez que o app abrir.
                </Text>
              </>
            ) : null}
          </Card>

          <Card style={styles.card}>
            <Row
              title="Sessão de foco"
              detail="Contagem regressiva até o fim do foco — inclusive do foco começado no computador."
              value={s.focus_enabled}
              onChange={(v) => set({ focus_enabled: v })}
            />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function StatusCard({ state }: { state: LiveState }) {
  const itens: { ok: boolean; text: string }[] = [
    {
      ok: state.serverReady,
      text: state.serverReady
        ? 'O servidor atualiza a atividade mesmo com o app fechado.'
        : 'Falta a chave da Apple no servidor: a atividade só atualiza com o app aberto ou em segundo plano.',
    },
    {
      ok: state.canStartRemotely,
      text: state.canStartRemotely
        ? 'Pode começar sozinha na hora marcada.'
        : 'Ainda não pode começar sozinha: abra o app com as Atividades ao Vivo liberadas (iOS 17.2 ou mais novo).',
    },
  ];
  return (
    <Card style={styles.card}>
      {itens.map((item) => (
        <Text
          key={item.text}
          variant="bodyMuted"
          color={item.ok ? theme.colors.success : theme.colors.gold}
        >
          {item.ok ? '✓ ' : '• '}
          {item.text}
        </Text>
      ))}
    </Card>
  );
}

function Row({
  title,
  detail,
  value,
  onChange,
}: {
  title: string;
  detail?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text variant="bodyMedium">{title}</Text>
        {detail ? <Text variant="bodyMuted">{detail}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.colors.primary, false: theme.colors.surfaceSoft }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.md },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  card: { gap: theme.spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  flex: { flex: 1, minWidth: 0 },
  field: { gap: theme.spacing.xs },
  section: { marginTop: theme.spacing.sm },
  actions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xs },
});
